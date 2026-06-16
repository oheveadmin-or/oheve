/**
 * Couche persistance — hybride : API backend si VITE_API_BASE_URL est défini, localStorage sinon.
 *
 * En production (Railway + Cloudflare Pages) : toutes les opérations vont au backend.
 * En dev local sans backend : fallback localStorage pour ne pas bloquer le dev.
 */

import type { WeddingSite } from '../types';
import { generateSlugFromDisplayName, ensureUniqueSlug } from '../utils/slug';

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

// ─── localStorage fallback ────────────────────────────────────────────────────

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
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json() as { success: boolean; data?: WeddingSite };
        if (json.success && json.data) return json.data;
      }
    } catch {
      // fallback
    }
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
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json() as { success: boolean; data?: WeddingSite };
        if (json.success && json.data) return json.data;
      }
    } catch {
      // fallback
    }
  }

  // localStorage fallback
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
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json() as { success: boolean; data?: WeddingSite };
        if (json.success && json.data) return json.data;
      }
    } catch {
      // fallback
    }
  }

  // localStorage fallback
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
