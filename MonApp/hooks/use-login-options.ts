import { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '@/constants/config';

/**
 * Interrupteurs serveur des méthodes de connexion (GET /api/health/app-config).
 * Si une connexion sociale casse en production, on la masque depuis Railway
 * (DISABLE_GOOGLE_LOGIN=true) au lieu de laisser les utilisateurs échouer.
 * En cas d'erreur réseau/serveur, tout reste affiché : un serveur injoignable
 * ne doit jamais faire disparaître les boutons.
 */
export interface LoginOptions {
  google_login: boolean;
  apple_login: boolean;
}

const DEFAULT_OPTIONS: LoginOptions = { google_login: true, apple_login: true };
let cached: LoginOptions | null = null;
let pending: Promise<LoginOptions> | null = null;

function fetchLoginOptions(): Promise<LoginOptions> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(API_ENDPOINTS.appConfig, { signal: controller.signal });
        clearTimeout(timer);
        const json = await res.json();
        if (json?.success && json.data) {
          cached = {
            google_login: json.data.google_login !== false,
            apple_login: json.data.apple_login !== false,
          };
          return cached;
        }
      } catch {
        // Serveur injoignable : on garde tout affiché.
      } finally {
        pending = null;
      }
      return DEFAULT_OPTIONS;
    })();
  }
  return pending;
}

export function useLoginOptions(): LoginOptions {
  const [options, setOptions] = useState<LoginOptions>(cached ?? DEFAULT_OPTIONS);
  useEffect(() => {
    let alive = true;
    fetchLoginOptions().then((o) => { if (alive) setOptions(o); });
    return () => { alive = false; };
  }, []);
  return options;
}
