import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi } from '@/services/auth/api';

const CATEGORIES = [
  { key: 'traiteur', label: 'Traiteur', icon: '🍽️' },
  { key: 'photographe', label: 'Photographe', icon: '📸' },
  { key: 'fleuriste', label: 'Fleuriste', icon: '💐' },
  { key: 'musique', label: 'Musique / DJ', icon: '🎵' },
  { key: 'decoration', label: 'Décoration', icon: '✨' },
  { key: 'salle', label: 'Salle / Lieu', icon: '🏛️' },
  { key: 'tenues', label: 'Tenues', icon: '👗' },
  { key: 'autres', label: 'Autres', icon: '🎊' },
];

export default function PrestataireSetup() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = businessName.trim() && category && city.trim();

  const submit = async () => {
    if (!canSubmit || !user?.accessToken) return;
    setLoading(true);
    try {
      const res = await prestatairesApi.upsertProfile(user.accessToken, {
        business_name: businessName.trim(),
        category,
        city: city.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (res.success) {
        router.replace('/(app)/(tabs)');
      } else {
        Alert.alert('Erreur', res.message ?? 'Impossible de sauvegarder le profil');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>Votre profil prestataire</ThemedText>
        <ThemedText style={styles.sub}>Ces informations seront visibles par les futurs mariés</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {/* Business name */}
        <ThemedText style={styles.label}>Nom de votre entreprise *</ThemedText>
        <TextInput
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Ex: Photos & Émotions"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
        />

        {/* Category */}
        <ThemedText style={styles.label}>Catégorie *</ThemedText>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.catCard, category === c.key && styles.catCardOn]}
              onPress={() => setCategory(c.key)}
            >
              <ThemedText style={styles.catIcon}>{c.icon}</ThemedText>
              <ThemedText style={[styles.catLabel, category === c.key && styles.catLabelOn]}>
                {c.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* City */}
        <ThemedText style={styles.label}>Ville principale *</ThemedText>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ex: Paris"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
        />

        {/* Phone */}
        <ThemedText style={styles.label}>Téléphone</ThemedText>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+33 6 00 00 00 00"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
        />

        {/* Description */}
        <ThemedText style={styles.label}>Description</ThemedText>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez votre activité, votre style, vos services…"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.btn, !canSubmit && styles.btnOff]}
          onPress={submit}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <ThemedText style={styles.btnTxt}>Créer mon profil</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable style={styles.skipBtn} onPress={() => router.replace('/(app)/(tabs)')}>
          <ThemedText style={styles.skipTxt}>Passer pour l'instant</ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  content: { padding: 24, gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#111827', backgroundColor: '#fafafa',
  },
  inputMulti: { height: 100, paddingTop: 12 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '22%', aspectRatio: 1, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: '#fafafa',
  },
  catCardOn: { borderColor: '#A7AD9A', backgroundColor: '#ede9fe' },
  catIcon: { fontSize: 22 },
  catLabel: { fontSize: 9, fontWeight: '600', color: '#6b7280', textAlign: 'center' },
  catLabelOn: { color: '#A7AD9A' },
  btn: {
    marginTop: 24, backgroundColor: '#A7AD9A', borderRadius: 14,
    paddingVertical: 15, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  btnOff: { opacity: 0.4 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { marginTop: 12, alignSelf: 'center', paddingVertical: 8 },
  skipTxt: { color: '#9ca3af', fontSize: 14, fontWeight: '500' },
});
