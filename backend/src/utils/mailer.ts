import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? `"The Event Wedding" <${process.env.SMTP_USER}>`;

function codeBlock(code: string) {
  return `
    <div style="background:#fff;border:2px solid #6C63FF;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#111827;">${code}</span>
    </div>`;
}

function emailWrapper(content: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fafafa;border-radius:16px;">
    ${content}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="color:#9ca3af;font-size:12px;text-align:center;">Si tu n'as pas fait cette demande, ignore cet email.</p>
  </div>`;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `${code} — Ton code de vérification`,
    html: emailWrapper(`
      <h2 style="color:#6C63FF;margin-bottom:8px;">Vérification de ton compte</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Voici ton code de sécurité pour finaliser ton inscription sur <strong>The Event Wedding</strong>.
      </p>
      ${codeBlock(code)}
      <p style="color:#9ca3af;font-size:13px;">Ce code est valable <strong>10 minutes</strong>. Ne le partage avec personne.</p>
    `),
    text: `Ton code d'inscription The Event Wedding : ${code}\n\nValable 10 minutes.`,
  });
}

export async function sendNewMessageEmail(opts: {
  to: string;
  recipientPrenom: string;
  senderPrenom: string;
  senderNom: string;
  preview: string;
}): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: `💬 Nouveau message de ${opts.senderPrenom} ${opts.senderNom}`,
    html: emailWrapper(`
      <h2 style="color:#6C63FF;margin-bottom:8px;">Tu as reçu un nouveau message</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Bonjour <strong>${opts.recipientPrenom}</strong>,<br/>
        <strong>${opts.senderPrenom} ${opts.senderNom}</strong> t'a envoyé un message sur <strong>The Event Wedding</strong>.
      </p>
      <div style="background:#f3f0ff;border-left:4px solid #6C63FF;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="color:#374151;font-size:14px;font-style:italic;margin:0;">"${opts.preview}"</p>
      </div>
      <p style="color:#9ca3af;font-size:13px;">Ouvre l'application pour répondre.</p>
    `),
    text: `Nouveau message de ${opts.senderPrenom} ${opts.senderNom} : "${opts.preview}"\n\nOuvre l'app pour répondre.`,
  });
}

export async function sendResetEmail(to: string, code: string, prenom: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `${code} — Réinitialisation de ton mot de passe`,
    html: emailWrapper(`
      <h2 style="color:#6C63FF;margin-bottom:8px;">Réinitialisation du mot de passe</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.6;">
        Bonjour <strong>${prenom}</strong>,<br/>
        Tu as demandé à réinitialiser ton mot de passe sur <strong>The Event Wedding</strong>.
        Utilise le code ci-dessous dans l'application.
      </p>
      ${codeBlock(code)}
      <p style="color:#9ca3af;font-size:13px;">Ce code est valable <strong>15 minutes</strong>. Ne le partage avec personne.</p>
    `),
    text: `Ton code de réinitialisation The Event Wedding : ${code}\n\nValable 15 minutes.`,
  });
}
