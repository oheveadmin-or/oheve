import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
  const { user } = useAuth();

  const [mySite, setMySite] = useState<MySite | null>(null);
  const [loading, setLoading] = useState(true);
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.accessToken) { setLoading(false); return; }
    fetch(API_ENDPOINTS.mySites, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: MySite[] }) => {
        if (json.success && json.data && json.data.length > 0) setMySite(json.data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.accessToken]);

  const builderUrl = mySite
    ? `${API_ENDPOINTS.weddingSitePublicBase}/${mySite.slug}/build?token=${user?.accessToken ?? ''}`
    : null;

  const publicUrl = mySite
    ? `${API_ENDPOINTS.weddingSitePublicBase}/${mySite.slug}`
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
          Alert.alert('Site existant', json.message ?? 'Vous avez déjà un site mariage.');
          setCreating(false);
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

  async function handleCopy() {
    if (!builderUrl) return;
    await Clipboard.setStringAsync(builderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

              <ThemedText style={styles.linkLabel}>Votre lien unique</ThemedText>
              <View style={styles.linkBox}>
                <Ionicons name="link" size={14} color={C.sauge} />
                <ThemedText style={styles.linkText} numberOfLines={2} selectable>
                  oheve.pages.dev/wedding/{mySite.slug}/build
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <Pressable style={styles.btnOutline} onPress={handleCopy}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={C.sauge} />
                  <ThemedText style={styles.btnOutlineTxt}>
                    {copied ? 'Copié !' : 'Copier le lien'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={styles.btnFill}
                  onPress={() => builderUrl && Linking.openURL(builderUrl)}
                >
                  <Ionicons name="open-outline" size={16} color="#fff" />
                  <ThemedText style={styles.btnFillTxt}>Personnaliser</ThemedText>
                </Pressable>
              </View>

              {publicUrl && (
                <Pressable style={styles.viewPublicRow} onPress={() => Linking.openURL(publicUrl)}>
                  <Ionicons name="eye-outline" size={14} color={C.textLight} />
                  <ThemedText style={styles.viewPublicTxt}>Voir le site public</ThemedText>
                </Pressable>
              )}

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={15} color={C.sauge} />
                <ThemedText style={styles.infoTxt}>
                  Ouvrez le lien dans votre navigateur pour personnaliser le design, ajouter vos événements et créer des liens d'invitation.
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
  linkLabel: { fontSize: 11, fontWeight: '700', color: C.textLight, textTransform: 'uppercase', letterSpacing: 0.8 },
  linkBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: C.saugePale, borderRadius: RADIUS.sm,
    padding: 12,
  },
  linkText: { flex: 1, fontSize: 13, color: C.saugeDark, fontWeight: '600', lineHeight: 20 },
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
  viewPublicRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', paddingVertical: 4,
  },
  viewPublicTxt: { fontSize: 13, color: C.textLight },
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
