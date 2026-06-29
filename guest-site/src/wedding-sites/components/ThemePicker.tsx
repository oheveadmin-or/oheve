/**
 * ThemePicker — page de sélection de thème en grille de cartes carrées.
 * Affiché AVANT le builder complet : le client choisit son univers visuel
 * d'un seul clic, puis accède aux options de personnalisation.
 */
import { useState } from 'react';
import type { ThemePreset } from '../data/weddingThemes';
import { STYLE_PRESETS } from '../data/weddingThemes';

type Props = {
  onSelect: (preset: ThemePreset) => void;
  /** Preset déjà actif (si édition d'un site existant) */
  currentStyleId?: string;
};

/** Génère un dégradé représentatif à partir de la couleur principale + fond */
function ThemeCardSwatch({ bg, primary, secondary }: { bg: string; primary: string; secondary: string }) {
  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px 12px 0 0',
      }}
    >
      {/* Fond */}
      <div style={{ position: 'absolute', inset: 0, background: bg }} />

      {/* Bloc couleur principale */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '52%',
          background: primary,
          opacity: 0.88,
        }}
      />

      {/* Accent secondaire */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '35%',
          height: '35%',
          background: secondary,
          opacity: 0.7,
        }}
      />

      {/* Cercle décoratif représentant le monogramme */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -62%)',
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `2px solid ${primary}`,
          background: bg,
          opacity: 0.9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: primary,
            opacity: 0.4,
          }}
        />
      </div>

      {/* Deux lignes simulant du texte */}
      <div
        style={{
          position: 'absolute',
          bottom: '46%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          width: '70%',
        }}
      >
        <div style={{ height: 4, width: '90%', borderRadius: 2, background: primary, opacity: 0.35 }} />
        <div style={{ height: 3, width: '60%', borderRadius: 2, background: primary, opacity: 0.2 }} />
      </div>
    </div>
  );
}

function ThemeCard({
  preset,
  selected,
  onClick,
}: {
  preset: ThemePreset;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isVintage = preset.id === 'vintage-blue';
  const bg = preset.theme.backgroundColor ?? '#faf7f2';
  const primary = preset.theme.primaryColor ?? '#5b4636';
  const secondary = preset.theme.secondaryColor ?? '#c9a962';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '1',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        border: selected
          ? `3px solid ${primary}`
          : hovered
          ? `2px solid ${primary}66`
          : '2px solid #e5e0d8',
        background: '#fff',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered && !selected ? 'translateY(-3px)' : 'none',
        boxShadow: selected
          ? `0 0 0 4px ${primary}26, 0 6px 24px ${primary}22`
          : hovered
          ? '0 6px 20px rgba(0,0,0,0.10)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.18s',
        position: 'relative',
      }}
    >
      {/* Badge Vintage Bleu */}
      {isVintage && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
            background: primary,
            color: '#fff',
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: 20,
          }}
        >
          ✦ Premium
        </div>
      )}

      {/* Check sélectionné */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
            <path d="M1 3.5L4.2 7L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Swatch couleur */}
      <ThemeCardSwatch bg={bg} primary={primary} secondary={secondary} />

      {/* Label zone */}
      <div
        style={{
          padding: '8px 10px 10px',
          background: '#fff',
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#1e1e1e',
            lineHeight: 1.2,
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {preset.label.replace('✦ ', '')}
        </div>
        <div
          style={{
            fontSize: '0.62rem',
            color: '#888',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {preset.description}
        </div>
      </div>
    </div>
  );
}

export function ThemePicker({ onSelect, currentStyleId }: Props) {
  // Par défaut : vintage-blue si aucun style existant, sinon le style du site en cours d'édition
  const [selected, setSelected] = useState<string>(
    currentStyleId && currentStyleId !== 'classic' ? currentStyleId : 'vintage-blue'
  );

  const chosen = STYLE_PRESETS.find((p) => p.id === selected) ?? STYLE_PRESETS[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f9f7f4 0%, #f2ede5 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* En-tête */}
      <header
        style={{
          padding: '2.8rem 1.5rem 1.6rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 'clamp(1.7rem, 4vw, 2.4rem)',
            fontWeight: 600,
            color: '#2c2416',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          Choisissez votre thème
        </div>
        <p
          style={{
            color: '#7a6e63',
            fontSize: '0.92rem',
            maxWidth: 420,
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Sélectionnez un univers visuel — vous pourrez personnaliser les couleurs et la mise en page à l'étape suivante.
        </p>
      </header>

      {/* Grille de cartes */}
      <div
        style={{
          flex: 1,
          maxWidth: 960,
          width: '100%',
          margin: '0 auto',
          padding: '0 1rem 6rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
          gap: '0.85rem',
          alignContent: 'start',
        }}
      >
        {STYLE_PRESETS.map((preset) => (
          <ThemeCard
            key={preset.id}
            preset={preset}
            selected={selected === preset.id}
            onClick={() => setSelected(preset.id)}
          />
        ))}
      </div>

      {/* Barre de sélection fixe en bas */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem 1.5rem',
          background: 'rgba(250,248,244,0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #e5dfd5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          {/* Mini swatch */}
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              flexShrink: 0,
              background: `linear-gradient(135deg, ${chosen.theme.backgroundColor ?? '#faf7f2'} 50%, ${chosen.theme.primaryColor ?? '#5b4636'} 50%)`,
              border: '1.5px solid rgba(0,0,0,0.08)',
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: '#1e1e1e',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {chosen.label.replace('✦ ', '')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8a7d72' }}>{chosen.description}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect(chosen)}
          style={{
            flexShrink: 0,
            padding: '0.7rem 2rem',
            background: chosen.theme.primaryColor ?? '#5b4636',
            color: '#fff',
            border: 'none',
            borderRadius: 50,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${(chosen.theme.primaryColor ?? '#5b4636')}44`,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Commencer →
        </button>
      </div>
    </div>
  );
}

export default ThemePicker;
