import { NextFunction, Request, Response } from 'express';

import { requireAuth } from './requireAuth';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
      return;
    }
    next();
  });
}
