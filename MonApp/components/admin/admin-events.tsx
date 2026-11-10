/**
 * Admin → Événements : une seule vue pour TOUS les événements organisés dans
 * l'app (Mariage, Bar Mitsva, Bat Mitsva, Brit Mila). Un compte client = un
 * événement. Filtre par type, recherche, compteurs par type.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EVENT_TYPES, eventConfig, normalizeEventType } from '@/lib/event-type';
import { adminApi } from '@/services/auth/api';

type EventRow = {
  id: number;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  phone: string | null;
  event_type: string;
  bride_name: string | null;
  groom_name: string | null;
  event_date: string | null;
  city: string | null;
  premium: boolean;
  is_active: boolean;
  guests: number;
  guest_people: number;
  site_slug: string | null;
  paid_cents: number;
};

type Summary = { event_type: string; total: number; upcoming: number; premium: number };

/** Couleur d'accent par type d'événement. */
const TYPE_COLOR: Record<string, string> = {
  mariage: '#747e68', bar_mitsva: '#7f1d1d', bat_mitsva: '#be185d', brit_mila: '#1d4ed8',
};

function eventTitle(e: EventRow): string {
  const t = normalizeEventType(e.event_type);
  const a = e.bride_name?.trim();
  const b = e.groom_name?.trim();
  if (t === 'mariage') return [a, b].filter(Boolean).join(' & ') || [e.prenom, e.nom].filter(Boolean).join(' ') || `Compte ${e.id}`;
  if (a) return `${eventConfig(t).label} de ${a}`;
  if (b) return `${eventConfig(t).label} · famille ${b}`;
  return `${eventConfig(t).label} · ${[e.prenom, e.nom].filter(Boolean).join(' ') || `compte ${e.id}`}`;
}

function formatDate(d: string | null): { label: string; past: boolean } | null {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const label = `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  if (diff < 0) return { label: `${label} · passé`, past: true };
  if (diff === 0) return { label: `${label} · aujourd'hui`, past: false };
  return { label: `${label} · dans ${diff} j`, past: false };
}

export function AdminEvents({ token }: { token: string }) {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  /** La recherche part au « Entrée », pas à chaque lettre : lue via une ref. */
  const searchRef = useRef('');
  const [rows, setRows] = useState<EventRow[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = searchRef.current.trim();
    const res = await adminApi.listEvents(token, { type: type || undefined, search: q || undefined });
    if (res.success) {
      setRows(res.data as EventRow[]);
      setSummary(((res as { summary?: Summary[] }).summary) ?? []);
      setError(null);
    } else setError(res.message ?? 'Chargement impossible');
    setLoading(false);
  }, [token, type]);

  // Rechargé à l'ouverture et quand le filtre de type change.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const countOf = (t: string) => summary.find((s) => s.event_type === t);
  const total = summary.reduce((s, x) => s + x.total, 0);
  const upcoming = summary.reduce((s, x) => s + x.upcoming, 0);

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.summaryGrid}>
        {EVENT_TYPES.map((t) => {
          const c = countOf(t);
          const cfg = eventConfig(t);
          return (
            <Pressable key={t} style={[styles.sumCard, { borderLeftColor: TYPE_COLOR[t] }, type === t && styles.sumCardOn]}
              onPress={() => setType(type === t ? '' : t)}>
              <ThemedText style={styles.sumEmoji}>{cfg.emoji}</ThemedText>
              <ThemedText style={[styles.sumVal, { color: TYPE_COLOR[t] }]}>{c?.total ?? 0}</ThemedText>
              <ThemedText style={styles.sumLbl} numberOfLines={1}>{cfg.label}</ThemedText>
              <ThemedText style={styles.sumMeta} numberOfLines={1}>{c?.upcoming ?? 0} à venir · {c?.premium ?? 0} premium</ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText style={styles.totalTxt}>{total} événement(s) au total · {upcoming} à venir</ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['', ...EVENT_TYPES].map((t) => (
          <Pressable key={t || 'all'} style={[styles.filterChip, type === t && styles.filterChipOn]} onPress={() => setType(t)}>
            <ThemedText style={[styles.filterTxt, type === t && styles.filterTxtOn]}>
              {t ? `${eventConfig(t).emoji} ${eventConfig(t).label}` : 'Tous'}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={(v) => { searchRef.current = v; setSearch(v); }}
        placeholder="Rechercher (prénom, nom, email, ville…)"
        placeholderTextColor="#9a9c93"
        returnKeyType="search"
        onSubmitEditing={load}
        autoCorrect={false}
      />

      {loading ? (
        <ActivityIndicator color="#929B83" style={{ marginTop: 30 }} />
      ) : error ? (
        <Pressable style={styles.errorBox} onPress={load}>
          <ThemedText style={styles.errorTxt}>{error} — toucher pour réessayer</ThemedText>
        </Pressable>
      ) : rows.length === 0 ? (
        <ThemedText style={styles.empty}>Aucun événement</ThemedText>
      ) : rows.map((e) => {
        const t = normalizeEventType(e.event_type);
        const cfg = eventConfig(t);
        const date = formatDate(e.event_date);
        return (
          <View key={e.id} style={[styles.card, { borderLeftColor: TYPE_COLOR[t] }, (!e.is_active || date?.past) && { opacity: 0.6 }]}>
            <View style={styles.head}>
              <View style={[styles.typePill, { backgroundColor: `${TYPE_COLOR[t]}18` }]}>
                <ThemedText style={[styles.typeTxt, { color: TYPE_COLOR[t] }]}>{cfg.emoji} {cfg.label}</ThemedText>
              </View>
              <ThemedText style={styles.idTxt}>ID {e.id}</ThemedText>
            </View>
            <ThemedText style={styles.title} numberOfLines={2}>{eventTitle(e)}</ThemedText>
            <ThemedText style={styles.meta} numberOfLines={1}>
              <Ionicons name="calendar-outline" size={12} color="#5c5f57" /> {date?.label ?? 'Date non renseignée'}
              {e.city ? `  ·  ${e.city}` : ''}
            </ThemedText>
            <ThemedText style={styles.meta} numberOfLines={1} selectable>
              {[[e.prenom, e.nom].filter(Boolean).join(' '), e.email, e.phone].filter(Boolean).join(' · ') || '—'}
            </ThemedText>
            <View style={styles.badgeRow}>
              <View style={styles.badge}><ThemedText style={styles.badgeTxt}>{e.guests} invité(s){e.guest_people > e.guests ? ` · ${e.guest_people} pers.` : ''}</ThemedText></View>
              <View style={styles.badge}><ThemedText style={styles.badgeTxt}>{e.site_slug ? 'site / invitation créé' : 'pas de site'}</ThemedText></View>
              {e.premium ? <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}><ThemedText style={[styles.badgeTxt, { color: '#047857' }]}>premium</ThemedText></View> : null}
              {e.paid_cents > 0 ? <View style={styles.badge}><ThemedText style={styles.badgeTxt}>{(e.paid_cents / 100).toFixed(2)} € payés</ThemedText></View> : null}
              {!e.is_active ? <View style={[styles.badge, { backgroundColor: '#fecaca' }]}><ThemedText style={[styles.badgeTxt, { color: '#dc2626' }]}>désactivé</ThemedText></View> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sumCard: { width: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 2, borderLeftWidth: 4, borderWidth: 1, borderColor: '#f0f0f0' },
  sumCardOn: { borderColor: '#929B83', backgroundColor: '#f7f8f4' },
  sumEmoji: { fontSize: 18 },
  sumVal: { fontSize: 22, fontFamily: 'OheveSerif-Medium' },
  sumLbl: { fontSize: 12, fontWeight: '700', color: '#343630' },
  sumMeta: { fontSize: 11, color: '#9a9c93' },
  totalTxt: { fontSize: 12, color: '#5c5f57' },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#ece8e0', backgroundColor: '#fff' },
  filterChipOn: { borderColor: '#929B83', backgroundColor: '#929B83' },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#5c5f57' },
  filterTxtOn: { color: '#fff' },
  search: { borderWidth: 1.5, borderColor: '#ece8e0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#343630', backgroundColor: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f0f0f0', borderLeftWidth: 4, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 },
  typeTxt: { fontSize: 11, fontWeight: '700' },
  idTxt: { marginLeft: 'auto', fontSize: 11, fontWeight: '700', color: '#9a9c93' },
  title: { fontSize: 15, fontWeight: '700', color: '#343630' },
  meta: { fontSize: 12, color: '#5c5f57' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  badge: { backgroundColor: '#f5f2ed', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: '#5c5f57' },
  empty: { textAlign: 'center', color: '#9a9c93', marginTop: 32, fontSize: 14 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14 },
  errorTxt: { color: '#b91c1c', fontSize: 13 },
});
