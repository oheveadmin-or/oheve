/**
 * Liens « enveloppe à votre nom » : un lien par invité. En l'ouvrant, son nom
 * s'écrit à la main sur l'enveloppe cachetée avant qu'il ne brise le sceau.
 *
 * Les noms viennent de la liste d'invités de l'app (GET /api/guests, session du
 * propriétaire) ou sont tapés ici. Rien n'est enregistré dans le site public :
 * le nom voyage uniquement dans le lien de chaque invité.
 */
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { listOwnerGuests } from '../services/weddingSiteService';
import { cleanGuestName, guestInviteUrl } from '../utils/guestName';

type Props = {
  slug: string;
  accessKey?: string | null;
  coupleLabel: string;
  /** Rejoue l'enveloppe dans l'aperçu avec ce nom */
  onPreview: (name: string) => void;
};

type Row = { id: string; name: string; group: string };

export function GuestEnvelopeLinks({ slug, accessKey, coupleLabel, onPreview }: Props) {
  const [guests, setGuests] = useState<Row[]>([]);
  const [extra, setExtra] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftName, setDraftName] = useState('');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listOwnerGuests().then((list) => {
      if (!alive) return;
      setGuests(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    const all = [...extra, ...guests];
    const q = query.trim().toLowerCase();
    return q ? all.filter((r) => r.name.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)) : all;
  }, [extra, guests, query]);

  const origin = window.location.origin;
  const linkFor = (name: string) => guestInviteUrl(origin, slug, name, accessKey);
  const messageFor = (name: string) =>
    `${name}, vous êtes invité(e) au mariage de ${coupleLabel} 💌\nOuvrez votre invitation : ${linkFor(name)}`;

  function addName() {
    const name = cleanGuestName(draftName);
    if (!name) return;
    setExtra((prev) => [{ id: `extra-${Date.now()}`, name, group: '' }, ...prev]);
    setDraftName('');
  }

  async function copy(row: Row) {
    try {
      await navigator.clipboard.writeText(linkFor(row.name));
      setCopied(row.id);
      window.setTimeout(() => setCopied((c) => (c === row.id ? null : c)), 1800);
    } catch {
      window.prompt('Copiez ce lien :', linkFor(row.name));
    }
  }

  return (
    <div style={wrap}>
      <p style={title}>✍️ Une enveloppe au nom de chaque invité</p>
      <p style={hint}>
        Envoyez à chacun son propre lien : en l'ouvrant, son nom s'écrit à la main sur l'enveloppe, avant qu'il
        ne brise le sceau.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addName();
            }
          }}
          maxLength={60}
          placeholder="Nom de l'invité (ex. Famille Cohen)"
          style={input}
        />
        <button type="button" onClick={addName} style={primaryBtn} disabled={!cleanGuestName(draftName)}>
          Ajouter
        </button>
      </div>

      {guests.length + extra.length > 6 ? (
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 Rechercher un invité" style={{ ...input, marginBottom: 10 }} />
      ) : null}

      {loading ? (
        <p style={hint}>Chargement de votre liste d'invités…</p>
      ) : guests.length === 0 && extra.length === 0 ? (
        <p style={hint}>
          Aucun invité dans votre liste pour l'instant : ajoutez un nom ci-dessus, ou remplissez la liste « Invités »
          de l'application, elle apparaîtra ici.
        </p>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
        {rows.map((row) => (
          <div key={row.id} style={rowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={rowName} dir="auto">{row.name}</p>
              {row.group ? <p style={rowGroup}>{row.group}</p> : null}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => onPreview(row.name)} style={ghostBtn}>
                ▶ Voir
              </button>
              <button type="button" onClick={() => copy(row)} style={ghostBtn}>
                {copied === row.id ? '✓ Copié' : '📋 Copier'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(messageFor(row.name))}`}
                target="_blank"
                rel="noreferrer"
                style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                WhatsApp
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const wrap: CSSProperties = { marginTop: '1.25rem', padding: '0.9rem', background: '#fff', borderRadius: 12, border: '1px solid #d1fae5' };
const title: CSSProperties = { fontSize: '0.92rem', fontWeight: 800, color: '#166534', margin: '0 0 4px' };
const hint: CSSProperties = { fontSize: '0.8rem', color: '#4b6b55', lineHeight: 1.5, margin: '0 0 10px' };
const input: CSSProperties = {
  flex: 1,
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.6rem 0.75rem',
  borderRadius: 10,
  border: '1px solid #cfe9d8',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
};
const primaryBtn: CSSProperties = {
  flexShrink: 0,
  padding: '0.6rem 0.9rem',
  borderRadius: 10,
  border: 'none',
  background: '#166534',
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
};
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0.6rem 0.75rem',
  borderRadius: 10,
  border: '1px solid #e7f5ec',
  background: '#fbfefc',
  flexWrap: 'wrap',
};
const rowName: CSSProperties = { margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1f2d24', overflowWrap: 'anywhere' };
const rowGroup: CSSProperties = { margin: '2px 0 0', fontSize: '0.74rem', color: '#6b8574' };
const ghostBtn: CSSProperties = {
  padding: '0.4rem 0.6rem',
  borderRadius: 8,
  border: '1px solid #cfe9d8',
  background: '#fff',
  color: '#15803d',
  fontWeight: 700,
  fontSize: '0.78rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
