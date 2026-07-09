import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';

/** Point d'entrée "/" : redirige vers la bonne zone selon le rôle */
export default function IndexRedirect() {
  const { user, loading, onboardingComplete } = useAuth();

  if (loading) return null;

  if (!user) return <Redirect href="/(auth)" />;

  // Boutique : espace dédié
  if (user.role === 'boutique') return <Redirect href="/(boutique)/(tabs)" />;

  // Prestataire : accès direct — l'abonnement n'est proposé qu'à l'inscription
  // (et via un rappel non-bloquant sur l'accueil s'il n'est pas actif).
  if (user.role === 'prestataire') {
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
