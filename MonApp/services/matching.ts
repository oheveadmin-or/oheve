/**
 * Algorithme de matching prestataire ↔ mariage
 * score = distance 40% + budget 35% + popularité 15% + avis 10%
 */

export type WeddingProfile = {
  lat?: number;
  lng?: number;
  budgetTotal: number;
  guestsCount: number;
};

export type ProviderForMatching = {
  id: string;
  category: string;
  lat?: number;
  lng?: number;
  price?: number;       // prix moyen prestataire
  rating?: number;      // note /5
  reviewsCount?: number;
};

export type MatchResult = {
  providerId: string;
  score: number;        // 0-100
  distanceKm?: number;
  budgetScore: number;
  distanceScore: number;
  popularityScore: number;
  ratingScore: number;
  badges: string[];     // ex: "Compatible budget", "À 12 km"
};

// Répartition budget par catégorie (% du budget total)
const BUDGET_SPLIT: Record<string, number> = {
  salle: 0.40,
  traiteur: 0.25,
  photos: 0.10,
  photographe: 0.10,
  video: 0.05,
  videaste: 0.05,
  musique: 0.08,
  décoration: 0.07,
  fleurs: 0.05,
  default: 0.05,
};

function categoryBudget(budgetTotal: number, category: string): number {
  const ratio = BUDGET_SPLIT[category.toLowerCase()] ?? BUDGET_SPLIT.default;
  return budgetTotal * ratio;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceScore(km: number): number {
  if (km <= 10) return 100;
  if (km <= 25) return 90;
  if (km <= 50) return 75;
  if (km <= 100) return 50;
  return 25;
}

function budgetScore(providerPrice: number, categoryAllocation: number): number {
  if (categoryAllocation <= 0) return 50;
  const ratio = providerPrice / categoryAllocation;
  if (ratio <= 1.0) return 100;
  if (ratio <= 1.3) return 80;
  if (ratio <= 1.6) return 60;
  if (ratio <= 2.0) return 35;
  return 10;
}

function popularityScore(reviewsCount: number): number {
  if (reviewsCount >= 50) return 100;
  if (reviewsCount >= 20) return 80;
  if (reviewsCount >= 10) return 60;
  if (reviewsCount >= 5) return 40;
  return 20;
}

function ratingScore(rating: number): number {
  return Math.round((rating / 5) * 100);
}

export function computeMatch(
  provider: ProviderForMatching,
  wedding: WeddingProfile
): MatchResult {
  const allocation = categoryBudget(wedding.budgetTotal, provider.category);

  let dScore = 50;
  let distKm: number | undefined;
  if (
    provider.lat != null &&
    provider.lng != null &&
    wedding.lat != null &&
    wedding.lng != null
  ) {
    distKm = haversineKm(wedding.lat, wedding.lng, provider.lat, provider.lng);
    dScore = distanceScore(distKm);
  }

  const bScore = provider.price != null ? budgetScore(provider.price, allocation) : 50;
  const popScore = provider.reviewsCount != null ? popularityScore(provider.reviewsCount) : 30;
  const rScore = provider.rating != null ? ratingScore(provider.rating) : 50;

  const total = Math.round(dScore * 0.4 + bScore * 0.35 + popScore * 0.15 + rScore * 0.1);

  const badges: string[] = [];
  if (bScore >= 80) badges.push('Compatible budget');
  if (distKm != null && distKm <= 25) badges.push(`À ${Math.round(distKm)} km`);
  if (rScore >= 80) badges.push('Très bien noté');

  return {
    providerId: provider.id,
    score: total,
    distanceKm: distKm,
    budgetScore: bScore,
    distanceScore: dScore,
    popularityScore: popScore,
    ratingScore: rScore,
    badges,
  };
}

export function sortByMatch(
  providers: ProviderForMatching[],
  wedding: WeddingProfile
): Array<ProviderForMatching & { match: MatchResult }> {
  return providers
    .map((p) => ({ ...p, match: computeMatch(p, wedding) }))
    .sort((a, b) => b.match.score - a.match.score);
}
