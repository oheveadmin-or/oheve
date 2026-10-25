/**
 * Oheve — Charte graphique officielle
 * Palette: Blanc ivoire · Blanc pur · Vert sauge · Vert olive · Grège · Anthracite chaud
 */

export const C = {
  // ── Couleurs principales ───────────────────────────────────────
  sauge:      '#929B83',   // vert sauge (accent primaire, bouton central)
  saugeDark:  '#747E68',   // vert olive (icônes, actions, texte actif)
  saugePale:  '#F5F2ED',   // grège très clair (pastilles, détails)

  beige:      '#ECE8E0',   // grège (cartes secondaires)
  ivoire:     '#FCFBF9',   // blanc ivoire (fond de l'application)
  taupe:      '#E2DED5',   // grège soutenu (bordures, séparateurs)
  moka:       '#5C5F57',   // anthracite adouci (éléments foncés)

  // ── Textes ────────────────────────────────────────────────────
  textDark:   '#343630',   // anthracite chaud (titres, textes importants)
  textMid:    '#5C5F57',   // corps
  textLight:  '#9A9C93',   // labels, hints
  textInvert: '#FFFFFF',   // sur fonds sombres

  // ── Fond & surfaces ───────────────────────────────────────────
  background: '#FCFBF9',   // blanc ivoire (fond écran)
  card:       '#FFFFFF',   // blanc pur (cartes, navigation)
  cardAlt:    '#F5F2ED',   // grège très clair
  border:     'transparent',   // bordures neutralisées

  // ── États ─────────────────────────────────────────────────────
  success:    '#747E68',   // vert olive (confirmé)
  successPale:'#F5F2ED',
  warning:    '#B99B74',   // ambre chaud
  warningPale:'#F2E9DE',
  error:      '#C17E7E',   // rouge doux
  errorPale:  '#F5E8E8',

  // ── Shadow ────────────────────────────────────────────────────
  shadow:     '#343630',
} as const;

export const RADIUS = {
  sm:  10,
  md:  16,
  lg:  24,
  xl:  32,
  pill: 999,
} as const;

// Police de titre : alias chargés dans app/_layout.tsx (Fraunces, proche de The Seasons)
export const SERIF = {
  regular:  'OheveSerif-Regular',
  medium:   'OheveSerif-Medium',
  semibold: 'OheveSerif-SemiBold',
} as const;

export const FONT = {
  title:    { fontFamily: SERIF.medium },
  subtitle: { fontFamily: SERIF.regular },
  body:     { fontFamily: 'System', fontWeight: '400' as const },
  caption:  { fontFamily: 'System', fontWeight: '400' as const },
} as const;
