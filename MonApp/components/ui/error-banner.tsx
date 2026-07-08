import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';

/**
 * Bandeau d'erreur réutilisable : affiche un message clair + bouton Réessayer.
 * À utiliser quand un chargement échoue au lieu de laisser l'écran vide.
 */
export function ErrorBanner({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={18} color={C.error} />
      <ThemedText style={styles.text}>{message}</ThemedText>
      {onRetry && (
        <Pressable style={styles.retryBtn} onPress={onRetry} hitSlop={8}>
          <Ionicons name="refresh" size={13} color="#fff" />
          <ThemedText style={styles.retryTxt}>Réessayer</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.errorPale,
    borderWidth: 1,
    borderColor: C.error,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  text: { flex: 1, fontSize: 12.5, color: C.error, lineHeight: 17 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.error,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
