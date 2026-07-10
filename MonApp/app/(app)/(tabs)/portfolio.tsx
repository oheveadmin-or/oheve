import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ErrorBanner } from '@/components/ui/error-banner';
import { C } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi, uploadFile } from '@/services/auth/api';
import { API_ENDPOINTS } from '@/constants/config';

const AnimatedView = Animated.createAnimatedComponent(View);

const SCREEN_WIDTH = Dimensions.get('window').width;
const PADDING = 20;
const GAP = 10;
const PHOTO_SIZE = (SCREEN_WIDTH - PADDING * 2 - GAP * 2) / 3;

type Photo = {
  id: number;
  url: string;
  is_cover: boolean;
  caption?: string | null;
};

export default function PortfolioScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [gridW, setGridW] = useState(0);
  const [captionPhoto, setCaptionPhoto] = useState<Photo | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  // Photo choisie mais pas encore envoyée : on demande la description AVANT
  // l'upload (elle s'affiche ensuite dans l'Explore et les reels).
  const [pendingUri, setPendingUri] = useState<string | null>(null);

  const tileSize = gridW > 0 ? (gridW - GAP * 2) / 3 : PHOTO_SIZE;

  const openCaption = (photo: Photo) => {
    setCaptionPhoto(photo);
    setCaptionText(photo.caption ?? '');
  };

  const saveCaption = async () => {
    if (!captionPhoto || !user?.accessToken) return;
    setSavingCaption(true);
    try {
      const res = await prestatairesApi.updatePhotoCaption(user.accessToken, captionPhoto.id, captionText);
      if (res?.success) {
        const newCaption = captionText.trim() || null;
        setPhotos((prev) => prev.map((p) => (p.id === captionPhoto.id ? { ...p, caption: newCaption } : p)));
        setCaptionPhoto(null);
      } else {
        Alert.alert('Erreur', res?.message || 'Impossible d\'enregistrer la description.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la description.');
    }
    setSavingCaption(false);
  };

  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!user?.accessToken) { setLoading(false); return; }
    try {
      const res = await prestatairesApi.getPhotos(user.accessToken);
      if (res?.success && Array.isArray(res.data)) {
        setPhotos(res.data);
        setLoadError(null);
      } else {
        setLoadError(res?.message || 'Impossible de charger le portfolio. Vérifiez votre connexion.');
      }
    } catch {
      setLoadError('Impossible de charger le portfolio. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);
  useFocusEffect(useCallback(() => { fetchPhotos(); }, [fetchPhotos]));

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à votre galerie dans les Réglages.');
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
        // ⚠️ selectionLimit: 0 (illimité) masque le bouton « Ajouter » du sélecteur
        // iOS sur certaines versions → l'utilisateur ne peut plus valider sa sélection.
        // Une limite finie restaure le bouton. 30 photos par lot (répétable).
        selectionLimit: 30,
      });
    } catch {
      Alert.alert('Photo illisible', "Une des photos sélectionnées n'a pas pu être lue (parfois une image iCloud non téléchargée). Réessayez ou choisissez-en d'autres.");
      return;
    }

    if (result.canceled || !result.assets.length) return;

    // Une seule photo → on demande d'abord la description (facultative).
    // Plusieurs photos → upload direct (description ajoutable ensuite par photo).
    if (result.assets.length === 1) {
      setCaptionText('');
      setPendingUri(result.assets[0].uri);
      return;
    }
    await uploadAssets(result.assets.map((a) => a.uri));
  };

  const uploadAssets = async (uris: string[], caption?: string) => {
    setUploading(true);
    let failed = 0;
    try {
      for (const uri of uris) {
        try {
          const res = await uploadFile(
            `${API_ENDPOINTS.prestataires}/me/photos`,
            user!.accessToken,
            uri,
            'photo',
            caption ? { caption } : undefined,
          );
          if (res?.success && res.data) {
            setPhotos((prev) => [...prev, res.data as never]);
          } else if (res?.message) {
            failed += 1;
          }
        } catch {
          // Une photo illisible/corrompue ne doit pas interrompre les autres
          failed += 1;
        }
      }
    } finally {
      setUploading(false);
    }
    if (failed > 0) {
      Alert.alert('Upload partiel', `${failed} photo(s) n'ont pas pu être ajoutées. Les autres ont bien été enregistrées.`);
    }
  };

  // Publication de la photo en attente avec sa description saisie dans le modal.
  const confirmPendingUpload = async () => {
    if (!pendingUri) return;
    const uri = pendingUri;
    const caption = captionText.trim();
    setPendingUri(null);
    await uploadAssets([uri], caption || undefined);
  };

  const setCover = async (photoId: number) => {
    if (!user?.accessToken) return;
    try {
      await prestatairesApi.setCoverPhoto(user.accessToken, photoId);
      setPhotos((prev) =>
        prev.map((p) => ({ ...p, is_cover: p.id === photoId }))
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de définir la photo de couverture.');
    }
  };

  const deletePhoto = (photoId: number) => {
    Alert.alert(
      'Supprimer la photo',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (!user?.accessToken) return;
            try {
              await prestatairesApi.deletePhoto(user.accessToken, photoId);
              setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer la photo.');
            }
          },
        },
      ]
    );
  };

  const coverPhoto = photos.find((p) => p.is_cover);
  const otherPhotos = photos.filter((p) => !p.is_cover);

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.overline}>Mes réalisations</ThemedText>
          <ThemedText style={styles.title}>Portfolio</ThemedText>
        </View>
        <Pressable
          style={[styles.uploadBtn, uploading && styles.uploadBtnOff]}
          onPress={pickAndUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={18} color="#fff" />
              <ThemedText style={styles.uploadBtnText}>Ajouter</ThemedText>
            </>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#A7AD9A" size="large" />
          <ThemedText style={styles.loadingText}>Chargement du portfolio...</ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ErrorBanner message={loadError} onRetry={fetchPhotos} />

          {/* ── Photo de couverture ─────────────────────────────────── */}
          <AnimatedView entering={FadeInDown.delay(60).springify()}>
            <ThemedText style={styles.sectionLabel}>Photo de couverture</ThemedText>
            {coverPhoto ? (
              <Pressable
                style={styles.coverCard}
                onPress={() => openCaption(coverPhoto)}
              >
                <Image
                  source={{ uri: coverPhoto.url }}
                  style={styles.coverImage}
                  contentFit="cover"
                />
                <View style={styles.coverBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <ThemedText style={styles.coverBadgeText}>Couverture</ThemedText>
                </View>
                <Pressable
                  style={styles.coverDeleteBtn}
                  onPress={() => deletePhoto(coverPhoto.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </Pressable>
                <View style={styles.coverCaptionBar}>
                  <Ionicons name="text-outline" size={13} color="#fff" />
                  <ThemedText style={styles.coverCaptionTxt} numberOfLines={1}>
                    {coverPhoto.caption || 'Ajouter une description'}
                  </ThemedText>
                </View>
              </Pressable>
            ) : (
              <Pressable style={styles.coverEmpty} onPress={pickAndUpload}>
                <Ionicons name="image-outline" size={40} color="#c4b5fd" />
                <ThemedText style={styles.coverEmptyTitle}>
                  Aucune photo de couverture
                </ThemedText>
                <ThemedText style={styles.coverEmptyHint}>
                  La première photo de votre portfolio sera mise en avant. Appuyez pour ajouter.
                </ThemedText>
              </Pressable>
            )}
          </AnimatedView>

          {/* ── Grille photos ────────────────────────────────────────── */}
          <AnimatedView entering={FadeInDown.delay(120).springify()}>
            <View style={styles.gridHeader}>
              <ThemedText style={[styles.sectionLabel, { flex: 1, marginBottom: 0 }]} numberOfLines={1}>
                Toutes les photos ({photos.length})
              </ThemedText>
              {photos.length > 0 && (
                <ThemedText style={styles.gridHint}>
                  Appui long → options
                </ThemedText>
              )}
            </View>

            <ThemedText style={styles.gridSubHint}>
              Appuyez sur une photo pour ajouter une description
            </ThemedText>

            <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
              {/* Add photo tile */}
              <Pressable style={[styles.addTile, { width: tileSize, height: tileSize }]} onPress={pickAndUpload}>
                <Ionicons name="add-circle-outline" size={32} color="#A7AD9A" />
                <ThemedText style={styles.addTileText}>Ajouter{'\n'}des photos</ThemedText>
              </Pressable>

              {/* Photo tiles */}
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={[styles.photoTile, { width: tileSize, height: tileSize }, photo.is_cover && styles.photoTileCover]}
                  onPress={() => openCaption(photo)}
                  onLongPress={() =>
                    Alert.alert(
                      photo.is_cover ? 'Photo de couverture' : 'Photo',
                      'Que voulez-vous faire ?',
                      [
                        { text: photo.caption ? 'Modifier la description' : 'Ajouter une description', onPress: () => openCaption(photo) },
                        !photo.is_cover
                          ? { text: 'Définir comme couverture', onPress: () => setCover(photo.id) }
                          : { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Supprimer',
                          style: 'destructive',
                          onPress: () => deletePhoto(photo.id),
                        },
                        { text: 'Annuler', style: 'cancel' },
                      ]
                    )
                  }
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.photoImage}
                    contentFit="cover"
                  />
                  {photo.is_cover && (
                    <View style={styles.photoCoverBadge}>
                      <Ionicons name="star" size={10} color="#fff" />
                    </View>
                  )}
                  {photo.caption ? (
                    <View style={styles.captionOverlay}>
                      <ThemedText style={styles.captionOverlayTxt} numberOfLines={2}>{photo.caption}</ThemedText>
                    </View>
                  ) : (
                    <View style={styles.captionAddBadge}>
                      <Ionicons name="text-outline" size={11} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </AnimatedView>

          {/* ── État vide ─────────────────────────────────────────────── */}
          {photos.length === 0 && (
            <AnimatedView entering={FadeInDown.delay(180).springify()} style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="images-outline" size={52} color="#c4b5fd" />
              </View>
              <ThemedText style={styles.emptyTitle}>Votre portfolio est vide</ThemedText>
              <ThemedText style={styles.emptyHint}>
                Les mariés consultent vos photos avant de vous contacter. Ajoutez vos plus belles
                réalisations pour vous démarquer.
              </ThemedText>
              <Pressable style={styles.emptyBtn} onPress={pickAndUpload}>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <ThemedText style={styles.emptyBtnText}>Ajouter mes premières photos</ThemedText>
              </Pressable>
            </AnimatedView>
          )}

          {/* ── Conseils ─────────────────────────────────────────────── */}
          <AnimatedView entering={FadeInDown.delay(240).springify()} style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
              <ThemedText style={styles.tipsTitle}>Conseils portfolio</ThemedText>
            </View>
            {[
              'Ajoutez 5 photos minimum pour apparaître en tête des résultats',
              'Privilégiez des photos lumineuses et de haute qualité',
              'Variez les formats : ambiance, détails, portraits',
            ].map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                <ThemedText style={styles.tipText}>{tip}</ThemedText>
              </View>
            ))}
          </AnimatedView>
        </ScrollView>
      )}

      {/* ── Modal description photo (avant upload OU édition) ─────────── */}
      <Modal
        visible={!!captionPhoto || !!pendingUri}
        transparent
        animationType="slide"
        onRequestClose={() => { setCaptionPhoto(null); setPendingUri(null); }}
      >
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.captionOverlayBg} onPress={() => { setCaptionPhoto(null); setPendingUri(null); }} />
          <View style={[styles.captionSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.captionHandle} />
            {(captionPhoto || pendingUri) && (
              <Image source={{ uri: captionPhoto?.url ?? pendingUri! }} style={styles.captionPreview} contentFit="cover" />
            )}
            <ThemedText style={styles.captionSheetTitle}>
              {pendingUri ? 'Ajouter une description' : 'Description de la photo'}
            </ThemedText>
            {pendingUri && (
              <ThemedText style={styles.captionSheetSub}>
                Elle s'affichera avec votre photo dans l'Explore et les reels.
              </ThemedText>
            )}
            <TextInput
              style={styles.captionInput}
              placeholder="Décrivez cette réalisation (lieu, style, prestation...)"
              placeholderTextColor="#A09890"
              value={captionText}
              onChangeText={setCaptionText}
              multiline
              maxLength={280}
              autoFocus
            />
            <ThemedText style={styles.captionCount}>{captionText.length}/280</ThemedText>
            <Pressable
              style={[styles.captionSaveBtn, savingCaption && { opacity: 0.6 }]}
              onPress={pendingUri ? confirmPendingUpload : saveCaption}
              disabled={savingCaption}
            >
              {savingCaption ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.captionSaveTxt}>{pendingUri ? 'Publier la photo' : 'Enregistrer'}</ThemedText>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  overline: { fontSize: 13, color: '#7a72a1', marginBottom: 2 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: '#1c1535' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A7AD9A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  uploadBtnOff: { opacity: 0.6 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#7a72a1', fontSize: 14 },

  content: { gap: 20, paddingBottom: 120 },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },

  // Cover
  coverCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#ede9fe',
  },
  coverImage: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#A7AD9A',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coverBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  coverDeleteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmpty: {
    height: 160,
    borderRadius: 20,
    backgroundColor: '#f6f4ff',
    borderWidth: 2,
    borderColor: '#c4b5fd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  coverEmptyTitle: { fontSize: 15, fontWeight: '700', color: '#5a46c6' },
  coverEmptyHint: { fontSize: 12, color: '#7a72a1', textAlign: 'center', lineHeight: 18 },

  // Grid
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridHint: { fontSize: 12, color: '#9ca3af' },
  gridSubHint: { fontSize: 12, color: '#9ca3af', marginBottom: 10, marginTop: -4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  addTile: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 16,
    backgroundColor: '#f6f4ff',
    borderWidth: 1.5,
    borderColor: '#c4b5fd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addTileText: {
    fontSize: 10,
    color: '#A7AD9A',
    fontWeight: '600',
    textAlign: 'center',
  },
  photoTile: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ede9fe',
  },
  photoTileCover: {
    borderWidth: 2.5,
    borderColor: '#A7AD9A',
  },
  photoImage: { width: '100%', height: '100%' },
  captionOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6, paddingVertical: 4,
  },
  captionOverlayTxt: { fontSize: 9, color: '#fff', fontWeight: '600', lineHeight: 12 },
  captionAddBadge: {
    position: 'absolute', bottom: 6, left: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  coverCaptionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  coverCaptionTxt: { flex: 1, fontSize: 12, color: '#fff', fontWeight: '600' },

  // Modal description
  captionOverlayBg: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  captionSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, gap: 10,
  },
  captionHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 6 },
  captionPreview: { width: '100%', height: 150, borderRadius: 14, backgroundColor: '#ede9fe' },
  captionSheetTitle: { fontSize: 16, fontWeight: '800', color: '#1c1535', marginTop: 4 },
  captionSheetSub: { fontSize: 12.5, color: '#A09890', lineHeight: 17, marginTop: 2 },
  captionInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    padding: 14, fontSize: 14, minHeight: 90, textAlignVertical: 'top',
    color: '#1c1535', backgroundColor: '#fafafa',
  },
  captionCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  captionSaveBtn: {
    backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  captionSaveTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  photoCoverBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#A7AD9A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1c1535' },
  emptyHint: {
    fontSize: 14,
    color: '#7a72a1',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#A7AD9A',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Tips
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 16,
    gap: 10,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { flex: 1, fontSize: 13, color: '#78350f', lineHeight: 19 },
});
