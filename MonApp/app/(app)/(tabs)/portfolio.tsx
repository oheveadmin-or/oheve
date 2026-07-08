import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi, uploadFile } from '@/services/auth/api';
import { API_ENDPOINTS } from '@/constants/config';

const AnimatedView = Animated.createAnimatedComponent(View);

const SCREEN_WIDTH = Dimensions.get('window').width;
const PADDING = 24;
const GAP = 10;
const PHOTO_SIZE = (SCREEN_WIDTH - PADDING * 2 - GAP * 2) / 3;

type Photo = {
  id: number;
  url: string;
  is_cover: boolean;
};

export default function PortfolioScreen() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!user?.accessToken) { setLoading(false); return; }
    try {
      const res = await prestatairesApi.getPhotos(user.accessToken);
      if (res?.success && Array.isArray(res.data)) {
        setPhotos(res.data);
      }
    } catch {
      // réseau non disponible — mode hors-ligne
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 0, // 0 = illimité (iOS bloquait à 10)
      });
    } catch {
      Alert.alert('Photo illisible', "Une des photos sélectionnées n'a pas pu être lue (parfois une image iCloud non téléchargée). Réessayez ou choisissez-en d'autres.");
      return;
    }

    if (result.canceled || !result.assets.length) return;

    setUploading(true);
    let failed = 0;
    try {
      for (const asset of result.assets) {
        try {
          const res = await uploadFile(
            `${API_ENDPOINTS.prestataires}/me/photos`,
            user!.accessToken,
            asset.uri,
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

          {/* ── Photo de couverture ─────────────────────────────────── */}
          <AnimatedView entering={FadeInDown.delay(60).springify()}>
            <ThemedText style={styles.sectionLabel}>Photo de couverture</ThemedText>
            {coverPhoto ? (
              <Pressable
                style={styles.coverCard}
                onLongPress={() =>
                  Alert.alert('Photo de couverture', 'Choisir une autre photo dans la grille')
                }
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
              <ThemedText style={styles.sectionLabel}>
                Toutes les photos ({photos.length})
              </ThemedText>
              {photos.length > 0 && (
                <ThemedText style={styles.gridHint}>
                  Appui long → options
                </ThemedText>
              )}
            </View>

            <View style={styles.grid}>
              {/* Add photo tile */}
              <Pressable style={styles.addTile} onPress={pickAndUpload}>
                <Ionicons name="add-circle-outline" size={32} color="#A7AD9A" />
                <ThemedText style={styles.addTileText}>Ajouter{'\n'}des photos</ThemedText>
              </Pressable>

              {/* Photo tiles */}
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={[styles.photoTile, photo.is_cover && styles.photoTileCover]}
                  onLongPress={() =>
                    Alert.alert(
                      photo.is_cover ? 'Photo de couverture' : 'Photo',
                      'Que voulez-vous faire ?',
                      [
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
  title: { fontSize: 34, fontWeight: '800', color: '#1c1535' },
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
