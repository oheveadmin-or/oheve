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
import { getFamilyColumns, HiddenAutoMusic, PublicStickyNav, renderOptionalSections } from './templateParts';
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
import { VintageHero, VintageFamilies } from '../components/VintageHero';
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
  const isPreview = site.id === 'preview-draft';

  // Carte d'invitation ovale + décompte dédiés au thème Vintage
  const hasTwoNames = !!(site.brideName?.trim() && site.groomName?.trim());
  const VintageHeroSection = (
    <>
      <VintageHero
        name1={hasTwoNames ? site.brideName : site.coupleName || site.brideName || site.groomName || ''}
        name2={hasTwoNames ? `& ${site.groomName}` : undefined}
        description={site.welcomeText || undefined}
        dateLabel={formatWeddingDate(site.date, site.language)}
        city={site.city || undefined}
        venue={site.venue || site.content?.venue?.name || undefined}
        monogramSvg={site.content?.monogramSvg}
        monogramSizePx={site.content?.monogramSizePx}
        hebrewQuote={site.content?.hebrewQuote}
        theme={t}
      />
      <VintageCountdown targetDate={site.date} language={site.language} />
      {/* Familles — affichées juste sous le décompte */}
      <VintageFamilies columns={getFamilyColumns(site)} />
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

  // Photo vedette : même comportement que les thèmes autonomes (Rayures,
  // Voile Ivoire, Cartes) — la 1re photo s'affiche aussi quand la galerie
  // est masquée, pour un rendu identique sur tous les thèmes.
  const universalPhotos = (site.content?.galleryPhotos ?? []).filter(Boolean);
  const featuredPhoto = !site.sections.gallery
    ? universalPhotos[0] || site.content?.venue?.photoUrl || undefined
    : undefined;

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
      {/* ♫ Musique — lecture automatique, sans bouton (démarre au 1er geste) */}
      <HiddenAutoMusic url={site.content?.musicUrl} enabled={!isPreview} />

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
            const svgAdapted = enrichedSite.content!.monogramSvg!
              .replace(/width="[^"]*"/, 'width="100%"')
              .replace(/height="[^"]*"/, 'height="100%"');
            return (
              <div style={{ position: 'absolute', zIndex: 10, pointerEvents: 'none', top: '1.5rem', left: '50%', transform: 'translateX(-50%)' }}>
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

        {/* Photo vedette (1re photo de la galerie ou photo du lieu) */}
        {featuredPhoto ? (
          <section className="wedding-fade-in" style={{ margin: '1.5rem auto 2rem', maxWidth: 620, textAlign: 'center' }}>
            <img
              src={featuredPhoto}
              alt=""
              loading="lazy"
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                objectFit: 'cover',
                display: 'block',
                borderRadius: Math.max(6, t.borderRadius),
                boxShadow: `0 22px 60px -30px ${t.primaryColor}88`,
              }}
            />
          </section>
        ) : null}

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

        {/* Textes du site (mémoire + famille) — rendu vintage dédié */}
        {isVintage && (site.content?.texts?.familyText?.trim() || site.content?.texts?.memorialText?.trim()) ? (
          <section style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <VintageRibbon width={100} color={V.colors.primary} style={{ marginBottom: '0.7rem' }} />
            {site.content?.texts?.familyText?.trim() ? (
              <p
                style={{
                  fontFamily: V.fonts.body,
                  fontSize: '0.92rem',
                  lineHeight: 1.85,
                  color: V.colors.inkMuted,
                  maxWidth: 440,
                  margin: '0 auto',
                  whiteSpace: 'pre-wrap',
                  letterSpacing: '0.02em',
                }}
              >
                {site.content.texts.familyText}
              </p>
            ) : null}
            {site.content?.texts?.memorialText?.trim() ? (
              <p
                style={{
                  fontFamily: V.fonts.body,
                  fontStyle: 'italic',
                  fontSize: '0.82rem',
                  lineHeight: 1.7,
                  color: V.colors.inkMuted,
                  opacity: 0.85,
                  maxWidth: 400,
                  margin: '0.9rem auto 0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {site.content.texts.memorialText}
              </p>
            ) : null}
          </section>
        ) : null}

        <div style={{ textAlign: site.language === 'he' ? 'right' : 'center' }}>
          {renderOptionalSections(enrichedSite, cardStyleSurface)}
        </div>
      </main>
    </div>
  );
}
