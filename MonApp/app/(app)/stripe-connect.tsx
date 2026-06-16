import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';

type ConnectStatus = {
  connected: boolean;
  onboarding_complete?: boolean;
  payouts_enabled?: boolean;
  charges_enabled?: boolean;
  account_id?: string;
};

export default function StripeConnectScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  const fetchStatus = async () => {
    if (!user?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.paymentsConnectStatus, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const json = await res.json();
      if (json.success) setStatus(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, [user?.accessToken]);

  const startOnboarding = async () => {
    if (!user?.accessToken) return;
    setOnboarding(true);
    try {
      const res = await fetch(API_ENDPOINTS.paymentsConnectOnboard, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        await WebBrowser.openBrowserAsync(json.data.url);
        // Après retour, rafraîchir le statut
        await fetchStatus();
      }
    } catch {}
    setOnboarding(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.saugeDark} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Recevoir des paiements</ThemedText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={C.sauge} size="large" style={{ marginTop: 40 }} />
        ) : status?.connected && status.charges_enabled ? (
          /* Compte actif */
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color={C.sauge} />
            </View>
            <ThemedText style={styles.cardTitle}>Compte Stripe actif</ThemedText>
            <ThemedText style={styles.cardSub}>Vous pouvez recevoir des paiements via l'application.</ThemedText>
            <View style={styles.badges}>
              <Badge ok label="Paiements activés" />
              <Badge ok={status.payouts_enabled} label="Virements bancaires" />
              <Badge ok={status.onboarding_complete} label="Vérification complète" />
            </View>
            <ThemedText style={styles.accountId}>ID : {status.account_id}</ThemedText>
          </View>
        ) : status?.connected ? (
          /* Onboarding incomplet */
          <View style={styles.card}>
            <Ionicons name="time-outline" size={48} color="#f59e0b" style={{ alignSelf: 'center' }} />
            <ThemedText style={styles.cardTitle}>Vérification en cours</ThemedText>
            <ThemedText style={styles.cardSub}>
              Votre compte Stripe est créé mais la vérification n'est pas terminée. Complétez votre profil pour activer les paiements.
            </ThemedText>
            <Pressable style={[styles.btn, onboarding && { opacity: 0.6 }]} onPress={startOnboarding} disabled={onboarding}>
              {onboarding ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <ThemedText style={styles.btnTxt}>Compléter mon profil Stripe</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          /* Pas encore connecté */
          <View style={styles.card}>
            <Ionicons name="card-outline" size={56} color={C.sauge} style={{ alignSelf: 'center' }} />
            <ThemedText style={styles.cardTitle}>Connectez votre compte bancaire</ThemedText>
            <ThemedText style={styles.cardSub}>
              Recevez directement les paiements de vos clients sur votre compte bancaire, via Stripe.
            </ThemedText>

            <View style={styles.featureList}>
              <Feature icon="shield-checkmark-outline" text="Paiements sécurisés (Stripe)" />
              <Feature icon="cash-outline" text="95% du montant vous est reversé" />
              <Feature icon="time-outline" text="Virements sous 2–5 jours ouvrés" />
              <Feature icon="globe-outline" text="Cartes du monde entier acceptées" />
            </View>

            <Pressable style={[styles.btn, onboarding && { opacity: 0.6 }]} onPress={startOnboarding} disabled={onboarding}>
              {onboarding ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <ThemedText style={styles.btnTxt}>Créer mon compte Stripe</ThemedText>
                </>
              )}
            </Pressable>
            <ThemedText style={styles.legal}>
              En continuant, vous acceptez les conditions d'utilisation de Stripe. Oheve prend une commission de 5%.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Badge({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <View style={[bStyles.badge, ok ? bStyles.ok : bStyles.pending]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={ok ? C.sauge : '#9ca3af'} />
      <ThemedText style={[bStyles.label, !ok && { color: '#9ca3af' }]}>{label}</ThemedText>
    </View>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={fStyles.row}>
      <Ionicons name={icon as 'home'} size={18} color={C.sauge} />
      <ThemedText style={fStyles.text}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.saugePale },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 24, gap: 14, borderWidth: 1, borderColor: C.saugePale },
  successIcon: { alignSelf: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.textDark, textAlign: 'center' },
  cardSub: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 21 },
  badges: { gap: 8 },
  accountId: { fontSize: 11, color: C.textLight, textAlign: 'center' },
  featureList: { gap: 10, paddingVertical: 6 },
  btn: { backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  legal: { fontSize: 11, color: C.textLight, textAlign: 'center', lineHeight: 17 },
});

const bStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  ok: { backgroundColor: C.saugePale, borderColor: C.sauge },
  pending: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  label: { fontSize: 13, fontWeight: '600', color: C.textDark },
});

const fStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { fontSize: 14, color: C.textMid, flex: 1 },
});
