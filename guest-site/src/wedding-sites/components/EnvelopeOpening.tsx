/**
 * Ouverture « Enveloppe cachetée » : la carte arrive dans une enveloppe scellée
 * à la cire, aux initiales des mariés. L'invité touche le sceau → la cire se
 * brise, le rabat s'ouvre, la carte sort de l'enveloppe puis s'agrandit et
 * dévoile le site.
 *
 * Aucune dépendance : CSS 3D + SVG. Toutes les tailles dérivent de la boîte
 * conteneur (container-type: size → unités cqw/cqh), jamais de vw/vh : le même
 * composant fonctionne en plein écran ET dans l'aperçu iPhone mis à l'échelle.
 */
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { WeddingSite } from '../types';
import { frenchLongDate } from '../utils/hebrewDate';

type Stage = 'closed' | 'breaking' | 'flap' | 'card' | 'reveal' | 'done';

/** Durées (ms) de chaque étape, enchaînées après le toucher du sceau */
const TIMELINE: { stage: Stage; at: number }[] = [
  { stage: 'breaking', at: 0 },
  { stage: 'flap', at: 620 },
  { stage: 'card', at: 1450 },
  { stage: 'reveal', at: 2650 },
  { stage: 'done', at: 3450 },
];

type Props = {
  site: WeddingSite;
  /** true : occupe son parent (aperçu iPhone) au lieu de tout l'écran */
  contained?: boolean;
  onDone: () => void;
};

/** Prénom réel, ou '' pour un champ vide / le « … » provisoire de l'aperçu */
function realName(s?: string): string {
  const v = s?.trim() ?? '';
  return /\p{L}/u.test(v) ? v : '';
}

function initialsOf(site: WeddingSite): [string, string | null] {
  const first = (s?: string) => realName(s).charAt(0).toUpperCase();
  const a = first(site.brideName);
  const b = first(site.groomName);
  if (a && b) return [a, b];
  return [a || b || first(site.coupleName) || '♥', null];
}

/**
 * Taille de police (en fraction de la largeur d'enveloppe) qui fait tenir
 * `text` sur une ligne de `room` largeurs, plafonnée à `max`.
 * Approximation : un caractère calligraphié ≈ 0,5 em.
 */
function fitSize(text: string, room: number, max: number, min: number): number {
  const len = Math.max(1, text.length);
  return Math.max(min, Math.min(max, room / (len * 0.5)));
}

function nameLinesOf(site: WeddingSite): string[] {
  const a = realName(site.brideName);
  const b = realName(site.groomName);
  // Prénoms courts : une seule ligne (la date reste visible au-dessus des poches)
  if (a && b) return `${a} & ${b}`.length <= 22 ? [`${a} & ${b}`] : [a, `& ${b}`];
  const one = a || b || realName(site.coupleName);
  return one ? [one] : [];
}

function namesOf(site: WeddingSite): string {
  const a = realName(site.brideName);
  const b = realName(site.groomName);
  if (a && b) return `${a} & ${b}`;
  return a || b || realName(site.coupleName);
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function EnvelopeOpening({ site, contained = false, onDone }: Props) {
  const [stage, setStage] = useState<Stage>('closed');
  const timers = useRef<number[]>([]);
  const t = site.theme;

  const [init1, init2] = initialsOf(site);
  const names = namesOf(site);
  const nameLines = nameLinesOf(site);
  // Carte : un prénom par ligne ; enveloppe : tout sur 2 lignes max
  const cardNameSize = fitSize(nameLines.reduce((m, l) => (l.length > m.length ? l : m), ''), 0.78, 0.085, 0.04);
  const frontNameSize = fitSize(names, 1.1, 0.062, 0.036);
  const dateIso = site.date?.slice(0, 10) ?? '';
  const dateLabel = dateIso ? frenchLongDate(dateIso) : '';

  const wax = t.primaryColor || '#8F947F';
  const ink = t.textColor || '#3D3229';
  const bg = t.backgroundColor || '#F6F2EA';
  const paper = t.cardBackgroundColor || bg;
  const accent = t.accentColor || wax;
  const script = t.scriptFontFamily || "'Pinyon Script', 'Great Vibes', cursive";
  const serif = t.titleFontFamily || t.fontFamily || "'Cormorant Garamond', Georgia, serif";
  const body = t.fontFamily || "'Cormorant Garamond', Georgia, serif";

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    if (stage === 'done') onDone();
  }, [stage, onDone]);

  function open() {
    if (stage !== 'closed') return;
    if (prefersReducedMotion()) {
      setStage('reveal');
      timers.current.push(window.setTimeout(() => setStage('done'), 450));
      return;
    }
    for (const step of TIMELINE) {
      timers.current.push(window.setTimeout(() => setStage(step.stage), step.at));
    }
  }

  const opened = stage !== 'closed';
  const flapOpen = stage === 'flap' || stage === 'card' || stage === 'reveal' || stage === 'done';
  const cardOut = stage === 'card' || stage === 'reveal' || stage === 'done';
  const revealing = stage === 'reveal' || stage === 'done';

  // Variables CSS partagées par toutes les règles (couleurs du thème)
  const vars = useMemo(
    () =>
      ({
        '--env-wax': wax,
        '--env-ink': ink,
        '--env-paper': paper,
        '--env-accent': accent,
        '--env-bg': bg,
      }) as CSSProperties,
    [wax, ink, paper, accent, bg],
  );

  if (stage === 'done') return null;

  return (
    <div
      className={`env-root${revealing ? ' env-revealing' : ''}`}
      style={{ ...vars, position: contained ? 'absolute' : 'fixed' }}
      role="dialog"
      aria-label="Invitation sous enveloppe"
    >
      <style>{ENVELOPE_CSS}</style>

      <div className="env-stage">
        <p className={`env-kicker${opened ? ' env-fade' : ''}`} style={{ fontFamily: serif }}>
          Une invitation pour vous
        </p>

        <div className={`env-box${flapOpen ? ' env-flap-open' : ''}${cardOut ? ' env-card-out' : ''}`}>
          {/* Fond intérieur de l'enveloppe */}
          <div className="env-back" />

          {/* La carte, glissée dans l'enveloppe */}
          <div className="env-card">
            <div className="env-card-frame">
              <div className="env-card-initials" style={{ fontFamily: serif }}>
                {init1}
                {init2 ? <span className="env-card-amp" style={{ fontFamily: script }}>&amp;</span> : null}
                {init2}
              </div>
              {nameLines.length ? (
                <div className="env-card-names" style={{ fontFamily: script, fontSize: `calc(var(--w) * ${cardNameSize.toFixed(4)})` }}>
                  {nameLines.map((l) => <div key={l}>{l}</div>)}
                </div>
              ) : null}
              <div className="env-card-rule" />
              {dateLabel ? <div className="env-card-date" style={{ fontFamily: body }}>{dateLabel}</div> : null}
            </div>
          </div>

          {/* Poches avant (gauche, droite, bas) : couvrent la carte */}
          <svg className="env-pockets" viewBox="0 0 100 68" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="env-g-side" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" style={{ stopColor: 'var(--env-paper)' }} />
                <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--env-paper) 90%, var(--env-ink))' }} />
              </linearGradient>
              <linearGradient id="env-g-side-r" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0" style={{ stopColor: 'var(--env-paper)' }} />
                <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--env-paper) 90%, var(--env-ink))' }} />
              </linearGradient>
              <linearGradient id="env-g-bottom" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" style={{ stopColor: 'var(--env-paper)' }} />
                <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--env-paper) 93%, var(--env-ink))' }} />
              </linearGradient>
            </defs>
            <polygon points="0,0 52,38 0,68" fill="url(#env-g-side)" />
            <polygon points="100,0 48,38 100,68" fill="url(#env-g-side-r)" />
            <polygon points="0,68 50,30 100,68" fill="url(#env-g-bottom)" />
            {/* plis du papier */}
            <polyline points="0,68 50,30 100,68" fill="none" style={{ stroke: 'color-mix(in srgb, var(--env-ink) 14%, transparent)' }} strokeWidth="0.25" />
            <polyline points="0,0 52,38" fill="none" style={{ stroke: 'color-mix(in srgb, var(--env-ink) 9%, transparent)' }} strokeWidth="0.2" />
            <polyline points="100,0 48,38" fill="none" style={{ stroke: 'color-mix(in srgb, var(--env-ink) 9%, transparent)' }} strokeWidth="0.2" />
          </svg>

          {/* Mot sur l'enveloppe */}
          <div className={`env-front-text${opened ? ' env-fade' : ''}`}>
            {names ? <div className="env-front-names" style={{ fontFamily: script, fontSize: `calc(var(--w) * ${frontNameSize.toFixed(4)})` }}>{names}</div> : null}
          </div>

          {/* Rabat supérieur : recto (papier) / verso (intérieur) */}
          <div className="env-flap">
            <div className="env-flap-face env-flap-front" />
            <div className="env-flap-face env-flap-inside" />
          </div>

          {/* Sceau de cire */}
          <button
            type="button"
            className={`env-seal${stage === 'closed' ? ' env-seal-idle' : ''}${opened ? ' env-seal-broken' : ''}`}
            onClick={open}
            aria-label="Briser le sceau et ouvrir l'invitation"
          >
            <WaxHalf side="left" init1={init1} init2={init2} serif={serif} script={script} />
            <WaxHalf side="right" init1={init1} init2={init2} serif={serif} script={script} />
          </button>
        </div>

        <p className={`env-hint${opened ? ' env-fade' : ''}`} style={{ fontFamily: body }}>
          Touchez le sceau pour ouvrir
        </p>
      </div>

      {/* Lueur qui dévoile le site à la fin */}
      <div className="env-veil" />
    </div>
  );
}

/** Contour irrégulier d'une goutte de cire (cercle « bosselé ») */
const WAX_PATH = (() => {
  const pts: string[] = [];
  const n = 96;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // bosses douces et irrégulières, comme une cire coulée à la main
    const r = 46.5 + Math.sin(a * 7) * 1.4 + Math.sin(a * 11 + 1.3) * 0.9 + Math.cos(a * 3 + 0.4) * 0.8;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
})();

/** Ligne de cassure en zigzag, partagée par les deux moitiés */
const CRACK = '52,0 46,14 55,27 44,41 54,55 45,69 53,83 48,100';

function WaxHalf({
  side,
  init1,
  init2,
  serif,
  script,
}: {
  side: 'left' | 'right';
  init1: string;
  init2: string | null;
  serif: string;
  script: string;
}) {
  const id = `env-clip-${side}`;
  const clip = side === 'left' ? `0,0 ${CRACK} 0,100` : `100,0 ${CRACK} 100,100`;
  return (
    <svg className={`env-wax env-wax-${side}`} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <clipPath id={id}>
          <polygon points={clip} />
        </clipPath>
        <radialGradient id={`env-wax-g-${side}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--env-wax) 70%, white)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--env-wax)' }} />
          <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--env-wax) 62%, black)' }} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path d={WAX_PATH} fill={`url(#env-wax-g-${side})`} />
        {/* empreinte du cachet */}
        <circle cx="50" cy="50" r="33" fill="none" style={{ stroke: 'color-mix(in srgb, var(--env-wax) 55%, black)' }} strokeWidth="2.2" opacity="0.55" />
        <circle cx="50" cy="50" r="30" style={{ fill: 'color-mix(in srgb, var(--env-wax) 88%, black)' }} opacity="0.35" />
        {/* Initiales en relief : ombre foncée décalée + reflet clair → lisibles sur toute cire */}
        <SealInitials init1={init1} init2={init2} serif={serif} script={script} dy={1.1} color="rgba(0,0,0,0.45)" />
        <SealInitials init1={init1} init2={init2} serif={serif} script={script} dy={0} color="color-mix(in srgb, var(--env-wax) 45%, white)" />
        {/* reflet */}
        <ellipse cx="36" cy="28" rx="13" ry="6" fill="white" opacity="0.18" transform="rotate(-28 36 28)" />
      </g>
    </svg>
  );
}

function SealInitials({
  init1,
  init2,
  serif,
  script,
  dy,
  color,
}: {
  init1: string;
  init2: string | null;
  serif: string;
  script: string;
  dy: number;
  color: string;
}) {
  return (
    <text
      x="50"
      y={50 + dy}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fill: color, fontFamily: serif, fontSize: init2 ? 26 : 34, letterSpacing: init2 ? -1 : 0 }}
    >
      {init1}
      {init2 ? <tspan style={{ fontFamily: script, fontSize: 16 }} dx="1" dy="2">&amp;</tspan> : null}
      {init2 ? <tspan dx="1" dy="-2">{init2}</tspan> : null}
    </text>
  );
}

const ENVELOPE_CSS = `
.env-root {
  inset: 0;
  z-index: 1000;
  container-type: size;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(110% 75% at 50% 48%, color-mix(in srgb, var(--env-bg) 94%, var(--env-ink)) 0%, color-mix(in srgb, var(--env-bg) 74%, var(--env-ink)) 100%);
  -webkit-tap-highlight-color: transparent;
}
.env-stage {
  --w: min(86cqw, 420px, 120cqh);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--w) * 0.07);
  transform: translateY(calc(var(--w) * 0.02));
  transition: opacity 700ms ease, transform 800ms cubic-bezier(.2,.7,.2,1);
}
.env-kicker {
  margin: 0;
  font-size: calc(var(--w) * 0.042);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--env-ink) 70%, transparent);
  text-align: center;
  animation: env-rise 900ms 150ms both cubic-bezier(.2,.7,.2,1);
}
.env-hint {
  margin: 0;
  font-size: calc(var(--w) * 0.045);
  font-style: italic;
  color: color-mix(in srgb, var(--env-ink) 65%, transparent);
  animation: env-rise 900ms 500ms both cubic-bezier(.2,.7,.2,1), env-breathe 2.4s 1.4s ease-in-out infinite;
}
.env-fade { opacity: 0 !important; transition: opacity 400ms ease; animation: none; }

.env-box {
  position: relative;
  width: var(--w);
  height: calc(var(--w) * 0.68);
  perspective: calc(var(--w) * 3.2);
  filter:
    drop-shadow(0 calc(var(--w) * 0.006) calc(var(--w) * 0.006) color-mix(in srgb, var(--env-ink) 22%, transparent))
    drop-shadow(0 calc(var(--w) * 0.05) calc(var(--w) * 0.07) color-mix(in srgb, var(--env-ink) 30%, transparent));
  animation: env-arrive 1100ms both cubic-bezier(.16,.84,.3,1);
}
.env-back {
  position: absolute;
  inset: 0;
  border-radius: calc(var(--w) * 0.012);
  z-index: 1;
}

/* ── La carte ── */
.env-card {
  position: absolute;
  left: 5%;
  right: 5%;
  bottom: 5%;
  height: 90%;
  z-index: 2;
  transform: translateY(0);
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--env-paper) 92%, white) 0%, var(--env-paper) 100%);
  border-radius: calc(var(--w) * 0.012);
  box-shadow: 0 calc(var(--w) * 0.01) calc(var(--w) * 0.04) color-mix(in srgb, var(--env-ink) 22%, transparent);
  padding: calc(var(--w) * 0.035);
  box-sizing: border-box;
  transition: transform 1150ms cubic-bezier(.3,.6,.2,1);
}
.env-card-frame {
  height: 100%;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--env-accent) 55%, transparent);
  outline: 1px solid color-mix(in srgb, var(--env-accent) 30%, transparent);
  outline-offset: calc(var(--w) * -0.016);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 6%;
  gap: calc(var(--w) * 0.014);
  color: var(--env-ink);
  text-align: center;
}
.env-card-initials {
  font-size: calc(var(--w) * 0.13);
  line-height: 1;
  color: var(--env-accent);
  letter-spacing: 0.02em;
}
.env-card-amp { font-size: 0.55em; margin: 0 0.12em; opacity: 0.8; }
.env-card-names {
  line-height: 1.12;
  padding: 0 6%;
  overflow-wrap: anywhere;
}
.env-card-rule {
  width: 30%;
  height: 1px;
  background: color-mix(in srgb, var(--env-accent) 60%, transparent);
}
.env-card-date {
  font-size: calc(var(--w) * 0.042);
  letter-spacing: 0.06em;
  opacity: 0.8;
  padding: 0 6%;
}
/* Sortie de la carte : le bas reste glissé dans les poches (jamais de bord flottant) */
.env-card-out .env-card { transform: translateY(-50%); }

/* ── Poches et rabat ── */
.env-pockets {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  border-radius: calc(var(--w) * 0.012);
  overflow: hidden;
}
.env-front-text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 5%;
  z-index: 4;
  text-align: center;
  color: color-mix(in srgb, var(--env-ink) 78%, transparent);
  transition: opacity 400ms ease;
}
.env-front-names {
  line-height: 1.15;
  padding: 0 12%;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.env-flap {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 60%;
  z-index: 5;
  transform-origin: 50% 0;
  transform-style: preserve-3d;
  transform: rotateX(0deg);
  transition: transform 820ms cubic-bezier(.5,.05,.3,1);
}
.env-flap-face {
  position: absolute;
  inset: 0;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.env-flap-front {
  background: linear-gradient(180deg, color-mix(in srgb, var(--env-paper) 94%, var(--env-ink)) 0%, var(--env-paper) 85%);
}
/* Doublure intérieure (papier fin à motif, couleur du thème) — visible rabat ouvert */
.env-flap-inside, .env-back {
  background-color: color-mix(in srgb, var(--env-paper) 82%, var(--env-accent));
  background-image:
    radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--env-accent) 38%, transparent) 0 calc(var(--w) * 0.006), transparent calc(var(--w) * 0.007)),
    repeating-linear-gradient(45deg, color-mix(in srgb, var(--env-accent) 16%, transparent) 0 1px, transparent 1px calc(var(--w) * 0.03)),
    repeating-linear-gradient(-45deg, color-mix(in srgb, var(--env-accent) 16%, transparent) 0 1px, transparent 1px calc(var(--w) * 0.03)),
    linear-gradient(180deg, color-mix(in srgb, var(--env-ink) 10%, transparent), transparent 70%);
  background-size: calc(var(--w) * 0.042) calc(var(--w) * 0.042), auto, auto, auto;
}
.env-flap-inside { transform: rotateX(180deg); }
.env-flap-open .env-flap { transform: rotateX(178deg); }
/* Une fois ouvert, le rabat passe derrière la carte qui sort */
.env-card-out .env-flap { z-index: 1; }

/* ── Sceau ── */
.env-seal {
  position: absolute;
  left: 50%;
  top: 60%;
  width: calc(var(--w) * 0.21);
  height: calc(var(--w) * 0.21);
  margin: calc(var(--w) * -0.105) 0 0 calc(var(--w) * -0.105);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  z-index: 9;
  border-radius: 50%;
  filter: drop-shadow(0 calc(var(--w) * 0.01) calc(var(--w) * 0.012) rgba(0,0,0,0.35));
}
.env-seal:focus-visible { outline: 2px solid var(--env-accent); outline-offset: 4px; }
.env-seal-idle { animation: env-pulse 2.4s 1.2s ease-in-out infinite; }
.env-seal-idle::after {
  content: '';
  position: absolute;
  inset: -12%;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--env-wax) 55%, transparent);
  animation: env-ring 2.4s 1.2s ease-out infinite;
  pointer-events: none;
}
.env-wax {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  transition: transform 700ms cubic-bezier(.4,.1,.6,1), opacity 600ms ease 150ms;
}
.env-seal-broken { cursor: default; animation: env-crack 160ms ease-out; }
.env-seal-broken .env-wax-left { transform: translate(-38%, 70%) rotate(-38deg); opacity: 0; }
.env-seal-broken .env-wax-right { transform: translate(38%, 80%) rotate(34deg); opacity: 0; }

/* ── Dévoilement final ── */
.env-veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--env-paper) 92%, white) 0%, var(--env-paper) 70%);
  transition: opacity 500ms ease;
}
.env-revealing .env-stage { transform: translateY(calc(var(--w) * 0.02)) scale(1.9); opacity: 0; transition: transform 900ms cubic-bezier(.5,0,.3,1), opacity 600ms ease 250ms; }
.env-revealing { animation: env-out 800ms ease 150ms forwards; }
.env-revealing .env-veil { opacity: 0.9; }

@keyframes env-arrive {
  from { opacity: 0; transform: translateY(calc(var(--w) * 0.3)) rotate(-4deg) scale(0.92); }
  to { opacity: 1; transform: none; }
}
@keyframes env-rise {
  from { opacity: 0; transform: translateY(calc(var(--w) * 0.04)); }
  to { opacity: 1; transform: none; }
}
@keyframes env-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes env-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes env-ring { 0% { transform: scale(0.9); opacity: 0.9; } 100% { transform: scale(1.45); opacity: 0; } }
@keyframes env-crack { 0% { transform: scale(1); } 40% { transform: scale(0.92); } 100% { transform: scale(1); } }
@keyframes env-out { to { opacity: 0; visibility: hidden; } }

@media (prefers-reduced-motion: reduce) {
  .env-box, .env-kicker, .env-hint, .env-seal-idle, .env-seal-idle::after { animation: none; }
}
`;
