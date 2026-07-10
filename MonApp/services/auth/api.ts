import * as FileSystem from 'expo-file-system/legacy';
import { API_ENDPOINTS } from '@/constants/config';

// ── Requêtes robustes ─────────────────────────────────────────────────────────
// Toutes les requêtes passent par request() : jamais de throw vers les écrans,
// toujours un objet { success, message?, data?, status?, networkError? } avec
// un message en français exploitable directement dans une Alert.

const REQUEST_TIMEOUT_MS = 20000;

function httpMessage(status: number): string {
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous.';
  if (status === 403) return 'Accès refusé. Vérifiez votre compte.';
  if (status === 404) return 'Introuvable sur le serveur.';
  if (status === 413) return 'Fichier trop volumineux pour être envoyé.';
  if (status === 429) return 'Trop de tentatives. Patientez un instant.';
  if (status >= 500) return `Le serveur rencontre un problème (erreur ${status}). Réessayez dans un instant.`;
  return `Une erreur est survenue (code ${status}).`;
}

async function request(url: string, options: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return {
      success: false,
      networkError: true,
      message: aborted
        ? 'Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.'
        : 'Pas de connexion internet. Vérifiez votre réseau et réessayez.',
    };
  } finally {
    clearTimeout(timer);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // Réponse non-JSON (page d'erreur Railway, proxy…)
  }
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    if (json.success === undefined) json.success = res.ok;
    if (!res.ok && !json.message) json.message = httpMessage(res.status);
    json.status = res.status;
    return json;
  }
  return {
    success: res.ok,
    status: res.status,
    data: json ?? undefined,
    message: res.ok ? undefined : httpMessage(res.status),
  };
}

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
  let result: FileSystem.FileSystemUploadResult;
  try {
    result = await FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName,
      headers: { Authorization: `Bearer ${accessToken}` },
      parameters: extraFields,
    });
  } catch {
    return {
      success: false,
      message: 'Envoi impossible : vérifiez votre connexion internet, puis réessayez.',
    };
  }
  try {
    const json = JSON.parse(result.body);
    if (json && typeof json === 'object') {
      if (json.success === undefined) json.success = result.status < 400;
      if (result.status >= 400 && !json.message) json.message = httpMessage(result.status);
      return json;
    }
  } catch {
    // corps non-JSON
  }
  return {
    success: result.status < 400,
    message: result.status >= 400 ? httpMessage(result.status) : undefined,
  };
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
  return request(url, { method: 'POST', headers, body: JSON.stringify(body) });
}

async function get(url: string, token: string) {
  return request(url, { headers: { Authorization: `Bearer ${token}` } });
}

async function patch(url: string, body: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
}

async function del(url: string, token: string, body?: object) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  return request(url, { method: 'DELETE', headers, body: body ? JSON.stringify(body) : undefined });
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
    request(API_ENDPOINTS.avatar, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }),

  updateRole: (accessToken: string, role: string) =>
    patch(API_ENDPOINTS.profile, { role }, accessToken),

  // ── Méthodes de connexion (email / Google / Apple) ──────────────────────────
  getAuthMethods: (accessToken: string) =>
    get(API_ENDPOINTS.authMethods, accessToken),

  unlinkProvider: (accessToken: string, provider: 'google' | 'apple') =>
    del(API_ENDPOINTS.unlinkProvider(provider), accessToken),

  setPassword: (accessToken: string, new_password: string) =>
    post(API_ENDPOINTS.setPassword, { new_password }, accessToken),
};

// ── Prestataires ──────────────────────────────────────────────────────────────
async function getPublic(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request(url, { headers });
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
    return request(API_ENDPOINTS.prestataires + '/me', {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
  },

  getPhotos: (accessToken: string, userId?: number) => {
    const url = userId
      ? `${API_ENDPOINTS.prestataires}/${userId}/photos`
      : `${API_ENDPOINTS.prestataires}/me/photos`;
    return get(url, accessToken);
  },

  uploadPhoto: (accessToken: string, formData: FormData) =>
    request(`${API_ENDPOINTS.prestataires}/me/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }),

  setCoverPhoto: (accessToken: string, photoId: number) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return request(`${API_ENDPOINTS.prestataires}/me/photos/${photoId}/cover`, {
      method: 'PUT', headers,
    });
  },

  deletePhoto: (accessToken: string, photoId: number) =>
    del(`${API_ENDPOINTS.prestataires}/me/photos/${photoId}`, accessToken),

  updatePhotoCaption: (accessToken: string, photoId: number, caption: string) => {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    return request(`${API_ENDPOINTS.prestataires}/me/photos/${photoId}/caption`, {
      method: 'PUT', headers, body: JSON.stringify({ caption }),
    });
  },

  // Enregistre une vue du profil (appelé quand un client ouvre la fiche)
  recordView: (userId: number, accessToken?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return request(`${API_ENDPOINTS.prestataires}/${userId}/view`, {
      method: 'POST', headers,
    });
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

  deletePushToken: (accessToken: string, token: string) =>
    del(API_ENDPOINTS.pushToken, accessToken, { token }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
function adminFetch(accessToken: string, url: string, method: string, body?: object) {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (body) headers['Content-Type'] = 'application/json';
  return request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
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

  setSubscription: (accessToken: string, userId: number, data: { plan?: string | null; status?: string }) =>
    patch(`${API_ENDPOINTS.subscriptionPlans.replace('/plans', '')}/${userId}`, data, accessToken),

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
    del(API_ENDPOINTS.calendarEvent(id), accessToken),

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
    return request(API_ENDPOINTS.calendarAvailabilityMe, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
  },

  addBlockedPeriod: (accessToken: string, data: { start_date: string; end_date: string; reason?: string }) =>
    post(API_ENDPOINTS.calendarAvailabilityBlocks, data, accessToken),

  deleteBlockedPeriod: (accessToken: string, id: number) =>
    del(API_ENDPOINTS.calendarAvailabilityBlock(id), accessToken),

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
    prestataire_id?: number;
    client_id?: number; // renseigné quand c'est le prestataire qui fixe le RDV
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

  // Déplace un RDV (prestataire) — le client est notifié par push.
  rescheduleAppointment: (accessToken: string, id: number, data: { new_date: string; new_time: string }) =>
    patch(API_ENDPOINTS.calendarAppointment(id), data, accessToken),

  // Annule un RDV (prestataire ou client) — l'autre partie est notifiée par push.
  cancelAppointment: (accessToken: string, id: number) =>
    post(API_ENDPOINTS.calendarAppointmentCancel(id), {}, accessToken),
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

// ── Abonnement Prestataire (39€/mois, 3 mois offerts) ─────────────────────────
export const prestataireSubApi = {
  // Démarre l'abonnement (essai 90 j) et renvoie le SetupIntent pour saisir la CB.
  start: (accessToken: string) =>
    post(API_ENDPOINTS.prestaSubStart, {}, accessToken),

  // Débloque l'accès après confirmSetupIntent réussi côté app.
  confirm: (accessToken: string, subscriptionId: string) =>
    post(API_ENDPOINTS.prestaSubConfirm, { subscription_id: subscriptionId }, accessToken),

  status: (accessToken: string) =>
    get(API_ENDPOINTS.prestaSubStatus, accessToken),

  cancel: (accessToken: string) =>
    post(API_ENDPOINTS.prestaSubCancel, {}, accessToken),
};

// ── Abonnements (boutiques prestataires) ──────────────────────────────────────
export const subscriptionApi = {
  getPlans: () =>
    request(API_ENDPOINTS.subscriptionPlans),

  getMySubscription: (accessToken: string) =>
    get(API_ENDPOINTS.subscriptionMe, accessToken),

  subscribe: (accessToken: string, plan: SubscriptionPlan) =>
    post(API_ENDPOINTS.subscriptionSubscribe, { plan }, accessToken),

  cancel: (accessToken: string) =>
    del(API_ENDPOINTS.subscriptionMe, accessToken),
};
