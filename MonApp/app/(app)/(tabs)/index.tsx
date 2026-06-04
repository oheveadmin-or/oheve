import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

import { PremiumCard, DonutProgress, SectionHeader } from '@/components/home/premium-elements';
import { PrestataireHome } from '@/components/home/prestataire-home';
import { HeaderMenu } from '@/components/navigation/HeaderMenu';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { prestatairesApi } from '@/services/auth/api';
import {
  COUPLE_INSIGHTS,
  DAILY_TIPS,
  HOME_MOCK,
  INSPIRATIONS,
  PRIORITY_TASKS,
  VENDOR_SUGGESTIONS,
  VENDORS,
  WEDDING_DAY,
} from '@/data/home-dashboard-mock';
import { useAuth } from '@/contexts/auth-context';
import { getTodoTasks } from '@/lib/todo-store';
import { useHomeDashboardStore } from '@/stores/use-home-dashboard-store';

type HomeSection =
  | 'venue'
  | 'hero'
  | 'priorities'
  | 'budgetGuests'
  | 'vendors'
  | 'providerPhotos'
  | 'suggestions'
  | 'inspirations'
  | 'weather'
  | 'insights'
  | 'checklist'
  | 'countdown';

const HOME_SECTIONS: HomeSection[] = [
  'venue', 'hero', 'priorities', 'budgetGuests', 'vendors', 'providerPhotos',
  'suggestions', 'inspirations', 'weather', 'insights', 'checklist', 'countdown',
];

const QUICK_CHECKLIST = [
  { id: 'q-1', label: 'Robe' },
  { id: 'q-2', label: 'Salle' },
  { id: 'q-3', label: 'Photographe' },
  { id: 'q-4', label: 'Alliances' },
  { id: 'q-5', label: 'Voyage de noces' },
];

const AnimatedView = Animated.createAnimatedComponent(View);

const AnimatedPlaceholder = () => {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity]);
  const placeholderStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <AnimatedView style={[styles.skeletonCard, placeholderStyle]}>
      <View style={styles.skeletonLineLg} />
      <View style={styles.skeletonLineMd} />
      <View style={styles.skeletonLineSm} />
    </AnimatedView>
  );
};

function getWeddingCountdownDays(dateString: string) {
  const now = new Date();
  const target = new Date(`${dateString}T00:00:00`);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function statusBadgeColor(status: 'reserve' | 'attente' | 'devis') {
  if (status === 'reserve') return C.saugePale;
  if (status === 'attente') return C.warningPale;
  return C.beige;
}

function statusLabel(status: 'reserve' | 'attente' | 'devis') {
  if (status === 'reserve') return 'Réservé';
  if (status === 'attente') return 'En attente';
  return 'Devis reçu';
}

type ProviderPhoto = { id: number; url: string; is_cover: boolean; prestataire_name?: string; prestataire_id?: number };

export default function DashboardScreen() {
  const { user } = useAuth();
  if (user?.role === 'prestataire') return <PrestataireHome />;

  const prenom = user?.prenom ?? 'Emma';
  const countdownDays = useMemo(() => getWeddingCountdownDays(WEDDING_DAY), []);
  const [todoCompletion, setTodoCompletion] = useState({ done: 0, total: 0 });
  const [realPriorityTasks, setRealPriorityTasks] = useState<{ id: string; label: string; deadline: string; done: boolean; level: 'urgent' | 'medium' }[]>([]);
  const [providerPhotos, setProviderPhotos] = useState<ProviderPhoto[]>([]);
  const [venueProvider, setVenueProvider] = useState<{ name: string; photoUrl?: string; id?: number } | null>(null);
  const [quickChecklist, setQuickChecklist] = useState<Record<string, boolean>>({
    'q-1': true, 'q-2': true, 'q-3': false, 'q-4': false, 'q-5': false,
  });

  const loading = useHomeDashboardStore((state) => state.loading);
  const taskDone = useHomeDashboardStore((state) => state.taskDone);
  const toggleTask = useHomeDashboardStore((state) => state.toggleTask);
  const setLoading = useHomeDashboardStore((state) => state.setLoading);
  const savedSuggestionIds = useHomeDashboardStore((state) => state.savedSuggestionIds);
  const toggleSuggestionFavorite = useHomeDashboardStore((state) => state.toggleSuggestionFavorite);

  const headerOffset = useSharedValue(0);
  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(headerOffset.value, 24) }],
    opacity: 1 - Math.min(headerOffset.value / 120, 0.22),
  }));

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, [setLoading]);

  useEffect(() => {
    if (!user?.accessToken) return;
    prestatairesApi.list(user.accessToken)
      .then(async (res) => {
        if (!res?.success || !Array.isArray(res.data)) return;
        const all: ProviderPhoto[] = [];
        for (const presta of res.data.slice(0, 5)) {
          try {
            const photosRes = await prestatairesApi.getPhotos(user.accessToken, presta.user_id);
            if (photosRes?.success && Array.isArray(photosRes.data)) {
              for (const p of photosRes.data) {
                all.push({ ...p, prestataire_name: presta.business_name, prestataire_id: presta.user_id });
              }
              // Use first provider with photos as venue if category matches salle
              if (!venueProvider && photosRes.data.length > 0 && presta.category_name?.toLowerCase().includes('salle')) {
                const coverPhoto = photosRes.data.find((p: { is_cover: boolean; url: string }) => p.is_cover)?.url ?? photosRes.data[0]?.url;
                setVenueProvider({ name: presta.business_name, photoUrl: coverPhoto, id: presta.user_id });
              }
            }
          } catch { /* ignoré */ }
        }
        setProviderPhotos(all);
      })
      .catch(() => {});
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      const tasks = getTodoTasks();
      const done = tasks.filter((task) => task.done).length;
      setTodoCompletion({ done, total: tasks.length });
      const undone = tasks.filter((t) => !t.done).slice(0, 3).map((t, i) => ({
        id: t.id,
        label: t.title,
        deadline: t.category,
        done: false,
        level: (i === 0 ? 'urgent' : 'medium') as 'urgent' | 'medium',
      }));
      setRealPriorityTasks(undone);
    }, [])
  );

  const heroMotivation = useMemo(() => {
    if (HOME_MOCK.weddingProgress >= 80) return 'Vous êtes presque prêts pour le grand jour ✨';
    if (HOME_MOCK.weddingProgress >= 60) return 'Excellent rythme, continuez comme ça 🌿';
    return 'Vous avancez bien, gardez le cap 🎯';
  }, []);

  const budgetLeft = HOME_MOCK.budget.total - HOME_MOCK.budget.spent;
  const budgetProgress = Math.round((HOME_MOCK.budget.spent / HOME_MOCK.budget.total) * 100);
  const rsvpProgress = 0;

  const completeTask = useCallback((taskId: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    toggleTask(taskId);
  }, [toggleTask]);

  const toggleChecklist = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setQuickChecklist((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const renderSection = useCallback(
    (section: HomeSection, index: number) => {
      if (section === 'venue') {
        const weddingLocation = user?.wedding_address || user?.wedding_city;
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <Pressable
              style={styles.venueCard}
              onPress={() => venueProvider?.id && router.push(`/(app)/providers/${venueProvider.id}` as never)}
            >
              {venueProvider?.photoUrl ? (
                <Image source={{ uri: venueProvider.photoUrl }} style={styles.venueBg} contentFit="cover" />
              ) : (
                <View style={[styles.venueBg, { backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="business-outline" size={36} color={C.sauge} />
                </View>
              )}
              <View style={styles.venueOverlay} />
              <View style={styles.venueContent}>
                <ThemedText style={styles.venueOverline}>Mon mariage sera</ThemedText>
                {weddingLocation ? (
                  <ThemedText style={styles.venueTitle}>au {weddingLocation}</ThemedText>
                ) : (
                  <ThemedText style={styles.venueTitle}>Lieu à définir</ThemedText>
                )}
                {venueProvider && (
                  <View style={styles.venueProviderRow}>
                    <View style={styles.venueProviderBadge}>
                      <Ionicons name="star" size={11} color={C.saugeDark} />
                      <ThemedText style={styles.venueProviderName}>{venueProvider.name}</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
                  </View>
                )}
                {!weddingLocation && !venueProvider && (
                  <ThemedText style={styles.venueHint}>Complétez votre profil pour ajouter votre lieu</ThemedText>
                )}
              </View>
            </Pressable>
          </AnimatedView>
        );
      }

      if (section === 'hero') {
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.heroCaption}>Progression globale</ThemedText>
                  <ThemedText style={styles.heroValue}>{HOME_MOCK.weddingProgress}% du mariage est prêt</ThemedText>
                  <ThemedText style={styles.heroHint}>{heroMotivation}</ThemedText>
                </View>
                <DonutProgress progress={HOME_MOCK.weddingProgress} label={`${HOME_MOCK.weddingProgress}%`} />
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${HOME_MOCK.weddingProgress}%` }]} />
              </View>
              <View style={styles.heroFooter}>
                <View style={styles.pill}>
                  <Ionicons name="leaf-outline" size={13} color={C.saugeDark} />
                  <ThemedText style={styles.pillText}>Score {HOME_MOCK.weddingScore}/100</ThemedText>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="stats-chart-outline" size={13} color={C.saugeDark} />
                  <ThemedText style={styles.pillText}>Projection {HOME_MOCK.budget.predictedFinal} €</ThemedText>
                </View>
              </View>
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'priorities') {
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard>
              <SectionHeader title="Prochaines priorités" subtitle="Assistant" actionLabel="Todo" onActionPress={() => router.push('/(app)/(tabs)/todo')} />
              {realPriorityTasks.length === 0 ? (
                <View style={styles.emptyPriority}>
                  <Ionicons name="checkmark-circle-outline" size={28} color={C.sauge} />
                  <ThemedText style={styles.emptyPriorityTxt}>Toutes vos tâches sont terminées !</ThemedText>
                </View>
              ) : null}
              {realPriorityTasks.map((task) => (
                <Swipeable
                  key={task.id}
                  renderRightActions={() => (
                    <Pressable style={styles.swipeDone} onPress={() => completeTask(task.id)}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <ThemedText style={styles.swipeDoneText}>Terminé</ThemedText>
                    </Pressable>
                  )}
                >
                  <View style={[styles.priorityRow, taskDone[task.id] && styles.priorityDone]}>
                    <View style={[styles.priorityLevel, task.level === 'urgent' ? styles.priorityUrgent : styles.priorityMedium]} />
                    <View style={styles.priorityBody}>
                      <ThemedText style={styles.priorityTitle}>{task.label}</ThemedText>
                      <ThemedText style={styles.priorityDeadline}>{task.deadline}</ThemedText>
                    </View>
                    <Pressable style={styles.doneBtn} onPress={() => completeTask(task.id)}>
                      <Ionicons
                        name={taskDone[task.id] ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={C.sauge}
                      />
                    </Pressable>
                  </View>
                </Swipeable>
              ))}
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'budgetGuests') {
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.row}>
            <Pressable style={styles.half} onPress={() => router.push('/(app)/(tabs)/budget')}>
              <PremiumCard style={styles.stretch}>
                <SectionHeader title="Budget" subtitle="Vue d'ensemble" />
                <View style={styles.compactRow}>
                  <DonutProgress progress={budgetProgress} size={64} stroke={7} label={`${budgetProgress}%`} />
                  <View>
                    <ThemedText style={styles.miniKpi}>{HOME_MOCK.budget.total} €</ThemedText>
                    <ThemedText style={styles.miniHint}>{budgetLeft} € restants</ThemedText>
                    <ThemedText style={styles.miniHint}>{HOME_MOCK.budget.monthly} € ce mois</ThemedText>
                  </View>
                </View>
              </PremiumCard>
            </Pressable>

            <Pressable style={styles.half} onPress={() => router.push('/(app)/(tabs)/guests')}>
              <PremiumCard style={styles.stretch}>
                <SectionHeader title="Invités" subtitle="RSVP en direct" />
                <ThemedText style={styles.miniKpi}>0 invité</ThemedText>
                <ThemedText style={styles.miniHint}>Ajoutez vos premiers invités</ThemedText>
                <View style={styles.progressTrackLight}>
                  <View style={[styles.progressFillLight, { width: '0%' }]} />
                </View>
                <View style={styles.avatarRow}>
                  <View style={[styles.miniAvatar, { backgroundColor: C.saugePale }]}>
                    <Ionicons name="person-add-outline" size={12} color={C.sauge} />
                  </View>
                </View>
              </PremiumCard>
            </Pressable>
          </AnimatedView>
        );
      }

      if (section === 'vendors') {
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard>
              <SectionHeader title="Prestataires" subtitle="Statut des réservations" actionLabel="Voir tout" onActionPress={() => router.push('/(app)/(tabs)/providers')} />
              {VENDORS.map((vendor) => (
                <View key={vendor.id} style={styles.vendorRow}>
                  <View style={styles.vendorLeft}>
                    <View style={styles.vendorLogo}>
                      <ThemedText>{vendor.logo}</ThemedText>
                    </View>
                    <View>
                      <ThemedText style={styles.vendorName}>{vendor.name}</ThemedText>
                      <ThemedText style={styles.vendorCategory}>{vendor.category}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.vendorRight}>
                    <View style={[styles.vendorBadge, { backgroundColor: statusBadgeColor(vendor.status) }]}>
                      <ThemedText style={styles.vendorBadgeText}>{statusLabel(vendor.status)}</ThemedText>
                    </View>
                    <ThemedText style={styles.vendorDeposit}>{vendor.depositPaid ? 'Acompte versé' : 'Acompte en attente'}</ThemedText>
                  </View>
                </View>
              ))}
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'providerPhotos') {
        if (providerPhotos.length === 0) return null;
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard>
              <SectionHeader
                title="Galerie prestataires"
                subtitle="Photos de leurs réalisations"
                actionLabel="Voir tout"
                onActionPress={() => router.push('/(app)/(tabs)/providers')}
              />
              <FlatList
                data={providerPhotos}
                horizontal
                keyExtractor={(item) => `pp-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.providerPhotoCard}
                    onPress={() => item.prestataire_id && router.push(`/(app)/providers/${item.prestataire_id}` as never)}
                  >
                    <Image source={{ uri: item.url }} style={styles.providerPhotoImg} contentFit="cover" />
                    {item.prestataire_name && (
                      <View style={styles.providerPhotoLabel}>
                        <ThemedText style={styles.providerPhotoLabelText} numberOfLines={1}>
                          {item.prestataire_name}
                        </ThemedText>
                      </View>
                    )}
                    {item.is_cover && (
                      <View style={styles.providerPhotoCoverBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                )}
              />
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'suggestions') {
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard>
              <SectionHeader title="Suggestions" subtitle="Sélection pour vous" />
              <FlatList
                data={VENDOR_SUGGESTIONS}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.suggestionCard}>
                    <View style={styles.suggestionImage}>
                      <ThemedText style={styles.suggestionEmoji}>{item.image}</ThemedText>
                    </View>
                    <View style={styles.suggestionBody}>
                      <ThemedText style={styles.suggestionTitle}>{item.name}</ThemedText>
                      <ThemedText style={styles.suggestionMeta}>{item.type} · {item.style}</ThemedText>
                      <ThemedText style={styles.suggestionMeta}>{item.avgPrice} · ⭐ {item.rating}</ThemedText>
                    </View>
                    <Pressable
                      style={styles.favoriteBtn}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => undefined);
                        toggleSuggestionFavorite(item.id);
                      }}
                    >
                      <Ionicons
                        name={savedSuggestionIds.includes(item.id) ? 'heart' : 'heart-outline'}
                        size={17}
                        color={savedSuggestionIds.includes(item.id) ? C.error : C.moka}
                      />
                    </Pressable>
                  </View>
                )}
              />
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'inspirations') {
        const leftCol = INSPIRATIONS.filter((_, i) => i % 2 === 0);
        const rightCol = INSPIRATIONS.filter((_, i) => i % 2 !== 0);
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard>
              <SectionHeader title="Inspirations" subtitle="Moodboard" actionLabel="Explorer" onActionPress={() => router.push('/(app)/(tabs)/explore')} />
              <View style={styles.masonryWrap}>
                <View style={styles.masonryCol}>
                  {leftCol.map((tile) => (
                    <View key={tile.id} style={[styles.masonryCard, { backgroundColor: tile.color, minHeight: tile.tall ? 138 : 108 }]}>
                      <ThemedText style={styles.masonryEmoji}>{tile.emoji}</ThemedText>
                      <ThemedText style={styles.masonryTitle}>{tile.title}</ThemedText>
                      <ThemedText style={styles.masonrySub}>{tile.subtitle}</ThemedText>
                    </View>
                  ))}
                </View>
                <View style={styles.masonryCol}>
                  {rightCol.map((tile) => (
                    <View key={tile.id} style={[styles.masonryCard, { backgroundColor: tile.color, minHeight: tile.tall ? 138 : 108 }]}>
                      <ThemedText style={styles.masonryEmoji}>{tile.emoji}</ThemedText>
                      <ThemedText style={styles.masonryTitle}>{tile.title}</ThemedText>
                      <ThemedText style={styles.masonrySub}>{tile.subtitle}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'weather') {
        const weddingDate = new Date(`${WEDDING_DAY}T00:00:00`);
        const sevenDaysBefore = new Date(weddingDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weatherAvailableDate = sevenDaysBefore.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        const isWeatherAvailable = new Date() >= sevenDaysBefore;
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard style={styles.weatherCard}>
              <SectionHeader title="Météo du mariage" subtitle="Prévision J-7" />
              {isWeatherAvailable ? (
                <>
                  <ThemedText style={styles.weatherTemp}>{HOME_MOCK.weather.averageTemp}°C · Ensoleillé ☀️</ThemedText>
                  <ThemedText style={styles.weatherInfo}>{HOME_MOCK.weather.forecast}</ThemedText>
                  <ThemedText style={styles.weatherInfo}>{HOME_MOCK.weather.advice}</ThemedText>
                </>
              ) : (
                <>
                  <ThemedText style={styles.weatherTemp}>Prévisions disponibles le {weatherAvailableDate}</ThemedText>
                  <ThemedText style={styles.weatherInfo}>La météo réelle sera disponible 7 jours avant votre mariage.</ThemedText>
                  <ThemedText style={styles.weatherInfo}>Prévision historique : {HOME_MOCK.weather.averageTemp}°C · {HOME_MOCK.weather.forecast}</ThemedText>
                </>
              )}
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'insights') {
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard>
              <SectionHeader title="Couple insights" subtitle="Assistant" />
              {COUPLE_INSIGHTS.map((insight) => (
                <View key={insight} style={styles.insightRow}>
                  <Ionicons name="leaf-outline" size={14} color={C.sauge} />
                  <ThemedText style={styles.insightText}>{insight}</ThemedText>
                </View>
              ))}
              <View style={styles.tipCard}>
                <ThemedText style={styles.tipTitle}>Conseils du jour</ThemedText>
                {DAILY_TIPS.map((tip) => (
                  <ThemedText key={tip} style={styles.tipItem}>• {tip}</ThemedText>
                ))}
              </View>
            </PremiumCard>
          </AnimatedView>
        );
      }

      if (section === 'checklist') {
        return (
          <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
            <PremiumCard>
              <SectionHeader title="Checklist rapide" subtitle={`Avancement : ${HOME_MOCK.stressLevel}`} />
              {QUICK_CHECKLIST.map((item) => (
                <Pressable key={item.id} style={styles.checkRow} onPress={() => toggleChecklist(item.id)}>
                  <Ionicons
                    name={quickChecklist[item.id] ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={quickChecklist[item.id] ? C.sauge : C.textLight}
                  />
                  <ThemedText style={[styles.checkLabel, quickChecklist[item.id] && styles.checkLabelDone]}>
                    {item.label}
                  </ThemedText>
                </Pressable>
              ))}
              {/* Site mariage rapide */}
              <Pressable style={styles.siteRow} onPress={() => router.push('/(app)/wedding-site-builder' as never)}>
                <View style={styles.siteIcon}>
                  <Ionicons name="globe-outline" size={16} color={C.sauge} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.siteLabel}>Site internet du mariage</ThemedText>
                  <ThemedText style={styles.siteSub}>Créer & partager votre page</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textLight} />
              </Pressable>
            </PremiumCard>
          </AnimatedView>
        );
      }

      return (
        <AnimatedView entering={FadeInDown.delay(index * 60).springify()} style={styles.sectionWrap}>
          <PremiumCard style={styles.countdownCard}>
            <ThemedText style={styles.countdownOverline}>Compte à rebours</ThemedText>
            <ThemedText style={styles.countdownValue}>J-{countdownDays}</ThemedText>
            <ThemedText style={styles.countdownHint}>avant le grand jour 💍</ThemedText>
          </PremiumCard>
        </AnimatedView>
      );
    },
    [
      budgetLeft, budgetProgress, completeTask, countdownDays, heroMotivation,
      providerPhotos, quickChecklist, rsvpProgress, savedSuggestionIds,
      taskDone, toggleChecklist, toggleSuggestionFavorite,
      venueProvider, realPriorityTasks, user,
    ]
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <ScreenLayout edges={['top', 'left', 'right']} contentStyle={styles.layout}>
        <AnimatedView style={[styles.header, headerStyle]}>
          <View>
            <ThemedText style={styles.hello}>Bonjour {prenom} & Lucas</ThemedText>
            <ThemedText style={styles.subHello}>
              J-{countdownDays} · {todoCompletion.done}/{todoCompletion.total} tâches terminées
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.avatarBubble}>
              <ThemedText style={styles.avatarText}>E&L</ThemedText>
            </View>
            <Pressable style={styles.headerIcon}>
              <Ionicons name="notifications-outline" size={18} color={C.saugeDark} />
            </Pressable>
            <HeaderMenu />
          </View>
        </AnimatedView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <AnimatedPlaceholder />
            <AnimatedPlaceholder />
            <AnimatedPlaceholder />
          </View>
        ) : (
          <FlatList
            data={HOME_SECTIONS}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => { headerOffset.value = event.nativeEvent.contentOffset.y; }}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => renderSection(item, index)}
          />
        )}
      </ScreenLayout>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  layout: { gap: 6 },
  header: {
    paddingTop: 2, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  hello: { fontSize: 22, fontWeight: '800', color: C.textDark },
  subHello: { marginTop: 4, fontSize: 13, color: C.textLight },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarBubble: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: C.saugeDark, fontWeight: '700', fontSize: 12 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.beige,
  },
  loadingWrap: { gap: 12, paddingTop: 8 },
  skeletonCard: {
    borderRadius: RADIUS.lg, backgroundColor: C.beige,
    padding: 18, gap: 10, minHeight: 130,
  },
  skeletonLineLg: { height: 17, width: '58%', borderRadius: 8, backgroundColor: C.taupe },
  skeletonLineMd: { height: 13, width: '75%', borderRadius: 8, backgroundColor: C.taupe },
  skeletonLineSm: { height: 11, width: '44%', borderRadius: 8, backgroundColor: C.taupe },
  listContent: { paddingBottom: 126, gap: 12 },
  sectionWrap: { width: '100%' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  stretch: { minHeight: 190 },
  heroCard: { backgroundColor: C.card, borderColor: C.border },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, marginBottom: 14 },
  heroCaption: { fontSize: 12, color: C.textLight },
  heroValue: { marginTop: 6, fontSize: 20, color: C.textDark, fontWeight: '800', maxWidth: 210 },
  heroHint: { marginTop: 8, fontSize: 13, color: C.textMid },
  progressTrack: { height: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: C.saugePale },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: C.sauge },
  heroFooter: { marginTop: 12, gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  pill: {
    borderRadius: RADIUS.pill, backgroundColor: C.ivoire,
    paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: C.border,
  },
  pillText: { fontSize: 12, color: C.textMid, fontWeight: '600' },
  swipeDone: {
    marginTop: 6, width: 102, borderRadius: RADIUS.sm,
    backgroundColor: C.sauge, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 4,
  },
  swipeDoneText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  priorityRow: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    padding: 12, flexDirection: 'row', alignItems: 'center',
    marginTop: 8, backgroundColor: C.card,
  },
  priorityDone: { opacity: 0.5 },
  priorityLevel: { width: 4, borderRadius: 4, alignSelf: 'stretch', marginRight: 10 },
  priorityUrgent: { backgroundColor: C.error },
  priorityMedium: { backgroundColor: C.warning },
  priorityBody: { flex: 1, gap: 4 },
  priorityTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  priorityDeadline: { fontSize: 12, color: C.textLight },
  doneBtn: { paddingHorizontal: 2 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniKpi: { fontSize: 18, fontWeight: '800', color: C.textDark },
  miniHint: { fontSize: 12, color: C.textLight, marginTop: 3 },
  progressTrackLight: {
    marginTop: 10, height: 6, borderRadius: 6,
    backgroundColor: C.saugePale, overflow: 'hidden',
  },
  progressFillLight: { height: '100%', borderRadius: 6, backgroundColor: C.sauge },
  avatarRow: { marginTop: 10, flexDirection: 'row' },
  miniAvatar: {
    width: 24, height: 24, borderRadius: 12,
    marginRight: -6, borderWidth: 2, borderColor: C.card,
    backgroundColor: C.beige, alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 10, color: C.moka, fontWeight: '700' },
  vendorRow: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  vendorLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  vendorLogo: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.ivoire,
  },
  vendorName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  vendorCategory: { fontSize: 12, color: C.textLight, marginTop: 2 },
  vendorRight: { alignItems: 'flex-end', gap: 3 },
  vendorBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4 },
  vendorBadgeText: { fontSize: 11, color: C.textMid, fontWeight: '700' },
  vendorDeposit: { fontSize: 11, color: C.textLight },
  suggestionCard: {
    width: 188, borderWidth: 1, borderColor: C.border,
    borderRadius: RADIUS.lg, backgroundColor: C.card,
    marginRight: 10, overflow: 'hidden',
  },
  suggestionImage: {
    height: 94, backgroundColor: C.beige,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionEmoji: { fontSize: 38 },
  suggestionBody: { padding: 10, gap: 2 },
  suggestionTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  suggestionMeta: { fontSize: 11, color: C.textLight },
  favoriteBtn: {
    position: 'absolute', right: 8, top: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ffffffcc', alignItems: 'center', justifyContent: 'center',
  },
  masonryWrap: { flexDirection: 'row', gap: 8 },
  masonryCol: { flex: 1, gap: 8 },
  masonryCard: { borderRadius: RADIUS.md, padding: 11, justifyContent: 'flex-end' },
  masonryEmoji: { fontSize: 20, marginBottom: 6 },
  masonryTitle: { fontSize: 13, fontWeight: '700', color: C.textDark },
  masonrySub: { fontSize: 11, color: C.textMid, marginTop: 3 },
  weatherCard: { backgroundColor: C.cardAlt },
  weatherTemp: { fontSize: 22, fontWeight: '800', color: C.textDark },
  weatherInfo: { marginTop: 8, fontSize: 13, color: C.textMid },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  insightText: { flex: 1, fontSize: 13, color: C.textMid, lineHeight: 19 },
  tipCard: { marginTop: 6, borderRadius: RADIUS.md, backgroundColor: C.ivoire, padding: 12 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: C.saugeDark, marginBottom: 4 },
  tipItem: { fontSize: 12, color: C.textMid, lineHeight: 18 },
  checkRow: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 9,
  },
  checkLabel: { fontSize: 14, color: C.textDark, fontWeight: '600' },
  checkLabelDone: { color: C.textLight, textDecorationLine: 'line-through' },
  siteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  siteIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  siteLabel: { fontSize: 14, fontWeight: '600', color: C.textDark },
  siteSub: { fontSize: 11, color: C.textLight },
  countdownCard: { backgroundColor: C.saugePale, alignItems: 'center', paddingVertical: 28 },
  countdownOverline: { fontSize: 13, color: C.textLight, marginBottom: 6, letterSpacing: 1 },
  countdownValue: { fontSize: 52, fontWeight: '900', color: C.saugeDark },
  countdownHint: { fontSize: 16, color: C.textMid, marginTop: 6, fontWeight: '600' },
  providerPhotoCard: {
    width: 160, height: 130, borderRadius: RADIUS.lg,
    overflow: 'hidden', backgroundColor: C.beige,
  },
  providerPhotoImg: { width: '100%', height: '100%' },
  providerPhotoLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(61,53,48,0.55)',
    paddingHorizontal: 8, paddingVertical: 5,
  },
  providerPhotoLabelText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  providerPhotoCoverBadge: {
    position: 'absolute', top: 7, right: 7,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },
  venueCard: {
    width: '100%', height: 160, borderRadius: RADIUS.xl,
    overflow: 'hidden', position: 'relative',
  },
  venueBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  venueOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  venueContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, gap: 4,
  },
  venueOverline: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.5 },
  venueTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  venueProviderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  venueProviderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: RADIUS.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  venueProviderName: { fontSize: 12, color: '#fff', fontWeight: '700' },
  venueHint: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  emptyPriority: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 16, justifyContent: 'center',
  },
  emptyPriorityTxt: { fontSize: 14, color: C.textMid, fontWeight: '600' },
});
