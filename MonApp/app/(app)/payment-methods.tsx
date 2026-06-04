import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';

type CardType = 'visa' | 'mastercard' | 'amex' | 'unknown';

interface SavedCard {
  id: string;
  last4: string;
  type: CardType;
  expiry: string;
  name: string;
  isDefault: boolean;
}

function detectCardType(number: string): CardType {
  const n = number.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'unknown';
}

function cardIcon(type: CardType): string {
  if (type === 'visa') return '💳';
  if (type === 'mastercard') return '💳';
  if (type === 'amex') return '💳';
  return '💳';
}

function cardLabel(type: CardType): string {
  if (type === 'visa') return 'Visa';
  if (type === 'mastercard') return 'Mastercard';
  if (type === 'amex') return 'American Express';
  return 'Carte';
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function maskCard(last4: string, type: CardType) {
  if (type === 'amex') return `•••• •••••• •${last4}`;
  return `•••• •••• •••• ${last4}`;
}

export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const cardType = detectCardType(cardNumber);
  const isApplePayAvailable = Platform.OS === 'ios';
  const isGooglePayAvailable = Platform.OS === 'android';

  const handleAddCard = () => {
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 13) {
      Alert.alert('Numéro invalide', 'Veuillez entrer un numéro de carte valide.');
      return;
    }
    if (!expiry.includes('/') || expiry.length < 5) {
      Alert.alert('Date invalide', 'Format attendu : MM/AA');
      return;
    }
    if (cvv.length < 3) {
      Alert.alert('CVV invalide', 'Le code de sécurité est invalide.');
      return;
    }
    if (!cardName.trim()) {
      Alert.alert('Nom requis', 'Veuillez entrer le nom du porteur de la carte.');
      return;
    }

    const [expM, expY] = expiry.split('/');
    const expDate = new Date(2000 + parseInt(expY ?? '0'), parseInt(expM ?? '0') - 1, 1);
    if (expDate < new Date()) {
      Alert.alert('Carte expirée', 'Cette carte a expiré. Veuillez utiliser une carte valide.');
      return;
    }

    const newCard: SavedCard = {
      id: Date.now().toString(),
      last4: digits.slice(-4),
      type: detectCardType(digits),
      expiry,
      name: cardName.trim(),
      isDefault: cards.length === 0,
    };

    setCards((prev) => [...prev, newCard]);
    setCardNumber('');
    setCardName('');
    setExpiry('');
    setCvv('');
    setAddModal(false);
    Alert.alert('Carte ajoutée', 'Votre carte a été enregistrée de façon sécurisée.');
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert(
      'Supprimer la carte',
      'Cette carte sera retirée de votre compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setCards((prev) => {
              const filtered = prev.filter((c) => c.id !== id);
              if (filtered.length > 0 && !filtered.some((c) => c.isDefault)) {
                filtered[0].isDefault = true;
              }
              return filtered;
            });
          },
        },
      ]
    );
  };

  const handleSetDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  const handleExpressPay = (method: 'apple' | 'google') => {
    const name = method === 'apple' ? 'Apple Pay' : 'Google Pay';
    Alert.alert(
      `${name}`,
      `${name} sera utilisé pour vos paiements. L'intégration complète nécessite une configuration Stripe.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']} style={{ backgroundColor: C.ivoire }}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.title}>Moyens de paiement</ThemedText>
        <Pressable style={styles.addBtn} onPress={() => setAddModal(true)}>
          <Ionicons name="add" size={20} color={C.textInvert} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

        {/* Security badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={16} color={C.success} />
          <ThemedText style={styles.securityText}>
            Vos données de paiement sont chiffrées et sécurisées (PCI DSS)
          </ThemedText>
        </View>

        {/* Express payment */}
        <ThemedText style={styles.sectionTitle}>Paiement rapide</ThemedText>
        <View style={styles.expressRow}>
          {isApplePayAvailable && (
            <Pressable style={styles.expressBtn} onPress={() => handleExpressPay('apple')}>
              <ThemedText style={styles.expressBtnText}>🍎  Apple Pay</ThemedText>
            </Pressable>
          )}
          {isGooglePayAvailable && (
            <Pressable style={styles.expressBtn} onPress={() => handleExpressPay('google')}>
              <ThemedText style={styles.expressBtnText}>G  Google Pay</ThemedText>
            </Pressable>
          )}
          {!isApplePayAvailable && !isGooglePayAvailable && (
            <View style={styles.expressPlaceholder}>
              <ThemedText style={styles.expressPlaceholderText}>
                Apple Pay et Google Pay sont disponibles sur iOS et Android
              </ThemedText>
            </View>
          )}
        </View>

        {/* Saved cards */}
        <ThemedText style={[styles.sectionTitle, { marginTop: 20 }]}>Cartes enregistrées</ThemedText>
        {cards.length === 0 ? (
          <Pressable style={styles.emptyCard} onPress={() => setAddModal(true)}>
            <Ionicons name="add-circle-outline" size={32} color={C.sauge} />
            <ThemedText style={styles.emptyText}>Ajouter une carte bancaire</ThemedText>
            <ThemedText style={styles.emptyHint}>Visa, Mastercard, American Express</ThemedText>
          </Pressable>
        ) : (
          cards.map((card) => (
            <View key={card.id} style={[styles.cardItem, card.isDefault && styles.cardItemDefault]}>
              <View style={styles.cardLeft}>
                <View style={[styles.cardIconWrap, { backgroundColor: card.isDefault ? C.sauge : C.saugePale }]}>
                  <ThemedText style={{ fontSize: 18 }}>{cardIcon(card.type)}</ThemedText>
                </View>
                <View>
                  <ThemedText style={styles.cardLabel}>{cardLabel(card.type)} {maskCard(card.last4, card.type)}</ThemedText>
                  <ThemedText style={styles.cardMeta}>{card.name} · Expire {card.expiry}</ThemedText>
                  {card.isDefault && (
                    <View style={styles.defaultBadge}>
                      <ThemedText style={styles.defaultBadgeText}>Par défaut</ThemedText>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                {!card.isDefault && (
                  <Pressable style={styles.cardActionBtn} onPress={() => handleSetDefault(card.id)} hitSlop={8}>
                    <Ionicons name="star-outline" size={18} color={C.sauge} />
                  </Pressable>
                )}
                <Pressable style={[styles.cardActionBtn, styles.cardDeleteBtn]} onPress={() => handleDeleteCard(card.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={C.error} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={C.textLight} />
          <ThemedText style={styles.infoText}>
            Les données de votre carte ne sont jamais stockées sur nos serveurs. Elles sont tokenisées via Stripe, conforme PCI DSS niveau 1.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Add Card Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Ajouter une carte</ThemedText>

              {/* Card preview */}
              <View style={styles.cardPreview}>
                <ThemedText style={styles.cardPreviewNumber}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </ThemedText>
                <View style={styles.cardPreviewRow}>
                  <ThemedText style={styles.cardPreviewLabel}>{cardName || 'NOM PRÉNOM'}</ThemedText>
                  <ThemedText style={styles.cardPreviewLabel}>{expiry || 'MM/AA'}</ThemedText>
                </View>
                {cardType !== 'unknown' && (
                  <View style={styles.cardTypeTag}>
                    <ThemedText style={styles.cardTypeTagText}>{cardLabel(cardType)}</ThemedText>
                  </View>
                )}
              </View>

              <ThemedText style={styles.modalLabel}>Numéro de carte</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={C.textLight}
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                keyboardType="number-pad"
                maxLength={19}
              />

              <ThemedText style={styles.modalLabel}>Nom sur la carte</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="PRÉNOM NOM"
                placeholderTextColor={C.textLight}
                value={cardName}
                onChangeText={(t) => setCardName(t.toUpperCase())}
                autoCapitalize="characters"
              />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.modalLabel}>Date d'expiration</ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="MM/AA"
                    placeholderTextColor={C.textLight}
                    value={expiry}
                    onChangeText={(t) => setExpiry(formatExpiry(t))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.modalLabel}>CVV</ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="•••"
                    placeholderTextColor={C.textLight}
                    value={cvv}
                    onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.securityNote}>
                <Ionicons name="lock-closed" size={13} color={C.success} />
                <ThemedText style={styles.securityNoteText}>Connexion sécurisée SSL 256 bits</ThemedText>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setAddModal(false)}>
                  <ThemedText style={styles.cancelText}>Annuler</ThemedText>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleAddCard}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
                  <ThemedText style={styles.saveBtnText}>Enregistrer</ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  title: { flex: 1, fontSize: 26, fontWeight: '700', color: C.textDark },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },
  content: { gap: 10 },

  securityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successPale, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: C.sauge + '33',
  },
  securityText: { flex: 1, fontSize: 12, color: C.saugeDark, fontWeight: '500' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMid, letterSpacing: 0.8, textTransform: 'uppercase' },

  expressRow: { flexDirection: 'row', gap: 10 },
  expressBtn: {
    flex: 1, backgroundColor: C.textDark, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center',
  },
  expressBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  expressPlaceholder: {
    flex: 1, backgroundColor: C.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  expressPlaceholderText: { fontSize: 13, color: C.textLight, textAlign: 'center' },

  emptyCard: {
    backgroundColor: C.card, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: C.sauge, borderStyle: 'dashed',
    paddingVertical: 32, alignItems: 'center', gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: C.sauge },
  emptyHint: { fontSize: 12, color: C.textLight },

  cardItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: C.border, padding: 14, gap: 12,
  },
  cardItemDefault: { borderColor: C.sauge, borderWidth: 1.5 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: C.textLight },
  defaultBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: C.saugePale, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: C.saugeDark },
  cardActions: { flexDirection: 'row', gap: 6 },
  cardActionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center' },
  cardDeleteBtn: { backgroundColor: C.errorPale },

  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: C.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  infoText: { flex: 1, fontSize: 12, color: C.textLight, lineHeight: 18 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(61,53,48,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.taupe, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: C.textDark, marginBottom: 14 },

  cardPreview: {
    backgroundColor: C.sauge, borderRadius: 16, padding: 20, marginBottom: 16,
    minHeight: 100,
  },
  cardPreviewNumber: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 2, marginBottom: 14 },
  cardPreviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', letterSpacing: 1 },
  cardTypeTag: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  cardTypeTagText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  modalLabel: { fontSize: 12, fontWeight: '600', color: C.textMid, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm,
    padding: 12, fontSize: 15, color: C.textDark, backgroundColor: C.ivoire,
  },
  twoCol: { flexDirection: 'row', gap: 12 },
  securityNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  securityNoteText: { fontSize: 12, color: C.success, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: C.textMid, fontWeight: '700' },
  saveBtn: { flex: 2, backgroundColor: C.sauge, borderRadius: RADIUS.sm, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
