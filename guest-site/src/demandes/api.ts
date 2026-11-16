/** Appels à l'API pour les pages « demande » ouvertes depuis un e-mail. */

export function apiBase(): string {
  if (import.meta.env.DEV) return '';
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
}

export type ApiResult<T> = { ok: boolean; status: number; data?: T; message?: string };

export async function api<T>(path: string, opts: { method?: string; body?: unknown; linkToken?: string | null } = {}): Promise<ApiResult<T>> {
  try {
    const r = await fetch(`${apiBase()}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.linkToken ? { 'X-Demande-Token': opts.linkToken } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const json = await r.json().catch(() => null);
    return { ok: r.ok && json?.success !== false, status: r.status, data: json?.data, message: json?.message };
  } catch {
    return { ok: false, status: 0, message: 'Pas de connexion internet. Vérifiez votre réseau et réessayez.' };
  }
}

export type Message = {
  id: number;
  auteur: 'client' | 'prestataire';
  contenu: string;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
};

export type VuePresta = {
  id: number;
  role: 'prestataire';
  statut: 'gratuite' | 'verrouillee' | 'debloquee' | 'abonnement';
  verrouillee: boolean;
  created_at: string;
  numero_gratuit: number | null;
  free_limit: number;
  abonne: boolean;
  total_demandes_recues: number;
  fiche: { user_id: number; business_name: string };
  deblocage_unite_disponible: boolean;
  client: { prenom: string; nom?: string; email?: string | null; phone?: string | null };
  apercu: string | null;
  messages: Message[];
};

export type VueClient = {
  id: number;
  role: 'client';
  created_at: string;
  prestataire: { user_id: number; business_name: string; category: string | null; city: string | null };
  messages: Message[];
  a_repondu: boolean;
  sans_reponse_48h: boolean;
};

export type Similaire = {
  user_id: number;
  business_name: string;
  category: string;
  city: string | null;
  cover_url: string | null;
  abonne: boolean;
  repond_vite: boolean;
};

export function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
