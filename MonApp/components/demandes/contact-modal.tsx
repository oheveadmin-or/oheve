import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { KeyboardDoneBar, keyboardDoneProps } from '@/components/ui/keyboard-done-bar';
import { C, RADIUS } from '@/constants/OheveTheme';
import { demandesApi } from '@/services/auth/api';

const MIN = 10;
const MAX = 2000;

/** Formulaire « Contacter ce prestataire » (fiche prestataire, côté client). */
export function ContactPrestataireModal({
  visible,
  onClose,
  prestataireId,
  prestataireNom,
  accessToken,
}: {
  visible: boolean;
  onClose: () => void;
  prestataireId: number;
  prestataireNom: string;
  accessToken: string;
}) {
  const insets = useSafeAreaInsets();
  const [texte, setTexte] = useState('');
  const [consentement, setConsentement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<{ demandeId: number } | null>(null);

  const longueur = texte.trim().length;
  const valide = longueur >= MIN && longueur <= MAX && consentement && !envoi;

  const fermer = () => {
    if (envoi) return;
    onClose();
    // On garde le texte si l'envoi a échoué ; on repart à zéro après un succès.
    if (succes) { setTexte(''); setConsentement(false); setSucces(null); }
    setErreur(null);
  };

  async function envoyer() {
    if (!valide) return;
    setEnvoi(true);
    setErreur(null);
    const r = await demandesApi.envoyer(accessToken, prestataireId, texte.trim());
    setEnvoi(false);
    if (r?.success) setSucces({ demandeId: r.data?.demande_id });
    else setErreur(r?.message ?? 'Envoi impossible. Réessayez.');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fermer}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={fermer} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.handle} />
          {succes ? (
            <View style={styles.successWrap}>
              <Ionicons name="checkmark-circle" size={52} color={C.saugeDark} />
              <ThemedText style={styles.successTitle}>Votre demande a bien été transmise.</ThemedText>
              <ThemedText style={[styles.sub, { textAlign: 'center' }]}>{prestataireNom} est prévenu par e-mail. Vous retrouverez sa réponse dans « Mes demandes ».</ThemedText>
              <Pressable
                style={[styles.btn, { alignSelf: 'stretch', marginTop: 18 }]}
                onPress={() => { fermer(); router.push(`/(app)/demandes/${succes.demandeId}` as never); }}
              >
                <ThemedText style={styles.btnTxt}>Voir ma demande</ThemedText>
              </Pressable>
              <Pressable onPress={fermer} style={{ padding: 12 }}>
                <ThemedText style={styles.link}>Fermer</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.title} numberOfLines={2}>Contacter {prestataireNom}</ThemedText>
              <ThemedText style={styles.sub}>Présentez votre projet : date, lieu, nombre d'invités, vos questions.</ThemedText>
              <TextInput
                style={styles.input}
                value={texte}
                onChangeText={setTexte}
                placeholder="Bonjour, nous nous marions le…"
                placeholderTextColor={C.textLight}
                multiline
                maxLength={MAX}
                textAlignVertical="top"
                editable={!envoi}
                {...keyboardDoneProps}
              />
              <ThemedText style={[styles.counter, longueur > 0 && longueur < MIN && { color: C.error }]}>
                {longueur > 0 && longueur < MIN ? `Encore ${MIN - longueur} caractère${MIN - longueur > 1 ? 's' : ''} minimum · ` : ''}{texte.length} / {MAX}
              </ThemedText>
              <Pressable style={styles.checkRow} onPress={() => setConsentement((v) => !v)} disabled={envoi} accessibilityRole="checkbox" accessibilityState={{ checked: consentement }}>
                <View style={[styles.checkbox, consentement && styles.checkboxOn]}>
                  {consentement && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <ThemedText style={styles.checkTxt}>J'accepte que mes coordonnées soient transmises à ce prestataire</ThemedText>
              </Pressable>
              {erreur && <ThemedText style={styles.error}>{erreur}</ThemedText>}
              <Pressable style={[styles.btn, !valide && styles.btnOff]} onPress={envoyer} disabled={!valide}>
                {envoi ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.btnTxt}>Envoyer</ThemedText>}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.taupe, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  sub: { fontSize: 14, color: C.textMid, textAlign: 'left' },
  input: { minHeight: 150, maxHeight: 260, borderWidth: 1.5, borderColor: C.taupe, borderRadius: RADIUS.lg, padding: 14, marginTop: 14, fontSize: 15, color: C.textDark, backgroundColor: C.ivoire },
  counter: { alignSelf: 'flex-end', fontSize: 12, color: C.textLight, marginTop: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 6 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.sauge, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: C.saugeDark, borderColor: C.saugeDark },
  checkTxt: { flex: 1, fontSize: 14, color: C.textDark },
  error: { color: C.error, fontSize: 14, marginTop: 10 },
  btn: { backgroundColor: C.saugeDark, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16, minHeight: 54 },
  btnOff: { opacity: 0.45 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successWrap: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  successTitle: { fontSize: 18, fontWeight: '700', color: C.textDark, textAlign: 'center' },
  link: { color: C.saugeDark, fontWeight: '600' },
});
