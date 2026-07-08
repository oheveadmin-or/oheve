import Stripe from 'stripe';
import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-05-27.dahlia' as any });

// Le namespace de types `Stripe.*` n'est pas exposé dans cette version : on
// dérive les types depuis les retours de méthodes (même contournement que premium).
type StripeSub = Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>;

export const prestataireSubscriptionRoutes = Router();

// ── Constantes de l'offre ──────────────────────────────────────────────────
const PRICE_CENTS = 3900;            // 39€
const TRIAL_DAYS = 90;               // 3 mois offerts
const CURRENCY = 'eur';
const PRODUCT_ID = 'oheve_prestataire_sub';
const PRICE_LOOKUP_KEY = 'oheve_presta_39_monthly';

// Statuts Stripe qui donnent accès à l'espace prestataire.
const ACTIVE_STATUSES = ['trialing', 'active'];
export function isPrestaSubActive(status?: string | null): boolean {
  return !!status && ACTIVE_STATUSES.includes(status);
}

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
  const periodEnd = (sub as any).current_period_end
    ? new Date((sub as any).current_period_end * 1000)
    : null;

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

// ── POST /start ─────────────────────────────────────────────────────────────
// Crée (ou reprend) l'abonnement avec 90 jours d'essai et renvoie le SetupIntent
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
        trial_period_days: TRIAL_DAYS,
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
        trial_days: TRIAL_DAYS,
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
    const sub = await stripe.subscriptions.update(row.presta_sub_id, { cancel_at_period_end: true });
    await syncPrestaSubscription(sub);
    return res.json({ success: true, data: { cancel_at_period_end: sub.cancel_at_period_end } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
