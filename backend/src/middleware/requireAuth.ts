import { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '../auth/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentification requise' });
    return;
  }
  const token = header.slice(7).trim();
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Session expirée — reconnecte-toi' });
  }
}
