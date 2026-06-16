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
