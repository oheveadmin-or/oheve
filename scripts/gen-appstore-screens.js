/**
 * Générateur de captures d'écran App Store pour Oheve.
 * Rend des posters SVG (fidèles à l'app + palette Oheve) puis les rastérise
 * en PNG aux dimensions Apple exactes via sharp.
 *
 *   node scripts/gen-appstore-screens.js
 *
 * Sortie : app-store-screenshots/6.5"/*.png (1242×2688) et 6.7"/*.png (1284×2778)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('/Users/odayaattia/jewishwedding/backend/node_modules/sharp');

// ── Palette Oheve ────────────────────────────────────────────────
const C = {
  sauge: '#8F947F', saugeDark: '#757B68', saugePale: '#E4E7DC',
  beige: '#D7C7B5', ivoire: '#F6F2EA', taupe: '#C7B7A5', moka: '#7B7063',
  textDark: '#3C352F', textMid: '#665D54', textLight: '#9A9288', white: '#FFFFFF',
  card: '#F2EDE4', cardAlt: '#EFE9DE', warning: '#B99B74', error: '#C17E7E',
};

// Canvas de conception (aspect ~19.5:9, comme les iPhone modernes)
const W = 1284, H = 2778;
const FONT = `-apple-system, 'Helvetica Neue', Arial, sans-serif`;

// ── Helpers ──────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function rr(x, y, w, h, r, fill, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" ${extra}/>`;
}
function text(x, y, s, opts = {}) {
  const { size = 40, weight = 400, fill = C.textDark, anchor = 'start', ls = 'normal', op = 1 } = opts;
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(s)}</text>`;
}

// ── Cadre iPhone : renvoie le SVG du téléphone + place un <g> écran ──
// L'écran interne fait SCREEN_W × SCREEN_H, origine (0,0), à scaler/positionner.
const PHONE = { x: 150, y: 560, w: 984, h: 2130, r: 120, bezel: 22 };
const SCREEN_W = PHONE.w - PHONE.bezel * 2;   // 940
const SCREEN_H = PHONE.h - PHONE.bezel * 2;   // 2086

function phoneFrame(innerSvg, screenBg = C.ivoire) {
  const sx = PHONE.x + PHONE.bezel, sy = PHONE.y + PHONE.bezel;
  const notchW = 300, notchH = 40, notchX = PHONE.x + PHONE.w / 2 - notchW / 2, notchY = sy + 22;
  return `
  <g>
    <rect x="${PHONE.x - 6}" y="${PHONE.y - 6}" width="${PHONE.w + 12}" height="${PHONE.h + 12}" rx="${PHONE.r + 6}" fill="#1c1a17" opacity="0.28"/>
    <rect x="${PHONE.x}" y="${PHONE.y}" width="${PHONE.w}" height="${PHONE.h}" rx="${PHONE.r}" fill="#26231f"/>
    <clipPath id="screenClip"><rect x="${sx}" y="${sy}" width="${SCREEN_W}" height="${SCREEN_H}" rx="${PHONE.r - PHONE.bezel}"/></clipPath>
    <g clip-path="url(#screenClip)">
      <rect x="${sx}" y="${sy}" width="${SCREEN_W}" height="${SCREEN_H}" fill="${screenBg}"/>
      <g transform="translate(${sx},${sy})">${innerSvg}</g>
    </g>
    <rect x="${notchX}" y="${notchY}" width="${notchW}" height="${notchH}" rx="20" fill="#26231f"/>
  </g>`;
}

// barre de statut iOS (dans le repère écran)
function statusBar(dark = false) {
  const col = dark ? C.white : C.textDark;
  return `
    ${text(60, 70, '9:41', { size: 34, weight: 700, fill: col })}
    <g transform="translate(${SCREEN_W - 180},44)">
      <rect x="0" y="6" width="8" height="18" rx="2" fill="${col}"/>
      <rect x="14" y="0" width="8" height="24" rx="2" fill="${col}"/>
      <rect x="28" y="-4" width="8" height="28" rx="2" fill="${col}"/>
      <path d="M60 12a22 22 0 0 1 40 0" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="80" cy="20" r="4" fill="${col}"/>
      <rect x="110" y="2" width="46" height="22" rx="6" fill="none" stroke="${col}" stroke-width="4"/>
      <rect x="114" y="6" width="34" height="14" rx="3" fill="${col}"/>
      <rect x="158" y="8" width="5" height="10" rx="2" fill="${col}"/>
    </g>`;
}

// barre d'onglets en bas
function tabBar(active = 0) {
  const y = SCREEN_H - 150;
  const labels = ['Accueil', 'Invités', 'Budget', 'Site', 'Profil'];
  const n = labels.length, step = SCREEN_W / n;
  let out = `<rect x="0" y="${y}" width="${SCREEN_W}" height="150" fill="${C.white}"/>
    <rect x="0" y="${y}" width="${SCREEN_W}" height="2" fill="${C.saugePale}"/>`;
  labels.forEach((l, i) => {
    const cx = step * i + step / 2;
    const on = i === active;
    const col = on ? C.saugeDark : C.textLight;
    out += `<circle cx="${cx}" cy="${y + 52}" r="15" fill="none" stroke="${col}" stroke-width="5"/>`;
    out += text(cx, y + 108, l, { size: 24, weight: on ? 700 : 500, fill: col, anchor: 'middle' });
    if (on) out += `<rect x="${cx - 26}" y="${y + 20}" width="52" height="52" rx="14" fill="none"/>`;
  });
  return out;
}

// carte / puce
function pill(x, y, w, h, label, fill, txtCol, size = 26) {
  return rr(x, y, w, h, h / 2, fill) + text(x + w / 2, y + h / 2 + size * 0.35, label, { size, weight: 600, fill: txtCol, anchor: 'middle' });
}

// ── Écrans internes ──────────────────────────────────────────────

// 1 — Accueil : compte à rebours + priorités
function screenHome() {
  let s = statusBar();
  s += text(60, 190, 'Bonjour,', { size: 40, fill: C.textLight });
  s += text(60, 250, 'Sarah & David', { size: 62, weight: 700, fill: C.textDark });
  // carte compte à rebours
  const cy = 300;
  s += `<defs><linearGradient id="cd" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.sauge}"/><stop offset="1" stop-color="${C.saugeDark}"/></linearGradient></defs>`;
  s += rr(60, cy, SCREEN_W - 120, 440, 44, 'url(#cd)');
  s += text(SCREEN_W / 2, cy + 90, 'AVANT LE GRAND JOUR', { size: 28, weight: 600, fill: '#EDEFE7', anchor: 'middle', ls: 4 });
  s += text(SCREEN_W / 2, cy + 250, '142', { size: 200, weight: 800, fill: C.white, anchor: 'middle' });
  s += text(SCREEN_W / 2, cy + 320, 'jours', { size: 44, weight: 500, fill: '#EDEFE7', anchor: 'middle' });
  s += text(SCREEN_W / 2, cy + 390, '14 juin 2026  ·  Domaine des Oliviers', { size: 30, fill: '#E4E7DC', anchor: 'middle' });
  // priorités
  let py = cy + 520;
  s += text(60, py, 'Vos priorités', { size: 46, weight: 700, fill: C.textDark });
  s += text(SCREEN_W - 60, py, 'Tout voir', { size: 30, weight: 600, fill: C.saugeDark, anchor: 'end' });
  py += 50;
  const tasks = [
    ['Réserver le traiteur', 'Dans 5 jours', C.error, false],
    ['Envoyer les faire-part', 'Cette semaine', C.warning, false],
    ['Choisir le plan de table', 'Fait', C.saugeDark, true],
  ];
  tasks.forEach(([label, sub, col, done]) => {
    s += rr(60, py, SCREEN_W - 120, 150, 28, C.white);
    s += rr(60, py, 8, 150, 4, col);
    // checkbox
    if (done) { s += `<circle cx="130" cy="${py + 75}" r="26" fill="${C.saugeDark}"/><path d="M118 ${py + 75} l9 10 18 -20" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }
    else { s += `<circle cx="130" cy="${py + 75}" r="26" fill="none" stroke="${C.taupe}" stroke-width="5"/>`; }
    s += text(190, py + 68, label, { size: 38, weight: 600, fill: done ? C.textLight : C.textDark });
    s += text(190, py + 112, sub, { size: 28, fill: col, weight: 600 });
    py += 174;
  });
  s += tabBar(0);
  return s;
}

// 2 — Site de mariage (aperçu thème premium ivoire dans l'écran)
function screenSite() {
  let s = statusBar();
  // fond ivoire crème avec ornements
  s += `<rect x="0" y="0" width="${SCREEN_W}" height="${SCREEN_H}" fill="#FBF8F1"/>`;
  s += `<rect x="40" y="120" width="${SCREEN_W - 80}" height="${SCREEN_H - 300}" rx="30" fill="none" stroke="${C.taupe}" stroke-width="3"/>`;
  s += `<rect x="60" y="140" width="${SCREEN_W - 120}" height="${SCREEN_H - 340}" rx="20" fill="none" stroke="${C.beige}" stroke-width="2"/>`;
  const midX = SCREEN_W / 2;
  s += text(midX, 320, 'NOUS NOUS MARIONS', { size: 30, weight: 500, fill: C.moka, anchor: 'middle', ls: 8 });
  // fleuron
  s += `<g stroke="${C.sauge}" stroke-width="4" fill="none" stroke-linecap="round">
    <path d="M${midX - 120} 380 q60 -34 120 0"/><path d="M${midX + 120} 380 q-60 -34 -120 0"/>
    <circle cx="${midX}" cy="380" r="7" fill="${C.sauge}" stroke="none"/></g>`;
  s += `<text x="${midX}" y="560" font-family="'Snell Roundhand','Apple Chancery',cursive" font-size="150" fill="${C.textDark}" text-anchor="middle" font-style="italic">Sarah</text>`;
  s += text(midX, 640, '&', { size: 70, fill: C.sauge, anchor: 'middle' });
  s += `<text x="${midX}" y="770" font-family="'Snell Roundhand','Apple Chancery',cursive" font-size="150" fill="${C.textDark}" text-anchor="middle" font-style="italic">David</text>`;
  s += text(midX, 890, '14 · 06 · 2026', { size: 46, weight: 500, fill: C.moka, anchor: 'middle', ls: 4 });
  s += text(midX, 950, 'Domaine des Oliviers · Provence', { size: 30, fill: C.textLight, anchor: 'middle' });
  // photo placeholder
  s += `<defs><linearGradient id="ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.saugePale}"/><stop offset="1" stop-color="${C.beige}"/></linearGradient></defs>`;
  s += rr(120, 1010, SCREEN_W - 240, 560, 24, 'url(#ph)');
  s += `<g stroke="${C.moka}" stroke-width="5" fill="none" opacity="0.5"><circle cx="${midX}" cy="1250" r="70"/><path d="M${midX - 40} 1300 l40 -46 30 34 40 -50 60 62" stroke-linejoin="round"/></g>`;
  // pasuk
  s += text(midX, 1690, 'אני לדודי ודודי לי', { size: 52, fill: C.saugeDark, anchor: 'middle' });
  // bouton RSVP
  s += rr(midX - 220, 1770, 440, 120, 60, C.saugeDark);
  s += text(midX, 1845, 'Confirmer ma présence', { size: 38, weight: 700, fill: C.white, anchor: 'middle' });
  s += text(midX, 1990, 'Créez le vôtre en quelques minutes', { size: 30, fill: C.textLight, anchor: 'middle' });
  return s;
}

// 3 — Invités + RSVP
function screenGuests() {
  let s = statusBar();
  s += text(60, 200, 'Invités', { size: 66, weight: 700 });
  s += text(60, 258, '112 personnes invitées', { size: 32, fill: C.textLight });
  // stats
  const stats = [['84', 'Confirmés', C.saugeDark, C.saugePale], ['22', 'En attente', C.warning, '#F2E9DE'], ['6', 'Refusés', C.error, '#F5E8E8']];
  const sw = (SCREEN_W - 120 - 40) / 3;
  stats.forEach(([n, l, col, bg], i) => {
    const x = 60 + i * (sw + 20);
    s += rr(x, 300, sw, 200, 28, bg);
    s += text(x + sw / 2, 400, n, { size: 76, weight: 800, fill: col, anchor: 'middle' });
    s += text(x + sw / 2, 455, l, { size: 28, weight: 600, fill: col, anchor: 'middle' });
  });
  // filtres
  s += pill(60, 550, 200, 74, 'Houppa', C.saugeDark, C.white, 30);
  s += pill(280, 550, 160, 74, 'Henné', C.white, C.textMid, 30);
  s += pill(460, 550, 260, 74, 'Chabbat Hatan', C.white, C.textMid, 26);
  // liste
  const guests = [
    ['Rachel Cohen', '+2 invités', 'Confirmé', C.saugeDark, C.saugePale, 'RC'],
    ['Benjamin Levy', 'Famille', 'Confirmé', C.saugeDark, C.saugePale, 'BL'],
    ['Esther Attal', '+1', 'En attente', C.warning, '#F2E9DE', 'EA'],
    ['Jonathan Amar', 'Ami', 'Confirmé', C.saugeDark, C.saugePale, 'JA'],
    ['Déborah Sultan', 'Famille', 'En attente', C.warning, '#F2E9DE', 'DS'],
    ['Michael Ben', 'Collègue', 'Refusé', C.error, '#F5E8E8', 'MB'],
  ];
  let gy = 690;
  guests.forEach(([name, sub, badge, col, bg, initials]) => {
    s += rr(60, gy, SCREEN_W - 120, 150, 28, C.white);
    s += `<circle cx="140" cy="${gy + 75}" r="46" fill="${C.saugePale}"/>`;
    s += text(140, gy + 88, initials, { size: 36, weight: 700, fill: C.saugeDark, anchor: 'middle' });
    s += text(216, gy + 66, name, { size: 38, weight: 600, fill: C.textDark });
    s += text(216, gy + 112, sub, { size: 28, fill: C.textLight });
    const bw = badge.length * 15 + 60;
    s += pill(SCREEN_W - 60 - bw - 20, gy + 44, bw, 62, badge, bg, col, 26);
    gy += 174;
  });
  s += tabBar(1);
  return s;
}

// 4 — Budget
function screenBudget() {
  let s = statusBar();
  s += text(60, 200, 'Budget', { size: 66, weight: 700 });
  // carte total
  s += `<defs><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.moka}"/><stop offset="1" stop-color="#5f574c"/></linearGradient></defs>`;
  s += rr(60, 250, SCREEN_W - 120, 380, 40, 'url(#bg2)');
  s += text(110, 350, 'Dépensé', { size: 32, fill: '#E8E2D8' });
  s += text(110, 450, '18 400 €', { size: 96, weight: 800, fill: C.white });
  s += text(110, 510, 'sur 32 000 € de budget', { size: 32, fill: '#D9D2C7' });
  // barre de progression
  s += rr(110, 550, SCREEN_W - 340, 30, 15, '#5f574c');
  s += rr(110, 550, (SCREEN_W - 340) * 0.57, 30, 15, C.saugePale);
  s += text(SCREEN_W - 110, 590, '57 %', { size: 34, weight: 700, fill: C.white, anchor: 'end' });
  // catégories
  s += text(60, 730, 'Par poste', { size: 46, weight: 700 });
  const cats = [
    ['Salle & Traiteur', '11 200 €', 0.8, C.saugeDark],
    ['Photo & Vidéo', '3 400 €', 0.6, C.warning],
    ['Robe & Costume', '2 100 €', 0.45, C.moka],
    ['Fleurs & Déco', '1 200 €', 0.3, C.sauge],
    ['Musique / DJ', '500 €', 0.2, C.taupe],
  ];
  let cyy = 800;
  cats.forEach(([name, amt, pct, col]) => {
    s += rr(60, cyy, SCREEN_W - 120, 180, 28, C.white);
    s += `<circle cx="140" cy="${cyy + 90}" r="34" fill="${col}" opacity="0.18"/><circle cx="140" cy="${cyy + 90}" r="16" fill="${col}"/>`;
    s += text(200, cyy + 78, name, { size: 38, weight: 600 });
    s += text(SCREEN_W - 90, cyy + 78, amt, { size: 40, weight: 700, fill: C.textDark, anchor: 'end' });
    s += rr(200, cyy + 108, SCREEN_W - 380, 22, 11, C.saugePale);
    s += rr(200, cyy + 108, (SCREEN_W - 380) * pct, 22, 11, col);
    cyy += 204;
  });
  s += tabBar(2);
  return s;
}

// 5 — Plan de table
function screenSeating() {
  let s = statusBar();
  s += `<rect x="0" y="0" width="${SCREEN_W}" height="${SCREEN_H}" fill="#F1ECE3"/>`;
  s += statusBar();
  s += text(60, 200, 'Plan de table', { size: 60, weight: 700 });
  s += text(60, 256, 'Glissez vos invités sur les tables', { size: 30, fill: C.textLight });
  // tables rondes avec sièges
  function roundTable(cx, cy, label, r = 110, filled = 8) {
    let t = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.white}" stroke="${C.taupe}" stroke-width="4"/>`;
    t += text(cx, cy + 12, label, { size: 34, weight: 700, fill: C.saugeDark, anchor: 'middle' });
    const seats = 10;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
      const sx = cx + Math.cos(a) * (r + 44), sy = cy + Math.sin(a) * (r + 44);
      t += `<circle cx="${sx}" cy="${sy}" r="26" fill="${i < filled ? C.sauge : C.saugePale}"/>`;
    }
    return t;
  }
  s += roundTable(SCREEN_W * 0.32, 560, 'T1', 110, 10);
  s += roundTable(SCREEN_W * 0.72, 640, 'T2', 110, 7);
  s += roundTable(SCREEN_W * 0.30, 950, 'T3', 110, 8);
  s += roundTable(SCREEN_W * 0.72, 1060, 'T4', 110, 6);
  // table d'honneur rectangulaire
  s += rr(SCREEN_W * 0.5 - 260, 1300, 520, 130, 24, C.white, `stroke="${C.sauge}" stroke-width="4"`);
  s += text(SCREEN_W * 0.5, 1382, "Table d'honneur", { size: 36, weight: 700, fill: C.saugeDark, anchor: 'middle' });
  for (let i = 0; i < 6; i++) { s += `<circle cx="${SCREEN_W * 0.5 - 210 + i * 84}" cy="1270" r="24" fill="${C.sauge}"/>`; }
  // bandeau invités à placer
  const py = SCREEN_H - 470;
  s += rr(0, py, SCREEN_W, 470, 40, C.white);
  s += text(60, py + 90, 'À placer', { size: 42, weight: 700 });
  s += pill(SCREEN_W - 240, py + 50, 180, 64, '18 restants', C.saugePale, C.saugeDark, 26);
  const names = ['Rachel', 'Benjamin', 'Esther', 'Jonathan'];
  names.forEach((n, i) => {
    const x = 60 + i * 290;
    s += rr(x, py + 150, 260, 130, 24, C.ivoire);
    s += `<circle cx="${x + 66}" cy="${py + 215}" r="40" fill="${C.saugePale}"/>`;
    s += text(x + 66, py + 227, n[0], { size: 34, weight: 700, fill: C.saugeDark, anchor: 'middle' });
    s += text(x + 120, py + 210, n, { size: 30, weight: 600 });
    s += text(x + 120, py + 250, '+1', { size: 26, fill: C.textLight });
  });
  // bouton export PDF
  s += rr(60, py + 320, SCREEN_W - 120, 110, 55, C.saugeDark);
  s += text(SCREEN_W / 2, py + 390, 'Exporter en PDF', { size: 38, weight: 700, fill: C.white, anchor: 'middle' });
  return s;
}

// 6 — Prestataires
function screenVendors() {
  let s = statusBar();
  s += text(60, 200, 'Prestataires', { size: 62, weight: 700 });
  // barre recherche
  s += rr(60, 250, SCREEN_W - 120, 100, 50, C.white);
  s += `<circle cx="130" cy="300" r="24" fill="none" stroke="${C.textLight}" stroke-width="6"/><path d="M148 318 l26 26" stroke="${C.textLight}" stroke-width="6" stroke-linecap="round"/>`;
  s += text(190, 315, 'Photographe, traiteur, salle…', { size: 34, fill: C.textLight });
  // filtres
  ['Tous', 'Photo', 'Traiteur', 'DJ', 'Salle'].reduce((x, l, i) => {
    const w = l.length * 18 + 60;
    s += pill(x, 390, w, 70, l, i === 0 ? C.saugeDark : C.white, i === 0 ? C.white : C.textMid, 28);
    return x + w + 18;
  }, 60);
  // cartes prestataires
  const vendors = [
    ['Studio Lumière', 'Photographe · Paris', '4,9', 'à partir de 1 800 €', C.saugePale],
    ['Maison Doré', 'Traiteur casher · Lyon', '4,8', 'à partir de 90 €/pers', '#F2E9DE'],
    ['DJ Kobi Events', 'DJ & Animation · Marseille', '5,0', 'à partir de 1 200 €', C.saugePale],
  ];
  let vy = 500;
  vendors.forEach(([name, cat, rating, price, bg]) => {
    s += rr(60, vy, SCREEN_W - 120, 520, 32, C.white);
    s += rr(60, vy, SCREEN_W - 120, 300, 32, bg);
    s += rr(60, vy + 150, SCREEN_W - 120, 150, 0, bg);
    // icône image
    s += `<g opacity="0.5" stroke="${C.moka}" stroke-width="5" fill="none"><circle cx="${SCREEN_W / 2}" cy="${vy + 120}" r="50"/><path d="M${SCREEN_W / 2 - 30} ${vy + 155} l30 -34 22 26 30 -38 44 46" stroke-linejoin="round"/></g>`;
    // badge note
    s += rr(SCREEN_W - 240, vy + 30, 150, 66, 33, C.white);
    s += `<path d="M${SCREEN_W - 210} ${vy + 55} l8 16 18 2 -13 13 3 18 -16 -9 -16 9 3 -18 -13 -13 18 -2 z" fill="${C.warning}"/>`;
    s += text(SCREEN_W - 150, vy + 78, rating, { size: 34, weight: 700, fill: C.textDark, anchor: 'middle' });
    // infos
    s += text(90, vy + 375, name, { size: 44, weight: 700 });
    s += text(90, vy + 425, cat, { size: 30, fill: C.textLight });
    s += text(90, vy + 480, price, { size: 32, weight: 600, fill: C.saugeDark });
    s += rr(SCREEN_W - 260, vy + 430, 170, 70, 35, C.saugeDark);
    s += text(SCREEN_W - 175, vy + 475, 'Contacter', { size: 28, weight: 700, fill: C.white, anchor: 'middle' });
    vy += 550;
  });
  s += tabBar(1);
  return s;
}

// ── Poster : fond + titre + téléphone ────────────────────────────
function poster({ inner, screenBg, title, subtitle, bgA, bgB, titleCol = C.textDark, subCol = C.textMid }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="posterBg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#posterBg)"/>
    <text x="${W / 2}" y="250" font-family="${FONT}" font-size="76" font-weight="800" fill="${titleCol}" text-anchor="middle">${esc(title)}</text>
    <text x="${W / 2}" y="345" font-family="${FONT}" font-size="42" font-weight="500" fill="${subCol}" text-anchor="middle">${esc(subtitle)}</text>
    <text x="${W / 2}" y="${H - 60}" font-family="${FONT}" font-size="40" font-weight="700" fill="${titleCol}" text-anchor="middle" letter-spacing="6" opacity="0.85">OHEVE</text>
    ${phoneFrame(inner, screenBg)}
  </svg>`;
  return svg;
}

const SCREENS = [
  { file: '1-accueil', title: 'Organisez votre mariage', subtitle: 'Compte à rebours, to-do et priorités', inner: screenHome(), screenBg: C.ivoire, bgA: '#E4E7DC', bgB: '#CBD0BF' },
  { file: '2-site', title: 'Un site de mariage élégant', subtitle: 'Plus de 30 thèmes premium, prêts en minutes', inner: screenSite(), screenBg: '#FBF8F1', bgA: '#F1E9DC', bgB: '#D7C7B5' },
  { file: '3-invites', title: 'Vos invités, enfin simples', subtitle: 'Liste, RSVP en ligne et import Excel', inner: screenGuests(), screenBg: C.ivoire, bgA: '#E8E2D6', bgB: '#C7B7A5' },
  { file: '4-budget', title: 'Maîtrisez votre budget', subtitle: 'Suivi des dépenses poste par poste', inner: screenBudget(), screenBg: C.ivoire, bgA: '#DED7CB', bgB: '#7B7063', titleCol: C.textDark, subCol: C.textMid },
  { file: '5-plan-de-table', title: 'Plan de table interactif', subtitle: 'Placez vos invités, exportez en PDF', inner: screenSeating(), screenBg: '#F1ECE3', bgA: '#E4E7DC', bgB: '#B9BFA8' },
  { file: '6-prestataires', title: 'Trouvez vos prestataires', subtitle: 'Photographes, traiteurs, DJ et salles', inner: screenVendors(), screenBg: C.ivoire, bgA: '#EFE9DE', bgB: '#C7B7A5' },
];

// ── Rendu ────────────────────────────────────────────────────────
const SIZES = [
  { name: '6.7"', w: 1284, h: 2778 },
  { name: '6.5"', w: 1242, h: 2688 },
];

(async () => {
  const root = path.join('/Users/odayaattia/jewishwedding', 'app-store-screenshots');
  for (const size of SIZES) {
    const dir = path.join(root, `${size.name} (${size.w}x${size.h})`);
    fs.mkdirSync(dir, { recursive: true });
    for (const sc of SCREENS) {
      const svg = poster(sc);
      const out = path.join(dir, `${sc.file}.png`);
      await sharp(Buffer.from(svg))
        .resize(size.w, size.h, { fit: 'fill' })
        .png()
        .toFile(out);
      console.log('✓', path.relative(root, out));
    }
  }
  console.log('\nTerminé →', root);
})().catch((e) => { console.error(e); process.exit(1); });
