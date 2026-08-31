import { Router, Request, Response } from 'express';
import { Environment, SignedDataVerifier, VerificationException } from '@apple/app-store-server-library';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { claimFounderRank } from '../prestataire-subscription';

/**
 * Vérification des achats Apple In-App Purchase (Guideline 3.1.1).
 *
 * Sur iOS, le premium couple (50 €, non-consommable) et l'abonnement
 * prestataire (39,99 €/mois, 6 mois offerts aux 200 premiers) passent par
 * StoreKit — Stripe est interdit par Apple pour les biens numériques. L'app envoie le jeton JWS signé
 * par Apple (purchase.purchaseToken d'expo-iap) ; on vérifie ici la signature
 * (chaîne de certificats Apple), le bundleId et le produit avant d'accorder le
 * droit en BDD. Android / web restent sur Stripe.
 *
 * Env Railway :
 *  - APPLE_BUNDLE_ID  (défaut com.oheve.wedding)
 *  - APPLE_APP_ID     (Apple ID numérique de l'app, App Store Connect →
 *                      App Information. Requis pour vérifier les achats de
 *                      PRODUCTION ; le sandbox — utilisé par App Review — n'en
 *                      a pas besoin.)
 */

export const iapRoutes = Router();

const BUNDLE_ID = process.env.APPLE_BUNDLE_ID?.trim() || 'com.oheve.wedding';
const APPLE_APP_ID = process.env.APPLE_APP_ID ? Number(process.env.APPLE_APP_ID) : undefined;

// Identifiants produits — doivent exister À L'IDENTIQUE dans App Store Connect
// et dans MonApp/constants/config.ts (IAP_SKUS).
export const IAP_PRODUCTS = {
  premium: 'com.oheve.wedding.couple.premium',      // non-consommable 50 €
  prestaMonthly: 'com.oheve.wedding.presta.sub', // abo auto-renouvelable 39,99 €/mois
} as const;

// ── Certificats racine Apple ─────────────────────────────────────────────────
// La lib Apple vérifie la chaîne du JWS contre les racines officielles Apple
// (non incluses dans le package pour raisons de licence). On les télécharge
// depuis apple.com au premier appel puis on les garde en mémoire.
const APPLE_ROOT_CA_URLS = [
  'https://www.apple.com/certificateauthority/AppleRootCA-G3.cer', // signe StoreKit 2
  'https://www.apple.com/certificateauthority/AppleRootCA-G2.cer',
  'https://www.apple.com/appleca/AppleIncRootCertificate.cer',
];

let rootCertsPromise: Promise<Buffer[]> | null = null;
async function getAppleRootCerts(): Promise<Buffer[]> {
  if (!rootCertsPromise) {
    rootCertsPromise = (async () => {
      const certs: Buffer[] = [];
      for (const url of APPLE_ROOT_CA_URLS) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          certs.push(Buffer.from(await res.arrayBuffer()));
        } catch (err: any) {
          console.error(`Certificat racine Apple indisponible (${url}):`, err.message);
        }
      }
      if (certs.length === 0) {
        // On ne mémorise pas l'échec : nouvel essai au prochain appel.
        rootCertsPromise = null;
        throw new Error('Impossible de télécharger les certificats racine Apple');
      }
      return certs;
    })();
  }
  return rootCertsPromise;
}

type DecodedTx = Awaited<ReturnType<SignedDataVerifier['verifyAndDecodeTransaction']>>;

/** Vérifie le JWS en production puis en sandbox (App Review teste en sandbox). */
async function verifyTransaction(jws: string): Promise<DecodedTx> {
  const certs = await getAppleRootCerts();
  const environments: Environment[] = [];
  if (APPLE_APP_ID) environments.push(Environment.PRODUCTION);
  environments.push(Environment.SANDBOX);

  let lastError: unknown = null;
  for (const env of environments) {
    try {
      const verifier = new SignedDataVerifier(
        certs,
        true,
        env,
        BUNDLE_ID,
        env === Environment.PRODUCTION ? APPLE_APP_ID : undefined
      );
      return await verifier.verifyAndDecodeTransaction(jws);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Vérification Apple impossible');
}

// ── POST /api/iap/verify ─────────────────────────────────────────────────────
// Body : { jws: string } — jeton signé renvoyé par StoreKit après l'achat.
// Accorde le droit correspondant au produit à l'utilisateur connecté.
iapRoutes.post('/verify', requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const jws = String((req.body as { jws?: string })?.jws ?? '').trim();
  if (!jws) {
    return res.status(400).json({ success: false, message: 'Jeton d\'achat manquant.' });
  }

  let tx: DecodedTx;
  try {
    tx = await verifyTransaction(jws);
  } catch (err) {
    const msg = err instanceof VerificationException
      ? `Achat Apple non vérifiable (${err.status ?? 'signature invalide'}).`
      : 'Vérification Apple momentanément indisponible. Réessayez.';
    console.error('iap/verify verification error:', err);
    return res.status(err instanceof VerificationException ? 400 : 503)
      .json({ success: false, message: msg });
  }

  if (tx.bundleId !== BUNDLE_ID) {
    return res.status(400).json({ success: false, message: 'Achat non lié à Oheve.' });
  }
  if (tx.revocationDate) {
    return res.status(400).json({ success: false, message: 'Cet achat a été remboursé ou révoqué.' });
  }

  const originalTxId = tx.originalTransactionId ?? tx.transactionId;
  if (!originalTxId) {
    return res.status(400).json({ success: false, message: 'Transaction Apple incomplète.' });
  }

  try {
    // Anti-doublon : un même achat Apple ne débloque qu'un seul compte Oheve.
    const claimed = await pool.query(
      `SELECT id FROM users
        WHERE (premium_apple_transaction_id = $1 OR presta_sub_id = $2) AND id <> $3
        LIMIT 1`,
      [originalTxId, `apple:${originalTxId}`, userId]
    );
    if (claimed.rows[0]) {
      return res.status(409).json({
        success: false,
        message: 'Cet achat est déjà utilisé par un autre compte Oheve. Contactez support@ohevewedding.com.',
      });
    }

    // ── Premium couple (non-consommable) ────────────────────────────────────
    if (tx.productId === IAP_PRODUCTS.premium) {
      await pool.query(
        `UPDATE users SET
           premium = true,
           premium_purchased_at = COALESCE(premium_purchased_at, NOW()),
           premium_apple_transaction_id = $1
         WHERE id = $2`,
        [originalTxId, userId]
      );
      return res.json({ success: true, data: { product: 'premium', premium: true } });
    }

    // ── Abonnement prestataire (auto-renouvelable) ──────────────────────────
    if (tx.productId === IAP_PRODUCTS.prestaMonthly) {
      const expiresMs = tx.expiresDate ?? null;
      if (!expiresMs || expiresMs <= Date.now()) {
        return res.status(402).json({ success: false, message: 'Cet abonnement Apple est expiré.' });
      }
      // offerType 1 = offre d'introduction (les mois offerts) → 'trialing'
      // pour garder le même affichage que le parcours Stripe.
      const isTrial = Number(tx.offerType) === 1;
      const expiresAt = new Date(expiresMs);
      // Offre de lancement : la place fondateur est consommée dès la première
      // vérification de l'abonnement. La durée réellement offerte, elle, vient
      // de l'offre d'introduction App Store Connect (StoreKit) — le compteur
      // sert à savoir quand y ramener l'offre de 6 à 3 mois.
      if (isTrial) await claimFounderRank(userId);
      await pool.query(
        `UPDATE users SET
           presta_sub_id = $1,
           presta_sub_status = $2,
           presta_trial_end = $3,
           presta_current_period_end = $4
         WHERE id = $5`,
        [`apple:${originalTxId}`, isTrial ? 'trialing' : 'active', isTrial ? expiresAt : null, expiresAt, userId]
      );
      return res.json({
        success: true,
        data: {
          product: 'presta_subscription',
          status: isTrial ? 'trialing' : 'active',
          active: true,
          trial_end: isTrial ? expiresAt.toISOString() : null,
          current_period_end: expiresAt.toISOString(),
        },
      });
    }

    return res.status(400).json({ success: false, message: `Produit inconnu : ${tx.productId}` });
  } catch (err: any) {
    console.error('iap/verify error:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur pendant l\'activation.' });
  }
});
