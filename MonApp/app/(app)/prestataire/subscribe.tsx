import { Ionicons } from '@expo/vector-icons';
import { CardField, StripeProvider, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { prestataireSubApi } from '@/services/auth/api';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const FEATURES = [
  { icon: 'search-outline', label: 'Visible dans le répertoire des prestataires' },
  { icon: 'chatbubbles-outline', label: 'Messagerie directe avec les futurs mariés' },
  { icon: 'images-outline', label: 'Portfolio photos illimité' },
  { icon: 'calendar-outline', label: 'Calendrier & prise de rendez-vous' },
  { icon: 'card-outline', label: 'Paiements sécurisés & devis' },
  { icon: 'stats-chart-outline', label: 'Statistiques de consultation' },
];

function SubscribeForm() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { confirmSetupIntent, loading } = useConfirmSetupIntent();

  const [initializing, setInitializing] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (!user?.accessToken) return;
    setInitializing(true);
    setStartError(null);
    try {
      const res = await prestataireSubApi.start(user.accessToken);
      if (res?.data?.already_active) {
        await updateUser({ presta_sub_status: res.data.status ?? 'active' });
        router.replace('/(app)/(tabs)');
        return;
      }
      if (!res?.success || !res.data?.setup_client_secret) {
        // Message précis (404 = backend pas encore déployé, hors-ligne, etc.)
        setStartError(res?.message ?? 'Impossible de préparer votre abonnement pour le moment.');
        return;
      }
      setClientSecret(res.data.setup_client_secret);
      setSubscriptionId(res.data.subscription_id);
    } catch {
      setStartError('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
    } finally {
      setInitializing(false);
    }
  }, [user?.accessToken, updateUser]);

  useEffect(() => { start(); }, [start]);

  const handleSubscribe = async () => {
    if (!cardComplete || !clientSecret || !subscriptionId || !user?.accessToken) return;
    setSubmitting(true);
    try {
      const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails: { name: `${user.prenom} ${user.nom}`.trim() } },
      });

      if (error) {
        Alert.alert('Carte refusée', error.message);
        return;
      }
      if (!setupIntent) {
        Alert.alert('Erreur', 'La carte n\'a pas pu être enregistrée. Réessayez.');
        return;
      }

      // Débloque l'accès côté serveur (source de vérité = Stripe).
      const confirm = await prestataireSubApi.confirm(user.accessToken, subscriptionId);
      if (!confirm?.success) {
        Alert.alert('Erreur', confirm?.message ?? 'Activation impossible. Réessayez.');
        return;
      }

      await updateUser({
        presta_sub_status: confirm.data?.status ?? 'trialing',
        presta_trial_end: confirm.data?.trial_end ?? undefined,
      });
      Alert.alert(
        '🎉 Bienvenue !',
        'Vos 3 premiers mois sont offerts. Vous ne serez prélevé de 39 €/mois qu\'à la fin de l\'essai — annulable à tout moment.',
        [{ text: 'Commencer', onPress: () => router.replace('/(app)/(tabs)') }],
      );
    } catch {
      Alert.alert('Erreur', 'Une erreur réseau est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.sauge} size="large" />
        <ThemedText style={styles.centerTxt}>Préparation de votre abonnement…</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeTxt}>ESPACE PRESTATAIRE</ThemedText>
          </View>
          <ThemedText style={styles.heroTitle}>Développez votre activité{'\n'}sur Oheve</ThemedText>
          <ThemedText style={styles.heroSub}>Accès complet à votre espace professionnel</ThemedText>
        </View>

        {/* Prix */}
        <View style={styles.priceCard}>
          <View style={styles.freeBadge}>
            <Ionicons name="gift-outline" size={16} color={C.saugeDark} />
            <ThemedText style={styles.freeTxt}>3 premiers mois offerts</ThemedText>
          </View>
          <View style={styles.priceRow}>
            <ThemedText style={styles.price}>39 €</ThemedText>
            <ThemedText style={styles.priceNote}>/ mois</ThemedText>
          </View>
          <ThemedText style={styles.priceDesc}>
            Aucun prélèvement pendant 3 mois. Ensuite 39 €/mois, sans engagement — annulable à tout moment.
          </ThemedText>
        </View>

        {/* Features */}
        <View style={styles.featuresList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as 'search'} size={16} color={C.sauge} />
              </View>
              <ThemedText style={styles.featureLabel}>{f.label}</ThemedText>
            </View>
          ))}
        </View>

        {startError ? (
          /* start() a échoué : on ne montre pas un formulaire mort, mais un
             message clair + bouton Réessayer. */
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={26} color={C.error} />
            <ThemedText style={styles.errorTitle}>Activation indisponible</ThemedText>
            <ThemedText style={styles.errorMsg}>{startError}</ThemedText>
            <Pressable style={styles.retryBtn} onPress={start}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <ThemedText style={styles.retryTxt}>Réessayer</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Carte */}
            <ThemedText style={styles.label}>Carte bancaire</ThemedText>
            <CardField
              postalCodeEnabled={false}
              style={styles.cardField}
              cardStyle={{
                backgroundColor: '#fff',
                textColor: C.textDark,
                borderColor: C.taupe,
                borderWidth: 1.5,
                borderRadius: 12,
                placeholderColor: C.textLight,
              }}
              onCardChange={(card) => setCardComplete(card.complete)}
            />
            <ThemedText style={styles.hint}>
              Nécessaire pour activer l'essai. Rien n'est prélevé avant la fin des 3 mois.
            </ThemedText>

            <Pressable
              style={[styles.cta, (!cardComplete || submitting || loading) && styles.ctaOff]}
              onPress={handleSubscribe}
              disabled={!cardComplete || submitting || loading}
            >
              {submitting || loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.ctaInner}>
                  <Ionicons name="lock-closed" size={16} color="#fff" />
                  <ThemedText style={styles.ctaTxt}>Activer — 3 mois offerts</ThemedText>
                </View>
              )}
            </Pressable>

            <View style={styles.secureRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={C.textLight} />
              <ThemedText style={styles.secureTxt}>Sécurisé par Stripe · Annulable à tout moment</ThemedText>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function PrestataireSubscribeScreen() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <SubscribeForm />
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#fff' },
  centerTxt: { fontSize: 14, color: C.textLight },
  content: { paddingHorizontal: 20, gap: 22, paddingTop: 12 },

  hero: { alignItems: 'center', gap: 10, paddingTop: 8 },
  badge: { backgroundColor: C.sauge, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6 },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { fontSize: 25, fontWeight: '800', color: C.textDark, textAlign: 'center', lineHeight: 31 },
  heroSub: { fontSize: 14, color: C.textLight, textAlign: 'center' },

  priceCard: {
    backgroundColor: C.saugePale, borderRadius: RADIUS.lg, padding: 20,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.saugePale,
  },
  freeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
  },
  freeTxt: { fontSize: 12, fontWeight: '700', color: C.saugeDark },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 40, fontWeight: '800', color: C.textDark },
  priceNote: { fontSize: 16, color: C.textMid, fontWeight: '600' },
  priceDesc: { fontSize: 12.5, color: C.textMid, textAlign: 'center', lineHeight: 18 },

  featuresList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: C.saugePale,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { flex: 1, fontSize: 14, color: C.textDark },

  label: { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: -8, marginTop: 4 },
  cardField: { height: 56, marginVertical: 4 },
  hint: { fontSize: 11, color: C.textLight, textAlign: 'center' },

  cta: {
    backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  ctaOff: { opacity: 0.45 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },

  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureTxt: { fontSize: 12, color: C.textLight },

  errorCard: {
    alignItems: 'center', gap: 10, padding: 22,
    backgroundColor: C.errorPale, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: C.error,
  },
  errorTitle: { fontSize: 16, fontWeight: '800', color: C.error },
  errorMsg: { fontSize: 13, color: C.textMid, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    backgroundColor: C.error, borderRadius: RADIUS.pill,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
