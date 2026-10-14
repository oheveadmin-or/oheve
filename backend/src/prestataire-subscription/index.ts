import Stripe from 'stripe';
import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { optionalAuth, requireAuth } from '../middleware/requireAuth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-05-27.dahlia' as any });

// Le namespace de types `Stripe.*` n'est pas exposé dans cette version : on
// dérive les types depuis les retours de méthodes (même contournement que premium).
type StripeSub = Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>;

export const prestataireSubscriptionRoutes = Router();

// ── Constantes de l'offre ──────────────────────────────────────────────────
const PRICE_CENTS = 3999;            // 39,99 €
const TRIAL_DAYS = 90;               // 3 mois offerts (offre standard)
const CURRENCY = 'eur';

// ── Offre de lancement ──────────────────────────────────────────────────────
// Les 200 premiers prestataires qui activent leur espace bénéficient de 6 mois
// offerts au lieu de 3. La place est consommée au démarrage de l'abonnement
// (Stripe /start ou vérification de l'achat Apple) et n'est jamais rendue.
// ⚠️ Sur iOS, la durée réellement offerte vient de l'offre d'introduction
// configurée dans App Store Connect (StoreKit) : quand les 200 places sont
// prises, il faut y repasser l'offre d'introduction de 6 à 3 mois — sinon
// l'App Store continuera d'offrir 6 mois alors que l'app annonce 3.
export const FOUNDER_LIMIT = 200;
export const FOUNDER_TRIAL_DAYS = 180;  // 6 mois offerts
const PRODUCT_ID = 'oheve_prestataire_sub';
// ⚠️ Les prix Stripe sont immuables : changer PRICE_CENTS sans changer la clé
// laisserait `prices.list` retrouver l'ancien tarif. Toute évolution du prix
// doit donc s'accompagner d'un nouveau lookup_key.
const PRICE_LOOKUP_KEY = 'oheve_presta_3999_monthly';

// Statuts Stripe qui donnent accès à l'espace prestataire.
const ACTIVE_STATUSES = ['trialing', 'active'];
export function isPrestaSubActive(status?: string | null): boolean {
  return !!status && ACTIVE_STATUSES.includes(status);
}

// Abonnement souscrit via Apple In-App Purchase (iOS) : presta_sub_id est de la
// forme 'apple:<originalTransactionId>' (voir src/iap). Il n'est PAS géré par
// Stripe : renouvellement et résiliation passent par l'App Store.
// Idem pour Google Play Billing (Android) : 'google:<id>' (voir src/iap/google).
// Les deux sont des abonnements « store », hors Stripe.
export function isAppleSub(subId?: string | null): boolean {
  return !!subId && (subId.startsWith('apple:') || subId.startsWith('google:'));
}

// ── Offre de lancement : attribution des 200 places ─────────────────────────

const FOUNDER_LOCK_KEY = 815200;   // clé arbitraire du verrou consultatif

/** Nombre de places fondateur déjà attribuées. */
async function countFounders(): Promise<number> {
  const row = (await pool.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE presta_founder_rank IS NOT NULL`
  )).rows[0];
  return row?.n ?? 0;
}

/**
 * Attribue une place fondateur au user si le quota n'est pas atteint, et
 * renvoie son rang (déjà attribué ou nouveau), ou null s'il n'y a plus de place.
 *
 * Le verrou consultatif sérialise les attributions concurrentes : sans lui,
 * deux inscriptions simultanées pourraient lire le même compteur et distribuer
 * la 201e place.
 */
export async function claimFounderRank(userId: number): Promise<number | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [FOUNDER_LOCK_KEY]);

    const existing = (await client.query(
      `SELECT presta_founder_rank FROM users WHERE id=$1`, [userId]
    )).rows[0];
    if (existing?.presta_founder_rank) {
      await client.query('COMMIT');
      return existing.presta_founder_rank;
    }

    const taken = (await client.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE presta_founder_rank IS NOT NULL`
    )).rows[0]?.n ?? 0;
    if (taken >= FOUNDER_LIMIT) {
      await client.query('COMMIT');
      return null;
    }

    const rank = taken + 1;
    await client.query(
      `UPDATE users SET presta_founder_rank=$1 WHERE id=$2`, [rank, userId]
    );
    await client.query('COMMIT');
    return rank;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('claimFounderRank:', (err as Error).message);
    return null;   // best-effort : un échec ne doit pas casser la souscription
  } finally {
    client.release();
  }
}

/**
 * Nombre de jours d'essai auxquels ce user a droit, SANS consommer de place :
 * 180 s'il est déjà fondateur ou s'il reste des places au moment de l'appel.
 *
 * La place n'est prise qu'une fois l'abonnement réellement souscrit (carte
 * validée via /confirm, ou achat Apple vérifié) : sinon un prestataire qui
 * ouvre l'écran d'abonnement puis abandonne brûlerait une des 200 places.
 */
async function trialDaysFor(userId: number): Promise<number> {
  const row = (await pool.query(
    `SELECT presta_founder_rank FROM users WHERE id=$1`, [userId]
  )).rows[0];
  if (row?.presta_founder_rank) return FOUNDER_TRIAL_DAYS;
  return (await countFounders()) < FOUNDER_LIMIT ? FOUNDER_TRIAL_DAYS : TRIAL_DAYS;
}

// ── GET /offer ───────────────────────────────────────────────────────────────
// Décrit l'offre en cours pour cet utilisateur : c'est l'app qui affiche
// « 6 mois offerts » ou « 3 mois offerts » d'après cette réponse, jamais une
// constante codée en dur dans l'écran. Lisible sans être connecté : l'écran
// d'inscription annonce l'offre avant qu'un compte existe.
prestataireSubscriptionRoutes.get('/offer', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.sub ?? null;
    const row = userId
      ? (await pool.query(
          `SELECT presta_founder_rank FROM users WHERE id=$1`, [userId]
        )).rows[0]
      : null;
    const taken = await countFounders();
    const isFounder = !!row?.presta_founder_rank;
    // Une place est déjà réservée pour un fondateur : l'offre lui reste acquise.
    const founderOpen = isFounder || taken < FOUNDER_LIMIT;
    const trialDays = founderOpen ? FOUNDER_TRIAL_DAYS : TRIAL_DAYS;

    return res.json({
      success: true,
      data: {
        founder_open: founderOpen,
        is_founder: isFounder,
        founder_rank: row?.presta_founder_rank ?? null,
        founder_limit: FOUNDER_LIMIT,
        founder_taken: taken,
        founder_remaining: Math.max(0, FOUNDER_LIMIT - taken),
        trial_days: trialDays,
        trial_months: Math.round(trialDays / 30),
        price_cents: PRICE_CENTS,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Prix récurrent : réutilisé ou créé à la volée (aucune config dashboard) ──
let _cachedPriceId: string | null = null;
async function getPriceId(): Promise<string> {
  if (process.env.STRIPE_PRESTA_PRICE_ID) return process.env.STRIPE_PRESTA_PRICE_ID;
  if (_cachedPriceId) return _cachedPriceId;

  // 1) Un prix avec ce lookup_key existe-t-il déjà ?
  const existing = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1 });
  if (existing.data[0]) {
    _cachedPriceId = existing.data[0].id;
    return _cachedPriceId;
  }

  // 2) S'assurer que le produit existe (id déterministe → idempotent).
  try {
    await stripe.products.create({ id: PRODUCT_ID, name: 'Abonnement Prestataire Oheve' });
  } catch (err: any) {
    // resource_already_exists = déjà créé lors d'un précédent appel : on ignore.
    if (err?.code !== 'resource_already_exists') throw err;
  }

  const price = await stripe.prices.create({
    product: PRODUCT_ID,
    currency: CURRENCY,
    unit_amount: PRICE_CENTS,
    recurring: { interval: 'month' },
    lookup_key: PRICE_LOOKUP_KEY,
  });
  _cachedPriceId = price.id;
  return _cachedPriceId;
}

// ── Client Stripe du user (créé/mémorisé) ──────────────────────────────────
async function ensureCustomer(userId: number): Promise<string> {
  const u = (await pool.query(
    `SELECT stripe_customer_id, email, nom, prenom FROM users WHERE id=$1`, [userId]
  )).rows[0];
  if (!u) throw new Error('Utilisateur introuvable');
  if (u.stripe_customer_id) return u.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: u.email ?? undefined,
    name: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || undefined,
    metadata: { user_id: String(userId) },
  });
  await pool.query(`UPDATE users SET stripe_customer_id=$1 WHERE id=$2`, [customer.id, userId]);
  return customer.id;
}

/** Persiste l'état d'un abonnement Stripe sur le compte du user. Source de
 *  vérité = Stripe. Utilisé par /confirm, /status (réconciliation) et le webhook. */
export async function syncPrestaSubscription(sub: StripeSub): Promise<number | null> {
  const userId = sub.metadata?.user_id ? parseInt(sub.metadata.user_id, 10) : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
  // Depuis l'API 2026, `current_period_end` a migré de l'abonnement vers ses
  // items : on lit d'abord la racine (anciennes versions) puis l'item, et en
  // dernier recours la fin d'essai (période courante d'un abonnement en essai).
  const periodEndTs =
    (sub as any).current_period_end
    ?? (sub as any).items?.data?.[0]?.current_period_end
    ?? sub.trial_end
    ?? null;
  const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;

  // Une CB doit être enregistrée pour débloquer l'accès : Stripe crée déjà
  // l'abonnement en 'trialing' AVANT toute saisie de carte (default_incomplete +
  // trial). Sans moyen de paiement, on garde 'incomplete' (accès bloqué) même si
  // Stripe dit 'trialing'/'active'. /confirm fixe le default_payment_method.
  const hasPaymentMethod = !!sub.default_payment_method;
  const effectiveStatus =
    !hasPaymentMethod && isPrestaSubActive(sub.status) ? 'incomplete' : sub.status;

  // Retrouver le user par metadata OU par l'id d'abonnement déjà stocké.
  const result = await pool.query(
    `UPDATE users SET
        presta_sub_id = $1,
        presta_sub_status = $2,
        presta_trial_end = $3,
        presta_current_period_end = $4
      WHERE ($5::int IS NOT NULL AND id = $5) OR presta_sub_id = $1
      RETURNING id`,
    [sub.id, effectiveStatus, trialEnd, periodEnd, userId]
  );
  return result.rows[0]?.id ?? null;
}

/** Suppression de compte (Guideline 5.1.1) : résilie immédiatement l'abonnement
 *  Stripe du prestataire pour ne pas prélever un compte qui n'existe plus.
 *  Best-effort : un échec Stripe ne doit pas bloquer la suppression.
 *  Les abonnements Apple ne peuvent pas être annulés côté serveur (l'app
 *  prévient l'utilisateur de résilier depuis les Réglages iOS). */
export async function cancelStripeSubOnAccountDeletion(userId: number): Promise<void> {
  try {
    const row = (await pool.query(
      `SELECT presta_sub_id FROM users WHERE id=$1`, [userId]
    )).rows[0];
    if (row?.presta_sub_id && !isAppleSub(row.presta_sub_id)) {
      await stripe.subscriptions.cancel(row.presta_sub_id);
    }
  } catch (err: any) {
    console.error('cancelStripeSubOnAccountDeletion:', err.message);
  }
}

// ── POST /start ─────────────────────────────────────────────────────────────
// Crée (ou reprend) l'abonnement avec l'essai dû (180 j pour les 200 premiers
// prestataires, 90 j ensuite) et renvoie le SetupIntent
// pour saisir la CB. Tant que la CB n'est pas validée via /confirm, on garde le
// statut 'incomplete' (accès bloqué) même si Stripe considère déjà l'essai actif.
prestataireSubscriptionRoutes.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;
    if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Réservé aux comptes prestataire' });
    }

    const current = (await pool.query(
      `SELECT presta_sub_id, presta_sub_status FROM users WHERE id=$1`, [userId]
    )).rows[0];

    // Déjà actif/essai avec CB validée → rien à faire.
    if (isPrestaSubActive(current?.presta_sub_status)) {
      return res.json({ success: true, data: { already_active: true, status: current.presta_sub_status } });
    }

    const customerId = await ensureCustomer(userId);
    const priceId = await getPriceId();
    // Durée d'essai due à ce compte. La place fondateur n'est PAS consommée
    // ici : elle l'est dans /confirm, une fois la carte validée.
    const trialDays = await trialDaysFor(userId);

    // Réutiliser un abonnement déjà démarré (incomplete) plutôt que d'en empiler.
    let sub: StripeSub | null = null;
    if (current?.presta_sub_id) {
      try {
        const existing = await stripe.subscriptions.retrieve(current.presta_sub_id, {
          expand: ['pending_setup_intent'],
        });
        if (!['canceled', 'incomplete_expired'].includes(existing.status)) sub = existing;
      } catch { /* introuvable → on en recrée un */ }
    }

    if (!sub) {
      sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        expand: ['pending_setup_intent'],
        metadata: { user_id: String(userId), product: 'prestataire_subscription' },
      });
    }

    const setupIntent = sub.pending_setup_intent as any;
    if (!setupIntent?.client_secret) {
      return res.status(500).json({ success: false, message: 'Impossible de préparer la saisie de carte.' });
    }

    // On mémorise l'abonnement mais en 'incomplete' : l'accès reste bloqué tant
    // que /confirm n'a pas vérifié qu'une CB est bien enregistrée.
    await pool.query(
      `UPDATE users SET presta_sub_id=$1, presta_sub_status='incomplete' WHERE id=$2`,
      [sub.id, userId]
    );

    return res.json({
      success: true,
      data: {
        subscription_id: sub.id,
        setup_client_secret: setupIntent.client_secret,
        customer_id: customerId,
        trial_days: trialDays,
        price_cents: PRICE_CENTS,
      },
    });
  } catch (err: any) {
    console.error('presta-sub/start error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /confirm ───────────────────────────────────────────────────────────
// Appelé après confirmSetupIntent côté app. Vérifie qu'une CB est bien attachée
// puis débloque l'accès (persiste le vrai statut Stripe : 'trialing').
prestataireSubscriptionRoutes.post('/confirm', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;
    const subscriptionId = String((req.body as { subscription_id?: string })?.subscription_id ?? '').trim();
    if (!subscriptionId) {
      return res.status(400).json({ success: false, message: 'subscription_id requis' });
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['pending_setup_intent', 'default_payment_method'],
    });

    if (String(sub.metadata?.user_id ?? '') !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Cet abonnement ne vous appartient pas.' });
    }

    // Récupérer la CB validée (via le SetupIntent) et la fixer comme moyen de
    // paiement par défaut de l'abonnement ET du client (pour les factures post-essai).
    const dpm = sub.default_payment_method as any;
    let paymentMethodId: string | null =
      typeof dpm === 'string' ? dpm : dpm?.id ?? null;

    if (!paymentMethodId) {
      const si = sub.pending_setup_intent as any;
      const pm = si?.payment_method;
      paymentMethodId = typeof pm === 'string' ? pm : pm?.id ?? null;
    }

    if (!paymentMethodId) {
      return res.status(402).json({ success: false, message: 'Aucune carte enregistrée — réessayez.' });
    }

    await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    });
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Abonnement réellement souscrit : c'est maintenant, et pas avant, que la
    // place de l'offre de lancement est consommée. Sans effet si le quota est
    // atteint entre-temps — l'essai déjà accordé par Stripe reste acquis.
    await claimFounderRank(userId);

    const fresh = await stripe.subscriptions.retrieve(subscriptionId);
    await syncPrestaSubscription(fresh);

    return res.json({
      success: true,
      data: {
        status: fresh.status,
        active: isPrestaSubActive(fresh.status),
        trial_end: fresh.trial_end ? new Date(fresh.trial_end * 1000).toISOString() : null,
      },
    });
  } catch (err: any) {
    console.error('presta-sub/confirm error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /status ─────────────────────────────────────────────────────────────
// Statut courant, réconcilié depuis Stripe (filet si un webhook a été manqué).
prestataireSubscriptionRoutes.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;
    let row = (await pool.query(
      `SELECT presta_sub_id, presta_sub_status, presta_trial_end, presta_current_period_end
       FROM users WHERE id=$1`, [userId]
    )).rows[0];

    // ── Abonnement Apple (iOS) : pas de réconciliation Stripe. L'expiration
    // stockée (renouvelée à chaque re-vérification du JWS par l'app) fait foi.
    if (isAppleSub(row?.presta_sub_id)) {
      const endMs = row?.presta_current_period_end
        ? new Date(row.presta_current_period_end).getTime() : null;
      const expired = !!endMs && endMs < Date.now();
      if (expired && isPrestaSubActive(row?.presta_sub_status)) {
        await pool.query(
          `UPDATE users SET presta_sub_status='canceled' WHERE id=$1`, [userId]
        );
        row.presta_sub_status = 'canceled';
      }
      return res.json({
        success: true,
        data: {
          provider: 'apple',
          status: row?.presta_sub_status ?? null,
          active: isPrestaSubActive(row?.presta_sub_status),
          trial_end: row?.presta_trial_end ?? null,
          current_period_end: row?.presta_current_period_end ?? null,
          cancel_at_period_end: false,
        },
      });
    }

    let cancelAtPeriodEnd = false;
    if (row?.presta_sub_id) {
      try {
        // syncPrestaSubscription ne débloque que si une CB est enregistrée :
        // un 'incomplete' local le reste tant que la carte n'est pas validée.
        const sub = await stripe.subscriptions.retrieve(row.presta_sub_id);
        cancelAtPeriodEnd = sub.cancel_at_period_end === true;
        await syncPrestaSubscription(sub);
        row = (await pool.query(
          `SELECT presta_sub_id, presta_sub_status, presta_trial_end, presta_current_period_end
           FROM users WHERE id=$1`, [userId]
        )).rows[0];
      } catch { /* Stripe indisponible → on renvoie l'état local */ }
    }

    return res.json({
      success: true,
      data: {
        provider: 'stripe',
        status: row?.presta_sub_status ?? null,
        active: isPrestaSubActive(row?.presta_sub_status),
        trial_end: row?.presta_trial_end ?? null,
        current_period_end: row?.presta_current_period_end ?? null,
        cancel_at_period_end: cancelAtPeriodEnd,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /cancel ────────────────────────────────────────────────────────────
// Annulation à la fin de la période en cours (garde l'accès jusque-là).
prestataireSubscriptionRoutes.post('/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;
    const row = (await pool.query(`SELECT presta_sub_id FROM users WHERE id=$1`, [userId])).rows[0];
    if (!row?.presta_sub_id) {
      return res.status(404).json({ success: false, message: 'Aucun abonnement à annuler' });
    }
    if (isAppleSub(row.presta_sub_id)) {
      // Impossible côté serveur : Apple gère la résiliation.
      return res.status(400).json({
        success: false,
        message: row.presta_sub_id.startsWith('google:')
          ? 'Abonnement souscrit via Google Play — résiliez-le depuis Google Play → Paiements et abonnements → Abonnements.'
          : 'Abonnement souscrit via l\'App Store — résiliez-le depuis Réglages → Apple ID → Abonnements sur votre iPhone.',
      });
    }
    const sub = await stripe.subscriptions.update(row.presta_sub_id, { cancel_at_period_end: true });
    await syncPrestaSubscription(sub);
    return res.json({ success: true, data: { cancel_at_period_end: sub.cancel_at_period_end } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
