// ── Types ─────────────────────────────────────────────────────────────────────
// Toutes les données mock ont été supprimées.
// Le tableau de bord utilise exclusivement les données réelles de l'utilisateur.

export type PriorityTask = {
  id: string;
  label: string;
  deadline: string;
  done: boolean;
  level: 'urgent' | 'medium';
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  status: 'reserve' | 'attente' | 'devis';
  depositPaid: boolean;
  logo: string;
};

export type VendorSuggestion = {
  id: string;
  name: string;
  type: string;
  rating: number;
  avgPrice: string;
  city: string;
  style: string;
  image: string;
};

export type InspirationTile = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  emoji: string;
  tall?: boolean;
};

// Tableaux vides — les données viennent de l'API / stores
export const VENDORS: Vendor[] = [];
export const VENDOR_SUGGESTIONS: VendorSuggestion[] = [];
export const PRIORITY_TASKS: PriorityTask[] = [];

export const INSPIRATIONS: InspirationTile[] = [
  { id: 'i-1', title: 'Style bohème chic', subtitle: 'Palette sable + lavande', color: '#f4e8ff', emoji: '🌿', tall: true },
  { id: 'i-2', title: 'Luxury white wedding', subtitle: 'Minimal et lumineux', color: '#f8f7ff', emoji: '🤍' },
  { id: 'i-3', title: 'Italian wedding vibes', subtitle: 'Romance en plein air', color: '#fff3ea', emoji: '🍋', tall: true },
  { id: 'i-4', title: 'Soirée aux bougies', subtitle: 'Ambiance élégante', color: '#efeaff', emoji: '🕯️' },
];

export const COUPLE_INSIGHTS = [
  'Bienvenue sur Oheve ! Commencez par renseigner votre date de mariage.',
  'Ajoutez vos prestataires pour les retrouver facilement.',
  'Utilisez le budget pour suivre vos dépenses en temps réel.',
];

export const DAILY_TIPS = [
  'Astuce : négociez les packs photo + vidéo.',
  'Déco du jour : mélangez fleurs blanches et feuillage olive.',
];
