/**
 * EditorialCardsTemplate — modèle premium « Cartes Éditoriales ».
 *
 * Construit comme une succession de cartes verticales indépendantes,
 * façon papeterie haut de gamme (beaucoup d'espace blanc, ivoire, filets fins).
 *
 * Chaque carte est un composant autonome, réutilisable et 100 % piloté par
 * le système de thèmes (`editorialTokens` lit les couleurs live du site).
 * Aucun texte fixe : tout le contenu vient de `site`. Aucune image PNG :
 * les décors sont en CSS / composants SVG (EditorialCardIcons).
 *
 * Cartes bespoke : Hero · Countdown · Familles · Photo.
 * Les sections fonctionnelles (Histoire, Galerie, RSVP, Lieu, Programme, FAQ…)
 * sont déléguées à `renderOptionalSections`, habillées du même style de carte.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { formatWeddingDate } from '../utils/date';
import { editorialTokens } from '../themes/EditorialCardsTheme';
import type { EditorialTokens } from '../themes/EditorialCardsTheme';
import { EditorialDivider, EditorialIcon } from './EditorialCardIcons';
import type { EditorialIconKey } from './EditorialCardIcons';
import { FamilyColumnsRow, getFamilyColumns, HiddenAutoMusic, PublicStickyNav, renderOptionalSections } from './templateParts';
import type { ResolvedFamilyColumn } from './templateParts';

/** Icône décorative par défaut du modèle (le client pourra la changer). */
const DEFAULT_ICON: EditorialIconKey = 'rings';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Coque de carte commune                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function Card({
  tk,
  children,
  style,
  noPadding,
  id,
}: {
  tk: EditorialTokens;
  children: React.ReactNode;
  style?: CSSProperties;
  noPadding?: boolean;
  id?: string;
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
        borderRadius: tk.radius.card,
        boxShadow: tk.cardShadow,
        padding: noPadding ? 0 : tk.cardPadding,
        overflow: 'hidden',
        scrollMarginTop: 88,
        boxSizing: 'border-box',
        // Les tailles en `cqw` s'échelonnent sur la largeur de CETTE carte —
        // jamais de débordement, y compris dans l'aperçu iPhone mis à l'échelle.
        containerType: 'inline-size',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/** Titre de section : eyebrow en petites capitales + filet à icône. */
function SectionTitle({ tk, label, icon }: { tk: EditorialTokens; label: string; icon: EditorialIconKey }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
      <h2
        style={{
          margin: 0,
          fontFamily: tk.fonts.display,
          fontSize: tk.titleSizes.section,
          fontWeight: 500,
          color: tk.colors.text,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </h2>
      <EditorialDivider icon={icon} color={tk.colors.accent} width={160} style={{ marginTop: '0.8rem' }} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  1. Carte Hero                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function HeroCard({
  tk,
  bgImage,
  monogramSvg,
  monogramSizePx,
  name1,
  name2,
  welcomeText,
  dateLabel,
  venue,
  city,
  icon,
}: {
  tk: EditorialTokens;
  bgImage?: string;
  monogramSvg?: string;
  monogramSizePx?: number;
  name1: string;
  name2?: string;
  welcomeText?: string;
  dateLabel?: string;
  venue?: string;
  city?: string;
  icon: EditorialIconKey;
  musicUrl?: string;
}) {
  return (
    <Card tk={tk} noPadding>
      <div
        style={{
          position: 'relative',
          minHeight: 560,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.4rem',
          // Image de fond du client, sinon dégradé ivoire/accent (aucune PNG par défaut)
          background: bgImage
            ? `linear-gradient(rgba(20,20,20,0.18), rgba(20,20,20,0.28)), url('${bgImage}') center/cover no-repeat`
            : `linear-gradient(160deg, ${tk.colors.accent}22 0%, ${tk.colors.page} 55%, ${tk.colors.button}18 100%)`,
        }}
      >
        {/* Panneau arqué ivoire à double contour — entièrement CSS */}
        <div
          style={{
            position: 'relative',
            width: '80%',
            maxWidth: 360,
            padding: '2.6rem 1.8rem',
            background: tk.colors.card,
            border: `1.5px solid ${tk.colors.accent}`,
            borderRadius: '180px 180px 22px 22px',
            boxShadow: '0 20px 60px -28px rgba(20,20,20,0.45)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Double contour intérieur */}
          <div
            style={{
              position: 'absolute',
              inset: 9,
              border: `1px solid ${tk.colors.accent}66`,
              borderRadius: '172px 172px 16px 16px',
              pointerEvents: 'none',
            }}
          />

          {/* Logo / monogramme (client) ou icône décorative par défaut.
              Taille choisie par le client (XS→XL), bornée au panneau. */}
          {monogramSvg ? (
            <div
              style={{
                width: Math.min(monogramSizePx ?? 64, 320),
                // Plafond proportionnel à la taille choisie : L et XL restent
                // distincts même quand le panneau est étroit (aperçu iPhone).
                maxWidth: `${Math.min(84, Math.max(20, Math.round(((monogramSizePx ?? 64) / 320) * 84)))}%`,
                aspectRatio: '1 / 1',
                marginBottom: '0.6rem',
              }}
              dangerouslySetInnerHTML={{
                __html: monogramSvg
                  .replace(/width="[^"]*"/, 'width="100%"')
                  .replace(/height="[^"]*"/, 'height="100%"'),
              }}
            />
          ) : (
            <EditorialIcon name={icon} size={40} color={tk.colors.accent} style={{ marginBottom: '0.6rem' }} />
          )}

          {/* Prénoms */}
          <div
            style={{
              fontFamily: tk.fonts.display,
              fontSize: tk.titleSizes.names,
              fontWeight: 500,
              lineHeight: 1.05,
              color: tk.colors.text,
              wordBreak: 'break-word',
            }}
          >
            {name1}
          </div>
          {name2 ? (
            <div
              style={{
                fontFamily: tk.fonts.display,
                fontSize: `calc(${tk.titleSizes.names} * 0.8)`,
                color: tk.colors.accent,
                lineHeight: 1.1,
                marginTop: '0.2rem',
                wordBreak: 'break-word',
              }}
            >
              {name2}
            </div>
          ) : null}

          {/* Texte d'accueil */}
          {welcomeText ? (
            <p
              style={{
                fontFamily: tk.fonts.label,
                fontSize: '0.68rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                lineHeight: 1.8,
                color: tk.colors.textMuted,
                margin: '1rem auto 0',
                maxWidth: 220,
              }}
            >
              {welcomeText}
            </p>
          ) : null}

          {/* Date */}
          {dateLabel ? (
            <div
              style={{
                fontFamily: tk.fonts.display,
                fontSize: '1.35rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: tk.colors.text,
                marginTop: '1.1rem',
              }}
            >
              {dateLabel}
            </div>
          ) : null}

          {/* Lieu */}
          {(venue || city) ? (
            <div style={{ marginTop: '0.7rem' }}>
              {venue ? (
                <div
                  style={{
                    fontFamily: tk.fonts.label,
                    fontSize: '0.74rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: tk.colors.text,
                  }}
                >
                  {venue}
                </div>
              ) : null}
              {city ? (
                <div
                  style={{
                    fontFamily: tk.fonts.label,
                    fontSize: '0.66rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: tk.colors.textMuted,
                    marginTop: '0.2rem',
                  }}
                >
                  {city}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  2. Carte Countdown                                                         */
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
  fr: ['Jours', 'Heures', 'Min', 'Sec'],
  en: ['Days', 'Hours', 'Min', 'Sec'],
  he: ['ימים', 'שעות', 'דקות', 'שניות'],
};

function CountdownCard({
  tk,
  targetDate,
  language,
  title,
  icon,
}: {
  tk: EditorialTokens;
  targetDate: string;
  language: 'fr' | 'he' | 'en';
  title: string;
  icon: EditorialIconKey;
}) {
  const c = useCountdown(targetDate);
  const labels = COUNTDOWN_LABELS[language] ?? COUNTDOWN_LABELS.fr;
  const cells = [
    { v: String(c.d), l: labels[0] },
    { v: pad(c.h), l: labels[1] },
    { v: pad(c.m), l: labels[2] },
    { v: pad(c.s), l: labels[3] },
  ];
  return (
    <Card tk={tk}>
      <SectionTitle tk={tk} label={title} icon={icon} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'clamp(8px, 2.5cqw, 14px)',
        }}
      >
        {cells.map((cell) => (
          <div
            key={cell.l}
            style={{
              aspectRatio: '1 / 1',
              border: `1px solid ${tk.colors.hairlineStrong}`,
              borderRadius: 10,
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                fontFamily: tk.fonts.display,
                fontSize: tk.titleSizes.countdown,
                fontWeight: 500,
                lineHeight: 1,
                color: tk.colors.text,
              }}
            >
              {cell.v}
            </div>
            <div
              style={{
                fontFamily: tk.fonts.label,
                fontSize: '0.6rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: tk.colors.textMuted,
              }}
            >
              {cell.l}
            </div>
          </div>
        ))}
      </div>
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
  icon,
}: {
  tk: EditorialTokens;
  columns: ResolvedFamilyColumn[];
  title: string;
  icon: EditorialIconKey;
}) {
  if (!columns.length) return null;
  return (
    <Card tk={tk}>
      <SectionTitle tk={tk} label={title} icon={icon} />
      <FamilyColumnsRow
        columns={columns}
        accent={tk.colors.accent}
        textColor={tk.colors.text}
        titleFontFamily={tk.fonts.label}
        bodyFontFamily={tk.fonts.body}
        lineSize="1rem"
      />
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  4. Carte Photo (photo seule en 4:3)                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function PhotoCard({ tk, src }: { tk: EditorialTokens; src: string }) {
  return (
    <Card tk={tk}>
      <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: tk.radius.image, overflow: 'hidden' }}>
        <img
          src={src}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Surface de carte pour les sections déléguées (renderOptionalSections)      */
/* ────────────────────────────────────────────────────────────────────────── */

function makeEditorialCardSurface(tk: EditorialTokens) {
  return ({ padded = true }: { theme: unknown; padded?: boolean }): CSSProperties => ({
    background: tk.colors.card,
    borderRadius: tk.radius.card,
    boxShadow: tk.cardShadow,
    padding: padded ? tk.cardPadding : undefined,
    border: `1px solid ${tk.colors.hairline}`,
    transition: 'transform 0.35s ease, box-shadow 0.35s ease',
  });
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Template                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function EditorialCardsTemplate({ site }: WeddingTemplateProps) {
  const tk = editorialTokens(site.theme);
  const L = sectionLabels(site.language);
  const dir = site.language === 'he' ? 'rtl' : 'ltr';
  const icon = DEFAULT_ICON;

  const hasTwoNames = !!(site.brideName?.trim() && site.groomName?.trim());
  const photos = (site.content?.galleryPhotos ?? []).filter(Boolean);
  const heroBg = photos[0] || site.content?.venue?.photoUrl || undefined;

  // Carte Photo autonome : on ne l'affiche que si la galerie est masquée
  // (sinon doublon). Source : 1re photo dispo non déjà utilisée par le hero.
  const featuredPhoto = !site.sections.gallery ? photos[0] || site.content?.venue?.photoUrl : undefined;

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: tk.fonts.body,
        background: tk.colors.page,
        color: tk.colors.text,
        minHeight: '100vh',
        paddingTop: tk.cardGap,
        textAlign: site.language === 'he' ? 'right' : 'left',
      }}
    >
      <PublicStickyNav site={site} />
      {/* ♫ Musique — lecture automatique, sans bouton (démarre au 1er geste) */}
      <HiddenAutoMusic url={site.content?.musicUrl} />

      {site.sections.hero ? (
        <HeroCard
          tk={tk}
          bgImage={heroBg}
          monogramSvg={site.content?.monogramSvg}
          monogramSizePx={site.content?.monogramSizePx}
          name1={hasTwoNames ? site.brideName : site.coupleName || site.brideName || site.groomName || ''}
          name2={hasTwoNames ? `& ${site.groomName}` : undefined}
          welcomeText={site.welcomeText || undefined}
          dateLabel={formatWeddingDate(site.date, site.language)}
          venue={site.venue || site.content?.venue?.name || undefined}
          city={site.city || undefined}
          icon={icon}
        />
      ) : null}

      {site.date ? (
        <CountdownCard tk={tk} targetDate={site.date} language={site.language} title={L.countdownTitle} icon={icon} />
      ) : null}

      <FamiliesCard tk={tk} columns={getFamilyColumns(site)} title={L.families} icon={icon} />

      {featuredPhoto ? <PhotoCard tk={tk} src={featuredPhoto} /> : null}

      {/* Mot d'accueil principal */}
      {site.mainText ? (
        <Card tk={tk}>
          <p
            style={{
              margin: 0,
              fontFamily: tk.fonts.body,
              fontSize: '1.1rem',
              lineHeight: 1.85,
              color: tk.colors.text,
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {site.mainText}
          </p>
        </Card>
      ) : null}

      {/* Sections fonctionnelles (Histoire, Galerie, RSVP, Lieu, Programme, FAQ…) */}
      <div style={{ width: tk.cardWidth, margin: '0 auto' }}>
        {renderOptionalSections(site, makeEditorialCardSurface(tk) as never)}
      </div>

      <div style={{ height: tk.cardGap }} />
    </div>
  );
}

export default EditorialCardsTemplate;
