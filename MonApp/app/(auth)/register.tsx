import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth, UserRole } from '@/contexts/auth-context';
import { API_ENDPOINTS } from '@/constants/config';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { useAppleAuthAvailable } from '@/hooks/use-apple-auth-available';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [role, setRole] = useState<UserRole>('client');

  const handleAfterSocialSignIn = (isNew: boolean, _role: string) => {
    if (isNew) { router.replace('/(onboarding)/date-mariage'); } else { router.replace('/(app)/(tabs)'); }
  };
  const { signInWithGoogle, signInWithApple } = useSocialAuth(handleAfterSocialSignIn);
  const appleAvailable = useAppleAuthAvailable();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nom.trim() || !prenom.trim() || !email.trim() || !password) {
      Alert.alert('Champs manquants', 'Tous les champs sont requis');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Mot de passe', 'Au moins 8 caractères');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.sendOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: 'inscription' }),
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Erreur', json.message ?? "Erreur lors de l'envoi du code");
        return;
      }
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: email.trim().toLowerCase(),
          nom: nom.trim(),
          prenom: prenom.trim(),
          mot_de_passe: password,
          role,
        },
      } as never);
    } catch {
      Alert.alert('Connexion', 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout style={{ backgroundColor: C.ivoire }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.moka} />
          </Pressable>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <ThemedText style={styles.logoText}>Oe</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.title}>Créer mon mariage</ThemedText>
          <ThemedText style={styles.sub}>Commencez votre plus belle histoire</ThemedText>

          {/* Role selector */}
          <ThemedText style={styles.label}>Je suis…</ThemedText>
          <View style={styles.roleGrid}>
            {([
              { key: 'client', label: 'Futur(e) marié(e)', icon: '💍', desc: 'Organise ton mariage' },
              { key: 'prestataire', label: 'Prestataire', icon: '🏢', desc: 'Propose tes services' },
              { key: 'boutique', label: 'Boutique', icon: '🛍️', desc: 'Compte professionnel' },
            ] as { key: UserRole; label: string; icon: string; desc: string }[]).map((r) => (
              <Pressable
                key={r.key}
                style={[
                  styles.roleCard,
                  role === r.key && styles.roleCardOn,
                  r.key === 'boutique' && styles.roleCardBoutique,
                ]}
                onPress={() => setRole(r.key)}
              >
                <ThemedText style={styles.roleEmoji}>{r.icon}</ThemedText>
                <ThemedText style={[styles.roleLabel, role === r.key && styles.roleLabelOn]}>{r.label}</ThemedText>
                <ThemedText style={styles.roleDesc}>{r.desc}</ThemedText>
                {r.key === 'boutique' && (
                  <View style={styles.boutiqueTag}>
                    <ThemedText style={styles.boutiqueTagTxt}>À partir de 7€/mois</ThemedText>
                  </View>
                )}
                {role === r.key && (
                  <View style={styles.roleCheck}>
                    <Ionicons name="checkmark-circle" size={18} color={C.sauge} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <ThemedText style={styles.label}>Prénom</ThemedText>
          <TextInput
            style={styles.input}
            value={prenom} onChangeText={setPrenom}
            placeholder="Ex : Sophie" placeholderTextColor={C.textLight}
            autoCapitalize="words" returnKeyType="next"
          />

          <ThemedText style={styles.label}>Nom</ThemedText>
          <TextInput
            style={styles.input}
            value={nom} onChangeText={setNom}
            placeholder="Ex : Martin" placeholderTextColor={C.textLight}
            autoCapitalize="words" returnKeyType="next"
          />

          <ThemedText style={styles.label}>Email</ThemedText>
          <TextInput
            style={styles.input}
            value={email} onChangeText={setEmail}
            placeholder="sophie@email.com" placeholderTextColor={C.textLight}
            keyboardType="email-address" autoCapitalize="none" returnKeyType="next"
          />

          <ThemedText style={styles.label}>Mot de passe</ThemedText>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={password} onChangeText={setPassword}
              placeholder="Min. 8 caractères" placeholderTextColor={C.textLight}
              secureTextEntry={!showPwd} returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <Pressable onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textLight} />
            </Pressable>
          </View>

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <ThemedText style={styles.btnTxt}>
              {loading ? 'Envoi du code...' : 'Créer mon compte'}
            </ThemedText>
          </Pressable>

          {/* Social */}
          <View style={styles.socialDivRow}>
            <View style={styles.socialDivLine} />
            <ThemedText style={styles.socialDivLabel}>ou continuer avec</ThemedText>
            <View style={styles.socialDivLine} />
          </View>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={RADIUS.md}
              style={styles.appleBtn}
              onPress={signInWithApple}
            />
          )}

          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]}
            onPress={signInWithGoogle}
          >
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <ThemedText style={styles.googleBtnText}>Continuer avec Google</ThemedText>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/login')}>
            <ThemedText style={styles.switchTxt}>
              Déjà un compte ?{' '}
              <ThemedText style={styles.switchLink}>Se connecter</ThemedText>
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  backBtn: { marginBottom: 16 },

  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logoCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 18, fontWeight: '700', color: C.ivoire, fontStyle: 'italic' },

  title: { fontSize: 26, fontWeight: '800', color: C.textDark, marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 14, color: C.textLight, marginBottom: 24, textAlign: 'center' },

  label: { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: 8, marginTop: 14 },

  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  roleCard: {
    width: '47%', borderWidth: 1.5, borderColor: C.border,
    borderRadius: RADIUS.md, padding: 14, alignItems: 'center',
    gap: 4, position: 'relative', backgroundColor: C.card,
  },
  roleCardOn: { borderColor: C.sauge, backgroundColor: C.saugePale },
  roleCardBoutique: { borderColor: C.moka, backgroundColor: C.beige },
  roleEmoji: { fontSize: 26 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: C.textMid, textAlign: 'center' },
  roleLabelOn: { color: C.saugeDark },
  roleDesc: { fontSize: 11, color: C.textLight, textAlign: 'center' },
  roleCheck: { position: 'absolute', top: 6, right: 6 },
  boutiqueTag: {
    backgroundColor: C.beige, borderRadius: RADIUS.pill,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
    borderWidth: 1, borderColor: C.taupe,
  },
  boutiqueTagTxt: { fontSize: 9, color: C.moka, fontWeight: '700' },

  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    color: C.textDark, backgroundColor: C.card, marginBottom: 0,
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },

  btn: {
    marginTop: 28, backgroundColor: C.sauge,
    borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: C.textInvert, fontWeight: '700', fontSize: 16 },

  switchTxt: { textAlign: 'center', fontSize: 14, color: C.textLight, marginTop: 16 },
  switchLink: { color: C.saugeDark, fontWeight: '700' },

  socialDivRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 16 },
  socialDivLine: { flex: 1, height: 1, backgroundColor: C.border },
  socialDivLabel: { fontSize: 12, color: C.textLight },

  appleBtn: { width: '100%', height: 50, marginBottom: 12 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    paddingVertical: 13, backgroundColor: C.card, marginBottom: 16,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: C.textDark },
});
