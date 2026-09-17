/**
 * Stockage des prestataires ajoutés par l'utilisateur.
 * Persiste via AsyncStorage pour survivre aux rechargements de l'app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { bootstrapScope, pushScope, readCache } from './planning-sync';

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

/**
 * Première rencontre entre cet appareil et le compte : union par identifiant,
 * pour qu'aucun prestataire épinglé d'un côté ne disparaisse. La fiche la plus
 * complète l'emporte (photo de couverture, téléphone…).
 */
export function mergeProviders(local: ProviderContact[], serveur: ProviderContact[]): ProviderContact[] {
  const parId = new Map<string, ProviderContact>();
  for (const p of serveur) parId.set(p.id, p);
  for (const p of local) {
    const existant = parId.get(p.id);
    parId.set(p.id, existant ? { ...p, ...existant, coverUrl: existant.coverUrl ?? p.coverUrl } : p);
  }
  return Array.from(parId.values());
}

function _applyList(providers: ProviderContact[]): void {
  myProvidersStore.clear();
  providers.forEach((p) => myProvidersStore.set(p.id, p));
}

export async function loadHomeProviders(): Promise<void> {
  if (_homeLoaded) return;
  try {
    // Cache du compte, sinon l'ancien stockage propre au téléphone.
    const cache = await readCache<ProviderContact[]>('providers');
    if (cache && Array.isArray(cache)) {
      _applyList(cache);
    } else {
      const raw = await AsyncStorage.getItem(HOME_PROVIDERS_KEY);
      if (raw) _applyList(JSON.parse(raw) as ProviderContact[]);
    }
  } catch {
    // Keep empty store on error
  }

  // Serveur : les prestataires choisis (dont la salle) suivent le compte.
  try {
    const liste = await bootstrapScope<ProviderContact[]>(
      'providers',
      Array.from(myProvidersStore.values()),
      mergeProviders,
    );
    if (Array.isArray(liste)) _applyList(liste);
  } catch {
    // hors-ligne : on reste sur le cache
  }
  _homeLoaded = true;
}

/** Recharge depuis le serveur au prochain `loadHomeProviders()`. */
export function invalidateHomeProviders(): void {
  _homeLoaded = false;
}

function _persistHomeProviders(): void {
  const providers = Array.from(myProvidersStore.values());
  // Cache hérité gardé : une version antérieure de l'app lit encore cette clé.
  AsyncStorage.setItem(HOME_PROVIDERS_KEY, JSON.stringify(providers)).catch(() => {});
  pushScope<ProviderContact[]>('providers', providers, (serveur) => {
    if (Array.isArray(serveur)) _applyList(serveur);
  });
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
