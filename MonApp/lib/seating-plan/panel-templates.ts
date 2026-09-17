// ─────────────────────────────────────────────────────────────────────────────
// Cartes panneau — une page A4 par table, six modèles.
//
// Toutes les mises en page sont dessinées dans un repère FIXE de 595 × 842 px
// (A4 en points). L'aperçu (WebView, viewport = 595) et l'impression
// (expo-print, width 595 / height 842) utilisent ce même repère : ce que l'on
// voit à l'écran est exactement ce qui sort sur le PDF.
//
// La liste des convives s'adapte au nombre d'invités : nombre de colonnes,
// taille de police et, pour les tablées exceptionnelles, découpage sur
// plusieurs pages (« suite »). Un invité comptant pour plusieurs personnes
// n'est affiché qu'une fois, avec un discret « +1 ».
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_W = 595;
export const PAGE_H = 842;

const GOLD = '#C5A55A';
const GOLD_DARK = '#A8893A';
const GOLD_LIGHT = '#E9D8A8';
const NAVY = '#1B2A56';
const FOREST = '#3F5E3A';
const SAGE = '#6E8F69';
const BROWN = '#4A3620';
const BURGUNDY = '#8B3A3A';
const CHARCOAL = '#2F332D';

const SERIF = "'Cormorant Garamond',Georgia,serif";
const DISPLAY = "'Playfair Display','Cormorant Garamond',Georgia,serif";
const SCRIPT = "'Parisienne','Cormorant Garamond',cursive";
const SANS = "'DM Sans',-apple-system,sans-serif";
const HEBREW = "'Frank Ruhl Libre','David','Times New Roman',serif";

export type PanelTemplateId =
  | 'classic' | 'botanique' | 'jewish'
  | 'plexiglass' | 'suspended' | 'ketouba';

export type PanelGuest = { name: string; count: number };

export type RenderArgs = {
  tableNum: number;
  tableName: string;
  guests: PanelGuest[];
  occupied: number;
  seats: number;
  coupleName: string;
  weddingTitle: string;
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Feuille de style partagée ─────────────────────────────────────────────────
// Les couleurs propres à chaque modèle passent par des variables CSS posées sur
// la page ; la structure (en-tête / liste / pied) est commune.

export const PANEL_CSS = `
.pn{width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;position:relative;page-break-after:always;break-after:page;}
.pn:last-child{page-break-after:auto;break-after:auto;}
.pn-decor,.pn-over{position:absolute;inset:0;pointer-events:none;}
.pn-decor{z-index:0;}.pn-over{z-index:2;}
.pn-decor>svg,.pn-over>svg{display:block;position:absolute;top:0;left:0;}
.pn-body{position:absolute;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;}
.pn-head{flex:0 0 auto;width:100%;display:flex;flex-direction:column;align-items:center;}
.pn-crest{display:flex;align-items:center;justify-content:center;}
.pn-crest svg{display:block;}
.pn-eyebrow{font-family:${SANS};font-size:8.5px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:var(--eyebrow);margin-top:14px;padding-left:4px;}
.pn-couple{font-family:${SERIF};font-style:italic;font-weight:500;font-size:22px;color:var(--name);margin-top:3px;line-height:1.2;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pn-couple.script{font-family:${SCRIPT};font-style:normal;font-weight:400;font-size:32px;margin-top:0;line-height:1.15;}
.pn-label{display:flex;align-items:center;gap:12px;margin-top:20px;font-family:${SANS};font-size:9.5px;font-weight:600;letter-spacing:7px;text-transform:uppercase;color:var(--label);padding-left:7px;}
.pn-label i{display:block;width:34px;height:1px;background:var(--label);opacity:.55;}
.pn-hero{font-family:${DISPLAY};font-weight:700;color:var(--num);line-height:1;margin-top:8px;font-variant-numeric:lining-nums;}
.pn-hero.foil{background:linear-gradient(160deg,${GOLD_LIGHT} 0%,${GOLD} 45%,#9F8135 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;}
.pn-hero.light{font-weight:400;letter-spacing:-2px;}
.pn-name{font-family:${SERIF};font-size:22px;font-weight:600;color:var(--name);margin-top:6px;line-height:1.2;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pn-suite{font-family:${SERIF};font-style:italic;font-size:14px;color:var(--foot);margin-top:4px;}
.pn-rule{margin-top:14px;display:flex;justify-content:center;}
.pn-rule svg{display:block;}
.pn-list{flex:1 1 auto;width:100%;display:flex;align-items:center;justify-content:center;padding:12px 0;min-height:0;}
.pn-grid{display:grid;width:100%;column-gap:28px;}
.pn-cell{font-family:${SERIF};font-weight:600;color:var(--text);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:6px;padding-right:6px;}
.pn-cell.b{border-bottom:.6px solid var(--divider);}
.pn-cnt{font-family:${SANS};font-weight:600;color:var(--accent);vertical-align:super;margin-left:5px;letter-spacing:.5px;}
.pn-empty{font-family:${SERIF};font-style:italic;font-size:19px;color:var(--foot);}
.pn-foot{flex:0 0 auto;width:100%;display:flex;flex-direction:column;align-items:center;padding-top:12px;border-top:.6px solid var(--divider);}
.pn-seats{font-family:${SANS};font-size:9px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;color:var(--foot);}
.pn-tag{font-family:${SERIF};font-style:italic;font-size:13.5px;color:var(--foot);margin-top:5px;}
.pn-heb{font-family:${HEBREW};font-size:14px;color:var(--accent);margin-top:7px;direction:rtl;letter-spacing:1px;}
`;

// ── Liste des convives : choix automatique colonnes / corps / pagination ──────

const ROW_K = 1.8;    // hauteur d'une ligne ≈ 1.8 × corps (interligne 1.3 + marges 0.25)
const MIN_FS = 11;    // corps minimal lisible sur un panneau
const COL_GAP = 28;

type Fit = { cols: number; rows: number; fs: number; pad: number; overflow: boolean };

function fitGuests(n: number, budgetH: number, budgetW: number, maxChars: number): Fit {
  const caps = [0, 27, 21, 16];
  let best: Fit | undefined;
  for (let cols = 1; cols <= 3; cols++) {
    if (cols === 2 && n <= 8) break;
    if (cols === 3 && n <= 22) break;
    const rows = Math.ceil(n / cols);
    const colW = (budgetW - (cols - 1) * COL_GAP) / cols;
    const byH = budgetH / (rows * ROW_K);
    const byW = (colW - 12) / (Math.max(8, maxChars) * 0.47);
    const fs = Math.floor(Math.max(MIN_FS, Math.min(caps[cols], byH, byW)));
    const overflow = rows * fs * ROW_K > budgetH + 1;
    const fit: Fit = { cols, rows, fs, pad: Math.max(3, Math.round(fs * 0.25)), overflow };
    if (!best || (best.overflow && !overflow) || (!overflow && fs > best.fs + 2)) best = fit;
  }
  return best!;
}

function splitEven<T>(items: T[], capacity: number): T[][] {
  if (items.length <= capacity) return [items];
  const pages = Math.ceil(items.length / capacity);
  const per = Math.ceil(items.length / pages);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per));
  return out;
}

function guestGrid(guests: PanelGuest[], budgetH: number, budgetW: number): string {
  if (!guests.length) return `<div class="pn-empty">Aucun invité assigné</div>`;
  const maxChars = Math.max(...guests.map(g => g.name.length + (g.count > 1 ? 3 : 0)));
  const { cols, rows, fs, pad } = fitGuests(guests.length, budgetH, budgetW, maxChars);
  const cells = guests.map((g, i) => {
    const lastRow = i % rows === rows - 1 || i === guests.length - 1;
    const cnt = g.count > 1 ? `<span class="pn-cnt" style="font-size:${Math.round(fs * 0.5)}px;">+${g.count - 1}</span>` : '';
    return `<div class="pn-cell${lastRow ? '' : ' b'}" style="font-size:${fs}px;padding-top:${pad}px;padding-bottom:${pad}px;">${esc(g.name)}${cnt}</div>`;
  }).join('');
  return `<div class="pn-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${rows},auto);grid-auto-flow:column;">${cells}</div>`;
}

// ── Ossature commune ──────────────────────────────────────────────────────────

type Palette = {
  eyebrow: string; label: string; num: string; name: string;
  text: string; divider: string; foot: string; accent: string;
};

type ShellOpts = {
  a: RenderArgs;
  p: Palette;
  bg: string;                         // fond CSS de la page
  inset: [number, number, number, number]; // marges du bloc de contenu (haut, droite, bas, gauche)
  decor?: string;                     // calque plein format sous le contenu
  overlay?: string;                   // calque plein format au-dessus du contenu
  crest?: string; crestH?: number;
  hero: (size: number) => string; heroBase: number;
  heroH?: (size: number) => number;   // hauteur réelle du bloc numéro si ≠ taille de police
  rule: string;
  couple?: 'italic' | 'script';
  extraFooter?: string;
};

// Les dégradés, motifs et filtres SVG sont référencés par id : on les suffixe
// par page pour qu'aucune page n'aille chercher la définition d'une autre.
function uniqIds(svg: string, uid: string): string {
  return svg
    .replace(/ id="([A-Za-z0-9_-]+)"/g, (_m, id) => ` id="${id}-${uid}"`)
    .replace(/url\(#([A-Za-z0-9_-]+)\)/g, (_m, id) => `url(#${id}-${uid})`);
}

function renderPanel(o: ShellOpts): string {
  const { a, p } = o;
  const [it, ir, ib, il] = o.inset;
  const n = a.guests.length;
  const heroK = n > 14 ? 0.66 : n > 9 ? 0.78 : n > 5 ? 0.9 : 1;
  const heroSize = Math.round(o.heroBase * heroK);
  const crestH = o.crestH ?? 0;
  const tname = a.tableName.trim();
  const hasName = tname !== '' && tname !== String(a.tableNum);

  const coupleH = a.coupleName ? (o.couple === 'script' ? 66 : 54) : 14;
  const heroH = o.heroH ? o.heroH(heroSize) : heroSize;
  const headerH = crestH + coupleH + 30 + heroH + (hasName ? 34 : 0) + 32;
  const footerH = 62 + (o.extraFooter ? 24 : 0);
  const budgetH = Math.max(120, PAGE_H - it - ib - headerH - footerH - 24);
  const budgetW = PAGE_W - il - ir;
  const capacity = Math.max(6, 3 * Math.floor(budgetH / (MIN_FS * ROW_K)));
  const chunks = splitEven(a.guests, capacity);

  const vars = `--eyebrow:${p.eyebrow};--label:${p.label};--num:${p.num};--name:${p.name};--text:${p.text};--divider:${p.divider};--foot:${p.foot};--accent:${p.accent};`;

  return chunks.map((chunk, idx) => {
    const uid = `t${a.tableNum}p${idx}`;
    const decor = o.decor ? uniqIds(o.decor, uid) : '';
    const overlay = o.overlay ? uniqIds(o.overlay, uid) : '';
    const crest = o.crest ? uniqIds(o.crest, uid) : '';
    const suite = chunks.length > 1
      ? `<div class="pn-suite">${idx === 0 ? `1 / ${chunks.length}` : `suite · ${idx + 1} / ${chunks.length}`}</div>`
      : '';
    const header = `
      ${crest ? `<div class="pn-crest" style="height:${crestH}px;">${crest}</div>` : ''}
      ${a.coupleName
        ? `<div class="pn-eyebrow">Mariage de</div><div class="pn-couple${o.couple === 'script' ? ' script' : ''}">${esc(a.coupleName)}</div>`
        : `<div style="height:14px;"></div>`}
      <div class="pn-label"><i></i>Table<i></i></div>
      ${o.hero(heroSize)}
      ${hasName ? `<div class="pn-name">${esc(tname)}</div>` : ''}
      ${suite}
      <div class="pn-rule">${o.rule}</div>`;

    const footer = `
      <div class="pn-seats">${a.occupied} convive${a.occupied > 1 ? 's' : ''}</div>
      <div class="pn-tag">Merci de partager ce moment avec nous</div>
      ${o.extraFooter ? `<div class="pn-heb">${o.extraFooter}</div>` : ''}`;

    return `<div class="page pn" style="background:${o.bg};${vars}">
      ${decor ? `<div class="pn-decor">${decor}</div>` : ''}
      <div class="pn-body" style="top:${it}px;right:${ir}px;bottom:${ib}px;left:${il}px;">
        <div class="pn-head">${header}</div>
        <div class="pn-list">${guestGrid(chunk, budgetH, budgetW)}</div>
        <div class="pn-foot">${footer}</div>
      </div>
      ${overlay ? `<div class="pn-over">${overlay}</div>` : ''}
    </div>`;
  }).join('');
}

// ── Petits composants SVG ─────────────────────────────────────────────────────

const SVG_PAGE = `<svg width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}" xmlns="http://www.w3.org/2000/svg">`;

function goldGrad(id: string, dir: 'diag' | 'radial' = 'diag'): string {
  if (dir === 'radial') {
    return `<radialGradient id="${id}" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset=".55" stop-color="${GOLD}"/><stop offset="1" stop-color="#8F7330"/></radialGradient>`;
  }
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset=".5" stop-color="${GOLD}"/><stop offset="1" stop-color="#9F8135"/></linearGradient>`;
}

function star6(cx: number, cy: number, r: number, stroke: string, sw = 1.2, op = 1, fill = 'none'): string {
  const h = r * 0.866;
  return `<g opacity="${op}"><polygon points="${cx},${cy - r} ${cx + h},${cy + r / 2} ${cx - h},${cy + r / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/><polygon points="${cx},${cy + r} ${cx + h},${cy - r / 2} ${cx - h},${cy - r / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/></g>`;
}

function leaf(x: number, y: number, ang: number, len: number, w: number, fill: string, op = 1, vein = true): string {
  const v = vein ? `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - len}" stroke="#FFFFFF" stroke-width=".7" opacity=".45"/>` : '';
  return `<g transform="rotate(${ang},${x},${y})" opacity="${op}"><path d="M${x} ${y} C${x + w} ${y - len * 0.35}, ${x + w * 0.6} ${y - len * 0.85}, ${x} ${y - len} C${x - w * 0.6} ${y - len * 0.85}, ${x - w} ${y - len * 0.35}, ${x} ${y}Z" fill="${fill}"/>${v}</g>`;
}

function rosette(cx: number, cy: number, r: number, petal: string, center: string): string {
  const petals = Array.from({ length: 8 }, (_, i) =>
    `<ellipse cx="${cx}" cy="${cy - r * 0.55}" rx="${r * 0.3}" ry="${r * 0.5}" fill="${petal}" transform="rotate(${i * 45},${cx},${cy})"/>`).join('');
  return `<g>${petals}<circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="${center}"/></g>`;
}

// Filet ornemental sous le numéro : lignes + motif central.
function bar(w: number, color: string, center: 'lozenge' | 'dot' | 'star' | 'leaves' | 'ring', op = .7): string {
  const c = w / 2;
  let mid = '';
  if (center === 'lozenge') mid = `<path d="M${c} 3 L${c + 5} 8 L${c} 13 L${c - 5} 8Z" fill="${color}"/>`;
  if (center === 'dot') mid = `<circle cx="${c}" cy="8" r="2.4" fill="${color}"/>`;
  if (center === 'ring') mid = `<circle cx="${c}" cy="8" r="4.5" fill="none" stroke="${color}" stroke-width="1"/><circle cx="${c}" cy="8" r="1.6" fill="${color}"/>`;
  if (center === 'star') mid = star6(c, 8, 6.5, color, 1, 1);
  if (center === 'leaves') mid = `${leaf(c - 4, 12, -62, 13, 4.5, color, .9, false)}${leaf(c + 4, 12, 62, 13, 4.5, color, .9, false)}<circle cx="${c}" cy="11" r="1.6" fill="${color}"/>`;
  const gap = center === 'leaves' || center === 'star' ? 16 : 12;
  return `<svg width="${w}" height="16" viewBox="0 0 ${w} 16" xmlns="http://www.w3.org/2000/svg"><g opacity="${op}"><line x1="0" y1="8" x2="${c - gap}" y2="8" stroke="${color}" stroke-width=".8"/><line x1="${c + gap}" y1="8" x2="${w}" y2="8" stroke="${color}" stroke-width=".8"/>${mid}</g></svg>`;
}

function heroPlain(n: number, cls = ''): (size: number) => string {
  return (size) => `<div class="pn-hero${cls ? ' ' + cls : ''}" style="font-size:${size}px;">${n}</div>`;
}

function initialsOf(coupleName: string): string {
  const parts = coupleName.split(/\s*(?:&|\+|\bet\b|\band\b)\s*/i).map(s => s.trim()).filter(Boolean);
  const ini = parts.map(s => s[0] ?? '').join('').slice(0, 2).toUpperCase();
  return ini || '♡';
}

// ── 1. Élégance Classique ─────────────────────────────────────────────────────

const CLASSIC_CORNER = `
  <g fill="none" stroke="${GOLD}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 84 V24 Q10 10 24 10 H84"/>
    <path d="M84 10 C60 10 48 16 44 24 C41 30 46 36 52 33 C57 30 54 23 48 25"/>
    <path d="M10 84 C10 60 16 48 24 44 C30 41 36 46 33 52 C30 57 23 54 25 48"/>
    <path d="M22 22 C32 30 40 40 46 52" stroke-width=".7"/>
  </g>
  ${leaf(30, 34, -128, 14, 5, GOLD, .85, false)}
  ${leaf(40, 42, -100, 14, 5, GOLD, .85, false)}
  ${leaf(36, 30, -160, 12, 4.5, GOLD, .7, false)}
  <path d="M10 10 L16 4 L22 10 L16 16Z" fill="${GOLD}"/>
  <circle cx="46" cy="52" r="1.8" fill="${GOLD}"/>`;

function renderClassic(a: RenderArgs): string {
  const diamond = (x: number, y: number) => `<path d="M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y}Z" fill="${GOLD}" opacity=".85"/>`;
  const decor = `${SVG_PAGE}
    <rect x="26" y="26" width="543" height="790" fill="none" stroke="${GOLD}" stroke-width="1.3" opacity=".85"/>
    <rect x="34" y="34" width="527" height="774" fill="none" stroke="${GOLD}" stroke-width=".5" opacity=".5"/>
    ${diamond(297.5, 26)}${diamond(297.5, 816)}${diamond(26, 421)}${diamond(569, 421)}
    <g transform="translate(26,26)">${CLASSIC_CORNER}</g>
    <g transform="translate(569,26) scale(-1,1)">${CLASSIC_CORNER}</g>
    <g transform="translate(26,816) scale(1,-1)">${CLASSIC_CORNER}</g>
    <g transform="translate(569,816) scale(-1,-1)">${CLASSIC_CORNER}</g>
  </svg>`;
  const crest = `<svg width="76" height="76" viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg">
    <circle cx="38" cy="38" r="36" fill="none" stroke="${GOLD}" stroke-width="1"/>
    <circle cx="38" cy="38" r="30" fill="none" stroke="${GOLD}" stroke-width=".5" opacity=".6"/>
    <text x="38" y="47" text-anchor="middle" font-family="${DISPLAY}" font-style="italic" font-size="26" fill="${GOLD_DARK}">${esc(initialsOf(a.coupleName))}</text>
  </svg>`;
  return renderPanel({
    a, decor, crest, crestH: 76,
    bg: 'radial-gradient(ellipse at 50% 30%,#FFFEFA 0%,#FBF7EE 65%,#F4EEE0 100%)',
    inset: [82, 84, 78, 84],
    p: {
      eyebrow: 'rgba(30,28,26,.55)', label: 'rgba(30,28,26,.55)', num: '#1C1B1A', name: '#3A3020',
      text: '#262220', divider: 'rgba(197,165,90,.5)', foot: 'rgba(30,28,26,.5)', accent: GOLD_DARK,
    },
    hero: heroPlain(a.tableNum), heroBase: 128,
    rule: bar(210, GOLD, 'lozenge', .85),
  });
}

// ── 2. Tradition Juive ────────────────────────────────────────────────────────

function renderJewish(a: RenderArgs): string {
  const bg = '#FCF9F0';
  const arch = 'M64 792 V262 C64 150 150 84 250 74 L297.5 52 L345 74 C445 84 531 150 531 262 V792 Z';
  const arch2 = 'M76 792 V266 C76 160 160 96 254 86 L297.5 66 L341 86 C435 96 519 160 519 266 V792';
  const decor = `${SVG_PAGE}
    <defs>
      <pattern id="sebka" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M14 0 L28 14 L14 28 L0 14Z" fill="none" stroke="${GOLD}" stroke-width=".7"/>
        <circle cx="14" cy="14" r="1.3" fill="${GOLD}"/>
      </pattern>
    </defs>
    <rect x="22" y="22" width="551" height="798" fill="none" stroke="${GOLD}" stroke-width="1.4" opacity=".9"/>
    <rect x="30" y="30" width="535" height="782" fill="url(#sebka)" opacity=".34"/>
    <rect x="30" y="30" width="535" height="782" fill="none" stroke="${GOLD}" stroke-width=".6" opacity=".6"/>
    <path d="${arch}" fill="${bg}" stroke="${GOLD}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="${arch2}" fill="none" stroke="${GOLD}" stroke-width=".7" opacity=".7" stroke-linejoin="round"/>
    <line x1="64" y1="792" x2="531" y2="792" stroke="${GOLD}" stroke-width="1.7"/>
    <circle cx="297.5" cy="40" r="3.2" fill="${GOLD}"/>
    ${star6(64, 262, 7, GOLD, 1, .9, bg)}${star6(531, 262, 7, GOLD, 1, .9, bg)}
    ${star6(297.5, 806, 6, GOLD, 1, .9, bg)}
    <line x1="64" y1="262" x2="531" y2="262" stroke="${GOLD}" stroke-width=".5" opacity=".35" stroke-dasharray="2 4"/>
  </svg>`;
  const crest = `<svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <defs>${goldGrad('jg')}</defs>
    ${star6(26, 26, 20, 'url(#jg)', 1.8, 1)}
    <circle cx="26" cy="26" r="3" fill="${GOLD}" opacity=".8"/>
  </svg>`;
  return renderPanel({
    a, bg, decor, crest, crestH: 52,
    inset: [102, 100, 76, 100],
    p: {
      eyebrow: 'rgba(27,42,86,.6)', label: 'rgba(27,42,86,.6)', num: NAVY, name: '#2E3F73',
      text: NAVY, divider: 'rgba(197,165,90,.55)', foot: 'rgba(27,42,86,.55)', accent: GOLD_DARK,
    },
    hero: heroPlain(a.tableNum), heroBase: 122,
    rule: bar(190, GOLD, 'star', .9),
    extraFooter: 'מזל טוב',
  });
}

// ── 3. Style Ketouba ──────────────────────────────────────────────────────────

function renderKetouba(a: RenderArgs): string {
  const vine = `<pattern id="vine" width="40" height="14" patternUnits="userSpaceOnUse">
      <path d="M0 7 Q10 1 20 7 T40 7" fill="none" stroke="${GOLD_DARK}" stroke-width=".8"/>
      ${leaf(10, 7, -40, 7, 2.6, '#6F7C4E', .9, false)}${leaf(30, 7, 140, 7, 2.6, '#6F7C4E', .9, false)}
      <circle cx="20" cy="7" r="1.6" fill="${BURGUNDY}"/>
    </pattern>`;
  const cartouche = (cx: number, cy: number) => `
    <ellipse cx="${cx}" cy="${cy}" rx="34" ry="13" fill="#F8F1E3" stroke="${GOLD_DARK}" stroke-width="1"/>
    <ellipse cx="${cx}" cy="${cy}" rx="29" ry="9.5" fill="none" stroke="${GOLD_DARK}" stroke-width=".5" opacity=".7"/>
    ${star6(cx, cy, 6, BURGUNDY, 1, 1)}`;
  const decor = `${SVG_PAGE}
    <defs>${vine}</defs>
    <rect x="20" y="20" width="555" height="802" fill="none" stroke="${BROWN}" stroke-width="1.5" opacity=".75"/>
    <rect x="26" y="26" width="543" height="790" fill="none" stroke="${GOLD}" stroke-width=".8"/>
    <rect x="32" y="32" width="531" height="14" fill="url(#vine)"/>
    <rect x="32" y="796" width="531" height="14" fill="url(#vine)"/>
    <g transform="translate(46,32) rotate(90)"><rect x="0" y="0" width="778" height="14" fill="url(#vine)"/></g>
    <g transform="translate(563,32) rotate(90)"><rect x="0" y="0" width="778" height="14" fill="url(#vine)"/></g>
    <rect x="52" y="52" width="491" height="738" fill="none" stroke="${BROWN}" stroke-width=".9" opacity=".7"/>
    <rect x="57" y="57" width="481" height="728" fill="none" stroke="${GOLD}" stroke-width=".45" opacity=".8"/>
    ${rosette(39, 39, 12, GOLD, BURGUNDY)}${rosette(556, 39, 12, GOLD, BURGUNDY)}
    ${rosette(39, 803, 12, GOLD, BURGUNDY)}${rosette(556, 803, 12, GOLD, BURGUNDY)}
    ${cartouche(297.5, 39)}${cartouche(297.5, 803)}
  </svg>`;
  const rays = Array.from({ length: 16 }, (_, i) => `<line x1="30" y1="4" x2="30" y2="10" stroke="${GOLD}" stroke-width="1" transform="rotate(${i * 22.5},30,30)"/>`).join('');
  const crest = `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <defs>${goldGrad('kg')}</defs>
    ${rays}
    <circle cx="30" cy="30" r="17" fill="none" stroke="${GOLD}" stroke-width="1"/>
    ${star6(30, 30, 12, 'url(#kg)', 1.6, 1)}
  </svg>`;
  return renderPanel({
    a, decor, crest, crestH: 60,
    bg: 'radial-gradient(ellipse at 50% 40%,#FBF5E8 0%,#F5EBD6 60%,#EEDFC4 100%)',
    inset: [86, 92, 82, 92],
    p: {
      eyebrow: '#8B6B45', label: '#8B6B45', num: BROWN, name: '#6B4E2E',
      text: BROWN, divider: 'rgba(139,107,69,.4)', foot: '#9A7D5A', accent: BURGUNDY,
    },
    hero: heroPlain(a.tableNum, 'foil'), heroBase: 122,
    rule: bar(200, GOLD_DARK, 'leaves', .9),
    extraFooter: 'אני לדודי ודודי לי',
  });
}

// ── 4. Cartes Suspendues ──────────────────────────────────────────────────────

function renderSuspended(a: RenderArgs): string {
  const L = 52, R = 543, T = 118, B = 784;
  const eyeL = [L + 62, T + 34], eyeR = [R - 62, T + 34];
  const peak = [297.5, 30];
  const twine = (dx: number, col: string, w: number, op: number) =>
    `<path d="M${eyeL[0] + dx} ${eyeL[1]} L${peak[0] + dx} ${peak[1]} L${eyeR[0] + dx} ${eyeR[1]}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const decor = `${SVG_PAGE}
    <defs>
      <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#5A3E2E" flood-opacity=".22"/></filter>
      <filter id="sh2" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#5A3E2E" flood-opacity=".3"/></filter>
      ${goldGrad('sg', 'radial')}
    </defs>
    <rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" rx="14" fill="#FFFDF8" stroke="rgba(197,165,90,.4)" stroke-width="1" filter="url(#sh)"/>
    <rect x="${L + 12}" y="${T + 12}" width="${R - L - 24}" height="${B - T - 24}" rx="8" fill="none" stroke="${GOLD}" stroke-width=".6" opacity=".55"/>
    <circle cx="${eyeL[0]}" cy="${eyeL[1]}" r="7" fill="#F3E7DF" stroke="${GOLD}" stroke-width="1.4"/>
    <circle cx="${eyeR[0]}" cy="${eyeR[1]}" r="7" fill="#F3E7DF" stroke="${GOLD}" stroke-width="1.4"/>
  </svg>`;
  const overlay = `${SVG_PAGE}
    <defs>${goldGrad('sg2', 'radial')}<filter id="sh3" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#5A3E2E" flood-opacity=".3"/></filter></defs>
    ${twine(0, '#B08E52', 2.6, 1)}${twine(0, '#E9D8A8', .8, .9)}
    <circle cx="${peak[0]}" cy="${peak[1]}" r="5" fill="none" stroke="#B08E52" stroke-width="2.2"/>
    <g filter="url(#sh3)">
      <circle cx="297.5" cy="${T}" r="33" fill="url(#sg2)" opacity=".92"/>
      <circle cx="297.5" cy="${T}" r="29" fill="none" stroke="#FFFFFF" stroke-width=".8" opacity=".5"/>
      <text x="297.5" y="${T + 8}" text-anchor="middle" font-family="${DISPLAY}" font-style="italic" font-size="22" fill="#FFFFFF">${esc(initialsOf(a.coupleName))}</text>
    </g>
  </svg>`;
  return renderPanel({
    a, decor, overlay,
    bg: 'linear-gradient(180deg,#F3E7DF 0%,#EDE0D5 100%)',
    inset: [T + 52, L + 44, PAGE_H - B + 40, L + 44],
    couple: 'script',
    p: {
      eyebrow: GOLD_DARK, label: '#B69A67', num: GOLD_DARK, name: '#7A6238',
      text: '#5A4830', divider: 'rgba(197,165,90,.45)', foot: '#A8916A', accent: GOLD_DARK,
    },
    hero: heroPlain(a.tableNum, 'foil'), heroBase: 122,
    rule: bar(180, GOLD, 'ring', .9),
  });
}

// ── 5. Jardin Botanique ───────────────────────────────────────────────────────

const GREENS = ['#8FAF8A', '#6E8F69', '#A9C3A3', '#7F9F7A', '#5F7F5A'];

// Brin d'eucalyptus : une tige courbe, des feuilles alternées, quelques fleurs blanches.
function sprig(x: number, y: number, ang: number, s: number, seed = 0): string {
  const P0 = [0, 0], P1 = [46, -90], P2 = [30, -230];
  const pt = (t: number) => [
    (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  const tg = (t: number) => {
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };
  let out = `<path d="M0 0 Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}" fill="none" stroke="#6E8F69" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>`;
  for (let i = 0; i < 11; i++) {
    const t = 0.12 + i * 0.08;
    const [px, py] = pt(t);
    const side = i % 2 === 0 ? 1 : -1;
    const len = 30 - i * 1.2, w = 13 - i * 0.5;
    const col = GREENS[(i + seed) % GREENS.length];
    out += leaf(px, py, tg(t) + 90 + side * 52, len, w, col, .92);
    if (i % 3 === 2) {
      out += `<circle cx="${px - side * 8}" cy="${py - 4}" r="3.2" fill="#FFFFFF" opacity=".95"/><circle cx="${px - side * 8}" cy="${py - 4}" r="1.3" fill="#F2D98D"/>`;
      out += `<circle cx="${px - side * 13}" cy="${py + 2}" r="2.2" fill="#FFFFFF" opacity=".9"/>`;
    }
  }
  out += leaf(P2[0], P2[1], tg(0.98) + 90, 22, 9, GREENS[(seed + 1) % GREENS.length], .95);
  return `<g transform="translate(${x},${y}) rotate(${ang}) scale(${s})">${out}</g>`;
}

function renderBotanique(a: RenderArgs): string {
  const decor = `${SVG_PAGE}
    ${sprig(58, 870, -14, 1.15, 0)}
    ${sprig(537, -28, 166, 1.15, 2)}
    ${sprig(600, 850, -46, 0.8, 1)}
    ${sprig(-6, -10, 134, 0.8, 3)}
    <rect x="30" y="30" width="535" height="782" fill="none" stroke="#8FAF8A" stroke-width=".6" opacity=".55"/>
  </svg>`;
  const wreathBox = (size: number) => Math.round(size * 0.68) * 2 + 44;
  const wreathHero = (size: number) => {
    const R = Math.round(size * 0.68), box = wreathBox(size), c = box / 2;
    const leaves = Array.from({ length: 26 }, (_, i) => {
      const th = (i / 26) * 360;
      const rad = th * Math.PI / 180;
      const x = c + R * Math.cos(rad), y = c + R * Math.sin(rad);
      const out = i % 2 === 0;
      return leaf(x, y, th + (out ? 0 : 180) + 90, out ? 20 : 15, out ? 8 : 6, GREENS[i % GREENS.length], .9);
    }).join('');
    return `<div class="pn-hero" style="margin-top:6px;"><svg width="${box}" height="${box}" viewBox="0 0 ${box} ${box}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="#6E8F69" stroke-width="1.2" opacity=".8"/>
      ${leaves}
      <circle cx="${c}" cy="${c + R * 0.98}" r="3.4" fill="#FFFFFF"/><circle cx="${c}" cy="${c + R * 0.98}" r="1.4" fill="#F2D98D"/>
      <circle cx="${c}" cy="${c - R * 0.98}" r="3.4" fill="#FFFFFF"/><circle cx="${c}" cy="${c - R * 0.98}" r="1.4" fill="#F2D98D"/>
      <text x="${c}" y="${c + size * 0.34}" text-anchor="middle" font-family="${DISPLAY}" font-weight="700" font-size="${Math.round(size * 0.92)}" fill="${FOREST}">${a.tableNum}</text>
    </svg></div>`;
  };
  return renderPanel({
    a, decor,
    bg: 'radial-gradient(circle at 12% 8%,rgba(143,169,138,.22),transparent 38%),radial-gradient(circle at 88% 94%,rgba(143,169,138,.2),transparent 38%),#F8FAF5',
    inset: [70, 126, 64, 126],
    couple: 'script',
    p: {
      eyebrow: SAGE, label: '#7F9F7A', num: FOREST, name: FOREST,
      text: '#33472F', divider: 'rgba(111,143,105,.4)', foot: '#7F9F7A', accent: SAGE,
    },
    hero: wreathHero, heroBase: 100, heroH: wreathBox,
    rule: bar(170, SAGE, 'leaves', .9),
  });
}

// ── 6. Plexiglas Mariage ──────────────────────────────────────────────────────

function renderPlexiglass(a: RenderArgs): string {
  const I = 40;
  const screw = (cx: number, cy: number) => `
    <circle cx="${cx}" cy="${cy}" r="10" fill="url(#pg)" filter="url(#psh)"/>
    <circle cx="${cx}" cy="${cy}" r="6.5" fill="none" stroke="#FFFFFF" stroke-width=".8" opacity=".55"/>
    <circle cx="${cx}" cy="${cy}" r="2.4" fill="#8F7330" opacity=".7"/>
    <path d="M${cx - 6} ${cy - 4} Q${cx - 2} ${cy - 8} ${cx + 3} ${cy - 6}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>`;
  const decor = `${SVG_PAGE}
    <defs>
      ${goldGrad('pg', 'radial')}
      <filter id="psh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1E281E" flood-opacity=".35"/></filter>
      <filter id="pan" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="22" stdDeviation="20" flood-color="#1E281E" flood-opacity=".2"/></filter>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".78"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".62"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".74"/>
      </linearGradient>
      <linearGradient id="streak" x1="0" y1="0" x2="1" y2="1">
        <stop offset=".36" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".43" stop-color="#FFFFFF" stop-opacity=".6"/><stop offset=".47" stop-color="#FFFFFF" stop-opacity=".15"/><stop offset=".52" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset=".62" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".66" stop-color="#FFFFFF" stop-opacity=".38"/><stop offset=".71" stop-color="#FFFFFF" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="${I}" y="${I}" width="${PAGE_W - 2 * I}" height="${PAGE_H - 2 * I}" rx="6" fill="url(#glass)" stroke="#FFFFFF" stroke-width="1.2" filter="url(#pan)"/>
    <rect x="${I}" y="${I}" width="${PAGE_W - 2 * I}" height="${PAGE_H - 2 * I}" rx="6" fill="url(#streak)"/>
    <rect x="${I + 3}" y="${I + 3}" width="${PAGE_W - 2 * I - 6}" height="${PAGE_H - 2 * I - 6}" rx="4" fill="none" stroke="#1E281E" stroke-width=".6" opacity=".08"/>
    ${screw(I + 18, I + 18)}${screw(PAGE_W - I - 18, I + 18)}${screw(I + 18, PAGE_H - I - 18)}${screw(PAGE_W - I - 18, PAGE_H - I - 18)}
  </svg>`;
  return renderPanel({
    a, decor,
    bg: 'linear-gradient(160deg,#E3E8DE 0%,#D8DFD2 50%,#E6EAE1 100%)',
    inset: [100, 100, 100, 100],
    p: {
      eyebrow: '#8F947F', label: '#A2A896', num: CHARCOAL, name: '#4A4F46',
      text: '#3A3F36', divider: 'rgba(143,148,127,.4)', foot: '#9BA08C', accent: GOLD_DARK,
    },
    hero: heroPlain(a.tableNum, 'light'), heroBase: 136,
    rule: bar(140, GOLD_DARK, 'dot', .9),
  });
}

// ── Registre des modèles ──────────────────────────────────────────────────────

type Renderer = (a: RenderArgs) => string;

type TemplateEntry = {
  id: PanelTemplateId; name: string; desc: string;
  primary: string; accent: string; bg: string; symbol: string; badge?: string;
  render: Renderer;
};

export const PANEL_TEMPLATES: TemplateEntry[] = [
  { id:'classic',    name:'Élégance Classique', desc:'Ivoire · Noir · Volutes dorées',      primary:'#1C1B1A', accent:GOLD,     bg:'#FBF7EE', symbol:'◇', render:renderClassic },
  { id:'jewish',     name:'Tradition Juive',    desc:'Arche mauresque · Étoile de David',   primary:NAVY,      accent:GOLD,     bg:'#FCF9F0', symbol:'✡', badge:'★', render:renderJewish },
  { id:'ketouba',    name:'Style Ketouba',      desc:'Parchemin enluminé · Vigne · Grenat', primary:BROWN,     accent:GOLD,     bg:'#F5EBD6', symbol:'✦', render:renderKetouba },
  { id:'suspended',  name:'Cartes Suspendues',  desc:'Carte suspendue · Cachet de cire',    primary:GOLD_DARK, accent:'#D4B896', bg:'#F3E7DF', symbol:'✦', badge:'★', render:renderSuspended },
  { id:'botanique',  name:'Jardin Botanique',   desc:'Eucalyptus · Couronne · Gypsophile',  primary:FOREST,    accent:'#8FAF8A', bg:'#F8FAF5', symbol:'⚘', render:renderBotanique },
  { id:'plexiglass', name:'Plexiglas Mariage',  desc:'Acrylique givré · Vis dorées',        primary:'#8F947F', accent:GOLD,     bg:'#DDE3D8', symbol:'○', render:renderPlexiglass },
];

export function renderPanelPage(id: PanelTemplateId, args: RenderArgs): string {
  return (PANEL_TEMPLATES.find(t => t.id === id) ?? PANEL_TEMPLATES[0]).render(args);
}

export const DEFAULT_PANEL_TEMPLATE: PanelTemplateId = 'classic';
