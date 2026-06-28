/**
 * UniversalTemplate — the new default template engine.
 * It reads `theme.heroStyle`, `theme.patternId`, `theme.separatorStyle`, and
 * `theme.cardStyle` to produce a structurally unique layout for each preset.
 *
 * All existing templates (ClassicElegant, LuxuryDark, etc.) remain for
 * backwards compatibility. New sites created via the builder use this template.
 */
import type { CSSProperties } from 'react';
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
import { VintageHero } from '../components/VintageHero';
import { VintageCountdown } from '../components/VintageCountdown';
import { formatWeddingDate } from '../utils/date';
import { VintageTheme as V } from '../themes/VintageTheme';
import { VintageRibbon, VintageDivider } from '../components/ornaments/VintageOrnaments';

function stripNikud(text: string): string {
  // Remove Hebrew vowel points (nikud) and cantillation marks (U+0591–U+05C7)
  return text.replace(/[֑-ׇ]/g, '');
}

function ArchedHebrewQuote({ text, color, font }: { text: string; color: string; font: string }) {
  const clean = stripNikud(text);
  return (
    <div style={{ textAlign: 'center', padding: '2rem 1rem 0.5rem', overflow: 'visible' }}>
      <svg
        viewBox="0 0 500 96"
        width="500"
        height="96"
        style={{ maxWidth: '94%', overflow: 'visible' }}
        role="img"
        aria-label={text}
      >
        <defs>
          {/* Path goes LEFT→RIGHT so glyphs appear right-side-up on the arc */}
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
  const isVintage = t.style === 'vintage-blue';

  // Carte d'invitation ovale + décompte dédiés au thème Vintage
  const vintageKicker =
    site.language === 'he' ? 'הזמנה לחתונה' : site.language === 'en' ? 'Wedding invitation' : 'Invitation au mariage';
  const hasTwoNames = !!(site.brideName?.trim() && site.groomName?.trim());
  const VintageHeroSection = (
    <>
      <VintageHero
        kicker={vintageKicker}
        name1={hasTwoNames ? site.brideName : site.coupleName || site.brideName || site.groomName || ''}
        name2={hasTwoNames ? `& ${site.groomName}` : undefined}
        description={site.welcomeText || undefined}
        dateLabel={formatWeddingDate(site.date, site.language)}
        monogramSvg={site.content?.monogramSvg}
        monogramSizePx={site.content?.monogramSizePx}
        hebrewQuote={site.content?.hebrewQuote}
        parentsBride={site.content?.parentsBride}
        parentsGroom={site.content?.parentsGroom}
        brideFamilyName={site.content?.brideFamilyName}
        groomFamilyName={site.content?.groomFamilyName}
      />
      <VintageCountdown targetDate={site.date} language={site.language} />
    </>
  );

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
        background: isVintage ? V.backgrounds.page : t.backgroundColor,
        backgroundImage: isVintage ? V.backgrounds.paper : undefined,
        color: t.textColor,
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Global background pattern — suppressed for vintage (paper texture handles ambiance) */}
      {!isVintage && (
        <PatternOverlay
          patternId={t.patternId ?? 'none'}
          color={t.primaryColor}
          opacity={(t.patternOpacity ?? 0.07) * 0.55}
        />
      )}

      <PublicStickyNav site={enrichedSite} />

      {/* Verset hébraïque en arc — affiché ici sauf pour vintage (intégré dans la carte) */}
      {site.content?.hebrewQuote && !isVintage ? (
        <ArchedHebrewQuote
          text={site.content.hebrewQuote}
          color={t.primaryColor}
          font={t.fontFamily}
        />
      ) : null}

      {/* Hero section — wrapped in relative container for optional monogram overlay */}
      {site.sections.hero ? (
        <div style={{ position: 'relative' }}>
          {isVintage ? VintageHeroSection : <HeroComponent site={enrichedSite} />}
          {/* Monogram overlay — shown on all hero styles except 'monogram' (already inline there)
              and except Vintage (le monogramme est déjà intégré dans la carte ovale) */}
          {!isVintage && enrichedSite.content?.monogramSvg && heroStyle !== 'monogram' && (() => {
            const pos = enrichedSite.content?.monogramPosition ?? 'top-center';
            const base: CSSProperties = {
              position: 'absolute',
              zIndex: 10,
              pointerEvents: 'none',
            };
            const posStyles: Record<string, CSSProperties> = {
              'top-center':    { top: '1.5rem',    left: '50%',   transform: 'translateX(-50%)' },
              'center':        { top: '50%',        left: '50%',   transform: 'translate(-50%, -50%)' },
              'bottom-center': { bottom: '1.5rem',  left: '50%',   transform: 'translateX(-50%)' },
              'bottom-left':   { bottom: '1.5rem',  left: '1.5rem' },
              'bottom-right':  { bottom: '1.5rem',  right: '1.5rem' },
            };
            const svgAdapted = enrichedSite.content!.monogramSvg!
              .replace(/width="[^"]*"/, 'width="100%"')
              .replace(/height="[^"]*"/, 'height="100%"');
            return (
              <div style={{ ...base, ...posStyles[pos] }}>
                <div
                  style={{ width: 100, height: 100 }}
                  dangerouslySetInnerHTML={{ __html: svgAdapted }}
                />
              </div>
            );
          })()}
        </div>
      ) : null}

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
        {site.mainText ? (
          isVintage ? (
            <section style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <VintageRibbon width={120} color={V.colors.primary} style={{ marginBottom: '0.5rem' }} />
              <p
                style={{
                  fontFamily: V.fonts.body,
                  fontSize: '0.9rem',
                  lineHeight: 1.85,
                  color: V.colors.inkMuted,
                  maxWidth: 420,
                  margin: '0 auto',
                  whiteSpace: 'pre-wrap',
                  letterSpacing: '0.02em',
                }}
              >
                {site.mainText}
              </p>
              <VintageDivider width={180} color={V.colors.primary} style={{ marginTop: '1rem' }} />
            </section>
          ) : (
            <section style={{ textAlign: heroStyle === 'magazine' ? 'left' : 'center', marginBottom: '2rem' }}>
              <div style={cardStyleSurface({ theme: t })}>
                <p style={{ margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>
                  {site.mainText}
                </p>
              </div>
            </section>
          )
        ) : null}

        <div style={{ textAlign: site.language === 'he' ? 'right' : 'center' }}>
          {renderOptionalSections(enrichedSite, cardStyleSurface)}
        </div>
      </main>

      <PublicAudioToggle site={enrichedSite} />
    </div>
  );
}
