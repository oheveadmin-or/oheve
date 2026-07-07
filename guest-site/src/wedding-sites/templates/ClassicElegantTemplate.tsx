import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function ClassicElegantTemplate({ site }: WeddingTemplateProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const dir = site.language === 'he' ? 'rtl' : 'ltr';
  const textAlign = site.language === 'he' ? ('right' as const) : ('center' as const);

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: t.fontFamily,
        background: `linear-gradient(165deg, ${t.backgroundColor} 0%, #ffffff 55%, ${t.secondaryColor}18 100%)`,
        color: t.textColor,
        minHeight: '100vh',
      }}
    >
      <PublicStickyNav site={site} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3.25rem 1.35rem 4.5rem', textAlign }}>
        {site.sections.hero ? (
          <header style={{ marginBottom: '2.5rem', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.28em',
                fontSize: '0.7rem',
                color: t.primaryColor,
                marginBottom: '0.75rem',
              }}
            >
              {L.heroKicker}
            </p>
            <h1
              style={{
                fontFamily: t.scriptFontFamily || t.titleFontFamily || t.fontFamily,
                fontSize: titleFontSize(t.nameSize ?? t.titleSize),
                fontWeight: 700,
                margin: '0 0 0.5rem',
                lineHeight: 1.12,
                overflowWrap: 'anywhere',
              }}
            >
              {site.brideName}{' '}
              <span style={{ fontWeight: 400, color: t.secondaryColor, fontStyle: 'italic' }}>&</span>{' '}
              {site.groomName}
            </h1>
            <p style={{ fontSize: '1.05rem', opacity: 0.9, margin: '0 0 0.25rem' }}>{site.coupleName}</p>
            <HeroMeta site={site} />
          </header>
        ) : null}

        {!site.sections.guestMessage && site.mainText ? (
          <div style={{ ...cardStyleSurface({ theme: t }), textAlign: site.language === 'he' ? 'right' : 'left' }}>
            <p style={{ margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>{site.mainText}</p>
          </div>
        ) : null}

        <div style={{ textAlign: site.language === 'he' ? 'right' : 'left' }}>{renderOptionalSections(site, cardStyleSurface)}</div>
      </div>
      <PublicAudioToggle site={site} />
    </div>
  );
}
