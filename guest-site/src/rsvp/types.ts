/**
 * RSVP dynamique — modèle aligné sur le formulaire public + builder admin.
 */

export type RSVPThemeStyle =
  | 'classic'
  | 'luxury'
  | 'modern'
  | 'romantic'
  | 'minimal'
  | 'floral'
  | 'oriental'
  | 'royal'
  | 'provence'
  | 'sephardic'
  | 'minimal-white'
  | 'english-garden'
  | 'mediterranean';

export type RSVPThemeCardStyle = 'glass' | 'solid' | 'outline' | 'shadow';

export type RSVPField =
  | 'firstname'
  | 'lastname'
  | 'email'
  | 'phone'
  | 'message'
  | 'dietaryRestrictions';

/** Réponses par événement (clé = id événement) */
export type EventAnswer = {
  attending: boolean;
  guestCount?: number;
};

export type RSVPAnswer = {
  guestId?: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
  dietaryRestrictions?: string;
  dietarySelections?: string[];
  dietaryOther?: string;
  drinkPreference?: string;
  /** Clé : RSVPEvent.id */
  events: Record<string, EventAnswer>;
  message?: string;
  submittedAt?: string;
};

export type RSVPEvent = {
  id: string;
  label: string;
  enabled: boolean;
  dayLabel?: string;
  time?: string;
  place?: string;
  shortDescription?: string;
  emojiIcon?: string;
  /** Afficher oui/non présence */
  askAttendance: boolean;
  /** Nombre de convives (visible seulement si attending=true) */
  askGuestCount: boolean;
  maxGuests?: number;
};

export type RSVPAdvancedSettings = {
  showDrinkPreference: boolean;
  drinkOptions: string[];
  showMessage: boolean;
  enableDietaryOptions: boolean;
  dietaryOptions: string[];
  showDietaryOther: boolean;
};

/** Surcharges visuelles optionnelles (fusionnées dans useWeddingTheme avec le mini-site). */
export type RSVPTheme = {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  borderRadius?: number;
  cardStyle?: RSVPThemeCardStyle;
  style?: RSVPThemeStyle;
};

export type RSVPForm = {
  id: string;
  weddingId: string;
  title: string;
  introText?: string;
  thankYouText?: string;
  events: RSVPEvent[];
  /** Champs contacts activés dans le formulaire public */
  activeFields: RSVPField[];
  settings: RSVPAdvancedSettings;
  theme?: RSVPTheme;
  updatedAt: string;
};

export const RSVP_FIELD_META: Record<RSVPField, { adminLabelFr: string }> = {
  firstname: { adminLabelFr: 'Prénom' },
  lastname: { adminLabelFr: 'Nom' },
  email: { adminLabelFr: 'Email' },
  phone: { adminLabelFr: 'Téléphone' },
  message: { adminLabelFr: 'Message aux mariés' },
  dietaryRestrictions: { adminLabelFr: 'Restrictions alimentaires' },
};

export function newEvent(id: string, label: string, partial?: Partial<Omit<RSVPEvent, 'id' | 'label'>>): RSVPEvent {
  return {
    id,
    label,
    enabled: true,
    askAttendance: true,
    askGuestCount: true,
    ...partial,
  };
}

/** Événements d'un mariage juif typique — IDs stables pour cohérence avec l'éditeur */
export function defaultRSVPEvents(): RSVPEvent[] {
  const mk = (id: string, label: string, partial?: Partial<Omit<RSVPEvent, 'id' | 'label'>>) =>
    newEvent(id, label, partial);
  return [
    mk('jewish-henne',         'Henné',              { dayLabel: '', time: '', place: '', shortDescription: '', emojiIcon: '🌸', enabled: false }),
    mk('jewish-mairie',        'Mairie',              { dayLabel: '', time: '', place: '', shortDescription: '', emojiIcon: '🏛️', enabled: true }),
    mk('jewish-houppa',        'Houppa & Cérémonie',  { dayLabel: '', time: '', place: '', shortDescription: '', emojiIcon: '💍', enabled: true }),
    mk('jewish-chabbat-hatan', 'Chabbat Hatan',       { dayLabel: '', time: '', place: '', shortDescription: '', emojiIcon: '🕌', enabled: false }),
  ];
}

export function createDefaultRSVPForm(weddingId: string): RSVPForm {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    weddingId,
    title: '',
    introText: '',
    thankYouText: '',
    events: defaultRSVPEvents(),
    activeFields: ['firstname', 'lastname', 'email'],
    settings: {
      showDrinkPreference: false,
      drinkOptions: [],
      showMessage: true,
      enableDietaryOptions: false,
      dietaryOptions: [],
      showDietaryOther: false,
    },
    theme: {},
    updatedAt: now,
  };
}
