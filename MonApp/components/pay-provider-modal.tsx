import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { KeyboardDoneBar, keyboardDoneProps } from '@/components/ui/keyboard-done-bar';
import { C } from '@/constants/OheveTheme';

/**
 * Saisie du montant puis redirection vers l'écran de paiement Stripe.
 * Utilisé depuis la fiche prestataire ET depuis la discussion (le paiement
 * est alors rattaché à la conversation). Réservé aux prestataires partenaires.
 */
export function PayProviderModal({
  visible,
  onClose,
  providerId,
  providerName,
  providerCategory,
  defaultPrice,
  conversationId,
}: {
  visible: boolean;
  onClose: () => void;
  providerId: string | number;
  providerName: string;
  providerCategory?: string;
  defaultPrice?: string;
  conversationId?: number;
}) {
  const [amount, setAmount] = useState('');

  useEffect(() => { if (!visible) setAmount(''); }, [visible]);

  const handleContinue = () => {
    const euros = parseFloat(amount.replace(',', '.'));
    if (!euros || euros < 1) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant d\'au moins 1 €.');
      return;
    }
    onClose();
    router.push({
      pathname: '/(app)/payment',
      params: {
        prestataire_id: String(providerId),
        prestataire_nom: providerName,
        prestataire_categorie: providerCategory ?? '',
        amount_cents: String(Math.round(euros * 100)),
        currency: 'eur',
        description: `Paiement à ${providerName}`,
        ...(conversationId ? { conversation_id: String(conversationId) } : {}),
      },
    });
  };

  const placeholder = defaultPrice && defaultPrice !== '—'
    ? (defaultPrice.replace(/[^\d,.-]/g, '') || '500')
    : '500';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ThemedText style={styles.headerTitle} numberOfLines={2}>{providerName}</ThemedText>
          <ThemedText style={styles.headerSub}>Entrez le montant à payer</ThemedText>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={placeholder}
              placeholderTextColor="#9A9C93"
              keyboardType="decimal-pad"
              {...keyboardDoneProps}
              autoFocus
            />
            <ThemedText style={styles.currencySymbol}>€</ThemedText>
          </View>
          <Pressable style={styles.payBtn} onPress={handleContinue}>
            <Ionicons name="card-outline" size={18} color="#fff" />
            <ThemedText style={styles.payBtnTxt} numberOfLines={1}>
              Payer {amount ? `· ${amount} €` : ''}
            </ThemedText>
          </Pressable>
          <View style={styles.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#9A9C93" />
            <ThemedText style={styles.secureTxt}>Paiement sécurisé par Stripe · SSL 256 bits</ThemedText>
          </View>
          <View style={{ height: 32 }} />
        </View>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ece8e0', alignSelf: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontFamily: 'OheveSerif-Medium', color: C.textDark, marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#9A9C93', marginBottom: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.sauge, borderRadius: 14, paddingHorizontal: 14, marginBottom: 20 },
  amountInput: { flex: 1, height: 56, fontSize: 26, fontFamily: 'OheveSerif-Medium', color: C.textDark },
  currencySymbol: { fontSize: 26, fontFamily: 'OheveSerif-Medium', color: C.sauge },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.sauge, borderRadius: 16, paddingVertical: 16 },
  payBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  secureTxt: { fontSize: 11, color: '#9A9C93' },
});
