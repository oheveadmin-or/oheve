import type { CSSProperties, ReactNode } from 'react';

import type { StyleQuizAnswers } from '../types';

const defaultQuiz: StyleQuizAnswers = {
  solemnOrLuxury: 'sober',
  modernOrRomantic: 'modern',
  lightOrDark: 'light',
  scriptOrSimple: 'simple',
  infoOrMinimal: 'rich',
  culture: 'french',
  heroMood: 'editorial',
  paletteFamily: 'neutral',
  cardVisual: 'clean',
  rhythm: 'balanced',
  photoTreatment: 'light',
  ctaTone: 'discreet',
  storyDensity: 'full',
  eventFormat: 'single-day',
  rtlSupport: 'auto',
};

type Props = {
  /** Valeur partielle : fusionnée avec les défauts du quiz à l’affichage */
  value: Partial<StyleQuizAnswers>;
  onChange: (next: StyleQuizAnswers) => void;
  onApply: (next: StyleQuizAnswers) => void;
};

export function WeddingStyleQuiz({ value, onChange, onApply }: Props) {
  const q = { ...defaultQuiz, ...value };

  const row = (label: string, children: ReactNode) => (
    <label style={lab}>
      <span style={labTitle}>{label}</span>
      {children}
    </label>
  );

  return (
    <fieldset style={field}>
      <legend style={leg}>Assistant de style</legend>
      <p style={hint}>Répondez puis cliquez sur « Appliquer au thème » pour générer automatiquement le thème.</p>

      {row(
        'Préférez-vous un site plutôt sobre ou luxueux ?',
        <select
          style={sel}
          value={q.solemnOrLuxury}
          onChange={(e) =>
            onChange({ ...q, solemnOrLuxury: e.target.value as StyleQuizAnswers['solemnOrLuxury'] })
          }
        >
          <option value="sober">Plutôt sobre</option>
          <option value="luxury">Plutôt luxueux</option>
        </select>
      )}

      {row(
        'Ambiance moderne ou romantique ?',
        <select
          style={sel}
          value={q.modernOrRomantic}
          onChange={(e) =>
            onChange({ ...q, modernOrRomantic: e.target.value as StyleQuizAnswers['modernOrRomantic'] })
          }
        >
          <option value="modern">Moderne</option>
          <option value="romantic">Romantique</option>
        </select>
      )}

      {row(
        'Couleurs plutôt claires ou foncées ?',
        <select
          style={sel}
          value={q.lightOrDark}
          onChange={(e) => onChange({ ...q, lightOrDark: e.target.value as StyleQuizAnswers['lightOrDark'] })}
        >
          <option value="light">Claires</option>
          <option value="dark">Foncées</option>
        </select>
      )}

      {row(
        'Grande écriture élégante ou écriture simple ?',
        <select
          style={sel}
          value={q.scriptOrSimple}
          onChange={(e) =>
            onChange({ ...q, scriptOrSimple: e.target.value as StyleQuizAnswers['scriptOrSimple'] })
          }
        >
          <option value="elegant">Grande écriture élégante</option>
          <option value="simple">Écriture simple</option>
        </select>
      )}

      {row(
        'Beaucoup d’informations ou rester minimal ?',
        <select
          style={sel}
          value={q.infoOrMinimal}
          onChange={(e) =>
            onChange({ ...q, infoOrMinimal: e.target.value as StyleQuizAnswers['infoOrMinimal'] })
          }
        >
          <option value="rich">Beaucoup d’informations</option>
          <option value="minimal">Rester minimal</option>
        </select>
      )}

      {row(
        'Culture visuelle',
        <select
          style={sel}
          value={q.culture}
          onChange={(e) => onChange({ ...q, culture: e.target.value as StyleQuizAnswers['culture'] })}
        >
          <option value="french">Français</option>
          <option value="israeli">Israélien</option>
          <option value="oriental">Oriental</option>
          <option value="international">International</option>
        </select>
      )}

      {row(
        'Style de couverture (hero)',
        <select
          style={sel}
          value={q.heroMood}
          onChange={(e) => onChange({ ...q, heroMood: e.target.value as StyleQuizAnswers['heroMood'] })}
        >
          <option value="editorial">Editorial chic (comme un faire-part premium)</option>
          <option value="warm">Chaleureux et familial</option>
          <option value="cinematic">Cinématique et intense</option>
        </select>
      )}

      {row(
        'Famille de couleurs',
        <select
          style={sel}
          value={q.paletteFamily}
          onChange={(e) =>
            onChange({ ...q, paletteFamily: e.target.value as StyleQuizAnswers['paletteFamily'] })
          }
        >
          <option value="neutral">Neutres élégantes (ivoire, beige, noir doux)</option>
          <option value="gold">Or et contrastes premium</option>
          <option value="pastel">Pastel romantique</option>
          <option value="terracotta">Terracotta / méditerranéen</option>
        </select>
      )}

      {row(
        'Style des blocs de contenu',
        <select
          style={sel}
          value={q.cardVisual}
          onChange={(e) => onChange({ ...q, cardVisual: e.target.value as StyleQuizAnswers['cardVisual'] })}
        >
          <option value="clean">Net et minimal</option>
          <option value="depth">Avec profondeur (ombre)</option>
          <option value="glass">Effet verre premium</option>
        </select>
      )}

      {row(
        'Rythme visuel de la page',
        <select
          style={sel}
          value={q.rhythm}
          onChange={(e) => onChange({ ...q, rhythm: e.target.value as StyleQuizAnswers['rhythm'] })}
        >
          <option value="calm">Calme et respirant</option>
          <option value="balanced">Équilibré</option>
          <option value="celebration">Festif et dynamique</option>
        </select>
      )}

      {row(
        'Traitement photo / ambiance',
        <select
          style={sel}
          value={q.photoTreatment}
          onChange={(e) =>
            onChange({ ...q, photoTreatment: e.target.value as StyleQuizAnswers['photoTreatment'] })
          }
        >
          <option value="light">Lumineux</option>
          <option value="moody">Moody / contrasté</option>
          <option value="vintage">Vintage doux</option>
        </select>
      )}

      {row(
        'Boutons RSVP / CTA',
        <select
          style={sel}
          value={q.ctaTone}
          onChange={(e) => onChange({ ...q, ctaTone: e.target.value as StyleQuizAnswers['ctaTone'] })}
        >
          <option value="discreet">Discrets</option>
          <option value="bold">Très visibles</option>
        </select>
      )}

      {row(
        'Contenu narratif',
        <select
          style={sel}
          value={q.storyDensity}
          onChange={(e) => onChange({ ...q, storyDensity: e.target.value as StyleQuizAnswers['storyDensity'] })}
        >
          <option value="short">Court (essentiel)</option>
          <option value="full">Complet (programme + infos + FAQ)</option>
        </select>
      )}

      {row(
        'Format du mariage',
        <select
          style={sel}
          value={q.eventFormat}
          onChange={(e) => onChange({ ...q, eventFormat: e.target.value as StyleQuizAnswers['eventFormat'] })}
        >
          <option value="single-day">Un seul jour</option>
          <option value="multi-day">Plusieurs jours / cérémonies</option>
        </select>
      )}

      {row(
        'Support hébreu / RTL',
        <select
          style={sel}
          value={q.rtlSupport}
          onChange={(e) => onChange({ ...q, rtlSupport: e.target.value as StyleQuizAnswers['rtlSupport'] })}
        >
          <option value="auto">Auto selon le style choisi</option>
          <option value="force-hebrew">Forcer le mode hébreu (RTL)</option>
        </select>
      )}

      <button type="button" style={btnPrimary} onClick={() => onApply(q)}>
        Appliquer au thème
      </button>
    </fieldset>
  );
}

const field: CSSProperties = {
  border: '1px solid #e8e4f5',
  borderRadius: 14,
  padding: '1rem 1.1rem 1.25rem',
  margin: '1.25rem 0',
  background: '#fff',
};

const leg: CSSProperties = { fontWeight: 700, padding: '0 0.35rem' };

const hint: CSSProperties = { margin: '0 0 1rem', fontSize: '0.9rem', opacity: 0.88, lineHeight: 1.45 };

const lab: CSSProperties = { display: 'block', marginBottom: '0.85rem', fontSize: '0.9rem' };

const labTitle: CSSProperties = { display: 'block', marginBottom: 6, fontWeight: 600 };

const sel: CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.6rem',
  borderRadius: 8,
  border: '1px solid #d4d0e8',
  fontSize: '0.95rem',
};

const btnPrimary: CSSProperties = {
  marginTop: 8,
  width: '100%',
  padding: '0.65rem 1rem',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  cursor: 'pointer',
  background: 'linear-gradient(120deg, #5b4fd6, #8b5cf6)',
  color: '#fff',
};
