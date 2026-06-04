import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
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

export default function TodoScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<TodoTask[]>(() => getTodoTasks());
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Mariage');
  const [customCategory, setCustomCategory] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<TaskStatus>('todo');

  const categories = useMemo(() => {
    const fromTasks = tasks.map((task) => task.category);
    return Array.from(new Set([...BASE_CATEGORIES, ...customCategories, ...fromTasks]));
  }, [tasks, customCategories]);

  const statusOf = (task: TodoTask): TaskStatus => {
    if (task.done || task.status === 'done') return 'done';
    if (task.status === 'in_progress') return 'in_progress';
    return 'todo';
  };

  const statusCounts = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        const status = statusOf(task);
        acc[status] += 1;
        return acc;
      },
      { todo: 0, in_progress: 0, done: 0 } as Record<TaskStatus, number>
    );
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => statusOf(task) === selectedTab);
  }, [tasks, selectedTab]);

  const setTaskStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) => {
      const next = prev.map((task) => {
        if (task.id !== id) return task;
        return { ...task, done: status === 'done', status };
      });
      setTodoTasks(next);
      return next;
    });
  };

  const toggleTaskDone = (id: string) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const nextStatus = statusOf(current) === 'done' ? 'todo' : 'done';
    setTaskStatus(id, nextStatus);
  };

  const cycleTaskStatus = (id: string) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const currentStatus = statusOf(current);
    const nextStatus: TaskStatus =
      currentStatus === 'todo' ? 'in_progress' : currentStatus === 'in_progress' ? 'done' : 'todo';
    setTaskStatus(id, nextStatus);
  };

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) {
      Alert.alert('Titre requis', 'Ecris un titre de tache avant d appuyer sur Ajouter.');
      return;
    }

    const chosenCategory = selectedCategory.trim() || 'Autre';
    const nextTask: TodoTask = {
      id: String(Date.now()),
      title,
      category: chosenCategory,
      done: false,
      status: 'todo',
    };

    setTasks((prev) => {
      const next = [nextTask, ...prev];
      setTodoTasks(next);
      return next;
    });

    setNewTaskTitle('');
    setSelectedCategory('Mariage');
    setCustomCategory('');
    setModalVisible(false);
    setSelectedTab('todo');
  };

  const addCustomCategory = () => {
    const cleaned = customCategory
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    if (!cleaned) {
      Alert.alert('Categorie vide', 'Ecris un nom de categorie puis appuie sur Ajouter.');
      return;
    }

    setCustomCategories((prev) => {
      const exists = prev.some((cat) => cat.toLowerCase() === cleaned.toLowerCase());
      return exists ? prev : [...prev, cleaned];
    });
    setSelectedCategory(cleaned);
    setCustomCategory('');
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <View style={styles.root}>
        <ThemedText style={styles.title}>Ma to-do list</ThemedText>

        <View style={styles.tabsRow}>
          <StatusTab
            label="À faire"
            count={statusCounts.todo}
            active={selectedTab === 'todo'}
            onPress={() => setSelectedTab('todo')}
          />
          <StatusTab
            label="En cours"
            count={statusCounts.in_progress}
            active={selectedTab === 'in_progress'}
            onPress={() => setSelectedTab('in_progress')}
          />
          <StatusTab
            label="Terminées"
            count={statusCounts.done}
            active={selectedTab === 'done'}
            onPress={() => setSelectedTab('done')}
          />
        </View>

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>Aucune tâche dans cet onglet.</ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <TodoRow task={item} onToggleDone={() => toggleTaskDone(item.id)} onCycleStatus={() => cycleTaskStatus(item.id)} />
          )}
        />

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <PrimaryButton label="+ Ajouter une tâche" onPress={() => setModalVisible(true)} />
        </View>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <ThemedText style={styles.modalTitle}>Ajouter une tache</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Titre de la tache"
              placeholderTextColor="#9ca3af"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <ThemedText style={styles.modalLabel}>Categorie</ThemedText>
            <View style={styles.categoryWrap}>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <ThemedText
                    style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}
                  >
                    {category}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={styles.customCategoryRow}>
              <TextInput
                style={[styles.input, styles.customCategoryInput]}
                placeholder="Creer une categorie (ex: Voyage)"
                placeholderTextColor="#9ca3af"
                value={customCategory}
                onChangeText={setCustomCategory}
              />
              <Pressable style={styles.customCategoryBtn} onPress={addCustomCategory}>
                <ThemedText style={styles.customCategoryBtnText}>Ajouter</ThemedText>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <ThemedText style={styles.cancelText}>Annuler</ThemedText>
              </Pressable>
              <PrimaryButton label="Ajouter" onPress={addTask} />
            </View>
          </Pressable>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

function StatusTab({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.statusTab, active && styles.statusTabActive]} onPress={onPress}>
      <ThemedText style={[styles.statusTabText, active && styles.statusTabTextActive]}>{label}</ThemedText>
      <ThemedText style={[styles.statusCount, active && styles.statusCountActive]}>{count}</ThemedText>
    </Pressable>
  );
}

function TodoRow({
  task,
  onToggleDone,
  onCycleStatus,
}: {
  task: TodoTask;
  onToggleDone: () => void;
  onCycleStatus: () => void;
}) {
  const status: TaskStatus = task.done || task.status === 'done' ? 'done' : task.status === 'in_progress' ? 'in_progress' : 'todo';
  const isDone = status === 'done';
  const rightIconName = status === 'done' ? 'checkmark-circle' : status === 'in_progress' ? 'time-outline' : 'ellipse-outline';
  const rightIconColor = status === 'done' ? C.sauge : C.taupe;

  return (
    <View style={styles.row}>
      <Pressable style={[styles.leftCheckbox, isDone && styles.leftCheckboxDone]} onPress={onToggleDone}>
        {isDone ? <Ionicons name="checkmark" size={14} color={C.textInvert} /> : null}
      </Pressable>
      <View style={styles.rowBody}>
        <ThemedText style={[styles.rowTitle, isDone && styles.rowTitleDone]} numberOfLines={1}>
          {task.title}
        </ThemedText>
        {!isDone ? (
          <ThemedText style={styles.rowCategory} numberOfLines={1}>
            {task.category}
          </ThemedText>
        ) : null}
      </View>
      <Pressable style={styles.rightStatus} onPress={onCycleStatus}>
        <Ionicons name={rightIconName} size={22} color={rightIconColor} />
      </Pressable>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]} onPress={onPress}>
      <ThemedText style={styles.primaryBtnText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  title: { fontSize: 38, fontWeight: '400', color: C.textDark, marginBottom: 14 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTabActive: { backgroundColor: C.sauge, borderColor: C.sauge },
  statusTabText: { color: C.textMid, fontSize: 14, fontWeight: '500' },
  statusTabTextActive: { color: C.textInvert, fontWeight: '700' },
  statusCount: { color: C.textLight, fontSize: 12, fontWeight: '600' },
  statusCountActive: { color: C.ivoire },
  listContent: { gap: 2 },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 12,
  },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 46 },
  leftCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.taupe,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.cardAlt,
  },
  leftCheckboxDone: { backgroundColor: C.sauge, borderColor: C.sauge },
  rowBody: { flex: 1, justifyContent: 'center' },
  rowTitle: { fontSize: 23, color: C.textDark, fontWeight: '500' },
  rowTitleDone: { textDecorationLine: 'line-through', color: C.textLight },
  rowCategory: { marginTop: 2, fontSize: 13, color: C.textLight },
  rightStatus: { padding: 4 },
  emptyState: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { color: C.textLight, fontSize: 15 },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 0, backgroundColor: 'transparent', paddingTop: 10 },
  primaryBtn: { backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: { color: C.textInvert, fontWeight: '700', fontSize: 17 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,24,39,0.22)' },
  modalCard: { backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: C.textDark },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, backgroundColor: C.cardAlt, color: C.textDark },
  modalLabel: { fontSize: 14, fontWeight: '600', color: C.textMid },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customCategoryInput: { flex: 1 },
  customCategoryBtn: { borderRadius: 12, backgroundColor: C.saugePale, borderWidth: 1, borderColor: C.taupe, paddingVertical: 12, paddingHorizontal: 14 },
  customCategoryBtnText: { color: C.saugeDark, fontWeight: '700' },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  categoryChipActive: { borderColor: C.sauge, backgroundColor: C.saugePale },
  categoryChipText: { fontSize: 13, color: C.textMid, fontWeight: '500' },
  categoryChipTextActive: { color: C.saugeDark, fontWeight: '700' },
  modalActions: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancelBtn: { borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingVertical: 13, paddingHorizontal: 16 },
  cancelText: { color: C.textMid, fontWeight: '600' },
});
