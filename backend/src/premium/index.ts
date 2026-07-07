import Stripe from 'stripe';
import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-05-27.dahlia' as any });

export const premiumRoutes = Router();

const PREMIUM_PRICE_CENTS = 5000; // 50€

// POST /api/premium/purchase — crée un PaymentIntent Stripe pour Oheve Premium
premiumRoutes.post('/purchase', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;

    // Vérifier si déjà premium
    const existing = await pool.query(`SELECT premium FROM users WHERE id=$1`, [userId]);
    if (existing.rows[0]?.premium) {
      return res.json({ success: true, data: { already_premium: true } });
    }

    const userRes = await pool.query(`SELECT email, nom, prenom FROM users WHERE id=$1`, [userId]);
    const u = userRes.rows[0];

    const intent = await stripe.paymentIntents.create({
      amount: PREMIUM_PRICE_CENTS,
      currency: 'eur',
      description: 'Oheve Premium — Accès complet paiement unique',
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: String(userId),
        product: 'oheve_premium',
        user_email: u?.email ?? '',
      },
    });

    return res.json({
      success: true,
      data: {
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
        amount_cents: PREMIUM_PRICE_CENTS,
        currency: 'eur',
      },
    });
  } catch (err: any) {
    console.error('premium/purchase error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/premium/confirm — active le premium immédiatement après un paiement
// réussi, sans attendre le webhook Stripe (qui peut ne jamais arriver si mal
// configuré sur Railway → le site publié restait bloqué « activer Premium »
// alors que le client avait payé). On vérifie le PaymentIntent auprès de Stripe
// (source de vérité) : il doit être `succeeded`, appartenir à cet utilisateur et
// concerner le produit premium. Le webhook reste un filet de sécurité.
premiumRoutes.post('/confirm', requireAuth, async (req: Request, res: Response) => {
  const userId = req.auth!.sub;
  const paymentIntentId = String((req.body as { payment_intent_id?: string })?.payment_intent_id ?? '').trim();

  if (!paymentIntentId) {
    return res.status(400).json({ success: false, message: 'payment_intent_id requis' });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      return res.status(402).json({ success: false, message: 'Paiement non confirmé.' });
    }
    if (pi.metadata?.product !== 'oheve_premium') {
      return res.status(400).json({ success: false, message: 'Paiement non lié à Oheve Premium.' });
    }
    if (String(pi.metadata?.user_id ?? '') !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Ce paiement ne vous appartient pas.' });
    }

    await pool.query(
      `UPDATE users SET
         premium = true,
         premium_purchased_at = COALESCE(premium_purchased_at, NOW()),
         premium_stripe_payment_intent_id = $1
       WHERE id = $2`,
      [pi.id, userId]
    );

    return res.json({ success: true, data: { premium: true } });
  } catch (err: any) {
    console.error('premium/confirm error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/premium/activate — réservé à l'admin. Le webhook Stripe active le
// premium directement (payments/controller). Cette route était ouverte sans
// auth : n'importe qui pouvait s'activer Premium gratuitement.
premiumRoutes.post('/activate/:userId', requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { payment_intent_id } = req.body;

  try {
    await pool.query(
      `UPDATE users SET
         premium = true,
         premium_purchased_at = NOW(),
         premium_stripe_payment_intent_id = $1
       WHERE id = $2`,
      [payment_intent_id ?? null, userId]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** Filet de secours : si la BDD ne connaît pas le premium mais que le client a
 *  bel et bien payé (webhook Stripe jamais reçu), on demande à Stripe s'il
 *  existe un paiement premium `succeeded` pour cet utilisateur et on répare la
 *  BDD. Rend le premium auto-réparant à la prochaine ouverture de l'app. */
async function reconcilePremiumFromStripe(userId: number): Promise<boolean> {
  try {
    const search = await stripe.paymentIntents.search({
      query: `status:'succeeded' AND metadata['product']:'oheve_premium' AND metadata['user_id']:'${userId}'`,
      limit: 1,
    });
    const pi = search.data[0];
    if (!pi) return false;
    await pool.query(
      `UPDATE users SET
         premium = true,
         premium_purchased_at = COALESCE(premium_purchased_at, NOW()),
         premium_stripe_payment_intent_id = COALESCE(premium_stripe_payment_intent_id, $1)
       WHERE id = $2`,
      [pi.id, userId]
    );
    return true;
  } catch (err: any) {
    console.error('reconcilePremiumFromStripe error:', err.message);
    return false;
  }
}

// GET /api/premium/status — vérifie le statut premium de l'utilisateur connecté
premiumRoutes.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;
    let r = await pool.query(
      `SELECT premium, premium_purchased_at FROM users WHERE id=$1`,
      [userId]
    );
    // Non premium en BDD → tenter la réparation depuis Stripe (webhook manqué).
    if (!r.rows[0]?.premium && await reconcilePremiumFromStripe(userId)) {
      r = await pool.query(
        `SELECT premium, premium_purchased_at FROM users WHERE id=$1`,
        [userId]
      );
    }
    const row = r.rows[0];
    return res.json({
      success: true,
      data: {
        premium: row?.premium ?? false,
        purchased_at: row?.premium_purchased_at ?? null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
