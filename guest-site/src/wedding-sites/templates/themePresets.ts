/**
 * Full structural presets for each style ID.
 * Each preset defines not just colors but also the hero layout,
 * background pattern, section separators, and card style.
 * This is what makes each theme visually distinct.
 */
import type { WeddingTheme } from '../types';
import type { ThemeStyle } from '../types';

type PresetOverride = Partial<WeddingTheme>;

const PRESETS: Record<ThemeStyle, PresetOverride> = {
  // ─── Élégance classique ────────────────────────────────────────────────────
  classic: {
    heroStyle: 'faire-part',
    patternId: 'none',
    separatorStyle: 'diamond',
    cardStyle: 'shadow',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
  },

  // ─── Luxe sombre ──────────────────────────────────────────────────────────
  luxury: {
    heroStyle: 'luxe',
    patternId: 'dots',
    separatorStyle: 'stars',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.08,
  },

  // ─── Art Déco ─────────────────────────────────────────────────────────────
  'art-deco': {
    heroStyle: 'art-deco',
    patternId: 'deco-geo',
    separatorStyle: 'double-line',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.06,
  },

  // ─── Romantique ───────────────────────────────────────────────────────────
  romantic: {
    heroStyle: 'monogram',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.07,
  },

  // ─── Boho ─────────────────────────────────────────────────────────────────
  boho: {
    heroStyle: 'editorial',
    patternId: 'linen',
    separatorStyle: 'floral',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.12,
  },

  // ─── Dark Romance ─────────────────────────────────────────────────────────
  'dark-romance': {
    heroStyle: 'luxe',
    patternId: 'lines-diagonal',
    separatorStyle: 'arabesque',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.05,
  },

  // ─── Céleste ──────────────────────────────────────────────────────────────
  celestial: {
    heroStyle: 'luxe',
    patternId: 'stars-of-david',
    separatorStyle: 'stars',
    cardStyle: 'glass',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.1,
  },

  // ─── Navy & Or ────────────────────────────────────────────────────────────
  'navy-gold': {
    heroStyle: 'faire-part',
    patternId: 'grid',
    separatorStyle: 'double-line',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.04,
  },

  // ─── Parisien ─────────────────────────────────────────────────────────────
  parisian: {
    heroStyle: 'magazine',
    patternId: 'dots',
    separatorStyle: 'thin-line',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
    patternOpacity: 0.06,
  },

  // ─── Rose Vintage ─────────────────────────────────────────────────────────
  'vintage-rose': {
    heroStyle: 'faire-part',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'outline',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.09,
  },

  // ─── Cerisier ─────────────────────────────────────────────────────────────
  'cherry-blossom': {
    heroStyle: 'monogram',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'glass',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
    patternOpacity: 0.1,
  },

  // ─── Floral ───────────────────────────────────────────────────────────────
  floral: {
    heroStyle: 'monogram',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.08,
  },

  // ─── Garden Party ─────────────────────────────────────────────────────────
  'garden-party': {
    heroStyle: 'editorial',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.1,
  },

  // ─── Tropical ─────────────────────────────────────────────────────────────
  tropical: {
    heroStyle: 'split',
    patternId: 'floral-subtle',
    separatorStyle: 'wave',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.12,
  },

  // ─── Émeraude ─────────────────────────────────────────────────────────────
  'emerald-luxury': {
    heroStyle: 'luxe',
    patternId: 'deco-geo',
    separatorStyle: 'diamond',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.05,
  },

  // ─── Marrakech ────────────────────────────────────────────────────────────
  marrakech: {
    heroStyle: 'art-deco',
    patternId: 'oriental',
    separatorStyle: 'arabesque',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.1,
  },

  // ─── Desert Sunset ────────────────────────────────────────────────────────
  'desert-sunset': {
    heroStyle: 'split',
    patternId: 'linen',
    separatorStyle: 'wave',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.12,
  },

  // ─── Rustic Chic ──────────────────────────────────────────────────────────
  'rustic-chic': {
    heroStyle: 'editorial',
    patternId: 'linen',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.15,
  },

  // ─── Feuille d'Or ─────────────────────────────────────────────────────────
  'gold-leaf': {
    heroStyle: 'faire-part',
    patternId: 'deco-geo',
    separatorStyle: 'double-line',
    cardStyle: 'premium',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.05,
  },

  // ─── Ivoire & Dentelle ────────────────────────────────────────────────────
  'ivory-lace': {
    heroStyle: 'faire-part',
    patternId: 'dots',
    separatorStyle: 'floral',
    cardStyle: 'outline',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.08,
  },

  // ─── Oriental ─────────────────────────────────────────────────────────────
  oriental: {
    heroStyle: 'art-deco',
    patternId: 'oriental',
    separatorStyle: 'arabesque',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.08,
  },

  // ─── Sépharade ────────────────────────────────────────────────────────────
  sephardic: {
    heroStyle: 'luxe',
    patternId: 'oriental',
    separatorStyle: 'arabesque',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.08,
  },

  // ─── Royal ────────────────────────────────────────────────────────────────
  royal: {
    heroStyle: 'luxe',
    patternId: 'deco-geo',
    separatorStyle: 'stars',
    cardStyle: 'premium',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.06,
  },

  // ─── Moderne ──────────────────────────────────────────────────────────────
  modern: {
    heroStyle: 'magazine',
    patternId: 'none',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  },

  // ─── Minimal ──────────────────────────────────────────────────────────────
  minimal: {
    heroStyle: 'minimal',
    patternId: 'none',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  },

  // ─── Black Tie ────────────────────────────────────────────────────────────
  'black-tie': {
    heroStyle: 'art-deco',
    patternId: 'none',
    separatorStyle: 'double-line',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
  },

  // ─── Nordic ───────────────────────────────────────────────────────────────
  'nordic-minimal': {
    heroStyle: 'minimal',
    patternId: 'none',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
  },

  // ─── Tel Aviv ─────────────────────────────────────────────────────────────
  'tel-aviv': {
    heroStyle: 'magazine',
    patternId: 'none',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  },

  // ─── Minuit Bleu ──────────────────────────────────────────────────────────
  'midnight-blue': {
    heroStyle: 'split',
    patternId: 'stars-of-david',
    separatorStyle: 'stars',
    cardStyle: 'glass',
    cornerDecor: false,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.06,
  },

  // ─── Méditerranéen ────────────────────────────────────────────────────────
  mediterranean: {
    heroStyle: 'split',
    patternId: 'chevron',
    separatorStyle: 'wave',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
    patternOpacity: 0.06,
  },

  // ─── Provence ─────────────────────────────────────────────────────────────
  provence: {
    heroStyle: 'editorial',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.1,
  },

  // ─── Jardin Anglais ───────────────────────────────────────────────────────
  'english-garden': {
    heroStyle: 'monogram',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.08,
  },

  // ─── Minimaliste Blanc ────────────────────────────────────────────────────
  'minimal-white': {
    heroStyle: 'minimal',
    patternId: 'none',
    separatorStyle: 'none',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  },
};

/** Merge preset overrides into the theme, preserving explicit user values */
export function applyThemePreset(theme: WeddingTheme): WeddingTheme {
  const preset = PRESETS[theme.style] ?? {};
  return {
    ...theme,
    heroStyle: theme.heroStyle ?? preset.heroStyle ?? 'editorial',
    patternId: theme.patternId ?? preset.patternId ?? 'none',
    patternOpacity: theme.patternOpacity ?? preset.patternOpacity ?? 0.07,
    separatorStyle: theme.separatorStyle ?? preset.separatorStyle ?? 'none',
    cardStyle: theme.cardStyle ?? preset.cardStyle ?? 'shadow',
    cornerDecor: theme.cornerDecor ?? preset.cornerDecor ?? false,
    fontFamily: theme.fontFamily ?? preset.fontFamily ?? theme.fontFamily,
  };
}

