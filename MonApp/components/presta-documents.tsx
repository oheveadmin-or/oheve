/**
 * Documents PDF d'un prestataire (brochure, menu, tarifs…).
 *  - <MyPrestaDocuments />      : le prestataire gère ses PDF (portfolio) ;
 *  - <PrestaDocumentsList id /> : lecture seule sur la fiche publique.
 * L'admin les gère depuis Admin → Identifiants → « Photos, vidéos & PDF ».
 */
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi } from '@/services/auth/api';

export type PrestaDoc = { id: number; title: string; size: number | null; url: string };

const sizeLabel = (n: number | null) => (!n ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export function openPdf(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank');
  else Linking.openURL(url).catch(() => Alert.alert('Impossible', "Le PDF n'a pas pu être ouvert."));
}

function DocRow({ d, onDelete }: { d: PrestaDoc; onDelete?: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.main} onPress={() => openPdf(d.url)} accessibilityLabel={`Ouvrir ${d.title}`}>
        <View style={styles.icon}><Ionicons name="document-text" size={18} color="#b91c1c" /></View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title} numberOfLines={2}>{d.title}</ThemedText>
          <ThemedText style={styles.sub}>PDF{d.size ? ` · ${sizeLabel(d.size)}` : ''}</ThemedText>
        </View>
        <Ionicons name="open-outline" size={16} color="#929B83" />
      </Pressable>
      {onDelete ? (
        <Pressable style={styles.del} hitSlop={8} onPress={onDelete} accessibilityLabel="Supprimer le PDF">
          <Ionicons name="trash-outline" size={17} color="#b91c1c" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Fiche publique : PDF du prestataire (rien n'est affiché s'il n'en a pas). */
export function PrestaDocumentsList({ userId, label = 'Documents' }: { userId: number; label?: string }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<PrestaDoc[]>([]);
  useEffect(() => {
    if (!userId) return;
    prestatairesApi.listDocuments(userId, user?.accessToken).then((r) => { if (r.success) setDocs(r.data as PrestaDoc[]); });
  }, [userId, user?.accessToken]);
  if (!docs.length) return null;
  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      {docs.map((d) => <DocRow key={d.id} d={d} />)}
    </View>
  );
}

/** Compte prestataire : ajouter / supprimer ses PDF. */
export function MyPrestaDocuments() {
  const { user } = useAuth();
  const token = user?.accessToken;
  const [docs, setDocs] = useState<PrestaDoc[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const r = await prestatairesApi.myDocuments(token);
    if (r.success) setDocs(r.data as PrestaDoc[]);
  }, [token]);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    prestatairesApi.myDocuments(token).then((r) => { if (alive && r.success) setDocs(r.data as PrestaDoc[]); });
    return () => { alive = false; };
  }, [token]);

  const add = async () => {
    if (!token || busy) return;
    let picked: DocumentPicker.DocumentPickerResult;
    try {
      picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
    } catch {
      Alert.alert('Fichier illisible', "Le PDF n'a pas pu être lu. Réessayez.");
      return;
    }
    if (picked.canceled || !picked.assets?.length) return;
    setBusy(true);
    let dupes = 0; const errors: string[] = [];
    for (const a of picked.assets) {
      const title = (a.name || '').replace(/\.pdf$/i, '').trim() || undefined;
      const r = await prestatairesApi.uploadMyDocument(token, a.uri, title);
      if (!r.success) {
        if ((r as { duplicate?: boolean }).duplicate) dupes++;
        else errors.push(r.message ?? 'Erreur');
      }
    }
    setBusy(false);
    await load();
    if (dupes || errors.length) {
      Alert.alert('Ajout de PDF', [dupes ? `${dupes} PDF déjà présent(s), ignoré(s).` : '', errors[0] ?? ''].filter(Boolean).join('\n'));
    }
  };

  const remove = (d: PrestaDoc) => {
    if (!token) return;
    Alert.alert(`Supprimer « ${d.title} » ?`, 'Il ne sera plus visible sur votre fiche.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const r = await prestatairesApi.deleteMyDocument(token, d.id);
          if (!r.success) { Alert.alert('Impossible', r.message ?? 'Réessayez.'); return; }
          setDocs((l) => l.filter((x) => x.id !== d.id));
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <ThemedText style={styles.label}>Mes documents PDF</ThemedText>
      <ThemedText style={styles.hint}>Brochure, menu, tarifs… visibles par les mariés sur votre fiche.</ThemedText>
      {docs.map((d) => <DocRow key={d.id} d={d} onDelete={() => remove(d)} />)}
      <Pressable style={[styles.addBtn, busy && { opacity: 0.7 }]} onPress={add} disabled={busy}>
        {busy ? <ActivityIndicator color="#4a5240" /> : <Ionicons name="document-attach-outline" size={18} color="#4a5240" />}
        <ThemedText style={styles.addTxt}>{busy ? 'Envoi…' : 'Ajouter un PDF'}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: '#343630' },
  hint: { fontSize: 12, color: '#9a9c93' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', padding: 10 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: '#343630' },
  sub: { fontSize: 11, color: '#9a9c93' },
  del: { padding: 6 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#d9ddd0', borderRadius: 14, paddingVertical: 12, backgroundColor: '#fff' },
  addTxt: { color: '#4a5240', fontWeight: '700', fontSize: 14 },
});
