import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';

const PRESTATAIRES: Record<string, { id: string; nom: string; prix?: number; ville: string; note: number }[]> = {
  photographe: [
    { id: '1', nom: 'Studio Photo Paris', prix: 2500, ville: 'Paris', note: 4.8 },
    { id: '2', nom: 'Captures Émotion', prix: 1800, ville: 'Paris', note: 4.6 },
    { id: '3', nom: 'Lumière Douce', prix: 3200, ville: 'Lyon', note: 4.9 },
  ],
  traiteur: [
    { id: '4', nom: 'Saveurs & Mariages', prix: 85, ville: 'Lyon', note: 4.9 },
    { id: '5', nom: 'Traiteur Deluxe', prix: 120, ville: 'Marseille', note: 4.5 },
    { id: '6', nom: 'Cuisine Élégante', prix: 95, ville: 'Paris', note: 4.7 },
  ],
  salle: [
    { id: '7', nom: 'Château des Roses', prix: 8000, ville: 'Loire', note: 4.7 },
    { id: '8', nom: 'Villa Belle Vue', prix: 5500, ville: 'Nice', note: 4.6 },
    { id: '9', nom: 'Domaine du Mariage', prix: 6500, ville: 'Provence', note: 4.8 },
  ],
  fleuriste: [
    { id: '10', nom: 'Fleurs & Senteurs', ville: 'Paris', note: 4.8 },
    { id: '11', nom: "Jardins de l'Élégance", ville: 'Lyon', note: 4.5 },
  ],
  musicien: [
    { id: '12', nom: 'Orchestre Classique', ville: 'Paris', note: 4.9 },
    { id: '13', nom: 'DJ Wedding Pro', ville: 'Marseille', note: 4.6 },
  ],
  organisateur: [
    { id: '14', nom: 'Wedding Planner Plus', ville: 'Paris', note: 4.8 },
    { id: '15', nom: "Organisation parfaite", ville: 'Lyon', note: 4.7 },
  ],
};

const LABELS: Record<string, string> = {
  photographe: 'Photographes',
  traiteur: 'Traiteurs',
  salle: 'Salles / Lieux',
  fleuriste: 'Fleuristes',
  musicien: 'Musiciens / DJ',
  organisateur: 'Organisateurs',
};

type TriPrix = 'aucun' | 'croissant' | 'decroissant';
type TriNote = 'aucun' | 'croissant' | 'decroissant';

export default function CategoryProvidersScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug: string | string[] }>();
  const slug = useMemo(
    () => (Array.isArray(slugParam) ? slugParam[0] : slugParam) ?? '',
    [slugParam]
  );
  const { width } = useWindowDimensions();
  const filterRowWrap = width < 420;

  const [triPrix, setTriPrix] = useState<TriPrix>('aucun');
  const [triNote, setTriNote] = useState<TriNote>('aucun');
  const [villeFilter, setVilleFilter] = useState<string>('');
  const goBackOrProvidersTab = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(app)/(tabs)/providers');
  };

  const prestataires = slug ? PRESTATAIRES[slug] ?? [] : [];
  const label = slug ? LABELS[slug] ?? slug : '';

  let filtered = prestataires.filter((p) =>
    villeFilter ? p.ville.toLowerCase().includes(villeFilter.toLowerCase()) : true
  );

  filtered = [...filtered].sort((a, b) => {
    if (triPrix !== 'aucun') {
      const pa = a.prix ?? 0;
      const pb = b.prix ?? 0;
      return triPrix === 'croissant' ? pa - pb : pb - pa;
    }
    if (triNote !== 'aucun') {
      return triNote === 'croissant' ? a.note - b.note : b.note - a.note;
    }
    return 0;
  });

  return (
    <ScreenLayout edges={['top', 'left', 'right', 'bottom']} constrainWidth={false}>
      <View style={[styles.container, { paddingHorizontal: width < 360 ? 16 : 24 }]}>
      <View style={styles.header}>
        <Pressable style={styles.retourBtn} onPress={goBackOrProvidersTab}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
          <ThemedText style={styles.retourText}>Retour</ThemedText>
        </Pressable>
        <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
          <ThemedText style={styles.homeButtonText}>Accueil</ThemedText>
        </Pressable>
      </View>

      <ThemedText style={styles.title}>{label}</ThemedText>
      <ThemedText style={styles.subtitle}>
        {filtered.length} prestataire{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
      </ThemedText>

      <View style={styles.filters}>
        <View style={[styles.filterRow, filterRowWrap && styles.filterRowWrap]}>
          <ThemedText style={styles.filterLabel}>Prix</ThemedText>
          <View style={styles.filterChips}>
            {(['aucun', 'croissant', 'decroissant'] as TriPrix[]).map((v) => (
              <Pressable
                key={v}
                style={[styles.filterChip, triPrix === v && styles.filterChipActive]}
                onPress={() => setTriPrix(v)}
              >
                <ThemedText style={triPrix === v && styles.filterChipTextActive}>
                  {v === 'aucun' ? '-' : v === 'croissant' ? '↑' : '↓'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[styles.filterRow, filterRowWrap && styles.filterRowWrap]}>
          <ThemedText style={styles.filterLabel}>Note</ThemedText>
          <View style={styles.filterChips}>
            {(['aucun', 'croissant', 'decroissant'] as TriNote[]).map((v) => (
              <Pressable
                key={v}
                style={[styles.filterChip, triNote === v && styles.filterChipActive]}
                onPress={() => setTriNote(v)}
              >
                <ThemedText style={triNote === v && styles.filterChipTextActive}>
                  {v === 'aucun' ? '-' : v === 'croissant' ? '↑' : '↓'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[styles.filterRow, filterRowWrap && styles.filterRowWrap]}>
          <ThemedText style={styles.filterLabel}>Ville</ThemedText>
          <TextInput
            style={styles.villeInput}
            placeholder="Filtrer par ville"
            placeholderTextColor="#9ca3af"
            value={villeFilter}
            onChangeText={setVilleFilter}
          />
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map((p) => (
          <Pressable
            key={p.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/(app)/providers/${p.id}`)}
          >
            <View style={styles.cardBody}>
              <ThemedText style={styles.cardTitle}>{p.nom}</ThemedText>
              <View style={styles.cardMeta}>
                <ThemedText style={styles.cardMetaText}>{p.ville}</ThemedText>
                <ThemedText style={styles.cardMetaText}>•</ThemedText>
                <ThemedText style={styles.cardMetaText}>{p.note}/5</ThemedText>
                {p.prix != null && (
                  <>
                    <ThemedText style={styles.cardMetaText}>•</ThemedText>
                    <ThemedText style={styles.cardMetaText}>{p.prix} €</ThemedText>
                  </>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        ))}
      </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  header: { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  retourBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retourText: { color: '#6366f1', fontSize: 16, fontWeight: '500' },
  homeButton: { paddingVertical: 6, paddingHorizontal: 10 },
  homeButtonText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, opacity: 0.8, marginBottom: 20 },
  filters: { marginBottom: 20, gap: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'nowrap' },
  filterRowWrap: { flexWrap: 'wrap', alignItems: 'flex-start' },
  filterLabel: { fontSize: 14, fontWeight: '600', minWidth: 44 },
  filterChips: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipTextActive: { color: '#fff' },
  villeInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 14,
  },
  list: { flex: 1 },
  listContent: { gap: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardPressed: { opacity: 0.8 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', gap: 6 },
  cardMetaText: { fontSize: 14, opacity: 0.7 },
});
