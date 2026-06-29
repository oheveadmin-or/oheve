/**
 * EditorialCardsTheme.ts — Preset « Editorial Cards » (papeterie premium en cartes).
 *
 * Fichier de THÈME pur : il ne contient QUE des variables de design.
 * Aucun composant ne doit coder une couleur en dur — tout lit ici.
 *
 * Ambiance : haut de gamme · épuré · ivoire · beaucoup d'espace blanc ·
 * succession de cartes verticales élégantes · entièrement personnalisable.
 *
 * Le rendu est piloté par les couleurs du `WeddingTheme` du site
 * (modifiables par le client dans le générateur). On expose donc un
 * resolver `editorialTokens(theme)` qui mélange ces couleurs live avec
 * les constantes structurelles ci-dessous.
 *
 * Pour décliner un nouveau modèle premium : copier ce fichier + le template,
 * changer les valeurs. La forme sert de contrat partagé entre presets.
 */
import type { WeddingTheme } from '../types';

/** Métadonnées du preset */
export const EDITORIAL_CARDS_META = {
  id: 'editorial-cards' as const,
  label: 'Cartes Éditoriales',
  description: 'Papeterie premium : succession de cartes ivoire élégantes, beaucoup d’espace, entièrement personnalisable',
};

/** Couleurs par défaut (surchargées par le client via le générateur) */
export const EDITORIAL_DEFAULTS = {
  /** Fond des cartes */
  background: '#F8F6F2',
  /** Texte principal */
  text: '#2C2C2C',
  /** Texte secondaire */
  textMuted: '#777777',
  /** Couleur accent (filets, dates, ornements) → mappée sur primaryColor */
  accent: '#445E86',
  /** Couleur des boutons → mappée sur secondaryColor */
  button: '#5C4630',
};

/** Constantes structurelles communes (non liées aux couleurs) */
export const EDITORIAL_TOKENS = {
  /** Largeur d'une carte (420 → 480px) */
  cardWidth: 'min(480px, 100%)',
  cardMinWidth: 420,
  /** Rayon des cartes */
  cardRadius: 18,
  /** Rayon des images internes */
  imageRadius: 12,
  /** Rayon de la grille galerie */
  galleryRadius: 10,
  /** Espacement vertical entre cartes */
  cardGap: 32,
  /** Padding intérieur des cartes */
  cardPadding: 32,
  /** Ombre très légère */
  cardShadow: '0 10px 40px -24px rgba(44,44,44,0.35)',

  /** Bouton */
  buttonPadding: '14px 36px',
  buttonRadius: 8,

  fonts: {
    /** Titres / prénoms — serif éditorial */
    display: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
    /** Corps de texte */
    body: "'Cormorant Garamond', Georgia, serif",
    /** Labels en petites capitales */
    label: "'Cinzel', 'Montserrat', Georgia, serif",
  },

  titleSizes: {
    names: 'clamp(2.2rem, 6vw, 3.2rem)',
    section: 'clamp(1.5rem, 4vw, 2.1rem)',
    countdown: 'clamp(2rem, 7vw, 2.8rem)',
  },

  letterSpacing: {
    label: '0.22em',
    eyebrow: '0.3em',
  },
} as const;

export type EditorialTokens = ReturnType<typeof editorialTokens>;

/**
 * Resolver : mélange les couleurs live du thème du site avec les constantes
 * structurelles. Toute couleur absente retombe sur les défauts premium.
 */
export function editorialTokens(theme: WeddingTheme) {
  const accent = theme.primaryColor || EDITORIAL_DEFAULTS.accent;
  const button = theme.secondaryColor || EDITORIAL_DEFAULTS.button;
  const background = theme.backgroundColor || EDITORIAL_DEFAULTS.background;
  const text = theme.textColor || EDITORIAL_DEFAULTS.text;

  return {
    ...EDITORIAL_TOKENS,
    colors: {
      /** Fond de page (légèrement plus sombre que les cartes pour les détacher) */
      page: shade(background, -0.03),
      /** Fond des cartes */
      card: background,
      text,
      textMuted: EDITORIAL_DEFAULTS.textMuted,
      accent,
      button,
      /** Texte sur le bouton — clair par défaut */
      onButton: '#FFFFFF',
      /** Filets / contours discrets */
      hairline: `${accent}33`,
      hairlineStrong: `${accent}66`,
    },
    fonts: theme.fontFamily
      ? { ...EDITORIAL_TOKENS.fonts, body: theme.fontFamily }
      : EDITORIAL_TOKENS.fonts,
    radius: {
      card: theme.borderRadius ?? EDITORIAL_TOKENS.cardRadius,
      image: EDITORIAL_TOKENS.imageRadius,
      gallery: EDITORIAL_TOKENS.galleryRadius,
      button: EDITORIAL_TOKENS.buttonRadius,
    },
  };
}

/** Éclaircit (+) ou assombrit (−) une couleur hex d'un ratio donné (-1..1). */
function shade(hex: string, ratio: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (ratio < 0 ? c : 255 - c) * ratio)));
  const r = adj(parseInt(m[1], 16));
  const g = adj(parseInt(m[2], 16));
  const b = adj(parseInt(m[3], 16));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Bridge vers le modèle `WeddingTheme` existant.
 * Permet d'appliquer le preset en un clic.
 */
export function editorialCardsWeddingThemePatch(): Partial<WeddingTheme> {
  return {
    style: 'editorial-cards',
    backgroundColor: EDITORIAL_DEFAULTS.background,
    textColor: EDITORIAL_DEFAULTS.text,
    primaryColor: EDITORIAL_DEFAULTS.accent,
    secondaryColor: EDITORIAL_DEFAULTS.button,
    fontFamily: EDITORIAL_TOKENS.fonts.display,
    cardStyle: 'shadow',
    layout: 'centered',
    borderRadius: EDITORIAL_TOKENS.cardRadius,
  };
}
