import { Resend } from 'resend';

import { isPlaceholderEmail } from '../auth/username';
import { demandesConfig } from './config';
import type { RenderedEmail } from './emails/layout';
import { signUnsubscribe } from './tokens';

export interface OutgoingEmail extends RenderedEmail {
  to: string;
  replyTo?: string | null;
  /** Compte destinataire : sert au lien de désinscription en un clic. */
  recipientUserId: number;
}

export type MailResult = { ok: true; id: string | null } | { ok: false; error: string };
export type MailTransport = (mail: OutgoingEmail & { from: string; headers: Record<string, string> }) => Promise<MailResult>;

let resendClient: Resend | null = null;

const resendTransport: MailTransport = async (mail) => {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY non configurée' };
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  // Resend ne lève pas d'exception : l'échec arrive dans `error`.
  const { data, error } = await resendClient.emails.send({
    from: mail.from,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    headers: mail.headers,
  });
  if (error) return { ok: false, error: error.message ?? String(error) };
  return { ok: true, id: data?.id ?? null };
};

let transport: MailTransport = resendTransport;

/** Tests : remplace l'envoi réel (aucun e-mail ne part). */
export function setMailTransport(t: MailTransport | null): void {
  transport = t ?? resendTransport;
}

export function unsubscribeLinks(userId: number): { page: string; oneClick: string } {
  const token = signUnsubscribe(userId);
  return {
    page: `${demandesConfig.siteUrl}/se-desabonner?token=${encodeURIComponent(token)}`,
    oneClick: `${demandesConfig.apiPublicUrl}/api/demandes/unsubscribe/one-click?token=${encodeURIComponent(token)}`,
  };
}

/** Envoi d'un e-mail « au nom d'Oheve ». Ne lève jamais : renvoie le résultat. */
export async function sendDemandeEmail(mail: OutgoingEmail): Promise<MailResult> {
  if (!mail.to || isPlaceholderEmail(mail.to)) return { ok: false, error: 'Aucune adresse e-mail réelle' };
  const { oneClick } = unsubscribeLinks(mail.recipientUserId);
  try {
    return await transport({
      ...mail,
      from: `${demandesConfig.fromName} <${demandesConfig.fromAddress}>`,
      headers: {
        // Désinscription en un clic (RFC 8058) : exigée par Gmail/Yahoo pour
        // les expéditeurs réguliers, et bon signal de délivrabilité partout.
        'List-Unsubscribe': `<${oneClick}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': 'oheve-demande',
      },
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
