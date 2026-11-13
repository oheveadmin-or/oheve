/**
 * Bandeau « Se connecter » du builder web, affiché quand aucun jeton n'est
 * présent (créateur ouvert sur ordinateur, hors de l'application) ou quand le
 * serveur a refusé la session. La connexion ne recharge pas la page : les
 * modifications en cours sont conservées.
 *
 * Ce n'est qu'un raccourci d'interface : chaque envoi (photos, musique,
 * publication) reste contrôlé côté serveur par le jeton.
 */
import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';

import { loginForBuilder } from '../services/weddingSiteService';

type Props = {
  onLoggedIn: () => void;
  /** Session refusée en cours de route (plutôt qu'absente dès l'ouverture) */
  expired?: boolean;
};

export function BuilderLogin({ onLoggedIn, expired = false }: Props) {
  const [open, setOpen] = useState(expired);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!login.trim() || !password) {
      setError('Renseignez votre e-mail (ou identifiant) et votre mot de passe.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await loginForBuilder(login, password);
    setBusy(false);
    if (r.ok) {
      setPassword('');
      onLoggedIn();
    } else {
      setError(r.message);
    }
  }

  return (
    <div style={box} role="region" aria-label="Connexion au compte Oheve">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 240px', minWidth: 0 }}>
          🔒 <strong>{expired ? 'Votre session a expiré.' : 'Vous n’êtes pas connecté.'}</strong>{' '}
          Connectez-vous à votre compte Oheve pour envoyer vos photos, votre musique et publier le site.
        </span>
        {!open && (
          <button type="button" style={primaryBtn} onClick={() => setOpen(true)}>
            Se connecter
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.6rem', marginTop: '0.85rem' }} noValidate>
          <label style={label}>
            E-mail ou identifiant
            <input
              style={input}
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={busy}
            />
          </label>
          <label style={label}>
            Mot de passe
            <input
              style={input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          {error && (
            <p role="alert" style={{ margin: 0, color: '#b91c1c', fontSize: '0.84rem', lineHeight: 1.45 }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" style={primaryBtn} disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
            <span style={{ fontSize: '0.78rem', color: '#7c6a3a', lineHeight: 1.4 }}>
              Inscrit avec Google ou Apple ? Ouvrez le créateur depuis l’application Oheve.
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

const box: CSSProperties = {
  background: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 12,
  padding: '0.85rem 1rem',
  margin: '0.25rem 0 1rem',
  fontSize: '0.88rem',
  color: '#78350f',
  lineHeight: 1.5,
};
const label: CSSProperties = { display: 'grid', gap: 4, fontSize: '0.8rem', fontWeight: 600, color: '#5b4a1f' };
const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.6rem 0.75rem',
  borderRadius: 10,
  border: '1px solid #e7d9a8',
  fontSize: '1rem',
  background: '#fff',
  color: '#222',
};
const primaryBtn: CSSProperties = {
  padding: '0.55rem 1.1rem',
  borderRadius: 999,
  border: 'none',
  background: '#8b9a6b',
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.88rem',
  cursor: 'pointer',
};
