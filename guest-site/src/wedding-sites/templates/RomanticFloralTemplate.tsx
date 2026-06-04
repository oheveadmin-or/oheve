import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function RomanticFloralTemplate({ site }: WeddingTemplateProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const dir = site.language === 'he' ? 'rtl' : 'ltr';

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: t.fontFamily,
        background: `linear-gradient(180deg, ${t.secondaryColor}55 0%, ${t.backgroundColor} 28%, ${t.backgroundColor} 100%)`,
        color: t.textColor,
        minHeight: '100vh',
      }}
    >
      <PublicStickyNav site={site} />
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '3rem 1.35rem 4rem', textAlign: 'center' }}>
        {site.sections.hero ? (
          <header style={{ marginBottom: '2.75rem', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '0.35rem 1rem',
                borderRadius: 999,
                background: `${t.primaryColor}22`,
                color: t.primaryColor,
                fontSize: '0.72rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              {L.heroKicker}
            </div>
            <h1
              style={{
                fontSize: titleFontSize(t.titleSize),
                fontWeight: 700,
                margin: '0.5rem 0',
                lineHeight: 1.15,
                color: t.primaryColor,
              }}
            >
              {site.brideName} <span style={{ color: t.secondaryColor }}>♥</span> {site.groomName}
            </h1>
            <p style={{ margin: '0 0 0.5rem', opacity: 0.9 }}>{site.coupleName}</p>
            <HeroMeta site={site} />
          </header>
        ) : null}

        {!site.sections.guestMessage && site.mainText ? (
          <div style={{ ...cardStyleSurface({ theme: t }), borderRadius: Math.max(t.borderRadius, 20) }}>
            <p style={{ margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{site.mainText}</p>
          </div>
        ) : null}

        <div style={{ textAlign: site.language === 'he' ? 'right' : 'left' }}>{renderOptionalSections(site, cardStyleSurface)}</div>
      </div>
      <PublicAudioToggle site={site} />
    </div>
  );
}
