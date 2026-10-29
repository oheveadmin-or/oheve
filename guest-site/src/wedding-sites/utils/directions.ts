/** Liens d'itinéraire : ceux saisis par le couple, sinon une recherche sur l'adresse. */
export function directionsLinks(place: string, googleMapsUrl?: string, wazeUrl?: string): { google?: string; waze?: string } {
  const q = place.trim();
  return {
    google: googleMapsUrl?.trim() || (q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : undefined),
    waze: wazeUrl?.trim() || (q ? `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes` : undefined),
  };
}
