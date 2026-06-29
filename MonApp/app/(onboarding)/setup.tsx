import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { GeoResult, searchCity } from '@/services/geo';
import { apiService } from '@/services/api';
import { prestatairesApi } from '@/services/auth/api';
import { initBudget } from '@/lib/budget-store';

// ── Palette Oheve ─────────────────────────────────────────────────────────────
const C = {
  bg: '#F6F3ED',
  sauge: '#9CA08A',
  saugeDark: '#7A7F6A',
  text: '#3D342F',
  secondary: '#8C867E',
  border: '#E8E3DA',
  card: '#FFFFFF',
  saugeLight: 'rgba(156,160,138,0.12)',
  saugeMid: 'rgba(156,160,138,0.25)',
};

const MOIS_LONG = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

const TODAY = new Date();
const MIN_BUDGET = 5000;
const MAX_BUDGET = 200000;

// ── Budget par catégorie (mariage juif complet) ────────────────────────────────
const BUDGET_CATEGORIES = [
  { key: 'salle',      label: 'Salle de réception', icon: '🏛️', ratio: 0.32 },
  { key: 'traiteur',   label: 'Traiteur / Buffet',   icon: '🍽️', ratio: 0.25 },
  { key: 'rabbin',     label: 'Rabbin / Cérémonie',  icon: '✡️', ratio: 0.03 },
  { key: 'dj',         label: 'DJ / Orchestre',       icon: '🎵', ratio: 0.08 },
  { key: 'photo',      label: 'Photographe',          icon: '📸', ratio: 0.07 },
  { key: 'video',      label: 'Vidéaste',             icon: '🎬', ratio: 0.05 },
  { key: 'deco',       label: 'Décoration & Fleurs',  icon: '💐', ratio: 0.08 },
  { key: 'tenues',     label: 'Tenues',               icon: '👗', ratio: 0.06 },
  { key: 'beaute',     label: 'Coiffure & Maquillage',icon: '💄', ratio: 0.03 },
  { key: 'patisserie', label: 'Pâtisserie / Gâteau',  icon: '🎂', ratio: 0.03 },
];

// ── Étapes du mariage (remplace "Type") ──────────────────────────────────────
const WEDDING_STEPS = [
  { key: 'mairie',        label: 'Mairie',          icon: '🏛️' },
  { key: 'apres_mairie',  label: 'Après Mairie',    icon: '🥂' },
  { key: 'henne',         label: 'Henné',            icon: '🪬' },
  { key: 'chabbat_hatan', label: 'Chabbat Hatan',   icon: '🕍' },
  { key: 'jour_j',        label: 'Jour J',           icon: '💍' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBudget(v: number): string {
  return v.toLocaleString('fr-FR') + ' €';
}

function parseBudgetInput(s: string): number {
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Mini calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  const [viewYear, setViewYear] = useState(TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const blanks = firstDay === 0 ? 6 : firstDay - 1;
  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isPast = (d: number) => {
    const dt = new Date(viewYear, viewMonth, d);
    dt.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return dt <= t;
  };

  const isSelected = (d: number) =>
    selectedDate?.getFullYear() === viewYear &&
    selectedDate?.getMonth() === viewMonth &&
    selectedDate?.getDate() === d;

  const cells = [
    ...Array(blanks).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];

  return (
    <View style={cal.wrap}>
      <View style={cal.nav}>
        <Pressable onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={18} color={C.sauge} />
        </Pressable>
        <ThemedText style={cal.navTitle}>
          {MOIS_LONG[viewMonth]} {viewYear}
        </ThemedText>
        <Pressable onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={C.sauge} />
        </Pressable>
      </View>
      <View style={cal.dayHeaders}>
        {JOURS.map(j => (
          <ThemedText key={j} style={cal.dayHeader}>{j}</ThemedText>
        ))}
      </View>
      <View style={cal.grid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`b${i}`} style={cal.cell} />;
          const past = isPast(d);
          const sel = isSelected(d);
          return (
            <Pressable
              key={d}
              style={[cal.cell, sel && cal.cellSel, past && cal.cellPast]}
              onPress={() => !past && onSelect(new Date(viewYear, viewMonth, d))}
              disabled={past}
            >
              <ThemedText style={[cal.cellText, sel && cal.cellTextSel, past && cal.cellTextPast]}>
                {d}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Budget Slider ─────────────────────────────────────────────────────────────
function BudgetSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [trackW, setTrackW] = useState(0);
  const trackWidthRef = useRef(0);
  const ratio = Math.max(0, Math.min(1, (value - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)));
  const fillWidth = trackW > 0 ? ratio * trackW : 0;
  const thumbLeft = trackW > 0 ? Math.max(0, ratio * trackW - 12) : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const r = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
        onChange(Math.round((MIN_BUDGET + r * (MAX_BUDGET - MIN_BUDGET)) / 1000) * 1000);
      },
      onPanResponderMove: (e) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const r = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
        onChange(Math.round((MIN_BUDGET + r * (MAX_BUDGET - MIN_BUDGET)) / 1000) * 1000);
      },
    })
  ).current;

  return (
    <View style={sl.wrap}>
      <View
        style={sl.track}
        onLayout={e => { trackWidthRef.current = e.nativeEvent.layout.width; setTrackW(e.nativeEvent.layout.width); }}
        {...panResponder.panHandlers}
      >
        <View style={sl.rail} />
        <View style={[sl.fill, { width: fillWidth }]} />
        <View style={[sl.thumb, { left: thumbLeft }]} />
      </View>
      <View style={sl.labels}>
        <ThemedText style={sl.label}>{formatBudget(MIN_BUDGET)}</ThemedText>
        <ThemedText style={sl.label}>{formatBudget(MAX_BUDGET)}</ThemedText>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function OnboardingSetupScreen() {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Date ──────────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // ── Lieu ──────────────────────────────────────────────────────────────────
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<GeoResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<GeoResult | null>(null);
  const [venueQuery, setVenueQuery] = useState('');
  const [venueResults, setVenueResults] = useState<{ id: string; name: string; city: string }[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<{ id: string; name: string; city: string } | null>(null);
  const [venueManual, setVenueManual] = useState('');

  // ── Budget ────────────────────────────────────────────────────────────────
  type BudgetMode = 'global' | 'categories';
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('global');
  const [budget, setBudget] = useState(30000);
  const [budgetInput, setBudgetInput] = useState('30000');
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>(() =>
    Object.fromEntries(BUDGET_CATEGORIES.map(c => [c.key, '']))
  );
  const [guests, setGuests] = useState(150);

  // ── Étapes ────────────────────────────────────────────────────────────────
  const [selectedSteps, setSelectedSteps] = useState<string[]>(['jour_j']);

  // ── Global ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const debouncedCityQuery = useDebouncedValue(cityQuery, 350);
  const debouncedVenueQuery = useDebouncedValue(venueQuery, 350);

  // Autocomplete ville
  useEffect(() => {
    if (!debouncedCityQuery || debouncedCityQuery.length < 3 || selectedCity) {
      setCityResults([]); return;
    }
    let cancelled = false;
    setCitySearching(true);
    searchCity(debouncedCityQuery)
      .then(r => { if (!cancelled) setCityResults(r); })
      .finally(() => { if (!cancelled) setCitySearching(false); });
    return () => { cancelled = true; };
  }, [debouncedCityQuery, selectedCity]);

  // Charger salles depuis les prestataires
  useEffect(() => {
    if (!user?.accessToken) return;
    prestatairesApi.list(user.accessToken, { category: 'salle' })
      .then((res: { success?: boolean; data?: unknown[] }) => {
        if (res?.success && Array.isArray(res.data)) {
          const salles = (res.data as Array<{ user_id: number; business_name: string; location_city?: string }>)
            .map(p => ({ id: String(p.user_id), name: p.business_name, city: p.location_city ?? '' }));
          setVenueResults(salles);
        }
      })
      .catch(() => {});
  }, [user?.accessToken]);

  // Filtrer salles selon query
  const filteredVenues = venueQuery.length >= 2
    ? venueResults.filter(v =>
        v.name.toLowerCase().includes(venueQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(venueQuery.toLowerCase())
      )
    : venueResults.slice(0, 5);

  const toggleStep = (key: string) => {
    setSelectedSteps(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Budget global total
  const budgetTotal = budgetMode === 'global'
    ? budget
    : BUDGET_CATEGORIES.reduce((sum, c) => sum + (parseBudgetInput(catBudgets[c.key]) || 0), 0);

  const budgetPerGuest = guests > 0 && budgetTotal > 0
    ? Math.round(budgetTotal / guests)
    : 0;

  const canSubmit = selectedDate !== null && selectedCity !== null;

  const handleBudgetInputEnd = () => {
    const v = parseBudgetInput(budgetInput);
    if (v >= MIN_BUDGET && v <= MAX_BUDGET) {
      setBudget(v);
      setBudgetInput(String(Math.round(v)));
    } else if (v > MAX_BUDGET) {
      setBudget(MAX_BUDGET);
      setBudgetInput(String(MAX_BUDGET));
    } else if (v > 0) {
      setBudget(MIN_BUDGET);
      setBudgetInput(String(MIN_BUDGET));
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user?.email) return;
    setSaving(true);
    try {
      const email = user.email;
      const d = selectedDate!;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const token = user?.accessToken;

      await apiService.mettreAJourDateMariage({ email, date_mariage: dateStr }, token);

      if (budgetMode === 'global') {
        await apiService.mettreAJourBudget({ email, budget_mode: 'global', budget_global: budget }, token);
        initBudget({ total: budget, mode: 'global' });
      } else {
        const cats: Record<string, number> = {};
        BUDGET_CATEGORIES.forEach(c => {
          const v = parseBudgetInput(catBudgets[c.key]);
          if (v > 0) cats[c.key] = v;
        });
        await apiService.mettreAJourBudget({ email, budget_mode: 'categories', budget_categories: cats }, token);
        const totalCat = Object.values(cats).reduce((s, v) => s + v, 0);
        initBudget({ total: totalCat, mode: 'categories', categoryAmounts: cats });
      }

      const venueName = selectedVenue?.name || venueManual.trim() || undefined;
      await apiService.mettreAJourWeddingLocation({
        email,
        wedding_location_type: 'city',
        wedding_city: selectedCity!.city ?? selectedCity!.displayName,
        wedding_country: selectedCity!.country,
        wedding_lat: selectedCity!.lat,
        wedding_lng: selectedCity!.lon,
        wedding_venue: venueName,
      }, token);

      await updateUser({
        date_mariage: dateStr,
        budget_total: budgetTotal,
        wedding_location_type: 'city',
        wedding_city: selectedCity!.city ?? selectedCity!.displayName,
        wedding_country: selectedCity!.country,
      });

      router.replace('/(app)/(tabs)');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = selectedDate
    ? `${selectedDate.getDate()} ${MOIS_LONG[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : null;

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <ThemedText style={s.title}>Parlons de votre mariage</ThemedText>
          <ThemedText style={s.subtitle}>
            Quelques informations pour personnaliser votre expérience
          </ThemedText>
        </View>

        {/* ══════════════════════════════════════════════
            📅  DATE
        ══════════════════════════════════════════════ */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <ThemedText style={s.sectionIcon}>📅</ThemedText>
            <ThemedText style={s.sectionTitle}>Date du mariage</ThemedText>
          </View>

          <Pressable
            style={[s.dateDisplay, !selectedDate && s.dateDisplayEmpty]}
            onPress={() => setShowCalendar(v => !v)}
          >
            <ThemedText style={selectedDate ? s.dateValue : s.datePlaceholder}>
              {dateLabel ?? 'Choisir une date'}
            </ThemedText>
            <View style={s.modifyBtn}>
              <ThemedText style={s.modifyBtnText}>
                {showCalendar ? 'Fermer' : selectedDate ? 'Modifier' : 'Ouvrir'}
              </ThemedText>
            </View>
          </Pressable>

          {showCalendar && (
            <MiniCalendar
              selectedDate={selectedDate}
              onSelect={d => { setSelectedDate(d); setShowCalendar(false); }}
            />
          )}
        </View>

        {/* ══════════════════════════════════════════════
            📍  LIEU
        ══════════════════════════════════════════════ */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <ThemedText style={s.sectionIcon}>📍</ThemedText>
            <ThemedText style={s.sectionTitle}>Lieu du mariage</ThemedText>
          </View>

          {/* Ville */}
          {selectedCity ? (
            <View style={s.selectedCity}>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.selectedCityName}>
                  {selectedCity.city ?? selectedCity.displayName}
                </ThemedText>
                {selectedCity.country && (
                  <ThemedText style={s.selectedCityCountry}>{selectedCity.country}</ThemedText>
                )}
              </View>
              <Pressable onPress={() => { setSelectedCity(null); setCityQuery(''); }} style={s.clearBtn}>
                <Ionicons name="close-circle" size={20} color={C.secondary} />
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={s.inputWrap}>
                <Ionicons name="search-outline" size={16} color={C.secondary} />
                <TextInput
                  style={s.input}
                  value={cityQuery}
                  onChangeText={setCityQuery}
                  placeholder="Paris, Lyon, Jérusalem, Tel Aviv…"
                  placeholderTextColor={C.secondary}
                  autoCorrect={false}
                />
                {citySearching && <ActivityIndicator size="small" color={C.sauge} />}
              </View>
              {cityResults.length > 0 && (
                <View style={s.suggestions}>
                  {cityResults.slice(0, 5).map((r, i) => (
                    <Pressable
                      key={r.displayName + i}
                      style={[s.suggestionItem, i < cityResults.length - 1 && s.suggestionBorder]}
                      onPress={() => { setSelectedCity(r); setCityQuery(''); setCityResults([]); }}
                    >
                      <ThemedText style={s.suggestionCity}>{r.city ?? 'Ville'}</ThemedText>
                      <ThemedText style={s.suggestionDetail} numberOfLines={1}>{r.displayName}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Salle — séparateur */}
          <View style={s.divider} />
          <ThemedText style={s.venueLabel}>Nom de la salle <ThemedText style={s.optional}>(optionnel)</ThemedText></ThemedText>

          {selectedVenue ? (
            <View style={s.selectedCity}>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.selectedCityName}>{selectedVenue.name}</ThemedText>
                {selectedVenue.city ? (
                  <ThemedText style={s.selectedCityCountry}>{selectedVenue.city}</ThemedText>
                ) : null}
              </View>
              <Pressable onPress={() => setSelectedVenue(null)} style={s.clearBtn}>
                <Ionicons name="close-circle" size={20} color={C.secondary} />
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={s.inputWrap}>
                <Ionicons name="business-outline" size={16} color={C.secondary} />
                <TextInput
                  style={s.input}
                  value={venueQuery}
                  onChangeText={setVenueQuery}
                  placeholder="Rechercher ou saisir un nom de salle…"
                  placeholderTextColor={C.secondary}
                />
              </View>

              {/* Salles de la BDD prestataires */}
              {filteredVenues.length > 0 && (
                <View style={s.suggestions}>
                  {filteredVenues.map((v, i) => (
                    <Pressable
                      key={v.id}
                      style={[s.suggestionItem, i < filteredVenues.length - 1 && s.suggestionBorder]}
                      onPress={() => { setSelectedVenue(v); setVenueQuery(''); }}
                    >
                      <View style={s.venueRow}>
                        <Ionicons name="business-outline" size={14} color={C.sauge} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <ThemedText style={s.suggestionCity}>{v.name}</ThemedText>
                          {v.city ? <ThemedText style={s.suggestionDetail}>{v.city}</ThemedText> : null}
                        </View>
                        <View style={s.venueBadge}>
                          <ThemedText style={s.venueBadgeText}>Partenaire</ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                  {/* Option saisie libre */}
                  {venueQuery.length >= 2 && !filteredVenues.some(v => v.name.toLowerCase() === venueQuery.toLowerCase()) && (
                    <Pressable
                      style={[s.suggestionItem]}
                      onPress={() => { setVenueManual(venueQuery); setVenueQuery(''); }}
                    >
                      <View style={s.venueRow}>
                        <Ionicons name="add-circle-outline" size={14} color={C.secondary} />
                        <ThemedText style={[s.suggestionCity, { marginLeft: 8 }]}>
                          Utiliser « {venueQuery} »
                        </ThemedText>
                      </View>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Saisie libre si pas de résultats */}
              {venueQuery.length === 0 && !selectedVenue && (
                <TextInput
                  style={[s.venueInput, { marginTop: 8 }]}
                  value={venueManual}
                  onChangeText={setVenueManual}
                  placeholder="Pavillon Dauphine, Les Salons Hoche…"
                  placeholderTextColor={C.secondary}
                />
              )}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════
            💰  BUDGET & INVITÉS
        ══════════════════════════════════════════════ */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <ThemedText style={s.sectionIcon}>💰</ThemedText>
            <ThemedText style={s.sectionTitle}>Budget & invités</ThemedText>
          </View>

          {/* Toggle global / catégories */}
          <View style={s.modeToggle}>
            <Pressable
              style={[s.modeBtn, budgetMode === 'global' && s.modeBtnActive]}
              onPress={() => setBudgetMode('global')}
            >
              <ThemedText style={[s.modeBtnText, budgetMode === 'global' && s.modeBtnTextActive]}>
                Budget global
              </ThemedText>
            </Pressable>
            <Pressable
              style={[s.modeBtn, budgetMode === 'categories' && s.modeBtnActive]}
              onPress={() => setBudgetMode('categories')}
            >
              <ThemedText style={[s.modeBtnText, budgetMode === 'categories' && s.modeBtnTextActive]}>
                Par catégorie
              </ThemedText>
            </Pressable>
          </View>

          {budgetMode === 'global' ? (
            <>
              {/* Saisie + slider */}
              <View style={s.budgetInputRow}>
                <TextInput
                  style={s.budgetInput}
                  value={budgetInput}
                  onChangeText={t => {
                    setBudgetInput(t);
                    const v = parseBudgetInput(t);
                    if (v >= MIN_BUDGET && v <= MAX_BUDGET) setBudget(v);
                  }}
                  onBlur={handleBudgetInputEnd}
                  keyboardType="number-pad"
                  placeholder="30000"
                  placeholderTextColor={C.secondary}
                />
                <ThemedText style={s.budgetCurrency}>€</ThemedText>
              </View>
              <BudgetSlider
                value={budget}
                onChange={v => { setBudget(v); setBudgetInput(String(v)); }}
              />
            </>
          ) : (
            <View style={s.catGrid}>
              {BUDGET_CATEGORIES.map(cat => (
                <View key={cat.key} style={s.catRow}>
                  <ThemedText style={s.catIcon}>{cat.icon}</ThemedText>
                  <ThemedText style={s.catLabel} numberOfLines={1}>{cat.label}</ThemedText>
                  <View style={s.catInputWrap}>
                    <TextInput
                      style={s.catInput}
                      value={catBudgets[cat.key]}
                      onChangeText={t => setCatBudgets(prev => ({ ...prev, [cat.key]: t.replace(/[^0-9]/g, '') }))}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={C.secondary}
                    />
                    <ThemedText style={s.catCurrency}>€</ThemedText>
                  </View>
                </View>
              ))}
              {/* Total catégories */}
              <View style={s.catTotal}>
                <ThemedText style={s.catTotalLabel}>Total</ThemedText>
                <ThemedText style={s.catTotalValue}>{formatBudget(budgetTotal)}</ThemedText>
              </View>
            </View>
          )}

          {/* Invités */}
          <View style={s.guestsRow}>
            <ThemedText style={s.guestsLabel}>Nombre d'invités</ThemedText>
            <View style={s.stepper}>
              <Pressable style={s.stepBtn} onPress={() => setGuests(g => Math.max(10, g - 10))}>
                <ThemedText style={s.stepBtnText}>−</ThemedText>
              </Pressable>
              <ThemedText style={s.stepValue}>{guests}</ThemedText>
              <Pressable style={s.stepBtn} onPress={() => setGuests(g => Math.min(2000, g + 10))}>
                <ThemedText style={s.stepBtnText}>+</ThemedText>
              </Pressable>
            </View>
          </View>
          {budgetPerGuest > 0 && (
            <View style={s.perGuestBadge}>
              <ThemedText style={s.perGuestText}>≈ {formatBudget(budgetPerGuest)} / invité</ThemedText>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════
            ✨  PRESTATIONS / ÉTAPES
        ══════════════════════════════════════════════ */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <ThemedText style={s.sectionIcon}>✨</ThemedText>
            <ThemedText style={s.sectionTitle}>Vos prestations</ThemedText>
          </View>
          <ThemedText style={s.sectionHint}>Sélectionnez les événements de votre mariage</ThemedText>

          <View style={s.stepsGrid}>
            {WEDDING_STEPS.map(step => {
              const active = selectedSteps.includes(step.key);
              return (
                <Pressable
                  key={step.key}
                  style={[s.stepPill, active && s.stepPillActive]}
                  onPress={() => toggleStep(step.key)}
                >
                  <ThemedText style={s.stepPillIcon}>{step.icon}</ThemedText>
                  <ThemedText style={[s.stepPillText, active && s.stepPillTextActive]}>
                    {step.label}
                  </ThemedText>
                  {active && (
                    <Ionicons name="checkmark-circle" size={14} color={C.sauge} style={{ marginLeft: 4 }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ══════════════════════════════════════════════
            CTA
        ══════════════════════════════════════════════ */}
        <Pressable
          style={[s.cta, (!canSubmit || saving) && s.ctaDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <ThemedText style={s.ctaText}>Créer mon espace mariage</ThemedText>
          }
        </Pressable>

        {!canSubmit && (
          <ThemedText style={s.ctaHint}>
            {!selectedDate && !selectedCity
              ? 'Choisissez une date et une ville pour continuer'
              : !selectedDate ? 'Choisissez une date pour continuer'
              : 'Choisissez une ville pour continuer'}
          </ThemedText>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles principaux ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },

  header: { paddingVertical: 8, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: C.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: C.secondary, lineHeight: 22 },

  card: {
    backgroundColor: C.card, borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  sectionHint: { fontSize: 12, color: C.secondary, marginTop: -10, marginBottom: 14 },

  // Date
  dateDisplay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.saugeLight, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
  },
  dateDisplayEmpty: { backgroundColor: '#F9F7F3' },
  dateValue: { fontSize: 17, fontWeight: '600', color: C.text },
  datePlaceholder: { fontSize: 16, color: C.secondary },
  modifyBtn: { backgroundColor: C.sauge, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  modifyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Lieu
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 14, backgroundColor: '#FAF9F6', gap: 8,
  },
  input: { flex: 1, height: 48, fontSize: 15, color: C.text },
  suggestions: {
    marginTop: 8, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, backgroundColor: C.card, overflow: 'hidden',
  },
  suggestionItem: { padding: 14 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  suggestionCity: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  suggestionDetail: { fontSize: 12, color: C.secondary },
  selectedCity: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.saugeLight, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
  },
  selectedCityName: { fontSize: 16, fontWeight: '600', color: C.text },
  selectedCityCountry: { fontSize: 13, color: C.secondary, marginTop: 2 },
  clearBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  venueLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 10 },
  optional: { fontSize: 13, color: C.secondary, fontWeight: '400' },
  venueRow: { flexDirection: 'row', alignItems: 'center' },
  venueBadge: {
    backgroundColor: C.saugeLight, borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 8, marginLeft: 8,
  },
  venueBadgeText: { fontSize: 10, color: C.saugeDark, fontWeight: '600' },
  venueInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 14, height: 46, fontSize: 15, color: C.text, backgroundColor: '#FAF9F6',
  },

  // Budget
  modeToggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.border, alignItems: 'center', backgroundColor: '#FAF9F6',
  },
  modeBtnActive: { borderColor: C.sauge, backgroundColor: C.saugeLight },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: C.secondary },
  modeBtnTextActive: { color: C.saugeDark },
  budgetInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  budgetInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 28, fontWeight: '700', color: C.text,
    backgroundColor: '#FAF9F6', textAlign: 'center',
  },
  budgetCurrency: { fontSize: 24, fontWeight: '700', color: C.secondary },
  catGrid: { gap: 2 },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F2EC',
  },
  catIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  catLabel: { flex: 1, fontSize: 14, color: C.text },
  catInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catInput: {
    width: 80, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, color: C.text,
    backgroundColor: '#FAF9F6', textAlign: 'right',
  },
  catCurrency: { fontSize: 13, color: C.secondary, width: 14 },
  catTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: C.border,
  },
  catTotalLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  catTotalValue: { fontSize: 18, fontWeight: '800', color: C.saugeDark },

  guestsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  guestsLabel: { fontSize: 15, color: C.text, fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.saugeLight, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  stepBtnText: { fontSize: 20, fontWeight: '300', color: C.sauge, lineHeight: 22 },
  stepValue: { fontSize: 18, fontWeight: '600', color: C.text, minWidth: 50, textAlign: 'center' },
  perGuestBadge: {
    marginTop: 12, alignSelf: 'center',
    backgroundColor: C.saugeMid, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 16,
  },
  perGuestText: { fontSize: 13, color: C.saugeDark, fontWeight: '600' },

  // Étapes
  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stepPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#FAF9F6', gap: 6,
  },
  stepPillActive: { borderColor: C.sauge, backgroundColor: C.saugeLight },
  stepPillIcon: { fontSize: 15 },
  stepPillText: { fontSize: 14, color: C.secondary, fontWeight: '500' },
  stepPillTextActive: { color: C.saugeDark, fontWeight: '700' },

  // CTA
  cta: {
    backgroundColor: C.sauge, borderRadius: 30, paddingVertical: 18, alignItems: 'center',
    marginTop: 8, shadowColor: C.sauge, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  ctaDisabled: { opacity: 0.5, shadowOpacity: 0 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  ctaHint: { textAlign: 'center', fontSize: 13, color: C.secondary, marginTop: 8 },
});

// ── Calendar styles ───────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  wrap: { marginTop: 16 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 6 },
  navTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12, color: C.secondary, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as unknown as number, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 100 },
  cellSel: { backgroundColor: C.sauge },
  cellPast: { opacity: 0.3 },
  cellText: { fontSize: 14, color: C.text },
  cellTextSel: { color: '#fff', fontWeight: '700' },
  cellTextPast: { color: C.secondary },
});

// ── Slider styles ─────────────────────────────────────────────────────────────
const sl = StyleSheet.create({
  wrap: { paddingHorizontal: 4, marginBottom: 4 },
  track: { height: 28, justifyContent: 'center', position: 'relative' },
  rail: { position: 'absolute', left: 0, right: 0, height: 6, backgroundColor: C.border, borderRadius: 3, top: 11 },
  fill: { height: 6, backgroundColor: C.sauge, borderRadius: 3, position: 'absolute', left: 0, top: 11 },
  thumb: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 2.5, borderColor: C.sauge, top: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 12, color: C.secondary },
});
