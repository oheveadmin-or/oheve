/**
 * Noms de lieux — préposition et mise en forme cohérentes dans toute l'app.
 *
 * Avant, l'accueil écrivait « au {ville} » en dur, ce qui donnait
 * « au Marseille ». En français la préposition dépend de l'article du nom :
 *   - Marseille, Paris, Jérusalem  → « à Marseille »
 *   - Le Havre, Le Touquet         → « au Havre »
 *   - Les Sables-d'Olonne, Les Lilas → « aux Sables-d'Olonne »
 *   - La Rochelle, L'Isle-Adam     → « à La Rochelle » (l'article reste)
 *   - Israël, France, Belgique     → « en Israël » (pays féminins / à voyelle)
 *   - Maroc, Portugal, Canada      → « au Maroc » (pays masculins)
 *   - États-Unis, Pays-Bas         → « aux États-Unis »
 *
 * Toujours passer par ces fonctions plutôt que de concaténer une préposition.
 */

/** Pays masculins courants → « au … ». */
const PAYS_MASCULINS = [
  'maroc', 'portugal', 'canada', 'luxembourg', 'danemark', 'japon', 'mexique',
  'bresil', 'perou', 'chili', 'senegal', 'congo', 'liban', 'panama', 'venezuela',
];

/** Pays pluriels courants → « aux … ». */
const PAYS_PLURIELS = [
  'etats-unis', 'pays-bas', 'emirats arabes unis', 'philippines', 'seychelles',
  'comores', 'maldives',
];

/** Enlève accents, casse et apostrophes pour comparer un nom de pays. */
function normalise(valeur: string): string {
  return valeur
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(le|la|les|l')\s*/, '');
}

/**
 * Préposition + nom du lieu : « à Marseille », « au Havre », « en Israël ».
 * `kind` distingue une ville (défaut) d'un pays, dont les règles diffèrent.
 */
export function placeWithPreposition(
  place?: string | null,
  kind: 'city' | 'country' = 'city',
): string | null {
  const nom = place?.trim();
  if (!nom) return null;

  // Article défini en tête du nom : « Le Havre » → « au Havre ».
  if (/^le\s+/i.test(nom)) return `au ${nom.slice(3).trim()}`;
  if (/^les\s+/i.test(nom)) return `aux ${nom.slice(4).trim()}`;
  // « La Rochelle » et « L'Isle-Adam » gardent leur article après « à ».
  if (/^(la\s+|l')/i.test(nom)) return `à ${nom}`;

  if (kind === 'country') {
    const cle = normalise(nom);
    if (PAYS_PLURIELS.includes(cle)) return `aux ${nom}`;
    if (PAYS_MASCULINS.includes(cle)) return `au ${nom}`;
    // Par défaut un pays est féminin ou commence par une voyelle : « en France »,
    // « en Israël ». C'est le cas des destinations principales de l'app.
    return `en ${nom}`;
  }

  return `à ${nom}`;
}

/**
 * Lieu du mariage à afficher : l'adresse complète si elle est renseignée,
 * sinon la ville, sinon le pays. Renvoie aussi le type pour la préposition.
 */
export function weddingPlace(user?: {
  wedding_address?: string | null;
  wedding_city?: string | null;
  wedding_country?: string | null;
} | null): { label: string; kind: 'city' | 'country' } | null {
  const adresse = user?.wedding_address?.trim();
  if (adresse) return { label: adresse, kind: 'city' };
  const ville = user?.wedding_city?.trim();
  if (ville) return { label: ville, kind: 'city' };
  const pays = user?.wedding_country?.trim();
  if (pays) return { label: pays, kind: 'country' };
  return null;
}

/** « à Marseille » / « au Havre » / « en Israël » pour le lieu du mariage. */
export function weddingPlaceWithPreposition(user?: {
  wedding_address?: string | null;
  wedding_city?: string | null;
  wedding_country?: string | null;
} | null): string | null {
  const lieu = weddingPlace(user);
  if (!lieu) return null;
  return placeWithPreposition(lieu.label, lieu.kind);
}
