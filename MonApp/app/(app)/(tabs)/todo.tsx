import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/OheveTheme';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { getTodoTasks, setTodoTasks, type TodoTask } from '@/lib/todo-store';

type TaskStatus = 'todo' | 'in_progress' | 'done';

const BASE_CATEGORIES = [
  'Mariage',
  'Mairie',
  'Mikvé',
  'Kala',
  'Henné',
  'Houppa/Soirée',
  'Sac de secours J-J',
  'Après-mariage',
  'Autre',
] as const;

const CAT_ICONS: Record<string, string> = {
  'Mariage':            '💍',
  'Mairie':             '🏛️',
  'Mikvé':              '🕊️',
  'Kala':               '👗',
  'Henné':              '🌿',
  'Houppa/Soirée':      '🎊',
  'Sac de secours J-J': '🎒',
  'Après-mariage':      '✈️',
  'Planning Jour J':    '📋',
  'Autre':              '📌',
};

export default function TodoScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<TodoTask[]>(() => getTodoTasks());
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Mariage');
  const [customCategory, setCustomCategory] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<TaskStatus>('todo');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;

  const categories = useMemo(() => {
    const fromTasks = tasks.map((t) => t.category);
    return Array.from(new Set([...BASE_CATEGORIES, ...customCategories, ...fromTasks]));
  }, [tasks, customCategories]);

  const statusOf = (task: TodoTask): TaskStatus => {
    if (task.done || task.status === 'done') return 'done';
    if (task.status === 'in_progress') return 'in_progress';
    return 'todo';
  };

  const statusCounts = useMemo(() => {
    return tasks.reduce(
      (acc, task) => { acc[statusOf(task)] += 1; return acc; },
      { todo: 0, in_progress: 0, done: 0 } as Record<TaskStatus, number>
    );
  }, [tasks]);

  // Tasks filtered by tab, then grouped by category
  const filteredTasks = useMemo(() => tasks.filter((t) => statusOf(t) === selectedTab), [tasks, selectedTab]);

  const grouped = useMemo(() => {
    const allCats = Array.from(new Set([...BASE_CATEGORIES, ...customCategories, ...tasks.map((t) => t.category)]));
    return allCats
      .map((cat) => ({ cat, items: filteredTasks.filter((t) => (t.category ?? 'Autre') === cat) }))
      .filter((g) => g.items.length > 0);
  }, [filteredTasks, customCategories, tasks]);

  const setTaskStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) => {
      const next = prev.map((t) => t.id !== id ? t : { ...t, done: status === 'done', status });
      setTodoTasks(next);
      return next;
    });
  };

  const toggleTaskDone = (id: string) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    setTaskStatus(id, statusOf(current) === 'done' ? 'todo' : 'done');
  };

  const cycleTaskStatus = (id: string) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const s = statusOf(current);
    setTaskStatus(id, s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo');
  };

  const deleteTask = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        setTasks((prev) => { const next = prev.filter((t) => t.id !== id); setTodoTasks(next); return next; });
      }},
    ]);
  };

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) { Alert.alert('Titre requis', 'Écris un titre avant d\'ajouter.'); return; }
    const nextTask: TodoTask = { id: String(Date.now()), title, category: selectedCategory || 'Autre', done: false, status: 'todo', dueDate };
    setTasks((prev) => { const next = [nextTask, ...prev]; setTodoTasks(next); return next; });
    setNewTaskTitle(''); setSelectedCategory('Mariage'); setCustomCategory(''); setDueDate(undefined);
    setModalVisible(false); setSelectedTab('todo');
  };

  const addCustomCategory = () => {
    const cleaned = customCategory.trim().replace(/\s+/g, ' ').split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (!cleaned) return;
    setCustomCategories((prev) => prev.some((c) => c.toLowerCase() === cleaned.toLowerCase()) ? prev : [...prev, cleaned]);
    setSelectedCategory(cleaned);
    setCustomCategory('');
  };

  const toggleCollapse = (cat: string) =>
    setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <View style={styles.root}>
        <ThemedText style={styles.title}>Ma to-do list</ThemedText>

        {/* Status tabs */}
        <View style={styles.tabsRow}>
          {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((key) => {
            const labels = { todo: 'À faire', in_progress: 'En cours', done: 'Terminées' };
            return (
              <Pressable
                key={key}
                style={[styles.statusTab, selectedTab === key && styles.statusTabActive]}
                onPress={() => setSelectedTab(key)}
              >
                <ThemedText style={[styles.statusTabText, selectedTab === key && styles.statusTabTextActive]}>
                  {labels[key]}
                </ThemedText>
                <ThemedText style={[styles.statusCount, selectedTab === key && styles.statusCountActive]}>
                  {statusCounts[key]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Grouped list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {grouped.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={44} color={C.taupe} />
              <ThemedText style={styles.emptyText}>Aucune tâche dans cet onglet</ThemedText>
            </View>
          )}

          {grouped.map(({ cat, items }) => {
            const collapsed = !!collapsedCats[cat];
            const doneCount = items.filter((t) => statusOf(t) === 'done').length;
            const icon = CAT_ICONS[cat] ?? '📌';

            return (
              <View key={cat} style={styles.catSection}>
                {/* Section header */}
                <Pressable style={styles.catHeader} onPress={() => toggleCollapse(cat)}>
                  <View style={styles.catHeaderLeft}>
                    <ThemedText style={styles.catIcon}>{icon}</ThemedText>
                    <ThemedText style={styles.catTitle}>{cat}</ThemedText>
                    <View style={styles.catBadge}>
                      <ThemedText style={styles.catBadgeText}>
                        {selectedTab === 'done' ? items.length : `${doneCount}/${items.length}`}
                      </ThemedText>
                    </View>
                  </View>
                  <Ionicons
                    name={collapsed ? 'chevron-forward' : 'chevron-down'}
                    size={16}
                    color={C.textLight}
                  />
                </Pressable>

                {/* Task rows */}
                {!collapsed && items.map((task, idx) => {
                  const status: TaskStatus = statusOf(task);
                  const isDone = status === 'done';
                  const isLast = idx === items.length - 1;
                  return (
                    <View
                      key={task.id}
                      style={[styles.row, !isLast && styles.rowBorder]}
                    >
                      <Pressable
                        style={[styles.leftCheckbox, isDone && styles.leftCheckboxDone]}
                        onPress={() => toggleTaskDone(task.id)}
                        hitSlop={8}
                      >
                        {isDone ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                      </Pressable>

                      <View style={styles.rowBody}>
                        <ThemedText style={[styles.rowTitle, isDone && styles.rowTitleDone]} numberOfLines={2}>
                          {task.title}
                        </ThemedText>
                        {task.dueDate && !isDone ? (
                          <View style={styles.dueDateChip}>
                            <Ionicons name="calendar-outline" size={11} color={C.sauge} />
                            <ThemedText style={styles.dueDateText}>{task.dueDate}</ThemedText>
                          </View>
                        ) : null}
                      </View>

                      <Pressable style={styles.cycleBtn} onPress={() => cycleTaskStatus(task.id)} hitSlop={8}>
                        <Ionicons
                          name={status === 'done' ? 'checkmark-circle' : status === 'in_progress' ? 'time-outline' : 'ellipse-outline'}
                          size={22}
                          color={status === 'done' ? C.sauge : status === 'in_progress' ? C.warning : C.taupe}
                        />
                      </Pressable>

                      <Pressable onPress={() => deleteTask(task.id)} hitSlop={8} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={15} color={C.textLight} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        {/* Add button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
            onPress={() => setModalVisible(true)}
          >
            <ThemedText style={styles.primaryBtnText}>+ Ajouter une tâche</ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Add modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <ScrollView style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <ThemedText style={styles.modalTitle}>Ajouter une tâche</ThemedText>

            <TextInput
              style={styles.input}
              placeholder="Titre de la tâche"
              placeholderTextColor="#9ca3af"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <ThemedText style={styles.modalLabel}>Catégorie</ThemedText>
            <View style={styles.categoryWrap}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <ThemedText style={styles.catIcon}>{CAT_ICONS[cat] ?? '📌'}</ThemedText>
                  <ThemedText style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.customCategoryRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Créer une catégorie…"
                placeholderTextColor="#9ca3af"
                value={customCategory}
                onChangeText={setCustomCategory}
              />
              <Pressable style={styles.customCategoryBtn} onPress={addCustomCategory}>
                <ThemedText style={styles.customCategoryBtnText}>Ajouter</ThemedText>
              </Pressable>
            </View>

            <ThemedText style={styles.modalLabel}>Date limite (optionnel)</ThemedText>
            <Pressable style={styles.dateTrigger} onPress={() => setShowDatePicker((v) => !v)}>
              <Ionicons name="calendar-outline" size={16} color={C.sauge} />
              <ThemedText style={styles.dateTriggerText}>{dueDate ?? 'Sélectionner une date'}</ThemedText>
              {dueDate && (
                <Pressable onPress={() => setDueDate(undefined)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={C.textLight} />
                </Pressable>
              )}
            </Pressable>

            {showDatePicker && (
              <View style={styles.calendarWrap}>
                <View style={styles.calMonthNav}>
                  <Pressable onPress={() => { if (pickerMonth === 0) { setPickerMonth(11); setPickerYear((y) => y - 1); } else setPickerMonth((m) => m - 1); }}>
                    <Ionicons name="chevron-back" size={20} color={C.sauge} />
                  </Pressable>
                  <ThemedText style={styles.calMonthLabel}>{MOIS_COURTS[pickerMonth]} {pickerYear}</ThemedText>
                  <Pressable onPress={() => { if (pickerMonth === 11) { setPickerMonth(0); setPickerYear((y) => y + 1); } else setPickerMonth((m) => m + 1); }}>
                    <Ionicons name="chevron-forward" size={20} color={C.sauge} />
                  </Pressable>
                </View>
                <View style={styles.calGrid}>
                  {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
                    <ThemedText key={d} style={styles.calDayHeader}>{d}</ThemedText>
                  ))}
                  {Array(firstDayOfMonth(pickerYear, pickerMonth)).fill(null).map((_, i) => (
                    <View key={`e-${i}`} style={styles.calDayCell} />
                  ))}
                  {Array.from({ length: daysInMonth(pickerYear, pickerMonth) }, (_, i) => i + 1).map((day) => {
                    const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const sel = dueDate === dateStr;
                    return (
                      <Pressable
                        key={day}
                        style={[styles.calDayCell, sel && styles.calDayCellSelected]}
                        onPress={() => { setDueDate(dateStr); setShowDatePicker(false); }}
                      >
                        <ThemedText style={[styles.calDayText, sel && styles.calDayTextSelected]}>{day}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <ThemedText style={styles.cancelText}>Annuler</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, { flex: 1 }, !newTaskTitle.trim() && { opacity: 0.5 }]}
                onPress={addTask}
                disabled={!newTaskTitle.trim()}
              >
                <ThemedText style={styles.primaryBtnText}>Ajouter</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  title: { fontSize: 32, fontWeight: '700', color: C.textDark, marginBottom: 14 },

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  statusTabActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  statusTabText: { fontSize: 13, fontWeight: '600', color: C.textMid },
  statusTabTextActive: { color: '#fff', fontWeight: '700' },
  statusCount: { fontSize: 12, fontWeight: '700', color: C.textLight },
  statusCountActive: { color: '#ffffffcc' },

  listContent: { gap: 12 },

  catSection: {
    backgroundColor: C.card,
    borderRadius: 14,
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
  catIcon: { fontSize: 17 },
  catTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  catBadge: {
    backgroundColor: C.saugePale, borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: C.sauge },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    backgroundColor: C.card,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  leftCheckbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1.5, borderColor: C.taupe,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.cardAlt, flexShrink: 0,
  },
  leftCheckboxDone: { backgroundColor: C.sauge, borderColor: C.sauge },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '500', color: C.textDark },
  rowTitleDone: { textDecorationLine: 'line-through', color: C.textLight },
  cycleBtn: { padding: 2 },
  deleteBtn: { padding: 4 },
  dueDateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    backgroundColor: C.saugePale, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2,
  },
  dueDateText: { fontSize: 11, color: C.saugeDark, fontWeight: '600' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: C.textLight, fontSize: 15 },

  footer: { position: 'absolute', left: 16, right: 16, bottom: 0, paddingTop: 10 },
  primaryBtn: { backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,24,39,0.25)' },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.textDark, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, backgroundColor: C.cardAlt, color: C.textDark, marginBottom: 4,
  },
  modalLabel: { fontSize: 13, fontWeight: '600', color: C.textMid, marginTop: 12, marginBottom: 8 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  categoryChipActive: { borderColor: C.sauge, backgroundColor: C.saugePale },
  categoryChipText: { fontSize: 13, color: C.textMid, fontWeight: '500' },
  categoryChipTextActive: { color: C.saugeDark, fontWeight: '700' },
  customCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  customCategoryBtn: {
    borderRadius: 12, backgroundColor: C.saugePale,
    borderWidth: 1, borderColor: C.taupe,
    paddingVertical: 11, paddingHorizontal: 14,
  },
  customCategoryBtnText: { color: C.saugeDark, fontWeight: '700', fontSize: 13 },
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, backgroundColor: C.cardAlt, marginBottom: 4,
  },
  dateTriggerText: { flex: 1, fontSize: 14, color: C.textDark },
  calendarWrap: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.ivoire },
  calMonthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calMonthLabel: { fontSize: 14, fontWeight: '700', color: C.textDark },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 11, color: C.textLight, fontWeight: '600', paddingVertical: 4 },
  calDayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 99 },
  calDayCellSelected: { backgroundColor: C.sauge },
  calDayText: { fontSize: 13, color: C.textDark },
  calDayTextSelected: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 },
  cancelBtn: { borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 13, paddingHorizontal: 16 },
  cancelText: { color: C.textMid, fontWeight: '600' },
});
