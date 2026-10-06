import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InvitationSender } from '@/components/invitation-sender';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';

type MySite = {
  id: string;
  slug: string;
  coupleName: string;
  brideName: string;
  groomName: string;
  date: string;
  city: string;
  /** Clé privée du site : requise dans le lien invités (?k=) */
  accessKey?: string | null;
};

function makeSlug(bride: string, groom: string): string {
  const clean = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const slug = `${clean(bride)}-${clean(groom)}`;
  return slug || 'mariage';
}

export default function SiteMariageScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshAccessToken } = useAuth();

  const [mySite, setMySite] = useState<MySite | null>(null);
  const [loading, setLoading] = useState(true);
  // Échec du chargement (session, réseau) : on NE montre PAS le formulaire de
  // création — le couple a peut-être déjà un site (sinon il le recréait).
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [creating, setCreating] = useState(false);
  // Jeton longue durée (30 j) pour la WebView du builder — évite l'expiration
  // « Session expirée » en pleine conception. Fallback : access token.
  const [builderToken, setBuilderToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.accessToken) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setLoadFailed(false);
    (async () => {
      try {
        let res = await fetch(API_ENDPOINTS.mySites, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        // Jeton expiré : on le renouvelle et on réessaie une fois
        if (res.status === 401) {
          const fresh = await refreshAccessToken();
          if (!fresh) { if (alive) setLoadFailed(true); return; }
          res = await fetch(API_ENDPOINTS.mySites, { headers: { Authorization: `Bearer ${fresh}` } });
        }
        if (!res.ok) { if (alive) setLoadFailed(true); return; }
        const json = (await res.json()) as { success: boolean; data?: MySite[] };
        if (!alive) return;
        if (!json.success) setLoadFailed(true);
        else if (json.data && json.data.length > 0) setMySite(json.data[0]);
      } catch {
        if (alive) setLoadFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    fetch(API_ENDPOINTS.weddingBuilderToken, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { token?: string } | null) => {
        if (json?.token) setBuilderToken(json.token);
      })
      .catch(() => {});
    return () => { alive = false; };
    // refreshAccessToken change à chaque renouvellement : ne pas relancer pour ça
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken, reloadKey]);

  const builderUrl = mySite
    ? `${API_ENDPOINTS.weddingSitePublicBase}/${mySite.slug}/build?token=${builderToken ?? user?.accessToken ?? ''}`
    : null;

  // Le site est privé : sans ?k=<clé>, la page publique est bloquée serveur.
  const publicUrl = mySite
    ? `${API_ENDPOINTS.weddingSitePublicBase}/${mySite.slug}${mySite.accessKey ? `?k=${mySite.accessKey}` : ''}`
    : null;

  async function handleCreate() {
    if (!brideName.trim() || !groomName.trim()) {
      Alert.alert('Champs manquants', 'Merci de saisir les deux prénoms.');
      return;
    }
    if (!user?.accessToken) {
      Alert.alert('Erreur', 'Vous devez être connecté.');
      return;
    }
    setCreating(true);
    const baseSlug = makeSlug(brideName.trim(), groomName.trim());
    const coupleName = `${brideName.trim()} & ${groomName.trim()}`;

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      try {
        const res = await fetch(API_ENDPOINTS.weddingSites, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({
            slug,
            coupleName,
            brideName: brideName.trim(),
            groomName: groomName.trim(),
            date: '',
            time: '',
            city: '',
            venue: '',
            welcomeText: '',
            mainText: '',
            language: 'fr',
            theme: {},
            sections: {},
            content: {},
            rsvpForm: null,
            inviteLinks: [],
          }),
        });
        const json = await res.json() as { success: boolean; data?: MySite; message?: string };
        if (json.success && json.data) {
          setMySite(json.data);
          setCreating(false);
          return;
        }
        // 403 = already has a site (not a slug conflict)
        if (res.status === 403) {
          // Le compte a déjà un site : on l'affiche au lieu d'un message d'erreur
          setCreating(false);
          setReloadKey((k) => k + 1);
          return;
        }
        if (res.status !== 409) {
          Alert.alert('Erreur', json.message ?? 'Impossible de créer le site.');
          setCreating(false);
          return;
        }
        // 409 slug conflict → retry with suffix
      } catch {
        Alert.alert('Erreur', 'Vérifiez votre connexion internet.');
        setCreating(false);
        return;
      }
    }
    Alert.alert('Erreur', 'Ce lien est déjà pris. Essayez avec des prénoms légèrement différents.');
    setCreating(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={C.saugeDark} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Site Mariage</ThemedText>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={C.sauge} />
            </View>

          ) : loadFailed && !mySite ? (
            <View style={styles.createCard}>
              <View style={styles.createHero}>
                <View style={styles.iconCircle}>
                  <Ionicons name="cloud-offline-outline" size={28} color={C.sauge} />
                </View>
                <ThemedText style={styles.createTitle}>Impossible de charger votre site</ThemedText>
                <ThemedText style={styles.createSub}>
                  Vérifiez votre connexion puis réessayez. Votre site et votre lien ne sont pas perdus.
                </ThemedText>
              </View>
              <Pressable style={styles.createBtn} onPress={() => setReloadKey((k) => k + 1)}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <ThemedText style={styles.createBtnTxt}>Réessayer</ThemedText>
              </Pressable>
            </View>

          ) : mySite ? (
            /* ── Site créé : afficher uniquement le lien ── */
            <View style={styles.linkCard}>
              <View style={styles.badgeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <ThemedText style={styles.badgeTxt}>Site créé</ThemedText>
              </View>

              <ThemedText style={styles.coupleTitle}>
                {mySite.coupleName || `${mySite.brideName} & ${mySite.groomName}`}
              </ThemedText>

              {/* Le lien /build contient un jeton de connexion : on ne l'affiche
                  plus et on ne le copie plus (il ne doit jamais être partagé). */}
              <View style={styles.actions}>
                {publicUrl && (
                  <Pressable style={styles.btnOutline} onPress={() => Linking.openURL(publicUrl)}>
                    <Ionicons name="eye-outline" size={16} color={C.sauge} />
                    <ThemedText style={styles.btnOutlineTxt}>Voir le site</ThemedText>
                  </Pressable>
                )}

                <Pressable
                  style={styles.btnFill}
                  onPress={() => builderUrl && Linking.openURL(builderUrl)}
                >
                  <Ionicons name="color-palette-outline" size={16} color="#fff" />
                  <ThemedText style={styles.btnFillTxt}>Personnaliser</ThemedText>
                </Pressable>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={15} color={C.sauge} />
                <ThemedText style={styles.infoTxt}>
                  « Personnaliser » ouvre l’éditeur : design, événements, liens d’invitation. Ensuite, envoyez votre carte ci-dessous.
                </ThemedText>
              </View>
            </View>
          ) : (
            /* ── Pas encore de site : formulaire de création ── */
            <View style={styles.createCard}>
              <View style={styles.createHero}>
                <View style={styles.iconCircle}>
                  <Ionicons name="link" size={28} color={C.sauge} />
                </View>
                <ThemedText style={styles.createTitle}>Créez votre lien unique</ThemedText>
                <ThemedText style={styles.createSub}>
                  Entrez les prénoms des mariés pour générer votre lien personnalisé.
                </ThemedText>
              </View>

              <View style={styles.form}>
                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.fieldLabel}>Prénom de la mariée</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex. Sarah"
                    placeholderTextColor={C.textLight}
                    value={brideName}
                    onChangeText={setBrideName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.fieldLabel}>Prénom du marié</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex. David"
                    placeholderTextColor={C.textLight}
                    value={groomName}
                    onChangeText={setGroomName}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                  />
                </View>

                {brideName.trim() && groomName.trim() && (
                  <View style={styles.slugPreview}>
                    <Ionicons name="link-outline" size={13} color={C.sauge} />
                    <ThemedText style={styles.slugPreviewTxt} numberOfLines={1}>
                      oheve.pages.dev/wedding/{makeSlug(brideName.trim(), groomName.trim())}/build
                    </ThemedText>
                  </View>
                )}

                <Pressable
                  style={[styles.createBtn, (!brideName.trim() || !groomName.trim() || creating) && styles.createBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!brideName.trim() || !groomName.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#fff" />
                      <ThemedText style={styles.createBtnTxt}>Créer mon lien unique</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {!loading && mySite && (
            <InvitationSender
              slug={mySite.slug}
              accessKey={mySite.accessKey}
              coupleName={mySite.coupleName || [mySite.brideName, mySite.groomName].filter(Boolean).join(' & ')}
            />
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.saugePale,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  scroll: { padding: 20, paddingBottom: 60 },
  center: { alignItems: 'center', paddingVertical: 60 },

  // ── Link card (site existant) ──────────────────────────────────────
  linkCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: C.sauge + '33',
    padding: 22,
    gap: 14,
  },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  coupleTitle: { fontSize: 24, fontWeight: '800', color: C.textDark },
  actions: { flexDirection: 'row', gap: 10 },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.sauge, borderRadius: RADIUS.sm, paddingVertical: 11,
  },
  btnOutlineTxt: { fontSize: 14, fontWeight: '600', color: C.sauge },
  btnFill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.sauge, borderRadius: RADIUS.sm, paddingVertical: 11,
  },
  btnFillTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: C.saugePale, borderRadius: RADIUS.sm, padding: 12,
  },
  infoTxt: { flex: 1, fontSize: 12, color: C.textMid, lineHeight: 18 },

  // ── Create card (pas encore de site) ──────────────────────────────
  createCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.saugePale,
    padding: 24,
    gap: 24,
  },
  createHero: { alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.saugePale,
    alignItems: 'center', justifyContent: 'center',
  },
  createTitle: { fontSize: 22, fontWeight: '800', color: C.textDark, textAlign: 'center' },
  createSub: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 21 },
  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.textDark },
  input: {
    borderWidth: 1.5, borderColor: C.saugePale, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: C.textDark, backgroundColor: '#fafafa',
  },
  slugPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.saugePale, borderRadius: RADIUS.sm, padding: 10,
  },
  slugPreviewTxt: { flex: 1, fontSize: 11, color: C.saugeDark, fontWeight: '600' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.sauge, borderRadius: RADIUS.md, paddingVertical: 15, marginTop: 4,
  },
  createBtnDisabled: { opacity: 0.45 },
  createBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
