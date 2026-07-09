import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi, uploadFile } from '@/services/auth/api';

// Taxonomie unifiée avec profile-edit.tsx et le répertoire côté client.
const CATEGORIES = [
  { key: 'salle', label: 'Salle / Lieu', icon: '🏛️' },
  { key: 'traiteur', label: 'Traiteur', icon: '🍽️' },
  { key: 'photo', label: 'Photo & Vidéo', icon: '📸' },
  { key: 'musique', label: 'Musique / DJ', icon: '🎵' },
  { key: 'fleuriste', label: 'Déco & Fleurs', icon: '💐' },
  { key: 'beaute', label: 'Beauté', icon: '💄' },
  { key: 'tenues', label: 'Tenues', icon: '👗' },
  { key: 'transport', label: 'Transport', icon: '🚗' },
  { key: 'juif', label: 'Mariage Juif', icon: '✡️' },
  { key: 'chabbat-hattan', label: 'Chabbat Hattan', icon: '🕍' },
  { key: 'patisserie', label: 'Pâtisserie', icon: '🧁' },
  { key: 'planner', label: 'Wedding Planner', icon: '📋' },
  { key: 'animation', label: 'Animation', icon: '🎉' },
  { key: 'autre', label: 'Autre', icon: '🎊' },
];

type SetupForm = {
  business_name: string;
  category: string;
  city: string;
  phone: string;
  description: string;
  price_range: string;
  instagram: string;
  website: string;
  /** URI locale de la photo choisie — uploadée APRÈS la création du profil
   *  (le serveur refuse l'upload tant que la fiche n'existe pas). */
  cover_local_uri?: string;
};

export default function PrestataireSetup() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [form, setForm] = useState<SetupForm>({
    business_name: '',
    category: '',
    city: '',
    phone: '',
    description: '',
    price_range: '',
    instagram: '',
    website: '',
    cover_local_uri: undefined,
  });
  const [loading, setLoading] = useState(false);

  const set = useCallback(
    (key: keyof SetupForm) => (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    []
  );

  const canSubmit = form.business_name.trim() && form.category && form.city.trim();

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à votre galerie dans les Réglages.");
      return;
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
    } catch {
      Alert.alert('Photo illisible', "Cette photo n'a pas pu être lue (image iCloud non téléchargée ?). Choisissez-en une autre.");
      return;
    }
    if (result.canceled || !result.assets[0]) return;
    // Simple aperçu local — l'upload se fait à la validation, une fois la fiche créée.
    const uri = result.assets[0].uri;
    setForm((prev) => ({ ...prev, cover_local_uri: uri }));
  };

  const submit = async () => {
    if (!canSubmit || !user?.accessToken) return;
    setLoading(true);
    try {
      const res = await prestatairesApi.upsertProfile(user.accessToken, {
        business_name: form.business_name.trim(),
        category: form.category,
        location_city: form.city.trim(),
        phone: form.phone.trim() || undefined,
        description: form.description.trim() || undefined,
        price_range: form.price_range.trim() || undefined,
        instagram_url: form.instagram.trim() || undefined,
        website_url: form.website.trim() || undefined,
      });
      if (!res.success) {
        Alert.alert('Erreur', res.message ?? 'Impossible de sauvegarder le profil');
        return;
      }
      // Fiche créée : on peut maintenant uploader la photo de couverture.
      // Best effort — en cas d'échec, la photo pourra être ajoutée depuis le profil.
      if (form.cover_local_uri) {
        await uploadFile(
          `${API_ENDPOINTS.prestataires}/me/photos`,
          user.accessToken,
          form.cover_local_uri,
        ).catch(() => {});
      }
      // Dernière étape de l'inscription : l'abonnement.
      router.replace('/(app)/prestataire/subscribe');
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
        <ThemedText style={styles.stepBadge}>Étape 1 sur 2</ThemedText>
        <ThemedText style={styles.title}>Votre profil prestataire</ThemedText>
        <ThemedText style={styles.sub}>Ces informations seront visibles par les futurs mariés</ThemedText>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Photo de couverture */}
        <ThemedText style={styles.label}>Photo de couverture</ThemedText>
        <Pressable style={styles.coverWrap} onPress={pickCover}>
          {form.cover_local_uri ? (
            <Image source={{ uri: form.cover_local_uri }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="camera-outline" size={32} color="#c4b5fd" />
              <ThemedText style={styles.coverPlaceholderText}>Ajouter une photo de couverture</ThemedText>
            </View>
          )}
          <View style={styles.coverEditBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>

        {/* Business name */}
        <ThemedText style={styles.label}>Nom de votre entreprise *</ThemedText>
        <TextInput
          style={styles.input}
          value={form.business_name}
          onChangeText={set('business_name')}
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
              style={[styles.catCard, form.category === c.key && styles.catCardOn]}
              onPress={() => setForm((prev) => ({ ...prev, category: c.key }))}
            >
              <ThemedText style={styles.catIcon}>{c.icon}</ThemedText>
              <ThemedText style={[styles.catLabel, form.category === c.key && styles.catLabelOn]}>
                {c.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* City */}
        <ThemedText style={styles.label}>Ville principale *</ThemedText>
        <TextInput
          style={styles.input}
          value={form.city}
          onChangeText={set('city')}
          placeholder="Ex: Paris"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
        />

        {/* Phone */}
        <ThemedText style={styles.label}>Téléphone</ThemedText>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={set('phone')}
          placeholder="+33 6 00 00 00 00"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
        />

        {/* Description */}
        <ThemedText style={styles.label}>Description</ThemedText>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={form.description}
          onChangeText={set('description')}
          placeholder="Décrivez votre activité, votre style, vos services…"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Fourchette de prix */}
        <ThemedText style={styles.label}>Fourchette de prix</ThemedText>
        <TextInput
          style={styles.input}
          value={form.price_range}
          onChangeText={set('price_range')}
          placeholder="Ex : 1 500 € – 4 000 €"
          placeholderTextColor="#9ca3af"
        />

        {/* Réseaux sociaux */}
        <ThemedText style={styles.label}>Instagram</ThemedText>
        <View style={styles.socialRow}>
          <View style={[styles.socialIcon, { backgroundColor: '#fce7f3' }]}>
            <Ionicons name="logo-instagram" size={18} color="#ec4899" />
          </View>
          <TextInput
            style={[styles.input, styles.socialInput]}
            value={form.instagram}
            onChangeText={set('instagram')}
            placeholder="@votre_compte"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />
        </View>

        <ThemedText style={styles.label}>Site web</ThemedText>
        <View style={styles.socialRow}>
          <View style={[styles.socialIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="globe-outline" size={18} color="#3b82f6" />
          </View>
          <TextInput
            style={[styles.input, styles.socialInput]}
            value={form.website}
            onChangeText={set('website')}
            placeholder="https://votre-site.fr"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <Pressable
          style={[styles.btn, !canSubmit && styles.btnOff]}
          onPress={submit}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ThemedText style={styles.btnTxt}>Continuer</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>
        <ThemedText style={styles.nextStepHint}>
          Étape suivante : activation de votre espace (3 mois offerts)
        </ThemedText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  stepBadge: {
    alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', color: '#A7AD9A',
    letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase',
  },
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

  coverWrap: {
    height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f3f4f6',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  coverPlaceholderText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  coverEditBadge: {
    position: 'absolute', bottom: 10, right: 10, width: 32, height: 32,
    borderRadius: 16, backgroundColor: '#A7AD9A',
    alignItems: 'center', justifyContent: 'center',
  },

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

  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  socialIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  socialInput: { flex: 1 },

  btn: {
    marginTop: 24, backgroundColor: '#A7AD9A', borderRadius: 14,
    paddingVertical: 15, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  btnOff: { opacity: 0.4 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  nextStepHint: { marginTop: 10, textAlign: 'center', fontSize: 12, color: '#9ca3af' },
});
