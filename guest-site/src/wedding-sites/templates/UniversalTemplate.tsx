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
import { FamilyColumnsRow, getFamilyColumns, HiddenAutoMusic, InvitationDetails, InvitationThanks, hasInvitationTexts, PublicStickyNav, renderOptionalSections } from './templateParts';
import type { InvitationStyle } from './templateParts';
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
import { HebrewVerseArc } from '../components/HebrewVerseArc';
import { VintageCountdown } from '../components/VintageCountdown';
import { formatWeddingDate } from '../utils/date';
import { vintageTokens } from '../themes/VintageTheme';
import { VintageRibbon, VintageDivider } from '../components/ornaments/VintageOrnaments';

function ArchedHebrewQuote({ text, color, font }: { text: string; color: string; font: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 1rem 0.5rem', overflow: 'visible' }}>
      <HebrewVerseArc
        text={text}
        color={color}
        dotColor={color}
        font={`'Frank Ruhl Libre', 'Noto Serif Hebrew', 'SBL Hebrew', ${font}, serif`}
        width={500}
        rx={230}
        ry={42}
        maxFontSize={24}
        minFontSize={11}
        maxSpread={2.0}
        opacity={0.85}
      />
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
  // Tokens Vintage : palette de la combinaison choisie, sinon identité d'origine
  const V = vintageTokens(t);

  // Carte d'invitation ovale + décompte dédiés au thème Vintage
  const hasTwoNames = !!(site.brideName?.trim() && site.groomName?.trim());
  // Garde au format faire-part : les phrases et les familles entrent dans la carte ovale
  const garde = hasInvitationTexts(site);
  const vintageInv: InvitationStyle = {
    text: V.colors.ink,
    muted: V.colors.inkMuted,
    accent: V.colors.ink,
    body: V.fonts.body,
    display: t.titleFontFamily || V.fonts.display,
    size: '0.66rem',
    dateSize: '1.15rem',
    caps: true,
  };
  const familyColumns = getFamilyColumns(site);
  const vintageLead = garde ? (
    <div>
      {familyColumns.length ? (
        <div style={{ marginBottom: '0.8rem' }}>
          <FamilyColumnsRow
            columns={familyColumns}
            accent={V.colors.primary}
            textColor={V.colors.ink}
            titleFontFamily={V.fonts.body}
            bodyFontFamily={V.fonts.body}
            lineSize="0.66rem"
            hideTitles
          />
        </div>
      ) : null}
      <InvitationThanks site={site} s={vintageInv} />
    </div>
  ) : undefined;
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
        lead={vintageLead}
        details={garde ? <InvitationDetails site={site} s={vintageInv} /> : undefined}
      />
      <VintageCountdown targetDate={site.date} language={site.language} theme={t} />
      {/* Familles — sous le décompte, sauf garde faire-part (déjà dans la carte) */}
      {garde ? null : <VintageFamilies columns={familyColumns} hideTitles theme={t} />}
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
  const sepColor = t.accentColor ?? t.primaryColor;

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: t.fontFamily,
        backgroundColor: isVintage ? V.backgrounds.page : t.backgroundColor,
        backgroundImage: isVintage ? V.backgrounds.paper : undefined,
        color: t.textColor,
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        // Contexte d'empilement : le motif de page passe SOUS le contenu
        isolation: 'isolate',
      }}
    >
      {/* Global background pattern — suppressed for vintage (paper texture handles ambiance).
          Le motif floral d'une combinaison n'est PAS peint ici : il habille
          uniquement la carte d'en-tête (hero), le reste ne change que de couleurs. */}
      {!isVintage && (
        <PatternOverlay
          patternId={t.patternId ?? 'none'}
          color={t.primaryColor}
          // Un peu plus discret que dans le hero (les sections sont sur cartes),
          // mais assez fort pour que le curseur « Opacité » se voie partout
          opacity={(t.patternOpacity ?? 0.07) * 0.7}
          behind
        />
      )}

      <PublicStickyNav site={enrichedSite} />
      {/* ♫ Musique — lecture automatique, sans bouton (démarre au 1er geste) */}
      <HiddenAutoMusic url={site.content?.musicUrl} />

      {/* Verset hébraïque en arc : intégré DANS la carte du hero (HeroVariants,
          VintageHero). Ici seulement en secours quand la section hero est masquée. */}
      {site.content?.hebrewQuote && !isVintage && !site.sections.hero ? (
        <ArchedHebrewQuote
          text={site.content.hebrewQuote}
          color={t.primaryColor}
          font={t.fontFamily}
        />
      ) : null}

      {/* Hero section — le monogramme est rendu UNE seule fois, dans le hero lui-même */}
      {site.sections.hero ? (
        <div style={{ position: 'relative' }}>
          {isVintage ? VintageHeroSection : <HeroComponent site={enrichedSite} />}
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

        {/* Textes du site (mémoire + famille) — rendu vintage dédié, sinon carte simple */}
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
        ) : !isVintage && (site.content?.texts?.familyText?.trim() || site.content?.texts?.memorialText?.trim()) ? (
          <section style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={cardStyleSurface({ theme: t })}>
              {site.content?.texts?.familyText?.trim() ? (
                <p style={{ margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                  {site.content.texts.familyText}
                </p>
              ) : null}
              {site.content?.texts?.memorialText?.trim() ? (
                <p style={{ margin: site.content?.texts?.familyText?.trim() ? '0.9rem 0 0' : 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: '0.92rem', fontStyle: 'italic', opacity: 0.85 }}>
                  {site.content.texts.memorialText}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <div style={{ textAlign: site.language === 'he' ? 'right' : 'center' }}>
          {renderOptionalSections(enrichedSite, cardStyleSurface)}
        </div>
      </main>
    </div>
  );
}
