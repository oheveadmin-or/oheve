/**
 * L'app force le thème clair sur toutes les plateformes, web compris.
 */
export function useColorScheme(): 'light' | 'dark' {
  // L'app force le thème clair quel que soit le réglage sombre du système.
  return 'light';
}
