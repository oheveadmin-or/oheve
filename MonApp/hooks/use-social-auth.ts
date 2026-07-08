import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

// ⚠️ Le module natif @react-native-google-signin n'existe PAS dans Expo Go
// (il faut un build de dev/EAS). Un import statique fait donc planter TOUTE
// l'app au démarrage ("RNGoogleSignin could not be found"). On le charge donc
// paresseusement et sans jamais throw : dans Expo Go, Google est simplement
// indisponible ; dans le build natif, tout fonctionne normalement.
let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
let isErrorWithCode: (error: unknown) => boolean = () => false;
let statusCodes: Partial<typeof import('@react-native-google-signin/google-signin').statusCodes> = {};
try {
  const g = require('@react-native-google-signin/google-signin');
  GoogleSignin = g.GoogleSignin;
  isErrorWithCode = g.isErrorWithCode;
  statusCodes = g.statusCodes;
} catch {
  // Module natif absent (Expo Go) — Google Sign-In restera indisponible.
}

import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';

/**
 * Identité sociale obtenue côté app, transmise au backend qui la VÉRIFIE
 * (identity_token Apple contre les clés JWKS d'Apple, google_id_token contre
 * les clés JWKS de Google) avant de connecter ou lier le compte.
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
  /** id_token Google (JWT signé par Google) vérifié côté serveur */
  google_id_token?: string;
}

// Configuration Google Sign-In native (une seule fois au chargement du module).
// webClientId sert d'« audience » de l'id_token : c'est LUI que le backend valide.
// iosClientId identifie l'app iOS auprès de Google.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const isGoogleConfigured = Boolean(GOOGLE_WEB_CLIENT_ID) && GoogleSignin != null;

if (isGoogleConfigured) {
  GoogleSignin!.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    // On veut l'id_token pour le vérifier côté serveur
    offlineAccess: false,
  });
}

/** Ouvre le sélecteur de compte Google natif et retourne l'identité, ou null si annulé. */
export async function getGoogleCredential(): Promise<SocialCredential | null> {
  if (!isGoogleConfigured || !GoogleSignin) {
    Alert.alert('Google indisponible', "La connexion Google n'est pas disponible dans cette version. Utilise l'e-mail ou Apple.");
    return null;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Force le sélecteur de compte à chaque connexion (pas de reprise silencieuse)
    await GoogleSignin.signOut().catch(() => {});
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled' || !response.data) return null;

    const { idToken, user } = response.data;
    if (!idToken) {
      Alert.alert('Erreur Google', "Jeton Google manquant. Réessaie.");
      return null;
    }

    return {
      provider: 'google',
      provider_user_id: user.id,
      email: user.email?.toLowerCase() ?? null,
      nom: user.familyName ?? user.name?.split(' ').slice(1).join(' ') ?? '',
      prenom: user.givenName ?? user.name?.split(' ')[0] ?? '',
      avatar_url: user.photo ?? undefined,
      google_id_token: idToken,
    };
  } catch (err: unknown) {
    if (isErrorWithCode(err)) {
      const code = (err as { code?: string }).code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (code === statusCodes.IN_PROGRESS) return null;
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google indisponible', 'Google Play Services requis.');
        return null;
      }
    }
    Alert.alert('Erreur Google', 'Connexion Google impossible. Réessaie.');
    return null;
  }
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

export function useSocialAuth(onAfterSignIn?: (isNew: boolean, role: string) => void) {
  const { signIn } = useAuth();

  const completeSignIn = async (credential: SocialCredential) => {
    const res = await fetch(API_ENDPOINTS.socialAuth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential),
    });
    const result = await res.json();

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
