import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { api } from './api';
import { DEMANDES_CSS } from './demandes.css';

type Fiche = {
  user_id: number;
  business_name: string;
  category: string;
  description: string | null;
  location_city: string | null;
  price_range?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  cover_url?: string | null;
  avatar_url?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  is_partner?: boolean | null;
};

type Media = { id: number; url: string; is_cover?: boolean; caption?: string | null; media_type?: 'image' | 'video' | null };

// Mêmes libellés que l'app (MonApp/lib/presta-categories.ts).
const CATEGORIES: Record<string, string> = {
  salle: 'Salle / Lieu', traiteur: 'Traiteur', photo: 'Photo & Vidéo', musique: 'Musique / DJ',
  fleuriste: 'Déco & Fleurs', beaute: 'Beauté', tenues: 'Tenues', transport: 'Transport',
  juif: 'Mariage Juif', 'chabbat-hattan': 'Chabbat Hattan', patisserie: 'Pâtisserie',
  planner: 'Wedding Planner', animation: 'Animation', autre: 'Autre',
};
const categoryLabel = (c?: string | null) => (c ? CATEGORIES[c] ?? c.charAt(0).toUpperCase() + c.slice(1) : '');

function priceLabel(f: Fiche): string {
  if (f.price_range?.trim()) return f.price_range.trim();
  const min = Number(f.price_min) || 0;
  const max = Number(f.price_max) || 0;
  if (min && max) return `${min} – ${max} €`;
  if (min) return `À partir de ${min} €`;
  return '';
}

const isVideo = (m: Media) => m.media_type === 'video';

/**
 * Fiche publique d'un prestataire (lien des e-mails, QR code et lien de la
 * brochure PDF) : ce que voit un client, avec TOUT le portfolio, comme le
 * profil du prestataire dans l'app (photo ronde, infos, grille de photos et
 * vidéos qu'on ouvre en grand).
 */
export default function FichePrestatairePage() {
  const { id } = useParams<{ id: string }>();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [erreur, setErreur] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const enc = encodeURIComponent(id);
    void api<Fiche>(`/api/prestataires/${enc}`).then((r) => {
      if (r.ok && r.data) setFiche(r.data); else setErreur(true);
    });
    // Portfolio public (l'échec n'empêche pas d'afficher la fiche).
    void api<Media[]>(`/api/prestataires/${enc}/photos`).then((r) => {
      if (r.ok && Array.isArray(r.data)) {
        // Couverture en premier, puis le reste dans l'ordre du prestataire.
        const list = r.data.filter((m) => !!m.url);
        setMedia([...list.filter((m) => m.is_cover), ...list.filter((m) => !m.is_cover)]);
      }
    });
  }, [id]);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => {
    setOpen((i) => (i === null || media.length === 0 ? i : (i + d + media.length) % media.length));
  }, [media.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, close, step]);

  const ouvrirApp = () => { if (id) window.location.href = `monapp://providers/${id}`; };

  const firstImage = media.find((m) => !isVideo(m));
  const avatar = firstImage?.url || fiche?.cover_url || fiche?.avatar_url || null;
  const nbPhotos = media.filter((m) => !isVideo(m)).length;
  const nbVideos = media.length - nbPhotos;
  const prix = fiche ? priceLabel(fiche) : '';
  const insta = fiche?.instagram_url?.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/+$/, '');
  const site = fiche?.website_url?.trim();
  const current = open !== null ? media[open] : null;

  return (
    <div className="dm-root">
      <style>{DEMANDES_CSS}{FICHE_CSS}</style>
      <a className="dm-logo" href="/">Oheve</a>
      <div className="dm-wrap">
        {!fiche && !erreur && <div className="dm-card"><p className="dm-sub">Chargement…</p></div>}
        {erreur && <div className="dm-card"><h1 className="dm-h1">Fiche introuvable</h1><p className="dm-sub">Ce prestataire n'est plus référencé sur Oheve.</p></div>}
        {fiche && (
          <div className="dm-card fp-card">
            <div className="fp-head">
              {avatar
                ? <img className="fp-avatar" src={avatar} alt="" />
                : <div className="fp-avatar fp-avatar-empty">{fiche.business_name?.[0]?.toUpperCase() ?? '?'}</div>}
              <div className="fp-stats">
                <div><strong>{nbPhotos}</strong><span>photo{nbPhotos > 1 ? 's' : ''}</span></div>
                {nbVideos > 0 && <div><strong>{nbVideos}</strong><span>vidéo{nbVideos > 1 ? 's' : ''}</span></div>}
              </div>
            </div>

            <div className="fp-body">
              <h1 className="dm-h1">{fiche.business_name}</h1>
              <div className="fp-tags">
                {fiche.category && <span className="fp-tag">{categoryLabel(fiche.category)}</span>}
                {fiche.is_partner && <span className="fp-tag fp-tag-partner">Partenaire Oheve</span>}
              </div>
              {(fiche.location_city || prix) && (
                <p className="dm-sub fp-meta">{[fiche.location_city ? `📍 ${fiche.location_city}` : '', prix ? `💶 ${prix}` : ''].filter(Boolean).join('   ')}</p>
              )}
              {fiche.description && <p className="fp-desc">{fiche.description}</p>}
              {(insta || site) && (
                <p className="fp-links">
                  {insta && <a href={`https://instagram.com/${insta}`} target="_blank" rel="noreferrer">@{insta}</a>}
                  {site && <a href={/^https?:\/\//.test(site) ? site : `https://${site}`} target="_blank" rel="noreferrer">{site.replace(/^https?:\/\//, '')}</a>}
                </p>
              )}
              <div className="dm-btns">
                <button className="dm-btn dm-btn-primary" onClick={ouvrirApp}>Contacter via l'application Oheve</button>
              </div>
            </div>

            {media.length > 0 && (
              <>
                <div className="fp-section">Portfolio · {media.length} publication{media.length > 1 ? 's' : ''}</div>
                <div className="fp-grid">
                  {media.map((m, i) => (
                    <button key={m.id} className="fp-cell" onClick={() => setOpen(i)} aria-label={m.caption || `Voir la publication ${i + 1}`}>
                      {isVideo(m)
                        ? <video src={`${m.url}#t=0.5`} muted playsInline preload="metadata" />
                        : <img src={m.url} alt={m.caption ?? ''} loading="lazy" />}
                      {isVideo(m) && <span className="fp-play">▶</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {current && (
        <div className="fp-lb" onClick={close} role="dialog" aria-modal="true">
          <button className="fp-lb-close" onClick={close} aria-label="Fermer">✕</button>
          {media.length > 1 && (
            <>
              <button className="fp-lb-nav fp-lb-prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Précédente">‹</button>
              <button className="fp-lb-nav fp-lb-next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Suivante">›</button>
            </>
          )}
          <div className="fp-lb-inner" onClick={(e) => e.stopPropagation()}>
            {isVideo(current)
              ? <video key={current.id} src={current.url} controls autoPlay playsInline />
              : <img key={current.id} src={current.url} alt={current.caption ?? ''} />}
            {current.caption && <p className="fp-lb-cap">{current.caption}</p>}
            <p className="fp-lb-count">{(open ?? 0) + 1} / {media.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const FICHE_CSS = `
.fp-card { padding: 0; overflow: hidden; }
.fp-head { display: flex; align-items: center; gap: 22px; padding: 22px 22px 6px; }
.fp-avatar { width: 92px; height: 92px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid #929B83; padding: 3px; background: #fff; }
.fp-avatar-empty { display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', Georgia, serif; font-size: 34px; color: #747E68; background: #F1EDE4; }
.fp-stats { display: flex; gap: 26px; }
.fp-stats div { display: flex; flex-direction: column; align-items: center; }
.fp-stats strong { font-size: 20px; font-weight: 700; }
.fp-stats span { font-size: 13px; color: #6F7168; }
.fp-body { padding: 12px 22px 22px; }
.fp-tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 8px; }
.fp-tag { font-size: 12px; font-weight: 600; color: #4E5545; background: #F1EDE4; border-radius: 999px; padding: 4px 10px; }
.fp-tag-partner { color: #fff; background: #747E68; }
.fp-meta { white-space: pre-wrap; }
.fp-desc { white-space: pre-wrap; line-height: 1.6; margin: 12px 0 0; overflow-wrap: anywhere; }
.fp-links { display: flex; flex-wrap: wrap; gap: 14px; margin: 10px 0 0; font-size: 14px; }
.fp-links a { color: #747E68; font-weight: 600; text-decoration: none; overflow-wrap: anywhere; }
.fp-section { padding: 14px 22px 10px; border-top: 1px solid #E4DED2; font-family: 'Fraunces', Georgia, serif; font-size: 17px; }
.fp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
.fp-cell { position: relative; aspect-ratio: 1; padding: 0; border: 0; background: #EFEAE0; cursor: pointer; overflow: hidden; display: block; }
.fp-cell img, .fp-cell video { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.fp-play { position: absolute; top: 6px; right: 8px; color: #fff; font-size: 14px; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
.fp-lb { position: fixed; inset: 0; z-index: 2000; background: rgba(20,20,18,.94); display: flex; align-items: center; justify-content: center; padding: 48px 12px; }
.fp-lb-inner { max-width: 100%; max-height: 100%; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.fp-lb-inner img, .fp-lb-inner video { max-width: min(100%, 960px); max-height: calc(100vh - 150px); object-fit: contain; border-radius: 6px; }
.fp-lb-cap { color: #F6F2EA; text-align: center; margin: 0; max-width: 640px; line-height: 1.5; overflow-wrap: anywhere; }
.fp-lb-count { color: #A9A89F; font-size: 12px; margin: 0; }
.fp-lb-close { position: absolute; top: 12px; right: 14px; background: none; border: 0; color: #fff; font-size: 26px; cursor: pointer; }
.fp-lb-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; border: 0; background: rgba(255,255,255,.14); color: #fff; font-size: 30px; line-height: 1; cursor: pointer; }
.fp-lb-prev { left: 10px; } .fp-lb-next { right: 10px; }
@media (max-width: 420px) {
  .fp-head { gap: 16px; padding: 18px 16px 4px; }
  .fp-avatar { width: 78px; height: 78px; }
  .fp-body { padding: 10px 16px 18px; }
  .fp-section { padding: 12px 16px 8px; }
  .fp-lb-nav { width: 38px; height: 38px; font-size: 26px; }
}
`;
