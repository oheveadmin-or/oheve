import { Stack } from 'expo-router';

/**
 * Stack pour les écrans liés aux prestataires (catégorie, fiche détail)
 */
export default function ProvidersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="categories/[slug]" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
