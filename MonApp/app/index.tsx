import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';

/** Point d'entrée "/" : redirige vers la bonne zone selon le rôle */
export default function IndexRedirect() {
  const { user, loading, onboardingComplete } = useAuth();

  if (loading) return null;

  if (!user) return <Redirect href="/(auth)" />;

  // Boutique : espace dédié
  if (user.role === 'boutique') return <Redirect href="/(boutique)/(tabs)" />;

  // Prestataires et admins n'ont pas de parcours mariage — accès direct à l'app
  if (user.role === 'prestataire' || user.role === 'admin') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)/setup" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
