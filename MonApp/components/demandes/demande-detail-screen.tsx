import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { demandesApi } from '@/services/auth/api';

const MAX = 2000;
/** Décor flouté : JAMAIS le vrai message (le serveur ne l'envoie pas). */
const FAUX_TEXTE = 'Nous aimerions connaître vos disponibilités ainsi que vos tarifs pour la journée, avec les différentes formules proposées. Pouvez-vous nous rappeler ?';

type Message = { id: number; auteur: 'client' | 'prestataire'; contenu: string; created_at: string; file_name?: string | null; file_url?: string | null };
type VuePresta = {
  id: number; role: 'prestataire'; statut: string; verrouillee: boolean; created_at: string;
  numero_gratuit: number | null; free_limit: number; total_demandes_recues: number; deblocage_unite_disponible: boolean;
  client: { prenom: string; nom?: string; email?: string | null; phone?: string | null };
  apercu: string | null; messages: Message[];
};
type VueClient = {
  id: number; role: 'client'; created_at: string; messages: Message[]; a_repondu: boolean; sans_reponse_48h: boolean;
  prestataire: { user_id: number; business_name: string; category: string | null; city: string | null };
};
type Similaire = { user_id: number; business_name: string; city: string | null; cover_url: string | null; repond_vite: boolean };

function dateLongue(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function DemandeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const demandeId = parseInt(id ?? '0', 10);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [vue, setVue] = useState<VuePresta | VueClient | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; msg: string } | null>(null);
  const [similaires, setSimilaires] = useState<{ titre_rapides: boolean; prestataires: Similaire[] } | null>(null);
  const [paiement, setPaiement] = useState(false);

  const charger = useCallback(async () => {
    if (!user?.accessToken || !demandeId) return;
    const r = await demandesApi.detail(user.accessToken, demandeId);
    if (!r?.success) { setErreur(r?.message ?? 'Demande introuvable.'); return; }
    setVue(r.data); setErreur(null);
    if (r.data.role === 'client' && r.data.sans_reponse_48h) {
      const s = await demandesApi.similaires(user.accessToken, demandeId);
      if (s?.success) setSimilaires(s.data);
    }
  }, [user?.accessToken, demandeId]);

  // Rechargé au retour de l'écran d'abonnement : la demande s'ouvre alors.
  useFocusEffect(useCallback(() => { void charger(); }, [charger]));

  async function envoyer() {
    if (!user?.accessToken || !texte.trim() || envoi) return;
    setEnvoi(true); setRetour(null);
    const r = await demandesApi.repondre(user.accessToken, demandeId, texte.trim());
    setEnvoi(false);
    if (r?.success) { setTexte(''); setRetour({ ok: true, msg: r.message ?? 'Envoyé.' }); await charger(); }
    else setRetour({ ok: false, msg: r?.message ?? 'Envoi impossible. Réessayez.' });
  }

  // Web uniquement : paiement à l'unité via Stripe Checkout. Dans les apps
  // iOS/Android, l'achat numérique passe par l'abonnement (App Store / Play).
  async function debloquer() {
    if (!user?.accessToken) return;
    setPaiement(true);
    const r = await demandesApi.checkout(user.accessToken, demandeId, 'deblocage');
    setPaiement(false);
    if (r?.success && r.data?.url) Linking.openURL(r.data.url);
    else setRetour({ ok: false, msg: r?.message ?? 'Le paiement n\'a pas pu démarrer.' });
  }

  const titre = vue?.role === 'prestataire' ? vue.client.prenom : vue?.role === 'client' ? vue.prestataire.business_name : 'Demande';
  const moi = vue?.role;
  const peutRepondre = vue && !(vue.role === 'prestataire' && vue.verrouillee);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)' as never))} hitSlop={14} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.title} numberOfLines={1}>{titre}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {!vue && !erreur && <ActivityIndicator color={C.saugeDark} style={{ marginTop: 40 }} />}
        {erreur && <ThemedText style={styles.error}>{erreur}</ThemedText>}

        {vue?.role === 'prestataire' && (
          <>
            <View style={styles.stat}>
              <ThemedText style={styles.statTxt}>
                Vous avez reçu <ThemedText style={styles.bold}>{vue.total_demandes_recues} demande{vue.total_demandes_recues > 1 ? 's' : ''}</ThemedText> sur Ohevé.
              </ThemedText>
            </View>
            <View style={styles.card}>
              <ThemedText style={styles.label}>DEMANDE DE</ThemedText>
              <ThemedText style={styles.big}>{vue.client.prenom}</ThemedText>
              <ThemedText style={styles.muted}>Reçue le {dateLongue(vue.created_at)}</ThemedText>

              {vue.verrouillee ? (
                <>
                  <View style={styles.quote}>
                    <ThemedText style={styles.quoteTxt}>{vue.apercu}</ThemedText>
                    <View style={{ marginTop: 6, overflow: 'hidden', borderRadius: 8 }}>
                      <ThemedText style={[styles.quoteTxt, { color: C.textLight }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{FAUX_TEXTE}</ThemedText>
                      <BlurView intensity={Platform.OS === 'android' ? 60 : 22} tint="light" style={StyleSheet.absoluteFill} />
                    </View>
                  </View>
                  <View style={styles.infoRow}><ThemedText style={styles.muted}>E-mail</ThemedText><ThemedText style={styles.masked}>••••••@•••.••</ThemedText></View>
                  <View style={styles.infoRow}><ThemedText style={styles.muted}>Téléphone</ThemedText><ThemedText style={styles.masked}>•• •• •• •• ••</ThemedText></View>
                  <ThemedText style={[styles.muted, { marginTop: 10 }]}>
                    🔒 Vous avez utilisé vos {vue.free_limit} demandes offertes. Activez votre abonnement pour lire cette demande et contacter {vue.client.prenom}.
                  </ThemedText>
                  <Pressable style={styles.btn} onPress={() => router.push('/(app)/prestataire/subscribe' as never)}>
                    <ThemedText style={styles.btnTxt}>S'abonner</ThemedText>
                  </Pressable>
                  {Platform.OS === 'web' && vue.deblocage_unite_disponible && (
                    <Pressable style={styles.btnGhost} onPress={debloquer} disabled={paiement}>
                      {paiement ? <ActivityIndicator color={C.saugeDark} /> : <ThemedText style={styles.btnGhostTxt}>Débloquer cette demande</ThemedText>}
                    </Pressable>
                  )}
                </>
              ) : (
                <>
                  {vue.client.email
                    ? <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`mailto:${vue.client.email}`)}><ThemedText style={styles.muted}>E-mail</ThemedText><ThemedText style={styles.linkTxt} numberOfLines={1}>{vue.client.email}</ThemedText></Pressable>
                    : <View style={styles.infoRow}><ThemedText style={styles.muted}>E-mail</ThemedText><ThemedText style={styles.muted}>Non transmis</ThemedText></View>}
                  {vue.client.phone ? (
                    <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${vue.client.phone!.replace(/\s+/g, '')}`)}>
                      <ThemedText style={styles.muted}>Téléphone</ThemedText><ThemedText style={styles.linkTxt}>{vue.client.phone}</ThemedText>
                    </Pressable>
                  ) : null}
                  {vue.statut === 'gratuite' && vue.numero_gratuit ? (
                    <ThemedText style={[styles.muted, { fontSize: 12, marginTop: 8 }]}>Demande offerte par Ohevé ({vue.numero_gratuit}/{vue.free_limit})</ThemedText>
                  ) : null}
                </>
              )}
            </View>
          </>
        )}

        {vue?.role === 'client' && (
          <View style={styles.card}>
            <ThemedText style={styles.label}>VOTRE DEMANDE À</ThemedText>
            <Pressable onPress={() => router.push(`/(app)/providers/${vue.prestataire.user_id}` as never)}>
              <ThemedText style={[styles.big, { textDecorationLine: 'underline' }]}>{vue.prestataire.business_name}</ThemedText>
            </Pressable>
            <ThemedText style={styles.muted}>Envoyée le {dateLongue(vue.created_at)} · {vue.a_repondu ? 'Répondu' : 'En attente de réponse'}</ThemedText>
          </View>
        )}

        {vue?.role === 'client' && vue.sans_reponse_48h && similaires && similaires.prestataires.length > 0 && (
          <View style={styles.card}>
            <ThemedText style={styles.simTitle}>
              {similaires.titre_rapides
                ? 'Pas encore de réponse ? Voici des prestataires qui répondent rapidement'
                : 'Pas encore de réponse ? Voici d\'autres prestataires similaires'}
            </ThemedText>
            {similaires.prestataires.map((p) => (
              <Pressable key={p.user_id} style={styles.simRow} onPress={() => router.push(`/(app)/providers/${p.user_id}` as never)}>
                {p.cover_url ? <Image source={{ uri: p.cover_url }} style={styles.simImg} /> : <View style={[styles.simImg, { backgroundColor: C.saugePale }]} />}
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.simName} numberOfLines={1}>{p.business_name}</ThemedText>
                  {p.city ? <ThemedText style={styles.muted} numberOfLines={1}>{p.city}</ThemedText> : null}
                  {p.repond_vite ? <ThemedText style={styles.simBadge}>Répond en général sous 24 h</ThemedText> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textLight} />
              </Pressable>
            ))}
          </View>
        )}

        {peutRepondre && vue && (
          <View style={styles.card}>
            <ThemedText style={styles.label}>CONVERSATION</ThemedText>
            <View style={{ gap: 8, marginTop: 4 }}>
              {vue.messages.map((m) => {
                const mine = m.auteur === moi;
                return (
                  <View key={m.id} style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleThem]}>
                    <ThemedText style={[styles.bubbleTxt, mine && { color: '#fff' }]}>{m.contenu || (m.file_name ? `📎 ${m.file_name}` : '')}</ThemedText>
                    <ThemedText style={[styles.bubbleDate, mine && { color: 'rgba(255,255,255,0.75)' }]}>{dateLongue(m.created_at)}</ThemedText>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {retour && <ThemedText style={{ color: retour.ok ? C.saugeDark : C.error, textAlign: 'center' }}>{retour.msg}</ThemedText>}
      </ScrollView>

      {peutRepondre && (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            value={texte}
            onChangeText={setTexte}
            placeholder={vue?.role === 'prestataire' ? `Répondre à ${vue.client.prenom}…` : 'Votre message…'}
            placeholderTextColor={C.textLight}
            multiline
            maxLength={MAX}
          />
          <Pressable style={[styles.send, (!texte.trim() || envoi) && { opacity: 0.4 }]} onPress={envoyer} disabled={!texte.trim() || envoi} accessibilityLabel="Envoyer">
            {envoi ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ivoire },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: C.textDark },
  stat: { backgroundColor: C.saugePale, borderRadius: RADIUS.lg, padding: 14 },
  statTxt: { fontSize: 15, color: C.textDark },
  bold: { fontWeight: '700', color: C.textDark },
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: C.taupe },
  label: { fontSize: 11, letterSpacing: 1, color: C.textLight, fontWeight: '600' },
  big: { fontSize: 22, fontWeight: '700', color: C.textDark, marginTop: 2 },
  muted: { fontSize: 14, color: C.textMid, flexShrink: 1 },
  quote: { backgroundColor: C.saugePale, borderLeftWidth: 4, borderLeftColor: C.sauge, borderRadius: 10, padding: 14, marginTop: 14, marginBottom: 6 },
  quoteTxt: { fontSize: 15, lineHeight: 22, color: C.textDark },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.cardAlt },
  masked: { color: C.textLight, letterSpacing: 2 },
  linkTxt: { color: C.saugeDark, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  btn: { backgroundColor: C.saugeDark, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnGhost: { borderWidth: 1.5, borderColor: C.sauge, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginTop: 10, minHeight: 50, justifyContent: 'center' },
  btnGhostTxt: { color: C.saugeDark, fontWeight: '700', fontSize: 16 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: C.saugeDark, borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: C.saugePale, borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 15, lineHeight: 21, color: C.textDark },
  bubbleDate: { fontSize: 11, color: C.textLight, marginTop: 4 },
  simTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 6 },
  simRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  simImg: { width: 52, height: 52, borderRadius: 10 },
  simName: { fontSize: 15, fontWeight: '600', color: C.textDark },
  simBadge: { fontSize: 12, color: C.saugeDark, fontWeight: '600', marginTop: 2 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.taupe },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, backgroundColor: C.ivoire, borderWidth: 1, borderColor: C.taupe, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: C.textDark },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.saugeDark, alignItems: 'center', justifyContent: 'center' },
  error: { color: C.error, textAlign: 'center', marginTop: 20 },
});
