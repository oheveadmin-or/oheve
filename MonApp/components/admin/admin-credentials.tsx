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
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { exportAdminExcel } from '@/components/admin/admin-export';
import { PrestaPhotosModal } from '@/components/admin/presta-photos-modal';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
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
  photo_count: number;
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

// ── Doublons : MÊME règle que backend/src/admin/duplicates.ts ─────────────────
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'a', 'au', 'aux', 'et', 'the']);
const normName = (s: string | null | undefined) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, ' ').trim()
  .split(/\s+/).filter((w) => w && !STOP.has(w)).join(' ');
const normPhone = (s: string | null | undefined) => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

/** id → ids des autres comptes qui sont le même prestataire (nom + ville, ou téléphone). */
function findDuplicates(rows: Row[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  const link = (a: Row, b: Row) => {
    out.set(a.id, [...(out.get(a.id) ?? []), b.id]);
    out.set(b.id, [...(out.get(b.id) ?? []), a.id]);
  };
  const keyed = rows.filter((r) => r.business_name).map((r) => ({ r, n: normName(r.business_name), c: normName(r.city), p: normPhone(r.phone) }));
  for (let i = 0; i < keyed.length; i++) {
    for (let j = i + 1; j < keyed.length; j++) {
      const a = keyed[i]; const b = keyed[j];
      const sameName = a.n && a.n === b.n && (!a.c || !b.c || a.c === b.c);
      const samePhone = a.p && a.p === b.p;
      if (sameName || samePhone) link(a.r, b.r);
    }
  }
  return out;
}

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
  const [photosOf, setPhotosOf] = useState<Row | null>(null);
  const [emailOf, setEmailOf] = useState<Row | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const { openAsAdmin } = useAuth();

  const saveEmail = async () => {
    if (!emailOf || emailSaving) return;
    setEmailSaving(true);
    const res = await adminApi.setPrestataireEmail(token, emailOf.id, emailDraft.trim());
    setEmailSaving(false);
    if (!res.success) { Alert.alert('Email non enregistré', res.message ?? 'Réessayez.'); return; }
    const email = (res.data as { email: string | null } | undefined)?.email ?? null;
    setRows((list) => list.map((x) => (x.id === emailOf.id ? { ...x, email } : x)));
    setEmailOf(null);
  };

  /** « Ouvrir son compte » : l'admin passe dans le compte du prestataire. */
  const openAccount = (r: Row) => {
    const go = async () => {
      setOpening(r.id);
      const res = await adminApi.openPrestataireSession(token, r.id);
      setOpening(null);
      if (!res.success || !res.data) { Alert.alert('Ouverture impossible', res.message ?? 'Réessayez.'); return; }
      await openAsAdmin(res.data as never);
    };
    const msg = `Vous allez gérer le compte de ${nameOf(r)} comme si vous étiez connecté(e) avec ses identifiants (fiche, photos, vidéos, PDF, messages…). Le bandeau orange en haut permet de revenir à l'admin.`;
    if (Platform.OS === 'web') { if (window.confirm(msg)) go(); return; }
    Alert.alert('Ouvrir son compte ?', msg, [{ text: 'Annuler', style: 'cancel' }, { text: 'Ouvrir', onPress: go }]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.listCredentials(token);
    if (res.success) { setRows(res.data as Row[]); setError(null); } else setError(res.message ?? 'Chargement impossible');
    setLoading(false);
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const dupes = useMemo(() => findDuplicates(rows), [rows]);
  const inListOf = useCallback((r: Row, key: string) =>
    !key || (key === 'dupes' ? dupes.has(r.id) : key === 'manual' ? !r.source : r.source === key), [dupes]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inList = rows.filter((r) => inListOf(r, list));
    if (!q) return inList;
    return inList.filter((r) => [nameOf(r), loginOf(r), r.email, String(r.id), r.category, r.city, r.phone, r.contact_email]
      .some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [rows, search, list, inListOf]);

  const countOf = (key: string) => rows.filter((r) => inListOf(r, key)).length;

  /** Supprime définitivement un compte en double (après confirmation). */
  const removeDuplicate = (r: Row) => {
    const others = (dupes.get(r.id) ?? []).map((id) => `ID ${id}`).join(', ');
    Alert.alert(
      `Supprimer ${nameOf(r)} (ID ${r.id}) ?`,
      `Ce compte est en double avec ${others}. Il sera supprimé définitivement (fiche, photos, identifiants). Gardez celui que le prestataire utilise.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive', onPress: async () => {
            const res = await adminApi.deleteUser(token, r.id);
            if (!res.success) { Alert.alert('Suppression impossible', res.message ?? 'Réessayez.'); return; }
            setRows((list) => list.filter((x) => x.id !== r.id));
          },
        },
      ],
    );
  };

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
        {dupes.size ? (
          <Pressable style={[styles.filterChip, styles.dupChip, list === 'dupes' && styles.dupChipOn]} onPress={() => { setList('dupes'); setLimit(PAGE); }}>
            <ThemedText style={[styles.filterTxt, { color: list === 'dupes' ? '#fff' : '#b45309' }]}>Doublons · {dupes.size}</ThemedText>
          </Pressable>
        ) : null}
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
          {r.username ? (
            <Pressable style={styles.line} hitSlop={4} onPress={() => { setEmailDraft(r.email ?? ''); setEmailOf(r); }}>
              <ThemedText style={styles.lbl}>Email</ThemedText>
              {r.email
                ? <ThemedText style={styles.val} numberOfLines={1}>{r.email}</ThemedText>
                : <ThemedText style={[styles.val, styles.addEmail]} numberOfLines={1}>+ Ajouter un email</ThemedText>}
              <Ionicons name="create-outline" size={15} color="#929B83" />
            </Pressable>
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
          {dupes.has(r.id) ? (
            <View style={styles.dupRow}>
              <Ionicons name="copy" size={13} color="#b45309" />
              <ThemedText style={styles.dupTxt} numberOfLines={2}>
                Doublon de {(dupes.get(r.id) ?? []).map((id) => `ID ${id}`).join(', ')}
              </ThemedText>
              <Pressable style={styles.dupDel} hitSlop={6} onPress={() => removeDuplicate(r)}>
                <Ionicons name="trash-outline" size={13} color="#b91c1c" />
                <ThemedText style={styles.dupDelTxt}>Supprimer</ThemedText>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.btnRow}>
            {r.category ? (
              <Pressable style={styles.photosBtn} hitSlop={4} onPress={() => setPhotosOf(r)}>
                <Ionicons name="images-outline" size={15} color="#4a5240" />
                <ThemedText style={styles.photosTxt}>
                  {r.photo_count ? `Photos, vidéos & PDF · ${r.photo_count}` : 'Photos, vidéos & PDF'}
                </ThemedText>
              </Pressable>
            ) : null}
            {r.is_active ? (
              <Pressable style={[styles.photosBtn, styles.openBtn]} hitSlop={4} onPress={() => openAccount(r)} disabled={opening !== null}>
                {opening === r.id ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="log-in-outline" size={15} color="#fff" />}
                <ThemedText style={[styles.photosTxt, { color: '#fff' }]}>Ouvrir son compte</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      ))}
      {shown.length > limit ? (
        <Pressable style={styles.moreBtn} onPress={() => setLimit((l) => l + PAGE * 2)}>
          <ThemedText style={styles.moreTxt}>Afficher plus ({shown.length - limit} restant(s))</ThemedText>
        </Pressable>
      ) : null}
      <Modal visible={emailOf !== null} transparent animationType="fade" onRequestClose={() => setEmailOf(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ThemedText style={styles.sheetTitle} numberOfLines={2}>Email · {emailOf ? nameOf(emailOf) : ''}</ThemedText>
            <TextInput
              style={styles.search}
              value={emailDraft}
              onChangeText={setEmailDraft}
              placeholder="contact@exemple.fr"
              placeholderTextColor="#9a9c93"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoFocus
              onSubmitEditing={saveEmail}
            />
            <ThemedText style={styles.foot}>Le prestataire pourra se connecter avec cet email ou son identifiant. Laisser vide pour retirer l&apos;email.</ThemedText>
            <View style={styles.sheetBtns}>
              <Pressable style={[styles.sheetBtn, styles.sheetCancel]} onPress={() => setEmailOf(null)}>
                <ThemedText style={styles.moreTxt}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={[styles.sheetBtn, styles.sheetOk, emailSaving && { opacity: 0.6 }]} onPress={saveEmail} disabled={emailSaving}>
                {emailSaving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.copyAllTxt}>Enregistrer</ThemedText>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <PrestaPhotosModal
        token={token}
        userId={photosOf?.id ?? null}
        name={photosOf ? nameOf(photosOf) : ''}
        onClose={(changed) => { setPhotosOf(null); if (changed) load(); }}
      />
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
  dupChip: { borderColor: '#f3c98b', backgroundColor: '#fff8ec' },
  dupChipOn: { borderColor: '#b45309', backgroundColor: '#b45309' },
  dupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: '#fff8ec', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  dupTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#b45309' },
  dupDel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dupDelTxt: { fontSize: 12, fontWeight: '700', color: '#b91c1c' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  openBtn: { backgroundColor: '#747e68', borderColor: '#747e68' },
  addEmail: { color: '#929B83', fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#faf8f4', borderRadius: 18, padding: 18, gap: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#343630' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  sheetBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12 },
  sheetCancel: { borderWidth: 1.5, borderColor: '#d9ddd0', backgroundColor: '#fff' },
  sheetOk: { backgroundColor: '#4a5240' },
  photosBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6, borderWidth: 1.5, borderColor: '#d9ddd0', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  photosTxt: { fontSize: 12, fontWeight: '700', color: '#4a5240' },
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
