import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C } from '@/constants/OheveTheme';
import { Fonts } from '@/constants/theme';
import { useSocialAuth } from '@/hooks/use-social-auth';

const BG = C.ivoire;
const LOGO_ACCENT = C.sauge;
const LOGO_TEXT = C.textLight;
const TITLE_TEXT = C.moka;
const BORDER = C.border;

export default function AuthIndexScreen() {
  const insets = useSafeAreaInsets();

  const handleAfterSignIn = (isNew: boolean, role: string) => {
    if (role === 'prestataire') { router.replace('/(app)/(tabs)'); return; }
    if (isNew) { router.replace('/(onboarding)/setup'); } else { router.replace('/(app)/(tabs)'); }
  };

  const { signInWithGoogle } = useSocialAuth(handleAfterSignIn);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View pointerEvents="none" style={styles.flowersLayer}>
        <View style={[styles.flower, styles.flowerTopLeft]}>
          <View style={[styles.petal, styles.petalTop]} />
          <View style={[styles.petal, styles.petalRight]} />
          <View style={[styles.petal, styles.petalBottom]} />
          <View style={[styles.petal, styles.petalLeft]} />
          <View style={styles.flowerCore} />
        </View>
        <View style={[styles.flower, styles.flowerTopRight]}>
          <View style={[styles.petal, styles.petalTop]} />
          <View style={[styles.petal, styles.petalRight]} />
          <View style={[styles.petal, styles.petalBottom]} />
          <View style={[styles.petal, styles.petalLeft]} />
          <View style={styles.flowerCore} />
        </View>
      </View>

      <View style={styles.logoSection}>
        <View style={styles.monogramWrap}>
          <ThemedText style={styles.monogramO}>O</ThemedText>
          <ThemedText style={styles.monogramE}>e</ThemedText>
        </View>

        <ThemedText style={styles.brandName}>oheve</ThemedText>
        <ThemedText style={styles.brandAmpersand}>&amp;</ThemedText>
        <ThemedText style={styles.tagline}>L'APPLICATION DE MARIAGE</ThemedText>
      </View>

      <View style={styles.ctaSection}>
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

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <ThemedText style={styles.orText}>ou</ThemedText>
          <View style={styles.orLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
          onPress={signInWithGoogle}
        >
          <Ionicons name="logo-google" size={18} color="#4285F4" />
          <ThemedText style={styles.googleBtnText}>Connexion avec Google</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },

  flowersLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  flower: {
    position: 'absolute',
    width: 190,
    height: 190,
    opacity: 0.22,
  },
  flowerTopLeft: {
    top: -58,
    left: -72,
    transform: [{ rotate: '-14deg' }],
  },
  flowerTopRight: {
    top: 44,
    right: -78,
    transform: [{ rotate: '16deg' }],
  },
  petal: {
    position: 'absolute',
    width: 80,
    height: 50,
    borderRadius: 28,
    backgroundColor: C.sauge,
  },
  petalTop: {
    top: 10,
    left: 55,
    transform: [{ rotate: '-8deg' }],
  },
  petalRight: {
    top: 68,
    right: 8,
    transform: [{ rotate: '82deg' }],
  },
  petalBottom: {
    bottom: 12,
    left: 54,
    transform: [{ rotate: '178deg' }],
  },
  petalLeft: {
    top: 68,
    left: 8,
    transform: [{ rotate: '-82deg' }],
  },
  flowerCore: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.saugePale,
    top: 81,
    left: 81,
  },

  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    zIndex: 1,
  },

  monogramWrap: {
    width: 160,
    height: 138,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  monogramO: {
    fontSize: 130,
    lineHeight: 130,
    fontFamily: Fonts.serif,
    color: LOGO_ACCENT,
    fontWeight: '300',
    letterSpacing: -1.5,
  },
  monogramE: {
    position: 'absolute',
    right: 43,
    bottom: 10,
    fontSize: 62,
    lineHeight: 62,
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    color: LOGO_ACCENT,
    fontWeight: '300',
  },

  brandName: {
    fontSize: 64,
    lineHeight: 62,
    color: LOGO_TEXT,
    fontFamily: Fonts.serif,
    fontWeight: '300',
    marginBottom: -2,
    letterSpacing: 0.2,
  },
  brandAmpersand: {
    fontSize: 23,
    lineHeight: 24,
    color: C.taupe,
    fontFamily: Fonts.serif,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 10,
    lineHeight: 13,
    color: C.textLight,
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    fontWeight: '300',
  },

  ctaSection: {
    width: '100%',
    gap: 12,
    zIndex: 1,
  },

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
    borderColor: BORDER,
  },
  btnSecondaryText: {
    color: C.textMid,
    fontSize: 16,
    fontWeight: '600',
  },

  pressed: { opacity: 0.78 },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  orText: { fontSize: 12, color: C.textLight, fontWeight: '500' },

  googleBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: TITLE_TEXT,
  },
});
