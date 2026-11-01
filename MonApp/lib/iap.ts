/**
 * Achats intégrés via expo-iap : Apple StoreKit (iOS) et Google Play Billing
 * (Android).
 *
 * Apple refuse les apps qui vendent des biens numériques (premium couple,
 * abonnement prestataire) avec un autre système de paiement que l'In-App
 * Purchase (Guideline 3.1.1). Sur iOS, on passe donc par StoreKit ; Stripe
 * reste utilisé sur le web et pour payer les prestataires (services
 * physiques, autorisés par Apple). Google Play impose la même règle sur
 * Android : premium et abonnement prestataire passent par Play Billing.
 *
 * Chargement défensif (même pattern que FeedVideo) : sur un binaire construit
 * sans le module natif expo-iap (ancien build TestFlight), on n'importe rien
 * et les écrans affichent un message « mise à jour requise » au lieu de
 * planter au premier rendu.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { IAP_SKUS } from '@/constants/config';

let iapSdk: typeof import('expo-iap') | null = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    iapSdk = require('expo-iap');
  } catch {
    iapSdk = null;
  }
}

/** true si le binaire embarque expo-iap (build récent) sur iOS ou Android. */
export const iapAvailable = !!iapSdk?.useIAP;

/** Nom du store à afficher à l'utilisateur. */
export const STORE_NAME = Platform.OS === 'android' ? 'Google Play' : "l'App Store";
export const STORE_NAME_CAP = Platform.OS === 'android' ? 'Google Play' : "L'App Store";
/** Où l'utilisateur gère/annule ses abonnements. */
export const STORE_SUBSCRIPTIONS_PATH = Platform.OS === 'android'
  ? 'Google Play → Paiements et abonnements → Abonnements'
  : 'Réglages → Abonnements';

/** Requête d'achat pour les deux stores (expo-iap choisit selon la plateforme). */
export function storePurchaseRequest(sku: string) {
  return { apple: { sku }, google: { skus: [sku] } };
}

/**
 * Requête d'abonnement. Sur Android, Play Billing exige l'offerToken d'une
 * offre de l'abonnement : on prend l'offre avec période d'essai gratuite si elle
 * existe (les mois offerts), sinon le forfait de base.
 */
export function storeSubscriptionRequest(
  sku: string,
  product: { subscriptionOfferDetailsAndroid?: { offerId?: string | null; offerToken: string; pricingPhases?: { pricingPhaseList?: { priceAmountMicros?: string | number }[] } }[] | null } | null,
) {
  const offers = product?.subscriptionOfferDetailsAndroid ?? [];
  const isFree = (o: (typeof offers)[number]) =>
    (o.pricingPhases?.pricingPhaseList ?? []).some((p) => Number(p.priceAmountMicros ?? 1) === 0);
  const offer = offers.find((o) => o.offerId && isFree(o)) ?? offers.find((o) => !o.offerId) ?? offers[0];
  return {
    apple: { sku },
    google: { skus: [sku], ...(offer ? { subscriptionOffers: [{ sku, offerToken: offer.offerToken }] } : {}) },
  };
}

/** SDK expo-iap ou null — toujours tester `iapAvailable` avant. */
export function getIapSdk() {
  return iapSdk;
}

/** État du chargement d'un produit StoreKit dans un écran d'achat. */
export type IapProductState = 'loading' | 'ready' | 'unavailable';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Charge UN produit StoreKit avec réessais.
 *
 * StoreKit renvoie régulièrement une liste vide au tout premier appel (juste
 * après le lancement de l'app, en sandbox, ou quand la connexion au store n'est
 * pas encore chaude). Sans réessai, l'écran affichait quand même le bouton
 * d'achat et `requestPurchase` échouait ensuite avec « SKU not found » — c'est
 * exactement l'erreur vue par App Review. On réessaie donc plusieurs fois avant
 * de déclarer le produit indisponible, et l'écran n'affiche le bouton d'achat
 * QUE si le produit a réellement été renvoyé par Apple.
 */
export async function loadIapProduct<T extends { id: string }>(
  fetchProducts: (params: { skus: string[]; type: 'in-app' | 'subs' }) => Promise<unknown>,
  sku: string,
  type: 'in-app' | 'subs',
  attempts = 4,
): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const found = (await fetchProducts({ skus: [sku], type })) as T[] | null;
      const product = Array.isArray(found) ? found.find((p) => p?.id === sku) : null;
      // Android : Google peut renvoyer l'abonnement SANS aucune offre achetable
      // (forfait non proposé dans le pays du compte Google Play, ou forfait non
      // activé). Le prix est alors vide et l'achat échoue avec « Failed to
      // query product » : on le traite comme indisponible.
      if (product && Platform.OS === 'android' && type === 'subs') {
        const offers = (product as { subscriptionOfferDetailsAndroid?: unknown[] | null }).subscriptionOfferDetailsAndroid;
        if (!Array.isArray(offers) || offers.length === 0) {
          console.warn(`[IAP] ${sku} renvoyé sans offre (pays du compte Google Play ?)`);
          return null;
        }
      }
      if (product) return product;
      console.warn(`[IAP] produit introuvable côté App Store (${sku}), tentative ${i + 1}/${attempts}`);
    } catch (err) {
      console.warn(`[IAP] échec fetchProducts (${sku}), tentative ${i + 1}/${attempts}`, err);
    }
    if (i < attempts - 1) await delay(700 * (i + 1));
  }
  return null;
}

/** Message clair en français à la place des codes techniques d'expo-iap. */
export function describeIapError(error: { code?: string; message?: string } | null): string {
  switch (error?.code) {
    case 'sku-not-found':
    case 'skuNotFound':
      return "Cet achat n'est pas disponible sur votre compte " + (Platform.OS === 'android' ? 'Google Play' : 'App Store') + " pour le moment. Réessayez dans un instant.";
    case 'network-error':
    case 'service-error':
      return `${STORE_NAME_CAP} est momentanément injoignable. Vérifiez votre connexion et réessayez.`;
    case 'query-product':
      return IAP_UNAVAILABLE_MESSAGE;
    case 'item-unavailable':
      return "Cet achat n'est pas disponible dans votre pays.";
    case 'deferred-payment':
      return "L'achat est en attente d'approbation (autorisation parentale).";
    case 'already-owned':
      return 'Vous possédez déjà cet achat — utilisez « Restaurer mes achats ».';
    default:
      if (/failed to query product/i.test(error?.message ?? '')) return IAP_UNAVAILABLE_MESSAGE;
      return error?.message || 'Réessayez dans un instant.';
  }
}

/** Message affiché quand Apple ne renvoie aucun produit après plusieurs essais. */
export const IAP_UNAVAILABLE_MESSAGE = Platform.OS === 'android'
  ? "Google Play n'a pas pu charger l'offre. Elle n'est peut-être pas proposée dans le pays de votre compte Google Play. Vérifiez votre connexion, puis réessayez."
  : `${STORE_NAME_CAP} n'a pas pu charger l'offre pour le moment. Vérifiez votre connexion, puis réessayez.`;

// ── Prix du Premium couple ───────────────────────────────────────────────────
/**
 * Prix réglé dans chaque store, affiché tant que le store n'a pas répondu
 * (ou sur le web / anciens builds sans expo-iap, qui paient via Stripe).
 * ⚠️ À garder identique aux consoles :
 *   - Google Play Console → produit ponctuel com.oheve.wedding.couple.premium : 49,99 €
 *   - App Store Connect → achat intégré com.oheve.wedding.couple.premium : 50,00 €
 */
export const PREMIUM_FALLBACK_PRICE = Platform.OS === 'android' ? '49,99 €' : '50 €';

let premiumPrice: string | null = null;
let premiumPricePromise: Promise<void> | null = null;
const premiumPriceListeners = new Set<(p: string) => void>();

/** Mémorise le prix renvoyé par le store et prévient tous les écrans abonnés. */
export function rememberPremiumPrice(price: string | null | undefined) {
  if (!price || price === premiumPrice) return;
  premiumPrice = price;
  premiumPriceListeners.forEach((l) => l(price));
}

/** Charge le prix du Premium auprès du store, une seule fois pour toute l'app. */
function loadPremiumPriceOnce() {
  if (premiumPrice || premiumPricePromise || !iapSdk?.fetchProducts) return;
  const sdk = iapSdk;
  premiumPricePromise = (async () => {
    const fetchOne = async () => {
      const list = (await sdk.fetchProducts({ skus: [IAP_SKUS.premium], type: 'in-app' })) as
        { id: string; displayPrice?: string }[] | null;
      return Array.isArray(list) ? list.find((p) => p?.id === IAP_SKUS.premium) : undefined;
    };
    try {
      let product: { displayPrice?: string } | undefined;
      try {
        product = await fetchOne();
      } catch {
        // Connexion au store pas encore ouverte : on l'ouvre puis on réessaie.
        await sdk.initConnection?.();
        product = await fetchOne();
      }
      rememberPremiumPrice(product?.displayPrice);
    } catch (err) {
      console.warn('[IAP] prix Premium indisponible, prix par défaut affiché', err);
    } finally {
      premiumPricePromise = null;
    }
  })();
}

/**
 * Prix du Premium couple à afficher partout dans l'app (« 49,99 € » sur
 * Android, « 50 € » sur iPhone…). Le prix exact vient du store ; en attendant,
 * on affiche celui de la plateforme.
 */
export function usePremiumPrice(): string {
  const [price, setPrice] = useState(premiumPrice ?? PREMIUM_FALLBACK_PRICE);
  useEffect(() => {
    premiumPriceListeners.add(setPrice);
    if (premiumPrice) setPrice(premiumPrice);
    else loadPremiumPriceOnce();
    return () => { premiumPriceListeners.delete(setPrice); };
  }, []);
  return price;
}
