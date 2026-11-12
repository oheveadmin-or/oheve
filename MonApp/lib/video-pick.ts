/**
 * Options communes aux sélecteurs de photos/vidéos des prestataires
 * (portfolio, profil, reels, et admin → Identifiants).
 *
 * ⚠️ `videoQuality` est ignoré quand `allowsMultipleSelection` est activé
 * (iOS utilise alors PHPicker) : sans `videoExportPreset`, l'iPhone envoie la
 * vidéo d'origine en 4K, soit plusieurs centaines de Mo pour 2 minutes, et
 * l'envoi échoue. Le preset fait réencoder la vidéo en 720p par l'iPhone
 * lui-même (rapide, matériel) AVANT l'envoi. `videoMaxDuration` n'est pas
 * appliqué non plus par PHPicker : la durée est vérifiée avec `isTooLong`.
 */
import * as ImagePicker from 'expo-image-picker';

export const MAX_VIDEO_SECONDS = 120;

export const VIDEO_PICK_OPTIONS = {
  videoMaxDuration: MAX_VIDEO_SECONDS,
  videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
  videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
} as const;

/** Vidéo de plus de 2 minutes (petite marge pour les arrondis). */
export function isTooLong(asset: ImagePicker.ImagePickerAsset): boolean {
  return asset.type === 'video' && (asset.duration ?? 0) > (MAX_VIDEO_SECONDS + 1) * 1000;
}

export const TOO_LONG_MESSAGE = `Vidéo trop longue : ${MAX_VIDEO_SECONDS / 60} minutes maximum. Coupez-la dans Photos (Modifier) puis réessayez.`;
