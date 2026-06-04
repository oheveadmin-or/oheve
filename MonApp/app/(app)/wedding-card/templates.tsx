import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';

export default function WeddingCardTemplatesScreen() {
  return (
    <ScreenLayout>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.block}>
          <ThemedText style={styles.title}>Modèles carte de mariage</ThemedText>
          <ThemedText style={styles.subtitle}>
            Choisis une base visuelle avant de passer dans l’éditeur.
          </ThemedText>
        </View>

        <View style={styles.block}>
          <ThemedText style={styles.modelName}>Classique Élégant</ThemedText>
          <ThemedText style={styles.modelMeta}>Fond clair • Typographie serif • Ton formel</ThemedText>
        </View>
        <View style={styles.block}>
          <ThemedText style={styles.modelName}>Floral Romantique</ThemedText>
          <ThemedText style={styles.modelMeta}>Motifs floraux • Tons pastel • Texte centré</ThemedText>
        </View>
        <View style={styles.block}>
          <ThemedText style={styles.modelName}>Moderne Minimal</ThemedText>
          <ThemedText style={styles.modelMeta}>Grille simple • Contrastes sobres • Design épuré</ThemedText>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    width: '100%',
    paddingBottom: 120,
  },
  block: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececf1',
    backgroundColor: '#fff',
    padding: 16,
    gap: 6,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  modelName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modelMeta: { fontSize: 14, color: '#6b7280' },
});
