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
}

const STORAGE_KEY = '@wedding_auth_v2';

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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) { setLoading(false); return; }
        const stored: AuthUser = JSON.parse(raw);

        const res = await fetch(API_ENDPOINTS.refresh, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: stored.refreshToken }),
        });
        const json = await res.json();

        if (json.success) {
          const refreshed = { ...stored, accessToken: json.data.accessToken, refreshToken: json.data.refreshToken };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
          setUser(refreshed);
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) setUser(JSON.parse(raw));
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (newUser: AuthUser) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
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
      const json = await res.json();
      if (!json.success) { await signOut(); return null; }
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
    const updated = { ...user, ...updates };
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
