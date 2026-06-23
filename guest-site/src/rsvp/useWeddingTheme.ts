import { useMemo } from 'react';

import type { CSSProperties } from 'react';

import type { RSVPForm } from './types';

import type { WeddingSite } from '../wedding-sites/types';

/** Styles dérivés du thème du mini-site (+ overrides RSVP optionnelles). */
export function useWeddingTheme(site: WeddingSite, rsvpForm?: RSVPForm | null) {
  return useMemo(() => mergeWeddingUi(site, rsvpForm), [site, rsvpForm]);
}

export function mergeWeddingUi(site: WeddingSite, rsvpForm?: RSVPForm | null) {
  const t = site.theme;
  const o = rsvpForm?.theme;

  const primaryColor = o?.primaryColor ?? t.primaryColor ?? '#8F947F';
  const secondaryColor = o?.secondaryColor ?? t.secondaryColor ?? '#6B7163';
  const backgroundColor = o?.backgroundColor ?? t.backgroundColor ?? '#F6F2EA';
  const textColor = o?.textColor ?? t.textColor ?? '#2C2C2C';
  const fontFamily = o?.fontFamily ?? t.fontFamily ?? 'Georgia, serif';
  const borderRadius = o?.borderRadius ?? t.borderRadius ?? 12;
  const cardStyle = o?.cardStyle ?? t.cardStyle ?? 'default';
  const stylePreset = o?.style ?? t.style ?? 'classic';

  const isDarkish =
    backgroundColor.toLowerCase().includes('#0') &&
    parseInt(backgroundColor.slice(1, 3), 16) < 56;

  const page: CSSProperties = {
    minHeight: '100vh',
    fontFamily,
    backgroundColor,
    backgroundImage:
      stylePreset === 'romantic'
        ? `linear-gradient(180deg, ${secondaryColor}33 0%, ${backgroundColor} 40%)`
        : stylePreset === 'luxury' || stylePreset === 'royal'
          ? `radial-gradient(ellipse at 50% 0%, ${primaryColor}22 0%, transparent 48%)`
          : undefined,
    color: textColor,
    padding: 'clamp(1rem, 4vw, 2rem)',
  };

  const card: CSSProperties = {
    maxWidth: 520,
    margin: '0 auto',
    borderRadius,
    padding: '1.75rem 1.35rem',
    border:
      cardStyle === 'outline'
        ? `1px solid ${primaryColor}44`
        : cardStyle === 'glass'
          ? '1px solid rgba(255,255,255,0.14)'
          : `1px solid ${primaryColor}22`,
    background:
      cardStyle === 'glass'
        ? `rgba(${isDarkish ? '255,255,255' : '0,0,0'},0.06)`
        : cardStyle === 'outline'
          ? 'transparent'
          : `${isDarkish ? '#fff1' : '#fff'}`,
    boxShadow:
      cardStyle === 'shadow'
        ? `0 28px 64px ${primaryColor}${isDarkish ? '22' : '12'}`
        : undefined,
    backdropFilter: cardStyle === 'glass' ? 'blur(14px)' : undefined,
  };

  const heading: CSSProperties = {
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontSize: '0.78rem',
    color: secondaryColor,
    marginBottom: '0.25rem',
  };

  const titleMain: CSSProperties = {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: 700,
    margin: '0 0 1rem',
    lineHeight: 1.15,
    color: textColor,
  };

  const inputBase: CSSProperties = {
    width: '100%',
    padding: '0.7rem 0.85rem',
    borderRadius: Math.max(borderRadius - 4, 6),
    border: `1px solid ${primaryColor}55`,
    background: isDarkish ? 'rgba(255,255,255,0.07)' : '#fff',
    color: textColor,
    fontSize: '1rem',
    outline: 'none',
  };

  const label: CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: 6,
    fontSize: '0.88rem',
  };

  const submitBtn: CSSProperties = {
    width: '100%',
    padding: '0.95rem 1rem',
    borderRadius: Math.max(borderRadius, 12),
    border: 'none',
    fontWeight: 800,
    fontSize: '0.92rem',
    letterSpacing: '0.12em',
    cursor: 'pointer',
    marginTop: 8,
    color: '#fff',
    background: `linear-gradient(120deg, ${primaryColor}, ${secondaryColor})`,
    boxShadow: `0 12px 36px ${primaryColor}55`,
    transition: 'transform 0.2s ease, opacity 0.2s ease',
  };

  return {
    primaryColor,
    secondaryColor,
    textColor,
    page,
    card,
    heading,
    titleMain,
    inputBase,
    label,
    submitBtn,
    isDarkish,
    stylePreset,
  };
}
