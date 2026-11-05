import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { communityApi } from '@/services/auth/api';

// ── Admin → Communauté : signalements + membres (bloquer / débloquer) ─────────

type Report = {
  id: number;
  reason: string;
  status: string;
  created_at: string;
  message_id: number | null;
  reported_user_id: number;
  reported_prenom: string;
  reported_nom: string;
  reporter_prenom: string;
  reporter_nom: string;
  message_content: string | null;
  message_deleted: boolean;
  reported_banned: boolean;
};

type Member = {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  message_count: number;
  last_message_at: string | null;
  open_reports: number;
  banned: boolean;
  ban_reason: string | null;
};

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function CommunityModeration({ token }: { token: string }) {
  const [view, setView] = useState<'reports' | 'members'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const res = view === 'reports'
      ? await communityApi.adminReports(token, 'open')
      : await communityApi.adminMembers(token);
    if (res?.success && Array.isArray(res.data)) {
      if (view === 'reports') setReports(res.data); else setMembers(res.data);
      setError(null);
    } else {
      setError(res?.message ?? 'Chargement impossible');
    }
    setLoading(false);
  }, [token, view]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ban = (userId: number, name: string) => {
    Alert.alert(`Bloquer ${name} ?`, 'Cette personne ne pourra plus lire ni écrire dans la Communauté.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Bloquer', style: 'destructive', onPress: () => doBan(userId, false) },
      { text: 'Bloquer + effacer ses messages', style: 'destructive', onPress: () => doBan(userId, true) },
    ]);
  };

  const doBan = async (userId: number, purge: boolean) => {
    const res = await communityApi.adminBan(token, userId, 'Modération admin', purge);
    if (!res?.success) Alert.alert('Erreur', res?.message ?? 'Action impossible');
    load();
  };

  const unban = async (userId: number) => {
    const res = await communityApi.adminUnban(token, userId);
    if (!res?.success) Alert.alert('Erreur', res?.message ?? 'Action impossible');
    load();
  };

  const deleteMessage = (r: Report) => {
    if (!r.message_id) return;
    Alert.alert('Supprimer ce message ?', 'Il sera retiré pour tous les mariés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          const del = await communityApi.deleteMessage(token, r.message_id!);
          if (!del?.success) { Alert.alert('Erreur', del?.message ?? 'Suppression impossible'); return; }
          await communityApi.adminSetReportStatus(token, r.id, 'resolved');
          load();
        },
      },
    ]);
  };

  const dismiss = async (r: Report) => {
    const res = await communityApi.adminSetReportStatus(token, r.id, 'dismissed');
    if (!res?.success) Alert.alert('Erreur', res?.message ?? 'Action impossible');
    load();
  };

  const q = search.trim().toLowerCase();
  const shownMembers = q
    ? members.filter((m) => `${m.prenom} ${m.nom} ${m.email}`.toLowerCase().includes(q))
    : members;

  return (
    <View style={{ gap: 12 }}>
      <Pressable style={styles.openBtn} onPress={() => router.push('/(app)/community' as never)}>
        <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
        <ThemedText style={styles.openTxt}>Ouvrir la Communauté</ThemedText>
      </Pressable>

      <View style={styles.segment}>
        {(['reports', 'members'] as const).map((v) => (
          <Pressable key={v} style={[styles.segBtn, view === v && styles.segBtnOn]} onPress={() => { if (v !== view) { setLoading(true); setView(v); } }}>
            <ThemedText style={[styles.segTxt, view === v && styles.segTxtOn]}>
              {v === 'reports' ? 'Signalements' : 'Membres'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {view === 'members' && (
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un marié…"
          placeholderTextColor="#9a9c93"
        />
      )}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      {loading ? (
        <ActivityIndicator color="#929B83" style={{ marginTop: 24 }} />
      ) : view === 'reports' ? (
        reports.length === 0 ? (
          <ThemedText style={styles.empty}>Aucun signalement en attente 🎉</ThemedText>
        ) : reports.map((r) => (
          <View key={r.id} style={styles.card}>
            <ThemedText style={styles.cardTitle}>{r.reported_prenom} {r.reported_nom}{r.reported_banned ? ' · bloqué' : ''}</ThemedText>
            <ThemedText style={styles.cardSub}>
              Signalé par {r.reporter_prenom} {r.reporter_nom} · {fmt(r.created_at)}
            </ThemedText>
            {r.reason ? <ThemedText style={styles.reason}>Motif : {r.reason}</ThemedText> : null}
            {r.message_id ? (
              <View style={styles.quote}>
                <ThemedText style={[styles.quoteTxt, r.message_deleted && { fontStyle: 'italic' }]} numberOfLines={6}>
                  {r.message_deleted ? `(supprimé) ${r.message_content ?? ''}` : r.message_content}
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.cardSub}>Signalement du profil (pas d&apos;un message précis)</ThemedText>
            )}
            <View style={styles.actions}>
              {r.message_id && !r.message_deleted ? (
                <Pressable style={[styles.actBtn, styles.actDanger]} onPress={() => deleteMessage(r)}>
                  <ThemedText style={styles.actDangerTxt}>Supprimer le message</ThemedText>
                </Pressable>
              ) : null}
              {!r.reported_banned && (
                <Pressable style={[styles.actBtn, styles.actDanger]} onPress={() => ban(r.reported_user_id, `${r.reported_prenom} ${r.reported_nom}`)}>
                  <ThemedText style={styles.actDangerTxt}>Bloquer l&apos;utilisateur</ThemedText>
                </Pressable>
              )}
              <Pressable style={styles.actBtn} onPress={() => dismiss(r)}>
                <ThemedText style={styles.actTxt}>Ignorer</ThemedText>
              </Pressable>
            </View>
          </View>
        ))
      ) : shownMembers.length === 0 ? (
        <ThemedText style={styles.empty}>Aucun marié</ThemedText>
      ) : shownMembers.map((m) => (
        <View key={m.id} style={[styles.card, styles.memberCard, m.banned && { opacity: 0.7 }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <ThemedText style={styles.cardTitle} numberOfLines={1}>{m.prenom} {m.nom}</ThemedText>
            <ThemedText style={styles.cardSub} numberOfLines={1}>{m.email}</ThemedText>
            <ThemedText style={styles.cardSub}>
              {m.message_count} message{m.message_count > 1 ? 's' : ''}
              {m.open_reports ? ` · ⚠️ ${m.open_reports} signalement${m.open_reports > 1 ? 's' : ''}` : ''}
              {m.banned ? ' · 🚫 bloqué' : ''}
            </ThemedText>
          </View>
          {m.banned ? (
            <Pressable style={styles.actBtn} onPress={() => unban(m.id)}>
              <ThemedText style={styles.actTxt}>Débloquer</ThemedText>
            </Pressable>
          ) : (
            <Pressable style={[styles.actBtn, styles.actDanger]} onPress={() => ban(m.id, `${m.prenom} ${m.nom}`)}>
              <ThemedText style={styles.actDangerTxt}>Bloquer</ThemedText>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  openBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#747e68', borderRadius: 14, paddingVertical: 13 },
  openTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  segment: { flexDirection: 'row', backgroundColor: '#f5f2ed', borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segBtnOn: { backgroundColor: '#fff' },
  segTxt: { fontSize: 13, fontWeight: '600', color: '#9a9c93' },
  segTxtOn: { color: '#343630' },
  search: { borderWidth: 1.5, borderColor: '#ece8e0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#343630', backgroundColor: '#fff' },
  error: { color: '#C17E7E', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9a9c93', marginTop: 24, fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f0f0f0', gap: 6 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#343630' },
  cardSub: { fontSize: 12, color: '#9a9c93' },
  reason: { fontSize: 12, color: '#5c5f57', fontWeight: '600' },
  quote: { borderLeftWidth: 3, borderLeftColor: '#C17E7E', backgroundColor: '#F5E8E8', borderRadius: 6, padding: 8 },
  quoteTxt: { fontSize: 13, color: '#343630' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: '#f5f2ed', flexShrink: 0 },
  actTxt: { fontSize: 12, fontWeight: '700', color: '#5c5f57' },
  actDanger: { backgroundColor: '#F5E8E8' },
  actDangerTxt: { fontSize: 12, fontWeight: '700', color: '#C17E7E' },
});
