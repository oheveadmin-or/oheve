/**
 * 8 structurally distinct hero layouts.
 * Each one has a different composition, not just different colors.
 */
import type { CSSProperties } from 'react';
import type { WeddingSite } from '../types';
import { HeroMeta } from './templateParts';
import { titleFontSize } from './templateCardStyles';
import { sectionLabels } from '../i18n';
import { PatternOverlay } from './PatternOverlay';

interface HeroProps {
  site: WeddingSite;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function CornerDecor({ color, size = 40 }: { color: string; size?: number }) {
  const s: CSSProperties = { position: 'absolute', width: size, height: size, pointerEvents: 'none' };
  const line: CSSProperties = { position: 'absolute', background: color, opacity: 0.6 };
  return (
    <>
      {/* Top-left */}
      <div style={{ ...s, top: 16, left: 16 }}>
        <div style={{ ...line, top: 0, left: 0, width: 2, height: size }} />
        <div style={{ ...line, top: 0, left: 0, width: size, height: 2 }} />
      </div>
      {/* Top-right */}
      <div style={{ ...s, top: 16, right: 16 }}>
        <div style={{ ...line, top: 0, right: 0, width: 2, height: size }} />
        <div style={{ ...line, top: 0, right: 0, width: size, height: 2 }} />
      </div>
      {/* Bottom-left */}
      <div style={{ ...s, bottom: 16, left: 16 }}>
        <div style={{ ...line, bottom: 0, left: 0, width: 2, height: size }} />
        <div style={{ ...line, bottom: 0, left: 0, width: size, height: 2 }} />
      </div>
      {/* Bottom-right */}
      <div style={{ ...s, bottom: 16, right: 16 }}>
        <div style={{ ...line, bottom: 0, right: 0, width: 2, height: size }} />
        <div style={{ ...line, bottom: 0, right: 0, width: size, height: 2 }} />
      </div>
    </>
  );
}

// ─── 1. Editorial ────────────────────────────────────────────────────────────
// Large centered title, lots of breathing room, very typographic

export function HeroEditorial({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '5rem 2rem 3rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PatternOverlay
        patternId={t.patternId ?? 'none'}
        color={t.primaryColor}
        opacity={t.patternOpacity ?? 0.07}
      />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 700 }}>
        <p
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: t.primaryColor,
            marginBottom: '2rem',
            opacity: 0.8,
          }}
        >
          {L.heroKicker}
        </p>
        <h1
          style={{
            fontSize: `clamp(2.8rem, 9vw, 6rem)`,
            fontWeight: 700,
            lineHeight: 1.05,
            margin: '0 0 0.5rem',
            color: t.textColor,
            letterSpacing: '-0.02em',
          }}
        >
          {site.brideName}
          <br />
          <span style={{ color: t.primaryColor, fontWeight: 400, fontStyle: 'italic', fontSize: '0.7em' }}>&</span>
          <br />
          {site.groomName}
        </h1>
        <div
          style={{
            width: 60,
            height: 2,
            background: t.primaryColor,
            margin: '1.5rem auto',
            opacity: 0.7,
          }}
        />
        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 2. Split ─────────────────────────────────────────────────────────────────
// Left = text; Right = pattern/gradient block

export function HeroSplit({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '85vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden',
      }}
    >
      {/* Left: text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '5rem 3rem 4rem 3rem',
          position: 'relative',
        }}
      >
        <p
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: t.primaryColor,
            marginBottom: '1.5rem',
          }}
        >
          {L.heroKicker}
        </p>
        <h1
          style={{
            fontSize: `clamp(2rem, 5vw, 4rem)`,
            fontWeight: 700,
            lineHeight: 1.1,
            margin: '0 0 1.5rem',
            color: t.textColor,
          }}
        >
          {site.brideName}
          <br />
          <span style={{ color: t.primaryColor, fontStyle: 'italic', fontWeight: 400, fontSize: '0.75em' }}>& {site.groomName}</span>
        </h1>
        <HeroMeta site={site} />
      </div>

      {/* Right: decorative panel */}
      <div
        style={{
          background: `linear-gradient(135deg, ${t.primaryColor}22 0%, ${t.primaryColor}55 50%, ${t.primaryColor}33 100%)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <PatternOverlay
          patternId={t.patternId ?? 'none'}
          color={t.primaryColor}
          opacity={(t.patternOpacity ?? 0.07) * 2}
        />
        {/* Decorative monogram circle */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: `2px solid ${t.primaryColor}88`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 0 12px ${t.primaryColor}22`,
          }}
        >
          <span style={{ fontSize: '2.5rem', color: t.primaryColor, fontFamily: t.fontFamily, fontWeight: 700, lineHeight: 1 }}>
            {site.brideName[0]}{site.groomName[0]}
          </span>
          <div style={{ width: 40, height: 1, background: t.primaryColor, opacity: 0.5, margin: '0.5rem 0' }} />
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: t.primaryColor, opacity: 0.8 }}>
            {site.city || '2025'}
          </span>
        </div>
      </div>
    </header>
  );
}

// ─── 3. Faire-part ────────────────────────────────────────────────────────────
// Invitation papier, cadre intérieur, calligraphie

export function HeroFairepart({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PatternOverlay
        patternId={t.patternId ?? 'none'}
        color={t.primaryColor}
        opacity={t.patternOpacity ?? 0.07}
      />
      {/* Cadre principal */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          border: `1px solid ${t.primaryColor}55`,
          padding: '3.5rem 3rem',
          maxWidth: 540,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Cadre intérieur */}
        <div
          style={{
            position: 'absolute',
            inset: 10,
            border: `1px solid ${t.primaryColor}33`,
            pointerEvents: 'none',
          }}
        />
        {t.cornerDecor && <CornerDecor color={t.primaryColor} size={32} />}

        <p
          style={{
            fontSize: '0.58rem',
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: t.primaryColor,
            marginBottom: '1.5rem',
            opacity: 0.9,
          }}
        >
          {L.heroKicker}
        </p>

        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.7, fontStyle: 'italic' }}>
          {site.content?.parentsBride?.father || site.content?.parentsBride?.mother
            ? `Famille ${site.content?.brideFamilyName || site.brideName.split(' ').pop()}`
            : ''}
        </p>

        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 600,
            lineHeight: 1.15,
            margin: '0.5rem 0',
            color: t.textColor,
            fontStyle: 'italic',
          }}
        >
          {site.brideName}
        </h1>
        <p style={{ fontSize: '1.2rem', color: t.primaryColor, margin: '0.25rem 0', fontWeight: 400 }}>& </p>
        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 600,
            lineHeight: 1.15,
            margin: '0.5rem 0',
            color: t.textColor,
            fontStyle: 'italic',
          }}
        >
          {site.groomName}
        </h1>

        <div style={{ width: 60, height: 1, background: t.primaryColor, margin: '1.5rem auto', opacity: 0.5 }} />
        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 4. Monogram ─────────────────────────────────────────────────────────────
// Grand cercle monogramme au centre, noms en dessous

export function HeroMonogramStyle({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PatternOverlay patternId={t.patternId ?? 'none'} color={t.primaryColor} opacity={t.patternOpacity ?? 0.07} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* SVG or fallback monogram */}
        {site.content?.monogramSvg ? (
          <div
            style={{ marginBottom: '2rem' }}
            dangerouslySetInnerHTML={{ __html: site.content.monogramSvg }}
          />
        ) : (
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: `2px solid ${t.primaryColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
              position: 'relative',
              boxShadow: `0 0 0 8px ${t.primaryColor}18, 0 0 0 16px ${t.primaryColor}08`,
            }}
          >
            <span
              style={{
                fontSize: '3.5rem',
                fontFamily: t.fontFamily,
                fontWeight: 700,
                color: t.primaryColor,
                fontStyle: 'italic',
              }}
            >
              {site.brideName[0]}{site.groomName[0]}
            </span>
          </div>
        )}

        <p style={{ fontSize: '0.58rem', letterSpacing: '0.45em', textTransform: 'uppercase', color: t.primaryColor, marginBottom: '1rem', opacity: 0.8 }}>
          {L.heroKicker}
        </p>
        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 600,
            lineHeight: 1.15,
            margin: '0 0 0.5rem',
            color: t.textColor,
          }}
        >
          {site.brideName} & {site.groomName}
        </h1>
        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 5. Luxe ─────────────────────────────────────────────────────────────────
// Fond sombre, texte dégradé or/accent, ornements coins

export function HeroLuxe({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '5rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${t.primaryColor}33 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <PatternOverlay patternId={t.patternId ?? 'none'} color={t.primaryColor} opacity={t.patternOpacity ?? 0.07} />

      {/* Outer border */}
      <div
        style={{
          position: 'absolute',
          inset: 20,
          border: `1px solid ${t.primaryColor}44`,
          pointerEvents: 'none',
        }}
      />
      {t.cornerDecor && <CornerDecor color={t.primaryColor} />}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640 }}>
        <p
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.6em',
            textTransform: 'uppercase',
            color: t.primaryColor,
            marginBottom: '2rem',
          }}
        >
          {L.heroKicker}
        </p>

        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 600,
            lineHeight: 1.1,
            margin: '0 0 0.25rem',
            background: `linear-gradient(120deg, ${t.textColor} 30%, ${t.primaryColor} 70%, ${t.textColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {site.brideName}
        </h1>
        <p style={{ color: t.primaryColor, fontSize: '1.5rem', fontStyle: 'italic', margin: '0.25rem 0' }}>&</p>
        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 600,
            lineHeight: 1.1,
            margin: '0 0 1.5rem',
            background: `linear-gradient(120deg, ${t.textColor} 30%, ${t.primaryColor} 70%, ${t.textColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {site.groomName}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: 1, background: t.primaryColor, maxWidth: 80, opacity: 0.5 }} />
          <span style={{ color: t.primaryColor, fontSize: '1rem' }}>◆</span>
          <div style={{ flex: 1, height: 1, background: t.primaryColor, maxWidth: 80, opacity: 0.5 }} />
        </div>

        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 6. Art Déco ─────────────────────────────────────────────────────────────
// Géométrique, uppercase, losanges, années 20

export function HeroArtDeco({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const accent = t.primaryColor;

  return (
    <header
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PatternOverlay patternId={t.patternId ?? 'none'} color={accent} opacity={t.patternOpacity ?? 0.07} />

      {/* Geometric corner diamonds */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, width: 100, height: 100, border: `1px solid ${accent}55`, transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', top: 30, left: 30, width: 80, height: 80, border: `1px solid ${accent}33`, transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', bottom: 20, right: 20, width: 100, height: 100, border: `1px solid ${accent}55`, transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 80, height: 80, border: `1px solid ${accent}33`, transform: 'rotate(45deg)' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}33, transparent)` }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640 }}>
        {/* Top rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, height: 1, background: accent }} />
          <span style={{ color: accent, fontSize: '1rem' }}>◆</span>
          <div style={{ flex: 1, height: 1, background: accent }} />
        </div>

        <p style={{ fontSize: '0.55rem', letterSpacing: '0.55em', textTransform: 'uppercase', color: accent, marginBottom: '1.5rem' }}>
          {L.heroKicker}
        </p>

        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: '0 0 0.25rem',
            color: t.textColor,
            lineHeight: 1.1,
          }}
        >
          {site.brideName}
        </h1>
        <p style={{ color: accent, fontSize: '1.1rem', fontStyle: 'italic', margin: '0.25rem 0', letterSpacing: '0.15em' }}>& </p>
        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: '0 0 2rem',
            color: t.textColor,
            lineHeight: 1.1,
          }}
        >
          {site.groomName}
        </h1>

        {/* Bottom rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, height: 1, background: accent }} />
          <span style={{ color: accent, fontSize: '0.7rem', letterSpacing: '0.3em' }}>◆ ◆ ◆</span>
          <div style={{ flex: 1, height: 1, background: accent }} />
        </div>

        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 7. Magazine ─────────────────────────────────────────────────────────────
// Left-aligned, bold, editorial — style magazine de mariage

export function HeroMagazine({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 0 4rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PatternOverlay patternId={t.patternId ?? 'none'} color={t.primaryColor} opacity={t.patternOpacity ?? 0.07} />

      {/* Vertical accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '3rem',
          width: 3,
          background: `linear-gradient(180deg, transparent, ${t.primaryColor}, transparent)`,
          opacity: 0.5,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', width: '100%', padding: '0 3rem 0 5rem' }}>
        <p
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: t.primaryColor,
            marginBottom: '1rem',
          }}
        >
          {L.heroKicker}
        </p>
        <h1
          style={{
            fontSize: `clamp(3rem, 8vw, 5.5rem)`,
            fontWeight: 800,
            lineHeight: 0.95,
            margin: '0 0 1.5rem',
            color: t.textColor,
            letterSpacing: '-0.03em',
          }}
        >
          {site.brideName}
          <br />
          <span style={{ color: t.primaryColor, fontWeight: 400, fontStyle: 'italic', fontSize: '0.65em' }}>& {site.groomName}</span>
        </h1>
        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 8. Minimal ──────────────────────────────────────────────────────────────
// Très épuré, noms petits, beaucoup d'espace blanc

export function HeroMinimal({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '5rem 2rem',
        position: 'relative',
      }}
    >
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: t.primaryColor, marginBottom: '3rem', opacity: 0.6 }}>
        {L.heroKicker}
      </p>
      <h1
        style={{
          fontSize: `clamp(1.8rem, 5vw, 3rem)`,
          fontWeight: 300,
          lineHeight: 1.3,
          margin: 0,
          color: t.textColor,
          letterSpacing: '0.05em',
        }}
      >
        {site.brideName}
        <span style={{ color: t.primaryColor, fontWeight: 400, margin: '0 0.75em' }}>·</span>
        {site.groomName}
      </h1>
      <div style={{ width: 40, height: 1, background: t.primaryColor, margin: '2rem auto', opacity: 0.4 }} />
      <HeroMeta site={site} />
    </header>
  );
}
