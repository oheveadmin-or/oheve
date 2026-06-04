/**
 * Géocodage via Nominatim (OpenStreetMap) — gratuit, sans clé API
 * Limite : 1 requête/seconde pour usage gratuit
 */

export type GeoResult = {
  displayName: string;
  lat: number;
  lon: number;
  city?: string;
  country?: string;
};

export async function searchCity(q: string): Promise<GeoResult[]> {
  if (!q || q.trim().length < 3) return [];

  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: `${q}, France`,
      format: 'json',
      addressdetails: '1',
      limit: '8',
      countrycodes: 'fr',
    }).toString();

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'WeddingPlanner/1.0',
    },
  });

  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      country_code?: string;
    };
  }>;

  return data.map((item) => ({
    displayName: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
    city: item.address?.city || item.address?.town || item.address?.village,
    country: item.address?.country_code?.toUpperCase(),
  }));
}
