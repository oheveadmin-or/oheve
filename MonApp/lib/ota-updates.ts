import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Mises à jour OTA appliquées sans attendre une 2e ouverture.
 *
 * - Au lancement à froid, app.json (fallbackToCacheTimeout 5 s) fait déjà
 *   attendre le natif jusqu'à 5 s pour charger la dernière version.
 * - Si le réseau était trop lent, la mise à jour finit de se télécharger en
 *   arrière-plan : on l'applique dès que l'utilisateur revient sur l'app.
 * - Au retour au premier plan, on vérifie aussi s'il y a du nouveau (utile
 *   pour une app laissée ouverte plusieurs jours).
 */
export function useOtaUpdates() {
  const { isUpdatePending } = Updates.useUpdates();
  const checking = useRef(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      if (isUpdatePending) {
        Updates.reloadAsync().catch(() => {});
        return;
      }
      if (checking.current) return;
      checking.current = true;
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) await Updates.fetchUpdateAsync(); // → isUpdatePending
      } catch {
        // réseau absent : on réessaiera au prochain retour
      } finally {
        checking.current = false;
      }
    });
    return () => sub.remove();
  }, [isUpdatePending]);
}
