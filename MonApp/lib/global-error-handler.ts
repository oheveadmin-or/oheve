import { Alert } from 'react-native';

/**
 * Intercepte les erreurs JS non capturées (y compris dans le code asynchrone :
 * fetch().then, setTimeout… que l'ErrorBoundary React ne voit pas).
 *
 * En build production, une erreur "fatale" déclenche un abort() natif → l'app se ferme
 * brutalement (« ça me sort de l'appli »). On l'affiche dans une alerte pour pouvoir la lire
 * et la corriger, au lieu de laisser l'app mourir en silence.
 */
type GlobalHandler = (error: Error, isFatal?: boolean) => void;
interface ErrorUtilsLike {
  getGlobalHandler?: () => GlobalHandler;
  setGlobalHandler: (handler: GlobalHandler) => void;
}

const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

let alreadyShown = false;

if (errorUtils?.setGlobalHandler) {
  const defaultHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GlobalError]', isFatal ? '(FATAL)' : '', error?.message, error?.stack);

    if (isFatal && !alreadyShown) {
      alreadyShown = true;
      Alert.alert(
        'Erreur détectée',
        `${error?.name ? `${error.name}: ` : ''}${error?.message ?? 'Erreur inconnue'}\n\n` +
          `${(error?.stack ?? '').split('\n').slice(0, 6).join('\n')}\n\n` +
          'Fais une capture et envoie-la pour correction.',
        [{ text: 'OK', onPress: () => { alreadyShown = false; } }],
      );
      // On NE rappelle PAS le handler par défaut en cas d'erreur fatale :
      // cela éviterait l'abort() natif et garde l'app ouverte pour lire le message.
      return;
    }

    defaultHandler?.(error, isFatal);
  });
}
