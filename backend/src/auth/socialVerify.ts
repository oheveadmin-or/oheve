import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Vérification serveur des identités sociales.
 *
 * Le client n'est jamais cru sur parole : sans vérification, n'importe qui
 * pourrait appeler POST /api/auth/social avec l'email d'un autre utilisateur
 * et obtenir ses tokens.
 *
 * - Apple  : le `identityToken` (JWT RS256 signé par Apple) est vérifié contre
 *   les clés publiques JWKS d'Apple (iss + aud = bundle id de l'app).
 * - Google : le flux passe par Supabase Auth côté app ; le backend valide le
 *   `supabase_access_token` en appelant GET {SUPABASE_URL}/auth/v1/user.
 */

export interface VerifiedSocialIdentity {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
}

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_AUDIENCE = process.env.APPLE_BUNDLE_ID?.trim() || 'com.oheve.wedding';

// Cache JWKS Apple (10 min) — évite un fetch réseau à chaque connexion
let appleKeysCache: { keys: { kid: string; [k: string]: unknown }[]; fetchedAt: number } | null = null;

async function getAppleKey(kid: string): Promise<crypto.KeyObject | null> {
  const fresh = appleKeysCache && Date.now() - appleKeysCache.fetchedAt < 10 * 60 * 1000;
  if (!fresh) {
    const res = await fetch(APPLE_JWKS_URL);
    if (!res.ok) throw new Error(`Apple JWKS: HTTP ${res.status}`);
    const body = (await res.json()) as { keys: { kid: string }[] };
    appleKeysCache = { keys: body.keys, fetchedAt: Date.now() };
  }
  const jwk = appleKeysCache!.keys.find((k) => k.kid === kid);
  if (!jwk) return null;
  return crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<VerifiedSocialIdentity> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new Error('Token Apple illisible');
  }
  let key = await getAppleKey(decoded.header.kid);
  if (!key) {
    // kid inconnu : Apple a peut-être tourné ses clés — on force un re-fetch
    appleKeysCache = null;
    key = await getAppleKey(decoded.header.kid);
  }
  if (!key) throw new Error('Clé publique Apple introuvable (kid inconnu)');

  const payload = jwt.verify(identityToken, key, {
    algorithms: ['RS256'],
    issuer: APPLE_ISSUER,
    audience: APPLE_AUDIENCE,
  }) as jwt.JwtPayload & { email?: string; email_verified?: boolean | string };

  if (!payload.sub) throw new Error('Token Apple sans sub');
  return {
    providerUserId: String(payload.sub),
    email: payload.email ? String(payload.email).toLowerCase() : null,
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
  };
}

export async function verifySupabaseAccessToken(accessToken: string): Promise<VerifiedSocialIdentity> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY non configurés sur le serveur');
  }
  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Token Supabase rejeté (HTTP ${res.status})`);
  const user = (await res.json()) as {
    id?: string;
    email?: string;
    email_confirmed_at?: string;
    user_metadata?: { email_verified?: boolean };
  };
  if (!user.id) throw new Error('Réponse Supabase invalide');
  return {
    providerUserId: user.id,
    email: user.email ? user.email.toLowerCase() : null,
    emailVerified: Boolean(user.email_confirmed_at || user.user_metadata?.email_verified),
  };
}

export function isSupabaseVerifyConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_ANON_KEY?.trim());
}
