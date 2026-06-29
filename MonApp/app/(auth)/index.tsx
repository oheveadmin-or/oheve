import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, FeGaussianBlur, Filter, G, Line, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C } from '@/constants/OheveTheme';
import { Fonts } from '@/constants/theme';

const BG = C.ivoire;
const LOGO_ACCENT = C.sauge;
const LOGO_TEXT = C.textLight;
const LEAF = C.sauge;

/* ──────────────────────────────────────────────────────────────
   Fond botanique : ombres douces de feuillage (lumière tamisée)
   ────────────────────────────────────────────────────────────── */
const VB_W = 390;
const VB_H = 844;

type Pt = { x: number; y: number };

function bez(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function bezAngle(p0: Pt, p1: Pt, p2: Pt, t: number): number {
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function Branch({
  p0, p1, p2, count, rx, ry, opacity,
}: { p0: Pt; p1: Pt; p2: Pt; count: number; rx: number; ry: number; opacity: number }) {
  const leaves = [];
  for (let i = 0; i < count; i++) {
    const t = 0.12 + (i / (count - 1)) * 0.88;
    const c = bez(p0, p1, p2, t);
    const ang = bezAngle(p0, p1, p2, t);
    const side = i % 2 === 0 ? 1 : -1;
    const scale = 1 - 0.45 * t;
    const perp = ((ang + 90) * Math.PI) / 180;
    const off = ry * 0.55 * scale * side;
    const cx = c.x + Math.cos(perp) * off;
    const cy = c.y + Math.sin(perp) * off;
    const rot = ang + side * 38;
    leaves.push(
      <Ellipse
        key={i}
        cx={cx}
        cy={cy}
        rx={rx * scale}
        ry={ry * scale}
        fill={LEAF}
        transform={`rotate(${rot} ${cx} ${cy})`}
      />,
    );
  }
  return (
    <G opacity={opacity}>
      <Path
        d={`M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`}
        stroke={LEAF}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      {leaves}
    </G>
  );
}

function BotanicalBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <Filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </Filter>
        </Defs>
        <G filter="url(#soft)">
          {/* canopée haut-gauche */}
          <Branch p0={{ x: 30, y: -40 }} p1={{ x: 130, y: 30 }} p2={{ x: 120, y: 250 }} count={9} rx={15} ry={27} opacity={0.17} />
          <Branch p0={{ x: -30, y: 40 }} p1={{ x: 60, y: 110 }} p2={{ x: 55, y: 300 }} count={7} rx={13} ry={23} opacity={0.12} />
          {/* haut-droite */}
          <Branch p0={{ x: 430, y: 30 }} p1={{ x: 300, y: 80 }} p2={{ x: 250, y: 300 }} count={9} rx={15} ry={26} opacity={0.15} />
          <Branch p0={{ x: 395, y: -30 }} p1={{ x: 340, y: 30 }} p2={{ x: 310, y: 170 }} count={6} rx={12} ry={21} opacity={0.11} />
          {/* bas-droite */}
          <Branch p0={{ x: 430, y: 830 }} p1={{ x: 360, y: 760 }} p2={{ x: 335, y: 630 }} count={6} rx={13} ry={22} opacity={0.1} />
          {/* bas-gauche */}
          <Branch p0={{ x: -30, y: 850 }} p1={{ x: 55, y: 800 }} p2={{ x: 75, y: 690 }} count={5} rx={12} ry={20} opacity={0.09} />
        </G>
      </Svg>
    </View>
  );
}

/* Deux anneaux entrelacés (alliances) sous le logo */
function RingsMark() {
  return (
    <Svg width={66} height={30} viewBox="0 0 66 30">
      <Line x1={5} y1={15} x2={17} y2={15} stroke={C.taupe} strokeWidth={1} strokeLinecap="round" />
      <Line x1={49} y1={15} x2={61} y2={15} stroke={C.taupe} strokeWidth={1} strokeLinecap="round" />
      <Circle cx={28} cy={15} r={8.5} stroke={C.taupe} strokeWidth={1.8} fill="none" />
      <Circle cx={38} cy={15} r={8.5} stroke={C.taupe} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

export default function AuthIndexScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
      <BotanicalBackdrop />

      <View style={styles.logoSection}>
        <View style={styles.monogramWrap}>
          <ThemedText style={styles.monogramO}>O</ThemedText>
          <ThemedText style={styles.monogramE}>e</ThemedText>
        </View>

        <ThemedText style={styles.brandName}>oheve</ThemedText>
        <View style={styles.ringsWrap}>
          <RingsMark />
        </View>
        <ThemedText style={styles.tagline}>L'APPLICATION DE MARIAGE</ThemedText>
      </View>

      <View style={styles.ctaSection}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/login')}
        >
          <ThemedText style={styles.btnPrimaryText}>Se connecter</ThemedText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/register')}
        >
          <ThemedText style={styles.btnSecondaryText}>Créer un compte</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },

  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    zIndex: 1,
  },

  monogramWrap: {
    width: 160,
    height: 138,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  monogramO: {
    fontSize: 130,
    lineHeight: 130,
    fontFamily: Fonts.serif,
    color: LOGO_ACCENT,
    fontWeight: '300',
    letterSpacing: -1.5,
  },
  monogramE: {
    position: 'absolute',
    right: 43,
    bottom: 10,
    fontSize: 62,
    lineHeight: 62,
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    color: LOGO_ACCENT,
    fontWeight: '300',
  },

  brandName: {
    fontSize: 64,
    lineHeight: 62,
    color: LOGO_TEXT,
    fontFamily: Fonts.serif,
    fontWeight: '300',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  ringsWrap: {
    marginBottom: 10,
  },
  tagline: {
    fontSize: 10,
    lineHeight: 13,
    color: C.textLight,
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    fontWeight: '300',
  },

  ctaSection: {
    width: '100%',
    gap: 12,
    zIndex: 1,
  },

  btnPrimary: {
    backgroundColor: C.sauge,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  btnSecondary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(199,183,165,0.55)',
  },
  btnSecondaryText: {
    color: C.textMid,
    fontSize: 16,
    fontWeight: '600',
  },

  pressed: { opacity: 0.78 },
});
