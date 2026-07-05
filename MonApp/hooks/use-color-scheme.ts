import { useColorScheme as useRNColorScheme } from 'react-native';

// RN peut renvoyer 'unspecified' : on normalise vers 'light' | 'dark'
// pour pouvoir indexer les palettes de couleurs sans erreur de type.
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
