import fs from 'fs';
import path from 'path';
import sharp, { type OverlayOptions, type Sharp } from 'sharp';
import type { Request, Response } from 'express';
import { weddingSitesRepo } from './weddingSites.repository';

/**
 * Aperçu de lien (WhatsApp, iMessage, Messenger…) d'un site de mariage.
 *
 * Quand les mariés envoient le lien de leur site, l'aperçu doit montrer LEUR
 * mariage (prénoms, date, lieu, photo) — pas le logo Oheve. Les robots
 * d'aperçu ne lisent pas le JavaScript : la Pages Function du guest-site
 * appelle `/share-preview` puis réécrit les balises og:* du HTML, et l'image
 * og:image pointe vers `/og-image.jpg` qui génère une carte 1200×630 aux
 * couleurs du site.
 *
 * Le site étant privé, les deux routes exigent la même clé que la page
 * (?k=<access_key> ou un token d'invitation) : on ne divulgue rien à qui
 * devine un slug.
 */

type SiteRow = NonNullable<Awaited<ReturnType<typeof weddingSitesRepo.findBySlug>>>;

const FONT_DIR = path.resolve(__dirname, '../../assets/fonts');
const SCRIPT_FONT = path.join(FONT_DIR, 'GreatVibes-Regular.ttf');
const SERIF_FONT = path.join(FONT_DIR, 'CormorantGaramond.ttf');

const W = 1200;
const H = 630;

function hasValidKey(row: SiteRow, key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  if (row.access_key && k === row.access_key) return true;
  const tokens = Array.isArray(row.invite_links)
    ? (row.invite_links as { token?: unknown }[]).map((l) => String(l?.token ?? '').trim()).filter(Boolean)
    : [];
  return tokens.includes(k);
}

/** Charge le site si la clé est valide et le site publié (premium), sinon null. */
async function loadAccessibleSite(req: Request): Promise<SiteRow | null> {
  const slug = String(req.params.slug ?? '').trim().toLowerCase();
  if (!slug) return null;
  const row = await weddingSitesRepo.findBySlug(slug);
  if (!row) return null;
  if (!hasValidKey(row, String(req.query.k ?? ''))) return null;
  if (!(await weddingSitesRepo.isOwnerPremium(row))) return null;
  return row;
}

type Lang = 'fr' | 'en' | 'he';

function langOf(row: SiteRow): Lang {
  const l = String(row.language ?? 'fr');
  return l === 'en' || l === 'he' ? l : 'fr';
}

export function coupleLabel(row: SiteRow): string {
  const names = [row.bride_name, row.groom_name].map((n) => String(n ?? '').trim()).filter(Boolean);
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return String(row.couple_name ?? '').trim() || names[0] || 'Mariage';
}

function formatDate(row: SiteRow, lang: Lang): string {
  const raw = String(row.date ?? '').trim();
  if (!raw) return '';
  // On ne garde que la partie date (YYYY-MM-DD) : pas de décalage de fuseau
  // qui ferait afficher la veille sur le serveur (UTC).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const locale = lang === 'fr' ? 'fr-FR' : lang === 'he' ? 'he-IL' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

function placeLabel(row: SiteRow): string {
  const venue = String(row.venue ?? '').trim();
  const city = String(row.city ?? '').trim();
  if (venue && city && !venue.toLowerCase().includes(city.toLowerCase())) return `${venue}, ${city}`;
  return venue || city;
}

const TEXTS: Record<Lang, { title: (c: string) => string; desc: (c: string) => string; kicker: string }> = {
  fr: {
    title: (c) => `${c} — Invitation`,
    desc: (c) => `Vous êtes invités au mariage de ${c}.`,
    kicker: 'NOUS NOUS MARIONS',
  },
  en: {
    title: (c) => `${c} — Invitation`,
    desc: (c) => `You are invited to the wedding of ${c}.`,
    kicker: 'WE ARE GETTING MARRIED',
  },
  he: {
    title: (c) => `${c} — הזמנה`,
    desc: (c) => `הנכם מוזמנים לחתונה של ${c}.`,
    kicker: 'אנחנו מתחתנים',
  },
};

function siteHeroImage(row: SiteRow): string {
  const content = (row.content ?? {}) as Record<string, unknown>;
  const hero = typeof content.heroImageUrl === 'string' ? content.heroImageUrl.trim() : '';
  if (hero) return hero;
  const gallery = Array.isArray(content.galleryPhotos) ? content.galleryPhotos : [];
  const first = gallery.find((p): p is string => typeof p === 'string' && !!p.trim());
  return first?.trim() ?? '';
}

// ── Métadonnées (lues par la Pages Function) ────────────────────────────────

export async function getSharePreview(req: Request, res: Response): Promise<void> {
  try {
    const row = await loadAccessibleSite(req);
    if (!row) { res.status(404).json({ success: false }); return; }
    const lang = langOf(row);
    const couple = coupleLabel(row);
    const details = [formatDate(row, lang), placeLabel(row)].filter(Boolean).join(' · ');
    const t = TEXTS[lang];
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: {
        title: t.title(couple),
        description: [t.desc(couple), details].filter(Boolean).join(' '),
        lang,
        // Version = date de mise à jour : WhatsApp recharge l'image si le site change
        version: new Date(row.updated_at ?? Date.now()).getTime().toString(36),
      },
    });
  } catch (err) {
    console.error('getSharePreview:', err);
    res.status(500).json({ success: false });
  }
}

// ── Image og:image 1200×630 ─────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hexOr(value: unknown, fallback: string): string {
  const v = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : /^#[0-9a-f]{3}$/i.test(v) ? `#${[...v.slice(1)].map((c) => c + c).join('')}` : fallback;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Rend un texte Pango avec une police embarquée → tampon PNG transparent. */
async function textLayer(markup: string, fontfile: string, font: string, width: number, dpi: number) {
  const { data, info } = await sharp({
    text: { text: markup, font, fontfile, width, dpi, align: 'centre', rgba: true, wrap: 'word' },
  }).png().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Charge la photo du site : depuis le disque si elle est servie par /uploads, sinon par HTTP. */
async function loadPhoto(url: string): Promise<Buffer | null> {
  try {
    const m = /\/uploads\/([^?#]+)/.exec(url);
    if (m) {
      const local = path.join(process.cwd(), 'uploads', path.normalize(decodeURIComponent(m[1])).replace(/^(\.\.[/\\])+/, ''));
      if (fs.existsSync(local)) return fs.readFileSync(local);
    }
    if (!/^https?:\/\//.test(url)) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function renderShareImage(row: SiteRow): Promise<Buffer> {
  const lang = langOf(row);
  const theme = (row.theme ?? {}) as Record<string, unknown>;
  const bg = hexOr(theme.backgroundColor, '#F6F2EA');
  const darkBg = luminance(bg) < 0.45;
  const text = hexOr(theme.textColor, darkBg ? '#F6F2EA' : '#3D3229');
  const accent = hexOr(theme.primaryColor, '#8F947F');

  const photoUrl = siteHeroImage(row);
  const photo = photoUrl ? await loadPhoto(photoUrl) : null;

  // Avec photo : photo plein cadre + voile sombre en bas, texte blanc.
  // Sans photo : carte aux couleurs du site, cadre fin et prénoms calligraphiés.
  const onPhoto = !!photo;
  const ink = onPhoto ? '#FFFFFF' : text;
  const soft = onPhoto ? '#F3EEE6' : accent;

  const couple = coupleLabel(row);
  const date = formatDate(row, lang);
  const place = placeLabel(row);

  const kicker = await textLayer(
    `<span foreground="${soft}" letter_spacing="${4 * 1024}">${esc(TEXTS[lang].kicker)}</span>`,
    SERIF_FONT, 'Cormorant Garamond SemiBold', 1000, 150,
  );
  // Prénoms les plus grands possible (l'aperçu WhatsApp est souvent réduit),
  // taille adaptée à leur longueur pour tenir sur une ligne.
  const nameDpi = Math.round(Math.min(800, Math.max(380, 15500 / Math.max(couple.length, 1))));
  const names = await textLayer(`<span foreground="${ink}">${esc(couple)}</span>`, SCRIPT_FONT, 'Great Vibes', 1100, nameDpi);
  const detailsMarkup = [date, place].filter(Boolean).map((s) => esc(s)).join('\n');
  const details = detailsMarkup
    ? await textLayer(`<span foreground="${ink}">${detailsMarkup}</span>`, SERIF_FONT, 'Cormorant Garamond SemiBold', 1080, 230)
    : null;

  const gap = 14;
  const blockH = kicker.height + gap + names.height + (details ? gap + details.height : 0);
  let y = onPhoto ? H - 48 - blockH : Math.round((H - blockH) / 2);
  const layers: OverlayOptions[] = [];
  const stack = (l: { data: Buffer; width: number; height: number }) => {
    layers.push({ input: l.data, left: Math.round((W - l.width) / 2), top: Math.max(0, y) });
    y += l.height + gap;
  };

  let base: Sharp;
  if (photo) {
    const shade = Buffer.from(
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.3" stop-color="#000" stop-opacity="0.1"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.75"/></linearGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#g)"/></svg>`,
    );
    const photoBuf = await sharp(photo).rotate().resize(W, H, { fit: 'cover', position: 'attention' }).toBuffer();
    base = sharp(photoBuf);
    layers.push({ input: shade, left: 0, top: 0 });
  } else {
    const frame = Buffer.from(
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="2"/>
        <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="1"/>
      </svg>`,
    );
    base = sharp({ create: { width: W, height: H, channels: 3, background: bg } });
    layers.push({ input: frame, left: 0, top: 0 });
  }

  stack(kicker);
  stack(names);
  if (details) stack(details);

  return base.composite(layers).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

// Petit cache mémoire : WhatsApp & co. demandent l'image plusieurs fois.
const imageCache = new Map<string, Buffer>();
const CACHE_MAX = 40;

export async function getShareImage(req: Request, res: Response): Promise<void> {
  try {
    const row = await loadAccessibleSite(req);
    if (!row) { res.status(404).end(); return; }
    const cacheKey = `${row.id}:${new Date(row.updated_at ?? 0).getTime()}`;
    let img = imageCache.get(cacheKey);
    if (!img) {
      img = await renderShareImage(row);
      if (imageCache.size >= CACHE_MAX) imageCache.delete(imageCache.keys().next().value as string);
      imageCache.set(cacheKey, img);
    }
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(img);
  } catch (err) {
    console.error('getShareImage:', err);
    res.status(500).end();
  }
}
