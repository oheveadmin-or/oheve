import { Router, Request, Response } from 'express';

import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

export const subscriptionRoutes = Router();

export const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 7,
    currency: 'EUR',
    interval: 'mois',
    features: [
      'Jusqu\'à 20 photos',
      'Profil boutique visible dans le répertoire',
      'Contact direct avec les clients',
      'Badge Boutique',
    ],
    limits: { photos: 20, videos: 0 },
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 20,
    currency: 'EUR',
    interval: 'mois',
    features: [
      'Photos illimitées',
      'Vidéos illimitées',
      'Visibilité prioritaire (en tête de liste)',
      'Badge Boutique Plus ⭐',
      'Statistiques de consultation avancées',
    ],
    limits: { photos: -1, videos: -1 },
  },
} as const;

// GET /api/subscriptions/plans
subscriptionRoutes.get('/plans', (_req: Request, res: Response) => {
  return res.json({ success: true, data: Object.values(SUBSCRIPTION_PLANS) });
});

// GET /api/subscriptions/me
subscriptionRoutes.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT subscription_plan, subscription_status, subscription_started_at, subscription_expires_at
       FROM users WHERE id = $1`,
      [req.auth!.sub]
    );
    const sub = r.rows[0];
    const plan = sub?.subscription_plan ? SUBSCRIPTION_PLANS[sub.subscription_plan as keyof typeof SUBSCRIPTION_PLANS] : null;
    return res.json({ success: true, data: { ...sub, plan_details: plan } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// POST /api/subscriptions/subscribe
subscriptionRoutes.post('/subscribe', requireAuth, async (req: Request, res: Response) => {
  const { plan } = req.body;
  if (!plan || !SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
    return res.status(400).json({ success: false, message: 'Plan invalide — choisissez "basic" ou "plus"' });
  }
  if (req.auth!.role !== 'boutique' && req.auth!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Réservé aux comptes boutique' });
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  try {
    const r = await pool.query(
      `UPDATE users SET
         subscription_plan = $1,
         subscription_status = 'active',
         subscription_started_at = $2,
         subscription_expires_at = $3
       WHERE id = $4
       RETURNING id, email, role, subscription_plan, subscription_status, subscription_expires_at`,
      [plan, now, expiresAt, req.auth!.sub]
    );
    const planDetails = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
    return res.json({ success: true, data: { ...r.rows[0], plan_details: planDetails } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur lors de la souscription' });
  }
});

// DELETE /api/subscriptions/me
subscriptionRoutes.delete('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query(
      `UPDATE users SET subscription_status = 'cancelled' WHERE id = $1`,
      [req.auth!.sub]
    );
    return res.json({ success: true, message: 'Abonnement annulé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// PATCH /api/subscriptions/:userId (admin only — set subscription manually)
subscriptionRoutes.patch('/:userId', requireAdmin, async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { plan, status } = req.body;

  if (plan && !SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
    return res.status(400).json({ success: false, message: 'Plan invalide' });
  }

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (plan !== undefined) {
    sets.push(`subscription_plan=$${i++}`);
    vals.push(plan || null);
    if (plan) {
      sets.push(`subscription_started_at=$${i++}`);
      vals.push(new Date());
      const exp = new Date();
      exp.setMonth(exp.getMonth() + 1);
      sets.push(`subscription_expires_at=$${i++}`);
      vals.push(exp);
    }
  }
  if (status !== undefined) {
    sets.push(`subscription_status=$${i++}`);
    vals.push(status);
  }

  if (sets.length === 0) {
    return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });
  }

  vals.push(userId);
  try {
    const r = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${i}
       RETURNING id, email, role, subscription_plan, subscription_status, subscription_expires_at`,
      vals
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});
