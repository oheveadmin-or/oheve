import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { useBoutique } from '@/contexts/boutique-context';
import { API_ENDPOINTS } from '@/constants/config';

const { width: W, height: H } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────────────────────

type MainCategory =
  | 'tout'
  | 'décoration'
  | 'photos'
  | 'tenues'
  | 'fleurs'
  | 'traiteur'
  | 'musique'
  | 'souvenirs'
  | 'salle'
  | 'beaute'
  | 'transport'
  | 'juif'
  | 'chabbat-hattan'
  | 'patisserie'
  | 'planner'
  | 'animation'
  | 'autres';

type SubCategory = 'robes' | 'accessoires' | 'tenue-soiree' | 'salle-mariage' | 'chabat' | 'henne';

type Comment = { id: string; author: string; text: string; time: string };

type ProviderProfile = {
  id: string;
  name: string;
  category: string;
  instagram?: string;
  description: string;
  location?: string;
  postsCount: number;
};

type Post = {
  id: string;
  photoId?: number;
  userId?: number;
  mediaUri?: string;
  mediaType?: 'image' | 'video';
  bgColor: string;
  bgEmoji: string;
  caption: string;
  category: Exclude<MainCategory, 'tout'>;
  subCategory?: SubCategory;
  author: string;
  likes: number;
  isLiked: boolean;
  cardH: number;
  providerId?: string;
  comments: Comment[];
};

// ── Demo providers ───────────────────────────────────────────────────────────
const DEMO_PROVIDERS: Record<string, ProviderProfile> = {
  p1: {
    id: 'p1', name: 'Sophie R.', category: 'fleurs', instagram: 'sophie.fleurs',
    description: 'Fleuriste spécialisée en mariage depuis 10 ans. Créations sur mesure pour votre jour J.',
    location: 'Paris, 75', postsCount: 24,
  },
  p2: {
    id: 'p2', name: 'Léa M.', category: 'décoration', instagram: 'lea.deco.events',
    description: "Décoratrice d'intérieur & événements. Chaque mariage mérite d'être unique.",
    location: 'Lyon, 69', postsCount: 18,
  },
  p3: {
    id: 'p3', name: 'Tom V.', category: 'photos', instagram: 'tomv.photo',
    description: 'Photographe professionnel spécialisé en golden hour et instants de vie.',
    location: 'Nice, 06', postsCount: 47,
  },
  p4: {
    id: 'p4', name: 'Julie B.', category: 'traiteur', instagram: 'julieb_traiteur',
    description: 'Traiteur gastronomique casher & halal. Menus personnalisés avec produits locaux.',
    location: 'Marseille, 13', postsCount: 31,
  },
  p5: {
    id: 'p5', name: 'Emma D.', category: 'tenues', instagram: 'emmadress_couture',
    description: 'Créatrice de robes de mariée sur mesure. Chaque robe raconte une histoire.',
    location: 'Paris, 75', postsCount: 22,
  },
  p6: {
    id: 'p6', name: 'Marc L.', category: 'musique', instagram: 'marcl.jazz',
    description: 'Jazz quartet pour vos réceptions. Plus de 200 mariages animés.',
    location: 'Paris, 75', postsCount: 15,
  },
  p7: {
    id: 'p7', name: 'Clara N.', category: 'décoration', instagram: 'clara.events',
    description: 'Décoration florale et lumineuse. Spécialiste tables d\'honneur.',
    location: 'Bordeaux, 33', postsCount: 29,
  },
  p8: {
    id: 'p8', name: 'Alex P.', category: 'photos', instagram: 'alexp.mariage',
    description: 'Photographie de mariage — naturaliste et poétique.',
    location: 'Toulouse, 31', postsCount: 55,
  },
};

// ── Réels vides — les prestataires publieront leurs réalisations ─────────────
const DEMO: Post[] = [];

// ── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES: {
  key: MainCategory; label: string; emoji: string;
  subcategories?: { key: SubCategory; label: string; emoji: string }[];
}[] = [
  { key: 'tout', label: 'Tout', emoji: '✨' },
  { key: 'salle', label: 'Salle / Lieu', emoji: '💒' },
  { key: 'traiteur', label: 'Traiteur', emoji: '🍽️' },
  { key: 'photos', label: 'Photo & Vidéo', emoji: '📸' },
  { key: 'musique', label: 'Musique', emoji: '🎵' },
  { key: 'décoration', label: 'Déco', emoji: '🕯️' },
  { key: 'fleurs', label: 'Fleurs', emoji: '🌸' },
  { key: 'beaute', label: 'Beauté', emoji: '💄' },
  {
    key: 'tenues', label: 'Tenues', emoji: '👗',
    subcategories: [
      { key: 'robes', label: 'Robes de mariée', emoji: '👰' },
      { key: 'accessoires', label: 'Accessoires', emoji: '💍' },
      { key: 'tenue-soiree', label: 'Tenues de soirée', emoji: '👠' },
    ],
  },
  { key: 'transport', label: 'Transport', emoji: '🚗' },
  { key: 'juif', label: 'Mariage Juif', emoji: '✡️' },
  { key: 'chabbat-hattan', label: 'Chabbat Hattan', emoji: '🕍' },
  { key: 'patisserie', label: 'Pâtisserie', emoji: '🧁' },
  { key: 'planner', label: 'Wedding Planner', emoji: '📋' },
  { key: 'animation', label: 'Animation', emoji: '🎉' },
  { key: 'souvenirs', label: 'Souvenirs', emoji: '💝' },
  { key: 'autres', label: 'Autre', emoji: '🎊' },
];

const CAT_COLORS: Record<Exclude<MainCategory, 'tout'>, string> = {
  décoration: '#A7AD9A',
  fleurs: '#ec4899',
  photos: '#f59e0b',
  tenues: '#8b5cf6',
  traiteur: '#10b981',
  musique: '#3b82f6',
  souvenirs: '#f43f5e',
  salle: '#0891b2',
  beaute: '#d946ef',
  transport: '#6366f1',
  juif: '#a855f7',
  'chabbat-hattan': '#7c3aed',
  patisserie: '#fb7185',
  planner: '#14b8a6',
  animation: '#eab308',
  autres: '#6b7280',
};

const FEED_CACHE_KEY = '@oheve:explore_feed_cache';

// Mélange Fisher-Yates — feed « algorithme » : les réels sortent dans un ordre
// aléatoire (et non l'un après l'autre) à chaque chargement.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let nextPostId = 200;

// ── Provider Profile Modal ───────────────────────────────────────────────────
function ProviderModal({
  provider,
  posts,
  visible,
  onClose,
  onLike,
  onMessage,
}: {
  provider: ProviderProfile | null;
  posts: Post[];
  visible: boolean;
  onClose: () => void;
  onLike: (id: string) => void;
  onMessage?: (providerId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  if (!provider) return null;

  const providerPosts = posts.filter((p) => p.providerId === provider.id);
  const catColor = CAT_COLORS[provider.category as Exclude<MainCategory, 'tout'>] ?? '#A7AD9A';

  const handleInstagram = () => {
    if (provider.instagram) {
      Linking.openURL(`https://instagram.com/${provider.instagram}`).catch(() => {});
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[provStyles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={provStyles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-down" size={26} color="#3D3530" />
          </Pressable>
          <ThemedText style={provStyles.headerTitle}>Profil prestataire</ThemedText>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile block */}
          <View style={provStyles.profileBlock}>
            <View style={[provStyles.avatar, { backgroundColor: catColor }]}>
              <ThemedText style={provStyles.avatarTxt}>{provider.name[0]}</ThemedText>
            </View>
            <ThemedText style={provStyles.name}>{provider.name}</ThemedText>
            <View style={[provStyles.catBadge, { backgroundColor: catColor + '22', borderColor: catColor + '44' }]}>
              <ThemedText style={[provStyles.catBadgeTxt, { color: catColor }]}>{provider.category}</ThemedText>
            </View>
            {provider.location && (
              <View style={provStyles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#A09890" />
                <ThemedText style={provStyles.locationTxt}>{provider.location}</ThemedText>
              </View>
            )}
            <ThemedText style={provStyles.desc}>{provider.description}</ThemedText>

            {/* Stats */}
            <View style={provStyles.statsRow}>
              <View style={provStyles.stat}>
                <ThemedText style={provStyles.statNum}>{providerPosts.length}</ThemedText>
                <ThemedText style={provStyles.statLbl}>publications</ThemedText>
              </View>
              <View style={provStyles.statDivider} />
              <View style={provStyles.stat}>
                <ThemedText style={provStyles.statNum}>
                  {providerPosts.reduce((sum, p) => sum + p.likes, 0)}
                </ThemedText>
                <ThemedText style={provStyles.statLbl}>j'aimes</ThemedText>
              </View>
            </View>

            {/* Action buttons */}
            <View style={provStyles.actions}>
              {provider.instagram && (
                <Pressable style={[provStyles.actionBtn, { backgroundColor: catColor }]} onPress={handleInstagram}>
                  <Ionicons name="logo-instagram" size={16} color="#fff" />
                  <ThemedText style={provStyles.actionBtnTxt}>Instagram</ThemedText>
                </Pressable>
              )}
              <Pressable
                style={provStyles.actionBtnOutline}
                onPress={() => { onClose(); onMessage?.(provider.id); }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={catColor} />
                <ThemedText style={[provStyles.actionBtnOutlineTxt, { color: catColor }]}>Message</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Publications */}
          {providerPosts.length > 0 && (
            <View style={provStyles.postsSection}>
              <ThemedText style={provStyles.postsSectionTitle}>Publications</ThemedText>
              <View style={provStyles.postsGrid}>
                {providerPosts.map((p) => (
                  <View key={p.id} style={[provStyles.postThumb, { backgroundColor: p.bgColor }]}>
                    {p.mediaUri && p.mediaType === 'image' ? (
                      <Image source={{ uri: p.mediaUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <ThemedText style={provStyles.postThumbEmoji}>{p.bgEmoji}</ThemedText>
                    )}
                    <View style={provStyles.postThumbOverlay}>
                      <Ionicons name={p.isLiked ? 'heart' : 'heart-outline'} size={11} color="#fff" />
                      <ThemedText style={provStyles.postThumbLike}>{p.likes}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const provStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#3D3530' },
  profileBlock: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, gap: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarTxt: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: '#3D3530' },
  catBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  catBadgeTxt: { fontSize: 12, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTxt: { fontSize: 13, color: '#A09890' },
  desc: { fontSize: 14, color: '#4b5563', textAlign: 'center', lineHeight: 21 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
  stat: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#3D3530' },
  statLbl: { fontSize: 12, color: '#A09890' },
  statDivider: { width: 1, height: 28, backgroundColor: '#e5e7eb' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6, width: '100%' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12,
  },
  actionBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  actionBtnOutlineTxt: { fontWeight: '700', fontSize: 14 },
  postsSection: { paddingHorizontal: 16, paddingTop: 8 },
  postsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#3D3530', marginBottom: 10 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  postThumb: {
    width: (W - 40) / 3, height: (W - 40) / 3,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  postThumbEmoji: { fontSize: 30 },
  postThumbOverlay: {
    position: 'absolute', bottom: 4, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  postThumbLike: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

// ── Comment Sheet ────────────────────────────────────────────────────────────
function CommentSheet({
  post,
  visible,
  onClose,
  onAddComment,
}: {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const submit = () => {
    if (!post || !text.trim()) return;
    onAddComment(post.id, text.trim());
    setText('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cmtStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={cmtStyles.sheet}>
          <View style={cmtStyles.handle} />
          <ThemedText style={cmtStyles.title}>Commentaires</ThemedText>

          <ScrollView style={cmtStyles.list} showsVerticalScrollIndicator={false}>
            {post?.comments.length === 0 && (
              <ThemedText style={cmtStyles.empty}>Aucun commentaire. Sois le premier !</ThemedText>
            )}
            {post?.comments.map((c) => (
              <View key={c.id} style={cmtStyles.cmtRow}>
                <View style={cmtStyles.cmtAvatar}>
                  <ThemedText style={cmtStyles.cmtAvatarTxt}>{c.author[0]}</ThemedText>
                </View>
                <View style={cmtStyles.cmtBody}>
                  <View style={cmtStyles.cmtHeader}>
                    <ThemedText style={cmtStyles.cmtAuthor}>{c.author}</ThemedText>
                    <ThemedText style={cmtStyles.cmtTime}>{c.time}</ThemedText>
                  </View>
                  <ThemedText style={cmtStyles.cmtText}>{c.text}</ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[cmtStyles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={cmtStyles.input}
              value={text}
              onChangeText={setText}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor="#A09890"
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            <Pressable
              style={[cmtStyles.sendBtn, !text.trim() && { opacity: 0.4 }]}
              onPress={submit}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const cmtStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: H * 0.7, paddingHorizontal: 16, paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#3D3530', marginBottom: 12 },
  list: { maxHeight: H * 0.45 },
  empty: { color: '#A09890', textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  cmtRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  cmtAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center' },
  cmtAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cmtBody: { flex: 1, gap: 2 },
  cmtHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cmtAuthor: { fontSize: 13, fontWeight: '700', color: '#3D3530' },
  cmtTime: { fontSize: 11, color: '#A09890' },
  cmtText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  input: {
    flex: 1, height: 42, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 21,
    paddingHorizontal: 14, fontSize: 14, color: '#3D3530', backgroundColor: '#fafafa',
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center' },
});

// ── Reel Card ────────────────────────────────────────────────────────────────
function ReelCard({
  post,
  reelH,
  onLike,
  onComment,
  onShare,
  onOpenProvider,
}: {
  post: Post;
  reelH: number;
  onLike: (id: string) => void;
  onComment: (post: Post) => void;
  onShare: (post: Post) => void;
  onOpenProvider: (providerId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const catColor = CAT_COLORS[post.category] ?? '#A7AD9A';

  return (
    <View style={[reelStyles.card, { width: W, height: reelH }]}>
      {post.mediaUri && post.mediaType === 'video' ? (
        <View style={[StyleSheet.absoluteFill, reelStyles.videoBg]}>
          <Ionicons name="videocam" size={62} color="#fff" />
        </View>
      ) : post.mediaUri ? (
        <Image source={{ uri: post.mediaUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: post.bgColor, alignItems: 'center', justifyContent: 'center' }]}>
          <ThemedText style={reelStyles.bigEmoji}>{post.bgEmoji}</ThemedText>
        </View>
      )}
      <View style={reelStyles.gradient} />

      {/* Category badge */}
      <View style={[reelStyles.catBadge, { top: insets.top + 16, backgroundColor: catColor }]}>
        <ThemedText style={reelStyles.catBadgeTxt}>{post.category}</ThemedText>
      </View>

      {/* Right actions */}
      <View style={[reelStyles.rightCol, { bottom: insets.bottom + 90 }]}>
        <Pressable style={reelStyles.actionBtn} onPress={() => onLike(post.id)} hitSlop={12}>
          <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={30} color={post.isLiked ? '#f43f5e' : '#fff'} />
          <ThemedText style={reelStyles.actionCount}>{post.likes}</ThemedText>
        </Pressable>
        <Pressable style={reelStyles.actionBtn} onPress={() => onComment(post)} hitSlop={12}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          <ThemedText style={reelStyles.actionCount}>{post.comments.length || 'Commenter'}</ThemedText>
        </Pressable>
        <Pressable style={reelStyles.actionBtn} onPress={() => onShare(post)} hitSlop={12}>
          <Ionicons name="share-social-outline" size={26} color="#fff" />
          <ThemedText style={reelStyles.actionCount}>Partager</ThemedText>
        </Pressable>
      </View>

      {/* Bottom info — author + caption, tappable to open provider */}
      <Pressable
        style={[reelStyles.bottomInfo, { bottom: insets.bottom + 90 }]}
        onPress={() => {
          if (post.userId) router.push(`/(app)/providers/${post.userId}` as never);
          else if (post.providerId) onOpenProvider(post.providerId);
        }}
        hitSlop={8}
      >
        <View style={reelStyles.authorRow}>
          <View style={[reelStyles.avatar, { backgroundColor: catColor }]}>
            <ThemedText style={reelStyles.avatarTxt}>{post.author[0]}</ThemedText>
          </View>
          <ThemedText style={reelStyles.author}>{post.author}</ThemedText>
          {post.providerId && (
            <View style={reelStyles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#A7AD9A" />
            </View>
          )}
        </View>
        <ThemedText style={reelStyles.caption} numberOfLines={2}>{post.caption}</ThemedText>
      </Pressable>
    </View>
  );
}

const reelStyles = StyleSheet.create({
  card: { position: 'relative', backgroundColor: '#000', overflow: 'hidden' },
  bigEmoji: { fontSize: 96 },
  gradient: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.22)' },
  catBadge: {
    position: 'absolute', left: 16,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
  },
  catBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  videoBg: { backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  rightCol: { position: 'absolute', right: 16, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCount: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bottomInfo: { position: 'absolute', left: 16, right: 80, gap: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  author: { color: '#fff', fontWeight: '700', fontSize: 14 },
  verifiedBadge: { backgroundColor: '#fff', borderRadius: 10, padding: 1 },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '500' },
});

// ── Grid Card ────────────────────────────────────────────────────────────────
function GridCard({
  post,
  onLike,
  onOpen,
}: {
  post: Post;
  onLike: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const catColor = CAT_COLORS[post.category] ?? '#A7AD9A';
  return (
    <Pressable style={[gridStyles.card, { height: post.cardH }]} onPress={() => onOpen(post.id)} hitSlop={6}>
      {post.mediaUri && post.mediaType === 'video' ? (
        <View style={[StyleSheet.absoluteFill, gridStyles.videoBg]}>
          <Ionicons name="play-circle-outline" size={42} color="#fff" />
        </View>
      ) : post.mediaUri ? (
        <Image source={{ uri: post.mediaUri }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: post.bgColor, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }]}>
          <ThemedText style={gridStyles.emoji}>{post.bgEmoji}</ThemedText>
        </View>
      )}
      <View style={gridStyles.overlay} />
      <View style={[gridStyles.catChip, { backgroundColor: catColor }]}>
        <ThemedText style={gridStyles.catChipTxt}>{post.category}</ThemedText>
      </View>
      <View style={gridStyles.bottom}>
        <ThemedText style={gridStyles.caption} numberOfLines={2}>{post.caption}</ThemedText>
        <View style={gridStyles.footerRow}>
          <ThemedText style={gridStyles.author} numberOfLines={1}>{post.author}</ThemedText>
          <Pressable style={gridStyles.likeBtn} onPress={(e) => { e.stopPropagation(); onLike(post.id); }} hitSlop={12}>
            <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={13} color={post.isLiked ? '#f43f5e' : 'rgba(255,255,255,0.8)'} />
            <ThemedText style={gridStyles.likeCount}>{post.likes}</ThemedText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const gridStyles = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 10, position: 'relative' },
  videoBg: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 52 },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14 },
  catChip: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  catChipTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14, gap: 4,
  },
  caption: { color: '#fff', fontSize: 11, fontWeight: '600', lineHeight: 14 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  author: { color: 'rgba(255,255,255,0.75)', fontSize: 10, flex: 1 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 4, paddingVertical: 4, marginRight: -4 },
  likeCount: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600' },
});

// ── Post Detail Modal ────────────────────────────────────────────────────────
function PostDetailModal({
  post,
  visible,
  onClose,
  onLike,
  onComment,
  onShare,
  onOpenProvider,
}: {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
  onLike: (id: string) => void;
  onComment: (post: Post) => void;
  onShare: (post: Post) => void;
  onOpenProvider: (providerId: string) => void;
}) {
  if (!post) return null;
  const catColor = CAT_COLORS[post.category] ?? '#A7AD9A';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={detailStyles.card}>
          {/* Media */}
          <View style={[detailStyles.media, { backgroundColor: post.bgColor }]}>
            {post.mediaUri && post.mediaType === 'image' ? (
              <Image source={{ uri: post.mediaUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : post.mediaType === 'video' ? (
              <View style={detailStyles.videoBg}>
                <Ionicons name="play-circle-outline" size={56} color="#fff" />
                <ThemedText style={detailStyles.videoTxt}>Publication vidéo</ThemedText>
              </View>
            ) : (
              <ThemedText style={detailStyles.emoji}>{post.bgEmoji}</ThemedText>
            )}
            <View style={[detailStyles.catChip, { backgroundColor: catColor }]}>
              <ThemedText style={detailStyles.catChipTxt}>{post.category}</ThemedText>
            </View>
          </View>

          {/* Body */}
          <View style={detailStyles.body}>
            {/* Author row — tappable to open provider profile */}
            <Pressable
              style={detailStyles.authorRow}
              onPress={() => {
                if (post.userId) {
                  onClose();
                  router.push(`/(app)/providers/${post.userId}` as never);
                } else if (post.providerId) {
                  onClose();
                  onOpenProvider(post.providerId);
                }
              }}
              disabled={!post.userId && !post.providerId}
            >
              <View style={[detailStyles.avatar, { backgroundColor: catColor }]}>
                <ThemedText style={detailStyles.avatarTxt}>{post.author[0]}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={detailStyles.authorName}>{post.author}</ThemedText>
                {(post.userId || post.providerId) && (
                  <ThemedText style={detailStyles.providerHint}>Voir le profil prestataire →</ThemedText>
                )}
              </View>
              {(post.userId || post.providerId) && (
                <Ionicons name="chevron-forward" size={16} color="#A09890" />
              )}
            </Pressable>

            <ThemedText style={detailStyles.caption}>{post.caption}</ThemedText>

            {/* Actions row */}
            <View style={detailStyles.actionsRow}>
              <Pressable style={detailStyles.actionBtn} onPress={() => onLike(post.id)}>
                <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={20} color={post.isLiked ? '#f43f5e' : '#6b7280'} />
                <ThemedText style={detailStyles.actionTxt}>{post.likes} j'aimes</ThemedText>
              </Pressable>
              <Pressable style={detailStyles.actionBtn} onPress={() => { onClose(); onComment(post); }}>
                <Ionicons name="chatbubble-outline" size={18} color="#6b7280" />
                <ThemedText style={detailStyles.actionTxt}>{post.comments.length} commentaires</ThemedText>
              </Pressable>
              <Pressable style={detailStyles.actionBtn} onPress={() => onShare(post)}>
                <Ionicons name="share-social-outline" size={18} color="#6b7280" />
                <ThemedText style={detailStyles.actionTxt}>Partager</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { width: '100%', maxWidth: 420, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' },
  media: { height: 240, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  videoBg: { flex: 1, width: '100%', backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', gap: 10 },
  videoTxt: { color: '#fff', fontWeight: '700' },
  emoji: { fontSize: 88 },
  catChip: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  catChipTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: 14, gap: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  authorName: { fontSize: 14, fontWeight: '700', color: '#3D3530' },
  providerHint: { fontSize: 11, color: '#A7AD9A', marginTop: 1 },
  caption: { fontSize: 15, fontWeight: '500', color: '#1f2937', lineHeight: 22 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionTxt: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
});

// ── Create Post Modal (prestataire only) ────────────────────────────────────
function CreatePostModal({
  visible,
  onClose,
  onPublish,
}: {
  visible: boolean;
  onClose: () => void;
  onPublish: (caption: string, category: Exclude<MainCategory, 'tout'>, subCategory?: SubCategory, mediaUri?: string, mediaType?: 'image' | 'video') => void;
}) {
  const [newCaption, setNewCaption] = useState('');
  const [newCategory, setNewCategory] = useState<Exclude<MainCategory, 'tout'>>('décoration');
  const [newSubCategory, setNewSubCategory] = useState<SubCategory | undefined>();
  const [newMediaUri, setNewMediaUri] = useState<string | undefined>();
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | undefined>();

  const selectedCatDef = CATEGORIES.find((c) => c.key === newCategory);

  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setNewMediaUri(result.assets[0].uri);
      setNewMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  const handlePublish = () => {
    if (!newCaption.trim()) return;
    onPublish(newCaption.trim(), newCategory, newSubCategory, newMediaUri, newMediaType);
    setNewCaption('');
    setNewCategory('décoration');
    setNewSubCategory(undefined);
    setNewMediaUri(undefined);
    setNewMediaType(undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={createStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <ScrollView contentContainerStyle={createStyles.sheet} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={createStyles.handle} />
            <ThemedText style={createStyles.title}>Nouvelle publication</ThemedText>

            {/* Media picker */}
            <Pressable style={createStyles.mediaPicker} onPress={handlePickMedia}>
              {newMediaUri && newMediaType === 'video' ? (
                <View style={createStyles.mediaPreviewVideoBg}>
                  <Ionicons name="videocam" size={40} color="#fff" />
                  <ThemedText style={createStyles.mediaPreviewVideoTxt}>Vidéo sélectionnée</ThemedText>
                </View>
              ) : newMediaUri ? (
                <Image source={{ uri: newMediaUri }} style={createStyles.mediaPreview} contentFit="cover" />
              ) : (
                <View style={createStyles.mediaPickerEmpty}>
                  <Ionicons name="images-outline" size={36} color="#a78bfa" />
                  <ThemedText style={createStyles.mediaPickerTxt}>Ajouter une photo ou vidéo</ThemedText>
                  <ThemedText style={createStyles.mediaPickerSub}>Appuie pour choisir depuis ta galerie</ThemedText>
                </View>
              )}
            </Pressable>

            {/* Caption */}
            <ThemedText style={createStyles.fieldLabel}>Description</ThemedText>
            <TextInput
              style={createStyles.captionInput}
              value={newCaption}
              onChangeText={setNewCaption}
              placeholder="Décris ton offre, ton inspiration..."
              placeholderTextColor="#A09890"
              multiline
              numberOfLines={3}
            />

            {/* Category */}
            <ThemedText style={createStyles.fieldLabel}>Catégorie</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={createStyles.chipRow}>
              {CATEGORIES.filter((c) => c.key !== 'tout').map((c) => {
                const active = newCategory === c.key;
                const color = CAT_COLORS[c.key as Exclude<MainCategory, 'tout'>];
                return (
                  <Pressable
                    key={c.key}
                    style={[createStyles.chip, active && { backgroundColor: color, borderColor: color }]}
                    onPress={() => { setNewCategory(c.key as Exclude<MainCategory, 'tout'>); setNewSubCategory(undefined); }}
                  >
                    <ThemedText style={createStyles.chipEmoji}>{c.emoji}</ThemedText>
                    <ThemedText style={[createStyles.chipLbl, active && { color: '#fff' }]}>{c.label}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Subcategory */}
            {selectedCatDef?.subcategories && (
              <>
                <ThemedText style={createStyles.fieldLabel}>Sous-catégorie</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={createStyles.chipRow}>
                  {selectedCatDef.subcategories.map((sc) => {
                    const active = newSubCategory === sc.key;
                    const color = CAT_COLORS[newCategory];
                    return (
                      <Pressable
                        key={sc.key}
                        style={[createStyles.chip, active && { backgroundColor: color, borderColor: color }]}
                        onPress={() => setNewSubCategory(sc.key as SubCategory)}
                      >
                        <ThemedText style={createStyles.chipEmoji}>{sc.emoji}</ThemedText>
                        <ThemedText style={[createStyles.chipLbl, active && { color: '#fff' }]}>{sc.label}</ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <View style={createStyles.actions}>
              <Pressable style={createStyles.btnCancel} onPress={onClose}>
                <ThemedText style={createStyles.btnCancelTxt}>Annuler</ThemedText>
              </Pressable>
              <Pressable
                style={[createStyles.btnPublish, !newCaption.trim() && { opacity: 0.4 }]}
                onPress={handlePublish}
                disabled={!newCaption.trim()}
              >
                <Ionicons name="send-outline" size={16} color="#fff" />
                <ThemedText style={createStyles.btnPublishTxt}>Publier</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, gap: 0,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#3D3530', marginBottom: 16 },
  mediaPicker: { height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#ede9fe', borderStyle: 'dashed', marginBottom: 16 },
  mediaPickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8ff', gap: 6 },
  mediaPickerTxt: { fontSize: 15, fontWeight: '700', color: '#A7AD9A' },
  mediaPickerSub: { fontSize: 12, color: '#a78bfa' },
  mediaPreview: { width: '100%', height: '100%' },
  mediaPreviewVideoBg: { flex: 1, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mediaPreviewVideoTxt: { color: '#fff', fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 8 },
  captionInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#3D3530', backgroundColor: '#fafafa',
    textAlignVertical: 'top', minHeight: 90, marginBottom: 14,
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 99, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fafafa',
  },
  chipEmoji: { fontSize: 14 },
  chipLbl: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnCancel: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnCancelTxt: { color: '#6b7280', fontWeight: '700', fontSize: 15 },
  btnPublish: {
    flex: 1, backgroundColor: '#A7AD9A', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  btnPublishTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isPrestataire = user?.role === 'prestataire' || user?.role === 'admin';
  const { reels: boutiqueReels, toggleReelLike, recordReelView } = useBoutique();
  const [posts, setPosts] = useState<Post[]>(DEMO);
  const [category, setCategory] = useState<MainCategory>('tout');
  const [subCategory, setSubCategory] = useState<SubCategory | null>(null);
  const [mode, setMode] = useState<'grid' | 'reels'>('grid');

  const [createModal, setCreateModal] = useState(false);
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentVisible, setCommentVisible] = useState(false);
  const [providerModal, setProviderModal] = useState<string | null>(null);

  const viewRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useRef((info: { viewableItems: ViewToken[] }) => {
    info.viewableItems.forEach(({ item }) => {
      const post = item as Post;
      if (post?.id?.startsWith('boutique-')) {
        recordReelView(post.id.replace('boutique-', ''));
      }
    });
  });

  // ── Catégorie backend → MainCategory ─────────────────────────────────────
  const CAT_MAP: Record<string, Exclude<MainCategory, 'tout'>> = {
    photographe: 'photos', photo: 'photos', 'photo & vidéo': 'photos', traiteur: 'traiteur', traiteurs: 'traiteur',
    fleuriste: 'fleurs', fleurs: 'fleurs',
    musique: 'musique', 'musique / dj': 'musique', 'musique & animation': 'musique', musicien: 'musique',
    décoration: 'décoration', decoration: 'décoration', deco: 'décoration',
    'salle / lieu': 'salle', 'lieux de réception': 'salle', salle: 'salle', lieu: 'salle',
    tenues: 'tenues',
    beaute: 'beaute', 'beauté': 'beaute',
    transport: 'transport',
    juif: 'juif', 'mariage juif': 'juif',
    'chabbat-hattan': 'chabbat-hattan', 'chabbat hattan': 'chabbat-hattan',
    patisserie: 'patisserie', 'pâtisserie': 'patisserie',
    planner: 'planner', 'wedding planner': 'planner', organisateur: 'planner',
    animation: 'animation',
    autre: 'autres', autres: 'autres',
  };

  // Emoji de repli quand une photo n'a pas d'image (par catégorie)
  const CAT_EMOJI: Record<Exclude<MainCategory, 'tout'>, string> = {
    décoration: '🕯️', fleurs: '🌸', photos: '📸', tenues: '👗',
    traiteur: '🍽️', musique: '🎵', souvenirs: '💝', salle: '💒',
    beaute: '💄', transport: '🚗', juif: '✡️', 'chabbat-hattan': '🕍',
    patisserie: '🧁', planner: '📋', animation: '🎉', autres: '🎊',
  };

  // ── Applique les feedPosts en fusionnant avec l'état existant et met en cache ─
  const applyFeedPosts = useCallback((feedPosts: Post[]) => {
    setPosts((prev) => {
      const existingComments = new Map(
        prev.filter((p) => p.id.startsWith('feed-')).map((p) => [p.id, p.comments])
      );
      const withoutFeed = prev.filter((post) => !post.id.startsWith('feed-'));
      const merged = feedPosts.map((p) => ({
        ...p,
        comments: existingComments.get(p.id) ?? [],
      }));
      // Mettre à jour le cache (sans les commentaires locaux)
      AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(feedPosts)).catch(() => {});
      return [...merged, ...withoutFeed];
    });
  }, []);

  // ── Charger le cache au démarrage pour que les réels ne disparaissent pas ──
  useEffect(() => {
    AsyncStorage.getItem(FEED_CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const cached = JSON.parse(raw) as Post[];
          if (Array.isArray(cached) && cached.length > 0) {
            setPosts((prev) => {
              const withoutFeed = prev.filter((p) => !p.id.startsWith('feed-'));
              return [...cached, ...withoutFeed];
            });
          }
        } catch { /* ignore */ }
      })
      .catch(() => {});
  }, []);

  // ── Fetch portfolio photos de tous les prestataires (rechargé à chaque focus) ─
  const loadFeed = useCallback(() => {
    const headers: Record<string, string> = {};
    if (user?.accessToken) headers['Authorization'] = `Bearer ${user.accessToken}`;
    fetch(`${API_ENDPOINTS.prestataireFeed}`, { headers })
      .then((r) => r.json())
      .then((json) => {
        if (!json?.success || !Array.isArray(json.data)) return;
        const feedPosts: Post[] = json.data.map((p: {
          id: number; url: string; is_cover: boolean; created_at: string;
          user_id: number; business_name: string; category: string; prenom: string; nom: string;
          like_count: number; comment_count: number; liked_by_me: boolean; caption?: string | null;
        }) => ({
          id: `feed-${p.id}`,
          photoId: p.id,
          userId: p.user_id,
          mediaUri: p.url,
          mediaType: 'image' as const,
          // Priorité à la description saisie par le prestataire lors de l'ajout ;
          // à défaut, on affiche le nom de l'établissement.
          caption: (p.caption && p.caption.trim()) || p.business_name || `${p.prenom} ${p.nom}`.trim(),
          category: CAT_MAP[p.category?.toLowerCase()?.trim()] ?? 'autres',
          author: `${p.prenom} ${p.nom ? p.nom[0] + '.' : ''}`.trim(),
          likes: p.like_count ?? 0,
          isLiked: p.liked_by_me ?? false,
          cardH: 200,
          comments: [],
          bgColor: '#F5EFE8',
          bgEmoji: CAT_EMOJI[CAT_MAP[p.category?.toLowerCase()?.trim()] ?? 'autres'],
        }));
        applyFeedPosts(shuffle(feedPosts));
      })
      .catch(() => {});
  }, [user?.accessToken, applyFeedPosts]);

  useFocusEffect(useCallback(() => { loadFeed(); }, [loadFeed]));

  // ── Sync boutique reels into explore feed ────────────────────────────────
  useEffect(() => {
    setPosts((prev) => {
      // remove stale boutique posts then re-add current ones
      const withoutBoutique = prev.filter((p) => !p.id.startsWith('boutique-'));
      const boutiquePosts: Post[] = boutiqueReels.map((r) => ({
        id: `boutique-${r.id}`,
        bgColor: '#F5EFE8',
        bgEmoji: '🎬',
        caption: r.title,
        category: 'tenues' as Exclude<MainCategory, 'tout'>,
        author: 'Boutique',
        likes: r.likes,
        isLiked: r.likedByMe,
        cardH: 200,
        comments: [],
      }));
      return [...boutiquePosts, ...withoutBoutique];
    });
  }, [boutiqueReels]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const selectedCatDef = CATEGORIES.find((c) => c.key === category);

  const filtered = posts.filter((p) => {
    if (category === 'tout') return true;
    if (p.category !== category) return false;
    if (subCategory && p.subCategory !== subCategory) return false;
    return true;
  });

  const leftCol = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 === 1);

  const openedPost = posts.find((p) => p.id === openedPostId) ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLike = useCallback((id: string) => {
    // Optimiste : on ajuste aussi le compteur (le serveur renvoie un compteur
    // qui inclut déjà notre like — ne jamais additionner les deux).
    // Les reels boutique sont ajustés par leur contexte : on ne touche que isLiked.
    const isBoutique = id.startsWith('boutique-');
    setPosts((prev) => prev.map((p) => (
      p.id === id
        ? {
            ...p,
            isLiked: !p.isLiked,
            likes: isBoutique ? p.likes : Math.max(0, p.likes + (p.isLiked ? -1 : 1)),
          }
        : p
    )));
    if (id.startsWith('boutique-')) {
      toggleReelLike(id.replace('boutique-', ''));
    } else if (id.startsWith('feed-') && user?.accessToken) {
      const post = posts.find((p) => p.id === id);
      if (post?.photoId) {
        fetch(API_ENDPOINTS.photoLike(post.photoId), {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.accessToken}` },
        })
          .then((r) => r.json())
          .then((json) => {
            if (json?.success) {
              setPosts((prev) => prev.map((p) =>
                p.id === id ? { ...p, isLiked: json.data.liked, likes: json.data.like_count } : p
              ));
            }
          })
          .catch(() => {});
      }
    }
  }, [toggleReelLike, user?.accessToken, posts]);

  const handleOpenPost = useCallback((id: string) => setOpenedPostId(id), []);

  const handleOpenComment = useCallback((post: Post) => {
    setCommentPost(post);
    setCommentVisible(true);
    // Charger les commentaires depuis le backend pour les posts du feed
    if (post.id.startsWith('feed-') && post.photoId && user?.accessToken) {
      fetch(API_ENDPOINTS.photoComments(post.photoId), {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      })
        .then((r) => r.json())
        .then((json) => {
          if (!json?.success || !Array.isArray(json.data)) return;
          const backendComments: Comment[] = json.data.map((c: {
            id: number; text: string; created_at: string; prenom: string; nom: string;
          }) => ({
            id: `bc${c.id}`,
            author: `${c.prenom} ${c.nom ? c.nom[0] + '.' : ''}`.trim(),
            text: c.text,
            time: new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          }));
          // Fusionner en gardant les commentaires optimistes (locaux non encore confirmés)
          const backendTexts = new Set(backendComments.map((c) => c.text));
          const merge = (existing: Comment[]) => [
            ...backendComments,
            ...existing.filter((c) => c.id.startsWith('c') && !backendTexts.has(c.text)),
          ];
          setPosts((prev) => prev.map((p) =>
            p.id === post.id ? { ...p, comments: merge(p.comments) } : p
          ));
          setCommentPost((prev) =>
            prev?.id === post.id ? { ...prev, comments: merge(prev.comments) } : prev
          );
        })
        .catch(() => {});
    }
  }, [user?.accessToken]);

  const handleAddComment = useCallback((postId: string, text: string) => {
    const newComment = { id: `c${Date.now()}`, author: user?.prenom || 'Moi', text, time: "maintenant" };
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
      )
    );
    setCommentPost((prev) =>
      prev?.id === postId ? { ...prev, comments: [...prev.comments, newComment] } : prev
    );
    // Persist to backend for feed posts
    if (postId.startsWith('feed-') && user?.accessToken) {
      const post = posts.find((p) => p.id === postId);
      if (post?.photoId) {
        fetch(API_ENDPOINTS.photoComments(post.photoId), {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }).catch(() => {});
      }
    }
  }, [user, posts]);

  const handleShare = useCallback(async (post: Post) => {
    try {
      await Share.share({
        message: `${post.caption} — Découvrez cette inspiration mariage ! 💍`,
        title: post.caption,
      });
    } catch {}
  }, []);

  const handleOpenProvider = useCallback((providerId: string) => {
    setProviderModal(providerId);
  }, []);

  const handlePublish = useCallback((
    caption: string,
    cat: Exclude<MainCategory, 'tout'>,
    subCat?: SubCategory,
    mediaUri?: string,
    mediaType?: 'image' | 'video'
  ) => {
    nextPostId += 1;
    const newPost: Post = {
      id: String(nextPostId),
      mediaUri,
      mediaType,
      bgColor: ['#fce7f3', '#ede9fe', '#fef3c7', '#d1fae5', '#e0f2fe'][nextPostId % 5],
      bgEmoji: ['🌸', '💐', '🕯️', '📸', '🎵'][nextPostId % 5],
      caption,
      category: cat,
      subCategory: subCat,
      author: user ? `${user.prenom} ${user.nom[0]}.` : 'Prestataire',
      likes: 0,
      isLiked: false,
      cardH: 160 + (nextPostId % 4) * 20,
      comments: [],
      providerId: user ? String(user.id) : undefined,
    };
    setPosts((prev) => [newPost, ...prev]);
    setCreateModal(false);
  }, [user]);

  const handleCategoryChange = (key: MainCategory) => {
    setCategory(key);
    setSubCategory(null);
  };

  // ── Reels height (full screen minus safe areas) ───────────────────────────
  const reelH = H;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.overline}>Découvrir</ThemedText>
          <ThemedText style={styles.title}>Explore</ThemedText>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.modeToggle}>
            <Pressable style={[styles.modeBtn, mode === 'grid' && styles.modeBtnOn]} onPress={() => setMode('grid')} hitSlop={10}>
              <Ionicons name="grid-outline" size={16} color={mode === 'grid' ? '#fff' : '#A7AD9A'} />
            </Pressable>
            <Pressable style={[styles.modeBtn, mode === 'reels' && styles.modeBtnOn]} onPress={() => setMode('reels')} hitSlop={10}>
              <Ionicons name="play-outline" size={16} color={mode === 'reels' ? '#fff' : '#A7AD9A'} />
            </Pressable>
          </View>
          {isPrestataire && (
            <Pressable style={styles.publishBtn} onPress={() => setCreateModal(true)} hitSlop={10}>
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.filterChip, category === c.key && styles.filterChipOn]}
            onPress={() => handleCategoryChange(c.key)}
            hitSlop={8}
          >
            <ThemedText style={styles.filterEmoji}>{c.emoji}</ThemedText>
            <ThemedText style={[styles.filterLabel, category === c.key && styles.filterLabelOn]}>
              {c.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Subcategory filters */}
      {selectedCatDef?.subcategories && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFiltersRow}
          style={styles.subFiltersScroll}
        >
          <Pressable
            style={[styles.subChip, !subCategory && styles.subChipOn]}
            onPress={() => setSubCategory(null)}
            hitSlop={6}
          >
            <ThemedText style={[styles.subChipLbl, !subCategory && styles.subChipLblOn]}>Tout</ThemedText>
          </Pressable>
          {selectedCatDef.subcategories.map((sc) => (
            <Pressable
              key={sc.key}
              style={[styles.subChip, subCategory === sc.key && styles.subChipOn]}
              onPress={() => setSubCategory(sc.key as SubCategory)}
              hitSlop={6}
            >
              <ThemedText style={styles.subChipEmoji}>{sc.emoji}</ThemedText>
              <ThemedText style={[styles.subChipLbl, subCategory === sc.key && styles.subChipLblOn]}>
                {sc.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Grid mode */}
      {mode === 'grid' && (
        <ScrollView
          contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <ThemedText style={styles.emptyEmoji}>✨</ThemedText>
              <ThemedText style={styles.emptyTitle}>Aucune réalisation pour l'instant</ThemedText>
              <ThemedText style={styles.emptySub}>
                {isPrestataire
                  ? 'Partagez vos plus belles réalisations pour inspirer les futurs mariés !'
                  : 'Les prestataires publieront bientôt leurs plus belles réalisations.'}
              </ThemedText>
              {isPrestataire && (
                <Pressable style={styles.emptyBtn} onPress={() => setCreateModal(true)}>
                  <ThemedText style={styles.emptyBtnTxt}>+ Publier ma première réalisation</ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.grid}>
              <View style={styles.col}>
                {leftCol.map((p) => (
                  <GridCard key={p.id} post={p} onLike={handleLike} onOpen={handleOpenPost} />
                ))}
              </View>
              <View style={styles.col}>
                {rightCol.map((p) => (
                  <GridCard key={p.id} post={p} onLike={handleLike} onOpen={handleOpenPost} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Reels mode — full screen overlay */}
      {mode === 'reels' && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]}>
          <FlatList
            ref={viewRef}
            data={filtered}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <ReelCard
                post={item}
                reelH={reelH}
                onLike={handleLike}
                onComment={handleOpenComment}
                onShare={handleShare}
                onOpenProvider={handleOpenProvider}
              />
            )}
            pagingEnabled
            snapToInterval={reelH}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            viewabilityConfig={viewabilityConfig.current}
            onViewableItemsChanged={onViewableItemsChanged.current}
            ListHeaderComponent={
              /* Invisible header so reels start below status bar */
              <View style={{ width: W, height: 0 }} />
            }
            ListEmptyComponent={
              <View style={[styles.emptyWrap, { height: reelH, backgroundColor: '#111' }]}>
                <ThemedText style={[styles.emptyEmoji]}>✨</ThemedText>
                <ThemedText style={[styles.emptyTitle, { color: '#fff' }]}>Aucune réalisation pour l'instant</ThemedText>
                <ThemedText style={[styles.emptySub, { color: 'rgba(255,255,255,0.65)', textAlign: 'center' }]}>
                  {isPrestataire
                    ? 'Publiez vos réalisations pour inspirer les mariés.'
                    : 'Les prestataires partageront bientôt leurs travaux.'}
                </ThemedText>
                {isPrestataire && (
                  <Pressable style={[styles.emptyBtn, { marginTop: 16 }]} onPress={() => { setMode('grid'); setCreateModal(true); }}>
                    <ThemedText style={styles.emptyBtnTxt}>+ Publier</ThemedText>
                  </Pressable>
                )}
              </View>
            }
          />
          {/* Close reels overlay button */}
          <Pressable
            style={[styles.reelsCloseBtn, { top: insets.top + 12 }]}
            onPress={() => setMode('grid')}
            hitSlop={12}
          >
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Modals */}
      <PostDetailModal
        post={openedPost}
        visible={!!openedPost}
        onClose={() => setOpenedPostId(null)}
        onLike={handleLike}
        onComment={handleOpenComment}
        onShare={handleShare}
        onOpenProvider={handleOpenProvider}
      />

      <CommentSheet
        post={commentPost}
        visible={commentVisible}
        onClose={() => setCommentVisible(false)}
        onAddComment={handleAddComment}
      />

      <ProviderModal
        provider={providerModal ? (DEMO_PROVIDERS[providerModal] ?? null) : null}
        posts={posts}
        visible={!!providerModal}
        onClose={() => setProviderModal(null)}
        onLike={handleLike}
        onMessage={(id) => router.push(`/(app)/messages/${id}` as never)}
      />

      {isPrestataire && (
        <CreatePostModal
          visible={createModal}
          onClose={() => setCreateModal(false)}
          onPublish={handlePublish}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  overline: { fontSize: 13, color: '#A09890', fontWeight: '500' },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: '#3D3530', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  modeToggle: { flexDirection: 'row', borderRadius: 10, borderWidth: 1.5, borderColor: '#ede9fe', overflow: 'hidden' },
  modeBtn: { padding: 7, backgroundColor: '#fafafa' },
  modeBtnOn: { backgroundColor: '#A7AD9A' },
  publishBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center' },

  // flexGrow:0 → la rangée se dimensionne à son contenu (puces + emojis) sans
  // s'étirer verticalement. Un maxHeight fixe rognait les emojis/labels selon
  // la police du téléphone.
  filtersScroll: { flexGrow: 0 },
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fafafa',
  },
  filterChipOn: { backgroundColor: '#A7AD9A', borderColor: '#A7AD9A' },
  filterEmoji: { fontSize: 13 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  filterLabelOn: { color: '#fff' },

  subFiltersScroll: { flexGrow: 0 },
  subFiltersRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  subChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 99, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa',
  },
  subChipOn: { backgroundColor: '#ede9fe', borderColor: '#A7AD9A' },
  subChipEmoji: { fontSize: 12 },
  subChipLbl: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  subChipLblOn: { color: '#A7AD9A' },

  gridContent: { paddingHorizontal: 12, paddingTop: 4 },
  grid: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#3D3530' },
  emptySub: { fontSize: 14, color: '#A09890', textAlign: 'center', paddingHorizontal: 30 },
  emptyBtn: { marginTop: 8, backgroundColor: '#A7AD9A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  reelsCloseBtn: {
    position: 'absolute', right: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20, padding: 8,
    zIndex: 20,
  },
});
