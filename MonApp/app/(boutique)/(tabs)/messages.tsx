import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useMessages } from '@/contexts/messages-context';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

export default function MessagesScreen() {
  const { conversations } = useMessages();

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.title}>Messages</ThemedText>
          {totalUnread > 0 && (
            <ThemedText style={styles.subtitle}>{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</ThemedText>
          )}
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles-outline" size={22} color={C.sauge} />
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={C.textLight} />
            </View>
            <ThemedText style={styles.emptyTitle}>Aucun message</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Vos échanges avec les clients apparaîtront ici
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.convRow}
            onPress={() => router.push(`/(boutique)/chat/${item.id}` as never)}
          >
            {/* Avatar */}
            <View style={[styles.avatar, item.unreadCount > 0 && styles.avatarUnread]}>
              <ThemedText style={styles.avatarText}>
                {item.clientName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>

            {/* Content */}
            <View style={styles.convBody}>
              <View style={styles.convTop}>
                <ThemedText style={[styles.convName, item.unreadCount > 0 && styles.convNameBold]}>
                  {item.clientName}
                </ThemedText>
                <ThemedText style={styles.convTime}>{timeAgo(item.lastMessageAt)}</ThemedText>
              </View>
              <View style={styles.convBottom}>
                <ThemedText
                  style={[styles.convPreview, item.unreadCount > 0 && styles.convPreviewBold]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </ThemedText>
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <ThemedText style={styles.badgeText}>{item.unreadCount}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.card,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.textDark },
  subtitle: { fontSize: 13, color: C.sauge, fontWeight: '600', marginTop: 2 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingBottom: 32, flexGrow: 1 },
  separator: { height: 1, backgroundColor: C.card, marginLeft: 76 },

  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.ivoire,
  },

  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
  },
  avatarUnread: { backgroundColor: C.sauge + '22' },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.sauge },

  convBody: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontSize: 15, color: C.textDark, fontWeight: '500' },
  convNameBold: { fontWeight: '800' },
  convTime: { fontSize: 11, color: C.textLight },

  convBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convPreview: { fontSize: 13, color: C.textLight, flex: 1, marginRight: 8 },
  convPreviewBold: { color: C.textMid, fontWeight: '600' },

  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, color: C.textInvert, fontWeight: '800' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textDark },
  emptySubtitle: { fontSize: 14, color: C.textLight, textAlign: 'center', lineHeight: 20 },
});
