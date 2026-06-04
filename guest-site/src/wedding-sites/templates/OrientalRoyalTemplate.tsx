import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function OrientalRoyalTemplate({ site }: WeddingTemplateProps) {
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
        backgroundColor: t.backgroundColor,
        backgroundImage: `repeating-linear-gradient(45deg, ${t.primaryColor}08 0, ${t.primaryColor}08 1px, transparent 1px, transparent 12px)`,
        color: t.textColor,
        minHeight: '100vh',
      }}
    >
      <PublicStickyNav site={site} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>
        <div
          style={{
            border: `2px solid ${t.primaryColor}`,
            borderRadius: Math.max(t.borderRadius, 10),
            padding: '3px',
            boxShadow: `0 28px 60px ${t.primaryColor}22`,
          }}
        >
          <div style={{ padding: '2.75rem 1.5rem 3rem', border: `1px solid ${t.secondaryColor}55`, borderRadius: Math.max(t.borderRadius - 2, 8), textAlign: 'center' }}>
            {site.sections.hero ? (
              <header style={{ marginBottom: '2.5rem', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ fontSize: '0.8rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: t.primaryColor }}>{L.heroKicker}</p>
                <h1 style={{ fontSize: titleFontSize(t.titleSize), fontWeight: 700, margin: '0.75rem 0', lineHeight: 1.12 }}>
                  {site.brideName} · {site.groomName}
                </h1>
                <p style={{ margin: '0 0 0.5rem', opacity: 0.9 }}>{site.coupleName}</p>
                <HeroMeta site={site} />
              </header>
            ) : null}

            {!site.sections.guestMessage && site.mainText ? (
              <div style={{ ...cardStyleSurface({ theme: t }), textAlign: site.language === 'he' ? 'right' : 'center' }}>
                <p style={{ margin: 0, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{site.mainText}</p>
              </div>
            ) : null}

            <div style={{ textAlign: site.language === 'he' ? 'right' : 'left' }}>{renderOptionalSections(site, cardStyleSurface)}</div>
          </div>
        </div>
      </div>
      <PublicAudioToggle site={site} />
    </div>
  );
}
