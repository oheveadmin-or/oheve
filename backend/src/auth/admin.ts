import { UserRole } from './jwt';

/** Seul cet email peut avoir le rôle administrateur. */
export const ADMIN_EMAIL = 'oheveadmin@gmail.com';

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

/**
 * Les comptes Boutique ne sont pas encore ouverts au public ("coming soon").
 * Les boutiques déjà créées continuent de fonctionner : seule la CRÉATION
 * (inscription ou changement de rôle) est bloquée. Mettre la variable
 * d'environnement BOUTIQUE_SIGNUP_ENABLED=true pour rouvrir les inscriptions.
 */
export function isBoutiqueSignupOpen(): boolean {
  return process.env.BOUTIQUE_SIGNUP_ENABLED === 'true';
}

export const BOUTIQUE_SOON_MESSAGE =
  'Les comptes Boutique arrivent bientôt sur Oheve. Créez un compte Marié·e ou Prestataire en attendant.';

/** Rôle effectif : l'email admin reçoit toujours le rôle admin. */
export function resolveRole(email: string, currentRole: UserRole): UserRole {
  if (isAdminEmail(email)) return 'admin';
  if (currentRole === 'admin') return 'client';
  return currentRole;
}

/** Valide qu'un rôle peut être assigné à cet email (admin interdit sauf email admin). */
export function sanitizeAssignedRole(email: string, requestedRole: string): UserRole | null {
  const valid: UserRole[] = ['client', 'prestataire', 'boutique', 'admin'];
  if (!valid.includes(requestedRole as UserRole)) return null;
  if (requestedRole === 'admin' && !isAdminEmail(email)) return null;
  if (isAdminEmail(email)) return 'admin';
  return requestedRole as UserRole;
}
