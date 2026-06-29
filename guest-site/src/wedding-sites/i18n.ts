import type { SiteLanguage } from './types';

export function sectionLabels(language: SiteLanguage) {
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
