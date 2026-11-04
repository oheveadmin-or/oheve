import type { SiteLanguage } from './types';
import { eventLabel, isWeddingEvent } from './utils/eventType';

/**
 * Intitulés des sections. `eventType` (site.eventType) retire les mots propres
 * au mariage pour une Bar/Bat Mitsva ou une Brit Mila.
 */
export function sectionLabels(language: SiteLanguage, eventType?: string | null) {
  const wedding = weddingSectionLabels(language);
  if (isWeddingEvent(eventType)) return wedding;
  // « Avec joie » → « Bar Mitsva » au-dessus du prénom
  const base = { ...wedding, heroKicker: eventLabel(eventType, language) };
  if (language === 'he') return { ...base, jewishSection: 'האירועים', coupleStory: 'הסיפור', giftRegistry: 'מתנות' };
  if (language === 'en') return { ...base, jewishSection: 'Events', coupleStory: 'The story', giftRegistry: 'Gifts' };
  return { ...base, coupleStory: 'Son histoire', giftRegistry: 'Liste de cadeaux' };
}

function weddingSectionLabels(language: SiteLanguage) {
  if (language === 'he') {
    return {
      program: 'תוכנית',
      location: 'מקום',
      accommodations: 'לינה',
      rsvp: 'אשרו הגעה',
      faq: 'שאלות נפוצות',
      gallery: 'גלריה',
      practicalInfo: 'מידע שימושי',
      guestMessage: 'הודעה לאורחים',
      dressCode: 'קוד לבוש',
      heroKicker: 'בשמחה',
      dateVenue: 'תאריך ומיקום',
      coupleStory: 'הסיפור שלנו',
      jewishSection: 'אירועי החתונה',
      giftRegistry: 'רשימת מתנות',
      qrCode: 'QR קוד',
      rsvpCta: 'אשרו הגעה',
      countdownTitle: 'עוד',
      families: 'המשפחות',
    };
  }
  if (language === 'en') {
    return {
      program: 'Schedule',
      location: 'Venue',
      accommodations: 'Stays',
      rsvp: 'RSVP',
      faq: 'FAQ',
      gallery: 'Gallery',
      practicalInfo: 'Practical info',
      guestMessage: 'A note for our guests',
      dressCode: 'Dress code',
      heroKicker: 'With joy',
      dateVenue: 'Save the date',
      coupleStory: 'Our story',
      jewishSection: 'Wedding events',
      giftRegistry: 'Gift registry',
      qrCode: 'QR Code',
      rsvpCta: 'RSVP now',
      countdownTitle: 'Countdown',
      families: 'The families',
    };
  }
  return {
    program: 'Programme',
    location: 'Lieux',
    accommodations: 'Hébergements',
    rsvp: 'RSVP',
    faq: 'FAQ',
    gallery: 'Galerie',
    practicalInfo: 'Infos pratiques',
    guestMessage: 'Message aux invités',
    dressCode: 'Dress code',
    heroKicker: 'Avec joie',
    dateVenue: 'Date & lieu',
    coupleStory: 'Notre histoire',
    jewishSection: 'Événements',
    giftRegistry: 'Liste de mariage',
    qrCode: 'QR Code',
    rsvpCta: 'Confirmer ma présence',
    countdownTitle: 'Compte à rebours',
    families: 'Les familles',
  };
}
