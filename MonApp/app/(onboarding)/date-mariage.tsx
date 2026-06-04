import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { apiService } from '@/services/api';

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const JOURS_SEM = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

type Step = 'year' | 'month' | 'day';

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth();
const CURRENT_DAY = TODAY.getDate();

function isDateInPast(year: number, month: number, day: number): boolean {
  if (year < CURRENT_YEAR) return true;
  if (year > CURRENT_YEAR) return false;
  if (month < CURRENT_MONTH) return true;
  if (month > CURRENT_MONTH) return false;
  return day < CURRENT_DAY;
}

export default function DateMariageScreen() {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<Step>('year');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [day, setDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const email = user?.email;
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

  const handleRetour = () => {
    if (step === 'year') {
      router.replace('/(auth)');
    } else if (step === 'month') {
      setStep('year');
    } else {
      setStep('month');
    }
  };

  const handleYearSelect = (y: number) => {
    setYear(y);
    setDay(null);
    setStep('month');
  };

  const handleMonthSelect = (m: number) => {
    setMonth(m);
    setDay(null);
    setStep('day');
  };

  const handleDaySelect = (d: number) => {
    if (!isDateInPast(year, month, d)) setDay(d);
  };

  const handleContinuer = async () => {
    if (step === 'day' && day === null) {
      Alert.alert('Erreur', 'Veuillez sélectionner un jour');
      return;
    }

    const dayVal = day ?? 1;
    if (isDateInPast(year, month, dayVal)) {
      Alert.alert('Erreur', 'La date du mariage ne peut pas être antérieure à aujourd\'hui');
      return;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`;

    setLoading(true);
    try {
      await apiService.mettreAJourDateMariage({ email, date_mariage: dateStr });
      const dateAffichage = `${day} ${MOIS[month]} ${year}`;
      await updateUser({ date_mariage: dateStr });
      router.push({
        pathname: '/(onboarding)/budget',
        params: { date: dateAffichage },
      });
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Une erreur est survenue'
      );
    } finally {
      setLoading(false);
    }
  };

  const progress = step === 'year' ? 0.25 : step === 'month' ? 0.5 : 0.75;

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysCount = new Date(year, month + 1, 0).getDate();
    const blanks = Array(adjustedFirstDay).fill(null);
    const days = Array.from({ length: daysCount }, (_, i) => i + 1);
    return [...blanks, ...days];
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.retourBtn} onPress={handleRetour}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
          <ThemedText style={styles.retourText}>Retour</ThemedText>
        </Pressable>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ThemedText style={styles.title}>Quelle est la date du mariage ?</ThemedText>

      {step === 'year' && (
        <>
          <ThemedText style={styles.instruction}>Sélectionnez une année (à partir d&apos;aujourd&apos;hui)</ThemedText>
          <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
            <View style={styles.yearGrid}>
              {Array.from({ length: 16 }, (_, i) => CURRENT_YEAR + i).map((y) => (
                <Pressable
                  key={y}
                  style={[styles.gridItem, year === y && styles.gridItemSelected]}
                  onPress={() => handleYearSelect(y)}
                >
                  <ThemedText style={[styles.gridText, year === y && styles.gridTextSelected]}>
                    {y}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {step === 'month' && (
        <>
          <ThemedText style={styles.instruction}>Sélectionnez un mois</ThemedText>
          <ThemedText style={styles.yearLabel}>{year}</ThemedText>
          <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
            <View style={styles.monthGrid}>
              {MOIS.map((m, i) => {
                const isPast = year === CURRENT_YEAR && i < CURRENT_MONTH;
                return (
                  <Pressable
                    key={m}
                    style={[
                      styles.gridItem,
                      month === i && styles.gridItemSelected,
                      isPast && styles.gridItemDisabled,
                    ]}
                    onPress={() => !isPast && handleMonthSelect(i)}
                    disabled={isPast}
                  >
                    <ThemedText
                      style={[
                        styles.gridText,
                        month === i && styles.gridTextSelected,
                        isPast && styles.gridTextDisabled,
                      ]}
                    >
                      {m}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}

      {step === 'day' && (
        <>
          <ThemedText style={styles.instruction}>Sélectionnez un jour</ThemedText>
          <View style={styles.datePreview}>
            <ThemedText style={styles.datePreviewDay}>{day ?? '--'}</ThemedText>
            <ThemedText style={styles.datePreviewMonth}>{MOIS[month]}</ThemedText>
            <ThemedText style={styles.datePreviewYear}>{year}</ThemedText>
          </View>
          <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
              {JOURS_SEM.map((j) => (
                <ThemedText key={j} style={styles.calendarDayHeader}>{j}</ThemedText>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {getDaysInMonth().map((d, i) => {
                const isBlank = d === null;
                const isPast = !isBlank && isDateInPast(year, month, d);
                const isDisabled = isBlank || isPast;
                return (
                  <Pressable
                    key={i}
                    style={[
                      styles.calendarCell,
                      d !== null && day === d && !isPast && styles.calendarCellSelected,
                      isPast && styles.calendarCellDisabled,
                    ]}
                    onPress={() => !isDisabled && handleDaySelect(d!)}
                    disabled={isDisabled}
                  >
                    {!isBlank && (
                      <ThemedText
                        style={[
                          styles.calendarCellText,
                          day === d && !isPast && styles.calendarCellTextSelected,
                          isPast && styles.calendarCellTextDisabled,
                        ]}
                      >
                        {d}
                      </ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}

      {step === 'day' && (
        <Pressable
          style={[
            styles.button,
            (loading || day === null) && styles.buttonDisabled,
          ]}
          onPress={handleContinuer}
          disabled={loading || day === null}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Enregistrement...' : 'Continuer'}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  retourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  retourText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 20,
  },
  yearLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  grid: {
    flex: 1,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '30%',
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gridItemSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  gridItemDisabled: {
    opacity: 0.4,
    backgroundColor: '#f3f4f6',
  },
  gridText: {
    fontSize: 16,
    fontWeight: '500',
  },
  gridTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  gridTextDisabled: {
    color: '#A09890',
  },
  datePreview: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 24,
  },
  datePreviewDay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6366f1',
  },
  datePreviewMonth: {
    fontSize: 18,
    fontWeight: '500',
  },
  datePreviewYear: {
    fontSize: 16,
    opacity: 0.7,
  },
  calendar: {
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  calendarDayHeader: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calendarCell: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarCellSelected: {
    backgroundColor: '#6366f1',
  },
  calendarCellDisabled: {
    opacity: 0.4,
  },
  calendarCellText: {
    fontSize: 14,
  },
  calendarCellTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarCellTextDisabled: {
    color: '#A09890',
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
