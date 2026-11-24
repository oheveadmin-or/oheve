/**
 * Export PDF de la fiche prestataire depuis son propre compte : une vraie
 * brochure (couverture, présentation, tout le portfolio, contact + QR code).
 * Mise en page : presta-brochure-html.ts. Ici : on rassemble les données et on
 * intègre images, miniatures vidéo et polices en data URI (expo-print
 * n'attend pas toujours les ressources distantes), puis on partage le PDF.
 */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { buildBrochureHtml, type BrochureMedia } from '@/lib/presta-brochure-html';
import { prestatairesApi } from '@/services/auth/api';

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
  event_types?: string[] | null;
  is_partner?: boolean | null;
};

export type FichePhoto = { url: string; is_cover?: boolean; media_type?: 'image' | 'video'; caption?: string | null };

const A4_PAGE = { width: 595, height: 842, margins: { left: 0, top: 0, right: 0, bottom: 0 } };
/** Au-delà, le PDF devient lourd à générer et à envoyer par WhatsApp. */
const MAX_MEDIA = 30;
const PUBLIC_PROFILE = 'https://ohevewedding.com/prestataire/';

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

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/** Image distante → data URI (null si indisponible : elle est simplement omise). */
async function remoteToDataUri(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await blobToDataUri(await r.blob());
  } catch {
    return null;
  }
}

/** Fichier local (miniature, police) → data URI. */
async function localToDataUri(uri: string, mime: string): Promise<string | null> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

// Miniature d'une vidéo (module natif présent seulement sur les binaires récents).
let thumbSdk: typeof import('expo-video-thumbnails') | null = null;
try { thumbSdk = require('expo-video-thumbnails'); } catch { thumbSdk = null; }

async function videoThumb(url: string): Promise<string | null> {
  if (!thumbSdk) return null;
  try {
    const { uri } = await thumbSdk.getThumbnailAsync(url, { time: 800, quality: 0.7 });
    return await localToDataUri(uri, 'image/jpeg');
  } catch {
    return null;
  }
}

async function fontDataUri(mod: number): Promise<string | null> {
  try {
    const a = Asset.fromModule(mod);
    await a.downloadAsync();
    return a.localUri ? await localToDataUri(a.localUri, 'font/ttf') : null;
  } catch {
    return null;
  }
}

/** Exécute les tâches par petits lots (évite 30 téléchargements simultanés). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

export async function prepareFicheHtml(opts: {
  userId: number;
  accessToken?: string | null;
  profile: FicheProfile;
  photos: FichePhoto[];
}): Promise<string> {
  const { profile: p, photos, userId, accessToken } = opts;

  const images = photos.filter((ph) => ph.url && (ph.media_type ?? 'image') === 'image');
  const coverUrl = images.find((ph) => ph.is_cover)?.url || clean(p.cover_url) || images[0]?.url || '';
  const avatarUrl = clean(p.avatar_url) || coverUrl;
  const portfolio = photos.filter((ph) => ph.url && ph.url !== coverUrl).slice(0, MAX_MEDIA);

  const [cover, avatar, media, docsRes, regular, semibold] = await Promise.all([
    coverUrl ? remoteToDataUri(coverUrl) : Promise.resolve(null),
    avatarUrl ? (avatarUrl === coverUrl ? Promise.resolve('same') : remoteToDataUri(avatarUrl)) : Promise.resolve(null),
    mapLimit(portfolio, 4, async (ph): Promise<BrochureMedia | null> => {
      const video = ph.media_type === 'video';
      const src = video ? await videoThumb(ph.url) : await remoteToDataUri(ph.url);
      return src ? { src, caption: ph.caption, video } : null;
    }),
    prestatairesApi.listDocuments(userId, accessToken ?? undefined).catch(() => null),
    fontDataUri(require('@/assets/fonts/Fraunces-Regular.ttf')),
    fontDataUri(require('@/assets/fonts/Fraunces-SemiBold.ttf')),
  ]);

  const docs = (docsRes?.success && Array.isArray(docsRes.data) ? docsRes.data : [])
    .map((x: { title?: string }) => clean(x?.title)).filter(Boolean) as string[];

  return buildBrochureHtml({
    name: clean(p.business_name),
    category: p.category,
    city: clean(p.location_city) || clean(p.city),
    description: p.description,
    price: formatPrice(p),
    phone: p.phone,
    email: p.email,
    website: clean(p.website_url) || clean(p.website),
    instagram: clean(p.instagram_url) || clean(p.instagram),
    eventTypes: Array.isArray(p.event_types) ? p.event_types : null,
    isPartner: !!p.is_partner,
    cover,
    avatar: avatar === 'same' ? cover : avatar,
    media: media.filter((m): m is BrochureMedia => !!m),
    documents: docs,
    publicUrl: `${PUBLIC_PROFILE}${userId}`,
    fonts: { regular, semibold },
  });
}

/** Génère la brochure PDF et ouvre la feuille de partage (Mail, WhatsApp, Fichiers…). */
export async function exportFichePdf(opts: Parameters<typeof prepareFicheHtml>[0]): Promise<void> {
  const html = await prepareFicheHtml(opts);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false, ...A4_PAGE });
  // Nom de fichier lisible (« Fiche - Studio Lumière.pdf ») au lieu d'un identifiant.
  let shareUri = uri;
  try {
    const safe = clean(opts.profile.business_name).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Oheve';
    const dest = `${FileSystem.cacheDirectory}Fiche - ${safe}.pdf`;
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: dest });
    shareUri = dest;
  } catch { /* on garde le nom par défaut */ }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', dialogTitle: 'Exporter ma fiche', UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri: shareUri });
  }
}
