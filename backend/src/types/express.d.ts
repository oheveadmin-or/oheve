import { UserRole } from '../auth/jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: { sub: number; email: string; role: UserRole };
    }
  }
}

export {};
