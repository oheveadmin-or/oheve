/**
 * HebrewVerseArc — פסוק hébraïque disposé en arc, partagé par tous les thèmes.
 *
 * Chaque caractère est positionné et incliné individuellement le long d'une
 * ellipse (ordre de lecture droite → gauche), plutôt qu'un `<textPath>` SVG :
 * `textPath` + RTL + `textLength` écrase les glyphes de façon imprévisible
 * selon le navigateur (testé sur Voile Ivoire/Universal), ce qui donnait un
 * verset mal aligné ou tronqué selon l'appareil.
 *
 * La taille de police n'est PAS choisie indépendamment de l'étalement
 * angulaire : elle est calculée pour que `n` glyphes tiennent exactement
 * dans `maxSpread` radians, sans jamais se chevaucher, quelle que soit la
 * longueur (ou la densité, verset sans espaces) du texte saisi. Si même la
 * police minimale lisible ne suffit plus à éviter le chevauchement (texte
 * extrême), on abandonne l'arc pour une ligne centrée classique — jamais
 * tronqué, jamais superposé.
 */
import type { CSSProperties } from 'react';

function stripNikud(text: string): string {
  // Retire les téamim/niqqoud (points-voyelles et cantillation U+0591–U+05C7)
  return text.replace(/[֑-ׇ]/g, '');
}

export type HebrewVerseArcProps = {
  text: string;
  color: string;
  font?: string;
  /** Largeur totale de l'arc, en unités SVG */
  width?: number;
  /** Rayons de l'ellipse qui dessine la courbe (rx = étalement horizontal, ry = hauteur de l'arc) */
  rx?: number;
  ry?: number;
  /** Bornes de taille de police (px) — le verset s'y adapte selon sa longueur */
  maxFontSize?: number;
  minFontSize?: number;
  /** Étalement angulaire maximal de l'arc, en radians (~2.2 ≈ 126°) */
  maxSpread?: number;
  /** Petits points ornementaux aux deux extrémités de l'arc */
  dotColor?: string;
  /**
   * Ordonnée du centre de l'ellipse dans le repère SVG. Permet de caler l'arc
   * sur une forme existante (ex. le cintre d'une carte). Défaut : arc collé en
   * haut du SVG.
   */
  centerY?: number;
  /**
   * Hauteur réservée dans le flux, en unités SVG. Le reste du dessin déborde
   * (`overflow: visible`) : le contenu qui suit peut ainsi se nicher dans le
   * creux de l'arc. Défaut : toute la hauteur du dessin.
   */
  layoutHeight?: number;
  /** Styles propres au repli « ligne centrée » (texte trop long pour l'arc) */
  fallbackStyle?: CSSProperties;
  opacity?: number;
  style?: CSSProperties;
};

/** Avance angulaire moyenne d'un glyphe hébreu, en fraction de son corps de police, sur le rayon moyen. */
const GLYPH_PACK_FACTOR = 0.62;

export function HebrewVerseArc({
  text,
  color,
  font = "'Frank Ruhl Libre', 'Noto Serif Hebrew', 'SBL Hebrew', serif",
  width = 280,
  rx,
  ry = 108,
  maxFontSize = 15,
  minFontSize = 10.5,
  maxSpread = 2.0,
  dotColor,
  centerY,
  layoutHeight,
  fallbackStyle,
  opacity = 0.9,
  style,
}: HebrewVerseArcProps) {
  const clean = stripNikud(text).trim();
  if (!clean) return null;

  const chars = Array.from(clean);
  const n = chars.length;
  const arcRx = rx ?? width / 2 - 24;
  const gaps = Math.max(1, n - 1);

  // Rayon de courbure local au bout de l'arc (φ = maxSpread/2) — c'est là,
  // pas au centre, que les glyphes sont le plus serrés sur une ellipse
  // aplatie (arcRx ≫ ry) : le rayon effectif y chute vers ry. En dérivant
  // la police sur ce pire cas (plutôt qu'une moyenne rx/ry), l'espacement
  // réel reste ≥ au budget partout sur l'arc, jamais seulement « en moyenne ».
  const halfSpread = maxSpread / 2;
  const rPack = Math.sqrt(
    (arcRx * Math.cos(halfSpread)) ** 2 + (ry * Math.sin(halfSpread)) ** 2
  );

  // Taille de police qui fait tenir PILE les n glyphes dans maxSpread radians —
  // dérivée de l'angle disponible, jamais choisie indépendamment de lui.
  const fsForSpread = (maxSpread * rPack) / (gaps * GLYPH_PACK_FACTOR);
  const fs = Math.min(maxFontSize, Math.max(minFontSize, fsForSpread));
  // Même base (gaps, rPack) que fsForSpread : par construction, fs <= fsForSpread
  // garantit spread <= maxSpread, donc jamais de chevauchement résiduel.
  const spread = Math.min(maxSpread, (gaps * fs * GLYPH_PACK_FACTOR) / rPack);

  // Même à la police minimale, le texte est trop dense pour tenir sans se
  // chevaucher : on renonce à l'arc plutôt que de superposer des lettres.
  if (fsForSpread < minFontSize) {
    return (
      <p
        dir="rtl"
        aria-label={clean}
        style={{
          textAlign: 'center',
          fontFamily: font,
          fontSize: `${minFontSize}px`,
          color,
          opacity,
          margin: 0,
          maxWidth: '100%',
          overflowWrap: 'break-word',
          ...style,
          ...fallbackStyle,
        }}
      >
        {clean}
      </p>
    );
  }

  const cx = width / 2;
  const cy = centerY ?? ry + fs + 6;
  const h = Math.ceil(cy - ry * Math.cos(spread / 2) + fs * 0.9);
  const boxH = layoutHeight ?? h;

  return (
    <svg
      width={width}
      height={boxH}
      viewBox={`0 0 ${width} ${boxH}`}
      aria-label={clean}
      role="img"
      style={{ display: 'block', margin: '0 auto', maxWidth: '100%', overflow: 'visible', ...style }}
    >
      {dotColor ? (
        <>
          <circle
            cx={cx - arcRx * Math.sin(spread / 2)}
            cy={cy - ry * Math.cos(spread / 2)}
            r="2.5"
            fill={dotColor}
            opacity="0.6"
          />
          <circle
            cx={cx + arcRx * Math.sin(spread / 2)}
            cy={cy - ry * Math.cos(spread / 2)}
            r="2.5"
            fill={dotColor}
            opacity="0.6"
          />
        </>
      ) : null}
      {chars.map((ch, i) => {
        if (ch === ' ') return null; // l'espace garde son créneau, rien à dessiner
        // RTL : 1er caractère à droite (+spread/2) → dernier à gauche (−spread/2)
        const phi = n === 1 ? 0 : spread / 2 - (i * spread) / (n - 1);
        const x = cx + arcRx * Math.sin(phi);
        const y = cy - ry * Math.cos(phi);
        // Inclinaison = tangente de l'ellipse au point (et non l'angle polaire)
        const rot = (Math.atan2(ry * Math.sin(phi), arcRx * Math.cos(phi)) * 180) / Math.PI;
        return (
          <text
            key={i}
            x={x}
            y={y}
            fill={color}
            transform={`rotate(${rot.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
            style={{ fontFamily: font, fontSize: `${fs}px`, opacity, textAnchor: 'middle' }}
          >
            {ch}
          </text>
        );
      })}
    </svg>
  );
}
