import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PaywallModal } from '@/components/paywall-modal';
import { PremiumGate } from '@/components/premium-gate';
import { SeatingPlanExportModal } from '@/components/seating-plan/ExportModal';
import { useAuth } from '@/contexts/auth-context';
import { usePremiumAccess } from '@/hooks/use-premium-access';
import type { SeatingPlanData, WeddingMeta } from '@/lib/seating-plan/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

const { width: SCREEN_W } = Dimensions.get('window');

type TableShape = 'round' | 'oval' | 'rect';

type SeatingTable = {
  id: string;
  name: string;
  shape: TableShape;
  seats: number;
  x: number;
  y: number;
  color: string;
  guestIds: string[];
  tableWidthCm: number;
  tableHeightCm: number;
  pixelW?: number;
  pixelH?: number;
};

type Guest = {
  id: string;
  name: string;
  guestCount: number;
};

const COLORS = ['#8F947F', '#C7B7A5', '#7B7063', '#A09480', '#B5A692', '#6B7060', '#C4B5A0', '#9A8C7E'];

const DIMS: Record<TableShape, { w: number; h: number }> = {
  round: { w: 82, h: 82 },
  oval: { w: 116, h: 72 },
  rect: { w: 106, h: 68 },
};

const SEAT_PAD = 14;

function seatPositions(shape: TableShape, seats: number, w: number, h: number): { x: number; y: number }[] {
  const cx = w / 2;
  const cy = h / 2;
  const pts: { x: number; y: number }[] = [];

  if (shape === 'round') {
    const r = w / 2 + SEAT_PAD;
    for (let i = 0; i < seats; i++) {
      const a = (2 * Math.PI * i) / seats - Math.PI / 2;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  } else if (shape === 'oval') {
    const rx = w / 2 + SEAT_PAD;
    const ry = h / 2 + SEAT_PAD;
    for (let i = 0; i < seats; i++) {
      const a = (2 * Math.PI * i) / seats - Math.PI / 2;
      pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
    }
  } else {
    const top = Math.ceil(seats / 2);
    const bottom = seats - top;
    for (let i = 0; i < top; i++) {
      pts.push({ x: ((i + 1) * w) / (top + 1), y: -SEAT_PAD });
    }
    for (let i = 0; i < bottom; i++) {
      pts.push({ x: ((i + 1) * w) / (bottom + 1), y: h + SEAT_PAD });
    }
  }
  return pts;
}

// ── Draggable Table ──────────────────────────────────────────────────────────

function DraggableTable({
  table,
  isSelected,
  guests,
  onSelect,
  onDragEnd,
}: {
  table: SeatingTable;
  isSelected: boolean;
  guests: Guest[];
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}) {
  const ox = useSharedValue(table.x);
  const oy = useSharedValue(table.y);
  const sx = useSharedValue(table.x);
  const sy = useSharedValue(table.y);

  const tw = table.pixelW ?? DIMS[table.shape].w;
  const th = table.pixelH ?? DIMS[table.shape].h;
  const pad = SEAT_PAD + 6;
  const totalW = tw + pad * 2;
  const totalH = th + pad * 2;

  const assigned = table.guestIds.reduce((sum, gid) => {
    const g = guests.find((g) => g.id === gid);
    return sum + (g?.guestCount ?? 1);
  }, 0);

  const dots = seatPositions(table.shape, table.seats, tw, th);

  const pan = Gesture.Pan()
    .onStart(() => {
      sx.value = ox.value;
      sy.value = oy.value;
    })
    .onUpdate((e) => {
      ox.value = sx.value + e.translationX;
      oy.value = sy.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(onDragEnd)(table.id, ox.value, oy.value);
    });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_e, success) => {
      if (success) {
        runOnJS(onSelect)(table.id);
      }
    });

  const gesture = Gesture.Simultaneous(pan, tap);

  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: totalW,
    height: totalH,
    transform: [{ translateX: ox.value - pad }, { translateY: oy.value - pad }],
    zIndex: isSelected ? 10 : 1,
  }));

  const br = table.shape === 'round' ? Math.min(tw, th) / 2 : table.shape === 'oval' ? th / 2 : 10;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={containerStyle}>
        {dots.map((p, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                left: p.x + pad - 5,
                top: p.y + pad - 5,
                backgroundColor: isSelected ? table.color : '#c4c4d4',
              },
            ]}
          />
        ))}
        <View
          style={[
            styles.tableBody,
            {
              left: pad,
              top: pad,
              width: tw,
              height: th,
              borderRadius: br,
              backgroundColor: isSelected ? table.color : table.color + '22',
              borderColor: table.color,
              borderWidth: isSelected ? 2.5 : 2,
            },
          ]}
        >
          <ThemedText style={[styles.tableName, { color: isSelected ? '#fff' : table.color }]} numberOfLines={1}>
            {table.name}
          </ThemedText>
          <ThemedText style={[styles.tableSeats, { color: isSelected ? 'rgba(255,255,255,0.85)' : table.color + 'bb' }]}>
            {assigned}/{table.seats}
          </ThemedText>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ── Resize constants ──────────────────────────────────────────────────────────

const RESIZE_MIN_W = 50;
const RESIZE_MAX_W = 240;
const RESIZE_MIN_H = 40;
const RESIZE_MAX_H = 240;
const RESIZE_STEP = 10;

// ── Resize Handles ────────────────────────────────────────────────────────────

function ResizeHandles({
  table,
  onResize,
}: {
  table: SeatingTable;
  onResize: (id: string, w: number, h: number) => void;
}) {
  const tw = table.pixelW ?? DIMS[table.shape].w;
  const th = table.pixelH ?? DIMS[table.shape].h;
  const pad = SEAT_PAD + 6;

  const startW = useSharedValue(tw);
  const startH = useSharedValue(th);

  const diagGesture = Gesture.Pan()
    .onStart(() => {
      startW.value = tw;
      startH.value = th;
    })
    .onUpdate((e) => {
      const nw = Math.max(RESIZE_MIN_W, Math.min(RESIZE_MAX_W, startW.value + e.translationX));
      const nh = Math.max(RESIZE_MIN_H, Math.min(RESIZE_MAX_H, startH.value + e.translationY));
      runOnJS(onResize)(table.id, Math.round(nw), Math.round(nh));
    });

  const cx = table.x + tw / 2;
  const cy = table.y + th / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Gauche — réduire largeur */}
      <Pressable
        style={[styles.resizeBtn, { left: table.x - pad - 30, top: cy - 14 }]}
        onPress={() => onResize(table.id, Math.max(RESIZE_MIN_W, tw - RESIZE_STEP), th)}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={14} color="#fff" />
      </Pressable>

      {/* Droite — agrandir largeur */}
      <Pressable
        style={[styles.resizeBtn, { left: table.x + tw + pad + 2, top: cy - 14 }]}
        onPress={() => onResize(table.id, Math.min(RESIZE_MAX_W, tw + RESIZE_STEP), th)}
        hitSlop={8}
      >
        <Ionicons name="chevron-forward" size={14} color="#fff" />
      </Pressable>

      {/* Haut — réduire hauteur */}
      <Pressable
        style={[styles.resizeBtn, { left: cx - 14, top: table.y - pad - 30 }]}
        onPress={() => onResize(table.id, tw, Math.max(RESIZE_MIN_H, th - RESIZE_STEP))}
        hitSlop={8}
      >
        <Ionicons name="chevron-up" size={14} color="#fff" />
      </Pressable>

      {/* Bas — agrandir hauteur */}
      <Pressable
        style={[styles.resizeBtn, { left: cx - 14, top: table.y + th + pad + 2 }]}
        onPress={() => onResize(table.id, tw, Math.min(RESIZE_MAX_H, th + RESIZE_STEP))}
        hitSlop={8}
      >
        <Ionicons name="chevron-down" size={14} color="#fff" />
      </Pressable>

      {/* Coin bas-droit — redimensionner en diagonale (drag) */}
      <GestureDetector gesture={diagGesture}>
        <View style={[styles.resizeDiag, {
          left: table.x + tw + pad - 10,
          top: table.y + th + pad - 10,
        }]}>
          <Ionicons name="resize" size={13} color="#fff" />
        </View>
      </GestureDetector>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shapeLabel(s: TableShape) {
  if (s === 'round') return 'Ronde';
  if (s === 'oval') return 'Ovale';
  return 'Rectangle';
}

function ShapeIcon({ shape, active }: { shape: TableShape; active: boolean }) {
  const color = active ? '#fff' : '#A7AD9A';
  if (shape === 'round') return <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color, opacity: active ? 1 : 0.6 }} />;
  if (shape === 'oval') return <View style={{ width: 38, height: 24, borderRadius: 12, backgroundColor: color, opacity: active ? 1 : 0.6 }} />;
  return <View style={{ width: 36, height: 24, borderRadius: 5, backgroundColor: color, opacity: active ? 1 : 0.6 }} />;
}

// ── Main Screen ──────────────────────────────────────────────────────────────

let nextTableId = 20;
let nextGuestId = 100;

function SeatingPlanContent() {
  const insets = useSafeAreaInsets();
  const { hasPremiumAccess } = usePremiumAccess();
  const { user } = useAuth();
  const STORAGE_KEY = `seating_plan_v1_${user?.id ?? 'guest'}`;
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data.tables) {
            setTables(data.tables);
            const maxId = (data.tables as SeatingTable[]).reduce(
              (m: number, t) => Math.max(m, parseInt(t.id) || 0), 0
            );
            nextTableId = Math.max(nextTableId, maxId, data.nextTableId ?? 0);
          }
          if (data.guests) {
            setGuests(data.guests);
            const maxGId = (data.guests as Guest[]).reduce(
              (m: number, g) => Math.max(m, parseInt(g.id) || 0), 0
            );
            nextGuestId = Math.max(nextGuestId, maxGId, data.nextGuestId ?? 0);
          }
          if (data.roomWidth) setRoomWidth(data.roomWidth);
          if (data.roomHeight) setRoomHeight(data.roomHeight);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  // Auto-save (debounced 800ms) after load
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tables, guests, roomWidth, roomHeight, nextTableId, nextGuestId })
      );
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [tables, guests, roomWidth, roomHeight, loaded]);

  // Modals
  const [addTableModal, setAddTableModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);

  // Add table form
  const [newTableName, setNewTableName] = useState('');
  const [newShape, setNewShape] = useState<TableShape>('round');
  const [newSeats, setNewSeats] = useState(8);
  const [newTableW, setNewTableW] = useState('150');
  const [newTableH, setNewTableH] = useState('150');

  // Add guest form (inside assign modal)
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestCount, setNewGuestCount] = useState(1);

  // Edit table name
  const [editNameModal, setEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  // Room dimensions
  const [roomWidth, setRoomWidth] = useState('');
  const [roomHeight, setRoomHeight] = useState('');
  const [showRoomModal, setShowRoomModal] = useState(false);

  // Paywall PDF
  const [pdfPaywall, setPdfPaywall] = useState(false);

  const selected = tables.find((t) => t.id === selectedId) ?? null;

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  const handleResize = useCallback((id: string, w: number, h: number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, pixelW: w, pixelH: h } : t)));
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleAddTable = () => {
    const color = COLORS[tables.length % COLORS.length];
    const name = newTableName.trim() || `Table ${tables.length + 1}`;
    const { w } = DIMS[newShape];
    const defaultDims: Record<TableShape, { w: number; h: number }> = {
      round: { w: 150, h: 150 },
      oval: { w: 180, h: 120 },
      rect: { w: 200, h: 90 },
    };
    const wCm = parseFloat(newTableW) || defaultDims[newShape].w;
    const hCm = parseFloat(newTableH) || defaultDims[newShape].h;
    nextTableId += 1;
    setTables((prev) => [
      ...prev,
      {
        id: String(nextTableId),
        name,
        shape: newShape,
        seats: newSeats,
        x: SCREEN_W / 2 - w / 2,
        y: 80,
        color,
        guestIds: [],
        tableWidthCm: wCm,
        tableHeightCm: hCm,
        pixelW: DIMS[newShape].w,
        pixelH: DIMS[newShape].h,
      },
    ]);
    setNewTableName('');
    setNewShape('round');
    setNewSeats(8);
    setNewTableW('150');
    setNewTableH('150');
    setAddTableModal(false);
  };

  const handleDeleteTable = (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
    setSelectedId(null);
  };

  const handleToggleGuest = (guestId: string) => {
    if (!selectedId) return;
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== selectedId) return t;
        const has = t.guestIds.includes(guestId);
        return { ...t, guestIds: has ? t.guestIds.filter((g) => g !== guestId) : [...t.guestIds, guestId] };
      })
    );
  };

  const handleAddGuest = () => {
    const name = newGuestName.trim();
    if (!name || !selectedId) return;
    nextGuestId += 1;
    const newGuest: Guest = { id: String(nextGuestId), name, guestCount: newGuestCount };
    setGuests((prev) => [...prev, newGuest]);
    setTables((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, guestIds: [...t.guestIds, newGuest.id] } : t))
    );
    setNewGuestName('');
    setNewGuestCount(1);
    setShowAddGuest(false);
  };

  const handleRemoveGuest = (guestId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
    setTables((prev) =>
      prev.map((t) => ({ ...t, guestIds: t.guestIds.filter((id) => id !== guestId) }))
    );
  };

  const handleSaveTableName = () => {
    if (!selectedId || !editNameValue.trim()) return;
    setTables((prev) => prev.map((t) => (t.id === selectedId ? { ...t, name: editNameValue.trim() } : t)));
    setEditNameModal(false);
  };

  const openEditName = () => {
    if (!selected) return;
    setEditNameValue(selected.name);
    setEditNameModal(true);
  };

  const totalSeats = tables.reduce((s, t) => s + t.seats, 0);
  const assignedPeople = guests
    .filter((g) => tables.some((t) => t.guestIds.includes(g.id)))
    .reduce((s, g) => s + g.guestCount, 0);
  const totalPeople = guests.reduce((s, g) => s + g.guestCount, 0);

  const weddingMeta: WeddingMeta = {
    coupleName: user ? `${user.prenom} ${user.nom}`.trim() || 'Les mariés' : 'Les mariés',
    weddingTitle: user ? `Mariage de ${user.prenom} ${user.nom}`.trim() : 'Notre mariage',
    date: user?.date_mariage
      ? new Date(user.date_mariage).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '',
    location: user?.wedding_city || user?.wedding_address || user?.wedding_country || '',
  };

  const exportData: SeatingPlanData = {
    tables,
    guests,
    roomWidth: roomWidth || undefined,
    roomHeight: roomHeight || undefined,
    wedding: weddingMeta,
  };

  const openExport = () => {
    if (tables.length === 0) {
      Alert.alert('Aucune table', 'Ajoutez au moins une table avant d\'exporter.');
      return;
    }
    setExportModalOpen(true);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <PaywallModal
        visible={pdfPaywall}
        onClose={() => setPdfPaywall(false)}
      />

      <SeatingPlanExportModal
        visible={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={exportData}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} hitSlop={12}>
          <ThemedText style={styles.backBtn}>← Retour</ThemedText>
        </Pressable>
        <ThemedText style={styles.title}>Placement de table</ThemedText>
        <View style={styles.headerBtns}>
          <Pressable style={styles.pdfBtn} onPress={() => setShowRoomModal(true)} hitSlop={8}>
            <Ionicons name="resize-outline" size={17} color="#A7AD9A" />
          </Pressable>
          <Pressable
            style={styles.pdfBtn}
            onPress={() => (hasPremiumAccess ? openExport() : setPdfPaywall(true))}
            hitSlop={8}
          >
            <Ionicons name="document-text-outline" size={17} color="#A7AD9A" />
          </Pressable>
          <Pressable
            style={styles.pdfBtn}
            hitSlop={8}
            onPress={() =>
              Alert.alert(
                'Réinitialiser',
                'Supprimer toutes les tables et invités ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Réinitialiser',
                    style: 'destructive',
                    onPress: () => {
                      setTables([]);
                      setGuests([]);
                      setSelectedId(null);
                      nextTableId = 20;
                      nextGuestId = 100;
                      AsyncStorage.removeItem(STORAGE_KEY);
                    },
                  },
                ]
              )
            }
          >
            <Ionicons name="trash-outline" size={17} color="#A7AD9A" />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => setAddTableModal(true)} hitSlop={8}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ── Canvas ── */}
      <View style={styles.canvas}>
        <View style={styles.roomBorder} pointerEvents="none" />

        {tables.map((t) => (
          <DraggableTable
            key={t.id}
            table={t}
            isSelected={selectedId === t.id}
            guests={guests}
            onSelect={handleSelect}
            onDragEnd={handleDragEnd}
          />
        ))}

        {/* Poignées de redimensionnement pour la table sélectionnée */}
        {selected && (
          <ResizeHandles table={selected} onResize={handleResize} />
        )}

        {tables.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="grid-outline" size={52} color="#d1d5db" />
            <ThemedText style={styles.emptyText}>Ajoute ta première table avec +</ThemedText>
          </View>
        )}

        <View style={styles.legend} pointerEvents="none">
          <ThemedText style={styles.legendText}>Appuie pour sélectionner · Glisse pour déplacer · ‹ › ∧ ∨ pour redimensionner · ⤡ coin diagonal</ThemedText>
        </View>
      </View>

      {/* ── Panneau bas — table sélectionnée ── */}
      {selected ? (
        <View style={[styles.panel, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.panelHandle} />
          <View style={styles.panelTopRow}>
            <Pressable style={styles.panelNameBtn} onPress={openEditName}>
              <ThemedText style={styles.panelName}>{selected.name}</ThemedText>
              <Ionicons name="pencil-outline" size={14} color="#9ca3af" />
            </Pressable>
            <View style={styles.panelBtns}>
              <Pressable style={styles.panelBtn} onPress={() => { setShowAddGuest(false); setAssignModal(true); }}>
                <Ionicons name="person-add-outline" size={17} color="#A7AD9A" />
              </Pressable>
              <Pressable style={[styles.panelBtn, styles.panelBtnDel]} onPress={() => handleDeleteTable(selected.id)}>
                <Ionicons name="trash-outline" size={17} color="#dc2626" />
              </Pressable>
            </View>
          </View>
          <ThemedText style={styles.panelMeta}>
            {shapeLabel(selected.shape)} · {selected.seats} places ·{' '}
            {selected.guestIds.reduce((s, gid) => {
              const g = guests.find((g) => g.id === gid);
              return s + (g?.guestCount ?? 1);
            }, 0)}/{selected.seats} occupées
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {selected.guestIds.length === 0 ? (
              <Pressable style={styles.addGuestChip} onPress={() => { setShowAddGuest(false); setAssignModal(true); }}>
                <Ionicons name="person-add-outline" size={13} color="#A7AD9A" />
                <ThemedText style={styles.addGuestChipTxt}>Ajouter des invités</ThemedText>
              </Pressable>
            ) : (
              selected.guestIds.map((gid) => {
                const g = guests.find((g) => g.id === gid);
                if (!g) return null;
                return (
                  <Pressable key={gid} style={styles.chip} onPress={() => handleToggleGuest(gid)}>
                    <ThemedText style={styles.chipText} numberOfLines={1}>{g.name}</ThemedText>
                    <Ionicons name="close-circle" size={14} color="#A7AD9A" />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
        /* ── Stats ── */
        <View style={[styles.statsBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.stat}>
            <ThemedText style={styles.statVal}>{tables.length}</ThemedText>
            <ThemedText style={styles.statLbl}>Tables</ThemedText>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <ThemedText style={styles.statVal}>{totalSeats}</ThemedText>
            <ThemedText style={styles.statLbl}>Places</ThemedText>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <ThemedText style={[styles.statVal, { color: '#A7AD9A' }]}>
              {assignedPeople}/{totalPeople}
            </ThemedText>
            <ThemedText style={styles.statLbl}>Assignés</ThemedText>
          </View>
        </View>
      )}

      {/* ══════════════════════════════════════════════
          Modal — Ajouter une table
      ══════════════════════════════════════════════ */}
      <Modal visible={addTableModal} transparent animationType="slide" onRequestClose={() => setAddTableModal(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddTableModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <ThemedText style={styles.sheetTitle}>Nouvelle table</ThemedText>

              <ThemedText style={styles.sheetLabel}>Nom de la table</ThemedText>
              <TextInput
                style={styles.input}
                value={newTableName}
                onChangeText={setNewTableName}
                placeholder={`Table ${tables.length + 1}`}
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
              />

              <ThemedText style={styles.sheetLabel}>Forme</ThemedText>
              <View style={styles.shapeRow}>
                {(['round', 'oval', 'rect'] as TableShape[]).map((s) => (
                  <Pressable key={s} style={[styles.shapeChip, newShape === s && styles.shapeChipOn]} onPress={() => {
                    setNewShape(s);
                    if (s === 'round') { setNewTableW('150'); setNewTableH('150'); }
                    else if (s === 'oval') { setNewTableW('180'); setNewTableH('120'); }
                    else { setNewTableW('200'); setNewTableH('90'); }
                  }}>
                    <ShapeIcon shape={s} active={newShape === s} />
                    <ThemedText style={[styles.shapeChipLbl, newShape === s && styles.shapeChipLblOn]}>
                      {shapeLabel(s)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={styles.sheetLabel}>Dimensions de la table (cm)</ThemedText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.sheetLabel, { fontSize: 11, marginTop: 0, color: '#9ca3af' }]}>
                    {newShape === 'round' ? 'Diamètre' : 'Largeur'}
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={newTableW}
                    onChangeText={setNewTableW}
                    placeholder="150"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>
                {newShape !== 'round' && (
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.sheetLabel, { fontSize: 11, marginTop: 0, color: '#9ca3af' }]}>Profondeur</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={newTableH}
                      onChangeText={setNewTableH}
                      placeholder="120"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}
              </View>

              <ThemedText style={styles.sheetLabel}>Nombre de places</ThemedText>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setNewSeats((n) => Math.max(2, n - 1))}>
                  <ThemedText style={styles.stepBtnTxt}>−</ThemedText>
                </Pressable>
                <ThemedText style={styles.stepVal}>{newSeats}</ThemedText>
                <Pressable style={styles.stepBtn} onPress={() => setNewSeats((n) => Math.min(30, n + 1))}>
                  <ThemedText style={styles.stepBtnTxt}>+</ThemedText>
                </Pressable>
              </View>

              <View style={styles.sheetActions}>
                <Pressable style={styles.btnSecondary} onPress={() => setAddTableModal(false)}>
                  <ThemedText style={styles.btnSecondaryTxt}>Annuler</ThemedText>
                </Pressable>
                <Pressable style={styles.btnPrimary} onPress={handleAddTable}>
                  <ThemedText style={styles.btnPrimaryTxt}>Ajouter</ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          Modal — Gérer les invités d'une table
      ══════════════════════════════════════════════ */}
      {selected && (
        <Modal visible={assignModal} transparent animationType="slide" onRequestClose={() => { setAssignModal(false); setShowAddGuest(false); }}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => { setAssignModal(false); setShowAddGuest(false); }} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetTitleRow}>
                  <ThemedText style={styles.sheetTitle}>Invités — {selected.name}</ThemedText>
                  <ThemedText style={styles.sheetSub}>
                    {selected.guestIds.reduce((s, gid) => s + (guests.find((g) => g.id === gid)?.guestCount ?? 1), 0)}/{selected.seats} places
                  </ThemedText>
                </View>

                {/* ── Formulaire nouveau invité ── */}
                {showAddGuest ? (
                  <View style={styles.addGuestForm}>
                    <ThemedText style={styles.addGuestFormTitle}>Nouvel invité</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={newGuestName}
                      onChangeText={setNewGuestName}
                      placeholder="Nom de l'invité (ex: Famille Cohen)"
                      placeholderTextColor="#9ca3af"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleAddGuest}
                    />
                    <ThemedText style={[styles.sheetLabel, { marginTop: 10 }]}>Nombre de personnes</ThemedText>
                    <View style={styles.stepperSm}>
                      <Pressable style={styles.stepBtnSm} onPress={() => setNewGuestCount((n) => Math.max(1, n - 1))}>
                        <ThemedText style={styles.stepBtnTxt}>−</ThemedText>
                      </Pressable>
                      <ThemedText style={styles.stepValSm}>{newGuestCount}</ThemedText>
                      <Pressable style={styles.stepBtnSm} onPress={() => setNewGuestCount((n) => n + 1)}>
                        <ThemedText style={styles.stepBtnTxt}>+</ThemedText>
                      </Pressable>
                    </View>
                    <View style={styles.sheetActions}>
                      <Pressable style={styles.btnSecondary} onPress={() => setShowAddGuest(false)}>
                        <ThemedText style={styles.btnSecondaryTxt}>Annuler</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.btnPrimary, !newGuestName.trim() && styles.btnDisabled]}
                        onPress={handleAddGuest}
                        disabled={!newGuestName.trim()}
                      >
                        <ThemedText style={styles.btnPrimaryTxt}>Ajouter à la table</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    {/* ── Bouton créer un nouvel invité ── */}
                    <Pressable style={styles.newGuestBtn} onPress={() => setShowAddGuest(true)}>
                      <Ionicons name="person-add-outline" size={16} color="#A7AD9A" />
                      <ThemedText style={styles.newGuestBtnTxt}>Créer un nouvel invité et l'assigner</ThemedText>
                    </Pressable>

                    {guests.length > 0 && (
                      <ThemedText style={styles.orSeparator}>— ou assigner un invité existant —</ThemedText>
                    )}

                    {/* ── Liste des invités existants ── */}
                    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                      {guests.map((g) => {
                        const isHere = selected.guestIds.includes(g.id);
                        const onOther = !isHere && tables.some((t) => t.id !== selected.id && t.guestIds.includes(g.id));
                        const otherTable = onOther
                          ? tables.find((t) => t.id !== selected.id && t.guestIds.includes(g.id))
                          : null;
                        return (
                          <View key={g.id} style={[styles.guestRow, isHere && styles.guestRowOn, onOther && styles.guestRowLocked]}>
                            <Pressable
                              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                              onPress={() => !onOther && handleToggleGuest(g.id)}
                              disabled={onOther}
                            >
                              <View style={{ flex: 1 }}>
                                <ThemedText style={[styles.guestRowName, isHere && styles.guestRowNameOn]}>
                                  {g.name}
                                </ThemedText>
                                <ThemedText style={styles.guestRowSub}>
                                  {g.guestCount} personne{g.guestCount > 1 ? 's' : ''}
                                  {onOther ? ` · ${otherTable?.name ?? 'autre table'}` : ''}
                                </ThemedText>
                              </View>
                              {isHere && <Ionicons name="checkmark-circle" size={22} color="#A7AD9A" />}
                              {onOther && <Ionicons name="lock-closed-outline" size={18} color="#d1d5db" />}
                            </Pressable>
                            {/* Bouton supprimer l'invité */}
                            {!onOther && (
                              <Pressable
                                style={styles.guestDeleteBtn}
                                onPress={() => handleRemoveGuest(g.id)}
                                hitSlop={8}
                              >
                                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                      {guests.length === 0 && (
                        <ThemedText style={styles.noGuestsHint}>Aucun invité — crée le premier ci-dessus</ThemedText>
                      )}
                    </ScrollView>

                    <Pressable style={[styles.btnPrimary, { marginTop: 14 }]} onPress={() => setAssignModal(false)}>
                      <ThemedText style={styles.btnPrimaryTxt}>Terminé</ThemedText>
                    </Pressable>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          Modal — Dimensions de la salle
      ══════════════════════════════════════════════ */}
      <Modal visible={showRoomModal} transparent animationType="fade" onRequestClose={() => setShowRoomModal(false)}>
        <View style={styles.overlayCenter}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowRoomModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.centerCard}>
              <ThemedText style={styles.sheetTitle}>Dimensions de la salle</ThemedText>
              <ThemedText style={[styles.sheetLabel, { marginTop: 8 }]}>Largeur (en mètres)</ThemedText>
              <TextInput
                style={styles.input}
                value={roomWidth}
                onChangeText={setRoomWidth}
                placeholder="Ex: 20"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              <ThemedText style={styles.sheetLabel}>Longueur (en mètres)</ThemedText>
              <TextInput
                style={styles.input}
                value={roomHeight}
                onChangeText={setRoomHeight}
                placeholder="Ex: 30"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              {roomWidth && roomHeight && (() => {
                const rw = parseFloat(roomWidth);
                const rh = parseFloat(roomHeight);
                const surface = (rw * rh).toFixed(0);
                // estimate how many tables fit: avg table footprint ~2m x 2m with clearance
                const avgTableArea = 4;
                const maxTables = Math.floor((rw * rh * 0.55) / avgTableArea);
                return (
                  <View style={{ marginTop: 10, padding: 14, backgroundColor: '#E8EDE4', borderRadius: 12, gap: 6 }}>
                    <ThemedText style={{ color: '#7A8A72', fontWeight: '700', fontSize: 13 }}>
                      Surface : {surface} m²
                    </ThemedText>
                    <ThemedText style={{ color: '#A7AD9A', fontSize: 12 }}>
                      Capacité estimée : ~{maxTables} tables (avec 55% d'espace utilisable)
                    </ThemedText>
                    {tables.length > 0 && (
                      <ThemedText style={{ color: tables.length <= maxTables ? '#7A8A72' : '#C17E7E', fontSize: 12, fontWeight: '600' }}>
                        {tables.length <= maxTables
                          ? `✓ ${tables.length} table${tables.length > 1 ? 's' : ''} — salle adaptée`
                          : `⚠ ${tables.length} tables — salle peut-être trop petite`}
                      </ThemedText>
                    )}
                  </View>
                );
              })()}
              <View style={[styles.sheetActions, { marginTop: 14 }]}>
                <Pressable style={styles.btnSecondary} onPress={() => setShowRoomModal(false)}>
                  <ThemedText style={styles.btnSecondaryTxt}>Fermer</ThemedText>
                </Pressable>
                <Pressable style={styles.btnPrimary} onPress={() => setShowRoomModal(false)}>
                  <ThemedText style={styles.btnPrimaryTxt}>Enregistrer</ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          Modal — Renommer une table
      ══════════════════════════════════════════════ */}
      <Modal visible={editNameModal} transparent animationType="fade" onRequestClose={() => setEditNameModal(false)}>
        <View style={styles.overlayCenter}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditNameModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.centerCard}>
              <ThemedText style={styles.sheetTitle}>Renommer la table</ThemedText>
              <TextInput
                style={[styles.input, { marginTop: 14 }]}
                value={editNameValue}
                onChangeText={setEditNameValue}
                placeholder="Nom de la table"
                placeholderTextColor="#9ca3af"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveTableName}
              />
              <View style={[styles.sheetActions, { marginTop: 14 }]}>
                <Pressable style={styles.btnSecondary} onPress={() => setEditNameModal(false)}>
                  <ThemedText style={styles.btnSecondaryTxt}>Annuler</ThemedText>
                </Pressable>
                <Pressable style={styles.btnPrimary} onPress={handleSaveTableName}>
                  <ThemedText style={styles.btnPrimaryTxt}>Enregistrer</ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  backBtn: { color: '#A7AD9A', fontSize: 15, fontWeight: '600' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pdfBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#E8EDE4',
    borderWidth: 1, borderColor: '#ede9fe',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#A7AD9A',
    alignItems: 'center', justifyContent: 'center',
  },

  canvas: {
    flex: 1,
    backgroundColor: '#F5F4FF',
    overflow: 'hidden',
    position: 'relative',
  },
  roomBorder: {
    position: 'absolute',
    top: 16, bottom: 16, left: 16, right: 16,
    borderWidth: 1.5,
    borderColor: '#d4d0f5',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  legend: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
  legendText: { fontSize: 10, color: '#b0a9f5', fontWeight: '500' },

  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  resizeBtn: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#A7AD9A',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 6,
  },
  resizeDiag: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#7B7063',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 6,
  },
  tableBody: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center', gap: 2,
    shadowColor: '#A7AD9A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  tableName: { fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  tableSeats: { fontSize: 10, fontWeight: '600' },

  // Panel bas — table sélectionnée
  panel: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    paddingHorizontal: 16, paddingTop: 8,
    minHeight: 120,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 8,
  },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 10,
  },
  panelTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 2,
  },
  panelNameBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  panelMeta: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  panelBtns: { flexDirection: 'row', gap: 8 },
  panelBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#E8EDE4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#ede9fe',
  },
  panelBtnDel: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1, borderColor: '#ede9fe', backgroundColor: '#E8EDE4',
  },
  chipText: { fontSize: 12, color: '#A7AD9A', fontWeight: '600', maxWidth: 90 },
  addGuestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1.5, borderColor: '#A7AD9A',
    borderStyle: 'dashed',
  },
  addGuestChipTxt: { fontSize: 12, color: '#A7AD9A', fontWeight: '600' },

  // Stats
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6',
    paddingTop: 14, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginTop: 2 },
  statDiv: { width: 1, height: 40, backgroundColor: '#f3f4f6' },

  // Overlay & sheets
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  overlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 24 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 16,
  },
  centerCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 16,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 14,
  },
  sheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sheetSub: { fontSize: 13, color: '#9ca3af' },
  sheetLabel: { fontSize: 13, color: '#4b5563', fontWeight: '600', marginTop: 14, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827', backgroundColor: '#fafafa',
  },

  shapeRow: { flexDirection: 'row', gap: 10 },
  shapeChip: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 8,
    alignItems: 'center', gap: 8, backgroundColor: '#fafafa',
  },
  shapeChipOn: { borderColor: '#A7AD9A', backgroundColor: '#A7AD9A' },
  shapeChipLbl: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  shapeChipLblOn: { color: '#fff' },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  stepBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa',
  },
  stepBtnTxt: { fontSize: 24, color: '#A7AD9A', fontWeight: '700', lineHeight: 28 },
  stepVal: { fontSize: 30, fontWeight: '800', color: '#111827', minWidth: 48, textAlign: 'center' },

  stepperSm: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepBtnSm: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa',
  },
  stepValSm: { fontSize: 24, fontWeight: '800', color: '#111827', minWidth: 36, textAlign: 'center' },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1, backgroundColor: '#A7AD9A', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnSecondaryTxt: { color: '#6b7280', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },

  // Bouton créer invité
  newGuestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#A7AD9A', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: '#E8EDE4', marginBottom: 4,
  },
  newGuestBtnTxt: { fontSize: 14, color: '#A7AD9A', fontWeight: '600' },
  orSeparator: { fontSize: 11, color: '#d1d5db', textAlign: 'center', marginVertical: 10, fontWeight: '500' },

  addGuestForm: { gap: 4 },
  addGuestFormTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },

  // Ligne invité
  guestRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8, backgroundColor: '#fafafa',
  },
  guestRowOn: { borderColor: '#A7AD9A', backgroundColor: '#E8EDE4' },
  guestRowLocked: { opacity: 0.4 },
  guestRowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  guestRowNameOn: { color: '#A7AD9A' },
  guestRowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  guestDeleteBtn: { padding: 6, marginLeft: 4 },
  noGuestsHint: { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});

export default function SeatingPlanScreen() {
  return <PremiumGate feature="Plan de table" icon="grid-outline"><SeatingPlanContent /></PremiumGate>;
}
