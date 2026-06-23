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
  HeroRoyal,
  HeroGarden,
  HeroCinematic,
  HeroLetterpress,
} from './HeroVariants';
import { applyThemePreset } from './themePresets';

function stripNikud(text: string): string {
  // Remove Hebrew vowel points (nikud) and cantillation marks (U+0591–U+05C7)
  return text.replace(/[֑-ׇ]/g, '');
}

function ArchedHebrewQuote({ text, color, font }: { text: string; color: string; font: string }) {
  const clean = stripNikud(text);
  return (
    <div style={{ textAlign: 'center', padding: '2rem 1rem 0', overflow: 'visible' }}>
      <svg
        viewBox="0 0 500 96"
        width="500"
        height="96"
        style={{ maxWidth: '94%', overflow: 'visible' }}
        role="img"
        aria-label={text}
      >
        <defs>
          {/* Arc path goes left-to-right; Hebrew direction is handled via unicode-bidi */}
          <path id="hq-arc" d="M 20,80 Q 250,10 480,80" />
        </defs>
        <circle cx="20" cy="80" r="3" fill={color} opacity="0.4" />
        <circle cx="480" cy="80" r="3" fill={color} opacity="0.4" />
        <text
          fontFamily={`'Frank Ruhl Libre', 'Noto Serif Hebrew', 'SBL Hebrew', ${font}, serif`}
          fontSize="22"
          fill={color}
          textAnchor="middle"
          opacity="0.85"
          direction="rtl"
        >
          <textPath href="#hq-arc" startOffset="50%">
            {clean}
          </textPath>
        </text>
      </svg>
    </div>
  );
}

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
    royal: HeroRoyal,
    garden: HeroGarden,
    cinematic: HeroCinematic,
    letterpress: HeroLetterpress,
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
      {/* Global background pattern — subtle layer under all content */}
      <PatternOverlay
        patternId={t.patternId ?? 'none'}
        color={t.primaryColor}
        opacity={(t.patternOpacity ?? 0.07) * 0.55}
      />

      <PublicStickyNav site={enrichedSite} />

      {/* Verset hébraïque en arc */}
      {site.content?.hebrewQuote ? (
        <ArchedHebrewQuote
          text={site.content.hebrewQuote}
          color={t.primaryColor}
          font={t.fontFamily}
        />
      ) : null}

      {/* Hero section */}
      {site.sections.hero ? <HeroComponent site={enrichedSite} /> : null}

      {/* Content sections */}
      <main
        style={{
          maxWidth: heroStyle === 'magazine' || heroStyle === 'cinematic' ? 860
            : heroStyle === 'minimal' ? 680
            : 780,
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
