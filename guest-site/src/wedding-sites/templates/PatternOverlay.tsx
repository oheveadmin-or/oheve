import type { CSSProperties } from 'react';
import type { PatternId } from '../types';

interface PatternOverlayProps {
  patternId: PatternId;
  color: string;
  opacity?: number;
}

function buildSvgDataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function getPatternBackground(patternId: PatternId, color: string): string | null {
  switch (patternId) {
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

export function PatternOverlay({ patternId, color, opacity = 0.07 }: PatternOverlayProps) {
  if (patternId === 'none') return null;

  const bg = getPatternBackground(patternId, color);
  if (!bg) return null;

  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: bg,
    backgroundRepeat: 'repeat',
    opacity,
    pointerEvents: 'none',
    zIndex: 0,
  };

  return <div style={style} aria-hidden />;
}

/** Returns a CSS backgroundImage value for use in inline styles */
export function getPatternStyle(patternId: PatternId, color: string): CSSProperties {
  if (patternId === 'none') return {};
  const bg = getPatternBackground(patternId, color);
  if (!bg) return {};
  return { backgroundImage: bg };
}
