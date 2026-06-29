/**
 * EditorialCardIcons — petites décorations SVG choisissables par le client.
 *
 * Aucune décoration n'est inline dans le template : on passe par ce registre.
 * Pour ajouter une icône : créer le composant + l'enregistrer dans EDITORIAL_ICONS.
 * Toutes les icônes héritent de `currentColor` (donc pilotées par le thème).
 */
import type { CSSProperties } from 'react';

export type EditorialIconKey = 'rings' | 'flower' | 'butterfly' | 'star' | 'leaf' | 'none';

type IconProps = { size?: number; color?: string; style?: CSSProperties };

function wrap(size: number, color: string | undefined, style: CSSProperties | undefined) {
  return {
    width: size,
    height: size,
    color: color ?? 'currentColor',
    display: 'block',
    ...style,
  } as CSSProperties;
}

export function RingsIcon({ size = 28, color, style }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" style={wrap(size, color, style)} aria-hidden>
      <circle cx="18" cy="28" r="11" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="30" cy="28" r="11" stroke="currentColor" strokeWidth="1.6" />
      <path d="M30 17l-3 4h6l-3-4z" fill="currentColor" />
    </svg>
  );
}

export function FlowerIcon({ size = 28, color, style }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" style={wrap(size, color, style)} aria-hidden>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={a}
          cx="24"
          cy="14"
          rx="5"
          ry="10"
          stroke="currentColor"
          strokeWidth="1.4"
          transform={`rotate(${a} 24 24)`}
        />
      ))}
      <circle cx="24" cy="24" r="3" fill="currentColor" />
    </svg>
  );
}

export function ButterflyIcon({ size = 28, color, style }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" style={wrap(size, color, style)} aria-hidden>
      <path d="M24 24c-4-9-10-12-15-9-4 2-4 9 0 12 4 3 11 2 15-3z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M24 24c4-9 10-12 15-9 4 2 4 9 0 12-4 3-11 2-15-3z" stroke="currentColor" strokeWidth="1.4" />
      <line x1="24" y1="16" x2="24" y2="34" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function StarIcon({ size = 24, color, style }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" style={wrap(size, color, style)} aria-hidden>
      <path
        d="M24 6l4.5 13.5H42l-11 8.4 4.2 13.6L24 33.6 12.8 41.5 17 27.9 6 19.5h13.5L24 6z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LeafIcon({ size = 26, color, style }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" style={wrap(size, color, style)} aria-hidden>
      <path d="M24 6C12 14 10 30 24 42 38 30 36 14 24 6z" stroke="currentColor" strokeWidth="1.4" />
      <line x1="24" y1="10" x2="24" y2="40" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export const EDITORIAL_ICONS: Record<Exclude<EditorialIconKey, 'none'>, (p: IconProps) => JSX.Element> = {
  rings: RingsIcon,
  flower: FlowerIcon,
  butterfly: ButterflyIcon,
  star: StarIcon,
  leaf: LeafIcon,
};

/** Rendu d'une icône par clé (renvoie null pour 'none' ou clé inconnue) */
export function EditorialIcon({ name, ...props }: { name?: EditorialIconKey } & IconProps) {
  if (!name || name === 'none') return null;
  const Cmp = EDITORIAL_ICONS[name];
  return Cmp ? <Cmp {...props} /> : null;
}

/**
 * Séparateur fin entièrement CSS/SVG : filet — icône — filet.
 * Aucune image PNG.
 */
export function EditorialDivider({
  icon = 'star',
  color,
  width = 180,
  style,
}: {
  icon?: EditorialIconKey;
  color?: string;
  width?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width,
        maxWidth: '80%',
        margin: '0 auto',
        color: color ?? 'currentColor',
        ...style,
      }}
      aria-hidden
    >
      <span style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.4 }} />
      <EditorialIcon name={icon} size={20} />
      <span style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.4 }} />
    </div>
  );
}
