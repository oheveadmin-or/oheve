/**
 * themeColors.ts — résolveur central des rôles de couleur étendus.
 *
 * Une "combinaison de couleurs" ne définit pas seulement primary/secondary :
 * elle peut fixer accentColor, buttonColor, borderColor, etc. Tous ces champs
 * sont optionnels sur `WeddingTheme` — quand ils sont absents (tous les
 * presets existants), ce resolver retombe exactement sur le comportement
 * actuel (primaryColor/secondaryColor). Aucun composant ne doit lire ces
 * champs directement : il passe par `resolveThemeColors(theme)`.
 */
import type { WeddingTheme } from '../types';

export type ResolvedThemeColors = {
  accent: string;
  cardBackground: string | undefined; // undefined = laisser cardStyleSurface calculer comme avant
  border: string;
  button: string;
  buttonText: string;
  mutedText: string;
  timeline: string;
  icon: string;
  floral: string;
};

/** Ajoute un canal alpha (0..1) à une couleur hex #rrggbb. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, '0');
  return `#${m[1]}${m[2]}${m[3]}${a}`;
}

/** Luminance relative approximative → choisit un texte de bouton lisible */
function readableOn(hex: string): '#FFFFFF' | '#1A1A1A' {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return '#FFFFFF';
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#1A1A1A' : '#FFFFFF';
}

export function resolveThemeColors(theme: WeddingTheme): ResolvedThemeColors {
  const button = theme.buttonColor ?? theme.primaryColor;
  return {
    accent: theme.accentColor ?? theme.secondaryColor,
    cardBackground: theme.cardBackgroundColor,
    border: theme.borderColor ?? theme.primaryColor,
    button,
    buttonText: theme.buttonTextColor ?? readableOn(button),
    mutedText: theme.mutedTextColor ?? withAlpha(theme.textColor, 0.62),
    timeline: theme.timelineColor ?? theme.primaryColor,
    icon: theme.iconColor ?? theme.primaryColor,
    floral: theme.floralColor ?? theme.primaryColor,
  };
}
