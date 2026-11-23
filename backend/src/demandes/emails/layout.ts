import { demandesConfig } from '../config';
import { escapeHtml } from '../sanitize';

/** Charte Oheve : ivoire / sauge / olive / anthracite. */
export const COLORS = {
  ivoire: '#F6F2EA',
  carte: '#FFFFFF',
  sauge: '#929B83',
  olive: '#747E68',
  anthracite: '#343630',
  gris: '#6F7168',
  filet: '#E4DED2',
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function formatDateFr(d: Date | string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
  });
}

export function button(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 8px;">
    <tr><td align="center" bgcolor="${COLORS.olive}" style="border-radius:10px;">
      <a href="${escapeHtml(url)}" target="_blank"
         style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
        ${escapeHtml(label)}
      </a>
    </td></tr>
  </table>`;
}

/** Bloc « détails » : lignes libellé / valeur (valeurs déjà en HTML sûr). */
export function detailsTable(rows: Array<[string, string]>): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:20px 0;border:1px solid ${COLORS.filet};border-radius:10px;background:${COLORS.ivoire};">
    ${rows.map(([k, v]) => `
    <tr>
      <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.gris};width:38%;vertical-align:top;">${escapeHtml(k)}</td>
      <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.anthracite};vertical-align:top;">${v}</td>
    </tr>`).join('')}
  </table>`;
}

export function quote(html: string): string {
  return `
  <div style="margin:18px 0;padding:16px 18px;border-left:4px solid ${COLORS.sauge};background:${COLORS.ivoire};border-radius:8px;
              font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:${COLORS.anthracite};">
    ${html}
  </div>`;
}

export function link(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" target="_blank" style="color:${COLORS.olive};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

/**
 * Habillage commun : logo, « Bonjour [prénom], », contenu, signature, pied de
 * page avec le lien de désinscription. Mise en page en tableaux (seule
 * technique fiable dans Outlook/Gmail), largeur fluide jusqu'à 560 px.
 */
export function layout(opts: {
  prenom: string;
  preheader: string;
  bodyHtml: string;
  footerReason: string;
  unsubscribeUrl: string;
  unsubscribeLabel: string;
}): string {
  const { logoUrl, siteUrl } = demandesConfig;
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Oheve" width="120" style="display:block;margin:0 auto;max-width:120px;height:auto;border:0;"/>`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:2px;color:${COLORS.olive};">Oheve</span>`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<title>Oheve</title>
<style>
  @media only screen and (max-width:600px) {
    .card { padding:24px 18px !important; }
    .outer { padding:12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.ivoire};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.ivoire}">
  <tr><td class="outer" align="center" style="padding:28px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td align="center" style="padding:4px 0 20px;">${logo}</td></tr>
      <tr><td class="card" bgcolor="${COLORS.carte}" style="padding:32px 30px;border-radius:16px;border:1px solid ${COLORS.filet};">
        <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:${COLORS.anthracite};">
          Bonjour ${escapeHtml(opts.prenom)},
        </p>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.anthracite};">
          ${opts.bodyHtml}
        </div>
        <p style="margin:28px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${COLORS.anthracite};">
          L'équipe Oheve<br/>
          ${link(siteUrl.replace(/^https?:\/\//, ''), siteUrl)}
        </p>
      </td></tr>
      <tr><td align="center" style="padding:20px 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.gris};">
        ${escapeHtml(opts.footerReason)}<br/>
        ${link(opts.unsubscribeLabel, opts.unsubscribeUrl)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Encadré « application Oheve » des e-mails prestataire : le prestataire
 * retrouve toutes ses demandes et répond plus vite depuis l'app.
 */
export function appBlock(): string {
  const url = demandesConfig.appStoreUrl;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:26px 0 0;border:1px solid ${COLORS.filet};border-radius:12px;background:${COLORS.ivoire};">
    <tr><td align="center" style="padding:20px 18px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:${COLORS.anthracite};">Gérez vos demandes dans l'application Oheve</p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:${COLORS.gris};">Toutes vos demandes au même endroit, une notification à chaque nouveau message, et votre fiche à jour en quelques secondes.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr><td align="center" bgcolor="${COLORS.anthracite}" style="border-radius:10px;">
          <a href="${escapeHtml(url)}" target="_blank"
             style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
            Télécharger l'app Oheve
          </a>
        </td></tr>
      </table>
      <p style="margin:10px 0 0;font-size:12px;color:${COLORS.gris};">Disponible sur l'App Store (iPhone)</p>
    </td></tr>
  </table>`;
}

export function appText(): string {
  return `Gérez vos demandes dans l'application Oheve : ${demandesConfig.appStoreUrl}`;
}

/** Version texte commune (signature + pied de page). */
export function textFooter(opts: { footerReason: string; unsubscribeUrl: string; unsubscribeLabel: string }): string {
  return `
L'équipe Oheve
${demandesConfig.siteUrl}

--
${opts.footerReason}
${opts.unsubscribeLabel} : ${opts.unsubscribeUrl}`;
}
