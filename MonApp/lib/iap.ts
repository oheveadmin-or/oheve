/**
 * Achats intégrés Apple (StoreKit) via expo-iap — iOS uniquement.
 *
 * Apple refuse les apps qui vendent des biens numériques (premium couple,
 * abonnement prestataire) avec un autre système de paiement que l'In-App
 * Purchase (Guideline 3.1.1). Sur iOS, on passe donc par StoreKit ; Stripe
 * reste utilisé sur Android/web et pour payer les prestataires (services
 * physiques, autorisés par Apple).
 *
 * Chargement défensif (même pattern que FeedVideo) : sur un binaire construit
 * sans le module natif expo-iap (ancien build TestFlight), on n'importe rien
 * et les écrans affichent un message « mise à jour requise » au lieu de
 * planter au premier rendu.
 */
import { Platform } from 'react-native';

let iapSdk: typeof import('expo-iap') | null = null;
if (Platform.OS === 'ios') {
  try {
    iapSdk = require('expo-iap');
  } catch {
    iapSdk = null;
  }
}

/** true si le binaire embarque StoreKit (build récent) ET qu'on est sur iOS. */
export const iapAvailable = !!iapSdk?.useIAP;

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
      return "Cet achat n'est pas disponible sur votre compte App Store pour le moment. Réessayez dans un instant.";
    case 'network-error':
    case 'service-error':
      return "L'App Store est momentanément injoignable. Vérifiez votre connexion et réessayez.";
    case 'item-unavailable':
      return "Cet achat n'est pas disponible dans votre pays.";
    case 'deferred-payment':
      return "L'achat est en attente d'approbation (autorisation parentale).";
    case 'already-owned':
      return 'Vous possédez déjà cet achat — utilisez « Restaurer mes achats ».';
    default:
      return error?.message || 'Réessayez dans un instant.';
  }
}

/** Message affiché quand Apple ne renvoie aucun produit après plusieurs essais. */
export const IAP_UNAVAILABLE_MESSAGE =
  "L'App Store n'a pas pu charger l'offre pour le moment. Vérifiez votre connexion, puis réessayez.";
