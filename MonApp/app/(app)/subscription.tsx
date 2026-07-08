import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { subscriptionApi } from '@/services/auth/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: { photos: number; videos: number };
}

interface MySubscription {
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  plan_details: Plan | null;
}

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySub, setMySub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        subscriptionApi.getPlans(),
        user?.accessToken ? subscriptionApi.getMySubscription(user.accessToken) : Promise.resolve({ success: false }),
      ]);
      if (plansRes.success) setPlans(plansRes.data);
      if (subRes.success) setMySub(subRes.data);
    } catch {}
    setLoading(false);
  };

  const handleSubscribe = async (planId: string) => {
    if (!user?.accessToken) return;
    if (user.role !== 'boutique') {
      Alert.alert('Compte boutique requis', 'Seuls les comptes boutique peuvent souscrire à un abonnement.');
      return;
    }

    const planName = planId === 'plus' ? 'Plus (20€/mois)' : 'Basic (7€/mois)';
    Alert.alert(
      `Passer à ${planName}`,
      'En confirmant, vous souscrivez à cet abonnement. (Intégration paiement à venir)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setSubscribing(planId);
            try {
              const res = await subscriptionApi.subscribe(user.accessToken, planId as 'basic' | 'plus');
              if (res.success) {
                await updateUser({
                  subscription_plan: res.data.subscription_plan,
                  subscription_status: res.data.subscription_status,
                  subscription_expires_at: res.data.subscription_expires_at,
                });
                await load();
                Alert.alert('Abonnement activé !', `Vous êtes maintenant abonné au plan ${planName}.`);
              } else {
                Alert.alert('Erreur', res.message ?? 'Impossible de souscrire');
              }
            } catch {
              Alert.alert('Erreur', 'Impossible de joindre le serveur');
            }
            setSubscribing(null);
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    if (!user?.accessToken) return;
    Alert.alert(
      'Annuler l\'abonnement',
      'Votre accès aux fonctionnalités premium sera désactivé. Voulez-vous continuer ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await subscriptionApi.cancel(user.accessToken);
              if (res.success) {
                await updateUser({ subscription_status: 'cancelled' });
                await load();
              } else {
                Alert.alert('Annulation impossible', res?.message ?? 'Vérifiez votre connexion et réessayez.');
              }
            } catch {
              Alert.alert('Annulation impossible', 'Vérifiez votre connexion et réessayez.');
            }
          },
        },
      ]
    );
  };

  const isActive = mySub?.subscription_status === 'active';
  const currentPlan = mySub?.subscription_plan;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
        </Pressable>
        <ThemedText style={styles.title}>Abonnement Boutique</ThemedText>
      </View>

      {loading ? (
        <ActivityIndicator color="#A7AD9A" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>

          {/* Status actuel */}
          {isActive && mySub && (
            <View style={[styles.currentBadge, { borderColor: currentPlan === 'plus' ? '#f59e0b' : '#A7AD9A' }]}>
              <ThemedText style={styles.currentBadgeTitle}>
                {currentPlan === 'plus' ? '⭐ Plan Plus actif' : '✓ Plan Basic actif'}
              </ThemedText>
              {mySub.subscription_expires_at && (
                <ThemedText style={styles.currentBadgeSub}>
                  Renouvellement le {formatDate(mySub.subscription_expires_at)}
                </ThemedText>
              )}
              <Pressable style={styles.cancelBtn} onPress={handleCancel}>
                <ThemedText style={styles.cancelBtnTxt}>Annuler l'abonnement</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Note compte non-boutique */}
          {user?.role !== 'boutique' && (
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              <ThemedText style={styles.noticeTxt}>
                Les abonnements sont réservés aux comptes Boutique. Votre compte est de type "{user?.role}".
              </ThemedText>
            </View>
          )}

          <ThemedText style={styles.sectionTitle}>Choisissez votre formule</ThemedText>

          {plans.map((plan) => {
            const isCurrentPlan = isActive && currentPlan === plan.id;
            const isPlusHighlight = plan.id === 'plus';

            return (
              <View key={plan.id} style={[styles.planCard, isPlusHighlight && styles.planCardPlus, isCurrentPlan && styles.planCardCurrent]}>
                {isPlusHighlight && (
                  <View style={styles.popularBadge}>
                    <ThemedText style={styles.popularBadgeTxt}>⭐ Recommandé</ThemedText>
                  </View>
                )}
                {isCurrentPlan && (
                  <View style={styles.activePlanBadge}>
                    <ThemedText style={styles.activePlanBadgeTxt}>Plan actuel</ThemedText>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <ThemedText style={[styles.planName, isPlusHighlight && styles.planNamePlus]}>{plan.name}</ThemedText>
                  <View style={styles.priceRow}>
                    <ThemedText style={[styles.priceAmount, isPlusHighlight && styles.priceAmountPlus]}>{plan.price}€</ThemedText>
                    <ThemedText style={styles.priceInterval}>/{plan.interval}</ThemedText>
                  </View>
                </View>

                <View style={styles.featuresList}>
                  {plan.features.map((feat, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={isPlusHighlight ? '#f59e0b' : '#A7AD9A'} />
                      <ThemedText style={styles.featureTxt}>{feat}</ThemedText>
                    </View>
                  ))}
                </View>

                {!isCurrentPlan && (
                  <Pressable
                    style={[styles.subscribeBtn, isPlusHighlight && styles.subscribeBtnPlus, subscribing === plan.id && styles.subscribeBtnDisabled]}
                    onPress={() => handleSubscribe(plan.id)}
                    disabled={subscribing !== null}
                  >
                    {subscribing === plan.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <ThemedText style={styles.subscribeBtnTxt}>
                        {isActive ? 'Changer de plan' : `S'abonner — ${plan.price}€/mois`}
                      </ThemedText>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}

          <View style={styles.disclaimer}>
            <ThemedText style={styles.disclaimerTxt}>
              * L'intégration paiement (Stripe) sera disponible prochainement. En attendant, contactez l'administrateur pour activer votre abonnement.
            </ThemedText>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  content: { padding: 16, gap: 16 },
  currentBadge: { borderWidth: 2, borderRadius: 16, padding: 16, gap: 6 },
  currentBadgeTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  currentBadgeSub: { fontSize: 12, color: '#6b7280' },
  cancelBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnTxt: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  noticeBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  noticeTxt: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  planCard: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 18, padding: 20, gap: 16, position: 'relative' },
  planCardPlus: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  planCardCurrent: { borderColor: '#A7AD9A', backgroundColor: '#E8EDE4' },
  popularBadge: { position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: '#f59e0b', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4 },
  popularBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  activePlanBadge: { position: 'absolute', top: -12, right: 16, backgroundColor: '#A7AD9A', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  activePlanBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  planNamePlus: { color: '#b45309' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceAmount: { fontSize: 28, fontWeight: '800', color: '#A7AD9A' },
  priceAmountPlus: { color: '#f59e0b' },
  priceInterval: { fontSize: 13, color: '#9ca3af' },
  featuresList: { gap: 10 },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  featureTxt: { fontSize: 14, color: '#374151', flex: 1 },
  subscribeBtn: { backgroundColor: '#A7AD9A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  subscribeBtnPlus: { backgroundColor: '#f59e0b' },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disclaimer: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  disclaimerTxt: { fontSize: 12, color: '#9ca3af', lineHeight: 18, textAlign: 'center' },
});
