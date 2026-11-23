import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { api, formatDate, Similaire, VueClient, VuePresta } from './api';
import { DEMANDES_CSS } from './demandes.css';

const MAX = 2000;
/** Texte de décor flouté : JAMAIS le vrai message (il n'est pas envoyé au navigateur). */
const FAUX_TEXTE = 'Nous aimerions connaître vos disponibilités ainsi que vos tarifs pour la journée, avec les différentes formules proposées. Pouvez-vous nous rappeler ?';

/**
 * Page d'une demande, ouverte depuis un e-mail (lien magique ?t=…).
 * Prestataire : demande complète ou verrouillée (+ paiement).
 * Client : conversation + réponses du prestataire.
 */
export default function DemandePage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const storageKey = `oheve-demande-${id}`;
  const [token] = useState<string | null>(() => {
    const fromUrl = params.get('t');
    try {
      if (fromUrl) sessionStorage.setItem(storageKey, fromUrl);
      return fromUrl ?? sessionStorage.getItem(storageKey);
    } catch {
      return fromUrl;
    }
  });
  const paiement = params.get('paiement');
  const [vue, setVue] = useState<VuePresta | VueClient | null>(null);
  const [erreur, setErreur] = useState<{ status: number; message: string } | null>(null);
  const [attentePaiement, setAttentePaiement] = useState(paiement === 'ok');

  // Le jeton ne reste pas dans la barre d'adresse (historique, partage d'écran).
  useEffect(() => {
    if (params.has('t')) {
      const next = new URLSearchParams(params);
      next.delete('t');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const charger = useCallback(async () => {
    if (!id) return null;
    const r = await api<VuePresta | VueClient>(`/api/demandes/${id}`, { linkToken: token });
    if (r.ok && r.data) { setVue(r.data); setErreur(null); return r.data; }
    setErreur({ status: r.status, message: r.message ?? 'Impossible de charger la demande.' });
    return null;
  }, [id, token]);

  useEffect(() => { void charger(); }, [charger]);

  // Retour de Stripe : on n'affiche « débloquée » que quand le SERVEUR l'a
  // confirmé (webhook signé), jamais sur la seule foi de la redirection.
  useEffect(() => {
    if (!attentePaiement) return;
    let essais = 0;
    const t = setInterval(async () => {
      essais++;
      const v = await charger();
      if ((v && v.role === 'prestataire' && !v.verrouillee) || essais >= 20) {
        clearInterval(t);
        setAttentePaiement(false);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [attentePaiement, charger]);

  return (
    <div className="dm-root">
      <style>{DEMANDES_CSS}</style>
      <a className="dm-logo" href="/">Oheve</a>
      <div className="dm-wrap">
        {!vue && !erreur && <div className="dm-card"><p className="dm-sub">Chargement de la demande…</p></div>}
        {erreur && !vue && <ErreurCard status={erreur.status} message={erreur.message} />}
        {paiement === 'annule' && vue?.role === 'prestataire' && vue.verrouillee && (
          <div className="dm-alert dm-alert-info">Paiement annulé : aucun montant n'a été débité.</div>
        )}
        {attentePaiement && vue?.role === 'prestataire' && vue.verrouillee && (
          <div className="dm-alert dm-alert-info">Paiement reçu par Stripe, confirmation en cours… La demande s'ouvrira automatiquement.</div>
        )}
        {vue?.role === 'prestataire' && <VuePrestataire vue={vue} token={token} recharger={charger} />}
        {vue?.role === 'client' && <VueDuClient vue={vue} token={token} recharger={charger} />}
        <p className="dm-foot">Oheve · <a href="/">ohevewedding.com</a></p>
      </div>
    </div>
  );
}

function ErreurCard({ status, message }: { status: number; message: string }) {
  return (
    <div className="dm-card">
      <h1 className="dm-h1">{status === 401 ? 'Lien expiré' : 'Demande indisponible'}</h1>
      <p className="dm-sub" style={{ marginBottom: 14 }}>{message}</p>
      <p className="dm-sub">Ouvrez l'application Oheve et connectez-vous : vos demandes s'y trouvent dans « Mes demandes ».</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function VuePrestataire({ vue, token, recharger }: { vue: VuePresta; token: string | null; recharger: () => Promise<unknown> }) {
  const [paiementEnCours, setPaiementEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Sur le web : déblocage à l'unité seulement. L'abonnement se prend
  // uniquement dans l'application (achat intégré App Store / Play).
  async function debloquer() {
    setErreur(null);
    setPaiementEnCours(true);
    const r = await api<{ url: string }>(`/api/demandes/${vue.id}/checkout`, { method: 'POST', body: { type: 'deblocage' }, linkToken: token });
    if (r.ok && r.data?.url) { window.location.href = r.data.url; return; }
    setPaiementEnCours(false);
    if (r.status === 409) { await recharger(); }
    setErreur(r.message ?? 'Le paiement n\'a pas pu démarrer. Réessayez.');
  }

  return (
    <>
      <div className="dm-stat">
        Vous avez reçu <strong>{vue.total_demandes_recues} demande{vue.total_demandes_recues > 1 ? 's' : ''}</strong> sur Oheve
        {vue.fiche.business_name ? <> pour <strong>{vue.fiche.business_name}</strong></> : null}.
      </div>

      <div className="dm-card">
        <p className="dm-label">Demande de</p>
        <h1 className="dm-h1">{vue.client.prenom}</h1>
        <p className="dm-sub">Reçue le {formatDate(vue.created_at, true)}</p>

        {vue.verrouillee ? (
          <>
            <div className="dm-quote" style={{ marginTop: 16 }}>
              {vue.apercu}
              <div className="dm-blur" aria-hidden="true">{FAUX_TEXTE}</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="dm-row"><span>E-mail</span><span className="dm-masked">••••••••@••••.••</span></div>
              <div className="dm-row"><span>Téléphone</span><span className="dm-masked">•• •• •• •• ••</span></div>
            </div>
            <p className="dm-lockline">🔒 Vous avez utilisé vos {vue.free_limit} demandes offertes. Débloquez cette demande pour la lire et contacter {vue.client.prenom}, ou abonnez-vous dans l'application Oheve pour recevoir toutes vos demandes.</p>
            {erreur && <div className="dm-alert dm-alert-err" style={{ marginTop: 12 }}>{erreur}</div>}
            {vue.deblocage_unite_disponible && (
              <div className="dm-btns">
                <button className="dm-btn dm-btn-primary" disabled={paiementEnCours} onClick={debloquer}>
                  {paiementEnCours ? 'Redirection vers le paiement…' : 'Débloquer cette demande'}
                </button>
              </div>
            )}
            {vue.deblocage_unite_disponible && (
              <p className="dm-sub" style={{ marginTop: 10, fontSize: 12, textAlign: 'center' }}>Paiement sécurisé par Stripe.</p>
            )}
          </>
        ) : (
          <>
            <div style={{ marginTop: 14 }}>
              {vue.client.email
                ? <div className="dm-row"><span>E-mail</span><a href={`mailto:${vue.client.email}`}>{vue.client.email}</a></div>
                : <div className="dm-row"><span>E-mail</span><span className="dm-sub">Non transmis — répondez sur Oheve</span></div>}
              {vue.client.phone && <div className="dm-row"><span>Téléphone</span><a href={`tel:${vue.client.phone.replace(/\s+/g, '')}`}>{vue.client.phone}</a></div>}
            </div>
            {vue.statut === 'gratuite' && vue.numero_gratuit && (
              <p className="dm-sub" style={{ marginTop: 8, fontSize: 12 }}>Demande offerte par Oheve ({vue.numero_gratuit}/{vue.free_limit})</p>
            )}
          </>
        )}
      </div>

      {!vue.verrouillee && (
        <Conversation demandeId={vue.id} token={token} messages={vue.messages} moi="prestataire" autre={vue.client.prenom} recharger={recharger} />
      )}

      <AppBanner demandeId={vue.id} />
    </>
  );
}

const APP_STORE_URL = 'https://apps.apple.com/fr/app/oheve/id6785535857';

/** Encadré « application Oheve » : le prestataire est invité à passer dans l'app. */
function AppBanner({ demandeId }: { demandeId: number }) {
  return (
    <div className="dm-card dm-app">
      <p className="dm-app-title">Gérez vos demandes dans l'application Oheve</p>
      <p className="dm-sub">Toutes vos demandes au même endroit, une notification à chaque nouveau message, et votre fiche à jour en quelques secondes.</p>
      <div className="dm-btns">
        <a className="dm-btn dm-btn-dark" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Télécharger l'app Oheve</a>
        <a className="dm-app-open" href={`monapp://prestataire/demandes/${demandeId}`}>J'ai déjà l'application : l'ouvrir</a>
      </div>
      <p className="dm-sub" style={{ fontSize: 12, marginTop: 8 }}>Disponible sur l'App Store (iPhone)</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function VueDuClient({ vue, token, recharger }: { vue: VueClient; token: string | null; recharger: () => Promise<unknown> }) {
  const [similaires, setSimilaires] = useState<{ titre_rapides: boolean; prestataires: Similaire[] } | null>(null);
  useEffect(() => {
    if (!vue.sans_reponse_48h) return;
    void api<{ titre_rapides: boolean; prestataires: Similaire[] }>(`/api/demandes/${vue.id}/similaires`, { linkToken: token })
      .then((r) => { if (r.ok && r.data) setSimilaires(r.data); });
  }, [vue.id, vue.sans_reponse_48h, token]);

  return (
    <>
      <div className="dm-card">
        <p className="dm-label">Votre demande à</p>
        <h1 className="dm-h1">
          <Link to={`/prestataire/${vue.prestataire.user_id}`} style={{ color: 'inherit' }}>{vue.prestataire.business_name}</Link>
        </h1>
        <p className="dm-sub">Envoyée le {formatDate(vue.created_at, true)}{vue.a_repondu ? ' · Répondu' : ' · En attente de réponse'}</p>
      </div>

      {vue.sans_reponse_48h && similaires && similaires.prestataires.length > 0 && (
        <div className="dm-card">
          <p style={{ margin: 0, fontWeight: 600 }}>
            {similaires.titre_rapides
              ? 'Pas encore de réponse ? Voici des prestataires qui répondent rapidement'
              : 'Pas encore de réponse ? Voici d\'autres prestataires similaires'}
          </p>
          <div className="dm-sim">
            {similaires.prestataires.map((p) => (
              <Link key={p.user_id} to={`/prestataire/${p.user_id}`}>
                {p.cover_url ? <img src={p.cover_url} alt="" loading="lazy" /> : <div className="dm-sim-ph" />}
                <div className="dm-sim-txt">
                  {p.business_name}
                  {p.city && <span>{p.city}</span>}
                  {p.repond_vite && <em className="dm-badge" style={{ fontStyle: 'normal' }}>Répond en général sous 24 h</em>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Conversation demandeId={vue.id} token={token} messages={vue.messages} moi="client" autre={vue.prestataire.business_name} recharger={recharger} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Conversation({ demandeId, token, messages, moi, autre, recharger }: {
  demandeId: number;
  token: string | null;
  messages: VuePresta['messages'];
  moi: 'client' | 'prestataire';
  autre: string;
  recharger: () => Promise<unknown>;
}) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; msg: string } | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  async function envoyer() {
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    setRetour(null);
    const r = await api(`/api/demandes/${demandeId}/messages`, { method: 'POST', body: { contenu: texte }, linkToken: token });
    setEnvoi(false);
    if (r.ok) {
      setTexte('');
      setRetour({ ok: true, msg: moi === 'prestataire' ? `Réponse envoyée à ${autre}.` : 'Message envoyé.' });
      await recharger();
      finRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setRetour({ ok: false, msg: r.message ?? 'Envoi impossible. Réessayez.' });
    }
  }

  return (
    <div className="dm-card">
      <p className="dm-label">Conversation</p>
      <div className="dm-thread">
        {messages.map((m) => (
          <div key={m.id} className={`dm-msg ${m.auteur === moi ? 'dm-msg-me' : 'dm-msg-them'}`}>
            {m.contenu || (m.file_name ? `📎 ${m.file_name}` : '')}
            {m.file_url && m.contenu ? <><br /><a href={m.file_url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>📎 {m.file_name ?? 'Pièce jointe'}</a></> : null}
            {m.file_url && !m.contenu ? <><br /><a href={m.file_url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>Ouvrir</a></> : null}
            <small>{m.auteur === moi ? 'Vous' : autre} · {formatDate(m.created_at, true)}</small>
          </div>
        ))}
        <div ref={finRef} />
      </div>
      <div style={{ marginTop: 16 }}>
        <textarea
          className="dm-textarea"
          value={texte}
          maxLength={MAX}
          placeholder={moi === 'prestataire' ? `Votre réponse à ${autre}…` : 'Votre message…'}
          onChange={(e) => setTexte(e.target.value)}
        />
        <div className="dm-counter">{texte.length} / {MAX}</div>
        {retour && <div className={`dm-alert ${retour.ok ? 'dm-alert-ok' : 'dm-alert-err'}`} style={{ marginBottom: 10 }}>{retour.msg}</div>}
        <button className="dm-btn dm-btn-primary" disabled={!texte.trim() || envoi} onClick={envoyer}>
          {envoi ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
