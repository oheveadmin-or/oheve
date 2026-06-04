import { API_ENDPOINTS } from '@/constants/config';

export type UserRole = 'client' | 'prestataire' | 'boutique' | 'admin';
export type SubscriptionPlan = 'basic' | 'plus';

export interface AuthUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  phone?: string;
  accessToken: string;
  refreshToken: string;
  date_mariage?: string;
  budget_total?: number;
  budget_mode?: string;
  budget_global?: number;
  budget_categories?: object;
  wedding_location_type?: 'city' | 'address' | 'unknown';
  wedding_city?: string;
  wedding_country?: string;
  wedding_address?: string;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: string;
  subscription_expires_at?: string;
}

async function post(url: string, body: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function get(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

async function patch(url: string, body: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  return res.json();
}

export const authApi = {
  inscription: (data: { email: string; nom: string; prenom: string; mot_de_passe: string; role?: UserRole }) =>
    post(API_ENDPOINTS.inscription, data),

  connexion: (data: { email: string; mot_de_passe: string }) =>
    post(API_ENDPOINTS.connexion, data),

  refresh: (refreshToken: string) =>
    post(API_ENDPOINTS.refresh, { refreshToken }),

  logout: (accessToken: string, refreshToken: string, allDevices = false) =>
    post(API_ENDPOINTS.logout, { refreshToken, allDevices }, accessToken),

  me: (accessToken: string) =>
    get(API_ENDPOINTS.me, accessToken),

  updateProfile: (accessToken: string, data: { nom?: string; prenom?: string; phone?: string; avatar_url?: string }) =>
    patch(API_ENDPOINTS.profile, data, accessToken),
};

// ── Prestataires ──────────────────────────────────────────────────────────────
export const prestatairesApi = {
  list: (accessToken: string, params?: { category?: string; city?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.city) q.set('city', params.city);
    const url = `${API_ENDPOINTS.prestataires}?${q.toString()}`;
    return get(url, accessToken);
  },

  getById: (accessToken: string, userId: number) =>
    get(`${API_ENDPOINTS.prestataires}/${userId}`, accessToken),

  upsertProfile: (accessToken: string, data: object) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(API_ENDPOINTS.prestataires + '/me', {
      method: 'PUT', headers, body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  getPhotos: (accessToken: string, userId?: number) => {
    const url = userId
      ? `${API_ENDPOINTS.prestataires}/${userId}/photos`
      : `${API_ENDPOINTS.prestataires}/me/photos`;
    return get(url, accessToken);
  },

  uploadPhoto: (accessToken: string, formData: FormData) =>
    fetch(`${API_ENDPOINTS.prestataires}/me/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }).then((r) => r.json()),

  setCoverPhoto: (accessToken: string, photoId: number) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(`${API_ENDPOINTS.prestataires}/me/photos/${photoId}/cover`, {
      method: 'PUT', headers,
    }).then((r) => r.json());
  },

  deletePhoto: (accessToken: string, photoId: number) =>
    fetch(`${API_ENDPOINTS.prestataires}/me/photos/${photoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()),
};

// ── Messagerie ────────────────────────────────────────────────────────────────
export const messagingApi = {
  listConversations: (accessToken: string) =>
    get(API_ENDPOINTS.conversations, accessToken),

  startConversation: (accessToken: string, prestataire_id: number) =>
    post(API_ENDPOINTS.conversations, { prestataire_id }, accessToken),

  getMessages: (accessToken: string, conversationId: number, before?: number) => {
    const q = before ? `?before=${before}` : '';
    return get(`${API_ENDPOINTS.conversations}/${conversationId}/messages${q}`, accessToken);
  },

  sendMessage: (accessToken: string, conversationId: number, content: string) =>
    post(`${API_ENDPOINTS.conversations}/${conversationId}/messages`, { content }, accessToken),

  uploadAttachment: async (
    accessToken: string,
    conversationId: number,
    file: { uri: string; name: string; type: string },
    caption?: string,
  ) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    if (caption) form.append('caption', caption);
    const res = await fetch(`${API_ENDPOINTS.conversations}/${conversationId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    return res.json();
  },

  registerPushToken: (accessToken: string, token: string, platform: string) =>
    post(API_ENDPOINTS.pushToken, { token, platform }, accessToken),

  deletePushToken: (accessToken: string, token: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(API_ENDPOINTS.pushToken, { method: 'DELETE', headers, body: JSON.stringify({ token }) }).then((r) => r.json());
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: (accessToken: string) =>
    get(API_ENDPOINTS.adminStats, accessToken),

  listUsers: (accessToken: string, params?: { role?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.search) q.set('search', params.search);
    return get(`${API_ENDPOINTS.adminUsers}?${q.toString()}`, accessToken);
  },

  updateUser: (accessToken: string, userId: number, data: { role?: UserRole; is_active?: boolean }) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(`${API_ENDPOINTS.adminUsers}/${userId}`, {
      method: 'PATCH', headers, body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  deleteUser: (accessToken: string, userId: number) =>
    fetch(`${API_ENDPOINTS.adminUsers}/${userId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()),

  deletePrestataire: (accessToken: string, userId: number) =>
    fetch(`${API_ENDPOINTS.adminPrestataires}/${userId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()),

  setSubscription: (accessToken: string, userId: number, data: { plan?: string | null; status?: string }) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(`${API_ENDPOINTS.subscriptionPlans.replace('/plans', '')}/${userId}`, {
      method: 'PATCH', headers, body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  listSubscriptions: (accessToken: string) =>
    get(API_ENDPOINTS.adminSubscriptions, accessToken),
};

// ── Abonnements ───────────────────────────────────────────────────────────────
export const subscriptionApi = {
  getPlans: () =>
    fetch(API_ENDPOINTS.subscriptionPlans).then((r) => r.json()),

  getMySubscription: (accessToken: string) =>
    get(API_ENDPOINTS.subscriptionMe, accessToken),

  subscribe: (accessToken: string, plan: SubscriptionPlan) =>
    post(API_ENDPOINTS.subscriptionSubscribe, { plan }, accessToken),

  cancel: (accessToken: string) =>
    fetch(API_ENDPOINTS.subscriptionMe, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()),
};
