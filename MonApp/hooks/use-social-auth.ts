import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface SocialUser {
  provider: 'google' | 'apple';
  provider_user_id: string;
  email: string;
  nom: string;
  prenom: string;
  avatar_url?: string;
}

async function callSocialAuthBackend(socialUser: SocialUser) {
  const res = await fetch(API_ENDPOINTS.socialAuth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(socialUser),
  });
  return res.json();
}

export function useSocialAuth(onAfterSignIn?: (isNew: boolean, role: string) => void) {
  const { signIn } = useAuth();

  // ── Google via Supabase OAuth ─────────────────────────────────────────────
  const signInWithGoogle = async () => {
    try {
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
        return;
      }

      // Ouvre le navigateur et attend le redirect
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success' || !result.url) return;

      // Extrait access_token / refresh_token du fragment (#) ou query (?)
      const fragment = result.url.includes('#')
        ? result.url.split('#')[1]
        : result.url.split('?')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) {
        Alert.alert('Erreur Google', 'Tokens manquants dans le redirect.');
        return;
      }

      // Établit la session Supabase pour récupérer le profil utilisateur
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError || !sessionData.session) {
        Alert.alert('Erreur Google', sessionError?.message ?? 'Session invalide.');
        return;
      }

      const sbUser = sessionData.session.user;
      const meta = sbUser.user_metadata ?? {};

      // Appelle notre backend custom avec les infos Google
      const result2 = await callSocialAuthBackend({
        provider: 'google',
        provider_user_id: sbUser.id,
        email: sbUser.email ?? '',
        nom: meta.family_name ?? meta.last_name ?? meta.full_name?.split(' ').slice(1).join(' ') ?? '',
        prenom: meta.given_name ?? meta.first_name ?? meta.full_name?.split(' ')[0] ?? '',
        avatar_url: meta.avatar_url ?? meta.picture,
      });

      // On n'a plus besoin de la session Supabase Auth
      await supabase.auth.signOut();

      if (!result2.success) {
        Alert.alert('Erreur', result2.message ?? 'Connexion Google échouée');
        return;
      }
      await signIn(result2.data);
      if (result2.data.isNew) {
        router.replace('/(auth)/role-select');
        return;
      }
      onAfterSignIn?.(result2.data.isNew, result2.data.role);
    } catch {
      Alert.alert('Erreur', 'Connexion Google impossible. Vérifiez votre connexion.');
    }
  };

  // ── Apple Sign In ──────────────────────────────────────────────────────────
  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign In', 'Disponible sur iPhone et iPad uniquement.');
      return;
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const result = await callSocialAuthBackend({
        provider: 'apple',
        provider_user_id: credential.user,
        email: credential.email ?? `${credential.user}@privaterelay.appleid.com`,
        nom: credential.fullName?.familyName ?? '',
        prenom: credential.fullName?.givenName ?? '',
      });

      if (!result.success) {
        Alert.alert('Erreur', result.message ?? 'Connexion Apple échouée');
        return;
      }
      await signIn(result.data);
      if (result.data.isNew) {
        router.replace('/(auth)/role-select');
        return;
      }
      onAfterSignIn?.(result.data.isNew, result.data.role);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Erreur', 'Connexion Apple impossible.');
    }
  };

  return { signInWithGoogle, signInWithApple };
}
