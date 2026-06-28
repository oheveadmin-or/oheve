import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Oheve <noreply@ohevewedding.com>';
const REPLY_TO = 'contact@ohevewedding.com';

function codeBlock(code: string) {
  return `
    <div style="background:#fff;border:2px solid #7C8C6E;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#111827;">${code}</span>
    </div>`;
}

function emailWrapper(content: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fafafa;border-radius:16px;">
    ${content}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="color:#9ca3af;font-size:12px;text-align:center;">
      Si tu n'as pas fait cette demande, ignore cet email.<br/>
      Besoin d'aide ? Contacte-nous à <a href="mailto:support@ohevewedding.com" style="color:#7C8C6E;">support@ohevewedding.com</a>
    </p>
  </div>`;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: `${code} — Ton code de vérification Oheve`,
    html: emailWrapper(`
      <h2 style="color:#7C8C6E;margin-bottom:8px;">Vérification de ton compte</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Voici ton code de sécurité pour finaliser ton inscription sur <strong>Oheve</strong>.
      </p>
      ${codeBlock(code)}
      <p style="color:#9ca3af;font-size:13px;">Ce code est valable <strong>10 minutes</strong>. Ne le partage avec personne.</p>
    `),
  });
}

export async function sendNewMessageEmail(opts: {
  to: string;
  recipientPrenom: string;
  senderPrenom: string;
  senderNom: string;
  preview: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: opts.to,
    subject: `💬 Nouveau message de ${opts.senderPrenom} ${opts.senderNom}`,
    html: emailWrapper(`
      <h2 style="color:#7C8C6E;margin-bottom:8px;">Tu as reçu un nouveau message</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Bonjour <strong>${opts.recipientPrenom}</strong>,<br/>
        <strong>${opts.senderPrenom} ${opts.senderNom}</strong> t'a envoyé un message sur <strong>Oheve</strong>.
      </p>
      <div style="background:#f3f0eb;border-left:4px solid #7C8C6E;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:#374151;font-size:14px;font-style:italic;margin:0;">"${opts.preview}"</p>
      </div>
      <p style="color:#9ca3af;font-size:13px;">Ouvre l'application pour répondre.</p>
    `),
  });
}

export async function sendAppointmentReminderEmail(opts: {
  to: string;
  prenom: string;
  title: string;
  eventDate: string;
  eventTime?: string;
}): Promise<void> {
  const dateFr = new Date(`${opts.eventDate}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = opts.eventTime?.slice(0, 5);
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: opts.to,
    subject: `📅 Rappel : ${opts.title} — demain`,
    html: emailWrapper(`
      <h2 style="color:#7C8C6E;margin-bottom:8px;">Rappel rendez-vous</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Bonjour <strong>${opts.prenom}</strong>,<br/>
        Un rappel pour votre rendez-vous <strong>${opts.title}</strong> prévu <strong>demain</strong>.
      </p>
      <div style="background:#f3f0eb;border-left:4px solid #7C8C6E;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:#374151;font-size:15px;margin:0;">
          📅 <strong>${dateFr}</strong>${timeStr ? `<br/>🕐 <strong>${timeStr}</strong>` : ''}
        </p>
      </div>
      <p style="color:#9ca3af;font-size:13px;">Ouvre l'application pour voir les détails.</p>
    `),
  });
}

export async function sendResetEmail(to: string, code: string, prenom: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: `${code} — Réinitialisation de ton mot de passe Oheve`,
    html: emailWrapper(`
      <h2 style="color:#7C8C6E;margin-bottom:8px;">Réinitialisation du mot de passe</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Bonjour <strong>${prenom}</strong>,<br/>
        Tu as demandé à réinitialiser ton mot de passe sur <strong>Oheve</strong>.
        Utilise le code ci-dessous dans l'application.
      </p>
      ${codeBlock(code)}
      <p style="color:#9ca3af;font-size:13px;">Ce code est valable <strong>15 minutes</strong>. Ne le partage avec personne.</p>
    `),
  });
}

export async function sendInvitationEmail(opts: {
  to: string;
  guestPrenom: string;
  coupleNames: string;
  weddingDate: string;
  siteUrl: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: opts.to,
    subject: `💌 Vous êtes invité(e) au mariage de ${opts.coupleNames}`,
    html: emailWrapper(`
      <h2 style="color:#7C8C6E;margin-bottom:8px;">Vous êtes invité(e) !</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Bonjour <strong>${opts.guestPrenom}</strong>,<br/>
        <strong>${opts.coupleNames}</strong> ont le plaisir de vous inviter à célébrer leur mariage
        le <strong>${opts.weddingDate}</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${opts.siteUrl}" style="background:#7C8C6E;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">
          Voir le site du mariage
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;">Vous pouvez également confirmer votre présence depuis ce lien.</p>
    `),
  });
}
