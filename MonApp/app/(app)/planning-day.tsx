import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';

export default function PlanningDayScreen() {
  return (
    <ScreenLayout>
      <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
        <ThemedText style={styles.homeButtonText}>← Retour à l’accueil</ThemedText>
      </Pressable>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Planning jour J</ThemedText>
        <ThemedText style={styles.subtitle}>Centralise le déroulé de la journée minute par minute.</ThemedText>
      </View>
      <View style={styles.card}>
        <ThemedText style={styles.item}>09:00 - Préparatifs</ThemedText>
        <ThemedText style={styles.item}>12:00 - Cérémonie</ThemedText>
        <ThemedText style={styles.item}>18:00 - Réception</ThemedText>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  homeButton: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 6 },
  homeButtonText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  header: { marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, opacity: 0.8 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, gap: 10 },
  item: { fontSize: 15, fontWeight: '500' },
});
