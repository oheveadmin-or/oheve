import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Animated, AppState, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { peekVideoThumbnail, posterUrlFor } from '@/components/video-thumbnail';

// Chargement défensif : sur un binaire construit sans le module natif
// expo-video (ancien build simulateur/TestFlight), on affiche un placeholder
// au lieu de faire planter tout l'écran au premier rendu d'une vidéo.
let videoSdk: typeof import('expo-video') | null = null;
try {
  videoSdk = require('expo-video');
} catch {
  videoSdk = null;
}

// Son partagé entre tous les reels (comme Instagram) : couper le son sur un
// reel le coupe aussi sur les suivants, au lieu de repartir à chaque vidéo.
let reelsMuted = false;
const muteListeners = new Set<() => void>();
function setReelsMuted(v: boolean) {
  reelsMuted = v;
  muteListeners.forEach((l) => l());
}
function subscribeMute(l: () => void) {
  muteListeners.add(l);
  return () => { muteListeners.delete(l); };
}
const getReelsMuted = () => reelsMuted;

type FeedVideoProps = {
  uri: string;
  isActive?: boolean;
  showSoundToggle?: boolean;
  nativeControls?: boolean;
  startMuted?: boolean;
  /**
   * 'auto' (reels) : une vidéo verticale remplit tout l'écran comme sur
   * Instagram, une vidéo horizontale est montrée entière (bandes noires).
   */
  contentFit?: 'cover' | 'contain' | 'auto';
  /** Image affichée pendant le chargement (évite l'écran noir des reels). */
  posterUri?: string;
  /** Reels : son commun à toutes les vidéos + toucher la vidéo = couper/remettre le son. */
  sharedSound?: boolean;
  /** Position verticale du bouton son (sous l'encoche / les boutons de l'écran). */
  soundToggleTop?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Lecteur vidéo du feed/reels/portfolio.
 * - `isActive` : lecture seulement quand la vidéo est visible (reels) —
 *   évite que toutes les vidéos montées jouent en même temps.
 * - `showSoundToggle` : bouton 🔇/🔊 en overlay (reels, démarre en muet).
 * - `nativeControls` : contrôles iOS natifs (modal détail, plein écran).
 */
export function FeedVideo(props: FeedVideoProps) {
  if (!videoSdk) {
    return (
      <View style={[props.style, fvStyles.fallback]}>
        <Ionicons name="videocam-off-outline" size={34} color="rgba(255,255,255,0.8)" />
        <ThemedText style={fvStyles.fallbackTxt}>
          Vidéo disponible après mise à jour de l'app
        </ThemedText>
      </View>
    );
  }
  return <NativeFeedVideo {...props} />;
}

function NativeFeedVideo({
  uri,
  isActive = true,
  showSoundToggle = false,
  nativeControls = false,
  startMuted = true,
  contentFit = 'cover',
  posterUri,
  sharedSound = false,
  soundToggleTop = 12,
  style,
}: FeedVideoProps) {
  const { useVideoPlayer, VideoView } = videoSdk!;
  const [localMuted, setLocalMuted] = useState(startMuted);
  const sharedMuted = useSyncExternalStore(subscribeMute, getReelsMuted, getReelsMuted);
  const muted = sharedSound ? sharedMuted : localMuted;
  const toggleMute = () => {
    if (sharedSound) setReelsMuted(!sharedMuted);
    else setLocalMuted((m) => !m);
  };
  // Appli en arrière-plan → pause (sinon le son continue sur Android).
  // Seulement le vrai arrière-plan : « inactive » (alerte système, centre de
  // contrôle) ne doit pas couper la vidéo.
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s !== 'background'));
    return () => sub.remove();
  }, []);
  const shouldPlay = isActive && appActive;
  // Cache disque des vidéos distantes : revoir un reel (ou rouvrir les reels)
  // ne retélécharge plus rien, la lecture repart instantanément.
  const source = useMemo(
    () => (/^https?:\/\//.test(uri) ? { uri, useCaching: true } : uri),
    [uri],
  );
  // Tant que la vidéo n'a pas assez de données, on ne montre pas un écran noir
  // vide : miniature (si déjà en cache) + indicateur de chargement.
  const [ready, setReady] = useState(false);
  // Fichier introuvable / format illisible sur cet appareil : message clair
  // plutôt qu'un écran noir qui fait croire à un bug de l'app.
  const [failed, setFailed] = useState(false);
  // Aperçu du serveur (instantané, souvent déjà en cache grâce à la grille).
  const [poster, setPoster] = useState<string | null>(posterUri ?? posterUrlFor(uri));
  // Format de la vidéo, connu dès que ses métadonnées arrivent (mode 'auto').
  const [isPortrait, setIsPortrait] = useState(true);
  const fit: 'cover' | 'contain' = contentFit === 'auto' ? (isPortrait ? 'cover' : 'contain') : contentFit;
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = muted;
    p.bufferOptions = bufferFor(shouldPlay);
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  // Vidéo visible : tampon confortable (plus de coupures en cours de lecture).
  // Vidéo voisine en attente : juste le début, pour démarrer tout de suite
  // quand on y arrive sans voler la bande passante de la vidéo visible.
  const wasPlaying = useRef(false);
  useEffect(() => {
    try { player.bufferOptions = bufferFor(shouldPlay); } catch { /* lecteur libéré */ }
    if (shouldPlay) {
      player.play();
      wasPlaying.current = true;
    } else {
      player.pause();
      // Comme Instagram : un reel quitté repart du début quand on y revient.
      if (wasPlaying.current && !isActive) {
        try { player.currentTime = 0; } catch { /* lecteur libéré */ }
      }
    }
  }, [shouldPlay, isActive, player]);

  // Retour visuel quand on touche la vidéo pour couper/remettre le son.
  const [flash] = useState(() => new Animated.Value(0));
  const onTapVideo = () => {
    toggleMute();
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 700, delay: 250, useNativeDriver: true }).start();
  };

  // L'aperçu reste affiché jusqu'à la PREMIÈRE IMAGE réellement peinte
  // (onFirstFrameRender) : avant, on le retirait dès « readyToPlay », ce qui
  // laissait un flash noir sur Android entre les deux. Filet de sécurité :
  // si l'événement n'arrive pas, on bascule 700 ms après « readyToPlay ».
  useEffect(() => {
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const onStatus = (status: string) => {
      if (status === 'error') { setFailed(true); setReady(true); return; }
      setFailed(false);
      if (status === 'readyToPlay') {
        clearTimeout(fallback);
        fallback = setTimeout(() => setReady(true), 700);
      }
    };
    const sub = player.addListener('statusChange', ({ status }) => onStatus(status));
    const trackSub = player.addListener('videoTrackChange', ({ videoTrack }) => {
      const sz = videoTrack?.size;
      if (sz && sz.width > 0 && sz.height > 0) setIsPortrait(sz.height >= sz.width * 0.9);
    });
    // Le lecteur peut déjà être prêt avant l'abonnement (vidéo en cache).
    const t = setTimeout(() => {
      onStatus(player.status);
      const sz = player.videoTrack?.size;
      if (sz && sz.width > 0 && sz.height > 0) setIsPortrait(sz.height >= sz.width * 0.9);
    }, 0);
    return () => { clearTimeout(t); clearTimeout(fallback); sub.remove(); trackSub.remove(); };
  }, [player]);

  // Miniature déjà générée par les grilles (profil, explore…) : affichage
  // instantané, aucun téléchargement supplémentaire.
  useEffect(() => {
    if (posterUri || posterUrlFor(uri)) return;
    let alive = true;
    peekVideoThumbnail(uri).then((t) => { if (alive && t) setPoster(t); });
    return () => { alive = false; };
  }, [uri, posterUri]);

  const shownPoster = posterUri ?? poster;

  return (
    <View style={style}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={fit}
        nativeControls={nativeControls}
        onFirstFrameRender={() => setReady(true)}
        // Android : TextureView se déplace avec la liste pendant le défilement.
        // La SurfaceView par défaut est une fenêtre à part → vidéo qui « traîne »
        // ou déborde sur le reel voisin, bords noirs qui clignotent.
        surfaceType={sharedSound ? 'textureView' : undefined}
        useExoShutter={false}
      />
      {!ready && (
        <View style={[StyleSheet.absoluteFill, fvStyles.loading]} pointerEvents="none">
          {shownPoster && (
            <Image
              source={{ uri: shownPoster }}
              style={StyleSheet.absoluteFill}
              contentFit={fit}
              cachePolicy="memory-disk"
              transition={0}
              onError={() => setPoster(null)}
            />
          )}
          {/* Avec un aperçu, pas de roue : l'image s'affiche, puis la vidéo démarre (comme Instagram). */}
          {!shownPoster && <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />}
        </View>
      )}
      {failed && (
        <View style={[StyleSheet.absoluteFill, fvStyles.fallback]} pointerEvents="none">
          <Ionicons name="videocam-off-outline" size={34} color="rgba(255,255,255,0.8)" />
          <ThemedText style={fvStyles.fallbackTxt}>Vidéo indisponible</ThemedText>
        </View>
      )}
      {sharedSound && !failed && (
        <Pressable style={StyleSheet.absoluteFill} onPress={onTapVideo} accessibilityLabel={muted ? 'Remettre le son' : 'Couper le son'}>
          <Animated.View style={[fvStyles.flash, { opacity: flash }]} pointerEvents="none">
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={34} color="#fff" />
          </Animated.View>
        </Pressable>
      )}
      {showSoundToggle && !failed && (
        <Pressable style={[fvStyles.soundBtn, { top: soundToggleTop }]} onPress={toggleMute} hitSlop={12}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

function bufferFor(playing: boolean) {
  return playing
    ? { preferredForwardBufferDuration: 12, waitsToMinimizeStalling: false, minBufferForPlayback: 0.5 }
    : { preferredForwardBufferDuration: 2, waitsToMinimizeStalling: false, minBufferForPlayback: 0.5 };
}

/** Petite pastille ▶ posée sur les tuiles vidéo des grilles (profil, portfolio…). */
export function VideoBadge({ size = 18 }: { size?: number }) {
  return (
    <View style={fvStyles.badge}>
      <Ionicons name="play" size={size - 6} color="#fff" />
    </View>
  );
}

const fvStyles = StyleSheet.create({
  loading: {
    backgroundColor: '#1B1917',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: '#5c5f57',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  fallbackTxt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  flash: {
    position: 'absolute', alignSelf: 'center', top: '45%',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  soundBtn: {
    position: 'absolute', right: 14,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
});
