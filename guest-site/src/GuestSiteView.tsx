import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'react-router-dom';

import { formatWeddingDate } from '@guest/wedding-sites/utils/date';
import { publicSitesFetchUrl } from '@guest/wedding-sites/utils/publicApiUrl';

type PublicPayload = {
  slug: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  templateId: string;
  customText: string;
};

export default function GuestSiteView() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = publicSitesFetchUrl(slug ?? '');
    if (!url) {
      setLoading(false);
      setErr(
        import.meta.env.DEV
          ? 'Lien incomplet.'
          : 'Variable VITE_API_BASE_URL manquante. Copie .env.example vers .env et indique l’URL de ton API (build prod).'
      );
      return;
    }

    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(url, {
          signal: ac.signal,
        });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: PublicPayload;
          message?: string;
        };
        if (!res.ok) {
          setErr(json.message || 'Ce mini-site n’existe pas ou n’est pas encore publié.');
          return;
        }
        if (!json.data) {
          setErr('Réponse serveur invalide.');
          return;
        }
        setData(json.data);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setErr(
          import.meta.env.DEV
            ? 'Impossible de joindre l’API (proxy Vite → backend). Vérifie que le backend tourne et VITE_DEV_PROXY_API si besoin.'
            : 'Impossible de joindre l’API. Vérifie VITE_API_BASE_URL et le réseau.'
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

  if (err) {
    return (
      <main style={center}>
        <p style={errText}>{err}</p>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main style={page}>
      <header style={header}>
        <p style={kicker}>Avec joie</p>
        <h1 style={title}>
          {data.brideName} <span style={amp}>&</span> {data.groomName}
        </h1>
        <p style={meta}>{formatWeddingDate(data.weddingDate, 'fr')}</p>
        {data.location ? <p style={loc}>{data.location}</p> : null}
      </header>
      {data.customText ? (
        <section style={card}>
          <p style={invite}>{data.customText}</p>
        </section>
      ) : null}
    </main>
  );
}

const center: CSSProperties = {
  minHeight: '60vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  textAlign: 'center',
};

const errText: CSSProperties = { color: '#991b1b', maxWidth: 420 };

const page: CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  padding: '2.5rem 1.25rem 4rem',
};

const header: CSSProperties = { textAlign: 'center', marginBottom: '2rem' };

const kicker: CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  fontSize: '0.75rem',
  color: '#6D5CE8',
  fontWeight: 700,
  marginBottom: '0.5rem',
};

const title: CSSProperties = {
  fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
  fontWeight: 800,
  lineHeight: 1.2,
  margin: '0 0 0.75rem',
};

const amp: CSSProperties = { fontWeight: 500, color: '#7c3aed' };

const meta: CSSProperties = { fontSize: '1.1rem', fontWeight: 600, margin: '0.25rem 0' };

const loc: CSSProperties = { fontSize: '1rem', opacity: 0.85, margin: 0 };

const card: CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: '1.5rem 1.25rem',
  border: '1px solid #ece8ff',
  boxShadow: '0 12px 40px rgba(91, 79, 214, 0.08)',
};

const invite: CSSProperties = {
  fontSize: '1.05rem',
  margin: 0,
  whiteSpace: 'pre-wrap',
  textAlign: 'center',
};
