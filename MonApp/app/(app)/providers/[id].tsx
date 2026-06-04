import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi } from '@/services/auth/api';
import {
  addProviderToHome,
  getProviderContact,
  isProviderInHome,
  type ProviderContact,
} from '@/lib/providers-store';

const SCREEN_WIDTH = Dimensions.get('window').width;
const AnimatedView = Animated.createAnimatedComponent(View);

type Photo = { id: number; url: string; is_cover: boolean };

type ApiRow = {
  nom: string;
  categorie: string;
  tel: string;
  email: string;
  prix: string;
  desc: string;
  adresse: string;
  ville: string;
  instagram: string;
};

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(id ? isProviderInHome(id) : false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [apiRow, setApiRow] = useState<ApiRow | null>(null);

  useEffect(() => {
    if (!user?.accessToken || !id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return;

    prestatairesApi
      .getPhotos(user.accessToken, numId)
      .then((res) => { if (res?.success && Array.isArray(res.data)) setPhotos(res.data); })
      .catch(() => {});

    if (!getProviderContact(id)) {
      prestatairesApi
        .getById(user.accessToken, numId)
        .then((res: { success?: boolean; data?: {
          business_name?: string; category?: string; description?: string;
          location_city?: string; price_min?: number; price_max?: number;
          email?: string; instagram_url?: string;
        } }) => {
          if (res?.success && res.data) {
            const p = res.data;
            const prix = p.price_min && p.price_max
              ? `${p.price_min} – ${p.price_max} €`
              : p.price_min ? `À partir de ${p.price_min} €` : 'Sur devis';
            setApiRow({
              nom: p.business_name ?? '',
              categorie: p.category ?? '',
              tel: '-',
              email: p.email ?? '-',
              prix,
              desc: p.description ?? 'Description à venir.',
              adresse: p.location_city ?? '-',
              ville: p.location_city ?? '-',
              instagram: p.instagram_url ?? '-',
            });
          }
        })
        .catch(() => {});
    }
  }, [id, user]);

  const coverPhoto = photos.find((p) => p.is_cover) ?? photos[0];

  const display = useMemo(() => {
    if (!id) return null;
    const saved = getProviderContact(id);
    if (saved) {
      return {
        nom: saved.nom,
        tel: saved.telephone,
        email: saved.email,
        adresse: saved.adresse,
        ville: saved.ville,
        instagram: saved.instagram,
        prix: '—',
        desc: `Catégorie : ${CATEGORIES_LABEL(saved.categorie)} • Note : ${saved.note}/5`,
      };
    }
    if (apiRow) {
      return {
        nom: apiRow.nom,
        tel: apiRow.tel,
        email: apiRow.email,
        adresse: apiRow.adresse,
        ville: apiRow.ville,
        instagram: apiRow.instagram,
        prix: apiRow.prix,
        desc: apiRow.desc,
      };
    }
    return null;
  }, [id, apiRow]);

  const handleAddToHome = () => {
    if (!id || !display) return;
    const existing = getProviderContact(id);
    const providerForHome: ProviderContact = existing ?? {
      id,
      nom: display.nom,
      categorie: apiRow?.categorie ?? '',
      ville: display.ville,
      note: 4.5,
      telephone: display.tel,
      email: display.email,
      adresse: display.adresse,
      instagram: display.instagram,
    };
    addProviderToHome(providerForHome);
    setAdded(true);
  };

  const instagramUrl = (handle: string) => {
    const h = handle.trim().replace(/^@/, '');
    return h ? `https://instagram.com/${h}` : null;
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      {/* ── Modal plein écran photo ───────────────────────────────── */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedPhoto(null)}>
          {selectedPhoto && (
            <AnimatedView entering={FadeIn.springify()} style={styles.modalImageWrap}>
              <Image source={{ uri: selectedPhoto.url }} style={styles.modalImage} contentFit="contain" />
            </AnimatedView>
          )}
          <Pressable style={styles.modalClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close-circle" size={34} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* ── Header flottant ──────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.retourBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color="#6366f1" />
            <ThemedText style={styles.retourText}>Retour</ThemedText>
          </Pressable>
          <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
            <Ionicons name="home-outline" size={18} color="#6366f1" />
          </Pressable>
        </View>

        {/* ── Photo de couverture hero ─────────────────────────────── */}
        {coverPhoto ? (
          <Pressable style={styles.heroWrap} onPress={() => setSelectedPhoto(coverPhoto)}>
            <Image source={{ uri: coverPhoto.url }} style={styles.heroImage} contentFit="cover" />
            <View style={styles.heroOverlay} />
            <View style={styles.heroTextWrap}>
              <ThemedText style={styles.heroTitle}>{display?.nom ?? '…'}</ThemedText>
              {display?.adresse && display.adresse !== '-' && (
                <View style={styles.heroLocation}>
                  <Ionicons name="location-outline" size={13} color="#ffffffcc" />
                  <ThemedText style={styles.heroLocationText}>{display.adresse}</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.heroPhotoCount}>
              <Ionicons name="images-outline" size={13} color="#fff" />
              <ThemedText style={styles.heroPhotoCountText}>{photos.length}</ThemedText>
            </View>
          </Pressable>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="business-outline" size={48} color="#c4b5fd" />
            <ThemedText style={styles.heroTitle}>{display?.nom ?? '…'}</ThemedText>
          </View>
        )}

        <View style={styles.content}>
          {/* ── Galerie photos ─────────────────────────────────────── */}
          {photos.length > 0 && (
            <AnimatedView entering={FadeInDown.delay(60).springify()}>
              <ThemedText style={styles.sectionTitle}>Portfolio ({photos.length} photos)</ThemedText>
              <FlatList
                data={photos}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.galleryList}
                renderItem={({ item, index }) => (
                  <Pressable
                    style={[
                      styles.galleryThumb,
                      item.is_cover && styles.galleryThumbCover,
                      index === 0 && styles.galleryThumbFirst,
                    ]}
                    onPress={() => setSelectedPhoto(item)}
                  >
                    <Image source={{ uri: item.url }} style={styles.galleryImage} contentFit="cover" />
                    {item.is_cover && (
                      <View style={styles.galleryBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                        <ThemedText style={styles.galleryBadgeText}>Couverture</ThemedText>
                      </View>
                    )}
                  </Pressable>
                )}
              />
            </AnimatedView>
          )}

          {/* ── Infos ──────────────────────────────────────────────── */}
          {display ? (
            <AnimatedView entering={FadeInDown.delay(120).springify()} style={styles.infoCard}>
              {display.prix !== '—' && (
                <View style={styles.priceRow}>
                  <Ionicons name="pricetag" size={16} color="#A7AD9A" />
                  <ThemedText style={styles.priceText}>{display.prix}</ThemedText>
                </View>
              )}
              {[
                { icon: 'call-outline', value: display.tel, label: 'Téléphone' },
                { icon: 'mail-outline', value: display.email, label: 'Email' },
                { icon: 'location-outline', value: `${display.adresse}${display.ville !== display.adresse ? ', ' + display.ville : ''}`, label: 'Adresse' },
              ].filter((row) => row.value && row.value !== '-').map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons name={row.icon as 'home'} size={15} color="#A7AD9A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.infoLabel}>{row.label}</ThemedText>
                    <ThemedText style={styles.infoText}>{row.value}</ThemedText>
                  </View>
                </View>
              ))}
              {display.instagram && display.instagram !== '-' && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons name="logo-instagram" size={15} color="#e1306c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.infoLabel}>Instagram</ThemedText>
                    <Pressable onPress={() => { const url = instagramUrl(display.instagram); if (url) Linking.openURL(url); }}>
                      <ThemedText style={styles.infoLink}>{display.instagram}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}
            </AnimatedView>
          ) : (
            <View style={styles.loadingRow}>
              <ThemedText style={styles.loadingText}>Chargement…</ThemedText>
            </View>
          )}

          {/* ── Description ───────────────────────────────────────── */}
          {display?.desc && (
            <AnimatedView entering={FadeInDown.delay(180).springify()}>
              <ThemedText style={styles.sectionTitle}>À propos</ThemedText>
              <View style={styles.descCard}>
                <ThemedText style={styles.descText}>{display.desc}</ThemedText>
              </View>
            </AnimatedView>
          )}

          {/* ── Notes personnelles ─────────────────────────────────── */}
          <AnimatedView entering={FadeInDown.delay(220).springify()}>
            <ThemedText style={styles.sectionTitle}>Mes notes</ThemedText>
            <TextInput
              style={styles.notesInput}
              placeholder="Vos notes sur ce prestataire..."
              placeholderTextColor="#A09890"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </AnimatedView>

          {/* ── CTA Ajouter ───────────────────────────────────────── */}
          {display && (
            <AnimatedView entering={FadeInDown.delay(260).springify()}>
              <Pressable
                style={[styles.addBtn, added && styles.addBtnDone]}
                onPress={handleAddToHome}
                disabled={added}
              >
                <Ionicons name={added ? 'checkmark-circle' : 'add-circle'} size={22} color="#fff" />
                <ThemedText style={styles.addBtnText}>
                  {added ? 'Ajouté à mes prestataires' : 'Ajouter à mes prestataires'}
                </ThemedText>
              </Pressable>
            </AnimatedView>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function CATEGORIES_LABEL(slug: string): string {
  const map: Record<string, string> = {
    photographe: 'Photographe', traiteur: 'Traiteur', salle: 'Salle',
    fleuriste: 'Fleuriste', musicien: 'Musicien / DJ', organisateur: 'Organisateur',
  };
  return map[slug] ?? slug;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F2EA' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F6F2EA',
    zIndex: 10,
  },
  retourBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retourText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  homeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroWrap: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: '#ede9fe',
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,10,50,0.38)',
  },
  heroTextWrap: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 60,
  },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  heroLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  heroLocationText: { fontSize: 13, color: '#ffffffcc', fontWeight: '500' },
  heroPhotoCount: {
    position: 'absolute',
    bottom: 22,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroPhotoCountText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  heroPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f0ff',
    gap: 12,
  },

  // Content
  content: { padding: 20, gap: 20 },

  // Gallery
  galleryList: { paddingRight: 20 },
  galleryThumb: {
    width: 120,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#ede9fe',
  },
  galleryThumbFirst: { marginLeft: 0 },
  galleryThumbCover: { borderWidth: 2.5, borderColor: '#6366f1' },
  galleryImage: { width: '100%', height: '100%' },
  galleryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#6366f1cc',
  },
  galleryBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  // Info card
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f0ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  priceText: { fontSize: 16, fontWeight: '800', color: '#4338ca' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9e6ff',
    padding: 16,
    gap: 14,
    shadowColor: '#A7AD9A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: '#A09890', fontWeight: '600', marginBottom: 2 },
  infoText: { fontSize: 14, color: '#231b45', fontWeight: '500' },
  infoLink: { fontSize: 14, color: '#6366f1', fontWeight: '600' },

  loadingRow: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { color: '#A09890', fontSize: 14 },

  // Description
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#231b45', marginBottom: 10 },
  descCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e9e6ff',
    padding: 16,
  },
  descText: { fontSize: 14, color: '#4b4475', lineHeight: 22 },

  // Notes
  notesInput: {
    borderWidth: 1.5,
    borderColor: '#e9e6ff',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    color: '#231b45',
  },

  // CTA
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  addBtnDone: { backgroundColor: '#10b981', shadowColor: '#10b981' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Modal plein écran
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageWrap: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  modalImage: { width: '100%', height: '100%' },
  modalClose: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
});
