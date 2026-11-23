/**
 * « Mes établissements » : un même compte prestataire peut gérer plusieurs
 * fiches (ex. un groupe hôtelier avec plusieurs hôtels), comme le changement de
 * compte d'Instagram. Chaque établissement a sa fiche, ses photos, ses messages,
 * ses demandes et son abonnement ; on passe de l'un à l'autre en un appui.
 * Ouvert à tous les prestataires, abonnés ou non.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { isPrestaSubActive, useAuth, type AuthUser } from '@/contexts/auth-context';
import { categoryLabel, PRESTA_CATEGORIES } from '@/lib/presta-categories';
import { prestatairesApi } from '@/services/auth/api';

export type Establishment = {
  id: number;
  is_owner: boolean;
  is_current: boolean;
  business_name: string | null;
  category: string | null;
  location_city: string | null;
  cover_url: string | null;
  sub_status: string | null;
};

type Props = { visible: boolean; onClose: () => void };

export function EstablishmentSwitcher({ visible, onClose }: Props) {
  const { user, switchEstablishment } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Establishment[]>([]);
  const [max, setMax] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ business_name: '', category: '', location_city: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    const res = await prestatairesApi.listEstablishments(user.accessToken);
    setLoading(false);
    if (!res.success) { setError(res.message ?? 'Chargement impossible'); return; }
    const data = res.data as { items: Establishment[]; max: number };
    setItems(data.items ?? []);
    setMax(data.max ?? 30);
    setError(null);
  }, [user?.accessToken]);

  useEffect(() => {
    if (visible) { setAdding(false); load(); }
  }, [visible, load]);

  const goTo = async (id: number) => {
    if (!user?.accessToken || switching) return;
    if (id === user.id) { onClose(); return; }
    setSwitching(id);
    const res = await prestatairesApi.establishmentSession(user.accessToken, id);
    setSwitching(null);
    if (!res.success || !res.data) { Alert.alert('Changement impossible', res.message ?? 'Réessayez.'); return; }
    onClose();
    await switchEstablishment(res.data as AuthUser);
  };

  const canSave = form.business_name.trim() && form.category && form.location_city.trim();

  const create = async () => {
    if (!user?.accessToken || !canSave || saving) return;
    setSaving(true);
    const res = await prestatairesApi.createEstablishment(user.accessToken, {
      business_name: form.business_name.trim(),
      category: form.category,
      location_city: form.location_city.trim(),
    });
    setSaving(false);
    if (!res.success || !res.data) { Alert.alert('Établissement non ajouté', res.message ?? 'Réessayez.'); return; }
    const newId = (res.data as { id: number }).id;
    setForm({ business_name: '', category: '', location_city: '' });
    setAdding(false);
    await load();
    // On ouvre directement la nouvelle fiche pour la compléter (photos, description…).
    goTo(newId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            {!adding ? (
              <>
                <ThemedText style={styles.title}>Mes établissements</ThemedText>
                <ThemedText style={styles.hint}>
                  Chaque établissement a sa propre fiche, ses photos, ses messages et son abonnement. Appuyez pour passer de l&apos;un à l&apos;autre.
                </ThemedText>

                {loading && items.length === 0 ? (
                  <ActivityIndicator color={C.saugeDark} style={{ marginVertical: 24 }} />
                ) : error ? (
                  <Pressable onPress={load} style={styles.errorBox}>
                    <ThemedText style={styles.errorTxt}>{error} · Réessayer</ThemedText>
                  </Pressable>
                ) : (
                  <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
                    {items.map((e) => {
                      const name = e.business_name?.trim() || 'Établissement sans nom';
                      const sub = [e.category ? categoryLabel(e.category) : null, e.location_city].filter(Boolean).join(' · ');
                      const partner = isPrestaSubActive(e.sub_status);
                      return (
                        <Pressable
                          key={e.id}
                          style={[styles.row, e.is_current && styles.rowOn]}
                          onPress={() => goTo(e.id)}
                          disabled={switching !== null}
                          accessibilityLabel={`Ouvrir ${name}`}
                        >
                          {e.cover_url ? (
                            <Image source={{ uri: e.cover_url }} style={styles.avatar} contentFit="cover" />
                          ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                              <ThemedText style={styles.avatarLetter}>{name[0]?.toUpperCase()}</ThemedText>
                            </View>
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <ThemedText style={styles.name} numberOfLines={1}>{name}</ThemedText>
                            {!!sub && <ThemedText style={styles.sub} numberOfLines={1}>{sub}</ThemedText>}
                            <View style={styles.tags}>
                              {e.is_owner && <ThemedText style={styles.tag}>Compte principal</ThemedText>}
                              <ThemedText style={[styles.tag, partner ? styles.tagPartner : styles.tagFree]}>
                                {partner ? 'Partenaire' : 'Sans abonnement'}
                              </ThemedText>
                            </View>
                          </View>
                          {switching === e.id ? (
                            <ActivityIndicator color={C.saugeDark} />
                          ) : e.is_current ? (
                            <Ionicons name="checkmark-circle" size={22} color={C.saugeDark} />
                          ) : (
                            <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}

                {items.length < max ? (
                  <Pressable style={styles.addBtn} onPress={() => setAdding(true)} disabled={loading}>
                    <Ionicons name="add-circle-outline" size={20} color={C.saugeDark} />
                    <ThemedText style={styles.addTxt}>Ajouter un établissement</ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText style={styles.hint}>Limite de {max} établissements atteinte. Contactez-nous pour en ajouter.</ThemedText>
                )}
              </>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
                <Pressable style={styles.back} onPress={() => setAdding(false)} hitSlop={8}>
                  <Ionicons name="chevron-back" size={18} color={C.saugeDark} />
                  <ThemedText style={styles.backTxt}>Mes établissements</ThemedText>
                </Pressable>
                <ThemedText style={styles.title}>Nouvel établissement</ThemedText>
                <ThemedText style={styles.hint}>
                  Une nouvelle fiche, visible dans l&apos;annuaire, que vous gérez depuis ce même compte. Vous pourrez ensuite ajouter photos, description et tarifs.
                </ThemedText>

                <ThemedText style={styles.label}>Nom de l&apos;établissement</ThemedText>
                <TextInput
                  style={styles.input}
                  value={form.business_name}
                  onChangeText={(t) => setForm((f) => ({ ...f, business_name: t }))}
                  placeholder="Ex. Hôtel Les Jardins — Nice"
                  placeholderTextColor={C.textLight}
                  maxLength={200}
                />
                <ThemedText style={styles.label}>Ville</ThemedText>
                <TextInput
                  style={styles.input}
                  value={form.location_city}
                  onChangeText={(t) => setForm((f) => ({ ...f, location_city: t }))}
                  placeholder="Ex. Nice"
                  placeholderTextColor={C.textLight}
                  maxLength={120}
                />
                <ThemedText style={styles.label}>Catégorie</ThemedText>
                <View style={styles.cats}>
                  {PRESTA_CATEGORIES.map((c) => {
                    const on = form.category === c.key;
                    return (
                      <Pressable key={c.key} style={[styles.cat, on && styles.catOn]} onPress={() => setForm((f) => ({ ...f, category: c.key }))}>
                        <ThemedText style={[styles.catTxt, on && styles.catTxtOn]} numberOfLines={1}>{c.emoji} {c.label}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.5 }]} onPress={create} disabled={!canSave || saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.saveTxt}>Créer et ouvrir cette fiche</ThemedText>}
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.taupe, alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontFamily: 'OheveSerif-Medium', color: C.textDark, marginBottom: 4 },
  hint: { fontSize: 13, color: C.textLight, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: RADIUS.md, backgroundColor: C.cardAlt },
  rowOn: { borderWidth: 1.5, borderColor: C.sauge, backgroundColor: C.card },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { backgroundColor: C.beige, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: C.saugeDark },
  name: { fontSize: 15, fontWeight: '700', color: C.textDark },
  sub: { fontSize: 12, color: C.textMid, marginTop: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { fontSize: 11, fontWeight: '600', color: C.textMid, backgroundColor: C.beige, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  tagPartner: { color: '#fff', backgroundColor: C.saugeDark },
  tagFree: { color: C.textMid, backgroundColor: C.taupe },
  errorBox: { padding: 14, borderRadius: RADIUS.md, backgroundColor: C.errorPale, marginBottom: 8 },
  errorTxt: { color: C.error, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.sauge },
  addTxt: { fontSize: 15, fontWeight: '700', color: C.saugeDark },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  backTxt: { fontSize: 14, fontWeight: '600', color: C.saugeDark },
  label: { fontSize: 13, fontWeight: '700', color: C.textDark, marginTop: 10, marginBottom: 6 },
  input: { borderRadius: RADIUS.sm, backgroundColor: C.cardAlt, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.textDark },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: C.cardAlt },
  catOn: { backgroundColor: C.saugeDark },
  catTxt: { fontSize: 13, color: C.textDark },
  catTxtOn: { color: '#fff', fontWeight: '700' },
  saveBtn: { marginTop: 20, marginBottom: 6, paddingVertical: 15, borderRadius: RADIUS.pill, backgroundColor: C.saugeDark, alignItems: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
