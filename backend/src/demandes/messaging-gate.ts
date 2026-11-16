import { apercu } from './sanitize';
import { demandeDeConversation, demandeOuvertePourPresta, promouvoirSiAbonne } from './service';

/**
 * Pont entre la messagerie existante (/api/conversations) et les demandes :
 * un prestataire ne doit pas pouvoir lire, par l'onglet Messages, une demande
 * qui est verrouillée.
 */

export const LOCKED_MESSAGE = 'Débloquez cette demande ou activez votre abonnement pour la lire et répondre.';

/** Statut de la conversation pour l'utilisateur qui la consulte. */
export async function etatConversation(conv: { id: number; client_id: number; prestataire_id: number }, userId: number) {
  let demande = await demandeDeConversation(conv.id);
  const estPresta = conv.prestataire_id === userId;
  if (demande && estPresta) demande = await demandeOuvertePourPresta(demande);
  return {
    demande,
    estPresta,
    estClient: conv.client_id === userId,
    verrouilleePourMoi: !!demande && estPresta && demande.statut === 'verrouillee',
  };
}

/** Liste des conversations : masque le contenu des demandes verrouillées côté prestataire. */
export async function masquerListe<T extends {
  prestataire_id: number;
  demande_statut?: string | null;
  last_message?: string;
  first_client_message?: string | null;
}>(userId: number, rows: T[], recharger: () => Promise<T[]>): Promise<Array<T & { demande_verrouillee: boolean }>> {
  let list = rows;
  if (list.some((r) => r.prestataire_id === userId && r.demande_statut === 'verrouillee')) {
    if (await promouvoirSiAbonne(userId)) list = await recharger();
  }
  return list.map((r) => {
    const verrouillee = r.prestataire_id === userId && r.demande_statut === 'verrouillee';
    const { first_client_message, ...rest } = r;
    return {
      ...(rest as T),
      last_message: verrouillee ? apercu(first_client_message ?? '') : r.last_message,
      demande_verrouillee: verrouillee,
    };
  });
}
