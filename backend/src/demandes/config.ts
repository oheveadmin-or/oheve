/**
 * Configuration de la fonctionnalité « Contacter un prestataire ».
 * Tout ce qui est secret ou varie selon l'environnement vient de process.env,
 * jamais du frontend.
 */

function intEnv(name: string, fallback: number): number {
  const n = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const demandesConfig = {
  /** Nombre de demandes offertes à chaque prestataire non abonné. */
  get freeLimit() { return intEnv('FREE_REQUESTS_LIMIT', 4); },
  /** Anti-spam : nouvelles demandes max par client sur 24 h glissantes. */
  get maxNewPerClientPerDay() { return intEnv('DEMANDES_MAX_PER_CLIENT_24H', 5); },

  get fromName() { return process.env.EMAIL_FROM_NAME?.trim() || 'Ohevé'; },
  get fromAddress() { return process.env.EMAIL_FROM_ADDRESS?.trim() || 'noreply@ohevewedding.com'; },
  get logoUrl() { return process.env.LOGO_URL?.trim() || ''; },
  /** Site public (pages /demande/:id, /prestataire/:id, /se-desabonner). */
  get siteUrl() { return trimSlash(process.env.SITE_URL?.trim() || 'https://ohevewedding.com'); },
  /** URL publique de l'API (désinscription en un clic depuis le client mail). */
  get apiPublicUrl() { return trimSlash(process.env.API_PUBLIC_URL?.trim() || 'https://oheve-production.up.railway.app'); },

  /** Fiche App Store de l'app Ohevé (lien « Télécharger l'application » des e-mails). */
  get appStoreUrl() { return process.env.APP_STORE_URL?.trim() || 'https://apps.apple.com/fr/app/oheve/id6785535857'; },

  /** Prix Stripe du déblocage à l'unité (paiement unique). */
  get stripePriceDeblocage() { return process.env.STRIPE_PRICE_DEBLOCAGE?.trim() || ''; },
  /** Prix Stripe de l'abonnement ; à défaut, le prix de l'abonnement prestataire existant. */
  get stripePriceAbonnement() { return process.env.STRIPE_PRICE_ABONNEMENT?.trim() || ''; },
};

/** Taille de l'aperçu montré quand la demande est verrouillée. */
export const APERCU_LENGTH = 80;
export const CONTENU_MIN = 10;
export const CONTENU_MAX = 2000;

export type DemandeStatut = 'gratuite' | 'verrouillee' | 'debloquee' | 'abonnement';
export const STATUTS_OUVERTS: DemandeStatut[] = ['gratuite', 'debloquee', 'abonnement'];
