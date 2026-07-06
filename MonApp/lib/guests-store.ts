/**
 * Guests Store — source de vérité de la liste d'invités.
 *
 * Synchronisé avec le serveur (`/api/guests`) : quand les deux conjoints se
 * connectent sur le MÊME compte depuis deux téléphones, ils lisent et écrivent
 * la même liste → vraie synchro entre appareils.
 *
 * AsyncStorage sert de cache hors-ligne : la liste s'affiche instantanément et
 * l'app reste utilisable sans réseau ; les mutations sont optimistes puis
 * poussées au serveur.
 *
 * Consommé par :
 *  - l'écran Invités (saisie manuelle + sync RSVP du site + import Excel),
 *  - le Placement de table (assignation d'un invité à une table).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_ENDPOINTS } from '@/constants/config';

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
  /** Id de la réponse RSVP d'origine — sert au dédoublonnage serveur. */
  rsvpRef?: string;
  events?: Record<string, { attending: boolean; guestCount?: number }>;
  manualEventId?: string;
};

const GUESTS_KEY_BASE = '@oheve:guests_v1';

let _guests: StoredGuest[] = [];
let _loaded = false;
let _token: string | null = null;
let _userId: number | null = null;
let _localSeq = 0;
const _subs = new Set<() => void>();

// Cache clé par compte : évite d'afficher les invités d'un autre compte si on
// change d'utilisateur sur le même téléphone.
function _storageKey(): string {
  return _userId != null ? `${GUESTS_KEY_BASE}:${_userId}` : GUESTS_KEY_BASE;
}

function _notify() {
  _subs.forEach((fn) => fn());
}

function _persist() {
  AsyncStorage.setItem(_storageKey(), JSON.stringify(_guests)).catch(() => {});
}

function _setList(list: StoredGuest[]) {
  _guests = list;
  _persist();
  _notify();
}

/** Un id « local-… » n'a pas encore de correspondance serveur (add optimiste). */
function isServerId(id: string): boolean {
  return /^\d+$/.test(id);
}

async function _authFetch(url: string, init: RequestInit): Promise<Response | null> {
  if (!_token) return null;
  try {
    return await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${_token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return null;
  }
}

/**
 * Configure le compte connecté. À appeler au montage des écrans invités.
 * - Changement d'utilisateur → on vide la liste en mémoire (pas de fuite entre
 *   comptes) et on rechargera le cache/serveur du bon compte.
 * - Simple rafraîchissement du token (même utilisateur) → on garde le cache mais
 *   on force un re-fetch serveur.
 */
export function configureGuestsSync(token: string | null, userId?: number | null): void {
  const uid = userId ?? null;
  if (uid !== _userId) {
    _userId = uid;
    _guests = [];
    _loaded = false;
    _token = token;
    return;
  }
  if (token !== _token) {
    _token = token;
    _loaded = false;
  }
}

export async function loadGuests(): Promise<StoredGuest[]> {
  if (_loaded) return _guests;
  // 1. Cache local du compte d'abord (affichage instantané / hors-ligne).
  try {
    const raw = await AsyncStorage.getItem(_storageKey());
    if (raw) _guests = JSON.parse(raw) as StoredGuest[];
  } catch {
    // cache illisible : on continue
  }
  // 2. Serveur (source de vérité) si connecté.
  const res = await _authFetch(API_ENDPOINTS.guests, { method: 'GET' });
  if (res?.ok) {
    try {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        _guests = json.data as StoredGuest[];
        _persist();
      }
    } catch {
      // réponse invalide : on garde le cache
    }
  }
  _loaded = true;
  _notify();
  return _guests;
}

export function getGuests(): StoredGuest[] {
  return _guests;
}

export function subscribeGuests(fn: () => void): () => void {
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}

/** Remplace toute la liste (usage interne / reset). */
export function setGuests(guests: StoredGuest[]): void {
  _setList(guests);
}

/** Ajoute un invité (saisie manuelle). Optimiste puis POST serveur. */
export function addGuest(guest: StoredGuest): void {
  const tempId = guest.id && !isServerId(guest.id) ? guest.id : `local-${++_localSeq}`;
  const optimistic = { ...guest, id: tempId };
  _setList([..._guests, optimistic]);

  _authFetch(API_ENDPOINTS.guests, {
    method: 'POST',
    body: JSON.stringify(guest),
  }).then(async (res) => {
    if (!res?.ok) return;
    try {
      const json = await res.json();
      if (json?.success && json.data) {
        // Remplace l'entrée optimiste par la version serveur (id réel).
        _setList(_guests.map((g) => (g.id === tempId ? (json.data as StoredGuest) : g)));
      }
    } catch {
      // on garde l'optimiste
    }
  });
}

/**
 * Ajoute plusieurs invités d'un coup (import Excel / sync RSVP).
 * Le serveur dédoublonne (par rsvpRef puis par nom) et renvoie la liste à jour.
 * Renvoie le nombre réellement ajouté. Hors-ligne : dédoublonnage local.
 */
export async function addGuests(guests: StoredGuest[]): Promise<number> {
  const res = await _authFetch(API_ENDPOINTS.guestsBulk, {
    method: 'POST',
    body: JSON.stringify({ guests }),
  });
  if (res?.ok) {
    try {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        const before = _guests.length;
        _setList(json.data as StoredGuest[]);
        return typeof json.added === 'number' ? json.added : Math.max(0, json.data.length - before);
      }
    } catch {
      // bascule sur le fallback local
    }
  }
  // Fallback hors-ligne : dédoublonnage par id/rsvpRef/nom.
  const existingIds = new Set(_guests.map((g) => g.id));
  const existingRefs = new Set(_guests.filter((g) => g.rsvpRef).map((g) => g.rsvpRef));
  const existingNames = new Set(_guests.map((g) => g.name.trim().toLowerCase()));
  const fresh = guests.filter((g) => {
    if (g.id && existingIds.has(g.id)) return false;
    if (g.rsvpRef && existingRefs.has(g.rsvpRef)) return false;
    return !existingNames.has(g.name.trim().toLowerCase());
  }).map((g) => ({ ...g, id: g.id && !isServerId(g.id) ? g.id : `local-${++_localSeq}` }));
  if (fresh.length === 0) return 0;
  _setList([..._guests, ...fresh]);
  return fresh.length;
}

export function updateGuest(id: string, updates: Partial<StoredGuest>): void {
  _setList(_guests.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  if (isServerId(id)) {
    _authFetch(API_ENDPOINTS.guest(id), {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

export function removeGuest(id: string): void {
  _setList(_guests.filter((g) => g.id !== id));
  if (isServerId(id)) {
    _authFetch(API_ENDPOINTS.guest(id), { method: 'DELETE' });
  }
}
