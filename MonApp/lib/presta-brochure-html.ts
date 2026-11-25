/**
 * Brochure PDF du prestataire = son PROFIL tel qu'on le voit dans l'app, en
 * pages A4 (mise en page pure, sans React Native : testable hors app) :
 *   1. Profil : bannière (photo de couverture), photo de profil ronde, nom,
 *      chiffres, bio, coordonnées, puis début de la grille du portfolio
 *   (2. À propos complet, seulement si la bio est trop longue pour la page 1)
 *   3+ Suite de la grille : TOUTES les photos et vidéos, 3 colonnes carrées
 *   n. Contact : bandeau photo, coordonnées, documents
 * Les images arrivent déjà en data URI (voir presta-fiche-pdf.ts).
 *
 * Impression : le moteur WebKit d'iOS met en page sur 1,25 × la largeur du
 * papier puis réduit (×0,8) ; Chromium/Android compte 96 px pour 72 pt (×0,75).
 * `printZoom` compense pour que la page 595 × 842 remplisse exactement l'A4.
 */
import { eventConfig } from '@/lib/event-type';
import { categoryLabel } from '@/lib/presta-categories';

export type BrochureMedia = { src?: string | null; caption?: string | null; video?: boolean };

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
  /** Tout le portfolio, dans l'ordre de la grille du profil. */
  media: BrochureMedia[];
  documents?: string[];
  fonts?: { regular?: string | null; semibold?: string | null };
  /** Facteur d'impression (iOS 1,25 ; Android 4/3). 1 = aperçu écran. */
  printZoom?: number;
};

const W = 595;
// Un poil sous 842 : l'arrondi du zoom ne doit jamais créer de page blanche.
const H = 841.5;

export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const t = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

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

// ── Géométrie (px, repère 595 × 842) : doit suivre le CSS plus bas ─────────
const MX = 44;                 // marge latérale
const CW = W - 2 * MX;         // 507
const GAP = 3;                 // espace entre les carrés (façon Instagram)
const SQ = (CW - 2 * GAP) / 3; // côté d'un carré ≈ 167
const FOOT_TOP = 778;          // tout contenu doit finir au-dessus du pied
const CONT_GRID_TOP = 96;      // pages « suite » : début de la grille
const CONT_ROWS = Math.floor((FOOT_TOP - CONT_GRID_TOP + GAP) / (SQ + GAP)); // 4

const EXTRA_ICON: Record<string, string> = {
  grid: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>',
  check: '<path d="m5 12.5 4.2 4L19 7"/>',
};
Object.assign(ICON, EXTRA_ICON);

/** Texte saisi lettre par lettre (« A V E N U E ») : on recolle les lettres. */
export function unspace(s: string): string {
  const v = s.trim();
  return /^(\S ){4,}\S$/.test(v) ? v.replace(/ /g, '') : v;
}

function square(m: BrochureMedia): string {
  return `<div class="sq${m.src ? '' : ' sq-empty'}">
    ${m.src ? coverImg(m.src, { w: SQ, h: SQ }) : ''}
    ${m.video ? '<span class="reel"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff"/></svg></span>' : ''}
  </div>`;
}

const gridHtml = (items: BrochureMedia[]) => `<div class="grid">${items.map(square).join('')}</div>`;

export function buildBrochureHtml(d: BrochureData): string {
  const name = t(d.name) || 'Mon entreprise';
  const cat = d.category ? categoryLabel(d.category) : '';
  const city = unspace(t(d.city));
  const desc = t(d.description);
  const insta = instaHandle(d.instagram);
  const website = t(d.website).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const phone = t(d.phone) === '-' ? '' : t(d.phone);
  const email = t(d.email) === '-' ? '' : t(d.email);
  const events = (d.eventTypes ?? []).filter(Boolean).map((e) => eventConfig(e).label);
  const initial = esc(name.charAt(0).toUpperCase());
  const media = d.media;
  const nVideos = media.filter((m) => m.video).length;
  const nPhotos = media.length - nVideos;

  // ── Page 1 : hauteur du haut de profil (estimation prudente) ────────────
  const nameLines = name.length > 30 ? 2 : 1;
  const descLines = desc ? desc.split(/\n/).reduce((n, p) => n + Math.max(1, Math.ceil(p.length / 84)), 0) : 1;
  const BIO_MAX = 6;
  const bioLines = Math.min(descLines, BIO_MAX);
  const longBio = descLines > BIO_MAX;
  const contacts = [
    phone && ['phone', phone],
    email && ['mail', email],
    website && website !== '-' && ['globe', website],
    insta && ['insta', `@${insta}`],
    t(d.price) && ['tag', t(d.price)],
  ].filter(Boolean) as [string, string][];
  const contactRows = Math.ceil(contacts.length / 2);
  const BANNER = 190;
  const headerH0 =
    BANNER + 64 /* rangée photo + chiffres */ + 12 +
    nameLines * 34 + 20 /* catégorie · ville */ + (d.isPartner ? 30 : 0) + 12 +
    bioLines * 18.5 + (longBio ? 18 : 0) + 12 +
    (events.length ? 30 : 0) +
    contactRows * 36 + 10 +
    40 /* onglet Portfolio */;
  const rows1 = Math.max(0, Math.floor((FOOT_TOP - Math.ceil(headerH0) + GAP) / (SQ + GAP)));
  // La place qui reste sous la dernière rangée agrandit la bannière (pas de
  // grand blanc en bas de page 1).
  const slack = FOOT_TOP - 10 - Math.ceil(headerH0) - (rows1 ? rows1 * (SQ + GAP) - GAP : 30);
  const bannerH = BANNER + Math.max(0, Math.min(slack, 150));
  const gridTop1 = Math.ceil(headerH0) + (bannerH - BANNER);
  const first = media.slice(0, rows1 * 3);
  const restMedia = media.slice(first.length);
  const contPages: BrochureMedia[][] = [];
  for (let i = 0; i < restMedia.length; i += CONT_ROWS * 3) contPages.push(restMedia.slice(i, i + CONT_ROWS * 3));

  const total = 1 + (longBio ? 1 : 0) + contPages.length + 1;
  let pageNo = 0;
  const footer = () => {
    pageNo++;
    return `<div class="foot"><span class="brand">OHEVE</span><span class="fname">${esc(name)}</span><span class="pnum">${pad2(pageNo)} / ${pad2(total)}</span></div>`;
  };
  const tabBar = (label: string) => `<div class="tabs"><span class="tab on">${icon('grid')}<b>${label}</b></span></div>`;

  // ── Page 1 : le profil ──────────────────────────────────────────────────
  const profilePage = `<section class="page profile">
    <div class="banner${d.cover ? '' : ' banner-ph'}" style="height:${bannerH.toFixed(1)}px">
      ${d.cover ? coverImg(d.cover, { w: W, h: bannerH }) : ''}
      <div class="banner-shade"></div>
      <div class="banner-top"><span class="wm">OHEVE</span><span>Profil prestataire</span></div>
    </div>
    <div class="idrow">
      <div class="avatar">${d.avatar ? coverImg(d.avatar, { w: 104, h: 104 }) : `<span>${initial}</span>`}</div>
      <div class="stats">
        <div class="stat"><b>${media.length}</b><span>publication${media.length > 1 ? 's' : ''}</span></div>
        <div class="stat"><b>${nPhotos}</b><span>photo${nPhotos > 1 ? 's' : ''}</span></div>
        ${nVideos || !events.length
          ? `<div class="stat"><b>${nVideos}</b><span>vidéo${nVideos > 1 ? 's' : ''}</span></div>`
          : `<div class="stat"><b>${events.length}</b><span>type${events.length > 1 ? 's' : ''} d'événement</span></div>`}
      </div>
    </div>
    <div class="who">
      <h1>${esc(name)}</h1>
      <div class="sub">${esc([cat, city].filter(Boolean).join(' · ') || 'Prestataire')}</div>
      ${d.isPartner ? `<div class="badge">${icon('check')}Partenaire Oheve</div>` : ''}
    </div>
    <div class="bio${desc ? '' : ' empty'}" style="-webkit-line-clamp:${BIO_MAX}">${desc ? esc(desc) : 'Description à venir.'}</div>
    ${longBio ? '<div class="more">Suite de la présentation page 02</div>' : ''}
    ${events.length ? `<div class="chips">${events.map((e) => `<span class="chip">${esc(e)}</span>`).join('')}</div>` : ''}
    ${contacts.length ? `<div class="contacts">${contacts.map(([k, v]) => `<div class="cbtn">${icon(k)}<span>${esc(v)}</span></div>`).join('')}</div>` : ''}
    ${first.length || !media.length ? `<div class="grid-wrap" style="top:${gridTop1 - 40}px">
      ${tabBar('Portfolio')}
      ${first.length ? gridHtml(first) : '<div class="nogrid">Aucune publication pour le moment.</div>'}
    </div>` : ''}
    ${footer()}
  </section>`;

  // ── Page 2 (si besoin) : présentation complète ─────────────────────────
  const aboutPage = longBio ? `<section class="page about">
    <div class="eyebrow">Présentation</div>
    <h2>À propos de ${esc(name)}</h2>
    <div class="about-text">${esc(desc)}</div>
    ${footer()}
  </section>` : '';

  // ── Pages suivantes : la grille continue ───────────────────────────────
  const grids = contPages.map((items, i) => `<section class="page cont">
    <div class="cont-head">
      <div class="mini-avatar">${d.avatar ? coverImg(d.avatar, { w: 34, h: 34 }) : `<span>${initial}</span>`}</div>
      <div class="cont-id"><b>${esc(name)}</b><span>Portfolio · suite ${i + 1}/${contPages.length}</span></div>
    </div>
    <div class="grid-wrap" style="top:${CONT_GRID_TOP - 40}px">${tabBar('Portfolio')}${gridHtml(items)}</div>
    ${footer()}
  </section>`).join('');

  // ── Dernière page : contact ────────────────────────────────────────────
  const rows = [
    phone && ['phone', 'Téléphone', phone],
    email && ['mail', 'Email', email],
    website && website !== '-' && ['globe', 'Site web', website],
    insta && ['insta', 'Instagram', `@${insta}`],
    city && ['pin', 'Adresse', city],
  ].filter(Boolean) as [string, string, string][];
  const bandSrc = [...media].reverse().find((m) => m.src && !m.video)?.src ?? d.cover;
  const listRoom = bandSrc ? 330 : 460;
  const docs = (d.documents ?? []).slice(0, Math.max(0, Math.floor((listRoom - rows.length * (bandSrc ? 48 : 52) - 34) / 26)));

  const contactPage = `<section class="page contact${bandSrc ? ' with-band' : ''}">
    ${bandSrc ? `<div class="band">${coverImg(bandSrc, { w: W, h: 230 })}</div>` : ''}
    <div class="eyebrow">Contact</div>
    <h2 class="big">Parlons de votre événement</h2>
    <p class="lead">Nous serions ravis d'échanger avec vous sur votre projet et de vous proposer une offre sur mesure.</p>
    <div class="contact-body">
      <div class="clist">
        ${rows.length ? rows.map(([k, l, v]) => `<div class="crow">${icon(k)}<div><div class="lbl">${esc(l)}</div><div class="val">${esc(v)}</div></div></div>`).join('') : '<div class="bio empty">Coordonnées à venir.</div>'}
        ${docs.length ? `<div class="docs"><div class="lbl">Documents disponibles sur mon profil</div>${docs.map((x) => `<div class="doc">${icon('doc')}<span>${esc(x)}</span></div>`).join('')}</div>` : ''}
      </div>
    </div>
    <div class="contact-end"><div class="brand big-brand">OHEVE</div><div class="tagline">L'application des fêtes juives · ohevewedding.com</div></div>
  </section>`;
  pageNo++;

  const fontFace = [
    d.fonts?.regular && `@font-face{font-family:'OheveSerif';font-weight:400;src:url(${d.fonts.regular}) format('truetype');}`,
    d.fonts?.semibold && `@font-face{font-family:'OheveSerif';font-weight:600;src:url(${d.fonts.semibold}) format('truetype');}`,
  ].filter(Boolean).join('\n');
  const zoom = d.printZoom && d.printZoom !== 1 ? `html { zoom: ${d.printZoom}; }` : '';

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<style>
${fontFace}
@page { size: A4; margin: 0; }
${zoom}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #FAF7F0; color: #343630;
  font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { width: ${W}px; }
h1, h2, .brand, .serif { font-family: 'OheveSerif', Georgia, 'Times New Roman', serif; font-weight: 400; }
.page { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #FAF7F0;
  page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
.cimg { position: absolute; display: block; max-width: none; }
.ic { width: 15px; height: 15px; color: #929B83; flex-shrink: 0; }
.lbl { font-size: 8px; letter-spacing: 1.2px; text-transform: uppercase; color: #8E9085; }
.val { font-size: 12px; color: #343630; margin-top: 2px; overflow-wrap: anywhere; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.eyebrow { font-size: 9.5px; letter-spacing: 2.4px; text-transform: uppercase; color: #747E68; }

.foot { position: absolute; left: ${MX}px; right: ${MX}px; bottom: 22px; display: flex; align-items: center; gap: 12px;
  font-size: 8.5px; letter-spacing: .8px; color: #9A9A90; border-top: 1px solid #E4E0D4; padding-top: 10px; background: #FAF7F0; }
.foot .brand { font-size: 11px; letter-spacing: 3px; color: #747E68; }
.foot .fname { flex: 1; min-width: 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Page 1 — profil */
.banner { position: relative; height: 190px; overflow: hidden; background: #343630; }
.banner-ph { background: #929B83; }
.banner-shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(20,20,18,.5), rgba(20,20,18,0) 45%); }
.banner-top { position: absolute; top: 24px; left: ${MX}px; right: ${MX}px; display: flex; justify-content: space-between; align-items: center;
  font-size: 8.5px; letter-spacing: 2.6px; text-transform: uppercase; color: rgba(255,255,255,.92); }
.banner-top .wm { font-family: 'OheveSerif', Georgia, serif; font-size: 14px; letter-spacing: 5px; }
.idrow { position: relative; height: 64px; padding: 0 ${MX}px; display: flex; align-items: flex-end; gap: 26px; }
.avatar { position: absolute; left: ${MX - 4}px; top: -52px; width: 112px; height: 112px; border-radius: 50%; overflow: hidden;
  background: #929B83; border: 4px solid #FAF7F0; display: flex; align-items: center; justify-content: center; }
.avatar span { font-family: 'OheveSerif', Georgia, serif; font-size: 46px; color: #fff; }
.stats { margin-left: 136px; flex: 1; display: flex; justify-content: space-around; padding-bottom: 6px; }
.stat { text-align: center; }
.stat b { display: block; font-size: 19px; font-weight: 600; color: #343630; }
.stat span { font-size: 10px; color: #7A7C72; }
.who { padding: 12px ${MX}px 0; }
.who h1 { font-size: 28px; line-height: 1.2; font-weight: 600; overflow-wrap: anywhere; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sub { font-size: 11.5px; color: #747E68; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase;
  color: #fff; background: #747E68; border-radius: 20px; padding: 4px 10px 4px 7px; }
.badge .ic { width: 12px; height: 12px; color: #fff; }
.bio { margin: 12px ${MX}px 0; font-size: 11.5px; line-height: 1.6; color: #4A4C44; white-space: pre-line;
  overflow-wrap: anywhere; word-break: break-word; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
.bio.empty { color: #9A9A90; font-style: italic; }
.more { margin: 4px ${MX}px 0; font-size: 9.5px; color: #747E68; font-style: italic; }
.chips { margin: 10px ${MX}px 0; display: flex; flex-wrap: nowrap; gap: 5px; overflow: hidden; height: 20px; }
.chip { font-size: 9.5px; color: #5A6250; background: #fff; border: 1px solid #D3D6C8; border-radius: 20px; padding: 3px 9px; white-space: nowrap; }
.contacts { margin: 12px ${MX}px 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.cbtn { display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 10px; background: #fff; border: 1px solid #E2DED2; border-radius: 8px;
  font-size: 10.5px; color: #343630; min-width: 0; }
.cbtn span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.grid-wrap { position: absolute; left: ${MX}px; right: ${MX}px; }
.tabs { height: 40px; display: flex; justify-content: center; border-top: 1px solid #E2DED2; }
.tab { display: flex; align-items: center; gap: 7px; padding: 0 18px; margin-top: -1px; border-top: 1.5px solid #343630;
  font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: #343630; }
.tab b { font-weight: 600; }
.tab .ic { color: #343630; width: 13px; height: 13px; }
.grid { display: grid; grid-template-columns: repeat(3, ${SQ.toFixed(3)}px); grid-auto-rows: ${SQ.toFixed(3)}px; gap: ${GAP}px; }
.sq { position: relative; overflow: hidden; background: #E8E4D8; }
.sq-empty { background: #343630; }
.reel { position: absolute; top: 7px; right: 7px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center; }
.sq-empty .reel { top: 50%; left: 50%; right: auto; width: 40px; height: 40px; margin: -20px 0 0 -20px; }
.reel svg { width: 12px; height: 12px; margin-left: 1px; }
.sq-empty .reel svg { width: 18px; height: 18px; }
.nogrid { padding: 30px 0; text-align: center; font-size: 11px; color: #9A9A90; font-style: italic; }

/* Page À propos */
.about { padding: 56px ${MX}px 0; }
.about h2 { font-size: 30px; line-height: 1.2; margin: 10px 0 22px; overflow-wrap: anywhere; word-break: break-word;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.about-text { font-size: 12px; line-height: 1.75; color: #4A4C44; white-space: pre-line; overflow-wrap: anywhere; word-break: break-word;
  max-height: 560px; overflow: hidden; }

/* Pages suite */
.cont-head { position: absolute; top: 30px; left: ${MX}px; right: ${MX}px; display: flex; align-items: center; gap: 10px; }
.mini-avatar { position: relative; width: 34px; height: 34px; border-radius: 50%; overflow: hidden; background: #929B83; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; }
.mini-avatar span { color: #fff; font-family: 'OheveSerif', Georgia, serif; font-size: 16px; }
.cont-id { min-width: 0; }
.cont-id b { display: block; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cont-id span { font-size: 9.5px; color: #8E9085; }

/* Contact */
.contact { padding: 64px 52px 0; }
.contact.with-band { padding-top: 0; }
.band { position: relative; overflow: hidden; height: 230px; margin: 0 -52px 30px; }
.big { font-size: 32px; line-height: 1.15; margin-top: 10px; }
.lead { font-size: 12px; line-height: 1.7; color: #5C5E55; margin-top: 12px; max-width: 400px; }
.contact-body { display: flex; gap: 30px; margin-top: 28px; align-items: flex-start; }
.clist { flex: 1; min-width: 0; max-height: 460px; overflow: hidden; }
.with-band .clist { max-height: 330px; }
.crow { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #E4E0D4; }
.crow > div { min-width: 0; flex: 1; }
.docs { margin-top: 18px; }
.doc { display: flex; gap: 8px; align-items: center; font-size: 11px; color: #4A4C44; margin-top: 8px; min-width: 0; }
.doc span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.contact-end { position: absolute; left: 0; right: 0; bottom: 44px; text-align: center; }
.big-brand { font-size: 22px; letter-spacing: 8px; color: #747E68; }
.tagline { font-size: 9px; letter-spacing: 1.4px; color: #9A9A90; margin-top: 6px; }
</style></head><body>
${profilePage}
${aboutPage}
${grids}
${contactPage}
</body></html>`;
}
