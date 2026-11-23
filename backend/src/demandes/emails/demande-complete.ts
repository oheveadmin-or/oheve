import { escapeHtml, textToHtml } from '../sanitize';
import { appBlock, appText, button, COLORS, detailsTable, formatDateFr, layout, link, quote, RenderedEmail, textFooter } from './layout';
import { PRESTA_FOOTER, PrestaEmailContext } from './types';

/**
 * Demande GRATUITE, ABONNEMENT ou DÉBLOQUÉE : message complet + coordonnées
 * du client. L'appelant met Reply-To = e-mail du client.
 */
export function renderDemandeComplete(ctx: PrestaEmailContext & {
  message: string;
  clientEmail: string | null;
  clientPhone: string | null;
  /** Rang de la demande offerte (1..limite) ; null si abonnement/déblocage. */
  numeroGratuit: number | null;
  freeLimit: number;
  /** Variante : la demande vient d'être débloquée (paiement à l'unité). */
  debloquee?: boolean;
  /** Variante : message suivant d'une demande déjà ouverte. */
  suite?: boolean;
}): RenderedEmail {
  const subject = ctx.suite
    ? `Nouveau message de ${ctx.clientPrenom} via Oheve`
    : ctx.debloquee
      ? `Demande débloquée : ${ctx.clientPrenom} vous attend sur Oheve`
      : `${ctx.clientPrenom} vous a envoyé une demande via Oheve`;

  const intro = ctx.suite
    ? `<strong>${escapeHtml(ctx.clientPrenom)}</strong> vous a écrit un nouveau message à propos de votre fiche ${link(ctx.ficheNom, ctx.ficheUrl)}.`
    : ctx.debloquee
      ? `Merci, la demande de <strong>${escapeHtml(ctx.clientPrenom)}</strong> est débloquée. Voici son message complet et ses coordonnées.`
      : `<strong>${escapeHtml(ctx.clientPrenom)}</strong> a trouvé votre fiche ${link(ctx.ficheNom, ctx.ficheUrl)} sur Oheve et vous a envoyé une demande.`;

  const coords: Array<[string, string]> = [];
  if (ctx.clientEmail) coords.push(['E-mail', link(ctx.clientEmail, `mailto:${ctx.clientEmail}`)]);
  if (ctx.clientPhone) coords.push(['Téléphone', link(ctx.clientPhone, `tel:${ctx.clientPhone.replace(/\s+/g, '')}`)]);

  const details: Array<[string, string]> = [
    ['Client', escapeHtml(ctx.clientPrenom)],
    ['Votre fiche', link(ctx.ficheNom, ctx.ficheUrl)],
    ['Date de la demande', escapeHtml(formatDateFr(ctx.dateDemande))],
    ...coords,
  ];

  const offerte = ctx.numeroGratuit
    ? `<p style="margin:18px 0 0;font-size:12px;color:${COLORS.gris};text-align:center;">Demande offerte par Oheve (${ctx.numeroGratuit}/${ctx.freeLimit})</p>`
    : '';

  const replyHint = ctx.clientEmail
    ? `<p style="margin:12px 0 0;font-size:13px;color:${COLORS.gris};text-align:center;">Vous pouvez aussi répondre directement à cet e-mail : votre réponse arrivera chez ${escapeHtml(ctx.clientPrenom)}.</p>`
    : '';

  const html = layout({
    prenom: ctx.prestaPrenom,
    preheader: `${ctx.clientPrenom} vous a écrit sur Oheve`,
    bodyHtml: `
      <p style="margin:0 0 4px;">${intro}</p>
      ${quote(textToHtml(ctx.message))}
      ${detailsTable(details)}
      ${button('Répondre sur Oheve', ctx.demandeUrl)}
      ${replyHint}
      ${offerte}
      ${appBlock()}`,
    unsubscribeUrl: ctx.unsubscribeUrl,
    ...PRESTA_FOOTER,
  });

  const introText = ctx.suite
    ? `${ctx.clientPrenom} vous a écrit un nouveau message à propos de votre fiche « ${ctx.ficheNom} ».`
    : ctx.debloquee
      ? `Merci, la demande de ${ctx.clientPrenom} est débloquée. Voici son message complet et ses coordonnées.`
      : `${ctx.clientPrenom} a trouvé votre fiche « ${ctx.ficheNom} » sur Oheve et vous a envoyé une demande.`;

  const text = `Bonjour ${ctx.prestaPrenom},

${introText}

« ${ctx.message} »

Client : ${ctx.clientPrenom}
Votre fiche : ${ctx.ficheNom} — ${ctx.ficheUrl}
Date de la demande : ${formatDateFr(ctx.dateDemande)}${ctx.clientEmail ? `\nE-mail : ${ctx.clientEmail}` : ''}${ctx.clientPhone ? `\nTéléphone : ${ctx.clientPhone}` : ''}

Répondre sur Oheve : ${ctx.demandeUrl}${ctx.clientEmail ? `\nVous pouvez aussi répondre directement à cet e-mail.` : ''}${ctx.numeroGratuit ? `\n\nDemande offerte par Oheve (${ctx.numeroGratuit}/${ctx.freeLimit})` : ''}

${appText()}
${textFooter({ unsubscribeUrl: ctx.unsubscribeUrl, ...PRESTA_FOOTER })}`;

  return { subject, html, text };
}
