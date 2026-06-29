import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { apiService } from '@/services/api';

const CATEGORIES = [
  { key: 'photographe', label: 'Photographe', placeholder: '0' },
  { key: 'salle', label: 'Salle', placeholder: '0' },
  { key: 'traiteurs', label: 'Traiteurs', placeholder: '0' },
] as const;

function chiffresSeulement(value: string): string {
  return value.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
}

type BudgetMode = 'global' | 'categories';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export default function BudgetScreen() {
  const { user, updateUser } = useAuth();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  // Date formatée : param ou dérivée de user.date_mariage (YYYY-MM-DD)
  const date = dateParam ?? (user?.date_mariage
    ? (() => {
        const [y, m, d] = (user.date_mariage as string).split('-');
        return `${d} ${MOIS[parseInt(m, 10) - 1]} ${y}`;
      })()
    : undefined);
  const [mode, setMode] = useState<BudgetMode | null>(null);
  const [budgetGlobal, setBudgetGlobal] = useState('');
  const [categories, setCategories] = useState({
    photographe: '',
    salle: '',
    traiteurs: '',
  });
  const [loading, setLoading] = useState(false);

  const email = user?.email;

  const totalCategories = useMemo(() => {
    const p = parseFloat(categories.photographe) || 0;
    const s = parseFloat(categories.salle) || 0;
    const t = parseFloat(categories.traiteurs) || 0;
    return p + s + t;
  }, [categories]);

  const budgetTotal = mode === 'global'
    ? parseFloat(budgetGlobal) || 0
    : totalCategories;

  const isValid = mode === 'global'
    ? parseFloat(budgetGlobal) > 0
    : totalCategories > 0;

  if (!email) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Session expirée. Veuillez vous reconnecter.</ThemedText>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)')}>
          <ThemedText style={styles.buttonText}>Retour</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const handleContinuer = async () => {
    if (!mode || !isValid) {
      Alert.alert('Erreur', mode
        ? 'Veuillez renseigner un montant'
        : 'Veuillez choisir un mode de budget');
      return;
    }

    setLoading(true);
    try {
      const token = user?.accessToken;
      if (mode === 'global') {
        await apiService.mettreAJourBudget({
          email,
          budget_mode: 'global',
          budget_global: parseFloat(budgetGlobal),
        }, token);
      } else {
        await apiService.mettreAJourBudget({
          email,
          budget_mode: 'categories',
          budget_categories: {
            photographe: parseFloat(categories.photographe) || 0,
            salle: parseFloat(categories.salle) || 0,
            traiteurs: parseFloat(categories.traiteurs) || 0,
          },
        }, token);
      }
      await updateUser({ budget_total: budgetTotal });
      router.replace('/(onboarding)/location');
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Une erreur est survenue'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = (key: keyof typeof categories, value: string) => {
    setCategories((prev) => ({ ...prev, [key]: chiffresSeulement(value) }));
  };

  const updateBudgetGlobal = (value: string) => {
    setBudgetGlobal(chiffresSeulement(value));
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Pressable style={styles.retourBtn} onPress={() => router.replace('/(onboarding)/date-mariage')}>
            <Ionicons name="arrow-back" size={24} color="#6366f1" />
            <ThemedText style={styles.retourText}>Retour</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.title}>Définir votre budget mariage</ThemedText>
        <ThemedText style={styles.subtitle}>
          Choisissez un forfait global ou détaillez par catégorie
        </ThemedText>

        <View style={styles.choiceRow}>
          <Pressable
            style={[styles.choiceBtn, mode === 'global' && styles.choiceBtnSelected]}
            onPress={() => setMode('global')}
          >
            <ThemedText style={[styles.choiceText, mode === 'global' && styles.choiceTextSelected]}>
              Forfait global
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.choiceBtn, mode === 'categories' && styles.choiceBtnSelected]}
            onPress={() => setMode('categories')}
          >
            <ThemedText style={[styles.choiceText, mode === 'categories' && styles.choiceTextSelected]}>
              Par catégories
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
        {mode === 'global' && (
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Budget total du mariage</ThemedText>
            <View style={styles.inputRow}>
              <TextInput
                key="input-global"
                style={styles.input}
                placeholder="Ex: 30000"
                placeholderTextColor="#A09890"
                value={budgetGlobal}
                onChangeText={updateBudgetGlobal}
                keyboardType="number-pad"
                autoCorrect={false}
                spellCheck={false}
              />
              <ThemedText style={styles.currency}>€</ThemedText>
            </View>
          </View>
        )}

        {mode === 'categories' && (
          <View style={styles.categoriesContainer}>
            <ThemedText style={styles.instruction}>Saisissez le budget par catégorie</ThemedText>
            {CATEGORIES.map(({ key, label, placeholder }) => (
              <View key={key} style={styles.card} collapsable={false}>
                <ThemedText style={styles.categoryLabel}>{label}</ThemedText>
                <View style={styles.inputRow}>
                  <TextInput
                    key={`input-${key}`}
                    style={styles.input}
                    placeholder={`Ex: ${placeholder === '0' ? '3000' : placeholder}`}
                    placeholderTextColor="#A09890"
                    value={categories[key]}
                    onChangeText={(v) => updateCategory(key, v)}
                    keyboardType="number-pad"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                  <ThemedText style={styles.currency}>€</ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
        </ScrollView>

        <View style={styles.totalBar}>
        <ThemedText style={styles.totalLabel}>Total budget du client</ThemedText>
        <ThemedText style={styles.totalValue}>
          {budgetTotal.toLocaleString('fr-FR')} €
        </ThemedText>
      </View>

        <Pressable
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleContinuer}
          disabled={!isValid || loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Enregistrement...' : 'Continuer'}
          </ThemedText>
        </Pressable>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 16,
  },
  retourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retourText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.8,
    marginBottom: 24,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  choiceBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  choiceBtnSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  choiceText: {
    fontSize: 15,
    fontWeight: '500',
  },
  choiceTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    minHeight: 200,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  instruction: {
    fontSize: 15,
    opacity: 0.8,
    marginBottom: 16,
  },
  categoriesContainer: {
    gap: 12,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
