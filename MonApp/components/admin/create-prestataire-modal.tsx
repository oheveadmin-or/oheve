import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { adminApi } from '@/services/auth/api';

// Même taxonomie que prestataire/setup.tsx et profile-edit.tsx.
const CATEGORIES = [
  { key: 'salle', label: 'Salle / Lieu' },
  { key: 'traiteur', label: 'Traiteur' },
  { key: 'photo', label: 'Photo & Vidéo' },
  { key: 'musique', label: 'Musique / DJ' },
  { key: 'fleuriste', label: 'Déco & Fleurs' },
  { key: 'beaute', label: 'Beauté' },
  { key: 'tenues', label: 'Tenues' },
  { key: 'transport', label: 'Transport' },
  { key: 'juif', label: 'Mariage Juif' },
  { key: 'chabbat-hattan', label: 'Chabbat Hattan' },
  { key: 'patisserie', label: 'Pâtisserie' },
  { key: 'planner', label: 'Wedding Planner' },
  { key: 'animation', label: 'Animation' },
  { key: 'autre', label: 'Autre' },
];

/** Durées proposées pour la gratuité (en mois) ; 0 = sans limite. */
export const GRANT_DURATIONS = [
  { months: 0, label: 'Sans limite' },
  { months: 3, label: '3 mois' },
  { months: 6, label: '6 mois' },
  { months: 12, label: '12 mois' },
];

/** Date ISO de fin de gratuité, ou null pour « sans limite ». */
export function grantUntil(months: number): string | null {
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** Mot de passe lisible (sans 0/O/1/l) à transmettre au prestataire. */
export function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

type Props = {
  visible: boolean;
  token: string;
  onClose: () => void;
  onCreated: () => void;
};

export function CreatePrestataireModal({ visible, token, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<'offert' | 'payant'>('offert');
  const [months, setMonths] = useState(0);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEmail(''); setPassword(generatePassword()); setBusinessName(''); setCategory('');
    setPrenom(''); setNom(''); setCity(''); setPhone(''); setMode('offert'); setMonths(0);
  };

  const canSave = email.trim() && password.length >= 8 && businessName.trim() && category && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    const res = await adminApi.createPrestataire(token, {
      email: email.trim(),
      mot_de_passe: password,
      prenom: prenom.trim() || undefined,
      nom: nom.trim() || undefined,
      business_name: businessName.trim(),
      category,
      location_city: city.trim() || undefined,
      phone: phone.trim() || undefined,
      mode,
      offert_until: mode === 'offert' ? grantUntil(months) : null,
    });
    setSaving(false);
    if (!res.success) {
      Alert.alert('Création impossible', res.message ?? 'Réessayez.');
      return;
    }
    const ids = `Identifiants Oheve\nEmail : ${email.trim().toLowerCase()}\nMot de passe : ${password}`;
    Alert.alert(
      'Compte prestataire créé',
      `${ids}\n\n${mode === 'offert'
        ? `Abonnement offert${months ? ` ${months} mois` : ' sans limite'} : la fiche est visible dès maintenant.`
        : 'Mode payant : le prestataire active son abonnement depuis l\'app pour apparaître dans l\'annuaire.'}`,
      [
        { text: 'Copier les identifiants', onPress: () => Clipboard.setStringAsync(ids) },
        { text: 'OK' },
      ],
    );
    reset();
    onCreated();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#343630" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Nouveau prestataire</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.section}>Identifiants de connexion</ThemedText>
          <Field label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <View style={{ gap: 6 }}>
            <ThemedText style={styles.label}>Mot de passe * (8 caractères min.)</ThemedText>
            <View style={styles.pwdRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                autoCapitalize="none" autoCorrect={false} />
              <Pressable style={styles.iconBtn} onPress={() => setPassword(generatePassword())} hitSlop={6}>
                <Ionicons name="refresh" size={18} color="#747e68" />
              </Pressable>
            </View>
          </View>

          <ThemedText style={styles.section}>Fiche annuaire</ThemedText>
          <Field label="Nom de l'entreprise *" value={businessName} onChangeText={setBusinessName} />
          <ThemedText style={styles.label}>Catégorie *</ThemedText>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Pressable key={c.key} style={[styles.chip, category === c.key && styles.chipOn]} onPress={() => setCategory(c.key)}>
                <ThemedText style={[styles.chipTxt, category === c.key && styles.chipTxtOn]}>{c.label}</ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><Field label="Prénom" value={prenom} onChangeText={setPrenom} /></View>
            <View style={{ flex: 1 }}><Field label="Nom" value={nom} onChangeText={setNom} /></View>
          </View>
          <Field label="Ville" value={city} onChangeText={setCity} />
          <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <ThemedText style={styles.section}>Mode de fonctionnement</ThemedText>
          <ModeOption
            selected={mode === 'offert'}
            onPress={() => setMode('offert')}
            title="Abonnement offert"
            text="Gratuit, aucun prélèvement. La fiche est visible dans l'annuaire dès la création."
          />
          {mode === 'offert' && (
            <View style={styles.chips}>
              {GRANT_DURATIONS.map((d) => (
                <Pressable key={d.months} style={[styles.chip, months === d.months && styles.chipOn]} onPress={() => setMonths(d.months)}>
                  <ThemedText style={[styles.chipTxt, months === d.months && styles.chipTxtOn]}>{d.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}
          <ModeOption
            selected={mode === 'payant'}
            onPress={() => setMode('payant')}
            title="Abonnement payant"
            text="Le prestataire se connecte et active lui-même son abonnement (39,99 €/mois après la période offerte) pour apparaître dans l'annuaire."
          />

          <Pressable style={[styles.saveBtn, !canSave && { opacity: 0.45 }]} onPress={submit} disabled={!canSave}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <ThemedText style={styles.saveTxt}>Créer le compte</ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput style={styles.input} placeholderTextColor="#9a9c93" {...props} />
    </View>
  );
}

function ModeOption({ selected, onPress, title, text }: { selected: boolean; onPress: () => void; title: string; text: string }) {
  return (
    <Pressable style={[styles.mode, selected && styles.modeOn]} onPress={onPress}>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? '#747e68' : '#9a9c93'} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={styles.modeTitle}>{title}</ThemedText>
        <ThemedText style={styles.modeTxt}>{text}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8faf9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ece8e0', backgroundColor: '#fff' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#343630' },
  scroll: { padding: 16, gap: 12 },
  section: { fontSize: 13, fontWeight: '700', color: '#747e68', marginTop: 8, letterSpacing: 0.5 },
  label: { fontSize: 12, fontWeight: '600', color: '#5c5f57' },
  input: { borderWidth: 1.5, borderColor: '#ece8e0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#343630', backgroundColor: '#fff' },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#ece8e0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  row2: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#ece8e0', backgroundColor: '#fff' },
  chipOn: { borderColor: '#929B83', backgroundColor: '#929B83' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#5c5f57' },
  chipTxtOn: { color: '#fff' },
  mode: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#ece8e0', backgroundColor: '#fff' },
  modeOn: { borderColor: '#929B83', backgroundColor: '#f3f5ef' },
  modeTitle: { fontSize: 14, fontWeight: '700', color: '#343630' },
  modeTxt: { fontSize: 12, color: '#5c5f57', lineHeight: 17 },
  saveBtn: { backgroundColor: '#747e68', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
