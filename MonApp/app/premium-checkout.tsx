import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { C } from '@/constants/OheveTheme';

/**
 * Retour de la page de paiement Stripe (monapp://premium-checkout). Le lien
 * rouvre l'app et expo-router l'ouvre comme un écran : on le referme aussitôt
 * pour revenir sur l'écran Premium, qui vérifie le paiement lui-même.
 */
export default function PremiumCheckoutReturn() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/premium');
  }, []);

  return <View style={{ flex: 1, backgroundColor: C.background }} />;
}
