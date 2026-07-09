import { router } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C } from '@/constants/OheveTheme';

// Image de fond : écran d'accueil complet (fond crème + ombres botaniques + logo Oheve + tagline).
// resizeMode="cover" s'adapte automatiquement à chaque taille d'écran.
const AUTH_BG = require('@/assets/images/auth-bg.png');

export default function AuthIndexScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={AUTH_BG} resizeMode="cover" style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
        {/* Le logo + tagline font partie de l'image de fond */}
        <View style={styles.ctaSection}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/login')}
          >
            <ThemedText style={styles.btnPrimaryText}>Connexion</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/register')}
          >
            <ThemedText style={styles.btnSecondaryText}>Inscription</ThemedText>
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
