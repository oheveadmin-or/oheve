/**
 * VintageOrnaments — composants SVG réutilisables du thème « Vintage ».
 *
 * Chaque ornement lit ses couleurs depuis VintageTheme (aucune couleur en dur).
 * On peut surcharger `color` ponctuellement (ex. ornement sur fond bleu).
 *
 * Inventaire :
 *   VintageFrameTop        — cadre supérieur en arche (feuillage gravé)
 *   VintageFrameBottom     — cadre inférieur symétrique
 *   VintageDivider         — séparateur horizontal ornemental
 *   VintageRibbon          — ruban / nœud décoratif
 *   VintageCorner          — ornement d'angle (feuilles)
 *   VintageLeaves          — branche de feuillage isolée
 *   VintageCircleBorder    — sceau circulaire (monogramme / footer)
 *   VintageFloralDecoration— grappe florale / rinceaux symétriques
 */
import type { CSSProperties } from 'react';
import { useId } from 'react';
import { VintageTheme } from '../../themes/VintageTheme';

type OrnamentProps = {
  /** Couleur du tracé — défaut : couleur d'ornement du thème */
  color?: string;
  /** Largeur du rendu (le SVG reste responsive via viewBox) */
  width?: number | string;
  height?: number | string;
  opacity?: number;
  style?: CSSProperties;
  className?: string;
  'aria-hidden'?: boolean;
};

const O = VintageTheme.ornaments;

function base(p: OrnamentProps) {
  return {
    color: p.color ?? O.color,
    opacity: p.opacity ?? O.opacity,
    sw: O.strokeWidth,
  };
}

/** Cadre supérieur en arche, feuillage gravé de part et d'autre. */
export function VintageFrameTop({ width = '100%', height, ...p }: OrnamentProps) {
  const { color, opacity, sw } = base(p);
  return (
    <svg viewBox="0 0 300 90" width={width} height={height} aria-hidden style={p.style} className={p.className}
      fill="none" stroke={color} strokeWidth={sw} opacity={opacity} strokeLinecap="round">
      {/* Arche centrale */}
      <path d="M150 12 C 110 12 90 34 90 70" opacity="0.5" />
      <path d="M150 12 C 190 12 210 34 210 70" opacity="0.5" />
      {/* Feuillages gauche */}
      <path d="M150 14 C 138 22 132 34 132 46 C 124 40 118 42 114 50" />
      <path d="M132 46 C 122 50 118 58 120 66" />
      <path d="M150 14 C 158 24 158 36 154 48" opacity="0.7" />
      {/* Feuillages droite (miroir) */}
      <path d="M150 14 C 162 22 168 34 168 46 C 176 40 182 42 186 50" />
      <path d="M168 46 C 178 50 182 58 180 66" />
      {/* Petites baies */}
      <circle cx="114" cy="50" r="2.2" fill={color} stroke="none" />
      <circle cx="186" cy="50" r="2.2" fill={color} stroke="none" />
      <circle cx="150" cy="8" r="2.4" fill={color} stroke="none" />
    </svg>
  );
}

/** Cadre inférieur — version retournée du cadre haut. */
export function VintageFrameBottom({ width = '100%', height, ...p }: OrnamentProps) {
  return (
    <VintageFrameTop
      width={width}
      height={height}
      {...p}
      style={{ transform: 'scaleY(-1)', ...(p.style ?? {}) }}
    />
  );
}

/** Séparateur horizontal : filet — losange feuillagé — filet. */
export function VintageDivider({ width = 220, height, ...p }: OrnamentProps) {
  const { color, opacity, sw } = base(p);
  return (
    <svg viewBox="0 0 240 24" width={width} height={height} aria-hidden style={p.style} className={p.className}
      fill="none" stroke={color} strokeWidth={sw} opacity={opacity} strokeLinecap="round">
      <line x1="6" y1="12" x2="92" y2="12" opacity="0.6" />
      <line x1="148" y1="12" x2="234" y2="12" opacity="0.6" />
      {/* Feuilles centrales */}
      <path d="M120 4 C 112 8 108 12 120 12 C 132 12 128 8 120 4 Z" fill={color} stroke="none" opacity="0.85" />
      <path d="M120 20 C 112 16 108 12 120 12 C 132 12 128 16 120 20 Z" fill={color} stroke="none" opacity="0.85" />
      <path d="M104 12 C 98 8 96 12 104 12" opacity="0.7" />
      <path d="M136 12 C 142 8 144 12 136 12" opacity="0.7" />
      <circle cx="92" cy="12" r="1.8" fill={color} stroke="none" />
      <circle cx="148" cy="12" r="1.8" fill={color} stroke="none" />
    </svg>
  );
}

/** Nœud de ruban fin et symétrique (gravure papeterie). */
export function VintageRibbon({ width = 120, height, ...p }: OrnamentProps) {
  const { color, opacity, sw } = base(p);
  return (
    <svg viewBox="0 0 200 100" width={width} height={height} aria-hidden style={p.style} className={p.className}
      fill="none" stroke={color} strokeWidth={sw} opacity={opacity} strokeLinecap="round" strokeLinejoin="round">
      {/* Boucle gauche (double trait pour le volume du ruban) */}
      <path d="M98 30 C 70 8 38 8 24 26 C 36 30 52 30 64 26 C 50 36 42 48 46 62 C 62 48 82 40 98 36" />
      <path d="M98 33 C 74 18 48 18 34 30" opacity="0.55" />
      {/* Boucle droite (miroir) */}
      <path d="M102 30 C 130 8 162 8 176 26 C 164 30 148 30 136 26 C 150 36 158 48 154 62 C 138 48 118 40 102 36" />
      <path d="M102 33 C 126 18 152 18 166 30" opacity="0.55" />
      {/* Nœud central */}
      <ellipse cx="100" cy="31" rx="6" ry="8" />
      <path d="M100 24 C 95 27 95 35 100 38 C 105 35 105 27 100 24 Z" fill={color} stroke="none" opacity="0.85" />
      {/* Pan gauche ondulant */}
      <path d="M96 39 C 86 58 80 78 66 92 C 78 82 86 72 94 60" />
      <path d="M66 92 C 70 86 72 80 73 74" opacity="0.7" />
      {/* Pan droit ondulant */}
      <path d="M104 39 C 114 58 120 78 134 92 C 122 82 114 72 106 60" />
      <path d="M134 92 C 130 86 128 80 127 74" opacity="0.7" />
    </svg>
  );
}

/** Ornement d'angle (placer dans les 4 coins d'une carte). */
export function VintageCorner({ width = 56, height = 56, ...p }: OrnamentProps) {
  const { color, opacity, sw } = base(p);
  return (
    <svg viewBox="0 0 60 60" width={width} height={height} aria-hidden style={p.style} className={p.className}
      fill="none" stroke={color} strokeWidth={sw} opacity={opacity} strokeLinecap="round">
      <path d="M8 8 L 8 30 M8 8 L 30 8" opacity="0.6" />
      <path d="M8 8 C 22 10 30 18 32 32" />
      <path d="M20 12 C 22 18 20 22 16 24" fill={color} stroke="none" opacity="0.85" />
      <path d="M12 20 C 18 22 22 20 24 16" fill={color} stroke="none" opacity="0.85" />
      <circle cx="32" cy="32" r="2" fill={color} stroke="none" />
    </svg>
  );
}

/** Branche de feuillage isolée. */
export function VintageLeaves({ width = 90, height, ...p }: OrnamentProps) {
  const { color, opacity, sw } = base(p);
  return (
    <svg viewBox="0 0 120 40" width={width} height={height} aria-hidden style={p.style} className={p.className}
      fill="none" stroke={color} strokeWidth={sw} opacity={opacity} strokeLinecap="round">
      <path d="M6 20 C 40 20 80 20 114 20" opacity="0.5" />
      {[18, 40, 62, 84].map((x, i) => (
        <g key={i}>
          <path d={`M${x} 20 C ${x - 8} 10 ${x - 14} 8 ${x - 18} 12 C ${x - 14} 16 ${x - 8} 18 ${x} 20 Z`} fill={color} stroke="none" opacity="0.8" />
          <path d={`M${x + 8} 20 C ${x + 16} 30 ${x + 22} 32 ${x + 26} 28 C ${x + 22} 24 ${x + 16} 22 ${x + 8} 20 Z`} fill={color} stroke="none" opacity="0.8" />
        </g>
      ))}
      <circle cx="114" cy="20" r="2" fill={color} stroke="none" />
    </svg>
  );
}

/** Sceau circulaire (cadre pour monogramme / logo footer). */
export function VintageCircleBorder({ width = 90, height = 90, ...p }: OrnamentProps) {
  const { color, opacity, sw } = base(p);
  return (
    <svg viewBox="0 0 100 100" width={width} height={height} aria-hidden style={p.style} className={p.className}
      fill="none" stroke={color} strokeWidth={sw} opacity={opacity}>
      <circle cx="50" cy="50" r="44" />
      <circle cx="50" cy="50" r="38" opacity="0.5" strokeDasharray="1 4" />
      {/* petites feuilles cardinales */}
      {[0, 90, 180, 270].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 50 50)`}>
          <path d="M50 6 C 46 10 46 14 50 16 C 54 14 54 10 50 6 Z" fill={color} stroke="none" />
        </g>
      ))}
    </svg>
  );
}

/** Grappe florale / rinceaux symétriques (haut ou bas de section). */
export function VintageFloralDecoration({ width = 160, height, ...p }: OrnamentProps) {
  const { color, opacity, sw } = base(p);
  return (
    <svg viewBox="0 0 200 70" width={width} height={height} aria-hidden style={p.style} className={p.className}
      fill="none" stroke={color} strokeWidth={sw} opacity={opacity} strokeLinecap="round">
      {/* Tige centrale + fleur */}
      <path d="M100 64 L 100 26" opacity="0.7" />
      <circle cx="100" cy="20" r="6" fill="none" />
      <circle cx="100" cy="20" r="2" fill={color} stroke="none" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse key={deg} cx="100" cy="10" rx="3.4" ry="6" fill={color} stroke="none" opacity="0.55"
          transform={`rotate(${deg} 100 20)`} />
      ))}
      {/* Rinceaux gauche */}
      <path d="M100 50 C 78 50 64 42 56 28 C 52 36 54 44 60 50" />
      <path d="M70 44 C 62 40 58 44 60 50" fill={color} stroke="none" opacity="0.8" />
      <path d="M84 50 C 78 44 76 48 78 54" fill={color} stroke="none" opacity="0.8" />
      {/* Rinceaux droite (miroir) */}
      <path d="M100 50 C 122 50 136 42 144 28 C 148 36 146 44 140 50" />
      <path d="M130 44 C 138 40 142 44 140 50" fill={color} stroke="none" opacity="0.8" />
      <path d="M116 50 C 122 44 124 48 122 54" fill={color} stroke="none" opacity="0.8" />
    </svg>
  );
}

/**
 * Rinceau d'acanthe baroque — feuillage gravé vertical à placer de part et
 * d'autre de la carte ovale (façon papeterie ancienne). Orienté côté gauche ;
 * passer `flip` pour le miroir droit.
 */
export function VintageAcanthus({ width = 175, height, flip = false, ...p }: OrnamentProps & { flip?: boolean }) {
  const { color, sw } = base(p);
  const op = p.opacity ?? 0.9;

  // Une fronde d'acanthe allongée et recourbée (base à l'origine, pointe en haut,
  // dentelures à droite). 2 couches : aplat (lavis) + contour gravé + nervure.
  const BLADE =
    'M0,0 C -9,-30 -1,-64 24,-88 C 15,-68 15,-52 25,-44 C 11,-55 2,-46 7,-29 C -2,-45 -12,-34 -7,-15 C -9,-7 -5,-2 0,0 Z';
  const Leaf = ({ t, f = 0.22, s = 0.5 }: { t: string; f?: number; s?: number }) => (
    <g transform={t}>
      <path d={BLADE} fill={color} stroke="none" opacity={f} />
      <path d={BLADE} fill="none" stroke={color} strokeWidth={sw} opacity={s} />
      <path d="M-1,-3 C -6,-26 -3,-56 -3,-80" fill="none" stroke={color} strokeWidth={sw * 0.8} opacity={s * 0.7} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 200 900"
      width={width}
      height={height}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
      style={{ transform: flip ? 'scaleX(-1)' : undefined, ...(p.style ?? {}) }}
      className={p.className}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={op}
    >
      {/* Tige maîtresse ondulante */}
      <path
        d="M150,28 C 86,140 122,250 66,352 C 116,452 78,560 132,662 C 92,762 122,842 150,884"
        fill="none"
        stroke={color}
        strokeWidth={sw}
        opacity={0.4}
      />

      {/* Bouquet HAUT — s'enroule densément sur l'angle supérieur */}
      <Leaf t="translate(152,66) rotate(38) scale(1.9)" f={0.24} s={0.58} />
      <Leaf t="translate(128,80) rotate(8) scale(1.6)" f={0.22} s={0.52} />
      <Leaf t="translate(108,108) rotate(-26) scale(1.45)" f={0.2} s={0.5} />
      <Leaf t="translate(92,156) rotate(-64) scale(1.3)" f={0.18} s={0.48} />
      <Leaf t="translate(150,140) rotate(92) scale(1.25)" f={0.16} s={0.45} />
      <Leaf t="translate(124,205) rotate(-100) scale(1.05)" f={0.14} s={0.4} />

      {/* Bouquet HAUT-MÉDIAN */}
      <Leaf t="translate(80,322) rotate(-30) scale(1.7)" f={0.22} s={0.54} />
      <Leaf t="translate(70,288) rotate(18) scale(1.45)" f={0.2} s={0.5} />
      <Leaf t="translate(96,270) rotate(48) scale(1.2)" f={0.17} s={0.46} />
      <Leaf t="translate(112,372) rotate(120) scale(1.15)" f={0.15} s={0.42} />

      {/* Bouquet MÉDIAN */}
      <Leaf t="translate(134,556) rotate(34) scale(1.75)" f={0.22} s={0.54} />
      <Leaf t="translate(154,532) rotate(78) scale(1.4)" f={0.2} s={0.5} />
      <Leaf t="translate(128,512) rotate(6) scale(1.2)" f={0.17} s={0.46} />
      <Leaf t="translate(104,604) rotate(-34) scale(1.2)" f={0.15} s={0.42} />

      {/* Bouquet BAS — s'enroule sous l'angle inférieur */}
      <Leaf t="translate(152,792) rotate(150) scale(1.85)" f={0.22} s={0.54} />
      <Leaf t="translate(126,820) rotate(-168) scale(1.55)" f={0.2} s={0.5} />
      <Leaf t="translate(150,716) rotate(118) scale(1.3)" f={0.17} s={0.46} />
      <Leaf t="translate(96,758) rotate(-104) scale(1.25)" f={0.16} s={0.44} />
      <Leaf t="translate(118,872) rotate(196) scale(1.1)" f={0.14} s={0.4} />

      {/* Bourgeons / baies */}
      <circle cx="150" cy="26" r="2.6" fill={color} opacity={0.5} />
      <circle cx="66" cy="352" r="2.6" fill={color} opacity={0.5} />
      <circle cx="150" cy="884" r="2.6" fill={color} opacity={0.5} />
    </svg>
  );
}

/**
 * VintageDamaskField — fond floral baroque DENSE et tileable (bleu sur ivoire).
 * Remplit toute la zone (façon papier peint damassé) : fleurs de chrysanthème +
 * rinceaux d'acanthe, motif sans couture qui ne laisse aucun espace vide.
 */
export function VintageDamaskField({
  soft,
  deep,
  style,
}: {
  soft: string;
  deep: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/[:]/g, '');
  const patId = `vdamask-${uid}`;
  const TILE_W = 300;
  const TILE_H = 380;

  // Fleur de chrysanthème : 2 couronnes de pétales + cœur
  const flower = (cx: number, cy: number, s: number, keyP: string) => {
    const out: JSX.Element[] = [];
    const ringOuter = 18;
    const ringInner = 14;
    for (let i = 0; i < ringOuter; i++) {
      const a = (360 / ringOuter) * i;
      out.push(
        <ellipse key={`${keyP}o${i}`} cx={cx} cy={cy - 32 * s} rx={8 * s} ry={20 * s}
          fill={soft} fillOpacity={0.34} stroke={deep} strokeOpacity={0.42} strokeWidth={1}
          transform={`rotate(${a} ${cx} ${cy})`} />,
      );
    }
    for (let i = 0; i < ringInner; i++) {
      const a = (360 / ringInner) * i + (360 / ringInner) / 2;
      out.push(
        <ellipse key={`${keyP}i${i}`} cx={cx} cy={cy - 17 * s} rx={6 * s} ry={13 * s}
          fill={soft} fillOpacity={0.46} stroke={deep} strokeOpacity={0.38} strokeWidth={0.9}
          transform={`rotate(${a} ${cx} ${cy})`} />,
      );
    }
    out.push(<circle key={`${keyP}c`} cx={cx} cy={cy} r={7.5 * s} fill={deep} fillOpacity={0.55} />);
    out.push(<circle key={`${keyP}c2`} cx={cx} cy={cy} r={3.5 * s} fill={soft} />);
    return <g key={keyP}>{out}</g>;
  };

  // Fronde d'acanthe (remplit les diagonales entre les fleurs)
  const BLADE =
    'M0,0 C -9,-30 -1,-64 24,-88 C 15,-68 15,-52 25,-44 C 11,-55 2,-46 7,-29 C -2,-45 -12,-34 -7,-15 C -9,-7 -5,-2 0,0 Z';
  const leaf = (t: string, k: string) => (
    <g key={k} transform={t}>
      <path d={BLADE} fill={soft} fillOpacity={0.28} stroke={deep} strokeOpacity={0.42} strokeWidth={1.1} />
      <path d="M-1,-3 C -6,-26 -3,-56 -3,-80" fill="none" stroke={deep} strokeOpacity={0.32} strokeWidth={0.8} />
    </g>
  );

  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      style={{ position: 'absolute', inset: 0, ...style }}
    >
      <defs>
        <pattern id={patId} width={TILE_W} height={TILE_H} patternUnits="userSpaceOnUse">
          {/* Fleur centrale (grande) */}
          {flower(TILE_W / 2, TILE_H / 2, 1.6, 'c')}
          {/* Fleurs aux 4 coins → raccord sans couture en damier */}
          {flower(0, 0, 1.2, 'tl')}
          {flower(TILE_W, 0, 1.2, 'tr')}
          {flower(0, TILE_H, 1.2, 'bl')}
          {flower(TILE_W, TILE_H, 1.2, 'br')}
          {/* Petites fleurs au milieu des bords */}
          {flower(TILE_W / 2, 0, 0.75, 'tm')}
          {flower(TILE_W / 2, TILE_H, 0.75, 'bm')}
          {flower(0, TILE_H / 2, 0.75, 'lm')}
          {flower(TILE_W, TILE_H / 2, 0.75, 'rm')}
          {/* Acanthes baroques pour combler les vides (8 frondes) */}
          {leaf(`translate(${TILE_W * 0.28},${TILE_H * 0.30}) rotate(135) scale(1.7)`, 'L1')}
          {leaf(`translate(${TILE_W * 0.72},${TILE_H * 0.30}) rotate(-135) scale(1.7)`, 'L2')}
          {leaf(`translate(${TILE_W * 0.28},${TILE_H * 0.70}) rotate(45) scale(1.7)`, 'L3')}
          {leaf(`translate(${TILE_W * 0.72},${TILE_H * 0.70}) rotate(-45) scale(1.7)`, 'L4')}
          {leaf(`translate(${TILE_W * 0.5},${TILE_H * 0.30}) rotate(180) scale(1.3)`, 'L5')}
          {leaf(`translate(${TILE_W * 0.5},${TILE_H * 0.70}) rotate(0) scale(1.3)`, 'L6')}
          {leaf(`translate(${TILE_W * 0.30},${TILE_H * 0.5}) rotate(90) scale(1.3)`, 'L7')}
          {leaf(`translate(${TILE_W * 0.70},${TILE_H * 0.5}) rotate(-90) scale(1.3)`, 'L8')}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patId})`} />
    </svg>
  );
}

export const VintageOrnaments = {
  FrameTop: VintageFrameTop,
  FrameBottom: VintageFrameBottom,
  Divider: VintageDivider,
  Ribbon: VintageRibbon,
  Corner: VintageCorner,
  Leaves: VintageLeaves,
  CircleBorder: VintageCircleBorder,
  FloralDecoration: VintageFloralDecoration,
  Acanthus: VintageAcanthus,
  DamaskField: VintageDamaskField,
};
