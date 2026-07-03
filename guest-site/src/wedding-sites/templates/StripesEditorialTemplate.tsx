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
import { sectionLabels } from '../i18n';
import { formatWeddingDate } from '../utils/date';
import { PublicAudioToggle, PublicStickyNav, renderOptionalSections } from './templateParts';
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
  const font      = t.fontFamily      || "'Playfair Display', Georgia, serif";
  const fontSerif = "'Cormorant Garamond', Georgia, serif";
  const fontScript = "'Great Vibes', 'Dancing Script', cursive";

  /* ── Tokens spécifiques au Programme « faire-part de luxe » ──
        Tous dérivés du thème du builder : changer les couleurs du studio
        recolore l'intégralité des écritures, filets et fonds. ── */
  const fontTitle  = "'Cormorant Garamond', Georgia, serif"; // titres
  const fontBody   = "'Libre Baskerville', Georgia, serif";  // textes
  const pageBg     = bg;                                          // fond général
  const cardBg     = `color-mix(in srgb, ${bg} 45%, #FFFFFF)`;    // panneau du faire-part (fond éclairci)
  const inkProg    = ink;                                         // texte principal (couleur Texte du thème)
  const mutedProg  = `color-mix(in srgb, ${ink} 62%, ${bg})`;     // texte secondaire
  const lineProg   = `color-mix(in srgb, ${ink} 22%, ${bg})`;     // filets de la timeline
  const btnProg    = buttonBg;                                    // bouton (couleur secondaire du thème)

  /* Options du Studio de design (motif, séparateurs, style de cartes) */
  const separatorStyle = t.separatorStyle ?? 'none';
  const sep = <SectionSeparator style={separatorStyle} color={stripe} />;

  /* Logo monogramme (généré ou importé) affiché en haut de la carte */
  const monogramSvg = site.content?.monogramSvg;
  const monogramIsImg = !!monogramSvg && monogramSvg.startsWith('data:');
  const monogramSize = site.content?.monogramSizePx ?? 150;

  /* Textes du site + familles + pasuk (affichés sous la carte) */
  const memorialText = site.content?.texts?.memorialText?.trim();
  const familyText = site.content?.texts?.familyText?.trim();
  const hebrewQuote = site.content?.hebrewQuote?.trim();
  const pB = site.content?.parentsBride;
  const pG = site.content?.parentsGroom;
  const gpB = site.content?.grandparentsBride;
  const gpG = site.content?.grandparentsGroom;
  const famLine = (p?: { father?: string; mother?: string }, name?: string) =>
    [p?.father?.trim(), p?.mother?.trim()].filter(Boolean).join(' & ') +
    (name?.trim() ? ` ${name.trim()}` : '');
  const gpLine = (gp?: typeof gpB) =>
    [gp?.grandfather, gp?.grandmother, gp?.paternalGrandfather, gp?.paternalGrandmother, gp?.maternalGrandfather, gp?.maternalGrandmother]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(' · ');
  const brideFam = famLine(pB, site.content?.brideFamilyName);
  const groomFam = famLine(pG, site.content?.groomFamilyName);
  const brideGp = gpLine(gpB);
  const groomGp = gpLine(gpG);
  const hasFamilies = !!(brideFam || groomFam || brideGp || groomGp);
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
          label: e.label,
          time: e.time,
          day: e.date,
          place: e.place,
          description: e.description,
          mapsUrl: e.googleMapsUrl,
          wazeUrl: e.wazeUrl,
        }))
      : events.map((e) => ({
          id: e.id,
          label: e.label,
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
    fr: { cd1: 'Le grand jour', cd2: 'approche !', prog1: 'Le', prog2: 'Programme', itinerary: "Voir l'itinéraire", waze: 'Waze', days: 'Jours', hours: 'Heures', min: 'Min', sec: 'Sec', grandparents: 'Grands-parents' },
    en: { cd1: 'D Day is',      cd2: 'coming !',   prog1: 'The', prog2: 'Schedule',  itinerary: 'Get directions',   waze: 'Waze', days: 'Days',  hours: 'Hours',  min: 'Min', sec: 'Sec', grandparents: 'Grandparents' },
    he: { cd1: 'היום הגדול',    cd2: 'מתקרב !',     prog1: 'ה',  prog2: 'תוכנית',   itinerary: 'הוראות הגעה',       waze: 'Waze', days: 'ימים', hours: 'שעות',  min: 'דקות', sec: 'שניות', grandparents: 'סבים וסבתות' },
  } as const;
  const xl = XLBL[site.language] ?? XLBL.fr;

  /* ── Rayures « faire-part de luxe » : tuile PALINDROMIQUE (gap·barre·gap·barre·gap)
        + background centré → le motif est parfaitement symétrique gauche/droite,
        quelle que soit la largeur de la carte. ── */
  const frameStripes = `repeating-linear-gradient(
    to right,
    ${cardBg} 0px, ${cardBg} 7px,
    ${stripe} 7px, ${stripe} 15px,
    ${cardBg} 15px, ${cardBg} 22px,
    ${stripe} 22px, ${stripe} 30px,
    ${cardBg} 30px, ${cardBg} 37px
  )`;

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{ fontFamily: font, background: bg, color: ink, minHeight: '100vh', position: 'relative' }}
    >
      {/* Motif de fond du Studio de design */}
      <PatternOverlay patternId={t.patternId ?? 'none'} color={stripe} opacity={t.patternOpacity ?? 0.07} />
      {/* Le monogramme SVG généré embarque width/height fixes : on le fait
          scaler à la taille choisie dans le builder. */}
      <style>{'.stripes-monogram svg{width:100%;height:auto;display:block;}'}</style>
      <PublicStickyNav site={site} />

      {/* ── 1. Hero : carte carrée dont TOUT le fond est rayé (panneau ivoire central) ── */}
      {site.sections.hero && (
        <header style={{ background: pageBg, padding: 'clamp(1.8rem,5vw,4rem) clamp(0.9rem,4vw,2rem)' }}>
          {/* Carte carrée : rayures sur tout le fond */}
          <div
            style={{
              width: 'clamp(300px, 80%, 640px)',
              aspectRatio: '1 / 1',
              margin: '0 auto',
              backgroundImage: frameStripes,
              backgroundColor: cardBg,
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(30px,6vw,62px)',
              boxSizing: 'border-box',
            }}
          >
            {/* Panneau ivoire central — date, prénoms, lieu, phrase, pasuk */}
            <div
              style={{
                background: cardBg,
                boxSizing: 'border-box',
                padding: 'clamp(26px,5vw,54px) clamp(22px,5vw,48px)',
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              {monogramSvg && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'clamp(0.8rem,2vw,1.4rem)' }}>
                  {monogramIsImg ? (
                    <img
                      src={monogramSvg}
                      alt="Monogramme"
                      style={{ width: 'min(' + Math.min(monogramSize, 240) + 'px, 55%)', height: 'auto', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      className="stripes-monogram"
                      style={{ width: 'min(' + Math.min(monogramSize, 240) + 'px, 55%)' }}
                      dangerouslySetInnerHTML={{ __html: monogramSvg }}
                    />
                  )}
                </div>
              )}
              {site.date && (
                <p style={{ fontFamily: fontBody, fontSize: 'clamp(0.6rem,1.6vw,0.74rem)', letterSpacing: '0.26em', textTransform: 'uppercase', color: mutedProg, margin: '0 0 clamp(0.8rem,2vw,1.4rem)' }}>
                  {formatWeddingDate(site.date, site.language)}
                </p>
              )}
              <h1
                style={{
                  fontFamily: font,
                  fontSize: 'clamp(1.8rem, 6vw, 3.4rem)',
                  fontWeight: 400,
                  lineHeight: 1.08,
                  margin: 0,
                  letterSpacing: '0.01em',
                  color: inkProg,
                }}
              >
                {site.brideName && site.groomName
                  ? `${site.brideName} & ${site.groomName}`
                  : site.coupleName || site.brideName || site.groomName || ''}
              </h1>
              {(site.venue?.trim() || site.city?.trim()) && (
                <p style={{ fontFamily: fontBody, fontSize: 'clamp(0.6rem,1.6vw,0.74rem)', letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedProg, margin: 'clamp(0.9rem,2.2vw,1.4rem) 0 0' }}>
                  {[site.venue, site.city].filter(Boolean).join(' · ')}
                </p>
              )}
              {site.welcomeText?.trim() && (
                <p style={{ fontFamily: fontTitle, fontStyle: 'italic', fontSize: 'clamp(0.95rem,2.4vw,1.25rem)', lineHeight: 1.6, maxWidth: 360, margin: 'clamp(1rem,2.5vw,1.6rem) auto 0', color: mutedProg }}>
                  {site.welcomeText}
                </p>
              )}
              {hebrewQuote && (
                <p dir="rtl" style={{ fontFamily: fontTitle, fontSize: 'clamp(1rem,2.6vw,1.35rem)', lineHeight: 1.7, margin: 'clamp(1rem,2.5vw,1.6rem) auto 0', color: inkProg }}>
                  {hebrewQuote}
                </p>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── 1b. Familles + grands-parents + textes — juste sous le faire-part,
              comme sur une invitation papier (« avec leurs parents… ») ── */}
      {hasSiteTexts && (
        <section style={{ background: 'transparent', padding: '0 clamp(1.2rem,5vw,2rem) clamp(1.5rem,4vw,2.5rem)', textAlign: 'center' }}>
          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            {memorialText && (
              <p style={{ fontFamily: fontTitle, fontStyle: 'italic', fontSize: 'clamp(0.95rem,2.4vw,1.15rem)', lineHeight: 1.7, color: mutedProg, margin: '0 0 1.4rem' }}>
                {memorialText}
              </p>
            )}
            {familyText && (
              <p style={{ fontFamily: fontBody, fontSize: '0.95rem', lineHeight: 1.8, color: mutedProg, margin: '0 0 1.4rem' }}>
                {familyText}
              </p>
            )}
            {hasFamilies && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(1.5rem,5vw,3.5rem)', marginTop: '0.25rem' }}>
                {(brideFam || brideGp) && (
                  <div style={{ minWidth: 180, maxWidth: 280 }}>
                    {brideFam && <p style={{ fontFamily: fontBody, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.03em', color: inkProg, margin: 0, lineHeight: 1.6 }}>{brideFam}</p>}
                    {brideGp && (
                      <>
                        <p style={{ fontFamily: fontBody, fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: mutedProg, margin: '0.65rem 0 0.2rem' }}>{xl.grandparents}</p>
                        <p style={{ fontFamily: fontTitle, fontStyle: 'italic', fontSize: '0.92rem', color: mutedProg, margin: 0, lineHeight: 1.6 }}>{brideGp}</p>
                      </>
                    )}
                  </div>
                )}
                {(groomFam || groomGp) && (
                  <div style={{ minWidth: 180, maxWidth: 280 }}>
                    {groomFam && <p style={{ fontFamily: fontBody, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.03em', color: inkProg, margin: 0, lineHeight: 1.6 }}>{groomFam}</p>}
                    {groomGp && (
                      <>
                        <p style={{ fontFamily: fontBody, fontSize: '0.6rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: mutedProg, margin: '0.65rem 0 0.2rem' }}>{xl.grandparents}</p>
                        <p style={{ fontFamily: fontTitle, fontStyle: 'italic', fontSize: '0.92rem', color: mutedProg, margin: 0, lineHeight: 1.6 }}>{groomGp}</p>
                      </>
                    )}
                  </div>
                )}
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
            padding: 'clamp(2.5rem,6vw,4.5rem) clamp(1.2rem,5vw,2rem)',
            textAlign: 'center',
            scrollMarginTop: 88,
          }}
        >
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
              {/* Titre : "Le" + "Programme" (italique, très grand) */}
              <div style={{ marginBottom: 'clamp(8px,2vw,16px)' }}>
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
                    fontSize: 'clamp(2.6rem, 7vw, 4rem)',
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
                <div style={{ width: 1, height: 'clamp(48px,6vw,70px)', background: lineProg }} aria-hidden />

                {scheduleItems.map((evt, i) => (
                  <div key={evt.id} style={{ display: 'contents' }}>
                    {/* Filet vertical (1px, #D8D3CA) entre deux événements */}
                    {i > 0 && (
                      <div style={{ width: 1, height: 'clamp(60px,7vw,90px)', background: lineProg }} aria-hidden />
                    )}

                    {/* Bloc événement — tout centré, max 520px */}
                    <div style={{ maxWidth: 520, width: '100%', margin: '0 auto' }}>
                      {/* Date · Heure — une seule ligne, collées (ex. « 14 juin · 20h30 ») */}
                      {(evt.day?.trim() || evt.time?.trim()) && (
                        <div
                          style={{
                            fontFamily: fontTitle,
                            fontStyle: 'italic',
                            fontSize: 'clamp(1.05rem,2.6vw,1.3rem)',
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
                          fontSize: 'clamp(1rem,2.4vw,1.15rem)',
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
                              style={{
                                fontFamily: fontBody,
                                fontSize: '0.68rem',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                textDecoration: 'none',
                                color: '#fff',
                                background: btnProg,
                                padding: '11px 24px',
                                borderRadius: 6,
                              }}
                            >
                              {xl.itinerary}
                            </a>
                          )}
                          {evt.wazeUrl?.trim() && (
                            <a
                              href={evt.wazeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontFamily: fontBody,
                                fontSize: '0.68rem',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                textDecoration: 'none',
                                color: inkProg,
                                border: `1px solid ${lineProg}`,
                                padding: '10px 24px',
                                borderRadius: 6,
                              }}
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
                <div style={{ width: 1, height: 'clamp(48px,6vw,70px)', background: lineProg }} aria-hidden />
              </div>
          </div>
        </section>
      )}

      {site.date && sep}

      {/* ── 3. Countdown horizontal ── */}
      {site.date && (
        <div style={{ textAlign: 'center', padding: 'clamp(2rem,6vw,3.5rem) 1.5rem' }}>
          {/* « D Day is coming ! » */}
          <div style={{ marginBottom: '0.4rem', lineHeight: 1.3 }}>
            <span style={{ fontFamily: fontSerif, fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontStyle: 'italic', opacity: 0.85 }}>
              {xl.cd1}{' '}
            </span>
            <span style={{ fontFamily: fontScript, fontSize: 'clamp(1.4rem, 4.5vw, 1.9rem)', color: ink }}>
              {xl.cd2}
            </span>
          </div>

          {/* Grands chiffres avec séparateurs « : » */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', lineHeight: 1, margin: '0.2rem 0 0.45rem', flexWrap: 'nowrap' }}>
            {[String(c.d), pad(c.h), pad(c.m), pad(c.s)].map((val, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                <span style={{ fontFamily: font, fontSize: 'clamp(3rem, 11vw, 5.5rem)', fontWeight: 400, letterSpacing: '-0.02em', color: ink }}>
                  {val}
                </span>
                {i < 3 && (
                  <span style={{ fontFamily: font, fontSize: 'clamp(2rem, 8vw, 4rem)', fontWeight: 300, opacity: 0.6, margin: '0 1px', color: ink }}>:</span>
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
      <section style={{ background: 'transparent', padding: '0 clamp(1.2rem,5vw,2rem)' }}>
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
        <div id="rsvp" style={{ textAlign: 'center', padding: 'clamp(2.5rem,7vw,4rem) 1.5rem clamp(3rem,8vw,5rem)', background: bg, scrollMarginTop: 88 }}>
          <div
            style={{
              fontFamily: font,
              fontSize: 'clamp(2.2rem, 7vw, 3rem)',
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

      <PublicAudioToggle site={site} />
    </div>
  );
}

export default StripesEditorialTemplate;
