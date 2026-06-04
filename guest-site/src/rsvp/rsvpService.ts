/**
 * Couche RSVP — réponses persistées localement ; liaison formulaire depuis `WeddingSite.rsvpForm`.
 *
 * SUPABASE :
 * -----------------------------------------------------------------------------
 * Tables : voir `guest-site/sql/rsvp_supabase.sql`.
 *
 * Remplace `submitRSVPAnswer` par `supabase.from('rsvp_answers').insert(...)`.
 * `getRSVPFormByWeddingSlug` peut lire soit `wedding_sites.rsvp_config` soit table `rsvp_forms`.
 */

import type { WeddingSite } from '../wedding-sites/types';

import type { RSVPForm } from './types';
import type { RSVPAnswer } from './types';

import { getWeddingSiteBySlug, updateWeddingSite } from '../wedding-sites/services/weddingSiteService';

const LS_ANSWERS = 'guestsite_rsvp_answers_v1';

type AnswerRow = { id: string; weddingSlug: string; formId: string; submittedAt: string; payload: RSVPAnswer };

function readAnswers(): AnswerRow[] {
  try {
    const raw = localStorage.getItem(LS_ANSWERS);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function writeAnswers(rows: AnswerRow[]) {
  localStorage.setItem(LS_ANSWERS, JSON.stringify(rows));
}

/** Crée un modèle RSVP côté client (UUID) avant liaison au mariage au moment du publish */
export async function createRSVPForm(payload: Omit<RSVPForm, 'id' | 'updatedAt'>): Promise<RSVPForm> {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: crypto.randomUUID(),
    updatedAt: now,
  };
}

export async function updateRSVPForm(site: WeddingSite, form: RSVPForm): Promise<WeddingSite | null> {
  const nextForm: RSVPForm = {
    ...form,
    weddingId: site.id,
    updatedAt: new Date().toISOString(),
  };
  return updateWeddingSite(site.id, { rsvpForm: nextForm });
}

export async function getRSVPFormByWeddingSlug(slug: string): Promise<RSVPForm | null> {
  const site = await getWeddingSiteBySlug(slug);
  return site?.rsvpForm ?? null;
}

export async function persistRSVPFormOnSite(site: WeddingSite, form: RSVPForm): Promise<WeddingSite | null> {
  return updateRSVPForm(site, form);
}

export async function submitRSVPAnswer(
  slug: string,
  formId: string,
  payload: RSVPAnswer,
  inviteToken?: string
): Promise<void> {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

  // Try backend first
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/rsvp/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          inviteToken,
          firstname: payload.firstname,
          lastname: payload.lastname,
          email: payload.email,
          phone: payload.phone,
          dietaryRestrictions: payload.dietaryRestrictions,
          dietarySelections: payload.dietarySelections,
          drinkPreference: payload.drinkPreference,
          events: payload.events,
          message: payload.message,
        }),
      });
      if (res.ok) return;
    } catch {
      // fallback to localStorage
    }
  }

  // Fallback: localStorage
  const row: AnswerRow = {
    id: crypto.randomUUID(),
    weddingSlug: slug.toLowerCase(),
    formId,
    submittedAt: new Date().toISOString(),
    payload: {
      ...payload,
      submittedAt: new Date().toISOString(),
    },
  };
  const all = readAnswers();
  all.push(row);
  writeAnswers(all);
}

export function listAnswersDemo(slug: string): AnswerRow[] {
  return readAnswers().filter((r) => r.weddingSlug === slug.trim().toLowerCase());
}
