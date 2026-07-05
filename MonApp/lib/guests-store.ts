/**
 * Guests Store — source de vérité de la liste d'invités.
 *
 * Persiste via AsyncStorage (les invités saisis à la main survivent aux
 * rechargements) et sert de référence commune à :
 *  - l'écran Invités (saisie manuelle + sync RSVP du site mariage),
 *  - le Placement de table (assignation d'un invité existant à une table),
 *  - l'import Excel.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GuestStatus = 'confirmed' | 'declined';

export type StoredGuest = {
  id: string;
  name: string;
  guestCount: number;
  status: GuestStatus;
  group: string;
  table?: string;
  email?: string;
  phone?: string;
  fromRSVP?: boolean;
  events?: Record<string, { attending: boolean; guestCount?: number }>;
  manualEventId?: string;
};

const GUESTS_KEY = '@oheve:guests_v1';

let _guests: StoredGuest[] = [];
let _loaded = false;
const _subs = new Set<() => void>();

function _notify() {
  _subs.forEach((fn) => fn());
}

function _persist() {
  AsyncStorage.setItem(GUESTS_KEY, JSON.stringify(_guests)).catch(() => {});
}

export async function loadGuests(): Promise<StoredGuest[]> {
  if (_loaded) return _guests;
  try {
    const raw = await AsyncStorage.getItem(GUESTS_KEY);
    if (raw) _guests = JSON.parse(raw) as StoredGuest[];
  } catch {
    // store vide en cas d'erreur
  }
  _loaded = true;
  return _guests;
}

export function getGuests(): StoredGuest[] {
  return _guests;
}

export function subscribeGuests(fn: () => void): () => void {
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}

export function setGuests(guests: StoredGuest[]): void {
  _guests = guests;
  _persist();
  _notify();
}

export function addGuest(guest: StoredGuest): void {
  if (_guests.some((g) => g.id === guest.id)) return;
  _guests = [..._guests, guest];
  _persist();
  _notify();
}

/** Ajoute plusieurs invités d'un coup (import Excel / sync RSVP) sans doublons (par id puis par nom). */
export function addGuests(guests: StoredGuest[]): number {
  const existingIds = new Set(_guests.map((g) => g.id));
  const existingNames = new Set(_guests.map((g) => g.name.trim().toLowerCase()));
  const fresh = guests.filter(
    (g) => !existingIds.has(g.id) && !existingNames.has(g.name.trim().toLowerCase()),
  );
  if (fresh.length === 0) return 0;
  _guests = [..._guests, ...fresh];
  _persist();
  _notify();
  return fresh.length;
}

export function updateGuest(id: string, updates: Partial<StoredGuest>): void {
  _guests = _guests.map((g) => (g.id === id ? { ...g, ...updates } : g));
  _persist();
  _notify();
}

export function removeGuest(id: string): void {
  _guests = _guests.filter((g) => g.id !== id);
  _persist();
  _notify();
}
