import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { prestataireSubApi } from '@/services/auth/api';

/**
 * Offre d'essai de l'abonnement prestataire.
 *
 * Offre de lancement : les 200 premiers prestataires qui activent leur espace
 * ont 6 mois offerts, les suivants 3 mois. Le serveur est seul juge (il tient le
 * compteur des places) — aucun écran ne code la durée en dur, sinon l'app
 * annoncerait une durée différente de celle réellement accordée.
 *
 * ⚠️ Sur iOS la durée réellement offerte est celle de l'offre d'introduction
 * configurée dans App Store Connect : quand les 200 places sont prises, elle doit
 * y être ramenée de 6 à 3 mois pour rester cohérente avec ce que l'app affiche.
 */
export type PrestaOffer = {
  /** Des places de l'offre de lancement restent disponibles (ou l'user en a une). */
  founderOpen: boolean;
  /** Ce compte a déjà une place fondateur. */
  isFounder: boolean;
  /** Places restantes sur les 200. */
  remaining: number;
  limit: number;
  /** Durée offerte, en mois, pour ce compte. */
  trialMonths: number;
};

/** Valeur affichée tant que le serveur n'a pas répondu (offre de lancement en cours). */
export const DEFAULT_PRESTA_OFFER: PrestaOffer = {
  founderOpen: true,
  isFounder: false,
  remaining: 200,
  limit: 200,
  trialMonths: 6,
};

/** « 6 mois offerts » / « 3 mois offerts ». */
export function trialLabel(offer: PrestaOffer): string {
  return `${offer.trialMonths} mois offerts`;
}

/** « 6 premiers mois offerts ». */
export function trialLabelLong(offer: PrestaOffer): string {
  return `${offer.trialMonths} premiers mois offerts`;
}

export function usePrestaOffer(): PrestaOffer {
  const { user } = useAuth();
  const [offer, setOffer] = useState<PrestaOffer>(DEFAULT_PRESTA_OFFER);

  // Lisible sans compte : l'écran d'inscription annonce l'offre avant connexion.
  const load = useCallback(async () => {
    const res = await prestataireSubApi.offer(user?.accessToken);
    const d = res?.data;
    if (!res?.success || !d) return;   // hors-ligne / ancien backend → valeur par défaut
    setOffer({
      founderOpen: !!d.founder_open,
      isFounder: !!d.is_founder,
      remaining: Number(d.founder_remaining ?? 0),
      limit: Number(d.founder_limit ?? DEFAULT_PRESTA_OFFER.limit),
      trialMonths: Number(d.trial_months ?? DEFAULT_PRESTA_OFFER.trialMonths),
    });
  }, [user?.accessToken]);

  useEffect(() => { load(); }, [load]);

  return offer;
}
