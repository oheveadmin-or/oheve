import * as Notifications from 'expo-notifications';
import { router, Stack, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { isPrestaSubActive, useAuth } from '@/contexts/auth-context';
import { messagingApi } from '@/services/auth/api';
import { loadPersistedBudget, syncBudgetTotal, BudgetProvider } from '@/lib/budget-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export default function AppLayout() {
  const { user } = useAuth();
  const responseListenerRef = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  const budgetLoadedRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const profileBudget = user.budget_global ?? user.budget_total ?? 0;
    const applyTotal = () => {
      if (profileBudget <= 0) return;
      syncBudgetTotal(profileBudget);
    };
    if (!budgetLoadedRef.current) {
      // 1er passage : on charge le budget persisté puis on synchronise le total
      budgetLoadedRef.current = true;
      loadPersistedBudget().then(applyTotal);
    } else {
      // Le budget a changé dans le profil → resynchronisation immédiate
      applyTotal();
    }
  }, [user?.id, user?.budget_global, user?.budget_total]);

  // ── Barrière abonnement prestataire ─────────────────────────────────────────
  // Un prestataire sans abonnement actif/en essai est renvoyé vers l'écran
  // d'abonnement, quelle que soit la route de l'espace où il tente d'aller.
  const pathname = usePathname();
  useEffect(() => {
    if (user?.role !== 'prestataire') return;
    if (isPrestaSubActive(user.presta_sub_status)) return;
    if (pathname?.includes('/prestataire/subscribe')) return;
    router.replace('/(app)/prestataire/subscribe');
  }, [user?.role, user?.presta_sub_status, pathname]);

  useEffect(() => {
    if (!user?.accessToken) return;

    registerForPushNotifications().then((token) => {
      if (!token) return;
      messagingApi.registerPushToken(user.accessToken, token, Platform.OS).catch(() => {});
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const convId = response.notification.request.content.data?.conversationId;
      if (convId) router.push(`/(app)/messages/${convId}` as never);
    });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, [user?.accessToken]);

  return (
    <BudgetProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="providers" />
      <Stack.Screen name="wedding-card/index" />
      <Stack.Screen name="site-webview" />
      <Stack.Screen name="wedding-card/editor" />
      <Stack.Screen name="wedding-card/templates" />
      <Stack.Screen name="planning-day" />
      <Stack.Screen name="acte-mariage" />
      <Stack.Screen name="public-site/create" />
      <Stack.Screen name="seating-plan" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="prestataire/setup" />
      <Stack.Screen name="prestataire/subscribe" />
      <Stack.Screen name="prestataire/manage-subscription" />
      <Stack.Screen name="prestataire/profile-edit" />
      <Stack.Screen name="rabbins" />
    </Stack>
    </BudgetProvider>
  );
}
