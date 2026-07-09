import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { type Attachment, type Message, useMessages } from '@/contexts/messages-context';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Attachment preview ───────────────────────────────────────────────────────

function AttachmentBubble({ att }: { att: Attachment }) {
  if (att.type === 'image') {
    return (
      <Image
        source={{ uri: att.uri }}
        style={styles.attachImg}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={styles.attachFile}>
      <View style={styles.attachFileIcon}>
        <Ionicons
          name={att.type === 'video' ? 'videocam' : 'document-text'}
          size={20}
          color={C.sauge}
        />
      </View>
      <View style={styles.attachFileInfo}>
        <ThemedText style={styles.attachFileName} numberOfLines={1}>{att.name}</ThemedText>
        {att.size ? (
          <ThemedText style={styles.attachFileSize}>{formatFileSize(att.size)}</ThemedText>
        ) : null}
      </View>
    </View>
  );
}

// ── Bubble ───────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const mine = msg.fromBoutique;
  return (
    <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {/* Attachments */}
        {msg.attachments.map((att, i) => (
          <AttachmentBubble key={i} att={att} />
        ))}
        {/* Text */}
        {msg.text ? (
          <ThemedText style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
            {msg.text}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
          {formatTime(msg.sentAt)}{mine && ' ✓'}
        </ThemedText>
      </View>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getConversation, getMessages, sendMessage, markAsRead } = useMessages();

  const conv = getConversation(id ?? '');
  const msgs = getMessages(id ?? '');

  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) markAsRead(id);
  }, [id, markAsRead]);

  useEffect(() => {
    // scroll to bottom when new messages arrive
    if (msgs.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [msgs.length]);

  // ── Attach handler ────────────────────────────────────────────────────────

  const handleAttach = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Photo / Vidéo', 'Document'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) pickMedia();
          if (idx === 2) pickDocument();
        }
      );
    } else {
      Alert.alert('Joindre', 'Choisissez un type de fichier', [
        { text: 'Photo / Vidéo', onPress: pickMedia },
        { text: 'Document', onPress: pickDocument },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const atts: Attachment[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? 'media',
        type: a.type === 'video' ? 'video' : 'image',
        size: a.fileSize,
      }));
      setPendingAttachments((prev) => [...prev, ...atts].slice(0, 5));
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: false,
    });
    if (!result.canceled) {
      const atts: Attachment[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        type: 'document',
        size: a.size,
      }));
      setPendingAttachments((prev) => [...prev, ...atts].slice(0, 5));
    }
  };

  const removeAttachment = (i: number) => {
    setPendingAttachments((prev) => prev.filter((_, j) => j !== i));
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = () => {
    if (!text.trim() && pendingAttachments.length === 0) return;
    if (!id) return;
    setSending(true);
    sendMessage(id, text.trim(), pendingAttachments);
    setText('');
    setPendingAttachments([]);
    setSending(false);
  };

  if (!conv) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText style={{ color: C.textLight }}>Conversation introuvable</ThemedText>
      </View>
    );
  }

  // Group messages by date for date separators
  const groupedData: (Message | { type: 'separator'; date: string; key: string })[] = [];
  let lastDate = '';
  msgs.forEach((m) => {
    const d = formatDate(m.sentAt);
    if (d !== lastDate) {
      groupedData.push({ type: 'separator', date: d, key: `sep-${d}` });
      lastDate = d;
    }
    groupedData.push(m);
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.textDark} />
        </Pressable>
        <View style={styles.headerAvatar}>
          <ThemedText style={styles.headerAvatarText}>
            {conv.clientName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.headerInfo}>
          <ThemedText style={styles.headerName}>{conv.clientName}</ThemedText>
          <ThemedText style={styles.headerSub}>Client</ThemedText>
        </View>
        <Pressable style={styles.moreBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={C.textDark} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={groupedData}
        keyExtractor={(item) => ('key' in item ? item.key : item.id)}
        contentContainerStyle={[styles.msgList, { paddingBottom: 12 }]}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if ('type' in item) {
            return (
              <View style={styles.dateSep}>
                <View style={styles.dateLine} />
                <ThemedText style={styles.dateLabel}>{item.date}</ThemedText>
                <View style={styles.dateLine} />
              </View>
            );
          }
          return <MessageBubble msg={item} />;
        }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-outline" size={40} color={C.textLight} />
            <ThemedText style={styles.emptyChatText}>Démarrez la conversation</ThemedText>
          </View>
        }
      />

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pendingBar}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}
        >
          {pendingAttachments.map((att, i) => (
            <View key={i} style={styles.pendingItem}>
              {att.type === 'image' ? (
                <Image source={{ uri: att.uri }} style={styles.pendingImg} contentFit="cover" />
              ) : (
                <View style={styles.pendingDoc}>
                  <Ionicons
                    name={att.type === 'video' ? 'videocam' : 'document-text'}
                    size={18}
                    color={C.sauge}
                  />
                  <ThemedText style={styles.pendingDocName} numberOfLines={1}>{att.name}</ThemedText>
                </View>
              )}
              <Pressable style={styles.pendingRemove} onPress={() => removeAttachment(i)}>
                <Ionicons name="close-circle" size={18} color={C.error} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={styles.attachBtn} onPress={handleAttach}>
          <Ionicons name="attach" size={22} color={C.sauge} />
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={C.textLight}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />

        <Pressable
          style={[
            styles.sendBtn,
            (text.trim() || pendingAttachments.length > 0) && !sending
              ? styles.sendBtnActive
              : styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={(!text.trim() && pendingAttachments.length === 0) || sending}
        >
          <Ionicons name="send" size={18} color={C.textInvert} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ivoire },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: C.ivoire,
    borderBottomWidth: 1, borderBottomColor: C.card,
  },
  backBtn: { padding: 4 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 15, fontWeight: '800', color: C.sauge },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: C.textDark },
  headerSub: { fontSize: 12, color: C.textLight },
  moreBtn: { padding: 4 },

  // ── Messages list
  msgList: { paddingHorizontal: 16, paddingTop: 16, flexGrow: 1 },

  dateSep: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  dateLine: { flex: 1, height: 1, backgroundColor: C.card },
  dateLabel: { fontSize: 11, color: C.textLight, fontWeight: '600' },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyChatText: { fontSize: 14, color: C.textLight },

  // ── Bubble
  bubbleWrap: { marginBottom: 6 },
  bubbleWrapRight: { alignItems: 'flex-end' },
  bubbleWrapLeft: { alignItems: 'flex-start' },

  bubble: {
    maxWidth: '78%', borderRadius: RADIUS.lg, padding: 10, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
  },
  bubbleMine: { backgroundColor: C.sauge, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: C.card, borderBottomLeftRadius: 4 },

  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: C.textInvert },
  bubbleTextTheirs: { color: C.textDark },

  bubbleTime: { fontSize: 10, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeTheirs: { color: C.textLight },

  // ── Attachment inside bubble
  attachImg: { width: 200, height: 160, borderRadius: RADIUS.md },
  attachFile: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, padding: 10,
    minWidth: 180,
  },
  attachFileIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  attachFileInfo: { flex: 1 },
  attachFileName: { fontSize: 13, fontWeight: '600', color: C.textDark },
  attachFileSize: { fontSize: 11, color: C.textLight, marginTop: 2 },

  // ── Pending attachments bar
  pendingBar: {
    maxHeight: 90, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.cardAlt,
  },
  pendingItem: { position: 'relative' },
  pendingImg: { width: 70, height: 70, borderRadius: RADIUS.md },
  pendingDoc: {
    width: 120, height: 70, borderRadius: RADIUS.md,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
    padding: 8, gap: 4,
  },
  pendingDocName: { fontSize: 10, color: C.sauge, textAlign: 'center' },
  pendingRemove: { position: 'absolute', top: -6, right: -6 },

  // ── Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: C.ivoire,
    borderTopWidth: 1, borderTopColor: C.card,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: C.card, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: C.textDark,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  sendBtnActive: { backgroundColor: C.sauge },
  sendBtnDisabled: { backgroundColor: C.textLight + '55' },
});
