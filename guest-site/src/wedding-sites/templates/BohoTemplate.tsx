import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function BohoTemplate({ site }: WeddingTemplateProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const dir = site.language === 'he' ? 'rtl' : 'ltr';
  const accent = t.primaryColor;
  const secondary = t.secondaryColor;

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: t.fontFamily,
        background: `
          radial-gradient(ellipse 80% 40% at 20% 80%, ${accent}18 0%, transparent 60%),
          radial-gradient(ellipse 60% 30% at 80% 20%, ${secondary}22 0%, transparent 50%),
          ${t.backgroundColor}
        `,
        color: t.textColor,
        minHeight: '100vh',
      }}
    >
      <PublicStickyNav site={site} />

      {site.sections.hero ? (
        <header
          style={{
            minHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '4rem 2rem',
          }}
        >
          {/* Boho arch */}
          <div
            style={{
              width: 220,
              height: 110,
              borderRadius: '110px 110px 0 0',
              border: `2px solid ${accent}55`,
              marginBottom: '2rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '1.2rem',
            }}
          >
            <span style={{ width: 40, height: 2, background: `${accent}55`, display: 'inline-block', borderRadius: 2 }} />
          </div>

          <p style={{ color: accent, fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
            {L.heroKicker}
          </p>

          <h1
            style={{
              fontSize: titleFontSize(t.titleSize),
              fontWeight: 400,
              margin: '0 0 0.3rem',
              color: t.textColor,
              lineHeight: 1.15,
            }}
          >
            {site.brideName} & {site.groomName}
          </h1>

          <div style={{ color: accent, margin: '1rem 0', fontSize: '1.4rem' }}>— ✦ —</div>

          <HeroMeta site={site} />

          {site.welcomeText && (
            <p
              style={{
                maxWidth: 480,
                margin: '1.5rem auto 0',
                fontSize: '1.05rem',
                lineHeight: 1.7,
                opacity: 0.8,
                fontStyle: 'italic',
              }}
            >
              {site.welcomeText}
            </p>
          )}
        </header>
      ) : null}

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        {!site.sections.guestMessage && site.mainText ? (
          <div style={{ ...cardStyleSurface({ theme: t }), textAlign: 'center', borderRadius: t.borderRadius }}>
            <p style={{ margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>{site.mainText}</p>
          </div>
        ) : null}
        {renderOptionalSections(site, cardStyleSurface)}
      </div>

      <PublicAudioToggle site={site} />
    </div>
  );
}
