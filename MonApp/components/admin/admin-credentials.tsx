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
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

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
};

const loginOf = (r: Row) => r.username || r.email || '—';
const nameOf = (r: Row) => r.business_name || [r.prenom, r.nom].filter(Boolean).join(' ') || `Compte ${r.id}`;

function credText(r: Row) {
  return [
    `${nameOf(r)} (ID ${r.id})`,
    `Identifiant : ${loginOf(r)}`,
    `Mot de passe : ${r.admin_password ?? '(choisi par le prestataire, non lisible)'}`,
  ].join('\n');
}

export function AdminCredentials({ token }: { token: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.listCredentials(token);
    if (res.success) { setRows(res.data as Row[]); setError(null); } else setError(res.message ?? 'Chargement impossible');
    setLoading(false);
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [nameOf(r), loginOf(r), r.email, String(r.id), r.category]
      .some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

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
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Rechercher (nom, identifiant, ID…)"
        placeholderTextColor="#9a9c93"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.summary}>
        <ThemedText style={styles.summaryTxt}>
          {rows.length} compte(s) · {known} mot(s) de passe connu(s)
        </ThemedText>
        <Pressable style={styles.copyAll} onPress={copyAll} disabled={!shown.length}>
          <Ionicons name="copy-outline" size={15} color="#fff" />
          <ThemedText style={styles.copyAllTxt}>Tout copier</ThemedText>
        </Pressable>
      </View>

      {shown.length === 0 ? (
        <ThemedText style={styles.empty}>Aucun compte prestataire</ThemedText>
      ) : shown.map((r) => (
        <Pressable
          key={r.id}
          style={[styles.card, !r.is_active && { opacity: 0.55 }]}
          onPress={() => { Clipboard.setStringAsync(credText(r)); Alert.alert('Identifiants copiés', credText(r)); }}
        >
          <View style={styles.head}>
            <ThemedText style={styles.name} numberOfLines={1}>{nameOf(r)}</ThemedText>
            <View style={styles.idPill}><ThemedText style={styles.idTxt}>ID {r.id}</ThemedText></View>
          </View>
          {r.category ? <ThemedText style={styles.sub} numberOfLines={1}>{categoryLabel(r.category)}{r.role === 'boutique' ? ' · boutique' : ''}</ThemedText> : null}
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
          {r.must_change_password ? (
            <ThemedText style={styles.warn}>Pas encore connecté (1re connexion à faire)</ThemedText>
          ) : null}
        </Pressable>
      ))}
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
