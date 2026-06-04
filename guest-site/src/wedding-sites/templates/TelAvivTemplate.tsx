import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function TelAvivTemplate({ site }: WeddingTemplateProps) {
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

      {site.sections.hero ? (
        <header
          style={{
            minHeight: '100vh',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            overflow: 'hidden',
          }}
        >
          {/* Left — bold text */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '5rem 3rem 5rem 5rem',
            }}
          >
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: accent, marginBottom: '2rem' }}>
              {L.heroKicker}
            </p>
            <h1
              style={{
                fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                fontWeight: 900,
                lineHeight: 0.95,
                margin: '0 0 1.5rem',
                color: t.textColor,
                letterSpacing: '-0.03em',
              }}
            >
              {site.brideName}
              <br />
              <span style={{ color: accent }}>& </span>
              {site.groomName}
            </h1>
            <HeroMeta site={site} />
            {site.welcomeText && (
              <p style={{ marginTop: '1.5rem', fontSize: '1rem', lineHeight: 1.6, opacity: 0.7, maxWidth: 380 }}>
                {site.welcomeText}
              </p>
            )}
          </div>

          {/* Right — solid accent block */}
          <div
            style={{
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8rem',
            }}
          >
            <span style={{ opacity: 0.3 }}>💍</span>
          </div>
        </header>
      ) : null}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem 5rem' }}>
        {!site.sections.guestMessage && site.mainText ? (
          <div style={{ ...cardStyleSurface({ theme: t }), borderLeft: `4px solid ${accent}`, borderRadius: 0 }}>
            <p style={{ margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{site.mainText}</p>
          </div>
        ) : null}
        {renderOptionalSections(site, cardStyleSurface)}
      </div>

      <PublicAudioToggle site={site} />
    </div>
  );
}
