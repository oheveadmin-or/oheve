import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { getTodoTasks, setTodoTasks } from '@/lib/todo-store';

type TodoFilter = 'tous' | 'a_faire' | 'fait';

interface Todo {
  id: string;
  label: string;
  done: boolean;
  date?: string;
  priorite: 'haute' | 'normale' | 'basse';
  category?: string;
}

const CATEGORIES = ['Mariage', 'Mairie', 'Mikvé', 'Kala', 'Henné', 'Houppa/Soirée', 'Sac de secours J-J', 'Après-mariage', 'Planning Jour J', 'Autre'];

const CAT_ICONS: Record<string, string> = {
  'Mariage':              '💍',
  'Mairie':               '🏛️',
  'Mikvé':                '🕊️',
  'Kala':                 '👗',
  'Henné':                '🌿',
  'Houppa/Soirée':        '🎊',
  'Sac de secours J-J':   '🎒',
  'Après-mariage':        '✈️',
  'Planning Jour J':      '📋',
  'Autre':                '📌',
};

let nextId = 1000;

function storeToTodo(t: { id: string; title: string; category: string; done: boolean; status?: string }): Todo {
  return { id: t.id, label: t.title, done: t.done || t.status === 'done', priorite: 'normale', category: t.category };
}

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
  const [todos, setTodos] = useState<Todo[]>(() => getTodoTasks().map(storeToTodo));
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  useFocusEffect(useCallback(() => {
    setTodos(getTodoTasks().map(storeToTodo));
  }, []));
  const [filter, setFilter] = useState<TodoFilter>('tous');
  const [addModal, setAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priorite']>('normale');
  const [newCategory, setNewCategory] = useState('Autre');

  const filtered = todos.filter((t) =>
    filter === 'tous' || (filter === 'a_faire' ? !t.done : t.done)
  );

  // Group by category, preserving CATEGORIES order
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: filtered.filter((t) => (t.category ?? 'Autre') === cat),
  })).filter((g) => g.items.length > 0);

  const doneCount = todos.filter((t) => t.done).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;

  const toggleCollapse = (cat: string) =>
    setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const toggleTodo = (id: string) => {
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      setTodoTasks(getTodoTasks().map((t) => t.id === id ? { ...t, done: !t.done } : t));
      return next;
    });
  };

  const deleteTodo = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: () => {
          setTodos((prev) => prev.filter((t) => t.id !== id));
          setTodoTasks(getTodoTasks().filter((t) => t.id !== id));
        },
      },
    ]);
  };

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    nextId += 1;
    const newId = String(nextId);
    const newTodo: Todo = { id: newId, label: newLabel.trim(), done: false, date: newDate || undefined, priorite: newPriority, category: newCategory };
    setTodos((prev) => [...prev, newTodo]);
    setTodoTasks([...getTodoTasks(), { id: newId, title: newLabel.trim(), category: newCategory, done: false }]);
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

      {/* Grouped list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle-outline" size={48} color={C.taupe} />
            <ThemedText style={styles.emptyText}>Aucune tâche à afficher</ThemedText>
          </View>
        )}

        {grouped.map(({ cat, items }) => {
          const collapsed = !!collapsedCats[cat];
          const doneInCat = items.filter((t) => t.done).length;
          const icon = CAT_ICONS[cat] ?? '📌';

          return (
            <View key={cat} style={styles.catSection}>
              {/* Section header */}
              <Pressable style={styles.catHeader} onPress={() => toggleCollapse(cat)}>
                <View style={styles.catHeaderLeft}>
                  <ThemedText style={styles.catHeaderIcon}>{icon}</ThemedText>
                  <ThemedText style={styles.catHeaderTitle}>{cat}</ThemedText>
                  <View style={styles.catBadge}>
                    <ThemedText style={styles.catBadgeText}>{doneInCat}/{items.length}</ThemedText>
                  </View>
                </View>
                <Ionicons
                  name={collapsed ? 'chevron-forward' : 'chevron-down'}
                  size={16}
                  color={C.textLight}
                />
              </Pressable>

              {/* Tasks */}
              {!collapsed && items.map((t) => {
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
                        size={24}
                        color={t.done ? C.success : C.textLight}
                      />
                    </Pressable>
                    <View style={styles.todoBody}>
                      <ThemedText style={[styles.todoLabel, t.done && styles.todoLabelDone]}>{t.label}</ThemedText>
                      <View style={styles.todoMeta}>
                        {t.date && (
                          <ThemedText style={[styles.todoDate, overdue && styles.todoDateOverdue]}>
                            {overdue ? '⚠️ ' : '📅 '}{formatDate(t.date)}
                          </ThemedText>
                        )}
                        <View style={[styles.priorityPill, { backgroundColor: priorityBg(t.priorite) }]}>
                          <ThemedText style={[styles.priorityText, { color: priorityColor(t.priorite) }]}>{priorityLabel(t.priorite)}</ThemedText>
                        </View>
                      </View>
                    </View>
                    <Pressable style={styles.deleteBtn} onPress={() => deleteTodo(t.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={15} color={C.textLight} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
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

  list: { flex: 1 },
  listContent: { gap: 12, paddingTop: 4 },

  catSection: {
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: C.ivoire,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  catHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catHeaderIcon: { fontSize: 18 },
  catHeaderTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  catBadge: {
    backgroundColor: C.saugePale, borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: C.sauge },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: C.textLight, textAlign: 'center' },

  todoCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: C.card, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  todoCardDone: { backgroundColor: C.cardAlt },
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
