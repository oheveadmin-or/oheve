import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
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
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi } from '@/services/auth/api';

const AnimatedView = Animated.createAnimatedComponent(View);

// ── Mock data (remplacé par API plus tard) ──────────────────────────────────
const MOCK_STATS = {
  viewsThisMonth: 142,
  newInquiries: 8,
  responseRate: 95,
  profileScore: 82,
  completeness: 75,
};

const MOCK_INQUIRIES = [
  {
    id: '1',
    couple: 'Emma & Lucas',
    date: '17 sep',
    excerpt: 'Bonjour, nous aimerions en savoir plus sur vos tarifs...',
    avatar: 'EL',
    unread: true,
  },
  {
    id: '2',
    couple: 'Sophie & Marc',
    date: '15 sep',
    excerpt: 'Pouvez-vous nous envoyer un devis pour notre mariage...',
    avatar: 'SM',
    unread: true,
  },
  {
    id: '3',
    couple: 'Léna & Paul',
    date: '12 sep',
    excerpt: 'Avez-vous des disponibilités pour le 14 juin prochain ?',
    avatar: 'LP',
    unread: false,
  },
];

const TIPS = [
  'Les profils avec 5+ photos reçoivent 3× plus de demandes',
  'Répondre en moins de 2h augmente votre score de 15 points',
  'Ajoutez vos tarifs pour attirer des clients qualifiés',
];

type PrestataireProfile = {
  business_name?: string;
  category?: string;
  city?: string;
  description?: string;
  photos?: { id: number; url: string; is_cover: boolean }[];
};

// ── Sous-composants ──────────────────────────────────────────────────────────

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

// ── Composant principal ──────────────────────────────────────────────────────
export function PrestataireHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PrestataireProfile | null>(null);
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: number; url: string; is_cover: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const headerOpacity = useSharedValue(1);
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  useEffect(() => {
    if (!user?.accessToken) { setLoading(false); return; }
    prestatairesApi
      .getById(user.accessToken, user.id)
      .then((res) => { if (res?.success && res.data) setProfile(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    prestatairesApi
      .getPhotos(user.accessToken)
      .then((res) => { if (res?.success && Array.isArray(res.data)) setPortfolioPhotos(res.data); })
      .catch(() => {});
  }, [user]);

  const businessName = profile?.business_name ?? `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
  const completeness = MOCK_STATS.completeness;

  const onPress = (id: string) => {
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
        <View>
          <ThemedText style={styles.hello}>Bonjour {user?.prenom} 👋</ThemedText>
          <ThemedText style={styles.subHello}>
            {MOCK_STATS.newInquiries} nouvelles demandes · {MOCK_STATS.viewsThisMonth} vues
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
        {/* ── Hero : Profil prestataire ──────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(60).springify()} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.heroCaption}>Votre profil</ThemedText>
              <ThemedText style={styles.heroValue}>{businessName}</ThemedText>
              {profile?.category && (
                <View style={styles.categoryPill}>
                  <ThemedText style={styles.categoryPillText}>
                    {profile.category.charAt(0).toUpperCase() + profile.category.slice(1)}
                  </ThemedText>
                </View>
              )}
              {profile?.city && (
                <View style={styles.cityRow}>
                  <Ionicons name="location-outline" size={13} color="#A09890" />
                  <ThemedText style={styles.cityText}>{profile.city}</ThemedText>
                </View>
              )}
            </View>
            {/* Donut completeness */}
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
            Votre profil est visible par les mariés ✨
          </ThemedText>

          <View style={styles.heroPills}>
            <View style={styles.pill}>
              <Ionicons name="sparkles-outline" size={13} color="#A7AD9A" />
              <ThemedText style={styles.pillText}>Score {MOCK_STATS.profileScore}/100</ThemedText>
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
            value={MOCK_STATS.viewsThisMonth}
            label="Vues / mois"
            icon="eye-outline"
            color={C.sauge}
            delay={100}
          />
          <StatCard
            value={MOCK_STATS.newInquiries}
            label="Demandes"
            icon="mail-outline"
            color={C.warning}
            delay={140}
          />
          <StatCard
            value={`${MOCK_STATS.responseRate}%`}
            label="Réponses"
            icon="checkmark-circle-outline"
            color={C.saugeDark}
            delay={180}
          />
        </View>

        {/* ── Dernières demandes ────────────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(220).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <ThemedText style={styles.cardTitle}>Dernières demandes</ThemedText>
              <ThemedText style={styles.cardSub}>Mariés cherchant un prestataire</ThemedText>
            </View>
            <Pressable onPress={() => router.push('/(app)/(tabs)/messages' as never)}>
              <ThemedText style={styles.cardAction}>Voir tout</ThemedText>
            </Pressable>
          </View>

          {MOCK_INQUIRIES.map((item) => (
            <Pressable key={item.id} style={styles.inquiryRow} onPress={() => onPress(item.id)}>
              <View style={[styles.inquiryAvatar, item.unread && styles.inquiryAvatarUnread]}>
                <ThemedText style={styles.inquiryAvatarText}>{item.avatar}</ThemedText>
              </View>
              <View style={styles.inquiryBody}>
                <View style={styles.inquiryTop}>
                  <ThemedText style={styles.inquiryCouple}>{item.couple}</ThemedText>
                  <ThemedText style={styles.inquiryDate}>{item.date}</ThemedText>
                </View>
                <ThemedText style={styles.inquiryExcerpt} numberOfLines={1}>
                  {item.excerpt}
                </ThemedText>
              </View>
              {item.unread && <View style={styles.unreadDot} />}
            </Pressable>
          ))}
        </AnimatedView>

        {/* ── Portfolio preview ─────────────────────────────────────── */}
        <AnimatedView entering={FadeInDown.delay(280).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <ThemedText style={styles.cardTitle}>Mon portfolio</ThemedText>
              <ThemedText style={styles.cardSub}>Photos de vos réalisations</ThemedText>
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
              sub: `${MOCK_STATS.newInquiries} conversations actives`,
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
            <ThemedText style={styles.tipTitle}>Conseils pour booster votre profil</ThemedText>
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

// ── Styles ───────────────────────────────────────────────────────────────────
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

  // Header
  header: {
    paddingTop: 4,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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

  // Hero card
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

  // Stats
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

  // Cards
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  cardSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
  cardAction: { fontSize: 13, color: C.sauge, fontWeight: '700' },

  // Inquiries
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
  inquiryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inquiryCouple: { fontSize: 14, fontWeight: '700', color: C.textDark },
  inquiryDate: { fontSize: 11, color: C.textLight },
  inquiryExcerpt: { fontSize: 12, color: C.textLight },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.sauge,
  },

  // Portfolio
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

  // Actions
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

  // Tips
  tipsCard: { backgroundColor: C.warningPale, borderColor: C.warning },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: C.moka },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  tipText: { flex: 1, fontSize: 13, color: C.textMid, lineHeight: 19 },
});
