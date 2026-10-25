/**
 * Comptes prestataires créés par l'admin avec un IDENTIFIANT au lieu d'un email.
 *
 * La colonne users.email est NOT NULL et sert partout (JWT, Stripe…) : ces
 * comptes reçoivent donc un email technique `<identifiant>@identifiant.oheve`,
 * jamais montré ni utilisé pour envoyer un mail. Le prestataire le remplace par
 * son vrai email à sa première connexion.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = 'identifiant.oheve';

export const USERNAME_RULE = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

export function placeholderEmail(username: string): string {
  return `${username}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

/** Email à montrer : vide pour un email technique. */
export function visibleEmail(email: string | null | undefined): string {
  return isPlaceholderEmail(email) ? '' : (email ?? '');
}

/** Expression SQL : email réel ou NULL si technique (`col` = colonne email). */
export function sqlVisibleEmail(col: string): string {
  return `CASE WHEN ${col} ILIKE '%@${PLACEHOLDER_EMAIL_DOMAIN}' THEN NULL ELSE ${col} END`;
}
