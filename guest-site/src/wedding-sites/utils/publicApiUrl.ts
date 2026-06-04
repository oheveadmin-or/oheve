/** URL publique `/api/public-sites/:slug` — partagée entre ancienne vue et `WeddingPublicPage`. */
export function publicSitesFetchUrl(slug: string): string | null {
  if (!slug) return null;
  if (import.meta.env.DEV) {
    return `/api/public-sites/${encodeURIComponent(slug)}`;
  }
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
  if (!base) return null;
  return `${base}/api/public-sites/${encodeURIComponent(slug)}`;
}
