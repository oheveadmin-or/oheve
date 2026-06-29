/**
 * Full structural presets for each style ID.
 * Each preset defines not just colors but also the hero layout,
 * background pattern, section separators, and card style.
 *
 * Distribution of hero styles (max 3 per hero to ensure real visual diversity):
 *   letterpress : classic, ivory-lace, vintage-rose
 *   royal       : royal, black-tie, navy-gold
 *   cinematic   : celestial, midnight-blue, dark-romance
 *   garden      : garden-party, cherry-blossom, floral
 *   art-deco    : art-deco, marrakech, oriental
 *   luxe        : luxury, emerald-luxury, sephardic
 *   faire-part  : gold-leaf, parisian
 *   monogram    : romantic, english-garden
 *   editorial   : boho, rustic-chic, provence
 *   magazine    : modern, tel-aviv
 *   split       : desert-sunset, mediterranean, tropical
 *   minimal     : minimal, nordic-minimal, minimal-white
 */
import type { WeddingTheme } from '../types';
import type { ThemeStyle } from '../types';

type PresetOverride = Partial<WeddingTheme>;

const PRESETS: Record<ThemeStyle, PresetOverride> = {
  // ─── LETTERPRESS GROUP ────────────────────────────────────────────────────
  classic: {
    heroStyle: 'letterpress',
    patternId: 'linen',
    separatorStyle: 'diamond',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.18,
  },
  'ivory-lace': {
    heroStyle: 'letterpress',
    patternId: 'dots',
    separatorStyle: 'floral',
    cardStyle: 'outline',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.12,
  },
  'vintage-rose': {
    heroStyle: 'letterpress',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'outline',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.14,
  },

  // ─── ROYAL GROUP ──────────────────────────────────────────────────────────
  royal: {
    heroStyle: 'royal',
    patternId: 'deco-geo',
    separatorStyle: 'stars',
    cardStyle: 'premium',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.09,
  },
  'black-tie': {
    heroStyle: 'royal',
    patternId: 'none',
    separatorStyle: 'double-line',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
  },
  'navy-gold': {
    heroStyle: 'royal',
    patternId: 'stars-of-david',
    separatorStyle: 'double-line',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.07,
  },

  // ─── CINEMATIC GROUP ──────────────────────────────────────────────────────
  celestial: {
    heroStyle: 'cinematic',
    patternId: 'stars-of-david',
    separatorStyle: 'stars',
    cardStyle: 'glass',
    cornerDecor: false,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.14,
  },
  'midnight-blue': {
    heroStyle: 'cinematic',
    patternId: 'damask',
    separatorStyle: 'stars',
    cardStyle: 'glass',
    cornerDecor: false,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.08,
  },
  'dark-romance': {
    heroStyle: 'cinematic',
    patternId: 'lines-diagonal',
    separatorStyle: 'arabesque',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.07,
  },

  // ─── GARDEN GROUP ─────────────────────────────────────────────────────────
  'garden-party': {
    heroStyle: 'garden',
    patternId: 'botanical',
    separatorStyle: 'floral',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.12,
  },
  'cherry-blossom': {
    heroStyle: 'garden',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'glass',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
    patternOpacity: 0.14,
  },
  floral: {
    heroStyle: 'garden',
    patternId: 'olive-branch',
    separatorStyle: 'floral',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.12,
  },

  // ─── ART-DECO GROUP ───────────────────────────────────────────────────────
  'art-deco': {
    heroStyle: 'art-deco',
    patternId: 'deco-geo',
    separatorStyle: 'double-line',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.08,
  },
  marrakech: {
    heroStyle: 'art-deco',
    patternId: 'moroccan-tiles',
    separatorStyle: 'arabesque',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.12,
  },
  oriental: {
    heroStyle: 'art-deco',
    patternId: 'oriental',
    separatorStyle: 'arabesque',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.1,
  },

  // ─── LUXE GROUP ───────────────────────────────────────────────────────────
  luxury: {
    heroStyle: 'luxe',
    patternId: 'dots',
    separatorStyle: 'stars',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.12,
  },
  'emerald-luxury': {
    heroStyle: 'luxe',
    patternId: 'deco-geo',
    separatorStyle: 'diamond',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.07,
  },
  sephardic: {
    heroStyle: 'luxe',
    patternId: 'oriental',
    separatorStyle: 'arabesque',
    cardStyle: 'luxe',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.1,
  },

  // ─── FAIRE-PART GROUP ─────────────────────────────────────────────────────
  'gold-leaf': {
    heroStyle: 'faire-part',
    patternId: 'deco-geo',
    separatorStyle: 'double-line',
    cardStyle: 'premium',
    cornerDecor: true,
    fontFamily: "'Cinzel', serif",
    patternOpacity: 0.07,
  },
  parisian: {
    heroStyle: 'faire-part',
    patternId: 'dots',
    separatorStyle: 'thin-line',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
    patternOpacity: 0.09,
  },

  // ─── MONOGRAM GROUP ───────────────────────────────────────────────────────
  romantic: {
    heroStyle: 'monogram',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Playfair Display', Georgia, serif",
    patternOpacity: 0.12,
  },
  'english-garden': {
    heroStyle: 'monogram',
    patternId: 'botanical',
    separatorStyle: 'floral',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.12,
  },

  // ─── EDITORIAL GROUP ──────────────────────────────────────────────────────
  boho: {
    heroStyle: 'editorial',
    patternId: 'linen',
    separatorStyle: 'floral',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.18,
  },
  'rustic-chic': {
    heroStyle: 'editorial',
    patternId: 'vine',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.14,
  },
  provence: {
    heroStyle: 'editorial',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.14,
  },

  // ─── MAGAZINE GROUP ───────────────────────────────────────────────────────
  modern: {
    heroStyle: 'magazine',
    patternId: 'none',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  },
  'tel-aviv': {
    heroStyle: 'magazine',
    patternId: 'dots',
    separatorStyle: 'thin-line',
    cardStyle: 'outline',
    cornerDecor: false,
    fontFamily: "'Heebo', system-ui, sans-serif",
    patternOpacity: 0.1,
  },

  // ─── SPLIT GROUP ──────────────────────────────────────────────────────────
  'desert-sunset': {
    heroStyle: 'split',
    patternId: 'linen',
    separatorStyle: 'wave',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.18,
  },
  mediterranean: {
    heroStyle: 'split',
    patternId: 'chevron',
    separatorStyle: 'wave',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
    patternOpacity: 0.1,
  },
  tropical: {
    heroStyle: 'split',
    patternId: 'hexagonal',
    separatorStyle: 'wave',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Josefin Sans', sans-serif",
    patternOpacity: 0.12,
  },

  // ─── MINIMAL GROUP ────────────────────────────────────────────────────────
  minimal: {
    heroStyle: 'minimal',
    patternId: 'none',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  },
  'nordic-minimal': {
    heroStyle: 'minimal',
    patternId: 'grid',
    separatorStyle: 'thin-line',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Raleway', sans-serif",
    patternOpacity: 0.05,
  },
  'minimal-white': {
    heroStyle: 'minimal',
    patternId: 'none',
    separatorStyle: 'none',
    cardStyle: 'solid',
    cornerDecor: false,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
  },

  // ─── VINTAGE GROUP (bleu poussiéreux + ivoire) ────────────────────────────
  'vintage-blue': {
    heroStyle: 'faire-part',
    patternId: 'floral-subtle',
    separatorStyle: 'floral',
    cardStyle: 'double-border',
    cornerDecor: true,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    patternOpacity: 0.1,
  },

  // ─── STRIPES EDITORIAL (noir & blanc, rayures CSS) ───────────────────────
  'stripes-editorial': {
    heroStyle: 'editorial',
    patternId: 'none',
    separatorStyle: 'none',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Playfair Display', Georgia, serif",
  },

  // ─── EDITORIAL CARDS (papeterie premium en cartes) ────────────────────────
  // Modèle autonome : routé directement vers EditorialCardsTemplate
  // (cf. template-selector). Le preset reste défini pour la cohérence du type.
  'editorial-cards': {
    heroStyle: 'editorial',
    patternId: 'none',
    separatorStyle: 'none',
    cardStyle: 'shadow',
    cornerDecor: false,
    fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  },
};

/** Merge preset overrides into the theme, preserving explicit user values */
export function applyThemePreset(theme: WeddingTheme): WeddingTheme {
  const preset = PRESETS[theme.style] ?? {};
  const base = {
    ...theme,
    heroStyle: theme.heroStyle ?? preset.heroStyle ?? 'editorial',
    patternId: theme.patternId ?? preset.patternId ?? 'none',
    patternOpacity: theme.patternOpacity ?? preset.patternOpacity ?? 0.07,
    separatorStyle: theme.separatorStyle ?? preset.separatorStyle ?? 'none',
    cardStyle: theme.cardStyle ?? preset.cardStyle ?? 'shadow',
    cornerDecor: theme.cornerDecor ?? preset.cornerDecor ?? false,
    fontFamily: theme.fontFamily ?? preset.fontFamily ?? theme.fontFamily,
  };
  // Force canonical colours for vintage-blue regardless of any saved default values
  if (theme.style === 'vintage-blue') {
    return {
      ...base,
      backgroundColor: '#F4F3EA',
      primaryColor: '#434A56',
      secondaryColor: '#A8B6C3',
      textColor: '#3A414E',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    };
  }
  return base;
}
