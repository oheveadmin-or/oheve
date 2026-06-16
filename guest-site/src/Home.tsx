import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main style={wrap}>
      <h1 style={h1}>Mini-sites mariage invités</h1>

      <p style={p}>
        <strong>Nouveau :</strong> créez un site personnalisable avec thème, sections et aperçu en direct puis ouvrez{' '}
        <code>/wedding/votre-slug</code>.
      </p>

      <p style={cta}>
        <Link to="/wedding/build" style={btn}>
          Créer un mini-site
        </Link>
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid #e8e4f5', margin: '1.5rem 0' }} />

      <p style={p}>
        Ancienne vue API (toujours dispo sans le préfixe <code>/wedding</code>) : pages à{' '}
        <strong>…/votre-slug</strong> si ton backend expose <code>/api/public-sites/:slug</code>.
      </p>
      <p style={p}>
        En développement, l’API est proxifiée par Vite (voir <code>VITE_DEV_PROXY_API</code>) et{' '}
        <code>VITE_API_BASE_URL</code> pour la prod.
      </p>
      <p style={note}>Votre domaine : <strong>www.ohevewedding.com</strong> — les liens publics seront au format <code>www.ohevewedding.com/wedding/votre-slug</code> une fois le déploiement actif.</p>
    </main>
  );
}

const wrap: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '2rem 1.25rem',
};

const h1: CSSProperties = { fontSize: '1.75rem', marginBottom: '0.75rem' };

const p: CSSProperties = { fontSize: '1rem', opacity: 0.92, lineHeight: 1.55 };

const cta: CSSProperties = { margin: '1rem 0' };

const btn: CSSProperties = {
  display: 'inline-block',
  padding: '0.65rem 1rem',
  borderRadius: 10,
  fontWeight: 700,
  textDecoration: 'none',
  color: '#fff',
  background: 'linear-gradient(120deg, #5b4fd6, #8b5cf6)',
};

const note: CSSProperties = { fontSize: '0.88rem', opacity: 0.8, marginTop: '1.25rem' };
