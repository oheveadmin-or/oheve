import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useBoutique } from '@/contexts/boutique-context';

const CATEGORIES = ['Tout', 'Robes', 'Fleurs', 'Beauté', 'Papeterie', 'Bijoux', 'Autre'];

export default function ProductsScreen() {
  const { products } = useBoutique();
  const [cat, setCat] = useState('Tout');
  const filtered = cat === 'Tout' ? products : products.filter((p) => p.category === cat);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Mes Produits</ThemedText>
        <Pressable style={styles.addBtn} onPress={() => router.push('/(boutique)/product/new')}>
          <Ionicons name="add" size={20} color={C.textInvert} />
        </Pressable>
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i}
        style={styles.filterList}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.filterChip, cat === item && styles.filterChipActive]}
            onPress={() => setCat(item)}
          >
            <ThemedText style={[styles.filterText, cat === item && styles.filterTextActive]}>
              {item}
            </ThemedText>
          </Pressable>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="grid-outline" size={48} color={C.textLight} />
            <ThemedText style={styles.emptyText}>Aucun produit</ThemedText>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(boutique)/product/new')}>
              <ThemedText style={styles.emptyBtnText}>Ajouter mon premier produit</ThemedText>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/(boutique)/product/${item.id}` as never)}
          >
            <View style={styles.thumb}>
              <Ionicons name="image-outline" size={32} color={C.textLight} />
              {!item.active && (
                <View style={styles.inactiveBadge}>
                  <ThemedText style={styles.inactiveText}>Masqué</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <ThemedText style={styles.cardName} numberOfLines={2}>{item.name}</ThemedText>
              <ThemedText style={styles.cardPrice}>{item.price} €</ThemedText>
              <View style={styles.cardStats}>
                <ThemedText style={styles.cardStat}>
                  <Ionicons name="eye-outline" size={11} /> {item.views}
                </ThemedText>
                <ThemedText style={styles.cardStat}>
                  <Ionicons name="bag-outline" size={11} /> {item.sales}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        )}
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
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },

  filterList: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: C.card },
  filterChipActive: { backgroundColor: C.sauge },
  filterText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  filterTextActive: { color: C.textInvert },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.textLight },
  emptyBtn: { backgroundColor: C.sauge, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md },
  emptyBtnText: { color: C.textInvert, fontWeight: '700' },

  card: { flex: 1, backgroundColor: C.card, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 12 },
  thumb: { height: 120, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },
  inactiveBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: C.error + 'CC', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  inactiveText: { fontSize: 10, color: C.textInvert, fontWeight: '700' },

  cardBody: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '600', color: C.textDark, marginBottom: 4 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: C.sauge, marginBottom: 6 },
  cardStats: { flexDirection: 'row', gap: 10 },
  cardStat: { fontSize: 11, color: C.textLight },
});
