import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { mapLegacyPublicSiteToWeddingSite, type LegacyPublicPayload } from '../utils/legacyPublicSite';
import { publicSitesFetchUrl } from '../utils/publicApiUrl';
import { getWeddingSiteBySlug } from '../services/weddingSiteService';
import type { WeddingSite } from '../types';
import { getTemplateByTheme } from '../utils/template-selector';

export function WeddingPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<WeddingSite | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = slug ?? '';
    if (!s) {
      setLoading(false);
      setErr('Slug manquant.');
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        const local = await getWeddingSiteBySlug(s);
        if (local) {
          setSite(local);
          return;
        }

        const url = publicSitesFetchUrl(s);
        if (!url) {
          setErr(
            import.meta.env.DEV
              ? 'Installez un backend sur /api/public-sites ou créez le site depuis /wedding/build (localStorage).'
              : 'Variable VITE_API_BASE_URL manquante ou site introuvable.'
          );
          return;
        }

        const res = await fetch(url, { signal: ac.signal });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: LegacyPublicPayload | WeddingSite;
          message?: string;
        };

        if (!res.ok) {
          setErr(json.message || 'Ce mini-site n’existe pas ou n’est pas encore publié.');
          return;
        }

        const d = json.data;
        if (!d) {
          setErr('Réponse serveur invalide.');
          return;
        }

        if ('theme' in d && 'sections' in d && 'language' in d) {
          setSite(d as WeddingSite);
          return;
        }

        setSite(mapLegacyPublicSiteToWeddingSite(d as LegacyPublicPayload));
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setErr(
          import.meta.env.DEV
            ? 'Impossible de charger le site (réseau ou API).'
            : 'Impossible de joindre l’API.'
        );
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [slug]);

  if (loading) {
    return (
      <main style={center}>
        <p>Chargement…</p>
      </main>
    );
  }

  if (err || !site) {
    return (
      <main style={center}>
        <p style={{ color: '#991b1b', maxWidth: 420 }}>{err || 'Introuvable.'}</p>
      </main>
    );
  }

  const Template = getTemplateByTheme(site.theme, site.language);
  return <Template site={site} />;
}

const center: CSSProperties = {
  minHeight: '60vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  textAlign: 'center',
};
