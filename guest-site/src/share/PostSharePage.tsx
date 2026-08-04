import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const SAGE = '#A7AD9A';
const MOKA = '#3d2e1f';
const MOKA_MID = '#6b5344';
const IVORY = '#faf8f3';

/**
 * Lien de téléchargement de l'app. À remplacer par le vrai lien App Store
 * dès qu'il est disponible ; en attendant on renvoie vers la page d'accueil.
 */
const APP_DOWNLOAD_URL = 'https://oheve.pages.dev';

/** Deep link vers le post dans l'app (scheme déclaré dans app.json). */
const appDeepLink = (photoId: string) => `monapp://p/${photoId}`;

type PublicPost = {
  id: number;
  url: string;
  caption: string | null;
  media_type: 'image' | 'video' | null;
  business_name: string;
  category: string;
  prenom: string;
  nom: string;
  like_count: number;
};

function apiBase(): string {
  if (import.meta.env.DEV) return '';
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
}

export default function PostSharePage() {
  const { photoId } = useParams<{ photoId: string }>();
  const [post, setPost] = useState<PublicPost | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!photoId) { setState('error'); return; }
    fetch(`${apiBase()}/api/prestataires/photos/${encodeURIComponent(photoId)}/public`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json.data) { setPost(json.data as PublicPost); setState('ok'); }
        else setState('error');
      })
      .catch(() => setState('error'));
  }, [photoId]);

  // Sur mobile, on tente d'ouvrir l'app directement : si elle est installée,
  // iOS/Android basculent dessus ; sinon rien ne se passe et la page reste
  // affichée avec le bouton de téléchargement.
  useEffect(() => {
    if (!photoId || state !== 'ok') return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;
    const t = setTimeout(() => { window.location.href = appDeepLink(photoId); }, 400);
    return () => clearTimeout(t);
  }, [photoId, state]);

  const openApp = () => {
    if (photoId) window.location.href = appDeepLink(photoId);
  };

  const authorName = post ? `${post.prenom} ${post.nom ? post.nom[0] + '.' : ''}`.trim() : '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${IVORY}; }
        .shp-root {
          min-height: 100vh; display: flex; flex-direction: column; align-items: center;
          padding: 1.5rem 1rem 3rem; font-family: 'Inter', sans-serif; color: ${MOKA};
        }
        .shp-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 600; letter-spacing: 0.12em; margin: 0.8rem 0 1.4rem; }
        .shp-card {
          width: 100%; max-width: 420px; background: #fff; border-radius: 20px; overflow: hidden;
          box-shadow: 0 8px 32px rgba(61,46,31,0.10);
        }
        .shp-media { width: 100%; max-height: 60vh; display: block; object-fit: contain; background: #111; }
        .shp-body { padding: 1.1rem 1.2rem 1.3rem; }
        .shp-author { font-weight: 600; font-size: 0.95rem; }
        .shp-cat {
          display: inline-block; margin-left: 0.5rem; padding: 0.12rem 0.65rem;
          background: #edf2ec; color: #5c6b52; border-radius: 50px; font-size: 0.72rem; font-weight: 600;
        }
        .shp-caption { margin-top: 0.55rem; font-size: 0.95rem; line-height: 1.5; color: ${MOKA_MID}; }
        .shp-likes { margin-top: 0.55rem; font-size: 0.82rem; color: #a09890; }
        .shp-actions { display: flex; flex-direction: column; gap: 0.7rem; width: 100%; max-width: 420px; margin-top: 1.3rem; }
        .shp-btn-primary {
          display: block; text-align: center; padding: 0.95rem 1rem; border: none; cursor: pointer;
          background: ${SAGE}; color: #fff; border-radius: 50px; font-size: 1rem; font-weight: 600;
          font-family: 'Inter', sans-serif; text-decoration: none;
          box-shadow: 0 4px 18px rgba(122,153,117,0.32);
        }
        .shp-btn-ghost {
          display: block; text-align: center; padding: 0.9rem 1rem;
          background: transparent; color: ${MOKA_MID}; border: 1.5px solid rgba(91,70,54,0.22);
          border-radius: 50px; font-size: 0.95rem; font-weight: 600; text-decoration: none;
        }
        .shp-hint { margin-top: 0.9rem; font-size: 0.8rem; color: #a09890; text-align: center; }
        .shp-status { margin-top: 4rem; color: ${MOKA_MID}; text-align: center; }
      `}</style>

      <div className="shp-root">
        <div className="shp-logo">OHEVE</div>

        {state === 'loading' && <p className="shp-status">Chargement de la publication…</p>}

        {state === 'error' && (
          <div className="shp-status">
            <p style={{ marginBottom: '1.2rem' }}>Cette publication n'est plus disponible.</p>
            <a className="shp-btn-primary" href={APP_DOWNLOAD_URL}>Découvrir l'app Oheve</a>
          </div>
        )}

        {state === 'ok' && post && (
          <>
            <div className="shp-card">
              {post.media_type === 'video' ? (
                <video className="shp-media" src={post.url} controls playsInline preload="metadata" />
              ) : (
                <img className="shp-media" src={post.url} alt={post.caption ?? 'Inspiration mariage'} />
              )}
              <div className="shp-body">
                <span className="shp-author">{post.business_name || authorName}</span>
                {post.category && <span className="shp-cat">{post.category}</span>}
                {post.caption && <p className="shp-caption">{post.caption}</p>}
                <p className="shp-likes">♥ {post.like_count} j'aime · partagé depuis l'app Oheve</p>
              </div>
            </div>

            <div className="shp-actions">
              <button className="shp-btn-primary" onClick={openApp}>Ouvrir dans l'app Oheve</button>
              <a className="shp-btn-ghost" href={APP_DOWNLOAD_URL}>Je n'ai pas l'app — la télécharger</a>
            </div>
            <p className="shp-hint">
              Si l'app Oheve est installée, elle s'ouvre directement sur cette publication.
            </p>
          </>
        )}
      </div>
    </>
  );
}
