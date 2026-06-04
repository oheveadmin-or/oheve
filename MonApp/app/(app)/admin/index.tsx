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
import { API_ENDPOINTS } from '@/constants/config';

type Stats = {
  clients: number;
  prestataires: number;
  boutiques: number;
  admins: number;
  active_users: number;
  active_subscriptions: number;
  plus_subscribers: number;
  conversations: number;
  messages: number;
  verified_prestataires: number;
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
  subscription_expires_at?: string;
};

type Tab = 'users' | 'subscriptions';

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('users');

  const load = useCallback(async () => {
    if (!me?.accessToken) return;
    setLoading(true);
    try {
      const [sRes, uRes, subRes] = await Promise.all([
        adminApi.getStats(me.accessToken),
        adminApi.listUsers(me.accessToken, { search: search || undefined, role: roleFilter || undefined }),
        adminApi.listSubscriptions(me.accessToken),
      ]);
      if (sRes.success) setStats(sRes.data);
      if (uRes.success) setUsers(uRes.data);
      if (subRes.success) setSubscriptions(subRes.data);
    } catch {}
    setLoading(false);
  }, [me?.accessToken, search, roleFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleActive = async (userId: number, current: boolean) => {
    if (!me?.accessToken) return;
    await adminApi.updateUser(me.accessToken, userId, { is_active: !current });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: !current } : u));
  };

  const changeRole = async (userId: number, newRole: UserRole) => {
    if (!me?.accessToken) return;
    await adminApi.updateUser(me.accessToken, userId, { role: newRole });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  };

  const deleteUser = (userId: number, name: string) => {
    if (!me?.accessToken) return;
    if (userId === me.id) {
      Alert.alert('Impossible', 'Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    Alert.alert(
      'Supprimer le compte',
      `Voulez-vous vraiment supprimer le compte de ${name} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const res = await adminApi.deleteUser(me.accessToken!, userId);
            if (res.success) {
              setUsers((prev) => prev.filter((u) => u.id !== userId));
              setSubscriptions((prev) => prev.filter((u) => u.id !== userId));
            } else {
              Alert.alert('Erreur', res.message ?? 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const setSubscriptionPlan = async (userId: number, plan: string | null) => {
    if (!me?.accessToken) return;
    const url = `${API_ENDPOINTS.adminSubscriptions.replace('admin/subscriptions', 'subscriptions')}/${userId}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${me.accessToken}` },
      body: JSON.stringify({ plan: plan || null, status: plan ? 'active' : 'inactive' }),
    }).then((r) => r.json());
    if (res.success) {
      await load();
    } else {
      Alert.alert('Erreur', res.message ?? 'Impossible de mettre à jour');
    }
  };

  const roleColor: Record<string, string> = {
    admin: '#ef4444',
    prestataire: '#A7AD9A',
    boutique: '#f59e0b',
    client: '#10b981',
  };

  const planColor: Record<string, string> = { plus: '#f59e0b', basic: '#A7AD9A' };

  const renderUser = ({ item: u }: { item: User }) => (
    <View style={[styles.userCard, !u.is_active && styles.userCardOff]}>
      <View style={[styles.userAvatar, { backgroundColor: roleColor[u.role] ?? '#e5e7eb' }]}>
        <ThemedText style={styles.userAvatarTxt}>{u.prenom?.[0]?.toUpperCase()}</ThemedText>
      </View>
      <View style={styles.userInfo}>
        <ThemedText style={styles.userName}>{u.prenom} {u.nom}</ThemedText>
        <ThemedText style={styles.userEmail} numberOfLines={1}>{u.email}</ThemedText>
        <View style={styles.userBadgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: (roleColor[u.role] ?? '#e5e7eb') + '22' }]}>
            <ThemedText style={[styles.roleBadgeTxt, { color: roleColor[u.role] ?? '#6b7280' }]}>{u.role}</ThemedText>
          </View>
          {u.subscription_plan && u.subscription_status === 'active' && (
            <View style={[styles.subBadge, { backgroundColor: (planColor[u.subscription_plan] ?? '#6b7280') + '22' }]}>
              <ThemedText style={[styles.subBadgeTxt, { color: planColor[u.subscription_plan] ?? '#6b7280' }]}>
                {u.subscription_plan === 'plus' ? '⭐ Plus' : '● Basic'}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
      <View style={styles.userActions}>
        <Pressable
          style={[styles.actionBtn, { borderColor: u.is_active ? '#fecaca' : '#d1fae5' }]}
          onPress={() => toggleActive(u.id, u.is_active)}
        >
          <Ionicons name={u.is_active ? 'pause-outline' : 'play-outline'} size={14} color={u.is_active ? '#dc2626' : '#10b981'} />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { borderColor: '#fecaca' }]}
          onPress={() => deleteUser(u.id, `${u.prenom} ${u.nom}`)}
        >
          <Ionicons name="trash-outline" size={14} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );

  const renderSubscription = ({ item: u }: { item: User }) => (
    <View style={styles.subCard}>
      <View style={[styles.userAvatar, { backgroundColor: planColor[u.subscription_plan ?? ''] ?? '#e5e7eb' }]}>
        <ThemedText style={styles.userAvatarTxt}>{u.prenom?.[0]?.toUpperCase()}</ThemedText>
      </View>
      <View style={styles.userInfo}>
        <ThemedText style={styles.userName}>{u.prenom} {u.nom}</ThemedText>
        <ThemedText style={styles.userEmail} numberOfLines={1}>{u.email}</ThemedText>
        <View style={styles.userBadgeRow}>
          {u.subscription_plan ? (
            <View style={[styles.subBadge, { backgroundColor: (planColor[u.subscription_plan] ?? '#6b7280') + '22' }]}>
              <ThemedText style={[styles.subBadgeTxt, { color: planColor[u.subscription_plan] ?? '#6b7280' }]}>
                {u.subscription_plan === 'plus' ? '⭐ Plus' : '● Basic'}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.subBadge, { backgroundColor: '#f3f4f6' }]}>
              <ThemedText style={[styles.subBadgeTxt, { color: '#9ca3af' }]}>Sans abonnement</ThemedText>
            </View>
          )}
          {u.subscription_status && (
            <ThemedText style={[styles.subStatus, { color: u.subscription_status === 'active' ? '#10b981' : '#9ca3af' }]}>
              {u.subscription_status}
            </ThemedText>
          )}
        </View>
        {u.subscription_expires_at && (
          <ThemedText style={styles.subExpires}>
            Expire : {new Date(u.subscription_expires_at).toLocaleDateString('fr-FR')}
          </ThemedText>
        )}
      </View>
      <View style={styles.userActions}>
        <Pressable
          style={[styles.subActionBtn, { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' }]}
          onPress={() => {
            Alert.alert('Modifier l\'abonnement', `Pour ${u.prenom} ${u.nom}`, [
              { text: 'Aucun', onPress: () => setSubscriptionPlan(u.id, null) },
              { text: 'Basic (7€)', onPress: () => setSubscriptionPlan(u.id, 'basic') },
              { text: '⭐ Plus (20€)', onPress: () => setSubscriptionPlan(u.id, 'plus') },
              { text: 'Annuler', style: 'cancel' },
            ]);
          }}
        >
          <Ionicons name="pencil-outline" size={14} color="#f59e0b" />
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { borderColor: '#fecaca' }]}
          onPress={() => deleteUser(u.id, `${u.prenom} ${u.nom}`)}
        >
          <Ionicons name="trash-outline" size={14} color="#dc2626" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
        </Pressable>
        <ThemedText style={styles.title}>Panneau Admin</ThemedText>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['users', 'subscriptions'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tabBtn, tab === t && styles.tabBtnOn]} onPress={() => setTab(t)}>
            <ThemedText style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>
              {t === 'users' ? 'Utilisateurs' : 'Boutiques & Abonnements'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Stats */}
        {stats && tab === 'users' && (
          <View style={styles.statsGrid}>
            {[
              { label: 'Clients', val: stats.clients, color: '#10b981', icon: 'person-outline' },
              { label: 'Presta.', val: stats.prestataires, color: '#A7AD9A', icon: 'business-outline' },
              { label: 'Boutiques', val: stats.boutiques, color: '#f59e0b', icon: 'storefront-outline' },
              { label: 'Messages', val: stats.messages, color: '#3b82f6', icon: 'mail-outline' },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                <Ionicons name={s.icon as never} size={20} color={s.color} />
                <ThemedText style={[styles.statVal, { color: s.color }]}>{s.val}</ThemedText>
                <ThemedText style={styles.statLbl}>{s.label}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {stats && tab === 'subscriptions' && (
          <View style={styles.statsGrid}>
            {[
              { label: 'Boutiques', val: stats.boutiques, color: '#f59e0b', icon: 'storefront-outline' },
              { label: 'Abonnés', val: stats.active_subscriptions, color: '#A7AD9A', icon: 'card-outline' },
              { label: 'Plan Plus', val: stats.plus_subscribers, color: '#f59e0b', icon: 'star-outline' },
              { label: 'Basic', val: stats.active_subscriptions - stats.plus_subscribers, color: '#10b981', icon: 'checkmark-circle-outline' },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                <Ionicons name={s.icon as never} size={20} color={s.color} />
                <ThemedText style={[styles.statVal, { color: s.color }]}>{s.val}</ThemedText>
                <ThemedText style={styles.statLbl}>{s.label}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un utilisateur…"
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
              onSubmitEditing={load}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {['', 'client', 'prestataire', 'boutique', 'admin'].map((r) => (
                <Pressable key={r} style={[styles.filterChip, roleFilter === r && styles.filterChipOn]} onPress={() => setRoleFilter(r)}>
                  <ThemedText style={[styles.filterTxt, roleFilter === r && styles.filterTxtOn]}>
                    {r === '' ? 'Tous' : r}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            {loading ? (
              <ActivityIndicator color="#A7AD9A" style={{ marginTop: 32 }} />
            ) : (
              <FlatList
                data={users}
                keyExtractor={(u) => String(u.id)}
                scrollEnabled={false}
                renderItem={renderUser}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <ThemedText style={styles.emptyTxt}>Aucun utilisateur trouvé</ThemedText>
                }
              />
            )}
          </>
        )}

        {/* Subscriptions tab */}
        {tab === 'subscriptions' && (
          <>
            {loading ? (
              <ActivityIndicator color="#A7AD9A" style={{ marginTop: 32 }} />
            ) : (
              <FlatList
                data={subscriptions}
                keyExtractor={(u) => String(u.id)}
                scrollEnabled={false}
                renderItem={renderSubscription}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <ThemedText style={styles.emptyTxt}>Aucun compte boutique pour l'instant</ThemedText>
                  </View>
                }
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnOn: { borderBottomColor: '#A7AD9A' },
  tabTxt: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  tabTxtOn: { color: '#A7AD9A' },
  content: { padding: 16, gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', borderTopWidth: 3, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', padding: 14, alignItems: 'center', gap: 4, backgroundColor: '#fafafa' },
  statVal: { fontSize: 24, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  searchInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fafafa' },
  filterChipOn: { borderColor: '#A7AD9A', backgroundColor: '#A7AD9A' },
  filterTxt: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  filterTxtOn: { color: '#fff' },
  userCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', padding: 12, gap: 10, backgroundColor: '#fff' },
  subCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', padding: 12, gap: 10, backgroundColor: '#fff' },
  userCardOff: { opacity: 0.5 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  userEmail: { fontSize: 11, color: '#9ca3af' },
  userBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  roleBadgeTxt: { fontSize: 10, fontWeight: '700' },
  subBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  subBadgeTxt: { fontSize: 10, fontWeight: '700' },
  subStatus: { fontSize: 10, fontWeight: '600', paddingTop: 3 },
  subExpires: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  userActions: { gap: 6, flexShrink: 0 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  subActionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyTxt: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 20 },
});
