/**
 * Une route par type d'événement :
 *   mariage    → /wedding/<slug>
 *   Bar Mitsva → /bar-mitsva/<slug>
 *   Bat Mitsva → /bat-mitsva/<slug>
 *   Brit Mila  → /brit-mila/<slug>
 * (+ /rsvp, /invite/<token>, /build sous chacune).
 *
 * Les quatre préfixes affichent les mêmes pages ; si un lien arrive avec le
 * mauvais préfixe (anciens liens /wedding/… d'une Bar Mitsva par exemple),
 * la page publique se replace d'elle-même sur le bon (cf. useCanonicalEventPath).
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { normalizeEventType, type SiteEventType } from './eventType';

export const EVENT_PATH_PREFIX: Record<SiteEventType, string> = {
  mariage: 'wedding',
  bar_mitsva: 'bar-mitsva',
  bat_mitsva: 'bat-mitsva',
  brit_mila: 'brit-mila',
};

export const EVENT_PATH_PREFIXES = Object.values(EVENT_PATH_PREFIX);

/** « /bar-mitsva » pour une Bar Mitsva, « /wedding » pour un mariage. */
export function eventBasePath(eventType?: string | null): string {
  return `/${EVENT_PATH_PREFIX[normalizeEventType(eventType)]}`;
}

/** Chemin d'un site : sitePath('bar_mitsva', 'nathan', 'rsvp') → /bar-mitsva/nathan/rsvp */
export function sitePath(eventType: string | null | undefined, slug: string, ...rest: string[]): string {
  return [eventBasePath(eventType), encodeURIComponent(slug), ...rest].join('/');
}

/** Type d'événement d'après le chemin courant (/brit-mila/… → brit_mila), sinon null. */
export function eventTypeFromPath(pathname: string): SiteEventType | null {
  const first = pathname.split('/').filter(Boolean)[0];
  const hit = (Object.entries(EVENT_PATH_PREFIX) as [SiteEventType, string][]).find(([, p]) => p === first);
  return hit ? hit[0] : null;
}

/**
 * Remet l'URL sur le préfixe de l'événement du site (en gardant la suite du
 * chemin, ?k=, ?pour= et #), sans ajouter d'entrée dans l'historique.
 */
export function useCanonicalEventPath(eventType: string | null | undefined, ready: boolean): void {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ready) return;
    const parts = location.pathname.split('/');
    // parts[0] = '' ; parts[1] = préfixe actuel
    if (!EVENT_PATH_PREFIXES.includes(parts[1])) return;
    const wanted = EVENT_PATH_PREFIX[normalizeEventType(eventType)];
    if (parts[1] === wanted) return;
    parts[1] = wanted;
    navigate(`${parts.join('/')}${location.search}${location.hash}`, { replace: true });
  }, [eventType, ready, location.pathname, location.search, location.hash, navigate]);
}
