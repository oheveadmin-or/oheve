import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { cardStyleSurface, titleFontSize } from './templateCardStyles';
import { HeroMeta, PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';

export function HebrewElegantTemplate({ site }: WeddingTemplateProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  /** Toujours RTL pour ce gabarit, même si la langue n’est pas hébreu (invité forcé mise en page) */
  const dir = 'rtl';

  const font = "'Heebo', 'Cormorant Garamond', Georgia, serif";

  return (
    <div
      id="top"
      dir={dir}
      lang="he"
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: font,
        background: `linear-gradient(125deg, ${t.backgroundColor} 0%, #ffffff 42%, ${t.secondaryColor}20 100%)`,
        color: t.textColor,
        minHeight: '100vh',
      }}
    >
      <PublicStickyNav site={site} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3.25rem 1.35rem 4.5rem', textAlign: 'right' }}>
        {site.sections.hero ? (
          <header style={{ marginBottom: '2.75rem', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.2em', color: t.primaryColor }}>{L.heroKicker}</p>
            <h1 style={{ fontSize: titleFontSize(t.titleSize), fontWeight: 600, margin: '0.6rem 0', lineHeight: 1.2 }}>
              {site.brideName} <span style={{ color: t.secondaryColor }}>&</span> {site.groomName}
            </h1>
            <p style={{ fontSize: '1rem', opacity: 0.9, margin: '0 0 0.5rem' }}>{site.coupleName}</p>
            <div style={{ textAlign: 'right' }}>
              <HeroMeta site={site} />
            </div>
          </header>
        ) : null}

        {!site.sections.guestMessage && site.mainText ? (
          <div style={{ ...cardStyleSurface({ theme: t }), textAlign: 'right' }}>
            <p style={{ margin: 0, lineHeight: 1.9, whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>{site.mainText}</p>
          </div>
        ) : null}

        {renderOptionalSections(site, cardStyleSurface)}
      </div>
      <PublicAudioToggle site={site} />
    </div>
  );
}
