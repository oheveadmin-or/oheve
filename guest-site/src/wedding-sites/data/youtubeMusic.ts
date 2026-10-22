/**
 * Musique de fond via le lecteur YouTube intégré (API IFrame officielle) :
 * contrairement aux extraits Deezer (30 s), la chanson est jouée EN ENTIER.
 *
 * YouTube interdit d'extraire l'audio ou de cacher le lecteur pendant la
 * lecture : le lecteur reste donc visible (mini-carte ≥ 200×200 px, minimum
 * imposé par l'API) tant que la musique joue.
 */

/** Sous-ensemble typé de l'API IFrame YouTube utilisé ici. */
export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: number;
      height: number;
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

/** États du lecteur (YT.PlayerState). */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

/** Taille minimale du lecteur imposée par l'API IFrame YouTube. */
export const YT_PLAYER_SIZE = 200;

let apiPromise: Promise<YTNamespace | null> | null = null;

/** Charge (une seule fois) le script https://www.youtube.com/iframe_api. */
export function loadYouTubeApi(): Promise<YTNamespace | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const w = window as unknown as { YT?: YTNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), 10000);
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      window.clearTimeout(timer);
      resolve(w.YT ?? null);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      apiPromise = null; // nouvel essai possible au prochain chargement
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** Convertit « 80 », « 80s », « 1m20s », « 1:20 » en secondes (sinon null). */
function parseStartSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const v = raw.trim();
  if (/^\d+$/.test(v)) return Number(v);
  const colon = v.match(/^(\d+):(\d{1,2})$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const hms = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return Number(hms[1] ?? 0) * 3600 + Number(hms[2] ?? 0) * 60 + Number(hms[3] ?? 0);
  }
  return null;
}

/**
 * Extrait l'ID vidéo (et le départ `t=`/`start=` éventuel) d'un lien YouTube :
 * youtube.com/watch?v=…, youtu.be/…, music.youtube.com, /shorts/, /embed/, /live/.
 * Retourne null si ce n'est pas un lien YouTube.
 */
export function parseYouTubeUrl(url: string | undefined): { videoId: string; start: number | null } | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = u.pathname.slice(1).split('/')[0] || null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v');
    if (!id) {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = m ? m[1] : null;
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const start = parseStartSeconds(u.searchParams.get('t') ?? u.searchParams.get('start'));
  return { videoId: id, start };
}

/**
 * Point de départ quand le couple n'en a pas fixé : on démarre vers le MILIEU
 * de la chanson (≈ 40 %, là où tombe en général le refrain) pour que les
 * invités entendent tout de suite le passage connu, puis la chanson continue
 * jusqu'au bout et reprend du début (voir le hook lecteur).
 */
export function defaultStartSeconds(duration: number): number {
  if (!Number.isFinite(duration) || duration < 90) return 0;
  return Math.round(Math.min(Math.max(duration * 0.4, 30), duration - 60));
}
