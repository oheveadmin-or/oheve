import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  return (
    <ScreenLayout>
      <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
        <ThemedText style={styles.homeButtonText}>← Retour à l’accueil</ThemedText>
      </Pressable>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Paramètres</ThemedText>
        <ThemedText style={styles.subtitle}>Préférences de l’application et gestion du compte.</ThemedText>
      </View>

      <View style={styles.list}>
        <Pressable style={styles.row}>
          <ThemedText style={styles.rowText}>Notifications</ThemedText>
        </Pressable>
        <Pressable style={styles.row}>
          <ThemedText style={styles.rowText}>Langue</ThemedText>
        </Pressable>
        <Pressable style={styles.row}>
          <ThemedText style={styles.rowText}>Support</ThemedText>
        </Pressable>
      </View>

      <Pressable style={styles.logoutBtn} onPress={() => router.replace('/(auth)')}>
        <ThemedText style={styles.logoutText}>Déconnexion</ThemedText>
      </Pressable>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  homeButton: { alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 6 },
  homeButtonText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  header: { marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, opacity: 0.8 },
  list: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowText: { fontSize: 15, fontWeight: '500' },
  logoutBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
});
