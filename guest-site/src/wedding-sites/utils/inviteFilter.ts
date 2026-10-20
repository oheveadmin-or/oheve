import type { RSVPForm } from '../../rsvp/types';
import type { JewishWeddingEvent, WeddingSite } from '../types';

/** ID stable du RSVPEvent associé à un événement juif (Houppa, Brunch…). */
export function jewishRsvpId(type: JewishWeddingEvent['type']) {
  return `jewish-${type}`;
}

// ─── Lien d'invitation actif (/wedding/:slug/invite/:token) ──────────────────
// Mémorisé par slug en sessionStorage : l'invité arrivé par son lien garde le
// même filtre en naviguant vers le site (← Site du mariage) puis le RSVP.

const INVITE_STORAGE_PREFIX = 'oheve_invite_token:';

export function setActiveInviteToken(slug: string, token: string | null) {
  try {
    if (token) sessionStorage.setItem(INVITE_STORAGE_PREFIX + slug, token);
    else sessionStorage.removeItem(INVITE_STORAGE_PREFIX + slug);
  } catch {
    /* navigation privée — pas de mémorisation */
  }
}

export function getActiveInviteToken(slug: string): string | null {
  try {
    return sessionStorage.getItem(INVITE_STORAGE_PREFIX + slug);
  } catch {
    return null;
  }
}

/** Événements autorisés pour ce token, ou null si aucun filtre (lien inconnu ou « tous »). */
export function inviteEventIds(site: Pick<WeddingSite, 'inviteLinks'>, token: string | null): string[] | null {
  if (!token) return null;
  const link = site.inviteLinks?.find((l) => l.token === token);
  return link && link.eventIds.length > 0 ? link.eventIds : null;
}

/** Désactive dans le formulaire RSVP les événements hors du groupe. */
export function filterRsvpFormEvents(form: RSVPForm, eventIds: string[]): RSVPForm {
  return {
    ...form,
    events: form.events.map((e) => ({ ...e, enabled: eventIds.includes(e.id) ? e.enabled : false })),
  };
}

/**
 * Site vu par un groupe d'invités : programme, cérémonies juives et RSVP ne
 * montrent que les événements cochés pour ce lien (ex. « Mariage seul » ne voit
 * ni le Chabbat Hatan ni le Henné).
 */
export function filterSiteForInvite(site: WeddingSite, token: string | null): WeddingSite {
  const ids = inviteEventIds(site, token);
  if (!ids) return site;
  return {
    ...site,
    rsvpForm: site.rsvpForm ? filterRsvpFormEvents(site.rsvpForm, ids) : site.rsvpForm,
    content: site.content
      ? {
          ...site.content,
          jewishEvents: (site.content.jewishEvents ?? []).map((e) =>
            ids.includes(jewishRsvpId(e.type)) ? e : { ...e, enabled: false },
          ),
        }
      : site.content,
  };
}
