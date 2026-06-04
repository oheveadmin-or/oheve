/**
 * Normalise une chaîne en slug URL (sans accents, minuscules, tirets).
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * À partir du nom affiché du couple : "Padua & Attia" → "padua-attia"
 */
export function generateSlugFromDisplayName(displayName: string): string {
  return slugify(displayName.trim());
}

/**
 * Si le slug est pris, essaie slug-2, slug-3, …
 */
export function ensureUniqueSlug(baseSlug: string, isTaken: (slug: string) => boolean): string {
  const clean = baseSlug || 'mariage';
  if (!isTaken(clean)) return clean;
  let n = 2;
  while (isTaken(`${clean}-${n}`)) n += 1;
  return `${clean}-${n}`;
}
