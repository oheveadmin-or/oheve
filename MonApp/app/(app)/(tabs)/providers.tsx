import { Ionicons } from '@expo/vector-icons';
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

const PRICE_FILTERS = [
  { key: 'all', label: 'Tous les prix' },
  { key: 'low', label: '< 1 000 €' },
  { key: 'mid', label: '1 000 – 3 000 €' },
  { key: 'high', label: '> 3 000 €' },
];

const CITIES = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nice', 'Toulouse', 'Strasbourg', 'Nantes'];

const CATEGORIES = [
  { slug: 'photographe', label: 'Photographe' },
  { slug: 'traiteur', label: 'Traiteur' },
  { slug: 'salle', label: 'Salle' },
  { slug: 'fleuriste', label: 'Fleuriste' },
  { slug: 'musicien', label: 'Musicien / DJ' },
  { slug: 'organisateur', label: 'Organisateur' },
];

let nextProviderId = 200;

function resetFormState() {
  return {
    formNom: '',
    formTelephone: '',
    formEmail: '',
    formAdresse: '',
    formVille: '',
    formInstagram: '',
    formCateg: 'photographe',
  };
}

export default function ProvidersScreen() {
  const { horizontalPadding, titleSize } = useResponsive();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const tabBarHeight = 56;
  const fabBottom = 16 + insets.bottom + tabBarHeight;

  // Prestataires inscrits sur la plateforme (depuis l'API)
  const [apiProviders, setApiProviders] = useState<ProviderContact[]>([]);
  // Contacts ajoutés manuellement par le client
  const [localProviders, setLocalProviders] = useState<ProviderContact[]>([]);

  const [search, setSearch] = useState('');
  const [selectedCateg, setSelectedCateg] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formNom, setFormNom] = useState('');
  const [formTelephone, setFormTelephone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAdresse, setFormAdresse] = useState('');
  const [formVille, setFormVille] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formCateg, setFormCateg] = useState('photographe');

  useEffect(() => {
    if (!user?.accessToken) return;
    prestatairesApi.list(user.accessToken)
      .then((res: { success?: boolean; data?: unknown[] }) => {
        if (res?.success && Array.isArray(res.data)) {
          const mapped: ProviderContact[] = (res.data as Array<{
            user_id: number; business_name: string; category: string;
            location_city?: string; rating?: number; email?: string; instagram_url?: string;
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
          }));
          setApiProviders(mapped);
        }
      })
      .catch(() => {});
  }, [user?.accessToken]);

  const allProviders = [...apiProviders, ...localProviders];

  const filtered = allProviders.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || p.nom.toLowerCase().includes(q) || p.ville.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    const matchCateg = !selectedCateg || p.categorie === selectedCateg;
    const matchCity = !selectedCity || p.ville.toLowerCase().includes(selectedCity.toLowerCase());
    const matchPrice = (() => {
      if (selectedPrice === 'all') return true;
      const note = p.note ?? 0;
      if (selectedPrice === 'low') return note < 2;
      if (selectedPrice === 'mid') return note >= 2 && note <= 3;
      if (selectedPrice === 'high') return note > 3;
      return true;
    })();
    return matchSearch && matchCateg && matchCity && matchPrice;
  });

  const activeFilterCount = (selectedCity ? 1 : 0) + (selectedPrice !== 'all' ? 1 : 0);

  const openModal = () => {
    const r = resetFormState();
    setFormNom(r.formNom);
    setFormTelephone(r.formTelephone);
    setFormEmail(r.formEmail);
    setFormAdresse(r.formAdresse);
    setFormVille(r.formVille);
    setFormInstagram(r.formInstagram);
    setFormCateg(r.formCateg);
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
    if (!emailOk) {
      Alert.alert('Email invalide', 'Verifie le format de l adresse email.');
      return;
    }

    nextProviderId += 1;
    const id = String(nextProviderId);
    const newItem: ProviderContact = {
      id,
      nom,
      categorie: formCateg,
      ville,
      note: 5,
      telephone,
      email,
      adresse,
      instagram,
    };

    saveProviderContact(newItem);
    setLocalProviders((prev) => [...prev, newItem]);
    closeModal();
  };

  return (
    <ScreenLayout constrainWidth={false} edges={['top', 'left', 'right']}>
      <View style={[styles.wrap, { paddingHorizontal: horizontalPadding, paddingBottom: fabBottom + 56 }]}>
        <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
          <ThemedText style={styles.homeButtonText}>← Retour a l accueil</ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText style={[styles.title, { fontSize: titleSize + 2 }]}>Prestataires</ThemedText>
          <ThemedText style={styles.subtitle}>Trouvez et gerez vos prestataires</ThemedText>
        </View>

        <View style={styles.searchFilterRow}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={20} color={C.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un prestataire..."
              placeholderTextColor="#A09890"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable
            style={[styles.filterIconBtn, activeFilterCount > 0 && styles.filterIconBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? C.textInvert : C.textMid} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}><ThemedText style={styles.filterBadgeTxt}>{activeFilterCount}</ThemedText></View>
            )}
          </Pressable>
        </View>

        {showFilters && (
          <View style={styles.filtersBox}>
            <ThemedText style={styles.filtersTitle}>Filtrer par prix</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {PRICE_FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  style={[styles.filterChip, selectedPrice === f.key && styles.filterChipActive]}
                  onPress={() => setSelectedPrice(f.key)}
                >
                  <ThemedText style={[styles.filterChipText, selectedPrice === f.key && styles.filterChipTextActive]}>{f.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <ThemedText style={[styles.filtersTitle, { marginTop: 10 }]}>Filtrer par ville</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {CITIES.map((city) => (
                <Pressable
                  key={city}
                  style={[styles.filterChip, selectedCity === city && styles.filterChipActive]}
                  onPress={() => setSelectedCity(selectedCity === city ? null : city)}
                >
                  <ThemedText style={[styles.filterChipText, selectedCity === city && styles.filterChipTextActive]}>{city}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            {activeFilterCount > 0 && (
              <Pressable style={styles.resetFiltersBtn} onPress={() => { setSelectedPrice('all'); setSelectedCity(null); }}>
                <ThemedText style={styles.resetFiltersTxt}>Réinitialiser les filtres</ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {apiProviders.length > 0 && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
              {CATEGORIES.map(({ slug, label }) => (
                <Pressable
                  key={slug}
                  style={[styles.chip, selectedCateg === slug && styles.chipSelected]}
                  onPress={() => setSelectedCateg(selectedCateg === slug ? null : slug)}
                >
                  <ThemedText style={[styles.chipText, selectedCateg === slug && styles.chipTextSelected]}>{label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            {selectedCateg && (
              <Pressable style={styles.voirTous} onPress={() => router.push(`/(app)/providers/categories/${selectedCateg}`)}>
                <ThemedText style={styles.voirTousText}>Voir tous les {CATEGORIES.find((c) => c.slug === selectedCateg)?.label}</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={C.sauge} />
              </Pressable>
            )}
          </>
        )}

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filtered.map((p) => (
            <Pressable key={p.id} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push(`/(app)/providers/${p.id}`)}>
              <View style={styles.cardBody}>
                <ThemedText style={styles.cardTitle}>{p.nom}</ThemedText>
                <ThemedText style={styles.cardMeta}>
                  {p.ville} • {p.telephone}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={C.textLight} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {user?.role === 'admin' && (
        <Pressable
          style={({ pressed }) => [styles.addBtn, { bottom: fabBottom }, pressed && styles.addBtnPressed]}
          onPress={openModal}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <ThemedText style={styles.addBtnText}>Ajouter un prestataire</ThemedText>
        </Pressable>
      )}

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <ScrollView
            contentContainerStyle={styles.modalCenter}
            keyboardShouldPersistTaps="always"
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <ThemedText style={styles.modalTitle}>Nouveau prestataire</ThemedText>
              <ThemedText style={styles.modalHint}>Tous les champs sont requis pour enregistrer.</ThemedText>

              <ThemedText style={styles.modalLabel}>Nom</ThemedText>
              <TextInput style={styles.modalInput} placeholder="Nom du prestataire" placeholderTextColor="#A09890" value={formNom} onChangeText={setFormNom} />

              <ThemedText style={styles.modalLabel}>Telephone</ThemedText>
              <TextInput style={styles.modalInput} placeholder="Telephone" placeholderTextColor="#A09890" value={formTelephone} onChangeText={setFormTelephone} keyboardType="phone-pad" />

              <ThemedText style={styles.modalLabel}>Email</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                placeholderTextColor="#A09890"
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <ThemedText style={styles.modalLabel}>Adresse</ThemedText>
              <TextInput style={styles.modalInput} placeholder="Numero et rue" placeholderTextColor="#A09890" value={formAdresse} onChangeText={setFormAdresse} />

              <ThemedText style={styles.modalLabel}>Ville</ThemedText>
              <TextInput style={styles.modalInput} placeholder="Ville" placeholderTextColor="#A09890" value={formVille} onChangeText={setFormVille} />

              <ThemedText style={styles.modalLabel}>Instagram</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="@votre_prestataire"
                placeholderTextColor="#A09890"
                value={formInstagram}
                onChangeText={setFormInstagram}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <ThemedText style={styles.modalLabel}>Categorie</ThemedText>
              <ScrollView horizontal style={styles.categPick} showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map(({ slug, label }) => (
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
  homeButton: { alignSelf: 'flex-start', marginBottom: 10, paddingVertical: 6 },
  homeButtonText: { color: C.moka, fontSize: 15, fontWeight: '600' },
  wrap: { flex: 1 },
  header: { marginBottom: 16 },
  title: { fontWeight: '700', marginBottom: 4, color: C.textDark },
  subtitle: { fontSize: 15, color: C.textLight },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
  },
  filterIconBtn: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterIconBtnActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.moka, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  filtersBox: {
    backgroundColor: C.card, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: C.border, padding: 14, marginBottom: 14,
  },
  filtersTitle: { fontSize: 12, fontWeight: '700', color: C.textMid, marginBottom: 8, letterSpacing: 0.5 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.ivoire,
  },
  filterChipActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  filterChipText: { fontSize: 13, color: C.textMid, fontWeight: '500' },
  filterChipTextActive: { color: C.textInvert, fontWeight: '600' },
  resetFiltersBtn: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.error },
  resetFiltersTxt: { fontSize: 12, color: C.error, fontWeight: '600' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 16, color: C.textDark },
  chipsScroll: { marginBottom: 16, maxHeight: 48 },
  chipsContent: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipSelected: { backgroundColor: C.sauge, borderColor: C.sauge },
  chipText: { fontSize: 14, fontWeight: '500', color: C.textMid },
  chipTextSelected: { color: C.textInvert },
  voirTous: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  voirTousText: { color: C.sauge, fontSize: 14, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingBottom: 8, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    width: '100%',
  },
  cardPressed: { opacity: 0.8 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, flexShrink: 1, color: C.textDark },
  cardMeta: { fontSize: 14, color: C.textLight },
  addBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.sauge,
    padding: 16,
    borderRadius: RADIUS.md,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
    zIndex: 20,
    elevation: 8,
  },
  addBtnPressed: { opacity: 0.9 },
  addBtnText: { color: C.textInvert, fontSize: 16, fontWeight: '600' },
  modalRoot: { flex: 1, justifyContent: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalScroll: { flexGrow: 0, zIndex: 1, maxHeight: '90%' },
  modalCenter: { width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  modalCard: { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: C.textDark },
  modalHint: { fontSize: 13, color: C.textLight, marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: C.textMid },
  modalInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.sm,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
    color: C.textDark,
    backgroundColor: C.ivoire,
  },
  categPick: { marginBottom: 16, maxHeight: 44 },
  categChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    backgroundColor: C.card,
  },
  categChipActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  categChipText: { fontSize: 13, color: C.textMid },
  categChipTextActive: { color: C.textInvert, fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnSecondary: { paddingVertical: 12, paddingHorizontal: 16 },
  modalBtnSecondaryText: { color: C.moka, fontWeight: '600' },
  modalBtnPrimary: {
    backgroundColor: C.sauge,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.sm,
  },
  modalBtnPrimaryText: { color: C.textInvert, fontWeight: '600' },
});
