/**
 * Export PDF de la fiche prestataire, depuis son propre compte : une page A4
 * (couverture, coordonnées, description, tarifs, photos) prête à envoyer à un
 * client ou à imprimer. Tout est construit côté app (expo-print), sans appel
 * serveur supplémentaire.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { categoryLabel } from '@/lib/presta-categories';

export type FicheProfile = {
  business_name?: string | null;
  category?: string | null;
  description?: string | null;
  location_city?: string | null;
  city?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  price_range?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  website?: string | null;
  instagram_url?: string | null;
  instagram?: string | null;
  cover_url?: string | null;
  avatar_url?: string | null;
};

export type FichePhoto = { url: string; is_cover?: boolean; media_type?: 'image' | 'video' };

const A4_PAGE = { width: 595, height: 842, margins: { left: 0, top: 0, right: 0, bottom: 0 } };
const MAX_PHOTOS = 6;

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : s == null ? '' : String(s).trim());

export function formatPrice(p: FicheProfile): string {
  const range = clean(p.price_range);
  if (range) return range;
  const min = Number(p.price_min) || 0;
  const max = Number(p.price_max) || 0;
  if (min && max) return `${min} – ${max} €`;
  if (min) return `À partir de ${min} €`;
  return 'Sur devis';
}

function instagramHandle(p: FicheProfile): string {
  const raw = clean(p.instagram_url) || clean(p.instagram);
  if (!raw) return '';
  return raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '');
}

// expo-print n'attend pas toujours les images distantes : on les intègre en
// data URI. Une image qui ne se télécharge pas est simplement omise.
async function toDataUri(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function buildFicheHtml(p: FicheProfile, cover: string | null, gallery: string[]): string {
  const name = clean(p.business_name) || 'Mon entreprise';
  const cat = p.category ? categoryLabel(p.category) : '';
  const city = clean(p.location_city) || clean(p.city);
  const desc = clean(p.description);
  const phone = clean(p.phone);
  const email = clean(p.email);
  const site = clean(p.website_url) || clean(p.website);
  const insta = instagramHandle(p);
  const initial = esc(name.charAt(0).toUpperCase());

  const contacts = [
    phone && ['Téléphone', phone],
    email && ['Email', email],
    site && ['Site web', site.replace(/^https?:\/\//, '')],
    insta && ['Instagram', `@${insta}`],
    ['Tarifs', formatPrice(p)],
  ].filter(Boolean) as [string, string][];

  const cols = gallery.length <= 2 ? gallery.length || 1 : 3;
  const rows = Math.max(1, Math.ceil(gallery.length / cols));

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=595">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 595px; background: #FAF7F0; color: #343630;
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 595px; height: 842px; overflow: hidden; display: flex; flex-direction: column; }
  .hero { position: relative; height: 230px; background: #929B83; overflow: hidden; flex-shrink: 0; }
  .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hero .shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,.45)); }
  .hero .ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: Georgia, 'Times New Roman', serif; font-size: 96px; color: rgba(255,255,255,.55); }
  .head { padding: 22px 36px 0; }
  .cat { display: inline-block; font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase;
    color: #747E68; border: 1px solid #929B83; border-radius: 20px; padding: 4px 10px; margin-bottom: 10px; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 30px; line-height: 1.15;
    color: #343630; overflow-wrap: anywhere; word-break: break-word;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .city { margin-top: 6px; font-size: 12px; color: #747E68; overflow-wrap: anywhere; word-break: break-word;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .rule { height: 1px; background: #D9D6CA; margin: 16px 36px 0; }
  .body { display: flex; gap: 26px; padding: 16px 36px 0; }
  .desc { flex: 1; min-width: 0; font-size: 11.5px; line-height: 1.6; color: #4A4C44; white-space: pre-line;
    overflow-wrap: anywhere; word-break: break-word; max-height: 220px; overflow: hidden; }
  .desc.empty { color: #9A9A90; font-style: italic; }
  .side { width: 190px; flex-shrink: 0; }
  .side h2, .photos h2 { font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: #747E68; margin-bottom: 8px; font-weight: 600; }
  .row { padding: 6px 0; border-bottom: 1px solid #E6E3D8; }
  .row:last-child { border-bottom: 0; }
  .lbl { font-size: 8.5px; color: #9A9A90; text-transform: uppercase; letter-spacing: .8px; }
  .val { font-size: 11px; color: #343630; margin-top: 2px; overflow-wrap: anywhere; word-break: break-word;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .photos { padding: 18px 36px 0; flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); grid-template-rows: repeat(${rows}, minmax(0, 1fr)); gap: 6px; overflow: hidden; }
  .grid img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; display: block; min-height: 0; }
  .foot { flex-shrink: 0; padding: 14px 36px 20px; display: flex; justify-content: space-between; align-items: center;
    font-size: 9px; color: #9A9A90; letter-spacing: .6px; }
  .brand { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #747E68; letter-spacing: 2px; }
</style></head><body><div class="page">
  <div class="hero">
    ${cover ? `<img src="${cover}" alt=""><div class="shade"></div>` : `<div class="ph">${initial}</div>`}
  </div>
  <div class="head">
    ${cat ? `<div class="cat">${esc(cat)}</div>` : ''}
    <h1>${esc(name)}</h1>
    ${city ? `<div class="city">${esc(city)}</div>` : ''}
  </div>
  <div class="rule"></div>
  <div class="body">
    <div class="desc${desc ? '' : ' empty'}">${desc ? esc(desc) : 'Aucune description pour le moment.'}</div>
    <div class="side">
      <h2>Coordonnées</h2>
      ${contacts.map(([l, v]) => `<div class="row"><div class="lbl">${esc(l)}</div><div class="val">${esc(v)}</div></div>`).join('')}
    </div>
  </div>
  ${gallery.length ? `<div class="photos"><h2>Réalisations</h2><div class="grid">${gallery.map((g) => `<img src="${g}" alt="">`).join('')}</div></div>` : '<div style="flex:1"></div>'}
  <div class="foot"><span class="brand">OHEVE</span><span>Fiche prestataire · ohevewedding.com</span></div>
</div></body></html>`;
}

/** Prépare les images puis renvoie le HTML complet de la fiche. */
export async function prepareFicheHtml(p: FicheProfile, photos: FichePhoto[]): Promise<string> {
  const images = photos.filter((ph) => ph.url && (ph.media_type ?? 'image') === 'image');
  const coverUrl = images.find((ph) => ph.is_cover)?.url || clean(p.cover_url) || images[0]?.url || clean(p.avatar_url);
  const galleryUrls = images.map((ph) => ph.url).filter((u) => u !== coverUrl).slice(0, MAX_PHOTOS);
  const [cover, ...gallery] = await Promise.all([coverUrl ? toDataUri(coverUrl) : Promise.resolve(null), ...galleryUrls.map(toDataUri)]);
  return buildFicheHtml(p, cover, gallery.filter((g): g is string => !!g));
}

/** Génère le PDF et ouvre la feuille de partage (Mail, WhatsApp, Fichiers…). */
export async function exportFichePdf(p: FicheProfile, photos: FichePhoto[]): Promise<void> {
  const html = await prepareFicheHtml(p, photos);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false, ...A4_PAGE });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exporter ma fiche', UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}
