/**
 * Stockage des prestataires ajoutés par l'utilisateur.
 * Persiste via AsyncStorage pour survivre aux rechargements de l'app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProviderContact = {
  id: string;
  nom: string;
  categorie: string;
  ville: string;
  note: number;
  telephone: string;
  email: string;
  adresse: string;
  instagram: string;
  // Photos
  coverUrl?: string;
  avatarUrl?: string;
};

const HOME_PROVIDERS_KEY = '@oheve:home_providers';

const store = new Map<string, ProviderContact>();
const myProvidersStore = new Map<string, ProviderContact>();

let _homeLoaded = false;

export async function loadHomeProviders(): Promise<void> {
  if (_homeLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(HOME_PROVIDERS_KEY);
    if (raw) {
      const providers = JSON.parse(raw) as ProviderContact[];
      myProvidersStore.clear();
      providers.forEach((p) => myProvidersStore.set(p.id, p));
    }
  } catch {
    // Keep empty store on error
  }
  _homeLoaded = true;
}

function _persistHomeProviders(): void {
  const providers = Array.from(myProvidersStore.values());
  AsyncStorage.setItem(HOME_PROVIDERS_KEY, JSON.stringify(providers)).catch(() => {});
}

export function saveProviderContact(p: ProviderContact): void {
  store.set(p.id, p);
}

export function getProviderContact(id: string): ProviderContact | undefined {
  return store.get(id);
}

export function addProviderToHome(provider: ProviderContact): void {
  myProvidersStore.set(provider.id, provider);
  _persistHomeProviders();
}

export function getHomeProviders(): ProviderContact[] {
  return Array.from(myProvidersStore.values());
}

export function isProviderInHome(id: string): boolean {
  return myProvidersStore.has(id);
}

export function removeProviderFromHome(id: string): void {
  myProvidersStore.delete(id);
  _persistHomeProviders();
}
