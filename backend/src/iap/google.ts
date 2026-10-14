import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { claimFounderRank } from '../prestataire-subscription';
import { IAP_PRODUCTS } from './index';

/**
 * Vérification des achats Google Play Billing (Android).
 *
 * Google Play impose sa facturation pour les biens numériques vendus dans
 * l'app (premium couple, abonnement prestataire) — comme Apple sur iOS.
 * L'app envoie le purchaseToken renvoyé par Play Billing ; on interroge ici la
 * Google Play Developer API (compte de service) pour vérifier l'achat, on
 * accorde le droit en BDD puis on « acknowledge » l'achat (sinon Google le
 * rembourse automatiquement au bout de 3 jours).
 *
 * Env Railway :
 *  - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON : clé JSON du compte de service (texte
 *    brut ou encodé en base64), invité dans la Play Console avec l'accès
 *    « Afficher les données financières » + « Gérer les commandes et abonnements ».
 *  - GOOGLE_PLAY_PACKAGE_NAME (défaut com.oheve.wedding)
 */

export const googleIapRoutes = Router();

const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || 'com.oheve.wedding';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

type ServiceAccount = { client_email: string; private_key: string };

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const json = JSON.parse(text) as ServiceAccount;
    return json.client_email && json.private_key ? json : null;
  } catch {
    console.error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON illisible');
    return null;
  }
}

// Jeton OAuth du compte de service, gardé en mémoire jusqu'à son expiration.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const sa = loadServiceAccount();
  if (!sa) throw new Error('Compte de service Google Play non configuré');
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    sa.private_key,
    { algorithm: 'RS256' },
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) throw new Error(`OAuth Google refusé (${json.error ?? res.status})`);
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

async function playApi<T>(path: string, method: 'GET' | 'POST' = 'GET'): Promise<{ status: number; data: T }> {
  const token = await getAccessToken();
  const res = await fetch(`${API}/${encodeURIComponent(PACKAGE_NAME)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
  const text = await res.text();
  return { status: res.status, data: (text ? JSON.parse(text) : {}) as T };
}

type ProductPurchase = {
  purchaseState?: number;        // 0 acheté, 1 annulé, 2 en attente
  acknowledgementState?: number; // 0 non, 1 oui
  orderId?: string;
};

type SubscriptionPurchaseV2 = {
  subscriptionState?: string;    // SUBSCRIPTION_STATE_ACTIVE, …_IN_GRACE_PERIOD, …
  acknowledgementState?: string; // ACKNOWLEDGEMENT_STATE_PENDING / …_ACKNOWLEDGED
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  lineItems?: {
    productId?: string;
    expiryTime?: string;
    offerDetails?: { basePlanId?: string; offerId?: string };
    offerPhase?: { freeTrial?: object; introductoryPrice?: object };
  }[];
};

/** Identifiant stable et court d'un achat Google (le purchaseToken est très long). */
const tokenId = (purchaseToken: string) =>
  crypto.createHash('sha256').update(purchaseToken).digest('hex').slice(0, 40);

// ── POST /api/iap/verify-google ───────────────────────────────────────────────
// Body : { productId, purchaseToken }
googleIapRoutes.post('/verify-google', requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const body = req.body as { productId?: string; purchaseToken?: string };
  const productId = String(body?.productId ?? '').trim();
  const purchaseToken = String(body?.purchaseToken ?? '').trim();
  if (!productId || !purchaseToken) {
    return res.status(400).json({ success: false, message: 'Achat Google Play incomplet.' });
  }
  if (!loadServiceAccount()) {
    console.error('iap/verify-google : GOOGLE_PLAY_SERVICE_ACCOUNT_JSON manquant');
    return res.status(503).json({ success: false, message: 'Vérification Google Play momentanément indisponible. Réessayez.' });
  }

  try {
    // ── Premium couple (achat unique) ──────────────────────────────────────
    if (productId === IAP_PRODUCTS.premium) {
      const { status, data } = await playApi<ProductPurchase>(
        `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`,
      );
      if (status !== 200) {
        return res.status(400).json({ success: false, message: 'Achat Google Play introuvable.' });
      }
      if (data.purchaseState === 2) {
        return res.status(402).json({ success: false, message: 'Paiement en attente : le Premium sera activé dès sa validation par Google Play.' });
      }
      if (data.purchaseState !== 0) {
        return res.status(400).json({ success: false, message: 'Cet achat a été annulé ou remboursé.' });
      }
      const id = `google:${data.orderId ?? tokenId(purchaseToken)}`;
      const claimed = await pool.query(
        `SELECT id FROM users WHERE premium_apple_transaction_id = $1 AND id <> $2 LIMIT 1`,
        [id, userId],
      );
      if (claimed.rows[0]) {
        return res.status(409).json({ success: false, message: 'Cet achat est déjà utilisé par un autre compte Oheve. Contactez support@ohevewedding.com.' });
      }
      // La colonne historique « premium_apple_transaction_id » stocke l'identifiant
      // d'achat du store, préfixé « google: » pour Google Play.
      await pool.query(
        `UPDATE users SET
           premium = true,
           premium_purchased_at = COALESCE(premium_purchased_at, NOW()),
           premium_apple_transaction_id = $1
         WHERE id = $2`,
        [id, userId],
      );
      if (data.acknowledgementState !== 1) {
        await playApi(
          `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
          'POST',
        ).catch((err) => console.error('acknowledge premium Google:', err));
      }
      return res.json({ success: true, data: { product: 'premium', premium: true } });
    }

    // ── Abonnement prestataire ─────────────────────────────────────────────
    if (productId === IAP_PRODUCTS.prestaMonthly) {
      const { status, data } = await playApi<SubscriptionPurchaseV2>(
        `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
      );
      if (status !== 200) {
        return res.status(400).json({ success: false, message: 'Abonnement Google Play introuvable.' });
      }
      const item = data.lineItems?.find((l) => l.productId === productId) ?? data.lineItems?.[0];
      if (!item || item.productId !== productId) {
        return res.status(400).json({ success: false, message: 'Abonnement non lié à Oheve.' });
      }
      const state = data.subscriptionState ?? '';
      const expiresMs = item.expiryTime ? Date.parse(item.expiryTime) : 0;
      const active = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED']
        .includes(state) && expiresMs > Date.now();
      if (!active) {
        return res.status(402).json({ success: false, message: 'Cet abonnement Google Play est expiré ou en attente de paiement.' });
      }
      // Les renouvellements/upgrades créent un nouveau token qui pointe vers
      // l'ancien : on identifie l'abonnement par le token d'origine.
      const subId = `google:${tokenId(data.linkedPurchaseToken || purchaseToken)}`;
      const claimed = await pool.query(
        `SELECT id FROM users WHERE presta_sub_id = $1 AND id <> $2 LIMIT 1`,
        [subId, userId],
      );
      if (claimed.rows[0]) {
        return res.status(409).json({ success: false, message: 'Cet abonnement est déjà utilisé par un autre compte Oheve. Contactez support@ohevewedding.com.' });
      }
      const isTrial = !!item.offerPhase?.freeTrial;
      const expiresAt = new Date(expiresMs);
      if (isTrial) await claimFounderRank(userId);
      await pool.query(
        `UPDATE users SET
           presta_sub_id = $1,
           presta_sub_status = $2,
           presta_trial_end = $3,
           presta_current_period_end = $4
         WHERE id = $5`,
        [subId, isTrial ? 'trialing' : 'active', isTrial ? expiresAt : null, expiresAt, userId],
      );
      if (data.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
        await playApi(
          `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
          'POST',
        ).catch((err) => console.error('acknowledge abonnement Google:', err));
      }
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

    return res.status(400).json({ success: false, message: `Produit inconnu : ${productId}` });
  } catch (err: any) {
    console.error('iap/verify-google error:', err?.message ?? err);
    return res.status(503).json({ success: false, message: 'Vérification Google Play momentanément indisponible. Réessayez.' });
  }
});
