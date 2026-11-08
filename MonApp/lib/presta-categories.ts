/**
 * Taxonomie UNIQUE des catégories de prestataires.
 *
 * Avant, chaque écran avait sa propre liste (inscription, annuaire client,
 * Explore, admin) avec des clés différentes : un fleuriste inscrit en
 * « fleuriste » tombait dans « Fleurs » sur Explore mais pas dans
 * « Décoration », et les catégories « Autre » / « Souvenirs » n'avaient pas
 * d'écran côté client. Tous les écrans lisent désormais CETTE liste, et
 * `normalizeCategory()` range n'importe quelle valeur stockée (anciens
 * libellés, accents, majuscules) dans une catégorie existante.
 */
import type { Ionicons } from '@expo/vector-icons';

export type PrestaCategory =
  | 'salle'
  | 'traiteur'
  | 'photo'
  | 'musique'
  | 'fleuriste'
  | 'beaute'
  | 'tenues'
  | 'transport'
  | 'juif'
  | 'chabbat-hattan'
  | 'patisserie'
  | 'planner'
  | 'animation'
  | 'autre';

type CategoryDef = {
  key: PrestaCategory;
  /** Libellé court (puces, badges, choix à l'inscription). */
  label: string;
  /** Titre de la page catégorie côté client. */
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
};

export const PRESTA_CATEGORIES: CategoryDef[] = [
  { key: 'salle', label: 'Salle / Lieu', title: 'Lieux de réception', icon: 'business-outline', emoji: '🏛️' },
  { key: 'traiteur', label: 'Traiteur', title: 'Traiteurs', icon: 'restaurant-outline', emoji: '🍽️' },
  { key: 'photo', label: 'Photo & Vidéo', title: 'Photo & Vidéo', icon: 'camera-outline', emoji: '📸' },
  { key: 'musique', label: 'Musique / DJ', title: 'Musique / DJ', icon: 'musical-notes-outline', emoji: '🎵' },
  { key: 'fleuriste', label: 'Déco & Fleurs', title: 'Décoration & Fleurs', icon: 'flower-outline', emoji: '💐' },
  { key: 'beaute', label: 'Beauté', title: 'Beauté', icon: 'sparkles-outline', emoji: '💄' },
  { key: 'tenues', label: 'Tenues', title: 'Tenues', icon: 'shirt-outline', emoji: '👗' },
  { key: 'transport', label: 'Transport', title: 'Transport', icon: 'car-outline', emoji: '🚗' },
  { key: 'juif', label: 'Mariage Juif', title: 'Mariage Juif', icon: 'star-outline', emoji: '✡️' },
  { key: 'chabbat-hattan', label: 'Chabbat Hattan', title: 'Chabbat Hattan', icon: 'moon-outline', emoji: '🕍' },
  { key: 'patisserie', label: 'Pâtisserie', title: 'Pâtisserie', icon: 'cafe-outline', emoji: '🧁' },
  { key: 'planner', label: 'Wedding Planner', title: 'Wedding Planner', icon: 'clipboard-outline', emoji: '📋' },
  { key: 'animation', label: 'Animation', title: 'Animation', icon: 'happy-outline', emoji: '🎉' },
  { key: 'autre', label: 'Autre', title: 'Autres prestataires', icon: 'ellipsis-horizontal', emoji: '🎊' },
];

const KEYS = new Set<string>(PRESTA_CATEGORIES.map((c) => c.key));

/** Anciennes valeurs / variantes → catégorie officielle (sans accents, minuscules). */
const ALIASES: Record<string, PrestaCategory> = {
  lieu: 'salle', 'salle / lieu': 'salle', 'salle/lieu': 'salle', reception: 'salle',
  'lieux de reception': 'salle', 'lieu de reception': 'salle', domaine: 'salle', 'salle de reception': 'salle',
  traiteurs: 'traiteur', 'traiteur casher': 'traiteur',
  photos: 'photo', photographe: 'photo', video: 'photo', videaste: 'photo',
  'photo & video': 'photo', 'photo et video': 'photo', 'photo / video': 'photo',
  musicien: 'musique', dj: 'musique', 'musique / dj': 'musique', 'musique & animation': 'musique', orchestre: 'musique',
  fleurs: 'fleuriste', decoration: 'fleuriste', deco: 'fleuriste', 'deco & fleurs': 'fleuriste',
  'decoration & fleurs': 'fleuriste', decorateur: 'fleuriste', decoratrice: 'fleuriste',
  coiffure: 'beaute', maquillage: 'beaute', coiffeur: 'beaute', maquilleuse: 'beaute',
  tenue: 'tenues', robe: 'tenues', robes: 'tenues', costume: 'tenues', costumes: 'tenues',
  'mariage juif': 'juif', rabbin: 'juif', casher: 'juif',
  'chabbat hattan': 'chabbat-hattan', chabbat: 'chabbat-hattan',
  gateau: 'patisserie', gateaux: 'patisserie', patissier: 'patisserie',
  'wedding planner': 'planner', organisateur: 'planner', organisatrice: 'planner', 'event planner': 'planner',
  photobooth: 'animation', magicien: 'animation',
  autres: 'autre',
};

const strip = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Range n'importe quelle catégorie stockée dans une catégorie officielle (inconnue → « autre »). */
export function normalizeCategory(raw?: string | null): PrestaCategory {
  const v = strip(raw ?? '');
  if (!v) return 'autre';
  if (KEYS.has(v)) return v as PrestaCategory;
  return ALIASES[v] ?? 'autre';
}

export function categoryDef(raw?: string | null): CategoryDef {
  const key = normalizeCategory(raw);
  return PRESTA_CATEGORIES.find((c) => c.key === key)!;
}

/** Libellé lisible d'une catégorie stockée (« fleuriste » → « Déco & Fleurs »). */
export function categoryLabel(raw?: string | null): string {
  return categoryDef(raw).label;
}

/**
 * Photo ronde d'un prestataire : la photo de couverture qu'il a choisie,
 * sinon son avatar de compte. null → afficher l'initiale.
 */
export function prestaPhoto(p: { cover_url?: string | null; avatar_url?: string | null }): string | null {
  return p.cover_url || p.avatar_url || null;
}
