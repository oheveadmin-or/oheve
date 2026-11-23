/** Données communes aux e-mails envoyés au prestataire. */
export interface PrestaEmailContext {
  prestaPrenom: string;
  ficheNom: string;
  ficheUrl: string;
  clientPrenom: string;
  dateDemande: Date | string;
  /** Page de la demande (lien magique, connexion automatique). */
  demandeUrl: string;
  unsubscribeUrl: string;
}

export const PRESTA_FOOTER = {
  footerReason: 'Vous recevez ce mail car votre activité est référencée sur Oheve.',
  unsubscribeLabel: 'Ne plus recevoir de demandes',
};
