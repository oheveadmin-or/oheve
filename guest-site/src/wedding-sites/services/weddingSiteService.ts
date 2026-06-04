/**
 * Couche persistance — démo : localStorage.
 *
 * SUPABASE / API : remplace les implémentations ci-dessous par exemple :
 * - supabase.from('wedding_sites').select().eq('slug', slug).single()
 * - POST /api/wedding-sites avec le JSON `WeddingSite` (sans id pour create)
 * Les signatures publiques peuvent rester identiques (async).
 */

import type { WeddingSite } from '../types';
import { generateSlugFromDisplayName, ensureUniqueSlug } from '../utils/slug';

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

export async function getWeddingSiteBySlug(slug: string): Promise<WeddingSite | null> {
  const s = slug.trim().toLowerCase();
  return readAll().find((w) => w.slug.toLowerCase() === s) ?? null;
}

export async function checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const s = slug.trim().toLowerCase();
  return !readAll().some((w) => w.slug.toLowerCase() === s && w.id !== excludeId);
}

export type CreateWeddingSiteInput = Omit<WeddingSite, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & {
  slug?: string;
};

export async function createWeddingSite(data: CreateWeddingSiteInput): Promise<WeddingSite> {
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

function slugifySafe(s: string) {
  const t = generateSlugFromDisplayName(s.replace(/\s+/g, ' '));
  return t || 'mariage';
}

export async function updateWeddingSite(id: string, data: Partial<WeddingSite>): Promise<WeddingSite | null> {
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
