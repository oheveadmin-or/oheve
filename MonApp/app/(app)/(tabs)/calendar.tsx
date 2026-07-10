import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { KeyboardDoneBar, keyboardDoneProps } from '@/components/ui/keyboard-done-bar';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import {
  calendarApi,
  type AppointmentRequest,
  type CalendarEvent,
  type CalendarEventType,
} from '@/services/auth/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const EXAMPLE_SUGGESTIONS = [
  'Essayage robe', 'Rendez-vous photographe', 'Dégustation traiteur',
  'Visite de salle', 'Essai maquillage', 'Rendez-vous rabbin', 'Henné', 'Chabbat Hatan',
];

const TYPE_OPTIONS: { key: CalendarEventType; label: string; icon: string }[] = [
  { key: 'appointment', label: 'Rendez-vous', icon: 'calendar' },
  { key: 'task', label: 'Tâche', icon: 'checkbox' },
  { key: 'event', label: 'Événement', icon: 'sparkles' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  refused: 'Refusé',
  counter_proposed: 'Autre créneau proposé',
  cancelled: 'Annulé',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Normalise une valeur date en 'YYYY-MM-DD'. Le serveur peut renvoyer soit une
// date brute ('2026-07-10'), soit un timestamp complet ('2026-07-10T00:00:00.000Z')
// selon que le parseur DATE backend est déployé ou non : on prend toujours la
// partie date pour éviter les "Invalid Date".
function dateOnly(v?: string | null): string {
  if (!v) return '';
  return String(v).slice(0, 10);
}

function formatDateFr(iso?: string | null): string {
  const d0 = dateOnly(iso);
  if (!d0) return 'Date à définir';
  const d = new Date(`${d0}T12:00:00`);
  if (isNaN(d.getTime())) return 'Date à définir';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateLong(iso: string): string {
  const d0 = dateOnly(iso);
  const d = new Date(`${d0}T12:00:00`);
  if (isNaN(d.getTime())) return 'Date à définir';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function typeLabel(type: CalendarEventType): string {
  if (type === 'appointment') return 'Rendez-vous';
  if (type === 'task') return 'Tâche';
  return 'Événement';
}

function typeIcon(type: CalendarEventType): string {
  if (type === 'appointment') return 'calendar';
  if (type === 'task') return 'checkbox';
  return 'sparkles';
}

function typeColor(type: CalendarEventType): string {
  if (type === 'appointment') return C.sauge;
  if (type === 'task') return '#E8A87C';
  return '#9B8EA8';
}

// ── Reminder scheduler ────────────────────────────────────────────────────────
async function scheduleReminder(title: string, eventDate: string, eventTime?: string) {
  try {
    if (Platform.OS === 'web') return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    const timeStr = eventTime?.slice(0, 5) ?? '09:00';
    const [h, m] = timeStr.split(':').map(Number);
    const eventDt = new Date(`${eventDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const reminderDt = new Date(eventDt.getTime() - 24 * 60 * 60 * 1000);

    if (reminderDt <= new Date()) return; // déjà passé

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📅 Rappel : ${title}`,
        body: `Votre rendez-vous est demain${eventTime ? ` à ${timeStr}` : ''}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDt,
      },
    });
  } catch {
    // Notifications non disponibles en dev/expo go — silencieux
  }
}

// ── Mini inline calendar picker ───────────────────────────────────────────────
function InlineDatePicker({
  value,
  onChange,
}: {
  value: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
}) {
  const today = isoToday();
  const initDate = value ? new Date(`${value}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const blanks = firstDay === 0 ? 6 : firstDay - 1;
  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [...Array(blanks).fill(null), ...Array.from({ length: daysCount }, (_, i) => i + 1)];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <View style={dp.wrap}>
      <View style={dp.nav}>
        <Pressable onPress={prevMonth} style={dp.navBtn}>
          <Ionicons name="chevron-back" size={16} color={C.saugeDark} />
        </Pressable>
        <ThemedText style={dp.navTitle}>{MONTH_LABELS[viewMonth]} {viewYear}</ThemedText>
        <Pressable onPress={nextMonth} style={dp.navBtn}>
          <Ionicons name="chevron-forward" size={16} color={C.saugeDark} />
        </Pressable>
      </View>
      <View style={dp.dayHeaders}>
        {DAY_LABELS_SHORT.map(l => (
          <ThemedText key={l} style={dp.dayHeader}>{l}</ThemedText>
        ))}
      </View>
      <View style={dp.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`b${i}`} style={dp.cell} />;
          const iso = toIso(viewYear, viewMonth, d);
          const isSelected = iso === value;
          const isToday = iso === today;
          return (
            <Pressable key={iso} style={dp.cell} onPress={() => onChange(iso)}>
              <View style={[dp.circle, isSelected && dp.circleSelected, isToday && !isSelected && dp.circleToday]}>
                <ThemedText style={[dp.dayNum, isSelected && dp.dayNumSel, isToday && !isSelected && dp.dayNumToday]}>
                  {d}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const dp = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: C.taupe, borderRadius: RADIUS.md, padding: 10, backgroundColor: C.card },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 13, fontWeight: '700', color: C.textDark },
  dayHeaders: { flexDirection: 'row' },
  dayHeader: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '700', color: C.textLight, paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 2 },
  circle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  circleSelected: { backgroundColor: C.sauge },
  circleToday: { backgroundColor: C.saugePale },
  dayNum: { fontSize: 12, color: C.textDark },
  dayNumSel: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: C.saugeDark, fontWeight: '700' },
});

// ── Month Grid ────────────────────────────────────────────────────────────────
function MonthGrid({
  year, month, eventDates, selectedDate, onSelectDate,
}: {
  year: number; month: number;
  eventDates: Set<string>; selectedDate: string | null;
  onSelectDate: (iso: string) => void;
}) {
  const today = isoToday();
  if (!Number.isFinite(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return <View style={mgStyles.grid} />;
  }
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeStart = Number.isFinite(startDow) ? startDow : 0;
  const safeDays = Number.isFinite(daysInMonth) && daysInMonth > 0 ? daysInMonth : 30;
  const cells: (number | null)[] = [
    ...Array(safeStart).fill(null),
    ...Array.from({ length: safeDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={mgStyles.grid}>
      {DAY_LABELS_SHORT.map((l) => (
        <ThemedText key={l} style={mgStyles.dayHeader}>{l}</ThemedText>
      ))}
      {cells.map((day, idx) => {
        if (!day) return <View key={`e-${idx}`} style={mgStyles.cell} />;
        const iso = toIso(year, month, day);
        const isToday = iso === today;
        const isSelected = iso === selectedDate;
        const hasEvents = eventDates.has(iso);
        return (
          <Pressable key={iso} style={mgStyles.cell} onPress={() => onSelectDate(iso)}>
            <View style={[mgStyles.dayCircle, isSelected && mgStyles.dayCircleSelected, isToday && !isSelected && mgStyles.dayCircleToday]}>
              <ThemedText style={[mgStyles.dayNum, isSelected && mgStyles.dayNumSelected, isToday && !isSelected && mgStyles.dayNumToday]}>
                {day}
              </ThemedText>
            </View>
            {hasEvents ? (
              <View style={[mgStyles.dot, isSelected && mgStyles.dotSelected]} />
            ) : (
              <View style={mgStyles.dotPlaceholder} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const mgStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayHeader: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.textLight, paddingVertical: 6 },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: C.sauge },
  dayCircleToday: { backgroundColor: C.saugePale },
  dayNum: { fontSize: 14, fontWeight: '500', color: C.textDark },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: C.saugeDark, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.sauge, marginTop: 2 },
  dotSelected: { backgroundColor: '#fff' },
  dotPlaceholder: { width: 5, height: 5, marginTop: 2 },
});

// ── Client Calendar ───────────────────────────────────────────────────────────
function ClientCalendar() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(isoToday());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Formulaire création
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CalendarEventType>('appointment');
  const [newDate, setNewDate] = useState(isoToday());
  const [newTime, setNewTime] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const res = await calendarApi.listEvents(user.accessToken);
      if (res?.success) {
        setEvents((res.data ?? []).map((e: CalendarEvent) => ({ ...e, event_date: dateOnly(e.event_date) || null })));
      }
    } catch { /* ignoré */ }
    setLoading(false);
  }, [user?.accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const eventDates = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => { if (e.event_date) s.add(e.event_date); });
    return s;
  }, [events]);

  const eventsForDay = useMemo(() =>
    events
      .filter((e) => e.event_date === selectedDate)
      .sort((a, b) => (a.event_time ?? '').localeCompare(b.event_time ?? '')),
    [events, selectedDate]);

  const upcomingEvents = useMemo(() =>
    events
      .filter((e) => e.event_date && e.event_date > isoToday())
      .sort((a, b) => {
        const dateCompare = (a.event_date ?? '').localeCompare(b.event_date ?? '');
        if (dateCompare !== 0) return dateCompare;
        return (a.event_time ?? '').localeCompare(b.event_time ?? '');
      })
      .slice(0, 8),
    [events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const openCreate = (prefillTitle?: string, prefillType?: CalendarEventType) => {
    setNewTitle(prefillTitle ?? '');
    setNewType(prefillType ?? 'appointment');
    setNewDate(selectedDate);
    setNewTime('');
    setNewDesc('');
    setModalVisible(true);
  };

  // Naviguer sur une date et afficher le bon mois
  const goToDate = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    if (isNaN(d.getTime())) return;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(iso);
  };

  const createEvent = async () => {
    if (!user?.accessToken || !newTitle.trim()) {
      Alert.alert('Titre requis', 'Donnez un nom à votre événement.');
      return;
    }
    setSaving(true);
    try {
      const res = await calendarApi.createEvent(user.accessToken, {
        type: newType,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        event_date: newDate || undefined,
        event_time: newTime.trim() || undefined,
      });
      if (res?.success) {
        setModalVisible(false);
        // ① Rafraîchir la liste
        await load();
        // ② Naviguer vers la date de l'événement créé
        if (newDate) goToDate(newDate);
        // ③ Programmer un rappel 24h avant
        if (newDate) {
          await scheduleReminder(newTitle.trim(), newDate, newTime.trim() || undefined);
        }
      } else {
        Alert.alert('Erreur', res?.message ?? 'Création impossible');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = (id: number) => {
    Alert.alert('Supprimer', 'Retirer cet élément du calendrier ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          if (!user?.accessToken) return;
          await calendarApi.deleteEvent(user.accessToken, id);
          load();
        },
      },
    ]);
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigation */}
        <View style={styles.monthHeader}>
          <Pressable onPress={prevMonth} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={22} color={C.saugeDark} />
          </Pressable>
          <ThemedText style={styles.monthTitle}>
            {MONTH_LABELS[viewMonth]} {viewYear}
          </ThemedText>
          <Pressable onPress={nextMonth} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={22} color={C.saugeDark} />
          </Pressable>
        </View>

        {/* Month grid */}
        <View style={styles.gridCard}>
          <MonthGrid
            year={viewYear} month={viewMonth}
            eventDates={eventDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>

        {/* Selected day events */}
        <View style={styles.daySection}>
          <View style={styles.daySectionHeader}>
            <ThemedText style={styles.daySectionTitle}>
              {formatDateLong(selectedDate)}
            </ThemedText>
            <Pressable style={styles.addDayBtn} onPress={() => openCreate()}>
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>

          {eventsForDay.length === 0 ? (
            <View style={styles.emptyDay}>
              <ThemedText style={styles.emptyDayText}>Aucun événement ce jour</ThemedText>
              <View style={styles.suggestionsRow}>
                {EXAMPLE_SUGGESTIONS.slice(0, 4).map((s) => (
                  <Pressable key={s} style={styles.suggestionChip} onPress={() => openCreate(s, 'appointment')}>
                    <ThemedText style={styles.suggestionChipText}>{s}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            eventsForDay.map((ev) => (
              <Pressable key={ev.id} style={styles.eventCard} onLongPress={() => deleteEvent(ev.id)}>
                <View style={[styles.eventBar, { backgroundColor: typeColor(ev.type) }]} />
                {/* Heure visible en premier */}
                {ev.event_time ? (
                  <View style={[styles.timeBox, { borderColor: typeColor(ev.type) }]}>
                    <ThemedText style={[styles.timeBoxText, { color: typeColor(ev.type) }]}>
                      {String(ev.event_time).slice(0, 5)}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.eventIconWrap, { backgroundColor: `${typeColor(ev.type)}22` }]}>
                    <Ionicons name={typeIcon(ev.type) as 'calendar'} size={16} color={typeColor(ev.type)} />
                  </View>
                )}
                <View style={styles.eventBody}>
                  <ThemedText style={styles.eventTitle}>{ev.title}</ThemedText>
                  <ThemedText style={styles.eventMeta}>
                    {typeLabel(ev.type)}{ev.event_time ? ` · ${String(ev.event_time).slice(0, 5)}` : ''}
                  </ThemedText>
                  {ev.description ? (
                    <ThemedText style={styles.eventDesc} numberOfLines={2}>{ev.description}</ThemedText>
                  ) : null}
                </View>
                {ev.appointment_request_id ? (
                  <View style={styles.syncBadge}>
                    <Ionicons name="link-outline" size={11} color={C.saugeDark} />
                    <ThemedText style={styles.syncBadgeText}>Synchro</ThemedText>
                  </View>
                ) : null}
              </Pressable>
            ))
          )}
        </View>

        {/* À venir */}
        {upcomingEvents.length > 0 && (
          <View style={styles.upcomingSection}>
            <ThemedText style={styles.upcomingTitle}>Prochains rendez-vous</ThemedText>
            {upcomingEvents.map((ev) => (
              <Pressable
                key={ev.id}
                style={styles.upcomingRow}
                onPress={() => ev.event_date && goToDate(ev.event_date)}
              >
                <View style={[styles.upcomingDot, { backgroundColor: typeColor(ev.type) }]} />
                <View style={styles.upcomingBody}>
                  <ThemedText style={styles.upcomingEventTitle}>{ev.title}</ThemedText>
                  <ThemedText style={styles.upcomingEventDate}>
                    {formatDateFr(ev.event_date)}
                    {ev.event_time ? ` · ${String(ev.event_time).slice(0, 5)}` : ''}
                  </ThemedText>
                </View>
                {ev.appointment_request_id ? (
                  <View style={styles.syncBadge}>
                    <Ionicons name="link-outline" size={11} color={C.saugeDark} />
                    <ThemedText style={styles.syncBadgeText}>Synchro</ThemedText>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={14} color={C.textLight} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Modal création événement ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
              {/* Handle */}
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Nouvel événement</ThemedText>

              {/* Type */}
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[styles.typeChip, newType === opt.key && styles.typeChipActive]}
                    onPress={() => setNewType(opt.key)}
                  >
                    <Ionicons name={opt.icon as 'calendar'} size={14} color={newType === opt.key ? '#fff' : C.saugeDark} />
                    <ThemedText style={[styles.typeChipText, newType === opt.key && styles.typeChipTextActive]}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {/* Titre */}
              <ThemedText style={styles.modalLabel}>Titre</ThemedText>
              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Ex. Essayage robe"
                placeholderTextColor={C.textLight}
                autoFocus
              />

              {/* Date — mini calendrier inline */}
              <ThemedText style={styles.modalLabel}>Date</ThemedText>
              <InlineDatePicker value={newDate} onChange={setNewDate} />

              {/* Heure */}
              <ThemedText style={styles.modalLabel}>Heure (optionnel — HH:MM)</ThemedText>
              <TextInput
                style={styles.input}
                value={newTime}
                onChangeText={setNewTime}
                placeholder="14:30"
                placeholderTextColor={C.textLight}
                keyboardType="numbers-and-punctuation"
              />

              {/* Notes */}
              <ThemedText style={styles.modalLabel}>Notes (optionnel)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                placeholder="Adresse, informations complémentaires…"
                placeholderTextColor={C.textLight}
              />

              {/* Rappel info */}
              <View style={styles.reminderInfo}>
                <Ionicons name="notifications-outline" size={14} color={C.saugeDark} />
                <ThemedText style={styles.reminderInfoText}>
                  Un rappel sera envoyé 24h avant
                </ThemedText>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <ThemedText style={styles.cancelBtnText}>Annuler</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={createEvent}
                  disabled={saving}
                >
                  <ThemedText style={styles.saveBtnText}>{saving ? 'Création…' : 'Créer'}</ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

// ── Prestataire Agenda ────────────────────────────────────────────────────────
function PrestataireAgenda() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(isoToday());

  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<{
    working_days: number[]; work_start: string; work_end: string; slot_duration_minutes: number;
  } | null>(null);
  const [blocked, setBlocked] = useState<{ id: number; start_date: string; end_date: string; reason?: string }[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState('60');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [counterModal, setCounterModal] = useState<AppointmentRequest | null>(null);
  const [counterDate, setCounterDate] = useState('');
  const [counterTime, setCounterTime] = useState('10:00');
  // Déplacement d'un RDV confirmé (le client est notifié par push)
  const [rescheduleModal, setRescheduleModal] = useState<AppointmentRequest | null>(null);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('10:00');
  const [rescheduling, setRescheduling] = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);

  const load = useCallback(async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const [apptRes, availRes] = await Promise.all([
        calendarApi.listAppointments(user.accessToken),
        calendarApi.getMyAvailability(user.accessToken),
      ]);
      if (apptRes?.success) {
        setRequests((apptRes.data ?? []).map((r: AppointmentRequest) => ({
          ...r,
          requested_date: dateOnly(r.requested_date),
          proposed_date: r.proposed_date ? dateOnly(r.proposed_date) : r.proposed_date,
        })));
      }
      if (availRes?.success && availRes.data) {
        setSettings(availRes.data.settings ?? null);
        setBlocked((availRes.data.blocked ?? []).map((b: { id: number; start_date: string; end_date: string; reason?: string }) => ({
          ...b,
          start_date: dateOnly(b.start_date),
          end_date: dateOnly(b.end_date),
        })));
        if (availRes.data.settings) {
          setWorkStart(availRes.data.settings.work_start);
          setWorkEnd(availRes.data.settings.work_end);
          setSlotDuration(String(availRes.data.settings.slot_duration_minutes));
          setWorkingDays(availRes.data.settings.working_days);
        }
      }
    } catch { /* ignoré */ }
    setLoading(false);
  }, [user?.accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // RDV acceptés → dates pour le calendrier
  const acceptedRequests = useMemo(
    () => requests.filter((r) => r.status === 'accepted'),
    [requests],
  );
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests],
  );

  const apptDates = useMemo(() => {
    const s = new Set<string>();
    acceptedRequests.forEach((r) => {
      const d = r.proposed_date ?? r.requested_date;
      if (d) s.add(d);
    });
    return s;
  }, [acceptedRequests]);

  // RDV du jour sélectionné
  const apptForDay = useMemo(() =>
    acceptedRequests
      .filter((r) => (r.proposed_date ?? r.requested_date) === selectedDate)
      .sort((a, b) => (a.proposed_time ?? a.requested_time).localeCompare(b.proposed_time ?? b.requested_time)),
    [acceptedRequests, selectedDate],
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1);
  };

  const toggleDay = (d: number) => {
    setWorkingDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const saveSettings = async () => {
    if (!user?.accessToken) return;
    if (workingDays.length === 0) {
      Alert.alert('Jours manquants', 'Sélectionnez au moins un jour travaillé.');
      return;
    }
    try {
      const res = await calendarApi.updateMyAvailability(user.accessToken, {
        working_days: workingDays, work_start: workStart, work_end: workEnd,
        slot_duration_minutes: parseInt(slotDuration, 10) || 60,
      });
      if (res?.success) {
        setSettings(res.data);
        setShowSettings(false);
        Alert.alert('Enregistré', 'Vos disponibilités ont été mises à jour.');
      } else {
        Alert.alert('Erreur', res?.message ?? 'Impossible d\'enregistrer vos disponibilités.');
      }
    } catch {
      Alert.alert('Erreur', 'Vérifiez votre connexion et réessayez.');
    }
  };

  const respond = async (
    id: number, action: 'accept' | 'refuse' | 'counter',
    counter?: { proposed_date: string; proposed_time: string },
  ) => {
    if (!user?.accessToken) return;
    const req = requests.find((r) => r.id === id);
    const res = await calendarApi.respondToAppointment(user.accessToken, id, { action, ...counter });
    if (res?.success) {
      setCounterModal(null);
      // Programmer rappel si accepté
      if (action === 'accept' && req) {
        const rdvDate = counter?.proposed_date ?? req.requested_date;
        const rdvTime = counter?.proposed_time ?? req.requested_time;
        await scheduleReminder(req.title, rdvDate, rdvTime);
      }
      load();
    } else {
      Alert.alert('Erreur', res?.message ?? 'Action impossible');
    }
  };

  // ── Annulation d'un RDV confirmé (notifie le client) ──────────────────────
  const cancelAppointment = (req: AppointmentRequest) => {
    Alert.alert(
      'Annuler ce rendez-vous',
      `« ${req.title} » avec ${req.client_prenom ?? ''} ${req.client_nom ?? ''} sera annulé. Le client recevra une notification.`,
      [
        { text: 'Ne pas annuler', style: 'cancel' },
        {
          text: 'Annuler le RDV',
          style: 'destructive',
          onPress: async () => {
            if (!user?.accessToken) return;
            try {
              const res = await calendarApi.cancelAppointment(user.accessToken, req.id);
              if (res?.success) {
                load();
              } else {
                Alert.alert('Erreur', res?.message ?? 'Annulation impossible. Réessayez.');
              }
            } catch {
              Alert.alert('Erreur', 'Vérifiez votre connexion et réessayez.');
            }
          },
        },
      ],
    );
  };

  // ── Déplacement d'un RDV confirmé (notifie le client) ─────────────────────
  const openReschedule = (req: AppointmentRequest) => {
    setReschedDate(req.proposed_date ?? req.requested_date);
    setReschedTime((req.proposed_time ?? req.requested_time)?.slice(0, 5) ?? '10:00');
    setRescheduleModal(req);
  };

  const doReschedule = async () => {
    if (!user?.accessToken || !rescheduleModal) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reschedDate.trim())) {
      Alert.alert('Date invalide', 'Utilisez le format AAAA-MM-JJ (ex. 2026-09-15).');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(reschedTime.trim())) {
      Alert.alert('Heure invalide', 'Utilisez le format HH:MM (ex. 14:30).');
      return;
    }
    setRescheduling(true);
    try {
      const res = await calendarApi.rescheduleAppointment(user.accessToken, rescheduleModal.id, {
        new_date: reschedDate.trim(),
        new_time: reschedTime.trim(),
      });
      if (res?.success) {
        setRescheduleModal(null);
        Alert.alert('Rendez-vous déplacé', 'Le client a été notifié du nouveau créneau.');
        load();
      } else {
        Alert.alert('Erreur', res?.message ?? 'Déplacement impossible. Réessayez.');
      }
    } catch {
      Alert.alert('Erreur', 'Vérifiez votre connexion et réessayez.');
    }
    setRescheduling(false);
  };

  const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const selectedDateFr = formatDateLong(selectedDate);

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        <ThemedText style={styles.pageTitle}>Mon agenda</ThemedText>
        <ThemedText style={styles.pageSubtitle}>Vos rendez-vous confirmés et disponibilités</ThemedText>

        {/* ── Calendrier prestataire ── */}
        <View style={styles.monthHeader}>
          <Pressable onPress={prevMonth} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={22} color={C.saugeDark} />
          </Pressable>
          <ThemedText style={styles.monthTitle}>
            {MONTH_LABELS[viewMonth]} {viewYear}
          </ThemedText>
          <Pressable onPress={nextMonth} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={22} color={C.saugeDark} />
          </Pressable>
        </View>

        <View style={styles.gridCard}>
          <MonthGrid
            year={viewYear} month={viewMonth}
            eventDates={apptDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </View>

        {/* ── RDV du jour sélectionné ── */}
        <View style={styles.daySection}>
          <ThemedText style={styles.daySectionTitle}>{selectedDateFr}</ThemedText>
          {apptForDay.length === 0 ? (
            <ThemedText style={[styles.emptyDayText, { marginTop: 8 }]}>Aucun rendez-vous ce jour</ThemedText>
          ) : (
            apptForDay.map((r) => {
              const time = (r.proposed_time ?? r.requested_time)?.slice(0, 5);
              return (
                <View key={r.id} style={styles.eventCard}>
                  <View style={[styles.eventBar, { backgroundColor: C.sauge }]} />
                  {time ? (
                    <View style={[styles.timeBox, { borderColor: C.sauge }]}>
                      <ThemedText style={[styles.timeBoxText, { color: C.sauge }]}>{time}</ThemedText>
                    </View>
                  ) : (
                    <View style={[styles.eventIconWrap, { backgroundColor: `${C.sauge}22` }]}>
                      <Ionicons name="calendar" size={16} color={C.sauge} />
                    </View>
                  )}
                  <View style={styles.eventBody}>
                    <ThemedText style={styles.eventTitle}>{r.title}</ThemedText>
                    <ThemedText style={styles.eventMeta}>
                      {r.client_prenom} {r.client_nom}
                      {time ? ` · ${time}` : ''}
                    </ThemedText>
                  </View>
                  {/* Modifier / annuler → le client est notifié par push */}
                  <View style={styles.apptActions}>
                    <Pressable style={styles.apptActionBtn} onPress={() => openReschedule(r)} hitSlop={6}>
                      <Ionicons name="create-outline" size={17} color={C.saugeDark} />
                    </Pressable>
                    <Pressable style={styles.apptActionBtn} onPress={() => cancelAppointment(r)} hitSlop={6}>
                      <Ionicons name="close-circle-outline" size={17} color={C.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Demandes en attente ── */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.pendingHeader}>
              <ThemedText style={styles.sectionTitle}>Demandes en attente</ThemedText>
              <View style={styles.pendingBadge}>
                <ThemedText style={styles.pendingBadgeText}>{pendingRequests.length}</ThemedText>
              </View>
            </View>
            {pendingRequests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <ThemedText style={styles.requestTitle}>{req.title}</ThemedText>
                  <ThemedText style={styles.requestDate}>
                    {formatDateFr(req.requested_date)} · {req.requested_time?.slice(0, 5)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.requestMeta}>
                  {req.client_prenom} {req.client_nom}
                </ThemedText>
                {req.notes && <ThemedText style={styles.requestNotes}>{req.notes}</ThemedText>}
                <View style={styles.requestActions}>
                  <Pressable style={styles.acceptBtn} onPress={() => respond(req.id, 'accept')}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <ThemedText style={styles.actionBtnText}>Accepter</ThemedText>
                  </Pressable>
                  <Pressable style={styles.refuseBtn} onPress={() => respond(req.id, 'refuse')}>
                    <Ionicons name="close" size={16} color={C.error} />
                    <ThemedText style={[styles.actionBtnText, { color: C.error }]}>Refuser</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.counterBtn}
                    onPress={() => { setCounterModal(req); setCounterDate(req.requested_date); setCounterTime(req.requested_time ?? '10:00'); }}
                  >
                    <Ionicons name="refresh" size={16} color={C.saugeDark} />
                    <ThemedText style={[styles.actionBtnText, { color: C.saugeDark }]}>Autre créneau</ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {pendingRequests.length === 0 && (
          <View style={[styles.section, { marginTop: 8 }]}>
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={32} color={C.sauge} />
              <ThemedText style={styles.emptyText}>Aucune demande en attente</ThemedText>
            </View>
          </View>
        )}

        {/* ── Disponibilités ── */}
        <Pressable style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={18} color={C.saugeDark} />
          <ThemedText style={styles.settingsBtnText}>
            {settings ? 'Modifier mes disponibilités' : 'Configurer mes disponibilités'}
          </ThemedText>
        </Pressable>

        {/* ── Congés ── */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Congés & indisponibilités</ThemedText>
          <Pressable style={styles.addRowBtn} onPress={() => setShowBlockForm((v) => !v)}>
            <Ionicons name="add-circle-outline" size={18} color={C.saugeDark} />
            <ThemedText style={styles.addRowBtnText}>Ajouter une période</ThemedText>
          </Pressable>
          {showBlockForm && (
            <View style={styles.blockForm}>
              <TextInput style={styles.input} value={blockStart} onChangeText={setBlockStart} placeholder="Début (AAAA-MM-JJ)" placeholderTextColor={C.textLight} />
              <TextInput style={styles.input} value={blockEnd} onChangeText={setBlockEnd} placeholder="Fin (AAAA-MM-JJ)" placeholderTextColor={C.textLight} />
              <TextInput style={styles.input} value={blockReason} onChangeText={setBlockReason} placeholder="Motif (optionnel)" placeholderTextColor={C.textLight} />
              <Pressable
                style={styles.saveBtn}
                onPress={async () => {
                  if (!user?.accessToken || !blockStart || !blockEnd) return;
                  const res = await calendarApi.addBlockedPeriod(user.accessToken, {
                    start_date: blockStart, end_date: blockEnd, reason: blockReason || undefined,
                  });
                  if (res?.success) { setBlockStart(''); setBlockEnd(''); setBlockReason(''); setShowBlockForm(false); load(); }
                }}
              >
                <ThemedText style={styles.saveBtnText}>Enregistrer</ThemedText>
              </Pressable>
            </View>
          )}
          {blocked.length === 0 ? (
            <ThemedText style={styles.sectionHint}>Aucune indisponibilité définie</ThemedText>
          ) : (
            blocked.map((b) => (
              <View key={b.id} style={styles.blockRow}>
                <ThemedText style={styles.blockDates}>{formatDateFr(b.start_date)} → {formatDateFr(b.end_date)}</ThemedText>
                {b.reason && <ThemedText style={styles.blockReason}>{b.reason}</ThemedText>}
              </View>
            ))
          )}
        </View>

        {/* Historique */}
        {requests.filter((r) => r.status !== 'pending').length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Historique</ThemedText>
            {requests.filter((r) => r.status !== 'pending').map((req) => (
              <View key={req.id} style={styles.historyRow}>
                <View style={[styles.historyDot, { backgroundColor: req.status === 'accepted' ? C.sauge : C.error }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.historyTitle}>{req.title}</ThemedText>
                  <ThemedText style={styles.historyMeta}>
                    {STATUS_LABELS[req.status]} · {formatDateFr(req.proposed_date ?? req.requested_date)}
                    {(req.proposed_time ?? req.requested_time) ? ` · ${(req.proposed_time ?? req.requested_time)?.slice(0, 5)}` : ''}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal disponibilités */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Mes disponibilités</ThemedText>
            <ThemedText style={styles.modalLabel}>Jours travaillés</ThemedText>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, i) => {
                const dow = (i + 1) % 7;
                const active = workingDays.includes(dow);
                return (
                  <Pressable key={label} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => toggleDay(dow)}>
                    <ThemedText style={[styles.dayChipText, active && styles.dayChipTextActive]}>{label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText style={styles.modalLabel}>Horaires</ThemedText>
            <View style={styles.timeRow}>
              <TextInput style={styles.timeInput} value={workStart} onChangeText={setWorkStart} placeholder="09:00" placeholderTextColor={C.textLight} />
              <ThemedText style={styles.timeSep}>→</ThemedText>
              <TextInput style={styles.timeInput} value={workEnd} onChangeText={setWorkEnd} placeholder="18:00" placeholderTextColor={C.textLight} />
            </View>
            <ThemedText style={styles.modalLabel}>Durée créneau (min)</ThemedText>
            <TextInput style={styles.input} value={slotDuration} onChangeText={setSlotDuration} keyboardType="number-pad" placeholderTextColor={C.textLight} {...keyboardDoneProps} />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowSettings(false)}>
                <ThemedText style={styles.cancelBtnText}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={saveSettings}>
                <ThemedText style={styles.saveBtnText}>Enregistrer</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
        <KeyboardDoneBar />
      </Modal>

      {/* Modal contre-proposition */}
      <Modal visible={!!counterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Proposer un autre créneau</ThemedText>
            <ThemedText style={styles.modalLabel}>Date (AAAA-MM-JJ)</ThemedText>
            <TextInput style={styles.input} value={counterDate} onChangeText={setCounterDate} placeholder="2026-09-15" placeholderTextColor={C.textLight} />
            <ThemedText style={styles.modalLabel}>Heure (HH:MM)</ThemedText>
            <TextInput style={styles.input} value={counterTime} onChangeText={setCounterTime} placeholder="14:00" placeholderTextColor={C.textLight} />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setCounterModal(null)}>
                <ThemedText style={styles.cancelBtnText}>Annuler</ThemedText>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={() => counterModal && respond(counterModal.id, 'counter', { proposed_date: counterDate, proposed_time: counterTime })}
              >
                <ThemedText style={styles.saveBtnText}>Proposer</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal déplacement d'un RDV confirmé */}
      <Modal visible={!!rescheduleModal} animationType="slide" transparent onRequestClose={() => setRescheduleModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Déplacer le rendez-vous</ThemedText>
            {rescheduleModal && (
              <ThemedText style={styles.rescheduleInfo}>
                « {rescheduleModal.title} » — {rescheduleModal.client_prenom} {rescheduleModal.client_nom}
              </ThemedText>
            )}
            <ThemedText style={styles.modalLabel}>Nouvelle date (AAAA-MM-JJ)</ThemedText>
            <TextInput style={styles.input} value={reschedDate} onChangeText={setReschedDate} placeholder="2026-09-15" placeholderTextColor={C.textLight} />
            <ThemedText style={styles.modalLabel}>Nouvelle heure (HH:MM)</ThemedText>
            <TextInput style={styles.input} value={reschedTime} onChangeText={setReschedTime} placeholder="14:00" placeholderTextColor={C.textLight} />
            <View style={styles.reminderInfo}>
              <Ionicons name="notifications-outline" size={14} color={C.saugeDark} />
              <ThemedText style={styles.reminderInfoText}>Le client sera notifié du nouveau créneau</ThemedText>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setRescheduleModal(null)}>
                <ThemedText style={styles.cancelBtnText}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={[styles.saveBtn, rescheduling && { opacity: 0.6 }]} onPress={doReschedule} disabled={rescheduling}>
                <ThemedText style={styles.saveBtnText}>{rescheduling ? 'Déplacement…' : 'Déplacer'}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { user } = useAuth();
  if (user?.role === 'prestataire') return <PrestataireAgenda />;
  return <ClientCalendar />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Calendrier header
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, marginBottom: 8,
  },
  monthTitle: { fontSize: 20, fontWeight: '800', color: C.textDark },
  navArrow: { padding: 8 },
  gridCard: {
    backgroundColor: C.card, borderRadius: RADIUS.lg,
    paddingHorizontal: 8, paddingVertical: 4, marginBottom: 20,
  },

  // Jour sélectionné
  daySection: { gap: 10, marginBottom: 8 },
  daySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  daySectionTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, textTransform: 'capitalize', flex: 1 },
  addDayBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center' },

  emptyDay: { gap: 12, paddingVertical: 8 },
  emptyDayText: { fontSize: 14, color: C.textLight },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: C.saugePale },
  suggestionChipText: { fontSize: 12, color: C.saugeDark, fontWeight: '500' },

  // Event card
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: C.card, borderRadius: RADIUS.md, marginBottom: 8, overflow: 'hidden',
  },
  eventBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  timeBox: {
    width: 46, height: 36, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  timeBoxText: { fontSize: 13, fontWeight: '700' },
  eventIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  eventBody: { flex: 1, gap: 2 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  eventMeta: { fontSize: 12, color: C.textLight },
  eventDesc: { fontSize: 13, color: C.textMid, marginTop: 2 },
  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, backgroundColor: C.saugePale, borderRadius: RADIUS.pill,
  },
  syncBadgeText: { fontSize: 10, color: C.saugeDark, fontWeight: '600' },

  // Actions RDV confirmé (modifier / annuler)
  apptActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  apptActionBtn: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.saugePale,
  },
  rescheduleInfo: { fontSize: 13, color: C.textMid, marginTop: -6, marginBottom: 4 },

  // À venir
  upcomingSection: { marginTop: 20, gap: 0 },
  upcomingTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 8 },
  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.taupe,
  },
  upcomingDot: { width: 8, height: 8, borderRadius: 4 },
  upcomingBody: { flex: 1 },
  upcomingEventTitle: { fontSize: 14, fontWeight: '600', color: C.textDark },
  upcomingEventDate: { fontSize: 12, color: C.textLight },

  // Prestataire
  pageTitle: { fontSize: 26, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: C.textLight, marginBottom: 16 },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingBadge: {
    backgroundColor: C.sauge, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  pendingBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  settingsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, backgroundColor: C.card, borderRadius: RADIUS.md, marginTop: 20,
  },
  settingsBtnText: { fontSize: 14, fontWeight: '600', color: C.saugeDark },
  section: { marginTop: 20, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  sectionHint: { fontSize: 12, color: C.textLight },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addRowBtnText: { color: C.saugeDark, fontWeight: '600', fontSize: 14 },
  blockForm: { gap: 8, marginBottom: 12 },
  blockRow: { padding: 12, backgroundColor: C.card, borderRadius: RADIUS.md },
  blockDates: { fontSize: 14, fontWeight: '600', color: C.textDark },
  blockReason: { fontSize: 12, color: C.textLight, marginTop: 2 },

  requestCard: { padding: 14, backgroundColor: C.card, borderRadius: RADIUS.md, gap: 4 },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  requestTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, flex: 1 },
  requestDate: { fontSize: 12, color: C.sauge, fontWeight: '600' },
  requestMeta: { fontSize: 13, color: C.textMid },
  requestNotes: { fontSize: 13, color: C.textLight, fontStyle: 'italic' },
  requestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.sauge, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  refuseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.errorPale, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  counterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.saugePale, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.taupe },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  historyTitle: { fontSize: 14, fontWeight: '600', color: C.textDark },
  historyMeta: { fontSize: 12, color: C.textLight },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: C.textLight },

  // Modal partagé
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalScroll: { maxHeight: '92%' },
  modalContent: { justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.ivoire, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 12, gap: 10,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.taupe, alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: C.textMid, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: C.taupe, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.textDark, backgroundColor: C.card,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: C.saugePale },
  typeChipActive: { backgroundColor: C.sauge },
  typeChipText: { fontSize: 13, fontWeight: '600', color: C.saugeDark },
  typeChipTextActive: { color: '#fff' },
  reminderInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.saugePale, borderRadius: RADIUS.md, padding: 10,
  },
  reminderInfoText: { fontSize: 12, color: C.saugeDark },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: C.card },
  cancelBtnText: { fontWeight: '600', color: C.textMid },
  saveBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: C.sauge },
  saveBtnText: { fontWeight: '700', color: '#fff' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: C.saugePale },
  dayChipActive: { backgroundColor: C.sauge },
  dayChipText: { fontSize: 12, fontWeight: '600', color: C.saugeDark },
  dayChipTextActive: { color: '#fff' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput: { flex: 1, borderWidth: 1, borderColor: C.taupe, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.textDark, backgroundColor: C.card },
  timeSep: { color: C.textLight },
});
