import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'document' | 'video';

export interface Attachment {
  uri: string;
  name: string;
  type: AttachmentType;
  size?: number; // bytes
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  attachments: Attachment[];
  fromBoutique: boolean; // true = envoyé par le prestataire boutique
  sentAt: string;        // ISO
  read: boolean;
}

export interface Conversation {
  id: string;
  clientName: string;
  clientAvatar?: string; // initiales fallback
  lastMessage: string;
  lastMessageAt: string; // ISO
  unreadCount: number;
}

interface MessagesContextValue {
  conversations: Conversation[];
  messages: Message[];
  // actions
  sendMessage: (conversationId: string, text: string, attachments?: Attachment[]) => void;
  markAsRead: (conversationId: string) => void;
  getMessages: (conversationId: string) => Message[];
  getConversation: (id: string) => Conversation | undefined;
  // called by client side to initiate a conversation
  startConversation: (clientName: string, initialText: string) => string; // returns conversationId
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

let _nextMsgId = 1;
let _nextConvId = 1;

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const getMessages = useCallback(
    (conversationId: string) => messages.filter((m) => m.conversationId === conversationId),
    [messages]
  );

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string, attachments: Attachment[] = []) => {
      const msg: Message = {
        id: String(_nextMsgId++),
        conversationId,
        text,
        attachments,
        fromBoutique: true,
        sentAt: new Date().toISOString(),
        read: true,
      };
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: text || '📎 Fichier joint', lastMessageAt: msg.sentAt }
            : c
        )
      );
    },
    []
  );

  const markAsRead = useCallback((conversationId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.conversationId === conversationId ? { ...m, read: true } : m))
    );
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const startConversation = useCallback((clientName: string, initialText: string): string => {
    const id = String(_nextConvId++);
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      clientName,
      unreadCount: 1,
      lastMessage: initialText,
      lastMessageAt: now,
    };
    const msg: Message = {
      id: String(_nextMsgId++),
      conversationId: id,
      text: initialText,
      attachments: [],
      fromBoutique: false,
      sentAt: now,
      read: false,
    };
    setConversations((prev) => [conv, ...prev]);
    setMessages((prev) => [...prev, msg]);
    return id;
  }, []);

  const value = useMemo<MessagesContextValue>(
    () => ({ conversations, messages, sendMessage, markAsRead, getMessages, getConversation, startConversation }),
    [conversations, messages, sendMessage, markAsRead, getMessages, getConversation, startConversation]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used inside MessagesProvider');
  return ctx;
}
