import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { PublicSiteForm } from '@/src/features/publicSite/components/PublicSiteForm';
import { PublicSiteSuccessCard } from '@/src/features/publicSite/components/PublicSiteSuccessCard';
import { createPublicSite } from '@/src/features/publicSite/services/publicSiteApi';
import type { CreatePublicSiteResponseData, PublicSiteFormValues } from '@/src/features/publicSite/types/publicSite.types';
import { validatePublicSiteForm } from '@/src/features/publicSite/utils/validatePublicSiteForm';
import { guessGuestSiteBuilderUrl } from '@/constants/config';

const SESSION_ERR =
  /session invalide|expirée|authentification requise|non authentifié/i;

export default function WeddingCardScreen() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [result, setResult] = useState<CreatePublicSiteResponseData | null>(null);
  const [showReLogin, setShowReLogin] = useState(false);

  const accessToken = user?.accessToken?.trim() ?? '';
  const initialFromProfile = useMemo<Partial<PublicSiteFormValues>>(
    () => ({
      brideName: user?.prenom ? `${user.prenom} ${user.nom ?? ''}`.trim() : '',
      groomName: '',
      weddingDate: user?.date_mariage?.slice(0, 10) ?? '',
      location: [user?.wedding_city, user?.wedding_country].filter(Boolean).join(', ') || user?.wedding_address || '',
    }),
    [user]
  );

  const handleSubmit = async (values: PublicSiteFormValues) => {
    setError(null);
    setFieldErrors([]);

    const v = validatePublicSiteForm(values);
    if (!v.ok || !v.values) {
      setFieldErrors(v.errors);
      return;
    }

    if (!accessToken) {
      setError('Tu dois être connecté avec un compte à jour. Déconnecte-toi puis reconnecte-toi pour obtenir une session sécurisée.');
      setShowReLogin(true);
      return;
    }

    setLoading(true);
    setShowReLogin(false);
    try {
      const data = await createPublicSite(v.values, accessToken);
      setResult(data);
    } catch (e) {
      const err = e as Error & { errors?: string[]; status?: number };
      const isAuth =
        err.status === 401 || (typeof err.message === 'string' && SESSION_ERR.test(err.message));
      if (isAuth && user) {
        await updateUser({ accessToken: undefined });
        setError(
          'Ta session ne correspond plus au serveur. Reconnecte-toi pour obtenir un nouveau jeton.'
        );
        setShowReLogin(true);
      } else {
        setError(err.message);
        if (err.errors?.length) setFieldErrors(err.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <ThemedText style={styles.backText}>← Retour</ThemedText>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.overline}>Carte de mariage</ThemedText>
        <ThemedText style={styles.title}>Mini-site invités</ThemedText>

        {/* Bannière expérience desktop */}
        <Pressable
          style={styles.desktopBanner}
          onPress={() => Linking.openURL(guessGuestSiteBuilderUrl()).catch(() => {})}
        >
          <ThemedText style={styles.desktopBannerIcon}>💻</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.desktopBannerTitle}>Meilleure expérience sur ordinateur</ThemedText>
            <ThemedText style={styles.desktopBannerSub}>
              Pour personnaliser les couleurs, les sections et voir un aperçu complet, ouvre le studio web depuis ton ordinateur.
            </ThemedText>
          </View>
          <ThemedText style={styles.desktopBannerArrow}>›</ThemedText>
        </Pressable>

        {!accessToken ? (
          <View style={styles.warnBox}>
            <ThemedText style={styles.warnText}>
              Session sans jeton d'accès. Déconnecte-toi puis reconnecte-toi pour utiliser cette fonctionnalité.
            </ThemedText>
            <Pressable style={styles.reloginBtn} onPress={() => router.push('/(auth)/login' as Href)}>
              <ThemedText style={styles.reloginBtnText}>Aller à la connexion</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorTitle}>Erreur</ThemedText>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            {showReLogin ? (
              <Pressable style={styles.reloginBtn} onPress={() => router.push('/(auth)/login' as Href)}>
                <ThemedText style={styles.reloginBtnText}>Aller à la connexion</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {fieldErrors.length > 0 ? (
          <View style={styles.errorBox}>
            {fieldErrors.map((line) => (
              <ThemedText key={line} style={styles.errorText}>
                • {line}
              </ThemedText>
            ))}
          </View>
        ) : null}

        {result ? (
          <>
            <PublicSiteSuccessCard publicUrl={result.publicUrl} slug={result.slug} />
            <Pressable style={styles.resetBtn} onPress={() => setResult(null)}>
              <ThemedText style={styles.resetBtnText}>Créer un nouveau site</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <PublicSiteForm initialValues={initialFromProfile} disabled={loading} onSubmit={handleSubmit} />
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#6D5CE8" />
                <ThemedText style={styles.loadingText}>Création en cours…</ThemedText>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginBottom: 8, paddingVertical: 6 },
  backText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  scroll: { paddingBottom: 48, gap: 12 },
  overline: { fontSize: 13, opacity: 0.7 },
  title: { fontSize: 28, fontWeight: '700' },
  desktopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  desktopBannerIcon: { fontSize: 22 },
  desktopBannerTitle: { fontSize: 14, fontWeight: '700', color: '#4c1d95', marginBottom: 2 },
  desktopBannerSub: { fontSize: 12, color: '#5b21b6', opacity: 0.85, lineHeight: 17 },
  desktopBannerArrow: { fontSize: 22, color: '#a78bfa', fontWeight: '600' },
  warnBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warnText: { fontSize: 14, color: '#92400e' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 4,
  },
  errorTitle: { fontWeight: '700', color: '#b91c1c' },
  errorText: { fontSize: 14, color: '#991b1b' },
  reloginBtn: {
    marginTop: 12,
    backgroundColor: '#6D5CE8',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  reloginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  loadingText: { fontSize: 14, opacity: 0.8 },
  resetBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetBtnText: { color: '#6D5CE8', fontWeight: '700', fontSize: 15 },
});
