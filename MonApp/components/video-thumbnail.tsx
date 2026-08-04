import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

// Chargement défensif : le module natif expo-video-thumbnails n'existe que sur
// les binaires reconstruits après son ajout — à défaut on garde la tuile sombre
// avec l'icône ▶ (comportement précédent), sans faire planter l'écran.
let thumbSdk: typeof import('expo-video-thumbnails') | null = null;
try {
  thumbSdk = require('expo-video-thumbnails');
} catch {
  thumbSdk = null;
}

const THUMBS_STORE_KEY = '@oheve:video_thumbs';

// Cache mémoire (session) + cache persistant (AsyncStorage) : générer une
// miniature télécharge une partie de la vidéo, on ne le fait qu'une fois par URL.
const memoryCache = new Map<string, string>();
let persisted: Record<string, string> | null = null;

async function loadPersisted(): Promise<Record<string, string>> {
  if (persisted) return persisted;
  try {
    persisted = JSON.parse((await AsyncStorage.getItem(THUMBS_STORE_KEY)) ?? '{}') as Record<string, string>;
  } catch {
    persisted = {};
  }
  return persisted;
}

function forget(videoUri: string) {
  memoryCache.delete(videoUri);
  if (persisted) {
    delete persisted[videoUri];
    AsyncStorage.setItem(THUMBS_STORE_KEY, JSON.stringify(persisted)).catch(() => {});
  }
}

async function getThumbnail(videoUri: string): Promise<string | null> {
  if (!thumbSdk) return null;
  const cached = memoryCache.get(videoUri);
  if (cached) return cached;
  const store = await loadPersisted();
  if (store[videoUri]) {
    memoryCache.set(videoUri, store[videoUri]);
    return store[videoUri];
  }
  try {
    const { uri } = await thumbSdk.getThumbnailAsync(videoUri, { time: 500, quality: 0.6 });
    memoryCache.set(videoUri, uri);
    store[videoUri] = uri;
    AsyncStorage.setItem(THUMBS_STORE_KEY, JSON.stringify(store)).catch(() => {});
    return uri;
  } catch {
    return null;
  }
}

/**
 * Miniature déjà en cache pour cette vidéo (mémoire ou disque), sans jamais en
 * générer une nouvelle : sert d'image d'attente au lecteur de reels sans
 * consommer de bande passante au moment où la vidéo se charge.
 */
export async function peekVideoThumbnail(videoUri: string): Promise<string | null> {
  const cached = memoryCache.get(videoUri);
  if (cached) return cached;
  const store = await loadPersisted();
  const fromDisk = store[videoUri];
  if (fromDisk) {
    memoryCache.set(videoUri, fromDisk);
    return fromDisk;
  }
  return null;
}

type VideoThumbnailProps = {
  /** URL (distante ou locale) de la vidéo dont on affiche la première image. */
  uri: string;
  style?: StyleProp<ViewStyle>;
  /** Taille de l'icône ▶ posée sur la miniature. 0 = pas d'icône. */
  iconSize?: number;
};

/**
 * Première image d'une vidéo pour les tuiles de grille (profil, explore,
 * portfolio…) — remplace l'écran noir par un vrai aperçu.
 */
export function VideoThumbnail({ uri, style, iconSize = 30 }: VideoThumbnailProps) {
  const [thumb, setThumb] = useState<string | null>(memoryCache.get(uri) ?? null);

  useEffect(() => {
    let alive = true;
    getThumbnail(uri).then((t) => {
      if (alive) setThumb(t);
    });
    return () => { alive = false; };
  }, [uri]);

  return (
    <View style={[vtStyles.wrap, style]}>
      {thumb && (
        <Image
          source={{ uri: thumb }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => {
            // Fichier de cache purgé par iOS → on régénère la miniature
            forget(uri);
            setThumb(null);
            getThumbnail(uri).then((t) => t && setThumb(t));
          }}
        />
      )}
      {iconSize > 0 && (
        <View style={vtStyles.playOverlay}>
          <Ionicons name="play-circle" size={iconSize} color="rgba(255,255,255,0.92)" />
        </View>
      )}
    </View>
  );
}

const vtStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#374151',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
