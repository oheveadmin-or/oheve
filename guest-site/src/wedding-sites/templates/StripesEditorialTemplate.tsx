/**
 * StripesEditorialTemplate — éditorial noir & blanc, rayures CSS, zéro PNG.
 *
 * Structure (inspirée d'une papeterie premium minimaliste) :
 *   1. Hero : noms + date, typographie centrée
 *   2. Programme : section encadrée de rayures verticales CSS
 *   3. Bande de rayures horizontales (séparateur)
 *   4. Countdown horizontal dramatique « D Day is coming ! »
 *   5. Photo pleine largeur (4:3 arrondie en haut)
 *   6. RSVP épuré + bouton sombre
 *
 * Toutes les couleurs viennent du WeddingTheme du site (éditables
 * dans le builder). Aucun texte fixe, aucune image de décoration.
 * Les rayures sont 100 % CSS (repeating-linear-gradient).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WeddingTemplateProps } from '../types';
import { TITLE_SIZE_SCALE } from '../types';
import { sectionLabels } from '../i18n';
import { formatWeddingDate } from '../utils/date';
import { FamilyColumnsRow, getFamilyColumns, HiddenAutoMusic, PublicStickyNav, renderOptionalSections } from './templateParts';
import { PatternOverlay } from './PatternOverlay';
import { SectionSeparator } from './SectionSeparator';
import { cardStyleSurface } from './templateCardStyles';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Countdown                                                                  */
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

/**
 * Retire les signes diacritiques hébraïques (נקודות + טעמים) d'un texte pour
 * l'AFFICHAGE uniquement : les points-voyelles et cantillations parasites
 * disparaissent sans altérer les lettres ni la donnée saisie. Plage Unicode
 * U+0591–U+05C7 des marques combinantes, en conservant le maqaf (U+05BE) et le
 * texte lui-même. */
const HEBREW_MARKS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;
const stripHebrewMarks = (s: string) => s.replace(HEBREW_MARKS, '');

/** Retire la mention \u00AB (c\u00E9r\u00E9monie civile) \u00BB d'un libell\u00E9 sans toucher au reste
 *  (affichage seul \u2014 la donn\u00E9e et l'ic\u00F4ne Mairie restent inchang\u00E9es). */
const stripCeremonieCivile = (label: string) =>
  label.replace(/\s*\(\s*c\u00E9r\u00E9monie civile\s*\)/i, '').trim();

/* ────────────────────────────────────────────────────────────────────────── */
/*  Template                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function StripesEditorialTemplate({ site }: WeddingTemplateProps) {
  const t = site.theme;
  const L = sectionLabels(site.language);
  const dir = site.language === 'he' ? 'rtl' : 'ltr';

  /* ── Couleurs du thème (100 % pilotées par le builder) ── */
  const bg        = t.backgroundColor || '#F8F6F2';
  const ink       = t.textColor       || '#111111';
  const stripe    = t.primaryColor    || '#111111';  // couleur des rayures
  const buttonBg  = t.secondaryColor  || '#3D2B1A';
  const font      = t.titleFontFamily || t.fontFamily || "'Playfair Display', Georgia, serif";
  const fontSerif = "'Cormorant Garamond', Georgia, serif";

  /* ── Tokens spécifiques au Programme « faire-part de luxe » ──
        Tous dérivés du thème du builder : changer les couleurs du studio
        recolore l'intégralité des écritures, filets et fonds. ── */
  const fontTitle  = t.titleFontFamily || "'Cormorant Garamond', Georgia, serif"; // titres
  // Police du texte : pilotée par le builder (« Police du texte »), défaut Baskerville
  const fontBody   = t.fontFamily || "'Libre Baskerville', Georgia, serif";
  const nameScale  = TITLE_SIZE_SCALE[t.nameSize ?? 'medium'];                    // taille des prénoms
  const pageBg     = bg;                                          // fond général
  const cardBg     = `color-mix(in srgb, ${bg} 45%, #FFFFFF)`;    // panneau du faire-part (fond éclairci)
  const inkProg    = ink;                                         // texte principal (couleur Texte du thème)
  const mutedProg  = `color-mix(in srgb, ${ink} 62%, ${bg})`;     // texte secondaire
  const lineProg   = `color-mix(in srgb, ${ink} 22%, ${bg})`;     // filets de la timeline
  const btnProg    = buttonBg;                                    // bouton (couleur secondaire du thème)

  /* Options du Studio de design (motif, séparateurs, style de cartes) */
  const separatorStyle = t.separatorStyle ?? 'none';
  const sep = <SectionSeparator style={separatorStyle} color={stripe} />;

  /* Logo monogramme (généré ou importé) affiché en haut de la carte.
     La largeur est PROPORTIONNELLE à la taille choisie (XS→XL) : un plafond
     fixe en % rendait L et XL identiques dans l'aperçu iPhone. */
  const monogramSvg = site.content?.monogramSvg;
  const monogramIsImg = !!monogramSvg && monogramSvg.startsWith('data:');
  const monogramSize = site.content?.monogramSizePx ?? 150;
  const monogramPct = Math.min(85, Math.round((monogramSize / 320) * 85)); // 320px (XL) → 85 %
  const monogramWidth = `min(${monogramSize}px, ${monogramPct}%)`;

  /* Textes du site + familles + pasuk (affichés sous la carte) */
  const memorialText = site.content?.texts?.memorialText?.trim();
  const familyText = site.content?.texts?.familyText?.trim();
  const hebrewQuote = site.content?.hebrewQuote?.trim();
  const familyColumns = getFamilyColumns(site);
  const hasFamilies = familyColumns.length > 0;
  const hasSiteTexts = !!(memorialText || familyText || hasFamilies);

  /* ── Données ── */
  const events = (site.rsvpForm?.events ?? []).filter((e) => e.enabled);
  const jewishEvts = site.sections.jewishSection
    ? (site.content?.jewishEvents ?? []).filter((e) => e.enabled)
    : [];

  // Source du programme : jewishEvents en priorité (time + lieu + description + maps), puis rsvp events.
  // On porte TOUS les champs disponibles dans le builder : aucun n'est ignoré au rendu.
  type ScheduleItem = {
    id: string;
    label: string;
    time?: string;
    day?: string;
    place?: string;
    description?: string;
    mapsUrl?: string;
    wazeUrl?: string;
  };
  const scheduleItems: ScheduleItem[] =
    jewishEvts.length > 0
      ? jewishEvts.map((e) => ({
          id: e.id,
          label: stripCeremonieCivile(e.label),
          time: e.time,
          day: e.date,
          place: e.place,
          description: e.description,
          mapsUrl: e.googleMapsUrl,
          wazeUrl: e.wazeUrl,
        }))
      : events.map((e) => ({
          id: e.id,
          label: stripCeremonieCivile(e.label),
          time: e.time,
          day: e.dayLabel,
          place: e.place,
          description: e.shortDescription,
        }));

  const hasSchedule = site.sections.program && scheduleItems.length > 0;

  const featuredPhoto =
    site.content?.galleryPhotos?.find(Boolean) ||
    site.content?.venue?.photoUrl ||
    undefined;

  const c = useCountdown(site.date);

  /* ── Labels i18n étendus ── */
  const XLBL = {
    fr: { prog1: 'Le', prog2: 'Programme', itinerary: "Voir l'itinéraire", waze: 'Waze', days: 'Jours', hours: 'Heures', min: 'Min', sec: 'Sec', grandparents: 'Grands-parents' },
    en: { prog1: 'The', prog2: 'Schedule',  itinerary: 'Get directions',   waze: 'Waze', days: 'Days',  hours: 'Hours',  min: 'Min', sec: 'Sec', grandparents: 'Grandparents' },
    he: { prog1: 'ה',  prog2: 'תוכנית',   itinerary: 'הוראות הגעה',       waze: 'Waze', days: 'ימים', hours: 'שעות',  min: 'דקות', sec: 'שניות', grandparents: 'סבים וסבתות' },
  } as const;
  const xl = XLBL[site.language] ?? XLBL.fr;

  /* ── Rayures du hero — BANDES de rayures verticales fines en HAUT et en BAS ──
        Milieu propre (prénoms au centre), une bande de rayures en haut et sa
        symétrique en bas. La tuile est PALINDROMIQUE (gap · barre · gap) et le
        fond est centré → les deux bords de la bande sont rigoureusement
        symétriques quelle que soit la largeur de la carte (aucune barre coupée
        d'un seul côté). Largeur des barres et opacité pilotées par le builder. ── */
  const stripeW = Math.max(1, Math.round(t.stripeWidth ?? 8));           // largeur d'une barre (px)
  const stripeAlpha = Math.min(1, Math.max(0, t.stripeOpacity ?? 1));    // opacité 0–1
  const stripeCol = `color-mix(in srgb, ${stripe} ${Math.round(stripeAlpha * 100)}%, transparent)`;
  // Tuile palindromique : demi-gap · barre · demi-gap (période = 2·gap + barre).
  const stripeBandBg = `repeating-linear-gradient(to right, transparent 0, transparent ${stripeW}px, ${stripeCol} ${stripeW}px, ${stripeCol} ${stripeW * 2}px, transparent ${stripeW * 2}px, transparent ${stripeW * 3}px)`;
  // Colonnes latérales : EXACTEMENT 2 longues barres verticales (pleine hauteur).
  // Barres rendues en <div> explicites (largeur fixe) et NON en dégradé répété :
  // un repeating-linear-gradient ajoute une frange d'anti-aliasing à la frontière
  // de période → la 2ᵉ barre paraissait plus épaisse que la 1ʳᵉ. Des div de
  // largeur `stripeW` garantissent 2 barres rigoureusement identiques.
  const stripeGroupW = stripeW * 3;
  const SideStripes = () => (
    <div aria-hidden style={{ flex: `0 0 ${stripeGroupW}px`, display: 'flex' }}>
      <div style={{ width: stripeW, background: stripeCol }} />
      <div style={{ width: stripeW }} />
      <div style={{ width: stripeW, background: stripeCol }} />
    </div>
  );

  // La musique ne s'affiche jamais sur la carte : lecture auto au 1er geste de
  // l'invité. Désactivée dans l'aperçu du builder (site fictif « preview-draft »).
  const isPreview = site.id === 'preview-draft';

  /* Base commune Maps / Waze : même box-model → hauteur, marges et centrage
     rigoureusement identiques. Chaque bouton a une bordure 1px (transparente
     côté Maps) pour que le total de hauteur soit strictement égal. */
  const itineraryBtnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minHeight: 44,
    padding: '0 26px',
    borderRadius: 6,
    border: '1px solid transparent',
    fontFamily: fontBody,
    fontSize: '0.68rem',
    lineHeight: 1,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  } as const;

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{
        fontFamily: font,
        background: bg,
        color: ink,
        minHeight: '100vh',
        position: 'relative',
        // Conteneur de requête : toutes les tailles en `cqw` du template
        // s'échelonnent sur la largeur RÉELLE du site (393 px dans l'aperçu
        // iPhone) et non sur la fenêtre du navigateur — sans ça, la carte
        // débordait du téléphone dans l'aperçu mis à l'échelle.
        containerType: 'inline-size',
      }}
    >
      {/* Motif de fond du Studio de design */}
      <PatternOverlay patternId={t.patternId ?? 'none'} color={stripe} opacity={t.patternOpacity ?? 0.07} />
      {/* Le monogramme SVG généré embarque width/height fixes : on le fait
          scaler à la taille choisie dans le builder. */}
      <style>{'.stripes-monogram svg{width:100%;height:auto;display:block;}'}</style>
      <PublicStickyNav site={site} />

      {/* ── 1. Hero : bande de rayures en HAUT, prénoms au centre, bande en BAS ── */}
      {site.sections.hero && (
        <header style={{ background: pageBg, padding: 'clamp(1.8rem,5cqw,4rem) clamp(0.9rem,4cqw,2rem)' }}>
          {/* Carte : bande rayée · panneau central propre · bande rayée (miroir).
              minHeight (et non aspect-ratio fixe) → la carte GRANDIT avec le
              contenu au lieu de le rogner en haut/bas. overflow:hidden pour que
              les rayures affleurent proprement les bords de la carte. */}
          <div
            style={{
              width: 'clamp(300px, 80%, 640px)',
              minHeight: 'clamp(280px, 78cqw, 620px)',
              margin: '0 auto',
              background: cardBg,
              display: 'flex',
              alignItems: 'stretch',
              // Espace entre les colonnes latérales et les bandes du centre :
              // sans lui, une barre de bande venait se coller à la barre
              // intérieure d'une colonne → elles fusionnaient en une barre 2×
              // plus épaisse (« la 2ᵉ rayure de gauche est plus épaisse »).
              gap: `${stripeW}px`,
              boxSizing: 'border-box',
            }}
          >
            {/* Colonne de 2 longues rayures — bord GAUCHE (pleine hauteur).
                Le clip est porté par la colonne centrale (bandes), PAS par la
                carte : ainsi les colonnes latérales ne sont jamais rognées d'un
                sous-pixel (bug : la barre extérieure droite paraissait coupée). */}
            <SideStripes />

            {/* Colonne centrale : bande haut · contenu · bande bas */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Bande de rayures — HAUT (fond centré → bords symétriques) */}
            <div
              aria-hidden
              style={{
                flex: '0 0 auto',
                height: 'clamp(44px, 15cqw, 82px)',
                backgroundImage: stripeBandBg,
                backgroundPosition: 'center',
              }}
            />

            {/* Panneau central propre — date, prénoms, lieu, phrase, pasuk */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: 'clamp(20px,5cqw,48px)',
              }}
            >
            <div
              style={{
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              {/* פסוק — tout en haut de la carte (nikoud retiré à l'affichage) */}
              {hebrewQuote && (
                <p dir="rtl" style={{ fontFamily: fontTitle, fontSize: 'clamp(0.95rem,2.4cqw,1.2rem)', lineHeight: 1.6, margin: '0 auto clamp(0.9rem,2.2cqw,1.5rem)', color: inkProg }}>
                  {stripHebrewMarks(hebrewQuote)}
                </p>
              )}
              {monogramSvg && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'clamp(0.8rem,2cqw,1.4rem)' }}>
                  {monogramIsImg ? (
                    <img
                      src={monogramSvg}
                      alt="Monogramme"
                      style={{ width: monogramWidth, height: 'auto', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      className="stripes-monogram"
                      style={{ width: monogramWidth }}
                      dangerouslySetInnerHTML={{ __html: monogramSvg }}
                    />
                  )}
                </div>
              )}
              {site.date && (
                <p style={{ fontFamily: fontBody, fontSize: 'clamp(0.6rem,1.6cqw,0.74rem)', letterSpacing: '0.26em', textTransform: 'uppercase', color: mutedProg, margin: '0 0 clamp(0.8rem,2cqw,1.4rem)' }}>
                  {formatWeddingDate(site.date, site.language)}
                </p>
              )}
              <h1
                style={{
                  fontFamily: font,
                  fontSize: `calc(clamp(1.8rem, 6cqw, 3.4rem) * ${nameScale})`,
                  fontWeight: 400,
                  lineHeight: 1.08,
                  margin: 0,
                  letterSpacing: '0.01em',
                  color: inkProg,
                  overflowWrap: 'anywhere',
                }}
              >
                {site.brideName && site.groomName
                  ? `${site.brideName} & ${site.groomName}`
                  : site.coupleName || site.brideName || site.groomName || ''}
              </h1>
              {(site.venue?.trim() || site.city?.trim()) && (
                <p style={{ fontFamily: fontBody, fontSize: 'clamp(0.6rem,1.6cqw,0.74rem)', letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedProg, margin: 'clamp(0.9rem,2.2cqw,1.4rem) 0 0' }}>
                  {[site.venue, site.city].filter(Boolean).join(' · ')}
                </p>
              )}
              {site.welcomeText?.trim() && (
                <p style={{ fontFamily: fontTitle, fontStyle: 'italic', fontSize: 'clamp(0.95rem,2.4cqw,1.25rem)', lineHeight: 1.6, maxWidth: 360, margin: 'clamp(1rem,2.5cqw,1.6rem) auto 0', color: mutedProg }}>
                  {site.welcomeText}
                </p>
              )}
            </div>
            </div>

            {/* Bande de rayures — BAS (miroir du haut, mêmes bords symétriques) */}
            <div
              aria-hidden
              style={{
                flex: '0 0 auto',
                height: 'clamp(44px, 15cqw, 82px)',
                backgroundImage: stripeBandBg,
                backgroundPosition: 'center',
              }}
            />
            </div>

            {/* Colonne de 2 longues rayures — bord DROIT (miroir du gauche) */}
            <SideStripes />
          </div>
        </header>
      )}

      {/* ── 1b. Familles + grands-parents + textes — juste sous le faire-part,
              comme sur une invitation papier (« avec leurs parents… ») ── */}
      {hasSiteTexts && (
        <section style={{ background: 'transparent', padding: '0 clamp(1.2rem,5cqw,2rem) clamp(1.5rem,4cqw,2.5rem)', textAlign: 'center' }}>
          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            {memorialText && (
              <p style={{ fontFamily: fontTitle, fontStyle: 'italic', fontSize: 'clamp(0.95rem,2.4cqw,1.15rem)', lineHeight: 1.7, color: mutedProg, margin: '0 0 1.4rem' }}>
                {memorialText}
              </p>
            )}
            {familyText && (
              <p style={{ fontFamily: fontBody, fontSize: '0.95rem', lineHeight: 1.8, color: mutedProg, margin: '0 0 1.4rem' }}>
                {familyText}
              </p>
            )}
            {hasFamilies && (
              <div style={{ marginTop: '0.25rem' }}>
                {/* Deux colonnes conservées pour la mise en page, mais les NOMS
                    de famille ne sont jamais affichés sur la carte (hideTitles). */}
                <FamilyColumnsRow
                  columns={familyColumns}
                  accent={stripe}
                  textColor={inkProg}
                  titleFontFamily={fontBody}
                  bodyFontFamily={fontBody}
                  hideTitles
                />
              </div>
            )}
          </div>
        </section>
      )}

      {hasSchedule && sep}

      {/* ── 2. Programme : section centrée, sans cadre (les fonctionnalités sous la carte) ── */}
      {hasSchedule && (
        <section
          id="program"
          style={{
            background: pageBg,
            padding: 'clamp(2.5rem,6cqw,4.5rem) clamp(1.2rem,5cqw,2rem)',
            textAlign: 'center',
            scrollMarginTop: 88,
          }}
        >
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
              {/* Titre : "Le" + "Programme" (italique, très grand) */}
              <div style={{ marginBottom: 'clamp(8px,2cqw,16px)' }}>
                <div
                  style={{
                    fontFamily: fontBody,
                    fontSize: 13,
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: mutedProg,
                    marginBottom: 14,
                  }}
                >
                  {xl.prog1}
                </div>
                <div
                  style={{
                    fontFamily: fontTitle,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: 'clamp(2.6rem, 7cqw, 4rem)',
                    lineHeight: 1,
                    color: inkProg,
                  }}
                >
                  {xl.prog2}
                </div>
              </div>

              {/* Timeline verticale */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Filet entre le titre et le premier événement */}
                <div style={{ width: 1, height: 'clamp(48px,6cqw,70px)', background: lineProg }} aria-hidden />

                {scheduleItems.map((evt, i) => (
                  <div key={evt.id} style={{ display: 'contents' }}>
                    {/* Filet vertical (1px, #D8D3CA) entre deux événements */}
                    {i > 0 && (
                      <div style={{ width: 1, height: 'clamp(60px,7cqw,90px)', background: lineProg }} aria-hidden />
                    )}

                    {/* Bloc événement — tout centré, max 520px */}
                    <div style={{ maxWidth: 520, width: '100%', margin: '0 auto' }}>
                      {/* Date · Heure — une seule ligne, collées (ex. « 14 juin · 20h30 ») */}
                      {(evt.day?.trim() || evt.time?.trim()) && (
                        <div
                          style={{
                            fontFamily: fontTitle,
                            fontStyle: 'italic',
                            fontSize: 'clamp(1.05rem,2.6cqw,1.3rem)',
                            color: inkProg,
                            opacity: 0.85,
                          }}
                        >
                          {[evt.day?.trim(), evt.time?.trim()].filter(Boolean).join(' · ')}
                        </div>
                      )}

                      {/* Titre de l'événement */}
                      <div
                        style={{
                          fontFamily: fontBody,
                          fontWeight: 700,
                          fontSize: 'clamp(1rem,2.4cqw,1.15rem)',
                          letterSpacing: '0.04em',
                          color: inkProg,
                          marginTop: (evt.day?.trim() || evt.time?.trim()) ? 14 : 0,
                        }}
                      >
                        {evt.label}
                      </div>

                      {/* Lieu */}
                      {evt.place?.trim() && (
                        <div
                          style={{
                            fontFamily: fontBody,
                            fontSize: '0.86rem',
                            lineHeight: 1.6,
                            color: mutedProg,
                            marginTop: 10,
                          }}
                        >
                          {evt.place}
                        </div>
                      )}

                      {/* Description (Titre → Description : 12px) */}
                      {evt.description?.trim() && (
                        <div
                          style={{
                            fontFamily: fontBody,
                            fontSize: '0.9rem',
                            lineHeight: 1.8,
                            color: mutedProg,
                            marginTop: 12,
                          }}
                        >
                          {evt.description}
                        </div>
                      )}

                      {/* Boutons itinéraire */}
                      {(evt.mapsUrl?.trim() || evt.wazeUrl?.trim()) && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            gap: 12,
                            justifyContent: 'center',
                            flexWrap: 'wrap',
                            marginTop: 22,
                          }}
                        >
                          {evt.mapsUrl?.trim() && (
                            <a
                              href={evt.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ ...itineraryBtnBase, color: '#fff', background: btnProg, borderColor: btnProg }}
                            >
                              {xl.itinerary}
                            </a>
                          )}
                          {evt.wazeUrl?.trim() && (
                            <a
                              href={evt.wazeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ ...itineraryBtnBase, color: inkProg, borderColor: lineProg }}
                            >
                              {xl.waze}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Filet de clôture */}
                <div style={{ width: 1, height: 'clamp(48px,6cqw,70px)', background: lineProg }} aria-hidden />
              </div>
          </div>
        </section>
      )}

      {site.date && sep}

      {/* ── 3. Countdown horizontal ── */}
      {site.date && (
        <div style={{ textAlign: 'center', padding: 'clamp(2rem,6cqw,3.5rem) 1.5rem' }}>
          {/* Grands chiffres avec séparateurs « : » */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', lineHeight: 1, margin: '0.2rem 0 0.45rem', flexWrap: 'nowrap' }}>
            {[String(c.d), pad(c.h), pad(c.m), pad(c.s)].map((val, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                <span style={{ fontFamily: font, fontSize: 'clamp(3rem, 11cqw, 5.5rem)', fontWeight: 400, letterSpacing: '-0.02em', color: ink }}>
                  {val}
                </span>
                {i < 3 && (
                  <span style={{ fontFamily: font, fontSize: 'clamp(2rem, 8cqw, 4rem)', fontWeight: 300, opacity: 0.6, margin: '0 1px', color: ink }}>:</span>
                )}
              </span>
            ))}
          </div>

          {/* Labels */}
          <div style={{ display: 'flex', justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
            {[xl.days, xl.hours, xl.min, xl.sec].map((label, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontFamily: fontSerif,
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: 0.55,
                  color: ink,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Photo pleine largeur ── */}
      {featuredPhoto && (
        <div style={{ borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
          <img
            src={featuredPhoto}
            alt=""
            loading="lazy"
            style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* ── 4c. Sections fonctionnelles (Lieux, Hébergements, Événements, FAQ, Galerie…)
              déléguées au moteur partagé. Programme & RSVP sont rendus sur-mesure ci-dessus/dessous. ── */}
      <section style={{ background: 'transparent', padding: '0 clamp(1.2rem,5cqw,2rem)' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {renderOptionalSections(
            { ...site, sections: { ...site.sections, program: false, rsvp: false } },
            cardStyleSurface,
          )}
        </div>
      </section>

      {site.sections.rsvp && sep}

      {/* ── 5. RSVP ── */}
      {site.sections.rsvp && (
        <div id="rsvp" style={{ textAlign: 'center', padding: 'clamp(2.5rem,7cqw,4rem) 1.5rem clamp(3rem,8cqw,5rem)', background: bg, scrollMarginTop: 88 }}>
          <div
            style={{
              fontFamily: font,
              fontSize: 'clamp(2.2rem, 7cqw, 3rem)',
              fontWeight: 400,
              letterSpacing: '0.06em',
              marginBottom: '0.9rem',
              color: ink,
            }}
          >
            {L.rsvp}
          </div>
          {site.rsvpForm?.introText?.trim() && (
            <p style={{ fontFamily: fontSerif, fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.75, maxWidth: 290, margin: '0 auto 1.6rem', opacity: 0.75, color: ink }}>
              {site.rsvpForm.introText}
            </p>
          )}
          <Link
            to={`/wedding/${site.slug}/rsvp`}
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: buttonBg,
              color: '#fff',
              fontFamily: fontSerif,
              fontSize: '0.82rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {L.rsvpCta}
          </Link>
        </div>
      )}

      {/* Musique : aucun élément visuel sur la carte — lecture auto au 1er geste
          de l'invité (désactivée dans l'aperçu du builder). */}
      <HiddenAutoMusic url={site.content?.musicUrl} enabled={!isPreview} />
    </div>
  );
}

export default StripesEditorialTemplate;
