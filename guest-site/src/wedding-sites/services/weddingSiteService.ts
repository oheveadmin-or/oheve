/**
 * Couche persistance — hybride : API backend si VITE_API_BASE_URL est défini, localStorage sinon.
 *
 * En production (Railway + Cloudflare Pages) : toutes les opérations vont au backend.
 * En dev local sans backend : fallback localStorage pour ne pas bloquer le dev.
 */

import type { WeddingSite } from '../types';
import { generateSlugFromDisplayName, ensureUniqueSlug } from '../utils/slug';

// ─── Auth token (optionnel — injecté via ?token= depuis l'app mobile) ─────────

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

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
    const res = await fetch(url);
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
    // Backend requires a slug — auto-generate if not provided
    const baseSlug =
      data.slug?.trim() ||
      generateSlugFromDisplayName(data.coupleName || `${data.brideName}-${data.groomName}`) ||
      'mariage';

    const slug = slugifySafe(baseSlug);
    let lastError = 'Impossible de publier le site sur le serveur.';

    // Try up to 5 times with a numeric suffix if the slug is taken
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
