import type { CSSProperties } from 'react';
import type { PatternId, WeddingTheme } from '../types';

interface PatternOverlayProps {
  patternId: PatternId;
  color: string;
  opacity?: number;
  /** « Papier & arabesques » : pose aussi les volutes aux coins (hero uniquement) */
  corners?: boolean;
  /**
   * Motif de PAGE : peint sous le contenu (z-index -1) au lieu de par-dessus
   * les cartes des sections. Le parent doit créer un contexte d'empilement
   * (`isolation: 'isolate'`) pour que le motif reste au-dessus de son fond.
   */
  behind?: boolean;
}

function buildSvgDataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ─── Géométrie orientale : « étoile et croix » (khatam 8 branches) ────────────
// Étoiles à 8 branches (deux carrés superposés) aux nœuds d'une grille, pointes
// jointives → les croix apparaissent entre elles. Tout est tracé dans la couleur
// du thème : le motif suit les combinaisons de couleurs.

/** Contour d'une étoile à 8 branches (16 sommets) centrée en (cx, cy). */
function khatamPath(cx: number, cy: number, R: number): string {
  const r = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  const pts = Array.from({ length: 16 }, (_, i) => {
    const rad = i % 2 === 0 ? R : r;
    const a = (Math.PI / 8) * i;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

/** Rosace pleine à n branches (cœur doré des étoiles). */
function rosettePath(cx: number, cy: number, R: number, r: number, n = 8): string {
  const pts = Array.from({ length: 2 * n }, (_, i) => {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (Math.PI / n) * i;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

function orientalGeometrySvg(color: string): string {
  const S = 80;
  const R = S / 2;
  const nodes: [number, number][] = [[0, 0], [S, 0], [0, S], [S, S]];
  const outer = nodes.map(([x, y]) => khatamPath(x, y, R)).join('');
  const inner = nodes.map(([x, y]) => khatamPath(x, y, R * 0.6)).join('') + khatamPath(S / 2, S / 2, R * 0.42);
  const rosettes = nodes.map(([x, y]) => rosettePath(x, y, R * 0.26, R * 0.1)).join('') + rosettePath(S / 2, S / 2, R * 0.16, R * 0.06, 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`
    + `<path d="${outer}" fill="none" stroke="${color}" stroke-width="0.9" stroke-linejoin="round"/>`
    + `<path d="${inner}" fill="none" stroke="${color}" stroke-width="0.55" opacity="0.7" stroke-linejoin="round"/>`
    + `<path d="${rosettes}" fill="${color}"/></svg>`;
}

// ─── Papier & arabesques : grain papier + volutes d'angle ─────────────────────

function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec((hex || '').trim());
  if (!m) return [0.45, 0.38, 0.3];
  return [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255) as [number, number, number];
}

/** Grain de papier fin, teinté de la couleur du thème. */
function paperGrainSvg(color: string): string {
  const [r, g, b] = hexToRgb01(color).map((v) => v.toFixed(3));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>`
    + `<feColorMatrix values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 0.16 0"/></filter><rect width="160" height="160" filter="url(#g)"/></svg>`;
}

function arabesqueLeaf(x: number, y: number, ang: number, L = 13, w = 4.8): string {
  return `<path transform="translate(${x} ${y}) rotate(${ang})" d="M0,0 Q${L * 0.45},${-w} ${L},0 Q${L * 0.45},${w} 0,0Z"/>`;
}

/** Moitié de la volute (le long du bord haut) ; l'autre moitié est son miroir sur la diagonale. */
function arabesqueHalf(c: string): string {
  const main = 'M34,34 C56,18 96,14 152,14 M152,14 c9,0 13,-8 7,-12 c-5,-3 -10,1 -7,5 '
    + 'M60,22 c2,12 -6,22 -16,20 c-8,-2 -8,-12 -1,-13 c4,0 5,4 3,6 '
    + 'M92,16 c-1,10 -9,15 -18,12 c-5,-2 -4,-8 1,-8 M118,15 c1,8 8,12 15,9 c4,-2 3,-7 -1,-6 ';
  const fine = 'M42,40 C62,28 86,25 106,26 c6,0 9,4 7,8 c-2,3 -6,2 -6,-1 ';
  const leaves = arabesqueLeaf(70, 18, -150) + arabesqueLeaf(80, 17, -25) + arabesqueLeaf(104, 15, -160, 11, 4)
    + arabesqueLeaf(110, 15, -20, 11, 4) + arabesqueLeaf(136, 14, -165, 10, 3.8) + arabesqueLeaf(142, 14, -18, 10, 3.8)
    + arabesqueLeaf(52, 26, -125, 10, 3.8);
  const dots = ([[84, 30, 1.5], [88, 33, 1.1], [80, 33, 1.1], [127, 26, 1.3], [146, 24, 1.1], [162, 6, 1.2]] as const)
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `<path d="${main}" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>`
    + `<path d="${fine}" fill="none" stroke="${c}" stroke-width="0.7" stroke-linecap="round" opacity="0.75"/>`
    + `<g fill="${c}">${leaves}${dots}</g>`;
}

/** Volute d'angle complète (haut-gauche ; `flip` = tournée pour le coin bas-droit). */
function arabesqueCornerSvg(c: string, flip = false): string {
  const core = `<path d="M34,34 c-10,-10 -26,-5 -26,8 c0,11 13,15 19,7 c4,-6 -2,-12 -7,-8" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`
    + `<g fill="${c}">${arabesqueLeaf(36, 36, 45, 20, 7)}${arabesqueLeaf(40, 40, 20, 11, 3.8)}${arabesqueLeaf(40, 40, 70, 11, 3.8)}<circle cx="34" cy="34" r="2.6"/></g>`;
  const body = `${arabesqueHalf(c)}<g transform="matrix(0 1 1 0 0 0)">${arabesqueHalf(c)}</g>${core}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">${flip ? `<g transform="rotate(180 90 90)">${body}</g>` : body}</svg>`;
}

function getPatternBackground(patternId: PatternId, color: string): string | null {
  switch (patternId) {
    case 'oriental-geometry':
      return buildSvgDataUri(orientalGeometrySvg(color));

    case 'paper-arabesque':
      // Seul le grain se répète ; les volutes d'angle sont posées par PatternOverlay (`corners`)
      return buildSvgDataUri(paperGrainSvg(color));

    case 'dots':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="1" cy="1" r="1" fill="${color}"/></svg>`
      );

    case 'lines-diagonal':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><line x1="0" y1="16" x2="16" y2="0" stroke="${color}" stroke-width="0.8"/></svg>`
      );

    case 'grid':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="${color}" stroke-width="0.5"/></svg>`
      );

    case 'deco-geo':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect x="10" y="10" width="20" height="20" fill="none" stroke="${color}" stroke-width="0.6" transform="rotate(45 20 20)"/><circle cx="20" cy="20" r="2" fill="${color}"/></svg>`
      );

    case 'floral-subtle':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><g transform="translate(25,25)" fill="${color}" opacity="0.7"><circle cx="0" cy="-8" r="4"/><circle cx="0" cy="8" r="4"/><circle cx="-8" cy="0" r="4"/><circle cx="8" cy="0" r="4"/><circle cx="0" cy="0" r="3"/></g></svg>`
      );

    case 'oriental':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M20,2 L38,20 L20,38 L2,20 Z" fill="none" stroke="${color}" stroke-width="0.7"/><path d="M20,10 L30,20 L20,30 L10,20 Z" fill="none" stroke="${color}" stroke-width="0.5"/><circle cx="20" cy="20" r="2" fill="${color}"/></svg>`
      );

    case 'linen':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="none"/><path d="M0,2 L4,2" stroke="${color}" stroke-width="0.4"/><path d="M2,0 L2,4" stroke="${color}" stroke-width="0.2"/></svg>`
      );

    case 'stars-of-david':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><g transform="translate(25,25)" fill="none" stroke="${color}" stroke-width="0.7"><polygon points="0,-10 8.7,5 -8.7,5"/><polygon points="0,10 8.7,-5 -8.7,-5"/></g></svg>`
      );

    case 'chevron':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><polyline points="0,12 12,0 24,12" fill="none" stroke="${color}" stroke-width="0.7"/></svg>`
      );

    case 'marble':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="noise"><feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="4" seed="2"/><feDisplacementMap in="SourceGraphic" scale="30"/></filter><rect width="200" height="200" filter="url(#noise)" fill="${color}"/></svg>`
      );

    case 'botanical':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70"><g transform="translate(35,35)"><path d="M0,28 C-6,14 6,4 0,-28" fill="none" stroke="${color}" stroke-width="1.2"/><ellipse cx="-10" cy="4" rx="9" ry="4.5" fill="${color}" opacity="0.65" transform="rotate(-35 -10 4)"/><ellipse cx="10" cy="-8" rx="9" ry="4.5" fill="${color}" opacity="0.55" transform="rotate(25 10 -8)"/><ellipse cx="-8" cy="-18" rx="7" ry="3.5" fill="${color}" opacity="0.5" transform="rotate(-20 -8 -18)"/><circle cx="0" cy="-28" r="2.5" fill="${color}" opacity="0.5"/></g></svg>`
      );

    case 'moroccan-tiles':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><polygon points="24,3 28,16 39,10 32,21 46,24 32,27 39,38 28,32 24,45 20,32 9,38 16,27 2,24 16,21 9,10 20,16" fill="none" stroke="${color}" stroke-width="0.9" opacity="0.9"/><rect x="18" y="18" width="12" height="12" fill="none" stroke="${color}" stroke-width="0.6" transform="rotate(45 24 24)" opacity="0.6"/><circle cx="24" cy="24" r="2.5" fill="${color}" opacity="0.7"/></svg>`
      );

    case 'olive-branch':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><path d="M10,62 Q36,36 62,10" fill="none" stroke="${color}" stroke-width="1.3"/><ellipse cx="22" cy="50" rx="10" ry="4.5" fill="${color}" opacity="0.6" transform="rotate(-45 22 50)"/><ellipse cx="36" cy="36" rx="10" ry="4.5" fill="${color}" opacity="0.5" transform="rotate(-45 36 36)"/><ellipse cx="50" cy="22" rx="10" ry="4.5" fill="${color}" opacity="0.6" transform="rotate(-45 50 22)"/><circle cx="27" cy="44" r="3" fill="${color}" opacity="0.55"/><circle cx="45" cy="26" r="3" fill="${color}" opacity="0.55"/></svg>`
      );

    case 'hexagonal':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="60"><polygon points="26,2 50,15 50,45 26,58 2,45 2,15" fill="none" stroke="${color}" stroke-width="0.9"/><polygon points="26,12 40,20 40,40 26,48 12,40 12,20" fill="none" stroke="${color}" stroke-width="0.4" opacity="0.5"/></svg>`
      );

    case 'damask':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><g transform="translate(30,30)"><path d="M0,-18 L6,0 0,18 -6,0 Z" fill="none" stroke="${color}" stroke-width="0.8"/><ellipse cx="0" cy="-10" rx="4" ry="7" fill="${color}" opacity="0.5"/><ellipse cx="0" cy="10" rx="4" ry="7" fill="${color}" opacity="0.5"/><ellipse cx="-10" cy="0" rx="7" ry="4" fill="${color}" opacity="0.4"/><ellipse cx="10" cy="0" rx="7" ry="4" fill="${color}" opacity="0.4"/><circle cx="0" cy="0" r="2.5" fill="${color}" opacity="0.7"/><circle cx="0" cy="-18" r="1.5" fill="${color}" opacity="0.5"/><circle cx="0" cy="18" r="1.5" fill="${color}" opacity="0.5"/><circle cx="-18" cy="0" r="1.5" fill="${color}" opacity="0.5"/><circle cx="18" cy="0" r="1.5" fill="${color}" opacity="0.5"/></g></svg>`
      );

    case 'vine':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="44"><path d="M0,22 C12,10 24,34 40,22 C56,10 68,34 80,22" fill="none" stroke="${color}" stroke-width="1.2"/><ellipse cx="12" cy="13" rx="6" ry="3" fill="${color}" opacity="0.5" transform="rotate(-30 12 13)"/><ellipse cx="40" cy="13" rx="6" ry="3" fill="${color}" opacity="0.5"/><ellipse cx="68" cy="31" rx="6" ry="3" fill="${color}" opacity="0.5" transform="rotate(20 68 31)"/><circle cx="24" cy="30" r="2.5" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.6"/><circle cx="56" cy="14" r="2.5" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.6"/></svg>`
      );

    case 'art-nouveau':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="88"><path d="M22,2 C32,22 12,44 22,66 C32,88 12,88 22,88" fill="none" stroke="${color}" stroke-width="1.2"/><path d="M22,22 C12,17 6,27 12,33 C18,39 28,37 22,22" fill="${color}" opacity="0.45"/><path d="M22,50 C32,45 38,55 32,61 C26,67 16,65 22,50" fill="${color}" opacity="0.45"/><circle cx="22" cy="2" r="2" fill="${color}" opacity="0.6"/></svg>`
      );

    case 'ornament-star':
      // Étoile ornementale 8 branches façon papeterie (motif du faire-part de référence)
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84"><g transform="translate(42,42)" fill="none" stroke="${color}" stroke-width="0.9"><path d="M0,-30 L5,-5 L30,0 L5,5 L0,30 L-5,5 L-30,0 L-5,-5 Z"/><path d="M0,-16 L3,-3 L16,0 L3,3 L0,16 L-3,3 L-16,0 L-3,-3 Z" opacity="0.55"/><path d="M-19,-19 L-6,-6 M19,-19 L6,-6 M19,19 L6,6 M-19,19 L-6,6" opacity="0.5"/><circle r="1.8" fill="${color}" stroke="none" opacity="0.7"/></g></svg>`
      );

    case 'quatrefoil':
      // Petites croix perlées délicates (motif rose du faire-part de référence)
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46"><g transform="translate(23,23)" fill="${color}"><circle cx="0" cy="0" r="1.5"/><circle cx="0" cy="-6.5" r="2.3" opacity="0.85"/><circle cx="0" cy="6.5" r="2.3" opacity="0.85"/><circle cx="-6.5" cy="0" r="2.3" opacity="0.85"/><circle cx="6.5" cy="0" r="2.3" opacity="0.85"/><circle cx="0" cy="-11.5" r="1" opacity="0.5"/><circle cx="0" cy="11.5" r="1" opacity="0.5"/><circle cx="-11.5" cy="0" r="1" opacity="0.5"/><circle cx="11.5" cy="0" r="1" opacity="0.5"/></g></svg>`
      );

    case 'vertical-stripes':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><line x1="7" y1="0" x2="7" y2="14" stroke="${color}" stroke-width="0.8"/></svg>`
      );

    case 'horizontal-stripes':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><line x1="0" y1="7" x2="14" y2="7" stroke="${color}" stroke-width="0.8"/></svg>`
      );

    case 'thick-grid':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="${color}" stroke-width="1.4"/></svg>`
      );

    case 'small-squares':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><rect x="3" y="3" width="12" height="12" fill="none" stroke="${color}" stroke-width="0.7"/></svg>`
      );

    case 'paper-texture':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><filter id="pnoise"><feTurbulence type="fractalNoise" baseFrequency="0.75 0.55" numOctaves="4" stitchTiles="stitch" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0.18 0" in="noise"/></filter><rect width="80" height="80" filter="url(#pnoise)"/></svg>`
      );

    case 'canvas-texture':
      return buildSvgDataUri(
        `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><line x1="0" y1="4" x2="8" y2="4" stroke="${color}" stroke-width="0.35"/><line x1="4" y1="0" x2="4" y2="8" stroke="${color}" stroke-width="0.7"/></svg>`
      );

    default:
      return null;
  }
}

export function PatternOverlay({ patternId, color, opacity = 0.07, corners = false, behind = false }: PatternOverlayProps) {
  const z = behind ? -1 : 0;
  if (patternId === 'none') return null;

  const bg = getPatternBackground(patternId, color);
  if (!bg) return null;

  if (patternId === 'paper-arabesque') {
    // Décor (et non texture) : l'opacité du Studio règle son intensité sur une
    // échelle plus forte, sinon les volutes disparaissaient à 18 %.
    const intensity = Math.min(1, Math.max(0.08, opacity * 3.5));
    const corner: CSSProperties = { position: 'absolute', width: 'min(150px, 36%)', aspectRatio: '1', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', opacity: Math.min(1, intensity * 1.4) };
    return (
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: z }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: bg, backgroundRepeat: 'repeat', opacity: intensity }} />
        {corners ? (
          <>
            <div style={{ ...corner, top: 10, left: 10, backgroundImage: buildSvgDataUri(arabesqueCornerSvg(color)) }} />
            <div style={{ ...corner, bottom: 10, right: 10, backgroundImage: buildSvgDataUri(arabesqueCornerSvg(color, true)) }} />
          </>
        ) : null}
      </div>
    );
  }

  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: bg,
    backgroundRepeat: 'repeat',
    opacity,
    pointerEvents: 'none',
    zIndex: z,
  };

  return <div style={style} aria-hidden />;
}

/** Returns a CSS backgroundImage value for use in inline styles */
export function getPatternStyle(patternId: PatternId, color: string): CSSProperties {
  if (patternId === 'none') return {};
  const bg = getPatternBackground(patternId, color);
  if (!bg) return {};
  if (patternId === 'paper-arabesque') {
    // Vignette : volutes aux deux coins + grain
    return {
      backgroundImage: `${buildSvgDataUri(arabesqueCornerSvg(color))}, ${buildSvgDataUri(arabesqueCornerSvg(color, true))}, ${bg}`,
      backgroundPosition: 'top left, bottom right, 0 0',
      backgroundSize: '60%, 60%, 80px',
      backgroundRepeat: 'no-repeat, no-repeat, repeat',
    };
  }
  if (patternId === 'oriental-geometry') return { backgroundImage: bg, backgroundSize: '26px' };
  return { backgroundImage: bg };
}

/** Le motif floral d'une combinaison fait partie de l'identité Vintage Bleu :
 *  sur tous les autres thèmes, une combinaison ne change QUE les couleurs
 *  (avant, choisir « Olive & Beige » sur Classique donnait un rendu Vintage). */
export function usesComboFloral(theme: WeddingTheme): boolean {
  return theme.style === 'vintage-blue' && !!theme.floralPattern;
}

/**
 * FloralLayer — motif floral fourni par la combinaison de couleurs (Vintage Bleu).
 *
 * Réservé à la CARTE d'en-tête (hero) : il remplace le décor propre du
 * modèle à cet endroit précis, et nulle part ailleurs — le reste de la page
 * ne change que de couleurs. Image tuilée (jamais déformée), position /
 * opacité / filtre configurables par combinaison, voile léger pour la
 * lisibilité. Couche en `position: absolute` : le conteneur parent doit être
 * positionné, et son contenu placé au-dessus (`zIndex` ≥ 1).
 */
export function FloralLayer({ theme }: { theme: WeddingTheme }) {
  if (!usesComboFloral(theme)) return null;
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('${theme.floralPattern}')`,
          backgroundRepeat: 'repeat',
          backgroundSize: theme.floralTileSize ?? '440px',
          backgroundPosition: theme.floralPosition ?? 'top center',
          opacity: theme.floralOpacity ?? 1,
          filter: theme.floralFilter,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Voile léger : garde le contenu lisible sans masquer le motif */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: withAlpha(theme.backgroundColor, 0.38),
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  );
}

/**
 * HeroPattern — décor du hero : le motif floral de la combinaison (Vintage
 * Bleu uniquement), sinon la texture SVG du modèle choisie dans le Studio.
 */
export function HeroPattern({
  theme,
  color,
  opacity,
}: {
  theme: WeddingTheme;
  color: string;
  opacity?: number;
}) {
  if (usesComboFloral(theme)) return <FloralLayer theme={theme} />;
  return <PatternOverlay patternId={theme.patternId ?? 'none'} color={color} opacity={opacity ?? theme.patternOpacity ?? 0.07} corners />;
}

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, '0');
  return `#${m[1]}${m[2]}${m[3]}${a}`;
}
