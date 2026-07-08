import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { C, RADIUS } from '@/constants/OheveTheme';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ErrorBanner } from '@/components/ui/error-banner';
import { useAuth } from '@/contexts/auth-context';
import { messagingApi, prestatairesApi } from '@/services/auth/api';

const AnimatedView = Animated.createAnimatedComponent(View);

const TIPS = [
  'Les profils avec 5+ photos reçoivent 3× plus de demandes',
  'Répondre en moins de 2h augmente votre score de 15 points',
  'Ajoutez vos tarifs pour attirer des clients qualifiés',
];

type PrestataireProfile = {
  business_name?: string;
  category?: string;
  location_city?: string;
  city?: string;
  description?: string;
  instagram_url?: string;
  website_url?: string;
  price_min?: number;
  price_max?: number;
};

type Conversation = {
  id: number;
  other_nom: string;
  other_prenom: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
};

function calcCompleteness(profile: PrestataireProfile | null, photoCount: number): number {
  if (!profile) return 0;
  let score = 0;
  if (profile.business_name) score += 20;
  if (profile.category) score += 15;
  if (profile.location_city ?? profile.city) score += 15;
  if (profile.description) score += 20;
  if (profile.instagram_url) score += 10;
  if (profile.price_min != null || profile.price_max != null) score += 10;
  if (photoCount >= 3) score += 10;
  return Math.min(score, 100);
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function SkeletonLoader() {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 900 }), -1, true);
  }, [opacity]);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <AnimatedView style={[styles.skeletonCard, s]}>
      <View style={styles.skeletonLg} />
      <View style={styles.skeletonMd} />
      <View style={styles.skeletonSm} />
    </AnimatedView>
  );
}

function StatCard({
  value,
  label,
  icon,
  color,
  delay,
}: {
  value: string | number;
  label: string;
  icon: string;
  color: string;
  delay: number;
}) {
  return (
    <AnimatedView entering={FadeInDown.delay(delay).springify()} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as 'home'} size={16} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </AnimatedView>
  );
}

export function PrestataireHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PrestataireProfile | null>(null);
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: number; url: string; is_cover: boolean }[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const headerStyle = useAnimatedStyle(() => ({ opacity: 1 }));

  const loadData = useCallback(() => {
    if (!user?.accessToken) { setLoading(false); return; }
    Promise.allSettled([
      prestatairesApi.getById(user.accessToken, user.id),
      prestatairesApi.getPhotos(user.accessToken),
      messagingApi.listConversations(user.accessToken),
    ]).then(([profRes, photoRes, convRes]) => {
      if (profRes.status === 'fulfilled' && profRes.value?.success) setProfile(profRes.value.data);
      if (photoRes.status === 'fulfilled' && photoRes.value?.success && Array.isArray(photoRes.value.data)) setPortfolioPhotos(photoRes.value.data);
      if (convRes.status === 'fulfilled' && convRes.value?.success && Array.isArray(convRes.value.data)) setConversations(convRes.value.data);
      // Si rien n'a pu être chargé, on l'affiche au lieu d'échouer en silence.
      const allFailed = [profRes, photoRes, convRes].every(
        (r) => r.status !== 'fulfilled' || !r.value?.success,
      );
      if (allFailed) {
        const msg = profRes.status === 'fulfilled' ? profRes.value?.message : null;
        setLoadError(msg || 'Impossible de charger vos données. Vérifiez votre connexion.');
      } else {
        setLoadError(null);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const businessName = profile?.business_name ?? `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
  const city = profile?.location_city ?? profile?.city ?? '';
  const completeness = calcCompleteness(profile, portfolioPhotos.length);
  const unreadCount = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0);
  const recentConvs = conversations.slice(0, 3);

  const onPressConv = (id: number) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/(app)/messages/${id}` as never);
  };

  if (loading) {
    return (
      <ScreenLayout edges={['top', 'left', 'right']} contentStyle={styles.layout}>
        <View style={styles.loadingWrap}>
          <SkeletonLoader />
          <SkeletonLoader />
          <SkeletonLoader />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top', 'left', 'right']} contentStyle={styles.layout}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <AnimatedView style={[styles.header, headerStyle]}>
        <View style={styles.headerTextWrap}>
          <ThemedText style={styles.hello} numberOfLines={1} adjustsFontSizeToFit>Bonjour {user?.prenom} 👋</ThemedText>
          <ThemedText style={styles.subHello}>
            {unreadCount > 0 ? `${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}` : 'Aucun nouveau message'} · {portfolioPhotos.length} photo{portfolioPhotos.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.avatarBubble}>
            <ThemedText style={styles.avatarText}>
              {(user?.prenom?.[0] ?? '').toUpperCase()}
            </ThemedText>
          </View>
          <Pressable
            style={styles.headerIcon}
            onPress={() => router.push('/(app)/prestataire/profile-edit' as never)}
          >
            <Ionicons name="settings-outline" size={18} color={C.saugeDark} />
          </Pressable>
        </View>
      </AnimatedView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ErrorBanner message={loadError} onRetry={loadData} />

        {/* ── Hero : Profil prestataire ──────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(60).springify()} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.heroCaption}>Votre profil</ThemedText>
              <ThemedText style={styles.heroValue}>{businessName || 'Complétez votre profil'}</ThemedText>
              {profile?.category && (
                <View style={styles.categoryPill}>
                  <ThemedText style={styles.categoryPillText}>
                    {profile.category.charAt(0).toUpperCase() + profile.category.slice(1)}
                  </ThemedText>
                </View>
              )}
              {city ? (
                <View style={styles.cityRow}>
                  <Ionicons name="location-outline" size={13} color="#A09890" />
                  <ThemedText style={styles.cityText}>{city}</ThemedText>
                </View>
              ) : null}
            </View>
            <View style={styles.donutWrap}>
              <View style={styles.donutOuter}>
                <ThemedText style={styles.donutValue}>{completeness}%</ThemedText>
              </View>
              <ThemedText style={styles.donutLabel}>Profil</ThemedText>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completeness}%` }]} />
          </View>
          <ThemedText style={styles.heroHint}>
            {completeness >= 80
              ? 'Votre profil est visible par les mariés ✨'
              : `Complétez votre profil pour être visible (${completeness}%)`}
          </ThemedText>

          <View style={styles.heroPills}>
            <View style={styles.pill}>
              <Ionicons name="images-outline" size={13} color="#A7AD9A" />
              <ThemedText style={styles.pillText}>{portfolioPhotos.length} photo{portfolioPhotos.length !== 1 ? 's' : ''}</ThemedText>
            </View>
            <Pressable
              style={[styles.pill, styles.pillAction]}
              onPress={() => router.push('/(app)/prestataire/profile-edit' as never)}
            >
              <Ionicons name="pencil-outline" size={13} color="#fff" />
              <ThemedText style={styles.pillActionText}>Compléter</ThemedText>
            </Pressable>
          </View>
        </AnimatedView>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            value={portfolioPhotos.length}
            label="Photos"
            icon="images-outline"
            color={C.sauge}
            delay={100}
          />
          <StatCard
            value={conversations.length}
            label="Conversations"
            icon="chatbubble-outline"
            color={C.warning}
            delay={140}
          />
          <StatCard
            value={unreadCount}
            label="Non lus"
            icon="mail-unread-outline"
            color={C.saugeDark}
            delay={180}
          />
        </View>

        {/* ── Dernières demandes ────────────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(220).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Dernières conversations</ThemedText>
              <ThemedText style={styles.cardSub}>
                {conversations.length > 0
                  ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''} au total`
                  : 'Aucune conversation pour l\'instant'}
              </ThemedText>
            </View>
            <Pressable onPress={() => router.push('/(app)/(tabs)/messages' as never)}>
              <ThemedText style={styles.cardAction}>Voir tout</ThemedText>
            </Pressable>
          </View>

          {recentConvs.length === 0 ? (
            <View style={styles.emptyConvs}>
              <Ionicons name="chatbubbles-outline" size={32} color={C.taupe} />
              <ThemedText style={styles.emptyConvsText}>
                Les mariés vous contacteront ici
              </ThemedText>
            </View>
          ) : (
            recentConvs.map((conv) => {
              const initials = `${(conv.other_prenom?.[0] ?? '').toUpperCase()}${(conv.other_nom?.[0] ?? '').toUpperCase()}`;
              return (
                <Pressable key={conv.id} style={styles.inquiryRow} onPress={() => onPressConv(conv.id)}>
                  <View style={[styles.inquiryAvatar, conv.unread_count > 0 && styles.inquiryAvatarUnread]}>
                    <ThemedText style={styles.inquiryAvatarText}>{initials || '?'}</ThemedText>
                  </View>
                  <View style={styles.inquiryBody}>
                    <View style={styles.inquiryTop}>
                      <ThemedText style={styles.inquiryCouple} numberOfLines={1}>
                        {conv.other_prenom} {conv.other_nom}
                      </ThemedText>
                      <ThemedText style={styles.inquiryDate}>{formatDate(conv.last_message_at)}</ThemedText>
                    </View>
                    <ThemedText style={styles.inquiryExcerpt} numberOfLines={1}>
                      {conv.last_message ?? 'Nouvelle conversation'}
                    </ThemedText>
                  </View>
                  {conv.unread_count > 0 && <View style={styles.unreadDot} />}
                </Pressable>
              );
            })
          )}
        </AnimatedView>

        {/* ── Portfolio preview ─────────────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(280).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Mon portfolio</ThemedText>
              <ThemedText style={styles.cardSub}>
                {portfolioPhotos.length > 0
                  ? `${portfolioPhotos.length} photo${portfolioPhotos.length > 1 ? 's' : ''} publiée${portfolioPhotos.length > 1 ? 's' : ''}`
                  : 'Aucune photo pour l\'instant'}
              </ThemedText>
            </View>
            <Pressable onPress={() => router.push('/(app)/(tabs)/portfolio' as never)}>
              <ThemedText style={styles.cardAction}>Gérer</ThemedText>
            </Pressable>
          </View>

          <FlatList
            data={[{ id: 'add', url: '', is_cover: false }, ...portfolioPhotos.map((p) => ({ id: String(p.id), url: p.url, is_cover: p.is_cover }))]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              if (item.id === 'add') {
                return (
                  <Pressable
                    style={styles.photoAdd}
                    onPress={() => router.push('/(app)/(tabs)/portfolio' as never)}
                  >
                    <Ionicons name="add" size={28} color="#A7AD9A" />
                    <ThemedText style={styles.photoAddText}>Ajouter</ThemedText>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  style={[styles.photoThumb, item.is_cover && styles.photoThumbCover]}
                  onPress={() => router.push('/(app)/(tabs)/portfolio' as never)}
                >
                  <Image source={{ uri: item.url }} style={styles.photoImage} contentFit="cover" />
                  {item.is_cover && (
                    <View style={styles.photoCoverBadge}>
                      <Ionicons name="star" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />

          {portfolioPhotos.length === 0 && (
            <View style={styles.emptyPortfolio}>
              <Ionicons name="images-outline" size={32} color={C.taupe} />
              <ThemedText style={styles.emptyPortfolioText}>
                Ajoutez des photos pour attirer plus de mariés
              </ThemedText>
            </View>
          )}
        </AnimatedView>

        {/* ── Actions rapides ───────────────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(340).springify()} style={styles.card}>
          <ThemedText style={styles.cardTitle}>Actions rapides</ThemedText>

          {[
            {
              icon: 'pencil-outline',
              label: 'Modifier mon profil',
              sub: 'Infos, tarifs, réseaux sociaux',
              route: '/(app)/prestataire/profile-edit',
              color: C.sauge,
            },
            {
              icon: 'eye-outline',
              label: 'Voir mon profil public',
              sub: 'Tel que vu par les mariés',
              route: `/(app)/providers/${user?.id}`,
              color: C.saugeDark,
            },
            {
              icon: 'images-outline',
              label: 'Gérer mes photos',
              sub: 'Portfolio & photo de couverture',
              route: '/(app)/(tabs)/portfolio',
              color: C.warning,
            },
            {
              icon: 'chatbubble-outline',
              label: 'Tous les messages',
              sub: conversations.length > 0
                ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`
                : 'Aucune conversation',
              route: '/(app)/(tabs)/messages',
              color: C.moka,
            },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={styles.actionRow}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                router.push(action.route as never);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as 'home'} size={18} color={action.color} />
              </View>
              <View style={styles.actionBody}>
                <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
                <ThemedText style={styles.actionSub}>{action.sub}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#A09890" />
            </Pressable>
          ))}
        </AnimatedView>

        {/* ── Conseils du jour ─────────────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(400).springify()} style={[styles.card, styles.tipsCard]}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={16} color={C.warning} />
            <ThemedText style={[styles.tipTitle, { flex: 1 }]}>Conseils pour booster votre profil</ThemedText>
          </View>
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="sparkles" size={13} color={C.moka} />
              <ThemedText style={styles.tipText}>{tip}</ThemedText>
            </View>
          ))}
        </AnimatedView>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 0 },
  loadingWrap: { gap: 12, paddingTop: 8 },
  skeletonCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: C.beige,
    padding: 18,
    gap: 10,
    minHeight: 110,
    marginBottom: 12,
  },
  skeletonLg: { height: 17, width: '55%', borderRadius: 8, backgroundColor: C.taupe },
  skeletonMd: { height: 13, width: '70%', borderRadius: 8, backgroundColor: C.taupe },
  skeletonSm: { height: 11, width: '40%', borderRadius: 8, backgroundColor: C.taupe },

  scrollContent: { paddingBottom: 130, gap: 12 },

  header: {
    paddingTop: 4,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextWrap: { flex: 1, paddingRight: 10 },
  hello: { fontSize: 24, fontWeight: '800', color: C.textDark },
  subHello: { marginTop: 4, fontSize: 13, color: C.textLight },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.saugePale,
  },
  avatarText: { color: C.saugeDark, fontWeight: '700', fontSize: 16 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.beige,
  },

  heroCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    shadowColor: C.moka,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTop: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  heroCaption: { fontSize: 12, color: C.textLight, marginBottom: 4 },
  heroValue: { fontSize: 20, fontWeight: '800', color: C.textDark },
  categoryPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: C.saugePale,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryPillText: { fontSize: 11, fontWeight: '700', color: C.saugeDark },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cityText: { fontSize: 12, color: C.textLight },
  donutWrap: { alignItems: 'center', gap: 4 },
  donutOuter: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 5,
    borderColor: C.sauge,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.ivoire,
  },
  donutValue: { fontSize: 14, fontWeight: '800', color: C.textDark },
  donutLabel: { fontSize: 10, color: C.textLight, fontWeight: '600' },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: C.saugePale,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: C.sauge },
  heroHint: { fontSize: 12, color: C.textLight, marginBottom: 12 },
  heroPills: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.ivoire,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillText: { fontSize: 11, color: C.saugeDark, fontWeight: '600' },
  pillAction: { backgroundColor: C.sauge, borderColor: C.sauge },
  pillActionText: { fontSize: 11, color: C.textInvert, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: C.moka,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: C.textDark },
  statLabel: { fontSize: 11, color: C.textLight, textAlign: 'center' },

  card: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 10,
    shadowColor: C.moka,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  cardSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
  cardAction: { fontSize: 13, color: C.sauge, fontWeight: '700' },

  emptyConvs: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyConvsText: { fontSize: 13, color: C.textLight, textAlign: 'center' },

  inquiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  inquiryAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.saugePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquiryAvatarUnread: { backgroundColor: C.beige },
  inquiryAvatarText: { fontSize: 12, fontWeight: '700', color: C.saugeDark },
  inquiryBody: { flex: 1, gap: 3 },
  inquiryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  inquiryCouple: { flex: 1, fontSize: 14, fontWeight: '700', color: C.textDark },
  inquiryDate: { fontSize: 11, color: C.textLight },
  inquiryExcerpt: { fontSize: 12, color: C.textLight },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.sauge,
  },

  photoAdd: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: C.ivoire,
    borderWidth: 1.5,
    borderColor: C.taupe,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginRight: 10,
  },
  photoAddText: { fontSize: 10, color: C.sauge, fontWeight: '600' },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.beige,
    marginRight: 10,
  },
  photoThumbCover: {
    borderWidth: 2.5,
    borderColor: C.sauge,
  },
  photoImage: { width: '100%', height: '100%' },
  photoCoverBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.sauge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPortfolio: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyPortfolioText: {
    fontSize: 13,
    color: C.textLight,
    textAlign: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: { flex: 1, gap: 2 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: C.textDark },
  actionSub: { fontSize: 12, color: C.textLight },

  tipsCard: { backgroundColor: C.warningPale, borderColor: C.warning },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: C.moka },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  tipText: { flex: 1, fontSize: 13, color: C.textMid, lineHeight: 19 },
});
