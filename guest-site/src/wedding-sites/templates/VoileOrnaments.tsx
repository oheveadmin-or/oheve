/**
 * VoileOrnaments — décors SVG du modèle « Voile Ivoire ».
 *
 * Ornements filigranes dorés dessinés en SVG (aucune image PNG) et pilotés
 * par `currentColor` → la couleur accent du thème. Utilisés pour encadrer les
 * cartes (coins) et séparer les blocs (filet ornemental central).
 */
import type { CSSProperties } from 'react';

type OrnProps = { color?: string; size?: number; style?: CSSProperties };

/**
 * Coin filigrane (orienté haut-gauche). On le fait pivoter via `transform`
 * pour couvrir les quatre coins d'une carte.
 */
export function VoileCorner({ color, size = 58, style }: OrnProps) {
  // Grappe filigrane baroque : rosette centrale + volutes d'acanthe qui
  // courent le long des deux bords, feuilles et pistils — comme sur le
  // faire-part de référence.
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      style={{ color: color ?? 'currentColor', display: 'block', ...style }}
    >
      {/* Volute le long du bord supérieur */}
      <path
        d="M34 20 C48 9 66 9 73 15 C79 21 76 30 68 29 C62 28 60 21 66 18"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M73 15 C81 18 88 17 94 13"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Volute le long du bord gauche (symétrique) */}
      <path
        d="M20 34 C9 48 9 66 15 73 C21 79 30 76 29 68 C28 62 21 60 18 66"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M15 73 C18 81 17 88 13 94"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Rosette centrale (6 pétales ombrés) */}
      <g transform="translate(28 28)">
        {petals.map((a) => (
          <path
            key={a}
            d="M0 0 C-2.6 -5.5 -1.8 -11 0 -12.5 C1.8 -11 2.6 -5.5 0 0Z"
            transform={`rotate(${a})`}
            fill="currentColor"
            opacity="0.32"
            stroke="currentColor"
            strokeWidth="0.7"
          />
        ))}
        <circle r="2.1" fill="currentColor" opacity="0.9" />
      </g>
      {/* Feuilles secondaires vers l'intérieur */}
      <path
        d="M40 33 C48 28 55 30 59 37 C52 40 44 39 40 33Z"
        fill="currentColor"
        opacity="0.22"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <path
        d="M33 40 C28 48 30 55 37 59 C40 52 39 44 33 40Z"
        fill="currentColor"
        opacity="0.22"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      {/* Brins et pistils */}
      <path
        d="M46 42 C54 44 58 50 58 57"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M42 46 C44 54 50 58 57 58"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="58" cy="57" r="1.4" fill="currentColor" opacity="0.75" />
      <circle cx="84" cy="17" r="1.2" fill="currentColor" opacity="0.6" />
      <circle cx="17" cy="84" r="1.2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/** Encadre un contenu avec les 4 coins filigranes + un liseré double. */
export function VoileFrame({
  color,
  cornerSize = 54,
  inset = 12,
  children,
  style,
}: {
  color?: string;
  cornerSize?: number;
  inset?: number;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  const c = color ?? 'currentColor';
  const corner: CSSProperties = { position: 'absolute', color: c, pointerEvents: 'none' };
  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Double liseré (deux filets parallèles, comme la référence) */}
      <div
        style={{
          position: 'absolute',
          inset,
          border: `1px solid ${typeof c === 'string' ? c : 'currentColor'}`,
          opacity: 0.5,
          borderRadius: 4,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: inset + 4,
          border: `1px solid ${typeof c === 'string' ? c : 'currentColor'}`,
          opacity: 0.28,
          borderRadius: 3,
          pointerEvents: 'none',
        }}
      />
      {/* Coins */}
      <VoileCorner color={c} size={cornerSize} style={{ ...corner, top: inset - 6, left: inset - 6 }} />
      <VoileCorner
        color={c}
        size={cornerSize}
        style={{ ...corner, top: inset - 6, right: inset - 6, transform: 'scaleX(-1)' }}
      />
      <VoileCorner
        color={c}
        size={cornerSize}
        style={{ ...corner, bottom: inset - 6, left: inset - 6, transform: 'scaleY(-1)' }}
      />
      <VoileCorner
        color={c}
        size={cornerSize}
        style={{ ...corner, bottom: inset - 6, right: inset - 6, transform: 'scale(-1, -1)' }}
      />
      {children}
    </div>
  );
}

/** Filet ornemental central : deux volutes affrontées autour d'un losange. */
export function VoileDivider({ color, width = 200, style }: { color?: string; width?: number; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 220 24"
      width={width}
      height={Math.round((width * 24) / 220)}
      fill="none"
      aria-hidden
      style={{ color: color ?? 'currentColor', display: 'block', margin: '0 auto', maxWidth: '82%', ...style }}
    >
      <path d="M8 12h74" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      <path d="M138 12h74" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      <path
        d="M82 12c8 0 12-5 12-5s2 5 8 5c-6 0-8 5-8 5s-4-5-12-5z"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.85"
      />
      <path
        d="M138 12c-8 0-12-5-12-5s-2 5-8 5c6 0 8 5 8 5s4-5 12-5z"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.85"
      />
      <path d="M110 6l4 6-4 6-4-6 4-6z" stroke="currentColor" strokeWidth="0.9" opacity="0.95" />
      <circle cx="110" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Petit motif « cœur / croix » utilisé pour les puces oui/non du RSVP. */
export function VoileHeart({ color, size = 26, style }: OrnProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden style={{ color: color ?? 'currentColor', display: 'block', ...style }}>
      <path
        d="M16 27S4 19.5 4 11.5C4 7.4 7 5 10.2 5c2.4 0 4.4 1.4 5.8 3.5C17.4 6.4 19.4 5 21.8 5 25 5 28 7.4 28 11.5 28 19.5 16 27 16 27z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}
