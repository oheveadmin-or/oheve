import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { mapLegacyPublicSiteToWeddingSite, type LegacyPublicPayload } from '../utils/legacyPublicSite';
import { publicSitesFetchUrl } from '../utils/publicApiUrl';
import { getWeddingSiteBySlug } from '../services/weddingSiteService';
import type { WeddingSite } from '../types';
import { defaultWeddingSections } from '../types';
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
          setSite({ ...local, sections: { ...defaultWeddingSections(), ...(local.sections as object) } });
          return;
        }

        const url = publicSitesFetchUrl(s);
        if (!url) {
          setErr(
            import.meta.env.DEV
              ? "Installez un backend sur /api/public-sites ou créez le site depuis /wedding/build (localStorage)."
              : "Variable VITE_API_BASE_URL manquante ou site introuvable."
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
          setErr(
            json.message === 'Non trouvé'
              ? "Ce mini-site n'existe pas en ligne. Republiez-le depuis l'application (bouton Publier) pour que vos invités puissent y accéder."
              : json.message || "Ce mini-site n'existe pas ou n'est pas encore publié."
          );
          return;
        }

        const d = json.data;
        if (!d) {
          setErr('Réponse serveur invalide.');
          return;
        }

        if ('theme' in d && 'sections' in d && 'language' in d) {
          const site = d as WeddingSite;
          setSite({ ...site, sections: { ...defaultWeddingSections(), ...(site.sections as object) } });
          return;
        }

        setSite(mapLegacyPublicSiteToWeddingSite(d as LegacyPublicPayload));
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setErr(
          import.meta.env.DEV
            ? "Impossible de charger le site (réseau ou API)."
            : "Impossible de joindre l'API."
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

  const coupleLabel = site.coupleName || [site.brideName, site.groomName].filter(Boolean).join(' & ') || 'Mariage';
  const weddingDate = site.date
    ? new Date(site.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const locationLabel = site.city || site.venue || '';
  const description = [coupleLabel, weddingDate, locationLabel].filter(Boolean).join(' · ');
  const pageTitle = `${coupleLabel} — Site de mariage`;
  const heroImage = (site.content as Record<string, unknown> | undefined)?.heroImageUrl as string | undefined;

  // Inject dynamic meta tags for WhatsApp / social previews
  useEffect(() => {
    document.title = pageTitle;
    const setMeta = (property: string, content: string, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('og:title', pageTitle);
    setMeta('og:description', description || 'Retrouvez toutes les informations sur notre mariage.');
    setMeta('og:type', 'website');
    if (heroImage) setMeta('og:image', heroImage);
    setMeta('description', description, 'name');
  }, [pageTitle, description, heroImage]);

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
