import { Tabs } from 'expo-router';

import { BottomNav } from '@/components/navigation/BottomNav';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
        }}
      />
      <Tabs.Screen
        name="providers"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="guests"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
