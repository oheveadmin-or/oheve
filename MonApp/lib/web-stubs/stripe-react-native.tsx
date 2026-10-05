/**
 * Remplaçant web de @stripe/stripe-react-native (module natif uniquement).
 * Sans lui, le bundle web — et le rendu « static » d'Expo Router au démarrage
 * de Metro — échoue sur « Importing native-only module ». Le paiement par
 * carte reste réservé à l'app iOS / Android.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';

const unavailable = async () => ({
  error: { code: 'Failed', message: 'Paiement disponible uniquement dans l’application mobile.' },
});

export function StripeProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function CardField(props: { style?: unknown }) {
  return <View style={props.style as never} />;
}

export function useConfirmPayment() {
  return { confirmPayment: unavailable, loading: false };
}

export function useConfirmSetupIntent() {
  return { confirmSetupIntent: unavailable, loading: false };
}

export function useStripe() {
  return {
    confirmPayment: unavailable,
    confirmSetupIntent: unavailable,
    initPaymentSheet: unavailable,
    presentPaymentSheet: unavailable,
  };
}
