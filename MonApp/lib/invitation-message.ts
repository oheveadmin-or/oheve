import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Message d'invitation envoyé aux invités avec le lien du site de mariage.
 *
 * Comme sur les sites de faire-part : « Madame Rachelle Layani, … » + un texte
 * chaleureux + le lien. Placé en tête, le lien génère dans WhatsApp l'aperçu
 * du site des mariés (prénoms, date, lieu).
 *
 * Variables : {invité} (nom de l'invité), {lien} (lien du site), {mariés}.
 */

export const DEFAULT_INVITATION_TEMPLATE = `{invité},

C'est avec beaucoup de joie que nous avons le plaisir de vous inviter à célébrer notre mariage.

Nous serions honorés de vous compter parmi nous pour partager cette journée si importante à nos yeux et espérons avoir le bonheur de la vivre à vos côtés.

Vous trouverez toutes les informations concernant le mariage en cliquant sur le lien ci-dessous.

{lien}

Nous vous remercions de bien vouloir nous confirmer votre présence.
Nous avons hâte de partager ce moment de bonheur avec vous.

{mariés} 🤍`;

const TEMPLATE_KEY = '@oheve:invitation_message_v1';

export async function loadInvitationTemplate(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(TEMPLATE_KEY);
    return saved?.trim() ? saved : DEFAULT_INVITATION_TEMPLATE;
  } catch {
    return DEFAULT_INVITATION_TEMPLATE;
  }
}

export async function saveInvitationTemplate(template: string): Promise<void> {
  try {
    if (!template.trim() || template === DEFAULT_INVITATION_TEMPLATE) await AsyncStorage.removeItem(TEMPLATE_KEY);
    else await AsyncStorage.setItem(TEMPLATE_KEY, template);
  } catch { /* stockage indisponible : le message par défaut reste utilisé */ }
}

/** Remplit le modèle. Sans nom d'invité, la ligne de salutation « {invité}, » est retirée. */
export function buildInvitationMessage(
  template: string,
  vars: { guestName?: string; link: string; coupleName?: string },
): string {
  const guest = (vars.guestName ?? '').trim();
  let text = template || DEFAULT_INVITATION_TEMPLATE;
  if (!guest) text = text.replace(/^[ \t]*\{invit[ée]\}[ \t]*,?[ \t]*\n+/im, '');
  // Le lien doit toujours être présent, sinon pas d'aperçu ni d'accès au site
  if (!/\{lien\}/i.test(text)) text = `${text.trimEnd()}\n\n{lien}`;
  return text
    .replace(/\{invit[ée]\}/gi, guest)
    .replace(/\{lien\}/gi, vars.link)
    .replace(/\{mari[ée]s\}/gi, (vars.coupleName ?? '').trim())
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Numéro au format international pour wa.me (06… → 336…). null si inexploitable. */
export function toWhatsAppNumber(phone?: string | null): string | null {
  const raw = (phone ?? '').trim();
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, '');
  if (raw.startsWith('00')) digits = digits.slice(2);
  else if (!raw.startsWith('+') && digits.length === 10 && digits.startsWith('0')) digits = `33${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

// ── Suivi des invitations envoyées (par appareil) ───────────────────────────

const SENT_KEY = '@oheve:invitations_sent_v1';

/** Ids d'invités → date d'envoi (ms). */
export async function loadSentInvitations(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(SENT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export async function markInvitationSent(guestId: string): Promise<Record<string, number>> {
  const sent = await loadSentInvitations();
  sent[guestId] = Date.now();
  try { await AsyncStorage.setItem(SENT_KEY, JSON.stringify(sent)); } catch { /* ignoré */ }
  return sent;
}
