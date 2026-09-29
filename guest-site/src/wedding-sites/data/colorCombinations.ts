/**
 * colorCombinations.ts — les 16 combinaisons de couleurs du site mariage.
 *
 * Chaque combinaison définit une palette COMPLÈTE (pas seulement primary/
 * secondary) + son motif floral fourni. La sélection d'une combinaison
 * remplace intégralement `theme.{...COLOR_ROLE_FIELDS}` — voir usage dans
 * `WeddingSiteBuilder.tsx`.
 *
 * Champs volontairement omis (accentColor, borderColor, buttonColor,
 * buttonTextColor, mutedTextColor, timelineColor, iconColor) : ils
 * retombent sur primary/secondary/textColor via `resolveThemeColors()`
 * (voir ../utils/themeColors.ts), qui implémente exactement la RÈGLE DES
 * COULEURS du document de référence. On ne les fixe ici que lorsqu'une
 * combinaison a besoin de s'écarter de ce défaut.
 *
 * Pour ajouter une 17e combinaison : ajouter une entrée à ce tableau. Pour
 * ajouter un nouveau motif : déposer l'image dans `guest-site/public/patterns/`
 * et la référencer via `floralPattern`.
 */
import type { WeddingTheme } from '../types';

export type ColorCombination = {
  /** Nom EXACT affiché dans l'interface — ne jamais renommer */
  name: string;
  /** 4 pastilles de prévisualisation dans le sélecteur */
  swatch: [string, string, string, string];
  /** Surcharge appliquée à `theme` au clic */
  theme: Partial<WeddingTheme>;
};

/** Taille de tuile commune à tous les motifs fournis (toile délicate, jamais déformée) */
const TILE = '420px';

export const COLOR_COMBINATIONS: ColorCombination[] = [
  {
    name: 'Noir & Or',
    swatch: ['#0B0B0B', '#D4AF37', '#F7F1DE', '#FFFFFF'],
    theme: {
      primaryColor: '#D4AF37',
      secondaryColor: '#0B0B0B',
      backgroundColor: '#F7F1DE',
      textColor: '#1A1206',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#C9A227',
      floralPattern: '/patterns/noir-or.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Émeraude & Champagne',
    swatch: ['#0F5132', '#D4AF37', '#E3EDE4', '#FFFFFF'],
    theme: {
      primaryColor: '#0F5132',
      secondaryColor: '#D4AF37',
      backgroundColor: '#E6F0E7',
      textColor: '#0F3D2A',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#C9A227',
      floralPattern: '/patterns/emeraude-champagne.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Bleu Nuit & Cuivré',
    swatch: ['#0E2248', '#C97C5D', '#DEE7F2', '#F5EFE6'],
    theme: {
      primaryColor: '#0E2248',
      secondaryColor: '#C97C5D',
      backgroundColor: '#E4EBF5',
      textColor: '#0E2248',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#3A4E78',
      // Aucun motif dédié fourni pour cette combinaison → fallback cohérent :
      // on réutilise le motif bleu (Sable & Bleu Ciel) teinté vers le bleu nuit.
      floralPattern: '/patterns/sable-bleu-ciel.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
      floralFilter: 'saturate(1.7) brightness(0.8) hue-rotate(15deg)',
    },
  },
  {
    name: 'Bordeaux & Or Vieilli',
    swatch: ['#580D1E', '#D4AF37', '#EEC7B7', '#F7F3EE'],
    theme: {
      primaryColor: '#580D1E',
      secondaryColor: '#D4AF37',
      backgroundColor: '#F4E4E1',
      textColor: '#3D0A14',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#7A2233',
      // Fallback : motif Noir & Or (même famille sombre + or) teinté bordeaux.
      floralPattern: '/patterns/noir-or.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
      floralFilter: 'hue-rotate(-55deg) saturate(2.4) brightness(0.74) contrast(1.1)',
    },
  },
  {
    name: 'Vert Sauge & Bronze',
    swatch: ['#8BBF7A', '#7A5A3A', '#DCD2BE', '#FAF7F2'],
    theme: {
      primaryColor: '#8BBF7A',
      secondaryColor: '#7A5A3A',
      backgroundColor: '#E7EEE1',
      textColor: '#2E3D24',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#7C8F63',
      floralPattern: '/patterns/vert-sauge-bronze.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Terracotta & Crème',
    swatch: ['#C65A2E', '#6B6F3C', '#F8E4D8', '#D8BEBC'],
    theme: {
      primaryColor: '#C65A2E',
      secondaryColor: '#6B6F3C',
      backgroundColor: '#FAE6DA',
      textColor: '#3A2010',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#B0603A',
      floralPattern: '/patterns/terracotta-creme.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Lavande & Gris',
    swatch: ['#9B8BB0', '#BFC2C7', '#EBE5F4', '#FFFFFF'],
    theme: {
      primaryColor: '#9B8BB0',
      secondaryColor: '#BFC2C7',
      backgroundColor: '#ECE6F5',
      textColor: '#3D3550',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#9B8FA8',
      floralPattern: '/patterns/lavande-gris.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Noir & Blanc Marbre',
    swatch: ['#000000', '#D4AF37', '#ECECEC', '#FFFFFF'],
    theme: {
      primaryColor: '#000000',
      secondaryColor: '#D4AF37',
      backgroundColor: '#EFEFEF',
      textColor: '#111111',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#3A3A3A',
      floralPattern: '/patterns/noir-blanc-marbre.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Pétrole & Or',
    swatch: ['#005F67', '#D4AF37', '#DFEDED', '#F6F2EA'],
    theme: {
      primaryColor: '#005F67',
      secondaryColor: '#D4AF37',
      backgroundColor: '#E0EEEE',
      textColor: '#003840',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#0E6E73',
      // Fallback : motif Émeraude & Champagne (or/vert) teinté pétrole.
      floralPattern: '/patterns/emeraude-champagne.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
      floralFilter: 'hue-rotate(150deg) saturate(2) brightness(0.88)',
    },
  },
  {
    name: 'Pêche & Or Rose',
    swatch: ['#D4856A', '#C9956A', '#FBE7DC', '#E7A98D'],
    theme: {
      primaryColor: '#D4856A',
      secondaryColor: '#C9956A',
      backgroundColor: '#FCE8DE',
      textColor: '#6B3A2A',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#D79E8A',
      floralPattern: '/patterns/peche-or-rose.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Olive & Beige',
    swatch: ['#4B5332', '#C9B87A', '#ECEDDF', '#D4C9B6'],
    theme: {
      primaryColor: '#4B5332',
      secondaryColor: '#C9B87A',
      backgroundColor: '#EDEEE0',
      textColor: '#2E3320',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#7C8058',
      floralPattern: '/patterns/olive-beige.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Chocolat & Doré',
    swatch: ['#5A3824', '#D4AF37', '#F0E7DA', '#B8A97B'],
    theme: {
      primaryColor: '#5A3824',
      secondaryColor: '#D4AF37',
      backgroundColor: '#F1E8DB',
      textColor: '#2E1A0E',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#6E4A2E',
      // Fallback : motif Terracotta & Crème (famille chaude brun-roux) assombri chocolat.
      floralPattern: '/patterns/terracotta-creme.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
      floralFilter: 'saturate(0.55) sepia(0.25) brightness(0.72) contrast(1.05)',
    },
  },
  {
    name: 'Bleu Grisé & Argent',
    swatch: ['#5A7A96', '#A0A8B0', '#E4EBF2', '#FFFFFF'],
    theme: {
      primaryColor: '#5A7A96',
      secondaryColor: '#A0A8B0',
      backgroundColor: '#E6EDF4',
      textColor: '#2A3A4A',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#7E93A6',
      floralPattern: '/patterns/bleu-grise-argent.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Fuchsia & Prune',
    swatch: ['#8B1050', '#6A0038', '#FADCEA', '#F1C6D2'],
    theme: {
      primaryColor: '#8B1050',
      secondaryColor: '#D4AF37',
      backgroundColor: '#FBE1EC',
      textColor: '#3A0020',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#A3346B',
      floralPattern: '/patterns/fuchsia-prune.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
  {
    name: 'Sable & Bleu Ciel',
    swatch: ['#7AAECC', '#C9B080', '#E4EFF6', '#FFFFFF'],
    theme: {
      primaryColor: '#7AAECC',
      secondaryColor: '#C9B080',
      backgroundColor: '#E5F0F7',
      textColor: '#2A4A5A',
      cardBackgroundColor: '#FFFFFF',
      floralColor: '#8FB6D2',
      floralPattern: '/patterns/sable-bleu-ciel.jpg',
      floralPosition: 'top center',
      floralTileSize: TILE,
    },
  },
];

/** Tous les rôles de couleur étendus qu'une combinaison peut fixer — remis à
 *  zéro avant chaque application pour qu'une combinaison n'en "hérite"
 *  jamais une autre (ex. revenir à « + Couleurs du modèle » après avoir
 *  choisi « Noir & Or » ne doit garder aucun résidu de motif floral). */
const EXTENDED_ROLE_FIELDS = [
  'accentColor',
  'cardBackgroundColor',
  'borderColor',
  'buttonColor',
  'buttonTextColor',
  'mutedTextColor',
  'timelineColor',
  'iconColor',
  'floralColor',
  'floralPattern',
  'floralPosition',
  'floralTileSize',
  'floralOpacity',
  'floralFilter',
] as const satisfies readonly (keyof WeddingTheme)[];

/** Applique une combinaison au thème courant : palette + motif + tous les
 *  rôles étendus remplacés d'un bloc (jamais fusionnés avec la combinaison
 *  précédente). Les champs structurels (style, heroStyle, fontFamily…) et
 *  les données du mariage ne sont jamais touchés. */
export function applyColorCombination(theme: WeddingTheme, combo: ColorCombination): WeddingTheme {
  const reset = Object.fromEntries(EXTENDED_ROLE_FIELDS.map((k) => [k, undefined])) as Partial<WeddingTheme>;
  return { ...theme, ...reset, ...combo.theme };
}
