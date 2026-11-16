import { textToHtml } from '../sanitize';
import { button, layout, link, quote, RenderedEmail, textFooter } from './layout';

/** E-mail au CLIENT quand le prestataire lui répond dans Ohevé. */
export function renderReponseClient(ctx: {
  clientPrenom: string;
  prestaNom: string;
  ficheUrl: string;
  message: string;
  conversationUrl: string;
  unsubscribeUrl: string;
}): RenderedEmail {
  const footer = {
    footerReason: `Vous recevez ce mail car vous avez contacté ${ctx.prestaNom} via Ohevé.`,
    unsubscribeLabel: 'Ne plus recevoir ces e-mails',
  };
  const subject = `${ctx.prestaNom} vous a répondu`;
  const html = layout({
    prenom: ctx.clientPrenom,
    preheader: `${ctx.prestaNom} vous a répondu sur Ohevé`,
    bodyHtml: `
      <p style="margin:0 0 4px;">${link(ctx.prestaNom, ctx.ficheUrl)} a répondu à votre demande :</p>
      ${quote(textToHtml(ctx.message))}
      ${button('Voir la conversation', ctx.conversationUrl)}
      <p style="margin:8px 0 0;font-size:13px;text-align:center;">Pour lui répondre, utilisez le bouton ci-dessus ou l'application Ohevé.</p>`,
    unsubscribeUrl: ctx.unsubscribeUrl,
    ...footer,
  });
  const text = `Bonjour ${ctx.clientPrenom},

${ctx.prestaNom} a répondu à votre demande :

« ${ctx.message} »

Voir la conversation : ${ctx.conversationUrl}
${textFooter({ unsubscribeUrl: ctx.unsubscribeUrl, ...footer })}`;
  return { subject, html, text };
}
