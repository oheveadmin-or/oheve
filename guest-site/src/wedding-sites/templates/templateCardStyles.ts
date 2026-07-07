import type { CSSProperties } from 'react';

import type { WeddingSite } from '../types';

export function titleFontSize(titleSize: WeddingSite['theme']['titleSize']): string {
  const map = {
    small: 'clamp(1.75rem, 4cqw, 2.25rem)',
    medium: 'clamp(2rem, 5cqw, 2.75rem)',
    large: 'clamp(2.25rem, 6cqw, 3.25rem)',
    huge: 'clamp(2.5rem, 7cqw, 3.75rem)',
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
  if (theme.cardStyle === 'premium') {
    return {
      ...base,
      background: `linear-gradient(135deg, ${theme.secondaryColor}18 0%, ${theme.backgroundColor} 60%, ${theme.secondaryColor}10 100%)`,
      border: `1px solid ${theme.primaryColor}55`,
      boxShadow: `0 4px 24px ${theme.primaryColor}22, inset 0 1px 0 ${theme.primaryColor}22`,
    };
  }
  if (theme.cardStyle === 'double-border') {
    return {
      ...base,
      background: theme.backgroundColor || '#FBF8F1',
      border: `1.5px solid ${theme.primaryColor}66`,
      boxShadow: `inset 0 0 0 1.5px ${theme.primaryColor}33, 0 4px 20px -6px ${theme.primaryColor}20`,
    };
  }
  if (theme.cardStyle === 'luxe') {
    return {
      ...base,
      background: `${theme.secondaryColor}12`,
      border: `1px solid ${theme.primaryColor}66`,
      boxShadow: `0 20px 60px ${theme.primaryColor}25, 0 1px 0 ${theme.primaryColor}44 inset`,
    };
  }
  return { ...base, background: `${theme.secondaryColor}2a`, border: `1px solid ${theme.primaryColor}29` };
}
