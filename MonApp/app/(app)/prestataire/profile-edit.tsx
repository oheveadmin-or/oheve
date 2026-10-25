import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi, uploadFile } from '@/services/auth/api';
import { API_ENDPOINTS } from '@/constants/config';

// Taxonomie unifiée avec les catégories côté client (providers.tsx) + reels.
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

type ProfileData = {
  business_name: string;
  category: string;
  city: string;
  phone: string;
  description: string;
  instagram: string;
  website: string;
  price_range: string;
  cover_url?: string;
};

export default function PrestataireProfileEdit() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState<ProfileData>({
    business_name: '',
    category: '',
    city: '',
    phone: '',
    description: '',
    instagram: '',
    website: '',
    price_range: '',
    cover_url: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Charger le profil existant
  useEffect(() => {
    if (!user?.accessToken) { setLoading(false); return; }
    prestatairesApi
      .getById(user.accessToken, user.id)
      .then((res) => {
        if (res?.success && res.data) {
          const d = res.data;
          setForm({
            business_name: d.business_name ?? '',
            category: d.category ?? '',
            city: d.location_city ?? d.city ?? '',
            phone: d.phone ?? '',
            description: d.description ?? '',
            instagram: d.instagram_url ?? d.instagram ?? '',
            website: d.website_url ?? d.website ?? '',
            price_range: d.price_range ?? '',
            cover_url: d.cover_url,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const set = useCallback(
    (key: keyof ProfileData) => (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    []
  );

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à votre galerie dans les Réglages.');
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

    setUploadingCover(true);
    try {
      const asset = result.assets[0];
      const res = await uploadFile(
        `${API_ENDPOINTS.prestataires}/me/photos`,
        user!.accessToken,
        asset.uri,
      );
      if (res?.success && res.data?.url) {
        setForm((prev) => ({ ...prev, cover_url: res.data!.url as string }));
      } else {
        Alert.alert('Erreur', res?.message ?? 'Impossible d\'uploader la photo de couverture.');
      }
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'uploader la photo de couverture.');
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async () => {
    if (!form.business_name.trim() || !form.category || !form.city.trim()) {
      Alert.alert('Champs requis', 'Nom, catégorie et ville sont obligatoires.');
      return;
    }
    if (!user?.accessToken) return;

    setSaving(true);
    try {
      const res = await prestatairesApi.upsertProfile(user.accessToken, {
        business_name: form.business_name.trim(),
        category: form.category,
        location_city: form.city.trim(),
        description: form.description.trim() || undefined,
        instagram_url: form.instagram.trim() || undefined,
        website_url: form.website.trim() || undefined,
        price_range: form.price_range.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      if (res.success) {
        Alert.alert('Profil mis à jour', 'Vos informations ont été sauvegardées.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Erreur', res.message ?? 'Impossible de sauvegarder le profil.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Vérifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#929B83" size="large" />
      </View>
    );
  }

  const canSave = form.business_name.trim() && form.category && form.city.trim();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Nav bar ───────────────────────────────────────────────── */}
      <View style={styles.navbar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#929B83" />
        </Pressable>
        <ThemedText style={styles.navTitle}>Mon profil</ThemedText>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
          onPress={save}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.saveBtnText}>Sauvegarder</ThemedText>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Photo de couverture ───────────────────────────────────── */}
        <Pressable style={styles.coverWrap} onPress={pickCover} disabled={uploadingCover}>
          {form.cover_url ? (
            <Image
              source={{ uri: form.cover_url }}
              style={styles.coverImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="camera-outline" size={36} color="#929b83" />
              <ThemedText style={styles.coverPlaceholderText}>
                Ajouter une photo de couverture
              </ThemedText>
            </View>
          )}
          {uploadingCover && (
            <View style={styles.coverOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          <View style={styles.coverEditBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>

        {/* ── Informations principales ─────────────────────────────── */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Informations principales</ThemedText>

          <ThemedText style={styles.fieldLabel}>Nom de l'entreprise *</ThemedText>
          <TextInput
            style={styles.input}
            value={form.business_name}
            onChangeText={set('business_name')}
            placeholder="Ex : Photos & Émotions"
            placeholderTextColor="#9a9c93"
            autoCapitalize="words"
          />

          <ThemedText style={styles.fieldLabel}>Catégorie *</ThemedText>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.key}
                style={[styles.catCard, form.category === c.key && styles.catCardOn]}
                onPress={() => setForm((prev) => ({ ...prev, category: c.key }))}
              >
                <ThemedText style={styles.catIcon}>{c.icon}</ThemedText>
                <ThemedText
                  style={[styles.catLabel, form.category === c.key && styles.catLabelOn]}
                >
                  {c.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText style={styles.fieldLabel}>Ville principale *</ThemedText>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={set('city')}
            placeholder="Ex : Paris"
            placeholderTextColor="#9a9c93"
            autoCapitalize="words"
          />

          <ThemedText style={styles.fieldLabel}>Téléphone</ThemedText>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={set('phone')}
            placeholder="+33 6 00 00 00 00"
            placeholderTextColor="#9a9c93"
            keyboardType="phone-pad"
          />
        </View>

        {/* ── Présentation ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Présentation</ThemedText>

          <ThemedText style={styles.fieldLabel}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.description}
            onChangeText={set('description')}
            placeholder="Décrivez votre activité, votre style, vos services…"
            placeholderTextColor="#9a9c93"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <ThemedText style={styles.fieldLabel}>Fourchette de prix</ThemedText>
          <TextInput
            style={styles.input}
            value={form.price_range}
            onChangeText={set('price_range')}
            placeholder="Ex : 1 500 € – 4 000 €"
            placeholderTextColor="#9a9c93"
          />
        </View>

        {/* ── Réseaux sociaux ──────────────────────────────────────── */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Réseaux sociaux</ThemedText>

          <View style={styles.socialRow}>
            <View style={[styles.socialIcon, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="logo-instagram" size={18} color="#ec4899" />
            </View>
            <TextInput
              style={[styles.input, styles.socialInput]}
              value={form.instagram}
              onChangeText={set('instagram')}
              placeholder="@votre_compte"
              placeholderTextColor="#9a9c93"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.socialRow}>
            <View style={[styles.socialIcon, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="globe-outline" size={18} color="#3b82f6" />
            </View>
            <TextInput
              style={[styles.input, styles.socialInput]}
              value={form.website}
              onChangeText={set('website')}
              placeholder="https://votre-site.fr"
              placeholderTextColor="#9a9c93"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* ── Portfolio shortcut ────────────────────────────────────── */}
        <Pressable
          style={styles.portfolioShortcut}
          onPress={() => router.push('/(app)/(tabs)/portfolio' as never)}
        >
          <View style={styles.portfolioShortcutLeft}>
            <View style={styles.portfolioIcon}>
              <Ionicons name="images-outline" size={22} color="#929B83" />
            </View>
            <View>
              <ThemedText style={styles.portfolioShortcutTitle}>Gérer mes photos</ThemedText>
              <ThemedText style={styles.portfolioShortcutSub}>
                Portfolio, photo de couverture
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9a9c93" />
        </Pressable>

        {/* ── Bouton sauvegarder (bottom) ───────────────────────────── */}
        <Pressable
          style={[styles.saveBottomBtn, !canSave && styles.saveBottomBtnOff]}
          onPress={save}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <ThemedText style={styles.saveBottomBtnText}>Sauvegarder le profil</ThemedText>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f2ed',
  },
  backBtn: { padding: 4 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#343630' },
  saveBtn: {
    backgroundColor: '#929B83',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 100,
    alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  content: { gap: 0 },

  // Cover photo
  coverWrap: {
    height: 200,
    backgroundColor: '#f5f2ed',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverPlaceholderText: { fontSize: 14, color: '#9a9c93', fontWeight: '500' },
  coverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#929B83',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f2ed',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#343630',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5c5f57',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ece8e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#343630',
    backgroundColor: '#fcfbf9',
  },
  inputMulti: { height: 120, paddingTop: 12 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ece8e0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fcfbf9',
  },
  catCardOn: { borderColor: '#929B83', backgroundColor: '#f5f2ed' },
  catIcon: { fontSize: 22 },
  catLabel: { fontSize: 9, fontWeight: '600', color: '#5c5f57', textAlign: 'center' },
  catLabelOn: { color: '#929B83' },

  // Social
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialInput: { flex: 1 },

  // Portfolio shortcut
  portfolioShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f2ed',
  },
  portfolioShortcutLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  portfolioIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f5f2ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioShortcutTitle: { fontSize: 15, fontWeight: '700', color: '#343630' },
  portfolioShortcutSub: { fontSize: 12, color: '#9a9c93', marginTop: 2 },

  // Save bottom button
  saveBottomBtn: {
    margin: 20,
    backgroundColor: '#929B83',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBottomBtnOff: { opacity: 0.4 },
  saveBottomBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
