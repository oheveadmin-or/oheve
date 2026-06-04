import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>Paramètres</ThemedText>

        {user && (
          <View style={styles.profileCard}>
            <ThemedText style={styles.profileLabel}>Connecté en tant que</ThemedText>
            <ThemedText style={styles.profileEmail}>{user.email}</ThemedText>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={() => signOut()}
        >
          <ThemedText style={styles.logoutText}>Se déconnecter</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  profileCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  profileLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
