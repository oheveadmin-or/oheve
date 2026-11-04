/**
 * Phrases du faire-part proposées par défaut : le couple n'a rien à rédiger,
 * il ajuste ou vide une case pour retirer la phrase du site.
 */
import type { InvitationTexts, WeddingSiteContent } from '../types';
import { invitationTextDefaults, isWeddingEvent } from '../utils/eventType';

export type InvitationTextKey = keyof InvitationTexts;

export type InvitationTextField = {
  key: InvitationTextKey;
  title: string;
  hint: string;
  /** Texte français prérempli */
  fr: string;
  /** Proposition hébraïque, insérée d'un clic (jamais imposée) */
  he: string;
};

/** Dans l'ordre de lecture du faire-part. */
export const INVITATION_TEXT_FIELDS: InvitationTextField[] = [
  {
    key: 'thanks',
    title: 'Les remerciements',
    hint: 'Sous les noms des familles',
    fr: "Remercient Hachem d'avoir la joie de vous convier au mariage de leurs enfants et petits-enfants",
    he: 'מודים לה׳ על הזכות להזמינכם לחתונת ילדיהם ונכדיהם',
  },
  {
    key: 'invitation',
    title: "L'invitation",
    hint: 'Juste avant la date',
    fr: "et vous prient d'assister à la Houppa qui aura lieu le",
    he: 'ומתכבדים להזמינכם לחופה שתתקיים ביום',
  },
  {
    key: 'reception',
    title: 'La réception',
    hint: 'Après la date, suivie du lieu',
    fr: "Ainsi qu'à la réception qui suivra.",
    he: 'ולסעודת המצווה שלאחריה',
  },
  {
    key: 'memorial',
    title: 'Une pensée',
    hint: 'Pour les proches disparus',
    fr: 'Une pensée émue pour nos chers grands-parents qui veillent sur nous.',
    he: 'לזכר יקירינו שאינם איתנו, השומרים עלינו מלמעלה',
  },
  {
    key: 'dressCode',
    title: 'La tenue',
    hint: 'Le petit mot de la fin',
    fr: 'Une tenue correcte sera appréciée.',
    he: 'נודה על לבוש הולם',
  },
];

/**
 * Phrases du faire-part selon l'événement : remerciements, invitation et
 * réception changent pour une Bar/Bat Mitsva ou une Brit Mila (pensée et
 * tenue restent communes).
 */
export function invitationTextFields(eventType?: string | null): InvitationTextField[] {
  if (isWeddingEvent(eventType)) return INVITATION_TEXT_FIELDS;
  const d = invitationTextDefaults(eventType);
  return INVITATION_TEXT_FIELDS.map((f) => {
    if (f.key === 'thanks') return { ...f, fr: d.thanks.fr, he: d.thanks.he };
    if (f.key === 'invitation') return { ...f, fr: d.invitation.fr, he: d.invitation.he };
    if (f.key === 'reception') return { ...f, fr: d.reception.fr, he: d.reception.he };
    return f;
  });
}

/** Phrases préremplies d'un nouveau site (français seul ; l'hébreu reste facultatif). */
export function defaultInvitationTexts(eventType?: string | null): InvitationTexts {
  return Object.fromEntries(invitationTextFields(eventType).map((f) => [f.key, { fr: f.fr, he: '' }])) as InvitationTexts;
}

/**
 * Site enregistré avant l'arrivée des phrases du faire-part : on préremplit
 * les phrases et on reprend l'ancien « À la mémoire de… » comme « Une pensée ».
 * Les sites qui ont déjà leurs phrases sont laissés tels quels.
 */
export function withInvitationTexts(content: WeddingSiteContent, eventType?: string | null): WeddingSiteContent {
  if (content.invitationTexts) return content;
  const texts = defaultInvitationTexts(eventType);
  const legacyMemorial = content.texts?.memorialText?.trim();
  if (legacyMemorial) texts.memorial = { fr: legacyMemorial, he: '' };
  return {
    ...content,
    invitationTexts: texts,
    texts: { ...(content.texts ?? {}), memorialText: '' },
  };
}
