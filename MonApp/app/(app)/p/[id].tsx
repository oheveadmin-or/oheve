import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedVideo } from '@/components/feed-video';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';

type PublicPost = {
  id: number;
  url: string;
  caption: string | null;
  media_type: 'image' | 'video' | null;
  business_name: string;
  category: string;
  user_id: number;
  prenom: string;
  nom: string;
  like_count: number;
};

/**
 * Cible du deep link de partage `monapp://p/<photoId>` (page /p/:photoId du
 * site) : affiche la publication partagée en plein écran.
 */
export default function SharedPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<PublicPost | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!id) { setState('error'); return; }
    fetch(API_ENDPOINTS.photoPublic(id))
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json.data) { setPost(json.data as PublicPost); setState('ok'); }
        else setState('error');
      })
      .catch(() => setState('error'));
  }, [id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)' as never);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={goBack}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Publication partagée</ThemedText>
        <View style={{ width: 26 }} />
      </View>

      {state === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {state === 'error' && (
        <View style={styles.center}>
          <Ionicons name="image-outline" size={44} color="rgba(255,255,255,0.6)" />
          <ThemedText style={styles.errorTxt}>Cette publication n'est plus disponible.</ThemedText>
          <Pressable style={styles.homeBtn} onPress={() => router.replace('/(app)/(tabs)/explore' as never)}>
            <ThemedText style={styles.homeBtnTxt}>Découvrir l'Explore</ThemedText>
          </Pressable>
        </View>
      )}

      {state === 'ok' && post && (
        <>
          <View style={styles.media}>
            {post.media_type === 'video' ? (
              <FeedVideo
                uri={post.url}
                nativeControls
                startMuted={false}
                contentFit="contain"
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <Image source={{ uri: post.url }} style={StyleSheet.absoluteFill} contentFit="contain" />
            )}
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <ThemedText style={styles.author}>
              {post.business_name || `${post.prenom} ${post.nom}`.trim()}
              {post.category ? `  ·  ${post.category}` : ''}
            </ThemedText>
            {post.caption ? <ThemedText style={styles.caption}>{post.caption}</ThemedText> : null}
            <ThemedText style={styles.likes}>♥ {post.like_count} j'aime</ThemedText>
            <Pressable
              style={styles.providerBtn}
              onPress={() => router.push(`/(app)/providers/${post.user_id}` as never)}
            >
              <Ionicons name="person-outline" size={16} color="#fff" />
              <ThemedText style={styles.providerBtnTxt}>Voir le profil prestataire</ThemedText>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  errorTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center' },
  homeBtn: {
    marginTop: 4, backgroundColor: C.sauge, borderRadius: RADIUS.md,
    paddingHorizontal: 22, paddingVertical: 12,
  },
  homeBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  media: { flex: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  author: { color: '#fff', fontSize: 15, fontWeight: '700' },
  caption: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 20 },
  likes: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  providerBtn: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.sauge, borderRadius: 12, paddingVertical: 13,
  },
  providerBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
