/**
 * InvitationTemplate — modèle « Invitation animée ».
 *
 * Un faire-part qui prend vie : carte d'en-tête où tombent quelques pétales,
 * prénoms calligraphiés qui apparaissent l'un après l'autre, compte à rebours
 * à chiffres basculants, programme en cartes (itinéraire + « Ajouter à mon
 * agenda »), réponse via le RSVP existant, mini-jeu « Cassez le verre » et
 * barre fixe Répondre · Itinéraire.
 *
 * Tout le contenu vient de `site` ; couleurs et polices du thème live via
 * `invitationTokens`. Les effets se règlent dans l'étape « Invitation » du
 * builder (`theme.invitation`). Les sections fonctionnelles restantes (Lieu,
 * Hébergements, FAQ, Galerie…) sont déléguées à `renderOptionalSections`.
 *
 * Option « Une page par événement » (`theme.invitation.pages`) : chaque
 * événement du programme a sa page (date hébraïque, adresse, bandeau
 * Waze · Plans · Google Maps), choisie dans une barre d'onglets en bas ; un
 * dernier onglet « Réponses » réunit contacts WhatsApp et formulaire RSVP.
 *
 * Animations : CSS uniquement, aucune dépendance. `prefers-reduced-motion`
 * coupe tout (pétales masqués, contenu affiché d'emblée, éclats retirés).
 */
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import type { GuestContact, WeddingSite, WeddingTemplateProps } from '../types';
import { WeddingRSVPForm } from '../../rsvp/WeddingRSVPForm';
import { createDefaultRSVPForm } from '../../rsvp/types';
import { sectionLabels } from '../i18n';
import { frenchLongDate, hebrewDateFromIso } from '../utils/hebrewDate';
import { parseEventTime, sortEventsChronologically, weddingYear } from '../utils/eventOrder';
import { calendarSlot, directionsLinks, downloadIcs, googleCalendarUrl } from '../utils/calendar';
import { invitationTokens } from '../themes/InvitationTheme';
import type { InvitationTokens } from '../themes/InvitationTheme';
import { HebrewVerseArc } from '../components/HebrewVerseArc';
import {
  FamilyColumnsRow,
  getFamilyColumns,
  hasInvitationTexts,
  HiddenAutoMusic,
  InvitationTextsBlock,
  PublicStickyNav,
  renderOptionalSections,
  useMusicPlayer,
} from './templateParts';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Textes de l'interface                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const STRINGS = {
  fr: {
    discover: "Découvrir l'invitation",
    countdownDone: "C'est le grand jour !",
    countdownUnits: ['Jours', 'Heures', 'Min', 'Sec'],
    timeTbc: 'Horaire à confirmer',
    at: 'à',
    directions: 'Itinéraire',
    addToCalendar: 'Ajouter à mon agenda',
    ics: 'iPhone, Outlook (.ics)',
    google: 'Google Agenda',
    rsvpTitle: 'Merci de confirmer votre présence',
    glassTitle: 'Cassez le verre',
    glassText: 'Sous la Houppa, le marié brise un verre en souvenir de Jérusalem. À votre tour !',
    glassBtn: 'Touchez le verre pour le briser',
    glassAgain: 'Encore un Mazal Tov',
    mazal: 'Mazal Tov !',
    reply: 'Répondre',
    mainEvent: 'Le mariage',
    weddingOf: 'Mariage de',
    plans: 'Plans',
    replies: 'Réponses',
    questions: 'Pour toute question, contactez :',
    whatsapp: 'WhatsApp',
    musicOn: 'Activer la musique',
    musicOff: 'Couper la musique',
    pagesNav: 'Pages de l’invitation',
  },
  he: {
    discover: 'לגלות את ההזמנה',
    countdownDone: 'היום הגדול הגיע!',
    countdownUnits: ['ימים', 'שעות', 'דק׳', 'שנ׳'],
    timeTbc: 'השעה תימסר בהמשך',
    at: 'בשעה',
    directions: 'הוראות הגעה',
    addToCalendar: 'הוספה ליומן',
    ics: 'iPhone, Outlook (.ics)',
    google: 'Google Calendar',
    rsvpTitle: 'נשמח לאישור הגעתכם',
    glassTitle: 'שוברים את הכוס',
    glassText: 'תחת החופה החתן שובר כוס זכר לחורבן ירושלים. תורכם!',
    glassBtn: 'געו בכוס כדי לשבור אותה',
    glassAgain: 'עוד מזל טוב',
    mazal: '!מזל טוב',
    reply: 'אישור הגעה',
    mainEvent: 'החתונה',
    weddingOf: 'החתונה של',
    plans: 'Apple Maps',
    replies: 'אישורי הגעה',
    questions: 'לכל שאלה ניתן לפנות אל:',
    whatsapp: 'WhatsApp',
    musicOn: 'הפעלת מוזיקה',
    musicOff: 'השתקת מוזיקה',
    pagesNav: 'עמודי ההזמנה',
  },
  en: {
    discover: 'Open the invitation',
    countdownDone: 'The big day is here!',
    countdownUnits: ['Days', 'Hours', 'Min', 'Sec'],
    timeTbc: 'Time to be confirmed',
    at: 'at',
    directions: 'Directions',
    addToCalendar: 'Add to my calendar',
    ics: 'iPhone, Outlook (.ics)',
    google: 'Google Calendar',
    rsvpTitle: 'Kindly confirm your attendance',
    glassTitle: 'Break the glass',
    glassText: 'Under the Chuppah, the groom breaks a glass in memory of Jerusalem. Your turn!',
    glassBtn: 'Tap the glass to break it',
    glassAgain: 'One more Mazal Tov',
    mazal: 'Mazal Tov!',
    reply: 'Reply',
    mainEvent: 'The wedding',
    weddingOf: 'Wedding of',
    plans: 'Apple Maps',
    replies: 'Replies',
    questions: 'Any question? Contact:',
    whatsapp: 'WhatsApp',
    musicOn: 'Play music',
    musicOff: 'Mute music',
    pagesNav: 'Invitation pages',
  },
};
type Strings = (typeof STRINGS)['fr'];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Utilitaires                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

/** Prénom réel, ou '' pour un champ vide / le « … » provisoire de l'aperçu */
function realName(s?: string): string {
  const v = s?.trim() ?? '';
  return /\p{L}/u.test(v) ? v : '';
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** « 19h30 » à partir d'une heure saisie librement (sinon le texte tel quel) */
function prettyTime(raw?: string): string {
  const min = parseEventTime(raw);
  if (min === null) return raw?.trim() ?? '';
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

/** Date ISO (AAAA-MM-JJ) → « jeudi 26 novembre 2026 » ; texte libre conservé */
function prettyDate(raw?: string): string {
  const v = raw?.trim() ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? frenchLongDate(v) || v : v;
}

/**
 * Apparition au défilement : les éléments `.inv-reveal` restent visibles tant
 * que le script n'a pas « armé » la racine (pas d'IntersectionObserver,
 * animations réduites, capture d'écran…) — jamais de contenu bloqué invisible.
 */
function useReveal(enabled: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      root?.removeAttribute('data-reveal');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    ioRef.current = io;
    root.setAttribute('data-reveal', 'on');
    return () => {
      io.disconnect();
      ioRef.current = null;
      root.removeAttribute('data-reveal');
    };
  }, [enabled]);

  // Les cartes apparues pendant l'édition (aperçu) sont observées à leur tour
  useEffect(() => {
    const io = ioRef.current;
    if (!io) return;
    rootRef.current?.querySelectorAll('.inv-reveal:not(.is-in)').forEach((el) => io.observe(el));
  });

  return rootRef;
}

function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const target = new Date(iso).getTime();
  const diff = Number.isNaN(target) ? 0 : Math.max(0, target - now);
  return {
    done: !Number.isNaN(target) && diff === 0,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Briques visuelles                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function Card({ tk, children, id, className = '', style, label }: { tk: InvitationTokens; children: ReactNode; id?: string; className?: string; style?: CSSProperties; label?: string }) {
  return (
    <section
      id={id}
      aria-label={label}
      className={`inv-card inv-reveal ${className}`}
      style={{ borderRadius: tk.radius, ...style }}
    >
      {children}
    </section>
  );
}

/** Ornement : fin trait qui se dessine, avec un losange au centre */
function Flourish({ color, width = 180 }: { color: string; width?: number }) {
  return (
    <svg className="inv-flourish" aria-hidden width={width} height="14" viewBox="0 0 180 14" style={{ maxWidth: '70%', display: 'block', margin: '0 auto' }}>
      <path className="inv-draw" d="M4 7 H76 M104 7 H176" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path className="inv-draw" d="M90 1 L96 7 L90 13 L84 7 Z" stroke={color} strokeWidth="1" fill="none" />
      <circle cx="80" cy="7" r="1.4" fill={color} />
      <circle cx="100" cy="7" r="1.4" fill={color} />
    </svg>
  );
}

function ScriptTitle({ tk, children }: { tk: InvitationTokens; children: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.3rem' }}>
      <h2 style={{ margin: 0, fontFamily: tk.fonts.script, fontWeight: 400, fontSize: tk.sizes.title, lineHeight: 1.15, color: tk.colors.ink, overflowWrap: 'anywhere' }}>
        {children}
      </h2>
      <div style={{ marginTop: '0.6rem' }}>
        <Flourish color={tk.colors.foil} width={150} />
      </div>
    </div>
  );
}

/** Pétales : positions fixes (rendu identique serveur/aperçu), décalages négatifs pour démarrer en pleine chute */
const PETALS = [
  { x: 6, delay: -1, dur: 13, size: 12, drift: 18, tone: 0 },
  { x: 17, delay: -7, dur: 16, size: 9, drift: -14, tone: 1 },
  { x: 28, delay: -3.5, dur: 12, size: 14, drift: 22, tone: 2 },
  { x: 39, delay: -10, dur: 17, size: 10, drift: -20, tone: 0 },
  { x: 50, delay: -5, dur: 14, size: 13, drift: 16, tone: 1 },
  { x: 61, delay: -12.5, dur: 18, size: 9, drift: -12, tone: 2 },
  { x: 72, delay: -2, dur: 13.5, size: 15, drift: 20, tone: 0 },
  { x: 83, delay: -8.5, dur: 15.5, size: 11, drift: -18, tone: 1 },
  { x: 92, delay: -4, dur: 16.5, size: 12, drift: 14, tone: 2 },
  { x: 45, delay: -14, dur: 19, size: 10, drift: -16, tone: 0 },
];

function Petals({ tk }: { tk: InvitationTokens }) {
  const tones = [tk.colors.foil, tk.colors.sage, '#E7C6BC'];
  return (
    <div className="inv-petals" aria-hidden>
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="inv-petal-col"
          style={{ left: `${p.x}%`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` } as CSSProperties}
        >
          <svg
            className="inv-petal"
            width={p.size}
            height={p.size * 1.35}
            viewBox="0 0 18 26"
            style={{ '--inv-drift': `${p.drift}px`, animationDuration: `${p.dur / 2.2}s`, animationDelay: `${p.delay}s` } as CSSProperties}
          >
            <path d="M9 2 Q12 0 14 3 C17 9 14 18 9 24 C4 18 1 9 4 3 Q6 0 9 2 Z" fill={tones[p.tone]} fillOpacity="0.55" />
            <path d="M9 4 C10 10 10 16 9 21" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.8" fill="none" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/** Monogramme du couple (généré dans l'étape Mariés) ou médaillon à leurs initiales */
function Monogram({ site, tk }: { site: WeddingSite; tk: InvitationTokens }) {
  const svg = site.content?.monogramSvg;
  if (svg) {
    const size = Math.min(site.content?.monogramSizePx ?? 96, 220);
    return (
      <div
        aria-hidden
        className="inv-rise"
        style={{ width: size, maxWidth: '58%', aspectRatio: '1 / 1', margin: '0 auto 0.6rem', color: tk.colors.foil, animationDelay: '0.1s' }}
        dangerouslySetInnerHTML={{ __html: svg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"') }}
      />
    );
  }
  const a = realName(site.brideName).charAt(0).toUpperCase();
  const b = realName(site.groomName).charAt(0).toUpperCase();
  const initials = a && b ? `${a}${b}` : a || b || realName(site.coupleName).charAt(0).toUpperCase();
  if (!initials) return null;
  return (
    <svg aria-hidden className="inv-rise" width="92" height="92" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto 0.7rem', animationDelay: '0.1s' }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={tk.colors.foil} strokeWidth="1" />
      <circle cx="50" cy="50" r="41" fill="none" stroke={tk.colors.foil} strokeWidth="0.6" strokeDasharray="1.5 3" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontFamily={tk.fonts.script} fontSize={initials.length > 1 ? 34 : 40} fill={tk.colors.foil}>
        {initials.length > 1 ? `${initials[0]}·${initials[1]}` : initials}
      </text>
    </svg>
  );
}

/** Prénom en hébreu, sous le prénom calligraphié */
function HebrewName({ tk, name, style }: { tk: InvitationTokens; name: string; style?: CSSProperties }) {
  return (
    <span
      className="inv-rise"
      dir="rtl"
      lang="he"
      style={{ fontFamily: `'Frank Ruhl Libre', 'Noto Serif Hebrew', ${tk.fonts.body}, serif`, fontSize: 'clamp(1.2rem, 6cqw, 1.6rem)', color: tk.colors.muted, lineHeight: 1.3, margin: '0.1rem 0 0.2rem', ...style }}
    >
      {name}
    </span>
  );
}

/** Mention « בס״ד », en haut à droite comme sur un faire-part papier */
function Bsd({ tk }: { tk: InvitationTokens }) {
  return (
    <p dir="rtl" lang="he" style={{ margin: 0, padding: '0.6rem 16px 0', textAlign: 'right', fontFamily: `'Frank Ruhl Libre', 'Noto Serif Hebrew', ${tk.fonts.body}, serif`, fontSize: '0.85rem', color: tk.colors.muted }}>
      בס״ד
    </p>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  1. Carte d'en-tête                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

function HeroCard({ site, tk, S, onDiscover }: { site: WeddingSite; tk: InvitationTokens; S: Strings; onDiscover: () => void }) {
  const bride = realName(site.brideName);
  const groom = realName(site.groomName);
  const two = !!(bride && groom);
  const name1 = two ? bride : realName(site.coupleName) || bride || groom || '…';
  const he1 = (two ? site.content?.brideNameHe : '')?.trim();
  const he2 = site.content?.groomNameHe?.trim();
  const iso = site.date?.slice(0, 10) ?? '';
  const [y, m, d] = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-') : [];
  const longDate = iso ? frenchLongDate(iso) : '';
  const hebDate = iso ? hebrewDateFromIso(iso)?.fr ?? '' : '';
  const place = [site.venue || site.content?.venue?.name, site.city].map((s) => s?.trim()).filter(Boolean).join(' · ');
  const nameStyle: CSSProperties = {
    fontFamily: tk.fonts.script,
    fontSize: tk.sizes.names,
    fontWeight: 400,
    lineHeight: 1.08,
    color: tk.colors.ink,
    overflowWrap: 'anywhere',
    maxWidth: '100%',
  };
  // Entrées échelonnées : chaque élément apparaît un peu après le précédent
  let step = 0;
  const delay = () => ({ animationDelay: `${0.2 + 0.18 * step++}s` });

  return (
    <Card tk={tk} className="inv-hero" label={two ? `${bride} & ${groom}` : name1}>
      {tk.effects.petals ? <Petals tk={tk} /> : null}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {site.content?.hebrewQuote?.trim() ? (
          <div className="inv-rise" style={{ width: '100%', marginBottom: '0.4rem', ...delay() }}>
            <HebrewVerseArc
              text={site.content.hebrewQuote}
              color={tk.colors.ink}
              dotColor={tk.colors.foil}
              font={`'Frank Ruhl Libre', 'Noto Serif Hebrew', ${tk.fonts.body}, serif`}
              width={500}
              rx={226}
              ry={66}
              maxFontSize={30}
              minFontSize={12}
              maxSpread={2.0}
            />
          </div>
        ) : null}

        <Monogram site={site} tk={tk} />

        {site.welcomeText?.trim() ? (
          <p className="inv-rise inv-kicker" style={{ color: tk.colors.muted, fontFamily: tk.fonts.label, ...delay() }}>
            {site.welcomeText.trim()}
          </p>
        ) : null}

        <h1 style={{ margin: 0, fontWeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
          <span className="inv-rise" style={{ ...nameStyle, ...delay() }}>{name1}</span>
          {he1 ? <HebrewName tk={tk} name={he1} style={delay()} /> : null}
          {two ? (
            <>
              <span className="inv-rise" style={{ fontFamily: tk.fonts.script, fontSize: `calc(${tk.sizes.names} * 0.55)`, color: tk.colors.foil, lineHeight: 1, margin: '0.15rem 0', ...delay() }}>
                &amp;
              </span>
              <span className="inv-rise" style={{ ...nameStyle, ...delay() }}>{groom}</span>
              {he2 ? <HebrewName tk={tk} name={he2} style={delay()} /> : null}
            </>
          ) : null}
        </h1>

        <div className="inv-rise" style={{ margin: '1.3rem 0 1.1rem', width: '100%', ...delay() }}>
          <Flourish color={tk.colors.foil} />
        </div>

        {d ? (
          <p className="inv-rise" style={{ margin: 0, fontFamily: tk.fonts.label, fontSize: '1.35rem', letterSpacing: '0.32em', color: tk.colors.ink, paddingInlineStart: '0.32em', ...delay() }}>
            {d} · {m} · {y}
          </p>
        ) : null}
        {longDate || hebDate ? (
          <p className="inv-rise" style={{ margin: '0.35rem 0 0', fontFamily: tk.fonts.body, fontStyle: 'italic', fontSize: '1rem', color: tk.colors.muted, ...delay() }}>
            {[longDate, hebDate].filter(Boolean).join(' — ')}
          </p>
        ) : null}
        {place ? (
          <p className="inv-rise" style={{ margin: '0.5rem 0 0', fontFamily: tk.fonts.label, fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: tk.colors.ink, overflowWrap: 'anywhere', ...delay() }}>
            {place}
          </p>
        ) : null}

        <button type="button" className="inv-rise inv-cue" onClick={onDiscover} style={{ color: tk.colors.foil, fontFamily: tk.fonts.label, ...delay() }}>
          <span>{S.discover}</span>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  2. Compte à rebours à chiffres basculants                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function FlipCountdown({ tk, iso, S, title }: { tk: InvitationTokens; iso: string; S: Strings; title: string }) {
  const c = useCountdown(iso);
  const cells = [String(c.d), String(c.h).padStart(2, '0'), String(c.m).padStart(2, '0'), String(c.s).padStart(2, '0')];
  return (
    <Card tk={tk} label={title}>
      <ScriptTitle tk={tk}>{title}</ScriptTitle>
      {c.done ? (
        <p style={{ margin: 0, textAlign: 'center', fontFamily: tk.fonts.script, fontSize: tk.sizes.title, color: tk.colors.foil }}>{S.countdownDone}</p>
      ) : (
        // Lecteurs d'écran : une seule phrase, pas l'annonce de chaque seconde
        <div role="timer" aria-live="off" aria-label={`${c.d} ${S.countdownUnits[0]}, ${c.h} ${S.countdownUnits[1]}, ${c.m} ${S.countdownUnits[2]}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'clamp(6px, 2.5cqw, 14px)' }}>
          {cells.map((v, i) => (
            <div key={i} aria-hidden style={{ textAlign: 'center' }}>
              <div className="inv-flipbox" style={{ borderColor: tk.colors.hairline, background: tk.colors.paper, borderRadius: Math.min(tk.radius, 10) }}>
                <span key={v} className="inv-flip" style={{ fontFamily: tk.fonts.label, color: tk.colors.ink }}>
                  {v}
                </span>
              </div>
              <div style={{ marginTop: 7, fontFamily: tk.fonts.label, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: tk.colors.muted }}>
                {S.countdownUnits[i]}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  3. Programme : une carte par événement                                     */
/* ────────────────────────────────────────────────────────────────────────── */

type InvEvent = {
  id: string;
  /** Type d'événement juif (mairie, henne, houppa…) : choisit l'icône de l'onglet */
  type?: string;
  label: string;
  date?: string;
  time?: string;
  place?: string;
  description?: string;
  googleMapsUrl?: string;
  wazeUrl?: string;
};

function programEvents(site: WeddingSite, S: Strings): InvEvent[] {
  const year = weddingYear(site.date);
  const jewish = (site.content?.jewishEvents ?? []).filter((e) => e.enabled);
  if (jewish.length) {
    return sortEventsChronologically(
      jewish.map((e) => ({ id: e.id, type: e.type, label: e.label, date: e.date, time: e.time, place: e.place, description: e.description, googleMapsUrl: e.googleMapsUrl, wazeUrl: e.wazeUrl })),
      (e) => e.date,
      (e) => e.time,
      year,
    );
  }
  const rsvp = (site.rsvpForm?.events ?? []).filter((e) => e.enabled && (e.dayLabel?.trim() || e.time?.trim() || e.place?.trim()));
  if (rsvp.length) {
    return sortEventsChronologically(
      rsvp.map((e) => ({ id: e.id, label: e.label, date: e.dayLabel, time: e.time, place: e.place, description: e.shortDescription })),
      (e) => e.date,
      (e) => e.time,
      year,
    );
  }
  // Aucun programme saisi : le mariage lui-même, avec la date et la salle principales
  const iso = site.date?.slice(0, 10) ?? '';
  if (!iso) return [];
  const venue = site.content?.venue;
  return [
    {
      id: 'main',
      type: 'houppa',
      label: S.mainEvent,
      date: iso,
      time: site.time,
      place: [venue?.name || site.venue, venue?.address || site.city].map((s) => s?.trim()).filter(Boolean).join(', '),
      googleMapsUrl: venue?.googleMapsUrl,
      wazeUrl: venue?.wazeUrl,
    },
  ];
}

function EventCard({ ev, site, tk, S, index }: { ev: InvEvent; site: WeddingSite; tk: InvitationTokens; S: Strings; index: number }) {
  const date = prettyDate(ev.date);
  const time = prettyTime(ev.time);
  const place = ev.place?.trim() ?? '';
  const links = directionsLinks(place, ev.googleMapsUrl, ev.wazeUrl);
  const couple = [realName(site.brideName), realName(site.groomName)].filter(Boolean).join(' & ');
  const calInput = {
    title: couple ? `${ev.label} — ${couple}` : ev.label,
    date: ev.date,
    time: ev.time,
    place,
    description: [couple ? `${S.weddingOf} ${couple}` : '', ev.description?.trim()].filter(Boolean).join('\n'),
  };
  const slot = tk.effects.calendar ? calendarSlot(calInput, weddingYear(site.date)) : null;
  const uid = `${site.slug || 'mariage'}-${ev.id}`.replace(/[^a-zA-Z0-9-]/g, '');

  return (
    <Card tk={tk} className="inv-event" style={{ transitionDelay: `${Math.min(index, 3) * 0.08}s` }} label={ev.label}>
      <div style={{ textAlign: 'center' }}>
        {date ? (
          <p style={{ margin: 0, fontFamily: tk.fonts.label, fontSize: '0.72rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: tk.colors.foil, overflowWrap: 'anywhere' }}>
            {date}
          </p>
        ) : null}
        <h3 style={{ margin: '0.35rem 0 0', fontFamily: tk.fonts.script, fontWeight: 400, fontSize: tk.sizes.title, lineHeight: 1.15, color: tk.colors.ink, overflowWrap: 'anywhere' }}>
          {ev.label}
        </h3>
        <p style={{ margin: '0.55rem 0 0', fontFamily: tk.fonts.body, fontSize: '1.15rem', color: tk.colors.ink }}>
          {time ? `${S.at} ${time}` : <span style={{ fontStyle: 'italic', color: tk.colors.muted }}>{S.timeTbc}</span>}
        </p>
        {place ? (
          <p style={{ margin: '0.3rem 0 0', fontFamily: tk.fonts.body, fontSize: '1.02rem', lineHeight: 1.55, color: tk.colors.muted, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{place}</p>
        ) : null}
        {ev.description?.trim() ? (
          <p style={{ margin: '0.6rem 0 0', fontFamily: tk.fonts.body, fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.6, color: tk.colors.ink, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{ev.description.trim()}</p>
        ) : null}

        {links.google || slot ? (
          <div className="inv-actions">
            {links.google ? (
              <a className="inv-btn" href={links.google} target="_blank" rel="noopener noreferrer">
                <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                  <circle cx="12" cy="10" r="2.3" />
                </svg>
                {S.directions}
                <span className="inv-sr"> — Google Maps</span>
              </a>
            ) : null}
            {links.waze ? (
              <a className="inv-btn inv-btn-ghost" href={links.waze} target="_blank" rel="noopener noreferrer">
                Waze
              </a>
            ) : null}
            {slot ? (
              <details className="inv-cal">
                <summary className="inv-btn inv-btn-ghost">
                  <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
                    <path d="M8 3.5v4M16 3.5v4M4 10h16M12 13v4M10 15h4" />
                  </svg>
                  {S.addToCalendar}
                </summary>
                <div className="inv-cal-menu">
                  <button type="button" className="inv-btn inv-btn-ghost" onClick={() => downloadIcs(calInput, slot, uid)}>
                    {S.ics}
                  </button>
                  <a className="inv-btn inv-btn-ghost" href={googleCalendarUrl(calInput, slot)} target="_blank" rel="noopener noreferrer">
                    {S.google}
                  </a>
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  4. Cassez le verre                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

const SHARDS = [
  { dx: -70, dy: -40, r: -160, path: 'M0 0 L9 -4 L6 8 Z' },
  { dx: 64, dy: -52, r: 140, path: 'M0 0 L7 -7 L10 5 Z' },
  { dx: -48, dy: 46, r: 220, path: 'M0 0 L10 2 L3 9 Z' },
  { dx: 78, dy: 30, r: -200, path: 'M0 0 L6 -8 L11 1 Z' },
  { dx: -92, dy: 4, r: 110, path: 'M0 0 L8 -3 L5 6 Z' },
  { dx: 30, dy: 62, r: -120, path: 'M0 0 L9 3 L2 8 Z' },
  { dx: 6, dy: -78, r: 260, path: 'M0 0 L5 -9 L9 0 Z' },
];
const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  const dist = 70 + (i % 3) * 22;
  return { dx: Math.round(Math.cos(a) * dist), dy: Math.round(Math.sin(a) * dist * 0.8), tone: i % 3 };
});

function GlassCard({ tk, S }: { tk: InvitationTokens; S: Strings }) {
  const [broken, setBroken] = useState(0);
  const isBroken = broken > 0;
  const tones = [tk.colors.foil, tk.colors.sage, '#E7C6BC'];

  const breakGlass = () => {
    setBroken((n) => n + 1);
    try {
      navigator.vibrate?.(35);
    } catch {
      /* vibration indisponible */
    }
  };

  return (
    <Card tk={tk} label={S.glassTitle}>
      <ScriptTitle tk={tk}>{S.glassTitle}</ScriptTitle>
      <p style={{ margin: '0 auto 1rem', maxWidth: 360, textAlign: 'center', fontFamily: tk.fonts.body, fontStyle: 'italic', fontSize: '1.02rem', lineHeight: 1.6, color: tk.colors.muted }}>
        {S.glassText}
      </p>
      <div className="inv-glass-stage">
        {!isBroken ? (
          <button type="button" className="inv-glass-btn" onClick={breakGlass} aria-label={S.glassBtn} title={S.glassBtn}>
            <svg aria-hidden width="76" height="112" viewBox="0 0 76 112" fill="none" stroke={tk.colors.foil} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 6 H62 C62 34 52 50 38 52 C24 50 14 34 14 6 Z" fill={tk.colors.foil} fillOpacity="0.08" />
              <path d="M20 14 C21 26 26 36 32 40" strokeOpacity="0.5" />
              <path d="M38 52 V92" />
              <path d="M22 100 C28 94 48 94 54 100 Z" fill={tk.colors.foil} fillOpacity="0.12" />
            </svg>
          </button>
        ) : (
          <div key={broken} className="inv-burst" aria-hidden>
            {SHARDS.map((s, i) => (
              <svg key={`s${i}`} className="inv-shard" width="14" height="14" viewBox="-2 -10 14 20" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--r': `${s.r}deg` } as CSSProperties}>
                <path d={s.path} fill={tk.colors.foil} fillOpacity="0.35" stroke={tk.colors.foil} strokeWidth="0.8" />
              </svg>
            ))}
            {CONFETTI.map((c, i) => (
              <span key={`c${i}`} className="inv-confetti" style={{ background: tones[c.tone], '--dx': `${c.dx}px`, '--dy': `${c.dy}px` } as CSSProperties} />
            ))}
          </div>
        )}
        <p role="status" className={isBroken ? 'inv-mazal' : 'inv-sr'} style={{ fontFamily: tk.fonts.script, color: tk.colors.foil }}>
          {isBroken ? S.mazal : ''}
        </p>
      </div>
      {isBroken ? (
        <div style={{ textAlign: 'center', marginTop: '0.4rem' }}>
          <button type="button" className="inv-btn inv-btn-ghost" onClick={() => setBroken(0)}>
            {S.glassAgain}
          </button>
        </div>
      ) : null}
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  5. « Une page par événement » : onglets, pages, bandeau itinéraire        */
/* ────────────────────────────────────────────────────────────────────────── */

/** Pictogrammes des onglets — trait fin, couleur du thème */
function TabIcon({ type }: { type?: string }) {
  const common = { width: 30, height: 30, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (type) {
    case 'mairie':
      return (
        <svg {...common}>
          <path d="M4 12 16 5l12 7z" />
          <path d="M7 13v10M12 13v10M20 13v10M25 13v10M16 13v10" />
          <path d="M5 24h22M3 27h26" />
        </svg>
      );
    case 'henne':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="3.2" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={16 + Math.cos(a) * 8} cy={16 + Math.sin(a) * 8} r="2.6" />;
          })}
          <circle cx="16" cy="16" r="12.5" strokeDasharray="1 2.6" />
        </svg>
      );
    case 'chabbat-hatan':
      return (
        <svg {...common}>
          <path d="M10 14h4v13h-4zM18 14h4v13h-4z" />
          <path d="M12 11c-1.4-1.4-.6-3 0-4.2.6 1.2 1.4 2.8 0 4.2zM20 11c-1.4-1.4-.6-3 0-4.2.6 1.2 1.4 2.8 0 4.2z" />
          <path d="M6 27h20" />
        </svg>
      );
    case 'brunch':
      return (
        <svg {...common}>
          <path d="M7 13h15v5a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7z" />
          <path d="M22 15h1.5a3 3 0 0 1 0 6H21" />
          <path d="M12 9c-1-1.5 1-2.5 0-4M17 9c-1-1.5 1-2.5 0-4" />
        </svg>
      );
    case 'sheva-berakhot':
      return (
        <svg {...common}>
          <path d="M8 5h7l-.6 7a2.9 2.9 0 0 1-5.8 0zM11.5 15v9M8.5 26h6" />
          <path d="M17 5h7l-.6 7a2.9 2.9 0 0 1-5.8 0zM20.5 15v9M17.5 26h6" />
        </svg>
      );
    case 'pool-party':
      return (
        <svg {...common}>
          <path d="M4 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2M4 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2M4 26c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2" />
        </svg>
      );
    case 'rsvp':
      return (
        <svg {...common}>
          <path d="M8 4h11l5 5v19H8z" />
          <path d="M19 4v5h5M12 14h8M12 18h8M12 22h5" />
        </svg>
      );
    case 'houppa':
      return (
        <svg {...common}>
          <path d="M4 9c4-3 20-3 24 0" />
          <path d="M4 9c3 3 6 3 8 1.5 2 1.5 6 1.5 8 0 2 1.5 5 1.5 8-1.5" />
          <path d="M6 10v17M26 10v17M3 27h26" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M16 5l2.4 8.6L27 16l-8.6 2.4L16 27l-2.4-8.6L5 16l8.6-2.4z" />
        </svg>
      );
  }
}

/** Numéro WhatsApp international (chiffres seuls) ; un 06… français devient 336… */
function whatsappNumber(raw: string): string {
  let n = raw.replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (/^0\d{9}$/.test(n)) n = `33${n.slice(1)}`;
  return n.replace(/\D/g, '');
}

function usableContacts(site: WeddingSite): GuestContact[] {
  return (site.content?.contacts ?? []).filter((c) => c.name.trim() && whatsappNumber(c.phone).length >= 8);
}

/** Bandeau pleine largeur en bas de la carte : Waze · Plans · Google Maps */
function ItineraryBand({ S, place, googleMapsUrl, wazeUrl }: { S: Strings; place: string; googleMapsUrl?: string; wazeUrl?: string }) {
  const links = directionsLinks(place, googleMapsUrl, wazeUrl);
  const q = place.replace(/\s*\n\s*/g, ', ').trim();
  const apple = q ? `https://maps.apple.com/?q=${encodeURIComponent(q)}` : undefined;
  if (!links.google && !links.waze && !apple) return null;
  const placeName = place.split(/\n|,/)[0]?.trim();
  const items = [
    { href: links.waze, label: 'Waze' },
    { href: apple, label: S.plans },
    { href: links.google, label: 'Google Maps' },
  ].filter((i): i is { href: string; label: string } => !!i.href);
  return (
    <div className="inv-band">
      <p className="inv-band-title">
        <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.3" />
        </svg>
        {placeName ? `${S.directions} · ${placeName}` : S.directions}
      </p>
      <div className="inv-band-links" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((i) => (
          <a key={i.label} href={i.href} target="_blank" rel="noopener noreferrer" className="inv-band-btn">
            {i.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/** Page d'un événement : monogramme, prénoms, date (+ hébraïque), heure, lieu, itinéraire, agenda */
function EventPage({ ev, site, tk, S, main }: { ev: InvEvent; site: WeddingSite; tk: InvitationTokens; S: Strings; main: boolean }) {
  const bride = realName(site.brideName);
  const groom = realName(site.groomName);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(ev.date?.trim() ?? '') ? ev.date!.trim() : '';
  const date = prettyDate(ev.date);
  const hebDate = iso ? hebrewDateFromIso(iso)?.fr ?? '' : '';
  const time = prettyTime(ev.time);
  const place = ev.place?.trim() ?? '';
  const [placeName, ...placeRest] = place.split('\n');
  const couple = [bride, groom].filter(Boolean).join(' & ');
  const calInput = {
    title: couple ? `${ev.label} — ${couple}` : ev.label,
    date: ev.date,
    time: ev.time,
    place,
    description: [couple ? `${S.weddingOf} ${couple}` : '', ev.description?.trim()].filter(Boolean).join('\n'),
  };
  const slot = tk.effects.calendar ? calendarSlot(calInput, weddingYear(site.date)) : null;
  const uid = `${site.slug || 'mariage'}-${ev.id}`.replace(/[^a-zA-Z0-9-]/g, '');
  const nameStyle: CSSProperties = { fontFamily: tk.fonts.script, fontSize: `calc(${tk.sizes.names} * 0.85)`, fontWeight: 400, lineHeight: 1.1, color: tk.colors.ink, overflowWrap: 'anywhere' };
  const heBride = main ? site.content?.brideNameHe?.trim() : '';
  const heGroom = main ? site.content?.groomNameHe?.trim() : '';

  return (
    <Card tk={tk} className="inv-page-card" label={ev.label}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Monogram site={site} tk={tk} />
        <p className="inv-page-kicker" style={{ fontFamily: tk.fonts.label, color: tk.colors.ink }}>{ev.label}</p>
        {bride || groom ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0.6rem 0 0', maxWidth: '100%' }}>
            {bride ? <span style={nameStyle}>{bride}</span> : null}
            {heBride ? <HebrewName tk={tk} name={heBride} /> : null}
            {bride && groom ? <span style={{ fontFamily: tk.fonts.script, fontSize: `calc(${tk.sizes.names} * 0.5)`, color: tk.colors.foil, lineHeight: 1 }}>&amp;</span> : null}
            {groom ? <span style={nameStyle}>{groom}</span> : null}
            {heGroom ? <HebrewName tk={tk} name={heGroom} /> : null}
          </div>
        ) : null}
        {ev.description?.trim() ? (
          <p style={{ margin: '0.8rem 0 0', fontFamily: tk.fonts.body, fontStyle: 'italic', fontSize: '1.08rem', lineHeight: 1.6, color: tk.colors.ink, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{ev.description.trim()}</p>
        ) : null}
        <div style={{ margin: '1.2rem 0 1rem', width: '100%' }}>
          <Flourish color={tk.colors.foil} width={140} />
        </div>
        {date ? (
          <p style={{ margin: 0, fontFamily: tk.fonts.body, fontSize: 'clamp(1.35rem, 7cqw, 1.8rem)', lineHeight: 1.25, color: tk.colors.ink, overflowWrap: 'anywhere' }}>
            {date.charAt(0).toUpperCase() + date.slice(1)}
          </p>
        ) : null}
        {hebDate ? (
          <p style={{ margin: '0.35rem 0 0', fontFamily: tk.fonts.label, fontSize: '0.78rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: tk.colors.muted, paddingInlineStart: '0.3em' }}>{hebDate}</p>
        ) : null}
        <p style={{ margin: '0.4rem 0 0', fontFamily: tk.fonts.body, fontSize: 'clamp(1.3rem, 6.5cqw, 1.7rem)', color: tk.colors.ink }}>
          {time ? `${S.at} ${time}` : <span style={{ fontStyle: 'italic', fontSize: '1rem', color: tk.colors.muted }}>{S.timeTbc}</span>}
        </p>
        {placeName ? (
          <p style={{ margin: '1rem 0 0', fontFamily: tk.fonts.body, fontStyle: 'italic', fontSize: '1.2rem', color: tk.colors.ink, overflowWrap: 'anywhere' }}>{placeName}</p>
        ) : null}
        {placeRest.length ? (
          <p style={{ margin: '0.2rem 0 0', fontFamily: tk.fonts.body, fontSize: '0.98rem', lineHeight: 1.5, color: tk.colors.muted, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{placeRest.join('\n')}</p>
        ) : null}
        {slot ? (
          <div className="inv-actions">
            <details className="inv-cal">
              <summary className="inv-btn inv-btn-ghost">
                <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
                  <path d="M8 3.5v4M16 3.5v4M4 10h16M12 13v4M10 15h4" />
                </svg>
                {S.addToCalendar}
              </summary>
              <div className="inv-cal-menu">
                <button type="button" className="inv-btn inv-btn-ghost" onClick={() => downloadIcs(calInput, slot, uid)}>
                  {S.ics}
                </button>
                <a className="inv-btn inv-btn-ghost" href={googleCalendarUrl(calInput, slot)} target="_blank" rel="noopener noreferrer">
                  {S.google}
                </a>
              </div>
            </details>
          </div>
        ) : null}
      </div>
      {place ? <ItineraryBand S={S} place={place} googleMapsUrl={ev.googleMapsUrl} wazeUrl={ev.wazeUrl} /> : null}
    </Card>
  );
}

/** Contacts des mariés : boutons WhatsApp et numéros cliquables */
function ContactsCard({ tk, S, contacts }: { tk: InvitationTokens; S: Strings; contacts: GuestContact[] }) {
  return (
    <Card tk={tk} label={S.questions} style={{ textAlign: 'center', padding: '1.8rem 1.4rem' }}>
      <p style={{ margin: '0 0 0.8rem', fontFamily: tk.fonts.body, fontStyle: 'italic', fontSize: '1.05rem', color: tk.colors.muted }}>{S.questions}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contacts.map((c) => (
          <div key={c.id}>
            <p style={{ margin: '0 0 0.4rem', fontFamily: tk.fonts.body, fontSize: '1.05rem', color: tk.colors.ink }}>
              {c.name.trim()} · <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} style={{ color: 'inherit' }}>{c.phone.trim()}</a>
            </p>
            <a className="inv-btn inv-btn-solid inv-wa" href={`https://wa.me/${whatsappNumber(c.phone)}`} target="_blank" rel="noopener noreferrer">
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z" />
              </svg>
              {S.whatsapp} {c.name.trim()}
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Bouton rond ♫ toujours visible en haut à gauche (pages) — lecture au 1er geste */
function MusicFab({ url, tk, S }: { url?: string; tk: InvitationTokens; S: Strings }) {
  const { hasMusic, playing, toggle, requestPlay } = useMusicPlayer(url);
  useEffect(() => {
    if (!hasMusic || playing) return;
    const start = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('[data-music-toggle]')) return;
      requestPlay();
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('keydown', start);
    window.addEventListener('scroll', start, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('scroll', start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMusic, playing, url]);
  if (!hasMusic) return null;
  // Ancre sticky de hauteur nulle : reste en haut de l'écran sans `position: fixed`
  // (qui se décroche sous un ancêtre transformé, comme l'aperçu iPhone du builder).
  return (
    <div className="inv-fab-anchor">
      <button type="button" data-music-toggle className="inv-fab" onClick={toggle} aria-label={playing ? S.musicOff : S.musicOn} title={playing ? S.musicOff : S.musicOn} style={{ color: tk.colors.foil }}>
        {playing ? (
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.2" height="14" rx="1" /><rect x="13.8" y="5" width="3.2" height="14" rx="1" /></svg>
        ) : (
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
        )}
      </button>
    </div>
  );
}

type PageTab = { id: string; label: string; type?: string };

/** L'événement principal (Houppa, sinon le dernier) porte le faire-part complet */
function mainEventId(events: InvEvent[]): string | undefined {
  return (events.find((e) => e.type === 'houppa') ?? events[events.length - 1])?.id;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Template                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function InvitationTemplate({ site }: WeddingTemplateProps) {
  const tk = invitationTokens(site.theme);
  const L = sectionLabels(site.language);
  const S = STRINGS[site.language] ?? STRINGS.fr;
  const dir = site.language === 'he' ? 'rtl' : 'ltr';
  const rootRef = useReveal(tk.effects.reveal);

  const bride = realName(site.brideName);
  const groom = realName(site.groomName);
  const events = site.sections.program ? programEvents(site, S) : [];
  const columns = getFamilyColumns(site);
  const familyText = site.content?.texts?.familyText?.trim();
  const memorialText = site.content?.texts?.memorialText?.trim();

  const venue = site.content?.venue;
  const mainPlace = [venue?.name || site.venue, venue?.address || site.city].map((s) => s?.trim()).filter(Boolean).join(', ');
  const mainDirections = directionsLinks(mainPlace, venue?.googleMapsUrl, venue?.wazeUrl).google;
  const showBar = tk.effects.bottomBar && (site.sections.rsvp || !!mainDirections);

  // Programme et réponse sont rendus ici, en cartes ; le reste est délégué
  const delegated: WeddingSite = { ...site, sections: { ...site.sections, program: false, rsvp: false } };
  const surface = () => ({
    background: tk.colors.card,
    border: `1px solid ${tk.colors.hairline}`,
    borderRadius: tk.radius,
    boxShadow: `0 18px 40px -28px ${tk.colors.shadow}`,
    padding: '1.8rem 1.4rem',
  });

  const discover = () => {
    const target = rootRef.current?.querySelector<HTMLElement>('#inv-faire-part');
    target?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  // ── Mode « une page par événement » ──
  const contacts = usableContacts(site);
  const pageEvents = tk.effects.pages ? programEvents(site, S) : [];
  const mainId = mainEventId(pageEvents);
  const tabs: PageTab[] = pageEvents.map((e) => ({ id: e.id, label: e.label, type: e.type }));
  if (tk.effects.pages && (site.sections.rsvp || contacts.length)) tabs.push({ id: 'rsvp', label: S.replies, type: 'rsvp' });
  const pagesMode = tk.effects.pages && tabs.length > 0;
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab! : mainId ?? tabs[0]?.id;
  const selectTab = (id: string) => {
    setActiveTab(id);
    rootRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  // Le faire-part : familles, phrases, texte principal
  const fairePart = (
    <div id="inv-faire-part" style={{ scrollMarginTop: 80 }}>
      {columns.length || hasInvitationTexts(site) || familyText || memorialText || site.mainText?.trim() ? (
        <Card tk={tk} label={L.families}>
          {columns.length ? (
            <FamilyColumnsRow
              columns={columns}
              accent={tk.colors.foil}
              textColor={tk.colors.ink}
              titleFontFamily={tk.fonts.script}
              bodyFontFamily={tk.fonts.body}
              titleVariant="script"
              lineSize="1rem"
              hideTitles
            />
          ) : null}
          {familyText ? <p className="inv-para">{familyText}</p> : null}
          {hasInvitationTexts(site) ? (
            <div style={{ marginTop: columns.length || familyText ? '1.4rem' : 0 }}>
              <InvitationTextsBlock site={site} textColor={tk.colors.ink} mutedColor={tk.colors.muted} accent={tk.colors.ink} bodyFontFamily={tk.fonts.body} size="1.08rem" />
            </div>
          ) : null}
          {site.mainText?.trim() ? <p className="inv-para">{site.mainText.trim()}</p> : null}
          {memorialText ? <p className="inv-para" style={{ fontStyle: 'italic', color: tk.colors.muted }}>{memorialText}</p> : null}
        </Card>
      ) : null}
    </div>
  );

  const glass = tk.effects.glass ? <GlassCard tk={tk} S={S} /> : null;
  const signature =
    bride && groom ? (
      <div className="inv-reveal" style={{ textAlign: 'center', padding: '2.2rem 0 1.5rem', containerType: 'inline-size' }}>
        <Flourish color={tk.colors.foil} width={120} />
        <p style={{ margin: '0.8rem 0 0', fontFamily: tk.fonts.script, fontSize: 'clamp(2rem, 11cqw, 3rem)', lineHeight: 1.15, color: tk.colors.ink, overflowWrap: 'anywhere' }}>
          {bride} <span style={{ color: tk.colors.foil }}>&amp;</span> {groom}
        </p>
      </div>
    ) : null;

  const cssVars = {
    '--inv-foil': tk.colors.foil,
    '--inv-ink': tk.colors.ink,
    '--inv-muted': tk.colors.muted,
    '--inv-paper': tk.colors.paper,
    '--inv-card': tk.colors.card,
    '--inv-hair': tk.colors.hairline,
    '--inv-shadow': tk.colors.shadow,
    '--inv-btn': tk.colors.button,
    '--inv-on-btn': tk.colors.onButton,
    '--inv-radius': `${tk.radius}px`,
    '--inv-label': tk.fonts.label,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      id="top"
      dir={dir}
      lang={site.language}
      className="wedding-template-root inv-root"
      style={{
        ...cssVars,
        fontFamily: tk.fonts.body,
        color: tk.colors.ink,
        minHeight: '100vh',
        background: `radial-gradient(120% 55% at 50% 0%, ${tk.colors.card} 0%, ${tk.colors.paper} 62%)`,
        backgroundColor: tk.colors.paper,
        textAlign: site.language === 'he' ? 'right' : 'left',
      }}
    >
      <style>{INVITATION_CSS}</style>
      {pagesMode ? <MusicFab url={site.content?.musicUrl} tk={tk} S={S} /> : <PublicStickyNav site={site} />}
      {/* ♫ Musique choisie dans l'étape Musique — lecture au 1er geste */}
      <HiddenAutoMusic url={site.content?.musicUrl} />
      {tk.effects.bsd ? <Bsd tk={tk} /> : null}

      {pagesMode ? (
        <>
          <div key={currentTab} className="inv-stack inv-page">
            {currentTab === 'rsvp' ? (
              <>
                <div className="inv-rise" style={{ textAlign: 'center', margin: '0.8rem 0 1.4rem' }}>
                  <Monogram site={site} tk={tk} />
                  <ScriptTitle tk={tk}>{S.rsvpTitle}</ScriptTitle>
                </div>
                {contacts.length ? <ContactsCard tk={tk} S={S} contacts={contacts} /> : null}
                {site.sections.rsvp ? (
                  <div id="rsvp" className="inv-rsvp-embed">
                    <WeddingRSVPForm site={site} form={site.rsvpForm ?? createDefaultRSVPForm(site.id)} slugHint={site.slug} embedded />
                  </div>
                ) : null}
              </>
            ) : (
              pageEvents
                .filter((ev) => ev.id === currentTab)
                .map((ev) =>
                  ev.id === mainId ? (
                    <div key={ev.id}>
                      {site.sections.hero ? <HeroCard site={site} tk={tk} S={S} onDiscover={discover} /> : null}
                      {fairePart}
                      {site.date ? <FlipCountdown tk={tk} iso={site.date} S={S} title={L.countdownTitle} /> : null}
                      <EventPage ev={ev} site={site} tk={tk} S={S} main />
                      {glass}
                      {/* Infos d'accès, hébergements, FAQ, galerie… */}
                      <div className="inv-delegated">{renderOptionalSections(delegated, surface as never)}</div>
                      {signature}
                    </div>
                  ) : (
                    <EventPage key={ev.id} ev={ev} site={site} tk={tk} S={S} main={false} />
                  ),
                )
            )}
          </div>

          {tabs.length > 1 ? (
            <nav className="inv-tabs" aria-label={S.pagesNav}>
              <div className="inv-tabs-inner" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="inv-tab"
                    aria-current={t.id === currentTab ? 'page' : undefined}
                    onClick={() => selectTab(t.id)}
                  >
                    <TabIcon type={t.type} />
                    <span className="inv-tab-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          ) : null}
        </>
      ) : (
      <div className="inv-stack">
        {site.sections.hero ? <HeroCard site={site} tk={tk} S={S} onDiscover={discover} /> : null}

        {fairePart}

        {site.date ? <FlipCountdown tk={tk} iso={site.date} S={S} title={L.countdownTitle} /> : null}

        {events.length ? (
          <div id="program" style={{ scrollMarginTop: 80 }}>
            <div className="inv-reveal" style={{ textAlign: 'center', margin: '0.6rem 0 1.1rem' }}>
              <p style={{ margin: 0, fontFamily: tk.fonts.label, fontSize: '0.72rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: tk.colors.muted }}>{L.program}</p>
            </div>
            {events.map((ev, i) => (
              <EventCard key={ev.id} ev={ev} site={site} tk={tk} S={S} index={i} />
            ))}
          </div>
        ) : null}

        {site.sections.rsvp ? (
          <Card tk={tk} id="rsvp" label={S.rsvpTitle} style={{ textAlign: 'center' }}>
            <ScriptTitle tk={tk}>{S.rsvpTitle}</ScriptTitle>
            {site.rsvpForm?.introText?.trim() ? (
              <p style={{ margin: '0 auto 1.2rem', maxWidth: 380, fontFamily: tk.fonts.body, fontSize: '1.05rem', lineHeight: 1.65, color: tk.colors.ink, whiteSpace: 'pre-wrap' }}>{site.rsvpForm.introText.trim()}</p>
            ) : null}
            <Link to={`/wedding/${site.slug}/rsvp`} className="inv-btn inv-btn-solid">
              {L.rsvpCta}
            </Link>
          </Card>
        ) : null}

        {glass}

        {/* Lieu, hébergements, FAQ, galerie, liste de mariage… */}
        <div className="inv-delegated">{renderOptionalSections(delegated, surface as never)}</div>

        {signature}
      </div>
      )}

      {showBar && !pagesMode ? (
        <nav className="inv-bar" aria-label={S.reply}>
          <div className="inv-bar-inner">
            {site.sections.rsvp ? (
              <Link to={`/wedding/${site.slug}/rsvp`} className="inv-btn inv-btn-solid">
                {S.reply}
              </Link>
            ) : null}
            {mainDirections ? (
              <a href={mainDirections} target="_blank" rel="noopener noreferrer" className="inv-btn inv-btn-paper">
                {S.directions}
              </a>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

export default InvitationTemplate;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Styles (préfixe .inv-)                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const INVITATION_CSS = `
.inv-root { overflow-x: clip; }
.inv-stack { width: min(520px, calc(100% - 32px)); margin: 0 auto; padding: 1.4rem 0 2rem; }
.inv-card {
  position: relative; overflow: hidden; container-type: inline-size;
  background: var(--inv-card); border: 1px solid var(--inv-hair);
  outline: 1px solid var(--inv-hair); outline-offset: -9px;
  box-shadow: 0 22px 48px -30px var(--inv-shadow);
  padding: 2.4rem 1.6rem; margin: 0 0 1.25rem;
}
.inv-hero { padding: 2.6rem 1.4rem 1.8rem; min-height: 560px; display: flex; flex-direction: column; justify-content: center; }
.inv-kicker { margin: 0 0 0.8rem; font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; max-width: 100%; overflow-wrap: anywhere; }
.inv-para { margin: 1.1rem 0 0; text-align: center; font-size: 1.05rem; line-height: 1.85; white-space: pre-wrap; overflow-wrap: anywhere; }
.inv-para:first-child { margin-top: 0; }
.inv-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; margin: -1px; padding: 0; border: 0; }
.inv-delegated > section:first-child { margin-top: 0.6rem !important; }

/* Boutons */
.inv-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 1.2rem; }
.inv-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 42px; padding: 0.55rem 1.05rem; border-radius: 999px;
  border: 1px solid var(--inv-foil); color: var(--inv-ink); background: transparent;
  font-family: var(--inv-label); font-size: 0.82rem; letter-spacing: 0.06em; text-decoration: none;
  cursor: pointer; transition: background-color .2s, color .2s, transform .2s; list-style: none;
}
.inv-btn::-webkit-details-marker { display: none; }
.inv-btn:hover { background: color-mix(in srgb, var(--inv-foil) 12%, transparent); }
.inv-btn-ghost { border-color: var(--inv-hair); }
.inv-btn-solid { background: var(--inv-btn); border-color: var(--inv-btn); color: var(--inv-on-btn); padding-inline: 1.6rem; font-size: 0.9rem; letter-spacing: 0.1em; }
.inv-btn-solid:hover { background: var(--inv-btn); transform: translateY(-1px); }
.inv-btn-paper { background: var(--inv-card); }
.inv-root a:focus-visible, .inv-root button:focus-visible, .inv-root summary:focus-visible {
  outline: 2px solid var(--inv-foil); outline-offset: 3px;
}
.inv-cal { position: relative; }
.inv-cal[open] > summary { background: color-mix(in srgb, var(--inv-foil) 12%, transparent); }
.inv-cal-menu { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; animation: inv-rise .25s ease both; }

/* Entrées échelonnées de la carte d'en-tête */
@keyframes inv-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.inv-rise { animation: inv-rise .9s cubic-bezier(.2,.7,.2,1) both; }
@keyframes inv-draw { from { stroke-dashoffset: 120; } to { stroke-dashoffset: 0; } }
.inv-draw { stroke-dasharray: 120; animation: inv-draw 1.6s ease .6s both; }

/* Apparition au défilement (armée par le script uniquement) */
.inv-reveal { transition: opacity .8s ease, transform .8s cubic-bezier(.2,.7,.2,1); }
.inv-root[data-reveal="on"] .inv-reveal:not(.is-in) { opacity: 0; transform: translateY(22px); }

/* Indice « Découvrir » */
.inv-cue {
  margin-top: 1.8rem; display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
  background: none; border: none; cursor: pointer; padding: 6px 10px;
  font-size: 0.68rem; letter-spacing: 0.26em; text-transform: uppercase;
}
.inv-cue svg { animation: inv-bob 2.4s ease-in-out infinite; }
@keyframes inv-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }

/* Pétales */
.inv-petals { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.inv-petal-col { position: absolute; top: 0; bottom: 0; width: 20px; animation: inv-fall linear infinite; }
.inv-petal { display: block; animation: inv-sway ease-in-out infinite alternate; }
@keyframes inv-fall {
  0% { transform: translateY(-12%); opacity: 0; }
  8% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}
@keyframes inv-sway {
  from { transform: translateX(calc(var(--inv-drift) * -1)) rotate(-25deg); }
  to { transform: translateX(var(--inv-drift)) rotate(35deg); }
}

/* Compte à rebours */
.inv-flipbox {
  border: 1px solid; padding: 0.7rem 0 0.6rem; perspective: 300px; overflow: hidden;
  box-shadow: inset 0 -14px 18px -16px var(--inv-shadow);
}
.inv-flip {
  display: inline-block; font-size: clamp(1.5rem, 8cqw, 2.3rem); line-height: 1; font-variant-numeric: tabular-nums;
  transform-origin: 50% 0; animation: inv-flip .45s cubic-bezier(.3,.7,.3,1) both;
}
@keyframes inv-flip { from { transform: rotateX(80deg); opacity: .25; } to { transform: none; opacity: 1; } }

/* Cassez le verre */
.inv-glass-stage { position: relative; height: 150px; display: grid; place-items: center; }
.inv-glass-btn {
  background: none; border: none; padding: 10px 18px; cursor: pointer; border-radius: 16px;
  animation: inv-wobble 3.2s ease-in-out infinite; transform-origin: 50% 90%;
}
.inv-glass-btn:hover { animation-play-state: paused; }
@keyframes inv-wobble { 0%, 86%, 100% { transform: rotate(0); } 90% { transform: rotate(-5deg); } 94% { transform: rotate(4deg); } 97% { transform: rotate(-2deg); } }
.inv-burst { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.inv-burst > * { grid-area: 1 / 1; }
.inv-shard { animation: inv-shard 1.1s cubic-bezier(.15,.7,.3,1) both; }
@keyframes inv-shard { from { transform: none; opacity: 1; } to { transform: translate(var(--dx), var(--dy)) rotate(var(--r)); opacity: 0; } }
.inv-confetti { width: 7px; height: 7px; border-radius: 50%; animation: inv-confetti 1.3s cubic-bezier(.1,.7,.3,1) .1s both; }
@keyframes inv-confetti { from { transform: none; opacity: 1; } to { transform: translate(var(--dx), var(--dy)) scale(.5); opacity: 0; } }
.inv-mazal {
  position: relative; margin: 0; font-size: clamp(2.2rem, 13cqw, 3.2rem); line-height: 1.1; text-align: center;
  animation: inv-pop .7s cubic-bezier(.2,1.4,.4,1) .15s both;
}
@keyframes inv-pop { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }

/* Barre Répondre · Itinéraire */
.inv-bar { position: sticky; bottom: 0; z-index: 30; padding: 0 16px calc(12px + env(safe-area-inset-bottom, 0px)); pointer-events: none; }
.inv-bar-inner {
  pointer-events: auto; width: min(520px, 100%); margin: 0 auto; display: flex; gap: 8px; padding: 8px;
  border-radius: 999px; background: var(--inv-card); background: color-mix(in srgb, var(--inv-card) 88%, transparent);
  border: 1px solid var(--inv-hair); box-shadow: 0 12px 30px -16px var(--inv-shadow);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.inv-bar-inner > * { flex: 1; }

/* ── Une page par événement ── */
.inv-page { padding-bottom: 1rem; animation: inv-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.inv-page-card { padding-bottom: 0; }
.inv-page-kicker { margin: 0.2rem 0 0; font-size: clamp(1.05rem, 6cqw, 1.5rem); letter-spacing: 0.3em; text-transform: uppercase; padding-inline-start: 0.3em; overflow-wrap: anywhere; }
.inv-band { margin: 1.6rem -1.6rem 0; padding: 1rem 1rem 1.15rem; background: var(--inv-btn); color: var(--inv-on-btn); text-align: center; }
.inv-band-title {
  margin: 0 0 0.8rem; display: flex; align-items: center; justify-content: center; gap: 8px;
  font-family: var(--inv-label); font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase; overflow-wrap: anywhere;
}
.inv-band-links { display: grid; gap: 8px; }
.inv-band-btn {
  display: flex; align-items: center; justify-content: center; min-height: 42px; padding: 0.4rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--inv-on-btn) 70%, transparent); border-radius: 999px;
  color: inherit; text-decoration: none; font-family: var(--inv-label); font-size: 0.86rem; letter-spacing: 0.06em;
  transition: background-color .2s;
}
.inv-band-btn:hover { background: color-mix(in srgb, var(--inv-on-btn) 14%, transparent); }
.inv-wa { width: 100%; }
.inv-rsvp-embed { margin-bottom: 1.25rem; }

/* Bouton musique rond (ancre sticky de hauteur nulle) */
.inv-fab-anchor { position: sticky; top: 12px; z-index: 40; height: 0; }
.inv-fab {
  position: absolute; top: 0; inset-inline-start: 14px; width: 46px; height: 46px; border-radius: 50%;
  display: grid; place-items: center; cursor: pointer; padding: 0;
  background: var(--inv-card); border: 1.5px solid var(--inv-foil);
  box-shadow: 0 8px 20px -10px var(--inv-shadow);
}

/* Onglets en bas */
.inv-tabs { position: sticky; bottom: 0; z-index: 30; padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)); background: var(--inv-paper); border-top: 1px solid var(--inv-hair); }
.inv-tabs-inner { width: min(520px, 100%); margin: 0 auto; display: grid; gap: 6px; }
.inv-tab {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 64px; padding: 6px 4px;
  background: color-mix(in srgb, var(--inv-foil) 7%, var(--inv-paper)); border: 1px solid var(--inv-hair); border-radius: 6px;
  color: var(--inv-foil); cursor: pointer; transition: background-color .2s, border-color .2s;
}
.inv-tab[aria-current="page"] { background: var(--inv-card); border-color: var(--inv-foil); box-shadow: 0 6px 16px -12px var(--inv-shadow); }
.inv-tab-label {
  font-family: var(--inv-label); font-size: 0.8rem; line-height: 1.15; color: var(--inv-muted); max-width: 100%;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere;
}
.inv-tab[aria-current="page"] .inv-tab-label { color: var(--inv-ink); }

/* Réduction des animations : contenu immédiat, rien ne bouge */
@media (prefers-reduced-motion: reduce) {
  .inv-root *, .inv-root *::before, .inv-root *::after { animation: none !important; transition: none !important; }
  .inv-petals, .inv-burst { display: none !important; }
  .inv-draw { stroke-dasharray: none; }
}
`;
