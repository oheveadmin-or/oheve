/**
 * En développement, remplace localhost / 127.0.0.1 par l’IP LAN du Mac pour que les liens
 * mini-site soient ouverts depuis un téléphone (sinon 127.0.0.1 = le téléphone lui-même).
 */
export function devReplaceLoopbackPublicBaseUrl(base: string): string {
  if (process.env.NODE_ENV === 'production') {
    return base;
  }
  const lan = process.env.DEV_LAN_HOST?.trim() || '172.20.10.4';
  try {
    const u = new URL(base);
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') {
      return base;
    }
    u.hostname = lan;
    return u.origin;
  } catch {
    return base;
  }
}
