/**
 * Couche persistance — hybride : API backend si VITE_API_BASE_URL est défini, localStorage sinon.
 *
 * En production (Railway + Cloudflare Pages) : toutes les opérations vont au backend.
 * En dev local sans backend : fallback localStorage pour ne pas bloquer le dev.
 */

import type { WeddingSite } from '../types';
import { generateSlugFromDisplayName, ensureUniqueSlug } from '../utils/slug';

// ─── Auth token (optionnel — injecté via ?token= depuis l'app mobile) ─────────

const TOKEN_STORAGE_KEY = 'oheve_builder_token';

/** Le token d'auth arrive via `?token=` depuis l'app mobile. On le persiste en
 *  sessionStorage pour qu'il survive aux rechargements / navigations internes du
 *  builder (sinon un reload de la WebView perdait la session → upload en 401). */
let _authToken: string | null = (() => {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_STORAGE_KEY) : null;
  } catch {
    return null;
  }
})();

export function setAuthToken(token: string | null) {
  _authToken = token;
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* sessionStorage indisponible (navigation privée) — token gardé en mémoire */
  }
}

function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

export function hasAuthToken(): boolean {
  return !!_authToken;
}

/** Message d'auth clair : 401/403 signifient toujours « reconnecte-toi », quelle
 *  que soit la lisibilité du corps de la réponse (le body peut être masqué par
 *  CORS → readApiError retombe alors sur un « Erreur serveur (401) » cryptique). */
const AUTH_REQUIRED_MSG =
  'Session expirée ou non connectée — rouvre le site depuis l\'application Oheve pour envoyer des photos.';

/** Même cause pour tout enregistrement (couleurs, textes, réglages…) : un 401/403
 *  signifie que la session a expiré. Rouvrir le site depuis l'app régénère un
 *  jeton frais (longue durée). Message actionnable plutôt que le « reconnecte-toi »
 *  brut du serveur, inutilisable dans la WebView. */
const SESSION_EXPIRED_SAVE_MSG =
  'Session expirée — rouvre le site de mariage depuis l\'application Oheve pour continuer à enregistrer tes modifications (couleurs, textes, photos).';

// ─── Helpers API ─────────────────────────────────────────────────────────────

function apiBase(): string | null {
  if (import.meta.env.DEV) return ''; // proxy Vite → /api
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
  return base || null;
}

function apiUrl(path: string): string | null {
  const base = apiBase();
  if (base === null) return null;
  return `${base}${path}`;
}

async function readApiError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { message?: string };
    return json.message?.trim() || `Erreur serveur (${res.status})`;
  } catch {
    return `Erreur serveur (${res.status})`;
  }
}

// ─── localStorage fallback (dev sans backend uniquement) ─────────────────────

const LS_KEY = 'guestsite_wedding_sites_v2';

function readAll(): WeddingSite[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sites: WeddingSite[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sites));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getWeddingSiteBySlug(slug: string): Promise<WeddingSite | null> {
  const s = slug.trim().toLowerCase();

  const url = apiUrl(`/api/wedding-sites/${encodeURIComponent(s)}`);
  if (url !== null) {
    // Le token (builder ouvert depuis l'app) permet au propriétaire de charger
    // son site même si l'accès public est bloqué (premium impayé).
    const res = await fetch(url, { headers: authHeaders() });
    if (res.ok) {
      const json = (await res.json()) as { success: boolean; data?: WeddingSite };
      if (json.success && json.data) return json.data;
    }
    if (res.status === 404) return null;
    throw new Error(await readApiError(res));
  }

  return readAll().find((w) => w.slug.toLowerCase() === s) ?? null;
}

export async function checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const s = slug.trim().toLowerCase();

  const url = apiUrl(`/api/wedding-sites/check-slug?slug=${encodeURIComponent(s)}${excludeId ? `&excludeId=${excludeId}` : ''}`);
  if (url !== null) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json() as { available: boolean };
        return json.available;
      }
    } catch {
      // fallback
    }
  }

  return !readAll().some((w) => w.slug.toLowerCase() === s && w.id !== excludeId);
}

export type CreateWeddingSiteInput = Omit<WeddingSite, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & {
  slug?: string;
};

export async function createWeddingSite(data: CreateWeddingSiteInput): Promise<WeddingSite> {
  const url = apiUrl('/api/wedding-sites');
  if (url !== null) {
    // Si l'utilisateur a déjà un site (token valide), mettre à jour ce site plutôt que d'en créer un nouveau
    if (_authToken) {
      try {
        const meRes = await fetch(apiUrl('/api/wedding-sites/me')!, {
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
        });
        if (meRes.ok) {
          const meJson = (await meRes.json()) as { success: boolean; data?: WeddingSite[] };
          if (meJson.success && meJson.data && meJson.data.length > 0) {
            const existing = meJson.data[0];
            const updated = await updateWeddingSite(existing.id, data);
            if (updated) return updated;
          }
        }
      } catch {
        // Silently fall through to create
      }
    }

    const baseSlug =
      data.slug?.trim() ||
      generateSlugFromDisplayName(data.coupleName || `${data.brideName}-${data.groomName}`) ||
      'mariage';

    const slug = slugifySafe(baseSlug);
    let lastError = 'Impossible de publier le site sur le serveur.';

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateSlug = attempt === 0 ? slug : `${slug}-${attempt}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...data, slug: candidateSlug }),
      });
      if (res.ok) {
        const json = (await res.json()) as { success: boolean; data?: WeddingSite };
        if (json.success && json.data) return json.data;
      }
      if (res.status === 401 || res.status === 403) throw new Error(SESSION_EXPIRED_SAVE_MSG);
      lastError = await readApiError(res);
      if (res.status !== 409) break;
    }

    throw new Error(lastError);
  }

  // localStorage fallback (dev sans backend)
  const now = new Date().toISOString();
  const sites = readAll();

  const baseSlug =
    data.slug?.trim() ||
    generateSlugFromDisplayName(data.coupleName || `${data.brideName}-${data.groomName}`);

  const unique = ensureUniqueSlug(slugifySafe(baseSlug), (sl) => sites.some((w) => w.slug.toLowerCase() === sl));

  const { rsvpForm: rsvpIncoming, ...rest } = data;

  const row: WeddingSite = {
    ...rest,
    id: crypto.randomUUID(),
    slug: unique,
    createdAt: now,
    updatedAt: now,
  };

  if (rsvpIncoming) {
    row.rsvpForm = {
      ...rsvpIncoming,
      weddingId: row.id,
      id: rsvpIncoming.id || crypto.randomUUID(),
      updatedAt: now,
    };
  }

  sites.push(row);
  writeAll(sites);
  return row;
}

export async function updateWeddingSite(id: string, data: Partial<WeddingSite>): Promise<WeddingSite | null> {
  const url = apiUrl(`/api/wedding-sites/${encodeURIComponent(id)}`);
  if (url !== null) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = (await res.json()) as { success: boolean; data?: WeddingSite };
      if (json.success && json.data) return json.data;
    }
    if (res.status === 404) return null;
    if (res.status === 401 || res.status === 403) throw new Error(SESSION_EXPIRED_SAVE_MSG);
    throw new Error(await readApiError(res));
  }

  // localStorage fallback (dev sans backend)
  const sites = readAll();
  const i = sites.findIndex((w) => w.id === id);
  if (i < 0) return null;

  const next = {
    ...sites[i],
    ...data,
    id: sites[i].id,
    updatedAt: new Date().toISOString(),
  };

  if (data.slug && data.slug !== sites[i].slug) {
    const available = await checkSlugAvailable(data.slug, id);
    if (!available) throw new Error('Slug déjà utilisé');
    next.slug = data.slug.trim().toLowerCase();
  }

  sites[i] = next;
  writeAll(sites);
  return next;
}

function slugifySafe(s: string) {
  const t = generateSlugFromDisplayName(s.replace(/\s+/g, ' '));
  return t || 'mariage';
}

// ─── Upload de photos (galerie) ───────────────────────────────────────────────

/**
 * Redimensionne une image côté client (max 1600px, JPEG qualité 0.85)
 * pour éviter d'envoyer des photos de 10 Mo depuis un téléphone.
 */
async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<Blob> {
  // Les SVG/GIF ne passent pas par canvas
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload une photo de galerie et retourne son URL publique.
 * Backend indisponible (dev localStorage) → data URL compressée en fallback.
 */
export async function uploadGalleryPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file);

  const url = apiUrl('/api/wedding-sites/upload-photo');
  if (url !== null) {
    // Sans jeton d'auth, l'upload renverra un 401 → autant prévenir clairement
    // et tout de suite (sauf en dev où le fallback data-URL prend le relais).
    if (!import.meta.env.DEV && !_authToken) {
      throw new Error(AUTH_REQUIRED_MSG);
    }
    const form = new FormData();
    const name = file.name.replace(/\.[^.]*$/, '') || 'photo';
    form.append('photo', compressed, compressed.type === 'image/jpeg' ? `${name}.jpg` : file.name);
    const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: form }).catch(() => null);
    if (res?.ok) {
      const json = (await res.json()) as { success: boolean; data?: { url: string } };
      if (json.success && json.data?.url) return json.data.url;
    }
    // En dev le proxy peut être présent sans backend → on tente le fallback local
    if (!import.meta.env.DEV) {
      if (res && (res.status === 401 || res.status === 403)) throw new Error(AUTH_REQUIRED_MSG);
      throw new Error(res ? await readApiError(res) : 'Connexion au serveur impossible');
    }
  }

  // Fallback dev : data URL compressée (aperçu local uniquement)
  return blobToDataUrl(await compressImage(file, 1280, 0.8));
}

export type AdaptPalette = { background?: string; text?: string; accent?: string };

/**
 * Ré-adapte une photo existante à l'ambiance d'un thème via l'IA (Gemini côté
 * serveur). On récupère le blob de la photo (URL /uploads ou data-URL), on
 * l'envoie au backend avec le style + la palette du thème, et on retourne l'URL
 * de la nouvelle photo adaptée. Nécessite une session authentifiée.
 */
export async function adaptPhotoToTheme(
  imageUrl: string,
  style: string,
  palette?: AdaptPalette,
): Promise<string> {
  const url = apiUrl('/api/wedding-sites/adapt-photo');
  if (url === null) {
    throw new Error("Adaptation IA disponible uniquement sur le site publié (pas en dev local).");
  }
  if (!_authToken) throw new Error(AUTH_REQUIRED_MSG);

  // Récupère les octets de la photo (URL hébergée ou data-URL de secours).
  const blob = await fetch(imageUrl).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
  if (!blob) throw new Error("Impossible de charger la photo à adapter.");

  const form = new FormData();
  form.append('photo', blob, 'source.jpg');
  form.append('style', style);
  if (palette) form.append('palette', JSON.stringify(palette));

  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: form }).catch(() => null);
  if (res?.ok) {
    const json = (await res.json()) as { success: boolean; data?: { url: string } };
    if (json.success && json.data?.url) return json.data.url;
  }
  if (res && (res.status === 401 || res.status === 403)) throw new Error(AUTH_REQUIRED_MSG);
  throw new Error(res ? await readApiError(res) : 'Connexion au serveur impossible');
}
