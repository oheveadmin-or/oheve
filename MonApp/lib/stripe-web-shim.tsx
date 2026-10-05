/**
 * Remplaçant web de @stripe/stripe-react-native (branché par metro.config.js).
 * Le SDK Stripe natif ne tourne pas dans un navigateur : sur le web, le champ
 * carte affiche un message et toute tentative de paiement renvoie une erreur.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

const WEB_ERROR = {
  code: 'Unsupported',
  message: 'Le paiement par carte est disponible uniquement dans l’app mobile OHEVE.',
};

export function StripeProvider({ children }: { children: ReactNode; publishableKey?: string }) {
  return <>{children}</>;
}

export function CardField({ style }: { style?: StyleProp<ViewStyle>; [key: string]: unknown }) {
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.text}>{WEB_ERROR.message}</Text>
    </View>
  );
}

export function useConfirmPayment() {
  return {
    loading: false,
    confirmPayment: async (..._args: unknown[]) => ({ error: WEB_ERROR, paymentIntent: undefined }),
  };
}

export function useConfirmSetupIntent() {
  return {
    loading: false,
    confirmSetupIntent: async (..._args: unknown[]) => ({ error: WEB_ERROR, setupIntent: undefined }),
  };
}

const styles = StyleSheet.create({
  box: { justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F0EDE6' },
  text: { fontSize: 13, color: '#7B7063' },
});
