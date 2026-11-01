/**
 * Sections du site déduites du contenu : le couple remplit son site au fur et
 * à mesure, une section apparaît dès qu'elle a quelque chose à montrer — plus
 * de cases à cocher « Sections affichées » dans le builder. Les anciennes
 * valeurs enregistrées sont ignorées.
 */
import type { WeddingSections, WeddingSite } from '../types';

type SiteLike = Pick<WeddingSite, 'content' | 'rsvpForm' | 'venue' | 'city'>;

export function autoSections(site: SiteLike): WeddingSections {
  const c = site.content ?? {};
  const jewishEvents = (c.jewishEvents ?? []).some((e) => e.enabled);
  const rsvpEvents = (site.rsvpForm?.events ?? []).some((e) => e.enabled);
  const reception = c.separateReception && !!(c.receptionVenue?.name?.trim() || c.receptionVenue?.address?.trim());
  return {
    hero: true,
    coupleStory: (c.coupleStory?.length ?? 0) > 0,
    program: jewishEvents || rsvpEvents,
    // Données des événements (utilisées par le programme) ; la section dédiée
    // n'est plus rendue à côté du programme pour éviter le doublon.
    jewishSection: jewishEvents,
    location: !!(c.venue?.name?.trim() || c.venue?.address?.trim() || site.venue?.trim() || site.city?.trim() || reception),
    accommodations: (c.accommodations ?? []).some((h) => h.name?.trim()),
    rsvp: true,
    faq: (c.faq ?? []).length > 0,
    gallery: (c.galleryPhotos ?? []).some(Boolean),
    giftRegistry: !!c.giftRegistry,
    practicalInfo: true,
    guestMessage: !!c.guestMessageText?.trim(),
    dressCode: !!c.dressCode?.text?.trim(),
    // Inutile pour un invité déjà sur le site
    qrCode: false,
  };
}
