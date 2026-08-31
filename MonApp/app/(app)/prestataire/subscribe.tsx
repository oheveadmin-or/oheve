import { Ionicons } from '@expo/vector-icons';
import { CardField, StripeProvider, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PurchaseLegal } from '@/components/purchase-legal';
import { ThemedText } from '@/components/themed-text';
import { IAP_SKUS } from '@/constants/config';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import {
  describeIapError, getIapSdk, iapAvailable, IAP_UNAVAILABLE_MESSAGE,
  loadIapProduct, type IapProductState,
} from '@/lib/iap';
import {
  trialLabel, trialLabelLong, usePrestaOffer, type PrestaOffer,
} from '@/lib/presta-offer';
import { iapApi, prestataireSubApi } from '@/services/auth/api';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const FEATURES = [
  { icon: 'search-outline', label: 'Visible dans le répertoire des prestataires' },
  { icon: 'chatbubbles-outline', label: 'Messagerie directe avec les futurs mariés' },
  { icon: 'images-outline', label: 'Portfolio photos illimité' },
  { icon: 'calendar-outline', label: 'Calendrier & prise de rendez-vous' },
  { icon: 'card-outline', label: 'Paiements sécurisés & devis' },
  { icon: 'stats-chart-outline', label: 'Statistiques de consultation' },
];

// ── Blocs partagés (hero, prix, features) ────────────────────────────────────
function SubscribeHero({ priceLabel, offer }: { priceLabel: string; offer: PrestaOffer }) {
  return (
    <>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeTxt}>ESPACE PRESTATAIRE</ThemedText>
        </View>
        <ThemedText style={styles.heroTitle}>Développez votre activité{'\n'}sur Oheve</ThemedText>
        <ThemedText style={styles.heroSub}>Accès complet à votre espace professionnel</ThemedText>
      </View>

      {/* Offre de lancement : annoncée seulement tant qu'il reste des places. */}
      {offer.founderOpen ? (
        <View style={styles.launchBanner}>
          <Ionicons name="sparkles" size={15} color={C.saugeDark} />
          <ThemedText style={styles.launchTxt}>
            Offre de lancement — {trialLabelLong(offer)} pour les {offer.limit} premiers
            prestataires{offer.isFounder ? ' · votre place est réservée'
              : offer.remaining > 0 ? ` · il reste ${offer.remaining} places` : ''}
          </ThemedText>
        </View>
      ) : null}

      {/* Prix */}
      <View style={styles.priceCard}>
        <View style={styles.freeBadge}>
          <Ionicons name="gift-outline" size={16} color={C.saugeDark} />
          <ThemedText style={styles.freeTxt}>{trialLabelLong(offer)}</ThemedText>
        </View>
        <View style={styles.priceRow}>
          <ThemedText style={styles.price}>{priceLabel}</ThemedText>
          <ThemedText style={styles.priceNote}>/ mois</ThemedText>
        </View>
        <ThemedText style={styles.priceDesc}>
          Aucun prélèvement pendant {offer.trialMonths} mois. Ensuite {priceLabel}/mois, sans
          engagement — annulable à tout moment.
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
    </>
  );
}

/**
 * Mentions légales obligatoires sous tout abonnement auto-renouvelable :
 * disclosure du renouvellement automatique + liens FONCTIONNELS vers les
 * Conditions d'utilisation (EULA) et la politique de confidentialité
 * (Apple Guideline 3.1.2).
 */
function SubscribeLegal({ priceLabel, offer }: { priceLabel: string; offer: PrestaOffer }) {
  return (
    <PurchaseLegal
      productTitle="Oheve Prestataire — Abonnement mensuel"
      duration="1 mois, renouvelé automatiquement"
      price={`${priceLabel} / mois`}
      autoRenewing
      extra={`${trialLabelLong(offer)}, puis ${priceLabel} par mois. Sans engagement : résiliable à tout moment.`}
    />
  );
}

/**
 * Sortie de l'écran d'abonnement.
 *
 * L'écran était sans issue : après le setup de la fiche, un prestataire qui ne
 * payait pas restait bloqué (aucun retour, aucun « plus tard »), et si l'App
 * Store ne renvoyait pas l'offre, le bouton d'achat était grisé — cul-de-sac
 * complet, y compris pour App Review. L'abonnement reste demandé, mais il n'est
 * pas bloquant : l'accueil prestataire affiche une bannière de relance.
 */
function SkipLater() {
  return (
    <Pressable
      style={styles.skipBtn}
      hitSlop={8}
      onPress={() => router.replace('/(app)/(tabs)')}
    >
      <ThemedText style={styles.skipTxt}>Plus tard</ThemedText>
    </Pressable>
  );
}

// ── iOS : abonnement via Apple In-App Purchase (Guideline 3.1.1) ─────────────
function SubscribeIos() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const offer = usePrestaOffer();
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [product, setProduct] = useState<{ id: string; displayPrice?: string } | null>(null);
  const [storeState, setStoreState] = useState<IapProductState>('loading');

  const sdk = getIapSdk()!;

  /** Vérifie l'abonnement côté serveur puis débloque l'espace prestataire. */
  const grantFromPurchase = async (purchase: { purchaseToken?: string | null }): Promise<boolean> => {
    const jws = purchase.purchaseToken;
    if (!jws || !user?.accessToken) return false;
    const res = await iapApi.verify(user.accessToken, jws);
    if (!res?.success) {
      Alert.alert('Activation impossible', res?.message ?? 'Réessayez dans un instant.');
      return false;
    }
    await updateUser({
      presta_sub_status: res.data?.status ?? 'active',
      presta_trial_end: res.data?.trial_end ?? undefined,
      presta_current_period_end: res.data?.current_period_end ?? undefined,
    });
    return true;
  };

  const {
    connected, requestPurchase, finishTransaction,
  } = sdk.useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        if (purchase.productId !== IAP_SKUS.prestaMonthly) return;
        const granted = await grantFromPurchase(purchase);
        if (granted) {
          // Transaction close uniquement après validation serveur : sinon un
          // échec réseau ferait payer sans jamais débloquer l'accès.
          await finishTransaction({ purchase, isConsumable: false });
          Alert.alert(
            '🎉 Bienvenue !',
            `Vos ${offer.trialMonths} premiers mois sont offerts. Le renouvellement est géré par l'App Store — annulable à tout moment dans Réglages → Abonnements.`,
            [{ text: 'Commencer', onPress: () => router.replace('/(app)/(tabs)') }],
          );
        }
      } finally {
        setSubmitting(false);
      }
    },
    onPurchaseError: (error) => {
      setSubmitting(false);
      if (error.code !== 'user-cancelled') {
        Alert.alert('Abonnement impossible', describeIapError(error));
      }
    },
  });

  /**
   * Charge l'abonnement auprès d'Apple (avec réessais). Tant qu'Apple ne l'a
   * pas renvoyé, le bouton reste désactivé : on ne lance jamais un achat sur un
   * produit inconnu de StoreKit (source de l'erreur « SKU not found »).
   */
  const loadProduct = useCallback(async () => {
    const found = await loadIapProduct<{ id: string; displayPrice?: string }>(
      sdk.fetchProducts, IAP_SKUS.prestaMonthly, 'subs',
    );
    setProduct(found);
    setStoreState(found ? 'ready' : 'unavailable');
    return found;
  }, [sdk]);

  /** Bouton « Réessayer » : repasse en chargement puis relance. */
  const retryLoadProduct = useCallback(() => {
    setStoreState('loading');
    return loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    if (connected) loadProduct();
  }, [connected, loadProduct]);

  const priceLabel = product?.displayPrice ?? '39,99 €';

  const handleSubscribe = async () => {
    if (!user?.accessToken) return;
    if (!connected) {
      Alert.alert('App Store indisponible', 'Impossible de joindre l\'App Store. Réessayez dans un instant.');
      return;
    }
    setSubmitting(true);
    // Dernier filet : rechargement du produit juste avant l'achat.
    if (!product && !(await loadProduct())) {
      setSubmitting(false);
      Alert.alert('Abonnement indisponible', IAP_UNAVAILABLE_MESSAGE);
      return;
    }
    try {
      await requestPurchase({
        request: { apple: { sku: IAP_SKUS.prestaMonthly } },
        type: 'subs',
      });
      // Résultat traité dans onPurchaseSuccess / onPurchaseError.
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Abonnement impossible', describeIapError(err as { code?: string; message?: string }));
    }
  };

  // Restauration (changement d'iPhone, réinstallation) — exigée par Apple.
  const handleRestore = async () => {
    if (!user?.accessToken) return;
    setRestoring(true);
    try {
      const purchases = await sdk.getAvailablePurchases();
      const subPurchase = (purchases ?? []).find((p) => p.productId === IAP_SKUS.prestaMonthly);
      if (!subPurchase) {
        Alert.alert('Aucun abonnement trouvé', 'Aucun abonnement Oheve n\'est associé à ce compte Apple.');
        return;
      }
      const granted = await grantFromPurchase(subPurchase);
      if (granted) {
        await finishTransaction({ purchase: subPurchase, isConsumable: false });
        Alert.alert('✅ Abonnement restauré', 'Votre espace prestataire est de nouveau actif.', [
          { text: 'Continuer', onPress: () => router.replace('/(app)/(tabs)') },
        ]);
      }
    } catch {
      Alert.alert('Restauration impossible', 'Réessayez dans un instant.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        <SubscribeHero priceLabel={priceLabel} offer={offer} />

        <Pressable
          style={[styles.cta, (submitting || storeState !== 'ready') && styles.ctaOff]}
          onPress={handleSubscribe}
          disabled={submitting || storeState !== 'ready'}
        >
          {submitting || storeState === 'loading' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.ctaInner}>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <ThemedText style={styles.ctaTxt}>Activer — {trialLabel(offer)}</ThemedText>
            </View>
          )}
        </Pressable>

        {/* L'App Store n'a pas renvoyé l'offre : message clair + réessai, au
            lieu de laisser l'achat échouer sur une erreur technique. */}
        {storeState === 'unavailable' ? (
          <View style={styles.storeError}>
            <ThemedText style={styles.storeErrorTxt}>{IAP_UNAVAILABLE_MESSAGE}</ThemedText>
            <Pressable hitSlop={8} onPress={retryLoadProduct}>
              <ThemedText style={styles.storeRetry}>Réessayer</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
          {restoring ? (
            <ActivityIndicator color={C.sauge} size="small" />
          ) : (
            <ThemedText style={styles.restoreTxt}>Restaurer mes achats</ThemedText>
          )}
        </Pressable>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.textLight} />
          <ThemedText style={styles.secureTxt}>
            Abonnement géré par l'App Store · Annulable à tout moment
          </ThemedText>
        </View>

        <SkipLater />

        <SubscribeLegal priceLabel={priceLabel} offer={offer} />
      </ScrollView>
    </View>
  );
}

// ── Vieux binaire iOS sans StoreKit : demander la mise à jour ────────────────
function SubscribeIosUpdateRequired() {
  const insets = useSafeAreaInsets();
  const offer = usePrestaOffer();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <SubscribeHero priceLabel="39,99 €" offer={offer} />
        <View style={styles.errorCard}>
          <Ionicons name="cloud-download-outline" size={26} color={C.saugeDark} />
          <ThemedText style={styles.errorTitle}>Mise à jour requise</ThemedText>
          <ThemedText style={styles.errorMsg}>
            Mettez à jour Oheve depuis l'App Store pour activer votre abonnement prestataire.
          </ThemedText>
        </View>

        <SkipLater />

        <SubscribeLegal priceLabel="39,99 €" offer={offer} />
      </ScrollView>
    </View>
  );
}

// ── Android / web : Stripe (inchangé) ────────────────────────────────────────
function SubscribeForm() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const offer = usePrestaOffer();
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
        `Vos ${offer.trialMonths} premiers mois sont offerts. Vous ne serez prélevé de 39,99 €/mois qu'à la fin de l'essai — annulable à tout moment.`,
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
        keyboardShouldPersistTaps="handled"
        // Remonte le champ carte / bouton au-dessus du clavier (iOS)
        automaticallyAdjustKeyboardInsets
      >
        <SubscribeHero priceLabel="39,99 €" offer={offer} />

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
              Nécessaire pour activer l'essai. Rien n'est prélevé avant la fin des {offer.trialMonths} mois.
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
                  <ThemedText style={styles.ctaTxt}>Activer — {trialLabel(offer)}</ThemedText>
                </View>
              )}
            </Pressable>

            <View style={styles.secureRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={C.textLight} />
              <ThemedText style={styles.secureTxt}>Sécurisé par Stripe · Annulable à tout moment</ThemedText>
            </View>

            <SkipLater />

            <SubscribeLegal priceLabel="39,99 €" offer={offer} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function PrestataireSubscribeScreen() {
  // iOS : Apple impose l'In-App Purchase pour les abonnements (Guideline 3.1.1).
  if (Platform.OS === 'ios') {
    return iapAvailable ? <SubscribeIos /> : <SubscribeIosUpdateRequired />;
  }
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

  launchBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.saugePale, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.sauge,
  },
  launchTxt: { flex: 1, fontSize: 12.5, fontWeight: '600', color: C.saugeDark, lineHeight: 18 },

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

  storeError: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  storeErrorTxt: { fontSize: 13, color: C.textLight, textAlign: 'center' },
  storeRetry: { fontSize: 14, fontWeight: '700', color: C.sauge, textDecorationLine: 'underline' },

  restoreBtn: { alignItems: 'center', paddingVertical: 2, minHeight: 22, justifyContent: 'center' },
  restoreTxt: { fontSize: 14, fontWeight: '600', color: C.sauge, textDecorationLine: 'underline' },

  skipBtn: { alignItems: 'center', paddingVertical: 6, minHeight: 30, justifyContent: 'center' },
  skipTxt: { fontSize: 15, fontWeight: '600', color: C.textMid },

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
