/**
 * Phrases du faire-part proposées par défaut : le couple n'a rien à rédiger,
 * il ajuste ou vide une case pour retirer la phrase du site.
 */
import type { InvitationTexts, WeddingSiteContent } from '../types';

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

/** Phrases préremplies d'un nouveau site (français seul ; l'hébreu reste facultatif). */
export function defaultInvitationTexts(): InvitationTexts {
  return Object.fromEntries(INVITATION_TEXT_FIELDS.map((f) => [f.key, { fr: f.fr, he: '' }])) as InvitationTexts;
}

/**
 * Site enregistré avant l'arrivée des phrases du faire-part : on préremplit
 * les phrases et on reprend l'ancien « À la mémoire de… » comme « Une pensée ».
 * Les sites qui ont déjà leurs phrases sont laissés tels quels.
 */
export function withInvitationTexts(content: WeddingSiteContent): WeddingSiteContent {
  if (content.invitationTexts) return content;
  const texts = defaultInvitationTexts();
  const legacyMemorial = content.texts?.memorialText?.trim();
  if (legacyMemorial) texts.memorial = { fr: legacyMemorial, he: '' };
  return {
    ...content,
    invitationTexts: texts,
    texts: { ...(content.texts ?? {}), memorialText: '' },
  };
}
