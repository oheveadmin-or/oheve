import type { SiteLanguage } from '../wedding-sites/types';

/** Textes génériques du formulaire public (couple garde ses libellés d’événements dans la config). */
export type RSVPStrings = {
  pageTitle: string;
  subtitle: string;
  fieldFirstname: string;
  fieldLastname: string;
  fieldEmail: string;
  fieldPhone: string;
  fieldMessage: string;
  fieldDietary: string;
  dietaryOtherLabel: string;
  drinkLabel: string;
  attendanceYes: string;
  attendanceNo: string;
  guestCountLabel: string;
  guestCountPlaceholder: string;
  /** {event} sera remplacé par le label stocké dans RSVPEvent */
  attendanceLead: string;
  submitLabel: string;
  submittingLabel: string;
  successTitle: string;
  successBody: string;
  validationRequired: string;
  validationEmail: string;
  validationGuestCount: string;
  validationMaxGuests: string;
  /** Titre bloc événements */
  sectionEvents: string;
};

const DICT: Record<SiteLanguage, RSVPStrings> = {
  fr: {
    pageTitle: 'Réponse RSVP',
    subtitle: 'Merci de nous faire part de vos disponibilités.',
    fieldFirstname: 'Prénom',
    fieldLastname: 'Nom',
    fieldEmail: 'Email',
    fieldPhone: 'Téléphone',
    fieldMessage: 'Un petit mot pour les mariés',
    fieldDietary: 'Restrictions alimentaires',
    dietaryOtherLabel: 'Autre restriction',
    drinkLabel: 'Boisson préférée',
    attendanceYes: 'Oui',
    attendanceNo: 'Non',
    guestCountLabel: 'Nombre de personnes',
    guestCountPlaceholder: 'ex. 2',
    attendanceLead: 'Présence — « {{event}} »',
    submitLabel: 'ENVOYER',
    submittingLabel: 'Envoi…',
    successTitle: 'Merci pour votre réponse 💌',
    successBody: 'Merci ! Votre réponse a bien été enregistrée 🎉',
    validationRequired: 'Ce champ est requis.',
    validationEmail: 'Adresse email invalide.',
    validationGuestCount: 'Indiquez un nombre ≥ 1.',
    validationMaxGuests: 'Le nombre dépasse la limite autorisée pour cet événement.',
    sectionEvents: 'Événements',
  },
  he: {
    pageTitle: 'אישור השתתפות',
    subtitle: 'נשמח לדעת אם תהיו אתנו.',
    fieldFirstname: 'שם פרטי',
    fieldLastname: 'שם משפחה',
    fieldEmail: 'דוא״ל',
    fieldPhone: 'טלפון',
    fieldMessage: 'מילה טובה לחתן והכלה',
    fieldDietary: 'מגבלות תזונה',
    dietaryOtherLabel: 'הגבלה אחרת',
    drinkLabel: 'משקה מועדף',
    attendanceYes: 'כן',
    attendanceNo: 'לא',
    guestCountLabel: 'מספר אורחים',
    guestCountPlaceholder: 'למשל 2',
    attendanceLead: 'האם תהיו נוכחים: {{event}}',
    submitLabel: 'שליחה',
    submittingLabel: 'שולח…',
    successTitle: 'תודה על התשובה 💌',
    successBody: 'תודה! תשובתכם נשמרה בהצלחה 🎉',
    validationRequired: 'שדה חובה.',
    validationEmail: 'כתובת דוא״ל לא תקינה.',
    validationGuestCount: 'ציין מספר ≥ 1.',
    validationMaxGuests: 'המספר חורג מהמגבלה לאירוע זה.',
    sectionEvents: 'אירועים',
  },
  en: {
    pageTitle: 'RSVP',
    subtitle: 'We would love to know if you will join us.',
    fieldFirstname: 'First name',
    fieldLastname: 'Last name',
    fieldEmail: 'Email',
    fieldPhone: 'Phone',
    fieldMessage: 'A note for the couple',
    fieldDietary: 'Dietary restrictions',
    dietaryOtherLabel: 'Other restriction',
    drinkLabel: 'Preferred drink',
    attendanceYes: 'Yes',
    attendanceNo: 'No',
    guestCountLabel: 'Number of guests',
    guestCountPlaceholder: 'e.g. 2',
    attendanceLead: 'Will you attend: {{event}}',
    submitLabel: 'SEND',
    submittingLabel: 'Sending…',
    successTitle: 'Thank you 💌',
    successBody: 'Thank you! Your RSVP has been recorded 🎉',
    validationRequired: 'This field is required.',
    validationEmail: 'Invalid email address.',
    validationGuestCount: 'Please enter a number ≥ 1.',
    validationMaxGuests: 'Guest count exceeds the maximum allowed for this event.',
    sectionEvents: 'Events',
  },
};

export function rsvpStrings(lang: SiteLanguage): RSVPStrings {
  return DICT[lang] ?? DICT.fr;
}

export function formatAttendanceLead(template: string, eventLabel: string): string {
  return template.replace('{{event}}', eventLabel).replace('{event}', eventLabel);
}
