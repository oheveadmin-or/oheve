import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';

const FEATURES = [
  { icon: 'sparkles-outline',   title: 'Généré par IA',         desc: 'Slogan, histoire, programme et FAQ créés automatiquement' },
  { icon: 'color-palette-outline', title: '30+ thèmes premium', desc: 'Luxe, bohème, classique, mariage juif, oriental…' },
  { icon: 'people-outline',     title: 'RSVP intégré',          desc: 'Réponses enregistrées directement dans Oheve' },
  { icon: 'link-outline',       title: 'Liens personnalisés',   desc: 'Un lien par groupe d\'invités, par événement' },
  { icon: 'globe-outline',      title: 'Votre domaine',         desc: 'prenom-prenom.oheve.app ou votre propre domaine' },
  { icon: 'star-outline',       title: 'Qualité agence',        desc: 'Un site si beau que vos invités ne croiront pas qu\'il a été généré en 3 min' },
];

const THEMES = [
  { label: 'Luxe',          bg: '#0c0c0f', accent: '#d4af37' },
  { label: 'Classique',     bg: '#faf7f2', accent: '#5b4636' },
  { label: 'Romantique',    bg: '#fff5f8', accent: '#b84b6f' },
  { label: 'Mariage Juif',  bg: '#2a1218', accent: '#d4af37' },
  { label: 'Bohème',        bg: '#f9f3ec', accent: '#a0522d' },
  { label: 'Minimaliste',   bg: '#ffffff', accent: '#111111' },
];

export default function SiteMariageScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.saugeDark} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Site Mariage</ThemedText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <ThemedText style={styles.heroBadgeTxt}>Gratuit · Publication payante</ThemedText>
          </View>
          <ThemedText style={styles.heroTitle}>Votre site de mariage{'\n'}en 3 minutes</ThemedText>
          <ThemedText style={styles.heroSub}>
            L'IA génère un site digne d'une agence web spécialisée. Configurez gratuitement, payez uniquement quand vous publiez.
          </ThemedText>
        </View>

        {/* Theme preview strip */}
        <View style={styles.themesRow}>
          {THEMES.map((t) => (
            <View key={t.label} style={[styles.themeChip, { backgroundColor: t.bg }]}>
              <View style={[styles.themeAccentDot, { backgroundColor: t.accent }]} />
              <ThemedText style={[styles.themeChipLabel, { color: t.accent }]} numberOfLines={1}>{t.label}</ThemedText>
            </View>
          ))}
        </View>

        {/* CTA principal */}
        <Pressable style={styles.ctaMain} onPress={() => router.push('/(app)/wedding-site-builder' as never)}>
          <Ionicons name="sparkles" size={20} color="#fff" />
          <ThemedText style={styles.ctaMainTxt}>Créer mon site mariage</ThemedText>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Features */}
        <View style={styles.featuresBlock}>
          <ThemedText style={styles.sectionTitle}>Ce que vous obtenez</ThemedText>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as never} size={18} color={C.sauge} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.featureTitle}>{f.title}</ThemedText>
                <ThemedText style={styles.featureDesc}>{f.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Inspiration sites */}
        <View style={styles.inspoBlock}>
          <Ionicons name="trophy-outline" size={16} color={C.taupe} />
          <ThemedText style={styles.inspoText}>
            Inspiré de Joy, Zola, The Knot et Squarespace Wedding — la même qualité, pour votre mariage.
          </ThemedText>
        </View>

        {/* Pricing info */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <Ionicons name="construct-outline" size={20} color={C.sauge} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.pricingLabel}>Configuration</ThemedText>
              <ThemedText style={styles.pricingDesc}>Style, infos, événements, liens — entièrement gratuit</ThemedText>
            </View>
            <ThemedText style={styles.pricingFree}>Gratuit</ThemedText>
          </View>
          <View style={styles.pricingDivider} />
          <View style={styles.pricingRow}>
            <Ionicons name="globe-outline" size={20} color={C.sauge} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.pricingLabel}>Publication en ligne</ThemedText>
              <ThemedText style={styles.pricingDesc}>Votre site live avec domaine personnalisé</ThemedText>
            </View>
            <ThemedText style={styles.pricingPrice}>À la publication</ThemedText>
          </View>
        </View>

        {/* Voir le site de demo */}
        <Pressable
          style={styles.demoRow}
          onPress={() => Linking.openURL('https://7c613084.oheve.pages.dev')}
        >
          <Ionicons name="eye-outline" size={18} color={C.sauge} />
          <ThemedText style={styles.demoText}>Voir un exemple de site</ThemedText>
          <Ionicons name="open-outline" size={14} color={C.textLight} />
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.saugePale,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },

  hero: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  heroBadge: {
    backgroundColor: C.saugePale, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  heroBadgeTxt: { fontSize: 12, color: C.saugeDark, fontWeight: '600' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: C.textDark, textAlign: 'center', lineHeight: 34 },
  heroSub: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 22 },

  themesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  themeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  themeAccentDot: { width: 8, height: 8, borderRadius: 4 },
  themeChipLabel: { fontSize: 12, fontWeight: '600' },

  ctaMain: {
    backgroundColor: C.sauge, borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  ctaMainTxt: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  featuresBlock: { gap: 14 },
  featureRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  featureDesc: { fontSize: 12, color: C.textLight, lineHeight: 18, marginTop: 1 },

  inspoBlock: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: C.ivoire, borderRadius: RADIUS.md, padding: 14,
  },
  inspoText: { fontSize: 12, color: C.textMid, flex: 1, lineHeight: 18, fontStyle: 'italic' },

  pricingCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.saugePale, overflow: 'hidden',
  },
  pricingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  pricingLabel: { fontSize: 14, fontWeight: '700', color: C.textDark },
  pricingDesc: { fontSize: 12, color: C.textLight, marginTop: 2 },
  pricingFree: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  pricingPrice: { fontSize: 12, fontWeight: '600', color: C.saugeDark, textAlign: 'right' },
  pricingDivider: { height: 1, backgroundColor: C.saugePale, marginHorizontal: 16 },

  demoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: C.saugePale,
  },
  demoText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.sauge },
});
