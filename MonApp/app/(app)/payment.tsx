import { Ionicons } from '@expo/vector-icons';
import { CardField, initStripe, useConfirmPayment } from '@stripe/stripe-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import { addExpense, resolveCategoryKey } from '@/lib/budget-store';
import { addProviderToHome, isProviderInHome } from '@/lib/providers-store';
import { premiumApi } from '@/services/auth/api';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

type StripeState = 'loading' | 'ready' | 'missing-key' | 'error';

/**
 * Initialise Stripe AVANT d'afficher le champ carte. Avec <StripeProvider>,
 * l'init partait en arrière-plan pendant que le CardField natif se montait :
 * sur Android, sans clé (variable EAS absente du build) ou avant la fin de
 * l'init, l'écran restait entièrement blanc, sans aucun message.
 */
function useStripeInit(serverKey?: string) {
  const key = STRIPE_PUBLISHABLE_KEY || serverKey || '';
  const [initState, setInitState] = useState<Exclude<StripeState, 'missing-key'>>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    initStripe({ publishableKey: key, merchantIdentifier: 'merchant.com.oheve.app' })
      .then(() => {
        if (!cancelled) setInitState('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg(err?.message ?? null);
        setInitState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const retry = () => {
    setInitState('loading');
    setAttempt((n) => n + 1);
  };

  const state: StripeState = key ? initState : 'missing-key';
  return { state, errorMsg, retry };
}

function PaymentForm({
  prestataireId,
  prestataireNom,
  prestataireCategorie,
  amountCents,
  currency,
  description,
  conversationId,
  productId,
  prefetchedClientSecret,
}: {
  prestataireId: number;
  prestataireNom: string;
  prestataireCategorie?: string;
  amountCents: number;
  currency: string;
  description: string;
  conversationId?: number;
  productId?: string;
  prefetchedClientSecret?: string;
}) {
  const { user, updateUser } = useAuth();
  const { confirmPayment, loading } = useConfirmPayment();
  const [cardComplete, setCardComplete] = useState(false);
  const [paying, setPaying] = useState(false);

  const isPremium = productId === 'oheve_premium';
  const commission = isPremium ? 0 : Math.round(amountCents * 0.05);
  const net = amountCents - commission;

  const handlePay = async () => {
    if (!cardComplete || !user?.accessToken) return;
    setPaying(true);

    try {
      let clientSecret = prefetchedClientSecret;

      if (!clientSecret) {
        // Créer le PaymentIntent côté serveur (paiement prestataire)
        const res = await fetch(API_ENDPOINTS.paymentsCreateIntent, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.accessToken}`,
          },
          body: JSON.stringify({
            prestataire_id: prestataireId,
            amount_cents: amountCents,
            currency,
            description,
            conversation_id: conversationId,
          }),
        });
        const json = await res.json();

        if (!json.success || !json.data?.client_secret) {
          Alert.alert('Erreur', json.message ?? 'Impossible d\'initialiser le paiement.');
          return;
        }
        clientSecret = json.data.client_secret;
      }

      // Confirmer avec la CB saisie
      const { error, paymentIntent } = await confirmPayment(clientSecret!, {
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails: { name: `${user.prenom} ${user.nom}` } },
      });

      if (error) {
        Alert.alert('Paiement refusé', error.message);
      } else if (paymentIntent) {
        if (isPremium) {
          // Persiste le premium côté serveur TOUT DE SUITE (ne pas attendre le
          // webhook Stripe : s'il n'arrive pas, le site publié reste bloqué
          // « activer Premium » alors que le client a payé). Le flag local suit.
          let serverConfirmed = false;
          try {
            const confirm = await premiumApi.confirm(user.accessToken, paymentIntent.id);
            serverConfirmed = !!confirm.success;
          } catch {
            /* réseau : le webhook Stripe reste le filet de sécurité */
          }
          await updateUser({ premium: true, premium_purchased_at: new Date().toISOString() });
          Alert.alert(
            '✅ Bienvenue dans Oheve Premium !',
            serverConfirmed
              ? 'Toutes les fonctionnalités sont maintenant débloquées.'
              : 'Paiement reçu. L\'activation complète peut prendre un instant — votre site sera publié sous peu.',
            [{ text: 'Commencer', onPress: () => router.replace('/(app)/(tabs)') }],
          );
        } else {
          // Persiste le statut tout de suite (le webhook Stripe reste le filet).
          fetch(API_ENDPOINTS.paymentsConfirm, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
            body: JSON.stringify({ payment_intent_id: paymentIntent.id }),
          }).catch(() => { /* réseau : le webhook Stripe prendra le relais */ });
          // Prestataire payé = prestataire retenu : il rejoint « Mes prestataires »
          // (une salle devient ainsi le lieu affiché sur l'accueil, avec sa photo).
          if (!isProviderInHome(String(prestataireId))) {
            addProviderToHome({
              id: String(prestataireId), nom: prestataireNom, categorie: prestataireCategorie ?? '',
              ville: '', note: 0, telephone: '', email: '', adresse: '', instagram: '',
            });
          }
          const catKey = resolveCategoryKey(prestataireCategorie ?? '');
          addExpense({
            categoryKey: catKey,
            amount: amountCents / 100,
            type: 'solde',
            providerName: prestataireNom,
            providerCategory: prestataireCategorie,
            note: description,
          });
          Alert.alert(
            '✅ Contribution envoyée',
            `${(amountCents / 100).toFixed(2)} € envoyé à ${prestataireNom}\nAjouté à votre budget.`,
            [{ text: 'OK', onPress: () => router.back() }],
          );
        }
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur réseau est survenue.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.form}>
      {/* Résumé */}
      <View style={styles.summaryCard}>
        {isPremium ? (
          <>
            <Row label="Formule" value="Oheve Premium" bold />
            <Row label="Paiement unique TTC" value={`${(amountCents / 100).toFixed(2)} €`} bold />
            <Row label="Accès illimité dans le temps" value="✓" small />
          </>
        ) : (
          <>
            <Row label="Prestataire" value={prestataireNom} />
            <Row label="Montant total" value={`${(amountCents / 100).toFixed(2)} €`} bold />
            <Row label="Commission plateforme (5%)" value={`${(commission / 100).toFixed(2)} €`} small />
            <Row label="Reversé au prestataire" value={`${(net / 100).toFixed(2)} €`} small />
            {description ? <Row label="Description" value={description} small /> : null}
          </>
        )}
      </View>

      {/* Saisie carte */}
      <ThemedText style={styles.label}>Carte bancaire</ThemedText>
      <CardField
        postalCodeEnabled={false}
        style={styles.cardField}
        cardStyle={{
          backgroundColor: '#fff',
          textColor: C.textDark,
          borderColor: C.taupe,
          borderWidth: 1.5,
          borderRadius: 12,
          placeholderColor: C.textLight,
        }}
        onCardChange={(card) => setCardComplete(card.complete)}
      />
      <ThemedText style={styles.hint}>
        Visa, Mastercard, Amex — cartes du monde entier acceptées
      </ThemedText>

      <Pressable
        style={[styles.payBtn, (!cardComplete || paying || loading) && styles.payBtnOff]}
        onPress={handlePay}
        disabled={!cardComplete || paying || loading}
      >
        {paying || loading
          ? <ActivityIndicator color="#fff" />
          : (
            <View style={styles.payBtnInner}>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <ThemedText style={styles.payBtnTxt}>
                {isPremium
                  ? `Activer Premium · ${(amountCents / 100).toFixed(2)} €`
                  : `Contribution sécurisée · ${(amountCents / 100).toFixed(2)} €`}
              </ThemedText>
            </View>
          )}
      </Pressable>

      <View style={styles.secureRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color={C.textLight} />
        <ThemedText style={styles.secureTxt}>
          {isPremium ? 'Paiement unique · Paiement sécurisé · Aucun abonnement' : 'Contribution sécurisée · SSL 256 bits'}
        </ThemedText>
      </View>
    </View>
  );
}

function Row({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) {
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, small && styles.rowSmall]}>{label}</ThemedText>
      <ThemedText style={[styles.rowValue, bold && styles.rowBold, small && styles.rowSmall]}>{value}</ThemedText>
    </View>
  );
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    prestataire_id: string;
    prestataire_nom: string;
    prestataire_categorie?: string;
    amount_cents: string;
    currency?: string;
    description?: string;
    conversation_id?: string;
    product_id?: string;
    client_secret?: string;
    publishable_key?: string;
  }>();
  const stripe = useStripeInit(params.publishable_key);

  const amountCents = parseInt(params.amount_cents ?? '0', 10);
  const currency = params.currency ?? 'eur';

  if (!amountCents || !params.prestataire_id) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ThemedText style={{ padding: 24, color: C.textMid }}>Paramètres de paiement manquants.</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.saugeDark} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          {params.product_id === 'oheve_premium' ? 'Oheve Premium' : 'Contribution sécurisée'}
        </ThemedText>
        <View style={{ width: 22 }} />
      </View>

      {stripe.state !== 'ready' ? (
        <View style={styles.status}>
          {stripe.state === 'loading' ? (
            <>
              <ActivityIndicator color={C.sauge} />
              <ThemedText style={styles.statusTxt}>Préparation du paiement sécurisé…</ThemedText>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={32} color={C.textLight} />
              <ThemedText style={styles.statusTxt}>
                {stripe.state === 'missing-key'
                  ? 'Le paiement par carte n\'est pas encore configuré dans cette version de l\'app. Réessayez plus tard ou contactez le support Oheve.'
                  : `Impossible d'initialiser le paiement sécurisé.${stripe.errorMsg ? `\n${stripe.errorMsg}` : ''}`}
              </ThemedText>
              {stripe.state === 'error' ? (
                <Pressable hitSlop={8} onPress={stripe.retry}>
                  <ThemedText style={styles.retryTxt}>Réessayer</ThemedText>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <PaymentForm
            prestataireId={parseInt(params.prestataire_id, 10)}
            prestataireNom={params.prestataire_nom ?? 'Prestataire'}
            prestataireCategorie={params.prestataire_categorie}
            amountCents={amountCents}
            currency={currency}
            description={params.description ?? ''}
            conversationId={params.conversation_id ? parseInt(params.conversation_id, 10) : undefined}
            productId={params.product_id}
            prefetchedClientSecret={params.client_secret}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.saugePale,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  scroll: { padding: 20, gap: 16 },
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  statusTxt: { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 20 },
  retryTxt: { fontSize: 14, fontWeight: '700', color: C.sauge, textDecorationLine: 'underline' },
  form: { gap: 16 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 16, gap: 10,
    borderWidth: 1, borderColor: C.saugePale,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14, color: C.textMid },
  rowValue: { fontSize: 14, color: C.textDark },
  rowBold: { fontWeight: '700', fontSize: 16 },
  rowSmall: { fontSize: 12, color: C.textLight },
  label: { fontSize: 13, fontWeight: '600', color: C.textMid, marginBottom: -8 },
  cardField: { height: 56, marginVertical: 4 },
  hint: { fontSize: 11, color: C.textLight, textAlign: 'center' },
  payBtn: {
    backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  payBtnOff: { opacity: 0.45 },
  payBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secureTxt: { fontSize: 12, color: C.textLight },
});
