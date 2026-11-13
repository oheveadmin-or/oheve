/**
 * Jetons du modèle « Invitation animée » : constantes structurelles + couleurs
 * et polices LIVE du `WeddingTheme` (couleurs, polices et tailles choisies
 * dans le builder s'appliquent sans exception).
 */
import type { InvitationEffects, ThemeStyle, WeddingTheme } from '../types';
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

/**
 * Les deux décors du modèle « Invitation animée » : ivoire (fleur, mariage) et
 * tefillin (Bar Mitsva : fond bordeaux, boîtiers et lanières de cuir) et
 * papillons (Bat Mitsva : fond violet, cadre de paillettes d'or et papillons) et
 * eucalyptus (Brit Mila : papier ivoire, arche dorée, étoile de David, feuillage).
 * Même déroulé, mêmes composants ; seuls le fond et les couleurs changent.
 */
export function isAnimatedInvitation(style?: ThemeStyle | string | null): boolean {
  return style === 'invitation-animee' || style === 'invitation-tefillin' || style === 'invitation-papillons' || style === 'invitation-eucalyptus';
}

export type InvitationDecor = 'ivoire' | 'tefillin' | 'papillons' | 'eucalyptus';

export function invitationDecor(theme: WeddingTheme): InvitationDecor {
  if (theme.style === 'invitation-tefillin') return 'tefillin';
  if (theme.style === 'invitation-papillons') return 'papillons';
  if (theme.style === 'invitation-eucalyptus') return 'eucalyptus';
  return 'ivoire';
}

/** Décor Brit Mila : papier ivoire, or et vert eucalyptus (faire-part à l'arche) */
const EUCALYPTUS = {
  paper: '#F6F1E6',
  ink: '#6A5536',
  foil: '#B38B3E',
  soft: '#93A88C',
  fonts: {
    script: "'Pinyon Script', 'Great Vibes', cursive",
    body: "'Cormorant Garamond', Georgia, serif",
    label: "'Montserrat', 'DM Sans', sans-serif",
    monogram: "'Playfair Display', 'Bodoni Moda', Georgia, serif",
  },
};

/** Décor Bat Mitsva : violet profond, or, prénom calligraphié (faire-part papillons) */
const PAPILLONS = {
  paper: '#2A1236',
  ink: '#F7EEF6',
  foil: '#E0B66A',
  soft: '#B78FD0',
  fonts: {
    script: "'Pinyon Script', 'Great Vibes', cursive",
    body: "'Cormorant Garamond', Georgia, serif",
    label: "'Montserrat', 'DM Sans', sans-serif",
    monogram: "'Playfair Display', 'Bodoni Moda', Georgia, serif",
  },
};

const TEFILLIN = {
  paper: '#2A0B12',
  ink: '#EED9D2',
  foil: '#C79C92',
  soft: '#6E2E38',
  fonts: {
    script: "'Bodoni Moda', 'GFS Didot', Georgia, serif",
    body: "'Cormorant Garamond', Georgia, serif",
    label: "'Montserrat', 'DM Sans', sans-serif",
    monogram: "'Bodoni Moda', 'GFS Didot', Georgia, serif",
  },
};

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
  const decor = invitationDecor(theme);
  const dark = decor === 'tefillin' || decor === 'papillons';
  const D = decor === 'papillons' ? PAPILLONS : decor === 'eucalyptus' ? EUCALYPTUS : dark ? TEFILLIN : DEFAULTS;
  const ink = theme.textColor || D.ink;
  const foil = theme.primaryColor || D.foil;
  const paper = theme.backgroundColor || D.paper;
  const nameScale = TITLE_SIZE_SCALE[theme.nameSize ?? 'medium'];
  const titleScale = TITLE_SIZE_SCALE[theme.titleSize ?? 'medium'];
  return {
    colors: {
      paper,
      ink,
      muted: theme.mutedTextColor || withAlpha(ink, 0.78),
      foil,
      soft: theme.secondaryColor || D.soft,
      // Dégradé « feuille d'or » du monogramme et du sceau
      goldHi: shade(foil, 0.35),
      goldLo: shade(foil, -0.38),
      band: dark ? shade(paper, 0.1) : foil,
      bandInk: dark ? ink : '#FFFFFF',
      button: dark
        ? `linear-gradient(${shade(foil, 0.28)}, ${shade(foil, 0.02)})`
        : `linear-gradient(${shade(foil, 0.12)}, ${shade(foil, -0.08)})`,
      /** Texte des boutons pleins */
      buttonInk: dark ? paper : '#FFFFFF',
      hairline: withAlpha(foil, dark ? 0.42 : 0.35),
      shadow: dark ? 'rgba(0,0,0,0.55)' : withAlpha(shade(foil, -0.5), 0.45),
      halo: paper,
      /** Fonds translucides (cartes, champs, onglet actif) posés sur le décor */
      surface: dark ? withAlpha(shade(paper, 0.06), 0.72) : 'rgba(255,255,255,0.72)',
      field: dark ? withAlpha(shade(paper, -0.25), 0.7) : 'rgba(255,255,255,0.85)',
      tabActive: dark ? shade(paper, 0.12) : '#FFFFFF',
      /** Papier de l'enveloppe et de la carte de visite */
      envelopeHi: dark ? shade(paper, 0.16) : '#FFFFFF',
      envelopeLo: dark ? shade(paper, 0.08) : '#F9F3EB',
      cardPaper: dark ? shade(paper, 0.05) : '#FFFDF9',
      coverCard: dark ? withAlpha(shade(paper, 0.08), 0.96) : 'rgba(255,255,255,0.84)',
    },
    decor,
    dark,
    /** Décor à image (papillons, eucalyptus) : cf. FrameArt */
    framed: decor === 'papillons' || decor === 'eucalyptus',
    /** Filet losangé à la place du monogramme (le décor porte déjà son motif) */
    ruleMark: decor !== 'ivoire',
    fonts: {
      script: theme.scriptFontFamily || D.fonts.script,
      body: theme.fontFamily || D.fonts.body,
      label: D.fonts.label,
      monogram: theme.titleFontFamily || D.fonts.monogram,
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
