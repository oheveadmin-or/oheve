import { Stack } from 'expo-router';

export default function BoutiqueLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="product/new" />
      <Stack.Screen name="reel/new" />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="checkout/[id]" />
      <Stack.Screen name="chat/[id]" />
    </Stack>
  );
}
