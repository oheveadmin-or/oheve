import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth, UserRole } from '@/contexts/auth-context';
import { adminApi } from '@/services/auth/api';

type Tab = 'dashboard' | 'users' | 'prestataires' | 'boutiques' | 'contenus' | 'reservations' | 'payments';

type Stats = {
  total_users: number;
  clients: number;
  prestataires: number;
  boutiques: number;
  reservations: number;
  total_revenue_cents: number;
  total_commission_cents: number;
  succeeded_payments: number;
  active_subscriptions: number;
  verified_prestataires: number;
  public_sites: number;
};

type User = {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  is_active: boolean;
  subscription_plan?: string;
  subscription_status?: string;
};

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
  { key: 'users', label: 'Utilisateurs', icon: 'people-outline' },
  { key: 'prestataires', label: 'Prestataires', icon: 'business-outline' },
  { key: 'boutiques', label: 'Boutiques', icon: 'storefront-outline' },
  { key: 'contenus', label: 'Contenus', icon: 'document-text-outline' },
  { key: 'reservations', label: 'Réservations', icon: 'calendar-outline' },
  { key: 'payments', label: 'Paiements', icon: 'card-outline' },
];

const ROLE_OPTIONS: UserRole[] = ['client', 'prestataire', 'boutique'];

function formatEuros(cents: number) {
  return `${(cents / 100).toFixed(2)} €`;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [stats, setStats] = useState<Stats | null>(null);
  const [paymentStats, setPaymentStats] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [prestataires, setPrestataires] = useState<Record<string, unknown>[]>([]);
  const [boutiques, setBoutiques] = useState<Record<string, unknown>[]>([]);
  const [sites, setSites] = useState<Record<string, unknown>[]>([]);
  const [reservations, setReservations] = useState<Record<string, unknown>[]>([]);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);

  const token = me?.accessToken;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sRes, psRes] = await Promise.all([
        adminApi.getStats(token),
        adminApi.getPaymentStats(token),
      ]);
      if (sRes.success) setStats(sRes.data);
      if (psRes.success) setPaymentStats(psRes.data);

      if (tab === 'users') {
        const uRes = await adminApi.listUsers(token, { search: search || undefined, role: roleFilter || undefined });
        if (uRes.success) setUsers(uRes.data);
      } else if (tab === 'prestataires') {
        const pRes = await adminApi.listPrestataires(token, search || undefined);
        if (pRes.success) setPrestataires(pRes.data);
      } else if (tab === 'boutiques') {
        const bRes = await adminApi.listBoutiques(token, search || undefined);
        if (bRes.success) setBoutiques(bRes.data);
      } else if (tab === 'contenus') {
        const cRes = await adminApi.listPublicSites(token);
        if (cRes.success) setSites(cRes.data);
      } else if (tab === 'reservations') {
        const rRes = await adminApi.listReservations(token);
        if (rRes.success) setReservations(rRes.data);
      } else if (tab === 'payments') {
        const payRes = await adminApi.listPayments(token);
        if (payRes.success) setPayments(payRes.data);
      }
    } catch { /* silencieux */ }
    setLoading(false);
  }, [token, tab, search, roleFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleActive = async (userId: number, current: boolean) => {
    if (!token) return;
    await adminApi.updateUser(token, userId, { is_active: !current });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !current } : u)));
  };

  const changeRole = (userId: number, name: string) => {
    if (!token) return;
    Alert.alert('Changer le rôle', `Pour ${name}`, [
      ...ROLE_OPTIONS.map((r) => ({
        text: r,
        onPress: async () => {
          const res = await adminApi.updateUser(token, userId, { role: r });
          if (res.success) {
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: r } : u)));
          } else {
            Alert.alert('Erreur', res.message ?? 'Impossible');
          }
        },
      })),
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const deleteUser = (userId: number, name: string) => {
    if (!token || userId === me?.id) {
      Alert.alert('Impossible', 'Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    Alert.alert('Supprimer', `Supprimer ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          const res = await adminApi.deleteUser(token, userId);
          if (res.success) setUsers((prev) => prev.filter((u) => u.id !== userId));
        },
      },
    ]);
  };

  const renderUser = ({ item: u }: { item: User }) => (
    <View style={[styles.card, !u.is_active && styles.cardOff]}>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardTitle}>{u.prenom} {u.nom}</ThemedText>
        <ThemedText style={styles.cardSub}>{u.email}</ThemedText>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: '#A7AD9A22' }]}>
            <ThemedText style={[styles.badgeTxt, { color: '#6b7c5e' }]}>{u.role}</ThemedText>
          </View>
          {!u.is_active && (
            <View style={[styles.badge, { backgroundColor: '#fecaca' }]}>
              <ThemedText style={[styles.badgeTxt, { color: '#dc2626' }]}>désactivé</ThemedText>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.iconBtn} onPress={() => changeRole(u.id, `${u.prenom} ${u.nom}`)}>
          <Ionicons name="swap-horizontal-outline" size={16} color="#6366f1" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => toggleActive(u.id, u.is_active)}>
          <Ionicons name={u.is_active ? 'pause-outline' : 'play-outline'} size={16} color={u.is_active ? '#dc2626' : '#10b981'} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => deleteUser(u.id, `${u.prenom} ${u.nom}`)}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );

  const renderPresta = ({ item: p }: { item: Record<string, unknown> }) => {
    const userId = p.user_id as number;
    const verified = p.is_verified as boolean;
    const suspended = p.is_suspended as boolean;
    return (
      <View style={[styles.card, suspended && styles.cardOff]}>
        <View style={styles.cardBody}>
          <ThemedText style={styles.cardTitle}>{p.business_name as string}</ThemedText>
          <ThemedText style={styles.cardSub}>{p.email as string} · {p.category as string}</ThemedText>
          <View style={styles.badgeRow}>
            {verified && <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}><ThemedText style={[styles.badgeTxt, { color: '#10b981' }]}>vérifié</ThemedText></View>}
            {suspended && <View style={[styles.badge, { backgroundColor: '#fecaca' }]}><ThemedText style={[styles.badgeTxt, { color: '#dc2626' }]}>suspendu</ThemedText></View>}
          </View>
        </View>
        <View style={styles.cardActions}>
          <Pressable style={styles.iconBtn} onPress={async () => {
            if (!token) return;
            await adminApi.verifyPrestataire(token, userId, !verified);
            load();
          }}>
            <Ionicons name={verified ? 'close-circle-outline' : 'checkmark-circle-outline'} size={16} color="#10b981" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={async () => {
            if (!token) return;
            await adminApi.suspendPrestataire(token, userId, !suspended);
            load();
          }}>
            <Ionicons name="ban-outline" size={16} color="#f59e0b" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => {
            Alert.alert('Supprimer le profil', 'Supprimer ce profil prestataire ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer', style: 'destructive', onPress: async () => {
                if (!token) return;
                await adminApi.deletePrestataire(token, userId);
                load();
              }},
            ]);
          }}>
            <Ionicons name="trash-outline" size={16} color="#dc2626" />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderBoutique = ({ item: b }: { item: Record<string, unknown> }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardTitle}>{(b.business_name as string) || `${b.prenom} ${b.nom}`}</ThemedText>
        <ThemedText style={styles.cardSub}>{b.email as string}</ThemedText>
        <ThemedText style={styles.cardMeta}>
          Plan : {(b.subscription_plan as string) || 'aucun'} · {(b.subscription_status as string) || 'inactive'}
        </ThemedText>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.iconBtn} onPress={() => {
          if (!token) return;
          Alert.alert('Abonnement', 'Choisir un plan', [
            { text: 'Aucun', onPress: () => adminApi.updateBoutique(token, b.id as number, { subscription_plan: null, subscription_status: 'inactive' }).then(load) },
            { text: 'Basic', onPress: () => adminApi.updateBoutique(token, b.id as number, { subscription_plan: 'basic', subscription_status: 'active' }).then(load) },
            { text: 'Plus', onPress: () => adminApi.updateBoutique(token, b.id as number, { subscription_plan: 'plus', subscription_status: 'active' }).then(load) },
            { text: 'Annuler', style: 'cancel' },
          ]);
        }}>
          <Ionicons name="card-outline" size={16} color="#f59e0b" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={async () => {
          if (!token) return;
          await adminApi.updateBoutique(token, b.id as number, { is_suspended: !b.is_suspended });
          load();
        }}>
          <Ionicons name="ban-outline" size={16} color="#f59e0b" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => {
          Alert.alert('Supprimer', 'Supprimer cette boutique ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: async () => {
              if (!token) return;
              await adminApi.deleteBoutique(token, b.id as number);
              load();
            }},
          ]);
        }}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );

  const renderSite = ({ item: s }: { item: Record<string, unknown> }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardTitle}>{s.bride_name as string} & {s.groom_name as string}</ThemedText>
        <ThemedText style={styles.cardSub}>{s.slug as string} · {s.owner_email as string}</ThemedText>
        <View style={styles.badgeRow}>
          {s.is_published && <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}><ThemedText style={[styles.badgeTxt, { color: '#10b981' }]}>publié</ThemedText></View>}
          {s.is_hidden && <View style={[styles.badge, { backgroundColor: '#fecaca' }]}><ThemedText style={[styles.badgeTxt, { color: '#dc2626' }]}>masqué</ThemedText></View>}
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.iconBtn} onPress={async () => {
          if (!token) return;
          await adminApi.updatePublicSite(token, s.id as number, { is_hidden: !s.is_hidden });
          load();
        }}>
          <Ionicons name="eye-off-outline" size={16} color="#6366f1" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => {
          Alert.alert('Supprimer', 'Supprimer ce site ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: async () => {
              if (!token) return;
              await adminApi.deletePublicSite(token, s.id as number);
              load();
            }},
          ]);
        }}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );

  const renderReservation = ({ item: r }: { item: Record<string, unknown> }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardTitle}>{r.business_name as string || 'Réservation'}</ThemedText>
        <ThemedText style={styles.cardSub}>{r.client_prenom as string} {r.client_nom as string} → {r.presta_prenom as string}</ThemedText>
        <ThemedText style={styles.cardMeta}>Statut : {r.status as string} · {formatEuros((r.amount_cents as number) || 0)}</ThemedText>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.iconBtn} onPress={() => {
          if (!token) return;
          Alert.alert('Statut', 'Modifier le statut', [
            { text: 'Confirmée', onPress: () => adminApi.updateReservation(token, r.id as number, { status: 'confirmed' }).then(load) },
            { text: 'Annulée', onPress: () => adminApi.updateReservation(token, r.id as number, { status: 'cancelled' }).then(load) },
            { text: 'Fermer', style: 'cancel' },
          ]);
        }}>
          <Ionicons name="create-outline" size={16} color="#6366f1" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => {
          Alert.alert('Annuler', 'Supprimer cette réservation ?', [
            { text: 'Non', style: 'cancel' },
            { text: 'Oui', style: 'destructive', onPress: async () => {
              if (!token) return;
              await adminApi.deleteReservation(token, r.id as number);
              load();
            }},
          ]);
        }}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );

  const renderPayment = ({ item: p }: { item: Record<string, unknown> }) => (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardTitle}>{formatEuros(p.amount_total as number)}</ThemedText>
        <ThemedText style={styles.cardSub}>{p.client_prenom as string} → {p.business_name as string || p.presta_prenom as string}</ThemedText>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: p.status === 'succeeded' ? '#d1fae5' : '#f3f4f6' }]}>
            <ThemedText style={[styles.badgeTxt, { color: p.status === 'succeeded' ? '#10b981' : '#6b7280' }]}>{p.status as string}</ThemedText>
          </View>
          <ThemedText style={styles.cardMeta}>Commission : {formatEuros(p.commission_amount as number)}</ThemedText>
        </View>
      </View>
    </View>
  );

  const dashboardStats = stats ? [
    { label: 'Utilisateurs', val: stats.total_users, color: '#6366f1', icon: 'people' },
    { label: 'Clients', val: stats.clients, color: '#10b981', icon: 'person' },
    { label: 'Prestataires', val: stats.prestataires, color: '#A7AD9A', icon: 'business' },
    { label: 'Boutiques', val: stats.boutiques, color: '#f59e0b', icon: 'storefront' },
    { label: 'Réservations', val: stats.reservations, color: '#8b5cf6', icon: 'calendar' },
    { label: 'Chiffre d\'affaires', val: formatEuros(stats.total_revenue_cents), color: '#059669', icon: 'trending-up' },
    { label: 'Commissions', val: formatEuros(stats.total_commission_cents), color: '#0ea5e9', icon: 'cash' },
    { label: 'Paiements OK', val: stats.succeeded_payments, color: '#14b8a6', icon: 'checkmark-circle' },
  ] : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View>
          <ThemedText style={styles.heroLabel}>Administration</ThemedText>
          <ThemedText style={styles.heroTitle}>Tableau de bord</ThemedText>
        </View>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tabChip, tab === t.key && styles.tabChipOn]} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon as 'grid-outline'} size={14} color={tab === t.key ? '#fff' : '#6b7280'} />
            <ThemedText style={[styles.tabChipTxt, tab === t.key && styles.tabChipTxtOn]}>{t.label}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {tab === 'dashboard' && stats && (
          <View style={styles.statsGrid}>
            {dashboardStats.map((s) => (
              <View key={s.label} style={[styles.statCard, { borderLeftColor: s.color }]}>
                <Ionicons name={s.icon as 'people'} size={18} color={s.color} />
                <ThemedText style={[styles.statVal, { color: s.color }]}>{s.val}</ThemedText>
                <ThemedText style={styles.statLbl}>{s.label}</ThemedText>
              </View>
            ))}
            {paymentStats && (
              <View style={styles.stripeCard}>
                <ThemedText style={styles.stripeTitle}>Stripe Connect</ThemedText>
                <ThemedText style={styles.stripeTxt}>
                  {paymentStats.active_connect_accounts} comptes actifs / {paymentStats.total_connect_accounts} total
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {tab !== 'dashboard' && tab !== 'payments' && (
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher…"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            onSubmitEditing={load}
          />
        )}

        {tab === 'users' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {['', 'client', 'prestataire', 'boutique', 'admin'].map((r) => (
              <Pressable key={r} style={[styles.filterChip, roleFilter === r && styles.filterChipOn]} onPress={() => setRoleFilter(r)}>
                <ThemedText style={[styles.filterTxt, roleFilter === r && styles.filterTxtOn]}>{r || 'Tous'}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator color="#A7AD9A" style={{ marginTop: 40 }} />
        ) : (
          <>
            {tab === 'users' && (
              <FlatList data={users} keyExtractor={(u) => String(u.id)} scrollEnabled={false}
                renderItem={renderUser} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={<ThemedText style={styles.empty}>Aucun utilisateur</ThemedText>} />
            )}
            {tab === 'prestataires' && (
              <FlatList data={prestataires} keyExtractor={(p) => String(p.id)} scrollEnabled={false}
                renderItem={renderPresta} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={<ThemedText style={styles.empty}>Aucun prestataire</ThemedText>} />
            )}
            {tab === 'boutiques' && (
              <FlatList data={boutiques} keyExtractor={(b) => String(b.id)} scrollEnabled={false}
                renderItem={renderBoutique} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={<ThemedText style={styles.empty}>Aucune boutique</ThemedText>} />
            )}
            {tab === 'contenus' && (
              <FlatList data={sites} keyExtractor={(s) => String(s.id)} scrollEnabled={false}
                renderItem={renderSite} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={<ThemedText style={styles.empty}>Aucun contenu</ThemedText>} />
            )}
            {tab === 'reservations' && (
              <FlatList data={reservations} keyExtractor={(r) => String(r.id)} scrollEnabled={false}
                renderItem={renderReservation} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={<ThemedText style={styles.empty}>Aucune réservation</ThemedText>} />
            )}
            {tab === 'payments' && (
              <FlatList data={payments} keyExtractor={(p) => String(p.id)} scrollEnabled={false}
                renderItem={renderPayment} ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={<ThemedText style={styles.empty}>Aucun paiement</ThemedText>} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8faf9' },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#4a5240', paddingHorizontal: 16, paddingVertical: 18,
  },
  backBtn: { padding: 4 },
  heroLabel: { fontSize: 11, color: '#c5cbb8', fontWeight: '600', letterSpacing: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  adminBadge: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tabScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: '#f3f4f6' },
  tabChipOn: { backgroundColor: '#A7AD9A' },
  tabChipTxt: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabChipTxtOn: { color: '#fff' },
  content: { padding: 16, gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 4, borderLeftWidth: 4, borderWidth: 1, borderColor: '#f0f0f0' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  stripeCard: { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 4 },
  stripeTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stripeTxt: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  search: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  filterChipOn: { borderColor: '#A7AD9A', backgroundColor: '#A7AD9A' },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  filterTxtOn: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f0f0f0', gap: 10 },
  cardOff: { opacity: 0.55 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#9ca3af' },
  cardMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 14 },
});
