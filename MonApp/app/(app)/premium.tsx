import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable,
  ScrollView, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PurchaseLegal } from '@/components/purchase-legal';
import { ThemedText } from '@/components/themed-text';
import { IAP_SKUS } from '@/constants/config';
import { C } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import {
  describeIapError, getIapSdk, iapAvailable, IAP_UNAVAILABLE_MESSAGE,
  loadIapProduct, type IapProductState,
} from '@/lib/iap';
import { iapApi, premiumApi } from '@/services/auth/api';

const FEATURES = [
  { icon: 'globe-outline', label: 'Site de mariage personnalisé' },
  { icon: 'mail-outline', label: 'Faire-part numérique premium' },
  { icon: 'checkmark-circle-outline', label: 'RSVP intelligent' },
  { icon: 'people-outline', label: 'Gestion invités illimitée' },
  { icon: 'grid-outline', label: 'Plan de table interactif' },
  { icon: 'shield-checkmark-outline', label: 'Contribution mariage sécurisée' },
  { icon: 'bed-outline', label: 'Hébergements & infos pratiques' },
  { icon: 'images-outline', label: 'Galerie photos' },
  { icon: 'qr-code-outline', label: 'QR Code invités' },
  { icon: 'gift-outline', label: 'Liste de mariage' },
  { icon: 'star-outline', label: 'Support mariage juif (Houppa, Chabbat Hatan…)' },
  { icon: 'link-outline', label: 'Liens Google Maps & Waze' },
  { icon: 'chatbubble-outline', label: 'Messages aux invités' },
  { icon: 'infinite-outline', label: 'Invités illimités' },
];

const VALUE_ITEMS = [
  { label: 'Site de mariage', price: '29 €' },
  { label: 'Faire-part numérique', price: '19 €' },
  { label: 'Plan de table', price: '19 €' },
  { label: 'RSVP', price: '15 €' },
  { label: 'Contribution sécurisée', price: '15 €' },
];

// ── UI partagée (identique quel que soit le moyen de paiement) ───────────────
type PremiumBodyProps = {
  priceLabel: string;
  trustLabel: string;
  loading: boolean;
  alreadyPremium: boolean;
  onPurchase: () => void;
  /** iOS uniquement : Apple exige un bouton « Restaurer mes achats ». */
  onRestore?: () => void;
  restoring?: boolean;
  /** iOS uniquement : état du chargement du produit StoreKit. */
  storeState?: IapProductState;
  onRetryStore?: () => void;
};

function PremiumBody({
  priceLabel, trustLabel, loading, alreadyPremium, onPurchase, onRestore, restoring,
  storeState = 'ready', onRetryStore,
}: PremiumBodyProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.sauge} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.badge}>
            <ThemedText style={s.badgeTxt}>OHEVE PREMIUM</ThemedText>
          </View>
          <ThemedText style={s.heroTitle}>Tout ce dont vous avez besoin pour votre mariage</ThemedText>
          <ThemedText style={s.heroSub}>Une seule formule. Aucun abonnement. Aucun coût caché.</ThemedText>
        </View>

        {/* Prix principal */}
        <View style={s.priceCard}>
          {alreadyPremium ? (
            <View style={s.activeBadge}>
              <Ionicons name="checkmark-circle" size={20} color={C.sauge} />
              <ThemedText style={s.activeTxt}>Premium actif</ThemedText>
            </View>
          ) : null}
          <View style={s.priceRow}>
            <ThemedText style={s.price}>{priceLabel}</ThemedText>
            <ThemedText style={s.priceNote}>paiement unique TTC</ThemedText>
          </View>
          <ThemedText style={s.priceDesc}>Accès complet · Illimité dans le temps</ThemedText>
        </View>

        {/* Features */}
        <View style={s.section}>
          <ThemedText style={s.sectionTitle}>Inclus dans Oheve Premium</ThemedText>
          <View style={s.featuresList}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <View style={s.featureIcon}>
                  <Ionicons name={f.icon as 'home'} size={16} color={C.sauge} />
                </View>
                <ThemedText style={s.featureLabel}>{f.label}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Valeur réelle */}
        <View style={s.valueBox}>
          <ThemedText style={s.valueTitle}>Valeur réelle des fonctionnalités</ThemedText>
          {VALUE_ITEMS.map((v, i) => (
            <View key={i} style={s.valueRow}>
              <ThemedText style={s.valueLabel}>{v.label}</ThemedText>
              <ThemedText style={s.valuePrice}>{v.price}</ThemedText>
            </View>
          ))}
          <View style={s.valueDivider} />
          <View style={s.valueRow}>
            <ThemedText style={s.totalLabel}>Total séparé</ThemedText>
            <ThemedText style={s.totalStrike}>97 €</ThemedText>
          </View>
          <View style={s.valueRow}>
            <ThemedText style={s.todayLabel}>Avec Oheve</ThemedText>
            <ThemedText style={s.todayPrice}>{priceLabel}</ThemedText>
          </View>
        </View>

        {/* CTA */}
        {!alreadyPremium ? (
          <>
            <Pressable
              style={[s.cta, (loading || storeState !== 'ready') && s.ctaDisabled]}
              onPress={onPurchase}
              disabled={loading || storeState !== 'ready'}
            >
              {loading || storeState === 'loading' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#fff" />
                  <ThemedText style={s.ctaTxt}>Créer mon mariage</ThemedText>
                </>
              )}
            </Pressable>

            {/* Le produit n'a pas pu être chargé depuis l'App Store : on
                l'annonce clairement avec un moyen de réessayer, plutôt que de
                laisser l'achat échouer avec une erreur technique. */}
            {storeState === 'unavailable' ? (
              <View style={s.storeError}>
                <ThemedText style={s.storeErrorTxt}>{IAP_UNAVAILABLE_MESSAGE}</ThemedText>
                {onRetryStore ? (
                  <Pressable hitSlop={8} onPress={onRetryStore}>
                    <ThemedText style={s.storeRetry}>Réessayer</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <Pressable style={s.ctaSecondary} onPress={() => router.back()}>
            <ThemedText style={s.ctaSecondaryTxt}>Retour à l'accueil</ThemedText>
          </Pressable>
        )}

        {onRestore && !alreadyPremium ? (
          <Pressable style={s.restoreBtn} onPress={onRestore} disabled={restoring}>
            {restoring ? (
              <ActivityIndicator color={C.sauge} size="small" />
            ) : (
              <ThemedText style={s.restoreTxt}>Restaurer mes achats</ThemedText>
            )}
          </Pressable>
        ) : null}

        <View style={s.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.textLight} />
          <ThemedText style={s.trustTxt}>{trustLabel}</ThemedText>
        </View>

        {/* Détail de l'offre + liens CGU/confidentialité (Guideline 3.1.2) */}
        <PurchaseLegal
          productTitle="Oheve Premium"
          duration="Achat unique — accès illimité dans le temps"
          price={`${priceLabel} TTC, une seule fois`}
          extra="Oheve Premium n'est pas un abonnement : aucun renouvellement, aucun prélèvement récurrent."
        />
      </ScrollView>
    </View>
  );
}

// ── iOS : achat via Apple In-App Purchase (Guideline 3.1.1) ──────────────────
function PremiumScreenIos() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [product, setProduct] = useState<{ id: string; displayPrice?: string } | null>(null);
  const [storeState, setStoreState] = useState<IapProductState>('loading');

  const alreadyPremium = user?.premium === true || user?.role === 'admin';
  const sdk = getIapSdk()!;

  /** Vérifie l'achat côté serveur puis débloque le premium dans l'app. */
  const grantFromPurchase = async (purchase: { purchaseToken?: string | null }): Promise<boolean> => {
    const jws = purchase.purchaseToken;
    if (!jws || !user?.accessToken) return false;
    const res = await iapApi.verify(user.accessToken, jws);
    if (!res?.success) {
      Alert.alert('Activation impossible', res?.message ?? 'Réessayez dans un instant.');
      return false;
    }
    await updateUser({ premium: true });
    return true;
  };

  const {
    connected, requestPurchase, finishTransaction,
  } = sdk.useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        if (purchase.productId !== IAP_SKUS.premium) return;
        const granted = await grantFromPurchase(purchase);
        if (granted) {
          // On ne clôt la transaction qu'une fois le serveur au courant :
          // sinon un échec réseau ferait payer sans jamais débloquer.
          await finishTransaction({ purchase, isConsumable: false });
          Alert.alert('🎉 Premium activé !', 'Toutes les fonctionnalités Oheve sont débloquées.', [
            { text: 'Commencer', onPress: () => router.back() },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    onPurchaseError: (error) => {
      setLoading(false);
      if (error.code !== 'user-cancelled') {
        Alert.alert('Achat impossible', describeIapError(error));
      }
    },
  });

  /**
   * Charge le produit auprès d'Apple (avec réessais). Tant qu'Apple ne l'a pas
   * renvoyé, le bouton d'achat reste désactivé : on ne déclenche jamais un
   * achat sur un produit que StoreKit ne connaît pas.
   */
  const loadProduct = useCallback(async () => {
    const found = await loadIapProduct<{ id: string; displayPrice?: string }>(
      sdk.fetchProducts, IAP_SKUS.premium, 'in-app',
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
    if (!connected) return;
    void loadProduct();
  }, [connected, loadProduct]);

  const priceLabel = product?.displayPrice ?? '50 €';

  const handlePurchase = async () => {
    if (!user?.accessToken) {
      router.push('/(auth)/login');
      return;
    }
    if (alreadyPremium) {
      Alert.alert('Déjà Premium !', 'Vous avez déjà accès à toutes les fonctionnalités Oheve Premium.');
      return;
    }
    if (!connected) {
      Alert.alert('App Store indisponible', 'Impossible de joindre l\'App Store. Réessayez dans un instant.');
      return;
    }
    setLoading(true);
    // Dernier filet : si le produit a expiré du cache StoreKit entre-temps, on
    // le recharge avant d'acheter au lieu d'échouer sur « SKU not found ».
    if (!product && !(await loadProduct())) {
      setLoading(false);
      Alert.alert('Achat indisponible', IAP_UNAVAILABLE_MESSAGE);
      return;
    }
    try {
      await requestPurchase({
        request: { apple: { sku: IAP_SKUS.premium } },
        type: 'in-app',
      });
      // Résultat traité dans onPurchaseSuccess / onPurchaseError.
    } catch (err) {
      setLoading(false);
      Alert.alert('Achat impossible', describeIapError(err as { code?: string; message?: string }));
    }
  };

  // Apple exige un moyen de restaurer un achat non-consommable (nouvel iPhone,
  // réinstallation). On relit les achats du compte Apple et on re-vérifie.
  const handleRestore = async () => {
    if (!user?.accessToken) {
      router.push('/(auth)/login');
      return;
    }
    setRestoring(true);
    try {
      const purchases = await sdk.getAvailablePurchases();
      const premiumPurchase = (purchases ?? []).find((p) => p.productId === IAP_SKUS.premium);
      if (!premiumPurchase) {
        Alert.alert('Aucun achat trouvé', 'Aucun achat Oheve Premium n\'est associé à ce compte Apple.');
        return;
      }
      const granted = await grantFromPurchase(premiumPurchase);
      if (granted) {
        await finishTransaction({ purchase: premiumPurchase, isConsumable: false });
        Alert.alert('✅ Achat restauré', 'Votre accès Premium est de nouveau actif.');
      }
    } catch {
      Alert.alert('Restauration impossible', 'Réessayez dans un instant.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <PremiumBody
      priceLabel={priceLabel}
      trustLabel="Paiement unique · Sécurisé par l'App Store"
      loading={loading}
      alreadyPremium={alreadyPremium}
      onPurchase={handlePurchase}
      onRestore={handleRestore}
      restoring={restoring}
      storeState={storeState}
      onRetryStore={retryLoadProduct}
    />
  );
}

// ── Android / web : paiement Stripe (inchangé) ───────────────────────────────
function PremiumScreenStripe() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const alreadyPremium = user?.premium === true || user?.role === 'admin';

  const handlePurchase = async () => {
    if (!user?.accessToken) {
      router.push('/(auth)/login');
      return;
    }
    if (alreadyPremium) {
      Alert.alert('Déjà Premium !', 'Vous avez déjà accès à toutes les fonctionnalités Oheve Premium.');
      return;
    }
    // Vieux binaire iOS sans le module StoreKit : pas question de montrer
    // Stripe à Apple — on demande la mise à jour de l'app.
    if (Platform.OS === 'ios') {
      Alert.alert('Mise à jour requise', 'Mettez à jour Oheve depuis l\'App Store pour activer Premium.');
      return;
    }

    setLoading(true);
    try {
      const res = await premiumApi.purchase(user.accessToken);
      if (!res.success) throw new Error(res.message ?? 'Erreur');

      if (res.data?.already_premium) {
        await updateUser({ premium: true });
        Alert.alert('Déjà Premium !', 'Votre accès Premium est actif.');
        router.back();
        return;
      }

      // Rediriger vers paiement Stripe avec le client_secret
      router.push({
        pathname: '/(app)/payment',
        params: {
          prestataire_id: '0',
          prestataire_nom: 'Oheve',
          amount_cents: '5000',
          currency: 'eur',
          description: 'Oheve Premium — Accès complet',
          product_id: 'oheve_premium',
          client_secret: res.data.client_secret,
        },
      });
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de continuer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumBody
      priceLabel="50 €"
      trustLabel="Paiement unique · Sécurisé · Aucun abonnement"
      loading={loading}
      alreadyPremium={alreadyPremium}
      onPurchase={handlePurchase}
    />
  );
}

export default function PremiumScreen() {
  // Sur iOS, les biens numériques doivent passer par l'In-App Purchase Apple.
  if (Platform.OS === 'ios' && iapAvailable) return <PremiumScreenIos />;
  return <PremiumScreenStripe />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  content: { paddingHorizontal: 20, gap: 24 },

  hero: { alignItems: 'center', gap: 12, paddingTop: 8 },
  badge: { backgroundColor: C.sauge, borderRadius: 99, paddingHorizontal: 18, paddingVertical: 6 },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1.5 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.textDark, textAlign: 'center', lineHeight: 32 },
  heroSub: { fontSize: 15, color: C.textMid, textAlign: 'center', lineHeight: 22 },

  priceCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: C.saugePale,
  },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  activeTxt: { fontSize: 14, fontWeight: '700', color: C.sauge },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price: { fontSize: 48, fontWeight: '800', color: C.saugeDark },
  priceNote: { fontSize: 14, color: C.textMid },
  priceDesc: { fontSize: 13, color: C.textLight },

  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  featuresList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.saugePale,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 14, color: C.textMid, flex: 1 },

  valueBox: {
    borderWidth: 1.5, borderColor: C.saugePale,
    borderRadius: 18, padding: 18, gap: 10,
  },
  valueTitle: { fontSize: 12, fontWeight: '700', color: C.textLight, letterSpacing: 0.5, marginBottom: 2 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between' },
  valueLabel: { fontSize: 13, color: C.textMid },
  valuePrice: { fontSize: 13, color: C.textMid },
  valueDivider: { height: 1, backgroundColor: '#e5e7eb' },
  totalLabel: { fontSize: 13, color: C.textLight },
  totalStrike: { fontSize: 13, color: C.textLight, textDecorationLine: 'line-through' },
  todayLabel: { fontSize: 15, fontWeight: '700', color: C.textDark },
  todayPrice: { fontSize: 24, fontWeight: '800', color: C.saugeDark },

  cta: {
    backgroundColor: C.sauge, borderRadius: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 17 },
  ctaSecondary: {
    borderWidth: 2, borderColor: C.sauge, borderRadius: 18, paddingVertical: 16,
    alignItems: 'center',
  },
  ctaSecondaryTxt: { color: C.sauge, fontWeight: '700', fontSize: 16 },

  storeError: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  storeErrorTxt: { fontSize: 13, color: C.textLight, textAlign: 'center' },
  storeRetry: { fontSize: 14, fontWeight: '700', color: C.sauge, textDecorationLine: 'underline' },

  restoreBtn: { alignItems: 'center', paddingVertical: 4, minHeight: 24, justifyContent: 'center' },
  restoreTxt: { fontSize: 14, fontWeight: '600', color: C.sauge, textDecorationLine: 'underline' },

  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustTxt: { fontSize: 12, color: C.textLight, textAlign: 'center', flex: 1 },

});
