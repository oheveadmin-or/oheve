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

// GET /api/premium/status — vérifie le statut premium de l'utilisateur connecté
premiumRoutes.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.sub;
    const r = await pool.query(
      `SELECT premium, premium_purchased_at FROM users WHERE id=$1`,
      [userId]
    );
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
