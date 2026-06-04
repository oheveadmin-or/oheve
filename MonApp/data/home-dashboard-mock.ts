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

export const WEDDING_DAY = '2026-09-19';

export const HOME_MOCK = {
  couple: 'Emma & Lucas',
  weddingProgress: 68,
  weddingScore: 87,
  budget: {
    total: 20000,
    spent: 11600,
    monthly: 2500,
    predictedFinal: 21900,
  },
  guests: {
    total: 127,
    confirmed: 84,
    pending: 43,
  },
  stressLevel: 'Stress faible 😌',
  weather: {
    averageTemp: 26,
    forecast: 'En moyenne : 26°C et ensoleille',
    advice: 'Prevoir un coin ombrage et des boissons fraiches.',
  },
};

export const PRIORITY_TASKS: PriorityTask[] = [
  { id: 'task-1', label: 'Reserver le photographe', deadline: 'Dans 3 jours', done: false, level: 'urgent' },
  { id: 'task-2', label: 'Envoyer les invitations', deadline: 'Cette semaine', done: false, level: 'urgent' },
  { id: 'task-3', label: 'Choisir les fleurs', deadline: 'Dans 8 jours', done: false, level: 'medium' },
];

export const VENDORS: Vendor[] = [
  { id: 'v-1', name: 'Studio Lumen', category: 'Photographe', status: 'reserve', depositPaid: true, logo: '📸' },
  { id: 'v-2', name: 'DJ Nova', category: 'DJ', status: 'attente', depositPaid: false, logo: '🎵' },
  { id: 'v-3', name: 'Fleur d Atelier', category: 'Fleuriste', status: 'devis', depositPaid: false, logo: '💐' },
];

export const VENDOR_SUGGESTIONS: VendorSuggestion[] = [
  {
    id: 's-1',
    name: 'Maison Aurora',
    type: 'Salle',
    rating: 4.9,
    avgPrice: '4 500 EUR',
    city: 'Tel Aviv',
    style: 'Luxury white',
    image: '🏛️',
  },
  {
    id: 's-2',
    name: 'Noam Visuals',
    type: 'Photographe',
    rating: 4.8,
    avgPrice: '1 900 EUR',
    city: 'Jerusalem',
    style: 'Editorial',
    image: '📷',
  },
  {
    id: 's-3',
    name: 'Bloom Atelier',
    type: 'Fleuriste',
    rating: 4.7,
    avgPrice: '1 150 EUR',
    city: 'Haifa',
    style: 'Boheme chic',
    image: '🌸',
  },
  {
    id: 's-4',
    name: 'Moonbeat',
    type: 'DJ',
    rating: 4.9,
    avgPrice: '1 350 EUR',
    city: 'Tel Aviv',
    style: 'Modern party',
    image: '🎧',
  },
];

export const INSPIRATIONS: InspirationTile[] = [
  { id: 'i-1', title: 'Style boheme chic', subtitle: 'Palette sable + lavande', color: '#f4e8ff', emoji: '🌿', tall: true },
  { id: 'i-2', title: 'Luxury white wedding', subtitle: 'Minimal et lumineux', color: '#f8f7ff', emoji: '🤍' },
  { id: 'i-3', title: 'Italian wedding vibes', subtitle: 'Romance en plein air', color: '#fff3ea', emoji: '🍋', tall: true },
  { id: 'i-4', title: 'Soiree aux bougies', subtitle: 'Ambiance elegante', color: '#efeaff', emoji: '🕯️' },
];

export const TIMELINE = [
  { id: 't-1', month: 'Mai', step: 'Reserver DJ' },
  { id: 't-2', month: 'Juin', step: 'Commander la robe' },
  { id: 't-3', month: 'Aout', step: 'Envoyer invitations' },
  { id: 't-4', month: 'Sept', step: 'Confirmer planning jour J' },
];

export const COUPLE_INSIGHTS = [
  'Votre mariage avance parfaitement.',
  '80% des couples reservent le DJ avant juillet.',
  'Vous etes dans les temps.',
];

export const DAILY_TIPS = [
  'Astuce budget : negociez les packs photo + video.',
  'Deco du jour : melangez fleurs blanches et feuillage olive.',
];
