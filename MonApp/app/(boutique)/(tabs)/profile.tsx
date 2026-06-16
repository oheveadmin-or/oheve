import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { useBoutique } from '@/contexts/boutique-context';

export default function BoutiqueProfileScreen() {
  const { user, signOut } = useAuth();
  const { stats, products, reels } = useBoutique();
  const shopName = user ? `${user.prenom} ${user.nom}`.trim() || 'Ma Boutique' : 'Ma Boutique';

  const STATS = [
    { label: 'Produits', value: String(stats.totalProducts) },
    { label: 'Vues', value: stats.totalViews.toLocaleString('fr-FR') },
    { label: 'Commandes', value: String(stats.totalOrders) },
  ];

  // Grille mixte produits + reels
  const gridItems = [
    ...products.slice(0, 6).map((p) => ({ id: `p-${p.id}`, type: 'product' as const })),
    ...reels.slice(0, 3).map((r) => ({ id: `r-${r.id}`, type: 'reel' as const })),
  ];

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {/* Cover */}
      <View style={styles.cover}>
        <Pressable style={styles.editCoverBtn} onPress={() => router.push('/(boutique)/profile-edit')}>
          <Ionicons name="camera-outline" size={16} color={C.textInvert} />
        </Pressable>
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            {(user?.prenom?.[0] ?? 'B').toUpperCase()}
          </ThemedText>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoWrap}>
        <ThemedText style={styles.shopName}>{shopName}</ThemedText>
        <ThemedText style={styles.bio}>
          Créations de mariage uniques · Livraison France entière 🌿
        </ThemedText>
        <ThemedText style={styles.location}>
          <Ionicons name="location-outline" size={13} /> Paris, France
        </ThemedText>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map((s) => (
          <View key={s.label} style={styles.statItem}>
            <ThemedText style={styles.statValue}>{s.value}</ThemedText>
            <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.editBtn} onPress={() => router.push('/(boutique)/profile-edit')}>
          <ThemedText style={styles.editBtnText}>Modifier la boutique</ThemedText>
        </Pressable>
        <Pressable style={styles.shareBtn}>
          <Ionicons name="share-outline" size={18} color={C.textDark} />
        </Pressable>
      </View>

      {/* Grid style Instagram */}
      <View style={styles.gridHeader}>
        <Ionicons name="grid-outline" size={20} color={C.textDark} />
        <ThemedText style={styles.gridTitle}>Publications</ThemedText>
      </View>
      {gridItems.length === 0 ? (
        <View style={styles.gridEmpty}>
          <Ionicons name="images-outline" size={32} color={C.textLight} />
          <ThemedText style={styles.gridEmptyText}>Aucune publication</ThemedText>
        </View>
      ) : (
        <View style={styles.grid}>
          {gridItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.gridItem}
              onPress={() =>
                item.type === 'product'
                  ? router.push(`/(boutique)/product/${item.id.replace('p-', '')}` as never)
                  : undefined
              }
            >
              <View style={styles.gridThumb}>
                {item.type === 'reel' && (
                  <Ionicons
                    name="play-circle"
                    size={24}
                    color={C.textInvert}
                    style={styles.reelIcon}
                  />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Déconnexion */}
      <Pressable style={styles.logoutBtn} onPress={() => signOut()}>
        <Ionicons name="log-out-outline" size={18} color={C.error} />
        <ThemedText style={styles.logoutText}>Se déconnecter</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },

  cover: {
    height: 140, backgroundColor: C.sauge + '55',
    justifyContent: 'flex-end', alignItems: 'flex-end', padding: 12,
  },
  editCoverBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#00000044', alignItems: 'center', justifyContent: 'center',
  },

  avatarWrap: { alignItems: 'flex-start', paddingHorizontal: 20, marginTop: -32 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.ivoire,
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: C.textInvert },

  infoWrap: { paddingHorizontal: 20, marginTop: 10, marginBottom: 16 },
  shopName: { fontSize: 20, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  bio: { fontSize: 14, color: C.textMid, marginBottom: 4 },
  location: { fontSize: 13, color: C.textLight },

  statsRow: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: C.card, paddingVertical: 14, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: C.textDark },
  statLabel: { fontSize: 12, color: C.textLight },

  actionsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20,
  },
  editBtn: {
    flex: 1, backgroundColor: C.card, borderRadius: RADIUS.md,
    paddingVertical: 10, alignItems: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: C.textDark },
  shareBtn: {
    width: 42, height: 42, borderRadius: RADIUS.sm,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
  },

  gridHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginBottom: 12,
  },
  gridTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  gridEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  gridEmptyText: { fontSize: 14, color: C.textLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '33.33%', aspectRatio: 1, padding: 1 },
  gridThumb: {
    flex: 1, backgroundColor: C.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  reelIcon: { opacity: 0.8 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 20, marginTop: 8,
  },
  logoutText: { fontSize: 15, color: C.error, fontWeight: '600' },
});
