import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { demandesApi } from '@/services/auth/api';

type Recue = {
  id: number; statut: 'gratuite' | 'verrouillee' | 'debloquee' | 'abonnement'; verrouillee: boolean;
  created_at: string; client_prenom: string; apercu: string; dernier_message_at: string; a_repondre: boolean; non_lus: number;
};
type Envoyee = {
  id: number; created_at: string; prestataire_nom: string; dernier_message: string | null; dernier_message_at: string;
  a_repondu: boolean; sans_reponse_48h: boolean; non_lus: number;
};
type Liste = {
  recues: Recue[]; envoyees: Envoyee[];
  stats: { total_recues: number; gratuites_utilisees: number; free_limit: number; abonne: boolean } | null;
};

const STATUT: Record<Recue['statut'], { label: string; bg: string; fg: string }> = {
  gratuite: { label: 'Offerte', bg: C.saugePale, fg: C.saugeDark },
  abonnement: { label: 'Abonnement', bg: C.saugePale, fg: C.saugeDark },
  debloquee: { label: 'Débloquée', bg: C.saugePale, fg: C.saugeDark },
  verrouillee: { label: 'Verrouillée', bg: C.warningPale, fg: '#8A6A3F' },
};

export function dateCourte(iso: string): string {
  const d = new Date(iso);
  const auj = new Date();
  if (d.toDateString() === auj.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** « Mes demandes » : reçues (prestataire) et/ou envoyées (client). */
export function DemandesListScreen({ detailPath }: { detailPath: string }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Liste | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);

  const charger = useCallback(async () => {
    if (!user?.accessToken) return;
    const r = await demandesApi.liste(user.accessToken);
    if (r?.success) { setData(r.data); setErreur(null); } else setErreur(r?.message ?? 'Chargement impossible.');
  }, [user?.accessToken]);

  useFocusEffect(useCallback(() => { void charger(); }, [charger]));

  const ouvrir = (id: number) => router.push(`${detailPath}/${id}` as never);
  const vide = data && data.recues.length === 0 && data.envoyees.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)' as never))} hitSlop={14} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.title}>Mes demandes</ThemedText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={async () => { setRefresh(true); await charger(); setRefresh(false); }} />}
      >
        {!data && !erreur && <ActivityIndicator color={C.saugeDark} style={{ marginTop: 40 }} />}
        {erreur && <ThemedText style={styles.error}>{erreur}</ThemedText>}

        {data?.stats && (
          <View style={styles.stat}>
            <ThemedText style={styles.statTxt}>
              Vous avez reçu <ThemedText style={styles.bold}>{data.stats.total_recues} demande{data.stats.total_recues > 1 ? 's' : ''}</ThemedText> sur Oheve.
            </ThemedText>
            {!data.stats.abonne && (
              <ThemedText style={styles.statSub}>
                {data.stats.gratuites_utilisees < data.stats.free_limit
                  ? `Demandes offertes utilisées : ${data.stats.gratuites_utilisees}/${data.stats.free_limit}`
                  : `Vos ${data.stats.free_limit} demandes offertes sont utilisées : abonnez-vous pour lire les suivantes.`}
              </ThemedText>
            )}
          </View>
        )}

        {vide && (
          <View style={styles.empty}>
            <Ionicons name="mail-open-outline" size={40} color={C.textLight} />
            <ThemedText style={styles.emptyTxt}>
              {user?.role === 'prestataire' ? 'Aucune demande pour le moment.' : 'Vous n\'avez encore contacté aucun prestataire.'}
            </ThemedText>
          </View>
        )}

        {data && data.recues.length > 0 && user?.role !== 'prestataire' && <ThemedText style={styles.section}>Reçues</ThemedText>}
        {data?.recues.map((d) => (
          <Pressable key={`r${d.id}`} style={styles.card} onPress={() => ouvrir(d.id)}>
            <View style={styles.row}>
              <ThemedText style={styles.name} numberOfLines={1}>{d.client_prenom}</ThemedText>
              <ThemedText style={styles.date}>{dateCourte(d.dernier_message_at)}</ThemedText>
            </View>
            <ThemedText style={styles.preview} numberOfLines={2}>{d.verrouillee ? `🔒 ${d.apercu}` : d.apercu}</ThemedText>
            <View style={[styles.row, { marginTop: 8 }]}>
              <View style={[styles.badge, { backgroundColor: STATUT[d.statut].bg }]}>
                <ThemedText style={[styles.badgeTxt, { color: STATUT[d.statut].fg }]}>{STATUT[d.statut].label}</ThemedText>
              </View>
              {d.non_lus > 0 ? <View style={styles.dot}><ThemedText style={styles.dotTxt}>{d.non_lus}</ThemedText></View>
                : d.a_repondre ? <ThemedText style={styles.hint}>À répondre</ThemedText> : null}
            </View>
          </Pressable>
        ))}

        {data && data.envoyees.length > 0 && data.recues.length > 0 && <ThemedText style={styles.section}>Envoyées</ThemedText>}
        {data?.envoyees.map((d) => (
          <Pressable key={`e${d.id}`} style={styles.card} onPress={() => ouvrir(d.id)}>
            <View style={styles.row}>
              <ThemedText style={styles.name} numberOfLines={1}>{d.prestataire_nom}</ThemedText>
              <ThemedText style={styles.date}>{dateCourte(d.dernier_message_at)}</ThemedText>
            </View>
            {d.dernier_message ? <ThemedText style={styles.preview} numberOfLines={2}>{d.dernier_message}</ThemedText> : null}
            <View style={[styles.row, { marginTop: 8 }]}>
              <View style={[styles.badge, { backgroundColor: d.a_repondu ? C.saugePale : C.cardAlt }]}>
                <ThemedText style={[styles.badgeTxt, { color: d.a_repondu ? C.saugeDark : C.textMid }]}>{d.a_repondu ? 'Répondu' : 'En attente de réponse'}</ThemedText>
              </View>
              {d.non_lus > 0 && <View style={styles.dot}><ThemedText style={styles.dotTxt}>{d.non_lus}</ThemedText></View>}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ivoire },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: C.textDark },
  stat: { backgroundColor: C.saugePale, borderRadius: RADIUS.lg, padding: 14, gap: 4 },
  statTxt: { fontSize: 15, color: C.textDark },
  statSub: { fontSize: 13, color: C.textMid },
  bold: { fontWeight: '700', color: C.textDark },
  section: { fontSize: 13, fontWeight: '700', color: C.textLight, textTransform: 'uppercase', marginTop: 8 },
  card: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: C.taupe },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: C.textDark },
  date: { fontSize: 12, color: C.textLight },
  preview: { fontSize: 14, color: C.textMid, marginTop: 4 },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 1 },
  badgeTxt: { fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 12, color: C.saugeDark, fontWeight: '600' },
  dot: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.saugeDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  dotTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, marginTop: 60 },
  emptyTxt: { color: C.textMid, fontSize: 15, textAlign: 'center' },
  error: { color: C.error, textAlign: 'center', marginTop: 20 },
});
