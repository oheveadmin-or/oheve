import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Chargement défensif : sur un binaire construit sans le module natif
// expo-video (ancien build simulateur/TestFlight), on affiche un placeholder
// au lieu de faire planter tout l'écran au premier rendu d'une vidéo.
let videoSdk: typeof import('expo-video') | null = null;
try {
  videoSdk = require('expo-video');
} catch {
  videoSdk = null;
}

type FeedVideoProps = {
  uri: string;
  isActive?: boolean;
  showSoundToggle?: boolean;
  nativeControls?: boolean;
  startMuted?: boolean;
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
  style,
}: FeedVideoProps) {
  const { useVideoPlayer, VideoView } = videoSdk!;
  const [muted, setMuted] = useState(startMuted);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = startMuted;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  return (
    <View style={style}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={nativeControls}
      />
      {showSoundToggle && (
        <Pressable style={fvStyles.soundBtn} onPress={() => setMuted((m) => !m)} hitSlop={10}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={17} color="#fff" />
        </Pressable>
      )}
    </View>
  );
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
  fallback: {
    backgroundColor: '#374151',
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
  soundBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 34, height: 34, borderRadius: 17,
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
