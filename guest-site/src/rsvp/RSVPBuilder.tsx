import type { CSSProperties, DragEvent } from 'react';
import { useCallback, useState } from 'react';

import type { RSVPField, RSVPForm, RSVPEvent } from './types';

import { RSVP_FIELD_META, newEvent } from './types';

const FIELD_ORDER: RSVPField[] = [
  'firstname',
  'lastname',
  'email',
  'phone',
  'message',
  'dietaryRestrictions',
];

type RSVPBuilderProps = {
  form: RSVPForm;
  onChange: (next: RSVPForm) => void;
};

function reorderEvents(events: RSVPEvent[], from: number, to: number): RSVPEvent[] {
  const next = [...events];
  const [m] = next.splice(from, 1);
  next.splice(to, 0, m);
  return next;
}

export function RSVPBuilder({ form, onChange }: RSVPBuilderProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const defaults = {
    showDrinkPreference: true,
    drinkOptions: ['Whisky', 'Vodka', 'Gin', 'Ricard', 'Vin', 'Boukha'],
    showMessage: true,
    enableDietaryOptions: true,
    dietaryOptions: ['Végétarien', 'Vegan', 'Sans gluten', 'Halal', 'Kasher'],
    showDietaryOther: true,
  };
  const settings = { ...defaults, ...(form.settings ?? {}) };

  const patch = useCallback((f: RSVPForm) => onChange({ ...f, updatedAt: new Date().toISOString() }), [onChange]);

  const setEvents = useCallback((events: RSVPEvent[]) => patch({ ...form, events }), [form, patch]);
  const setActiveFields = useCallback((activeFields: RSVPField[]) => patch({ ...form, activeFields }), [form, patch]);

  const toggleField = (fld: RSVPField) => {
    const has = form.activeFields.includes(fld);
    setActiveFields(has ? form.activeFields.filter((x) => x !== fld) : [...form.activeFields, fld]);
  };

  const toggleEventProp = (
    idx: number,
    key: 'enabled' | 'askAttendance' | 'askGuestCount'
  ) => {
    const events = [...form.events];
    const ev = events[idx];
    if (!ev) return;
    events[idx] = { ...ev, [key]: !ev[key] };
    setEvents(events);
  };

  const patchEvent = (idx: number, partial: Partial<RSVPEvent>): void => {
    const events = [...form.events];
    const ev = events[idx];
    if (!ev) return;
    events[idx] = { ...ev, ...partial };
    setEvents(events);
  };

  const deleteEvent = (idx: number) => setEvents(form.events.filter((_, i) => i !== idx));

  const addEvent = () => {
    const ev = newEvent(crypto.randomUUID(), 'Nouvel événement', {
      enabled: true,
      askAttendance: true,
      askGuestCount: true,
      dayLabel: '',
      time: '',
      place: '',
      shortDescription: '',
      emojiIcon: '✨',
    });
    setEvents([...form.events, ev]);
  };

  const moveRow = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= form.events.length) return;
    setEvents(reorderEvents(form.events, from, to));
  };

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragEnter = (e: DragEvent<HTMLTableRowElement>, target: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === target) return;
    setEvents(reorderEvents(form.events, dragIdx, target));
    setDragIdx(target);
  };
  const onDragEnd = () => setDragIdx(null);

  return (
    <div style={sheet}>
      <h2 style={h2}>Formulaire RSVP (config)</h2>
      <p style={lead}>Glisse une ligne ou utilise ▲▼. Le formulaire public et l’aperçu se mettent à jour en direct.</p>

      <label style={lbl}>
        Titre RSVP (optionnel)
        <input
          style={inp}
          value={form.title}
          onChange={(e) => patch({ ...form, title: e.target.value })}
          placeholder="Ex. Répondez avant le 30 juillet"
        />
      </label>
      <label style={{ ...lbl, marginTop: 10 }}>
        Intro RSVP (optionnel)
        <textarea
          style={{ ...inp, minHeight: 72, resize: 'vertical' }}
          value={form.introText ?? ''}
          onChange={(e) => patch({ ...form, introText: e.target.value })}
          placeholder="Ex. Merci de confirmer votre présence."
        />
      </label>
      <label style={{ ...lbl, marginTop: 10 }}>
        Texte de remerciement post-RSVP (optionnel)
        <textarea
          style={{ ...inp, minHeight: 72, resize: 'vertical' }}
          value={form.thankYouText ?? ''}
          onChange={(e) => patch({ ...form, thankYouText: e.target.value })}
          placeholder="Ex. Merci ! Votre réponse a bien été enregistrée 🎉"
        />
      </label>

      <fieldset style={fieldset}>
        <legend style={legend}>Champs contacts</legend>
        <div style={chipGrid}>
          {FIELD_ORDER.map((fld) => {
            const on = form.activeFields.includes(fld);
            return (
              <button key={fld} type="button" style={chip(on)} onClick={() => toggleField(fld)}>
                {RSVP_FIELD_META[fld].adminLabelFr}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>Événements ({form.events.filter((x) => x.enabled).length} actifs)</legend>
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr style={thr}>
                <th style={thCol}>Ordre</th>
                <th style={{ ...thCol, textAlign: 'left' }}>Nom</th>
                <th style={{ ...thCol, textAlign: 'left' }}>Jour</th>
                <th style={{ ...thCol, textAlign: 'left' }}>Heure</th>
                <th style={{ ...thCol, textAlign: 'left' }}>Lieu</th>
                <th style={{ ...thCol, textAlign: 'left' }}>Description</th>
                <th style={{ ...thCol, textAlign: 'left' }}>Icône</th>
                <th style={thCol}>Afficher</th>
                <th style={thCol}>Présence</th>
                <th style={thCol}>Invités</th>
                <th style={thCol}>Max</th>
                <th style={thCol} />
              </tr>
            </thead>
            <tbody>
              {form.events.map((ev, idx) => (
                <tr
                  key={ev.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragEnter={(e) => onDragEnter(e, idx)}
                  onDragEnd={onDragEnd}
                  style={{ opacity: dragIdx === idx ? 0.85 : 1, cursor: 'grab' }}
                >
                  <td style={tdSm}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button type="button" tabIndex={-1} style={miniBtn} onClick={() => moveRow(idx, -1)} aria-label="Monter">
                        ▲
                      </button>
                      <button type="button" tabIndex={-1} style={miniBtn} onClick={() => moveRow(idx, 1)} aria-label="Descendre">
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    <input style={inpTight} value={ev.label} onChange={(e) => patchEvent(idx, { label: e.target.value })} />
                  </td>
                  <td>
                    <input style={inpTight} value={ev.dayLabel ?? ''} onChange={(e) => patchEvent(idx, { dayLabel: e.target.value })} placeholder="Ex. Samedi" />
                  </td>
                  <td>
                    <input style={inpTight} value={ev.time ?? ''} onChange={(e) => patchEvent(idx, { time: e.target.value })} placeholder="19:30" />
                  </td>
                  <td>
                    <input style={inpTight} value={ev.place ?? ''} onChange={(e) => patchEvent(idx, { place: e.target.value })} placeholder="Domaine..." />
                  </td>
                  <td>
                    <input
                      style={inpTight}
                      value={ev.shortDescription ?? ''}
                      onChange={(e) => patchEvent(idx, { shortDescription: e.target.value })}
                      placeholder="Texte court"
                    />
                  </td>
                  <td>
                    <input
                      style={{ ...inpTight, maxWidth: 60 }}
                      value={ev.emojiIcon ?? ''}
                      onChange={(e) => patchEvent(idx, { emojiIcon: e.target.value })}
                      placeholder="🥂"
                    />
                  </td>
                  <td style={centerCell}>
                    <input type="checkbox" checked={ev.enabled} onChange={() => toggleEventProp(idx, 'enabled')} />
                  </td>
                  <td style={centerCell}>
                    <input
                      type="checkbox"
                      checked={ev.askAttendance}
                      onChange={() => toggleEventProp(idx, 'askAttendance')}
                      disabled={!ev.enabled}
                    />
                  </td>
                  <td style={centerCell}>
                    <input
                      type="checkbox"
                      checked={ev.askGuestCount}
                      onChange={() => toggleEventProp(idx, 'askGuestCount')}
                      disabled={!ev.enabled}
                    />
                  </td>
                  <td style={centerCell}>
                    <input
                      type="number"
                      min={1}
                      disabled={!ev.enabled || !ev.askGuestCount}
                      value={ev.maxGuests ?? ''}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        patchEvent(idx, { maxGuests: Number.isFinite(n) && n > 0 ? n : undefined });
                      }}
                      style={{ width: 58, ...smallInput }}
                    />
                  </td>
                  <td style={centerCell}>
                    <button type="button" style={dangerBtn} onClick={() => deleteEvent(idx)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" style={ghostBtn} onClick={addEvent}>
          + Ajouter un événement
        </button>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>Options RSVP avancées</legend>
        <label style={toggleRow}>
          <input
            type="checkbox"
            checked={settings.showDrinkPreference}
            onChange={(e) => patch({ ...form, settings: { ...settings, showDrinkPreference: e.target.checked } })}
          />
          Activer boisson préférée
        </label>
        {settings.showDrinkPreference ? (
          <label style={{ ...lbl, marginTop: 8 }}>
            Boissons (une par ligne)
            <textarea
              style={{ ...inp, minHeight: 90, resize: 'vertical' }}
              value={settings.drinkOptions.join('\n')}
              onChange={(e) =>
                patch({
                  ...form,
                  settings: {
                    ...settings,
                    drinkOptions: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
        ) : null}

        <label style={toggleRow}>
          <input
            type="checkbox"
            checked={settings.showMessage}
            onChange={(e) => {
              const show = e.target.checked;
              const nextFields: RSVPField[] = show
                ? (Array.from(new Set([...form.activeFields, 'message'])) as RSVPField[])
                : form.activeFields.filter((x) => x !== 'message');
              patch({ ...form, activeFields: nextFields, settings: { ...settings, showMessage: show } });
            }}
          />
          Activer "Message aux mariés"
        </label>

      </fieldset>
    </div>
  );
}

const sheet: CSSProperties = {
  padding: '1rem 1rem 1.15rem',
  borderRadius: 14,
  border: '1px solid #E4E7DC',
  background: '#F9F7F2',
  marginTop: 12,
};

const h2: CSSProperties = { fontSize: '1.06rem', fontWeight: 800, margin: '0 0 0.35rem' };

const lead: CSSProperties = { fontSize: '0.86rem', opacity: 0.88, lineHeight: 1.45, margin: '0 0 0.85rem' };

const inp: CSSProperties = {
  display: 'block',
  marginTop: 6,
  width: '100%',
  padding: '0.52rem 0.65rem',
  borderRadius: 10,
  border: '1px solid #C7B7A5',
};

const inpTight: CSSProperties = { ...inp, marginTop: 0 };

const lbl: CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 650,
};

const fieldset: CSSProperties = {
  margin: '0.85rem 0 0',
  padding: '0.85rem',
  borderRadius: 12,
  border: '1px solid #E4E7DC',
};

const legend: CSSProperties = { fontWeight: 800, padding: '0 0.3rem', fontSize: '0.88rem' };

const chipGrid: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 };

const chip = (on: boolean): CSSProperties => ({
  padding: '0.45rem 0.72rem',
  borderRadius: 999,
  border: on ? '2px solid #8F947F' : '1px solid #C7B7A5',
  fontSize: '0.82rem',
  fontWeight: 700,
  background: on ? '#E4E7DC' : '#fff',
  cursor: 'pointer',
});

const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginTop: 8 };

const thr: CSSProperties = { background: '#F0EDE6' };

const thCol: CSSProperties = {
  padding: '0.42rem',
  borderBottom: '1px solid #E4E7DC',
};

const tdSm: CSSProperties = {
  padding: '0.28rem',
  borderBottom: '1px solid #EDE8E0',
};

const smallInput: CSSProperties = {
  border: '1px solid #C7B7A5',
  borderRadius: 8,
  padding: '0.25rem',
};

const centerCell: CSSProperties = { ...tdSm, textAlign: 'center' };

const miniBtn: CSSProperties = {
  padding: '1px 5px',
  borderRadius: 6,
  border: '1px solid #C7B7A5',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 11,
};

const dangerBtn: CSSProperties = {
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  cursor: 'pointer',
  padding: '2px 8px',
  color: '#b91c1c',
};

const ghostBtn: CSSProperties = {
  marginTop: 10,
  padding: '0.45rem 0.75rem',
  borderRadius: 10,
  border: '1px dashed #8F947F',
  background: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.82rem',
};

const toggleRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
  fontSize: '0.9rem',
};
