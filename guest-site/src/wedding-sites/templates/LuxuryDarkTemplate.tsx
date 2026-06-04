import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function LuxuryDarkTemplate({ site }: WeddingTemplateProps) {
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
        background: `radial-gradient(ellipse at 50% -20%, ${t.primaryColor}44 0%, transparent 52%), ${t.backgroundColor}`,
        color: t.textColor,
        minHeight: '100vh',
      }}
    >
      <PublicStickyNav site={site} />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '3.5rem 1.35rem 4.5rem', textAlign: 'center' }}>
        {site.sections.hero ? (
          <header style={{ marginBottom: '3rem', position: 'relative', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-1rem',
                border: `1px solid ${t.primaryColor}55`,
                borderRadius: Math.max(t.borderRadius, 16),
                pointerEvents: 'none',
                opacity: 0.85,
              }}
            />
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.35em', fontSize: '0.65rem', color: t.primaryColor, marginBottom: '1rem' }}>
              {L.heroKicker}
            </p>
            <h1
              style={{
                fontSize: titleFontSize(t.titleSize),
                fontWeight: 600,
                margin: '0 0 0.5rem',
                lineHeight: 1.1,
                background: `linear-gradient(120deg, ${t.textColor} 30%, ${t.primaryColor})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: t.textColor,
              }}
            >
              {site.brideName} & {site.groomName}
            </h1>
            <p style={{ fontSize: '0.95rem', letterSpacing: '0.08em', opacity: 0.85 }}>{site.coupleName}</p>
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
      <PublicAudioToggle site={site} />
    </div>
  );
}
