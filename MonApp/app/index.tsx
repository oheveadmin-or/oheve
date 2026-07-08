import { Redirect } from 'expo-router';

import { isPrestaSubActive, useAuth } from '@/contexts/auth-context';

/** Point d'entrée "/" : redirige vers la bonne zone selon le rôle */
export default function IndexRedirect() {
  const { user, loading, onboardingComplete } = useAuth();

  if (loading) return null;

  if (!user) return <Redirect href="/(auth)" />;

  // Boutique : espace dédié
  if (user.role === 'boutique') return <Redirect href="/(boutique)/(tabs)" />;

  // Prestataire : accès bloqué tant que l'abonnement n'est pas actif/en essai.
  if (user.role === 'prestataire') {
    if (!isPrestaSubActive(user.presta_sub_status)) {
      return <Redirect href="/(app)/prestataire/subscribe" />;
    }
    return <Redirect href="/(app)/(tabs)" />;
  }

  // Admins : accès direct à l'app
  if (user.role === 'admin') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)/setup" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
