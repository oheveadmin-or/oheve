/**
 * VoileIvoireTemplate — modèle « Voile Ivoire » (faire-part romantique).
 *
 * Inspiré d'un faire-part vintage haut de gamme : fond « rideau ivoire »,
 * calligraphie anglaise, ornements dorés filigranes, succession de cartes
 * crème encadrées. Tout le contenu vient de `site` (aucun texte fixe) et les
 * couleurs sont pilotées par le thème live via `voileTokens`.
 *
 * Cartes bespoke : Hero · Countdown (style « horloge » à deux-points) ·
 * Familles · Photo. Les sections fonctionnelles (Programme, Lieu, RSVP,
 * Galerie, FAQ…) sont déléguées à `renderOptionalSections`, habillées du même
 * style de carte encadrée — aucune logique backend réécrite.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { formatWeddingDate } from '../utils/date';
import { voileTokens } from '../themes/VoileIvoireTheme';
import type { VoileTokens } from '../themes/VoileIvoireTheme';
import { VoileFrame, VoileDivider } from './VoileOrnaments';
import { FamilyColumnsRow, getFamilyColumns, HiddenAutoMusic, PublicStickyNav, renderOptionalSections } from './templateParts';
import type { ResolvedFamilyColumn } from './templateParts';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Coque de carte encadrée commune                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function Card({
  tk,
  children,
  id,
  framed = true,
  style,
}: {
  tk: VoileTokens;
  children: React.ReactNode;
  id?: string;
  framed?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section
      id={id}
      className="wedding-fade-in"
      style={{
        width: tk.cardWidth,
        margin: '0 auto',
        marginBottom: tk.cardGap,
        background: tk.colors.card,
        backdropFilter: 'blur(2px)',
        borderRadius: tk.radius.card,
        boxShadow: tk.cardShadow,
        boxSizing: 'border-box',
        scrollMarginTop: 88,
        overflow: 'hidden',
        // Conteneur de requête : les tailles en `cqw` des titres/prénoms
        // s'échelonnent sur la largeur de CETTE carte → jamais de débordement.
        containerType: 'inline-size',
        ...style,
      }}
    >
      {framed ? (
        <VoileFrame color={tk.colors.accent} style={{ padding: tk.cardPadding }}>
          {children}
        </VoileFrame>
      ) : (
        children
      )}
    </section>
  );
}

/** Retire les nikud/ta'amim (points-voyelles et cantillation U+0591–U+05C7). */
function stripNikud(text: string): string {
  return text.replace(/[֑-ׇ]/g, '');
}

/** Verset hébraïque (פסוק) disposé en arc, dans l'esprit calligraphié du faire-part. */
function VoileHebrewArc({ tk, text }: { tk: VoileTokens; text: string }) {
  const clean = stripNikud(text.trim());
  if (!clean) return null;
  // Longueur d'arc ≈ 490 unités : la taille de police s'adapte au verset pour
  // qu'il tienne ENTIER sur l'arc (un verset court s'affiche grand, un long
  // rétrécit au lieu d'être tronqué par textPath).
  const fontSize = Math.max(18, Math.min(32, Math.round(440 / (0.55 * clean.length))));
  return (
    <div style={{ textAlign: 'center', marginBottom: '0.6rem', overflow: 'visible' }}>
      <svg
        viewBox="0 0 500 100"
        width="100%"
        height="auto"
        style={{ maxWidth: '100%', overflow: 'visible', display: 'block' }}
        role="img"
        aria-label={text}
      >
        <defs>
          <path id="voile-hq-arc" d="M 24,86 Q 250,8 476,86" fill="none" />
        </defs>
        <circle cx="24" cy="86" r="2.5" fill={tk.colors.accent} opacity="0.6" />
        <circle cx="476" cy="86" r="2.5" fill={tk.colors.accent} opacity="0.6" />
        <text
          fontFamily={`'Frank Ruhl Libre', 'Noto Serif Hebrew', 'SBL Hebrew', ${tk.fonts.body}, serif`}
          fontSize={fontSize}
          fill={tk.colors.text}
          textAnchor="middle"
          direction="rtl"
        >
          {/* Sans direction="rtl", SVG pose les caractères dans l'ordre logique (de
              gauche à droite) le long du tracé — pour de l'hébreu (RTL) le verset
              apparaît alors inversé. `direction="rtl"` fait poser les glyphes du
              dernier au premier, donc dans le bon sens visuel sur l'arc. */}
          <textPath href="#voile-hq-arc" startOffset="50%">
            {clean}
          </textPath>
        </text>
      </svg>
    </div>
  );
}

/** Titre de section calligraphié + filet ornemental. */
function SectionTitle({ tk, label }: { tk: VoileTokens; label: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
      <h2
        style={{
          margin: 0,
          fontFamily: tk.fonts.script,
          fontSize: tk.titleSizes.script,
          fontWeight: 400,
          lineHeight: 1.1,
          color: tk.colors.text,
          overflowWrap: 'anywhere',
        }}
      >
        {label}
      </h2>
      <VoileDivider color={tk.colors.accent} width={190} style={{ marginTop: '0.7rem' }} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  1. Carte Hero                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function HeroCard({
  tk,
  monogramSvg,
  monogramSizePx,
  hebrewQuote,
  name1,
  name2,
  welcomeText,
  dateLabel,
  venue,
  city,
}: {
  tk: VoileTokens;
  monogramSvg?: string;
  monogramSizePx?: number;
  hebrewQuote?: string;
  name1: string;
  name2?: string;
  welcomeText?: string;
  dateLabel?: string;
  venue?: string;
  city?: string;
}) {
  // Taille du logo choisie par le client (XS→XL). Le plafond en % est
  // PROPORTIONNEL à la taille : L et XL restent distincts même dans
  // l'aperçu iPhone (un plafond fixe les rendait identiques).
  const logoSize = Math.min(monogramSizePx ?? 72, 320);
  const logoPct = Math.min(88, Math.max(20, Math.round((logoSize / 320) * 88)));
  return (
    <Card tk={tk}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {hebrewQuote?.trim() ? <VoileHebrewArc tk={tk} text={hebrewQuote} /> : null}

        {monogramSvg ? (
          <div
            style={{
              width: logoSize,
              maxWidth: `${logoPct}%`,
              aspectRatio: '1 / 1',
              marginBottom: '0.4rem',
              color: tk.colors.accent,
            }}
            dangerouslySetInnerHTML={{
              __html: monogramSvg
                .replace(/width="[^"]*"/, 'width="100%"')
                .replace(/height="[^"]*"/, 'height="100%"'),
            }}
          />
        ) : null}

        {welcomeText ? (
          <p
            style={{
              fontFamily: tk.fonts.label,
              fontSize: '0.66rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: tk.colors.textMuted,
              margin: '0 0 0.8rem',
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            {welcomeText}
          </p>
        ) : null}

        {/* Prénoms calligraphiés */}
        <div
          style={{
            fontFamily: tk.fonts.script,
            fontSize: tk.titleSizes.names,
            fontWeight: 400,
            lineHeight: 1.02,
            color: tk.colors.text,
            maxWidth: '100%',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            hyphens: 'auto',
          }}
        >
          {name1}
        </div>
        {name2 ? (
          <>
            <div
              style={{
                fontFamily: tk.fonts.script,
                fontSize: `calc(${tk.titleSizes.names} * 0.62)`,
                color: tk.colors.accent,
                lineHeight: 1,
                margin: '0.1rem 0',
              }}
            >
              &amp;
            </div>
            <div
              style={{
                fontFamily: tk.fonts.script,
                fontSize: tk.titleSizes.names,
                fontWeight: 400,
                lineHeight: 1.02,
                color: tk.colors.text,
                maxWidth: '100%',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                hyphens: 'auto',
              }}
            >
              {name2}
            </div>
          </>
        ) : null}

        <VoileDivider color={tk.colors.accent} width={170} style={{ marginTop: '1.2rem' }} />

        {dateLabel ? (
          <div
            style={{
              fontFamily: tk.fonts.label,
              fontSize: '0.9rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: tk.colors.text,
              marginTop: '1.1rem',
            }}
          >
            {dateLabel}
          </div>
        ) : null}

        {(venue || city) ? (
          <div
            style={{
              fontFamily: tk.fonts.body,
              fontSize: '1rem',
              color: tk.colors.textMuted,
              marginTop: '0.5rem',
              lineHeight: 1.5,
            }}
          >
            {[venue, city].filter(Boolean).join(' · ')}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  2. Carte Countdown — style « horloge » à deux-points                       */
/* ────────────────────────────────────────────────────────────────────────── */

function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const target = new Date(iso).getTime();
  const diff = isNaN(target) ? 0 : Math.max(0, target - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const COUNTDOWN_LABELS = {
  fr: ['Jours', 'Heures', 'Minutes', 'Secondes'],
  en: ['Days', 'Hours', 'Minutes', 'Seconds'],
  he: ['ימים', 'שעות', 'דקות', 'שניות'],
};

function ClockCountdown({ tk, targetDate, language }: { tk: VoileTokens; targetDate: string; language: 'fr' | 'he' | 'en' }) {
  const c = useCountdown(targetDate);
  const labels = COUNTDOWN_LABELS[language] ?? COUNTDOWN_LABELS.fr;
  const cells = [
    { v: String(c.d), l: labels[0] },
    { v: pad(c.h), l: labels[1] },
    { v: pad(c.m), l: labels[2] },
    { v: pad(c.s), l: labels[3] },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 2, flexWrap: 'nowrap' }}>
      {cells.map((cell, i) => (
        <div key={cell.l} style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center', minWidth: 40 }}>
            <div
              style={{
                fontFamily: tk.fonts.label,
                fontSize: tk.titleSizes.countdown,
                fontWeight: 400,
                lineHeight: 1,
                color: tk.colors.text,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {cell.v}
            </div>
            <div
              style={{
                fontFamily: tk.fonts.label,
                fontSize: '0.54rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: tk.colors.textMuted,
                marginTop: 6,
              }}
            >
              {cell.l}
            </div>
          </div>
          {i < cells.length - 1 ? (
            <div
              style={{
                fontFamily: tk.fonts.label,
                fontSize: tk.titleSizes.countdown,
                lineHeight: 1,
                color: tk.colors.accent,
                opacity: 0.7,
                padding: '0 2px',
              }}
            >
              :
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CountdownCard({ tk, targetDate, language, title }: { tk: VoileTokens; targetDate: string; language: 'fr' | 'he' | 'en'; title: string }) {
  return (
    <Card tk={tk}>
      <SectionTitle tk={tk} label={title} />
      <ClockCountdown tk={tk} targetDate={targetDate} language={language} />
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  3. Carte Familles                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function FamiliesCard({
  tk,
  columns,
  title,
}: {
  tk: VoileTokens;
  columns: ResolvedFamilyColumn[];
  title: string;
}) {
  if (!columns.length) return null;
  return (
    <Card tk={tk}>
      <SectionTitle tk={tk} label={title} />
      {/* Deux colonnes conservées pour la mise en page, mais les NOMS
          de famille ne sont jamais affichés sur la carte (comme Rayures). */}
      <FamilyColumnsRow
        columns={columns}
        accent={tk.colors.accent}
        textColor={tk.colors.text}
        titleFontFamily={tk.fonts.script}
        bodyFontFamily={tk.fonts.body}
        titleVariant="script"
        lineSize="1rem"
        hideTitles
      />
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  4. Carte Photo                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function PhotoCard({ tk, src }: { tk: VoileTokens; src: string }) {
  return (
    <Card tk={tk}>
      <div style={{ width: '100%', aspectRatio: '3 / 4', borderRadius: tk.radius.image, overflow: 'hidden' }}>
        <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Surface de carte pour les sections déléguées (renderOptionalSections)      */
/* ────────────────────────────────────────────────────────────────────────── */

function makeVoileCardSurface(tk: VoileTokens) {
  return ({ padded = true }: { theme: unknown; padded?: boolean }): CSSProperties => ({
    background: tk.colors.card,
    backdropFilter: 'blur(2px)',
    borderRadius: tk.radius.card,
    boxShadow: tk.cardShadow,
    padding: padded ? '2rem 1.6rem' : undefined,
    border: `1px solid ${tk.colors.hairline}`,
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Template                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function VoileIvoireTemplate({ site }: WeddingTemplateProps) {
  const tk = voileTokens(site.theme);
  const L = sectionLabels(site.language);
  const dir = site.language === 'he' ? 'rtl' : 'ltr';

  const hasTwoNames = !!(site.brideName?.trim() && site.groomName?.trim());
  const photos = (site.content?.galleryPhotos ?? []).filter(Boolean);
  const featuredPhoto = !site.sections.gallery ? photos[0] || site.content?.venue?.photoUrl : undefined;

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: tk.fonts.body,
        color: tk.colors.text,
        minHeight: '100vh',
        position: 'relative',
        textAlign: site.language === 'he' ? 'right' : 'left',
        backgroundColor: tk.colors.cardSolid,
      }}
    >
      {/* Fond « rideau ivoire » : couche sticky pleine hauteur qui reste pinnée
          pendant le scroll. (background-attachment: fixed ne fonctionne ni sur
          iOS Safari ni à l'intérieur d'un conteneur transformé comme l'aperçu
          iPhone — la couche sticky, elle, marche partout.) */}
      <div
        aria-hidden
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          marginBottom: '-100vh',
          zIndex: 0,
          backgroundImage: `url('${tk.bgImage}')`,
          // 100% 100% : toute la composition du rideau (drapés des deux côtés
          // + arche) reste visible quel que soit le format d'écran — `cover`
          // rognait les drapés latéraux sur mobile.
          backgroundSize: '100% 100%',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: tk.cardGap * 2 }}>
      <PublicStickyNav site={site} />
      {/* ♫ Musique — lecture automatique, sans bouton (démarre au 1er geste) */}
      <HiddenAutoMusic url={site.content?.musicUrl} />

      {site.sections.hero ? (
        <HeroCard
          tk={tk}
          monogramSvg={site.content?.monogramSvg}
          monogramSizePx={site.content?.monogramSizePx}
          hebrewQuote={site.content?.hebrewQuote}
          name1={hasTwoNames ? site.brideName : site.coupleName || site.brideName || site.groomName || ''}
          name2={hasTwoNames ? site.groomName : undefined}
          welcomeText={site.welcomeText || undefined}
          dateLabel={formatWeddingDate(site.date, site.language)}
          venue={site.venue || site.content?.venue?.name || undefined}
          city={site.city || undefined}
        />
      ) : null}

      {site.date ? (
        <CountdownCard tk={tk} targetDate={site.date} language={site.language} title={L.countdownTitle} />
      ) : null}

      <FamiliesCard tk={tk} columns={getFamilyColumns(site)} title={L.families} />

      {featuredPhoto ? <PhotoCard tk={tk} src={featuredPhoto} /> : null}

      {/* Mot d'accueil principal */}
      {site.mainText ? (
        <Card tk={tk}>
          <p
            style={{
              margin: 0,
              fontFamily: tk.fonts.body,
              fontSize: '1.1rem',
              lineHeight: 1.9,
              color: tk.colors.text,
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {site.mainText}
          </p>
        </Card>
      ) : null}

      {/* Sections fonctionnelles (Programme, Lieu, RSVP, Galerie, FAQ…) */}
      <div style={{ width: tk.cardWidth, margin: '0 auto' }}>
        {renderOptionalSections(site, makeVoileCardSurface(tk) as never)}
      </div>

      {/* Signature calligraphiée */}
      {hasTwoNames ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem 3rem', containerType: 'inline-size' }}>
          <div style={{ fontFamily: tk.fonts.script, fontSize: 'clamp(2rem, 12cqw, 3.2rem)', color: tk.colors.text, lineHeight: 1.1, overflowWrap: 'anywhere' }}>
            {site.brideName}
          </div>
          <div style={{ fontFamily: tk.fonts.script, fontSize: '1.6rem', color: tk.colors.textMuted, lineHeight: 1 }}>&amp;</div>
          <div style={{ fontFamily: tk.fonts.script, fontSize: 'clamp(2rem, 12cqw, 3.2rem)', color: tk.colors.text, lineHeight: 1.1, overflowWrap: 'anywhere' }}>
            {site.groomName}
          </div>
        </div>
      ) : (
        <div style={{ height: tk.cardGap }} />
      )}

      </div>
    </div>
  );
}

export default VoileIvoireTemplate;
