/**
 * Suggestions de musique de fond — playlist « mariage » (chants de mariage
 * juifs / israéliens : houppa, entrée de la mariée, simha).
 *
 * On stocke l'ID Deezer STABLE (jamais l'URL d'aperçu, qui est signée et
 * expire en ~24 h). Le champ `musicUrl` du site prend la forme `deezer:<id>` ;
 * l'aperçu MP3 30 s est résolu à la volée au moment de la lecture via
 * `resolveDeezerPreview` (JSONP → pas de souci CORS). Le couple peut aussi
 * coller sa propre URL .mp3 directe.
 */

export type MusicSuggestion = {
  /** ID de piste Deezer (stable) */
  id: number;
  title: string;
  artist: string;
};

/** Préfixe de schéma utilisé dans `content.musicUrl` pour une piste Deezer. */
export const DEEZER_SCHEME = 'deezer:';

export const MUSIC_SUGGESTIONS: MusicSuggestion[] = [
  { id: 2299667255, title: 'בסוף אנחנו נתחתן', artist: 'Adir Getz' },
  { id: 2723237792, title: 'בואי בשלום', artist: 'Alliel' },
  { id: 100431306, title: 'Boei Kala', artist: 'Gad Elbaz' },
  { id: 109094410, title: 'Birkat Chupa', artist: 'Ohad Moskowitz' },
  { id: 1892007337, title: 'Mi Adir', artist: 'Daniel Ben Haim' },
  { id: 109898594, title: 'Asher Bara', artist: 'Eli Zion' },
  { id: 118243878, title: 'Yismach Chatani', artist: 'Meir Green' },
  { id: 108563234, title: 'Mimaamakim', artist: 'Itzik Dadya' },
  { id: 620773182, title: 'ניגון ארבע בבות', artist: 'Hilik Frank' },
  { id: 1405775002, title: 'חתונה של השמחות', artist: 'Dudu Aharon' },
  { id: 1390863842, title: 'חתונת השמחות (רמיקס)', artist: 'Regev Hod' },
  { id: 384581701, title: 'חתונת השנה', artist: 'Itay Levy' },
  { id: 886644942, title: 'יש חתונה פה', artist: 'Itzik Eshel' },
  { id: 2670262182, title: 'רק שלך', artist: 'Lior Narkis' },
  { id: 691745952, title: 'תיתן לה פרחים', artist: 'Omer Adam' },
  { id: 737305972, title: 'מזל', artist: 'Eyal Golan' },
  { id: 2008887127, title: 'אהבה כמו שלנו (קיסריה Live)', artist: 'Sarit Hadad' },
  { id: 1086787242, title: 'אישתי', artist: 'Maor Edri' },
  { id: 2420120435, title: 'אהיה שלך לעד', artist: 'Dudi Buzaglo' },
  { id: 90977509, title: 'גיבור של אמא', artist: 'Moshe Peretz' },
];

/** Libellé lisible « Titre — Artiste » pour une valeur `deezer:<id>`. */
export function musicLabelForUrl(url: string | undefined): string | null {
  if (!url) return null;
  const id = deezerTrackId(url);
  if (id == null) return null;
  const s = MUSIC_SUGGESTIONS.find((m) => m.id === id);
  return s ? `${s.title} — ${s.artist}` : `Deezer #${id}`;
}

/** Extrait l'ID Deezer d'une valeur `deezer:<id>` (sinon null). */
export function deezerTrackId(url: string | undefined): number | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith(DEEZER_SCHEME)) return null;
  const n = Number(trimmed.slice(DEEZER_SCHEME.length));
  return Number.isFinite(n) ? n : null;
}

/** Cache d'URL d'aperçu résolues par ID de piste (durée de vie de la page). */
const previewCache = new Map<number, string>();

/** URL du proxy backend (contourne les blocages JSONP : CSP, WebView, réseau). */
function deezerProxyUrl(trackId: number): string | null {
  if (import.meta.env.DEV) return `/api/wedding-sites/deezer-preview/${trackId}`;
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
  return base ? `${base}/api/wedding-sites/deezer-preview/${trackId}` : null;
}

async function resolveViaProxy(trackId: number): Promise<string | null> {
  const url = deezerProxyUrl(trackId);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: { url?: string } };
    const preview = json?.data?.url ?? null;
    if (preview) previewCache.set(trackId, preview);
    return preview;
  } catch {
    return null;
  }
}

/**
 * Résout l'URL d'aperçu MP3 (30 s) d'une piste Deezer.
 * 1. JSONP api.deezer.com (pas de souci CORS) ;
 * 2. secours : proxy backend /api/wedding-sites/deezer-preview/:id.
 * Résout `null` si tout échoue (réseau, piste retirée…). Navigateur uniquement.
 */
export async function resolveDeezerPreview(trackId: number): Promise<string | null> {
  const viaJsonp = await resolveDeezerPreviewJsonp(trackId);
  if (viaJsonp) return viaJsonp;
  return resolveViaProxy(trackId);
}

function resolveDeezerPreviewJsonp(trackId: number): Promise<string | null> {
  const cached = previewCache.get(trackId);
  if (cached) return Promise.resolve(cached);
  if (typeof document === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const cbName = `__deezerCb_${trackId}_${Date.now()}`;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[cbName];
      script.remove();
      window.clearTimeout(timer);
    };
    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(url);
    };

    (window as unknown as Record<string, unknown>)[cbName] = (data: { preview?: string }) => {
      const preview = data && typeof data.preview === 'string' && data.preview ? data.preview : null;
      if (preview) previewCache.set(trackId, preview);
      finish(preview);
    };

    const timer = window.setTimeout(() => finish(null), 8000);
    script.onerror = () => finish(null);
    script.src = `https://api.deezer.com/track/${trackId}?output=jsonp&callback=${cbName}`;
    document.head.appendChild(script);
  });
}
