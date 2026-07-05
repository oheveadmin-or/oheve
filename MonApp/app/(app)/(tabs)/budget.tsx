import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Circle, G, Svg } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { KeyboardDoneBar, keyboardDoneProps } from '@/components/ui/keyboard-done-bar';
import { C, RADIUS } from '@/constants/OheveTheme';
import {
  addExpense,
  removeExpense,
  updatePlanned,
  resetBudget,
  useBudgetState,
} from '@/lib/budget-store';

function euro(v: number) {
  return `${Math.round(v).toLocaleString('fr-FR')} €`;
}

function pct(spent: number, planned: number) {
  if (!planned) return 0;
  return Math.min(100, Math.round((spent / planned) * 100));
}

function scoreStatus(spent: number, planned: number): 'safe' | 'warning' | 'danger' {
  if (!planned) return 'safe';
  const r = spent / planned;
  if (r > 1) return 'danger';
  if (r > 0.85) return 'warning';
  return 'safe';
}

const STATUS_COLOR = { safe: C.sauge, warning: '#D4A853', danger: '#C0503A' };

const TYPE_LABELS = { acompte: 'Acompte', solde: 'Solde final', depense: 'Dépense' };
const TYPE_COLORS = { acompte: '#D4A853', solde: C.sauge, depense: C.textMid };

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();

  const {
    categories,
    totalBudget,
    totalSpent,
    totalAcomptes: totalAcomp,
    totalSoldes: totalSolde,
  } = useBudgetState();
  const totalPaid   = totalAcomp + totalSolde;

  const [showDetail,    setShowDetail]    = useState(false);
  const [selectedKey,   setSelectedKey]   = useState<string | null>(null);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newAmount,     setNewAmount]     = useState('');
  const [newCatKey,     setNewCatKey]     = useState(categories[0]?.key ?? 'salle');
  const [newType,       setNewType]       = useState<'acompte'|'solde'|'depense'>('acompte');
  const [newNote,       setNewNote]       = useState('');
  const [editKey,       setEditKey]       = useState('');
  const [editPlanned,   setEditPlanned]   = useState('');

  const usedPct  = totalBudget > 0 ? Math.min(100, Math.round((totalSpent  / totalBudget) * 100)) : 0;
  const paidPct  = totalBudget > 0 ? Math.min(100, Math.round((totalPaid   / totalBudget) * 100)) : 0;

  // Donut compact
  const DS = 160, stroke = 14;
  const rad = (DS - stroke) / 2;
  const circ = 2 * Math.PI * rad;
  const filledLen = (usedPct / 100) * circ;

  const selected = categories.find(c => c.key === selectedKey);

  const handleAdd = () => {
    const amount = Number(newAmount.replace(',', '.'));
    if (!amount || amount <= 0) { Alert.alert('Montant invalide'); return; }
    addExpense({ categoryKey: newCatKey, amount, type: newType, note: newNote || undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    setNewAmount(''); setNewNote('');
  };

  const handleEditPlanned = () => {
    const amount = Number(editPlanned.replace(',', '.'));
    if (isNaN(amount) || amount < 0) { Alert.alert('Montant invalide'); return; }
    updatePlanned(editKey, amount);
    setShowEditModal(false);
  };

  const handleReset = () => {
    Alert.alert('Remettre à zéro', 'Toutes les dépenses seront effacées.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: () => { resetBudget(); } },
    ]);
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']} style={{ backgroundColor: C.ivoire }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.overline}>Mon mariage</ThemedText>
          <ThemedText style={styles.title}>Budget</ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Vue d'ensemble compacte ── */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.overviewCard}>
          {/* Donut + textes côte à côte */}
          <View style={styles.overviewTop}>
            {/* Donut */}
            <View style={styles.donutWrap}>
              <Svg width={DS} height={DS}>
                <G rotation={-90} origin={`${DS/2}, ${DS/2}`}>
                  <Circle cx={DS/2} cy={DS/2} r={rad}
                    stroke={C.saugePale} strokeWidth={stroke} fill="transparent" />
                  <Circle cx={DS/2} cy={DS/2} r={rad}
                    stroke={C.sauge} strokeWidth={stroke} fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${filledLen} ${circ - filledLen}`} />
                </G>
              </Svg>
              <View style={styles.donutCenter}>
                <ThemedText style={styles.donutPct}>{usedPct}%</ThemedText>
                <ThemedText style={styles.donutSub}>utilisé</ThemedText>
              </View>
            </View>

            {/* Chiffres */}
            <View style={styles.overviewStats}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statVal}>{euro(totalSpent)}</ThemedText>
                <ThemedText style={styles.statLabel}>Dépensé</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statVal, { color: C.sauge }]}>
                  {totalBudget > 0 ? euro(Math.max(0, totalBudget - totalSpent)) : '—'}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Restant</ThemedText>
              </View>
              {totalBudget > 0 && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statVal}>{euro(totalBudget)}</ThemedText>
                    <ThemedText style={styles.statLabel}>Budget total</ThemedText>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* ── Carte Acomptes ── */}
          <View style={styles.acompteCard}>
            <View style={styles.acompteHeader}>
              <View style={styles.acompteIconWrap}>
                <Ionicons name="card-outline" size={16} color={C.saugeDark} />
              </View>
              <ThemedText style={styles.acompteTitle}>Paiements versés</ThemedText>
              <ThemedText style={styles.acomplePct}>
                {totalBudget > 0 ? `${paidPct}%` : ''}
              </ThemedText>
            </View>

            {/* Barre de paiement */}
            <View style={styles.payTrack}>
              {/* Acomptes (jaune) */}
              <View style={[styles.payFillAcomp, {
                width: `${totalBudget > 0 ? Math.min(100, Math.round((totalAcomp / totalBudget) * 100)) : 0}%` as any,
              }]} />
              {/* Soldes (vert) superposés */}
              <View style={[styles.payFillSolde, {
                width: `${totalBudget > 0 ? Math.min(100, Math.round((totalPaid / totalBudget) * 100)) : 0}%` as any,
              }]} />
            </View>

            {/* Légende */}
            <View style={styles.payLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#D4A853' }]} />
                <ThemedText style={styles.legendTxt}>Acomptes : {euro(totalAcomp)}</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: C.sauge }]} />
                <ThemedText style={styles.legendTxt}>Soldes : {euro(totalSolde)}</ThemedText>
              </View>
            </View>

            {totalBudget > 0 && (
              <ThemedText style={styles.remainingPay}>
                Reste à payer : {euro(Math.max(0, totalBudget - totalPaid))}
              </ThemedText>
            )}
          </View>
        </Animated.View>

        {/* ── Catégories ── */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <ThemedText style={styles.sectionTitle}>Par catégorie</ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.listCard}>
          {categories.map((cat, i) => {
            const spent   = cat.entries.reduce((s, e) => s + e.amount, 0);
            const acomp   = cat.entries.filter(e => e.type === 'acompte').reduce((s, e) => s + e.amount, 0);
            const status  = scoreStatus(spent, cat.planned);
            const p       = pct(spent, cat.planned);
            return (
              <Pressable
                key={cat.key}
                style={[styles.catRow, i < categories.length - 1 && styles.catRowBorder]}
                onPress={() => { setSelectedKey(cat.key); setShowDetail(true); }}
              >
                <View style={styles.catIconWrap}>
                  <ThemedText style={styles.catIcon}>{cat.icon}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.catTopRow}>
                    <ThemedText style={styles.catLabel}>{cat.label}</ThemedText>
                    <View style={styles.catAmounts}>
                      <ThemedText style={[styles.catSpent, spent > 0 && { color: STATUS_COLOR[status] }]}>
                        {euro(spent)}
                      </ThemedText>
                      {cat.planned > 0 && (
                        <ThemedText style={styles.catPlanned}>/{euro(cat.planned)}</ThemedText>
                      )}
                    </View>
                  </View>
                  {/* Barre */}
                  {cat.planned > 0 ? (
                    <View style={styles.miniTrack}>
                      <View style={[styles.miniFill, {
                        width: `${p}%` as any,
                        backgroundColor: STATUS_COLOR[status],
                      }]} />
                    </View>
                  ) : (
                    <View style={styles.miniTrack}>
                      <View style={[styles.miniFill, { width: spent > 0 ? '30%' as any : '0%' as any, backgroundColor: C.saugePale }]} />
                    </View>
                  )}
                  {/* Badge acompte */}
                  {acomp > 0 && (
                    <ThemedText style={styles.acompBadge}>💰 Acompte : {euro(acomp)}</ThemedText>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.textLight} style={{ marginLeft: 6 }} />
              </Pressable>
            );
          })}

          <Pressable style={styles.detailLink} onPress={() => { setSelectedKey(null); setShowDetail(true); }}>
            <ThemedText style={styles.detailLinkTxt}>Voir le détail complet</ThemedText>
            <Ionicons name="chevron-forward" size={14} color={C.textMid} />
          </Pressable>
        </Animated.View>

        {/* Réinitialiser */}
        <Pressable style={styles.resetBtn} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={15} color={C.error} />
          <ThemedText style={styles.resetTxt}>Remettre à zéro</ThemedText>
        </Pressable>
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => {
          setNewCatKey(categories[0]?.key ?? 'salle');
          setNewType('acompte');
          setShowAddModal(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      {/* ── Modal détail catégorie ── */}
      <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowDetail(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />

            {selected ? (
              <>
                <View style={styles.sheetCatHeader}>
                  <ThemedText style={{ fontSize: 26 }}>{selected.icon}</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.sheetTitle}>{selected.label}</ThemedText>
                  </View>
                  <Pressable style={styles.editBtn} onPress={() => {
                    setEditKey(selected.key);
                    setEditPlanned(String(selected.planned || ''));
                    setShowDetail(false);
                    setTimeout(() => setShowEditModal(true), 350);
                  }}>
                    <Ionicons name="pencil-outline" size={15} color={C.saugeDark} />
                    <ThemedText style={styles.editBtnTxt}>Modifier le budget</ThemedText>
                  </Pressable>
                </View>

                {/* Stats */}
                {(() => {
                  const spent   = selected.entries.reduce((s, e) => s + e.amount, 0);
                  const acomp   = selected.entries.filter(e => e.type === 'acompte').reduce((s, e) => s + e.amount, 0);
                  const solde   = selected.entries.filter(e => e.type === 'solde').reduce((s, e) => s + e.amount, 0);
                  const status  = scoreStatus(spent, selected.planned);
                  return (
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <ThemedText style={styles.statBoxVal}>{euro(spent)}</ThemedText>
                        <ThemedText style={styles.statBoxLbl}>Total dépensé</ThemedText>
                      </View>
                      <View style={styles.statBox}>
                        <ThemedText style={[styles.statBoxVal, { color: '#D4A853' }]}>{euro(acomp)}</ThemedText>
                        <ThemedText style={styles.statBoxLbl}>Acomptes</ThemedText>
                      </View>
                      <View style={styles.statBox}>
                        <ThemedText style={[styles.statBoxVal, { color: C.sauge }]}>{euro(solde)}</ThemedText>
                        <ThemedText style={styles.statBoxLbl}>Soldes</ThemedText>
                      </View>
                      {selected.planned > 0 && (
                        <View style={styles.statBox}>
                          <ThemedText style={[styles.statBoxVal, { color: STATUS_COLOR[status] }]}>
                            {euro(Math.max(0, selected.planned - spent))}
                          </ThemedText>
                          <ThemedText style={styles.statBoxLbl}>Restant</ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Liste dépenses */}
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {selected.entries.length === 0 ? (
                    <ThemedText style={styles.empty}>Aucune dépense enregistrée</ThemedText>
                  ) : selected.entries.map(entry => (
                    <View key={entry.id} style={styles.entryRow}>
                      <View style={[styles.entryTypeBadge, { backgroundColor: TYPE_COLORS[entry.type] + '22' }]}>
                        <ThemedText style={[styles.entryTypeTxt, { color: TYPE_COLORS[entry.type] }]}>
                          {TYPE_LABELS[entry.type]}
                        </ThemedText>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        {entry.providerName && (
                          <ThemedText style={styles.entryProvider}>{entry.providerName}</ThemedText>
                        )}
                        {entry.note && <ThemedText style={styles.entryNote}>{entry.note}</ThemedText>}
                        <ThemedText style={styles.entryDate}>
                          {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.entryAmt}>{euro(entry.amount)}</ThemedText>
                      <Pressable onPress={() => { removeExpense(selected.key, entry.id); }} hitSlop={8} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={14} color={C.error} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>

                <Pressable style={styles.addBtn} onPress={() => {
                  setShowDetail(false);
                  setNewCatKey(selected.key);
                  setNewType('acompte');
                  setShowAddModal(true);
                }}>
                  <ThemedText style={styles.addBtnTxt}>+ Ajouter un paiement</ThemedText>
                </Pressable>
              </>
            ) : (
              /* Vue globale */
              <>
                <ThemedText style={styles.sheetTitle}>Détail complet</ThemedText>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                  {/* Récap paiements */}
                  <View style={styles.globalRecap}>
                    <View style={styles.globalRecapRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#D4A853', width: 10, height: 10 }]} />
                      <ThemedText style={styles.globalRecapLabel}>Total acomptes</ThemedText>
                      <ThemedText style={styles.globalRecapVal}>{euro(totalAcomp)}</ThemedText>
                    </View>
                    <View style={styles.globalRecapRow}>
                      <View style={[styles.legendDot, { backgroundColor: C.sauge, width: 10, height: 10 }]} />
                      <ThemedText style={styles.globalRecapLabel}>Total soldes finaux</ThemedText>
                      <ThemedText style={styles.globalRecapVal}>{euro(totalSolde)}</ThemedText>
                    </View>
                    <View style={[styles.globalRecapRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }]}>
                      <Ionicons name="checkmark-circle" size={12} color={C.sauge} />
                      <ThemedText style={[styles.globalRecapLabel, { fontWeight: '700' }]}>Total versé</ThemedText>
                      <ThemedText style={[styles.globalRecapVal, { fontWeight: '800', color: C.sauge }]}>{euro(totalPaid)}</ThemedText>
                    </View>
                    {totalBudget > 0 && (
                      <View style={styles.globalRecapRow}>
                        <Ionicons name="time-outline" size={12} color={C.textMid} />
                        <ThemedText style={styles.globalRecapLabel}>Reste à payer</ThemedText>
                        <ThemedText style={[styles.globalRecapVal, { color: '#C0503A' }]}>{euro(Math.max(0, totalBudget - totalPaid))}</ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Par catégorie */}
                  {categories.map(cat => {
                    const spent  = cat.entries.reduce((s, e) => s + e.amount, 0);
                    const acomp  = cat.entries.filter(e => e.type === 'acompte').reduce((s, e) => s + e.amount, 0);
                    const status = scoreStatus(spent, cat.planned);
                    const p      = pct(spent, cat.planned);
                    return (
                      <Pressable key={cat.key} style={styles.globalCatRow} onPress={() => setSelectedKey(cat.key)}>
                        <ThemedText style={{ fontSize: 20 }}>{cat.icon}</ThemedText>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={styles.catTopRow}>
                            <ThemedText style={styles.catLabel}>{cat.label}</ThemedText>
                            <ThemedText style={[styles.catSpent, { color: spent > 0 ? STATUS_COLOR[status] : C.textLight }]}>
                              {euro(spent)}
                            </ThemedText>
                          </View>
                          {cat.planned > 0 && (
                            <View style={styles.miniTrack}>
                              <View style={[styles.miniFill, { width: `${p}%` as any, backgroundColor: STATUS_COLOR[status] }]} />
                            </View>
                          )}
                          {acomp > 0 && <ThemedText style={styles.acompBadge}>💰 {euro(acomp)} versé</ThemedText>}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal ajout paiement ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <ThemedText style={styles.sheetTitle}>Nouveau paiement</ThemedText>

            {/* Type */}
            <View style={styles.typeRow}>
              {(['acompte', 'solde', 'depense'] as const).map(t => (
                <Pressable
                  key={t}
                  style={[styles.typeChip, newType === t && { backgroundColor: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] }]}
                  onPress={() => setNewType(t)}
                >
                  <ThemedText style={[styles.typeChipTxt, newType === t && { color: '#fff' }]}>
                    {TYPE_LABELS[t]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View>
              <ThemedText style={styles.fieldLabel}>Montant *</ThemedText>
              <View style={styles.amountRow}>
                <TextInput
                  value={newAmount}
                  onChangeText={setNewAmount}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.amountInput]}
                  placeholderTextColor={C.textLight}
                  autoFocus
                  {...keyboardDoneProps}
                />
                <ThemedText style={styles.amountSuffix}>€</ThemedText>
              </View>
            </View>

            <View>
              <ThemedText style={styles.fieldLabel}>Catégorie</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {categories.map(c => (
                  <Pressable
                    key={c.key}
                    style={[styles.catChip, newCatKey === c.key && styles.catChipOn]}
                    onPress={() => setNewCatKey(c.key)}
                  >
                    <ThemedText style={styles.catChipIcon}>{c.icon}</ThemedText>
                    <ThemedText style={[styles.catChipTxt, newCatKey === c.key && { color: '#fff' }]}>
                      {c.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View>
              <ThemedText style={styles.fieldLabel}>Prestataire / Note <ThemedText style={{ color: C.textLight, fontWeight: '400' }}>(optionnel)</ThemedText></ThemedText>
              <TextInput
                value={newNote}
                onChangeText={setNewNote}
                placeholder="Ex : Château des Roses"
                style={[styles.input, { height: 56 }]}
                multiline
                placeholderTextColor={C.textLight}
              />
            </View>

            <View style={styles.addActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <ThemedText style={styles.cancelTxt}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor: TYPE_COLORS[newType] }]} onPress={handleAdd}>
                <ThemedText style={styles.confirmTxt}>Ajouter</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
        <KeyboardDoneBar />
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal modifier budget prévu ── */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <ThemedText style={styles.sheetTitle}>Budget prévu</ThemedText>
            <ThemedText style={{ fontSize: 13, color: C.textMid }}>
              {categories.find(c => c.key === editKey)?.icon} {categories.find(c => c.key === editKey)?.label}
            </ThemedText>
            <TextInput
              value={editPlanned}
              onChangeText={setEditPlanned}
              placeholder="Ex: 5000"
              keyboardType="decimal-pad"
              style={styles.input}
              placeholderTextColor={C.textLight}
              autoFocus
              {...keyboardDoneProps}
            />
            <View style={styles.addActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <ThemedText style={styles.cancelTxt}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleEditPlanned}>
                <ThemedText style={styles.confirmTxt}>Enregistrer</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
        <KeyboardDoneBar />
        </KeyboardAvoidingView>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 10 },
  backBtn: { padding: 4 },
  overline:  { fontSize: 12, color: C.textLight, letterSpacing: 0.5 },
  title:     { fontSize: 30, fontWeight: '700', color: C.textDark },
  content:   { gap: 12, paddingTop: 4 },

  // ── Overview card ──
  overviewCard: {
    backgroundColor: C.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 14,
  },
  overviewTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  donutWrap: { alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutPct: { fontSize: 26, fontWeight: '800', color: C.textDark },
  donutSub: { fontSize: 10, color: C.textMid, marginTop: 1 },
  overviewStats: { flex: 1, gap: 10 },
  statItem: { gap: 1 },
  statVal:   { fontSize: 15, fontWeight: '700', color: C.textDark },
  statLabel: { fontSize: 11, color: C.textMid },
  statDivider: { height: 1, backgroundColor: C.border },

  // ── Acompte card ──
  acompteCard: {
    backgroundColor: C.saugePale, borderRadius: RADIUS.md,
    padding: 12, gap: 8,
  },
  acompteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  acompteIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },
  acompteTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: C.textDark },
  acomplePct: { fontSize: 15, fontWeight: '800', color: C.saugeDark },
  payTrack: {
    height: 10, borderRadius: 5,
    backgroundColor: C.border, overflow: 'hidden',
    position: 'relative',
  },
  payFillSolde: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: C.sauge, borderRadius: 5,
  },
  payFillAcomp: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: '#D4A853', borderRadius: 5,
  },
  payLegend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11, color: C.textMid, fontWeight: '500' },
  remainingPay: { fontSize: 12, color: '#C0503A', fontWeight: '600' },

  // ── Liste catégories ──
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.textDark, marginTop: 4 },
  listCard: {
    backgroundColor: C.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  catRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  catIconWrap: {
    width: 34, height: 34, borderRadius: RADIUS.md,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  catIcon: { fontSize: 17 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catLabel: { fontSize: 13, fontWeight: '600', color: C.textDark, flex: 1 },
  catAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  catSpent: { fontSize: 13, fontWeight: '700', color: C.textMid },
  catPlanned: { fontSize: 10, color: C.textLight },
  miniTrack: { height: 3, borderRadius: 2, backgroundColor: C.saugePale, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },
  acompBadge: { fontSize: 10, color: '#B8892E', marginTop: 3, fontWeight: '500' },
  detailLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  detailLinkTxt: { fontSize: 13, color: C.textMid, fontWeight: '500' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  resetTxt: { fontSize: 13, color: C.error, fontWeight: '500' },

  fab: {
    position: 'absolute', right: 22,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.shadow, shadowOpacity: 0.22, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(61,53,48,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 14, gap: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.taupe, marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.textDark },

  sheetCatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: C.saugePale, borderRadius: RADIUS.md,
  },
  editBtnTxt: { fontSize: 11, color: C.saugeDark, fontWeight: '600' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flex: 1, minWidth: 72,
    backgroundColor: C.saugePale, borderRadius: RADIUS.md,
    padding: 10, alignItems: 'center',
  },
  statBoxVal: { fontSize: 14, fontWeight: '700', color: C.textDark },
  statBoxLbl: { fontSize: 10, color: C.textMid, marginTop: 2 },

  empty: { fontSize: 13, color: C.textLight, textAlign: 'center', paddingVertical: 14 },

  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  entryTypeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  entryTypeTxt: { fontSize: 10, fontWeight: '700' },
  entryProvider: { fontSize: 13, fontWeight: '700', color: C.textDark },
  entryNote: { fontSize: 11, color: C.textMid },
  entryDate: { fontSize: 10, color: C.textLight, marginTop: 1 },
  entryAmt: { fontSize: 14, fontWeight: '700', color: C.textDark, marginRight: 6 },

  addBtn: { backgroundColor: C.sauge, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Global detail
  globalRecap: {
    backgroundColor: C.saugePale, borderRadius: RADIUS.md,
    padding: 12, gap: 8, marginBottom: 12,
  },
  globalRecapRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  globalRecapLabel: { flex: 1, fontSize: 13, color: C.textDark },
  globalRecapVal: { fontSize: 14, fontWeight: '700', color: C.textDark },
  globalCatRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },

  // Modals
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', color: C.textDark },
  amountSuffix: { fontSize: 22, fontWeight: '700', color: C.textDark },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1, paddingVertical: 9, alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  typeChipTxt: { fontSize: 12, fontWeight: '700', color: C.textMid },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.textDark, backgroundColor: C.ivoire,
  },
  chipRow: { gap: 8, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.card,
  },
  catChipOn: { backgroundColor: C.sauge, borderColor: C.sauge },
  catChipIcon: { fontSize: 13 },
  catChipTxt: { fontSize: 12, color: C.textMid, fontWeight: '600' },
  addActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: RADIUS.md, backgroundColor: C.saugePale, alignItems: 'center', paddingVertical: 13 },
  cancelTxt: { color: C.saugeDark, fontWeight: '700' },
  confirmBtn: { flex: 1, borderRadius: RADIUS.md, backgroundColor: C.sauge, alignItems: 'center', paddingVertical: 13 },
  confirmTxt: { color: '#fff', fontWeight: '700' },
});
