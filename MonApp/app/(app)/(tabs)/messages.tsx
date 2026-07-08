import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorBanner } from '@/components/ui/error-banner';
import { useAuth } from '@/contexts/auth-context';
import { messagingApi, prestatairesApi } from '@/services/auth/api';

type Conversation = {
  id: number;
  client_id: number;
  prestataire_id: number;
  other_nom: string;
  other_prenom: string;
  other_avatar?: string;
  other_role: string;
  business_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
};

type Prestataire = {
  user_id: number;
  business_name: string;
  category: string;
  location_city?: string;
  nom?: string;
  prenom?: string;
};

const CATEGORY_EMOJI: Record<string, string> = {
  photos: '📸', décoration: '🕯️', fleurs: '🌸', traiteur: '🍽️',
  musique: '🎵', tenues: '👗', salle: '🏛️', autre: '✨',
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nouveau prestataire
  const [modalVisible, setModalVisible] = useState(false);
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [prestLoading, setPrestLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState<number | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.accessToken) return;
    try {
      const json = await messagingApi.listConversations(user.accessToken);
      if (json.success) {
        setConversations(json.data);
        setLoadError(null);
      } else {
        setLoadError(json?.message || 'Impossible de charger les messages. Vérifiez votre connexion.');
      }
    } catch {
      setLoadError('Impossible de charger les messages. Vérifiez votre connexion.');
    }
    setLoading(false);
  }, [user?.accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNewConversationModal = async () => {
    setModalVisible(true);
    setSearch('');
    if (prestataires.length) return;
    setPrestLoading(true);
    try {
      const json = await prestatairesApi.list(user!.accessToken);
      if (json.success) {
        setPrestataires(json.data);
      } else {
        Alert.alert('Chargement impossible', json?.message ?? 'Vérifiez votre connexion et réessayez.');
      }
    } catch {
      Alert.alert('Chargement impossible', 'Vérifiez votre connexion et réessayez.');
    }
    setPrestLoading(false);
  };

  const startConversation = async (prestataireId: number) => {
    if (!user?.accessToken || starting) return;
    setStarting(prestataireId);
    try {
      const json = await messagingApi.startConversation(user.accessToken, prestataireId);
      if (json.success) {
        setModalVisible(false);
        router.push(`/(app)/messages/${json.data.id}` as never);
      } else {
        Alert.alert('Conversation impossible', json?.message ?? 'Vérifiez votre connexion et réessayez.');
      }
    } catch {
      Alert.alert('Conversation impossible', 'Vérifiez votre connexion et réessayez.');
    }
    setStarting(null);
  };

  const filtered = prestataires.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.business_name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.location_city ?? '').toLowerCase().includes(q)
    );
  });

  const otherName = (c: Conversation) => {
    const full = `${c.other_prenom} ${c.other_nom}`;
    return c.business_name ? `${c.business_name} · ${full}` : full;
  };

  const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const canStartConversation = user?.role === 'client' || user?.role === 'admin';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Messages</ThemedText>
        <View style={styles.headerRight}>
          {conversations.filter((c) => c.unread_count > 0).length > 0 && (
            <View style={styles.totalUnread}>
              <ThemedText style={styles.totalUnreadTxt}>
                {conversations.reduce((s, c) => s + c.unread_count, 0)}
              </ThemedText>
            </View>
          )}
          {canStartConversation && (
            <Pressable style={styles.newBtn} onPress={openNewConversationModal} hitSlop={8}>
              <Ionicons name="create-outline" size={22} color="#A7AD9A" />
            </Pressable>
          )}
        </View>
      </View>

      {loadError ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <ErrorBanner message={loadError} onRetry={() => { setLoading(true); load(); }} />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#A7AD9A" size="large" /></View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.emptyEmoji}>💬</ThemedText>
          <ThemedText style={styles.emptyTitle}>Aucune conversation</ThemedText>
          <ThemedText style={styles.emptySub}>
            {canStartConversation
              ? 'Appuie sur le crayon en haut pour contacter un prestataire'
              : 'Les clients pourront te contacter ici'}
          </ThemedText>
          {canStartConversation && (
            <Pressable style={styles.startBtn} onPress={openNewConversationModal}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <ThemedText style={styles.startBtnTxt}>Contacter un prestataire</ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          renderItem={({ item: c }) => (
            <Pressable
              style={({ pressed }) => [styles.convRow, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/(app)/messages/${c.id}` as never)}
            >
              <View style={[styles.avatar, { backgroundColor: c.unread_count > 0 ? '#A7AD9A' : '#e5e7eb' }]}>
                <ThemedText style={[styles.avatarTxt, { color: c.unread_count > 0 ? '#fff' : '#6b7280' }]}>
                  {c.other_prenom?.[0] ?? '?'}
                </ThemedText>
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convTopRow}>
                  <ThemedText style={styles.convName} numberOfLines={1}>{otherName(c)}</ThemedText>
                  <ThemedText style={styles.convTime}>{timeAgo(c.last_message_at)}</ThemedText>
                </View>
                <View style={styles.convBottomRow}>
                  <ThemedText style={[styles.convLast, c.unread_count > 0 && styles.convLastUnread]} numberOfLines={1}>
                    {c.last_message ?? 'Nouvelle conversation'}
                  </ThemedText>
                  {c.unread_count > 0 && (
                    <View style={styles.badge}>
                      <ThemedText style={styles.badgeTxt}>{c.unread_count}</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      {/* Modal : choisir un prestataire */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Contacter un prestataire</ThemedText>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#A09890" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher par nom, catégorie, ville…"
              placeholderTextColor="#A09890"
              autoCorrect={false}
            />
          </View>

          {prestLoading ? (
            <View style={styles.center}><ActivityIndicator color="#A7AD9A" size="large" /></View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(p) => String(p.user_id)}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16 }}
              renderItem={({ item: p }) => (
                <Pressable
                  style={({ pressed }) => [styles.prestRow, pressed && { opacity: 0.8 }]}
                  onPress={() => startConversation(p.user_id)}
                  disabled={starting === p.user_id}
                >
                  <View style={styles.prestAvatar}>
                    <ThemedText style={styles.prestAvatarTxt}>
                      {CATEGORY_EMOJI[p.category.toLowerCase()] ?? '✨'}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.prestName} numberOfLines={1}>{p.business_name}</ThemedText>
                    <ThemedText style={styles.prestSub} numberOfLines={1}>
                      {p.category}{p.location_city ? ` · ${p.location_city}` : ''}
                    </ThemedText>
                  </View>
                  {starting === p.user_id
                    ? <ActivityIndicator color="#A7AD9A" size="small" />
                    : <Ionicons name="chatbubble-outline" size={20} color="#A7AD9A" />}
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <ThemedText style={styles.emptySub}>Aucun prestataire trouvé</ThemedText>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 26, fontWeight: '800', color: '#3D3530', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalUnread: { backgroundColor: '#A7AD9A', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  totalUnreadTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  newBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#3D3530' },
  emptySub: { fontSize: 14, color: '#A09890', textAlign: 'center', lineHeight: 20 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#A7AD9A', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  startBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: 18, fontWeight: '700' },
  convInfo: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontSize: 15, fontWeight: '700', color: '#3D3530', flex: 1 },
  convTime: { fontSize: 11, color: '#A09890', marginLeft: 8 },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convLast: { fontSize: 13, color: '#A09890', flex: 1 },
  convLastUnread: { color: '#374151', fontWeight: '600' },
  badge: { backgroundColor: '#A7AD9A', borderRadius: 99, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#f9fafb', marginLeft: 76 },
  // Modal
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#3D3530' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#3D3530' },
  prestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  prestAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#f3f0ff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  prestAvatarTxt: { fontSize: 22 },
  prestName: { fontSize: 15, fontWeight: '700', color: '#3D3530' },
  prestSub: { fontSize: 12, color: '#A09890', marginTop: 2 },
});
