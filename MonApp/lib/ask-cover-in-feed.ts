import { Alert, Platform } from 'react-native';

/**
 * Avant de mettre une photo en couverture, on demande si elle doit AUSSI être
 * publiée dans les reels. Sinon elle reste sur la fiche seulement.
 *
 * @returns true = publier aussi dans les reels, false = couverture seulement,
 *          null = l'utilisateur a annulé (ne rien faire).
 */
export function askCoverInFeed(): Promise<boolean | null> {
  const title = 'Publier aussi dans les reels ?';
  const msg =
    'La photo de couverture apparaît sur la fiche du prestataire. Voulez-vous qu’elle soit aussi publiée dans les reels ?';
  if (Platform.OS === 'web') {
    // window.confirm n'a que 2 choix : OK = oui, Annuler = couverture seulement.
    return Promise.resolve(
      window.confirm(`${title}\n\n${msg}\n\nOK = oui, aussi dans les reels\nAnnuler = couverture seulement`),
    );
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      msg,
      [
        { text: 'Oui, aussi dans les reels', onPress: () => resolve(true) },
        { text: 'Non, couverture seulement', onPress: () => resolve(false) },
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
