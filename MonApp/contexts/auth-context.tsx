import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { API_ENDPOINTS } from '@/constants/config';

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
}

const STORAGE_KEY = '@wedding_auth_v2';

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
  onboardingComplete: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);

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

        const res = await fetch(API_ENDPOINTS.refresh, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: stored.refreshToken }),
        });

        if (res.status === 400 || res.status === 401) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setUser(null);
          return;
        }

        const json = await res.json();
        if (json.success) {
          const refreshed = { ...stored, accessToken: json.data.accessToken, refreshToken: json.data.refreshToken };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
          setUser(refreshed);
          // Rafraîchit le premium depuis le serveur (qui se répare depuis Stripe
          // si le webhook a été manqué) → un client qui a payé mais dont le site
          // restait bloqué « activer Premium » se débloque à l'ouverture.
          syncPremiumFromServer(refreshed);
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
    if (refreshingRef.current || !user?.refreshToken) return null;
    refreshingRef.current = true;
    try {
      const res = await fetch(API_ENDPOINTS.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: user.refreshToken }),
      });
      // Ne déconnecte que si le token est définitivement rejeté (pas sur 5xx/réseau).
      if (res.status === 400 || res.status === 401) { await signOut(); return null; }
      const json = await res.json();
      if (!json.success) return null;
      const updated = { ...user, accessToken: json.data.accessToken, refreshToken: json.data.refreshToken };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setUser(updated);
      return json.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [user, signOut]);

  const updateUser = useCallback(async (updates: Partial<AuthUser>) => {
    if (!user) return;
    const updated = normalizeUser({ ...user, ...updates });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const onboardingComplete = Boolean(
    user?.wedding_location_type && user?.date_mariage && user?.budget_total != null
  );

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser, refreshAccessToken, onboardingComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
