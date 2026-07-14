import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * Lecteur vidéo du feed/reels/portfolio.
 * - `isActive` : lecture seulement quand la vidéo est visible (reels) —
 *   évite que toutes les vidéos montées jouent en même temps.
 * - `showSoundToggle` : bouton 🔇/🔊 en overlay (reels, démarre en muet).
 * - `nativeControls` : contrôles iOS natifs (modal détail, plein écran).
 */
export function FeedVideo({
  uri,
  isActive = true,
  showSoundToggle = false,
  nativeControls = false,
  startMuted = true,
  style,
}: {
  uri: string;
  isActive?: boolean;
  showSoundToggle?: boolean;
  nativeControls?: boolean;
  startMuted?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
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
