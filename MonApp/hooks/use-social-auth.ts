import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Identité sociale obtenue côté app, transmise au backend qui la VÉRIFIE
 * (identity_token Apple contre les clés JWKS d'Apple, supabase_access_token
 * contre l'API Supabase) avant de connecter ou lier le compte.
 */
export interface SocialCredential {
  provider: 'google' | 'apple';
  provider_user_id: string;
  /** null pour Apple après la 1ère connexion — le backend retrouve le compte par provider_user_id */
  email: string | null;
  nom: string;
  prenom: string;
  avatar_url?: string;
  identity_token?: string;
  supabase_access_token?: string;
}

/** Ouvre le flux OAuth Google (via Supabase) et retourne l'identité, ou null si annulé. */
export async function getGoogleCredential(): Promise<SocialCredential | null> {
  if (!supabase) {
    Alert.alert('Google indisponible', "La connexion Google n'est pas configurée dans cette version.");
    return null;
  }
  const redirectTo = 'monapp://';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data.url) {
    Alert.alert('Erreur Google', error?.message ?? 'URL OAuth manquante.');
    return null;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return null;

  // Extrait access_token / refresh_token du fragment (#) ou query (?)
  const fragment = result.url.includes('#')
    ? result.url.split('#')[1]
    : result.url.split('?')[1] ?? '';
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) {
    Alert.alert('Erreur Google', 'Tokens manquants dans le redirect.');
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError || !sessionData.session) {
    Alert.alert('Erreur Google', sessionError?.message ?? 'Session invalide.');
    return null;
  }

  const sbUser = sessionData.session.user;
  const meta = sbUser.user_metadata ?? {};

  return {
    provider: 'google',
    provider_user_id: sbUser.id,
    email: sbUser.email?.toLowerCase() ?? null,
    nom: meta.family_name ?? meta.last_name ?? meta.full_name?.split(' ').slice(1).join(' ') ?? '',
    prenom: meta.given_name ?? meta.first_name ?? meta.full_name?.split(' ')[0] ?? '',
    avatar_url: meta.avatar_url ?? meta.picture,
    supabase_access_token: sessionData.session.access_token,
  };
}

/** Ouvre le dialogue Apple Sign In natif et retourne l'identité, ou null si annulé. */
export async function getAppleCredential(): Promise<SocialCredential | null> {
  if (Platform.OS !== 'ios') {
    Alert.alert('Apple Sign In', 'Disponible sur iPhone et iPad uniquement.');
    return null;
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    // IMPORTANT : Apple ne fournit l'email qu'à la 1ère connexion. On n'invente
    // JAMAIS d'email ici — le backend retrouve le compte via provider_user_id,
    // et l'email (réel ou relay "Masquer mon email") vient du identity_token vérifié.
    return {
      provider: 'apple',
      provider_user_id: credential.user,
      email: credential.email?.toLowerCase() ?? null,
      nom: credential.fullName?.familyName ?? '',
      prenom: credential.fullName?.givenName ?? '',
      identity_token: credential.identityToken ?? undefined,
    };
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    Alert.alert('Erreur', 'Connexion Apple impossible.');
    return null;
  }
}

/** Ferme la session Supabase temporaire (utilisée seulement pour l'OAuth Google). */
async function cleanupSupabaseSession() {
  try {
    await supabase?.auth.signOut();
  } catch {
    // non bloquant
  }
}

export function useSocialAuth(onAfterSignIn?: (isNew: boolean, role: string) => void) {
  const { signIn } = useAuth();

  const completeSignIn = async (credential: SocialCredential) => {
    const res = await fetch(API_ENDPOINTS.socialAuth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential),
    });
    const result = await res.json();

    if (credential.provider === 'google') await cleanupSupabaseSession();

    if (!result.success) {
      Alert.alert('Erreur', result.message ?? `Connexion ${credential.provider === 'apple' ? 'Apple' : 'Google'} échouée`);
      return;
    }
    await signIn(result.data);
    if (result.data.isNew) {
      router.replace('/(auth)/role-select');
      return;
    }
    onAfterSignIn?.(result.data.isNew, result.data.role);
  };

  const signInWithGoogle = async () => {
    try {
      const credential = await getGoogleCredential();
      if (!credential) return;
      await completeSignIn(credential);
    } catch {
      Alert.alert('Erreur', 'Connexion Google impossible. Vérifiez votre connexion.');
    }
  };

  const signInWithApple = async () => {
    try {
      const credential = await getAppleCredential();
      if (!credential) return;
      await completeSignIn(credential);
    } catch {
      Alert.alert('Erreur', 'Connexion Apple impossible.');
    }
  };

  return { signInWithGoogle, signInWithApple };
}

/**
 * Liaison d'un provider au compte déjà connecté (écran "Méthodes de connexion").
 * Retourne les méthodes à jour, ou null si annulé/échec (une alerte est affichée).
 */
export async function linkSocialProvider(
  provider: 'google' | 'apple',
  accessToken: string,
): Promise<{ has_password: boolean; providers: { provider: string; email: string | null }[] } | null> {
  const credential = provider === 'google' ? await getGoogleCredential() : await getAppleCredential();
  if (!credential) return null;
  try {
    const res = await fetch(API_ENDPOINTS.linkProvider, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(credential),
    });
    const result = await res.json();
    if (credential.provider === 'google') await cleanupSupabaseSession();
    if (!result.success) {
      Alert.alert('Liaison impossible', result.message ?? 'Erreur lors de la liaison');
      return null;
    }
    return result.data;
  } catch {
    Alert.alert('Erreur', 'Impossible de joindre le serveur.');
    return null;
  }
}
