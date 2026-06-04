/**
 * Oheve — Charte graphique officielle
 * Palette: Sauge · Beige Doux · Ivoire · Taupé · Moka
 */

export const C = {
  // ── Couleurs principales ───────────────────────────────────────
  sauge:      '#8F947F',   // vert contrat (accent primaire)
  saugeDark:  '#757B68',   // vert contrat foncé (texte actif)
  saugePale:  '#E4E7DC',   // vert très clair (fonds pill, badge)

  beige:      '#D7C7B5',   // beige lin/sable
  ivoire:     '#F6F2EA',   // ivoire (fond général)
  taupe:      '#C7B7A5',   // taupé (bordures, séparateurs)
  moka:       '#7B7063',   // moka (éléments foncés, accents)

  // ── Textes ────────────────────────────────────────────────────
  textDark:   '#3C352F',   // titres principaux
  textMid:    '#665D54',   // corps
  textLight:  '#9A9288',   // labels, hints
  textInvert: '#FFFFFF',   // sur fonds sombres

  // ── Fond & surfaces ───────────────────────────────────────────
  background: '#F6F2EA',   // fond écran
  card:       '#F2EDE4',   // contraste doux pour les blocs
  cardAlt:    '#EFE9DE',   // contraste doux secondaire
  border:     'transparent',   // bordures neutralisées

  // ── États ─────────────────────────────────────────────────────
  success:    '#757B68',   // vert (confirmé)
  successPale:'#E4E7DC',
  warning:    '#B99B74',   // ambre chaud
  warningPale:'#F2E9DE',
  error:      '#C17E7E',   // rouge doux
  errorPale:  '#F5E8E8',

  // ── Shadow ────────────────────────────────────────────────────
  shadow:     '#7B7063',
} as const;

export const RADIUS = {
  sm:  10,
  md:  16,
  lg:  24,
  xl:  32,
  pill: 999,
} as const;

export const FONT = {
  title:    { fontFamily: 'System', fontWeight: '700' as const },
  subtitle: { fontFamily: 'System', fontWeight: '500' as const },
  body:     { fontFamily: 'System', fontWeight: '400' as const },
  caption:  { fontFamily: 'System', fontWeight: '400' as const },
} as const;
