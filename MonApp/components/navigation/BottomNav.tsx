import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { FloatingActionButton } from './FloatingActionButton';
import { QuickActionsSheet } from './QuickActionsSheet';

const CLIENT_LEFT = [
  { key: 'index', label: 'Accueil', icon: 'home-outline', iconActive: 'home' },
  { key: 'explore', label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
] as const;

const CLIENT_RIGHT = [
  { key: 'calendar', label: 'Calendrier', icon: 'calendar-outline', iconActive: 'calendar' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { key: 'profile', label: 'Profil', icon: 'person-outline', iconActive: 'person' },
] as const;

const PRESTATAIRE_TABS = [
  { key: 'index', label: 'Accueil', icon: 'home-outline', iconActive: 'home' },
  { key: 'calendar', label: 'Agenda', icon: 'calendar-outline', iconActive: 'calendar' },
  { key: 'explore', label: 'Publier', icon: 'compass-outline', iconActive: 'compass' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { key: 'profile', label: 'Profil', icon: 'person-outline', iconActive: 'person' },
] as const;

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [actionsOpen, setActionsOpen] = useState(false);

  const activeRouteName = state.routes[state.index]?.name;
  const isPrestataire = user?.role === 'prestataire';

  const onTabPress = (routeName: string) => {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const renderTab = (tab: { key: string; label: string; icon: string; iconActive: string }) => {
    const focused = activeRouteName === tab.key;
    return (
      <Pressable
        key={tab.key}
        style={styles.item}
        onPress={() => onTabPress(tab.key)}
        accessibilityRole="button"
      >
        <Ionicons
          name={(focused ? tab.iconActive : tab.icon) as 'home'}
          size={20}
          color={focused ? C.saugeDark : C.textLight}
        />
        <ThemedText style={[styles.label, focused && styles.labelActive]}>{tab.label}</ThemedText>
      </Pressable>
    );
  };

  if (isPrestataire) {
    return (
      <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.container}>
          {PRESTATAIRE_TABS.map(renderTab)}
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.container}>
          {CLIENT_LEFT.map(renderTab)}
          <FloatingActionButton onPress={() => setActionsOpen(true)} />
          {CLIENT_RIGHT.map(renderTab)}
        </View>
      </View>
      <QuickActionsSheet visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  container: {
    minHeight: 68,
    borderRadius: RADIUS.lg,
    borderWidth: 0,
    borderColor: C.border,
    backgroundColor: C.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  label: { fontSize: 11, color: C.textLight, fontWeight: '500' },
  labelActive: { color: C.saugeDark, fontWeight: '700' },
});
