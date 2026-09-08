const GOLD = '#C5A55A';
const GOLD_DARK = '#A8893A';
const NAVY = '#1A2B5E';
const NAVY_LIGHT = '#2A4A8E';
const SAGE = '#7A9B6A';
const FOREST = '#4A6741';
const FOREST_DK = '#2E5028';
const CHAMPAGNE = '#D4B896';

const SERIF = "'Cormorant Garamond',serif";
const SANS = "'DM Sans',sans-serif";

export type PanelTemplateId =
  | 'classic' | 'botanique' | 'jewish'
  | 'plexiglass' | 'suspended' | 'ketouba';

export type RenderArgs = {
  tableNum: number;
  tableName: string;
  guestNames: string[];
  occupied: number;
  seats: number;
  coupleName: string;
  weddingTitle: string;
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── SVG helpers ────────────────────────────────────────────────────────────────

// Single petal/leaf ellipse rotated around (cx,cy)
function ep(cx: number, cy: number, angle: number, len: number, w: number, c: string, o: number): string {
  return `<ellipse cx="${cx|0}" cy="${(cy-len/2)|0}" rx="${w|0}" ry="${(len/2)|0}" fill="${c}" opacity="${o}" transform="rotate(${angle},${cx|0},${cy|0})"/>`;
}

// White rose
function wr(cx: number, cy: number, r: number): string {
  const o = Array.from({length:8},(_,i)=>ep(cx,cy,i*45,r*.9,r*.31,'#FFF8F0',.5)).join('');
  const m = Array.from({length:6},(_,i)=>ep(cx,cy,i*60+22,r*.66,r*.26,'#FFF2E4',.62)).join('');
  const n = Array.from({length:4},(_,i)=>ep(cx,cy,i*90+8,r*.44,r*.2,'#FFECD0',.72)).join('');
  return `${o}${m}${n}<circle cx="${cx|0}" cy="${cy|0}" r="${(r*.16)|0}" fill="#F5DCA0" opacity=".82"/>`;
}

// Gold bar ornament
function goldBar(w = 160, color = GOLD): string {
  const h = w/2-14;
  return `<svg width="${w}" height="16" viewBox="0 0 ${w} 16" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="8" x2="${h}" y2="8" stroke="${color}" stroke-width=".9" opacity=".6"/><circle cx="${w/2}" cy="8" r="4" fill="none" stroke="${color}" stroke-width="1" opacity=".7"/><circle cx="${w/2}" cy="8" r="1.7" fill="${color}" opacity=".6"/><line x1="${w/2+14}" y1="8" x2="${w}" y2="8" stroke="${color}" stroke-width=".9" opacity=".6"/></svg>`;
}

// Star of David
function sodSvg(size: number, color: string): string {
  const c=size/2, r=size*.42;
  const p1=`${c},${c-r} ${c+r*.866},${c+r*.5} ${c-r*.866},${c+r*.5}`;
  const p2=`${c},${c+r} ${c+r*.866},${c-r*.5} ${c-r*.866},${c-r*.5}`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><polygon points="${p1}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/><polygon points="${p2}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${c}" cy="${c}" r="2.5" fill="${color}" opacity=".5"/></svg>`;
}

// ── Full-height botanical side branches ────────────────────────────────────────

const BOT_L = `<svg width="105" height="842" viewBox="0 0 105 842" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
<path d="M72 842 Q65 700 50 560 Q35 420 45 260 Q50 160 40 60" stroke="#5A8045" stroke-width="1.8" fill="none" opacity=".38"/>
<path d="M72 842 Q80 700 85 560 Q88 420 78 280" stroke="#5A8045" stroke-width="1.2" fill="none" opacity=".28"/>
${[
  [28,88,-48,64,22,'#4A7035',.42],[52,130,32,58,20,'#5A8045',.38],
  [22,182,-56,68,24,'#3A6028',.4],[58,228,38,62,21,'#5A8045',.36],
  [18,285,-45,60,20,'#4A7035',.38],[60,335,44,64,22,'#6A9055',.36],
  [20,390,-52,66,22,'#4A7035',.4],[55,445,36,58,20,'#5A8045',.36],
  [16,498,-46,62,21,'#3A6028',.38],[62,550,42,60,20,'#5A8045',.35],
  [22,605,-54,64,22,'#4A7035',.38],[56,658,38,58,20,'#6A9055',.34],
  [18,710,-44,58,20,'#5A8045',.36],[58,760,40,54,18,'#4A7035',.33],
  [24,48,-38,52,18,'#6A9055',.35],[60,98,28,48,16,'#7A9B65',.32],
  [30,155,-30,50,17,'#6A9055',.33],[55,205,34,52,18,'#7A9B65',.32],
  [25,265,-35,50,17,'#5A8045',.34],[58,318,36,52,18,'#6A9055',.32],
].map(([cx,cy,a,l,w,c,o])=>ep(cx as number,cy as number,a as number,l as number,w as number,c as string,o as number)).join('')}
${[
  wr(38,112,18), wr(32,298,16), wr(42,492,18), wr(36,685,16), wr(44,198,14), wr(38,405,15),
].join('')}
</svg>`;

const BOT_R = `<svg width="105" height="842" viewBox="0 0 105 842" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
<path d="M33 842 Q40 700 55 560 Q70 420 60 260 Q55 160 65 60" stroke="#5A8045" stroke-width="1.8" fill="none" opacity=".38"/>
<path d="M33 842 Q25 700 20 560 Q17 420 27 280" stroke="#5A8045" stroke-width="1.2" fill="none" opacity=".28"/>
${[
  [77,88,48,64,22,'#4A7035',.42],[53,130,-32,58,20,'#5A8045',.38],
  [83,182,56,68,24,'#3A6028',.4],[47,228,-38,62,21,'#5A8045',.36],
  [87,285,45,60,20,'#4A7035',.38],[45,335,-44,64,22,'#6A9055',.36],
  [85,390,52,66,22,'#4A7035',.4],[50,445,-36,58,20,'#5A8045',.36],
  [89,498,46,62,21,'#3A6028',.38],[43,550,-42,60,20,'#5A8045',.35],
  [83,605,54,64,22,'#4A7035',.38],[49,658,-38,58,20,'#6A9055',.34],
  [87,710,44,58,20,'#5A8045',.36],[47,760,-40,54,18,'#4A7035',.33],
  [81,48,38,52,18,'#6A9055',.35],[45,98,-28,48,16,'#7A9B65',.32],
  [75,155,30,50,17,'#6A9055',.33],[50,205,-34,52,18,'#7A9B65',.32],
  [80,265,35,50,17,'#5A8045',.34],[47,318,-36,52,18,'#6A9055',.32],
].map(([cx,cy,a,l,w,c,o])=>ep(cx as number,cy as number,a as number,l as number,w as number,c as string,o as number)).join('')}
${[
  wr(67,112,18), wr(73,298,16), wr(63,492,18), wr(69,685,16), wr(61,198,14), wr(67,405,15),
].join('')}
</svg>`;

// ── Islamic arch border (Jewish template) ──────────────────────────────────────

const JEWISH_BORDER = `<svg width="595" height="842" viewBox="0 0 595 842" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer gold border -->
  <rect x="12" y="12" width="571" height="818" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".5"/>
  <rect x="18" y="18" width="559" height="806" fill="none" stroke="${GOLD}" stroke-width=".6" opacity=".25"/>
  <!-- Top arch shape -->
  <path d="M60 180 Q297 40 535 180" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".4"/>
  <path d="M72 185 Q297 58 523 185" fill="none" stroke="${GOLD}" stroke-width=".7" opacity=".22"/>
  <!-- Decorative top geometric pattern -->
  <path d="M60 180 L60 820" stroke="${GOLD}" stroke-width=".8" opacity=".28"/>
  <path d="M535 180 L535 820" stroke="${GOLD}" stroke-width=".8" opacity=".28"/>
  <!-- Star of David at top center -->
  <polygon points="297,52 318,90 276,90" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linejoin="round" opacity=".65"/>
  <polygon points="297,100 318,62 276,62" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linejoin="round" opacity=".65"/>
  <!-- Side mini arches (left) -->
  <path d="M12 220 Q36 196 60 220" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".3"/>
  <path d="M12 280 Q36 256 60 280" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".26"/>
  <path d="M12 340 Q36 316 60 340" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".24"/>
  <path d="M12 400 Q36 376 60 400" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".22"/>
  <path d="M12 460 Q36 436 60 460" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".2"/>
  <path d="M12 520 Q36 496 60 520" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".2"/>
  <path d="M12 580 Q36 556 60 580" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".18"/>
  <path d="M12 640 Q36 616 60 640" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".18"/>
  <path d="M12 700 Q36 676 60 700" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".16"/>
  <!-- Side mini arches (right) -->
  <path d="M535 220 Q559 196 583 220" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".3"/>
  <path d="M535 280 Q559 256 583 280" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".26"/>
  <path d="M535 340 Q559 316 583 340" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".24"/>
  <path d="M535 400 Q559 376 583 400" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".22"/>
  <path d="M535 460 Q559 436 583 460" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".2"/>
  <path d="M535 520 Q559 496 583 520" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".2"/>
  <path d="M535 580 Q559 556 583 580" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".18"/>
  <path d="M535 640 Q559 616 583 640" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".18"/>
  <path d="M535 700 Q559 676 583 700" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".16"/>
  <!-- Corner ornaments -->
  <circle cx="12" cy="12" r="5" fill="${GOLD}" opacity=".45"/>
  <circle cx="583" cy="12" r="5" fill="${GOLD}" opacity=".45"/>
  <circle cx="12" cy="830" r="5" fill="${GOLD}" opacity=".45"/>
  <circle cx="583" cy="830" r="5" fill="${GOLD}" opacity=".45"/>
  <!-- Bottom geometric pattern -->
  <path d="M60 810 Q297 780 535 810" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".3"/>
</svg>`;

// ── Mise en page commune ───────────────────────────────────────────────────────
// Toutes les cartes partagent la même ossature : une page A4 pleine, centrée,
// répartie en trois bandes (en-tête / invités / pied). La typographie de la liste
// s'adapte au nombre d'invités pour que la page soit toujours remplie, jamais
// tassée en haut avec du vide en dessous.

type Palette = {
  eyebrow: string;   // « Mariage de … »
  label: string;     // « Table »
  num: string;       // numéro de table
  name: string;      // nom de la table
  text: string;      // noms des invités
  divider: string;   // filets de séparation
  foot: string;      // pied de page
  guestFont?: string;
};

// Plus la table est chargée, plus le numéro « héros » se réduit pour rendre de la
// hauteur à la liste. `budget` = hauteur utile restante pour les noms sur une A4
// (842 px moins l'en-tête, le pied de page et les marges) ; une ligne mesure
// ≈ 2,05 × la taille de police.
function density(count: number): { hero: number; budget: number } {
  if (count > 14) return { hero: 0.66, budget: 385 };
  if (count > 10) return { hero: 0.80, budget: 355 };
  return { hero: 1, budget: 320 };
}

// Taille du numéro de table, réduite sur les grandes tablées.
function heroSize(a: RenderArgs, base: number): number {
  return Math.round(base * density(a.guestNames.length).hero);
}

function typeScale(count: number): { fs: number; pad: number } {
  if (count === 0) return { fs: 18, pad: 10 };
  const fs = Math.max(10, Math.min(30, Math.round(density(count).budget / (count * 2.05))));
  return { fs, pad: Math.max(3, Math.round(fs * 0.35)) };
}

function guestBlock(names: string[], p: Palette): string {
  const ff = p.guestFont ?? SERIF;
  if (!names.length) {
    return `<div style="font-family:${ff};font-size:19px;font-style:italic;color:${p.foot};opacity:.75;">Aucun invité assigné</div>`;
  }
  const { fs, pad } = typeScale(names.length);
  const rows = names.map((n, i) => {
    const last = i === names.length - 1;
    return `<div style="font-family:${ff};font-size:${fs}px;line-height:1.35;color:${p.text};padding:${pad}px 6px;${!last ? `border-bottom:.7px solid ${p.divider};` : ''}">${esc(n)}</div>`;
  }).join('');
  return `<div style="width:100%;">${rows}</div>`;
}

function panelShell(o: {
  a: RenderArgs;
  p: Palette;
  bg: string;
  pad: string;
  decor?: string;
  crest?: string;
  numBlock: string;
  rule: string;
  contentMin?: string;
  wrap?: (inner: string) => string;
}): string {
  const { a, p } = o;
  const min = o.contentMin ?? '100vh';
  const sn = a.tableName !== String(a.tableNum)
    ? `<div style="font-family:${SERIF};font-size:22px;font-weight:600;color:${p.name};margin-top:4px;">${esc(a.tableName)}</div>`
    : '';

  const header = `
    ${o.crest ?? ''}
    ${a.coupleName ? `<div style="font-size:9px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${p.eyebrow};margin:10px 0 12px;font-family:${SANS};">Mariage de ${esc(a.coupleName)}</div>` : '<div style="height:12px;"></div>'}
    <div style="font-size:10px;font-weight:700;letter-spacing:8px;text-transform:uppercase;color:${p.label};margin-bottom:8px;font-family:${SANS};">Table</div>
    ${o.numBlock}
    ${sn}
    <div style="margin:14px auto 0;">${o.rule}</div>`;

  const footer = `
    <div style="padding-top:14px;border-top:.7px solid ${p.divider};font-size:9.5px;letter-spacing:1.5px;color:${p.foot};font-family:${SANS};">${a.occupied} / ${a.seats} places</div>
    <div style="margin-top:8px;font-size:8.5px;letter-spacing:2.5px;text-transform:uppercase;color:${p.foot};opacity:.7;font-family:${SANS};">Merci de partager ce moment avec nous</div>`;

  const inner = `<div style="min-height:${min};display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;padding:${o.pad};position:relative;z-index:1;">
      <div style="flex:0 0 auto;width:100%;">${header}</div>
      <div style="flex:1 1 auto;width:100%;display:flex;flex-direction:column;justify-content:center;padding:16px 0;">${guestBlock(a.guestNames, p)}</div>
      <div style="flex:0 0 auto;width:100%;">${footer}</div>
    </div>`;

  // Pas d'overflow:hidden : une table exceptionnellement chargée doit déborder
  // sur une page supplémentaire plutôt que de voir des invités rognés.
  return `<div class="page" style="min-height:100vh;background:${o.bg};position:relative;">${o.decor ?? ''}${o.wrap ? o.wrap(inner) : inner}</div>`;
}

// Numéro de table « héros » : plein cadre, toujours au centre optique de la page.
function numPlain(n: number, color: string, size = 108): string {
  return `<div style="font-family:${SERIF};font-size:${size}px;font-weight:700;color:${color};line-height:.98;">${n}</div>`;
}

function numCircle(n: number, color: string, ring: string, size = 124): string {
  const r = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${r}" cy="${r}" r="${r - 4}" fill="none" stroke="${ring}" stroke-width="1.1" opacity=".45"/>
    <circle cx="${r}" cy="${r}" r="${r - 14}" fill="none" stroke="${ring}" stroke-width=".5" opacity=".25"/>
    <text x="${r}" y="${r + size * 0.2}" text-anchor="middle" font-family="${SERIF}" font-size="${Math.round(size * 0.56)}" font-weight="700" fill="${color}" opacity=".92">${n}</text>
  </svg>`;
}

function initialsOf(coupleName: string): string {
  return coupleName.split(/[&+]|et /i).map(s => s.trim()[0] || '').join('').slice(0, 2).toUpperCase() || '♡';
}

// ── Modèles ────────────────────────────────────────────────────────────────────

type Renderer = (a: RenderArgs) => string;

function renderClassic(a: RenderArgs): string {
  const cornerSvg = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M4 4 L4 48 Q4 60 16 60 L60 60" fill="none" stroke="${GOLD}" stroke-width="1.4" opacity=".52"/><path d="M4 4 L4 43 Q4 53 14 53 L55 53" fill="none" stroke="${GOLD}" stroke-width=".5" opacity=".28"/><path d="M4 4 L10 -2 L16 4 L10 10 Z" fill="${GOLD}" opacity=".42"/><circle cx="4" cy="24" r="1.6" fill="${GOLD}" opacity=".32"/><circle cx="4" cy="42" r="1.6" fill="${GOLD}" opacity=".32"/><circle cx="24" cy="60" r="1.6" fill="${GOLD}" opacity=".32"/><circle cx="42" cy="60" r="1.6" fill="${GOLD}" opacity=".32"/></svg>`;
  const decor = `
    <div style="position:absolute;inset:10mm;border:1.5px solid ${GOLD};opacity:.52;pointer-events:none;"></div>
    <div style="position:absolute;inset:14mm;border:.5px solid ${GOLD};opacity:.25;pointer-events:none;"></div>
    <div style="position:absolute;top:8mm;left:8mm;">${cornerSvg}</div>
    <div style="position:absolute;top:8mm;right:8mm;transform:scaleX(-1);">${cornerSvg}</div>
    <div style="position:absolute;bottom:8mm;left:8mm;transform:scaleY(-1);">${cornerSvg}</div>
    <div style="position:absolute;bottom:8mm;right:8mm;transform:scale(-1,-1);">${cornerSvg}</div>`;
  const crest = `<div style="display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:50%;border:1.2px solid ${GOLD};position:relative;">
      <div style="position:absolute;inset:6px;border-radius:50%;border:.4px solid rgba(197,165,90,.3);"></div>
      <span style="font-family:${SERIF};font-size:25px;font-weight:700;color:${GOLD};font-style:italic;">${initialsOf(a.coupleName)}</span>
    </div>`;
  return panelShell({
    a, bg: '#FEFCF7', pad: '20mm 24mm', decor, crest,
    p: {
      eyebrow: 'rgba(26,26,26,.45)', label: 'rgba(26,26,26,.4)', num: '#1a1a1a',
      name: '#3a3020', text: '#2a2020', divider: 'rgba(26,26,26,.12)', foot: 'rgba(26,26,26,.38)',
    },
    numBlock: numCircle(a.tableNum, '#1a1a1a', '#1a1a1a', heroSize(a, 124)),
    rule: `<svg width="180" height="14" viewBox="0 0 180 14" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="7" x2="72" y2="7" stroke="#1a1a1a" stroke-width=".5" opacity=".22"/><path d="M80 7 C82 2, 90 0, 90 7 C90 0, 98 2, 100 7" stroke="#1a1a1a" stroke-width=".7" fill="none" opacity=".28"/><line x1="108" y1="7" x2="180" y2="7" stroke="#1a1a1a" stroke-width=".5" opacity=".22"/></svg>`,
  });
}

function renderBotanique(a: RenderArgs): string {
  const decor = `
    <div style="position:absolute;top:0;left:0;bottom:0;width:105px;z-index:0;">${BOT_L}</div>
    <div style="position:absolute;top:0;right:0;bottom:0;width:105px;z-index:0;">${BOT_R}</div>`;
  return panelShell({
    a, bg: '#F6FBF4', pad: '20mm 36mm', decor,
    p: {
      eyebrow: SAGE, label: 'rgba(74,103,65,.6)', num: FOREST,
      name: FOREST, text: FOREST_DK, divider: 'rgba(74,103,65,.14)', foot: SAGE,
    },
    numBlock: numPlain(a.tableNum, FOREST, heroSize(a, 112)),
    rule: `<svg width="150" height="14" viewBox="0 0 150 14" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="7" x2="62" y2="7" stroke="${SAGE}" stroke-width=".9" opacity=".5"/><ellipse cx="75" cy="7" rx="7" ry="5.5" fill="none" stroke="${FOREST}" stroke-width=".9" opacity=".5"/><circle cx="75" cy="7" r="2.2" fill="${FOREST}" opacity=".45"/><line x1="88" y1="7" x2="150" y2="7" stroke="${SAGE}" stroke-width=".9" opacity=".5"/></svg>`,
  });
}

function renderJewish(a: RenderArgs): string {
  return panelShell({
    a, bg: '#FDFBF4', pad: '24mm 28mm',
    decor: `<div style="position:absolute;inset:0;z-index:0;">${JEWISH_BORDER}</div>`,
    crest: sodSvg(50, GOLD),
    p: {
      eyebrow: 'rgba(26,43,94,.55)', label: 'rgba(26,43,94,.5)', num: NAVY,
      name: NAVY_LIGHT, text: NAVY, divider: 'rgba(26,43,94,.12)', foot: 'rgba(26,43,94,.45)',
    },
    numBlock: numPlain(a.tableNum, NAVY, heroSize(a, 108)),
    rule: goldBar(170),
  });
}

function renderPlexiglass(a: RenderArgs): string {
  const monogram = initialsOf(a.coupleName);
  const seal = (pos: string) => `<div style="position:absolute;${pos};width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#E8D4A0,${GOLD});box-shadow:0 2px 10px rgba(197,165,90,.35);display:flex;align-items:center;justify-content:center;z-index:2;"><span style="font-size:11px;color:#fff;font-weight:700;font-family:${SANS};">${monogram}</span></div>`;
  return panelShell({
    a, bg: '#E8EDE4', pad: '18mm 16mm', contentMin: 'calc(100vh - 32mm)',
    p: {
      eyebrow: '#8F947F', label: '#A8AC9C', num: '#2A2520',
      name: '#555', text: '#3A3530', divider: 'rgba(143,148,127,.18)', foot: '#9BA08C',
    },
    numBlock: numPlain(a.tableNum, '#2A2520', heroSize(a, 112)),
    rule: goldBar(160),
    wrap: (inner) => `<div style="position:absolute;inset:16mm;">
      ${seal('top:-16px;left:-16px')}${seal('top:-16px;right:-16px')}${seal('bottom:-16px;left:-16px')}${seal('bottom:-16px;right:-16px')}
      <div style="height:100%;background:rgba(255,255,255,.92);border:1.5px solid rgba(255,255,255,.95);border-radius:8px;box-shadow:0 12px 48px rgba(0,0,0,.1);overflow:hidden;">${inner}</div>
    </div>`,
  });
}

function renderSuspended(a: RenderArgs): string {
  const crest = `<div style="display:inline-flex;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#E8D4A0,${GOLD});box-shadow:0 4px 16px rgba(197,165,90,.3);align-items:center;justify-content:center;">
      <span style="font-size:16px;color:#fff;font-weight:700;font-family:${SERIF};">✦</span>
    </div>`;
  return panelShell({
    a, bg: '#FAF6EE', pad: '22mm 26mm', crest,
    decor: `<div style="position:absolute;inset:14mm;border:1.5px solid ${GOLD};opacity:.3;pointer-events:none;"></div>`,
    p: {
      eyebrow: GOLD_DARK, label: CHAMPAGNE, num: GOLD_DARK,
      name: GOLD_DARK, text: '#5A4820', divider: 'rgba(197,165,90,.18)', foot: '#B49A62',
    },
    numBlock: numPlain(a.tableNum, GOLD_DARK, heroSize(a, 112)),
    rule: goldBar(170),
  });
}

function renderKetouba(a: RenderArgs): string {
  const wave = `<svg width="100%" height="12" viewBox="0 0 400 12" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 6 Q25 0 50 6 Q75 12 100 6 Q125 0 150 6 Q175 12 200 6 Q225 0 250 6 Q275 12 300 6 Q325 0 350 6 Q375 12 400 6" fill="none" stroke="#8B6B45" stroke-width=".7" opacity=".3"/></svg>`;
  const decor = `
    <div style="position:absolute;inset:10mm;border:2px solid #8B6B45;opacity:.45;pointer-events:none;"></div>
    <div style="position:absolute;inset:14mm;border:.5px solid #8B6B45;opacity:.22;pointer-events:none;"></div>
    <div style="position:absolute;top:9mm;left:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <div style="position:absolute;top:9mm;right:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <div style="position:absolute;bottom:9mm;left:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <div style="position:absolute;bottom:9mm;right:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <div style="position:absolute;top:17mm;left:17mm;right:17mm;">${wave}</div>
    <div style="position:absolute;bottom:17mm;left:17mm;right:17mm;">${wave}</div>`;
  return panelShell({
    a, bg: '#FBF8F1', pad: '26mm 28mm', decor, crest: sodSvg(44, GOLD),
    p: {
      eyebrow: '#8B6B45', label: '#8B6B45', num: '#7B5C38',
      name: '#7B5C38', text: '#5A4030', divider: 'rgba(139,107,69,.16)', foot: '#A08060',
    },
    numBlock: numPlain(a.tableNum, '#7B5C38', heroSize(a, 106)),
    rule: goldBar(160),
  });
}

// ── Template registry ──────────────────────────────────────────────────────────

type TemplateEntry = {
  id: PanelTemplateId; name: string; desc: string;
  primary: string; accent: string; bg: string; symbol: string; badge?: string;
  render: Renderer;
};

export const PANEL_TEMPLATES: TemplateEntry[] = [
  { id:'classic',    name:'Élégance Classique', desc:'Blanc · Noir · Coins dorés',       primary:'#1a1a1a', accent:GOLD,      bg:'#FEFCF7', symbol:'◇', render:renderClassic },
  { id:'jewish',     name:'Tradition Juive',    desc:'Crème · Arche · Étoile de David',  primary:NAVY,      accent:GOLD,      bg:'#FDFBF4', symbol:'✡', badge:'★', render:renderJewish },
  { id:'ketouba',    name:'Style Ketouba',      desc:'Crème · Bordure ornée · Tradition', primary:'#7B5C38', accent:GOLD,      bg:'#FBF8F1', symbol:'✦', render:renderKetouba },
  { id:'suspended',  name:'Cartes Suspendues',  desc:'Ivoire · Cachet Or · Élégant',     primary:GOLD_DARK, accent:CHAMPAGNE, bg:'#FAF6EE', symbol:'✦', badge:'★', render:renderSuspended },
  { id:'botanique',  name:'Jardin Botanique',   desc:'Blanc · Verdure · Nature',         primary:FOREST,    accent:SAGE,      bg:'#F6FBF4', symbol:'⚘', render:renderBotanique },
  { id:'plexiglass', name:'Plexiglas Mariage',  desc:'Acrylique · Cachets de cire',      primary:'#8F947F', accent:GOLD,      bg:'#E8EDE4', symbol:'○', render:renderPlexiglass },
];

export function renderPanelPage(id: PanelTemplateId, args: RenderArgs): string {
  return (PANEL_TEMPLATES.find(t=>t.id===id) ?? PANEL_TEMPLATES[0]).render(args);
}

export const DEFAULT_PANEL_TEMPLATE: PanelTemplateId = 'classic';
