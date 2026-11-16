import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Deux jetons signés, chacun avec SA clé (jamais JWT_SECRET) : un jeton de
 * lien e-mail ne peut donc jamais servir de jeton de session de l'app.
 *
 *  - lien magique « Voir la demande » : JWT (DEMANDE_LINK_SECRET), valable
 *    30 jours, limité à UNE demande et UN utilisateur ;
 *  - désinscription « Ne plus recevoir de demandes » : HMAC-SHA256
 *    (UNSUBSCRIBE_SECRET), sans expiration (un lien de désinscription doit
 *    toujours marcher).
 */

const DEV_LINK = '__dev_only_demande_link_secret__';
const DEV_UNSUB = '__dev_only_unsubscribe_secret__';

function secret(name: string, devFallback: string): string {
  const s = process.env[name]?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} manquant ou trop court (min. 16 caractères)`);
  }
  return devFallback;
}

const LINK_TTL_SECONDS = 60 * 60 * 24 * 30;

export function signDemandeLink(userId: number, demandeId: number): string {
  return jwt.sign({ typ: 'demande', did: demandeId }, secret('DEMANDE_LINK_SECRET', DEV_LINK), {
    subject: String(userId),
    expiresIn: LINK_TTL_SECONDS,
  });
}

/** Renvoie { userId, demandeId } ou null si le jeton est invalide/expiré. */
export function verifyDemandeLink(token: string): { userId: number; demandeId: number } | null {
  try {
    const d = jwt.verify(token, secret('DEMANDE_LINK_SECRET', DEV_LINK)) as jwt.JwtPayload;
    if (d.typ !== 'demande') return null;
    const userId = Number(d.sub);
    const demandeId = Number(d.did);
    if (!Number.isInteger(userId) || !Number.isInteger(demandeId)) return null;
    return { userId, demandeId };
  } catch {
    return null;
  }
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', secret('UNSUBSCRIBE_SECRET', DEV_UNSUB)).update(payload).digest('base64url');
}

export function signUnsubscribe(userId: number): string {
  const payload = `u${userId}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifyUnsubscribe(token: string): number | null {
  const m = /^u(\d+)\.([A-Za-z0-9_-]+)$/.exec(token ?? '');
  if (!m) return null;
  const expected = Buffer.from(hmac(`u${m[1]}`));
  const given = Buffer.from(m[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return parseInt(m[1], 10);
}
