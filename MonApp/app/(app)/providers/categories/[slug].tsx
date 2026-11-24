import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Switch,
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
import { MADRICHIM_HATAN, MADRICHOT_KALA, MIKVES } from '@/data/officiants';
import { categoryDef, categoryLabel, normalizeCategory, prestaPhoto } from '@/lib/presta-categories';
import {
  activeFilterCount, applyPrestaFilters, cityCounts, EMPTY_FILTERS,
  normalizeCity, SORT_OPTIONS, startingPrice, type PrestaFilters,
} from '@/lib/presta-filters';
import { prestatairesApi } from '@/services/auth/api';

// Mariage juif : l'essentiel de la catégorie, ce sont les guides et services
// religieux référencés dans l'app. Ils passent avant les prestataires inscrits,
// pour que la page ne soit jamais vide.
const JEWISH_GUIDES = [
  { key: 'kala', emoji: '👰', titre: 'Madrichot Kala', sous: `${MADRICHOT_KALA.length} madrichot en France & Israël`, href: '/(app)/rabbins?tab=kala' },
  { key: 'hatan', emoji: '🤵', titre: 'Madrichim Hatan', sous: `${MADRICHIM_HATAN.length} madrichim référencés`, href: '/(app)/rabbins?tab=hatan' },
  { key: 'mikve', emoji: '💧', titre: 'Mikvés', sous: `${MIKVES.length} mikvés, adresse et itinéraire`, href: '/(app)/rabbins?tab=mikve' },
  { key: 'chabbat', emoji: '🕯️', titre: 'Chabbat Hattan', sous: 'Organiser le chabbat avant le mariage', href: '/(app)/chabbat-hattan' },
] as const;

// Mots qui signalent un prestataire casher même hors catégorie « juif »
// (traiteur casher, pâtissier sous surveillance…).
const KOSHER_WORDS = ['casher', 'cacher', 'kasher', 'kosher', 'beth din', 'beit din', 'loubavitch', 'glatt'];

/** Villes proposées en raccourci sous la recherche (les plus fournies). */
const QUICK_CITIES = 6;

const fmtPrice = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;

type Provider = {
  user_id: number;
  business_name: string;
  category: string;
  location_city?: string;
  rating?: number;
  price_min?: number;
  price_max?: number;
  price_range?: string;
  description?: string;
  cover_url?: string;
  avatar_url?: string;
  is_partner?: boolean;
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
  const [filters, setFilters] = useState<PrestaFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const patch = (p: Partial<PrestaFilters>) => setFilters((f) => ({ ...f, ...p }));
  const toggleCity = (key: string) =>
    setFilters((f) => ({ ...f, cities: f.cities.includes(key) ? f.cities.filter((c) => c !== key) : [...f.cities, key] }));

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    prestatairesApi
      .list(user?.accessToken, { limit: 2000 })
      .then((res) => {
        if (!res?.success || !Array.isArray(res.data)) return;
        // Chaque prestataire est rangé dans UNE catégorie officielle
        // (lib/presta-categories) : plus de correspondance approximative.
        const target = normalizeCategory(slug);
        const filtered = (res.data as Provider[]).filter((p) => {
          if (normalizeCategory(p.category) === target) return true;
          if (slug !== 'juif') return false;
          const text = `${p.business_name ?? ''} ${p.description ?? ''}`.toLowerCase();
          return KOSHER_WORDS.some((w) => text.includes(w));
        });
        setAllProviders(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.accessToken, slug]);

  const cities = useMemo(() => cityCounts(allProviders.map((p) => p.location_city)), [allProviders]);

  // Raccourcis : les villes les plus fournies + celles déjà cochées dans le panneau.
  const quickCities = useMemo(() => {
    const top = cities.slice(0, QUICK_CITIES);
    const extra = cities.filter((c) => filters.cities.includes(c.key) && !top.includes(c));
    return [...extra, ...top];
  }, [cities, filters.cities]);

  const filtered = useMemo(() => applyPrestaFilters(allProviders, filters), [allProviders, filters]);
  const nbFilters = activeFilterCount(filters);
  const sortLabel = SORT_OPTIONS.find((o) => o.key === filters.sort)?.label ?? 'Pertinence';

  const label = categoryDef(slug).title;
  const isJuif = slug === 'juif';

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
          {isJuif
            ? 'Guides, officiants, mikvés & prestataires casher'
            : loading ? 'Chargement…' : `${filtered.length} prestataire${filtered.length !== 1 ? 's' : ''} trouvé${filtered.length !== 1 ? 's' : ''}`}
        </ThemedText>

        {/* Barre de recherche */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={C.textLight} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={isJuif ? 'Rechercher un prestataire casher…' : 'Rechercher par nom ou ville…'}
            placeholderTextColor={C.textLight}
            value={filters.search}
            onChangeText={(t) => patch({ search: t })}
          />
          {filters.search.length > 0 && (
            <Pressable onPress={() => patch({ search: '' })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.textLight} />
            </Pressable>
          )}
        </View>

        {/* Filtres + tri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterList}
          style={styles.subFilterScroll}
        >
          <Pressable
            style={[styles.chip, styles.cityChip, nbFilters > 0 && styles.chipActive]}
            onPress={() => setSheetOpen(true)}
          >
            <Ionicons name="options-outline" size={14} color={nbFilters > 0 ? '#fff' : C.saugeDark} />
            <ThemedText style={[styles.chipText, nbFilters > 0 && styles.chipTextActive]}>
              Filtres{nbFilters > 0 ? ` (${nbFilters})` : ''}
            </ThemedText>
          </Pressable>
          {(filters.sort === 'note_desc' || filters.sort === 'nom_asc') && (
            <Pressable style={[styles.chip, styles.cityChip, styles.chipActive]} onPress={() => patch({ sort: 'none' })}>
              <ThemedText style={[styles.chipText, styles.chipTextActive]}>{sortLabel}</ThemedText>
              <Ionicons name="close" size={13} color="#fff" />
            </Pressable>
          )}
          {!isJuif && (
            <>
              <Pressable
                style={[styles.chip, filters.sort === 'prix_asc' && styles.chipActive]}
                onPress={() => patch({ sort: filters.sort === 'prix_asc' ? 'none' : 'prix_asc' })}
              >
                <ThemedText style={[styles.chipText, filters.sort === 'prix_asc' && styles.chipTextActive]}>Prix ↑</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.chip, filters.sort === 'prix_desc' && styles.chipActive]}
                onPress={() => patch({ sort: filters.sort === 'prix_desc' ? 'none' : 'prix_desc' })}
              >
                <ThemedText style={[styles.chipText, filters.sort === 'prix_desc' && styles.chipTextActive]}>Prix ↓</ThemedText>
              </Pressable>
            </>
          )}
          <Pressable
            style={[styles.chip, filters.partnersOnly && styles.chipActive]}
            onPress={() => patch({ partnersOnly: !filters.partnersOnly })}
          >
            <ThemedText style={[styles.chipText, filters.partnersOnly && styles.chipTextActive]}>Partenaires</ThemedText>
          </Pressable>
        </ScrollView>

        {/* Villes (plusieurs possibles) */}
        {cities.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subFilterList}
            style={styles.subFilterScroll}
          >
            <Pressable
              style={[styles.chip, styles.cityChip, filters.cities.length === 0 && styles.chipActive]}
              onPress={() => patch({ cities: [] })}
            >
              <Ionicons name="location-outline" size={13} color={filters.cities.length === 0 ? '#fff' : C.sauge} />
              <ThemedText style={[styles.chipText, filters.cities.length === 0 && styles.chipTextActive]}>Toutes les villes</ThemedText>
            </Pressable>
            {quickCities.map((c) => {
              const on = filters.cities.includes(c.key);
              return (
                <Pressable key={c.key} style={[styles.chip, styles.cityChip, on && styles.chipActive]} onPress={() => toggleCity(c.key)}>
                  {on && <Ionicons name="checkmark" size={13} color="#fff" />}
                  <ThemedText style={[styles.chipText, styles.cityChipText, on && styles.chipTextActive]} numberOfLines={1}>{c.city}</ThemedText>
                  <ThemedText style={[styles.chipCount, on && styles.chipTextActive]}>{c.count}</ThemedText>
                </Pressable>
              );
            })}
            {cities.length > quickCities.length && (
              <Pressable style={[styles.chip, styles.cityChip]} onPress={() => setSheetOpen(true)}>
                <Ionicons name="add" size={14} color={C.saugeDark} />
                <ThemedText style={styles.chipText}>{cities.length - quickCities.length} autres villes</ThemedText>
              </Pressable>
            )}
          </ScrollView>
        )}

        <FilterSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          filters={filters}
          onChange={setFilters}
          cities={cities}
          resultCount={filtered.length}
          allowPrice={!isJuif}
          hasRatings={allProviders.some((p) => Number(p.rating ?? 0) > 0)}
          bottomInset={insets.bottom}
        />

        {/* Liste */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {slug === 'chabbat-hattan' && (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/(app)/chabbat-hattan' as never)}
            >
              <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
                <ThemedText style={{ fontSize: 24, lineHeight: 30 }}>🕯️</ThemedText>
              </View>
              <View style={styles.cardBody}>
                <ThemedText style={styles.cardTitle}>Organiser le Chabbat Hattan</ThemedText>
                <ThemedText style={styles.cardCateg}>Guide, déroulé et liste des choses à prévoir</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textLight} />
            </Pressable>
          )}
          {isJuif && (
            <>
              <ThemedText style={styles.sectionTitle}>Guides & services religieux</ThemedText>
              {JEWISH_GUIDES.map((g) => (
                <Pressable
                  key={g.key}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push(g.href as never)}
                >
                  <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
                    <ThemedText style={{ fontSize: 24, lineHeight: 30 }}>{g.emoji}</ThemedText>
                  </View>
                  <View style={styles.cardBody}>
                    <ThemedText style={styles.cardTitle}>{g.titre}</ThemedText>
                    <ThemedText style={styles.cardCateg}>{g.sous}</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                </Pressable>
              ))}
              <ThemedText style={[styles.sectionTitle, { marginTop: 14 }]}>
                Prestataires casher{!loading && filtered.length > 0 ? ` (${filtered.length})` : ''}
              </ThemedText>
            </>
          )}

          {loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={C.sauge} size="large" />
            </View>
          ) : filtered.length === 0 ? (
            isJuif ? (
              <View style={styles.juifEmpty}>
                <ThemedText style={styles.emptyText}>
                  {filters.search.trim() || nbFilters > 0
                    ? 'Aucun prestataire casher ne correspond à ta recherche.'
                    : 'Les traiteurs, DJ et photographes casher arrivent bientôt. En attendant, retrouve tous les prestataires dans l’onglet Prestataires.'}
                </ThemedText>
                <Pressable style={styles.juifEmptyBtn} onPress={() => router.push('/(app)/(tabs)/providers' as never)}>
                  <ThemedText style={styles.juifEmptyBtnText}>Voir tous les prestataires</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={32} color={C.textLight} />
                <ThemedText style={styles.emptyText}>Aucun prestataire trouvé</ThemedText>
                {filters.search.trim() || nbFilters > 0 ? (
                  <Pressable style={styles.juifEmptyBtn} onPress={() => setFilters(EMPTY_FILTERS)}>
                    <ThemedText style={styles.juifEmptyBtnText}>Effacer les filtres</ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
                    Soyez le premier à vous inscrire dans cette catégorie
                  </ThemedText>
                )}
              </View>
            )
          ) : (
            filtered.map((p) => (
              <Pressable
                key={p.user_id}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(`/(app)/providers/${p.user_id}` as never)}
              >
                {prestaPhoto(p) ? (
                  <Image source={{ uri: prestaPhoto(p)! }} style={styles.cardThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
                    <Ionicons name="business-outline" size={22} color={C.sauge} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <ThemedText style={[styles.cardTitle, { flexShrink: 1 }]} numberOfLines={2}>{p.business_name}</ThemedText>
                    {p.is_partner && (
                      <View style={styles.partnerChip}>
                        <Ionicons name="checkmark-circle" size={10} color="#fff" />
                        <ThemedText style={styles.partnerChipTxt}>Partenaire</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.cardCateg} numberOfLines={1}>
                    {categoryLabel(p.category)}{normalizeCity(p.location_city) ? ` · ${p.location_city!.trim()}` : ''}
                  </ThemedText>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={11} color="#F5A623" />
                    <ThemedText style={styles.ratingText}>{Number(p.rating ?? 0).toFixed(1)}</ThemedText>
                    {startingPrice(p) != null && (
                      <>
                        <ThemedText style={styles.dot}>·</ThemedText>
                        <ThemedText style={styles.ratingText}>À partir de {fmtPrice(startingPrice(p)!)}</ThemedText>
                      </>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textLight} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

// ─── Panneau Filtres ─────────────────────────────────────────────────────────
function FilterSheet({
  visible, onClose, filters, onChange, cities, resultCount, allowPrice, hasRatings, bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  filters: PrestaFilters;
  onChange: (f: PrestaFilters) => void;
  cities: { city: string; key: string; count: number }[];
  resultCount: number;
  allowPrice: boolean;
  /** Aucune fiche notée → pas de filtre « note minimale » (il viderait la liste). */
  hasRatings: boolean;
  bottomInset: number;
}) {
  const [cityQuery, setCityQuery] = useState('');
  const set = (p: Partial<PrestaFilters>) => onChange({ ...filters, ...p });
  const q = cityQuery.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const shownCities = q ? cities.filter((c) => c.key.includes(q)) : cities;
  const toggle = (key: string) =>
    set({ cities: filters.cities.includes(key) ? filters.cities.filter((c) => c !== key) : [...filters.cities, key] });
  const sorts = allowPrice ? SORT_OPTIONS : SORT_OPTIONS.filter((o) => !o.key.startsWith('prix'));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={sheetStyles.kav} pointerEvents="box-none">
      <View style={[sheetStyles.sheet, { paddingBottom: Math.max(bottomInset, 12) }]}>
        <View style={sheetStyles.handle} />
        <View style={sheetStyles.head}>
          <ThemedText style={sheetStyles.title}>Filtres</ThemedText>
          <Pressable onPress={() => { onChange({ ...EMPTY_FILTERS, search: filters.search }); setCityQuery(''); }} hitSlop={10}>
            <ThemedText style={sheetStyles.reset}>Réinitialiser</ThemedText>
          </Pressable>
        </View>

        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
          <ThemedText style={sheetStyles.section}>Trier par</ThemedText>
          <View style={sheetStyles.wrapRow}>
            {sorts.map((o) => {
              const on = filters.sort === o.key;
              return (
                <Pressable key={o.key} style={[styles.chip, styles.cityChip, on && styles.chipActive]} onPress={() => set({ sort: o.key })}>
                  <Ionicons name={o.icon as never} size={13} color={on ? '#fff' : C.saugeDark} />
                  <ThemedText style={[styles.chipText, on && styles.chipTextActive]}>{o.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          {allowPrice && (filters.sort === 'prix_asc' || filters.sort === 'prix_desc') && (
            <ThemedText style={sheetStyles.hint}>Les prestataires sans prix indiqué apparaissent en fin de liste.</ThemedText>
          )}

          <ThemedText style={sheetStyles.section}>Affiner</ThemedText>
          <ToggleRow label="Partenaires Oheve uniquement" sub="Réservation et paiement dans l'app" value={filters.partnersOnly} onChange={(v) => set({ partnersOnly: v })} />
          {allowPrice && <ToggleRow label="Prix indiqué" value={filters.withPrice} onChange={(v) => set({ withPrice: v })} />}
          <ToggleRow label="Avec photo" value={filters.withPhoto} onChange={(v) => set({ withPhoto: v })} />

          {hasRatings && <ThemedText style={sheetStyles.section}>Note minimale</ThemedText>}
          {hasRatings && <View style={sheetStyles.wrapRow}>
            {[0, 3, 4, 4.5].map((r) => {
              const on = filters.minRating === r;
              return (
                <Pressable key={r} style={[styles.chip, styles.cityChip, on && styles.chipActive]} onPress={() => set({ minRating: r })}>
                  {r > 0 && <Ionicons name="star" size={12} color={on ? '#fff' : '#F5A623'} />}
                  <ThemedText style={[styles.chipText, on && styles.chipTextActive]}>{r === 0 ? 'Toutes' : `${String(r).replace('.', ',')} et +`}</ThemedText>
                </Pressable>
              );
            })}
          </View>}

          <View style={sheetStyles.cityHead}>
            <ThemedText style={sheetStyles.section}>
              Villes{filters.cities.length ? ` · ${filters.cities.length} choisie${filters.cities.length > 1 ? 's' : ''}` : ''}
            </ThemedText>
            {filters.cities.length > 0 && (
              <Pressable onPress={() => set({ cities: [] })} hitSlop={10}>
                <ThemedText style={sheetStyles.reset}>Toutes</ThemedText>
              </Pressable>
            )}
          </View>
          {cities.length > 8 && (
            <View style={[styles.searchRow, { marginBottom: 8 }]}>
              <Ionicons name="search" size={15} color={C.textLight} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Chercher une ville…"
                placeholderTextColor={C.textLight}
                value={cityQuery}
                onChangeText={setCityQuery}
              />
            </View>
          )}
          {shownCities.length === 0 ? (
            <ThemedText style={sheetStyles.hint}>Aucune ville ne correspond.</ThemedText>
          ) : (
            shownCities.map((c) => {
              const on = filters.cities.includes(c.key);
              return (
                <Pressable key={c.key} style={sheetStyles.cityRow} onPress={() => toggle(c.key)}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? C.sauge : C.textLight} />
                  <ThemedText style={sheetStyles.cityName} numberOfLines={1}>{c.city}</ThemedText>
                  <ThemedText style={sheetStyles.cityCount}>{c.count}</ThemedText>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Pressable style={sheetStyles.cta} onPress={onClose}>
          <ThemedText style={sheetStyles.ctaText} numberOfLines={1}>
            {resultCount === 0 ? 'Aucun résultat' : `Voir ${resultCount} prestataire${resultCount > 1 ? 's' : ''}`}
          </ThemedText>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={sheetStyles.toggleRow} onPress={() => onChange(!value)}>
      <View style={{ flex: 1 }}>
        <ThemedText style={sheetStyles.toggleLabel} numberOfLines={1}>{label}</ThemedText>
        {!!sub && <ThemedText style={sheetStyles.hint} numberOfLines={1}>{sub}</ThemedText>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.sauge, false: C.border }} thumbColor="#fff" />
    </Pressable>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  kav: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: C.ivoire, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 20, lineHeight: 27, fontFamily: 'OheveSerif-Medium', color: C.textDark },
  reset: { fontSize: 13, fontWeight: '600', color: C.saugeDark },
  section: { fontSize: 12, fontWeight: '700', color: C.textMid, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 12, color: C.textLight, marginTop: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  toggleLabel: { fontSize: 14, color: C.textDark, fontWeight: '500' },
  cityHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  cityName: { flex: 1, fontSize: 14, color: C.textDark },
  cityCount: { fontSize: 12, color: C.textLight, flexShrink: 0 },
  cta: { backgroundColor: C.sauge, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

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
  title: { fontSize: 24, lineHeight: 31, fontFamily: 'OheveSerif-Medium', color: C.textDark, marginBottom: 2 },
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
  cityChipText: { maxWidth: 170 },
  chipCount: { fontSize: 11, color: C.textLight, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText: { fontSize: 14, color: C.textLight, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMid, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  juifEmpty: {
    alignItems: 'center', gap: 12, padding: 18,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  juifEmptyBtn: { backgroundColor: C.sauge, borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 10 },
  juifEmptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
    width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
  },
  cardThumbPlaceholder: {
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  partnerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0,
    backgroundColor: C.sauge, borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 2,
  },
  partnerChipTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
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
