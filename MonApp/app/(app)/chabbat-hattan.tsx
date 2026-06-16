import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';

// ── Types ───────────────────────────────────────────────────────────────────

type SubCat = 'lieu' | 'hebergement' | 'synagogue';

type Item = {
  id: string;
  subCat: SubCat;
  nom: string;
  adresse: string;
  ville: string;
  telephone?: string;
  description?: string;
};

// ── Données ─────────────────────────────────────────────────────────────────

const DATA: Item[] = [
  // Lieux Chabbat Hatan
  {
    id: 'ch1', subCat: 'lieu',
    nom: 'Salle Gan Eden',
    adresse: '12 rue des Lilas', ville: 'Paris 19e',
    telephone: '01 42 00 11 22',
    description: 'Salle kasher avec hébergement possible, capacité 150 personnes',
  },
  {
    id: 'ch2', subCat: 'lieu',
    nom: 'Domaine Beit Hamikdash',
    adresse: '8 allée des Roses', ville: 'Vincennes',
    telephone: '01 43 00 55 66',
    description: 'Jardin privatif, accès PMR, parking gratuit',
  },
  {
    id: 'ch3', subCat: 'lieu',
    nom: 'Villa Simha',
    adresse: '3 avenue de la Paix', ville: 'Saint-Maur-des-Fossés',
    telephone: '01 48 00 77 88',
    description: 'Capacité 200 personnes, cuisine kasher intégrée',
  },
  {
    id: 'ch4', subCat: 'lieu',
    nom: 'Espace Ora',
    adresse: '26 rue Championnet', ville: 'Paris 18e',
    telephone: '01 46 00 12 34',
    description: 'Salle lumineuse, disponible vendredi soir et samedi',
  },
  // Hébergements
  {
    id: 'hb1', subCat: 'hebergement',
    nom: 'Hôtel Roi David',
    adresse: '45 boulevard Victor Hugo', ville: 'Créteil',
    telephone: '01 45 00 99 00',
    description: 'Navette shabbat disponible, ascenseur shabbat, petit-déjeuner kasher',
  },
  {
    id: 'hb2', subCat: 'hebergement',
    nom: 'Résidence Beit Yisrael',
    adresse: '7 rue de la République', ville: 'Fontenay-sous-Bois',
    telephone: '01 47 00 33 44',
    description: '20 chambres, ascenseur shabbat, à 5 min de la salle',
  },
  {
    id: 'hb3', subCat: 'hebergement',
    nom: 'Gîte Hamishpacha',
    adresse: '22 chemin des Vignes', ville: 'Nogent-sur-Marne',
    telephone: '06 10 22 33 44',
    description: 'Gîte familial entier, cuisine équipée kasher, jardin',
  },
  {
    id: 'hb4', subCat: 'hebergement',
    nom: "Appart'hôtel Shabbat Home",
    adresse: '14 rue du Président Wilson', ville: 'Vincennes',
    telephone: '06 20 55 66 77',
    description: 'Studios et T2, clé shabbat, proche synagogue',
  },
  // Synagogues
  {
    id: 'sy1', subCat: 'synagogue',
    nom: 'Grande Synagogue de Paris',
    adresse: '44 rue de la Victoire', ville: 'Paris 9e',
    telephone: '01 45 26 95 36',
    description: 'Consistoire de Paris — rite ashkénaze',
  },
  {
    id: 'sy2', subCat: 'synagogue',
    nom: 'Synagogue Adath Israël',
    adresse: '19 rue des Tournelles', ville: 'Paris 4e',
    telephone: '01 42 74 32 80',
    description: 'Rite ashkénaze, quartier du Marais',
  },
  {
    id: 'sy3', subCat: 'synagogue',
    nom: 'Beth Habad de Vincennes',
    adresse: '15 rue de Fontenay', ville: 'Vincennes',
    telephone: '01 43 28 87 00',
    description: 'Rite Habad-Loubavitch, accueil chabbat hattan',
  },
  {
    id: 'sy4', subCat: 'synagogue',
    nom: 'Synagogue Or Torah',
    adresse: '3 rue des Alouettes', ville: 'Créteil',
    telephone: '01 45 17 10 00',
    description: 'Rite séfarade, à proximité des salles de réception',
  },
  {
    id: 'sy5', subCat: 'synagogue',
    nom: 'Synagogue Beth El',
    adresse: '3 rue des Fossés Saint-Jacques', ville: 'Paris 5e',
    telephone: '01 43 26 49 44',
    description: 'Rite libéral, mixte',
  },
];

// ── Sous-catégories ──────────────────────────────────────────────────────────

const SUB_CATS: { key: SubCat | 'all'; label: string; icon: string }[] = [
  { key: 'all',         label: 'Tout',              icon: '✡️' },
  { key: 'lieu',        label: 'Lieu',              icon: '🏛️' },
  { key: 'hebergement', label: 'Hébergement',       icon: '🛏️' },
  { key: 'synagogue',   label: 'Synagogues',        icon: '🕍' },
];

const ICONS: Record<SubCat, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  lieu:        'business-outline',
  hebergement: 'bed-outline',
  synagogue:   'location-outline',
};

const BG: Record<SubCat, string> = {
  lieu:        '#E8E4DC',
  hebergement: '#EDE8E1',
  synagogue:   '#E8E4EE',
};

// ── Composant ────────────────────────────────────────────────────────────────

export default function ChabbatHattanScreen() {
  const insets = useSafeAreaInsets();
  const [activeSubCat, setActiveSubCat] = useState<SubCat | 'all'>('all');

  const displayed = activeSubCat === 'all' ? DATA : DATA.filter(i => i.subCat === activeSubCat);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/providers');
  };

  return (
    <ScreenLayout edges={['left', 'right', 'bottom']} constrainWidth={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.retourBtn} onPress={goBack} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Ionicons name="arrow-back" size={20} color={C.saugeDark} />
          <ThemedText style={styles.retourText}>Retour</ThemedText>
        </Pressable>
      </View>

      <View style={styles.wrap}>
        {/* Titre */}
        <ThemedText style={styles.title}>🕍 Chabbat Hattan</ThemedText>
        <ThemedText style={styles.subtitle}>
          Lieux, hébergements et synagogues pour votre Chabbat Hattan
        </ThemedText>

        {/* Sous-catégories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subCatList}
          style={styles.subCatScroll}
        >
          {SUB_CATS.map(sc => (
            <Pressable
              key={sc.key}
              style={[styles.subCatChip, activeSubCat === sc.key && styles.subCatChipActive]}
              onPress={() => setActiveSubCat(sc.key)}
            >
              <ThemedText style={styles.subCatIcon}>{sc.icon}</ThemedText>
              <ThemedText style={[styles.subCatLabel, activeSubCat === sc.key && styles.subCatLabelActive]}>
                {sc.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Compteur */}
        <ThemedText style={styles.count}>
          {displayed.length} résultat{displayed.length !== 1 ? 's' : ''}
        </ThemedText>

        {/* Liste */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {displayed.map(item => (
            <View key={item.id} style={[styles.card, { borderLeftColor: C.sauge, borderLeftWidth: 3 }]}>
              <View style={[styles.cardIcon, { backgroundColor: BG[item.subCat] }]}>
                <Ionicons name={ICONS[item.subCat]} size={22} color={C.saugeDark} />
              </View>
              <View style={styles.cardBody}>
                <ThemedText style={styles.cardName}>{item.nom}</ThemedText>
                <View style={styles.cardAddrRow}>
                  <Ionicons name="location-outline" size={12} color={C.textLight} />
                  <ThemedText style={styles.cardAddr}>{item.adresse}, {item.ville}</ThemedText>
                </View>
                {item.description && (
                  <ThemedText style={styles.cardDesc}>{item.description}</ThemedText>
                )}
              </View>
              {item.telephone && (
                <Pressable
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.telephone}`)}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: C.ivoire,
  },
  retourBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  retourText: { color: C.saugeDark, fontSize: 15, fontWeight: '600' },

  wrap: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.textLight, marginBottom: 16, lineHeight: 18 },

  subCatScroll: { flexGrow: 0, marginBottom: 6 },
  subCatList: { gap: 8, paddingRight: 4 },
  subCatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: RADIUS.pill, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.card,
  },
  subCatChipActive: { backgroundColor: C.saugeDark, borderColor: C.saugeDark },
  subCatIcon: { fontSize: 14 },
  subCatLabel: { fontSize: 13, fontWeight: '600', color: C.textMid },
  subCatLabelActive: { color: '#fff' },

  count: { fontSize: 12, color: C.textLight, marginTop: 10, marginBottom: 12 },

  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.card,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
    overflow: 'hidden',
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: '700', color: C.textDark },
  cardAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardAddr: { fontSize: 12, color: C.textLight },
  cardDesc: { fontSize: 12, color: C.textMid, marginTop: 4, lineHeight: 17 },

  callBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.sauge,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
});
