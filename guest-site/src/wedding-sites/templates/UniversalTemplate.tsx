/**
 * UniversalTemplate — the new default template engine.
 * It reads `theme.heroStyle`, `theme.patternId`, `theme.separatorStyle`, and
 * `theme.cardStyle` to produce a structurally unique layout for each preset.
 *
 * All existing templates (ClassicElegant, LuxuryDark, etc.) remain for
 * backwards compatibility. New sites created via the builder use this template.
 */
import type { WeddingTemplateProps } from '../types';
import { cardStyleSurface } from './templateCardStyles';
import { PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';
import { SectionSeparator } from './SectionSeparator';
import { PatternOverlay } from './PatternOverlay';
import {
  HeroEditorial,
  HeroSplit,
  HeroFairepart,
  HeroMonogramStyle,
  HeroLuxe,
  HeroArtDeco,
  HeroMagazine,
  HeroMinimal,
} from './HeroVariants';
import { applyThemePreset } from './themePresets';

export function UniversalTemplate({ site }: WeddingTemplateProps) {
  // Apply structural preset defaults (fills heroStyle, patternId, etc.)
  const enrichedSite = {
    ...site,
    theme: applyThemePreset(site.theme),
  };
  const t = enrichedSite.theme;
  const dir = site.language === 'he' ? 'rtl' : 'ltr';

  const heroStyle = t.heroStyle ?? 'editorial';

  const HeroComponent = {
    editorial: HeroEditorial,
    split: HeroSplit,
    'faire-part': HeroFairepart,
    monogram: HeroMonogramStyle,
    luxe: HeroLuxe,
    'art-deco': HeroArtDeco,
    magazine: HeroMagazine,
    minimal: HeroMinimal,
  }[heroStyle] ?? HeroEditorial;

  const sep = t.separatorStyle ?? 'none';
  const sepColor = t.primaryColor;

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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Global background pattern (very subtle) */}
      <PatternOverlay
        patternId={t.patternId ?? 'none'}
        color={t.primaryColor}
        opacity={(t.patternOpacity ?? 0.07) * 0.4}
      />

      <PublicStickyNav site={enrichedSite} />

      {/* Hero section */}
      {site.sections.hero ? <HeroComponent site={enrichedSite} /> : null}

      {/* Content sections */}
      <main
        style={{
          maxWidth: heroStyle === 'magazine' ? 800 : 760,
          margin: '0 auto',
          padding: `0 1.35rem 5rem`,
          textAlign: site.language === 'he' ? 'right' : 'left',
        }}
      >
        <SectionSeparator style={sep} color={sepColor} />

        {/* Main text (guestMessage section) */}
        {site.sections.guestMessage && site.mainText ? (
          <section style={{ textAlign: heroStyle === 'magazine' ? 'left' : 'center', marginBottom: '2rem' }}>
            <div style={cardStyleSurface({ theme: t })}>
              <p style={{ margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>
                {site.mainText}
              </p>
            </div>
          </section>
        ) : null}

        {!site.sections.guestMessage && site.mainText ? (
          <section style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={cardStyleSurface({ theme: t })}>
              <p style={{ margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>
                {site.mainText}
              </p>
            </div>
          </section>
        ) : null}

        <div style={{ textAlign: site.language === 'he' ? 'right' : 'center' }}>
          {renderOptionalSections(enrichedSite, cardStyleSurface)}
        </div>
      </main>

      <PublicAudioToggle site={enrichedSite} />
    </div>
  );
}
