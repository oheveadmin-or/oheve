import '@/lib/global-error-handler';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth-context';
import { BoutiqueProvider } from '@/contexts/boutique-context';
import { MessagesProvider } from '@/contexts/messages-context';
import { ErrorBoundary } from '@/components/error-boundary';

function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(boutique)" />
      <Stack.Screen name="premium-checkout" options={{ animation: 'none' }} />
    </Stack>
  );
}

// Police de titre Oheve. Alias neutre « OheveSerif-* » : pour passer à une autre
// police (ex. The Seasons sous licence), il suffit de changer les fichiers ici.
const OHEVE_FONTS = {
  'OheveSerif-Regular': require('../assets/fonts/Fraunces-Regular.ttf'),
  'OheveSerif-Medium': require('../assets/fonts/Fraunces-Medium.ttf'),
  'OheveSerif-SemiBold': require('../assets/fonts/Fraunces-SemiBold.ttf'),
  // Coupe « texte » (petites tailles), appliquée partout par lib/rn-oheve-font.tsx
  'OheveSerifText-Regular': require('../assets/fonts/FrauncesText-Regular.ttf'),
  'OheveSerifText-Medium': require('../assets/fonts/FrauncesText-Medium.ttf'),
  'OheveSerifText-SemiBold': require('../assets/fonts/FrauncesText-SemiBold.ttf'),
};

export default function RootLayout() {
  // Fichiers locaux : chargement quasi instantané. En cas d'échec on affiche
  // quand même l'app (repli sur la police système), jamais d'écran bloqué.
  const [fontsLoaded, fontError] = useFonts(OHEVE_FONTS);
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <BoutiqueProvider>
              <MessagesProvider>
                <RootNavigator />
              </MessagesProvider>
            </BoutiqueProvider>
          </AuthProvider>
        </ErrorBoundary>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
