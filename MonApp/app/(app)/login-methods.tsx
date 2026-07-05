import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { useAppleAuthAvailable } from '@/hooks/use-apple-auth-available';
import { linkSocialProvider } from '@/hooks/use-social-auth';
import { authApi } from '@/services/auth/api';

interface AuthMethods {
  has_password: boolean;
  providers: { provider: string; email: string | null }[];
}

function MethodRow({
  icon, iconColor, label, sub, linked, right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  sub?: string;
  linked: boolean;
  right: ReactNode;
}) {
  return (
    <View style={styles.methodRow}>
      <View style={styles.methodIcon}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.methodLabelRow}>
          <ThemedText style={styles.methodLabel}>{label}</ThemedText>
          {linked && (
            <View style={styles.linkedBadge}>
              <Ionicons name="checkmark" size={11} color="#10b981" />
              <ThemedText style={styles.linkedBadgeTxt}>Actif</ThemedText>
            </View>
          )}
        </View>
        {sub ? <ThemedText style={styles.methodSub}>{sub}</ThemedText> : null}
      </View>
      {right}
    </View>
  );
}

export default function LoginMethodsScreen() {
  const { user } = useAuth();
  const appleAvailable = useAppleAuthAvailable();

  const [methods, setMethods] = useState<AuthMethods | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [showPwdForm, setShowPwdForm] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const accessToken = user?.accessToken;
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.getAuthMethods(accessToken);
        if (!cancelled && res.success) setMethods(res.data);
      } catch {
        // silencieux — l'écran affiche un état vide réessayable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken, refreshKey]);

  const isLinked = (provider: string) => methods?.providers.some(p => p.provider === provider) ?? false;
  const linkedEmail = (provider: string) => methods?.providers.find(p => p.provider === provider)?.email;
  const methodCount = (methods ? (methods.has_password ? 1 : 0) + methods.providers.length : 0);

  const handleLink = async (provider: 'google' | 'apple') => {
    if (!user?.accessToken) return;
    setBusy(provider);
    try {
      const updated = await linkSocialProvider(provider, user.accessToken);
      if (updated) {
        setMethods(updated as AuthMethods);
        Alert.alert('Méthode liée', `${provider === 'apple' ? 'Apple' : 'Google'} ouvre désormais ce compte.`);
      }
    } finally {
      setBusy(null);
    }
  };

  const handleUnlink = (provider: 'google' | 'apple') => {
    if (!user?.accessToken) return;
    if (methodCount <= 1) {
      Alert.alert(
        'Dernière méthode',
        'C\'est ta seule façon de te connecter. Ajoute d\'abord un mot de passe avant de la supprimer.',
      );
      return;
    }
    Alert.alert(
      `Délier ${provider === 'apple' ? 'Apple' : 'Google'} ?`,
      'Tu ne pourras plus te connecter avec cette méthode.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Délier', style: 'destructive',
          onPress: async () => {
            setBusy(provider);
            try {
              const res = await authApi.unlinkProvider(user.accessToken, provider);
              if (res.success) setMethods(res.data);
              else Alert.alert('Erreur', res.message ?? 'Suppression impossible');
            } catch {
              Alert.alert('Erreur', 'Impossible de joindre le serveur.');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleAddPassword = async () => {
    if (!user?.accessToken) return;
    if (newPwd.length < 8) {
      Alert.alert('Mot de passe trop court', 'Minimum 8 caractères');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Mots de passe différents', 'Les deux mots de passe ne correspondent pas');
      return;
    }
    setBusy('password');
    try {
      const res = await authApi.setPassword(user.accessToken, newPwd);
      if (!res.success) {
        Alert.alert('Erreur', res.message ?? 'Erreur lors de l\'ajout');
        return;
      }
      setShowPwdForm(false);
      setNewPwd('');
      setConfirmPwd('');
      setMethods(m => (m ? { ...m, has_password: true } : m));
      Alert.alert('Mot de passe ajouté', 'Tu peux maintenant te connecter avec ton email et ce mot de passe.');
    } catch {
      Alert.alert('Erreur', 'Impossible de joindre le serveur.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScreenLayout>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={C.sauge} />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.title}>Méthodes de connexion</ThemedText>
          <ThemedText style={styles.subtitle}>
            Toutes ces méthodes ouvrent le même compte : {user?.email}
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={C.sauge} />
          ) : !methods ? (
            <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); setRefreshKey(k => k + 1); }}>
              <ThemedText style={styles.retryTxt}>Impossible de charger — réessayer</ThemedText>
            </Pressable>
          ) : (
            <View style={styles.card}>
              {/* Email + mot de passe */}
              <MethodRow
                icon="mail-outline"
                iconColor={C.sauge}
                label="Email + mot de passe"
                sub={methods.has_password ? user?.email : 'Aucun mot de passe défini'}
                linked={methods.has_password}
                right={
                  methods.has_password ? (
                    <Pressable onPress={() => router.push('/(app)/security')} hitSlop={8}>
                      <ThemedText style={styles.actionLink}>Modifier</ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setShowPwdForm(v => !v)} hitSlop={8}>
                      <ThemedText style={styles.actionLink}>{showPwdForm ? 'Annuler' : 'Ajouter'}</ThemedText>
                    </Pressable>
                  )
                }
              />

              {showPwdForm && !methods.has_password && (
                <View style={styles.pwdForm}>
                  <View style={styles.pwdRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={newPwd}
                      onChangeText={setNewPwd}
                      placeholder="Nouveau mot de passe (min. 8)"
                      placeholderTextColor={C.textLight}
                      secureTextEntry={!showPwd}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowPwd(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textLight} />
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={confirmPwd}
                    onChangeText={setConfirmPwd}
                    placeholder="Confirmer le mot de passe"
                    placeholderTextColor={C.textLight}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                  />
                  <Pressable
                    style={[styles.btn, busy === 'password' && styles.btnDisabled]}
                    onPress={handleAddPassword}
                    disabled={busy === 'password'}
                  >
                    <ThemedText style={styles.btnTxt}>
                      {busy === 'password' ? 'Ajout…' : 'Ajouter le mot de passe'}
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              <View style={styles.separator} />

              {/* Google */}
              <MethodRow
                icon="logo-google"
                iconColor="#4285F4"
                label="Google"
                sub={isLinked('google') ? (linkedEmail('google') ?? undefined) : 'Non lié'}
                linked={isLinked('google')}
                right={
                  busy === 'google' ? (
                    <ActivityIndicator size="small" color={C.sauge} />
                  ) : isLinked('google') ? (
                    <Pressable onPress={() => handleUnlink('google')} hitSlop={8}>
                      <ThemedText style={styles.actionDanger}>Délier</ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => handleLink('google')} hitSlop={8}>
                      <ThemedText style={styles.actionLink}>Lier</ThemedText>
                    </Pressable>
                  )
                }
              />

              {/* Apple — proposé uniquement sur iOS */}
              {(appleAvailable || isLinked('apple')) && (
                <>
                  <View style={styles.separator} />
                  <MethodRow
                    icon="logo-apple"
                    iconColor="#111"
                    label="Apple"
                    sub={isLinked('apple') ? (linkedEmail('apple') ?? undefined) : 'Non lié'}
                    linked={isLinked('apple')}
                    right={
                      busy === 'apple' ? (
                        <ActivityIndicator size="small" color={C.sauge} />
                      ) : isLinked('apple') ? (
                        <Pressable onPress={() => handleUnlink('apple')} hitSlop={8}>
                          <ThemedText style={styles.actionDanger}>Délier</ThemedText>
                        </Pressable>
                      ) : appleAvailable ? (
                        <Pressable onPress={() => handleLink('apple')} hitSlop={8}>
                          <ThemedText style={styles.actionLink}>Lier</ThemedText>
                        </Pressable>
                      ) : null
                    }
                  />
                </>
              )}
            </View>
          )}

          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={18} color={C.moka} />
            <ThemedText style={styles.hintTxt}>
              Tu dois toujours garder au moins une méthode de connexion active.
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: { marginBottom: 8 },
  content: { paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.textLight, marginBottom: 20 },

  card: {
    borderWidth: 1, borderColor: C.border, borderRadius: 16,
    backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 4,
  },
  separator: { height: 1, backgroundColor: C.border, opacity: 0.6 },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  methodIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.beige, alignItems: 'center', justifyContent: 'center',
  },
  methodLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodLabel: { fontSize: 15, fontWeight: '700', color: C.textDark },
  methodSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
  linkedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99,
  },
  linkedBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  actionLink: { fontSize: 14, fontWeight: '700', color: C.saugeDark },
  actionDanger: { fontSize: 14, fontWeight: '600', color: '#dc2626' },

  pwdForm: { paddingBottom: 14, gap: 10 },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: C.textDark, backgroundColor: C.ivoire,
  },
  btn: { backgroundColor: C.sauge, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: C.textInvert, fontWeight: '700', fontSize: 15 },

  retryBtn: { marginTop: 30, alignItems: 'center', padding: 16 },
  retryTxt: { color: C.moka, fontWeight: '600' },

  hintCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: C.beige,
  },
  hintTxt: { flex: 1, fontSize: 12, color: C.textMid, lineHeight: 17 },
});
