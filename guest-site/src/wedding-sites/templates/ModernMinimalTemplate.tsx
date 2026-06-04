import type { WeddingTemplateProps } from '../types';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function ModernMinimalTemplate({ site }: WeddingTemplateProps) {
  const t = site.theme;
  const dir = site.language === 'he' ? 'rtl' : 'ltr';

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
        letterSpacing: '-0.01em',
      }}
    >
      <PublicStickyNav site={site} />
      <div
        className="wedding-modern-grid"
        style={{
          maxWidth: t.layout === 'split' ? 960 : 640,
          margin: '0 auto',
          padding: '4rem 1.5rem',
          display: 'grid',
          gap: '2.5rem',
          gridTemplateColumns: t.layout === 'split' ? '1fr 1fr' : '1fr',
        }}
      >
        {site.sections.hero ? (
          <header style={{ textAlign: site.language === 'he' ? 'right' : 'left', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ width: 48, height: 2, background: t.primaryColor, marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: titleFontSize(t.titleSize), fontWeight: 600, margin: '0 0 0.75rem', lineHeight: 1.05 }}>
              {site.brideName}
              <br />
              {site.groomName}
            </h1>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.95rem', opacity: 0.7 }}>{site.coupleName}</p>
            <HeroMeta site={site} />
          </header>
        ) : null}

        <div>
          {!site.sections.guestMessage && site.mainText ? (
            <div style={{ ...cardStyleSurface({ theme: t }), border: `1px solid ${t.textColor}18` }}>
              <p style={{ margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{site.mainText}</p>
            </div>
          ) : null}
          {renderOptionalSections(site, cardStyleSurface)}
        </div>
      </div>
      <PublicAudioToggle site={site} />
    </div>
  );
}
