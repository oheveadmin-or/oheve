import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="date-mariage" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="location" />
      <Stack.Screen name="confirmation" />
    </Stack>
  );
}
