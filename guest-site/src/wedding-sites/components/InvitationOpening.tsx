/**
 * Ouverture du modèle « Invitation animée ».
 *
 * 1. Une carte de visite au nom de l'invité (lien ?pour=) ou des mariés,
 *    posée sur une grande fleur ivoire : « Touchez pour ouvrir ».
 * 2. Au toucher, la carte se retourne : c'est le dos d'une enveloppe scellée.
 *    Le sceau s'efface, le rabat s'ouvre, la carte des mariés sort.
 * 3. L'enveloppe s'efface ; écran d'accueil : monogramme doré, « Mariage »,
 *    prénoms, date, compte à rebours et « Voir l'invitation ».
 *
 * CSS 3D + SVG, aucune dépendance. Toutes les tailles dérivent de la boîte
 * (container-type: size → cqw/cqh), jamais de vw/vh : même rendu en plein
 * écran et dans l'aperçu iPhone mis à l'échelle. Échap passe l'ouverture ;
 * `prefers-reduced-motion` saute les mouvements (carte → accueil directement).
 */
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { WeddingSite } from '../types';
import { eventLabel, inviteOneText, isWeddingEvent } from '../utils/eventType';
import { invitationTokens, shade } from '../themes/InvitationTheme';
import {
  coupleNames,
  Countdown,
  GoldMonogram,
  initialsOf,
  INVITATION_PARTS_CSS,
  IvoryBloom,
  prefersReducedMotion,
  TefillinArt,
} from '../templates/invitationParts';

type Stage = 'cover' | 'turn' | 'open' | 'leave' | 'intro' | 'exit';
const ORDER: Stage[] = ['cover', 'turn', 'open', 'leave', 'intro', 'exit'];

/** Enchaînement après le toucher (ms) : retournement → ouverture → l'enveloppe s'efface → accueil */
const TIMELINE: { stage: Stage; at: number }[] = [
  { stage: 'turn', at: 0 },
  { stage: 'open', at: 950 },
  { stage: 'leave', at: 3000 },
  { stage: 'intro', at: 3600 },
];
const EXIT_MS = 900;

const STRINGS = {
  fr: {
    tap: 'Touchez pour ouvrir votre invitation',
    open: "Ouvrir l'invitation",
    wedding: 'Mariage',
    inviteTwo: 'vous invitent à célébrer leur mariage',
    inviteOne: 'vous invite à célébrer son mariage',
    datePrefix: 'le',
    see: "Voir l'invitation",
    units: ['Jours', 'Heures', 'Minutes', 'Secondes'],
    done: "C'est le grand jour !",
    fallbackName: 'Votre invitation',
    dialog: 'Invitation',
  },
  he: {
    tap: 'געו כדי לפתוח את ההזמנה',
    open: 'לפתוח את ההזמנה',
    wedding: 'חתונה',
    inviteTwo: 'מתכבדים להזמינכם לחגוג את חתונתם',
    inviteOne: 'מתכבד/ת להזמינכם לחגוג את החתונה',
    datePrefix: '',
    see: 'לצפייה בהזמנה',
    units: ['ימים', 'שעות', 'דקות', 'שניות'],
    done: '!היום הגדול הגיע',
    fallbackName: 'ההזמנה שלכם',
    dialog: 'הזמנה',
  },
  en: {
    tap: 'Tap to open your invitation',
    open: 'Open the invitation',
    wedding: 'Wedding',
    inviteTwo: 'invite you to celebrate their wedding',
    inviteOne: 'invites you to celebrate the wedding',
    datePrefix: 'on',
    see: 'View the invitation',
    units: ['Days', 'Hours', 'Minutes', 'Seconds'],
    done: 'The big day is here!',
    fallbackName: 'Your invitation',
    dialog: 'Invitation',
  },
};

/** « 26 novembre 2026 » dans la langue du site ; '' si la date est absente */
function longDate(iso: string | undefined, lang: string): string {
  const v = iso?.slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const [y, m, d] = v.split('-').map(Number);
  const locale = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-GB' : 'fr-FR';
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** « 26.11.26 » pour la carte de l'enveloppe */
function shortDate(iso?: string): string {
  const v = iso?.slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const [y, m, d] = v.split('-');
  return `${d}.${m}.${y.slice(2)}`;
}

/** Taille (en cqw de la carte) qui fait tenir `text` sur une ligne, plafonnée */
function fitScript(text: string, room: number, max: number, min: number): number {
  return Math.max(min, Math.min(max, room / (Math.max(1, text.length) * 0.46)));
}

type Props = {
  site: WeddingSite;
  /** true : occupe son parent (aperçu iPhone) au lieu de tout l'écran */
  contained?: boolean;
  /** Nom de l'invité (lien personnalisé) : écrit sur la carte à la place des prénoms */
  guestName?: string | null;
  onDone: () => void;
};

export function InvitationOpening({ site, contained = false, guestName, onDone }: Props) {
  const tk = invitationTokens(site.theme);
  const base = STRINGS[site.language] ?? STRINGS.fr;
  // Bar/Bat Mitsva, Brit Mila : kicker et phrase d'accueil de l'événement
  const S = isWeddingEvent(site.eventType)
    ? base
    : { ...base, wedding: eventLabel(site.eventType, site.language), inviteOne: inviteOneText(site.eventType, site.language) };
  const dir = site.language === 'he' ? 'rtl' : 'ltr';
  const [stage, setStage] = useState<Stage>('cover');
  const timers = useRef<number[]>([]);
  const seeRef = useRef<HTMLButtonElement>(null);

  const names = coupleNames(site);
  const couple = names.join(' & ');
  const guest = guestName?.trim() || '';
  const coverName = guest || couple || S.fallbackName;
  const coverSize = fitScript(coverName, 66, 9.5, 4.6);
  const initials = initialsOf(site);
  const dateLong = longDate(site.date, site.language);
  const dateShort = shortDate(site.date);

  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Pas de mise au point automatique sur la carte (elle dessinerait un contour
  // chez tous les invités) : au clavier, c'est le premier élément atteint par Tab,
  // le site derrière étant inerte.
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (stage === 'intro') seeRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const finish = () => {
    if (stage === 'exit') return;
    if (prefersReducedMotion()) {
      onDone();
      return;
    }
    setStage('exit');
    after(EXIT_MS, onDone);
  };

  const openCard = () => {
    if (stage !== 'cover') return;
    if (prefersReducedMotion()) {
      setStage('intro');
      return;
    }
    TIMELINE.forEach(({ stage: s, at }) => after(at, () => setStage(s)));
  };

  const reached = (s: Stage) => ORDER.indexOf(stage) >= ORDER.indexOf(s);
  const turned = reached('turn');
  const opened = reached('open');
  const leaving = reached('leave');
  const showIntro = stage === 'intro' || stage === 'exit';

  const vars = {
    '--ia-paper': tk.colors.paper,
    '--ia-ink': tk.colors.ink,
    '--ia-foil': tk.colors.foil,
    '--ia-hair': tk.colors.hairline,
    '--ia-shadow': tk.colors.shadow,
    '--ia-inside': shade(tk.colors.paper, -0.05),
    '--ia-flap-in': shade(tk.colors.paper, -0.08),
    '--ia-wax-hi': tk.colors.goldHi,
    '--ia-wax': tk.colors.foil,
    '--ia-wax-lo': tk.colors.goldLo,
    '--ia-btn': tk.colors.button,
    '--ia-btn-ink': tk.colors.buttonInk,
    '--ia-cover': tk.colors.coverCard,
    '--ia-card': tk.colors.cardPaper,
    '--ia-env-hi': tk.colors.envelopeHi,
    '--ia-env-lo': tk.colors.envelopeLo,
    '--ia-cell': tk.dark ? 'transparent' : 'rgba(255,255,255,0.82)',
  } as CSSProperties;

  // Entrées échelonnées de l'écran d'accueil
  let step = 0;
  const enter = (): CSSProperties => ({ animationDelay: `${0.15 + 0.22 * step++}s` });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={S.dialog}
      dir={dir}
      lang={site.language}
      className={`io-root io-decor-${tk.decor}${contained ? ' is-contained' : ''}${stage === 'exit' ? ' is-exiting' : ''}`}
      style={{ ...vars, background: tk.colors.paper, color: tk.colors.ink, fontFamily: tk.fonts.body }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish();
      }}
    >
      <style>{OPENING_CSS + INVITATION_PARTS_CSS}</style>
      {tk.dark ? (
        <TefillinArt uid="opening" className={`io-art${showIntro ? ' is-intro' : ''}`} />
      ) : (
        <IvoryBloom tint={shade(tk.colors.paper, -0.07)} uid="opening" className={`io-bloom${showIntro ? ' is-intro' : ''}`} />
      )}

      {/* 1–2. Carte puis enveloppe */}
      <div className={`io-screen${leaving ? ' is-leaving' : ''}`} aria-hidden={showIntro || undefined}>
        <button
          type="button"
          className="io-holder"
          onClick={openCard}
          disabled={stage !== 'cover'}
          aria-label={`${S.open} — ${coverName}`}
        >
          <span className={`io-turn${turned ? ' is-turned' : ''}`}>
            {/* Recto : carte de visite */}
            <span className="io-front">
              <span className="io-frame">
                {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                  <svg key={c} aria-hidden className={`io-corner io-corner-${c}`} viewBox="0 0 24 24" fill="none" stroke={tk.colors.hairline} strokeWidth="1.1" strokeLinecap="round">
                    <path d="M3 20 C3 10 10 3 20 3" />
                    <path d="M7 20 C7 13 13 7 20 7" />
                  </svg>
                ))}
                <span
                  className="io-cover-name"
                  dir="auto"
                  style={{ fontFamily: tk.fonts.script, fontSize: `${coverSize}cqw`, color: tk.colors.ink }}
                >
                  {coverName}
                </span>
              </span>
            </span>

            {/* Verso : enveloppe scellée */}
            <span className={`io-back${opened ? ' is-open' : ''}`}>
              <span className="io-inside" />
              <span className="io-card">
                <GoldMonogram site={site} tk={tk} size="9cqw" />
                {couple ? (
                  <span className="io-card-names" style={{ fontFamily: tk.fonts.script, fontSize: `${fitScript(couple, 74, 7, 3.6)}cqw`, color: tk.colors.ink }}>
                    {couple}
                  </span>
                ) : null}
                {dateShort ? <span className="io-card-date">{dateShort}</span> : null}
              </span>
              <span className="io-pocket">
                <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0 100 L46 55 M100 100 L54 55" stroke={tk.colors.hairline} strokeWidth="0.35" vectorEffect="non-scaling-stroke" fill="none" />
                </svg>
              </span>
              <span className="io-flap">
                <span className="io-flap-front" />
                <span className="io-flap-back" />
              </span>
              <span className="io-seal">
                <span className="io-seal-wax">
                  <span className="io-seal-shine" />
                  <span style={{ fontFamily: tk.fonts.monogram }}>{initials.join('') || '♥'}</span>
                </span>
              </span>
            </span>
          </span>
        </button>
        <p className={`io-hint${turned ? ' is-hidden' : ''}`} style={{ color: tk.colors.foil }} aria-hidden>
          {S.tap}
        </p>
      </div>

      {/* 3. Écran d'accueil */}
      {showIntro ? (
        <div className="io-intro">
          {tk.dark ? null : <GoldMonogram site={site} tk={tk} size="min(19cqw, 10cqh, 120px)" className="io-in" style={enter()} />}
          <p className="io-in io-kicker" style={enter()}>
            {S.wedding}
          </p>
          {names.length ? (
            <h1 className="io-in io-names" style={{ fontFamily: tk.fonts.script, ...enter() }}>
              {names.length === 2 ? (
                <>
                  {names[0]} <span style={{ whiteSpace: 'nowrap' }}>&amp; {names[1]}</span>
                </>
              ) : (
                names[0]
              )}
            </h1>
          ) : null}
          <p className="io-in io-phrase" style={enter()}>
            {names.length === 1 ? S.inviteOne : S.inviteTwo}
          </p>
          {dateLong ? (
            <p className="io-in io-date" style={enter()}>
              {S.datePrefix ? `${S.datePrefix} ` : ''}
              {dateLong}
            </p>
          ) : null}
          {tk.effects.countdown && site.date ? (
            <Countdown iso={site.date} tk={tk} units={S.units} doneText={S.done} className="io-in io-count" style={enter()} />
          ) : null}
          <button ref={seeRef} type="button" className="io-in io-see" style={enter()} onClick={finish}>
            <svg aria-hidden width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 5h15M12 1l4 4-4 4" />
            </svg>
            {S.see}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const OPENING_CSS = `
.io-root {
  position: fixed; inset: 0; z-index: 1000; overflow: hidden;
  container-type: size; -webkit-tap-highlight-color: transparent;
  transition: opacity ${EXIT_MS}ms ease;
}
.io-root.is-contained { position: absolute; }
.io-root.is-exiting { opacity: 0; pointer-events: none; }

.io-bloom {
  position: absolute; left: 50%; top: 50%;
  width: min(112cqw, 92cqh); height: min(112cqw, 92cqh);
  transform: translate(-50%, -50%);
  opacity: 0.55; transition: opacity 1.2s ease; pointer-events: none;
}

/* ── Carte et enveloppe ─────────────────────────────────────────────── */
.io-screen {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: min(5cqh, 34px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.io-screen.is-leaving { opacity: 0; transform: scale(1.06); pointer-events: none; }
.io-holder {
  position: relative; display: block; padding: 0; border: 0; background: none; cursor: pointer;
  width: min(88cqw, 440px, 118cqh); aspect-ratio: 1.47; perspective: 1600px;
  container-type: inline-size; color: inherit; font: inherit;
}
.io-holder:disabled { cursor: default; }
.io-holder:focus-visible { outline: 2px solid var(--ia-foil); outline-offset: 8px; border-radius: 6px; }
.io-turn {
  position: absolute; inset: 0; display: block; transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.45, 0, 0.2, 1);
}
.io-turn.is-turned { transform: rotateY(180deg); }
/* Chaque face n'existe qu'une fois la carte à mi-retournement (0,45 s) :
   l'intérieur du rabat, retourné deux fois, ferait sinon face à l'écran */
.io-front { transition: visibility 0s linear 0.45s; }
.io-back { visibility: hidden; transition: visibility 0s linear 0.45s; }
.io-turn.is-turned .io-front { visibility: hidden; }
.io-turn.is-turned .io-back { visibility: visible; }
.io-front, .io-back { position: absolute; inset: 0; display: block; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.io-front {
  background: var(--ia-cover); border-radius: 4px;
  filter: drop-shadow(0 14px 20px var(--ia-shadow));
}
.io-frame {
  position: absolute; inset: 6.5%; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--ia-hair);
}
.io-corner { position: absolute; width: 7cqw; height: 7cqw; }
.io-corner-tl { left: 1.5cqw; top: 1.5cqw; }
.io-corner-tr { right: 1.5cqw; top: 1.5cqw; transform: scaleX(-1); }
.io-corner-bl { left: 1.5cqw; bottom: 1.5cqw; transform: scaleY(-1); }
.io-corner-br { right: 1.5cqw; bottom: 1.5cqw; transform: scale(-1, -1); }
.io-cover-name { display: block; padding: 0 9%; line-height: 1.25; text-align: center; overflow-wrap: anywhere; }

.io-back { transform: rotateY(180deg); transform-style: preserve-3d; }
/* En 3D, chaque élément du verso doit se cacher lui-même quand la carte montre son recto */
.io-back > span { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.io-inside { position: absolute; inset: 0; background: var(--ia-inside); border-radius: 3px; }
.io-card {
  position: absolute; left: 6%; right: 6%; top: 5%; height: 88%; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  padding-top: 5%; gap: 1.5cqw; background: var(--ia-card); border-radius: 2px;
  box-shadow: 0 4px 12px -6px var(--ia-shadow); opacity: 0;
  transition: opacity 0.4s ease 0.3s, transform 1s cubic-bezier(0.3, 0.7, 0.2, 1) 0.6s;
}
.io-back.is-open .io-card { opacity: 1; transform: translateY(-70%); }
.io-card-names { display: block; line-height: 1.2; text-align: center; padding: 0 6%; overflow-wrap: anywhere; }
.io-card-date { font-size: 3.2cqw; letter-spacing: 0.3em; color: var(--ia-foil); padding-inline-start: 0.3em; }
.io-pocket {
  position: absolute; inset: 0; z-index: 2; display: block;
  clip-path: polygon(0 0, 50% 53.6%, 100% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, var(--ia-env-hi) 0%, var(--ia-env-lo) 100%);
}
.io-pocket svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.io-flap {
  position: absolute; inset: 0; z-index: 3; display: block; transform-origin: center top;
  transform-style: preserve-3d;
  transition: transform 0.75s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s linear 0.38s;
}
.io-back.is-open .io-flap { transform: rotateX(180deg); z-index: 0; }
.io-flap-front, .io-flap-back { position: absolute; inset: 0; display: block; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.io-flap-front { clip-path: polygon(0 0, 100% 0, 50% 53.6%); background: linear-gradient(180deg, var(--ia-env-hi) 0%, var(--ia-env-lo) 100%); }
.io-flap-back { clip-path: polygon(0 100%, 100% 100%, 50% 46.4%); background: var(--ia-flap-in); transform: rotateX(180deg); }
.io-seal {
  position: absolute; left: 50%; top: 53.6%; z-index: 4; width: 17%; aspect-ratio: 1;
  transform: translate(-50%, -50%); transition: opacity 0.3s ease, transform 0.3s ease;
}
.io-back.is-open .io-seal { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
.io-seal-wax {
  position: absolute; inset: 0; display: grid; place-items: center; overflow: hidden; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--ia-wax-hi), var(--ia-wax) 55%, var(--ia-wax-lo));
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.18), inset 0 -3px 6px rgba(0,0,0,0.18), 0 3px 8px rgba(0,0,0,0.2);
  color: rgba(255,255,255,0.85); font-size: 5.2cqw; letter-spacing: -0.04em;
  text-shadow: 0 -1px 0 rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.25);
  animation: io-pulse 2.2s ease-in-out infinite;
}
.io-seal-shine {
  position: absolute; top: -20%; bottom: -20%; width: 30%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
  animation: io-seal-shine 3.2s ease-in-out infinite;
}
@keyframes io-pulse { 50% { transform: scale(1.06); } }
@keyframes io-seal-shine { 0%, 55% { transform: translateX(-180%) skewX(-20deg); } 100% { transform: translateX(420%) skewX(-20deg); } }

.io-hint {
  margin: 0; padding: 0 16px; text-align: center; text-transform: uppercase;
  font-family: 'Montserrat', 'DM Sans', sans-serif; font-weight: 500;
  font-size: min(2.7cqw, 0.72rem); letter-spacing: 0.28em;
  animation: io-breathe 2.6s ease-in-out infinite; transition: opacity 0.4s ease;
}
.io-hint.is-hidden { opacity: 0; animation: none; }
@keyframes io-breathe { 50% { opacity: 0.45; } }

/* ── Écran d'accueil ─────────────────────────────────────────────────── */
.io-intro {
  position: absolute; inset: 0; overflow-y: auto; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
  padding: max(16px, 4cqh) 16px; gap: min(1.6cqh, 12px);
  text-shadow: 0 0 10px var(--ia-paper), 0 0 3px var(--ia-paper);
}
.io-in { animation: io-in 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
@keyframes io-in { from { opacity: 0; filter: blur(4px); transform: translateY(14px); } }
.io-kicker {
  margin: min(2.4cqh, 18px) 0 0; padding-inline-start: 0.35em; text-transform: uppercase;
  font-size: min(5cqw, 2.9cqh, 1.3rem); letter-spacing: 0.35em;
}
.io-names {
  margin: 0; font-weight: 400; line-height: 1.15; max-width: 100%; overflow-wrap: anywhere;
  font-size: min(11.5cqw, 6.4cqh, 3.4rem);
}
.io-phrase { margin: 0; font-style: italic; font-size: min(4.6cqw, 2.6cqh, 1.15rem); }
.io-date { margin: 0; font-size: min(6cqw, 3.4cqh, 1.5rem); }
.io-count { margin-top: min(1.6cqh, 12px); container-type: inline-size; }
.io-see {
  margin-top: min(4cqh, 32px); display: inline-flex; align-items: center; gap: 0.7rem;
  padding: 0.95rem 1.7rem; border: 0; border-radius: 2px; cursor: pointer;
  background: var(--ia-btn); color: var(--ia-btn-ink); text-shadow: none;
  font-family: 'Montserrat', 'DM Sans', sans-serif; font-weight: 600; font-size: 0.72rem;
  letter-spacing: 0.22em; text-transform: uppercase;
  box-shadow: 0 10px 24px -12px var(--ia-shadow), inset 0 1px 0 rgba(255,255,255,0.25);
  transition: transform 0.2s ease, filter 0.2s ease;
}
.io-see:hover { filter: brightness(1.05); }
.io-see:active { transform: scale(0.98); }
.io-see:focus-visible { outline: 2px solid var(--ia-foil); outline-offset: 4px; }

/* ── Décor tefillin (Bar Mitsva) ─────────────────────────────────────── */
.io-art { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; transition: opacity 1.2s ease; }
.io-art.is-intro { opacity: 0.85; }
.io-decor-tefillin .io-kicker { font-family: 'Montserrat', 'DM Sans', sans-serif; font-weight: 400; font-size: min(3.8cqw, 2.4cqh, 1rem); letter-spacing: 0.42em; }
.io-decor-tefillin .io-names {
  text-transform: uppercase; letter-spacing: 0.06em; padding-inline-start: 0.06em; line-height: 1.05;
  font-size: min(15cqw, 8cqh, 4.6rem); color: var(--ia-ink);
  text-shadow: 0 2px 24px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.4);
}
.io-decor-tefillin .io-phrase { font-family: 'Montserrat', 'DM Sans', sans-serif; font-style: normal; text-transform: uppercase; letter-spacing: 0.22em; font-size: min(3cqw, 1.9cqh, 0.78rem); line-height: 1.9; }
.io-decor-tefillin .io-count { max-width: 360px !important; }
.io-decor-tefillin .io-count .ia-count-cell { border: 0; border-inline-start: 1px solid var(--ia-hair); border-radius: 0; box-shadow: none; }
.io-decor-tefillin .io-count .ia-count-cell > span:first-child { font-family: 'Bodoni Moda', Georgia, serif !important; font-size: min(11cqw, 2.6rem) !important; }
.io-decor-tefillin .io-count .ia-count-cell > span:last-child { font-family: 'Montserrat', 'DM Sans', sans-serif !important; font-style: normal !important; text-transform: uppercase; letter-spacing: 0.2em; font-size: min(2.4cqw, 0.6rem) !important; margin-top: 8px !important; }
.io-decor-tefillin .io-count .ia-count-cell:first-child { border-inline-start: 0; }
.io-decor-tefillin .io-see {
  background: transparent; color: var(--ia-ink); border: 1px solid var(--ia-foil); border-radius: 999px;
  box-shadow: inset 0 0 0 3px var(--ia-paper), inset 0 0 0 4px var(--ia-hair); font-weight: 500;
}
.io-decor-tefillin .io-see:hover { background: rgba(255,255,255,0.06); }
.io-decor-tefillin .io-hint { color: var(--ia-ink) !important; opacity: 0.85; }

/* Hébreu : la flèche suit le sens de lecture, et pas d'espacement entre les lettres */
.io-root[dir="rtl"] .io-see svg { transform: scaleX(-1); }
.io-root[dir="rtl"] .io-hint, .io-root[dir="rtl"] .io-kicker, .io-root[dir="rtl"] .io-phrase,
.io-root[dir="rtl"] .io-see, .io-root[dir="rtl"] .ia-count-cell > span { letter-spacing: 0.02em !important; }

@media (prefers-reduced-motion: reduce) {
  .io-root, .io-bloom, .io-art, .io-screen, .io-turn, .io-card, .io-flap, .io-seal { transition: none; }
  .io-in, .io-hint, .io-seal-wax, .io-seal-shine { animation: none; }
}
`;
