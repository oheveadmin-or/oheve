/**
 * Inscription prestataire — étape 2 sur 3 : « Avez-vous plusieurs établissements ? »
 *
 * Juste après la première fiche (setup.tsx) et avant l'abonnement (subscribe.tsx).
 * Non → on passe à l'abonnement. Oui → il ajoute ses autres établissements
 * (nom, ville, catégorie) un par un, puis continue. Chacun sera complété plus
 * tard depuis Profil → nom en haut → Mes établissements.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddEstablishmentForm } from '@/components/prestataire/add-establishment-form';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { categoryLabel } from '@/lib/presta-categories';
import { prestatairesApi } from '@/services/auth/api';

type Item = { id: number; business_name: string | null; category: string | null; location_city: string | null; is_owner?: boolean };

export default function EstablishmentsSetupScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [several, setSeveral] = useState<boolean | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  // Fiche principale + établissements déjà ajoutés (retour arrière, relance de l'app…).
  useEffect(() => {
    if (!user?.accessToken) return;
    prestatairesApi.listEstablishments(user.accessToken).then((res) => {
      if (!res.success) return;
      const list = ((res.data as { items: Item[] }).items ?? []);
      setItems(list);
      if (list.length > 1) setSeveral(true);
    }).catch(() => {});
  }, [user?.accessToken]);

  const next = () => router.replace('/(app)/prestataire/subscribe');
  const main = items.find((i) => i.is_owner) ?? items[0];
  const added = items.filter((i) => i !== main);

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <ThemedText style={styles.stepBadge}>Étape 2 sur 3</ThemedText>
        <ThemedText style={styles.title}>Avez-vous plusieurs profils ?</ThemedText>
        <ThemedText style={styles.sub}>
          Par exemple plusieurs hôtels, salles ou boutiques. Chacun aura sa propre fiche dans l&apos;annuaire, et vous les gérez tous depuis ce même compte. Un seul abonnement pour tous : vous ne payez qu&apos;une fois.
        </ThemedText>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.choices}>
          <Pressable style={[styles.choice, several === false && styles.choiceOn]} onPress={() => { setSeveral(false); next(); }} accessibilityLabel="Non, un seul profil">
            <Ionicons name="storefront-outline" size={26} color={several === false ? '#fff' : C.saugeDark} />
            <ThemedText style={[styles.choiceTitle, several === false && styles.choiceTxtOn]}>Non, un seul</ThemedText>
          </Pressable>
          <Pressable style={[styles.choice, several === true && styles.choiceOn]} onPress={() => setSeveral(true)} accessibilityLabel="Oui, plusieurs profils">
            <Ionicons name="business-outline" size={26} color={several === true ? '#fff' : C.saugeDark} />
            <ThemedText style={[styles.choiceTitle, several === true && styles.choiceTxtOn]}>Oui, plusieurs</ThemedText>
          </Pressable>
        </View>

        {several ? (
          <>
            <ThemedText style={styles.section}>Vos profils ({items.length})</ThemedText>
            {main ? <Row item={main} badge="Profil principal" /> : null}
            {added.map((i) => <Row key={i.id} item={i} badge="Ajouté" />)}

            {user?.accessToken ? (
              <View style={styles.formCard}>
                <ThemedText style={styles.formTitle}>
                  {added.length === 0 ? 'Ajoutez votre 2e profil' : 'Ajouter un autre profil'}
                </ThemedText>
                <AddEstablishmentForm
                  accessToken={user.accessToken}
                  defaultCategory={main?.category ?? ''}
                  submitLabel="Ajouter ce profil"
                  onCreated={(c) => setItems((list) => [...list, { id: c.id, business_name: c.business_name, category: c.category, location_city: c.location_city }])}
                />
              </View>
            ) : null}

            <Pressable style={styles.btn} onPress={next}>
              <ThemedText style={styles.btnTxt}>{added.length === 0 ? 'Passer pour le moment' : 'Continuer'}</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
            <ThemedText style={styles.hint}>
              Vous pourrez compléter chaque fiche (photos, description, tarifs) ou en ajouter d&apos;autres plus tard : Profil → bouton « + Ajouter un profil ».
            </ThemedText>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ item, badge }: { item: Item; badge: string }) {
  const name = item.business_name?.trim() || 'Profil';
  const sub = [item.category ? categoryLabel(item.category) : null, item.location_city].filter(Boolean).join(' · ');
  return (
    <View style={styles.row}>
      <View style={styles.avatar}><ThemedText style={styles.avatarLetter}>{name[0]?.toUpperCase()}</ThemedText></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText style={styles.rowName} numberOfLines={1}>{name}</ThemedText>
        {!!sub && <ThemedText style={styles.rowSub} numberOfLines={1}>{sub}</ThemedText>}
      </View>
      <ThemedText style={styles.badge}>{badge}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  stepBadge: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', color: '#929B83', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  title: { fontSize: 26, fontFamily: 'OheveSerif-Medium', color: C.textDark, marginBottom: 6 },
  sub: { fontSize: 14, color: C.textMid, lineHeight: 20 },
  content: { padding: 24, gap: 10 },
  choices: { flexDirection: 'row', gap: 12 },
  choice: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 20, borderRadius: RADIUS.md, backgroundColor: C.cardAlt },
  choiceOn: { backgroundColor: C.saugeDark },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  choiceTxtOn: { color: '#fff' },
  section: { fontSize: 13, fontWeight: '800', color: C.textMid, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: RADIUS.md, backgroundColor: C.cardAlt },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.beige, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: C.saugeDark },
  rowName: { fontSize: 15, fontWeight: '700', color: C.textDark },
  rowSub: { fontSize: 12, color: C.textMid, marginTop: 1 },
  badge: { fontSize: 11, fontWeight: '600', color: C.textMid, backgroundColor: C.beige, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  formCard: { marginTop: 8, padding: 16, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.sauge },
  formTitle: { fontSize: 16, fontFamily: 'OheveSerif-Medium', color: C.textDark },
  btn: { marginTop: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: RADIUS.pill, backgroundColor: C.saugeDark },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: C.textLight, textAlign: 'center', lineHeight: 17 },
});
