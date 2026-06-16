/**
 * Service API - Couche de communication avec le backend
 * Inscription et connexion → services/connexion-inscription/api.ts
 */

import { API_ENDPOINTS } from '@/constants/config';

export interface DateMariageData {
  email: string;
  date_mariage: string; // Format ISO YYYY-MM-DD
}

export interface DateMariageResponse {
  success: boolean;
  message: string;
  data?: { email: string; date_mariage: string };
}

export interface BudgetData {
  email: string;
  budget_mode: 'global' | 'categories';
  budget_global?: number;
  budget_categories?: { photographe?: number; salle?: number; traiteurs?: number };
}

export interface BudgetResponse {
  success: boolean;
  message: string;
  data?: { budget_mode: string; budget_total: number };
}

export type WeddingLocationType = 'city' | 'address' | 'unknown';

export interface WeddingLocationData {
  email: string;
  wedding_location_type: WeddingLocationType;
  wedding_city?: string;
  wedding_country?: string;
  wedding_lat?: number;
  wedding_lng?: number;
  wedding_address?: string;
  wedding_venue?: string;
}

export interface WeddingLocationResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export const apiService = {
  async mettreAJourDateMariage(data: DateMariageData): Promise<DateMariageResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.dateMariage, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'enregistrement de la date');
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('Load failed')) {
        throw new Error('Serveur inaccessible. Lance le backend : cd backend && npm run dev');
      }
      throw err;
    }
  },

  async mettreAJourBudget(data: BudgetData): Promise<BudgetResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.budget, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'enregistrement du budget');
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('Load failed')) {
        throw new Error('Serveur inaccessible. Lance le backend : cd backend && npm run dev');
      }
      throw err;
    }
  },

  async mettreAJourWeddingLocation(data: WeddingLocationData): Promise<WeddingLocationResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.weddingLocation, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Erreur lors de l'enregistrement du lieu");
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('Load failed')) {
        throw new Error('Serveur inaccessible. Lance le backend : cd backend && npm run dev');
      }
      throw err;
    }
  },

  async checkHealth(): Promise<{ status: string }> {
    const response = await fetch(API_ENDPOINTS.health);
    return response.json();
  },
};
