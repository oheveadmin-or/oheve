import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { API_BASE_URL, API_ENDPOINTS } from '@/constants/config';

export type UserRole = 'client' | 'prestataire' | 'boutique' | 'admin';
export type SubscriptionPlan = 'basic' | 'plus';
export type SubscriptionStatus = 'inactive' | 'active' | 'cancelled' | 'expired';

export interface AuthUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  phone?: string;
  accessToken: string;
  refreshToken: string;
  date_mariage?: string;
  budget_total?: number;
  budget_mode?: string;
  budget_global?: number;
  budget_categories?: object;
  wedding_location_type?: 'city' | 'address' | 'unknown';
  wedding_city?: string;
  wedding_country?: string;
  wedding_address?: string;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  subscription_expires_at?: string;
  bride_name?: string;
  groom_name?: string;
  premium?: boolean;
  premium_purchased_at?: string;
  // Abonnement prestataire (39,99€/mois, 6 mois offerts aux 200 premiers). Statut Stripe :
  // 'incomplete' (CB pas encore validée) | 'trialing' | 'active' | 'past_due' | 'canceled'…
  presta_sub_status?: string;
  presta_trial_end?: string;
  presta_current_period_end?: string;
}

/** Un prestataire a accès à son espace si son abonnement est en essai ou actif. */
export function isPrestaSubActive(status?: string | null): boolean {
  return status === 'trialing' || status === 'active';
}

const STORAGE_KEY = '@wedding_auth_v2';

// L'access token vit 1 h côté serveur. Avant, il n'était rafraîchi qu'au
// lancement de l'app : une app restée ouverte (ou en arrière-plan) plus d'une
// heure envoyait un token expiré → 401 partout (« Session expirée » à la
// création du lien, site de mariage introuvable, photo de profil perdue…).
// On le renouvelle donc de façon proactive avant l'expiration.
const PROACTIVE_REFRESH_MS = 45 * 60 * 1000;

/** Date d'expiration (ms) lue dans la charge utile du JWT, ou null. */
function jwtExpiresAt(token: string | undefined): number | null {
  try {
    const part = token?.split('.')[1];
    if (!part || typeof atob !== 'function') return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Identifiant Apple opaque ("000416.fd0b41…2305") utilisé par erreur comme
// nom sur d'anciens comptes "Masquer mon email" — on ne l'affiche jamais.
const APPLE_OPAQUE_ID = /^\d{6}\.[0-9a-f]{16,64}\.\d{2,6}$/i;

// Le backend renvoie parfois date_mariage en ISO complet ("2026-07-17T00:00:00.000Z").
// On normalise en "YYYY-MM-DD" partout pour éviter les J-NaN et champs cassés.
function normalizeUser<T extends Partial<AuthUser>>(u: T): T {
  const out = { ...u };
  if (out?.date_mariage && out.date_mariage.length > 10) {
    out.date_mariage = out.date_mariage.slice(0, 10);
  }
  if (out?.nom && APPLE_OPAQUE_ID.test(out.nom)) out.nom = '';
  if (out?.prenom && APPLE_OPAQUE_ID.test(out.prenom)) out.prenom = '';
  return out;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (user: AuthUser) => Promise<void>;
  signOut: (allDevices?: boolean) => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  /** Rafraîchit le statut d'abonnement prestataire depuis le serveur. */
  refreshPrestaSub: () => Promise<string | null>;
  onboardingComplete: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Toujours la session la plus récente (lue par l'intercepteur fetch global).
  const userRef = useRef<AuthUser | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);
  // Un seul refresh à la fois : le serveur fait tourner le refresh token, deux
  // appels concurrents avec le même token → le second est rejeté (401) et
  // déconnectait l'utilisateur.
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const lastRefreshRef = useRef(0);

  /** Aligne le flag premium local sur le serveur (qui se répare depuis Stripe).
   *  N'écrase jamais un premium local déjà actif ; ne fait que le débloquer. */
  const syncPremiumFromServer = useCallback(async (current: AuthUser) => {
    if (current.premium === true) return;
    try {
      const res = await fetch(API_ENDPOINTS.premiumStatus, {
        headers: { Authorization: `Bearer ${current.accessToken}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success && json.data?.premium === true) {
        setUser((u) => {
          const base = u ?? current;
          const updated = normalizeUser({ ...base, premium: true, premium_purchased_at: json.data.purchased_at ?? base.premium_purchased_at });
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      }
    } catch {
      /* réseau : sans effet, réessaie à la prochaine ouverture */
    }
  }, []);

  /** Aligne le statut d'abonnement prestataire local sur le serveur (source de
   *  vérité = Stripe). Renvoie le statut à jour, ou null si indisponible. */
  const syncPrestaSubFromServer = useCallback(async (current: AuthUser): Promise<string | null> => {
    if (current.role !== 'prestataire') return null;
    try {
      const res = await fetch(API_ENDPOINTS.prestaSubStatus, {
        headers: { Authorization: `Bearer ${current.accessToken}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json?.success) return null;
      const status: string | null = json.data?.status ?? null;
      setUser((u) => {
        const base = u ?? current;
        const updated = normalizeUser({
          ...base,
          presta_sub_status: status ?? undefined,
          presta_trial_end: json.data?.trial_end ?? base.presta_trial_end,
          presta_current_period_end: json.data?.current_period_end ?? base.presta_current_period_end,
        });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      return status;
    } catch {
      return null;
    }
  }, []);

  /** Échange le refresh token contre une nouvelle paire. Mutualisé : les
   *  appels simultanés partagent la même requête. Ne déconnecte que si le
   *  refresh token est définitivement rejeté (400/401), jamais sur 5xx/réseau. */
  const doRefresh = useCallback((base?: AuthUser | null): Promise<AuthUser | null> => {
    const current = base ?? userRef.current;
    if (!current?.refreshToken) return Promise.resolve(null);
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current.then(() => userRef.current);
    }
    const p = (async (): Promise<string | null> => {
      try {
        const res = await fetch(API_ENDPOINTS.refresh, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });
        if (res.status === 400 || res.status === 401) {
          // Un autre écran a peut-être déjà fait tourner le token entre-temps.
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          const stored: AuthUser | null = raw ? JSON.parse(raw) : null;
          if (stored?.refreshToken && stored.refreshToken !== current.refreshToken) {
            userRef.current = stored;
            setUser(stored);
            return stored.accessToken;
          }
          await AsyncStorage.removeItem(STORAGE_KEY);
          userRef.current = null;
          setUser(null);
          try { router.replace('/(auth)'); } catch { /* navigateur pas encore monté */ }
          return null;
        }
        const json = await res.json();
        if (!json?.success) return null;
        const latest = userRef.current ?? current;
        const updated = normalizeUser({ ...latest, accessToken: json.data.accessToken, refreshToken: json.data.refreshToken });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        userRef.current = updated;
        lastRefreshRef.current = Date.now();
        setUser(updated);
        return updated.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = p;
    return p.then((token) => (token ? userRef.current : null));
  }, []);

  // ── Intercepteur global : tout appel à l'API qui revient en 401 avec un
  // token expiré est rejoué une fois avec un token tout neuf. Couvre tous les
  // écrans (site de mariage, profil, invités…) sans les modifier un par un.
  useEffect(() => {
    const originalFetch = globalThis.fetch;
    const patched: typeof fetch = async (input, init) => {
      const res = await originalFetch(input, init);
      if (res.status !== 401) return res;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      if (!url?.startsWith(API_BASE_URL) || url.startsWith(API_ENDPOINTS.refresh) || url.startsWith(API_ENDPOINTS.logout)) return res;
      const headers = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined));
      const auth = headers.get('Authorization');
      const current = userRef.current;
      if (!auth?.startsWith('Bearer ') || !current) return res;
      // Le token envoyé est peut-être déjà périmé alors qu'un plus récent existe.
      let token: string | null = auth.slice(7) !== current.accessToken ? current.accessToken : null;
      if (!token) token = (await doRefresh())?.accessToken ?? null;
      if (!token) return res;
      headers.set('Authorization', `Bearer ${token}`);
      return originalFetch(input, { ...init, headers });
    };
    globalThis.fetch = patched;
    return () => { globalThis.fetch = originalFetch; };
  }, [doRefresh]);

  // ── Refresh proactif : avant l'expiration, et au retour au premier plan.
  useEffect(() => {
    const maybeRefresh = () => {
      const u = userRef.current;
      if (!u) return;
      const exp = jwtExpiresAt(u.accessToken);
      const due = exp != null
        ? exp - Date.now() < 10 * 60 * 1000
        : Date.now() - lastRefreshRef.current > PROACTIVE_REFRESH_MS;
      if (due) doRefresh();
    };
    const interval = setInterval(maybeRefresh, 60 * 1000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') maybeRefresh(); });
    return () => { clearInterval(interval); sub.remove(); };
  }, [doRefresh]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) { setLoading(false); return; }
        const stored: AuthUser = normalizeUser(JSON.parse(raw));

        // Session restaurée immédiatement : l'utilisateur reste connecté même
        // hors-ligne ou pendant un cold start du serveur. Le refresh se fait
        // en arrière-plan et ne déconnecte que si le token est vraiment rejeté.
        setUser(stored);
        setLoading(false);

        const refreshed = await doRefresh(stored);
        if (refreshed) {
          // Rafraîchit le premium depuis le serveur (qui se répare depuis Stripe
          // si le webhook a été manqué) → un client qui a payé mais dont le site
          // restait bloqué « activer Premium » se débloque à l'ouverture.
          syncPremiumFromServer(refreshed);
          // Idem pour l'abonnement prestataire : le gate de routage se met à jour
          // dès l'ouverture (déblocage si l'essai/l'abonnement est actif).
          syncPrestaSubFromServer(refreshed);
        }
        // 5xx ou réponse invalide : on garde la session stockée.
      } catch {
        // Erreur réseau : on garde la session stockée.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (newUser: AuthUser) => {
    const normalized = normalizeUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setUser(normalized);
  }, []);

  const signOut = useCallback(async (allDevices = false) => {
    if (user) {
      try {
        await fetch(API_ENDPOINTS.logout, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
          body: JSON.stringify({ refreshToken: user.refreshToken, allDevices }),
        });
      } catch {}
    }
    // On ne supprime QUE la session : les tâches, le budget et les prestataires
    // restent en place pour être retrouvés à la reconnexion (demande client).
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    router.replace('/(auth)');
  }, [user]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    return (await doRefresh())?.accessToken ?? null;
  }, [doRefresh]);

  const updateUser = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) return;
    const updated = normalizeUser({ ...user, ...updates });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const refreshPrestaSub = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    return syncPrestaSubFromServer(user);
  }, [user, syncPrestaSubFromServer]);

  const onboardingComplete = Boolean(
    user?.wedding_location_type && user?.date_mariage && user?.budget_total != null
  );

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser, refreshAccessToken, refreshPrestaSub, onboardingComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
