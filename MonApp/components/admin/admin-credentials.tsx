/**
 * Admin → Identifiants : la liste de TOUS les comptes prestataires / boutiques
 * avec leur ID, leur identifiant de connexion et le mot de passe donné par
 * l'admin. Si le prestataire a changé son mot de passe, il n'est plus lisible
 * (seul un hash est gardé) : l'icône clé de l'onglet Prestataires en régénère un.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { exportAdminExcel } from '@/components/admin/admin-export';
import { ThemedText } from '@/components/themed-text';
import { categoryLabel } from '@/lib/presta-categories';
import { adminApi } from '@/services/auth/api';

type Row = {
  id: number;
  role: string;
  username: string | null;
  email: string | null;
  prenom: string | null;
  nom: string | null;
  business_name: string | null;
  category: string | null;
  admin_password: string | null;
  must_change_password: boolean;
  is_active: boolean;
  city: string | null;
  phone: string | null;
  source: string | null;
  contact_email: string | null;
};

/** Listes de prospection importées → onglet Excel correspondant. */
const LISTS: { key: string; label: string; sheet: string | null }[] = [
  { key: '', label: 'Tous', sheet: null },
  { key: 'manual', label: 'Créés à la main', sheet: null },
  { key: 'lieux-paris', label: 'Lieux Paris', sheet: 'liste_lieux_paris' },
  { key: 'lieux-lyon', label: 'Lieux Lyon', sheet: 'liste_lieux_lyon' },
  { key: 'lieux-marseille-aix', label: 'Lieux Marseille-Aix', sheet: 'liste_lieux_marseille' },
  { key: 'traiteurs-casher-paris', label: 'Traiteurs casher', sheet: 'liste_traiteurs' },
];
const ALL_LIST_SHEETS = LISTS.map((l) => l.sheet).filter(Boolean) as string[];
const PAGE = 40;

const loginOf = (r: Row) => r.username || r.email || '—';
const nameOf = (r: Row) => r.business_name || [r.prenom, r.nom].filter(Boolean).join(' ') || `Compte ${r.id}`;

function credText(r: Row) {
  return [
    `${nameOf(r)} (ID ${r.id})${r.city ? ` · ${r.city}` : ''}`,
    `Identifiant : ${loginOf(r)}`,
    `Mot de passe : ${r.admin_password ?? '(choisi par le prestataire, non lisible)'}`,
  ].join('\n');
}

export function AdminCredentials({ token }: { token: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [list, setList] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.listCredentials(token);
    if (res.success) { setRows(res.data as Row[]); setError(null); } else setError(res.message ?? 'Chargement impossible');
    setLoading(false);
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inList = rows.filter((r) => !list || (list === 'manual' ? !r.source : r.source === list));
    if (!q) return inList;
    return inList.filter((r) => [nameOf(r), loginOf(r), r.email, String(r.id), r.category, r.city, r.phone, r.contact_email]
      .some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [rows, search, list]);

  const countOf = (key: string) => rows.filter((r) => !key || (key === 'manual' ? !r.source : r.source === key)).length;

  /** Excel : la liste filtrée, ou toutes les listes (un onglet chacune). */
  const exportLists = async () => {
    if (exporting) return;
    const sheet = LISTS.find((l) => l.key === list)?.sheet;
    setExporting(true);
    try {
      const err = await exportAdminExcel(token, sheet ? [sheet] : ['identifiants', ...ALL_LIST_SHEETS]);
      if (err) Alert.alert('Export impossible', err);
    } catch {
      Alert.alert('Export impossible', "Le fichier Excel n'a pas pu être créé. Réessayez.");
    }
    setExporting(false);
  };

  const copyAll = () => {
    const text = `Identifiants prestataires Oheve\n\n${shown.map(credText).join('\n\n')}`;
    Clipboard.setStringAsync(text);
    Alert.alert('Liste copiée', `${shown.length} compte(s) copié(s). Collez-les dans Notes, WhatsApp…`);
  };

  if (loading) return <ActivityIndicator color="#929B83" style={{ marginTop: 40 }} />;
  if (error) {
    return (
      <Pressable style={styles.errorBox} onPress={load}>
        <ThemedText style={styles.errorTxt}>{error} — toucher pour réessayer</ThemedText>
      </Pressable>
    );
  }

  const known = rows.filter((r) => r.admin_password).length;

  return (
    <View style={{ gap: 10 }}>
      <Pressable style={[styles.exportBtn, exporting && { opacity: 0.6 }]} onPress={exportLists} disabled={exporting}>
        {exporting ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={17} color="#fff" />}
        <ThemedText style={styles.exportTxt}>
          {LISTS.find((l) => l.key === list)?.sheet ? `Exporter « ${LISTS.find((l) => l.key === list)?.label} » (Excel)` : 'Exporter les listes (Excel, 1 onglet par liste)'}
        </ThemedText>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {LISTS.map((l) => {
          const n = countOf(l.key);
          if (l.key && !n) return null;
          return (
            <Pressable key={l.key || 'all'} style={[styles.filterChip, list === l.key && styles.filterChipOn]} onPress={() => { setList(l.key); setLimit(PAGE); }}>
              <ThemedText style={[styles.filterTxt, list === l.key && styles.filterTxtOn]}>{l.label} · {n}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={(v) => { setSearch(v); setLimit(PAGE); }}
        placeholder="Rechercher (nom, identifiant, ID…)"
        placeholderTextColor="#9a9c93"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.summary}>
        <ThemedText style={styles.summaryTxt}>
          {shown.length} affiché(s) sur {rows.length} · {known} mot(s) de passe connu(s)
        </ThemedText>
        <Pressable style={styles.copyAll} onPress={copyAll} disabled={!shown.length}>
          <Ionicons name="copy-outline" size={15} color="#fff" />
          <ThemedText style={styles.copyAllTxt}>Tout copier</ThemedText>
        </Pressable>
      </View>

      {shown.length === 0 ? (
        <ThemedText style={styles.empty}>Aucun compte prestataire</ThemedText>
      ) : shown.slice(0, limit).map((r) => (
        <Pressable
          key={r.id}
          style={[styles.card, !r.is_active && { opacity: 0.55 }]}
          onPress={() => { Clipboard.setStringAsync(credText(r)); Alert.alert('Identifiants copiés', credText(r)); }}
        >
          <View style={styles.head}>
            <ThemedText style={styles.name} numberOfLines={1}>{nameOf(r)}</ThemedText>
            <View style={styles.idPill}><ThemedText style={styles.idTxt}>ID {r.id}</ThemedText></View>
          </View>
          {r.category ? (
            <ThemedText style={styles.sub} numberOfLines={1}>
              {[categoryLabel(r.category) + (r.role === 'boutique' ? ' · boutique' : ''), r.city, LISTS.find((l) => l.key === r.source)?.label].filter(Boolean).join(' · ')}
            </ThemedText>
          ) : null}
          <View style={styles.line}>
            <ThemedText style={styles.lbl}>Identifiant</ThemedText>
            <ThemedText style={styles.val} selectable numberOfLines={1}>{loginOf(r)}</ThemedText>
          </View>
          {r.username && r.email ? (
            <View style={styles.line}>
              <ThemedText style={styles.lbl}>Email</ThemedText>
              <ThemedText style={styles.val} selectable numberOfLines={1}>{r.email}</ThemedText>
            </View>
          ) : null}
          <View style={styles.line}>
            <ThemedText style={styles.lbl}>Mot de passe</ThemedText>
            {r.admin_password
              ? <ThemedText style={[styles.val, styles.pwd]} selectable numberOfLines={1}>{r.admin_password}</ThemedText>
              : <ThemedText style={[styles.val, styles.muted]} numberOfLines={2}>choisi par le prestataire (non lisible)</ThemedText>}
          </View>
          {r.phone || r.contact_email ? (
            <View style={styles.line}>
              <ThemedText style={styles.lbl}>Contact</ThemedText>
              <ThemedText style={styles.val} selectable numberOfLines={2}>{[r.phone, r.contact_email].filter(Boolean).join(' · ')}</ThemedText>
            </View>
          ) : null}
          {r.must_change_password ? (
            <ThemedText style={styles.warn}>Pas encore connecté (1re connexion à faire)</ThemedText>
          ) : null}
        </Pressable>
      ))}
      {shown.length > limit ? (
        <Pressable style={styles.moreBtn} onPress={() => setLimit((l) => l + PAGE * 2)}>
          <ThemedText style={styles.moreTxt}>Afficher plus ({shown.length - limit} restant(s))</ThemedText>
        </Pressable>
      ) : null}
      <ThemedText style={styles.foot}>
        Toucher une fiche = copier ses identifiants. Mot de passe « choisi par le prestataire » : il n&apos;est pas lisible (seule une empreinte chiffrée est gardée) ; onglet Prestataires → icône clé pour en générer un nouveau.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1.5, borderColor: '#ece8e0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#343630', backgroundColor: '#fff' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryTxt: { flex: 1, fontSize: 12, color: '#5c5f57' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4a5240', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  exportTxt: { color: '#fff', fontWeight: '700', fontSize: 13, flexShrink: 1, textAlign: 'center' },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#ece8e0', backgroundColor: '#fff' },
  filterChipOn: { borderColor: '#929B83', backgroundColor: '#929B83' },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#5c5f57' },
  filterTxtOn: { color: '#fff' },
  moreBtn: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99, borderWidth: 1.5, borderColor: '#d9ddd0', backgroundColor: '#fff' },
  moreTxt: { fontSize: 13, fontWeight: '700', color: '#4a5240' },
  copyAll: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#747e68', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  copyAllTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f0f0f0', gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: '#343630' },
  idPill: { backgroundColor: '#f3f5ef', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 },
  idTxt: { fontSize: 11, fontWeight: '700', color: '#4a5240' },
  sub: { fontSize: 12, color: '#9a9c93' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  lbl: { width: 96, fontSize: 12, color: '#9a9c93' },
  val: { flex: 1, fontSize: 13, fontWeight: '600', color: '#343630' },
  pwd: { backgroundColor: '#f3f5ef', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden', alignSelf: 'flex-start' },
  muted: { color: '#9a9c93', fontWeight: '400', fontStyle: 'italic' },
  warn: { fontSize: 11, color: '#b45309', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9a9c93', marginTop: 32, fontSize: 14 },
  foot: { fontSize: 11, color: '#9a9c93', marginTop: 4 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14 },
  errorTxt: { color: '#b91c1c', fontSize: 13 },
});
