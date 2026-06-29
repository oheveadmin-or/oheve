import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { C } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

function Row({ icon, label, onPress, danger }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={danger ? C.error : C.moka} style={styles.rowIcon} />
      <ThemedText style={[styles.rowLabel, danger && { color: C.error }]}>{label}</ThemedText>
      <Ionicons name="chevron-forward-outline" size={16} color={C.textLight} />
    </Pressable>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <ThemedText style={styles.sectionTitle}>{label}</ThemedText>;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const token = user?.accessToken;

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Toutes vos données seront définitivement supprimées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(API_ENDPOINTS.deleteAccount, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              signOut();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer le compte. Réessaie plus tard.');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.exportData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      Alert.alert('Export réussi', 'Tes données ont été exportées. Consulte la réponse dans ton espace.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'exporter les données pour l\'instant.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.title}>Paramètres</ThemedText>

        {user && (
          <View style={styles.profileCard}>
            <ThemedText style={styles.profileLabel}>Connecté en tant que</ThemedText>
            <ThemedText style={styles.profileEmail}>{user.email}</ThemedText>
          </View>
        )}

        <SectionTitle label="Mon compte" />
        <View style={styles.section}>
          <Row icon="person-outline" label="Informations personnelles" onPress={() => router.push('/(app)/personal-info')} />
          <Row icon="lock-closed-outline" label="Sécurité et mot de passe" onPress={() => router.push('/(app)/security')} />
        </View>

        <SectionTitle label="Confidentialité & Légal" />
        <View style={styles.section}>
          <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => router.push('/(app)/privacy-policy')} />
          <Row icon="document-text-outline" label="Conditions générales d'utilisation" onPress={() => router.push('/(app)/cgu')} />
          <Row icon="information-circle-outline" label="Mentions légales" onPress={() => router.push('/(app)/mentions-legales')} />
          <Row icon="download-outline" label="Exporter mes données" onPress={handleExportData} />
        </View>

        <SectionTitle label="Support" />
        <View style={styles.section}>
          <Row
            icon="mail-outline"
            label="Contacter le support"
            onPress={() => Linking.openURL('mailto:support@ohevewedding.com')}
          />
        </View>

        <SectionTitle label="Zone de danger" />
        <View style={styles.section}>
          <Row icon="trash-outline" label="Supprimer mon compte" onPress={handleDeleteAccount} danger />
          <Row icon="log-out-outline" label="Se déconnecter" onPress={() => signOut()} danger />
        </View>

        <View style={styles.supportFooter}>
          <ThemedText style={styles.supportFooterText}>support@ohevewedding.com</ThemedText>
          <ThemedText style={styles.supportFooterSub}>© 2025 Oheve Wedding</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '700', color: C.textDark, marginTop: 16, marginBottom: 20 },
  profileCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  profileLabel: { fontSize: 12, color: C.textLight, marginBottom: 4 },
  profileEmail: { fontSize: 15, fontWeight: '600', color: C.textDark },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: C.textLight, letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },
  section: {
    backgroundColor: C.card,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.taupe,
  },
  rowPressed: { opacity: 0.6 },
  rowIcon: { marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, color: C.textDark },
  supportFooter: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 4,
  },
  supportFooterText: { fontSize: 13, color: C.textLight, fontWeight: '500' },
  supportFooterSub: { fontSize: 11, color: C.textLight, opacity: 0.6 },
});
