import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingModal } from '@/components/booking-modal';
import { ThemedText } from '@/components/themed-text';
import { KeyboardDoneBar, keyboardDoneProps } from '@/components/ui/keyboard-done-bar';
import { ThemedView } from '@/components/themed-view';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { calendarApi, prestatairesApi } from '@/services/auth/api';
import {
  addProviderToHome,
  getProviderContact,
  isProviderInHome,
  type ProviderContact,
} from '@/lib/providers-store';

const SCREEN_WIDTH = Dimensions.get('window').width;
const AnimatedView = Animated.createAnimatedComponent(View);

type Photo = { id: number; url: string; is_cover: boolean; caption?: string | null };

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
  website: string;
};

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(id ? isProviderInHome(id) : false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [apiRow, setApiRow] = useState<ApiRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user?.accessToken || !id) { setLoadingProfile(false); return; }
    const numId = parseInt(id, 10);
    if (isNaN(numId)) { setLoadingProfile(false); return; }

    // Enregistre une vue du profil (non comptée si le prestataire consulte le sien)
    prestatairesApi.recordView(numId, user.accessToken);

    prestatairesApi
      .getPhotos(user.accessToken, numId)
      .then((res) => { if (res?.success && Array.isArray(res.data)) setPhotos(res.data); })
      .catch(() => {});

    if (getProviderContact(id)) {
      setLoadingProfile(false);
    } else {
      prestatairesApi
        .getById(user.accessToken, numId)
        .then((res: { success?: boolean; data?: {
          business_name?: string; category?: string; description?: string;
          location_city?: string; price_min?: number; price_max?: number;
          price_range?: string; phone?: string; website_url?: string;
          email?: string; instagram_url?: string; avatar_url?: string;
        } }) => {
          if (res?.success && res.data) {
            const p = res.data;
            if (p.avatar_url) setAvatarUrl(p.avatar_url);
            const prix = p.price_range?.trim()
              ? p.price_range.trim()
              : p.price_min && p.price_max
                ? `${p.price_min} – ${p.price_max} €`
                : p.price_min ? `À partir de ${p.price_min} €` : 'Sur devis';
            setApiRow({
              nom: p.business_name ?? '',
              categorie: p.category ?? '',
              tel: p.phone?.trim() || '-',
              email: p.email ?? '-',
              prix,
              desc: p.description ?? 'Description à venir.',
              adresse: p.location_city ?? '-',
              ville: p.location_city ?? '-',
              instagram: p.instagram_url ?? '-',
              website: p.website_url?.trim() || '-',
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProfile(false));
    }
  }, [id, user]);

  const coverPhoto = photos.find((p) => p.is_cover) ?? photos[0];
  // Photo de profil ronde : avatar réel du prestataire sinon la photo de
  // couverture / 1re photo — même logique que le profil vu côté prestataire,
  // pour que la photo de profil s'affiche toujours côté client.
  const profilePhoto = avatarUrl ?? coverPhoto?.url ?? null;

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
        website: apiRow?.website ?? '-',
        prix: apiRow?.prix ?? '—',
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
        website: apiRow.website,
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
      coverUrl: coverPhoto?.url,
      avatarUrl: user?.avatar_url,
    };
    addProviderToHome(providerForHome);
    setAdded(true);
  };

  const instagramUrl = (handle: string) => {
    const h = handle.trim().replace(/^@/, '');
    return h ? `https://instagram.com/${h}` : null;
  };

  const websiteUrl = (raw: string) => {
    const w = raw.trim();
    if (!w) return null;
    return /^https?:\/\//i.test(w) ? w : `https://${w}`;
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
              {selectedPhoto.caption ? (
                <View style={styles.modalCaption}>
                  <ThemedText style={styles.modalCaptionTxt}>{selectedPhoto.caption}</ThemedText>
                </View>
              ) : null}
            </AnimatedView>
          )}
          <Pressable style={styles.modalClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close-circle" size={34} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header fixe AU-DESSUS du ScrollView ─────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.retourBtn} onPress={goBack} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Ionicons name="arrow-back" size={20} color={C.saugeDark} />
          <ThemedText style={styles.retourText}>Retour</ThemedText>
        </Pressable>
        <Pressable
          style={styles.homeButton}
          onPress={() => router.replace('/(app)/(tabs)')}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Ionicons name="home-outline" size={18} color={C.saugeDark} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Photo de couverture hero ─────────────────────────────── */}
        {(coverPhoto || avatarUrl) ? (
          <Pressable style={styles.heroWrap} onPress={() => coverPhoto && setSelectedPhoto(coverPhoto)}>
            <Image source={{ uri: coverPhoto?.url ?? avatarUrl! }} style={styles.heroImage} contentFit="cover" />
            <View style={styles.heroOverlay} />
            <View style={styles.heroTextWrap}>
              {/* Photo de profil du prestataire */}
              {profilePhoto && (
                <Image source={{ uri: profilePhoto }} style={styles.heroAvatar} contentFit="cover" />
              )}
              <ThemedText style={styles.heroTitle}>{display?.nom ?? '…'}</ThemedText>
              {display?.adresse && display.adresse !== '-' && (
                <View style={styles.heroLocation}>
                  <Ionicons name="location-outline" size={13} color="#ffffffcc" />
                  <ThemedText style={styles.heroLocationText}>{display.adresse}</ThemedText>
                </View>
              )}
            </View>
            {photos.length > 0 && (
              <View style={styles.heroPhotoCount}>
                <Ionicons name="images-outline" size={13} color="#fff" />
                <ThemedText style={styles.heroPhotoCountText}>{photos.length}</ThemedText>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="business-outline" size={48} color={C.sauge} />
            <ThemedText style={styles.heroTitleDark}>{display?.nom ?? '…'}</ThemedText>
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
                    {!item.is_cover && item.caption ? (
                      <View style={styles.galleryCaption}>
                        <ThemedText style={styles.galleryBadgeText} numberOfLines={1}>{item.caption}</ThemedText>
                      </View>
                    ) : null}
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
              {display.website && display.website !== '-' && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons name="globe-outline" size={15} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.infoLabel}>Site web</ThemedText>
                    <Pressable onPress={() => { const url = websiteUrl(display.website); if (url) Linking.openURL(url); }}>
                      <ThemedText style={styles.infoLink} numberOfLines={1}>{display.website}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}
            </AnimatedView>
          ) : loadingProfile ? (
            <View style={styles.loadingRow}>
              <ThemedText style={styles.loadingText}>Chargement…</ThemedText>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <ThemedText style={styles.loadingText}>Profil en cours de configuration</ThemedText>
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

          {/* ── CTAs ──────────────────────────────────────────────── */}
          {display && (
            <AnimatedView entering={FadeInDown.delay(260).springify()} style={{ gap: 10 }}>
              <Pressable style={styles.bookingBtn} onPress={() => setBookingModal(true)}>
                <Ionicons name="calendar-outline" size={22} color={C.saugeDark} />
                <ThemedText style={styles.bookingBtnText}>Voir les disponibilités</ThemedText>
              </Pressable>

              {/* Contribution sécurisée */}
              <Pressable style={styles.payBtn} onPress={() => setPaymentModal(true)}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
                <ThemedText style={styles.payBtnText}>Contribution sécurisée</ThemedText>
              </Pressable>

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
      {/* ── Modal contribution mariage sécurisée ──────────────── */}
      <PaymentModal
        visible={paymentModal}
        onClose={() => setPaymentModal(false)}
        providerId={id ?? ''}
        providerName={display?.nom ?? ''}
        providerCategory={apiRow?.categorie}
        defaultPrice={display?.prix}
      />
      <BookingModal
        visible={bookingModal}
        onClose={() => setBookingModal(false)}
        prestataireId={parseInt(id ?? '0', 10)}
        prestataireName={display?.nom ?? ''}
        accessToken={user?.accessToken}
      />
    </ThemedView>
  );
}

// ── Modal saisie montant → redirige vers écran Stripe ────────────────────────
function PaymentModal({
  visible,
  onClose,
  providerId,
  providerName,
  providerCategory,
  defaultPrice,
}: {
  visible: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  providerCategory?: string;
  defaultPrice?: string;
}) {
  const [amount, setAmount] = useState('');

  const handleContinue = () => {
    const euros = parseFloat(amount.replace(',', '.'));
    if (!euros || euros < 1) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant d\'au moins 1 €.');
      return;
    }
    onClose();
    router.push({
      pathname: '/(app)/payment',
      params: {
        prestataire_id: providerId,
        prestataire_nom: providerName,
        prestataire_categorie: providerCategory ?? '',
        amount_cents: String(Math.round(euros * 100)),
        currency: 'eur',
        description: `Paiement à ${providerName}`,
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={pmStyles.overlay} onPress={onClose} />
        <View style={pmStyles.sheet}>
          <View style={pmStyles.handle} />
          <ThemedText style={pmStyles.headerTitle}>{providerName}</ThemedText>
          <ThemedText style={pmStyles.headerSub}>Entrez le montant à payer</ThemedText>
          <View style={pmStyles.amountRow}>
            <TextInput
              style={pmStyles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder={defaultPrice && defaultPrice !== '—' ? defaultPrice.replace(/[^\d,.-]/g, '') : '500'}
              placeholderTextColor="#A09890"
              keyboardType="decimal-pad"
              {...keyboardDoneProps}
              autoFocus
            />
            <ThemedText style={pmStyles.currencySymbol}>€</ThemedText>
          </View>
          <Pressable style={pmStyles.payBtn} onPress={handleContinue}>
            <Ionicons name="card-outline" size={18} color="#fff" />
            <ThemedText style={pmStyles.payBtnTxt}>
              Contribution sécurisée {amount ? `· ${amount} €` : ''}
            </ThemedText>
          </Pressable>
          <View style={pmStyles.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#A09890" />
            <ThemedText style={pmStyles.secureTxt}>Paiement sécurisé par Stripe · SSL 256 bits</ThemedText>
          </View>
          <View style={{ height: 32 }} />
        </View>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />
    </Modal>
  );
}

const pmStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#231b45', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#A09890', marginBottom: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.sauge, borderRadius: 14, paddingHorizontal: 14, marginBottom: 20 },
  amountInput: { flex: 1, height: 56, fontSize: 26, fontWeight: '800', color: '#231b45' },
  currencySymbol: { fontSize: 26, fontWeight: '800', color: C.sauge },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.sauge, borderRadius: 16, paddingVertical: 16 },
  payBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  secureTxt: { fontSize: 11, color: '#A09890' },
});

function CATEGORIES_LABEL(slug: string): string {
  const map: Record<string, string> = {
    photographe: 'Photographe', traiteur: 'Traiteur', salle: 'Salle',
    fleuriste: 'Fleuriste', musicien: 'Musicien / DJ', organisateur: 'Organisateur',
  };
  return map[slug] ?? slug;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.ivoire },

  // Header fixe (hors ScrollView) — paddingTop dynamique via insets
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.ivoire,
    zIndex: 20,
  },
  retourBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingRight: 8 },
  retourText: { color: C.saugeDark, fontSize: 15, fontWeight: '600' },
  homeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.saugePale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroWrap: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: C.beige,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,10,10,0.38)',
  },
  heroTextWrap: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 60,
  },
  heroAvatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2.5, borderColor: '#fff', marginBottom: 10,
    backgroundColor: C.beige,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  heroTitleDark: { fontSize: 22, fontWeight: '800', color: C.textDark, textAlign: 'center' },
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
    backgroundColor: C.beige,
    gap: 12,
  },

  // Content
  content: { padding: 20, gap: 20 },

  // Gallery
  galleryList: { paddingRight: 20 },
  galleryThumb: {
    width: 120,
    height: 90,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: C.beige,
  },
  galleryThumbFirst: { marginLeft: 0 },
  galleryThumbCover: { borderWidth: 2.5, borderColor: C.sauge },
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
    backgroundColor: 'rgba(107,113,80,0.8)',
  },
  galleryBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  galleryCaption: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6, paddingVertical: 4,
  },

  // Info card
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.saugePale,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  priceText: { fontSize: 16, fontWeight: '800', color: C.saugeDark },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
    shadowColor: C.moka,
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
    backgroundColor: C.saugePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: C.textLight, fontWeight: '600', marginBottom: 2 },
  infoText: { fontSize: 14, color: C.textDark, fontWeight: '500' },
  infoLink: { fontSize: 14, color: C.sauge, fontWeight: '600' },

  loadingRow: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { color: C.textLight, fontSize: 14 },

  // Description
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 10 },
  descCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  descText: { fontSize: 14, color: C.textMid, lineHeight: 22 },

  // Notes
  notesInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: C.card,
    color: C.textDark,
  },

  // CTA
  bookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.saugePale,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: C.sauge,
  },
  bookingBtnText: { color: C.saugeDark, fontSize: 16, fontWeight: '700' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.sauge,
    padding: 16,
    borderRadius: RADIUS.lg,
    shadowColor: C.sauge,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.moka,
    padding: 16,
    borderRadius: RADIUS.lg,
    shadowColor: C.moka,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  addBtnDone: { backgroundColor: C.textLight, shadowColor: C.textLight },
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
  modalCaption: {
    position: 'absolute', left: 16, right: 16, bottom: 24,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  modalCaptionTxt: { color: '#fff', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  modalClose: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
});
