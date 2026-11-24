import { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import { eventConfig, isWedding } from '@/lib/event-type';
import { buildSiteStyle, type SiteLike, type SiteStyle } from '@/lib/seating-plan/site-style';

export type SiteStyleState =
  | { status: 'loading'; style: null }
  | { status: 'none'; style: null }     // pas encore de site / invitation
  | { status: 'error'; style: null }
  | { status: 'ready'; style: SiteStyle };

// Les visuels sont convertis en data URI : l'impression (expo-print) n'attend
// pas toujours les images distantes, un data URI est garanti dans le PDF.
const dataUriCache = new Map<string, Promise<string>>();

function toDataUri(url: string): Promise<string> {
  let p = dataUriCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then((blob) => new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      }));
    p.catch(() => dataUriCache.delete(url));
    dataUriCache.set(url, p);
  }
  return p;
}

/** Style d'impression tiré du site invités du compte connecté. */
export function useSiteStyle(enabled: boolean): SiteStyleState {
  const { user } = useAuth();
  const [state, setState] = useState<SiteStyleState>({ status: 'loading', style: null });

  useEffect(() => {
    if (!enabled) return;
    if (!user?.accessToken) { setState({ status: 'none', style: null }); return; }
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API_ENDPOINTS.mySites, { headers: { Authorization: `Bearer ${user.accessToken}` } });
        const json = (await r.json().catch(() => null)) as { success?: boolean; data?: SiteLike[] } | null;
        if (!r.ok || !json?.success) throw new Error('sites');
        const site = json.data?.[0];
        if (!site) { if (alive) setState({ status: 'none', style: null }); return; }
        const label = isWedding(user.event_type) ? null : eventConfig(user.event_type).label;
        const style = buildSiteStyle(site, label);
        // Images du décor → data URI (si une image échoue, on garde l'URL distante).
        const entries = await Promise.all(Object.entries(style.images).map(async ([k, url]) => {
          try { return [k, await toDataUri(url)] as const; } catch { return [k, url] as const; }
        }));
        style.images = Object.fromEntries(entries);
        if (alive) setState({ status: 'ready', style });
      } catch {
        if (alive) setState({ status: 'error', style: null });
      }
    })();
    return () => { alive = false; };
  }, [enabled, user?.accessToken, user?.event_type]);

  return state;
}
