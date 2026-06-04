import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { C, RADIUS } from '@/constants/OheveTheme';

type TodoFilter = 'tous' | 'a_faire' | 'fait';

interface Todo {
  id: string;
  label: string;
  done: boolean;
  date?: string;
  priorite: 'haute' | 'normale' | 'basse';
  category?: string;
}

const CATEGORIES = ['Salle', 'Prestataires', 'Invités', 'Tenue', 'Déco', 'Budget', 'Administratif', 'Autre'];

let nextId = 100;

const TODOS_MOCK: Todo[] = [
  { id: '1', label: 'Confirmer la salle de réception', done: true, date: '2026-01-15', priorite: 'haute', category: 'Salle' },
  { id: '2', label: 'Signer le contrat traiteur', done: false, date: '2026-06-15', priorite: 'haute', category: 'Prestataires' },
  { id: '3', label: 'Envoyer les faire-part', done: true, date: '2026-04-01', priorite: 'haute', category: 'Invités' },
  { id: '4', label: 'Première essayage robe', done: false, date: '2026-07-01', priorite: 'haute', category: 'Tenue' },
  { id: '5', label: 'Réserver le photographe', done: true, date: '2026-03-01', priorite: 'haute', category: 'Prestataires' },
  { id: '6', label: 'Choisir le DJ / groupe de musique', done: false, date: '2026-06-30', priorite: 'normale', category: 'Prestataires' },
  { id: '7', label: 'Commander les fleurs — confirmer le florist', done: false, date: '2026-07-15', priorite: 'normale', category: 'Déco' },
  { id: '8', label: 'Préparer le plan de table', done: false, date: '2026-08-15', priorite: 'haute', category: 'Invités' },
  { id: '9', label: 'Relancer les invités sans réponse', done: false, date: '2026-07-01', priorite: 'normale', category: 'Invités' },
  { id: '10', label: 'Commander les alliances', done: false, date: '2026-06-01', priorite: 'haute', category: 'Tenue' },
  { id: '11', label: 'Réserver les hébergements pour les invités de loin', done: false, date: '2026-06-15', priorite: 'normale', category: 'Invités' },
  { id: '12', label: 'Acte de mariage — déposer le dossier à la mairie', done: false, date: '2026-07-01', priorite: 'haute', category: 'Administratif' },
  { id: '13', label: 'Organiser le voyage de noces', done: false, date: '2026-08-01', priorite: 'normale', category: 'Autre' },
  { id: '14', label: 'Créer le site internet du mariage', done: false, date: '2026-06-15', priorite: 'normale', category: 'Autre' },
  { id: '15', label: 'Choisir le menu du repas', done: false, date: '2026-07-15', priorite: 'normale', category: 'Prestataires' },
  { id: '16', label: 'Préparer les cadeaux invités', done: false, date: '2026-08-20', priorite: 'basse', category: 'Déco' },
  { id: '17', label: 'Dégustation chez le traiteur', done: false, date: '2026-06-20', priorite: 'haute', category: 'Prestataires' },
  { id: '18', label: 'Confirmer la décoration florale', done: false, date: '2026-07-30', priorite: 'normale', category: 'Déco' },
  { id: '19', label: 'Planning du jour J — horaires précis', done: false, date: '2026-09-01', priorite: 'haute', category: 'Administratif' },
  { id: '20', label: 'Répétition cérémonie civile', done: false, date: '2026-09-10', priorite: 'normale', category: 'Administratif' },
];

function priorityColor(p: Todo['priorite']) {
  if (p === 'haute') return C.error;
  if (p === 'basse') return C.success;
  return C.warning;
}

function priorityBg(p: Todo['priorite']) {
  if (p === 'haute') return C.errorPale;
  if (p === 'basse') return C.successPale;
  return C.warningPale;
}

function priorityLabel(p: Todo['priorite']) {
  if (p === 'haute') return 'Urgent';
  if (p === 'basse') return 'Basse';
  return 'Normale';
}

function formatDate(d?: string): string {
  if (!d) return '';
  const parsed = new Date(d + 'T12:00:00');
  return isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isOverdue(d?: string): boolean {
  if (!d) return false;
  return new Date(d + 'T00:00:00') < new Date();
}

export default function TodosScreen() {
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState<Todo[]>(TODOS_MOCK);
  const [filter, setFilter] = useState<TodoFilter>('tous');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priorite']>('normale');
  const [newCategory, setNewCategory] = useState('Autre');

  const filtered = todos.filter((t) => {
    const matchFilter = filter === 'tous' || (filter === 'a_faire' ? !t.done : t.done);
    const matchCateg = !selectedCategory || t.category === selectedCategory;
    return matchFilter && matchCateg;
  });

  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setTodos((prev) => prev.filter((t) => t.id !== id)) },
    ]);
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    nextId += 1;
    setTodos((prev) => [
      ...prev,
      { id: String(nextId), label: newLabel.trim(), done: false, date: newDate || undefined, priorite: newPriority, category: newCategory },
    ]);
    setNewLabel('');
    setNewDate('');
    setNewPriority('normale');
    setNewCategory('Autre');
    setAddModal(false);
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']} style={{ backgroundColor: C.ivoire }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.overline}>Organisation</ThemedText>
          <ThemedText style={styles.title}>To-do list</ThemedText>
        </View>
        <Pressable style={styles.addHeaderBtn} onPress={() => setAddModal(true)}>
          <Ionicons name="add" size={22} color={C.textInvert} />
        </Pressable>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <ThemedText style={styles.progressText}>{doneCount} / {totalCount} tâches terminées</ThemedText>
          <ThemedText style={styles.progressPct}>{Math.round(progress * 100)}%</ThemedText>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {([
          { key: 'tous' as TodoFilter, label: 'Toutes' },
          { key: 'a_faire' as TodoFilter, label: 'À faire' },
          { key: 'fait' as TodoFilter, label: 'Faites' },
        ] as const).map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
            onPress={() => setFilter(key)}
          >
            <ThemedText style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>{label}</ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        <Pressable
          style={[styles.catChip, !selectedCategory && styles.catChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <ThemedText style={[styles.catChipText, !selectedCategory && styles.catChipTextActive]}>Tout</ThemedText>
        </Pressable>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <ThemedText style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle-outline" size={48} color={C.taupe} />
            <ThemedText style={styles.emptyText}>Aucune tâche dans cette catégorie</ThemedText>
          </View>
        )}
        {filtered.map((t) => {
          const overdue = !t.done && isOverdue(t.date);
          return (
            <Pressable
              key={t.id}
              style={({ pressed }) => [styles.todoCard, t.done && styles.todoCardDone, pressed && { opacity: 0.85 }]}
              onPress={() => toggleTodo(t.id)}
              onLongPress={() => deleteTodo(t.id)}
            >
              <Pressable style={styles.checkbox} onPress={() => toggleTodo(t.id)} hitSlop={8}>
                <Ionicons
                  name={t.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={t.done ? C.success : C.textLight}
                />
              </Pressable>
              <View style={styles.todoBody}>
                <ThemedText style={[styles.todoLabel, t.done && styles.todoLabelDone]}>{t.label}</ThemedText>
                <View style={styles.todoMeta}>
                  {t.category && (
                    <View style={styles.catPill}>
                      <ThemedText style={styles.catPillText}>{t.category}</ThemedText>
                    </View>
                  )}
                  {t.date && (
                    <ThemedText style={[styles.todoDate, overdue && styles.todoDateOverdue]}>
                      {overdue ? '⚠️ ' : ''}{formatDate(t.date)}
                    </ThemedText>
                  )}
                  <View style={[styles.priorityPill, { backgroundColor: priorityBg(t.priorite) }]}>
                    <ThemedText style={[styles.priorityText, { color: priorityColor(t.priorite) }]}>{priorityLabel(t.priorite)}</ThemedText>
                  </View>
                </View>
              </View>
              <Pressable style={styles.deleteBtn} onPress={() => deleteTodo(t.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={C.textLight} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.modalHandle} />
              <ThemedText style={styles.modalTitle}>Nouvelle tâche</ThemedText>

              <ThemedText style={styles.modalLabel}>Description</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Confirmer le traiteur"
                placeholderTextColor={C.textLight}
                value={newLabel}
                onChangeText={setNewLabel}
                autoFocus
                returnKeyType="done"
              />

              <ThemedText style={styles.modalLabel}>Date limite (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: 2026-07-15"
                placeholderTextColor={C.textLight}
                value={newDate}
                onChangeText={setNewDate}
              />

              <ThemedText style={styles.modalLabel}>Priorité</ThemedText>
              <View style={styles.priorityRow}>
                {(['haute', 'normale', 'basse'] as Todo['priorite'][]).map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.priorityChip, newPriority === p && { backgroundColor: priorityBg(p), borderColor: priorityColor(p) }]}
                    onPress={() => setNewPriority(p)}
                  >
                    <ThemedText style={[styles.priorityChipText, newPriority === p && { color: priorityColor(p) }]}>{priorityLabel(p)}</ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={styles.modalLabel}>Catégorie</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.catChip, newCategory === cat && styles.catChipActive]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <ThemedText style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>{cat}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={() => setAddModal(false)}>
                  <ThemedText style={styles.modalCancelText}>Annuler</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.modalSaveBtn, !newLabel.trim() && styles.modalSaveBtnDisabled]}
                  onPress={handleAdd}
                  disabled={!newLabel.trim()}
                >
                  <ThemedText style={styles.modalSaveText}>Ajouter</ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  overline: { fontSize: 12, color: C.textLight, letterSpacing: 0.5, marginBottom: 2 },
  title: { fontSize: 32, fontWeight: '700', color: C.textDark },
  addHeaderBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },

  progressCard: {
    backgroundColor: C.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 14,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  progressPct: { fontSize: 13, fontWeight: '800', color: C.sauge },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: C.saugePale, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.sauge },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  filterChipActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  filterChipText: { fontSize: 13, fontWeight: '500', color: C.textMid },
  filterChipTextActive: { color: C.textInvert, fontWeight: '700' },

  catScroll: { maxHeight: 40, marginBottom: 14 },
  catContent: { flexDirection: 'row', gap: 8, paddingRight: 8, alignItems: 'center' },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  catChipActive: { backgroundColor: C.moka, borderColor: C.moka },
  catChipText: { fontSize: 12, color: C.textMid, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },

  list: { flex: 1 },
  listContent: { gap: 10 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: C.textLight, textAlign: 'center' },

  todoCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
    gap: 10,
  },
  todoCardDone: { backgroundColor: C.cardAlt, borderColor: C.saugePale },
  checkbox: { width: 28 },
  todoBody: { flex: 1, gap: 5 },
  todoLabel: { fontSize: 15, fontWeight: '600', color: C.textDark },
  todoLabelDone: { textDecorationLine: 'line-through', color: C.textLight },
  todoMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  catPill: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: RADIUS.pill, backgroundColor: C.beige,
  },
  catPillText: { fontSize: 11, color: C.textMid, fontWeight: '500' },
  todoDate: { fontSize: 11, color: C.textLight },
  todoDateOverdue: { color: C.error, fontWeight: '600' },
  priorityPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.pill },
  priorityText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 4 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(61,53,48,0.35)' },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.taupe, alignSelf: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: C.textDark, marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm,
    padding: 12, fontSize: 15, color: C.textDark, backgroundColor: C.ivoire,
  },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flex: 1, paddingVertical: 10,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', backgroundColor: C.card,
  },
  priorityChipText: { fontSize: 13, fontWeight: '600', color: C.textMid },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { color: C.textMid, fontWeight: '700' },
  modalSaveBtn: {
    flex: 2, backgroundColor: C.sauge, borderRadius: RADIUS.sm,
    paddingVertical: 14, alignItems: 'center',
  },
  modalSaveBtnDisabled: { opacity: 0.5 },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
