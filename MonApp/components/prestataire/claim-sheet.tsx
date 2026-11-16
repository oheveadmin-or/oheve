import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { PRESTA_CATEGORIES } from '@/lib/presta-categories';
import { prestatairesApi } from '@/services/auth/api';

export type ClaimMatch = {
  id: number;
  business_name: string;
  city: string | null;
  category: string | null;
  activated: boolean;
  email_hint: string | null;
};

type Outcome = { outcome: 'sent' | 'already_active' | 'review'; username: string | null; email_hint: string | null };

type Props = {
  match: ClaimMatch;
  accessToken: string;
  /** Ce que le prestataire a saisi (le serveur revérifie la correspondance). */
  typed: { business_name: string; city: string; phone?: string };
  /** Email avec lequel il vient de s'inscrire (pour le message « on vous recontacte »). */
  myEmail: string;
  /** « Ce n'est pas moi » : on continue l'inscription normalement. */
  onNotMe: () => void;
  /** Rattachement fait : son compte vide a été supprimé → retour à la connexion. */
  onDone: () => void;
};

/**
 * À l'inscription d'un prestataire : « Votre fiche existe déjà ? ».
 * Étapes : c'est vous ? → (si un email est connu) c'est bien votre adresse ? → envoyé.
 */
export function ClaimSheet({ match, accessToken, typed, myEmail, onNotMe, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'ask' | 'email'>('ask');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Outcome | null>(null);

  const cat = PRESTA_CATEGORIES.find((c) => c.key === match.category);

  const send = async (emailConfirmed: boolean) => {
    setSending(true);
    setError(null);
    const res = await prestatairesApi.claimSend(accessToken, {
      target_id: match.id, email_confirmed: emailConfirmed, ...typed,
    });
    setSending(false);
    if (!res?.success || !res.data) {
      setError(res?.message ?? "L'envoi a échoué. Réessayez.");
      return;
    }
    setResult(res.data as Outcome);
  };

  const yesItsMe = () => {
    if (match.email_hint) setStep('email');
    else send(false);
  };

  let body: React.ReactNode;
  if (result) {
    const icon = result.outcome === 'review' ? 'people-outline' : 'mail-open-outline';
    const title = result.outcome === 'sent'
      ? 'Identifiants envoyés'
      : result.outcome === 'already_active' ? 'Votre compte existe déjà' : 'Demande envoyée';
    const text = result.outcome === 'sent'
      ? `Vos identifiants viennent de partir à ${result.email_hint}. Connectez-vous avec l'identifiant ${result.username} et le mot de passe reçu (pensez à regarder dans les spams).`
      : result.outcome === 'already_active'
        ? `Cette fiche a déjà été activée. Connectez-vous avec l'adresse ${result.email_hint}, ou touchez « Mot de passe oublié » sur l'écran de connexion.`
        : `L'équipe Oheve vérifie que cette fiche est bien la vôtre, puis vous envoie vos identifiants à ${myEmail}.`;
    body = (
      <>
        <View style={s.iconWrap}><Ionicons name={icon} size={28} color={C.saugeDark} /></View>
        <ThemedText style={s.title}>{title}</ThemedText>
        <ThemedText style={s.text}>{text}</ThemedText>
        <Pressable style={s.primary} onPress={onDone}>
          <ThemedText style={s.primaryTxt}>Aller à la connexion</ThemedText>
        </Pressable>
      </>
    );
  } else if (step === 'ask') {
    body = (
      <>
        <View style={s.iconWrap}><Ionicons name="storefront-outline" size={28} color={C.saugeDark} /></View>
        <ThemedText style={s.title}>Votre fiche existe peut-être déjà</ThemedText>
        <ThemedText style={s.text}>
          L&apos;équipe Oheve a déjà créé cette fiche. Si c&apos;est la vôtre, inutile de tout recommencer :
          on vous envoie vos identifiants.
        </ThemedText>
        <View style={s.card}>
          <ThemedText style={s.cardName} numberOfLines={2}>{match.business_name}</ThemedText>
          <ThemedText style={s.cardMeta} numberOfLines={1}>
            {[cat ? `${cat.emoji} ${cat.label}` : null, match.city].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
        <Pressable style={s.primary} onPress={yesItsMe} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <ThemedText style={s.primaryTxt}>Oui, c&apos;est ma fiche</ThemedText>}
        </Pressable>
        <Pressable style={s.secondary} onPress={onNotMe} disabled={sending}>
          <ThemedText style={s.secondaryTxt}>Non, ce n&apos;est pas moi</ThemedText>
        </Pressable>
      </>
    );
  } else {
    body = (
      <>
        <View style={s.iconWrap}><Ionicons name="mail-outline" size={28} color={C.saugeDark} /></View>
        <ThemedText style={s.title}>C&apos;est bien votre adresse ?</ThemedText>
        <ThemedText style={s.text}>Nous allons envoyer vos identifiants à l&apos;adresse connue pour cette fiche :</ThemedText>
        <ThemedText style={s.hint}>{match.email_hint}</ThemedText>
        <Pressable style={s.primary} onPress={() => send(true)} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <ThemedText style={s.primaryTxt}>Oui, envoyer mes identifiants</ThemedText>}
        </Pressable>
        <Pressable style={s.secondary} onPress={() => send(false)} disabled={sending}>
          <ThemedText style={s.secondaryTxt}>Ce n&apos;est plus mon adresse</ThemedText>
        </Pressable>
        <Pressable style={s.link} onPress={() => setStep('ask')} disabled={sending} hitSlop={8}>
          <ThemedText style={s.linkTxt}>← Retour</ThemedText>
        </Pressable>
      </>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={result ? onDone : onNotMe}>
      <View style={s.backdrop}>
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={[s.sheet, { marginBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          {body}
          {error ? <ThemedText style={s.error}>{error}</ThemedText> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(52,54,48,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 22, gap: 10, maxWidth: 460, width: '100%', alignSelf: 'center' },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.saugePale,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 4,
  },
  title: { fontSize: 21, fontFamily: 'OheveSerif-Medium', color: C.textDark, textAlign: 'center' },
  text: { fontSize: 14, color: C.textMid, lineHeight: 21, textAlign: 'center' },
  hint: { fontSize: 16, fontWeight: '700', color: C.textDark, textAlign: 'center', marginVertical: 4 },
  card: { borderWidth: 1.5, borderColor: C.sauge, borderRadius: RADIUS.md, padding: 14, gap: 4, marginVertical: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: C.textDark },
  cardMeta: { fontSize: 13, color: C.textMid },
  primary: { backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondary: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: C.taupe },
  secondaryTxt: { color: C.textDark, fontSize: 15, fontWeight: '600' },
  link: { alignItems: 'center', paddingVertical: 4 },
  linkTxt: { color: C.textMid, fontSize: 13 },
  error: { color: C.error, fontSize: 13, textAlign: 'center' },
});
