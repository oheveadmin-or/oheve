import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { type OrderStatus, useBoutique } from '@/contexts/boutique-context';

const FILTERS = ['Tout', 'En attente', 'Payé', 'Expédié', 'Annulé'];

const STATUS_MAP: Record<string, OrderStatus> = {
  'En attente': 'pending',
  'Payé': 'paid',
  'Expédié': 'shipped',
  'Annulé': 'cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: C.warning,
  paid: C.success,
  shipped: C.sauge,
  cancelled: C.error,
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  shipped: 'Expédié',
  cancelled: 'Annulé',
};

export default function OrdersScreen() {
  const { orders, updateOrderStatus } = useBoutique();
  const [filter, setFilter] = useState('Tout');
  const filtered = filter === 'Tout' ? orders : orders.filter((o) => o.status === STATUS_MAP[filter]);
  const total = orders.filter((o) => o.status === 'paid' || o.status === 'shipped').reduce((s, o) => s + o.amount, 0);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Commandes</ThemedText>
        <View style={styles.revenueBadge}>
          <ThemedText style={styles.revenueText}>{total} € encaissés</ThemedText>
        </View>
      </View>

      {/* Filters */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, filter === item && styles.chipActive]}
            onPress={() => setFilter(item)}
          >
            <ThemedText style={[styles.chipText, filter === item && styles.chipTextActive]}>
              {item}
            </ThemedText>
          </Pressable>
        )}
      />

      {/* Orders list */}
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={C.textLight} />
            <ThemedText style={styles.emptyText}>Aucune commande dans cette catégorie</ThemedText>
          </View>
        }
        renderItem={({ item }) => {
          const color = STATUS_COLORS[item.status];
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <ThemedText style={styles.orderId}>{item.id}</ThemedText>
                <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                  <ThemedText style={[styles.badgeText, { color }]}>
                    {STATUS_LABELS[item.status]}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.product}>{item.productName}</ThemedText>
              <View style={styles.buyerRow}>
                <Ionicons name="person-outline" size={13} color={C.textLight} />
                <ThemedText style={styles.buyer}>{item.buyerName} · {item.buyerEmail}</ThemedText>
              </View>
              <View style={styles.cardBottom}>
                <ThemedText style={styles.date}>{new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</ThemedText>
                <ThemedText style={styles.amount}>{item.amount} €</ThemedText>
              </View>
              {item.status === 'paid' && (
                <Pressable style={styles.shipBtn} onPress={() => updateOrderStatus(item.id, 'shipped')}>
                  <Ionicons name="cube-outline" size={14} color={C.textInvert} />
                  <ThemedText style={styles.shipBtnText}>Marquer expédié</ThemedText>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.textDark },
  revenueBadge: { backgroundColor: C.saugePale, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 },
  revenueText: { fontSize: 13, color: C.sauge, fontWeight: '700' },

  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: C.card },
  chipActive: { backgroundColor: C.sauge },
  chipText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  chipTextActive: { color: C.textInvert },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  card: { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontSize: 12, color: C.textLight, fontWeight: '600' },
  badge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  product: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  buyer: { fontSize: 12, color: C.textLight },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: C.textLight },
  amount: { fontSize: 17, fontWeight: '800', color: C.textDark },
  shipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.sauge, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: 10, alignSelf: 'flex-start',
  },
  shipBtnText: { fontSize: 13, color: C.textInvert, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyText: { fontSize: 14, color: C.textLight },
});
