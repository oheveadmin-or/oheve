/**
 * Formulaire « Nouvel établissement » (nom, ville, catégorie), partagé entre
 * le sélecteur « Mes établissements » du profil et l'étape d'inscription.
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { PRESTA_CATEGORIES } from '@/lib/presta-categories';
import { prestatairesApi } from '@/services/auth/api';

type Props = {
  accessToken: string;
  /** Catégorie proposée par défaut (celle de la fiche principale). */
  defaultCategory?: string;
  submitLabel: string;
  onCreated: (created: { id: number; business_name: string; category: string; location_city: string }) => void;
};

export function AddEstablishmentForm({ accessToken, defaultCategory = '', submitLabel, onCreated }: Props) {
  const [form, setForm] = useState({ business_name: '', category: defaultCategory, location_city: '' });
  const [saving, setSaving] = useState(false);
  const canSave = !!(form.business_name.trim() && form.category && form.location_city.trim());

  const create = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const data = {
      business_name: form.business_name.trim(),
      category: form.category,
      location_city: form.location_city.trim(),
    };
    const res = await prestatairesApi.createEstablishment(accessToken, data);
    setSaving(false);
    if (!res.success || !res.data) { Alert.alert('Profil non ajouté', res.message ?? 'Réessayez.'); return; }
    // On garde la catégorie : un groupe a souvent plusieurs lieux du même type.
    setForm((f) => ({ business_name: '', category: f.category, location_city: '' }));
    onCreated({ id: (res.data as { id: number }).id, ...data });
  };

  return (
    <View>
      <ThemedText style={styles.label}>Nom du profil</ThemedText>
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
        {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.saveTxt}>{submitLabel}</ThemedText>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
