import { useEffect, useState } from 'react';
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
  cover_url?: string | null;
};

/** Fiche publique d'un prestataire (lien des e-mails « votre fiche »). */
export default function FichePrestatairePage() {
  const { id } = useParams<{ id: string }>();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!id) return;
    void api<Fiche>(`/api/prestataires/${encodeURIComponent(id)}`).then((r) => {
      if (r.ok && r.data) setFiche(r.data); else setErreur(true);
    });
  }, [id]);

  const ouvrirApp = () => { if (id) window.location.href = `monapp://providers/${id}`; };

  return (
    <div className="dm-root">
      <style>{DEMANDES_CSS}</style>
      <a className="dm-logo" href="/">Ohevé</a>
      <div className="dm-wrap">
        {!fiche && !erreur && <div className="dm-card"><p className="dm-sub">Chargement…</p></div>}
        {erreur && <div className="dm-card"><h1 className="dm-h1">Fiche introuvable</h1><p className="dm-sub">Ce prestataire n'est plus référencé sur Ohevé.</p></div>}
        {fiche && (
          <div className="dm-card" style={{ padding: 0, overflow: 'hidden' }}>
            {fiche.cover_url && <img src={fiche.cover_url} alt="" style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block' }} />}
            <div style={{ padding: 22 }}>
              <h1 className="dm-h1">{fiche.business_name}</h1>
              <p className="dm-sub">{[fiche.category, fiche.location_city].filter(Boolean).join(' · ')}</p>
              {fiche.price_range && <p className="dm-sub" style={{ marginTop: 4 }}>{fiche.price_range}</p>}
              {fiche.description && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginTop: 14, overflowWrap: 'anywhere' }}>{fiche.description}</p>}
              <div className="dm-btns">
                <button className="dm-btn dm-btn-primary" onClick={ouvrirApp}>Contacter via l'application Ohevé</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
