// ─────────────────────────────────────────────────────────────────────────────
// « Style de mon invitation » : le plan de table reprend l'identité visuelle du
// site invités du couple (couleurs, polices, monogramme et visuels du
// faire-part : arche eucalyptus, cadre papillons, rideau ivoire, motif floral
// Vintage Bleu, rayures…).
//
// Fichier PUR (aucun import React Native) : le chargement réseau du site et la
// conversion des images en data URI sont dans hooks/use-site-style.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { PAGE_H, PAGE_W, bar, esc, initialsOf, renderPanel, type RenderArgs } from './panel-templates';

/** Les visuels du site sont servis par le guest-site (Cloudflare Pages). */
export const SITE_ASSET_BASE = 'https://oheve.pages.dev';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Sous-ensemble du WeddingTheme du guest-site utile à l'impression. */
export type SiteThemeLike = {
  style?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  mutedTextColor?: string;
  cardBackgroundColor?: string;
  fontFamily?: string;
  titleFontFamily?: string;
  scriptFontFamily?: string;
  floralPattern?: string;
};

export type SiteLike = {
  coupleName?: string;
  brideName?: string;
  groomName?: string;
  theme?: SiteThemeLike | null;
  content?: { monogramSvg?: string } | null;
};

export type SiteDecor =
  | { kind: 'frame'; set: 'eucalyptus' | 'papillons' }
  | { kind: 'curtain' }
  | { kind: 'pattern'; image: string }
  | { kind: 'stripes' }
  | { kind: 'lines' };

export type SiteStyle = {
  /** Nom du modèle du site, affiché dans l'app (« Arche eucalyptus »…) */
  label: string;
  coupleName: string;
  /** « Mariage de », « Bar Mitsva de »… */
  eyebrow: string;
  dark: boolean;
  c: {
    paper: string; ink: string; muted: string; foil: string; soft: string;
    hairline: string; surface: string;
  };
  f: { title: string; script: string; body: string; label: string };
  /** @import Google Fonts des polices du site */
  fontCss: string;
  decor: SiteDecor;
  monogramSvg?: string;
  /** URL distantes des images du décor (remplacées par des data URI au chargement) */
  images: Record<string, string>;
};

// ── Couleurs ──────────────────────────────────────────────────────────────────

const HEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

function rgb(hex: string): [number, number, number] | null {
  const m = HEX.exec((hex || '').trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

export function withAlpha(hex: string, a: number): string {
  const c = rgb(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : hex;
}

/** Éclaircit (k > 0) ou assombrit (k < 0), k ∈ [-1, 1]. */
export function shade(hex: string, k: number): string {
  const c = rgb(hex);
  if (!c) return hex;
  const mix = (v: number) => Math.round(Math.max(0, Math.min(255, k >= 0 ? v + (255 - v) * k : v * (1 + k))))
    .toString(16).padStart(2, '0');
  return `#${mix(c[0])}${mix(c[1])}${mix(c[2])}`;
}

function luminance(hex: string): number {
  const c = rgb(hex);
  if (!c) return 1;
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

const isHex = (v?: string) => !!v && HEX.test(v.trim());
const pick = (v: string | undefined, fallback: string) => (isHex(v) ? v!.trim() : fallback);

// ── Polices ───────────────────────────────────────────────────────────────────

/** Première famille d'une pile CSS : "'Great Vibes', cursive" → "Great Vibes". */
function firstFamily(stack?: string): string | null {
  if (!stack) return null;
  const f = stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  if (!f || /^(serif|sans-serif|cursive|monospace|system-ui|-apple-system|Georgia|Times New Roman)$/i.test(f)) return null;
  return f;
}

/**
 * Une règle @import par famille : si Google ne connaît pas une graisse pour
 * une police (scripts en 400 seulement), seule cette ligne échoue. La seconde
 * ligne sans graisse sert de filet.
 */
function fontImports(stacks: string[]): string {
  const fams = Array.from(new Set(stacks.map(firstFamily).filter((f): f is string => !!f)));
  return fams.map((f) => {
    const q = encodeURIComponent(f).replace(/%20/g, '+');
    return `@import url('https://fonts.googleapis.com/css2?family=${q}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');`
      + `@import url('https://fonts.googleapis.com/css2?family=${q}&display=swap');`;
  }).join('');
}

// Cormorant Garamond rend le « 1 » comme un « I » : jamais pour le numéro.
function numberFont(stack: string): string {
  return /cormorant/i.test(stack) ? "'Playfair Display','Bodoni Moda',Georgia,serif" : stack;
}

// ── Construction du style depuis le site ─────────────────────────────────────

const SANS = "'Montserrat','DM Sans',-apple-system,sans-serif";

type DecorDefaults = { paper: string; ink: string; foil: string; soft: string; script: string; title: string; body: string };

const INVITATION_DEFAULTS: Record<string, DecorDefaults> = {
  'invitation-animee': { paper: '#FFF9F2', ink: '#6F5B46', foil: '#A88D70', soft: '#C9B79F', script: "'Great Vibes', cursive", title: "'Bodoni Moda', Georgia, serif", body: "'Cormorant Garamond', Georgia, serif" },
  'invitation-eucalyptus': { paper: '#F6F1E6', ink: '#6A5536', foil: '#B38B3E', soft: '#93A88C', script: "'Pinyon Script', cursive", title: "'Playfair Display', Georgia, serif", body: "'Cormorant Garamond', Georgia, serif" },
  'invitation-papillons': { paper: '#2A1236', ink: '#F7EEF6', foil: '#E0B66A', soft: '#B78FD0', script: "'Pinyon Script', cursive", title: "'Playfair Display', Georgia, serif", body: "'Cormorant Garamond', Georgia, serif" },
  'invitation-tefillin': { paper: '#2A0B12', ink: '#EED9D2', foil: '#C79C92', soft: '#6E2E38', script: "'Bodoni Moda', Georgia, serif", title: "'Bodoni Moda', Georgia, serif", body: "'Cormorant Garamond', Georgia, serif" },
};

const GENERIC: DecorDefaults = { paper: '#FBF7EE', ink: '#3A3020', foil: '#B8975A', soft: '#D9C9A8', script: "'Great Vibes', cursive", title: "'Playfair Display', Georgia, serif", body: "'Cormorant Garamond', Georgia, serif" };

const STYLE_LABELS: Record<string, string> = {
  'invitation-animee': 'Invitation animée',
  'invitation-eucalyptus': 'Arche eucalyptus',
  'invitation-papillons': 'Papillons dorés',
  'invitation-tefillin': 'Tefillin',
  'voile-ivoire': 'Voile Ivoire',
  'vintage-blue': 'Vintage Bleu',
  'stripes-editorial': 'Éditorial Rayures',
  'editorial-cards': 'Cartes éditoriales',
};

function decorFor(style: string, theme: SiteThemeLike): SiteDecor {
  if (style === 'invitation-eucalyptus') return { kind: 'frame', set: 'eucalyptus' };
  if (style === 'invitation-papillons') return { kind: 'frame', set: 'papillons' };
  if (style === 'voile-ivoire') return { kind: 'curtain' };
  if (style === 'vintage-blue') {
    const img = theme.floralPattern ? `${SITE_ASSET_BASE}${theme.floralPattern.startsWith('/') ? '' : '/'}${theme.floralPattern}` : `${SITE_ASSET_BASE}/vintage-floral-bg.png`;
    return { kind: 'pattern', image: img };
  }
  if (style === 'stripes-editorial') return { kind: 'stripes' };
  return { kind: 'lines' };
}

function imagesFor(decor: SiteDecor): Record<string, string> {
  if (decor.kind === 'frame') {
    const d = `${SITE_ASSET_BASE}/invitation-${decor.set}`;
    return { top: `${d}/top.jpg`, middle: `${d}/middle.jpg`, bottom: `${d}/bottom.jpg` };
  }
  if (decor.kind === 'curtain') return { bg: `${SITE_ASSET_BASE}/ivory-curtain-bg.png` };
  if (decor.kind === 'pattern') return { bg: decor.image };
  return {};
}

export function buildSiteStyle(site: SiteLike, eventLabel: string | null): SiteStyle {
  const theme = site.theme ?? {};
  const style = theme.style ?? '';
  const D = INVITATION_DEFAULTS[style] ?? GENERIC;

  const paper = pick(theme.backgroundColor, D.paper);
  const dark = luminance(paper) < 0.42;
  const ink = pick(theme.textColor, D.ink);
  const foil = pick(theme.primaryColor, D.foil);
  const soft = pick(theme.accentColor ?? theme.secondaryColor, D.soft);

  const title = theme.titleFontFamily || (INVITATION_DEFAULTS[style] ? D.title : theme.fontFamily) || D.title;
  const script = theme.scriptFontFamily || D.script;
  const body = theme.fontFamily || D.body;

  const decor = decorFor(style, theme);
  const names = [site.brideName, site.groomName].map((n) => (n ?? '').trim()).filter(Boolean);
  const coupleName = (site.coupleName ?? '').trim() || names.join(' & ');

  return {
    label: STYLE_LABELS[style] ?? 'Mon site',
    coupleName,
    eyebrow: eventLabel ? `${eventLabel} de` : 'Mariage de',
    dark,
    c: {
      paper, ink, foil, soft,
      muted: pick(theme.mutedTextColor, withAlpha(ink, 0.72)),
      hairline: withAlpha(foil, dark ? 0.5 : 0.42),
      surface: dark ? shade(paper, 0.08) : pick(theme.cardBackgroundColor, '#FFFFFF'),
    },
    f: { title, script, body, label: SANS },
    fontCss: fontImports([title, script, body, "'Montserrat'", "'Playfair Display'"]),
    decor,
    monogramSvg: site.content?.monogramSvg || undefined,
    images: imagesFor(decor),
  };
}

// ── Décor partagé (CSS une seule fois dans le document) ──────────────────────
// Les images (data URI de plusieurs centaines de Ko) ne sont écrites qu'une
// fois, dans la feuille de style, et réutilisées par chaque page via classes.

// Dimensions natives des visuels du faire-part (1000 px de large).
const FRAME_H: Record<'eucalyptus' | 'papillons', { top: number; middle: number; bottom: number; bg: string }> = {
  eucalyptus: { top: 820, middle: 48, bottom: 580, bg: '#F3EEE2' },
  papillons: { top: 710, middle: 220, bottom: 690, bg: '#230E2F' },
};

const cssUrl = (u?: string) => (u ? `url("${u.replace(/"/g, '%22')}")` : 'none');

export function siteDecorCss(s: SiteStyle): string {
  const k = PAGE_W / 1000;
  let css = s.fontCss;
  // Sélecteur doublé : l'aperçu force .page en blanc (body.preview .page).
  const PG = '.sd-page,body.preview .page.sd-page';
  css += `.sd-abs{position:absolute;left:0;width:${PAGE_W}px;}`;
  // Calligraphie trop petite = lettres confondues (« David » lu « Davia ») : corps plus grand.
  css += `.sd-page .pn-couple.script{font-size:38px;line-height:1.1;}`;
  if (s.decor.kind === 'frame') {
    const h = FRAME_H[s.decor.set];
    const top = Math.round(h.top * k), bottom = Math.round(h.bottom * k);
    css += `${PG}{background:${h.bg};}`;
    css += `.sd-top{top:0;height:${top}px;background:${cssUrl(s.images.top)} center top/100% 100% no-repeat;z-index:1;}`;
    css += `.sd-bot{bottom:0;height:${bottom}px;background:${cssUrl(s.images.bottom)} center bottom/100% 100% no-repeat;z-index:1;}`;
    css += `.sd-mid{top:${top - 20}px;bottom:${bottom - 20}px;background:${cssUrl(s.images.middle)} center top/100% auto repeat-y;}`;
    if (s.decor.set === 'papillons') {
      css += `.sd-top{-webkit-mask-image:linear-gradient(to bottom,#000 92%,transparent);mask-image:linear-gradient(to bottom,#000 92%,transparent);}`;
      css += `.sd-bot{-webkit-mask-image:linear-gradient(to top,#000 92%,transparent);mask-image:linear-gradient(to top,#000 92%,transparent);}`;
    }
  } else if (s.decor.kind === 'curtain') {
    css += `${PG}{background:${s.c.paper} ${cssUrl(s.images.bg)} center top/cover no-repeat;}`;
  } else if (s.decor.kind === 'pattern') {
    css += `${PG}{background:${s.c.paper} ${cssUrl(s.images.bg)} center/300px auto repeat;}`;
  } else {
    css += `${PG}{background:${s.c.paper};}`;
  }
  return css;
}

/** Calque décor d'une page A4 (sous le contenu). */
function decorLayer(s: SiteStyle): string {
  const d = s.decor;
  if (d.kind === 'frame') {
    return `<div class="sd-abs sd-mid"></div><div class="sd-abs sd-top"></div><div class="sd-abs sd-bot"></div>`;
  }
  const svg = (inner: string) => `<svg width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  if (d.kind === 'pattern') {
    // Carte papier posée sur le motif floral, comme l'en-tête du site Vintage.
    return svg(`
      <rect x="40" y="40" width="${PAGE_W - 80}" height="${PAGE_H - 80}" rx="16" fill="${s.c.paper}" opacity=".97"/>
      <rect x="52" y="52" width="${PAGE_W - 104}" height="${PAGE_H - 104}" rx="10" fill="none" stroke="${s.c.foil}" stroke-width=".9" opacity=".6"/>`);
  }
  if (d.kind === 'curtain') {
    return svg(`<rect x="90" y="96" width="${PAGE_W - 180}" height="${PAGE_H - 170}" rx="${(PAGE_W - 180) / 2}" fill="#FFFFFF" opacity=".35"/>`);
  }
  if (d.kind === 'stripes') {
    const w = 10;
    const n = Math.ceil(PAGE_W / (w * 2));
    const stripes = (y: number, h: number) => Array.from({ length: n }, (_, i) =>
      `<rect x="${i * w * 2}" y="${y}" width="${w}" height="${h}" fill="${s.c.foil}"/>`).join('');
    return svg(`${stripes(0, 104)}${stripes(PAGE_H - 34, 34)}
      <rect x="0" y="104" width="${PAGE_W}" height="1.5" fill="${s.c.foil}"/>
      <rect x="0" y="${PAGE_H - 35.5}" width="${PAGE_W}" height="1.5" fill="${s.c.foil}"/>`);
  }
  // Filets fins doublés + losanges, dans la couleur principale du site.
  const dia = (x: number, y: number) => `<path d="M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y}Z" fill="${s.c.foil}"/>`;
  return svg(`
    <rect x="28" y="28" width="${PAGE_W - 56}" height="${PAGE_H - 56}" fill="none" stroke="${s.c.foil}" stroke-width="1.2" opacity=".85"/>
    <rect x="36" y="36" width="${PAGE_W - 72}" height="${PAGE_H - 72}" fill="none" stroke="${s.c.foil}" stroke-width=".5" opacity=".55"/>
    ${dia(PAGE_W / 2, 28)}${dia(PAGE_W / 2, PAGE_H - 28)}${dia(28, PAGE_H / 2)}${dia(PAGE_W - 28, PAGE_H / 2)}`);
}

/** Marges du bloc de contenu selon le décor : le texte reste DANS le cadre. */
function insetFor(s: SiteStyle): [number, number, number, number] {
  const d = s.decor;
  // L'étoile de David de l'arche occupe y ≈ 125–225 : le texte commence dessous.
  if (d.kind === 'frame' && d.set === 'eucalyptus') return [234, 112, 84, 112];
  if (d.kind === 'frame') return [120, 108, 116, 108];
  if (d.kind === 'curtain') return [118, 120, 92, 120];
  if (d.kind === 'pattern') return [84, 80, 76, 80];
  if (d.kind === 'stripes') return [140, 78, 70, 78];
  return [80, 82, 76, 82];
}

/** Monogramme du site (créé dans le builder), ou initiales cerclées. */
function crestFor(s: SiteStyle, coupleName: string): { svg: string; h: number } | null {
  // L'arche eucalyptus porte déjà son étoile de David, les papillons leur cadre.
  if (s.decor.kind === 'frame') return null;
  if (s.monogramSvg) {
    const m = s.monogramSvg.replace(/width="[^"]*"/, 'width="74"').replace(/height="[^"]*"/, 'height="74"');
    return { svg: `<div style="width:74px;height:74px;color:${s.c.foil};">${m}</div>`, h: 74 };
  }
  return {
    svg: `<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="36" r="34" fill="none" stroke="${s.c.foil}" stroke-width="1"/>
      <circle cx="36" cy="36" r="28.5" fill="none" stroke="${s.c.foil}" stroke-width=".5" opacity=".6"/>
      <text x="36" y="45" text-anchor="middle" font-family="${esc(numberFont(s.f.title))}" font-style="italic" font-size="25" fill="${s.c.foil}">${esc(initialsOf(coupleName))}</text>
    </svg>`,
    h: 72,
  };
}

function fontVars(s: SiteStyle): string {
  return `--f-serif:${s.f.body};--f-script:${s.f.script};--f-display:${numberFont(s.f.title)};`;
}

// ── Carte panneau « Mon invitation » ─────────────────────────────────────────

export function renderSitePanel(a: RenderArgs, s: SiteStyle): string {
  const coupleName = s.coupleName || a.coupleName;
  const crest = crestFor(s, coupleName);
  const c = s.c;
  return renderPanel({
    a: { ...a, coupleName, eyebrow: s.eyebrow },
    bg: '', // fond porté par la classe .sd-page (images en data URI)
    pageClass: 'sd-page',
    vars: fontVars(s),
    inset: insetFor(s),
    decor: decorLayer(s),
    crest: crest?.svg, crestH: crest?.h,
    couple: 'script',
    p: {
      eyebrow: c.muted, label: withAlpha(c.foil, 0.9), num: c.foil, name: c.ink,
      text: c.ink, divider: c.hairline, foot: c.muted, accent: c.foil,
    },
    hero: (size) => `<div class="pn-hero" style="font-size:${size}px;">${a.tableNum}</div>`,
    heroBase: s.decor.kind === 'frame' ? (s.decor.set === 'eucalyptus' ? 96 : 112) : 124,
    rule: s.decor.kind === 'frame' && s.decor.set === 'eucalyptus'
      ? bar(170, c.foil, 'star', .9)
      : bar(180, c.foil, 'lozenge', .85),
  });
}

// ── Couverture « Plan de table » aux couleurs du site ────────────────────────

export function renderSiteCover(
  s: SiteStyle,
  w: { coupleName: string; date: string; location: string },
  stats: { v: number; l: string }[],
): string {
  const [it, ir, ib, il] = insetFor(s);
  const c = s.c;
  const coupleName = s.coupleName || w.coupleName;
  const crest = crestFor(s, coupleName);
  const boxes = stats.map(({ v, l }) => `<div style="background:${withAlpha(c.surface, s.dark ? 0.75 : 0.85)};border:.6px solid ${c.hairline};border-radius:10px;padding:12px 4px;">
      <div style="font-family:${numberFont(s.f.title)};font-size:26px;font-weight:600;color:${c.foil};line-height:1;">${v}</div>
      <div style="font-family:${s.f.label};font-size:7px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:${c.muted};margin-top:5px;">${l}</div>
    </div>`).join('');
  return `<div class="page pn sd-page" style="${fontVars(s)}">
    <div class="pn-decor">${decorLayer(s).replace(/ id="([\w-]+)"/g, ' id="$1-cv"').replace(/url\(#([\w-]+)\)/g, 'url(#$1-cv)')}</div>
    <div class="pn-body" style="top:${it}px;right:${ir}px;bottom:${ib}px;left:${il}px;justify-content:center;">
      ${crest ? `<div class="pn-crest" style="height:${crest.h}px;margin-bottom:18px;">${crest.svg}</div>` : ''}
      <div style="font-family:${s.f.label};font-size:9px;font-weight:600;letter-spacing:6px;text-transform:uppercase;color:${c.muted};padding-left:6px;">Plan de table</div>
      <div style="margin:16px 0 6px;">${bar(170, c.foil, s.decor.kind === 'frame' && s.decor.set === 'eucalyptus' ? 'star' : 'lozenge', .85)}</div>
      <div style="font-family:${s.f.label};font-size:8px;letter-spacing:3px;text-transform:uppercase;color:${c.muted};margin-top:14px;">${esc(s.eyebrow)}</div>
      <div style="font-family:${s.f.script};font-size:46px;line-height:1.25;color:${c.ink};margin-top:6px;max-width:100%;">${esc(coupleName || 'Plan de table')}</div>
      ${w.date ? `<div style="font-family:${s.f.body};font-style:italic;font-size:16px;color:${c.ink};margin-top:8px;">${esc(w.date)}</div>` : ''}
      ${w.location ? `<div style="font-family:${s.f.body};font-size:13px;color:${c.muted};margin-top:3px;">${esc(w.location)}</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(${stats.length},1fr);gap:8px;margin-top:30px;width:100%;max-width:330px;">${boxes}</div>
    </div>
  </div>`;
}

/**
 * Palette des pages de liste (Liste par table, Livre des tables) : polices et
 * couleurs du site, mais TOUJOURS sur papier clair — ce sont des documents de
 * travail (traiteur, accueil), on n'imprime pas des pages entières en violet.
 */
export function siteListPalette(s: SiteStyle) {
  const accent = s.c.foil;
  const ink = s.dark ? s.c.paper : s.c.ink;
  const paper = s.dark ? shade(s.c.soft, 0.9) : s.c.paper;
  return {
    sauge: accent,
    saugeDark: shade(accent, -0.25),
    saugePale: withAlpha(accent, 0.28),
    beige: s.c.soft,
    ivoire: paper,
    taupe: withAlpha(accent, 0.5),
    moka: ink,
    textDark: ink,
    textMid: withAlpha(ink, 0.85),
    textLight: withAlpha(ink, 0.6),
    card: '#FFFFFF',
    error: '#B5615F',
    errorPale: '#F6E9E8',
    titleFont: s.f.title,
    accents: [accent, s.c.soft, shade(accent, -0.25), shade(s.c.soft, -0.25)],
  };
}

