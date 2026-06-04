import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { useAppleAuthAvailable } from '@/hooks/use-apple-auth-available';
import { useResponsive } from '@/hooks/use-responsive';
import { authApi } from '@/services/auth/api';

export default function LoginScreen() {
  const { titleSize } = useResponsive();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAfterSocialSignIn = (isNew: boolean, role: string) => {
    if (role === 'prestataire') { router.replace('/(app)/(tabs)'); return; }
    if (isNew) { router.replace('/(onboarding)/date-mariage'); } else { router.replace('/(app)/(tabs)'); }
  };
  const { signInWithGoogle, signInWithApple } = useSocialAuth(handleAfterSocialSignIn);
  const appleAvailable = useAppleAuthAvailable();

  const handleConnexion = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez remplir email et mot de passe');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.connexion({ email: email.trim(), mot_de_passe: password });

      if (!result.success || !result.data) {
        Alert.alert('Erreur', result.message ?? 'Email ou mot de passe incorrect');
        return;
      }

      const data = result.data;
      await signIn({
        id: data.id,
        email: data.email,
        nom: data.nom ?? '',
        prenom: data.prenom ?? '',
        role: data.role,
        is_active: data.is_active ?? true,
        avatar_url: data.avatar_url,
        phone: data.phone,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        date_mariage: data.date_mariage,
        budget_total: data.budget_total,
        budget_mode: data.budget_mode,
        budget_global: data.budget_global,
        budget_categories: data.budget_categories,
        wedding_location_type: data.wedding_location_type,
        wedding_city: data.wedding_city,
        wedding_country: data.wedding_country,
        wedding_address: data.wedding_address,
      });

      if (data.role === 'admin') { router.replace('/(app)/(tabs)'); return; }
      if (data.role === 'prestataire') { router.replace('/(app)/(tabs)'); return; }

      if (data.wedding_location_type && data.date_mariage && data.budget_total != null) {
        router.replace('/(app)/(tabs)');
      } else if (data.date_mariage && data.budget_total != null) {
        router.replace('/(onboarding)/location');
      } else if (data.date_mariage) {
        router.replace('/(onboarding)/budget');
      } else {
        router.replace('/(onboarding)/date-mariage');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout style={{ backgroundColor: C.ivoire }}>
      <Pressable style={styles.backButton} onPress={() => router.replace('/(auth)')}>
        <ThemedText style={styles.backButtonText}>← Retour</ThemedText>
      </Pressable>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* En-tête */}
          <View style={styles.headerWrap}>
            <View style={styles.logoMini}>
              <ThemedText style={styles.logoMiniText}>Oe</ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.title, { fontSize: titleSize }]}>Connexion</ThemedText>
          <ThemedText style={styles.subtitle}>
            Retrouvez votre espace mariage.
          </ThemedText>

          {/* Apple — caché dans Expo Go */}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={RADIUS.md}
              style={styles.appleBtn}
              onPress={signInWithApple}
            />
          )}

          {/* Google */}
          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]}
            onPress={signInWithGoogle}
          >
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <ThemedText style={styles.googleBtnText}>Continuer avec Google</ThemedText>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerLabel}>ou par email</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {/* Mot de passe */}
          <View style={styles.pwWrap}>
            <TextInput
              style={styles.pwInput}
              placeholder="Mot de passe"
              placeholderTextColor={C.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoComplete="password"
            />
            <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={10} style={styles.pwEye}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textLight} />
            </Pressable>
          </View>

          {/* CTA */}
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConnexion}
            disabled={loading}
          >
            <ThemedText style={styles.buttonText}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </ThemedText>
          </Pressable>

          <Pressable style={styles.discreetLink} onPress={() => router.push('/(auth)/forgot-password')}>
            <ThemedText style={styles.discreetLinkText}>Mot de passe oublié ?</ThemedText>
          </Pressable>

          <Pressable style={styles.switchLink} onPress={() => router.push('/(auth)/register')}>
            <ThemedText style={styles.switchText}>
              Pas encore de compte ?{' '}
              <ThemedText style={styles.switchLinkText}>Créer mon mariage</ThemedText>
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  backButton: { paddingVertical: 8, alignSelf: 'flex-start' },
  backButtonText: { fontSize: 15, color: C.moka, fontWeight: '600' },

  headerWrap: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  logoMini: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },
  logoMiniText: { fontSize: 16, fontWeight: '700', color: C.ivoire, fontStyle: 'italic' },

  title: { fontWeight: '800', marginBottom: 6, color: C.textDark, fontSize: 28, marginTop: 4 },
  subtitle: { fontSize: 14, color: C.textLight, marginBottom: 24 },

  appleBtn: { width: '100%', height: 50, marginBottom: 12 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    paddingVertical: 13, marginBottom: 20, backgroundColor: C.card,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: C.textDark },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerLabel: { fontSize: 12, color: C.textLight },

  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    padding: 14, fontSize: 15, marginBottom: 12,
    color: C.textDark, backgroundColor: C.card,
  },
  pwWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, borderRadius: RADIUS.md,
    backgroundColor: C.card, marginBottom: 12,
  },
  pwInput: { flex: 1, padding: 14, fontSize: 15, color: C.textDark },
  pwEye: { paddingRight: 14 },

  button: {
    backgroundColor: C.sauge, padding: 15, borderRadius: RADIUS.md,
    alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: C.textInvert, fontSize: 16, fontWeight: '700' },

  discreetLink: { marginTop: 14, alignSelf: 'center' },
  discreetLinkText: { color: C.moka, fontSize: 14, fontWeight: '600' },

  switchLink: { marginTop: 20, alignItems: 'center', paddingBottom: 24 },
  switchText: { fontSize: 14, color: C.textLight, textAlign: 'center' },
  switchLinkText: { color: C.saugeDark, fontWeight: '700' },
});
