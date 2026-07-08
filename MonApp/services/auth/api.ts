import * as FileSystem from 'expo-file-system/legacy';
import { API_ENDPOINTS } from '@/constants/config';

/**
 * Upload multipart via FileSystem.uploadAsync — seule méthode fiable sur Expo
 * pour envoyer un fichier (contourne l'erreur "Unsupported FormDataPart").
 */
export async function uploadFile(
  url: string,
  accessToken: string,
  fileUri: string,
  fieldName = 'photo',
  extraFields?: Record<string, string>,
): Promise<{ success: boolean; data?: Record<string, unknown>; message?: string }> {
  const result = await FileSystem.uploadAsync(url, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    headers: { Authorization: `Bearer ${accessToken}` },
    parameters: extraFields,
  });
  try {
    return JSON.parse(result.body);
  } catch {
    return { success: false, message: `Erreur serveur (${result.status})` };
  }
}

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

  uploadAvatar: (accessToken: string, formData: FormData) =>
    fetch(API_ENDPOINTS.avatar, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }).then((r) => r.json()),

  updateRole: (accessToken: string, role: string) =>
    patch(API_ENDPOINTS.profile, { role }, accessToken),

  // ── Méthodes de connexion (email / Google / Apple) ──────────────────────────
  getAuthMethods: (accessToken: string) =>
    get(API_ENDPOINTS.authMethods, accessToken),

  unlinkProvider: (accessToken: string, provider: 'google' | 'apple') =>
    fetch(API_ENDPOINTS.unlinkProvider(provider), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()),

  setPassword: (accessToken: string, new_password: string) =>
    post(API_ENDPOINTS.setPassword, { new_password }, accessToken),
};

// ── Prestataires ──────────────────────────────────────────────────────────────
async function getPublic(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  return res.json();
}

export const prestatairesApi = {
  list: (accessToken?: string, params?: { category?: string; city?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.city) q.set('city', params.city);
    const url = `${API_ENDPOINTS.prestataires}?${q.toString()}`;
    return getPublic(url, accessToken);
  },

  getById: (accessToken?: string, userId?: number) =>
    getPublic(`${API_ENDPOINTS.prestataires}/${userId}`, accessToken),

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

  updatePhotoCaption: (accessToken: string, photoId: number, caption: string) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(`${API_ENDPOINTS.prestataires}/me/photos/${photoId}/caption`, {
      method: 'PUT', headers, body: JSON.stringify({ caption }),
    }).then((r) => r.json());
  },

  // Enregistre une vue du profil (appelé quand un client ouvre la fiche)
  recordView: (userId: number, accessToken?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(`${API_ENDPOINTS.prestataires}/${userId}/view`, {
      method: 'POST', headers,
    }).then((r) => r.json()).catch(() => null);
  },
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

  // ⚠️ On passe par FileSystem.uploadAsync (comme les photos portfolio) : le
  // couple fetch + FormData échoue sur Expo ("Unsupported FormDataPart"), ce qui
  // rendait l'envoi de fichiers en message impossible dans les deux sens.
  uploadAttachment: (
    accessToken: string,
    conversationId: number,
    file: { uri: string; name: string; type: string },
    caption?: string,
  ) =>
    uploadFile(
      `${API_ENDPOINTS.conversations}/${conversationId}/attachments`,
      accessToken,
      file.uri,
      'file',
      caption ? { caption } : undefined,
    ),

  registerPushToken: (accessToken: string, token: string, platform: string) =>
    post(API_ENDPOINTS.pushToken, { token, platform }, accessToken),

  deletePushToken: (accessToken: string, token: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(API_ENDPOINTS.pushToken, { method: 'DELETE', headers, body: JSON.stringify({ token }) }).then((r) => r.json());
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────────
function adminFetch(accessToken: string, url: string, method: string, body?: object) {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());
}

export const adminApi = {
  getStats: (accessToken: string) =>
    get(API_ENDPOINTS.adminStats, accessToken),

  getPaymentStats: (accessToken: string) =>
    get(API_ENDPOINTS.adminPaymentsStats, accessToken),

  listUsers: (accessToken: string, params?: { role?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.search) q.set('search', params.search);
    return get(`${API_ENDPOINTS.adminUsers}?${q.toString()}`, accessToken);
  },

  getUser: (accessToken: string, userId: number) =>
    get(`${API_ENDPOINTS.adminUsers}/${userId}`, accessToken),

  updateUser: (accessToken: string, userId: number, data: {
    role?: UserRole; is_active?: boolean; nom?: string; prenom?: string; phone?: string;
  }) => adminFetch(accessToken, `${API_ENDPOINTS.adminUsers}/${userId}`, 'PATCH', data),

  deleteUser: (accessToken: string, userId: number) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminUsers}/${userId}`, 'DELETE'),

  listPrestataires: (accessToken: string, search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return get(`${API_ENDPOINTS.adminPrestataires}${q}`, accessToken);
  },

  verifyPrestataire: (accessToken: string, userId: number, is_verified: boolean) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminPrestataires}/${userId}/verify`, 'PATCH', { is_verified }),

  suspendPrestataire: (accessToken: string, userId: number, is_suspended: boolean) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminPrestataires}/${userId}/suspend`, 'PATCH', { is_suspended }),

  deletePrestataire: (accessToken: string, userId: number) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminPrestataires}/${userId}`, 'DELETE'),

  listBoutiques: (accessToken: string, search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return get(`${API_ENDPOINTS.adminBoutiques}${q}`, accessToken);
  },

  updateBoutique: (accessToken: string, userId: number, data: object) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminBoutiques}/${userId}`, 'PATCH', data),

  deleteBoutique: (accessToken: string, userId: number) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminBoutiques}/${userId}`, 'DELETE'),

  listPublicSites: (accessToken: string) =>
    get(API_ENDPOINTS.adminPublicSites, accessToken),

  updatePublicSite: (accessToken: string, siteId: number, data: object) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminPublicSites}/${siteId}`, 'PATCH', data),

  deletePublicSite: (accessToken: string, siteId: number) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminPublicSites}/${siteId}`, 'DELETE'),

  updateAnnonce: (accessToken: string, profileId: number, data: object) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminAnnonces}/${profileId}`, 'PATCH', data),

  listReservations: (accessToken: string, status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return get(`${API_ENDPOINTS.adminReservations}${q}`, accessToken);
  },

  updateReservation: (accessToken: string, resId: number, data: object) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminReservations}/${resId}`, 'PATCH', data),

  deleteReservation: (accessToken: string, resId: number) =>
    adminFetch(accessToken, `${API_ENDPOINTS.adminReservations}/${resId}`, 'DELETE'),

  listPayments: (accessToken: string) =>
    get(API_ENDPOINTS.adminPayments, accessToken),

  setSubscription: (accessToken: string, userId: number, data: { plan?: string | null; status?: string }) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(`${API_ENDPOINTS.subscriptionPlans.replace('/plans', '')}/${userId}`, {
      method: 'PATCH', headers, body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  listSubscriptions: (accessToken: string) =>
    get(API_ENDPOINTS.adminSubscriptions, accessToken),
};

// ── Calendrier ────────────────────────────────────────────────────────────────
export type CalendarEventType = 'appointment' | 'task' | 'event';

export interface CalendarEvent {
  id: number;
  user_id: number;
  type: CalendarEventType;
  title: string;
  description?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  prestataire_id?: number | null;
  appointment_request_id?: number | null;
}

export interface AppointmentRequest {
  id: number;
  client_id: number;
  prestataire_id: number;
  title: string;
  requested_date: string;
  requested_time: string;
  proposed_date?: string | null;
  proposed_time?: string | null;
  notes?: string | null;
  status: 'pending' | 'accepted' | 'refused' | 'counter_proposed';
  client_prenom?: string;
  client_nom?: string;
  prestataire_name?: string;
}

export const calendarApi = {
  listEvents: (accessToken: string) =>
    get(API_ENDPOINTS.calendarEvents, accessToken),

  createEvent: (accessToken: string, data: {
    type: CalendarEventType;
    title: string;
    description?: string;
    event_date?: string;
    event_time?: string;
  }) => post(API_ENDPOINTS.calendarEvents, data, accessToken),

  updateEvent: (accessToken: string, id: number, data: object) =>
    patch(API_ENDPOINTS.calendarEvent(id), data, accessToken),

  deleteEvent: (accessToken: string, id: number) =>
    fetch(API_ENDPOINTS.calendarEvent(id), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()),

  getUpcoming: (accessToken: string) =>
    get(API_ENDPOINTS.calendarUpcoming, accessToken),

  getMyAvailability: (accessToken: string) =>
    get(API_ENDPOINTS.calendarAvailabilityMe, accessToken),

  updateMyAvailability: (accessToken: string, data: {
    working_days: number[];
    work_start: string;
    work_end: string;
    slot_duration_minutes?: number;
  }) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return fetch(API_ENDPOINTS.calendarAvailabilityMe, {
      method: 'PUT', headers, body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  addBlockedPeriod: (accessToken: string, data: { start_date: string; end_date: string; reason?: string }) =>
    post(API_ENDPOINTS.calendarAvailabilityBlocks, data, accessToken),

  deleteBlockedPeriod: (accessToken: string, id: number) =>
    fetch(API_ENDPOINTS.calendarAvailabilityBlock(id), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()),

  getProviderSlots: (accessToken: string, prestataireId: number, from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    return get(`${API_ENDPOINTS.calendarProviderSlots(prestataireId)}${qs ? `?${qs}` : ''}`, accessToken);
  },

  listAppointments: (accessToken: string) =>
    get(API_ENDPOINTS.calendarAppointments, accessToken),

  requestAppointment: (accessToken: string, data: {
    prestataire_id: number;
    title: string;
    requested_date: string;
    requested_time: string;
    notes?: string;
  }) => post(API_ENDPOINTS.calendarAppointments, data, accessToken),

  respondToAppointment: (accessToken: string, id: number, data: {
    action: 'accept' | 'refuse' | 'counter';
    proposed_date?: string;
    proposed_time?: string;
  }) => patch(API_ENDPOINTS.calendarAppointmentRespond(id), data, accessToken),
};

// ── Oheve Premium ─────────────────────────────────────────────────────────────
export const premiumApi = {
  purchase: (accessToken: string) =>
    post(API_ENDPOINTS.premiumPurchase, {}, accessToken),

  // Persiste le premium côté serveur juste après un paiement réussi, sans
  // dépendre du webhook Stripe (source des sites publiés bloqués « activer Premium »).
  confirm: (accessToken: string, paymentIntentId: string) =>
    post(API_ENDPOINTS.premiumConfirm, { payment_intent_id: paymentIntentId }, accessToken),

  status: (accessToken: string) =>
    get(API_ENDPOINTS.premiumStatus, accessToken),
};

// ── Abonnements (boutiques prestataires) ──────────────────────────────────────
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
