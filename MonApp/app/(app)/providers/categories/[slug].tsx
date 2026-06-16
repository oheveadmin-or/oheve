import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { prestatairesApi } from '@/services/auth/api';

// Mapping : slug de l'écran → catégories backend (un slug peut matcher plusieurs valeurs)
const SLUG_TO_CATEGORIES: Record<string, string[]> = {
  photo:        ['photographe', 'photo', 'vidéaste', 'videaste'],
  traiteur:     ['traiteur'],
  salle:        ['salle', 'lieu', 'reception'],
  fleuriste:    ['fleuriste', 'décoration', 'decoration', 'fleurs'],
  musique:      ['musique', 'musicien', 'dj', 'animation'],
  beaute:       ['beaute', 'beauté', 'coiffure', 'maquillage'],
  tenues:       ['tenues', 'robe', 'costume'],
  transport:    ['transport'],
  juif:         ['juif', 'casher', 'rabbin'],
  patisserie:   ['patisserie', 'pâtisserie', 'gateau', 'gâteau'],
  planner:      ['planner', 'organisateur', 'wedding planner'],
  animation:    ['animation', 'photobooth', 'magicien'],
};

const LABELS: Record<string, string> = {
  photo:       'Photo & Vidéo',
  traiteur:    'Traiteurs',
  salle:       'Lieux de réception',
  fleuriste:   'Décoration & Fleurs',
  musique:     'Musique & Animation',
  beaute:      'Beauté',
  tenues:      'Tenues',
  transport:   'Transport',
  juif:        'Mariage Juif',
  patisserie:  'Pâtisserie',
  planner:     'Wedding Planner',
  animation:   'Animation',
};

type SortKey = 'none' | 'prix_asc' | 'prix_desc' | 'note_desc';

const SORT_OPTIONS_ALL: { key: SortKey; label: string }[] = [
  { key: 'none',      label: 'Pertinence' },
  { key: 'prix_asc',  label: 'Prix ↑' },
  { key: 'prix_desc', label: 'Prix ↓' },
  { key: 'note_desc', label: 'Mieux notés' },
];

const SORT_OPTIONS_JUIF: { key: SortKey; label: string }[] = [
  { key: 'none',      label: 'Pertinence' },
  { key: 'note_desc', label: 'Mieux notés' },
];

type Provider = {
  user_id: number;
  business_name: string;
  category: string;
  location_city?: string;
  rating?: number;
  price_min?: number;
  price_max?: number;
  description?: string;
  cover_url?: string;
};

export default function CategoryProvidersScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug: string | string[] }>();
  const slug = useMemo(
    () => (Array.isArray(slugParam) ? slugParam[0] : slugParam) ?? '',
    [slugParam]
  );
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('none');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const sortOptions = slug === 'juif' ? SORT_OPTIONS_JUIF : SORT_OPTIONS_ALL;

  useEffect(() => {
    setSortKey('none');
    setCityFilter('');
  }, [slug]);

  useEffect(() => {
    if (!user?.accessToken) { setLoading(false); return; }
    prestatairesApi
      .list(user.accessToken)
      .then((res) => {
        if (!res?.success || !Array.isArray(res.data)) return;
        const cats = SLUG_TO_CATEGORIES[slug] ?? [slug];
        const filtered = (res.data as Provider[]).filter((p) =>
          cats.some((c) => p.category?.toLowerCase().includes(c))
        );
        setAllProviders(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, slug]);

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    allProviders.forEach((p) => {
      const city = p.location_city?.trim();
      if (city) cities.add(city);
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allProviders]);

  const filtered = useMemo(() => {
    let list = [...allProviders];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.business_name?.toLowerCase().includes(q) ||
        p.location_city?.toLowerCase().includes(q)
      );
    }
    if (cityFilter) {
      list = list.filter((p) => p.location_city?.trim() === cityFilter);
    }
    if (sortKey === 'prix_asc') list.sort((a, b) => (a.price_min ?? 0) - (b.price_min ?? 0));
    else if (sortKey === 'prix_desc') list.sort((a, b) => (b.price_min ?? 0) - (a.price_min ?? 0));
    else if (sortKey === 'note_desc') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [allProviders, search, sortKey, cityFilter]);

  const label = LABELS[slug] ?? slug;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/providers');
  };

  return (
    <ScreenLayout edges={['left', 'right', 'bottom']} constrainWidth={false}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.retourBtn} onPress={goBack} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Ionicons name="arrow-back" size={20} color={C.saugeDark} />
          <ThemedText style={styles.retourText}>Retour</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Ionicons name="heart-outline" size={22} color={C.textLight} />
        </Pressable>
      </View>

      <View style={styles.wrap}>
        <ThemedText style={styles.title}>{label}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {loading ? 'Chargement…' : `${filtered.length} prestataire${filtered.length !== 1 ? 's' : ''} trouvé${filtered.length !== 1 ? 's' : ''}`}
        </ThemedText>

        {/* Barre de recherche */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={C.textLight} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Rechercher un·e ${label.toLowerCase()}...`}
            placeholderTextColor={C.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.textLight} />
            </Pressable>
          )}
        </View>

        {/* Tri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterList}
          style={styles.subFilterScroll}
        >
          {sortOptions.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.chip, sortKey === opt.key && styles.chipActive]}
              onPress={() => setSortKey(opt.key)}
            >
              <ThemedText style={[styles.chipText, sortKey === opt.key && styles.chipTextActive]}>{opt.label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Filtre ville */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterList}
          style={styles.subFilterScroll}
        >
          <Pressable
            style={[styles.chip, styles.cityChip, !cityFilter && styles.chipActive]}
            onPress={() => setCityFilter('')}
          >
            <Ionicons name="location-outline" size={13} color={!cityFilter ? '#fff' : C.sauge} />
            <ThemedText style={[styles.chipText, !cityFilter && styles.chipTextActive]}>Toutes les villes</ThemedText>
          </Pressable>
          {availableCities.map((city) => (
            <Pressable
              key={city}
              style={[styles.chip, styles.cityChip, cityFilter === city && styles.chipActive]}
              onPress={() => setCityFilter(cityFilter === city ? '' : city)}
            >
              <Ionicons name="location-outline" size={13} color={cityFilter === city ? '#fff' : C.sauge} />
              <ThemedText style={[styles.chipText, cityFilter === city && styles.chipTextActive]}>{city}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Liste */}
        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color={C.sauge} size="large" />
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={32} color={C.textLight} />
                <ThemedText style={styles.emptyText}>Aucun prestataire trouvé</ThemedText>
                <ThemedText style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
                  Soyez le premier à vous inscrire dans cette catégorie
                </ThemedText>
              </View>
            ) : (
              filtered.map((p) => (
                <Pressable
                  key={p.user_id}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push(`/(app)/providers/${p.user_id}` as never)}
                >
                  {p.cover_url ? (
                    <Image source={{ uri: p.cover_url }} style={styles.cardThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
                      <Ionicons name="business-outline" size={22} color={C.sauge} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <ThemedText style={styles.cardTitle}>{p.business_name}</ThemedText>
                    <ThemedText style={styles.cardCateg}>
                      {p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : '—'} · {p.location_city ?? '—'}
                    </ThemedText>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={11} color="#F5A623" />
                      <ThemedText style={styles.ratingText}>{Number(p.rating ?? 0).toFixed(1)}</ThemedText>
                      {p.price_min != null && (
                        <>
                          <ThemedText style={styles.dot}>·</ThemedText>
                          <ThemedText style={styles.ratingText}>À partir de {p.price_min} €</ThemedText>
                        </>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: C.ivoire,
  },
  retourBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retourText: { color: C.saugeDark, fontSize: 15, fontWeight: '600' },
  wrap: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', color: C.textDark, marginBottom: 2 },
  subtitle: { fontSize: 13, color: C.textLight, marginBottom: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },
  subFilterScroll: { marginBottom: 10, flexGrow: 0 },
  subFilterList: { gap: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.pill, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.card,
  },
  cityChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  chipText: { fontSize: 13, fontWeight: '500', color: C.textMid },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText: { fontSize: 14, color: C.textLight, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  cardThumb: {
    width: 52, height: 52, borderRadius: RADIUS.md, overflow: 'hidden',
  },
  cardThumbPlaceholder: {
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  cardCateg: { fontSize: 12, color: C.textLight },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 11, color: C.textMid },
  dot: { fontSize: 11, color: C.textLight },
  availBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: C.saugePale, borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  availText: { fontSize: 9, fontWeight: '700', color: C.saugeDark },
});
