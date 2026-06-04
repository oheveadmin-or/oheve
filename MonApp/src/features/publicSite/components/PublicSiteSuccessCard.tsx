import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { normalizeMiniSiteUrlForDevice } from '@/constants/config';

interface PublicSiteSuccessCardProps {
  publicUrl: string;
  slug: string;
}

export function PublicSiteSuccessCard({ publicUrl, slug }: PublicSiteSuccessCardProps) {
  const [copied, setCopied] = useState(false);

  const displayUrl = useMemo(() => normalizeMiniSiteUrlForDevice(publicUrl, slug), [publicUrl, slug]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Erreur', 'Impossible de copier le lien.');
    }
  };

  const handleOpen = () => {
    Linking.openURL(displayUrl).catch(() => {
      Alert.alert('Erreur', 'Impossible d’ouvrir le lien.');
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: displayUrl, url: displayUrl });
    } catch {
      // annulé par l’utilisateur
    }
  };

  return (
    <View style={styles.card}>
      <ThemedText style={styles.title}>Mini-site créé</ThemedText>
      <ThemedText style={styles.sub}>
        L’URL officielle est celle renvoyée par le serveur (slug : {slug}).
      </ThemedText>

      <View style={styles.urlBox}>
        <ThemedText style={styles.url} selectable>
          {displayUrl}
        </ThemedText>
      </View>

      <ThemedText style={styles.hint}>
        En dev le lien est en http:// (pas besoin de mkcert). Copie l’URL complète avec http:// — « 172.20.10.4:5173/… » seul ne
        marche pas dans Safari. Sur le Mac : cd guest-site && npm run dev.
      </ThemedText>
      <View style={styles.actions}>
        <Pressable style={styles.btnSecondary} onPress={handleCopy}>
          <ThemedText style={styles.btnSecondaryText}>{copied ? 'Copié' : 'Copier le lien'}</ThemedText>
        </Pressable>
        <Pressable style={styles.btnPrimary} onPress={handleOpen}>
          <ThemedText style={styles.btnPrimaryText}>Ouvrir</ThemedText>
        </Pressable>
      </View>

      <Pressable style={styles.btnShare} onPress={handleShare}>
        <ThemedText style={styles.btnShareText}>Partager</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#fff',
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 14, opacity: 0.75, lineHeight: 20 },
  urlBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  url: { fontSize: 14, color: '#4338ca', fontWeight: '500' },
  hint: { fontSize: 12, opacity: 0.75, lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#6D5CE8',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  btnSecondaryText: { fontWeight: '600', fontSize: 15 },
  btnShare: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnShareText: { color: '#6D5CE8', fontWeight: '700', fontSize: 15 },
});
