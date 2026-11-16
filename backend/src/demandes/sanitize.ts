import { APERCU_LENGTH } from './config';

/**
 * Nettoie un message libre : aucune balise HTML ne doit survivre (le texte est
 * réaffiché dans des e-mails et des pages web). Les retours à la ligne sont
 * gardés, les caractères de contrôle et espaces superflus retirés.
 */
export function cleanMessage(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\/?[a-z!][^>]*>/gi, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Texte → HTML sûr, retours à la ligne conservés. */
export function textToHtml(s: string): string {
  return escapeHtml(s).replace(/\n/g, '<br/>');
}

/**
 * Les 80 premiers caractères puis « ... » (aperçu d'une demande verrouillée).
 * Un message court n'est jamais montré en entier : au plus sa moitié, sinon
 * l'aperçu d'un « Bonjour, dispo le 12 juin ? » livrerait toute la demande.
 */
export function apercu(s: string, n = APERCU_LENGTH): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  const cut = Math.min(n, Math.ceil(flat.length / 2));
  return `${flat.slice(0, cut).trimEnd()}...`;
}

/** Extrait pour une liste ou une notification (demande déjà ouverte). */
export function extrait(s: string | null | undefined, n = 120): string {
  const flat = (s ?? '').replace(/\s+/g, ' ').trim();
  return flat.length <= n ? flat : `${flat.slice(0, n).trimEnd()}…`;
}
