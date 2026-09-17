/**
 * Synchronisation serveur des données de planification (`/api/planning`).
 *
 * Pourquoi : la to-do, le budget et les prestataires épinglés ne vivaient que
 * dans l'AsyncStorage du téléphone. Deux appareils connectés au même compte
 * affichaient donc des chiffres différents (« 6 % du mariage est prêt » d'un
 * côté, « 1 % » de l'autre), et réinstaller l'app perdait tout.
 *
 * Modèle, volontairement identique à celui des invités :
 *  - AsyncStorage = cache hors-ligne, clé par compte (jamais de fuite entre
 *    utilisateurs sur un même téléphone) ;
 *  - le serveur = source de vérité ;
 *  - premier appareil à se synchroniser → ses données amorcent le compte ;
 *  - écriture conditionnelle par `revision` : si l'autre conjoint a écrit
 *    entre-temps, le serveur répond 409 et on se recale sur sa version.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_ENDPOINTS } from '@/constants/config';

export type PlanningScope = 'todo' | 'budget' | 'providers' | 'seating';

type CacheEntry<T> = { data: T; revision: number };

let _token: string | null = null;
let _userId: number | null = null;

/** Révision serveur connue, par domaine. 0 = jamais synchronisé. */
const _revisions: Record<string, number> = {};
/** Écritures différées, pour ne pas envoyer une requête par frappe. */
const _timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
/** Dernière valeur à pousser, par domaine. */
const _pending: Record<string, unknown> = {};

const PUSH_DELAY_MS = 700;
/** Tentatives max après un conflit, pour ne jamais perdre l'action en cours. */
const MAX_RETRY_CONFLIT = 3;

function cacheKey(scope: PlanningScope): string {
  return _userId != null ? `@oheve:planning:${scope}:${_userId}` : `@oheve:planning:${scope}`;
}

/**
 * Déclare le compte connecté. À appeler avant tout chargement d'écran.
 * Changement d'utilisateur → on oublie les révisions du compte précédent.
 */
export function configurePlanningSync(token: string | null, userId?: number | null): void {
  const uid = userId ?? null;
  if (uid !== _userId) {
    _userId = uid;
    for (const key of Object.keys(_revisions)) delete _revisions[key];
  }
  _token = token;
}

export function isPlanningSyncReady(): boolean {
  return Boolean(_token && _userId != null);
}

async function authFetch(url: string, init: RequestInit): Promise<Response | null> {
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
    return null; // hors-ligne : on garde le cache, on retentera
  }
}

/** Lit le cache local du compte (affichage instantané, mode avion). */
export async function readCache<T>(scope: PlanningScope): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      _revisions[scope] = Number(parsed.revision) || 0;
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache<T>(scope: PlanningScope, data: T): void {
  const entry: CacheEntry<T> = { data, revision: _revisions[scope] ?? 0 };
  AsyncStorage.setItem(cacheKey(scope), JSON.stringify(entry)).catch(() => {});
}

/**
 * Récupère la version serveur d'un domaine.
 * `null` = le compte n'a jamais rien synchronisé pour ce domaine : l'appelant
 * doit alors pousser son état local pour amorcer le compte.
 * `undefined` = serveur injoignable, on garde le local sans rien écraser.
 */
export async function pullScope<T>(scope: PlanningScope): Promise<T | null | undefined> {
  const res = await authFetch(API_ENDPOINTS.planningScope(scope), { method: 'GET' });
  if (!res?.ok) return undefined;
  try {
    const json = await res.json();
    if (!json?.success) return undefined;
    if (!json.data) {
      _revisions[scope] = 0;
      return null;
    }
    _revisions[scope] = Number(json.data.revision) || 0;
    const data = json.data.data as T;
    writeCache(scope, data);
    return data;
  } catch {
    return undefined;
  }
}

/**
 * Envoie l'état d'un domaine au serveur (différé de quelques centaines de ms).
 * En cas de conflit (l'autre appareil a écrit), on relit la version serveur et
 * on prévient via `onServerVersion` pour que le store s'y aligne.
 */
export function pushScope<T>(
  scope: PlanningScope,
  data: T,
  onServerVersion?: (serverData: T) => void,
): void {
  writeCache(scope, data);
  _pending[scope] = data;
  if (!_token || _userId == null) return;

  const timer = _timers[scope];
  if (timer) clearTimeout(timer);
  _timers[scope] = setTimeout(() => {
    _timers[scope] = undefined;
    void flushScope(scope, onServerVersion);
  }, PUSH_DELAY_MS);
}

async function flushScope<T>(
  scope: PlanningScope,
  onServerVersion?: (serverData: T) => void,
  essai = 0,
): Promise<void> {
  const data = _pending[scope] as T;
  if (data === undefined) return;
  const res = await authFetch(API_ENDPOINTS.planningScope(scope), {
    method: 'PUT',
    body: JSON.stringify({ data, revision: _revisions[scope] ?? 0 }),
  });
  if (!res) return; // hors-ligne : la valeur reste en cache, repartira plus tard

  if (res.status === 409) {
    // Notre révision est périmée (l'autre appareil a écrit, ou l'app n'avait pas
    // fini de se synchroniser). On se recale sur la révision du serveur puis on
    // REJOUE notre écriture : sans ça, la case que le couple vient de cocher
    // était abandonnée sans un mot et remplacée par l'ancienne version.
    let serverData: T | undefined;
    try {
      const json = await res.json();
      if (json?.data) {
        _revisions[scope] = Number(json.data.revision) || 0;
        serverData = json.data.data as T;
      }
    } catch {
      // réponse illisible : on repartira du prochain chargement
    }
    if (essai < MAX_RETRY_CONFLIT && _pending[scope] !== undefined) {
      await flushScope(scope, onServerVersion, essai + 1);
      return;
    }
    // Trop de conflits d'affilée : on s'aligne sur le serveur pour rester cohérent.
    if (serverData !== undefined) {
      writeCache(scope, serverData);
      onServerVersion?.(serverData);
    }
    return;
  }

  if (!res.ok) return;
  try {
    const json = await res.json();
    if (json?.success && json.data) {
      _revisions[scope] = Number(json.data.revision) || 0;
      writeCache(scope, _pending[scope] as T);
    }
  } catch {
    // révision inconnue : le prochain PUT repartira sur un pull
  }
}

/**
 * Premier chargement d'un domaine.
 * - serveur renseigné → on adopte sa version ;
 * - serveur vide → on y pousse l'état local (amorçage du compte) ;
 * - serveur injoignable → on garde l'état local tel quel.
 *
 * `merge` ne sert QUE la toute première rencontre entre cet appareil et le
 * compte (aucune révision connue localement). Sans lui, un téléphone encore
 * vierge écraserait les tâches déjà cochées sur l'autre appareil. Une fois
 * l'appareil synchronisé, on ne fusionne plus : décocher une tâche doit
 * pouvoir se propager normalement.
 */
export async function bootstrapScope<T>(
  scope: PlanningScope,
  local: T,
  merge?: (local: T, serveur: T) => T,
): Promise<T> {
  const revisionConnue = _revisions[scope] ?? 0;
  const serveur = await pullScope<T>(scope);
  if (serveur === undefined) return local;
  if (serveur === null) {
    // Aucune donnée côté compte : ce téléphone sème la première version.
    _revisions[scope] = 0;
    pushScope(scope, local);
    return local;
  }
  if (revisionConnue === 0 && merge) {
    const fusion = merge(local, serveur);
    if (JSON.stringify(fusion) !== JSON.stringify(serveur)) {
      pushScope(scope, fusion);
    }
    return fusion;
  }
  return serveur;
}
