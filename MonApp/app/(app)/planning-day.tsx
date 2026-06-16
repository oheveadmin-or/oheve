import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';

export default function PlanningDayScreen() {
  return (
    <ScreenLayout>
      <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
        <ThemedText style={styles.homeButtonText}>← Retour à l'accueil</ThemedText>
      </Pressable>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Planning jour J</ThemedText>
        <ThemedText style={styles.subtitle}>Centralisez le déroulé de votre journée minute par minute.</ThemedText>
      </View>
      <View style={styles.emptyCard}>
        <Ionicons name="time-outline" size={40} color={C.sauge} />
        <ThemedText style={styles.emptyText}>
          Aucun événement planifié pour le moment. Ajoutez vos étapes depuis le calendrier.
        </ThemedText>
        <Pressable style={styles.ctaBtn} onPress={() => router.push('/(app)/(tabs)/calendar' as never)}>
          <ThemedText style={styles.ctaBtnText}>Ouvrir le calendrier</ThemedText>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  homeButton: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 6 },
  homeButtonText: { color: C.saugeDark, fontSize: 15, fontWeight: '600' },
  header: { marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6, color: C.textDark },
  subtitle: { fontSize: 15, color: C.textLight },
  emptyCard: {
    borderRadius: RADIUS.lg,
    padding: 24,
    gap: 14,
    alignItems: 'center',
    backgroundColor: C.card,
  },
  emptyText: { fontSize: 15, color: C.textMid, textAlign: 'center', lineHeight: 22 },
  ctaBtn: {
    backgroundColor: C.sauge,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
