import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';

const MOCK: Record<string, { name: string; description: string; price: number; category: string; views: number; sales: number; active: boolean }> = {
  '1': { name: 'Robe de mariée Elise', description: 'Robe A-line en dentelle française, silhouette fluide et romantique. Disponible en blanc ivoire ou champagne, taille 34 à 48. Livraison sous 7 à 14 jours ouvrés. Essayage possible sur rendez-vous à Paris.', price: 890, category: 'Robes', views: 342, sales: 3, active: true },
  '2': { name: 'Bouquet pivoine & rose', description: 'Bouquet de mariage composé de pivoines corail et de roses blanches fraîches. Préparé J-1 et livré en France métropolitaine. Personnalisation des couleurs possible.', price: 120, category: 'Fleurs', views: 218, sales: 12, active: true },
  '3': { name: 'Coiffure chignon naturel', description: 'Prestation à domicile (Île-de-France) ou en salon partenaire. Chignon romantique avec mèches naturelles, inclus accessoires fleurs séchées ou perles.', price: 180, category: 'Beauté', views: 95, sales: 7, active: true },
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = MOCK[id ?? ''] ?? MOCK['1'];

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {/* Image placeholder */}
      <View style={styles.imageWrap}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.textDark} />
        </Pressable>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={48} color={C.textLight} />
        </View>
      </View>

      <View style={styles.body}>
        {/* Badge catégorie */}
        <View style={styles.categoryBadge}>
          <ThemedText style={styles.categoryText}>{product.category}</ThemedText>
        </View>

        <ThemedText style={styles.name}>{product.name}</ThemedText>
        <ThemedText style={styles.price}>{product.price} €</ThemedText>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={16} color={C.textLight} />
            <ThemedText style={styles.statText}>{product.views} vues</ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="bag-outline" size={16} color={C.textLight} />
            <ThemedText style={styles.statText}>{product.sales} ventes</ThemedText>
          </View>
          <View style={[styles.stat, { backgroundColor: product.active ? C.saugePale : C.errorPale }]}>
            <Ionicons name={product.active ? 'checkmark-circle-outline' : 'eye-off-outline'} size={16} color={product.active ? C.sauge : C.error} />
            <ThemedText style={[styles.statText, { color: product.active ? C.sauge : C.error }]}>
              {product.active ? 'Visible' : 'Masqué'}
            </ThemedText>
          </View>
        </View>

        {/* Description */}
        <ThemedText style={styles.sectionTitle}>Description</ThemedText>
        <ThemedText style={styles.description}>{product.description}</ThemedText>

        {/* Paiement Stripe */}
        <View style={styles.stripeBox}>
          <Ionicons name="card-outline" size={20} color={C.sauge} />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.stripeTitle}>Paiement sécurisé Stripe</ThemedText>
            <ThemedText style={styles.stripeSub}>Carte bancaire, Apple Pay, Google Pay</ThemedText>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push(`/(boutique)/product/new` as never)}
          >
            <Ionicons name="pencil-outline" size={18} color={C.sauge} />
            <ThemedText style={styles.editBtnText}>Modifier</ThemedText>
          </Pressable>
          <Pressable style={styles.buyLink}>
            <Ionicons name="link-outline" size={18} color={C.textInvert} />
            <ThemedText style={styles.buyLinkText}>Lien d'achat</ThemedText>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },

  imageWrap: { position: 'relative', height: 280 },
  back: {
    position: 'absolute', top: 52, left: 20, zIndex: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.ivoire + 'DD', alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholder: { flex: 1, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },

  body: { padding: 20 },

  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: C.saugePale,
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  categoryText: { fontSize: 12, color: C.sauge, fontWeight: '700' },

  name: { fontSize: 22, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  price: { fontSize: 26, fontWeight: '800', color: C.sauge, marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stat: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.card, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  statText: { fontSize: 13, color: C.textLight },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 8 },
  description: { fontSize: 14, color: C.textMid, lineHeight: 22, marginBottom: 20 },

  stripeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.saugePale, borderRadius: RADIUS.md, padding: 14, marginBottom: 24,
  },
  stripeTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  stripeSub: { fontSize: 12, color: C.textLight },

  actions: { flexDirection: 'row', gap: 12 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.card, borderRadius: RADIUS.md, paddingVertical: 13,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: C.sauge },
  buyLink: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.sauge, borderRadius: RADIUS.md, paddingVertical: 13,
  },
  buyLinkText: { fontSize: 15, fontWeight: '700', color: C.textInvert },
});
