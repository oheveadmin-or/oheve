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
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { WeddingTemplateProps } from '../types';
import { sectionLabels } from '../i18n';
import { formatWeddingDate } from '../utils/date';
import { PublicAudioToggle, PublicStickyNav } from './templateParts';

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

  /* ── Données ── */
  const events = (site.rsvpForm?.events ?? []).filter((e) => e.enabled);
  const jewishEvts = site.sections.jewishSection
    ? (site.content?.jewishEvents ?? []).filter((e) => e.enabled)
    : [];

  // Source du programme : jewishEvents en priorité (ont time+description), puis rsvp events
  const scheduleItems: Array<{ id: string; label: string; time?: string; description?: string }> =
    jewishEvts.length > 0
      ? jewishEvts.map((e) => ({ id: e.id, label: e.label, time: e.time, description: e.description }))
      : events.map((e) => ({ id: e.id, label: e.label, time: e.time, description: e.shortDescription }));

  const hasSchedule = site.sections.program && scheduleItems.length > 0;

  const featuredPhoto =
    site.content?.galleryPhotos?.find(Boolean) ||
    site.content?.venue?.photoUrl ||
    undefined;

  const c = useCountdown(site.date);

  /* ── Labels i18n étendus ── */
  const XLBL = {
    fr: { cd1: 'Le grand jour', cd2: 'approche !', prog1: 'Le', prog2: 'programme', days: 'Jours', hours: 'Heures', min: 'Min', sec: 'Sec' },
    en: { cd1: 'D Day is',      cd2: 'coming !',   prog1: 'The', prog2: 'schedule',  days: 'Days',  hours: 'Hours',  min: 'Min', sec: 'Sec' },
    he: { cd1: 'היום הגדול',    cd2: 'מתקרב !',     prog1: 'ה',  prog2: 'תוכנית',   days: 'ימים', hours: 'שעות',  min: 'דקות', sec: 'שניות' },
  } as const;
  const xl = XLBL[site.language] ?? XLBL.fr;

  /* ── Motifs rayures CSS ── */
  const vStripe: CSSProperties = {
    width: 28,
    alignSelf: 'stretch',
    flexShrink: 0,
    backgroundImage: `repeating-linear-gradient(
      to bottom,
      ${stripe} 0px, ${stripe} 10px,
      ${bg}     10px, ${bg}     20px
    )`,
  };

  const hBand: CSSProperties = {
    height: 26,
    width: '100%',
    backgroundImage: `repeating-linear-gradient(
      to right,
      ${stripe} 0px, ${stripe} 10px,
      ${bg}     10px, ${bg}     20px
    )`,
  };

  return (
    <div
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root wedding-fade-in"
      style={{ fontFamily: font, background: bg, color: ink, minHeight: '100vh' }}
    >
      <PublicStickyNav site={site} />

      {/* ── 1. Hero : prénoms + date ── */}
      {site.sections.hero && (
        <header style={{ textAlign: 'center', padding: 'clamp(2rem,6vw,4rem) 2rem 1.8rem' }}>
          {site.date && (
            <p style={{ fontFamily: fontSerif, fontSize: '0.72rem', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.55, margin: '0 0 0.65rem' }}>
              {formatWeddingDate(site.date, site.language)}
            </p>
          )}
          <h1
            style={{
              fontFamily: font,
              fontSize: 'clamp(2rem, 6.5vw, 3.2rem)',
              fontWeight: 400,
              lineHeight: 1.1,
              margin: '0 0 0.6rem',
              letterSpacing: '0.01em',
            }}
          >
            {site.brideName && site.groomName
              ? `${site.brideName} & ${site.groomName}`
              : site.coupleName || site.brideName || site.groomName || ''}
          </h1>
          {(site.venue?.trim() || site.city?.trim()) && (
            <p style={{ fontFamily: fontSerif, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.5, margin: 0 }}>
              {[site.venue, site.city].filter(Boolean).join(' · ')}
            </p>
          )}
          {site.welcomeText?.trim() && (
            <p style={{ fontFamily: fontSerif, fontSize: '1rem', fontStyle: 'italic', lineHeight: 1.7, maxWidth: 320, margin: '1.2rem auto 0', opacity: 0.75 }}>
              {site.welcomeText}
            </p>
          )}
        </header>
      )}

      {/* ── 2. Programme encadré de rayures ── */}
      {hasSchedule && (
        <>
          {/* Bande horizontale haute */}
          <div style={hBand} aria-hidden />

          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {/* Rayures gauche */}
            <div style={vStripe} aria-hidden />

            {/* Contenu du programme */}
            <div id="program" style={{ flex: 1, padding: 'clamp(2rem,5vw,3rem) clamp(1rem,4vw,2rem)', textAlign: 'center', minWidth: 0, scrollMarginTop: 88 }}>
              {/* Titre en deux lignes : "Le" + "programme" (script) */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontFamily: fontSerif, fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)', letterSpacing: '0.06em', opacity: 0.7, lineHeight: 1.2 }}>
                  {xl.prog1}
                </div>
                <div style={{ fontFamily: fontScript, fontSize: 'clamp(2rem, 7vw, 2.8rem)', lineHeight: 1.1, color: ink }}>
                  {xl.prog2}
                </div>
              </div>

              {/* Liste d'événements */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 340, margin: '0 auto' }}>
                {scheduleItems.map((evt, i) => (
                  <div key={evt.id} style={{ width: '100%' }}>
                    {/* Filet vertical entre événements */}
                    {i > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
                        <div style={{ width: 1, height: 22, background: `${ink}28` }} />
                      </div>
                    )}
                    <div style={{ padding: '0.3rem 0' }}>
                      {evt.time?.trim() && (
                        <div style={{ fontFamily: fontSerif, fontStyle: 'italic', fontSize: '0.92rem', opacity: 0.6, marginBottom: '0.15rem' }}>
                          {evt.time}
                        </div>
                      )}
                      <div style={{ fontFamily: font, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em', marginBottom: evt.description ? '0.25rem' : 0 }}>
                        {evt.label}
                      </div>
                      {evt.description?.trim() && (
                        <div style={{ fontFamily: fontSerif, fontSize: '0.88rem', lineHeight: 1.65, opacity: 0.65, maxWidth: 280, margin: '0 auto' }}>
                          {evt.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rayures droite */}
            <div style={vStripe} aria-hidden />
          </div>

          {/* Bande horizontale basse */}
          <div style={hBand} aria-hidden />
        </>
      )}

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
