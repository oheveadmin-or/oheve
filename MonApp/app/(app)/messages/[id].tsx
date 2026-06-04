import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS, ActivityIndicator, Alert, FlatList,
  KeyboardAvoidingView, Linking, Modal, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { messagingApi } from '@/services/auth/api';

type Message = {
  id: number;
  sender_id: number;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  is_read: boolean;
  created_at: string;
  sender_nom: string;
  sender_prenom: string;
};

function isImage(mimeType?: string | null) {
  return !!mimeType?.startsWith('image/');
}

function isPdf(mimeType?: string | null) {
  return mimeType === 'application/pdf';
}

function FileIcon({ mimeType }: { mimeType?: string | null }) {
  if (isImage(mimeType)) return <Ionicons name="image-outline" size={20} color="#A7AD9A" />;
  if (isPdf(mimeType)) return <Ionicons name="document-text-outline" size={20} color="#ef4444" />;
  return <Ionicons name="attach-outline" size={20} color="#6b7280" />;
}

function AttachmentBubble({ url, name, mimeType, isMe }: {
  url: string; name: string; mimeType?: string | null; isMe: boolean;
}) {
  const [imgVisible, setImgVisible] = useState(false);

  const openFile = () => {
    if (Platform.OS === 'web') {
      Linking.openURL(url);
    } else {
      WebBrowser.openBrowserAsync(url);
    }
  };

  if (isImage(mimeType)) {
    return (
      <>
        <Pressable onPress={() => setImgVisible(true)} style={styles.imgThumbWrap}>
          <Image source={{ uri: url }} style={styles.imgThumb} contentFit="cover" />
          <View style={styles.imgOverlay}>
            <Ionicons name="expand-outline" size={18} color="#fff" />
          </View>
        </Pressable>
        {/* Fullscreen */}
        <Modal visible={imgVisible} animationType="fade" transparent onRequestClose={() => setImgVisible(false)}>
          <Pressable style={styles.imgModal} onPress={() => setImgVisible(false)}>
            <Image source={{ uri: url }} style={styles.imgFull} contentFit="contain" />
            <Pressable style={styles.closeBtn} onPress={() => setImgVisible(false)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <Pressable
      style={[styles.fileBubble, isMe ? styles.fileBubbleMe : styles.fileBubbleThem]}
      onPress={openFile}
    >
      <View style={[styles.fileIconBox, { backgroundColor: isPdf(mimeType) ? '#fee2e2' : '#e0f2fe' }]}>
        <FileIcon mimeType={mimeType} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.fileName, isMe && styles.fileNameMe]} numberOfLines={2}>{name}</ThemedText>
        <ThemedText style={[styles.fileType, isMe && styles.fileTypeMe]}>
          {isPdf(mimeType) ? 'PDF' : 'Fichier'} · Appuyer pour ouvrir
        </ThemedText>
      </View>
      <Ionicons name="open-outline" size={16} color={isMe ? 'rgba(255,255,255,0.7)' : '#9ca3af'} />
    </Pressable>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState('Conversation');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const convId = parseInt(id, 10);

  const load = useCallback(async (silent = false) => {
    if (!user?.accessToken) return;
    try {
      const json = await messagingApi.getMessages(user.accessToken, convId);
      if (json.success) {
        setMessages(json.data);
        if (!silent) setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
      }
    } catch {}
    setLoading(false);
  }, [user?.accessToken, convId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  useEffect(() => {
    if (!messages.length || otherName !== 'Conversation') return;
    const other = messages.find((m) => m.sender_id !== user?.id);
    if (other) setOtherName(`${other.sender_prenom} ${other.sender_nom}`);
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user?.accessToken || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const json = await messagingApi.sendMessage(user.accessToken, convId, content);
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch {}
    setSending(false);
  };

  const sendAttachment = async (
    uri: string,
    name: string,
    type: string,
  ) => {
    if (!user?.accessToken) return;
    setUploading(true);
    try {
      const json = await messagingApi.uploadAttachment(user.accessToken, convId, { uri, name, type });
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      } else {
        Alert.alert('Erreur', json.message ?? 'Upload échoué');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer le fichier');
    }
    setUploading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorise l\'accès à ta galerie dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    await sendAttachment(asset.uri, name, type);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendAttachment(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
  };

  const showAttachmentPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Photo depuis la galerie', 'Document (PDF, Word)'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) pickImage();
          if (idx === 2) pickDocument();
        },
      );
    } else {
      Alert.alert('Joindre un fichier', '', [
        { text: 'Photo depuis la galerie', onPress: pickImage },
        { text: 'Document (PDF, Word)', onPress: pickDocument },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const isMe = (m: Message) => m.sender_id === user?.id;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <ThemedText style={styles.headerAvatarTxt}>{otherName[0] ?? '?'}</ThemedText>
          </View>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>{otherName}</ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#A7AD9A" size="large" /></View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top + 64}
        >
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.msgList}
            renderItem={({ item: m }) => {
              const me = isMe(m);
              const hasFile = !!m.file_url;
              const hasText = !!m.content;
              return (
                <View style={[styles.msgRow, me && styles.msgRowMe]}>
                  {!me && (
                    <View style={styles.msgAvatar}>
                      <ThemedText style={styles.msgAvatarTxt}>{m.sender_prenom?.[0]}</ThemedText>
                    </View>
                  )}
                  <View style={[styles.bubble, me ? styles.bubbleMe : styles.bubbleThem, hasFile && !hasText && styles.bubbleFile]}>
                    {!me && hasText && (
                      <ThemedText style={styles.bubbleSender}>{m.sender_prenom} {m.sender_nom}</ThemedText>
                    )}
                    {hasFile && (
                      <AttachmentBubble
                        url={m.file_url!}
                        name={m.file_name ?? 'fichier'}
                        mimeType={m.file_type}
                        isMe={me}
                      />
                    )}
                    {hasText && (
                      <ThemedText style={[styles.bubbleText, me && styles.bubbleTextMe]}>{m.content}</ThemedText>
                    )}
                    <View style={styles.bubbleFooter}>
                      <ThemedText style={[styles.bubbleTime, me && styles.bubbleTimeMe]}>{formatTime(m.created_at)}</ThemedText>
                      {me && (
                        <Ionicons
                          name={m.is_read ? 'checkmark-done' : 'checkmark'}
                          size={12}
                          color={m.is_read ? '#a5b4fc' : 'rgba(255,255,255,0.5)'}
                          style={{ marginLeft: 3 }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <ThemedText style={styles.emptyTxt}>Aucun message — sois le premier à écrire 👋</ThemedText>
              </View>
            }
          />

          {/* Input */}
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              style={[styles.attachBtn, uploading && { opacity: 0.5 }]}
              onPress={showAttachmentPicker}
              disabled={uploading}
              hitSlop={8}
            >
              {uploading
                ? <ActivityIndicator size="small" color="#A7AD9A" />
                : <Ionicons name="attach" size={24} color="#A7AD9A" />}
            </Pressable>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Écrire un message…"
              placeholderTextColor="#9ca3af"
              multiline
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
              onPress={send}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerAvatarTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  msgList: { padding: 16, gap: 8, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 10, gap: 4 },
  bubbleMe: { backgroundColor: '#A7AD9A', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  bubbleFile: { padding: 8 },
  bubbleSender: { fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 2 },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 19 },
  bubbleTextMe: { color: '#fff' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 },
  bubbleTime: { fontSize: 10, color: '#9ca3af', textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
  // Image attachment
  imgThumbWrap: { width: 200, height: 160, borderRadius: 10, overflow: 'hidden' },
  imgThumb: { width: '100%', height: '100%' },
  imgOverlay: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: 4 },
  imgModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  imgFull: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 52, right: 20 },
  // File attachment
  fileBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, maxWidth: 260 },
  fileBubbleMe: { backgroundColor: 'rgba(255,255,255,0.15)' },
  fileBubbleThem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  fileIconBox: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fileName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  fileNameMe: { color: '#fff' },
  fileType: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  fileTypeMe: { color: 'rgba(255,255,255,0.6)' },
  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 8, gap: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#fff' },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100, backgroundColor: '#fafafa' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnOff: { opacity: 0.4 },
});
