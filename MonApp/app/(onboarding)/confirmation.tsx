import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function formatDateSafe(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ConfirmationScreen() {
  const { date_iso, budget } = useLocalSearchParams<{ date_iso?: string; budget?: string }>();
  const budgetStr = typeof budget === 'string' ? budget : undefined;
  const dateLabel = date_iso ? formatDateSafe(date_iso) : null;

  const handleAcceder = () => {
    router.replace('/(app)/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Tout est enregistré</ThemedText>
      <ThemedText style={styles.subtitle}>
        Votre mariage est planifié{dateLabel && dateLabel !== '-' ? ` pour le ${dateLabel}` : ''}.
      </ThemedText>
      {budgetStr && !isNaN(parseFloat(budgetStr)) && (
        <ThemedText style={styles.budgetText}>
          Budget total : {parseFloat(budgetStr).toLocaleString('fr-FR')} €
        </ThemedText>
      )}
      <ThemedText style={styles.description}>
        Vous pouvez maintenant accéder à tous les services de The Event Planner.
      </ThemedText>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handleAcceder}
      >
        <ThemedText style={styles.buttonText}>Accéder à l&apos;accueil</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  budgetText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    opacity: 0.8,
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
