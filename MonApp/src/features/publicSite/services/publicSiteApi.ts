import { API_ENDPOINTS } from '@/constants/config';

import type {
  CreatePublicSitePayload,
  CreatePublicSiteResponseData,
  PublicSitePublicPayload,
} from '../types/publicSite.types';

export interface ApiErrorShape {
  message: string;
  errors?: string[];
}

export async function createPublicSite(
  payload: CreatePublicSitePayload,
  accessToken: string
): Promise<CreatePublicSiteResponseData> {
  const token = accessToken.trim();
  if (!token) {
    throw new Error('Jeton de session manquant. Reconnecte-toi.');
  }

  const response = await fetch(API_ENDPOINTS.publicSites, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    errors?: string[];
    data?: CreatePublicSiteResponseData;
  };

  if (!response.ok) {
    const msg = result.message || 'Impossible de créer le mini-site';
    const err = new Error(msg) as Error & { errors?: string[]; status?: number };
    err.errors = result.errors;
    err.status = response.status;
    throw err;
  }

  if (!result.data?.publicUrl || !result.data.slug) {
    throw new Error('Réponse serveur invalide');
  }

  return result.data;
}

/** Lecture publique (site publié uniquement) — l’URL officielle reste celle renvoyée par le POST. */
export async function fetchPublicSiteBySlug(slug: string): Promise<PublicSitePublicPayload> {
  const url = `${API_ENDPOINTS.publicSites}/${encodeURIComponent(slug)}`;
  const response = await fetch(url);
  const result = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: PublicSitePublicPayload;
    message?: string;
  };

  if (!response.ok || !result.data) {
    throw new Error(result.message || 'Mini-site introuvable ou non publié');
  }

  return result.data;
}
