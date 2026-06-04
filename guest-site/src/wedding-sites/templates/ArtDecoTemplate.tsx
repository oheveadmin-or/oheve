import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

const GEO_BORDER = (color: string) => ({
  border: `1px solid ${color}`,
  position: 'relative' as const,
});

export function ArtDecoTemplate({ site }: WeddingTemplateProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const dir = site.language === 'he' ? 'rtl' : 'ltr';
  const accent = t.primaryColor;

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: t.fontFamily,
        background: t.backgroundColor,
        color: t.textColor,
        minHeight: '100vh',
      }}
    >
      <PublicStickyNav site={site} />

      {/* Hero Art Deco */}
      {site.sections.hero ? (
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
          {/* Geometric decorations */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 20, left: 20, width: 120, height: 120, border: `1px solid ${accent}44`, transform: 'rotate(45deg)' }} />
            <div style={{ position: 'absolute', top: 30, left: 30, width: 100, height: 100, border: `1px solid ${accent}22`, transform: 'rotate(45deg)' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 120, height: 120, border: `1px solid ${accent}44`, transform: 'rotate(45deg)' }} />
            <div style={{ position: 'absolute', bottom: 30, right: 30, width: 100, height: 100, border: `1px solid ${accent}22`, transform: 'rotate(45deg)' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}33, transparent)` }} />
          </div>

          {/* Horizontal lines */}
          <div style={{ width: '100%', maxWidth: 600, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: 1, background: accent }} />
              <span style={{ color: accent, fontSize: '1.2rem' }}>◆</span>
              <div style={{ flex: 1, height: 1, background: accent }} />
            </div>
          </div>

          <p style={{ textTransform: 'uppercase', letterSpacing: '0.5em', fontSize: '0.6rem', color: accent, marginBottom: '1.5rem' }}>
            {L.heroKicker}
          </p>

          <h1
            style={{
              fontSize: titleFontSize(t.titleSize),
              fontWeight: 700,
              letterSpacing: '0.08em',
              margin: '0 0 0.5rem',
              color: t.textColor,
              textTransform: 'uppercase',
            }}
          >
            {site.brideName}
          </h1>
          <p style={{ color: accent, fontSize: '1.4rem', margin: '0.3rem 0', letterSpacing: '0.3em' }}>& </p>
          <h1
            style={{
              fontSize: titleFontSize(t.titleSize),
              fontWeight: 700,
              letterSpacing: '0.08em',
              margin: '0 0 1.5rem',
              color: t.textColor,
              textTransform: 'uppercase',
            }}
          >
            {site.groomName}
          </h1>

          <div style={{ width: '100%', maxWidth: 600, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: 1, background: accent }} />
              <span style={{ color: accent, fontSize: '1.2rem' }}>◆</span>
              <div style={{ flex: 1, height: 1, background: accent }} />
            </div>
          </div>

          <HeroMeta site={site} />
        </header>
      ) : null}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        {!site.sections.guestMessage && site.mainText ? (
          <div style={{ ...cardStyleSurface({ theme: t }), textAlign: 'center', ...GEO_BORDER(`${accent}44`) }}>
            <p style={{ margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{site.mainText}</p>
          </div>
        ) : null}
        {renderOptionalSections(site, cardStyleSurface)}
      </div>

      <PublicAudioToggle site={site} />
    </div>
  );
}
