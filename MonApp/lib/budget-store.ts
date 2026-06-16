/**
 * Budget Store — source de vérité pour le budget mariage.
 * Toutes les catégories du mariage juif, synchronisées depuis l'onboarding
 * et les paiements prestataires.
 */

export type BudgetEntry = {
  id: string;
  amount: number;
  type: 'acompte' | 'solde' | 'depense'; // acompte = versement partiel, solde = paiement final
  note?: string;
  providerName?: string;
  providerCategory?: string;
  date: string; // ISO
};

export type BudgetCategory = {
  key: string;
  label: string;
  icon: string;
  planned: number;   // budget prévu pour cette catégorie
  entries: BudgetEntry[];
};

// Mapping catégorie prestataire → clé budget
export const PROVIDER_CATEGORY_MAP: Record<string, string> = {
  salle:         'salle',
  'lieu de réception': 'salle',
  traiteur:      'traiteur',
  buffet:        'traiteur',
  rabbin:        'rabbin',
  cérémonie:     'rabbin',
  dj:            'dj',
  orchestre:     'dj',
  'dj / orchestre': 'dj',
  photographe:   'photo',
  photo:         'photo',
  vidéaste:      'video',
  video:         'video',
  décoration:    'deco',
  fleuriste:     'deco',
  tenues:        'tenues',
  couture:       'tenues',
  coiffure:      'beaute',
  maquillage:    'beaute',
  'coiffure & maquillage': 'beaute',
  pâtisserie:    'patisserie',
  gâteau:        'patisserie',
};

// Catégories par défaut du mariage juif — ratios utilisés si budget global
const DEFAULT_CATEGORIES: Omit<BudgetCategory, 'entries'>[] = [
  { key: 'salle',      label: 'Salle de réception',      icon: '🏛️', planned: 0 },
  { key: 'traiteur',   label: 'Traiteur / Buffet',        icon: '🍽️', planned: 0 },
  { key: 'rabbin',     label: 'Rabbin / Cérémonie',       icon: '✡️', planned: 0 },
  { key: 'dj',         label: 'DJ / Orchestre',           icon: '🎵', planned: 0 },
  { key: 'photo',      label: 'Photographe',              icon: '📸', planned: 0 },
  { key: 'video',      label: 'Vidéaste',                 icon: '🎬', planned: 0 },
  { key: 'deco',       label: 'Décoration & Fleurs',      icon: '💐', planned: 0 },
  { key: 'tenues',     label: 'Tenues',                   icon: '👗', planned: 0 },
  { key: 'beaute',     label: 'Coiffure & Maquillage',    icon: '💄', planned: 0 },
  { key: 'patisserie', label: 'Pâtisserie / Gâteau',      icon: '🎂', planned: 0 },
];

// Ratios si mode global (somme = 1)
const GLOBAL_RATIOS: Record<string, number> = {
  salle:      0.32,
  traiteur:   0.25,
  rabbin:     0.03,
  dj:         0.08,
  photo:      0.07,
  video:      0.05,
  deco:       0.08,
  tenues:     0.06,
  beaute:     0.03,
  patisserie: 0.03,
};

let totalBudget = 0;
let categories: BudgetCategory[] = DEFAULT_CATEGORIES.map(c => ({ ...c, entries: [] }));

// ── Init depuis l'onboarding ──────────────────────────────────────────────────
export function initBudget(params: {
  total: number;
  mode: 'global' | 'categories';
  categoryAmounts?: Record<string, number>;
}) {
  totalBudget = params.total;
  categories = DEFAULT_CATEGORIES.map(c => {
    const existing = categories.find(e => e.key === c.key);
    let planned = 0;
    if (params.mode === 'categories' && params.categoryAmounts) {
      planned = params.categoryAmounts[c.key] ?? 0;
    } else if (params.mode === 'global' && params.total > 0) {
      planned = Math.round(params.total * (GLOBAL_RATIOS[c.key] ?? 0));
    }
    return {
      ...c,
      planned,
      entries: existing?.entries ?? [],
    };
  });
}

// ── Lecture ───────────────────────────────────────────────────────────────────
export function getCategories(): BudgetCategory[] {
  return categories;
}

export function getTotalBudget(): number {
  return totalBudget;
}

export function getTotalSpent(): number {
  return categories.reduce((sum, c) => sum + c.entries.reduce((s, e) => s + e.amount, 0), 0);
}

export function getCategorySpent(key: string): number {
  const cat = categories.find(c => c.key === key);
  return cat ? cat.entries.reduce((s, e) => s + e.amount, 0) : 0;
}

// ── Ajout de dépense ──────────────────────────────────────────────────────────
export function addExpense(params: {
  categoryKey: string;
  amount: number;
  type?: 'acompte' | 'solde' | 'depense';
  note?: string;
  providerName?: string;
  providerCategory?: string;
}) {
  const cat = categories.find(c => c.key === params.categoryKey);
  if (!cat) return;
  const entry: BudgetEntry = {
    id: Date.now().toString(),
    amount: params.amount,
    type: params.type ?? 'depense',
    note: params.note,
    providerName: params.providerName,
    providerCategory: params.providerCategory,
    date: new Date().toISOString(),
  };
  cat.entries = [...cat.entries, entry];
  categories = [...categories];
}

// ── Totaux acomptes ───────────────────────────────────────────────────────────
export function getTotalAcomptes(): number {
  return categories.reduce((sum, c) =>
    sum + c.entries.filter(e => e.type === 'acompte').reduce((s, e) => s + e.amount, 0), 0
  );
}

export function getTotalSoldes(): number {
  return categories.reduce((sum, c) =>
    sum + c.entries.filter(e => e.type === 'solde').reduce((s, e) => s + e.amount, 0), 0
  );
}

export function getCategoryAcomptes(key: string): number {
  const cat = categories.find(c => c.key === key);
  return cat ? cat.entries.filter(e => e.type === 'acompte').reduce((s, e) => s + e.amount, 0) : 0;
}

// ── Suppression d'une dépense ─────────────────────────────────────────────────
export function removeExpense(categoryKey: string, entryId: string) {
  const cat = categories.find(c => c.key === categoryKey);
  if (!cat) return;
  cat.entries = cat.entries.filter(e => e.id !== entryId);
  categories = [...categories];
}

// ── Mise à jour du budget planifié ────────────────────────────────────────────
export function updatePlanned(categoryKey: string, planned: number) {
  const cat = categories.find(c => c.key === categoryKey);
  if (!cat) return;
  cat.planned = planned;
  categories = [...categories];
}

// ── Réinitialisation ──────────────────────────────────────────────────────────
export function resetBudget() {
  categories = categories.map(c => ({ ...c, entries: [] }));
}

// ── Résoudre catégorie depuis catégorie prestataire ───────────────────────────
export function resolveCategoryKey(providerCategory: string): string {
  const normalized = providerCategory.toLowerCase().trim();
  return PROVIDER_CATEGORY_MAP[normalized] ?? 'salle';
}
