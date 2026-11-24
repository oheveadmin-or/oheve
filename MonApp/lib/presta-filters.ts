/**
 * Filtres et tris de l'annuaire prestataires (écran d'une catégorie).
 *
 * Les villes saisies par les prestataires sont hétérogènes (« Paris 19e »,
 * « Sarcelles (95) », « paris »…) : on les regroupe sous un nom propre pour
 * que le filtre ville propose UNE entrée par ville. Le prix vient de
 * price_min, sinon de la fourchette texte (« 1000 à 4000€ », « 1 500 € »).
 */

const strip = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Grandes villes à arrondissements / variantes : tout ramené au nom seul. */
const BIG_CITIES = ['Paris', 'Lyon', 'Marseille'];

/** Nom de ville affiché dans le filtre (null si rien de saisi). */
export function normalizeCity(raw?: string | null): string | null {
  let v = (raw ?? '').trim();
  if (!v) return null;
  // « Sarcelles (95) » → « Sarcelles »
  v = v.replace(/\s*\(\s*\d{2,3}\s*\)\s*$/, '').trim();
  // « Paris, 75 » / « Lyon - 69 » → nom seul
  v = v.replace(/[\s,–-]+\d{2,5}\s*$/, '').trim();
  const key = strip(v);
  for (const big of BIG_CITIES) {
    const b = strip(big);
    // « Paris 19e », « Paris 9ème », « Lyon 3e arrondissement », « Marseille 8 »
    if (key === b || key.startsWith(`${b} `) || key.startsWith(`${b},`)) return big;
  }
  if (!v) return null;
  // Première lettre en capitale (« aix-en-provence » → « Aix-en-provence »)
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Clé de comparaison d'une ville (sans accents ni casse). */
export const cityKey = (city: string) => strip(city);

/** Liste des villes présentes, la plus fournie d'abord, avec le nombre de fiches. */
export function cityCounts(cities: (string | null | undefined)[]): { city: string; key: string; count: number }[] {
  const map = new Map<string, { city: string; key: string; count: number }>();
  for (const raw of cities) {
    const city = normalizeCity(raw);
    if (!city) continue;
    const key = cityKey(city);
    const cur = map.get(key);
    if (cur) cur.count += 1;
    else map.set(key, { city, key, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'fr'));
}

/**
 * Prix « à partir de » d'un prestataire, en euros (null = non renseigné).
 * price_min d'abord, sinon le premier montant de la fourchette texte.
 */
export function startingPrice(p: { price_min?: number | string | null; price_range?: string | null }): number | null {
  const min = p.price_min != null ? Number(p.price_min) : NaN;
  if (Number.isFinite(min) && min > 0) return min;
  const txt = (p.price_range ?? '').replace(/(\d)[\s .](?=\d{3}\b)/g, '$1');
  const m = txt.match(/\d+(?:[.,]\d+)?\s*(k)?/i);
  if (!m) return null;
  let n = parseFloat(m[0].replace(',', '.'));
  if (m[1]) n *= 1000;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type SortKey = 'none' | 'prix_asc' | 'prix_desc' | 'note_desc' | 'nom_asc';

export const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'none', label: 'Pertinence', icon: 'sparkles-outline' },
  { key: 'prix_asc', label: 'Prix croissant', icon: 'trending-up-outline' },
  { key: 'prix_desc', label: 'Prix décroissant', icon: 'trending-down-outline' },
  { key: 'note_desc', label: 'Mieux notés', icon: 'star-outline' },
  { key: 'nom_asc', label: 'Nom A → Z', icon: 'text-outline' },
];

export type FilterablePresta = {
  business_name?: string;
  location_city?: string | null;
  rating?: number | string | null;
  price_min?: number | string | null;
  price_range?: string | null;
  is_partner?: boolean;
  cover_url?: string | null;
  avatar_url?: string | null;
  description?: string | null;
};

export type PrestaFilters = {
  search: string;
  cities: string[]; // clés cityKey()
  sort: SortKey;
  partnersOnly: boolean;
  withPrice: boolean;
  withPhoto: boolean;
  minRating: number; // 0 = indifférent
};

export const EMPTY_FILTERS: PrestaFilters = {
  search: '', cities: [], sort: 'none',
  partnersOnly: false, withPrice: false, withPhoto: false, minRating: 0,
};

/** Nombre de filtres actifs (hors recherche texte), pour le badge du bouton. */
export function activeFilterCount(f: PrestaFilters): number {
  return (f.cities.length ? 1 : 0) + (f.sort !== 'none' ? 1 : 0)
    + (f.partnersOnly ? 1 : 0) + (f.withPrice ? 1 : 0) + (f.withPhoto ? 1 : 0)
    + (f.minRating > 0 ? 1 : 0);
}

export function applyPrestaFilters<T extends FilterablePresta>(all: T[], f: PrestaFilters): T[] {
  const q = strip(f.search);
  const cities = new Set(f.cities);
  let list = all.filter((p) => {
    if (q) {
      const hay = strip(`${p.business_name ?? ''} ${p.location_city ?? ''} ${p.description ?? ''}`);
      if (!hay.includes(q)) return false;
    }
    if (cities.size) {
      const c = normalizeCity(p.location_city);
      if (!c || !cities.has(cityKey(c))) return false;
    }
    if (f.partnersOnly && !p.is_partner) return false;
    if (f.withPrice && startingPrice(p) == null) return false;
    if (f.withPhoto && !(p.cover_url || p.avatar_url)) return false;
    if (f.minRating > 0 && Number(p.rating ?? 0) < f.minRating) return false;
    return true;
  });

  // Prix non renseigné → toujours en fin de liste, dans les deux sens.
  const price = (p: T) => startingPrice(p);
  const byPrice = (dir: 1 | -1) => (a: T, b: T) => {
    const pa = price(a), pb = price(b);
    if (pa == null && pb == null) return 0;
    if (pa == null) return 1;
    if (pb == null) return -1;
    return (pa - pb) * dir;
  };
  list = [...list];
  if (f.sort === 'prix_asc') list.sort(byPrice(1));
  else if (f.sort === 'prix_desc') list.sort(byPrice(-1));
  else if (f.sort === 'note_desc') list.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
  else if (f.sort === 'nom_asc') list.sort((a, b) => (a.business_name ?? '').localeCompare(b.business_name ?? '', 'fr'));

  // Partenaires devant en « Pertinence » et « Mieux notés » (moins de
  // visibilité pour les non-partenaires). Un tri explicite par prix ou par nom
  // est respecté tel quel : l'utilisateur l'a demandé.
  if (f.sort === 'none' || f.sort === 'note_desc') {
    list.sort((a, b) => Number(!!b.is_partner) - Number(!!a.is_partner));
  }
  return list;
}
