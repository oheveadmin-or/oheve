import { Router } from 'express';
import { pool } from '../config/database';

export const healthRoutes = Router();

healthRoutes.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'The Event Planner API',
    timestamp: new Date().toISOString(),
  });
});

healthRoutes.get('/db', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
    res.json({ status: 'ok', db: result.rows[0], tables: tables.rows.map((r: { table_name: string }) => r.table_name) });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * Interrupteurs de l'app, lus au lancement : permet de MASQUER un bouton de
 * connexion cassé sans publier de mise à jour. Sur Railway :
 * DISABLE_GOOGLE_LOGIN=true / DISABLE_APPLE_LOGIN=true (puis redéploiement auto).
 */
healthRoutes.get('/app-config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    data: {
      google_login: process.env.DISABLE_GOOGLE_LOGIN !== 'true',
      apple_login: process.env.DISABLE_APPLE_LOGIN !== 'true',
    },
  });
});
