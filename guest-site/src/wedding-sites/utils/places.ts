/**
 * Lieux du mariage : la Houppa / cérémonie (`content.venue`) et, si le couple
 * l'a indiqué, une soirée dans un autre endroit (`content.receptionVenue`).
 * Source unique pour le faire-part, la section « Lieux » et les itinéraires.
 */
import type { WeddingSite } from '../types';

export type WeddingPlace = {
  name: string;
  /** Adresse complète (la ville y est ajoutée si elle n'y figure pas) */
  address: string;
  googleMapsUrl?: string;
  wazeUrl?: string;
  photoUrl?: string;
  description?: string;
};

function withCity(address: string, city: string): string {
  if (!city) return address;
  if (!address) return city;
  return address.toLowerCase().includes(city.toLowerCase()) ? address : `${address}, ${city}`;
}

export function weddingPlaces(site: WeddingSite): { ceremony: WeddingPlace | null; reception: WeddingPlace | null } {
  const c = site.content;
  const city = site.city?.trim() ?? '';
  const v = c?.venue;
  const name = v?.name?.trim() || site.venue?.trim() || '';
  const ceremonyAddress = withCity(v?.address?.trim() ?? '', city);
  const ceremony: WeddingPlace | null =
    name || ceremonyAddress
      ? { name, address: name.toLowerCase() === ceremonyAddress.toLowerCase() ? '' : ceremonyAddress, googleMapsUrl: v?.googleMapsUrl, wazeUrl: v?.wazeUrl, photoUrl: v?.photoUrl, description: v?.description }
      : null;

  const r = c?.separateReception ? c.receptionVenue : undefined;
  const rName = r?.name?.trim() ?? '';
  const rAddress = r?.address?.trim() ?? '';
  const reception: WeddingPlace | null =
    rName || rAddress ? { name: rName, address: rAddress, googleMapsUrl: r?.googleMapsUrl, wazeUrl: r?.wazeUrl, photoUrl: r?.photoUrl, description: r?.description } : null;

  return { ceremony, reception };
}

/** Texte pour la recherche d'itinéraire (nom + adresse) */
export function placeQuery(p: WeddingPlace): string {
  return [p.name, p.address].filter(Boolean).join(', ');
}

const FEMININE = new Set([
  'salle', 'villa', 'bastide', 'maison', 'synagogue', 'mairie', 'ferme', 'demeure', 'propriété', 'propriete',
  'chapelle', 'abbaye', 'tour', 'résidence', 'residence', 'terrasse', 'plage', 'grange', 'bergerie', 'cour',
  'péniche', 'peniche', 'galerie', 'orangerie', 'chartreuse', 'commanderie', 'seigneurie', 'yeshiva', 'communauté',
  // adjectifs placés avant le nom : « Grande Synagogue », « Petite Maison »
  'grande', 'petite', 'belle', 'nouvelle', 'vieille', 'ancienne',
]);

/**
 * « Domaine des Calanques » → « au Domaine des Calanques »,
 * « Villa Rose » → « à la Villa Rose », « Orangerie » → « à l'Orangerie »,
 * « Le Pavillon » → « au Pavillon », « Les Jardins » → « aux Jardins ».
 */
export function frenchAt(name: string): string {
  const n = name.trim();
  if (!n) return '';
  if (/^(au|aux|à|a)\s/i.test(n)) return n;
  let m = n.match(/^le\s+(.*)$/i);
  if (m) return `au ${m[1]}`;
  m = n.match(/^les\s+(.*)$/i);
  if (m) return `aux ${m[1]}`;
  m = n.match(/^la\s+(.*)$/i);
  if (m) return `à la ${m[1]}`;
  m = n.match(/^l['’]\s*(.*)$/i);
  if (m) return `à l'${m[1]}`;
  if (/^([aeiouyàâéèêëîïôûüœ]|h[oô]tel)/i.test(n)) return `à l'${n}`;
  const first = n.split(/\s+/)[0].toLowerCase();
  if (FEMININE.has(first)) return `à la ${n}`;
  return `au ${n}`;
}

/**
 * Lieu du mariage pour l'itinéraire d'un événement dont le lieu n'est pas
 * saisi : le Waze / Google Maps de chaque événement mène alors à la Houppa.
 */
export function weddingPlaceQuery(site: WeddingSite): string {
  const { ceremony } = weddingPlaces(site);
  return ceremony ? placeQuery(ceremony) : '';
}
