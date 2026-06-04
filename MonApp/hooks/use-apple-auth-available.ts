import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Returns true only when Apple Sign In is actually available at runtime.
 * Works in Expo Go (returns false) AND in development builds (returns true on iOS 13+).
 */
export function useAppleAuthAvailable() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  return available;
}
