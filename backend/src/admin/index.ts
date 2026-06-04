import { Router, Request, Response } from 'express';

import { pool } from '../config/database';
import { requireAdmin } from '../middleware/requireAdmin';

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);

// GET /api/admin/users
adminRoutes.get('/users', async (req: Request, res: Response) => {
  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (role) { conditions.push(`role=$${i++}`); vals.push(role); }
  if (search) {
    conditions.push(`(nom ILIKE $${i} OR prenom ILIKE $${i} OR email ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  vals.push(limit, offset);

  try {
    const r = await pool.query(
      `SELECT id,email,nom,prenom,role,is_active,avatar_url,phone,
              subscription_plan,subscription_status,subscription_expires_at,created_at
       FROM users ${where}
       ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
      vals
    );
    const count = await pool.query(`SELECT COUNT(*)::int FROM users ${where}`, vals.slice(0, -2));
    return res.json({ success: true, data: r.rows, total: count.rows[0].count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// PATCH /api/admin/users/:id
adminRoutes.patch('/users/:id', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { role, is_active } = req.body;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (role !== undefined) { sets.push(`role=$${i++}`); vals.push(role); }
  if (is_active !== undefined) { sets.push(`is_active=$${i++}`); vals.push(is_active); }
  if (sets.length === 0) return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });
  vals.push(userId);
  try {
    const r = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${i} RETURNING id,email,nom,prenom,role,is_active`,
      vals
    );
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// GET /api/admin/stats
adminRoutes.get('/stats', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE role='client') AS clients,
        (SELECT COUNT(*)::int FROM users WHERE role='prestataire') AS prestataires,
        (SELECT COUNT(*)::int FROM users WHERE role='boutique') AS boutiques,
        (SELECT COUNT(*)::int FROM users WHERE role='admin') AS admins,
        (SELECT COUNT(*)::int FROM users WHERE is_active=true) AS active_users,
        (SELECT COUNT(*)::int FROM users WHERE subscription_status='active') AS active_subscriptions,
        (SELECT COUNT(*)::int FROM users WHERE subscription_plan='plus' AND subscription_status='active') AS plus_subscribers,
        (SELECT COUNT(*)::int FROM conversations) AS conversations,
        (SELECT COUNT(*)::int FROM messages) AS messages,
        (SELECT COUNT(*)::int FROM prestataire_profiles WHERE is_verified=true) AS verified_prestataires
    `);
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// DELETE /api/admin/users/:id
adminRoutes.delete('/users/:id', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.auth!.sub) {
    return res.status(400).json({ success: false, message: 'Impossible de supprimer son propre compte' });
  }
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    return res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// DELETE /api/admin/prestataires/:userId (supprime le profil prestataire/boutique sans supprimer le compte)
adminRoutes.delete('/prestataires/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    const r = await pool.query(
      `DELETE FROM prestataire_profiles WHERE user_id=$1 RETURNING id`,
      [userId]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Profil prestataire introuvable' });
    }
    return res.json({ success: true, message: 'Profil prestataire supprimé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// PATCH /api/admin/prestataires/:userId/verify
adminRoutes.patch('/prestataires/:userId/verify', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { is_verified } = req.body;
  try {
    const r = await pool.query(
      `UPDATE prestataire_profiles SET is_verified=$1 WHERE user_id=$2 RETURNING id, user_id, is_verified`,
      [Boolean(is_verified), userId]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Profil introuvable' });
    }
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// GET /api/admin/subscriptions
adminRoutes.get('/subscriptions', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const where = status ? `WHERE subscription_status=$1 AND role='boutique'` : `WHERE role='boutique'`;
  const vals: unknown[] = status ? [status, limit, offset] : [limit, offset];
  const limitIdx = status ? 2 : 1;

  try {
    const r = await pool.query(
      `SELECT id,email,nom,prenom,role,is_active,
              subscription_plan,subscription_status,subscription_started_at,subscription_expires_at
       FROM users ${where}
       ORDER BY subscription_started_at DESC NULLS LAST
       LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      vals
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});
