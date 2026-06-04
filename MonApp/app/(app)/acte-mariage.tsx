import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';

type ActeItem = {
  id: string;
  title: string;
  subtitle: string;
  href: '/(app)/public-site/create' | null;
};

const ACTE_ITEMS: ActeItem[] = [
  {
    id: 'public-site',
    title: 'Mini-site public pour les invités',
    subtitle: 'Crée une page publique : URL et slug générés par le serveur.',
    href: '/(app)/public-site/create',
  },
  {
    id: 'contrat',
    title: 'Contrat civil / démarches mairie',
    subtitle: 'Publier les bans, dossier, rendez-vous officiels.',
    href: null,
  },
  {
    id: 'ketubah',
    title: 'Ketubah & témoins',
    subtitle: 'Préparer le texte et les signatures.',
    href: null,
  },
];

export default function ActeMariageScreen() {
  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <ThemedText style={styles.backText}>← Retour</ThemedText>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.overline}>Administratif</ThemedText>
        <ThemedText style={styles.title}>Acte de mariage</ThemedText>
        <ThemedText style={styles.subtitle}>
          Centralise les étapes légales et religieuses. Ouvre une fiche pour agir.
        </ThemedText>

        <View style={styles.list}>
          {ACTE_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              style={styles.row}
              disabled={!item.href}
              onPress={() => item.href && router.push(item.href as Href)}
            >
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.rowSub}>{item.subtitle}</ThemedText>
              </View>
              <ThemedText style={styles.chevron}>{item.href ? '›' : '…'}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 6 },
  backText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  content: { paddingBottom: 48, gap: 12 },
  overline: { fontSize: 13, opacity: 0.7 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, opacity: 0.82, lineHeight: 22, marginBottom: 8 },
  list: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  rowSub: { fontSize: 13, opacity: 0.75, lineHeight: 18 },
  chevron: { fontSize: 22, color: '#A7AD9A', fontWeight: '600' },
});
