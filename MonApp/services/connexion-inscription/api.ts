/**
 * Service API Connexion / Inscription
 * Tous les appels liés à l'inscription et la connexion
 */

import { API_ENDPOINTS } from '@/constants/config';

export interface InscriptionData {
  email: string;
  nom: string;
  prenom: string;
  mot_de_passe: string;
}

export interface InscriptionResponse {
  success: boolean;
  message: string;
  data?: { id: number; email: string; nom: string; prenom: string; accessToken?: string };
}

export interface ConnexionData {
  email: string;
  mot_de_passe: string;
}

export interface ConnexionResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    accessToken?: string;
    date_mariage?: string;
    budget_total?: number;
    wedding_location_type?: 'city' | 'address' | 'unknown';
    wedding_city?: string;
    wedding_country?: string;
    wedding_address?: string;
  };
}

export const connexionInscriptionApi = {
  async inscription(data: InscriptionData): Promise<InscriptionResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.inscription, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Erreur lors de l'inscription");
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

  async connexion(data: ConnexionData): Promise<ConnexionResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.connexion, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la connexion');
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
};
