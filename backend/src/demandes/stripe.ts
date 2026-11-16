import Stripe from 'stripe';

import { pool } from '../config/database';
import {
  claimFounderRank,
  ensureCustomer,
  getPriceId,
  isAdminGrant,
  isAppleSub,
  syncPrestaSubscription,
  trialDaysFor,
} from '../prestataire-subscription';
import { demandesConfig } from './config';
import { DemandeError, enregistrerDeblocage, notifierDeblocage, prestaAbonneActif } from './service';
import { signDemandeLink } from './tokens';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe: any = null;
function stripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new DemandeError(503, 'Le paiement n\'est pas encore configuré.');
    _stripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' as never });
  }
  return _stripe;
}

export const PRODUCT_DEBLOCAGE = 'demande_deblocage';
export const PRODUCT_ABONNEMENT_CHECKOUT = 'prestataire_subscription_checkout';

function pageDemande(demandeId: number, prestataireId: number, extra: string): string {
  const t = encodeURIComponent(signDemandeLink(prestataireId, demandeId));
  return `${demandesConfig.siteUrl}/demande/${demandeId}?t=${t}&${extra}`;
}

/**
 * Crée une session Stripe Checkout pour le prestataire de la demande.
 * Le retour sur success_url ne débloque RIEN : seul le webhook signé
 * (checkout.session.completed) change le statut en base.
 */
export async function creerCheckout(opts: {
  demandeId: number;
  prestataireId: number;
  type: 'deblocage' | 'abonnement';
}): Promise<{ url: string }> {
  const d = (await pool.query(`SELECT * FROM demandes WHERE id=$1 AND prestataire_id=$2`, [opts.demandeId, opts.prestataireId])).rows[0];
  if (!d) throw new DemandeError(404, 'Demande introuvable.');
  const user = (await pool.query(
    `SELECT presta_sub_status, presta_sub_id, presta_current_period_end FROM users WHERE id=$1`,
    [opts.prestataireId],
  )).rows[0];

  const success = pageDemande(d.id, opts.prestataireId, 'paiement=ok');
  const cancel = pageDemande(d.id, opts.prestataireId, 'paiement=annule');

  if (opts.type === 'deblocage') {
    if (d.statut !== 'verrouillee') throw new DemandeError(409, 'Cette demande est déjà accessible.');
    if (!demandesConfig.stripePriceDeblocage) {
      throw new DemandeError(503, 'Le déblocage à l\'unité n\'est pas encore disponible.');
    }
    const customer = await ensureCustomer(opts.prestataireId);
    const meta = { product: PRODUCT_DEBLOCAGE, demande_id: String(d.id), prestataire_id: String(opts.prestataireId) };
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer,
      line_items: [{ price: demandesConfig.stripePriceDeblocage, quantity: 1 }],
      client_reference_id: `demande:${d.id}`,
      metadata: meta,
      payment_intent_data: { metadata: meta, description: `Déblocage de la demande n°${d.id} — Ohevé` },
      success_url: success,
      cancel_url: cancel,
      locale: 'fr',
    });
    return { url: session.url };
  }

  // Abonnement
  if (prestaAbonneActif(user ?? {})) throw new DemandeError(409, 'Votre abonnement est déjà actif.');
  if (isAppleSub(user?.presta_sub_id) && user?.presta_sub_status && ['trialing', 'active'].includes(user.presta_sub_status)) {
    throw new DemandeError(409, 'Votre abonnement est géré par l\'App Store ou Google Play.');
  }
  // Un abonnement Stripe resté « incomplete » (écran d'abonnement de l'app
  // ouvert puis abandonné, sans carte) est annulé : sinon deux abonnements
  // coexisteraient pour le même compte.
  if (user?.presta_sub_id && !isAppleSub(user.presta_sub_id) && !isAdminGrant(user.presta_sub_id)) {
    try {
      const old = await stripe().subscriptions.retrieve(user.presta_sub_id);
      if (!['canceled', 'incomplete_expired'].includes(old.status) && !old.default_payment_method) {
        await stripe().subscriptions.cancel(old.id);
      }
    } catch { /* introuvable : rien à annuler */ }
  }
  const customer = await ensureCustomer(opts.prestataireId);
  const price = demandesConfig.stripePriceAbonnement || await getPriceId();
  const trialDays = await trialDaysFor(opts.prestataireId);
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: `presta:${opts.prestataireId}`,
    metadata: { product: PRODUCT_ABONNEMENT_CHECKOUT, user_id: String(opts.prestataireId), demande_id: String(d.id) },
    subscription_data: {
      // Même offre que dans l'app (essai 3 ou 6 mois) et même metadata : le
      // webhook customer.subscription.* existant met le compte à jour.
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      metadata: { user_id: String(opts.prestataireId), product: 'prestataire_subscription' },
    },
    payment_method_collection: 'always',
    success_url: success,
    cancel_url: cancel,
    locale: 'fr',
  });
  return { url: session.url };
}

/**
 * Événement Stripe déjà vérifié (signature contrôlée dans payments/controller).
 * Renvoie true si l'événement concernait les demandes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function traiterEvenementStripe(event: any): Promise<boolean> {
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return false;
  }
  const session = event.data.object;
  const product = session.metadata?.product;

  if (product === PRODUCT_DEBLOCAGE) {
    if (session.payment_status !== 'paid') return true; // paiement différé : on attend async_payment_succeeded
    const res = await enregistrerDeblocage({
      sessionId: session.id,
      demandeId: parseInt(session.metadata.demande_id, 10),
      prestataireId: parseInt(session.metadata.prestataire_id, 10),
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
    });
    if (res === 'debloquee') await notifierDeblocage(parseInt(session.metadata.demande_id, 10));
    return true;
  }

  if (product === PRODUCT_ABONNEMENT_CHECKOUT && session.subscription) {
    const userId = parseInt(session.metadata.user_id, 10);
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    const sub = await stripe().subscriptions.retrieve(subId);
    if (sub.default_payment_method || sub.status === 'active') {
      await claimFounderRank(userId);
    }
    // Met le compte à jour ET passe les demandes verrouillées en « abonnement ».
    await syncPrestaSubscription(sub);
    return true;
  }
  return false;
}
