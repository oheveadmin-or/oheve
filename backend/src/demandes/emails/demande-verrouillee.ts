import { escapeHtml } from '../sanitize';
import { appBlock, appText, button, COLORS, detailsTable, formatDateFr, layout, link, quote, RenderedEmail, textFooter } from './layout';
import { PRESTA_FOOTER, PrestaEmailContext } from './types';

/**
 * Demande VERROUILLÉE : aperçu seulement, AUCUNE coordonnée du client, pas de
 * Reply-To vers le client (l'appelant ne le met pas).
 */
export function renderDemandeVerrouillee(ctx: PrestaEmailContext & {
  apercu: string;
  freeLimit: number;
}): RenderedEmail {
  const subject = `Nouvelle demande de ${ctx.clientPrenom} sur Ohevé`;
  const limite = `Vous avez utilisé vos ${ctx.freeLimit} demandes offertes. Activez votre abonnement pour lire cette demande et contacter ${ctx.clientPrenom}.`;

  const html = layout({
    prenom: ctx.prestaPrenom,
    preheader: `${ctx.clientPrenom} vous a envoyé une demande sur Ohevé`,
    bodyHtml: `
      <p style="margin:0 0 4px;"><strong>${escapeHtml(ctx.clientPrenom)}</strong> vous a envoyé une nouvelle demande depuis votre fiche ${link(ctx.ficheNom, ctx.ficheUrl)}.</p>
      ${quote(`${escapeHtml(ctx.apercu)}`)}
      ${detailsTable([
        ['Client', escapeHtml(ctx.clientPrenom)],
        ['Votre fiche', link(ctx.ficheNom, ctx.ficheUrl)],
        ['Date de la demande', escapeHtml(formatDateFr(ctx.dateDemande))],
      ])}
      <p style="margin:0;color:${COLORS.anthracite};">${escapeHtml(limite)}</p>
      ${button('Voir la demande', ctx.demandeUrl)}
      ${appBlock()}`,
    unsubscribeUrl: ctx.unsubscribeUrl,
    ...PRESTA_FOOTER,
  });

  const text = `Bonjour ${ctx.prestaPrenom},

${ctx.clientPrenom} vous a envoyé une nouvelle demande depuis votre fiche « ${ctx.ficheNom} ».

« ${ctx.apercu} »

Client : ${ctx.clientPrenom}
Votre fiche : ${ctx.ficheNom} — ${ctx.ficheUrl}
Date de la demande : ${formatDateFr(ctx.dateDemande)}

${limite}

Voir la demande : ${ctx.demandeUrl}

${appText()}
${textFooter({ unsubscribeUrl: ctx.unsubscribeUrl, ...PRESTA_FOOTER })}`;

  return { subject, html, text };
}
