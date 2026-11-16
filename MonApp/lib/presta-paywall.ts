import { isPrestaSubActive, type AuthUser } from '@/contexts/auth-context';

/**
 * Compte prestataire créé par l'équipe (il a un IDENTIFIANT) en mode payant :
 * il doit s'abonner AVANT d'entrer dans son espace. Les prestataires inscrits
 * eux-mêmes gardent l'abonnement non bloquant (bannière sur l'accueil), et
 * l'admin qui ouvre le compte (« Ouvrir son compte ») n'est jamais bloqué.
 */
export function mustPayBeforeAccess(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== 'prestataire') return false;
  if (user.adminReturn) return false;
  if (!user.username) return false;
  return !isPrestaSubActive(user.presta_sub_status);
}

/** Où aller une fois l'abonnement validé. */
export function routeAfterSubscribe(user: AuthUser | null | undefined): '/(app)/first-login' | '/(app)/(tabs)' {
  return user?.must_change_password ? '/(app)/first-login' : '/(app)/(tabs)';
}
