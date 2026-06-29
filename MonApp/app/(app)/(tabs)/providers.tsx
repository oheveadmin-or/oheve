import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { type ProviderContact, saveProviderContact } from '@/lib/providers-store';
import { prestatairesApi } from '@/services/auth/api';
import { computeMatch, type WeddingProfile } from '@/services/matching';

// ── Catégories principales ─────────────────────────────────────────────────

type CategoryItem = {
  slug: string;
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
};

const MAIN_CATEGORIES: CategoryItem[] = [
  { slug: 'salle', label: 'Lieux de réception', count: 48, icon: 'business-outline', bg: '#E8E4DC' },
  { slug: 'traiteur', label: 'Traiteurs', count: 73, icon: 'restaurant-outline', bg: '#EDE8E1' },
  { slug: 'photo', label: 'Photo & Vidéo', count: 92, icon: 'camera-outline', bg: '#E4E8E4' },
  { slug: 'musique', label: 'Musique & Animation', count: 64, icon: 'musical-notes-outline', bg: '#EBE6DE' },
  { slug: 'fleuriste', label: 'Décoration & Fleurs', count: 51, icon: 'flower-outline', bg: '#E8EDE4' },
  { slug: 'beaute', label: 'Beauté', count: 38, icon: 'sparkles-outline', bg: '#EDE4E8' },
  { slug: 'tenues', label: 'Tenues', count: 49, icon: 'shirt-outline', bg: '#E4E8ED' },
  { slug: 'transport', label: 'Transport', count: 27, icon: 'car-outline', bg: '#EDE8E4' },
  { slug: 'juif', label: 'Mariage Juif', count: 91, icon: 'star-outline', bg: '#E8E4EE' },
  { slug: 'chabbat-hattan', label: 'Chabbat Hattan', count: 0, icon: 'moon-outline', bg: '#EAE4F0' },
  { slug: 'patisserie', label: 'Pâtisserie', count: 19, icon: 'cafe-outline', bg: '#EEE8E4' },
  { slug: 'planner', label: 'Wedding Planner', count: 22, icon: 'clipboard-outline', bg: '#E4EDE8' },
  { slug: 'animation', label: 'Animation', count: 23, icon: 'happy-outline', bg: '#EDE4E4' },
];


// ── Formulaire ─────────────────────────────────────────────────────────────

const FORM_CATEGORIES = [
  { slug: 'photographe', label: 'Photographe' },
  { slug: 'traiteur', label: 'Traiteur' },
  { slug: 'salle', label: 'Salle' },
  { slug: 'fleuriste', label: 'Fleuriste' },
  { slug: 'musicien', label: 'Musicien / DJ' },
  { slug: 'organisateur', label: 'Organisateur' },
];

let nextProviderId = 200;

export default function ProvidersScreen() {
  const { horizontalPadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const tabBarHeight = 56;
  const fabBottom = 16 + insets.bottom + tabBarHeight;

  const [apiProviders, setApiProviders] = useState<ProviderContact[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [formNom, setFormNom] = useState('');
  const [formTelephone, setFormTelephone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAdresse, setFormAdresse] = useState('');
  const [formVille, setFormVille] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formCateg, setFormCateg] = useState('photographe');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    prestatairesApi.list(user?.accessToken)
      .then((res: { success?: boolean; data?: unknown[] }) => {
        if (res?.success && Array.isArray(res.data)) {
          const userCity = (user?.wedding_city ?? '').toLowerCase().trim();
          const mapped: ProviderContact[] = (res.data as Array<{
            user_id: number; business_name: string; category: string;
            location_city?: string; rating?: number; email?: string; instagram_url?: string;
            avatar_url?: string; cover_url?: string;
          }>).map((p) => ({
            id: String(p.user_id),
            nom: p.business_name,
            categorie: p.category,
            ville: p.location_city ?? '',
            note: p.rating ?? 0,
            telephone: '',
            email: p.email ?? '',
            adresse: p.location_city ?? '',
            instagram: p.instagram_url ?? '',
            avatarUrl: p.avatar_url,
            coverUrl: p.cover_url,
          })).sort((a, b) => {
            const aCity = a.ville.toLowerCase().trim();
            const bCity = b.ville.toLowerCase().trim();
            const aMatch = userCity && aCity.includes(userCity) ? 0 : 1;
            const bMatch = userCity && bCity.includes(userCity) ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
            return (b.note ?? 0) - (a.note ?? 0);
          });
          setApiProviders(mapped);
        }
      })
      .catch(() => {});
  }, [user?.accessToken, user?.wedding_city]);

  const toggleFavorite = (id: string) => setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));

  const openModal = () => {
    setFormNom(''); setFormTelephone(''); setFormEmail('');
    setFormAdresse(''); setFormVille(''); setFormInstagram('');
    setFormCateg('photographe');
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const handleAddPrestataire = () => {
    const nom = formNom.trim();
    const telephone = formTelephone.trim();
    const email = formEmail.trim();
    const adresse = formAdresse.trim();
    const ville = formVille.trim();
    const instagram = formInstagram.trim();
    if (!nom || !telephone || !email || !adresse || !ville || !instagram) {
      Alert.alert('Champs requis', 'Renseigne tous les champs pour enregistrer le prestataire.');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) { Alert.alert('Email invalide', 'Verifie le format de l adresse email.'); return; }
    nextProviderId += 1;
    const newItem: ProviderContact = {
      id: String(nextProviderId), nom, categorie: formCateg,
      ville, note: 5, telephone, email, adresse, instagram,
    };
    saveProviderContact(newItem);
    closeModal();
  };


  return (
    <ScreenLayout constrainWidth={false} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingBottom: fabBottom + 56 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
          <ThemedText style={styles.homeButtonText}>← Retour à l'accueil</ThemedText>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title}>Prestataires</ThemedText>
            <ThemedText style={styles.subtitle}>Découvrez et gérez vos prestataires mariage</ThemedText>
          </View>
          <Pressable style={styles.settingsBtn}>
            <Ionicons name="options-outline" size={20} color={C.textMid} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={C.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un prestataire, une catégorie..."
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Catégories principales */}
        <ThemedText style={styles.sectionTitle}>Catégories principales</ThemedText>
        <View style={styles.categoriesGrid}>
          {MAIN_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.slug}
              style={[styles.categoryCard, { backgroundColor: cat.bg }]}
              onPress={() =>
                cat.slug === 'chabbat-hattan'
                  ? router.push('/(app)/chabbat-hattan' as never)
                  : router.push(`/(app)/providers/categories/${cat.slug}` as never)
              }
            >
              <Ionicons name={cat.icon} size={32} color={C.saugeDark} style={styles.categoryIcon} />
              <ThemedText style={styles.categoryLabel} numberOfLines={2}>{cat.label}</ThemedText>
              <ThemedText style={styles.categoryCount}>{cat.count} prestataires</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Recommandé pour votre mariage */}
        {apiProviders.length > 0 && (() => {
          const weddingProfile: WeddingProfile = {
            lat: undefined,
            lng: undefined,
            budgetTotal: user?.budget_total ?? 30000,
            guestsCount: 150,
          };
          const ranked = apiProviders
            .map(p => ({ ...p, match: computeMatch({ id: p.id, category: p.categorie, rating: p.note || undefined, reviewsCount: p.note > 0 ? 10 : 0 }, weddingProfile) }))
            .sort((a, b) => b.match.score - a.match.score);
          const top = ranked.slice(0, 6);
          return (
            <>
              <View style={styles.sectionRow}>
                <ThemedText style={styles.sectionTitle}>Recommandé pour vous</ThemedText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {top.map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.providerCard}
                    onPress={() => router.push(`/(app)/providers/${p.id}` as never)}
                  >
                    {(p.coverUrl ?? p.avatarUrl) ? (
                      <Image source={{ uri: p.coverUrl ?? p.avatarUrl }} style={styles.providerCardImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.providerCardImg, { backgroundColor: C.beige, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="business-outline" size={36} color={C.saugeDark} />
                      </View>
                    )}
                    <Pressable style={styles.heartBtn} onPress={() => toggleFavorite(p.id)}>
                      <Ionicons
                        name={favorites[p.id] ? 'heart' : 'heart-outline'}
                        size={16}
                        color={favorites[p.id] ? C.error : C.textLight}
                      />
                    </Pressable>
                    <View style={styles.providerCardBody}>
                      <ThemedText style={styles.providerCardName} numberOfLines={1}>{p.nom}</ThemedText>
                      <ThemedText style={styles.providerCardMeta} numberOfLines={1}>{p.categorie} · {p.ville}</ThemedText>
                      {p.note > 0 && (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={11} color="#F5A623" />
                          <ThemedText style={styles.ratingText}>{p.note.toFixed(1)}</ThemedText>
                        </View>
                      )}
                      {p.match.badges.length > 0 && (
                        <View style={styles.matchBadge}>
                          <ThemedText style={styles.matchBadgeText}>✓ {p.match.badges[0]}</ThemedText>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          );
        })()}

        {/* Récemment consultés — vrais prestataires API */}
        {apiProviders.length > 0 && (
          <>
            <ThemedText style={[styles.sectionTitle, { marginTop: 4 }]}>Tous les prestataires</ThemedText>
            {apiProviders.map((p) => (
              <Pressable
                key={p.id}
                style={styles.recentCard}
                onPress={() => router.push(`/(app)/providers/${p.id}` as never)}
              >
                {(p.coverUrl ?? p.avatarUrl) ? (
                  <Image source={{ uri: p.coverUrl ?? p.avatarUrl }} style={styles.recentIcon} contentFit="cover" />
                ) : (
                  <View style={[styles.recentIcon, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="business-outline" size={22} color={C.saugeDark} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.recentName}>{p.nom}</ThemedText>
                  <ThemedText style={styles.recentMeta}>{p.categorie} · {p.ville}</ThemedText>
                  {p.note > 0 && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={10} color="#F5A623" />
                      <ThemedText style={styles.ratingText}>{p.note.toFixed(1)}</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.voirTout}>Voir</ThemedText>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      {/* FAB admin */}
      {user?.role === 'admin' && (
        <Pressable
          style={({ pressed }) => [styles.addBtn, { bottom: fabBottom }, pressed && styles.addBtnPressed]}
          onPress={openModal}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <ThemedText style={styles.addBtnText}>Ajouter un prestataire</ThemedText>
        </Pressable>
      )}

      {/* Modal ajout */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <ScrollView
            contentContainerStyle={styles.modalCenter}
            keyboardShouldPersistTaps="always"
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <ThemedText style={styles.modalTitle}>Nouveau prestataire</ThemedText>
              <ThemedText style={styles.modalHint}>Tous les champs sont requis.</ThemedText>

              {[
                { label: 'Nom', value: formNom, onChange: setFormNom, placeholder: 'Nom du prestataire' },
                { label: 'Téléphone', value: formTelephone, onChange: setFormTelephone, placeholder: 'Téléphone', keyboardType: 'phone-pad' as const },
                { label: 'Email', value: formEmail, onChange: setFormEmail, placeholder: 'Email', keyboardType: 'email-address' as const },
                { label: 'Adresse', value: formAdresse, onChange: setFormAdresse, placeholder: 'Numéro et rue' },
                { label: 'Ville', value: formVille, onChange: setFormVille, placeholder: 'Ville' },
                { label: 'Instagram', value: formInstagram, onChange: setFormInstagram, placeholder: '@prestataire' },
              ].map(({ label, value, onChange, placeholder, keyboardType }) => (
                <View key={label}>
                  <ThemedText style={styles.modalLabel}>{label}</ThemedText>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={placeholder}
                    placeholderTextColor="#A09890"
                    value={value}
                    onChangeText={onChange}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}

              <ThemedText style={styles.modalLabel}>Catégorie</ThemedText>
              <ScrollView horizontal style={styles.categPick} showsHorizontalScrollIndicator={false}>
                {FORM_CATEGORIES.map(({ slug, label }) => (
                  <Pressable key={slug} style={[styles.categChip, formCateg === slug && styles.categChipActive]} onPress={() => setFormCateg(slug)}>
                    <ThemedText style={formCateg === slug ? styles.categChipTextActive : styles.categChipText}>{label}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnSecondary} onPress={closeModal}>
                  <ThemedText style={styles.modalBtnSecondaryText}>Annuler</ThemedText>
                </Pressable>
                <Pressable style={styles.modalBtnPrimary} onPress={handleAddPrestataire}>
                  <ThemedText style={styles.modalBtnPrimaryText}>Enregistrer</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4, gap: 0 },

  homeButton: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4 },
  homeButtonText: { color: C.moka, fontSize: 14, fontWeight: '600' },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.textLight },
  settingsBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },

  searchFilterRow: { marginBottom: 20 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: C.textDark },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.textDark, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  voirTout: { fontSize: 13, color: C.sauge, fontWeight: '600' },

  // Catégories grid 2 colonnes
  categoriesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  categoryCard: {
    width: '47.5%', borderRadius: RADIUS.lg,
    paddingVertical: 18, paddingHorizontal: 14,
    alignItems: 'center', gap: 6,
  },
  categoryIcon: { marginBottom: 4 },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: C.textDark, textAlign: 'center' },
  categoryCount: { fontSize: 11, color: C.textLight },

  // Cartes prestataires (horizontales)
  horizontalList: { gap: 12, paddingRight: 4, marginBottom: 24 },
  providerCard: {
    width: 148, borderRadius: RADIUS.lg, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  providerCardImg: {
    width: '100%', height: 110,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ffffffcc', alignItems: 'center', justifyContent: 'center',
  },
  providerCardBody: { padding: 10, gap: 2 },
  providerCardName: { fontSize: 13, fontWeight: '700', color: C.textDark },
  providerCardMeta: { fontSize: 11, color: C.textLight },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: 10, color: C.textMid },
  matchBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(156,160,138,0.15)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 7,
    alignSelf: 'flex-start',
  },
  matchBadgeText: { fontSize: 10, color: '#6A7055', fontWeight: '600' },
  availBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: C.saugePale, borderRadius: RADIUS.pill,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  availText: { fontSize: 9, fontWeight: '700', color: C.saugeDark },

  // Récemment consultés
  recentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: RADIUS.md, padding: 14, marginBottom: 10,
  },
  recentIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: C.beige, alignItems: 'center', justifyContent: 'center',
  },
  recentName: { fontSize: 15, fontWeight: '700', color: C.textDark },
  recentMeta: { fontSize: 12, color: C.textLight, marginTop: 2 },

  // FAB
  addBtn: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.sauge, padding: 16,
    borderRadius: RADIUS.md, maxWidth: 560, alignSelf: 'center',
    width: '100%', zIndex: 20, elevation: 8,
  },
  addBtnPressed: { opacity: 0.9 },
  addBtnText: { color: C.textInvert, fontSize: 16, fontWeight: '600' },

  // Modal
  modalRoot: { flex: 1, justifyContent: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalScroll: { flexGrow: 0, zIndex: 1, maxHeight: '90%' },
  modalCenter: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  modalCard: { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: C.textDark },
  modalHint: { fontSize: 13, color: C.textLight, marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: C.textMid },
  modalInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm,
    padding: 14, fontSize: 16, marginBottom: 14,
    color: C.textDark, backgroundColor: C.ivoire,
  },
  categPick: { marginBottom: 16, maxHeight: 44 },
  categChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border,
    marginRight: 8, backgroundColor: C.card,
  },
  categChipActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  categChipText: { fontSize: 13, color: C.textMid },
  categChipTextActive: { color: C.textInvert, fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnSecondary: { paddingVertical: 12, paddingHorizontal: 16 },
  modalBtnSecondaryText: { color: C.moka, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: C.sauge, paddingVertical: 12, paddingHorizontal: 20, borderRadius: RADIUS.sm },
  modalBtnPrimaryText: { color: C.textInvert, fontWeight: '600' },
});
