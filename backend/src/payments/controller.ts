import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { pool } from '../config/database';
import { syncPrestaSubscription } from '../prestataire-subscription';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const PLATFORM_COMMISSION_RATE = 0.05; // 5%

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe: any = null;
function getStripe() {
  if (!_stripe) {
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non configurée');
    _stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' as any });
  }
  return _stripe;
}

export class PaymentsController {

  // ── POST /api/payments/create-intent ────────────────────────────────────────
  async createIntent(req: Request, res: Response) {
    try {
      const userId = req.auth!.sub;
      const { prestataire_id, amount_cents, currency = 'eur', description, conversation_id } = req.body;

      if (!prestataire_id || !amount_cents || amount_cents < 50) {
        return res.status(400).json({ success: false, message: 'prestataire_id et amount_cents (≥ 50 centimes) requis' });
      }

      // Récupérer le compte Stripe Connect du prestataire
      const connectRes = await pool.query(
        `SELECT stripe_account_id, charges_enabled FROM stripe_connect_accounts WHERE user_id=$1`,
        [prestataire_id]
      );
      const connect = connectRes.rows[0];
      if (!connect?.stripe_account_id || !connect.charges_enabled) {
        return res.status(400).json({
          success: false,
          message: 'Ce prestataire n\'a pas encore activé son compte de paiement Stripe.',
        });
      }

      const commission = Math.round(amount_cents * PLATFORM_COMMISSION_RATE);
      const net = amount_cents - commission;

      const intent = await getStripe().paymentIntents.create({
        amount: amount_cents,
        currency,
        description,
        automatic_payment_methods: { enabled: true },
        application_fee_amount: commission,
        transfer_data: { destination: connect.stripe_account_id },
        metadata: {
          client_id: String(userId),
          prestataire_id: String(prestataire_id),
          conversation_id: String(conversation_id ?? ''),
        },
      });

      // Sauvegarder en base
      await pool.query(
        `INSERT INTO payments
          (conversation_id, client_id, prestataire_id, stripe_payment_intent_id,
           amount_total, commission_amount, net_amount, currency, status, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)`,
        [conversation_id ?? null, userId, prestataire_id, intent.id,
         amount_cents, commission, net, currency, description ?? null]
      );

      return res.json({
        success: true,
        data: {
          client_secret: intent.client_secret,
          payment_intent_id: intent.id,
          amount_total: amount_cents,
          commission_amount: commission,
          net_amount: net,
          currency,
        },
      });
    } catch (err: any) {
      console.error('create-intent error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── POST /api/payments/connect/onboard ──────────────────────────────────────
  async connectOnboard(req: Request, res: Response) {
    try {
      const userId = req.auth!.sub;
      const { return_url, refresh_url } = req.body;

      // Chercher ou créer un compte Connect
      let row = (await pool.query(
        `SELECT * FROM stripe_connect_accounts WHERE user_id=$1`, [userId]
      )).rows[0];

      let accountId = row?.stripe_account_id;
      if (!accountId) {
        const userRes = await pool.query(`SELECT email, nom, prenom FROM users WHERE id=$1`, [userId]);
        const u = userRes.rows[0];
        const account = await getStripe().accounts.create({
          type: 'express',
          email: u?.email,
          business_type: 'individual',
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          metadata: { user_id: String(userId) },
        });
        accountId = account.id;
        await pool.query(
          `INSERT INTO stripe_connect_accounts (user_id, stripe_account_id) VALUES ($1,$2)
           ON CONFLICT (user_id) DO UPDATE SET stripe_account_id=$2, updated_at=NOW()`,
          [userId, accountId]
        );
      }

      const link = await getStripe().accountLinks.create({
        account: accountId,
        refresh_url: refresh_url ?? 'https://app.oheve.com/settings/payments',
        return_url: return_url ?? 'https://app.oheve.com/settings/payments?connected=1',
        type: 'account_onboarding',
      });

      return res.json({ success: true, data: { url: link.url, account_id: accountId } });
    } catch (err: any) {
      console.error('connect-onboard error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── GET /api/payments/connect/status ────────────────────────────────────────
  async connectStatus(req: Request, res: Response) {
    try {
      const userId = req.auth!.sub;
      const row = (await pool.query(
        `SELECT * FROM stripe_connect_accounts WHERE user_id=$1`, [userId]
      )).rows[0];

      if (!row?.stripe_account_id) {
        return res.json({ success: true, data: { connected: false } });
      }

      // Synchroniser avec Stripe
      const account = await getStripe().accounts.retrieve(row.stripe_account_id);
      await pool.query(
        `UPDATE stripe_connect_accounts SET
           onboarding_complete=$1, payouts_enabled=$2, charges_enabled=$3, updated_at=NOW()
         WHERE user_id=$4`,
        [account.details_submitted, account.payouts_enabled, account.charges_enabled, userId]
      );

      return res.json({
        success: true,
        data: {
          connected: true,
          account_id: account.id,
          onboarding_complete: account.details_submitted,
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── POST /api/payments/connect/refresh ──────────────────────────────────────
  async connectRefresh(req: Request, res: Response) {
    // Régénérer un lien d'onboarding (le lien précédent a expiré)
    return this.connectOnboard(req, res);
  }

  // ── GET /api/payments/history ────────────────────────────────────────────────
  async history(req: Request, res: Response) {
    try {
      const userId = req.auth!.sub;
      const { rows } = await pool.query(
        `SELECT p.*,
           uc.nom AS client_nom, uc.prenom AS client_prenom,
           up.nom AS presta_nom, up.prenom AS presta_prenom,
           pp.business_name
         FROM payments p
         JOIN users uc ON uc.id=p.client_id
         JOIN users up ON up.id=p.prestataire_id
         LEFT JOIN prestataire_profiles pp ON pp.user_id=p.prestataire_id
         WHERE p.client_id=$1 OR p.prestataire_id=$1
         ORDER BY p.created_at DESC LIMIT 50`,
        [userId]
      );
      return res.json({ success: true, data: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ── POST /api/payments/webhook ───────────────────────────────────────────────
  async webhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: any;

    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      await pool.query(
        `UPDATE payments SET status='succeeded', updated_at=NOW()
         WHERE stripe_payment_intent_id=$1`,
        [pi.id]
      );

      // Activer le Premium Oheve si c'est un achat du pack
      if (pi.metadata?.product === 'oheve_premium' && pi.metadata?.user_id) {
        await pool.query(
          `UPDATE users SET
             premium = true,
             premium_purchased_at = NOW(),
             premium_stripe_payment_intent_id = $1
           WHERE id = $2`,
          [pi.id, parseInt(pi.metadata.user_id, 10)]
        );
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      await pool.query(
        `UPDATE payments SET status='failed', updated_at=NOW()
         WHERE stripe_payment_intent_id=$1`,
        [pi.id]
      );
    }

    // Abonnement prestataire (39€/mois) — garder le statut en base à jour.
    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.created'
    ) {
      const sub = event.data.object;
      if (sub.metadata?.product === 'prestataire_subscription') {
        try { await syncPrestaSubscription(sub); }
        catch (e: any) { console.error('syncPrestaSubscription webhook error:', e.message); }
      }
    }

    if (event.type === 'account.updated') {
      const acct = event.data.object;
      await pool.query(
        `UPDATE stripe_connect_accounts
         SET onboarding_complete=$1, payouts_enabled=$2, charges_enabled=$3, updated_at=NOW()
         WHERE stripe_account_id=$4`,
        [acct.details_submitted, acct.payouts_enabled, acct.charges_enabled, acct.id]
      );
    }

    return res.json({ received: true });
  }
}
