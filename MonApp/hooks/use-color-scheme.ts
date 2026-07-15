// L'app force le thème clair quel que soit le réglage sombre de l'appareil.
// On ignore volontairement le mode sombre du système.
export function useColorScheme(): 'light' | 'dark' {
  return 'light';
}
