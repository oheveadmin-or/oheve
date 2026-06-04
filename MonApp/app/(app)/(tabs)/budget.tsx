import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Circle, G, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { HeaderMenu } from '@/components/navigation/HeaderMenu';

type BudgetCategory = {
  id: string;
  label: string;
  planned: number;
  spent: number;
  status: 'safe' | 'warning' | 'danger';
  invoices: number;
  vendors: number;
  notes: string;
};

const TOTAL_BUDGET = 12000;

const INITIAL_CATEGORIES: BudgetCategory[] = [
  { id: 'venue',     label: 'Lieu de réception', planned: 5000, spent: 4200, status: 'safe',    invoices: 2, vendors: 1, notes: 'Acompte et solde prévus en juin.' },
  { id: 'catering',  label: 'Traiteur',           planned: 3000, spent: 2600, status: 'warning', invoices: 3, vendors: 1, notes: 'Négocier le cocktail de bienvenue.' },
  { id: 'deco',      label: 'Décoration',          planned: 1200, spent: 1100, status: 'warning', invoices: 2, vendors: 2, notes: 'Plafond floral peut être optimisé.' },
  { id: 'other',     label: 'Autres',              planned: 1200, spent: 500,  status: 'safe',    invoices: 1, vendors: 1, notes: 'Divers.' },
];

function euro(v: number) {
  return `${Math.round(v).toLocaleString('fr-FR')} €`;
}

function scoreStatus(ratio: number): 'safe' | 'warning' | 'danger' {
  if (ratio > 1) return 'danger';
  if (ratio > 0.85) return 'warning';
  return 'safe';
}

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<BudgetCategory[]>(INITIAL_CATEGORIES);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [newCatId, setNewCatId] = useState(INITIAL_CATEGORIES[0].id);
  const [newNote, setNewNote] = useState('');

  const spent = useMemo(() => categories.reduce((s, c) => s + c.spent, 0), [categories]);
  const usedPct = Math.round((spent / TOTAL_BUDGET) * 100);

  // Simple single donut
  const donutSize = 200;
  const stroke = 18;
  const radius = (donutSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filledLen = (usedPct / 100) * circumference;
  const emptyLen = circumference - filledLen;

  const handleAdd = () => {
    const amount = Number(newAmount.replace(',', '.'));
    if (!amount || amount <= 0) { Alert.alert('Montant invalide', 'Entrez un montant correct.'); return; }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === newCatId
          ? { ...c, spent: c.spent + amount, status: scoreStatus((c.spent + amount) / c.planned), invoices: c.invoices + 1 }
          : c
      )
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddExpense(false);
    setNewAmount('');
    setNewNote('');
  };

  const handleReset = () => {
    Alert.alert(
      'Remettre à zéro',
      'Toutes les dépenses enregistrées seront effacées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser', style: 'destructive',
          onPress: () => setCategories(INITIAL_CATEGORIES.map((c) => ({ ...c, spent: 0, status: 'safe' as const }))),
        },
      ]
    );
  };

  const selected = categories.find((c) => c.id === selectedId);

  return (
    <ScreenLayout edges={['top', 'left', 'right']} style={{ backgroundColor: C.ivoire }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <ThemedText style={styles.headerOverline}>Mon mariage</ThemedText>
          <ThemedText style={styles.title}>Budget</ThemedText>
        </View>
        <HeaderMenu />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>

        {/* Vue d'ensemble label */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <ThemedText style={styles.overviewLabel}>Vue d'ensemble</ThemedText>
        </Animated.View>

        {/* Donut chart */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.donutWrap}>
          <Svg width={donutSize} height={donutSize}>
            <G rotation={-90} origin={`${donutSize / 2}, ${donutSize / 2}`}>
              {/* Track */}
              <Circle
                cx={donutSize / 2} cy={donutSize / 2} r={radius}
                stroke="#E8EDE4" strokeWidth={stroke} fill="transparent"
              />
              {/* Fill */}
              <Circle
                cx={donutSize / 2} cy={donutSize / 2} r={radius}
                stroke={C.sauge} strokeWidth={stroke} fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${filledLen} ${emptyLen}`}
                strokeDashoffset={0}
              />
            </G>
          </Svg>
          <View style={styles.donutCenter}>
            <ThemedText style={styles.donutPct}>{usedPct}%</ThemedText>
            <ThemedText style={styles.donutSub}>du budget utilisé</ThemedText>
          </View>
        </Animated.View>

        {/* Total */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.totalRow}>
          <ThemedText style={styles.totalText}>{euro(spent)} / {euro(TOTAL_BUDGET)}</ThemedText>
        </Animated.View>

        {/* Category list */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.listCard}>
          {categories.map((cat, i) => (
            <Pressable
              key={cat.id}
              style={[styles.listRow, i < categories.length - 1 && styles.listRowBorder]}
              onPress={() => { setSelectedId(cat.id); setShowDetail(true); }}
            >
              <ThemedText style={styles.listLabel}>{cat.label}</ThemedText>
              <ThemedText style={styles.listAmount}>{euro(cat.spent)}</ThemedText>
            </Pressable>
          ))}

          {/* Voir le détail */}
          <Pressable
            style={styles.detailLink}
            onPress={() => { setSelectedId(null); setShowDetail(true); }}
          >
            <ThemedText style={styles.detailLinkTxt}>Voir le détail</ThemedText>
            <Ionicons name="chevron-forward" size={14} color={C.textMid} />
          </Pressable>
        </Animated.View>

        {/* Réinitialiser */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={16} color={C.error} />
            <ThemedText style={styles.resetTxt}>Remettre à zéro</ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => { setShowAddExpense(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      {/* Detail modal — full breakdown */}
      <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowDetail(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.sheetTitle}>
              {selected ? selected.label : 'Détail du budget'}
            </ThemedText>

            {selected ? (
              <>
                <View style={styles.sheetRow}>
                  <ThemedText style={styles.sheetMetaLabel}>Dépensé</ThemedText>
                  <ThemedText style={styles.sheetMetaVal}>{euro(selected.spent)}</ThemedText>
                </View>
                <View style={styles.sheetRow}>
                  <ThemedText style={styles.sheetMetaLabel}>Prévu</ThemedText>
                  <ThemedText style={styles.sheetMetaVal}>{euro(selected.planned)}</ThemedText>
                </View>
                <View style={styles.sheetRow}>
                  <ThemedText style={styles.sheetMetaLabel}>Factures</ThemedText>
                  <ThemedText style={styles.sheetMetaVal}>{selected.invoices}</ThemedText>
                </View>
                <ThemedText style={styles.sheetNotes}>{selected.notes}</ThemedText>
                <Pressable style={styles.sheetAddBtn} onPress={() => { setShowDetail(false); setNewCatId(selected.id); setShowAddExpense(true); }}>
                  <ThemedText style={styles.sheetAddBtnTxt}>+ Ajouter une dépense</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                {categories.map((cat) => (
                  <View key={cat.id} style={styles.sheetDetailRow}>
                    <ThemedText style={styles.sheetDetailLabel}>{cat.label}</ThemedText>
                    <View style={styles.sheetDetailRight}>
                      <View style={styles.sheetDetailTrack}>
                        <View style={[styles.sheetDetailFill, { width: `${Math.min(100, Math.round((cat.spent / cat.planned) * 100))}%`, backgroundColor: cat.status === 'danger' ? C.error : cat.status === 'warning' ? C.warning : C.sauge }]} />
                      </View>
                      <ThemedText style={styles.sheetDetailAmt}>{euro(cat.spent)}</ThemedText>
                    </View>
                  </View>
                ))}
                <View style={[styles.sheetDetailRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }]}>
                  <ThemedText style={[styles.sheetDetailLabel, { fontWeight: '700' }]}>Total dépensé</ThemedText>
                  <ThemedText style={[styles.sheetDetailAmt, { fontWeight: '800', color: C.textDark }]}>{euro(spent)}</ThemedText>
                </View>
                <View style={styles.sheetDetailRow}>
                  <ThemedText style={[styles.sheetDetailLabel, { fontWeight: '700' }]}>Budget restant</ThemedText>
                  <ThemedText style={[styles.sheetDetailAmt, { fontWeight: '800', color: C.sauge }]}>{euro(Math.max(0, TOTAL_BUDGET - spent))}</ThemedText>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add expense modal */}
      <Modal visible={showAddExpense} transparent animationType="slide" onRequestClose={() => setShowAddExpense(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.sheetTitle}>Nouvelle dépense</ThemedText>

            <TextInput
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="Montant (ex: 450)"
              keyboardType="decimal-pad"
              style={styles.input}
              placeholderTextColor={C.textLight}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.catChip, newCatId === c.id && styles.catChipOn]}
                  onPress={() => setNewCatId(c.id)}
                >
                  <ThemedText style={[styles.catChipTxt, newCatId === c.id && { color: '#fff' }]}>{c.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Note (optionnel)"
              style={[styles.input, { height: 72 }]}
              multiline
              placeholderTextColor={C.textLight}
            />

            <View style={styles.addActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddExpense(false)}>
                <ThemedText style={styles.cancelTxt}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleAdd}>
                <ThemedText style={styles.confirmTxt}>Ajouter</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  headerOverline: { fontSize: 12, color: C.textLight, marginBottom: 2, letterSpacing: 0.5 },
  title: { fontSize: 32, fontWeight: '700', color: C.textDark },
  content: { gap: 0, paddingTop: 4 },

  overviewLabel: {
    fontSize: 14, color: C.textMid, fontWeight: '500',
    marginBottom: 16, marginTop: 8,
  },

  donutWrap: {
    alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  donutPct: { fontSize: 36, fontWeight: '700', color: C.textDark },
  donutSub: { fontSize: 13, color: C.textMid, marginTop: 2, textAlign: 'center' },

  totalRow: { alignItems: 'center', marginBottom: 28 },
  totalText: { fontSize: 17, fontWeight: '600', color: C.textDark, letterSpacing: 0.2 },

  listCard: {
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  listRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  listLabel: { fontSize: 15, color: C.textDark, fontWeight: '400' },
  listAmount: { fontSize: 15, color: C.textDark, fontWeight: '600' },

  detailLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  detailLinkTxt: { fontSize: 14, color: C.textMid, fontWeight: '500' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginBottom: 8,
  },
  resetTxt: { fontSize: 14, color: C.error, fontWeight: '500' },

  fab: {
    position: 'absolute', right: 22,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.sauge,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.shadow, shadowOpacity: 0.22,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(61,53,48,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 14, gap: 12,
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: C.taupe, marginBottom: 6,
  },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: C.textDark },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetMetaLabel: { fontSize: 14, color: C.textLight },
  sheetMetaVal: { fontSize: 16, fontWeight: '700', color: C.textDark },
  sheetNotes: { fontSize: 13, color: C.textMid, lineHeight: 19 },
  sheetAddBtn: {
    backgroundColor: C.sauge, borderRadius: RADIUS.md,
    paddingVertical: 13, alignItems: 'center',
  },
  sheetAddBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sheetDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetDetailLabel: { fontSize: 14, color: C.textDark, flex: 1 },
  sheetDetailRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' },
  sheetDetailTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.saugePale, overflow: 'hidden' },
  sheetDetailFill: { height: '100%', borderRadius: 3 },
  sheetDetailAmt: { fontSize: 13, color: C.textMid, fontWeight: '600', minWidth: 64, textAlign: 'right' },

  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.textDark, backgroundColor: C.ivoire,
  },
  catRow: { gap: 8, paddingVertical: 4 },
  catChip: {
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card,
  },
  catChipOn: { backgroundColor: C.sauge, borderColor: C.sauge },
  catChipTxt: { fontSize: 13, color: C.textMid, fontWeight: '600' },

  addActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, borderRadius: RADIUS.md, backgroundColor: C.saugePale,
    alignItems: 'center', paddingVertical: 13,
  },
  cancelTxt: { color: C.saugeDark, fontWeight: '700' },
  confirmBtn: {
    flex: 1, borderRadius: RADIUS.md, backgroundColor: C.sauge,
    alignItems: 'center', paddingVertical: 13,
  },
  confirmTxt: { color: '#fff', fontWeight: '700' },
});
