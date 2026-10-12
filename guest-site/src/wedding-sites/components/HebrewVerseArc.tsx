/**
 * HebrewVerseArc — פסוק hébraïque disposé en arc, partagé par tous les thèmes.
 *
 * Chaque caractère est positionné et incliné individuellement le long d'une
 * ellipse (ordre de lecture droite → gauche), plutôt qu'un `<textPath>` SVG :
 * `textPath` + RTL + `textLength` écrase les glyphes de façon imprévisible
 * selon le navigateur (testé sur Voile Ivoire/Universal), ce qui donnait un
 * verset mal aligné ou tronqué selon l'appareil.
 *
 * Les lettres (avec leur niqqoud) sont espacées selon leur chasse réelle
 * approximative et réparties à pas constant le long de la courbe (abscisse
 * curviligne), pour que les mots restent lisibles et régulièrement espacés.
 * La taille de police est calculée pour que le verset tienne dans
 * `maxSpread` radians, quelle que soit sa longueur. Si même la
 * police minimale lisible ne suffit plus à éviter le chevauchement (texte
 * extrême), on abandonne l'arc pour une ligne centrée classique — jamais
 * tronqué, jamais superposé.
 */
import type { CSSProperties } from 'react';

/**
 * Découpe le verset en grappes « lettre + niqqoud/téamim » (U+0591–U+05C7) :
 * les points-voyelles restent attachés à leur lettre au lieu d'être placés
 * (et tournés) comme des caractères à part.
 */
function toClusters(text: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(text)) {
    if (/[\u0591-\u05C7]/.test(ch) && out.length && out[out.length - 1] !== ' ') out[out.length - 1] += ch;
    else if (!/[\u0591-\u05C7]/.test(ch)) out.push(ch);
  }
  return out;
}

/**
 * Chasse approximative de chaque lettre (en em, police serif hébraïque) :
 * les lettres étroites (י ו ן) prennent moins de place que מ ש א…, sinon
 * le verset paraît « troué » et les mots ne se distinguent plus.
 */
const NARROW = new Set(['י', 'ו', 'ן', '׳', "'", '.', ',']);
const MEDIUM = new Set(['ג', 'ז', 'נ']);
function advanceEm(cluster: string): number {
  const base = cluster[0];
  if (base === ' ') return 0.34;
  if (NARROW.has(base)) return 0.3;
  if (MEDIUM.has(base)) return 0.42;
  if (base === 'ר' || base === 'ד' || base === 'ך') return 0.54;
  return 0.6;
}
/** Interlettrage léger ajouté entre deux grappes (em). */
const TRACKING_EM = 0.05;

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
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return null;

  const clusters = toClusters(clean);
  const arcRx = rx ?? width / 2 - 24;
  const halfMax = maxSpread / 2;

  // Longueur d'arc cumulée de l'ellipse, échantillonnée de φ = 0 à halfMax.
  // Sur une ellipse aplatie (rx ≫ ry) un pas d'angle constant ne donne PAS un
  // pas de longueur constant : on place donc les lettres en abscisse curviligne.
  const STEPS = 400;
  const arcLen: number[] = [0];
  for (let k = 1; k <= STEPS; k++) {
    const p = (halfMax * (k - 0.5)) / STEPS;
    const ds = Math.hypot(arcRx * Math.cos(p), ry * Math.sin(p)) * (halfMax / STEPS);
    arcLen.push(arcLen[k - 1] + ds);
  }
  /** Angle φ ≥ 0 tel que la longueur d'arc de 0 à φ vaille s. */
  const phiAt = (s: number) => {
    const sign = s < 0 ? -1 : 1;
    const a = Math.abs(s);
    let k = 1;
    while (k < STEPS && arcLen[k] < a) k++;
    const t = (a - arcLen[k - 1]) / Math.max(1e-6, arcLen[k] - arcLen[k - 1]);
    return sign * ((k - 1 + Math.min(1, t)) * halfMax) / STEPS;
  };

  // Largeur totale du verset (en em) : chasse de chaque grappe + interlettrage.
  const advances = clusters.map(advanceEm);
  const totalEm = advances.reduce((a, b) => a + b, 0) + TRACKING_EM * Math.max(0, clusters.length - 1);

  // Taille de police qui fait tenir le verset dans l'étalement maximal.
  const fsForSpread = (2 * arcLen[STEPS]) / totalEm;
  const fs = Math.min(maxFontSize, Math.max(minFontSize, fsForSpread));
  const halfLen = Math.min(arcLen[STEPS], (totalEm * fs) / 2);
  const spread = 2 * phiAt(halfLen);

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
  // Points ornementaux un peu au-delà de la 1re et de la dernière lettre
  const dotPhi = phiAt(halfLen + fs * 0.45);

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
            cx={cx - arcRx * Math.sin(dotPhi)}
            cy={cy - ry * Math.cos(dotPhi) - fs * 0.3}
            r="2.5"
            fill={dotColor}
            opacity="0.6"
          />
          <circle
            cx={cx + arcRx * Math.sin(dotPhi)}
            cy={cy - ry * Math.cos(dotPhi) - fs * 0.3}
            r="2.5"
            fill={dotColor}
            opacity="0.6"
          />
        </>
      ) : null}
      {(() => {
        // RTL : la 1re grappe démarre à droite (+halfLen) et l'on avance vers la gauche.
        let cursor = halfLen;
        return clusters.map((cl, i) => {
          const adv = advances[i] * fs;
          const mid = cursor - adv / 2;
          cursor -= adv + TRACKING_EM * fs;
          if (cl === ' ') return null; // l'espace garde sa place, rien à dessiner
          const phi = phiAt(mid);
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
              {cl}
            </text>
          );
        });
      })()}
    </svg>
  );
}
