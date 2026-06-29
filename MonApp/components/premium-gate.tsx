import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/OheveTheme';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import { ThemedText } from './themed-text';

type Props = {
  feature: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
};

const VALUE_ITEMS = [
  { label: 'Site de mariage', price: '29 €' },
  { label: 'Faire-part numérique', price: '19 €' },
  { label: 'Plan de table', price: '19 €' },
  { label: 'RSVP', price: '15 €' },
  { label: 'Contribution sécurisée', price: '15 €' },
];

export function PremiumGate({ feature, icon, children }: Props) {
  const { hasPremiumAccess } = usePremiumAccess();
  const insets = useSafeAreaInsets();

  if (hasPremiumAccess) return <>{children}</>;

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      {/* Header minimal */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.sauge} />
        </Pressable>
        <ThemedText style={s.headerTitle}>{feature}</ThemedText>
        <View style={{ width: 22 }} />
      </View>

      {/* Contenu bloqué */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Icône verrou */}
        <View style={s.lockWrap}>
          <View style={s.lockBg}>
            <Ionicons name={icon} size={36} color={C.sauge} />
          </View>
          <View style={s.lockBadge}>
            <Ionicons name="lock-closed" size={14} color="#fff" />
          </View>
        </View>

        <ThemedText style={s.title}>Fonctionnalité Premium</ThemedText>
        <ThemedText style={s.subtitle}>
          <ThemedText style={s.featureName}>{feature}</ThemedText>
          {' '}est inclus dans Oheve Premium.{'\n'}Débloquez tout pour 50 € paiement unique.
        </ThemedText>

        {/* Ce qui est inclus */}
        <View style={s.includesBox}>
          <ThemedText style={s.includesTitle}>Oheve Premium inclut</ThemedText>
          {[
            'Site de mariage personnalisé',
            'Liste des invités illimitée',
            'Plan de table interactif',
            'Faire-part numérique',
            'RSVP intelligent',
            'Contribution mariage sécurisée',
            'Et bien plus…',
          ].map((f, i) => (
            <View key={i} style={s.row}>
              <Ionicons name="checkmark-circle" size={15} color={C.sauge} />
              <ThemedText style={s.rowTxt}>{f}</ThemedText>
            </View>
          ))}
        </View>

        {/* Valeur réelle */}
        <View style={s.valueBox}>
          {VALUE_ITEMS.map((v, i) => (
            <View key={i} style={s.valueRow}>
              <ThemedText style={s.valueLabel}>{v.label}</ThemedText>
              <ThemedText style={s.valuePrice}>{v.price}</ThemedText>
            </View>
          ))}
          <View style={s.valueDivider} />
          <View style={s.valueRow}>
            <ThemedText style={s.totalStrikeLabel}>Total séparé</ThemedText>
            <ThemedText style={s.totalStrike}>97 €</ThemedText>
          </View>
          <View style={s.valueRow}>
            <ThemedText style={s.todayLabel}>Oheve Premium</ThemedText>
            <ThemedText style={s.todayPrice}>50 €</ThemedText>
          </View>
        </View>

        {/* CTA */}
        <Pressable style={s.cta} onPress={() => router.push('/(app)/premium' as never)}>
          <Ionicons name="heart" size={18} color="#fff" />
          <ThemedText style={s.ctaTxt}>Créer mon mariage · 50 €</ThemedText>
        </Pressable>

        <View style={s.trustRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={C.textLight} />
          <ThemedText style={s.trustTxt}>Paiement unique · Sécurisé par Stripe · Aucun abonnement</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.textDark },

  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 20 },

  lockWrap: { alignSelf: 'center', position: 'relative', marginBottom: 4 },
  lockBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.saugePale,
    alignItems: 'center', justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: C.saugeDark, borderRadius: 99,
    width: 26, height: 26, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  title: { fontSize: 22, fontWeight: '800', color: C.textDark, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 22 },
  featureName: { fontWeight: '700', color: C.saugeDark },

  includesBox: { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 8 },
  includesTitle: { fontSize: 12, fontWeight: '700', color: C.textLight, letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTxt: { fontSize: 13, color: C.textMid },

  valueBox: { borderWidth: 1.5, borderColor: C.saugePale, borderRadius: 16, padding: 14, gap: 8 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between' },
  valueLabel: { fontSize: 12, color: C.textMid },
  valuePrice: { fontSize: 12, color: C.textMid },
  valueDivider: { height: 1, backgroundColor: '#e5e7eb' },
  totalStrikeLabel: { fontSize: 12, color: C.textLight },
  totalStrike: { fontSize: 12, color: C.textLight, textDecorationLine: 'line-through' },
  todayLabel: { fontSize: 14, fontWeight: '700', color: C.textDark },
  todayPrice: { fontSize: 20, fontWeight: '800', color: C.saugeDark },

  cta: {
    backgroundColor: C.sauge, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustTxt: { fontSize: 11, color: C.textLight, textAlign: 'center', flex: 1 },
});
