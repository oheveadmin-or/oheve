import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';

/** Point d'entrée "/" : redirige vers la bonne zone selon le rôle */
export default function IndexRedirect() {
  const { user, loading, onboardingComplete } = useAuth();

  if (loading) return null;

  if (!user) return <Redirect href="/(auth)" />;

  // Prestataires et admins n'ont pas de parcours mariage — accès direct à l'app
  if (user.role === 'prestataire' || user.role === 'admin') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  if (!onboardingComplete) {
    if (!user.date_mariage) return <Redirect href="/(onboarding)/date-mariage" />;
    if (user.budget_total == null) return <Redirect href="/(onboarding)/budget" />;
    if (!user.wedding_location_type) return <Redirect href="/(onboarding)/location" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
