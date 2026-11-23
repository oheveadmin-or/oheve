import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from './api';
import { DEMANDES_CSS } from './demandes.css';

/**
 * « Ne plus recevoir de demandes ». Un clic de confirmation est demandé : les
 * antivirus de messagerie ouvrent parfois les liens tout seuls, ils ne doivent
 * pas désinscrire quelqu'un à sa place.
 */
export default function DesabonnementPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [etat, setEtat] = useState<'attente' | 'envoi' | 'ok' | 'erreur'>(token ? 'attente' : 'erreur');
  const [message, setMessage] = useState(token ? '' : 'Ce lien de désinscription est incomplet.');

  async function confirmer() {
    setEtat('envoi');
    const r = await api('/api/demandes/unsubscribe', { method: 'POST', body: { token } });
    setEtat(r.ok ? 'ok' : 'erreur');
    setMessage(r.message ?? (r.ok ? '' : 'La désinscription n\'a pas pu être enregistrée. Réessayez.'));
  }

  return (
    <div className="dm-root">
      <style>{DEMANDES_CSS}</style>
      <a className="dm-logo" href="/">Oheve</a>
      <div className="dm-wrap">
        <div className="dm-card">
          <h1 className="dm-h1">Ne plus recevoir d'e-mails</h1>
          {etat === 'ok' ? (
            <div className="dm-alert dm-alert-ok" style={{ marginTop: 10 }}>{message}</div>
          ) : (
            <>
              <p className="dm-sub" style={{ marginBottom: 16 }}>
                Vous ne recevrez plus d'e-mails d'Oheve au sujet des demandes. Vous pourrez toujours les consulter dans l'application.
              </p>
              {etat === 'erreur' && <div className="dm-alert dm-alert-err" style={{ marginBottom: 12 }}>{message}</div>}
              <button className="dm-btn dm-btn-primary" disabled={!token || etat === 'envoi'} onClick={confirmer}>
                {etat === 'envoi' ? 'Enregistrement…' : 'Confirmer la désinscription'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
