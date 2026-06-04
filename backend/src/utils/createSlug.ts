/**
 * Slug URL : minuscules, sans accents, tirets, pas de doubles tirets.
 * Ne contient aucune logique métier liée au domaine.
 */

function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '');
}

export function slugifySegment(input: string): string {
  const cleaned = stripDiacritics(input.trim())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned.length > 0 ? cleaned : 'site';
}

export function buildBaseSlugFromNames(brideName: string, groomName: string): string {
  return `${slugifySegment(brideName)}-${slugifySegment(groomName)}`;
}
