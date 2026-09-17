/**
 * Budget Store — source de vérité pour le budget mariage.
 * Toutes les catégories du mariage juif, synchronisées depuis l'onboarding
 * et les paiements prestataires.
 */
import { createContext, createElement, useContext, useEffect, useReducer, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { bootstrapScope, pushScope, readCache } from './planning-sync';

const BUDGET_STORAGE_KEY = '@oheve_budget_v1';

/** Forme partagée avec le serveur (`/api/planning/budget`). */
type BudgetDoc = { totalBudget: number; categories: BudgetCategory[] };

export type BudgetEntry = {
  id: string;
  amount: number;
  type: 'acompte' | 'solde' | 'depense';
  note?: string;
  providerName?: string;
  providerCategory?: string;
  date: string;
};

export type BudgetCategory = {
  key: string;
  label: string;
  icon: string;
  planned: number;
  entries: BudgetEntry[];
};

export type BudgetState = {
  version: number;
  categories: BudgetCategory[];
  totalBudget: number;
  totalSpent: number;
  totalAcomptes: number;
  totalSoldes: number;
};

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

// ── État interne ──────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;
let totalBudget = 0;
let categories: BudgetCategory[] = DEFAULT_CATEGORIES.map(c => ({ ...c, entries: [] }));

function sumSpent(cats: BudgetCategory[]) {
  return cats.reduce((sum, c) => sum + c.entries.reduce((s, e) => s + e.amount, 0), 0);
}

function sumAcomptes(cats: BudgetCategory[]) {
  return cats.reduce((sum, c) =>
    sum + c.entries.filter(e => e.type === 'acompte').reduce((s, e) => s + e.amount, 0), 0);
}

function sumSoldes(cats: BudgetCategory[]) {
  return cats.reduce((sum, c) =>
    sum + c.entries.filter(e => e.type === 'solde').reduce((s, e) => s + e.amount, 0), 0);
}

function cloneCategories(): BudgetCategory[] {
  return categories.map(c => ({ ...c, entries: [...c.entries] }));
}

function buildSnapshot(): BudgetState {
  const cats = cloneCategories();
  return {
    version,
    categories: cats,
    totalBudget,
    totalSpent: sumSpent(cats),
    totalAcomptes: sumAcomptes(cats),
    totalSoldes: sumSoldes(cats),
  };
}

let snapshot: BudgetState = buildSnapshot();

function hasAnyEntries(): boolean {
  return categories.some(c => c.entries.length > 0);
}

function ensurePlannedFromGlobal(total: number) {
  categories = categories.map(c => ({
    ...c,
    planned: c.planned > 0 ? c.planned : Math.round(total * (GLOBAL_RATIOS[c.key] ?? 0)),
  }));
}

function notifyListeners() {
  version += 1;
  snapshot = buildSnapshot();
  listeners.forEach(fn => fn());
}

function saveBudget() {
  notifyListeners();
  const doc: BudgetDoc = { totalBudget, categories };
  // Cache hérité gardé : une version antérieure de l'app lit encore cette clé.
  AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(doc)).catch(() => {});
  // Le budget suit le compte, pas le téléphone : les deux conjoints voient
  // les mêmes dépenses et le même total.
  pushScope<BudgetDoc>('budget', doc, applyServerBudget);
}

/** Applique la version serveur (l'autre appareil a écrit entre-temps). */
function applyServerBudget(doc: BudgetDoc): void {
  if (!doc) return;
  if (typeof doc.totalBudget === 'number') totalBudget = doc.totalBudget;
  if (Array.isArray(doc.categories)) categories = doc.categories;
  notifyListeners();
}

/**
 * Première rencontre entre cet appareil et le compte : aucune dépense ne doit
 * disparaître, d'où l'union des écritures par identifiant. Ensuite, le serveur
 * fait foi (supprimer une dépense doit pouvoir se propager).
 */
export function mergeBudget(local: BudgetDoc, serveur: BudgetDoc): BudgetDoc {
  const parCle = new Map<string, BudgetCategory>();
  for (const c of serveur.categories ?? []) parCle.set(c.key, { ...c, entries: [...(c.entries ?? [])] });
  for (const c of local.categories ?? []) {
    const existante = parCle.get(c.key);
    if (!existante) {
      parCle.set(c.key, { ...c, entries: [...(c.entries ?? [])] });
      continue;
    }
    const vues = new Set(existante.entries.map((e) => e.id));
    existante.entries.push(...(c.entries ?? []).filter((e) => !vues.has(e.id)));
    existante.planned = existante.planned > 0 ? existante.planned : c.planned;
  }
  return {
    totalBudget: serveur.totalBudget > 0 ? serveur.totalBudget : local.totalBudget,
    categories: Array.from(parCle.values()),
  };
}

// ── Subscriptions & React ─────────────────────────────────────────────────────
export function subscribeBudget(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

const BudgetContext = createContext<BudgetState>(snapshot);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeBudget(() => bump()), []);
  return createElement(BudgetContext.Provider, { value: snapshot }, children);
}

export function useBudgetState(): BudgetState {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeBudget(() => bump()), []);
  return snapshot;
}

export function useBudget(): number {
  return useBudgetState().version;
}

// ── Persistance ───────────────────────────────────────────────────────────────
export async function loadPersistedBudget(): Promise<boolean> {
  const versionAtStart = version;
  const hadEntries = hasAnyEntries();
  let charge = false;
  try {
    // Cache du compte d'abord, sinon l'ancien stockage propre au téléphone.
    const cache = await readCache<BudgetDoc>('budget');
    const raw = cache ? null : await AsyncStorage.getItem(BUDGET_STORAGE_KEY);
    const data = cache ?? (raw ? (JSON.parse(raw) as BudgetDoc) : null);

    if (data && versionAtStart === version) {
      const persistedHasEntries = Array.isArray(data.categories)
        && data.categories.some(c => c.entries?.length > 0);
      // Ne pas écraser des dépenses en mémoire avec une sauvegarde vide / périmée
      if (!(hadEntries && !persistedHasEntries)) {
        if (typeof data.totalBudget === 'number') totalBudget = data.totalBudget;
        if (Array.isArray(data.categories)) categories = data.categories;
        notifyListeners();
      }
      charge = true;
    }
  } catch {
    // cache illisible : on continue vers le serveur
  }

  // Serveur : source de vérité partagée entre les appareils du compte.
  try {
    const doc = await bootstrapScope<BudgetDoc>(
      'budget',
      { totalBudget, categories },
      mergeBudget,
    );
    if (doc && (doc.totalBudget !== totalBudget || doc.categories !== categories)) {
      applyServerBudget(doc);
    }
    charge = true;
  } catch {
    // hors-ligne : on reste sur le cache
  }
  return charge;
}

/** Synchronise le total profil sans effacer les dépenses ou budgets déjà saisis. */
export function syncBudgetTotal(total: number) {
  if (total <= 0) return;

  // Si l'utilisateur a déjà défini des budgets par catégorie, on ne touche pas au total.
  const plannedSum = categories.reduce((sum, c) => sum + c.planned, 0);
  if (plannedSum > 0) return;

  if (totalBudget === 0) {
    initBudget({ total, mode: 'global' });
    return;
  }

  if (totalBudget !== total) {
    totalBudget = total;
    saveBudget();
  }
}

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
  saveBudget();
}

// ── Lecture ───────────────────────────────────────────────────────────────────
export function getCategories(): BudgetCategory[] {
  return cloneCategories();
}

export function getTotalBudget(): number {
  return totalBudget;
}

export function getTotalSpent(): number {
  return sumSpent(categories);
}

export function getCategorySpent(key: string): number {
  const cat = categories.find(c => c.key === key);
  return cat ? cat.entries.reduce((s, e) => s + e.amount, 0) : 0;
}

export function getTotalAcomptes(): number {
  return sumAcomptes(categories);
}

export function getTotalSoldes(): number {
  return sumSoldes(categories);
}

export function getCategoryAcomptes(key: string): number {
  const cat = categories.find(c => c.key === key);
  return cat ? cat.entries.filter(e => e.type === 'acompte').reduce((s, e) => s + e.amount, 0) : 0;
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function addExpense(params: {
  categoryKey: string;
  amount: number;
  type?: 'acompte' | 'solde' | 'depense';
  note?: string;
  providerName?: string;
  providerCategory?: string;
}) {
  const idx = categories.findIndex(c => c.key === params.categoryKey);
  if (idx === -1) return;
  const entry: BudgetEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    amount: params.amount,
    type: params.type ?? 'depense',
    note: params.note,
    providerName: params.providerName,
    providerCategory: params.providerCategory,
    date: new Date().toISOString(),
  };
  categories = categories.map((c, i) =>
    i === idx ? { ...c, entries: [...c.entries, entry] } : c,
  );
  saveBudget();
}

export function removeExpense(categoryKey: string, entryId: string) {
  const idx = categories.findIndex(c => c.key === categoryKey);
  if (idx === -1) return;
  categories = categories.map((c, i) =>
    i === idx ? { ...c, entries: c.entries.filter(e => e.id !== entryId) } : c,
  );
  saveBudget();
}

export function setTotalBudget(total: number) {
  if (total === totalBudget) return;
  totalBudget = total;
  saveBudget();
}

export function updatePlanned(categoryKey: string, planned: number) {
  const idx = categories.findIndex(c => c.key === categoryKey);
  if (idx === -1) return;
  categories = categories.map((c, i) =>
    i === idx ? { ...c, planned } : c,
  );
  totalBudget = categories.reduce((sum, c) => sum + c.planned, 0);
  saveBudget();
}

export function resetBudget() {
  categories = categories.map(c => ({ ...c, entries: [] }));
  saveBudget();
}

export function resolveCategoryKey(providerCategory: string): string {
  const normalized = providerCategory.toLowerCase().trim();
  return PROVIDER_CATEGORY_MAP[normalized] ?? 'salle';
}
