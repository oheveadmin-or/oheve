/**
 * Briques du modèle « Invitation animée », partagées entre l'ouverture
 * (carte → enveloppe → écran d'accueil) et la page de l'invitation.
 *
 * Tout est dessiné ici (SVG / CSS) : aucune image externe.
 */
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
  return coupleNames(site).map((n) => n.charAt(0).toUpperCase());
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
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export function Countdown({ iso, tk, units, doneText, className, style }: { iso: string; tk: InvitationTokens; units: string[]; doneText: string; className?: string; style?: CSSProperties }) {
  const c = useCountdown(iso);
  if (!c.valid) return null;
  if (c.done) {
    return (
      <p className={className} style={{ margin: 0, fontFamily: tk.fonts.script, fontSize: '2rem', color: tk.colors.foil, ...style }}>
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
          <span style={{ display: 'block', fontFamily: tk.fonts.body, fontSize: 'min(6.4cqw, 1.6rem)', lineHeight: 1.1, color: tk.colors.ink }}>{v}</span>
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
  background: rgba(255,255,255,0.82); border: 1px solid var(--ia-hair);
  border-radius: 3px; box-shadow: 0 6px 16px -12px var(--ia-shadow);
}
@media (prefers-reduced-motion: reduce) {
  .ia-gold { animation: none; background-position: 50% center; }
}
`;
