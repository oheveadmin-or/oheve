const GOLD = '#C5A55A';
const GOLD_DARK = '#A8893A';
const NAVY = '#1A2B5E';
const NAVY_LIGHT = '#2A4A8E';
const SAGE = '#7A9B6A';
const FOREST = '#4A6741';
const FOREST_DK = '#2E5028';
const CHAMPAGNE = '#D4B896';

export type PanelTemplateId =
  | 'classic' | 'floral-romantic' | 'floral-luxe' | 'botanique'
  | 'moderne' | 'jewish' | 'jerusalem' | 'plexiglass'
  | 'suspended' | 'arch' | 'monogram' | 'ketouba'
  | 'palace' | 'blanc-or' | 'ivoire-champagne';

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

// Leaf
function lf(cx: number, cy: number, angle: number, len: number, w: number, c: string, o: number): string {
  return ep(cx, cy, angle, len, w, c, o);
}

// Gold bar ornament
function goldBar(w = 160): string {
  const h = w/2-14;
  return `<svg width="${w}" height="14" viewBox="0 0 ${w} 14" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="7" x2="${h}" y2="7" stroke="${GOLD}" stroke-width=".8" opacity=".6"/><circle cx="${w/2}" cy="7" r="3.5" fill="none" stroke="${GOLD}" stroke-width=".9" opacity=".7"/><circle cx="${w/2}" cy="7" r="1.5" fill="${GOLD}" opacity=".6"/><line x1="${w/2+14}" y1="7" x2="${w}" y2="7" stroke="${GOLD}" stroke-width=".8" opacity=".6"/></svg>`;
}

// Star of David
function sodSvg(size: number, color: string): string {
  const c=size/2, r=size*.42;
  const p1=`${c},${c-r} ${c+r*.866},${c+r*.5} ${c-r*.866},${c+r*.5}`;
  const p2=`${c},${c+r} ${c+r*.866},${c-r*.5} ${c-r*.866},${c-r*.5}`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><polygon points="${p1}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/><polygon points="${p2}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${c}" cy="${c}" r="2.5" fill="${color}" opacity=".5"/></svg>`;
}

// Guest list
function guestList(names: string[], color: string, divider: string, ff = "'Cormorant Garamond',serif", fs = '13px'): string {
  if (!names.length) return `<div style="font-size:11px;color:#bbb;font-style:italic;padding:8px 0;">Aucun invité assigné</div>`;
  return names.map((n, i) => {
    const last = i === names.length - 1;
    return `<div style="font-size:${fs};color:${color};padding:5px 0;font-family:${ff};${!last?`border-bottom:1px solid ${divider};`:''}">${esc(n)}</div>`;
  }).join('');
}

// ── Full-width bouquet SVG (white/cream roses, green leaves) ───────────────────

function bouquet(W: number, H: number): string {
  const mx = W/2;
  const my = H*.58;
  const stems = [
    `<path d="M${mx} ${H} Q${mx-40} ${H*.68} ${mx-60} ${my*.7}" stroke="#6A8A50" stroke-width="2" fill="none" opacity=".42"/>`,
    `<path d="M${mx} ${H} Q${mx} ${H*.62} ${mx} ${my*.6}" stroke="#6A8A50" stroke-width="2.2" fill="none" opacity=".48"/>`,
    `<path d="M${mx} ${H} Q${mx+40} ${H*.68} ${mx+60} ${my*.7}" stroke="#6A8A50" stroke-width="2" fill="none" opacity=".42"/>`,
    `<path d="M${mx} ${H} Q${mx-125} ${H*.72} ${mx-148} ${my*.88}" stroke="#6A8A50" stroke-width="1.5" fill="none" opacity=".35"/>`,
    `<path d="M${mx} ${H} Q${mx+125} ${H*.72} ${mx+148} ${my*.88}" stroke="#6A8A50" stroke-width="1.5" fill="none" opacity=".35"/>`,
    `<path d="M${mx} ${H} Q${mx-215} ${H*.78} ${mx-235} ${H*.6}" stroke="#6A8A50" stroke-width="1.2" fill="none" opacity=".28"/>`,
    `<path d="M${mx} ${H} Q${mx+215} ${H*.78} ${mx+235} ${H*.6}" stroke="#6A8A50" stroke-width="1.2" fill="none" opacity=".28"/>`,
  ].join('');
  const leaves = [
    lf(mx-28,my*.75,-52,54,18,'#5A8045',.44), lf(mx+28,my*.75,52,54,18,'#5A8045',.44),
    lf(mx-18,my*.64,-24,46,15,'#6A9055',.38), lf(mx+18,my*.64,24,46,15,'#6A9055',.38),
    lf(mx-88,my*.78,-68,50,17,'#4A7035',.42), lf(mx+88,my*.78,68,50,17,'#4A7035',.42),
    lf(mx-112,my*.84,-44,44,14,'#5A8045',.38), lf(mx+112,my*.84,44,44,14,'#5A8045',.38),
    lf(mx-72,my*.90,-82,40,13,'#6A9055',.36), lf(mx+72,my*.90,82,40,13,'#6A9055',.36),
    lf(mx-140,my*.74,-32,46,15,'#5A8045',.38), lf(mx+140,my*.74,32,46,15,'#5A8045',.38),
    lf(mx-56,my*.82,-57,42,14,'#4A7035',.36), lf(mx+56,my*.82,57,42,14,'#4A7035',.36),
    lf(mx-192,my*.84,-28,42,14,'#7A9B65',.33), lf(mx+192,my*.84,28,42,14,'#7A9B65',.33),
    lf(mx-218,my*.78,-18,38,12,'#5A8045',.3), lf(mx+218,my*.78,18,38,12,'#5A8045',.3),
    lf(mx-245,my*.92,-15,35,12,'#6A9055',.28), lf(mx+245,my*.92,15,35,12,'#6A9055',.28),
  ].join('');
  const roses = [
    wr(mx,my*.6,40), wr(mx-95,my*.84,32), wr(mx+95,my*.84,32),
    wr(mx-60,my*.7,25), wr(mx+60,my*.7,25),
    wr(mx-175,my*.9,22), wr(mx+175,my*.9,22),
  ].join('');
  const buds = `
    <circle cx="${(mx-155)|0}" cy="${(my*.77)|0}" r="8" fill="#FFF8F0" opacity=".48"/>
    <circle cx="${(mx-155)|0}" cy="${(my*.77)|0}" r="4" fill="#F8ECD0" opacity=".58"/>
    <circle cx="${(mx+155)|0}" cy="${(my*.77)|0}" r="8" fill="#FFF8F0" opacity=".48"/>
    <circle cx="${(mx+155)|0}" cy="${(my*.77)|0}" r="4" fill="#F8ECD0" opacity=".58"/>
    <circle cx="${(mx-232)|0}" cy="${(my*.88)|0}" r="6" fill="#FFF8F0" opacity=".42"/>
    <circle cx="${(mx+232)|0}" cy="${(my*.88)|0}" r="6" fill="#FFF8F0" opacity=".42"/>`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${stems}${leaves}${roses}${buds}</svg>`;
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

// ── Arch frame (full-width) ────────────────────────────────────────────────────

const ARCH_TOP = `<svg width="595" height="280" viewBox="0 0 595 280" xmlns="http://www.w3.org/2000/svg">
  <!-- Columns -->
  <rect x="18" y="68" width="48" height="212" fill="#E8E0CE" opacity=".55"/>
  <rect x="529" y="68" width="48" height="212" fill="#E8E0CE" opacity=".55"/>
  <!-- Column capitals -->
  <path d="M12 72 L72 72 L65 58 L19 58 Z" fill="#D8D0BE" opacity=".55"/>
  <path d="M583 72 L523 72 L530 58 L576 58 Z" fill="#D8D0BE" opacity=".55"/>
  <!-- Column bases -->
  <path d="M12 278 L72 278 L68 268 L16 268 Z" fill="#D8D0BE" opacity=".45"/>
  <path d="M583 278 L523 278 L527 268 L579 268 Z" fill="#D8D0BE" opacity=".45"/>
  <!-- Column details -->
  <line x1="18" y1="120" x2="66" y2="120" stroke="#C8C0AE" stroke-width=".8" opacity=".4"/>
  <line x1="529" y1="120" x2="577" y2="120" stroke="#C8C0AE" stroke-width=".8" opacity=".4"/>
  <line x1="18" y1="200" x2="66" y2="200" stroke="#C8C0AE" stroke-width=".8" opacity=".4"/>
  <line x1="529" y1="200" x2="577" y2="200" stroke="#C8C0AE" stroke-width=".8" opacity=".4"/>
  <!-- Arch -->
  <path d="M66 68 Q297 -28 529 68" fill="none" stroke="${GOLD}" stroke-width="2.5" opacity=".55"/>
  <path d="M66 68 Q297 -12 529 68" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".3"/>
  <!-- Left fabric drape -->
  <path d="M18 68 Q38 130 28 280" stroke="#EDE5D5" stroke-width="28" fill="none" opacity=".4" stroke-linecap="round"/>
  <path d="M18 68 Q36 125 24 280" stroke="#E0D8C8" stroke-width="10" fill="none" opacity=".28" stroke-linecap="round"/>
  <path d="M20 68 Q34 118 20 280" stroke="#F5F0E8" stroke-width="5" fill="none" opacity=".25" stroke-linecap="round"/>
  <!-- Right fabric drape -->
  <path d="M577 68 Q557 130 567 280" stroke="#EDE5D5" stroke-width="28" fill="none" opacity=".4" stroke-linecap="round"/>
  <path d="M577 68 Q559 125 571 280" stroke="#E0D8C8" stroke-width="10" fill="none" opacity=".28" stroke-linecap="round"/>
  <path d="M575 68 Q561 118 575 280" stroke="#F5F0E8" stroke-width="5" fill="none" opacity=".25" stroke-linecap="round"/>
  <!-- Tie/knot decorations -->
  <circle cx="32" cy="92" r="7" fill="${GOLD}" opacity=".38"/>
  <circle cx="563" cy="92" r="7" fill="${GOLD}" opacity=".38"/>
  <!-- Arch floral accents -->
  <circle cx="297" cy="2" r="9" fill="${GOLD}" opacity=".18"/>
  <circle cx="210" cy="14" r="5.5" fill="${GOLD}" opacity=".14"/>
  <circle cx="384" cy="14" r="5.5" fill="${GOLD}" opacity=".14"/>
  <circle cx="142" cy="38" r="4" fill="${GOLD}" opacity=".1"/>
  <circle cx="452" cy="38" r="4" fill="${GOLD}" opacity=".1"/>
</svg>`;

// ── Jerusalem Moorish arch ─────────────────────────────────────────────────────

const JERUSALEM_TOP = `<svg width="595" height="360" viewBox="0 0 595 360" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer frame border -->
  <rect x="8" y="8" width="579" height="344" fill="none" stroke="${NAVY}" stroke-width="2" opacity=".5"/>
  <rect x="14" y="14" width="567" height="332" fill="none" stroke="${NAVY}" stroke-width=".8" opacity=".25"/>
  <!-- Left arch column -->
  <rect x="22" y="90" width="42" height="270" fill="${NAVY}" opacity=".12"/>
  <rect x="24" y="88" width="38" height="272" fill="none" stroke="${NAVY}" stroke-width=".8" opacity=".2"/>
  <!-- Right arch column -->
  <rect x="531" y="90" width="42" height="270" fill="${NAVY}" opacity=".12"/>
  <rect x="533" y="88" width="38" height="272" fill="none" stroke="${NAVY}" stroke-width=".8" opacity=".2"/>
  <!-- Main Moorish arch -->
  <path d="M64 90 Q297 -55 531 90" fill="${NAVY}" opacity=".1"/>
  <path d="M64 90 Q297 -55 531 90" fill="none" stroke="${NAVY}" stroke-width="2.5" opacity=".45"/>
  <path d="M68 90 Q297 -42 527 90" fill="none" stroke="${NAVY}" stroke-width=".8" opacity=".2"/>
  <!-- Geometric tile pattern inside arch (simplified) -->
  <path d="M100 90 Q297 -20 494 90" fill="${NAVY}" opacity=".06"/>
  <!-- Left decorative mini arches -->
  <path d="M22 140 Q43 112 64 140" fill="none" stroke="${NAVY}" stroke-width="1" opacity=".3"/>
  <path d="M22 180 Q43 152 64 180" fill="none" stroke="${NAVY}" stroke-width="1" opacity=".25"/>
  <path d="M22 220 Q43 192 64 220" fill="none" stroke="${NAVY}" stroke-width="1" opacity=".22"/>
  <!-- Right decorative mini arches -->
  <path d="M531 140 Q552 112 573 140" fill="none" stroke="${NAVY}" stroke-width="1" opacity=".3"/>
  <path d="M531 180 Q552 152 573 180" fill="none" stroke="${NAVY}" stroke-width="1" opacity=".25"/>
  <path d="M531 220 Q552 192 573 220" fill="none" stroke="${NAVY}" stroke-width="1" opacity=".22"/>
  <!-- Arch top ornament: Star of David -->
  <polygon points="297,14 313,42 281,42" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity=".6"/>
  <polygon points="297,50 313,22 281,22" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity=".6"/>
  <!-- Gold dots in arch -->
  <circle cx="160" cy="62" r="3" fill="${GOLD}" opacity=".35"/>
  <circle cx="297" cy="32" r="4" fill="${GOLD}" opacity=".4"/>
  <circle cx="434" cy="62" r="3" fill="${GOLD}" opacity=".35"/>
  <!-- Column capitals -->
  <path d="M16 94 L70 94 L64 82 L22 82 Z" fill="${NAVY}" opacity=".2"/>
  <path d="M579 94 L525 94 L531 82 L573 82 Z" fill="${NAVY}" opacity=".2"/>
</svg>`;

// Jerusalem skyline (bottom strip)
const JERUSALEM_BTM = `<svg width="595" height="90" viewBox="0 0 595 90" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 65 L12 65 L12 52 L22 52 L22 65 L40 65 L40 45 L50 45 L50 65 L68 65 L68 56 L76 56 L76 65 L95 65 L95 52 L104 52 L104 65 L118 65 L118 60 L126 60 L126 65 L140 65 L140 50 L148 50 L148 65 L160 65" stroke="${NAVY}" stroke-width="1" fill="none" opacity=".25"/>
  <!-- Dome of Rock center -->
  <rect x="258" y="32" width="79" height="33" fill="${NAVY}" opacity=".18"/>
  <rect x="266" y="27" width="63" height="8" fill="${NAVY}" opacity=".16"/>
  <ellipse cx="297" cy="20" rx="20" ry="16" fill="${GOLD}" opacity=".38"/>
  <ellipse cx="297" cy="20" rx="15" ry="12" fill="${GOLD}" opacity=".28"/>
  <!-- Left minaret -->
  <rect x="228" y="18" width="9" height="47" fill="${NAVY}" opacity=".22"/>
  <path d="M228 18 Q232.5 6 237 18" fill="${NAVY}" opacity=".2"/>
  <circle cx="232.5" cy="6" r="2.5" fill="${GOLD}" opacity=".38"/>
  <!-- Right minaret -->
  <rect x="358" y="18" width="9" height="47" fill="${NAVY}" opacity=".22"/>
  <path d="M358 18 Q362.5 6 367 18" fill="${NAVY}" opacity=".2"/>
  <circle cx="362.5" cy="6" r="2.5" fill="${GOLD}" opacity=".38"/>
  <path d="M160 65 L175 65 L175 56 L182 56 L182 65 L198 65 L198 44 L207 44 L207 65 L220 65 L220 52 L228 52 L228 65" stroke="${NAVY}" stroke-width="1" fill="none" opacity=".25"/>
  <path d="M337 65 L358 65 L358 48 L368 48 L368 65 L382 65 L382 58 L390 58 L390 65 L408 65 L408 52 L418 52 L418 65 L435 65 L435 44 L445 44 L445 65 L460 65 L460 56 L468 56 L468 65 L488 65 L488 52 L496 52 L496 65 L512 65 L512 60 L520 60 L520 65 L535 65 L535 50 L545 50 L545 65 L562 65 L562 55 L570 55 L570 65 L595 65" stroke="${NAVY}" stroke-width="1" fill="none" opacity=".25"/>
  <rect x="0" y="65" width="595" height="25" fill="${NAVY}" opacity=".1"/>
  <ellipse cx="40" cy="54" rx="9" ry="22" fill="${FOREST_DK}" opacity=".2"/>
  <ellipse cx="555" cy="54" rx="9" ry="22" fill="${FOREST_DK}" opacity=".2"/>
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

// ── Render functions ───────────────────────────────────────────────────────────

type Renderer = (a: RenderArgs) => string;

function renderClassic(a: RenderArgs): string {
  const initials = a.coupleName.split(/[&+]|et /i).map(s=>s.trim()[0]||'').join('').slice(0,2).toUpperCase() || '♡';
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#3a3020;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  const cornerSvg = `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><path d="M4 4 L4 42 Q4 52 14 52 L52 52" fill="none" stroke="${GOLD}" stroke-width="1.4" opacity=".52"/><path d="M4 4 L4 38 Q4 46 12 46 L48 46" fill="none" stroke="${GOLD}" stroke-width=".5" opacity=".28"/><path d="M4 4 L10 -2 L16 4 L10 10 Z" fill="${GOLD}" opacity=".42"/><circle cx="4" cy="20" r="1.5" fill="${GOLD}" opacity=".32"/><circle cx="4" cy="36" r="1.5" fill="${GOLD}" opacity=".32"/><circle cx="20" cy="52" r="1.5" fill="${GOLD}" opacity=".32"/><circle cx="36" cy="52" r="1.5" fill="${GOLD}" opacity=".32"/></svg>`;
  const corners = [
    `<div style="position:absolute;top:8mm;left:8mm;">${cornerSvg}</div>`,
    `<div style="position:absolute;top:8mm;right:8mm;transform:scaleX(-1);">${cornerSvg}</div>`,
    `<div style="position:absolute;bottom:8mm;left:8mm;transform:scaleY(-1);">${cornerSvg}</div>`,
    `<div style="position:absolute;bottom:8mm;right:8mm;transform:scale(-1,-1);">${cornerSvg}</div>`,
  ].join('');
  return `<div class="page" style="min-height:100vh;background:#FEFCF7;position:relative;padding:24mm 22mm;">
    <div style="position:absolute;inset:10mm;border:1.5px solid ${GOLD};opacity:.52;pointer-events:none;"></div>
    <div style="position:absolute;inset:14mm;border:.5px solid ${GOLD};opacity:.25;pointer-events:none;"></div>
    ${corners}
    <div style="text-align:center;position:relative;z-index:1;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:50%;border:1.2px solid ${GOLD};margin-bottom:14px;position:relative;">
        <div style="position:absolute;inset:5px;border-radius:50%;border:.4px solid rgba(197,165,90,.3);"></div>
        <span style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:${GOLD};font-style:italic;">${initials}</span>
      </div>
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:rgba(26,26,26,.45);margin-bottom:6px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="margin:12px auto;">${goldBar(180)}</div>
      <div style="font-size:8px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:rgba(26,26,26,.4);margin-bottom:12px;font-family:'DM Sans',sans-serif;">Table</div>
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="44" fill="none" stroke="#1a1a1a" stroke-width=".8" opacity=".2"/><circle cx="50" cy="50" r="37" fill="none" stroke="#1a1a1a" stroke-width=".35" opacity=".14"/><text x="50" y="64" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="46" font-weight="700" fill="#1a1a1a" opacity=".88">${a.tableNum}</text></svg>
      ${sn}
      <div style="margin:14px auto;"><svg width="130" height="14" viewBox="0 0 130 14" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="7" x2="50" y2="7" stroke="#1a1a1a" stroke-width=".5" opacity=".22"/><path d="M56 7 C58 2, 65 0, 65 7 C65 0, 72 2, 74 7" stroke="#1a1a1a" stroke-width=".7" fill="none" opacity=".28"/><line x1="80" y1="7" x2="130" y2="7" stroke="#1a1a1a" stroke-width=".5" opacity=".22"/></svg></div>
      <div style="text-align:left;">${guestList(a.guestNames,'#2a2020','rgba(26,26,26,.1)')}</div>
      <div style="margin-top:16px;padding-top:10px;border-top:.4px solid rgba(26,26,26,.12);font-size:7.5px;color:rgba(26,26,26,.38);font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
      <div style="margin-top:6px;font-size:7.5px;color:rgba(26,26,26,.28);letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;">Merci de partager ce moment avec nous</div>
    </div>
  </div>`;
}

function renderFloralRomantic(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:#9A8070;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#FEFAF5;position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;right:0;z-index:0;">${bouquet(595,210)}</div>
    <div style="padding:196px 50px 30px;text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#A09080;margin-bottom:14px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:9px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:#C0A890;margin-bottom:10px;font-family:'DM Sans',sans-serif;">Table</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:100px;font-weight:700;color:#5A4830;line-height:1;">${a.tableNum}</div>
      ${sn}
      <div style="margin:16px auto;">${goldBar(170)}</div>
      <div style="text-align:left;">${guestList(a.guestNames,'#5A4830','rgba(160,140,110,.15)')}</div>
      <div style="margin-top:16px;padding-top:10px;border-top:.5px solid rgba(160,140,110,.2);font-size:8px;color:#B8A090;font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderFloralLuxe(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#8A7050;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#FBF8F2;position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${GOLD},transparent);opacity:.6;"></div>
    <div style="position:absolute;top:0;left:0;right:0;z-index:0;">${bouquet(595,230)}</div>
    <div style="padding:215px 55px 32px;text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:7.5px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${GOLD_DARK};margin-bottom:14px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:${GOLD};margin-bottom:8px;font-family:'DM Sans',sans-serif;">Table</div>
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="44" fill="${GOLD}" opacity=".08"/><circle cx="50" cy="50" r="44" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".42"/><circle cx="50" cy="50" r="37" fill="none" stroke="${GOLD}" stroke-width=".5" opacity=".24" stroke-dasharray="4 3"/><text x="50" y="64" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="44" font-weight="700" fill="${GOLD}" opacity=".9">${a.tableNum}</text></svg>
      ${sn}
      <div style="margin:14px auto;">${goldBar(160)}</div>
      <div style="text-align:left;">${guestList(a.guestNames,'#6A5030',`rgba(197,165,90,.14)`)}</div>
      <div style="margin-top:16px;padding-top:10px;border-top:.6px solid rgba(197,165,90,.22);font-size:8px;color:${GOLD_DARK};font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${GOLD},transparent);opacity:.4;"></div>
  </div>`;
}

function renderBotanique(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:${FOREST};margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#F6FBF4;position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;bottom:0;width:105px;z-index:0;">${BOT_L}</div>
    <div style="position:absolute;top:0;right:0;bottom:0;width:105px;z-index:0;">${BOT_R}</div>
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 128px;text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${SAGE};margin-bottom:14px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:${FOREST};opacity:.6;margin-bottom:8px;font-family:'DM Sans',sans-serif;">Table</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:100px;font-weight:700;color:${FOREST};line-height:1;">${a.tableNum}</div>
      ${sn}
      <div style="margin:14px auto;"><svg width="120" height="12" viewBox="0 0 120 12" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="6" x2="48" y2="6" stroke="${SAGE}" stroke-width=".8" opacity=".5"/><ellipse cx="60" cy="6" rx="6" ry="5" fill="none" stroke="${FOREST}" stroke-width=".8" opacity=".5"/><circle cx="60" cy="6" r="2" fill="${FOREST}" opacity=".45"/><line x1="72" y1="6" x2="120" y2="6" stroke="${SAGE}" stroke-width=".8" opacity=".5"/></svg></div>
      <div style="text-align:left;width:100%;">${guestList(a.guestNames,FOREST_DK,`rgba(74,103,65,.12)`)}</div>
      <div style="margin-top:14px;padding-top:8px;border-top:.5px solid rgba(74,103,65,.18);font-size:8px;color:${SAGE};font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderModerne(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-size:20px;font-weight:600;color:#555;margin-top:4px;font-family:'DM Sans',sans-serif;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#F8F8F6;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 55px;">
    ${a.coupleName ? `<div style="font-size:7px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:#ccc;margin-bottom:18px;font-family:'DM Sans',sans-serif;">${esc(a.coupleName)}</div>` : ''}
    <div style="font-size:7px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:#ccc;margin-bottom:10px;font-family:'DM Sans',sans-serif;">TABLE</div>
    <div style="font-size:110px;font-weight:700;color:#1E1E1E;line-height:1;font-family:'DM Sans',sans-serif;letter-spacing:-4px;">${a.tableNum}</div>
    ${sn}
    <div style="width:36px;height:2px;background:#2a2a2a;margin:18px auto;opacity:.15;"></div>
    <div style="text-align:left;width:100%;">${guestList(a.guestNames,'#333','#f0ede9',"'DM Sans',sans-serif",'12.5px')}</div>
    <div style="margin-top:18px;padding-top:10px;border-top:1px solid #eee;font-size:8px;color:#ccc;font-family:'DM Sans',sans-serif;width:100%;">${a.occupied} / ${a.seats} places</div>
  </div>`;
}

function renderJewish(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:${NAVY_LIGHT};margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#FDFBF4;position:relative;overflow:hidden;">
    <div style="position:absolute;inset:0;z-index:0;">${JEWISH_BORDER}</div>
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 80px;text-align:center;position:relative;z-index:1;">
      ${sodSvg(52, GOLD)}
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${NAVY};opacity:.55;margin:14px 0 6px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${NAVY};opacity:.5;margin-bottom:10px;font-family:'DM Sans',sans-serif;">Table</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:100px;font-weight:700;color:${NAVY};line-height:1;">${a.tableNum}</div>
      ${sn}
      <div style="margin:14px auto;">${goldBar(160)}</div>
      <div style="text-align:left;width:100%;">${guestList(a.guestNames,NAVY,`rgba(26,43,94,.1)`)}</div>
      <div style="margin-top:14px;padding-top:8px;border-top:.6px solid rgba(26,43,94,.15);font-size:8px;color:rgba(26,43,94,.45);font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderJerusalem(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:${NAVY_LIGHT};margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#F5F8FC;position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;right:0;z-index:0;">${JERUSALEM_TOP}</div>
    <div style="padding:342px 70px 90px;text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${NAVY};opacity:.55;margin-bottom:12px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${NAVY};opacity:.5;margin-bottom:8px;font-family:'DM Sans',sans-serif;">Table</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:90px;font-weight:700;color:${NAVY};line-height:1;">${a.tableNum}</div>
      ${sn}
      <div style="margin:12px auto;">${goldBar(150)}</div>
      <div style="text-align:left;">${guestList(a.guestNames,NAVY,`rgba(26,43,94,.1)`)}</div>
      <div style="margin-top:12px;padding-top:8px;font-size:8px;color:rgba(26,43,94,.4);font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;z-index:0;">${JERUSALEM_BTM}</div>
  </div>`;
}

function renderPlexiglass(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-style:italic;color:#555;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  const monogram = a.coupleName.split(/[&+]|et /i).map(s=>s.trim()[0]||'').join('').slice(0,2).toUpperCase() || '♡';
  const seal = (pos: string) => `<div style="position:absolute;${pos};width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#E8D4A0,${GOLD});box-shadow:0 2px 10px rgba(197,165,90,.35);display:flex;align-items:center;justify-content:center;z-index:2;"><span style="font-size:10px;color:#fff;font-weight:700;font-family:'DM Sans',sans-serif;">${monogram}</span></div>`;
  return `<div class="page" style="min-height:100vh;background:#E8EDE4;position:relative;display:flex;align-items:center;justify-content:center;padding:30px;">
    <div style="width:100%;max-width:480px;position:relative;">
      ${seal('top:-12px;left:-12px')}${seal('top:-12px;right:-12px')}${seal('bottom:-12px;left:-12px')}${seal('bottom:-12px;right:-12px')}
      <div style="background:rgba(255,255,255,.9);border:1.5px solid rgba(255,255,255,.95);border-radius:6px;padding:50px 50px;box-shadow:0 12px 48px rgba(0,0,0,.1);text-align:center;">
        ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#8F947F;margin-bottom:14px;font-family:'DM Sans',sans-serif;">${esc(a.coupleName)}</div>` : ''}
        <div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#aaa;margin-bottom:10px;font-family:'DM Sans',sans-serif;">Table</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:100px;font-weight:700;color:#2A2520;line-height:1;">${a.tableNum}</div>
        ${sn}
        <div style="margin:14px auto;">${goldBar(150)}</div>
        <div style="text-align:left;">${guestList(a.guestNames,'#3A3530',`rgba(143,148,127,.15)`)}</div>
        <div style="margin-top:14px;padding-top:8px;border-top:.5px solid rgba(143,148,127,.2);font-size:8px;color:#aaa;font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
      </div>
    </div>
  </div>`;
}

function renderSuspended(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:${GOLD_DARK};margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#FAF6EE;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 55px;">
    <div style="position:absolute;inset:0;border:1.5px solid ${GOLD};opacity:.3;pointer-events:none;margin:14mm;"></div>
    <!-- Wax seal at top -->
    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#E8D4A0,${GOLD});box-shadow:0 4px 16px rgba(197,165,90,.3);display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
      <span style="font-size:14px;color:#fff;font-weight:700;font-family:'Cormorant Garamond',serif;">✦</span>
    </div>
    ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${GOLD_DARK};margin-bottom:14px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
    <div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${CHAMPAGNE};margin-bottom:10px;font-family:'DM Sans',sans-serif;">Table</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:100px;font-weight:700;color:${GOLD_DARK};line-height:1;">${a.tableNum}</div>
    ${sn}
    <div style="margin:14px auto;">${goldBar(160)}</div>
    <div style="text-align:left;width:100%;">${guestList(a.guestNames,'#5A4820',`rgba(197,165,90,.14)`)}</div>
    <div style="margin-top:14px;padding-top:8px;border-top:.5px solid rgba(197,165,90,.2);font-size:8px;color:${CHAMPAGNE};font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
  </div>`;
}

function renderArch(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#7A6848;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#F9F5EE;position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;right:0;z-index:0;">${ARCH_TOP}</div>
    <div style="padding:250px 90px 40px;text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${GOLD_DARK};opacity:.75;margin-bottom:14px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:#C0A878;margin-bottom:8px;font-family:'DM Sans',sans-serif;">Table</div>
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="44" fill="${GOLD}" opacity=".08"/><circle cx="50" cy="50" r="44" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".4"/><text x="50" y="64" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="44" font-weight="700" fill="${GOLD_DARK}" opacity=".88">${a.tableNum}</text></svg>
      ${sn}
      <div style="margin:14px auto;">${goldBar(160)}</div>
      <div style="text-align:left;">${guestList(a.guestNames,'#5A4830',`rgba(160,140,100,.15)`)}</div>
      <div style="margin-top:14px;padding-top:8px;border-top:.5px solid rgba(160,140,100,.22);font-size:8px;color:#A89870;font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderMonogram(a: RenderArgs): string {
  const initials = a.coupleName.split(/[&+]|et /i).map(s=>s.trim()[0]||'').join('').slice(0,2).toUpperCase() || '♡';
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#7A6030;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#FEFCF5;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 55px;">
    <div style="position:absolute;inset:10mm;border:1.5px solid ${GOLD};opacity:.5;pointer-events:none;"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${GOLD},transparent);opacity:.55;"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${GOLD},transparent);opacity:.4;"></div>
    <div style="text-align:center;position:relative;z-index:1;">
      <div style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:50%;border:1.5px solid ${GOLD};background:linear-gradient(145deg,rgba(197,165,90,.12),rgba(197,165,90,.04));margin-bottom:16px;">
        <div style="position:absolute;inset:7px;border-radius:50%;border:.5px dashed rgba(197,165,90,.3);"></div>
        <span style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:${GOLD};font-style:italic;">${initials}</span>
      </div>
      ${a.coupleName ? `<div style="font-size:7.5px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${GOLD_DARK};opacity:.65;margin-bottom:14px;font-family:'DM Sans',sans-serif;">${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${GOLD};margin-bottom:8px;font-family:'DM Sans',sans-serif;">Table</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:100px;font-weight:700;color:${GOLD};line-height:1;">${a.tableNum}</div>
      ${sn}
      <div style="margin:14px auto;">${goldBar(160)}</div>
      <div style="text-align:left;">${guestList(a.guestNames,'#5A4020',`rgba(197,165,90,.14)`)}</div>
      <div style="margin-top:14px;padding-top:8px;border-top:.5px solid rgba(197,165,90,.22);font-size:8px;color:${GOLD_DARK};font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderKetouba(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#7B5C38;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:#FBF8F1;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 78px;overflow:hidden;">
    <!-- Full-page ornate border -->
    <div style="position:absolute;inset:10mm;border:2px solid #8B6B45;opacity:.45;pointer-events:none;"></div>
    <div style="position:absolute;inset:14mm;border:.5px solid #8B6B45;opacity:.22;pointer-events:none;"></div>
    <!-- Corner diamonds -->
    <div style="position:absolute;top:9mm;left:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <div style="position:absolute;top:9mm;right:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <div style="position:absolute;bottom:9mm;left:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <div style="position:absolute;bottom:9mm;right:9mm;width:10px;height:10px;background:${GOLD};opacity:.5;transform:rotate(45deg);"></div>
    <!-- Wavy top/bottom pattern -->
    <svg style="position:absolute;top:16mm;left:16mm;right:16mm;" width="100%" height="12" viewBox="0 0 400 12" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 6 Q25 0 50 6 Q75 12 100 6 Q125 0 150 6 Q175 12 200 6 Q225 0 250 6 Q275 12 300 6 Q325 0 350 6 Q375 12 400 6" fill="none" stroke="#8B6B45" stroke-width=".7" opacity=".3"/></svg>
    <svg style="position:absolute;bottom:16mm;left:16mm;right:16mm;" width="100%" height="12" viewBox="0 0 400 12" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 6 Q25 0 50 6 Q75 12 100 6 Q125 0 150 6 Q175 12 200 6 Q225 0 250 6 Q275 12 300 6 Q325 0 350 6 Q375 12 400 6" fill="none" stroke="#8B6B45" stroke-width=".7" opacity=".3"/></svg>
    <div style="text-align:center;position:relative;z-index:1;">
      ${sodSvg(44, GOLD)}
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#8B6B45;margin:12px 0 6px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:#8B6B45;margin-bottom:10px;font-family:'DM Sans',sans-serif;">Table</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:96px;font-weight:700;color:#7B5C38;line-height:1;">${a.tableNum}</div>
      ${sn}
      <div style="margin:14px auto;">${goldBar(150)}</div>
      <div style="text-align:left;">${guestList(a.guestNames,'#5A4030',`rgba(139,107,69,.12)`)}</div>
      <div style="margin-top:14px;padding-top:8px;font-size:8px;color:#A08060;font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderPalace(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#8A6040;margin-top:5px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:linear-gradient(160deg,#FBF7ED 0%,#F5EDD8 100%);position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 55px;overflow:hidden;">
    <div style="position:absolute;inset:0;border:3px solid ${GOLD};opacity:.5;pointer-events:none;margin:8mm;"></div>
    <div style="position:absolute;inset:0;border:1px solid ${GOLD};opacity:.28;pointer-events:none;margin:11.5mm;"></div>
    <div style="position:absolute;inset:0;border:.5px solid ${GOLD};opacity:.15;pointer-events:none;margin:14mm;"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${GOLD},transparent);opacity:.6;"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${GOLD},transparent);opacity:.6;"></div>
    <!-- Corner rosettes -->
    ${['top:9mm;left:9mm','top:9mm;right:9mm','bottom:9mm;left:9mm','bottom:9mm;right:9mm'].map(pos=>`<svg style="position:absolute;${pos};" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" fill="none" stroke="${GOLD}" stroke-width=".8" opacity=".55"/><circle cx="10" cy="10" r="4" fill="${GOLD}" opacity=".35"/><circle cx="10" cy="10" r="2" fill="${GOLD}" opacity=".55"/></svg>`).join('')}
    <div style="text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:7.5px;font-weight:700;letter-spacing:6px;text-transform:uppercase;color:${GOLD_DARK};margin-bottom:16px;font-family:'DM Sans',sans-serif;">${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:${GOLD};margin-bottom:8px;font-family:'DM Sans',sans-serif;">♛ Table ♛</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:108px;font-weight:700;color:${GOLD};line-height:1;">${a.tableNum}</div>
      ${sn}
      <div style="margin:14px auto;">${goldBar(170)}</div>
      <div style="text-align:left;">${guestList(a.guestNames,'#4A3010',`rgba(197,165,90,.16)`)}</div>
      <div style="margin-top:14px;padding-top:10px;border-top:.8px solid rgba(197,165,90,.28);font-size:8px;color:${GOLD_DARK};font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderBlancOr(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#6A5830;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  const artCorner = `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L28 2 L28 4 L4 4 L4 28 L2 28 Z" fill="${GOLD}" opacity=".45"/><path d="M2 2 L18 2 L18 4 L4 4 L4 18 L2 18 Z" fill="${GOLD}" opacity=".28"/><path d="M8 2 L2 8" stroke="${GOLD}" stroke-width=".5" opacity=".22"/><path d="M14 2 L2 14" stroke="${GOLD}" stroke-width=".5" opacity=".18"/><circle cx="4" cy="4" r="2.5" fill="${GOLD}" opacity=".5"/><circle cx="4" cy="4" r="1" fill="${GOLD}" opacity=".7"/></svg>`;
  return `<div class="page" style="min-height:100vh;background:#FFFFFF;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 55px;overflow:hidden;">
    <div style="position:absolute;inset:10mm;border:1px solid ${GOLD};opacity:.5;pointer-events:none;"></div>
    <div style="position:absolute;top:10mm;left:10mm;">${artCorner}</div>
    <div style="position:absolute;top:10mm;right:10mm;transform:scaleX(-1);">${artCorner}</div>
    <div style="position:absolute;bottom:10mm;left:10mm;transform:scaleY(-1);">${artCorner}</div>
    <div style="position:absolute;bottom:10mm;right:10mm;transform:scale(-1,-1);">${artCorner}</div>
    <div style="text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:7.5px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:${GOLD};margin-bottom:14px;font-family:'DM Sans',sans-serif;">${esc(a.coupleName)}</div>` : ''}
      <svg width="220" height="3" viewBox="0 0 220 3" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="1.5" x2="220" y2="1.5" stroke="${GOLD}" stroke-width="1" opacity=".5"/></svg>
      <div style="font-size:8px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:${GOLD};margin:10px 0;font-family:'DM Sans',sans-serif;">Table</div>
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 60,38 95,38 67,59 77,92 50,72 23,92 33,59 5,38 40,38" fill="none" stroke="${GOLD}" stroke-width=".7" opacity=".22"/><text x="50" y="64" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="44" font-weight="700" fill="${GOLD}" opacity=".9">${a.tableNum}</text></svg>
      ${sn}
      <svg width="220" height="3" viewBox="0 0 220 3" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="1.5" x2="220" y2="1.5" stroke="${GOLD}" stroke-width="1" opacity=".5"/></svg>
      <div style="margin-top:16px;text-align:left;">${guestList(a.guestNames,'#2A2010',`rgba(197,165,90,.14)`)}</div>
      <div style="margin-top:14px;padding-top:8px;border-top:.5px solid rgba(197,165,90,.2);font-size:8px;color:${GOLD};font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

function renderIvoireChampagne(a: RenderArgs): string {
  const sn = a.tableName !== String(a.tableNum) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:#9A8060;margin-top:4px;">${esc(a.tableName)}</div>` : '';
  return `<div class="page" style="min-height:100vh;background:linear-gradient(160deg,#FDF9F2 0%,#F8F2E6 100%);position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 60px;">
    <div style="position:absolute;inset:10mm;border:1.5px solid ${CHAMPAGNE};opacity:.6;pointer-events:none;"></div>
    <div style="position:absolute;inset:14mm;border:.4px solid ${CHAMPAGNE};opacity:.3;pointer-events:none;"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${CHAMPAGNE},transparent);opacity:.7;"></div>
    <div style="text-align:center;position:relative;z-index:1;">
      ${a.coupleName ? `<div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#9A8060;margin-bottom:14px;font-family:'DM Sans',sans-serif;">Mariage de ${esc(a.coupleName)}</div>` : ''}
      <div style="font-size:8px;font-weight:700;letter-spacing:7px;text-transform:uppercase;color:#C4A870;margin-bottom:8px;font-family:'DM Sans',sans-serif;">Table</div>
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="44" fill="${CHAMPAGNE}" opacity=".2"/><circle cx="50" cy="50" r="44" fill="none" stroke="${CHAMPAGNE}" stroke-width="1.2" opacity=".55"/><circle cx="50" cy="50" r="37" fill="none" stroke="${CHAMPAGNE}" stroke-width=".5" opacity=".3"/><text x="50" y="64" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="44" font-weight="700" fill="#9A7040" opacity=".9">${a.tableNum}</text></svg>
      ${sn}
      <div style="margin:14px auto;"><svg width="140" height="14" viewBox="0 0 140 14" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="7" x2="55" y2="7" stroke="${CHAMPAGNE}" stroke-width=".9" opacity=".7"/><ellipse cx="70" cy="7" rx="10" ry="4" fill="none" stroke="${CHAMPAGNE}" stroke-width=".9" opacity=".6"/><circle cx="70" cy="7" r="2" fill="${CHAMPAGNE}" opacity=".55"/><line x1="85" y1="7" x2="140" y2="7" stroke="${CHAMPAGNE}" stroke-width=".9" opacity=".7"/></svg></div>
      <div style="text-align:left;">${guestList(a.guestNames,'#5A4828',`rgba(212,184,150,.2)`)}</div>
      <div style="margin-top:14px;padding-top:8px;border-top:.6px solid rgba(212,184,150,.4);font-size:8px;color:#B09070;font-family:'DM Sans',sans-serif;">${a.occupied} / ${a.seats} places</div>
    </div>
  </div>`;
}

// ── Template registry ──────────────────────────────────────────────────────────

type TemplateEntry = {
  id: PanelTemplateId; name: string; desc: string;
  primary: string; accent: string; bg: string; symbol: string; badge?: string;
  render: Renderer;
};

export const PANEL_TEMPLATES: TemplateEntry[] = [
  { id:'classic',          name:'Élégance Classique',   desc:'Blanc · Noir · Coins dorés',          primary:'#1a1a1a', accent:GOLD,       bg:'#ffffff', symbol:'◇',  render:renderClassic },
  { id:'floral-romantic',  name:'Floral Romantique',    desc:'Ivoire · Roses blanches',              primary:'#8A7060', accent:'#D4C4A8',  bg:'#FAF6F0', symbol:'❀',  render:renderFloralRomantic },
  { id:'floral-luxe',      name:'Floral Luxe',          desc:'Crème · Or · Pivoines',                primary:GOLD,      accent:'#E8D4A0',  bg:'#FBF8F0', symbol:'✿',  badge:'★', render:renderFloralLuxe },
  { id:'botanique',        name:'Jardin Botanique',     desc:'Blanc · Verdure · Nature',             primary:FOREST,    accent:SAGE,       bg:'#F5FBF3', symbol:'⚘',  render:renderBotanique },
  { id:'moderne',          name:'Minimaliste Moderne',  desc:'Blanc pur · Sans-serif bold',          primary:'#1E1E1E', accent:'#ccc',     bg:'#F8F8F6', symbol:'▪',  render:renderModerne },
  { id:'jewish',           name:'Tradition Juive',      desc:'Crème · Arche · Étoile de David',      primary:NAVY,      accent:GOLD,       bg:'#FDFBF4', symbol:'✡',  render:renderJewish },
  { id:'jerusalem',        name:'Jérusalem Prestige',   desc:'Ivoire · Arche · Skyline',             primary:NAVY,      accent:GOLD,       bg:'#F5F8FC', symbol:'⌘',  badge:'★', render:renderJerusalem },
  { id:'plexiglass',       name:'Plexiglas Mariage',    desc:'Acrylique · Cachets de cire',          primary:'#8F947F', accent:GOLD,       bg:'#E8EDE4', symbol:'○',  render:renderPlexiglass },
  { id:'suspended',        name:'Cartes Suspendues',    desc:'Ivoire · Cachet Or · Élégant',         primary:GOLD_DARK, accent:CHAMPAGNE,  bg:'#FAF6EE', symbol:'✦',  render:renderSuspended },
  { id:'arch',             name:'Arche Élégante',       desc:'Ivoire · Colonnes · Drapé',            primary:'#A09480', accent:GOLD,       bg:'#F9F5EE', symbol:'⌒',  render:renderArch },
  { id:'monogram',         name:'Monogramme Premium',   desc:'Blanc · Or · Initiales',               primary:GOLD,      accent:'#E8D4A0',  bg:'#FEFCF5', symbol:'M',  badge:'★', render:renderMonogram },
  { id:'ketouba',          name:'Style Ketouba',        desc:'Crème · Bordure ornée · Tradition',    primary:'#7B5C38', accent:GOLD,       bg:'#FBF8F1', symbol:'✦',  render:renderKetouba },
  { id:'palace',           name:'Style Palace',         desc:'Champagne · Or · Fastueux',            primary:GOLD,      accent:'#E8D4A0',  bg:'#F5EDD8', symbol:'♛',  badge:'★', render:renderPalace },
  { id:'blanc-or',         name:'Blanc et Or',          desc:'Art Déco · Géométrique',               primary:GOLD,      accent:'#E8D4A0',  bg:'#FFFFFF', symbol:'◈',  render:renderBlancOr },
  { id:'ivoire-champagne', name:'Ivoire et Champagne',  desc:'Ivoire · Beige · Luxe discret',        primary:'#9A8060', accent:CHAMPAGNE,  bg:'#FAF6EE', symbol:'◯',  render:renderIvoireChampagne },
];

export function renderPanelPage(id: PanelTemplateId, args: RenderArgs): string {
  return (PANEL_TEMPLATES.find(t=>t.id===id) ?? PANEL_TEMPLATES[0]).render(args);
}

export const DEFAULT_PANEL_TEMPLATE: PanelTemplateId = 'classic';
