/**
 * Jetons du modèle « Invitation animée » : constantes structurelles + couleurs
 * et polices LIVE du `WeddingTheme` (combinaisons de couleurs, polices et
 * tailles choisies dans le builder s'appliquent sans exception).
 */
import type { InvitationEffects, WeddingTheme } from '../types';
import { TITLE_SIZE_SCALE } from '../types';
import { resolveThemeColors } from '../utils/themeColors';

const DEFAULTS = {
  paper: '#FAF6EF',
  card: '#FFFDF9',
  ink: '#343630',
  foil: '#9A7B55',
  sage: '#929B83',
  fonts: {
    script: "'Pinyon Script', 'Great Vibes', cursive",
    body: "'Cormorant Garamond', Georgia, serif",
    label: "'Cormorant Garamond', Georgia, serif",
  },
};

/** Ajoute un canal alpha (0..1) à une couleur hex #rrggbb. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, '0');
  return `#${m[1]}${m[2]}${m[3]}${a}`;
}

const scaled = (base: string, k: number) => (k === 1 ? base : `calc(${base} * ${k})`);

/** Effets activés : un effet absent du thème vaut « activé » (sauf `pages` et `bsd`). */
export function invitationEffects(theme: WeddingTheme): Required<InvitationEffects> {
  const e = theme.invitation ?? {};
  return {
    petals: e.petals !== false,
    reveal: e.reveal !== false,
    glass: e.glass !== false,
    calendar: e.calendar !== false,
    bottomBar: e.bottomBar !== false,
    // Options à activer explicitement : absentes = désactivées
    pages: e.pages === true,
    bsd: e.bsd === true,
  };
}

export function invitationTokens(theme: WeddingTheme) {
  const rc = resolveThemeColors(theme);
  const ink = theme.textColor || DEFAULTS.ink;
  const foil = theme.primaryColor || DEFAULTS.foil;
  const nameScale = TITLE_SIZE_SCALE[theme.nameSize ?? 'medium'];
  const titleScale = TITLE_SIZE_SCALE[theme.titleSize ?? 'medium'];
  return {
    colors: {
      paper: theme.backgroundColor || DEFAULTS.paper,
      card: theme.cardBackgroundColor || DEFAULTS.card,
      ink,
      muted: theme.mutedTextColor || withAlpha(ink, 0.68),
      foil,
      sage: theme.accentColor || theme.secondaryColor || DEFAULTS.sage,
      button: rc.button,
      onButton: rc.buttonText,
      hairline: withAlpha(theme.borderColor || foil, 0.3),
      shadow: withAlpha(ink, 0.12),
    },
    fonts: {
      script: theme.scriptFontFamily || DEFAULTS.fonts.script,
      body: theme.fontFamily || DEFAULTS.fonts.body,
      label: theme.titleFontFamily || DEFAULTS.fonts.label,
    },
    // Tailles en cqw : chaque carte est un conteneur de requête, les prénoms
    // s'échelonnent sur sa largeur (jamais de vw — cf. aperçu iPhone mis à l'échelle).
    sizes: {
      names: scaled('clamp(2.3rem, 14cqw, 3.7rem)', nameScale),
      title: scaled('clamp(1.9rem, 10cqw, 2.6rem)', titleScale),
    },
    radius: Math.min(theme.borderRadius ?? 4, 28),
    effects: invitationEffects(theme),
  };
}

export type InvitationTokens = ReturnType<typeof invitationTokens>;
