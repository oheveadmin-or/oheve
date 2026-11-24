/**
 * Brochure PDF du prestataire (mise en page pure, sans React Native : testable
 * hors app). Pages A4 595×842 :
 *   1. Couverture plein cadre (photo de couverture, nom, catégorie, ville)
 *   2. Présentation (photo de profil, « À propos », « En bref », aperçu photos)
 *   3+ Portfolio (toutes les photos et vidéos, mises en page alternées + légendes)
 *   n. Contact (coordonnées, QR code vers le profil public, documents)
 * Toutes les images arrivent déjà en data URI (voir presta-fiche-pdf.ts).
 */
import qrcode from 'qrcode-generator';

import { eventConfig } from '@/lib/event-type';
import { categoryLabel } from '@/lib/presta-categories';

export type BrochureMedia = { src: string; caption?: string | null; video?: boolean };

export type BrochureData = {
  name: string;
  category?: string | null;
  city?: string | null;
  description?: string | null;
  price?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  eventTypes?: string[] | null;
  isPartner?: boolean;
  cover?: string | null;
  avatar?: string | null;
  /** Portfolio, couverture exclue. */
  media: BrochureMedia[];
  documents?: string[];
  publicUrl?: string | null;
  fonts?: { regular?: string | null; semibold?: string | null };
};

const W = 595;
const H = 842;

export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const t = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

function qrSvg(text: string): string {
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${path}" fill="#343630"/></svg>`;
  } catch {
    return '';
  }
}

// Icônes au trait (style Ionicons outline), couleur sauge.
const ICON: Record<string, string> = {
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
};
const icon = (k: string) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

function instaHandle(raw?: string | null): string {
  const v = t(raw);
  if (!v || v === '-') return '';
  return v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '');
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64Bytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i + 3 < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | (B64.indexOf(clean[i + 2]) << 6) | B64.indexOf(clean[i + 3]);
    out[o++] = (n >> 16) & 255; out[o++] = (n >> 8) & 255; out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

/** Dimensions d'une image JPEG/PNG en data URI (lit seulement l'en-tête). */
export function imageSize(dataUri: string): { w: number; h: number } | null {
  const comma = dataUri.indexOf(',');
  if (comma < 0) return null;
  const head = b64Bytes(dataUri.slice(comma + 1, comma + 1 + 262144));
  if (head[0] === 0x89 && head[1] === 0x50) {
    const w = (head[16] << 24) | (head[17] << 16) | (head[18] << 8) | head[19];
    const h = (head[20] << 24) | (head[21] << 16) | (head[22] << 8) | head[23];
    return w > 0 && h > 0 ? { w, h } : null;
  }
  if (head[0] !== 0xff || head[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < head.length) {
    if (head[i] !== 0xff) { i++; continue; }
    const m = head[i + 1];
    if (m === 0xff) { i++; continue; }
    const len = (head[i + 2] << 8) | head[i + 3];
    // SOF0..SOF15 sauf DHT (C4), JPG (C8), DAC (CC)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const h = (head[i + 5] << 8) | head[i + 6];
      const w = (head[i + 7] << 8) | head[i + 8];
      return w > 0 && h > 0 ? { w, h } : null;
    }
    i += 2 + len;
  }
  return null;
}

/**
 * Photo recadrée « cover » sans object-fit : avec object-fit, le moteur
 * d'impression décode et ré-encode chaque photo (PDF de 55 Mo au lieu de 7).
 * On calcule la taille et la position exactes en % de la case, qui coupe le
 * dépassement.
 */
export function coverImg(src: string, box: { w: number; h: number }, cls = ''): string {
  const sz = imageSize(src);
  let style = 'left:0;top:0;width:100%;height:100%';
  if (sz) {
    const ir = sz.w / sz.h;
    const br = box.w / box.h;
    if (ir > br) {
      const w = (ir / br) * 100;
      style = `top:0;height:100%;width:${w.toFixed(3)}%;left:${(-(w - 100) / 2).toFixed(3)}%`;
    } else {
      const h = (br / ir) * 100;
      style = `left:0;width:100%;height:${h.toFixed(3)}%;top:${(-(h - 100) / 2).toFixed(3)}%`;
    }
  }
  return `<img class="cimg ${cls}" src="${src}" style="${style}" alt="">`;
}

// Géométrie (px) des cases : doit suivre le CSS ci-dessous.
const CW = 507;          // largeur utile (595 − 2 × 44)
const LH = 660;          // hauteur d'une page portfolio
const GAP = 8;
const half = (CW - GAP) / 2;
const BOXES: Record<string, { w: number; h: number }[]> = {
  'l-hero': [{ w: CW, h: (LH - GAP) * 0.6 }, { w: half, h: (LH - GAP) * 0.4 }, { w: half, h: (LH - GAP) * 0.4 }],
  'l-grid': Array.from({ length: 4 }, () => ({ w: half, h: (LH - GAP) / 2 })),
  'l-side': [{ w: (CW - GAP) * 0.6, h: LH }, { w: (CW - GAP) * 0.4, h: (LH - GAP) / 2 }, { w: (CW - GAP) * 0.4, h: (LH - GAP) / 2 }],
  'l-two': [{ w: CW, h: (LH - GAP) / 2 }, { w: CW, h: (LH - GAP) / 2 }],
  'l-one': [{ w: CW, h: LH }],
};

/** Une tuile photo/vidéo, légende en surimpression. */
function tile(m: BrochureMedia, box: { w: number; h: number }, cls = ''): string {
  const cap = t(m.caption);
  return `<figure class="tile ${cls}">
    ${coverImg(m.src, box)}
    ${m.video ? '<span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff"/></svg></span>' : ''}
    ${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}
  </figure>`;
}

type Layout = { cls: string; take: number };
const CYCLE: Layout[] = [
  { cls: 'l-hero', take: 3 },
  { cls: 'l-grid', take: 4 },
  { cls: 'l-side', take: 3 },
];

/** Découpe le portfolio en pages ; la dernière page s'adapte au reste. */
export function paginateMedia(media: BrochureMedia[]): { cls: string; items: BrochureMedia[] }[] {
  const pages: { cls: string; items: BrochureMedia[] }[] = [];
  let i = 0;
  let k = 0;
  while (i < media.length) {
    const left = media.length - i;
    let layout = CYCLE[k % CYCLE.length];
    if (left < layout.take) layout = left === 1 ? { cls: 'l-one', take: 1 } : left === 2 ? { cls: 'l-two', take: 2 } : { cls: 'l-hero', take: 3 };
    pages.push({ cls: layout.cls, items: media.slice(i, i + layout.take) });
    i += layout.take;
    k++;
  }
  return pages;
}

export function buildBrochureHtml(d: BrochureData): string {
  const name = t(d.name) || 'Mon entreprise';
  const cat = d.category ? categoryLabel(d.category) : '';
  const city = t(d.city);
  const desc = t(d.description);
  const insta = instaHandle(d.instagram);
  const website = t(d.website).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const events = (d.eventTypes ?? []).filter(Boolean).map((e) => eventConfig(e).label);
  const initial = esc(name.charAt(0).toUpperCase());

  const images = d.media;

  // Page 2 : hauteur du texte estimée (≈ 52 caractères par ligne de 20 px dans
  // la colonne) → la place restante accueille 0, 3 ou 6 photos d'aperçu.
  // Chaque photo n'apparaît qu'une fois dans la brochure.
  const descLines = (desc || 'x').split(/\n/).reduce((n, para) => n + Math.max(1, Math.ceil(para.length / 52)), 0);
  const textH = 44 + descLines * 20;
  const briefH = 60 + 4 * 46 + (events.length ? 30 + Math.ceil(events.length / 2) * 26 : 0);
  const AREA = 574; // de la fin de l'en-tête (204 px) au-dessus du pied (778 px)
  let bodyH = Math.min(AREA, Math.max(textH, briefH, 220));
  let previewH = AREA - bodyH - 24;
  let previewRows = previewH >= 300 ? 2 : previewH >= 130 ? 1 : 0;
  while (previewRows > 0 && images.length < previewRows * 3 + 2) previewRows--;
  if (previewRows === 0) { bodyH = AREA; previewH = 0; }
  else if (previewRows === 1) previewH = Math.min(previewH, 230);
  bodyH = previewRows ? AREA - previewH - 24 : AREA;
  const preview = images.slice(0, previewRows * 3);
  const previewBox = { w: (CW - 2 * GAP) / 3, h: previewRows ? (previewH - (previewRows - 1) * GAP) / previewRows : 1 };
  const rest = images.slice(preview.length);
  const portfolioPages = paginateMedia(rest);
  const totalPages = 2 + portfolioPages.length + 1;

  const fontFace = [
    d.fonts?.regular && `@font-face{font-family:'OheveSerif';font-weight:400;src:url(${d.fonts.regular}) format('truetype');}`,
    d.fonts?.semibold && `@font-face{font-family:'OheveSerif';font-weight:600;src:url(${d.fonts.semibold}) format('truetype');}`,
  ].filter(Boolean).join('\n');

  const footer = (n: number) => `<div class="foot"><span class="brand">OHEVE</span><span class="fname">${esc(name)}</span><span class="pnum">${pad2(n)} / ${pad2(totalPages)}</span></div>`;

  // ── Page 1 : couverture ───────────────────────────────────────────────
  const coverPage = `<section class="page cover${d.cover ? '' : ' nophoto'}">
    ${d.cover ? `${coverImg(d.cover, { w: W, h: H })}<div class="cover-shade"></div>` : `<div class="cover-frame"></div><div class="cover-initial">${initial}</div>`}
    <div class="cover-top"><span>OHEVE</span><span>Fiche prestataire</span></div>
    <div class="cover-text">
      ${cat || city ? `<div class="eyebrow">${esc([cat, city].filter(Boolean).join(' · '))}</div>` : ''}
      <h1>${esc(name)}</h1>
      ${d.isPartner ? '<div class="pill">✓ Partenaire Oheve</div>' : ''}
    </div>
  </section>`;

  // ── Page 2 : présentation ─────────────────────────────────────────────
  const facts: string[] = [];
  if (t(d.price)) facts.push(`<div class="fact">${icon('tag')}<div><div class="lbl">Tarifs</div><div class="val">${esc(d.price)}</div></div></div>`);
  if (city) facts.push(`<div class="fact">${icon('pin')}<div><div class="lbl">Ville</div><div class="val">${esc(city)}</div></div></div>`);
  if (images.length) facts.push(`<div class="fact">${icon('globe')}<div><div class="lbl">Portfolio</div><div class="val">${images.length + (d.cover ? 1 : 0)} réalisation${images.length + (d.cover ? 1 : 0) > 1 ? 's' : ''}</div></div></div>`);
  if (d.documents?.length) facts.push(`<div class="fact">${icon('doc')}<div><div class="lbl">Documents</div><div class="val">${d.documents.length} PDF à consulter</div></div></div>`);

  const aboutPage = `<section class="page about">
    <div class="about-head">
      ${d.avatar ? `<div class="avatar">${coverImg(d.avatar, { w: 84, h: 84 })}</div>` : `<div class="avatar avatar-ph">${initial}</div>`}
      <div class="about-id">
        <div class="eyebrow dark">${esc(cat || 'Prestataire')}</div>
        <div class="about-name">${esc(name)}</div>
      </div>
    </div>
    <div class="rule"></div>
    <div class="about-body" style="height:${bodyH.toFixed(1)}px">
      <div class="about-text">
        <h2>À propos</h2>
        <div class="desc${desc ? '' : ' empty'}">${desc ? esc(desc) : 'Description à venir.'}</div>
      </div>
      ${facts.length || events.length ? `<aside class="brief">
        <h3>En bref</h3>
        ${facts.join('')}
        ${events.length ? `<div class="lbl ev-lbl">Événements</div><div class="chips">${events.map((e) => `<span class="chip">${esc(e)}</span>`).join('')}</div>` : ''}
      </aside>` : ''}
    </div>
    ${preview.length ? `<div class="preview" style="height:${previewH.toFixed(1)}px;grid-template-rows:repeat(${previewRows},minmax(0,1fr))">${preview.map((m) => tile(m, previewBox)).join('')}</div>` : ''}
    ${footer(2)}
  </section>`;

  // ── Pages 3+ : portfolio ──────────────────────────────────────────────
  const portfolio = portfolioPages.map((p, idx) => `<section class="page port">
    <div class="port-head">
      <h2>Portfolio</h2>
      ${portfolioPages.length > 1 ? `<span class="port-count">${idx + 1} / ${portfolioPages.length}</span>` : ''}
    </div>
    <div class="layout ${p.cls}">${p.items.map((m, j) => tile(m, BOXES[p.cls][j], `t${j}`)).join('')}</div>
    ${footer(3 + idx)}
  </section>`).join('');

  // ── Dernière page : contact ───────────────────────────────────────────
  const contacts = [
    t(d.phone) && t(d.phone) !== '-' && ['phone', 'Téléphone', t(d.phone)],
    t(d.email) && t(d.email) !== '-' && ['mail', 'Email', t(d.email)],
    website && website !== '-' && ['globe', 'Site web', website],
    insta && ['insta', 'Instagram', `@${insta}`],
    city && ['pin', 'Ville', city],
  ].filter(Boolean) as [string, string, string][];
  const qr = d.publicUrl ? qrSvg(d.publicUrl) : '';
  const bandSrc = images.length ? images[images.length - 1].src : d.cover;
  const BAND_H = 230;
  // Place verticale de la colonne coordonnées (au-dessus du logo final) :
  // ~48 px (avec bandeau) / 52 px par ligne de contact, 34 px d'en-tête + 26 px par document.
  const listRoom = bandSrc ? 330 : 460;
  const maxDocs = Math.max(0, Math.floor((listRoom - contacts.length * (bandSrc ? 48 : 52) - 34) / 26));
  const docs = (d.documents ?? []).slice(0, maxDocs);

  const contactPage = `<section class="page contact${bandSrc ? ' with-band' : ''}">
    ${bandSrc ? `<div class="band">${coverImg(bandSrc, { w: W, h: BAND_H })}</div>` : ''}
    <div class="contact-top">
      <div class="eyebrow dark">Contact</div>
      <h2 class="big">Parlons de votre événement</h2>
      <p class="lead">Nous serions ravis d'échanger avec vous sur votre projet et de vous proposer une offre sur mesure.</p>
    </div>
    <div class="contact-body">
      <div class="clist">
        ${contacts.length ? contacts.map(([k, l, v]) => `<div class="crow">${icon(k)}<div><div class="lbl">${esc(l)}</div><div class="val">${esc(v)}</div></div></div>`).join('') : '<div class="desc empty">Coordonnées à venir.</div>'}
        ${docs.length ? `<div class="docs"><div class="lbl">Documents disponibles sur mon profil</div>${docs.map((x) => `<div class="doc">${icon('doc')}<span>${esc(x)}</span></div>`).join('')}</div>` : ''}
      </div>
      ${qr ? `<div class="qr-card"><div class="qr">${qr}</div><div class="qr-t">Mon profil sur Oheve</div><div class="qr-s">Scannez pour voir toutes mes réalisations et me contacter</div></div>` : ''}
    </div>
    <div class="contact-end">
      <div class="brand big-brand">OHEVE</div>
      <div class="tagline">L'application des fêtes juives · ohevewedding.com</div>
    </div>
  </section>`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=${W}">
<style>
${fontFace}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; background: #FAF7F0; color: #343630;
  font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.serif, h1, h2, h3, .about-name, .brand { font-family: 'OheveSerif', Georgia, 'Times New Roman', serif; }
.page { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #FAF7F0;
  page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
.clamp { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; }
.lbl { font-size: 8px; letter-spacing: 1.2px; text-transform: uppercase; color: #8E9085; }
.val { font-size: 11px; color: #343630; margin-top: 2px; overflow-wrap: anywhere; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.eyebrow { font-size: 9.5px; letter-spacing: 2.4px; text-transform: uppercase; color: rgba(255,255,255,.88);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.eyebrow.dark { color: #747E68; }
.ic { width: 16px; height: 16px; color: #929B83; flex-shrink: 0; margin-top: 1px; }
.rule { height: 1px; background: #DEDACD; }

/* Pied de page */
.foot { position: absolute; left: 44px; right: 44px; bottom: 22px; display: flex; align-items: center; gap: 12px;
  font-size: 8.5px; letter-spacing: .8px; color: #9A9A90; border-top: 1px solid #E4E0D4; padding-top: 10px; }
.foot .brand { font-size: 11px; letter-spacing: 3px; color: #747E68; }
.foot .fname { flex: 1; min-width: 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 1. Couverture */
.cover { background: #343630; }
/* Photos recadrées par calcul (voir coverImg) : jamais d'object-fit. */
.cimg { position: absolute; display: block; max-width: none; }
.cover-shade { position: absolute; inset: 0; background:
  linear-gradient(to bottom, rgba(20,20,18,.45) 0%, rgba(20,20,18,0) 22%, rgba(20,20,18,0) 45%, rgba(20,20,18,.82) 100%); }
.cover.nophoto { background: #929B83; }
.cover-frame { position: absolute; inset: 26px; border: 1px solid rgba(255,255,255,.55); }
.cover-frame::after { content: ''; position: absolute; inset: 6px; border: 1px solid rgba(255,255,255,.3); }
.cover-initial { position: absolute; left: 0; right: 0; top: 230px; text-align: center; font-family: 'OheveSerif', Georgia, serif;
  font-size: 170px; line-height: 1; color: rgba(255,255,255,.35); }
.cover-top { position: absolute; top: 40px; left: 48px; right: 48px; display: flex; justify-content: space-between;
  font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,.9); }
.cover-top span:first-child { font-family: 'OheveSerif', Georgia, serif; font-size: 14px; letter-spacing: 5px; }
.cover-text { position: absolute; left: 48px; right: 48px; bottom: 58px; color: #fff; }
.cover h1 { font-weight: 400; font-size: 46px; line-height: 1.08; margin-top: 12px; overflow-wrap: anywhere; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pill { display: inline-block; margin-top: 16px; font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase;
  padding: 6px 12px; border: 1px solid rgba(255,255,255,.7); border-radius: 30px; }

/* 2. Présentation */
.about { padding: 48px 44px 0; }
.about-head { display: flex; align-items: center; gap: 18px; margin-bottom: 22px; }
.avatar { position: relative; overflow: hidden; width: 84px; height: 84px; border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px #DEDACD; }
.avatar-ph { display: flex; align-items: center; justify-content: center; background: #929B83; color: #fff;
  font-family: 'OheveSerif', Georgia, serif; font-size: 36px; }
.about-id { min-width: 0; flex: 1; }
.about-name { font-size: 28px; line-height: 1.15; margin-top: 6px; overflow-wrap: anywhere; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.about-body { display: flex; gap: 26px; margin-top: 22px; }
.about-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.about h2 { font-weight: 400; font-size: 22px; color: #343630; margin-bottom: 12px; }
.desc { position: relative; flex: 1; min-height: 0; overflow: hidden; font-size: 11.5px; line-height: 1.75; color: #4A4C44;
  white-space: pre-line; overflow-wrap: anywhere; word-break: break-word; }
.desc.empty { color: #9A9A90; font-style: italic; }
.brief { width: 178px; flex-shrink: 0; background: #F1EEE5; border-radius: 6px; padding: 18px 16px; overflow: hidden; }
.brief h3 { font-weight: 400; font-size: 16px; margin-bottom: 12px; color: #343630; }
.fact { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid #E2DED2; }
.fact > div { min-width: 0; }
.ev-lbl { margin-top: 14px; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.chip { font-size: 9.5px; color: #5A6250; background: #fff; border: 1px solid #D3D6C8; border-radius: 20px; padding: 3px 9px; }
.preview { position: absolute; left: 44px; right: 44px; bottom: 64px; display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }

/* Tuiles photo */
.tile { position: relative; overflow: hidden; border-radius: 4px; background: #E8E4D8; min-height: 0; min-width: 0; }
.tile figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 10px 8px; color: #fff; font-size: 9.5px; line-height: 1.4;
  background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.62)); overflow-wrap: anywhere; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.play { position: absolute; left: 50%; top: 50%; width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 50%;
  background: rgba(0,0,0,.45); border: 1.5px solid rgba(255,255,255,.85); display: flex; align-items: center; justify-content: center; }
.play svg { width: 18px; height: 18px; margin-left: 2px; }

/* 3+. Portfolio */
.port { padding: 40px 44px 0; }
.port-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
.port h2 { font-weight: 400; font-size: 24px; }
.port-count { font-size: 9px; letter-spacing: 1.6px; color: #8E9085; }
.layout { height: 660px; display: grid; gap: 8px; }
.l-hero { grid-template-columns: 1fr 1fr; grid-template-rows: 3fr 2fr; }
.l-hero .t0 { grid-column: 1 / 3; }
.l-grid { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.l-side { grid-template-columns: 3fr 2fr; grid-template-rows: 1fr 1fr; }
.l-side .t0 { grid-row: 1 / 3; }
.l-two { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
.l-one { grid-template-columns: 1fr; grid-template-rows: 1fr; }

/* Dernière page : contact */
.contact { padding: 64px 52px 0; }
.contact.with-band { padding-top: 0; }
.band { position: relative; overflow: hidden; height: 230px; margin: 0 -52px 34px; }
.with-band .big { font-size: 30px; }
.with-band .contact-body { margin-top: 26px; }
.with-band .crow { padding: 9px 0; }
.with-band .qr svg { width: 120px; height: 120px; }
.big { font-weight: 400; font-size: 34px; line-height: 1.15; margin-top: 10px; max-width: 420px; }
.lead { font-size: 12px; line-height: 1.7; color: #5C5E55; margin-top: 14px; max-width: 400px; }
.contact-body { display: flex; gap: 30px; margin-top: 40px; align-items: flex-start; }
.clist { flex: 1; min-width: 0; max-height: 460px; overflow: hidden; }
.with-band .clist { max-height: 330px; }
.crow { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #E4E0D4; }
.crow > div { min-width: 0; flex: 1; }
.crow .val { font-size: 12.5px; }
.docs { margin-top: 22px; }
.doc { display: flex; gap: 8px; align-items: center; font-size: 11px; color: #4A4C44; margin-top: 8px; min-width: 0; }
.doc span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.qr-card { width: 170px; flex-shrink: 0; background: #fff; border: 1px solid #E4E0D4; border-radius: 8px; padding: 16px; text-align: center; }
.qr svg { width: 138px; height: 138px; display: block; margin: 0 auto; }
.qr-t { font-family: 'OheveSerif', Georgia, serif; font-size: 14px; margin-top: 10px; }
.qr-s { font-size: 9px; line-height: 1.45; color: #8E9085; margin-top: 4px; }
.contact-end { position: absolute; left: 0; right: 0; bottom: 48px; text-align: center; }
.big-brand { font-size: 22px; letter-spacing: 8px; color: #747E68; }
.tagline { font-size: 9px; letter-spacing: 1.4px; color: #9A9A90; margin-top: 6px; }
</style></head><body>
${coverPage}
${aboutPage}
${portfolio}
${contactPage}
</body></html>`;
}
