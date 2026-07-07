/**
 * VoileIvoireTheme.ts — Preset « Voile Ivoire » (faire-part romantique).
 *
 * Fichier de THÈME pur : uniquement des variables de design.
 * Inspiré d'un faire-part vintage haut de gamme : fond rideau ivoire,
 * calligraphie anglaise, ornements dorés, cartes crème encadrées.
 *
 * Le rendu reste piloté par les couleurs du `WeddingTheme` du site
 * (surchargées par le client). On expose un resolver `voileTokens(theme)`
 * qui mélange ces couleurs live avec les constantes structurelles.
 */
import type { WeddingTheme } from '../types';
import { TITLE_SIZE_SCALE } from '../types';

/** Métadonnées du preset */
export const VOILE_IVOIRE_META = {
  id: 'voile-ivoire' as const,
  label: 'Voile Ivoire',
  description:
    'Faire-part romantique : rideau ivoire, calligraphie charbon, ornements argentés',
};

/** Image de fond « rideau ivoire » servie depuis /public */
export const VOILE_BG_IMAGE = '/ivory-curtain-bg.png';

/** Couleurs par défaut (surchargées par le client via le générateur).
 *  Palette du faire-part de référence : blanc cassé, calligraphie charbon,
 *  ornements filigranes gris argenté. */
export const VOILE_DEFAULTS = {
  /** Fond des cartes (blanc cassé) */
  background: '#FBF9F4',
  /** Texte principal (charbon doux — calligraphie) */
  text: '#44413C',
  /** Texte secondaire (gris chaud) */
  textMuted: '#7E7A72',
  /** Couleur accent (filets, ornements filigranes) → primaryColor */
  accent: '#A9A49A',
  /** Couleur des boutons → secondaryColor */
  button: '#8F8A80',
};

/** Constantes structurelles communes (non liées aux couleurs) */
export const VOILE_TOKENS = {
  /** Largeur d'une carte — laisse le rideau visible sur les côtés */
  cardWidth: 'min(400px, 86%)',
  /** Espacement vertical entre cartes */
  cardGap: 30,
  /** Padding intérieur des cartes */
  cardPadding: '2.6rem 1.8rem',
  /** Rayon des cartes */
  cardRadius: 20,
  /** Rayon des images internes */
  imageRadius: 14,
  /** Ombre douce et diffuse (papeterie posée sur le rideau) */
  cardShadow: '0 26px 60px -34px rgba(70,58,42,0.55)',

  fonts: {
    /** Calligraphie anglaise — titres & prénoms */
    script: "'Pinyon Script', 'Great Vibes', cursive",
    /** Corps de texte — serif classique */
    body: "'Cormorant Garamond', Georgia, serif",
    /** Petites capitales — labels & compteur */
    label: "'Cinzel', 'Montserrat', Georgia, serif",
  },

  // Tailles exprimées en `cqw` (largeur de la carte-conteneur) et non en `vw` :
  // ainsi la typographie s'échelonne sur la LARGEUR RÉELLE de la carte et ne
  // déborde jamais, y compris dans l'aperçu iPhone mis à l'échelle (où `vw`
  // renvoyait la fenêtre du navigateur et saturait au maximum).
  titleSizes: {
    names: 'clamp(1.9rem, 13cqw, 3.1rem)',
    script: 'clamp(1.6rem, 10.5cqw, 2.6rem)',
    countdown: 'clamp(1.4rem, 7cqw, 2.1rem)',
  },
} as const;

export type VoileTokens = ReturnType<typeof voileTokens>;

/**
 * Resolver : mélange les couleurs live du thème du site avec les constantes
 * structurelles. Toute couleur absente retombe sur les défauts.
 */
export function voileTokens(theme: WeddingTheme) {
  const accent = theme.primaryColor || VOILE_DEFAULTS.accent;
  const button = theme.secondaryColor || VOILE_DEFAULTS.button;
  const background = theme.backgroundColor || VOILE_DEFAULTS.background;
  const text = theme.textColor || VOILE_DEFAULTS.text;

  // Tailles pilotées par le builder : titleSize → titres de section,
  // nameSize → prénoms calligraphiés du hero
  const nameScale = TITLE_SIZE_SCALE[theme.nameSize ?? 'medium'];
  const titleScale = TITLE_SIZE_SCALE[theme.titleSize ?? 'medium'];
  const scaled = (base: string, scale: number) =>
    scale === 1 ? base : `calc(${base} * ${scale})`;

  return {
    ...VOILE_TOKENS,
    bgImage: VOILE_BG_IMAGE,
    colors: {
      /** Fond des cartes (crème translucide déposé sur le rideau) */
      card: withAlpha(background, 0.9),
      cardSolid: background,
      text,
      textMuted: VOILE_DEFAULTS.textMuted,
      accent,
      button,
      onButton: '#FFFFFF',
      /** Filets / contours discrets */
      hairline: `${accent}44`,
      hairlineStrong: `${accent}88`,
    },
    // Trois rôles pilotés par le builder : Texte (body), Prénoms/calligraphie
    // (script), Titres/labels (label). Chaque rôle retombe sur le défaut.
    fonts: {
      script: theme.scriptFontFamily || VOILE_TOKENS.fonts.script,
      body: theme.fontFamily || VOILE_TOKENS.fonts.body,
      label: theme.titleFontFamily || VOILE_TOKENS.fonts.label,
    },
    titleSizes: {
      names: scaled(VOILE_TOKENS.titleSizes.names, nameScale),
      script: scaled(VOILE_TOKENS.titleSizes.script, titleScale),
      countdown: VOILE_TOKENS.titleSizes.countdown,
    },
    radius: {
      card: theme.borderRadius ?? VOILE_TOKENS.cardRadius,
      image: VOILE_TOKENS.imageRadius,
    },
  };
}

/** Ajoute un canal alpha (0..1) à une couleur hex #rrggbb. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, '0');
  return `#${m[1]}${m[2]}${m[3]}${a}`;
}

/** Bridge vers le modèle `WeddingTheme` existant (application en un clic). */
export function voileIvoireWeddingThemePatch(): Partial<WeddingTheme> {
  return {
    style: 'voile-ivoire',
    backgroundColor: VOILE_DEFAULTS.background,
    textColor: VOILE_DEFAULTS.text,
    primaryColor: VOILE_DEFAULTS.accent,
    secondaryColor: VOILE_DEFAULTS.button,
    fontFamily: VOILE_TOKENS.fonts.body,
    cardStyle: 'shadow',
    layout: 'centered',
    borderRadius: VOILE_TOKENS.cardRadius,
  };
}
