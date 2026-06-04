/**
 * Stockage en mémoire des prestataires ajoutés par l’utilisateur (hors mocks).
 * Permet d’afficher la fiche détail avec les champs saisis.
 */
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
};

const store = new Map<string, ProviderContact>();
const myProvidersStore = new Map<string, ProviderContact>();

export function saveProviderContact(p: ProviderContact): void {
  store.set(p.id, p);
}

export function getProviderContact(id: string): ProviderContact | undefined {
  return store.get(id);
}

export function addProviderToHome(provider: ProviderContact): void {
  myProvidersStore.set(provider.id, provider);
}

export function getHomeProviders(): ProviderContact[] {
  return Array.from(myProvidersStore.values());
}

export function isProviderInHome(id: string): boolean {
  return myProvidersStore.has(id);
}

export function removeProviderFromHome(id: string): void {
  myProvidersStore.delete(id);
}
