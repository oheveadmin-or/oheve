/**
 * Jetons du modèle « Invitation animée » : constantes structurelles + couleurs
 * et polices LIVE du `WeddingTheme` (couleurs, polices et tailles choisies
 * dans le builder s'appliquent sans exception).
 */
import type { InvitationEffects, WeddingTheme } from '../types';
import { TITLE_SIZE_SCALE } from '../types';

const DEFAULTS = {
  paper: '#FFF9F2',
  ink: '#6F5B46',
  foil: '#A88D70',
  soft: '#C9B79F',
  fonts: {
    script: "'Great Vibes', 'Pinyon Script', cursive",
    body: "'Cormorant Garamond', Georgia, serif",
    label: "'Montserrat', 'DM Sans', sans-serif",
    monogram: "'Bodoni Moda', 'GFS Didot', Georgia, serif",
  },
};

/** Ajoute un canal alpha (0..1) à une couleur hex #rrggbb. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255))).toString(16).padStart(2, '0');
  return `#${m[1]}${m[2]}${m[3]}${a}`;
}

/** Éclaircit (k > 0) ou assombrit (k < 0) une couleur hex, k ∈ [-1, 1]. */
export function shade(hex: string, k: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return hex;
  const mix = (c: string) => {
    const v = parseInt(c, 16);
    const out = k >= 0 ? v + (255 - v) * k : v * (1 + k);
    return Math.round(Math.max(0, Math.min(255, out))).toString(16).padStart(2, '0');
  };
  return `#${mix(m[1])}${mix(m[2])}${mix(m[3])}`;
}

const scaled = (base: string, k: number) => (k === 1 ? base : `calc(${base} * ${k})`);

/** Effets activés : un effet absent du thème vaut « activé ». */
export function invitationEffects(theme: WeddingTheme): Required<InvitationEffects> {
  const e = theme.invitation ?? {};
  return {
    opening: e.opening !== false,
    countdown: e.countdown !== false,
    reveal: e.reveal !== false,
    bsd: e.bsd !== false,
    bottomBar: e.bottomBar !== false,
  };
}

export function invitationTokens(theme: WeddingTheme) {
  const ink = theme.textColor || DEFAULTS.ink;
  const foil = theme.primaryColor || DEFAULTS.foil;
  const paper = theme.backgroundColor || DEFAULTS.paper;
  const nameScale = TITLE_SIZE_SCALE[theme.nameSize ?? 'medium'];
  const titleScale = TITLE_SIZE_SCALE[theme.titleSize ?? 'medium'];
  return {
    colors: {
      paper,
      ink,
      muted: theme.mutedTextColor || withAlpha(ink, 0.78),
      foil,
      soft: theme.secondaryColor || DEFAULTS.soft,
      // Dégradé « feuille d'or » du monogramme et du sceau
      goldHi: shade(foil, 0.35),
      goldLo: shade(foil, -0.38),
      band: foil,
      bandInk: '#FFFFFF',
      button: `linear-gradient(${shade(foil, 0.12)}, ${shade(foil, -0.08)})`,
      hairline: withAlpha(foil, 0.35),
      shadow: withAlpha(shade(foil, -0.5), 0.45),
      halo: paper,
    },
    fonts: {
      script: theme.scriptFontFamily || DEFAULTS.fonts.script,
      body: theme.fontFamily || DEFAULTS.fonts.body,
      label: DEFAULTS.fonts.label,
      monogram: theme.titleFontFamily || DEFAULTS.fonts.monogram,
    },
    // Tailles en cqw : chaque page est un conteneur de requête, les prénoms
    // s'échelonnent sur sa largeur (jamais de vw — cf. aperçu iPhone mis à l'échelle).
    sizes: {
      names: scaled('clamp(2.4rem, 13cqw, 3.6rem)', nameScale),
      title: scaled('clamp(1.25rem, 6.4cqw, 1.7rem)', titleScale),
    },
    effects: invitationEffects(theme),
  };
}

export type InvitationTokens = ReturnType<typeof invitationTokens>;
