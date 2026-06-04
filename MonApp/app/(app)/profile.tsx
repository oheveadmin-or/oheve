import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <ScreenLayout>
      <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
        <ThemedText style={styles.homeButtonText}>← Retour à l’accueil</ThemedText>
      </Pressable>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Profil</ThemedText>
        <ThemedText style={styles.subtitle}>Informations principales du couple et du mariage.</ThemedText>
      </View>
      <View style={styles.card}>
        <ThemedText style={styles.line}>Prénom: {user?.prenom ?? '-'}</ThemedText>
        <ThemedText style={styles.line}>Nom: {user?.nom ?? '-'}</ThemedText>
        <ThemedText style={styles.line}>Email: {user?.email ?? '-'}</ThemedText>
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
  line: { fontSize: 15, fontWeight: '500' },
});
