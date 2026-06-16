import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { useBoutique } from '@/contexts/boutique-context';

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

export default function BoutiqueHomeScreen() {
  const { user } = useAuth();
  const { stats, products, orders } = useBoutique();

  const shopName = user ? `${user.prenom} ${user.nom}`.trim() || 'Ma Boutique' : 'Ma Boutique';

  const STATS = [
    { label: 'Vues', value: stats.totalViews.toLocaleString('fr-FR'), icon: 'eye-outline' },
    { label: 'Produits', value: String(stats.totalProducts), icon: 'grid-outline' },
    { label: 'Commandes', value: String(stats.totalOrders), icon: 'bag-outline' },
    { label: 'Revenus', value: `${stats.totalRevenue.toLocaleString('fr-FR')} €`, icon: 'cash-outline' },
  ];

  const topProducts = [...products]
    .sort((a, b) => b.views - a.views)
    .slice(0, 3);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.greeting}>Bonjour 👋</ThemedText>
          <ThemedText style={styles.shopName}>{shopName}</ThemedText>
        </View>
        <Pressable style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color={C.textDark} />
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {STATS.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon as 'eye-outline'} size={20} color={C.sauge} />
            <ThemedText style={styles.statValue}>{s.value}</ThemedText>
            <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <Pressable style={styles.quickBtn} onPress={() => router.push('/(boutique)/product/new')}>
          <View style={[styles.quickIcon, { backgroundColor: C.saugePale }]}>
            <Ionicons name="add-circle-outline" size={22} color={C.sauge} />
          </View>
          <ThemedText style={styles.quickLabel}>Ajouter produit</ThemedText>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => router.push('/(boutique)/reel/new')}>
          <View style={[styles.quickIcon, { backgroundColor: '#EDE5F8' }]}>
            <Ionicons name="videocam-outline" size={22} color="#8B5CF6" />
          </View>
          <ThemedText style={styles.quickLabel}>Nouveau reel</ThemedText>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => router.push('/(boutique)/profile-edit')}>
          <View style={[styles.quickIcon, { backgroundColor: C.warningPale }]}>
            <Ionicons name="pencil-outline" size={22} color={C.warning} />
          </View>
          <ThemedText style={styles.quickLabel}>Modifier profil</ThemedText>
        </Pressable>
      </View>

      {/* Produits populaires */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Produits populaires</ThemedText>
          <Pressable onPress={() => router.push('/(boutique)/(tabs)/products')}>
            <ThemedText style={styles.sectionLink}>Voir tout</ThemedText>
          </Pressable>
        </View>
        {topProducts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="grid-outline" size={32} color={C.textLight} />
            <ThemedText style={styles.emptyText}>Aucun produit — ajoutez-en un !</ThemedText>
          </View>
        ) : (
          topProducts.map((p) => (
            <Pressable key={p.id} style={styles.productRow} onPress={() => router.push(`/(boutique)/product/${p.id}` as never)}>
              <View style={styles.productThumb}>
                <Ionicons name="image-outline" size={24} color={C.textLight} />
              </View>
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName}>{p.name}</ThemedText>
                <ThemedText style={styles.productMeta}>
                  <Ionicons name="eye-outline" size={12} /> {p.views} vues
                </ThemedText>
              </View>
              <ThemedText style={styles.productPrice}>{p.price} €</ThemedText>
            </Pressable>
          ))
        )}
      </View>

      {/* Commandes récentes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Commandes récentes</ThemedText>
          <Pressable onPress={() => router.push('/(boutique)/(tabs)/orders')}>
            <ThemedText style={styles.sectionLink}>Voir tout</ThemedText>
          </Pressable>
        </View>
        {recentOrders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={32} color={C.textLight} />
            <ThemedText style={styles.emptyText}>Aucune commande pour l'instant</ThemedText>
          </View>
        ) : (
          recentOrders.map((o) => (
            <View key={o.id} style={styles.orderRow}>
              <View style={styles.orderLeft}>
                <ThemedText style={styles.orderId}>{o.id}</ThemedText>
                <ThemedText style={styles.orderProduct}>{o.productName}</ThemedText>
                <ThemedText style={styles.orderBuyer}>{o.buyerName}</ThemedText>
              </View>
              <View style={styles.orderRight}>
                <ThemedText style={styles.orderAmount}>{o.amount} €</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[o.status] + '22' }]}>
                  <ThemedText style={[styles.statusText, { color: STATUS_COLORS[o.status] }]}>
                    {STATUS_LABELS[o.status]}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 14, color: C.textLight },
  shopName: { fontSize: 22, fontWeight: '800', color: C.textDark },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: RADIUS.md,
    padding: 14, alignItems: 'flex-start', gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: C.textDark },
  statLabel: { fontSize: 12, color: C.textLight },

  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 8 },
  quickIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, color: C.textMid, fontWeight: '600', textAlign: 'center' },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  sectionLink: { fontSize: 13, color: C.sauge, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: C.textLight },

  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: RADIUS.md, padding: 12, marginBottom: 8,
  },
  productThumb: {
    width: 52, height: 52, borderRadius: RADIUS.sm,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: C.textDark },
  productMeta: { fontSize: 12, color: C.textLight, marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '700', color: C.sauge },

  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.card, borderRadius: RADIUS.md, padding: 14, marginBottom: 8,
  },
  orderLeft: { flex: 1 },
  orderId: { fontSize: 11, color: C.textLight, marginBottom: 2 },
  orderProduct: { fontSize: 13, fontWeight: '600', color: C.textDark },
  orderBuyer: { fontSize: 12, color: C.textLight },
  orderRight: { alignItems: 'flex-end', gap: 6 },
  orderAmount: { fontSize: 15, fontWeight: '700', color: C.textDark },
  statusBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
