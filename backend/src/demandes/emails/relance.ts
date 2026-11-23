import { escapeHtml } from '../sanitize';
import { appBlock, appText, button, detailsTable, formatDateFr, layout, link, RenderedEmail, textFooter } from './layout';
import { PRESTA_FOOTER, PrestaEmailContext } from './types';

/**
 * Relances d'une demande verrouillée (24 h puis 72 h). Uniquement des faits
 * vrais : qui a écrit, quand, depuis quelle fiche. Pas de faux compteur, pas
 * de fausse échéance.
 */
export function renderRelance(ctx: PrestaEmailContext & { etape: '24h' | '72h' }): RenderedEmail {
  const subject = ctx.etape === '24h'
    ? `${ctx.clientPrenom} attend toujours votre réponse`
    : `Dernier rappel : la demande de ${ctx.clientPrenom}`;

  const date = formatDateFr(ctx.dateDemande);
  const corps = ctx.etape === '24h'
    ? `${ctx.clientPrenom} vous a envoyé une demande le ${date} depuis votre fiche « ${ctx.ficheNom} ». Elle n'a pas encore été lue.`
    : `La demande que ${ctx.clientPrenom} vous a envoyée le ${date} n'a toujours pas été lue. C'est notre dernier rappel pour cette demande : nous ne vous écrirons plus à son sujet.`;
  const action = "Débloquez cette demande pour la lire et répondre, ou abonnez-vous dans l'application Oheve.";

  const html = layout({
    prenom: ctx.prestaPrenom,
    preheader: subject,
    bodyHtml: `
      <p style="margin:0 0 12px;">${escapeHtml(corps)}</p>
      ${detailsTable([
        ['Client', escapeHtml(ctx.clientPrenom)],
        ['Votre fiche', link(ctx.ficheNom, ctx.ficheUrl)],
        ['Date de la demande', escapeHtml(date)],
      ])}
      <p style="margin:0;">${escapeHtml(action)}</p>
      ${button('Voir la demande', ctx.demandeUrl)}
      ${appBlock()}`,
    unsubscribeUrl: ctx.unsubscribeUrl,
    ...PRESTA_FOOTER,
  });

  const text = `Bonjour ${ctx.prestaPrenom},

${corps}

Client : ${ctx.clientPrenom}
Votre fiche : ${ctx.ficheNom} — ${ctx.ficheUrl}
Date de la demande : ${date}

${action}

Voir la demande : ${ctx.demandeUrl}

${appText()}
${textFooter({ unsubscribeUrl: ctx.unsubscribeUrl, ...PRESTA_FOOTER })}`;

  return { subject, html, text };
}
