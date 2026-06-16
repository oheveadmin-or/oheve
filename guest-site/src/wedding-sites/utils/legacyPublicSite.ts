import type { WeddingSite, WeddingTheme } from '../types';

import { defaultWeddingSections, defaultWeddingTheme } from '../types';
import { mergeDateAndTimeToIso } from './date';
import { applyThemePreset } from '../templates/themePresets';

export type LegacyPublicPayload = {
  slug: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  templateId: string;
  customText: string;
  siteConfig?: {
    style?: string;
    brideName?: string;
    groomName?: string;
    date?: string;
    city?: string;
    venue?: string;
    welcomeText?: string;
    events?: unknown[];
  };
};

function guessIsoFromWeddingDate(raw: string): string {
  const t = raw?.trim();
  if (!t) return new Date().toISOString();
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return mergeDateAndTimeToIso(t, '12:00');
}

// Color palettes per style (matching MonApp STYLE_PRESETS)
const STYLE_COLORS: Record<string, Pick<WeddingTheme, 'backgroundColor' | 'primaryColor' | 'secondaryColor' | 'textColor'>> = {
  classic:          { backgroundColor: '#faf7f2', primaryColor: '#5b4636', secondaryColor: '#c9a962', textColor: '#2c241c' },
  luxury:           { backgroundColor: '#0c0c0f', primaryColor: '#d4af37', secondaryColor: '#8b6914', textColor: '#f2ecdf' },
  'art-deco':       { backgroundColor: '#0d0d0d', primaryColor: '#d4af37', secondaryColor: '#8b6914', textColor: '#f0e8c8' },
  romantic:         { backgroundColor: '#fff5f8', primaryColor: '#b84b6f', secondaryColor: '#e8a0b8', textColor: '#4a3040' },
  boho:             { backgroundColor: '#f9f3ec', primaryColor: '#a0522d', secondaryColor: '#d4956a', textColor: '#3d2b1f' },
  'dark-romance':   { backgroundColor: '#120a0f', primaryColor: '#8b1a4a', secondaryColor: '#5a1030', textColor: '#f2e8ee' },
  celestial:        { backgroundColor: '#080c1a', primaryColor: '#7986cb', secondaryColor: '#3f51b5', textColor: '#e8eaf6' },
  'navy-gold':      { backgroundColor: '#f4f6f9', primaryColor: '#0d1f3c', secondaryColor: '#c9a962', textColor: '#0d1f3c' },
  parisian:         { backgroundColor: '#faf5f2', primaryColor: '#c4967a', secondaryColor: '#e8c4aa', textColor: '#2e2420' },
  'vintage-rose':   { backgroundColor: '#fdf2f4', primaryColor: '#c77e8e', secondaryColor: '#e8b4c0', textColor: '#4a2535' },
  'cherry-blossom': { backgroundColor: '#fff9fb', primaryColor: '#e091b0', secondaryColor: '#f0b8cc', textColor: '#3d1f2d' },
  floral:           { backgroundColor: '#f5f0f5', primaryColor: '#7d5a7d', secondaryColor: '#b090b0', textColor: '#3d2c3d' },
  'garden-party':   { backgroundColor: '#eef4ec', primaryColor: '#3a7d44', secondaryColor: '#7ab080', textColor: '#1e3a25' },
  tropical:         { backgroundColor: '#f0fff4', primaryColor: '#2d6a4f', secondaryColor: '#74b89a', textColor: '#1a3a2a' },
  'emerald-luxury': { backgroundColor: '#f2faf4', primaryColor: '#1a6641', secondaryColor: '#c9a962', textColor: '#0a2416' },
  marrakech:        { backgroundColor: '#f5ede4', primaryColor: '#c4622d', secondaryColor: '#e8a07a', textColor: '#2d1e15' },
  'desert-sunset':  { backgroundColor: '#fdf0e8', primaryColor: '#e07d54', secondaryColor: '#f0b088', textColor: '#3b2416' },
  'rustic-chic':    { backgroundColor: '#f7f0e6', primaryColor: '#7a5c3c', secondaryColor: '#c0a080', textColor: '#3b2a1a' },
  'gold-leaf':      { backgroundColor: '#fdfaf3', primaryColor: '#b8860b', secondaryColor: '#d4af37', textColor: '#2c2012' },
  'ivory-lace':     { backgroundColor: '#fdfaf6', primaryColor: '#8b6a3c', secondaryColor: '#c4a060', textColor: '#2c2018' },
  oriental:         { backgroundColor: '#faf6f0', primaryColor: '#b8860b', secondaryColor: '#d4af37', textColor: '#3d2914' },
  sephardic:        { backgroundColor: '#2a1218', primaryColor: '#8b1d3b', secondaryColor: '#c4506a', textColor: '#f4ece0' },
  royal:            { backgroundColor: '#1a1520', primaryColor: '#9b7ed9', secondaryColor: '#7c5eb8', textColor: '#f0e6ff' },
  modern:           { backgroundColor: '#ffffff', primaryColor: '#111111', secondaryColor: '#444444', textColor: '#111111' },
  minimal:          { backgroundColor: '#fafafa', primaryColor: '#222222', secondaryColor: '#666666', textColor: '#222222' },
  'black-tie':      { backgroundColor: '#ffffff', primaryColor: '#000000', secondaryColor: '#444444', textColor: '#000000' },
  'nordic-minimal': { backgroundColor: '#f8f8f8', primaryColor: '#4a4a4a', secondaryColor: '#8a8a8a', textColor: '#2a2a2a' },
  'tel-aviv':       { backgroundColor: '#f9f9f7', primaryColor: '#1a1a1a', secondaryColor: '#555555', textColor: '#1a1a1a' },
  'midnight-blue':  { backgroundColor: '#f0f4f8', primaryColor: '#1e3a5f', secondaryColor: '#4a6a9f', textColor: '#0a1628' },
  mediterranean:    { backgroundColor: '#f8fafc', primaryColor: '#0f2b46', secondaryColor: '#3a6080', textColor: '#10233c' },
  provence:         { backgroundColor: '#f7efe3', primaryColor: '#a06a3b', secondaryColor: '#c09060', textColor: '#3b2f25' },
  'english-garden': { backgroundColor: '#f3f5ef', primaryColor: '#8aa089', secondaryColor: '#b4c4b0', textColor: '#2f3b34' },
  'minimal-white':  { backgroundColor: '#ffffff', primaryColor: '#111111', secondaryColor: '#444444', textColor: '#111111' },
};

const FONT_PER_STYLE: Record<string, string> = {
  modern: "'Inter', 'Helvetica Neue', sans-serif",
  minimal: "'Inter', 'Helvetica Neue', sans-serif",
  'minimal-white': "'Inter', 'Helvetica Neue', sans-serif",
  'tel-aviv': "'Inter', 'Helvetica Neue', sans-serif",
  'nordic-minimal': "'Raleway', sans-serif",
  boho: "'Josefin Sans', sans-serif",
  'rustic-chic': "'Josefin Sans', sans-serif",
  'garden-party': "'Josefin Sans', sans-serif",
  tropical: "'Josefin Sans', sans-serif",
  'desert-sunset': "'Josefin Sans', sans-serif",
  provence: "'Josefin Sans', sans-serif",
  parisian: "'Raleway', sans-serif",
  mediterranean: "'Raleway', sans-serif",
};

function themeFromTemplateId(templateId: string): WeddingTheme {
  const base = defaultWeddingTheme();
  const id = templateId.toLowerCase().trim();

  // Find matching style key
  const style = (Object.keys(STYLE_COLORS).find((k) => k === id) ?? 'classic') as WeddingTheme['style'];
  const colors = STYLE_COLORS[style] ?? STYLE_COLORS['classic'];
  const font = FONT_PER_STYLE[style] ?? "'Cormorant Garamond', Georgia, serif";

  const rawTheme: WeddingTheme = {
    ...base,
    style,
    ...colors,
    fontFamily: font,
    ambiance: 'chic',
    titleSize: 'large',
    borderRadius: 12,
    cardStyle: 'shadow',
    layout: 'centered',
  };

  // Apply structural preset — this sets heroStyle, patternId, etc.
  // which causes the UniversalTemplate to be selected
  return applyThemePreset(rawTheme);
}

/** Mappe la réponse actuelle de l'API invité vers le modèle riche `WeddingSite`. */
export function mapLegacyPublicSiteToWeddingSite(p: LegacyPublicPayload): WeddingSite {
  const now = new Date().toISOString();
  const config = p.siteConfig;

  const effectiveStyle = config?.style ?? p.templateId;
  const theme = themeFromTemplateId(effectiveStyle);

  return {
    id: `legacy:${p.slug}`,
    slug: p.slug,
    coupleName: `${p.brideName} & ${p.groomName}`,
    groomName: config?.groomName ?? p.groomName,
    brideName: config?.brideName ?? p.brideName,
    date: guessIsoFromWeddingDate(config?.date ?? p.weddingDate),
    time: '',
    city: config?.city ?? '',
    venue: config?.venue ?? p.location ?? '',
    welcomeText: config?.welcomeText ?? '',
    mainText: p.customText ?? '',
    language: 'fr',
    theme,
    sections: defaultWeddingSections(),
    createdAt: now,
    updatedAt: now,
  };
}
