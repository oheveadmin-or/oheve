/**
 * Mise en forme d'affichage des noms saisis TOUT EN MAJUSCULES (« RACHEL »,
 * « MR ET MME BENITA ») : en calligraphie, les capitales sont illisibles.
 * Ce qui est déjà saisi en minuscules/mixte est laissé tel quel, l'hébreu aussi.
 */
import type { WeddingSite } from '../types';

const SMALL = new Set(['et', 'de', 'du', 'des', 'la', 'le', 'les', 'à', 'au', 'aux', 'en', 'and', 'of']);

function isAllCaps(s: string): boolean {
  // Au moins une lettre « à casse » et aucune minuscule
  return s !== s.toLowerCase() && s === s.toUpperCase();
}

function capWord(w: string): string {
  // « JEAN-PIERRE » → « Jean-Pierre », « D'ALMEIDA » → « d'Almeida » (géré plus bas)
  return w
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** « RACHEL » → « Rachel » ; « MR ET MME BENITA » → « Mr et Mme Benita » */
export function prettyName(raw: string | undefined): string {
  const s = raw ?? '';
  if (!isAllCaps(s)) return s;
  return s
    .split(/(\s+)/)
    .map((w, i) => {
      if (/^\s+$/.test(w) || !w) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      if (/^[dl]['’]/i.test(w) && i > 0) return lower.slice(0, 2) + capWord(w.slice(2));
      return capWord(w);
    })
    .join('');
}

/** Site prêt à l'affichage : prénoms, nom du couple et lignes des familles */
export function withPrettyNames<T extends WeddingSite>(site: T): T {
  const cols = site.content?.familyColumns;
  return {
    ...site,
    brideName: prettyName(site.brideName),
    groomName: prettyName(site.groomName),
    coupleName: prettyName(site.coupleName),
    content: site.content
      ? {
          ...site.content,
          familyColumns: cols?.map((c) => ({ ...c, lines: (c.lines ?? []).map((l) => prettyName(l)) })),
        }
      : site.content,
  };
}
