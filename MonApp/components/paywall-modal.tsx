import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { C, RADIUS } from '@/constants/OheveTheme';
import { ThemedText } from './themed-text';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FEATURES = [
  'Site de mariage personnalisé',
  'Faire-part numérique premium',
  'RSVP intelligent',
  'Gestion invités illimitée',
  'Plan de table interactif',
  'Contribution mariage sécurisée',
  'Hébergements & infos pratiques',
  'Galerie photos',
  'QR Code invités',
  'Liste de mariage',
  'Support mariage juif',
];

const VALUE_ITEMS = [
  { label: 'Site de mariage', price: '29 €' },
  { label: 'Faire-part numérique', price: '19 €' },
  { label: 'Plan de table', price: '19 €' },
  { label: 'RSVP', price: '15 €' },
  { label: 'Contribution sécurisée', price: '15 €' },
];

export function PaywallModal({ visible, onClose }: Props) {
  const handleBuy = () => {
    onClose();
    router.push('/(app)/premium');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {/* Badge */}
          <View style={s.badge}>
            <ThemedText style={s.badgeTxt}>OHEVE PREMIUM</ThemedText>
          </View>

          <ThemedText style={s.title}>Tout ce dont vous avez besoin pour votre mariage</ThemedText>
          <ThemedText style={s.subtitle}>Une seule formule. Aucun abonnement. Aucun coût caché.</ThemedText>

          {/* Features */}
          <View style={s.features}>
            {FEATURES.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={C.sauge} />
                <ThemedText style={s.featureText}>{f}</ThemedText>
              </View>
            ))}
          </View>

          {/* Valeur réelle */}
          <View style={s.valueBox}>
            <ThemedText style={s.valueTitle}>Valeur réelle</ThemedText>
            {VALUE_ITEMS.map((v, i) => (
              <View key={i} style={s.valueRow}>
                <ThemedText style={s.valueLabel}>{v.label}</ThemedText>
                <ThemedText style={s.valuePrice}>{v.price}</ThemedText>
              </View>
            ))}
            <View style={s.valueDivider} />
            <View style={s.valueRow}>
              <ThemedText style={s.valueTotalLabel}>Total</ThemedText>
              <ThemedText style={s.valueTotalStrike}>97 €</ThemedText>
            </View>
            <View style={s.valueRow}>
              <ThemedText style={s.valueTodayLabel}>Aujourd'hui</ThemedText>
              <ThemedText style={s.valueTodayPrice}>50 €</ThemedText>
            </View>
          </View>

          {/* CTA */}
          <Pressable style={s.buyBtn} onPress={handleBuy}>
            <Ionicons name="heart" size={18} color="#fff" />
            <ThemedText style={s.buyBtnTxt}>Créer mon mariage — 50 €</ThemedText>
          </Pressable>

          <Pressable style={s.cancelBtn} onPress={onClose}>
            <ThemedText style={s.cancelTxt}>Pas maintenant</ThemedText>
          </Pressable>

          <View style={s.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.textLight} />
            <ThemedText style={s.secureTxt}>Paiement unique · Sécurisé par Stripe · Aucun abonnement</ThemedText>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 4, marginTop: 8 },
  badge: { backgroundColor: C.sauge, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'center' },
  badgeTxt: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '800', color: C.textDark, textAlign: 'center', lineHeight: 28 },
  subtitle: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 20 },
  features: { gap: 10, backgroundColor: C.card, borderRadius: 16, padding: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: C.textMid, flex: 1 },
  valueBox: { borderWidth: 1.5, borderColor: C.saugePale, borderRadius: 16, padding: 16, gap: 8 },
  valueTitle: { fontSize: 13, fontWeight: '700', color: C.textLight, marginBottom: 4 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valueLabel: { fontSize: 13, color: C.textMid },
  valuePrice: { fontSize: 13, color: C.textMid },
  valueDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },
  valueTotalLabel: { fontSize: 13, color: C.textLight },
  valueTotalStrike: { fontSize: 13, color: C.textLight, textDecorationLine: 'line-through' },
  valueTodayLabel: { fontSize: 15, fontWeight: '700', color: C.textDark },
  valueTodayPrice: { fontSize: 24, fontWeight: '900', color: C.saugeDark },
  buyBtn: {
    backgroundColor: C.sauge, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buyBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelTxt: { fontSize: 14, color: C.textLight },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureTxt: { fontSize: 11, color: C.textLight, textAlign: 'center', flex: 1 },
});
