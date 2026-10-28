// ─── Enveloppe au nom de l'invité (/wedding/:slug?pour=<code>) ───────────────
// Le nom voyage dans le lien, encodé en base64url (UTF-8) pour garder une URL
// courte et lisible même avec des accents ou de l'hébreu. Ce n'est PAS un
// secret ni un contrôle d'accès : n'importe qui peut fabriquer un code, le nom
// sert uniquement à personnaliser l'enveloppe. La clé du site (?k=) et les
// liens de groupe (/invite/:token) restent des mécanismes séparés.

const GUEST_PARAM = 'pour';
const GUEST_STORAGE_PREFIX = 'oheve_guest_name:';
const MAX_LEN = 60;

/** Nom affichable : sans caractères de contrôle, espaces resserrés, 60 car. max */
export function cleanGuestName(raw: string): string {
  const name = raw
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length <= MAX_LEN) return name;
  // Trop long : on coupe entre deux mots plutôt qu'au milieu d'un nom
  const cut = name.slice(0, MAX_LEN + 1);
  const space = cut.lastIndexOf(' ');
  return (space > MAX_LEN / 2 ? cut.slice(0, space) : name.slice(0, MAX_LEN)).trim();
}

export function encodeGuestName(name: string): string {
  const bytes = new TextEncoder().encode(cleanGuestName(name));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Nom décodé, ou null si le code est absent / illisible */
export function decodeGuestName(code: string | null | undefined): string | null {
  if (!code || code.length > 200 || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const name = cleanGuestName(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return name || null;
  } catch {
    return null;
  }
}

/** Lien du site au nom d'un invité (garde la clé privée du site si besoin) */
export function guestInviteUrl(origin: string, slug: string, name: string, accessKey?: string | null): string {
  const params = new URLSearchParams();
  if (accessKey) params.set('k', accessKey);
  params.set(GUEST_PARAM, encodeGuestName(name));
  return `${origin}/wedding/${slug}?${params.toString()}`;
}

/**
 * Nom de l'invité pour ce site : lu dans le lien, sinon repris de la session
 * (l'invité garde son enveloppe en naviguant vers le RSVP puis en revenant).
 */
export function resolveGuestName(slug: string, search: URLSearchParams): string | null {
  const fromUrl = decodeGuestName(search.get(GUEST_PARAM));
  try {
    if (fromUrl) sessionStorage.setItem(GUEST_STORAGE_PREFIX + slug, fromUrl);
    return fromUrl ?? sessionStorage.getItem(GUEST_STORAGE_PREFIX + slug);
  } catch {
    return fromUrl; // navigation privée — pas de mémorisation
  }
}
