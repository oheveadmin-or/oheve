/**
 * Configuration de l'application
 * Séparation dev / prod.
 *
 * Sur un téléphone physique, `localhost` pointe vers le téléphone : il faut l’IP du Mac sur le même réseau.
 * Surcharge possible : EXPO_PUBLIC_API_BASE_URL dans .env ou .env.local (voir .env.example).
 */

const DEV_API_ORIGIN =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://172.20.10.4:3003';

/** Uniquement si tu as un vrai TLS en local (rare) ; sinon le mini-site dev est en http://…:5173 */
const DEV_GUEST_SITE_USE_HTTPS = process.env.EXPO_PUBLIC_GUEST_SITE_HTTPS === '1';

const API_BASE_URL = __DEV__ ? DEV_API_ORIGIN : 'https://api.wedding-planner.com'; // À remplacer en prod

/**
 * URL du générateur web (`guest-site`, Vite :5173) — prévisualisation thème / sections étendues.
 * Surcharge : EXPO_PUBLIC_GUEST_SITE_ORIGIN (sans slash final).
 */
export function guessGuestSiteBuilderUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_GUEST_SITE_ORIGIN?.trim().replace(/\/+$/, '');
  if (explicit) return `${explicit}/wedding/build`;
  try {
    const api = new URL(DEV_API_ORIGIN);
    const scheme = DEV_GUEST_SITE_USE_HTTPS ? 'https' : 'http';
    return `${scheme}://${api.hostname}:5173/wedding/build`;
  } catch {
    return 'http://localhost:5173/wedding/build';
  }
}

/**
 * Sur téléphone physique, le serveur peut encore renvoyer 127.0.0.1/localhost pour le mini-site.
 * On réécrit avec la même machine que l’API (EXPO_PUBLIC_API_BASE_URL / IP par défaut).
 */
export function rewriteLoopbackPublicUrl(publicUrl: string): string {
  if (!__DEV__) return publicUrl;
  try {
    const pub = new URL(publicUrl);
    if (pub.hostname !== '127.0.0.1' && pub.hostname !== 'localhost') return publicUrl;
    const api = new URL(DEV_API_ORIGIN);
    pub.hostname = api.hostname;
    return pub.toString().replace(/\/+$/, '');
  } catch {
    return publicUrl;
  }
}

/**
 * Lien ouvrable sur iPhone en dev : http:// + IP + :5173 + slug (pas de TLS sans mkcert / déploiement).
 * Corrige les collages du type « 172.20.10.4 » sans schéma ni port.
 */
export function normalizeMiniSiteUrlForDevice(publicUrl: string, slug: string): string {
  let raw = publicUrl.trim();
  if (!raw) {
    raw = `${DEV_API_ORIGIN.replace(/\/+$/, '')}`; // fallback minimal
  }
  if (!/^https?:\/\//i.test(raw)) {
    raw = `http://${raw.replace(/^\/+/, '')}`;
  }

  try {
    const u = new URL(rewriteLoopbackPublicUrl(raw));
    const api = new URL(DEV_API_ORIGIN);

    if (__DEV__ && u.hostname === api.hostname) {
      if (!u.port || u.port === '80') {
        u.port = '5173';
      }
      const path = u.pathname.replace(/\/+$/, '') || '/';
      if (path === '/' || path === '') {
        u.pathname = `/${encodeURIComponent(slug)}`;
      }
      if (u.port === '5173') {
        u.protocol = DEV_GUEST_SITE_USE_HTTPS ? 'https:' : 'http:';
      }
    }

    return u.toString().replace(/\/+$/, '');
  } catch {
    try {
      const api = new URL(DEV_API_ORIGIN);
      const scheme = DEV_GUEST_SITE_USE_HTTPS ? 'https' : 'http';
      return `${scheme}://${api.hostname}:5173/${encodeURIComponent(slug)}`;
    } catch {
      return raw;
    }
  }
}

// Google OAuth client IDs — à configurer dans .env.local
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
// EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com

export const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
} as const;

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/api/health`,
  // Auth
  sendOtp: `${API_BASE_URL}/api/auth/send-otp`,
  inscription: `${API_BASE_URL}/api/auth/inscription`,
  connexion: `${API_BASE_URL}/api/auth/connexion`,
  refresh: `${API_BASE_URL}/api/auth/refresh`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  me: `${API_BASE_URL}/api/auth/me`,
  profile: `${API_BASE_URL}/api/auth/profile`,
  avatar: `${API_BASE_URL}/api/auth/avatar`,
  forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
  resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
  changePassword: `${API_BASE_URL}/api/auth/change-password`,
  // Onboarding
  dateMariage: `${API_BASE_URL}/api/auth/date-mariage`,
  budget: `${API_BASE_URL}/api/auth/budget`,
  weddingLocation: `${API_BASE_URL}/api/auth/wedding-location`,
  // Features
  publicSites: `${API_BASE_URL}/api/public-sites`,
  prestataires: `${API_BASE_URL}/api/prestataires`,
  conversations: `${API_BASE_URL}/api/conversations`,
  pushToken: `${API_BASE_URL}/api/conversations/push-token`,
  // Social auth
  socialAuth: `${API_BASE_URL}/api/auth/social`,
  // Admin
  adminStats: `${API_BASE_URL}/api/admin/stats`,
  adminUsers: `${API_BASE_URL}/api/admin/users`,
  adminPrestataires: `${API_BASE_URL}/api/admin/prestataires`,
  adminSubscriptions: `${API_BASE_URL}/api/admin/subscriptions`,
  // Abonnements
  subscriptionPlans: `${API_BASE_URL}/api/subscriptions/plans`,
  subscriptionMe: `${API_BASE_URL}/api/subscriptions/me`,
  subscriptionSubscribe: `${API_BASE_URL}/api/subscriptions/subscribe`,
  // RSVP
  rsvp: (slug: string) => `${API_BASE_URL}/api/rsvp/${encodeURIComponent(slug)}/answers`,
  rsvpStream: (slug: string) => `${API_BASE_URL}/api/rsvp/${encodeURIComponent(slug)}/stream`,
  rsvpPushToken: (slug: string) => `${API_BASE_URL}/api/rsvp/${encodeURIComponent(slug)}/push-token`,
  // Wedding site config
  siteConfig: (slug: string) => `${API_BASE_URL}/api/public-sites/${encodeURIComponent(slug)}/config`,
} as const;
