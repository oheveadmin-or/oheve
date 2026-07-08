import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorBanner } from '@/components/ui/error-banner';
import { C, RADIUS } from '@/constants/OheveTheme';
import { isPrestaSubActive, useAuth } from '@/contexts/auth-context';
import { prestataireSubApi } from '@/services/auth/api';

type SubStatus = {
  status: string | null;
  active: boolean;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean;
};

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ManageSubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!user?.accessToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await prestataireSubApi.status(user.accessToken);
      if (res?.success && res.data) {
        setSub(res.data);
        setLoadError(null);
      } else {
        setLoadError(res?.message || 'Impossible de charger votre abonnement.');
      }
    } catch {
      setLoadError('Impossible de charger votre abonnement. Vérifiez votre connexion.');
    }
    setLoading(false);
  }, [user?.accessToken]);

  useEffect(() => { load(); }, [load]);

  const doCancel = async () => {
    if (!user?.accessToken) return;
    setCancelling(true);
    try {
      const res = await prestataireSubApi.cancel(user.accessToken);
      if (res?.success) {
        // Reflète immédiatement « résiliation programmée » sans attendre le reload.
        setSub((prev) => (prev ? { ...prev, cancel_at_period_end: true } : prev));
        Alert.alert(
          'Abonnement résilié',
          'Votre abonnement ne sera pas renouvelé. Vous gardez l\'accès complet jusqu\'à la fin de la période en cours.',
        );
        await load();
      } else {
        Alert.alert('Résiliation impossible', res?.message ?? 'Vérifiez votre connexion et réessayez.');
      }
    } catch {
      Alert.alert('Résiliation impossible', 'Vérifiez votre connexion et réessayez.');
    }
    setCancelling(false);
  };

  const confirmCancel = () => {
    Alert.alert(
      'Résilier mon abonnement',
      'Vous perdrez l\'accès à l\'espace prestataire à la fin de la période en cours (visibilité, messagerie, portfolio). Vous pourrez vous réabonner à tout moment.',
      [
        { text: 'Ne pas résilier', style: 'cancel' },
        { text: 'Résilier', style: 'destructive', onPress: doCancel },
      ],
    );
  };

  const status = sub?.status ?? user?.presta_sub_status ?? null;
  const active = sub?.active ?? isPrestaSubActive(status);
  const isTrial = status === 'trialing';
  const alreadyCancelled = sub?.cancel_at_period_end === true;
  const trialEnd = sub?.trial_end ?? user?.presta_trial_end;
  const periodEnd = sub?.current_period_end ?? user?.presta_current_period_end;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.saugeDark} />
        </Pressable>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>Mon abonnement</ThemedText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {loading ? (
          <ActivityIndicator color={C.sauge} size="large" style={{ marginTop: 48 }} />
        ) : (
          <>
            <ErrorBanner message={loadError} onRetry={load} />

            {/* Carte statut */}
            <View style={styles.statusCard}>
              <View style={[styles.statusIcon, { backgroundColor: (active ? C.sauge : C.error) + '20' }]}>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'close-circle'}
                  size={40}
                  color={active ? C.sauge : C.error}
                />
              </View>
              <ThemedText style={styles.statusTitle}>
                {alreadyCancelled
                  ? 'Résiliation programmée'
                  : isTrial
                    ? 'Essai gratuit en cours'
                    : active
                      ? 'Abonnement actif'
                      : 'Aucun abonnement actif'}
              </ThemedText>
              <ThemedText style={styles.statusSub}>
                {alreadyCancelled
                  ? `Accès maintenu jusqu'au ${formatDate(periodEnd)}, puis résiliation.`
                  : isTrial
                    ? `3 mois offerts${trialEnd ? ` — 1er prélèvement le ${formatDate(trialEnd)}` : ''}`
                    : active
                      ? `39 €/mois${periodEnd ? ` — prochain paiement le ${formatDate(periodEnd)}` : ''}`
                      : 'Réabonnez-vous pour retrouver votre espace professionnel.'}
              </ThemedText>
            </View>

            {/* Prix rappel */}
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={18} color={C.saugeDark} />
              <ThemedText style={styles.infoTxt}>39 € / mois, sans engagement</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={C.saugeDark} />
              <ThemedText style={styles.infoTxt}>Paiement sécurisé par Stripe</ThemedText>
            </View>

            {/* Action */}
            {!active ? (
              <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(app)/prestataire/subscribe')}>
                <Ionicons name="rocket-outline" size={18} color="#fff" />
                <ThemedText style={styles.primaryTxt}>Réactiver mon abonnement</ThemedText>
              </Pressable>
            ) : alreadyCancelled ? (
              <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(app)/prestataire/subscribe')}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <ThemedText style={styles.primaryTxt}>Reprendre mon abonnement</ThemedText>
              </Pressable>
            ) : (
              <Pressable style={styles.cancelBtn} onPress={confirmCancel} disabled={cancelling}>
                {cancelling ? (
                  <ActivityIndicator color={C.error} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={C.error} />
                    <ThemedText style={styles.cancelTxt}>Résilier mon abonnement</ThemedText>
                  </>
                )}
              </Pressable>
            )}

            <ThemedText style={styles.footNote}>
              En cas de résiliation, vous gardez l'accès jusqu'à la fin de la période déjà payée. Aucun
              remboursement partiel, mais aucun prélèvement supplémentaire.
            </ThemedText>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.textDark },
  scroll: { padding: 20, gap: 14 },

  statusCard: {
    alignItems: 'center', gap: 8, padding: 22,
    backgroundColor: C.saugePale, borderRadius: RADIUS.lg,
  },
  statusIcon: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  statusTitle: { fontSize: 18, fontWeight: '800', color: C.textDark, textAlign: 'center' },
  statusSub: { fontSize: 13, color: C.textMid, textAlign: 'center', lineHeight: 19 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13,
  },
  infoTxt: { flex: 1, fontSize: 14, color: C.textDark },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.error, borderRadius: 14, paddingVertical: 15, marginTop: 4,
  },
  cancelTxt: { color: C.error, fontWeight: '700', fontSize: 15 },

  footNote: { fontSize: 11.5, color: C.textLight, textAlign: 'center', lineHeight: 17, marginTop: 4 },
});
