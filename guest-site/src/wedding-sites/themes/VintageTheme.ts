/**
 * VintageTheme.ts — Preset « Vintage » (bleu poussiéreux + ivoire)
 *
 * Fichier de THÈME pur : il ne contient QUE des variables de design.
 * Aucun composant métier ne doit coder une couleur en dur — tout lit ici.
 *
 * Ambiance : vintage · élégance · romantique · raffiné · luxe discret ·
 * bleu poussiéreux · ivoire · papeterie haut de gamme · invitation classique ·
 * atmosphère intemporelle.
 *
 * Pour décliner un nouveau thème : copier ce fichier, changer les valeurs.
 * La forme (`VintageThemeTokens`) sert de contrat partagé entre presets.
 */

export type VintageThemeTokens = typeof VintageTheme;

export const VintageTheme = {
  /** Identifiant + métadonnées du preset */
  meta: {
    id: 'vintage-blue',
    label: 'Vintage Bleu',
    description: 'Bleu poussiéreux & ivoire, papeterie haut de gamme, invitation classique intemporelle',
  },

  // ─── COULEURS ──────────────────────────────────────────────────────────────
  colors: {
    /** Bleu-gris profond — couleur signature (bordures, titres, traits) */
    primary: '#434A56',
    /** Bleu plus profond — ombrages, hover */
    primaryDeep: '#2f3540aa',
    primaryDeepSolid: '#2f3540',
    /** Bleu poussiéreux — textes secondaires, ornements aquarelle */
    primarySoft: '#6D788A',
    /** Ivoire — fond général des cartes papeterie */
    ivory: '#F4F3EA',
    /** Crème — fond général du site */
    cream: '#F4F3EA',
    /** Taupe / moka — cadre photographique extérieur, textures */
    taupe: '#8A7A68',
    taupeSoft: '#B7A892',
    /** Texte principal (sur ivoire) */
    ink: '#3A414E',
    /** Texte secondaire / sous-titres (sur ivoire) */
    inkMuted: '#6D788A',
    /** Texte sur les sections bleues */
    onPrimary: '#F5F0E4',
    onPrimaryMuted: '#D7D2C4',
    /** Lignes & filets décoratifs */
    line: '#C9BDA6',
    lineOnPrimary: '#9FAFC4',
    /** États du formulaire */
    fieldBg: '#FFFFFF',
    fieldBorder: '#C9BDA6',
    fieldFocus: '#44597B',
    radioActive: '#A23B3B', // pastille rouge brique de l'inspiration
  },

  // ─── TYPOGRAPHIE ───────────────────────────────────────────────────────────
  fonts: {
    /** Titres gravés façon faire-part (Playfair Display Bold pour le style Birthday) */
    display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
    /** Script calligraphique (Great Vibes pour le style « Party ») */
    script: "'Great Vibes', 'Pinyon Script', cursive",
    /** Corps de texte & labels (petites capitales Montserrat / Cinzel) */
    body: "'Cinzel', 'Montserrat', 'Cormorant Garamond', Georgia, serif",
  },

  /** Tailles de titres (clamp pour le responsive) */
  titleSizes: {
    hero: 'clamp(2.6rem, 6vw, 3.9rem)',     // « BIRTHDAY » / prénoms
    script: 'clamp(2.4rem, 6.5vw, 3.4rem)', // « Party »
    section: 'clamp(1.5rem, 3.4vw, 2.1rem)',// titres de section bleus
    card: '1.15rem',
    eyebrow: '0.78rem',                      // sur-titre « ПРИГЛАШЕНИЕ »
  },

  /** Style des sous-titres / eyebrows */
  subtitle: {
    letterSpacing: '0.32em',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    fontSize: '0.78rem',
    lineHeight: 1.6,
  },

  /** Réglages texte courant */
  text: {
    bodySize: '0.98rem',
    bodyLineHeight: 1.85,
    labelLetterSpacing: '0.16em',
  },

  // ─── ESPACEMENTS ───────────────────────────────────────────────────────────
  spacing: {
    xs: '0.5rem',
    sm: '0.85rem',
    md: '1.4rem',
    lg: '2.2rem',
    xl: '3.4rem',
    section: '4rem',
    cardPadding: '2.4rem 1.9rem',
    bluePadding: '3rem 1.9rem',
  },

  // ─── RAYONS ────────────────────────────────────────────────────────────────
  radius: {
    card: 18,
    blueSection: 26, // grand arrondi des blocs bleus de l'inspiration
    field: 4,
    pill: 999,
    arch: 280, // rayon haut des cartes en arche
  },

  // ─── BORDURES & FILETS ─────────────────────────────────────────────────────
  borders: {
    hairline: '1px',
    frame: '2.5px',
    frameInner: '1px',
    width: '1px',
    style: 'solid',
  },

  // ─── OMBRES ────────────────────────────────────────────────────────────────
  shadows: {
    card: '0 18px 50px -28px rgba(52, 70, 97, 0.45)',
    blue: '0 22px 60px -30px rgba(52, 70, 97, 0.7)',
    soft: '0 8px 24px -16px rgba(52, 70, 97, 0.35)',
    inset: 'inset 0 0 0 1px rgba(201, 189, 166, 0.6)',
  },

  // ─── FONDS & TEXTURES ──────────────────────────────────────────────────────
  backgrounds: {
    page: '#F2EFE6',
    /** Léger grain papier — texture papeterie ivoire */
    paper:
      'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.7) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(35,56,83,0.04) 0%, transparent 50%)',
    /** Voile bleu subtil du cadre extérieur */
    mochaVeil: 'linear-gradient(160deg, rgba(35,56,83,0.08) 0%, rgba(35,56,83,0.02) 100%)',
    card: '#F7F4ED',
    blueSection: '#44597B',
    blueGradient: 'linear-gradient(165deg, #4C6184 0%, #3C4F70 100%)',
  },

  // ─── BOUTONS ───────────────────────────────────────────────────────────────
  buttons: {
    primary: {
      background: 'transparent',
      color: '#F5F0E4',
      border: '1px solid #D7D2C4',
      borderRadius: 4,
      padding: '0.75rem 2.4rem',
      letterSpacing: '0.22em',
      textTransform: 'uppercase' as const,
      fontWeight: 600,
      fontSize: '0.8rem',
    },
    secondary: {
      background: '#44597B',
      color: '#F5F0E4',
      border: '1px solid #44597B',
      borderRadius: 4,
      padding: '0.75rem 2.4rem',
      letterSpacing: '0.22em',
      textTransform: 'uppercase' as const,
      fontWeight: 600,
      fontSize: '0.8rem',
    },
  },

  // ─── CARTES ────────────────────────────────────────────────────────────────
  cards: {
    background: '#FBF8F1',
    border: '1.5px solid #44597B',
    borderRadius: 18,
    padding: '2.4rem 1.9rem',
    shadow: '0 18px 50px -28px rgba(52, 70, 97, 0.45)',
  },

  // ─── FORMULAIRE RSVP ───────────────────────────────────────────────────────
  forms: {
    label: {
      letterSpacing: '0.2em',
      textTransform: 'uppercase' as const,
      fontSize: '0.74rem',
      fontWeight: 600,
      color: '#D7D2C4',
    },
    field: {
      background: 'transparent',
      color: '#F5F0E4',
      border: 'none',
      borderBottom: '1px solid #9FAFC4',
      borderRadius: 0,
      padding: '0.55rem 0.1rem',
      fontSize: '0.95rem',
    },
    radio: {
      size: 16,
      border: '1px solid #D7D2C4',
      activeColor: '#A23B3B',
      gap: '0.7rem',
      labelLetterSpacing: '0.14em',
      labelTransform: 'uppercase' as const,
      labelSize: '0.74rem',
    },
  },

  // ─── COMPTEUR (COUNTDOWN) ──────────────────────────────────────────────────
  countdown: {
    /** Disposition : chiffres séparés par des filets verticaux */
    numberFont: "'Cormorant Garamond', Georgia, serif",
    numberSize: 'clamp(1.9rem, 5vw, 2.6rem)',
    numberWeight: 500,
    numberColor: '#F5F0E4',
    labelFont: "'EB Garamond', Georgia, serif",
    labelSize: '0.66rem',
    labelLetterSpacing: '0.18em',
    labelTransform: 'uppercase' as const,
    labelColor: '#C7C2B4',
    separatorColor: '#9FAFC4',
    separatorWidth: '1px',
    cellGap: 'clamp(0.9rem, 4vw, 1.8rem)',
    /** Animation discrète au changement de seconde */
    tickAnimation: 'vintageTick 0.5s ease',
  },

  // ─── ORNEMENTS (réglages communs aux composants SVG) ───────────────────────
  ornaments: {
    color: '#44597B',
    colorSoft: '#7C8DA8',
    colorOnPrimary: '#D7D2C4',
    strokeWidth: 1.4,
    opacity: 0.9,
  },

  // ─── ICÔNES (footer / réseaux) ─────────────────────────────────────────────
  icons: {
    size: 18,
    color: '#F5F0E4',
    circleBorder: '1px solid #9FAFC4',
    circleSize: 34,
    gap: '0.6rem',
  },

  // ─── PIED DE PAGE ──────────────────────────────────────────────────────────
  footer: {
    background: '#44597B',
    color: '#F5F0E4',
    mutedColor: '#C7C2B4',
    borderRadius: 26,
    padding: '3rem 1.9rem',
    letterSpacing: '0.14em',
  },

  // ─── PROPORTIONS GÉNÉRALES ─────────────────────────────────────────────────
  layout: {
    maxWidth: 760,
    cardMaxWidth: 420,
    gutter: '1.4rem',
  },
} as const;

/**
 * Bridge vers le modèle `WeddingTheme` existant (UniversalTemplate).
 * Permet d'appliquer le preset en un clic au moteur de rendu actuel.
 */
export function vintageWeddingThemePatch() {
  return {
    style: 'vintage-blue' as const,
    backgroundColor: VintageTheme.backgrounds.page,
    textColor: VintageTheme.colors.ink,
    primaryColor: VintageTheme.colors.primary,
    secondaryColor: VintageTheme.colors.taupeSoft,
    fontFamily: VintageTheme.fonts.display,
    cardStyle: 'double-border' as const,
    layout: 'centered' as const,
    borderRadius: VintageTheme.radius.card,
  };
}
