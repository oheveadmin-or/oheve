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
// Structuré : bloc de gauche avec titre, séparateur vertical, bloc de droite avec date

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
        padding: '4rem 2rem 3rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PatternOverlay
        patternId={t.patternId ?? 'none'}
        color={t.primaryColor}
        opacity={t.patternOpacity ?? 0.07}
      />

      {/* Top rule */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 680, marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.3 }} />
          <span style={{ fontSize: '0.55rem', letterSpacing: '0.55em', textTransform: 'uppercase', color: t.primaryColor, opacity: 0.7 }}>
            {L.heroKicker}
          </span>
          <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.3 }} />
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 680 }}>
        {/* Names grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          {/* Bride */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: t.primaryColor, opacity: 0.65, marginBottom: '0.4rem' }}>
              {site.language === 'he' ? 'כלה' : 'Mariée'}
            </p>
            <h1 style={{ fontSize: `clamp(2.2rem, 7vw, 4.5rem)`, fontWeight: 700, lineHeight: 1.05, margin: 0, color: t.textColor }}>
              {site.brideName}
            </h1>
          </div>

          {/* Central separator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 1, height: 40, background: t.primaryColor, opacity: 0.35 }} />
            <span style={{ color: t.primaryColor, fontSize: '1rem', fontStyle: 'italic', opacity: 0.8 }}>&</span>
            <div style={{ width: 1, height: 40, background: t.primaryColor, opacity: 0.35 }} />
          </div>

          {/* Groom */}
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: t.primaryColor, opacity: 0.65, marginBottom: '0.4rem' }}>
              {site.language === 'he' ? 'חתן' : 'Marié'}
            </p>
            <h1 style={{ fontSize: `clamp(2.2rem, 7vw, 4.5rem)`, fontWeight: 700, lineHeight: 1.05, margin: 0, color: t.textColor }}>
              {site.groomName}
            </h1>
          </div>
        </div>

        {/* Bottom rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.2 }} />
          <div style={{ width: 5, height: 5, background: t.primaryColor, transform: 'rotate(45deg)', opacity: 0.5 }} />
          <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.2 }} />
        </div>

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
        {/* SVG or fallback monogram — scaled to 160px regardless of original export size */}
        {site.content?.monogramSvg ? (
          <div
            style={{ width: 160, height: 160, marginBottom: '2rem' }}
            dangerouslySetInnerHTML={{
              __html: site.content.monogramSvg
                .replace(/width="[^"]*"/, 'width="100%"')
                .replace(/height="[^"]*"/, 'height="100%"'),
            }}
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

// ─── 9. Royal ────────────────────────────────────────────────────────────────
// Héraldique, sceau central, double cadre, ultra-formel

function RoyalSeal({ color, size = 80 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="1.5" opacity="0.65"/>
      <circle cx="40" cy="40" r="28" fill="none" stroke={color} strokeWidth="0.8" opacity="0.45"/>
      <polygon
        points="40,14 43.5,28 56,22 48,34 63,37 50,43 55,57 42,50 40,65 38,50 25,57 30,43 17,37 32,34 24,22 36.5,28"
        fill="none" stroke={color} strokeWidth="0.9" opacity="0.7"
      />
      <circle cx="40" cy="40" r="5.5" fill={color} opacity="0.55"/>
    </svg>
  );
}

function RoyalCornerSVG({ color, rotation }: { color: string; rotation: number }) {
  return (
    <svg width={52} height={52} viewBox="0 0 52 52" style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M4,4 L4,24" stroke={color} strokeWidth="2.5" opacity="0.7"/>
      <path d="M4,4 L24,4" stroke={color} strokeWidth="2.5" opacity="0.7"/>
      <circle cx="4" cy="4" r="3" fill={color} opacity="0.6"/>
      <path d="M4,14 L12,14 L12,4" fill="none" stroke={color} strokeWidth="0.8" opacity="0.4"/>
      <circle cx="12" cy="4" r="1.5" fill={color} opacity="0.35"/>
      <circle cx="4" cy="14" r="1.5" fill={color} opacity="0.35"/>
    </svg>
  );
}

export function HeroRoyal({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const c = t.primaryColor;

  return (
    <header
      style={{
        minHeight: '96vh',
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
      <PatternOverlay patternId={t.patternId ?? 'none'} color={c} opacity={t.patternOpacity ?? 0.07} />

      {/* Double outer frame */}
      <div style={{ position: 'absolute', inset: 14, border: `1px solid ${c}33`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 22, border: `2px solid ${c}55`, pointerEvents: 'none' }} />

      {/* Elaborate corners */}
      <div style={{ position: 'absolute', top: 18, left: 18, pointerEvents: 'none' }}>
        <RoyalCornerSVG color={c} rotation={0} />
      </div>
      <div style={{ position: 'absolute', top: 18, right: 18, pointerEvents: 'none' }}>
        <RoyalCornerSVG color={c} rotation={90} />
      </div>
      <div style={{ position: 'absolute', bottom: 18, left: 18, pointerEvents: 'none' }}>
        <RoyalCornerSVG color={c} rotation={270} />
      </div>
      <div style={{ position: 'absolute', bottom: 18, right: 18, pointerEvents: 'none' }}>
        <RoyalCornerSVG color={c} rotation={180} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
        <RoyalSeal color={c} size={80} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.75rem 0 1rem' }}>
          <div style={{ flex: 1, height: 1, background: c, opacity: 0.5 }} />
          <p style={{ fontSize: '0.52rem', letterSpacing: '0.55em', textTransform: 'uppercase', color: c, margin: 0 }}>
            {L.heroKicker}
          </p>
          <div style={{ flex: 1, height: 1, background: c, opacity: 0.5 }} />
        </div>

        <h1 style={{ fontSize: titleFontSize(t.titleSize), fontWeight: 700, color: t.textColor, margin: '0 0 0.25rem', lineHeight: 1.1, fontStyle: 'italic' }}>
          {site.brideName}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', justifyContent: 'center', margin: '0.6rem 0' }}>
          <div style={{ flex: 1, height: 1, background: `${c}55` }} />
          <span style={{ color: c, fontSize: '1.3rem', lineHeight: 1 }}>✦</span>
          <div style={{ flex: 1, height: 1, background: `${c}55` }} />
        </div>

        <h1 style={{ fontSize: titleFontSize(t.titleSize), fontWeight: 700, color: t.textColor, margin: '0 0 2rem', lineHeight: 1.1, fontStyle: 'italic' }}>
          {site.groomName}
        </h1>

        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 10. Garden ──────────────────────────────────────────────────────────────
// Botanique, couronne de feuilles, coins organiques

function LeafWreath({ color, size }: { color: string; size: number }) {
  const leaves = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const r = size * 0.39;
    const cx = size / 2 + r * Math.cos(angle);
    const cy = size / 2 + r * Math.sin(angle);
    return { cx, cy, rotation: i * 30, opacity: i % 2 === 0 ? 0.55 : 0.38 };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: 0, left: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.39} fill="none" stroke={color} strokeWidth="1" opacity="0.35"/>
      {leaves.map((l, i) => (
        <ellipse
          key={i}
          cx={l.cx}
          cy={l.cy}
          rx="10"
          ry="4.5"
          fill={color}
          opacity={l.opacity}
          transform={`rotate(${l.rotation} ${l.cx} ${l.cy})`}
        />
      ))}
    </svg>
  );
}

function GardenCorners({ color }: { color: string }) {
  const sprig = (flip = false) => (
    <svg width="80" height="70" viewBox="0 0 80 70" style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
      <path d="M6,64 Q30,36 58,10" fill="none" stroke={color} strokeWidth="1.3" opacity="0.5"/>
      <ellipse cx="18" cy="52" rx="11" ry="5" fill={color} opacity="0.38" transform="rotate(-45 18 52)"/>
      <ellipse cx="34" cy="36" rx="11" ry="5" fill={color} opacity="0.42" transform="rotate(-45 34 36)"/>
      <ellipse cx="50" cy="22" rx="10" ry="4.5" fill={color} opacity="0.38" transform="rotate(-45 50 22)"/>
      <circle cx="22" cy="46" r="2.5" fill={color} opacity="0.45"/>
      <circle cx="46" cy="26" r="2" fill={color} opacity="0.4"/>
    </svg>
  );
  return (
    <>
      <div style={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none' }}>{sprig()}</div>
      <div style={{ position: 'absolute', top: 12, right: 12, pointerEvents: 'none' }}>{sprig(true)}</div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, pointerEvents: 'none', transform: 'scaleY(-1)' }}>{sprig()}</div>
      <div style={{ position: 'absolute', bottom: 12, right: 12, pointerEvents: 'none', transform: 'scale(-1,-1)' }}>{sprig(true)}</div>
    </>
  );
}

export function HeroGarden({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const c = t.primaryColor;
  const wreathSize = 148;

  return (
    <header
      style={{
        minHeight: '90vh',
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
      <PatternOverlay patternId={t.patternId ?? 'none'} color={c} opacity={t.patternOpacity ?? 0.07} />
      <GardenCorners color={c} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
        {/* Wreath + monogram */}
        <div
          style={{
            position: 'relative',
            width: wreathSize,
            height: wreathSize,
            margin: '0 auto 2.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LeafWreath color={c} size={wreathSize} />
          <span
            style={{
              position: 'relative',
              fontSize: '3rem',
              fontFamily: t.fontFamily,
              color: c,
              fontStyle: 'italic',
              zIndex: 1,
            }}
          >
            {site.brideName[0]}{site.groomName[0]}
          </span>
        </div>

        <p style={{ fontSize: '0.58rem', letterSpacing: '0.42em', textTransform: 'uppercase', color: c, marginBottom: '1.25rem', opacity: 0.8 }}>
          {L.heroKicker}
        </p>

        <h1
          style={{
            fontSize: titleFontSize(t.titleSize),
            fontWeight: 600,
            color: t.textColor,
            margin: '0 0 0.5rem',
            lineHeight: 1.1,
            fontStyle: 'italic',
          }}
        >
          {site.brideName} & {site.groomName}
        </h1>

        {/* Leaf divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', margin: '1.5rem 0' }}>
          <svg width="36" height="18" viewBox="0 0 36 18">
            <path d="M4,14 Q18,4 32,10" fill="none" stroke={c} strokeWidth="1" opacity="0.6"/>
            <ellipse cx="14" cy="8" rx="7" ry="3" fill={c} opacity="0.45" transform="rotate(-20 14 8)"/>
            <ellipse cx="24" cy="10" rx="6" ry="2.5" fill={c} opacity="0.38" transform="rotate(-10 24 10)"/>
          </svg>
          <div style={{ width: 30, height: 1, background: c, opacity: 0.35 }} />
          <svg width="36" height="18" viewBox="0 0 36 18" style={{ transform: 'scaleX(-1)' }}>
            <path d="M4,14 Q18,4 32,10" fill="none" stroke={c} strokeWidth="1" opacity="0.6"/>
            <ellipse cx="14" cy="8" rx="7" ry="3" fill={c} opacity="0.45" transform="rotate(-20 14 8)"/>
            <ellipse cx="24" cy="10" rx="6" ry="2.5" fill={c} opacity="0.38" transform="rotate(-10 24 10)"/>
          </svg>
        </div>

        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 11. Cinematic ───────────────────────────────────────────────────────────
// Plein écran dramatique, typographie géante, vignette

export function HeroCinematic({ site }: HeroProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);

  return (
    <header
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 3rem 10vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pattern at doubled opacity for dramatic effect */}
      <PatternOverlay patternId={t.patternId ?? 'none'} color={t.primaryColor} opacity={(t.patternOpacity ?? 0.08) * 2} />

      {/* Radial vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, transparent 15%, ${t.backgroundColor}99 65%, ${t.backgroundColor}dd 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Horizontal light streak */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${t.primaryColor}33 25%, ${t.primaryColor}66 50%, ${t.primaryColor}33 75%, transparent)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 860, textAlign: 'center' }}>
        <p
          style={{
            fontSize: '0.5rem',
            letterSpacing: '0.85em',
            textTransform: 'uppercase',
            color: t.primaryColor,
            marginBottom: '2rem',
            opacity: 0.9,
          }}
        >
          {L.heroKicker}
        </p>
        {/* Both names at equal visual weight */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: `clamp(3rem, 11vw, 7rem)`,
              fontWeight: 800,
              lineHeight: 0.9,
              margin: 0,
              letterSpacing: '-0.03em',
              color: t.textColor,
              textTransform: 'uppercase',
            }}
          >
            {site.brideName}
          </h1>
          <span style={{ fontSize: `clamp(1.5rem, 4vw, 3rem)`, color: t.primaryColor, fontStyle: 'italic', fontWeight: 300, opacity: 0.8 }}>
            &
          </span>
          <h1
            style={{
              fontSize: `clamp(3rem, 11vw, 7rem)`,
              fontWeight: 800,
              lineHeight: 0.9,
              margin: 0,
              letterSpacing: '-0.03em',
              color: t.textColor,
              textTransform: 'uppercase',
            }}
          >
            {site.groomName}
          </h1>
        </div>

        <div
          style={{
            width: 120,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${t.primaryColor}, transparent)`,
            margin: '2.5rem auto',
          }}
        />

        <HeroMeta site={site} />
      </div>
    </header>
  );
}

// ─── 12. Letterpress ─────────────────────────────────────────────────────────
// Carte imprimée en relief, profondeur typographique

export function HeroLetterpress({ site }: HeroProps) {
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
      <PatternOverlay patternId={t.patternId ?? 'none'} color={t.primaryColor} opacity={t.patternOpacity ?? 0.07} />

      {/* Letterpress card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 520,
          width: '100%',
          background: t.backgroundColor,
          borderRadius: Math.max(4, t.borderRadius),
          padding: '3.5rem 3.5rem 3rem',
          textAlign: 'center',
          boxShadow: [
            `0 1px 2px ${t.primaryColor}20`,
            `0 2px 4px ${t.primaryColor}18`,
            `0 4px 8px ${t.primaryColor}12`,
            `0 8px 16px ${t.primaryColor}0e`,
            `0 16px 32px ${t.primaryColor}08`,
            `0 32px 48px ${t.primaryColor}04`,
            `inset 0 1px 0 ${t.primaryColor}22`,
          ].join(', '),
          border: `1px solid ${t.primaryColor}33`,
        }}
      >
        {/* Top rule */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
            <div style={{ flex: 1, height: 2, background: t.primaryColor, opacity: 0.5 }} />
            <div style={{ width: 6, height: 6, background: t.primaryColor, transform: 'rotate(45deg)', opacity: 0.7 }} />
            <div style={{ flex: 1, height: 2, background: t.primaryColor, opacity: 0.5 }} />
          </div>
          <p style={{ fontSize: '0.52rem', letterSpacing: '0.55em', textTransform: 'uppercase', color: t.primaryColor, margin: '0.75rem 0 0', opacity: 0.85 }}>
            {L.heroKicker}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.3 }} />
            <div style={{ width: 4, height: 4, background: t.primaryColor, transform: 'rotate(45deg)', opacity: 0.45 }} />
            <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.3 }} />
          </div>
        </div>

        {/* Embossed monogram */}
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            border: `1.5px solid ${t.primaryColor}77`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
            boxShadow: `inset 0 2px 4px ${t.primaryColor}22, 0 2px 6px ${t.primaryColor}18, inset 0 -1px 2px ${t.primaryColor}11`,
          }}
        >
          <span style={{ fontSize: '1.75rem', fontFamily: t.fontFamily, color: t.primaryColor, fontStyle: 'italic' }}>
            {site.brideName[0]}{site.groomName[0]}
          </span>
        </div>

        <h1 style={{ fontSize: titleFontSize(t.titleSize), fontWeight: 600, color: t.textColor, margin: '0 0 0.2rem', lineHeight: 1.15, letterSpacing: '0.03em', fontStyle: 'italic' }}>
          {site.brideName}
        </h1>
        <p style={{ color: t.primaryColor, fontSize: '1.15rem', margin: '0.2rem 0', fontStyle: 'italic', opacity: 0.8 }}>&</p>
        <h1 style={{ fontSize: titleFontSize(t.titleSize), fontWeight: 600, color: t.textColor, margin: '0 0 2rem', lineHeight: 1.15, letterSpacing: '0.03em', fontStyle: 'italic' }}>
          {site.groomName}
        </h1>

        <HeroMeta site={site} />

        {/* Bottom rule */}
        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
          <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.3 }} />
          <div style={{ width: 4, height: 4, background: t.primaryColor, transform: 'rotate(45deg)', opacity: 0.45 }} />
          <div style={{ flex: 1, height: 1, background: t.primaryColor, opacity: 0.3 }} />
        </div>
      </div>
    </header>
  );
}
