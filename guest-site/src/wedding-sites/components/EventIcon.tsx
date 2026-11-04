/**
 * Icônes au trait des événements du mariage (même style que les onglets de
 * l'Invitation animée) — remplacent les emojis (🕌 pour le Chabbat Hatan…).
 */
import type { JewishWeddingEvent } from '../types';

export type EventIconKind = JewishWeddingEvent['type'] | 'main' | 'answers' | 'star';

const CHUPPAH = 'M4.5 21V9M19.5 21V9M2.5 9c3-4.5 16-4.5 19 0M4.5 9h15M2.5 21h4M17.5 21h4';
const SPARKLE = 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z';

export const EVENT_ICON_PATHS: Record<EventIconKind, string> = {
  // Mairie : fronton à colonnes
  mairie: 'M3 21h18M5 21V10.5M19 21V10.5M9 21v-6.5M15 21v-6.5M3 10.5 12 4l9 6.5z',
  // Henné : fleur à six pétales ronds
  henne: 'M9.10 6.80a2.9 2.9 0 1 0 5.80 0a2.9 2.9 0 1 0 -5.80 0zM13.60 9.40a2.9 2.9 0 1 0 5.80 0a2.9 2.9 0 1 0 -5.80 0zM13.60 14.60a2.9 2.9 0 1 0 5.80 0a2.9 2.9 0 1 0 -5.80 0zM9.10 17.20a2.9 2.9 0 1 0 5.80 0a2.9 2.9 0 1 0 -5.80 0zM4.60 14.60a2.9 2.9 0 1 0 5.80 0a2.9 2.9 0 1 0 -5.80 0zM4.60 9.40a2.9 2.9 0 1 0 5.80 0a2.9 2.9 0 1 0 -5.80 0zM10.1 12a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0z',
  houppa: CHUPPAH,
  main: CHUPPAH,
  // Chabbat Hatan : deux bougies de Chabbat, leurs flammes et le plateau
  'chabbat-hatan': 'M7.5 11.5h3v6.5h-3zM13.5 11.5h3v6.5h-3zM9 9.6c-1.2-.8-1.3-2.5 0-4.4 1.3 1.9 1.2 3.6 0 4.4zM15 9.6c-1.2-.8-1.3-2.5 0-4.4 1.3 1.9 1.2 3.6 0 4.4zM9 18v2.5M15 18v2.5M5.5 20.5h13',
  brunch: 'M5 9h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.25 2.25 0 0 1 0 4.5H16M8.5 3v3M12.5 3v3',
  // Sheva Berakhot : coupe de kiddouch
  'sheva-berakhot': 'M8 3h8l-.8 6.5a3.2 3.2 0 0 1-6.4 0zM12 13v7M8.5 21h7',
  // Au revoir : cœur
  depart: 'M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  'pool-party': 'M3 17c2 0 2-1.5 4.5-1.5S9.5 17 12 17s2.5-1.5 4.5-1.5S19 17 21 17M7 14V5a2 2 0 0 1 4 0M13 14V5a2 2 0 0 1 4 0M7 9h6',
  // Bar/Bat Mitsva : rouleau de la Torah (deux bâtons, parchemin)
  'montee-torah': 'M6 3v18M18 3v18M4.5 4.5h3M16.5 4.5h3M4.5 19.5h3M16.5 19.5h3M8 6h8v12H8zM10 9.5h4M10 12h4M10 14.5h3',
  // Chabbat : deux bougies
  chabbat: 'M7.5 11.5h3v6.5h-3zM13.5 11.5h3v6.5h-3zM9 9.6c-1.2-.8-1.3-2.5 0-4.4 1.3 1.9 1.2 3.6 0 4.4zM15 9.6c-1.2-.8-1.3-2.5 0-4.4 1.3 1.9 1.2 3.6 0 4.4zM9 18v2.5M15 18v2.5M5.5 20.5h13',
  // Veille de la Brit Mila : livre ouvert (lecture du Zohar)
  veille: 'M12 6.5C9.5 4.8 6.5 4.5 3.5 5v13.5c3-.5 6 0 8.5 1.5 2.5-1.5 5.5-2 8.5-1.5V5c-3-.5-6-.2-8.5 1.5zM12 6.5V20',
  // Événement principal hors mariage : étoile de David
  star: 'M12 2.5 20.2 16.75H3.8zM12 21.5 3.8 7.25h16.4z',
  custom: SPARKLE,
  answers: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
};

export function EventIcon({ kind, size = 20, strokeWidth = 1.3, color = 'currentColor' }: { kind: EventIconKind; size?: number; strokeWidth?: number; color?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={EVENT_ICON_PATHS[kind]} />
    </svg>
  );
}

/**
 * Icône de l'événement principal selon le type du site : la Houppa pour un
 * mariage, l'étoile de David pour une Bar/Bat Mitsva ou une Brit Mila.
 */
export function mainIconKind(eventType?: string | null): EventIconKind {
  return !eventType || eventType === 'mariage' ? 'houppa' : 'star';
}
