/**
 * Type d'événement du site : mariage, Bar Mitsva, Bat Mitsva ou Brit Mila.
 *
 * Le type n'est PAS choisi dans le builder : il vient du compte Oheve
 * (users.event_type, choisi à l'inscription dans l'app) et le serveur le
 * renvoie avec le site (`site.eventType`) et avec /api/wedding-sites/me.
 * Absent ou inconnu = mariage (tous les sites d'avant cette option).
 *
 * Convention des noms, identique à l'app (MonApp/lib/event-type.ts) :
 *   mariage  → brideName = prénom de la mariée, groomName = prénom du marié
 *   autres   → brideName = prénom de l'enfant (facultatif pour une Brit Mila),
 *              groomName = nom de famille
 *
 * Ce fichier est la seule source de vérité de ce qui change sur le site selon
 * l'événement : libellés FR/HE/EN, champs du builder, programme par défaut,
 * phrases du faire-part.
 */
import type { JewishWeddingEvent, SiteLanguage, WeddingSite } from '../types';

export type SiteEventType = 'mariage' | 'bar_mitsva' | 'bat_mitsva' | 'brit_mila';

const EVENT_TYPES: SiteEventType[] = ['mariage', 'bar_mitsva', 'bat_mitsva', 'brit_mila'];

export function normalizeEventType(v?: string | null): SiteEventType {
  return (EVENT_TYPES as string[]).includes(String(v)) ? (v as SiteEventType) : 'mariage';
}

export function isWeddingEvent(v?: string | null): boolean {
  return normalizeEventType(v) === 'mariage';
}

type Lang3<T = string> = { fr: T; he: T; en: T };

type ProgramDefault = { type: JewishWeddingEvent['type']; label: string; emoji: string; optional?: boolean };

type EventSiteConfig = {
  /** « Bar Mitsva » / « בר מצווה » : kicker, onglet principal, titre de page */
  label: Lang3;
  /** « de la Bar Mitsva » / « du mariage », pour « Site de la Bar Mitsva » */
  ofThe: string;
  /** Phrase d'accueil de l'Invitation animée (un seul nom affiché) */
  inviteOne: Lang3;
  /** Message WhatsApp : « vous êtes invité(e) à la Bar Mitsva de Nathan » */
  invitedTo: string;
  /** Builder : champs des noms */
  names: {
    step: string;          // onglet du parcours
    title: string;         // titre de l'étape
    sub: string;
    first: string;         // champ brideName
    firstHe: string;
    firstPlaceholder: string;
    second: string;        // champ groomName
    secondHe: string;
    secondPlaceholder: string;
    firstOptional?: boolean;
    /** Le second champ est un nom de famille (pas un prénom) */
    secondIsFamily?: boolean;
  };
  /** Libellé de l'événement principal (type interne `houppa`) */
  mainEvent: Lang3;
  /** Événements proposés dans le programme (ordre d'affichage du builder) */
  program: ProgramDefault[];
  /** Message aux organisateurs dans le RSVP */
  messageTo: Lang3;
  /** Phrases du faire-part préremplies */
  texts: { thanks: Lang3<string>; invitation: Lang3<string>; reception: Lang3<string> };
};

const WEDDING_PROGRAM: ProgramDefault[] = [
  { type: 'henne', label: 'Henné', emoji: '🌸' },
  { type: 'mairie', label: 'Mairie', emoji: '🏛️' },
  { type: 'chabbat-hatan', label: 'Chabbat Hatan', emoji: '🕌' },
  { type: 'houppa', label: 'Houppa & Cérémonie', emoji: '💍' },
  { type: 'brunch', label: 'Brunch', emoji: '☕', optional: true },
  { type: 'sheva-berakhot', label: 'Sheva Berakhot', emoji: '🥂', optional: true },
  { type: 'pool-party', label: 'Pool Party', emoji: '🏊', optional: true },
  { type: 'depart', label: 'Au revoir des invités', emoji: '👋', optional: true },
];

const CONFIG: Record<SiteEventType, EventSiteConfig> = {
  mariage: {
    label: { fr: 'Mariage', he: 'חתונה', en: 'Wedding' },
    ofThe: 'du mariage',
    inviteOne: {
      fr: 'vous invite à célébrer son mariage',
      he: 'מתכבד/ת להזמינכם לחגוג את החתונה',
      en: 'invites you to celebrate the wedding',
    },
    invitedTo: 'au mariage de',
    names: {
      step: 'Mariés', title: 'Les mariés', sub: 'Vos prénoms, en grand sur le site, et votre monogramme.',
      first: 'Prénom mariée', firstHe: 'Prénom de la mariée en hébreu (facultatif)', firstPlaceholder: 'Léa',
      second: 'Prénom marié', secondHe: 'Prénom du marié en hébreu (facultatif)', secondPlaceholder: 'Thomas',
    },
    mainEvent: { fr: 'Houppa & Cérémonie', he: 'חופה', en: 'Ceremony' },
    program: WEDDING_PROGRAM,
    messageTo: { fr: 'Un petit mot pour les mariés', he: 'מילה טובה לחתן והכלה', en: 'A note for the couple' },
    texts: {
      thanks: {
        fr: "Remercient Hachem d'avoir la joie de vous convier au mariage de leurs enfants et petits-enfants",
        he: 'מודים לה׳ על הזכות להזמינכם לחתונת ילדיהם ונכדיהם',
        en: 'Thank Hashem for the joy of inviting you to the wedding of their children and grandchildren',
      },
      invitation: {
        fr: "et vous prient d'assister à la Houppa qui aura lieu le",
        he: 'ומתכבדים להזמינכם לחופה שתתקיים ביום',
        en: 'and request the pleasure of your presence at the Chuppah on',
      },
      reception: {
        fr: "Ainsi qu'à la réception qui suivra.",
        he: 'ולסעודת המצווה שלאחריה',
        en: 'and at the reception that follows.',
      },
    },
  },
  bar_mitsva: {
    label: { fr: 'Bar Mitsva', he: 'בר מצווה', en: 'Bar Mitzvah' },
    ofThe: 'de la Bar Mitsva',
    inviteOne: {
      fr: 'vous invite à célébrer sa Bar Mitsva',
      he: 'מתכבד להזמינכם לחגוג את בר המצווה שלו',
      en: 'invites you to celebrate his Bar Mitzvah',
    },
    invitedTo: 'à la Bar Mitsva de',
    names: {
      step: 'Bar Mitsva', title: 'Le Bar Mitsva', sub: 'Son prénom, en grand sur le site, et le nom de la famille.',
      first: 'Prénom du garçon', firstHe: 'Prénom en hébreu (facultatif)', firstPlaceholder: 'Nathan',
      second: 'Nom de famille', secondHe: 'Nom de famille en hébreu (facultatif)', secondPlaceholder: 'Cohen',
      secondIsFamily: true,
    },
    mainEvent: { fr: 'Soirée de Bar Mitsva', he: 'מסיבת בר המצווה', en: 'Bar Mitzvah party' },
    program: [
      { type: 'montee-torah', label: 'Mise des Téfilines', emoji: '📜' },
      { type: 'chabbat', label: 'Chabbat Bar Mitsva', emoji: '🕯️' },
      { type: 'houppa', label: 'Soirée de Bar Mitsva', emoji: '🎉' },
      { type: 'brunch', label: 'Brunch', emoji: '☕', optional: true },
    ],
    messageTo: { fr: 'Un petit mot pour le Bar Mitsva', he: 'מילה טובה לחתן בר המצווה', en: 'A note for the Bar Mitzvah boy' },
    texts: {
      thanks: {
        fr: "Remercient Hachem d'avoir la joie de vous convier à la Bar Mitsva de leur fils et petit-fils",
        he: 'מודים לה׳ על הזכות להזמינכם לבר המצווה של בנם ונכדם',
        en: 'Thank Hashem for the joy of inviting you to the Bar Mitzvah of their son and grandson',
      },
      invitation: {
        fr: "et vous prient d'assister à la soirée qui aura lieu le",
        he: 'ומתכבדים להזמינכם לשמחת בר המצווה שתתקיים ביום',
        en: 'and request the pleasure of your presence at the celebration on',
      },
      reception: {
        fr: 'Votre présence sera notre plus beau cadeau.',
        he: 'השתתפותכם תהיה לנו המתנה הגדולה ביותר',
        en: 'Your presence will be our greatest gift.',
      },
    },
  },
  bat_mitsva: {
    label: { fr: 'Bat Mitsva', he: 'בת מצווה', en: 'Bat Mitzvah' },
    ofThe: 'de la Bat Mitsva',
    inviteOne: {
      fr: 'vous invite à célébrer sa Bat Mitsva',
      he: 'מתכבדת להזמינכם לחגוג את בת המצווה שלה',
      en: 'invites you to celebrate her Bat Mitzvah',
    },
    invitedTo: 'à la Bat Mitsva de',
    names: {
      step: 'Bat Mitsva', title: 'La Bat Mitsva', sub: 'Son prénom, en grand sur le site, et le nom de la famille.',
      first: 'Prénom de la fille', firstHe: 'Prénom en hébreu (facultatif)', firstPlaceholder: 'Sarah',
      second: 'Nom de famille', secondHe: 'Nom de famille en hébreu (facultatif)', secondPlaceholder: 'Cohen',
      secondIsFamily: true,
    },
    mainEvent: { fr: 'Soirée de Bat Mitsva', he: 'מסיבת בת המצווה', en: 'Bat Mitzvah party' },
    program: [
      { type: 'montee-torah', label: 'Cérémonie de Bat Mitsva', emoji: '📜' },
      { type: 'chabbat', label: 'Chabbat Bat Mitsva', emoji: '🕯️', optional: true },
      { type: 'houppa', label: 'Soirée de Bat Mitsva', emoji: '🎉' },
      { type: 'brunch', label: 'Brunch', emoji: '☕', optional: true },
    ],
    messageTo: { fr: 'Un petit mot pour la Bat Mitsva', he: 'מילה טובה לכלת בת המצווה', en: 'A note for the Bat Mitzvah girl' },
    texts: {
      thanks: {
        fr: "Remercient Hachem d'avoir la joie de vous convier à la Bat Mitsva de leur fille et petite-fille",
        he: 'מודים לה׳ על הזכות להזמינכם לבת המצווה של בתם ונכדתם',
        en: 'Thank Hashem for the joy of inviting you to the Bat Mitzvah of their daughter and granddaughter',
      },
      invitation: {
        fr: "et vous prient d'assister à la soirée qui aura lieu le",
        he: 'ומתכבדים להזמינכם לשמחת בת המצווה שתתקיים ביום',
        en: 'and request the pleasure of your presence at the celebration on',
      },
      reception: {
        fr: 'Votre présence sera notre plus beau cadeau.',
        he: 'השתתפותכם תהיה לנו המתנה הגדולה ביותר',
        en: 'Your presence will be our greatest gift.',
      },
    },
  },
  brit_mila: {
    label: { fr: 'Brit Mila', he: 'ברית מילה', en: 'Brit Milah' },
    ofThe: 'de la Brit Mila',
    inviteOne: {
      fr: 'ont la joie de vous convier à la Brit Mila',
      he: 'שמחים להזמינכם לברית המילה',
      en: 'joyfully invite you to the Brit Milah',
    },
    invitedTo: 'à la Brit Mila de',
    names: {
      step: 'Bébé', title: 'Le bébé', sub: 'Le nom de la famille, et le prénom du bébé s’il est déjà connu.',
      first: 'Prénom du bébé (facultatif)', firstHe: 'Prénom en hébreu (facultatif)', firstPlaceholder: 'Souvent révélé le jour J',
      second: 'Nom de famille', secondHe: 'Nom de famille en hébreu (facultatif)', secondPlaceholder: 'Cohen',
      firstOptional: true,
      secondIsFamily: true,
    },
    mainEvent: { fr: 'Brit Mila & séouda', he: 'ברית מילה וסעודה', en: 'Brit Milah & meal' },
    program: [
      { type: 'veille', label: 'Veille (Brit Itshak)', emoji: '🕯️' },
      { type: 'houppa', label: 'Brit Mila & séouda', emoji: '✡️' },
    ],
    messageTo: { fr: 'Un petit mot pour la famille', he: 'מילה טובה למשפחה', en: 'A note for the family' },
    texts: {
      thanks: {
        fr: "Remercient Hachem pour la naissance de leur fils et petit-fils et ont la joie de vous convier à sa Brit Mila",
        he: 'מודים לה׳ על הולדת בנם ונכדם ושמחים להזמינכם לברית המילה',
        en: 'Thank Hashem for the birth of their son and grandson and are delighted to invite you to his Brit Milah',
      },
      invitation: {
        fr: 'qui aura lieu le',
        he: 'שתתקיים ביום',
        en: 'which will take place on',
      },
      reception: {
        fr: 'Elle sera suivie de la séouda.',
        he: 'ולסעודת המצווה שלאחריה',
        en: 'followed by the festive meal.',
      },
    },
  },
};

export function eventSiteConfig(v?: string | null): EventSiteConfig {
  return CONFIG[normalizeEventType(v)];
}

function pick(l: Lang3, lang: SiteLanguage | string | undefined): string {
  return lang === 'he' ? l.he : lang === 'en' ? l.en : l.fr;
}

/** « Bar Mitsva » / « בר מצווה » / « Wedding » */
export function eventLabel(v: string | null | undefined, lang?: SiteLanguage | string): string {
  return pick(eventSiteConfig(v).label, lang);
}

/** Libellé de l'événement principal (type interne `houppa`) */
export function mainEventLabel(v: string | null | undefined, lang?: SiteLanguage | string): string {
  return pick(eventSiteConfig(v).mainEvent, lang);
}

export function inviteOneText(v: string | null | undefined, lang?: SiteLanguage | string): string {
  return pick(eventSiteConfig(v).inviteOne, lang);
}

export function rsvpMessageLabel(v: string | null | undefined, lang?: SiteLanguage | string): string {
  return pick(eventSiteConfig(v).messageTo, lang);
}

/** Événements du programme proposés dans le builder */
export function programDefaults(v?: string | null): ProgramDefault[] {
  return eventSiteConfig(v).program;
}

/** Phrases du faire-part par défaut (français, l'hébreu reste une proposition) */
export function invitationTextDefaults(v?: string | null) {
  return eventSiteConfig(v).texts;
}

/**
 * Nom affiché en grand pour un événement autre qu'un mariage :
 * le prénom de l'enfant, sinon « Famille Cohen » (Brit Mila avant l'annonce
 * du prénom). Hébreu : « משפחת כהן ».
 */
export function eventHeroName(
  site: Pick<WeddingSite, 'brideName' | 'groomName' | 'coupleName' | 'language'>,
): string {
  const child = (site.brideName ?? '').trim();
  if (child && child !== '…') return child;
  const family = (site.groomName ?? '').trim();
  if (family && family !== '…') return site.language === 'he' ? `משפחת ${family}` : `Famille ${family}`;
  return (site.coupleName ?? '').trim();
}

/**
 * Nom du site (slug, titre de page) côté builder : « Bar Mitsva Nathan »,
 * « Brit Mila Cohen ». Mariage : « Léa & Thomas ».
 */
export function siteDisplayName(eventType: string | null | undefined, brideName: string, groomName: string): string {
  const b = brideName.trim();
  const g = groomName.trim();
  if (isWeddingEvent(eventType)) return b && g ? `${b} & ${g}` : b || g;
  const label = eventSiteConfig(eventType).label.fr;
  return [label, b || g].filter(Boolean).join(' ');
}

/**
 * Site prêt à l'affichage pour une Bar/Bat Mitsva ou une Brit Mila : un seul
 * nom (l'enfant, ou « Famille X »), sans « & ». Tous les modèles savent déjà
 * afficher un nom unique (cas `hasTwoNames === false`), on n'a donc rien à
 * dupliquer par modèle. Le nom de famille reste dans `content.groomFamilyName`
 * pour qui en a besoin.
 */
export function withEventNames<T extends WeddingSite>(site: T): T {
  if (isWeddingEvent(site.eventType)) return site;
  const hero = eventHeroName(site);
  return {
    ...site,
    brideName: hero,
    groomName: '',
    coupleName: hero,
    content: site.content
      ? {
          ...site.content,
          // Le prénom hébreu de l'enfant s'affiche seul sous le prénom
          groomNameHe: '',
          groomFamilyName: site.content.groomFamilyName || (site.groomName ?? '').trim(),
        }
      : site.content,
  };
}

/** Initiale d'un nom pour le monogramme : « Famille Cohen » → « C » (pas « F »). */
export function initialOfName(name: string): string {
  return name.trim().replace(/^(famille|משפחת)\s+/iu, '').charAt(0).toUpperCase();
}

/**
 * Couleurs par défaut d'un NOUVEAU site selon l'événement (nom exact d'une
 * combinaison de data/colorCombinations). Mariage : celles du modèle choisi.
 * Toujours modifiables ensuite dans l'étape Style.
 */
const EVENT_DEFAULT_PALETTE: Partial<Record<SiteEventType, string>> = {
  bar_mitsva: 'Bleu Nuit & Cuivré',
  bat_mitsva: 'Pêche & Or Rose',
  brit_mila: 'Sable & Bleu Ciel',
};

export function eventDefaultPaletteName(v?: string | null): string | null {
  return EVENT_DEFAULT_PALETTE[normalizeEventType(v)] ?? null;
}
