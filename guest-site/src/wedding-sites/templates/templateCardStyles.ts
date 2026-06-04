import type { CSSProperties } from 'react';

import type { WeddingSite } from '../types';

export function titleFontSize(titleSize: WeddingSite['theme']['titleSize']): string {
  const map = {
    small: 'clamp(1.75rem, 4vw, 2.25rem)',
    medium: 'clamp(2rem, 5vw, 2.75rem)',
    large: 'clamp(2.25rem, 6vw, 3.25rem)',
    huge: 'clamp(2.5rem, 7vw, 3.75rem)',
  };
  return map[titleSize];
}

type CardOpts = { theme: WeddingSite['theme']; padded?: boolean };

export function cardStyleSurface({ theme, padded = true }: CardOpts): CSSProperties {
  const base: CSSProperties = {
    borderRadius: theme.borderRadius,
    padding: padded ? '1.5rem 1.25rem' : undefined,
    transition: 'transform 0.35s ease, box-shadow 0.35s ease',
  };
  if (theme.cardStyle === 'glass') {
    return {
      ...base,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      backdropFilter: 'blur(12px)',
    };
  }
  if (theme.cardStyle === 'outline') {
    return { ...base, background: 'transparent', border: `1px solid ${theme.primaryColor}33` };
  }
  if (theme.cardStyle === 'shadow') {
    return {
      ...base,
      background: theme.backgroundColor === '#faf7f2' ? '#fff' : `${theme.secondaryColor}14`,
      border: `1px solid ${theme.primaryColor}22`,
      boxShadow: `0 16px 48px ${theme.primaryColor}18`,
    };
  }
  return { ...base, background: `${theme.secondaryColor}2a`, border: `1px solid ${theme.primaryColor}29` };
}
