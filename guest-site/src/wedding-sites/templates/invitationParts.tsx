/**
 * Briques du modèle « Invitation animée », partagées entre l'ouverture
 * (carte → enveloppe → écran d'accueil) et la page de l'invitation.
 *
 * Tout est dessiné ici (SVG / CSS) : aucune image externe.
 */
import { initialOfName } from '../utils/eventType';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import type { WeddingSite } from '../types';
import type { InvitationTokens } from '../themes/InvitationTheme';

/* ── Utilitaires ─────────────────────────────────────────────────────────── */

/** Prénom réel, ou '' pour un champ vide / le « … » provisoire de l'aperçu */
export function realName(s?: string): string {
  const v = s?.trim() ?? '';
  return /\p{L}/u.test(v) ? v : '';
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Prénoms des mariés : [mariée, marié] s'ils sont deux, sinon un seul nom */
export function coupleNames(site: WeddingSite): string[] {
  const a = realName(site.brideName);
  const b = realName(site.groomName);
  if (a && b) return [a, b];
  const one = a || b || realName(site.coupleName);
  return one ? [one] : [];
}

/** Initiales du monogramme : 2 lettres, 1 lettre, ou aucune */
export function initialsOf(site: WeddingSite): string[] {
  return coupleNames(site).map((n) => initialOfName(n));
}

/* ── Compte à rebours ────────────────────────────────────────────────────── */

export function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const target = new Date(iso).getTime();
  const valid = !Number.isNaN(target);
  const diff = valid ? Math.max(0, target - now) : 0;
  return {
    valid,
    done: valid && diff === 0,
    /** Plus d'un jour après la date : le compte à rebours n'a plus de sens */
    past: valid && now - target > 86400000,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function Countdown({ iso, tk, units, doneText, className, style }: { iso: string; tk: InvitationTokens; units: string[]; doneText: string; className?: string; style?: CSSProperties }) {
  const c = useCountdown(iso);
  if (!c.valid || c.past) return null;
  if (c.done) {
    // width + containerType normal : sans ça, un parent en `container-type:
    // inline-size` réduit la ligne à 0 de large et chaque mot passe à la ligne.
    return (
      <p className={className} style={{ margin: 0, width: '100%', containerType: 'normal', textAlign: 'center', fontFamily: tk.fonts.script, fontSize: '2rem', lineHeight: 1.2, color: tk.colors.foil, ...style }}>
        {doneText}
      </p>
    );
  }
  const values = [c.d, c.h, c.m, c.s];
  return (
    // Lecteurs d'écran : une seule phrase, pas l'annonce de chaque seconde
    <div
      role="timer"
      aria-live="off"
      aria-label={`${c.d} ${units[0]}, ${c.h} ${units[1]}, ${c.m} ${units[2]}`}
      className={className}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'min(2.6cqw, 12px)', width: '100%', maxWidth: 300, ...style }}
    >
      {values.map((v, i) => (
        <div key={i} aria-hidden className="ia-count-cell">
          <span style={{ display: 'block', fontFamily: tk.fonts.body, fontSize: 'min(6.4cqw, 1.6rem)', lineHeight: 1.1, color: tk.colors.ink }}>{tk.dark ? String(v).padStart(2, '0') : v}</span>
          <span style={{ display: 'block', marginTop: 2, fontFamily: tk.fonts.body, fontStyle: 'italic', fontSize: 'min(3cqw, 0.72rem)', color: tk.colors.muted }}>{units[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Fleur ivoire (pivoine stylisée, dessinée en SVG) ────────────────────── */

/** Couronnes de pétales de l'extérieur vers le cœur : nombre, longueur, largeur, décalage */
const RINGS = [
  { n: 9, len: 94, w: 40, rot: 0 },
  { n: 8, len: 79, w: 36, rot: 21 },
  { n: 8, len: 64, w: 30, rot: 5 },
  { n: 7, len: 50, w: 25, rot: 30 },
  { n: 6, len: 37, w: 19, rot: 12 },
  { n: 5, len: 25, w: 14, rot: 40 },
  { n: 4, len: 14, w: 9, rot: 8 },
];

/** Pétale pointé vers le haut : base étroite, bord supérieur légèrement ondulé */
function petalPath(len: number, w: number): string {
  const b = len * 0.12;
  return [
    `M0 ${-b}`,
    `C ${-w * 0.9} ${-len * 0.3}, ${-w * 1.05} ${-len * 0.82}, ${-w * 0.42} ${-len * 0.97}`,
    `Q ${-w * 0.18} ${-len * 1.04}, 0 ${-len * 0.96}`,
    `Q ${w * 0.2} ${-len * 1.05}, ${w * 0.44} ${-len * 0.97}`,
    `C ${w * 1.05} ${-len * 0.8}, ${w * 0.9} ${-len * 0.3}, 0 ${-b}`,
    'Z',
  ].join(' ');
}

export function IvoryBloom({ tint, uid, className, style }: { tint: string; uid: string; className?: string; style?: CSSProperties }) {
  const g = `ia-petal-${uid}`;
  const f = `ia-shadow-${uid}`;
  return (
    <svg aria-hidden className={className} style={style} viewBox="-110 -110 220 220" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={g} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={tint} />
          <stop offset="0.55" stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <filter id={f} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="2.2" floodColor="#7A5F44" floodOpacity="0.16" />
        </filter>
      </defs>
      {RINGS.map((ring, k) => (
        <g key={k} filter={`url(#${f})`}>
          {Array.from({ length: ring.n }, (_, i) => {
            const angle = ring.rot + (360 / ring.n) * i;
            // Légère irrégularité déterministe : la fleur ne paraît pas « tamponnée »
            const wobble = ((i * 37 + k * 11) % 9) - 4;
            return (
              <path
                key={i}
                d={petalPath(ring.len * (1 + wobble / 90), ring.w)}
                transform={`rotate(${angle + wobble})`}
                fill={`url(#${g})`}
                stroke="#9C8063"
                strokeOpacity="0.16"
                strokeWidth="0.6"
              />
            );
          })}
        </g>
      ))}
      <circle r="5" fill={tint} opacity="0.8" />
    </svg>
  );
}

/* ── Décor Bar Mitsva : tefillin et lanières de cuir (SVG) ─────────────── */

type Pt = [number, number];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const poly = (pts: Pt[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

/**
 * Boîtier cubique (bayit) posé sur sa base plate (titoura), vu de trois quarts.
 * `ang` : rotation autour de l'axe vertical, en degrés (0..90).
 */
function TefillinBox({ x, y, size, ang, uid }: { x: number; y: number; size: number; ang: number; uid: string }) {
  const a = (ang * Math.PI) / 180;
  const box = (c: Pt, s: number, h: number, faces: [string, string, string], key: string) => {
    const r: Pt = [s * Math.cos(a), s * 0.5 * Math.sin(a)];
    const l: Pt = [-s * Math.sin(a), s * 0.5 * Math.cos(a)];
    const down: Pt = [0, h];
    const C = c;
    const R = add(C, r);
    const L = add(C, l);
    const F = add(R, l);
    return (
      <g key={key}>
        {/* Face gauche (le long de r, depuis L) puis face droite (le long de l, depuis R) */}
        <polygon points={poly([L, F, add(F, down), add(L, down)])} fill={faces[1]} />
        <polygon points={poly([R, F, add(F, down), add(R, down)])} fill={faces[2]} />
        <polygon points={poly([C, R, F, L])} fill={faces[0]} />
        <polyline points={poly([L, F, R])} fill="none" stroke="#E7BDB2" strokeOpacity="0.55" strokeWidth="0.9" />
        <line x1={F[0]} y1={F[1]} x2={F[0]} y2={F[1] + h} stroke="#E7BDB2" strokeOpacity="0.35" strokeWidth="0.8" />
        <polyline points={poly([C, R])} fill="none" stroke="#E7BDB2" strokeOpacity="0.25" strokeWidth="0.7" />
        <polyline points={poly([C, L])} fill="none" stroke="#E7BDB2" strokeOpacity="0.25" strokeWidth="0.7" />
      </g>
    );
  };
  const top = `url(#tf-top-${uid})`;
  const left = `url(#tf-left-${uid})`;
  const right = `url(#tf-right-${uid})`;
  const base = size * 1.42;
  const slabH = size * 0.16;
  // La base est centrée sous le cube : on recule son coin arrière
  const shift = (size - base) / 2;
  const back: Pt = [x + shift * (Math.cos(a) - Math.sin(a)), y + shift * 0.5 * (Math.sin(a) + Math.cos(a))];
  // (x, y) = coin arrière du cube sur le dessus de la base ; son dessus est une hauteur plus haut
  const cubeH = size * 0.96;
  return (
    <g filter={`url(#tf-drop-${uid})`}>
      {box(back, base, slabH, [top, left, right], 'slab')}
      {box([x, y - cubeH], size, cubeH, [top, left, right], 'cube')}
    </g>
  );
}

/** Lanière : cuir sombre, reflet métallique au centre, filet de lumière */
function Strap({ d, w, uid }: { d: string; w: number; uid: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Ombre portée, tranches claires, puis la face du cuir : un ruban plat, pas un câble */}
      <path d={d} stroke="#0E0306" strokeWidth={w + 4} strokeOpacity="0.5" transform="translate(2,4)" />
      <path d={d} stroke="#E2B2A8" strokeOpacity="0.7" strokeWidth={w} />
      <path d={d} stroke={`url(#tf-strap-${uid})`} strokeWidth={w - 2.2} />
      <path d={d} stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth={(w - 2.2) * 0.45} transform="translate(-1,-1)" />
    </g>
  );
}

/**
 * Fond du décor tefillin : deux boîtiers en haut, lanières qui ondulent sur
 * les côtés, halo bordeaux au centre et léger grain vertical. Dessiné ici,
 * aucune image externe. viewBox portrait 400×800, rogné (slice) pour remplir.
 */
export function TefillinArt({ uid, className, style, top = false }: { uid: string; className?: string; style?: CSSProperties; /** Cadre sur le haut (les boîtiers) : vignettes */ top?: boolean }) {
  return (
    <svg aria-hidden className={className} style={style} viewBox="0 0 400 800" preserveAspectRatio={top ? 'xMidYMin slice' : 'xMidYMid slice'}>
      <defs>
        <radialGradient id={`tf-glow-${uid}`} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#4C1621" />
          <stop offset="0.6" stopColor="#300C14" />
          <stop offset="1" stopColor="#1C060B" />
        </radialGradient>
        <pattern id={`tf-grain-${uid}`} width="7" height="800" patternUnits="userSpaceOnUse">
          <rect width="1" height="800" x="1" fill="#000" opacity="0.18" />
          <rect width="0.6" height="800" x="4.5" fill="#fff" opacity="0.025" />
        </pattern>
        <linearGradient id={`tf-strap-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="800">
          <stop offset="0" stopColor="#5A1E29" />
          <stop offset="0.18" stopColor="#B57D7A" />
          <stop offset="0.32" stopColor="#4A1520" />
          <stop offset="0.5" stopColor="#9C5F62" />
          <stop offset="0.66" stopColor="#3F111A" />
          <stop offset="0.84" stopColor="#B88280" />
          <stop offset="1" stopColor="#4A1520" />
        </linearGradient>
        <linearGradient id={`tf-top-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9A5A60" />
          <stop offset="1" stopColor="#5A2230" />
        </linearGradient>
        <linearGradient id={`tf-left-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5E2430" />
          <stop offset="1" stopColor="#2A0A12" />
        </linearGradient>
        <linearGradient id={`tf-right-${uid}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3E1019" />
          <stop offset="1" stopColor="#1A050A" />
        </linearGradient>
        <filter id={`tf-drop-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <rect width="400" height="800" fill={`url(#tf-glow-${uid})`} />
      <rect width="400" height="800" fill={`url(#tf-grain-${uid})`} />

      <g className="tf-drift tf-drift-a">
        {/* Lanière qui traverse le haut, derrière les boîtiers */}
        <Strap uid={uid} w={13} d="M-30 70 C 60 20, 150 110, 225 72 S 350 0, 440 46" />
        {/* Côté gauche : lanière du boîtier de tête qui descend en boucles */}
        <Strap uid={uid} w={17} d="M118 214 C 60 260, -10 280, 22 360 S 150 430, 70 520 S -40 640, 30 720 S 120 800, 60 860" />
        <Strap uid={uid} w={10} d="M96 226 C 150 300, 120 340, 64 380 S -6 470, 40 560" />
        <TefillinBox uid={uid} x={86} y={196} size={62} ang={34} />
      </g>

      <g className="tf-drift tf-drift-b">
        {/* Côté droit : boîtier du bras et sa lanière enroulée */}
        <Strap uid={uid} w={16} d="M300 172 C 370 230, 430 300, 360 380 S 250 460, 330 560 S 440 690, 370 760 S 300 820, 350 880" />
        <Strap uid={uid} w={10} d="M318 178 C 260 250, 300 300, 352 330 S 420 420, 372 470" />
        <TefillinBox uid={uid} x={292} y={150} size={50} ang={58} />
      </g>

      {/* Boucle basse, très douce, pour habiller le bas de l'écran */}
      <g opacity="0.7" className="tf-drift tf-drift-a">
        <Strap uid={uid} w={12} d="M-30 760 C 80 700, 160 800, 240 744 S 360 680, 440 730" />
      </g>
    </svg>
  );
}

/* ── Monogramme doré ─────────────────────────────────────────────────────── */

/**
 * Monogramme : celui créé dans l'étape Mariés s'il existe, sinon les initiales
 * en capitales didones entrelacées, en dégradé feuille d'or avec un reflet.
 */
export function GoldMonogram({ site, tk, size, className, style }: { site: WeddingSite; tk: InvitationTokens; size: string; className?: string; style?: CSSProperties }) {
  const svg = site.content?.monogramSvg;
  if (svg) {
    return (
      <div
        aria-hidden
        className={className}
        style={{ width: `calc(${size} * 1.6)`, aspectRatio: '1 / 1', margin: '0 auto', color: tk.colors.foil, ...style }}
        dangerouslySetInnerHTML={{ __html: svg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"') }}
      />
    );
  }
  const letters = initialsOf(site);
  if (!letters.length) return null;
  const gold: CSSProperties = {
    backgroundImage: `linear-gradient(110deg, ${tk.colors.goldLo} 0%, ${tk.colors.foil} 30%, ${tk.colors.goldHi} 45%, #FFF6E6 50%, ${tk.colors.goldHi} 55%, ${tk.colors.foil} 70%, ${tk.colors.goldLo} 100%)`,
  };
  return (
    <div aria-hidden className={`ia-mono ${className ?? ''}`} style={{ fontFamily: tk.fonts.monogram, fontSize: size, ...style }}>
      <span className="ia-mono-letter ia-gold" style={gold}>{letters[0]}</span>
      {letters[1] ? (
        <span className="ia-mono-letter ia-mono-second ia-gold" style={gold}>
          {letters[1]}
        </span>
      ) : null}
    </div>
  );
}

/** CSS partagé (préfixe .ia-) : monogramme, reflet doré, cases du décompte */
export const INVITATION_PARTS_CSS = `
.ia-mono { display: flex; justify-content: center; align-items: flex-start; line-height: 1; font-weight: 500; }
.ia-mono-letter { display: inline-block; letter-spacing: 0; }
.ia-mono-second { margin-inline-start: -0.18em; transform: translateY(0.16em); }
.ia-gold {
  /* Pas de halo : il se peindrait par-dessus le dégradé découpé dans les lettres */
  text-shadow: none;
  color: transparent; -webkit-background-clip: text; background-clip: text;
  background-size: 250% 100%; background-position: 100% center;
  animation: ia-shine 7s linear infinite;
}
@keyframes ia-shine { to { background-position: -150% center; } }
.ia-count-cell {
  text-align: center; padding: 0.55em 0.2em 0.45em;
  background: var(--ia-cell, rgba(255,255,255,0.82)); border: 1px solid var(--ia-hair);
  border-radius: 3px; box-shadow: 0 6px 16px -12px var(--ia-shadow);
}
/* Décor tefillin : le cuir ondule à peine, comme posé sur du velours */
.tf-drift { animation: tf-drift 9s ease-in-out infinite alternate; transform-box: view-box; }
.tf-drift-b { animation-duration: 11s; animation-delay: -4s; }
@keyframes tf-drift { from { transform: translateY(-4px); } to { transform: translateY(5px); } }
@media (prefers-reduced-motion: reduce) {
  .ia-gold { animation: none; background-position: 50% center; }
  .tf-drift { animation: none; }
}
`;
