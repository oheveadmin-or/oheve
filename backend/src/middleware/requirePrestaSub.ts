import { NextFunction, Request, Response } from 'express';

import { pool } from '../config/database';
import { isPrestaSubActive } from '../prestataire-subscription';

/**
 * Bloque les actions professionnelles d'un prestataire sans abonnement actif
 * (ni essai). À placer APRÈS requireAuth. Les admins passent toujours ;
 * les rôles non-prestataire ne sont pas concernés par cette barrière.
 */
export async function requirePrestaSub(req: Request, res: Response, next: NextFunction): Promise<void> {
  const role = req.auth?.role;
  if (role === 'admin' || (role !== 'prestataire')) {
    next();
    return;
  }
  try {
    const row = (await pool.query(
      `SELECT presta_sub_status FROM users WHERE id=$1`, [req.auth!.sub]
    )).rows[0];
    if (isPrestaSubActive(row?.presta_sub_status)) {
      next();
      return;
    }
    res.status(402).json({
      success: false,
      code: 'PRESTA_SUB_REQUIRED',
      message: 'Abonnement prestataire requis pour cette action.',
    });
  } catch {
    res.status(500).json({ success: false, message: 'Erreur de vérification de l\'abonnement' });
  }
}
