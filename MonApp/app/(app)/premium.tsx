import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { premiumApi } from '@/services/auth/api';

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

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
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
            <ThemedText style={s.price}>50 €</ThemedText>
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
            <ThemedText style={s.todayPrice}>50 €</ThemedText>
          </View>
        </View>

        {/* CTA */}
        {!alreadyPremium ? (
          <Pressable
            style={[s.cta, loading && s.ctaDisabled]}
            onPress={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#fff" />
                <ThemedText style={s.ctaTxt}>Créer mon mariage</ThemedText>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable style={s.ctaSecondary} onPress={() => router.back()}>
            <ThemedText style={s.ctaSecondaryTxt}>Retour à l'accueil</ThemedText>
          </Pressable>
        )}

        <View style={s.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.textLight} />
          <ThemedText style={s.trustTxt}>Paiement unique · Sécurisé par Stripe · Aucun abonnement</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
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

  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustTxt: { fontSize: 12, color: C.textLight, textAlign: 'center', flex: 1 },
});
