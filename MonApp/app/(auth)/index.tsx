import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C } from '@/constants/OheveTheme';
import { useAppleAuthAvailable } from '@/hooks/use-apple-auth-available';
import { useSocialAuth } from '@/hooks/use-social-auth';

// Image de fond : écran d'accueil complet (fond crème + ombres botaniques + logo Oheve + tagline).
// resizeMode="cover" s'adapte automatiquement à chaque taille d'écran.
const AUTH_BG = require('@/assets/images/auth-bg.png');

export default function AuthIndexScreen() {
  const insets = useSafeAreaInsets();

  const handleAfterSocialSignIn = (isNew: boolean, role: string) => {
    if (role === 'prestataire' || !isNew) { router.replace('/(app)/(tabs)'); return; }
    router.replace('/(onboarding)/setup');
  };
  const { signInWithGoogle, signInWithApple } = useSocialAuth(handleAfterSocialSignIn);
  const appleAvailable = useAppleAuthAvailable();

  return (
    <ImageBackground source={AUTH_BG} resizeMode="cover" style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
        {/* Le logo + tagline font partie de l'image de fond */}
        <View style={styles.ctaSection}>
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={styles.appleBtn}
              onPress={signInWithApple}
            />
          )}

          <Pressable
            style={({ pressed }) => [styles.btnGoogle, pressed && styles.pressed]}
            onPress={signInWithGoogle}
          >
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <ThemedText style={styles.btnGoogleText}>Continuer avec Google</ThemedText>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerLabel}>ou</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/login')}
          >
            <ThemedText style={styles.btnPrimaryText}>Se connecter</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/register')}
          >
            <ThemedText style={styles.btnSecondaryText}>Créer un compte</ThemedText>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0EA',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
  },

  ctaSection: {
    width: '100%',
    gap: 12,
  },

  appleBtn: { width: '100%', height: 52 },

  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(199,183,165,0.55)',
  },
  btnGoogleText: {
    color: '#3D3530',
    fontSize: 15,
    fontWeight: '600',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(199,183,165,0.5)' },
  dividerLabel: { fontSize: 12, color: '#8A7F73' },

  btnPrimary: {
    backgroundColor: C.sauge,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  btnSecondary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(199,183,165,0.55)',
  },
  btnSecondaryText: {
    color: C.textMid,
    fontSize: 16,
    fontWeight: '600',
  },

  pressed: { opacity: 0.78 },
});
