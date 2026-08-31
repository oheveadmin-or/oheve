import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/services/auth/api';

type Role = 'client' | 'prestataire' | 'boutique';

const BOUTIQUE_SOON_TITLE = 'Coming soon';
const BOUTIQUE_SOON_TEXT =
  "Les comptes Boutique arrivent très bientôt sur Oheve. En attendant, choisissez Marié·e ou Prestataire.";

const ROLES: { id: Role; icon: string; title: string; subtitle: string; color: string; soon?: boolean }[] = [
  {
    id: 'client',
    icon: 'heart-outline',
    title: 'Marié·e',
    subtitle: 'Planifiez votre mariage de A à Z',
    color: C.sauge,
  },
  {
    id: 'prestataire',
    icon: 'briefcase-outline',
    title: 'Prestataire',
    subtitle: 'Développez votre activité et trouvez des clients',
    color: C.moka,
  },
  {
    id: 'boutique',
    icon: 'storefront-outline',
    title: 'Boutique',
    subtitle: 'Bientôt disponible sur Oheve',
    color: '#B8A082',
    soon: true,
  },
];

export default function RoleSelectScreen() {
  const { user, updateUser } = useAuth();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected) {
      Alert.alert('Choisissez un profil', 'Sélectionnez votre type de compte pour continuer.');
      return;
    }
    if (selected === 'boutique') {
      Alert.alert(BOUTIQUE_SOON_TITLE, BOUTIQUE_SOON_TEXT);
      return;
    }
    setLoading(true);
    try {
      if (user?.accessToken) {
        const res = await authApi.updateRole(user.accessToken, selected);
        if (res?.success && res.data?.accessToken) {
          await updateUser({
            role: selected as 'client' | 'prestataire' | 'boutique',
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          });
        } else {
          await updateUser({ role: selected as 'client' | 'prestataire' | 'boutique' });
        }
      } else {
        await updateUser({ role: selected as 'client' | 'prestataire' | 'boutique' });
      }

      if (selected === 'prestataire') {
        // Inscription prestataire : d'abord la fiche complète (infos visibles
        // par les mariés), puis l'abonnement (39,99€/mois, 6 mois offerts aux 200 premiers).
        router.replace('/(app)/prestataire/setup');
      } else {
        router.replace('/(onboarding)/setup');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.logoWrap}>
        <View style={styles.logo}>
          <ThemedText style={styles.logoText}>Oe</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.title}>Bienvenue sur Oheve</ThemedText>
      <ThemedText style={styles.subtitle}>
        Quel type de compte souhaitez-vous créer ?
      </ThemedText>

      <View style={styles.cards}>
        {ROLES.map((r) => {
          const active = selected === r.id;
          return (
            <Pressable
              key={r.id}
              style={[
                styles.card,
                active && !r.soon && { borderColor: r.color, borderWidth: 2.5 },
                r.soon && styles.cardSoon,
              ]}
              onPress={() => {
                if (r.soon) {
                  Alert.alert(BOUTIQUE_SOON_TITLE, BOUTIQUE_SOON_TEXT);
                  return;
                }
                setSelected(r.id);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: active ? r.color : C.card }]}>
                <Ionicons
                  name={r.icon as 'heart-outline'}
                  size={28}
                  color={active ? C.textInvert : r.color}
                />
              </View>
              <View style={styles.cardText}>
                <View style={styles.cardTitleRow}>
                  <ThemedText style={[styles.cardTitle, active && !r.soon && { color: r.color }]}>
                    {r.title}
                  </ThemedText>
                  {r.soon && (
                    <View style={styles.soonBadge}>
                      <ThemedText style={styles.soonBadgeTxt}>Coming soon</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.cardSub}>{r.subtitle}</ThemedText>
              </View>
              {active && !r.soon && (
                <Ionicons name="checkmark-circle" size={22} color={r.color} style={styles.check} />
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.btn, !selected && styles.btnDisabled, loading && styles.btnDisabled]}
        onPress={handleConfirm}
        disabled={!selected || loading}
      >
        <ThemedText style={styles.btnText}>
          {loading ? 'Chargement…' : 'Continuer →'}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 18, fontWeight: '800', color: C.textInvert, fontStyle: 'italic' },

  title: { fontSize: 28, fontWeight: '800', color: C.textDark, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: C.textLight, textAlign: 'center', marginBottom: 32 },

  cards: { gap: 14, marginBottom: 36 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: C.card, borderRadius: RADIUS.md,
    padding: 18, borderWidth: 2, borderColor: 'transparent',
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardSoon: { opacity: 0.55, borderStyle: 'dashed', borderColor: C.border },
  soonBadge: {
    backgroundColor: C.moka, borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  soonBadgeTxt: { fontSize: 9.5, fontWeight: '800', color: C.textInvert, letterSpacing: 0.3 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  cardSub: { fontSize: 13, color: C.textLight },
  check: { marginLeft: 4 },

  btn: {
    backgroundColor: C.sauge, paddingVertical: 16,
    borderRadius: RADIUS.md, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: C.textInvert, fontSize: 16, fontWeight: '700' },
});
