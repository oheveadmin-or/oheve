import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const DEV_FALLBACK = '__dev_only_jwt_secret_min_16_chars__';

function getSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET manquant ou trop court (min. 16 chars)');
  }
  console.warn('[auth] JWT_SECRET absent — utilisation du secret dev');
  return DEV_FALLBACK;
}

export type UserRole = 'client' | 'prestataire' | 'boutique' | 'admin';

/** Access token : 1 heure */
export function signAccessToken(userId: number, email: string, role: UserRole): string {
  return jwt.sign({ sub: userId, email, role }, getSecret(), { expiresIn: 60 * 60 });
}

/** Builder token : 30 jours. Le builder web (WebView du site de mariage) reste
 *  ouvert longtemps pendant la conception (upload photos, enregistrements
 *  successifs) : un access token d'1 h expirait EN PLEINE session → chaque
 *  requête retombait en 401 « Session expirée ». Ce jeton dédié, à durée de vie
 *  longue, est vérifié par le même `verifyAccessToken` (même secret, même
 *  charge utile) — aucune vérification supplémentaire nécessaire. */
export function signBuilderToken(userId: number, email: string, role: UserRole): string {
  return jwt.sign({ sub: userId, email, role }, getSecret(), { expiresIn: 60 * 60 * 24 * 30 });
}

export function verifyAccessToken(token: string): { sub: number; email: string; role: UserRole } {
  const d = jwt.verify(token, getSecret()) as jwt.JwtPayload & {
    sub: number | string;
    email: string;
    role: UserRole;
  };
  const sub = typeof d.sub === 'string' ? Number(d.sub) : d.sub;
  if (!Number.isFinite(sub) || !d.email) throw new Error('Token invalide');
  return { sub, email: String(d.email), role: d.role ?? 'client' };
}

/** Refresh token : chaîne aléatoire opaque (64 hex chars) — stocké en DB */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/** Durée refresh : 30 jours */
export function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}
