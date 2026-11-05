import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS, ActivityIndicator, Alert, AppState, FlatList, KeyboardAvoidingView,
  Modal, Platform, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ErrorBanner } from '@/components/ui/error-banner';
import { C } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { communityApi } from '@/services/auth/api';

// ── Communauté Oheve ──────────────────────────────────────────────────────────
// Salon commun à tous les mariés. Identité = prénom, nom et photo du compte.
// Les nouveaux messages arrivent par interrogation du serveur toutes les 3 s
// tant que l'écran est ouvert et l'app au premier plan.

const POLL_MS = 3000;
const MAX_LENGTH = 2000;
const RULES_KEY = 'community_rules_accepted_v1';

export type CommunityMessage = {
  id: number;
  user_id: number;
  content: string | null;
  created_at: string;
  deleted: boolean;
  prenom: string;
  nom: string;
  avatar_url: string | null;
  is_admin: boolean;
  reply_to: null | { id: number; prenom: string; content: string | null; deleted: boolean };
};

type BlockedUser = { id: number; prenom: string; nom: string; avatar_url: string | null };

type Row =
  | { kind: 'msg'; key: string; msg: CommunityMessage; showHeader: boolean }
  | { kind: 'day'; key: string; label: string };

const REPORT_REASONS = ['Spam ou publicité', 'Propos offensants', 'Harcèlement', 'Contenu inapproprié', 'Autre'];

function fullName(m: { prenom?: string; nom?: string }) {
  return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || 'Marié(e) Oheve';
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Aujourd\'hui';
  if (same(d, yesterday)) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function Avatar({ uri, name, size }: { uri: string | null; name: string; size: number }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !broken) {
    return <Image source={{ uri }} style={style} contentFit="cover" onError={() => setBroken(true)} />;
  }
  return (
    <View style={[style, styles.avatarFallback]}>
      <ThemedText style={[styles.avatarFallbackTxt, { fontSize: size * 0.4 }]}>
        {(name.trim()[0] ?? '?').toUpperCase()}
      </ThemedText>
    </View>
  );
}

type SheetAction = { label: string; destructive?: boolean; onPress: () => void };

/** Message d'information (Alert natif ; window.alert sur le web, où Alert est inerte). */
function notify(title: string, message?: string) {
  if (Platform.OS === 'web') { window.alert(message ? `${title}\n\n${message}` : title); return; }
  Alert.alert(title, message);
}

/** Confirmation « Annuler / <action> ». */
function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${message}`)) onConfirm(); return; }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const token = user?.accessToken;
  const isAdmin = user?.role === 'admin';
  const allowed = user?.role === 'client' || isAdmin;

  const [byId, setById] = useState<Record<number, CommunityMessage>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banned, setBanned] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);

  const [rulesVisible, setRulesVisible] = useState(false);
  const [blockedVisible, setBlockedVisible] = useState(false);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  // Feuille d'actions maison (Android / web) : Alert.alert d'Android n'affiche
  // que 3 boutons, or un message peut en proposer 5.
  const [sheet, setSheet] = useState<{ title: string; actions: SheetAction[] } | null>(null);

  const showActions = useCallback((title: string, actions: SheetAction[]) => {
    if (Platform.OS === 'ios') {
      const options = [...actions.map((a) => a.label), 'Annuler'];
      const destructiveButtonIndex = actions.map((a, i) => (a.destructive ? i : -1)).filter((i) => i >= 0);
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options, cancelButtonIndex: options.length - 1, destructiveButtonIndex },
        (idx) => { if (idx < actions.length) actions[idx].onPress(); },
      );
    } else {
      setSheet({ title, actions });
    }
  }, []);

  const listRef = useRef<FlatList<Row>>(null);
  const loadedOnce = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const rulesKey = `${RULES_KEY}:${user?.id ?? 0}`;

  // ── Charte à accepter au premier passage ────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !allowed) return;
    AsyncStorage.getItem(rulesKey).then((v) => { if (!v) setRulesVisible(true); }).catch(() => {});
  }, [user?.id, allowed, rulesKey]);

  const acceptRules = () => {
    AsyncStorage.setItem(rulesKey, new Date().toISOString()).catch(() => {});
    setRulesVisible(false);
  };

  // ── Chargement / rafraîchissement ───────────────────────────────────────────
  /** Recharge la dernière page et la fusionne avec ce qui est déjà affiché :
   *  les nouveaux messages apparaissent, les suppressions récentes aussi. */
  const refresh = useCallback(async (opts: { reset?: boolean } = {}) => {
    if (!token || !allowed) return;
    const res = await communityApi.getMessages(token);
    if (res?.banned) { setBanned(res.message); setLoading(false); return; }
    if (!res?.success || !Array.isArray(res.data)) {
      // Pendant le rafraîchissement automatique, une coupure réseau ne doit pas
      // effacer la conversation : on n'affiche l'erreur qu'au 1er chargement.
      if (!loadedOnce.current) setLoadError(res?.message ?? 'Impossible de charger la Communauté.');
      setLoading(false);
      return;
    }
    setBanned(null);
    setLoadError(null);
    const latest = res.data as CommunityMessage[];
    setById((prev) => {
      const next: Record<number, CommunityMessage> = opts.reset ? {} : { ...prev };
      // Les messages récents absents de la réponse (ex. auteur bloqué) disparaissent.
      if (!opts.reset && latest.length) {
        const minId = latest[0].id;
        for (const id of Object.keys(next)) if (Number(id) >= minId) delete next[Number(id)];
      }
      for (const m of latest) next[m.id] = m;
      return next;
    });
    if (opts.reset || !loadedOnce.current) setHasMore(!!res.has_more);
    loadedOnce.current = true;
    setLoading(false);
  }, [token, allowed]);

  // Interrogation régulière : seulement écran visible + app au premier plan.
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => { refresh().catch(() => {}); }, POLL_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    refresh({ reset: !loadedOnce.current }).catch(() => {});
    start();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { refresh().catch(() => {}); start(); } else stop();
    });
    return () => { stop(); sub.remove(); };
  }, [refresh]));

  const loadOlder = async () => {
    if (!token || loadingOlder || !hasMore) return;
    const ids = Object.keys(byId).map(Number);
    if (!ids.length) return;
    setLoadingOlder(true);
    const res = await communityApi.getMessages(token, Math.min(...ids));
    if (res?.success && Array.isArray(res.data)) {
      setById((prev) => {
        const next = { ...prev };
        for (const m of res.data as CommunityMessage[]) next[m.id] = m;
        return next;
      });
      setHasMore(!!res.has_more);
    }
    setLoadingOlder(false);
  };

  // ── Lignes de la liste (inversée : la plus récente en premier) ───────────────
  const rows: Row[] = useMemo(() => {
    const sorted = Object.values(byId).sort((a, b) => a.id - b.id);
    const out: Row[] = [];
    let prevDay = '';
    let prev: CommunityMessage | null = null;
    for (const m of sorted) {
      const day = new Date(m.created_at).toDateString();
      if (day !== prevDay) {
        out.push({ kind: 'day', key: `d-${day}`, label: dayLabel(m.created_at) });
        prevDay = day;
        prev = null;
      }
      // On regroupe les messages consécutifs d'une même personne (< 5 min).
      const grouped = prev && prev.user_id === m.user_id
        && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
      out.push({ kind: 'msg', key: `m-${m.id}`, msg: m, showHeader: !grouped });
      prev = m;
    }
    return out.reverse();
  }, [byId]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const send = async () => {
    const content = text.trim();
    if (!content || !token || sending) return;
    setSending(true);
    setText('');
    const reply = replyTo;
    setReplyTo(null);
    const res = await communityApi.sendMessage(token, content, reply?.id);
    if (res?.success && res.data) {
      setById((prev) => ({ ...prev, [res.data.id]: res.data }));
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else {
      // Ne jamais perdre le message tapé.
      setText(content);
      setReplyTo(reply);
      if (res?.banned) setBanned(res.message);
      else notify('Message non envoyé', res?.message ?? 'Vérifiez votre connexion et réessayez.');
    }
    setSending(false);
  };

  const startReply = (m: CommunityMessage) => {
    setReplyTo(m);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const deleteMessage = (m: CommunityMessage) => {
    confirmAction('Supprimer ce message ?', 'Il sera retiré pour tous les participants.', 'Supprimer', async () => {
      if (!token) return;
      const res = await communityApi.deleteMessage(token, m.id);
      if (res?.success) {
        setById((prev) => ({ ...prev, [m.id]: { ...m, deleted: true, content: null } }));
      } else {
        notify('Suppression impossible', res?.message ?? 'Réessayez dans un instant.');
      }
    });
  };

  const report = (target: { message?: CommunityMessage; userId: number; name: string }) => {
    const submit = async (reason: string) => {
      if (!token) return;
      const res = await communityApi.report(token, target.message
        ? { message_id: target.message.id, reason }
        : { user_id: target.userId, reason });
      notify(res?.success ? 'Signalement envoyé' : 'Signalement impossible',
        res?.message ?? (res?.success ? 'Merci, l\'équipe Oheve va l\'examiner.' : 'Réessayez dans un instant.'));
    };
    showActions(
      target.message ? 'Pourquoi signalez-vous ce message ?' : `Pourquoi signalez-vous ${target.name} ?`,
      REPORT_REASONS.map((r) => ({ label: r, onPress: () => submit(r) })),
    );
  };

  const block = (userId: number, name: string) => {
    confirmAction(`Bloquer ${name} ?`, 'Vous ne verrez plus ses messages dans la Communauté. Vous pourrez annuler ce blocage depuis le menu ⋯.', 'Bloquer', async () => {
      if (!token) return;
      const res = await communityApi.block(token, userId);
      if (res?.success) {
        setById((prev) => {
          const next: Record<number, CommunityMessage> = {};
          for (const m of Object.values(prev)) if (m.user_id !== userId) next[m.id] = m;
          return next;
        });
        if (replyTo?.user_id === userId) setReplyTo(null);
      } else {
        notify('Blocage impossible', res?.message ?? 'Réessayez dans un instant.');
      }
    });
  };

  const openMessageActions = (m: CommunityMessage) => {
    if (m.deleted) return;
    const mine = m.user_id === user?.id;
    const name = fullName(m);
    const actions: SheetAction[] = [
      { label: 'Répondre', onPress: () => startReply(m) },
      { label: 'Copier le texte', onPress: () => { Clipboard.setStringAsync(m.content ?? '').catch(() => {}); } },
    ];
    if (mine || isAdmin) actions.push({ label: 'Supprimer', destructive: true, onPress: () => deleteMessage(m) });
    if (!mine) {
      actions.push({ label: 'Signaler ce message', destructive: true, onPress: () => report({ message: m, userId: m.user_id, name }) });
      if (!m.is_admin) actions.push({ label: `Bloquer ${m.prenom}`, destructive: true, onPress: () => block(m.user_id, name) });
    }
    showActions(name, actions);
  };

  const openUserActions = (m: CommunityMessage) => {
    if (m.user_id === user?.id) return;
    const name = fullName(m);
    const actions: SheetAction[] = [
      { label: `Répondre à ${m.prenom}`, onPress: () => startReply(m) },
      { label: `Signaler ${m.prenom}`, destructive: true, onPress: () => report({ userId: m.user_id, name }) },
    ];
    if (!m.is_admin) actions.push({ label: `Bloquer ${m.prenom}`, destructive: true, onPress: () => block(m.user_id, name) });
    showActions(name, actions);
  };

  const openBlocked = async () => {
    setBlockedVisible(true);
    if (!token) return;
    const res = await communityApi.listBlocks(token);
    if (res?.success && Array.isArray(res.data)) setBlocked(res.data);
  };

  const unblock = async (u: BlockedUser) => {
    if (!token) return;
    const res = await communityApi.unblock(token, u.id);
    if (res?.success) {
      setBlocked((prev) => prev.filter((x) => x.id !== u.id));
      refresh({ reset: true }).catch(() => {});
    } else {
      notify('Déblocage impossible', res?.message ?? 'Réessayez dans un instant.');
    }
  };

  const openMenu = () => showActions('Communauté Oheve', [
    { label: 'Règles de la communauté', onPress: () => setRulesVisible(true) },
    { label: 'Personnes bloquées', onPress: () => { openBlocked().catch(() => {}); } },
    ...(isAdmin ? [{ label: 'Modération (admin)', onPress: () => router.push('/(app)/admin?tab=communaute' as never) }] : []),
  ]);

  // ── Rendu d'un message ──────────────────────────────────────────────────────
  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return (
        <View style={styles.dayRow}>
          <ThemedText style={styles.dayTxt}>{item.label}</ThemedText>
        </View>
      );
    }
    const m = item.msg;
    const me = m.user_id === user?.id;
    const name = fullName(m);
    return (
      <View style={[styles.msgRow, me && styles.msgRowMe, item.showHeader && styles.msgRowFirst]}>
        {!me && (
          <View style={styles.avatarSlot}>
            {item.showHeader && (
              <Pressable onPress={() => openUserActions(m)} hitSlop={6} accessibilityLabel={`Options pour ${name}`}>
                <Avatar uri={m.avatar_url} name={name} size={34} />
              </Pressable>
            )}
          </View>
        )}
        <Pressable
          onPress={() => openMessageActions(m)}
          onLongPress={() => openMessageActions(m)}
          delayLongPress={300}
          disabled={m.deleted}
          style={({ pressed }) => [
            styles.bubble,
            me ? styles.bubbleMe : styles.bubbleThem,
            m.deleted && styles.bubbleDeleted,
            pressed && !m.deleted && { opacity: 0.85 },
          ]}
        >
          {!me && item.showHeader && (
            <View style={styles.senderRow}>
              <ThemedText style={styles.senderName} numberOfLines={1}>{name}</ThemedText>
              {m.is_admin && (
                <View style={styles.adminBadge}>
                  <ThemedText style={styles.adminBadgeTxt}>Équipe Oheve</ThemedText>
                </View>
              )}
            </View>
          )}
          {m.reply_to && !m.deleted && (
            <View style={[styles.quote, me && styles.quoteMe]}>
              <ThemedText style={[styles.quoteName, me && styles.quoteNameMe]} numberOfLines={1}>
                {m.reply_to.prenom}
              </ThemedText>
              <ThemedText style={[styles.quoteTxt, me && styles.quoteTxtMe, m.reply_to.deleted && styles.italic]} numberOfLines={2}>
                {m.reply_to.deleted ? 'Message supprimé' : m.reply_to.content}
              </ThemedText>
            </View>
          )}
          {m.deleted ? (
            <ThemedText style={[styles.bubbleText, styles.italic, styles.deletedTxt]}>Message supprimé</ThemedText>
          ) : (
            <ThemedText style={[styles.bubbleText, me && styles.bubbleTextMe]}>{m.content}</ThemedText>
          )}
          <ThemedText style={[styles.time, me && styles.timeMe]}>{formatTime(m.created_at)}</ThemedText>
        </Pressable>
      </View>
    );
  };

  // ── Écrans d'état ───────────────────────────────────────────────────────────
  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Retour">
        <Ionicons name="arrow-back" size={22} color={C.sauge} />
      </Pressable>
      <View style={styles.headerIcon}>
        <Ionicons name="people" size={18} color="#fff" />
      </View>
      <View style={styles.headerCenter}>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>Communauté Oheve</ThemedText>
        <ThemedText style={styles.headerSub} numberOfLines={1}>Entre mariés · conseils et partages</ThemedText>
      </View>
      {allowed && !banned && (
        <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="Menu de la communauté">
          <Ionicons name="ellipsis-horizontal" size={22} color={C.saugeDark} />
        </Pressable>
      )}
    </View>
  );

  if (!allowed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.center}>
          <ThemedText style={styles.stateEmoji}>💍</ThemedText>
          <ThemedText style={styles.stateTitle}>Réservé aux mariés</ThemedText>
          <ThemedText style={styles.stateSub}>La Communauté Oheve est un espace d&apos;échange entre futurs mariés.</ThemedText>
        </View>
      </View>
    );
  }

  if (banned) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {header}
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={40} color={C.textLight} />
          <ThemedText style={styles.stateTitle}>Accès suspendu</ThemedText>
          <ThemedText style={styles.stateSub}>{banned}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {header}

      {loadError ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <ErrorBanner message={loadError} onRetry={() => { setLoading(true); setLoadError(null); refresh({ reset: true }); }} />
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 64}
      >
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={C.sauge} size="large" /></View>
        ) : rows.length === 0 && !loadError ? (
          <View style={styles.center}>
            <ThemedText style={styles.stateEmoji}>👋</ThemedText>
            <ThemedText style={styles.stateTitle}>Bienvenue dans la Communauté</ThemedText>
            <ThemedText style={styles.stateSub}>
              Posez vos questions, partagez vos bons plans et rencontrez d&apos;autres mariés. Soyez le premier à écrire !
            </ThemedText>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            inverted
            keyExtractor={(r) => r.key}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListFooterComponent={loadingOlder ? <ActivityIndicator color={C.sauge} style={{ marginVertical: 12 }} /> : null}
          />
        )}

        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyAccent} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText style={styles.replyName} numberOfLines={1}>Réponse à {fullName(replyTo)}</ThemedText>
              <ThemedText style={styles.replyPreview} numberOfLines={1}>{replyTo.content}</ThemedText>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityLabel="Annuler la réponse">
              <Ionicons name="close" size={20} color={C.textLight} />
            </Pressable>
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Écrire à la communauté…"
            placeholderTextColor={C.textLight}
            multiline
            maxLength={MAX_LENGTH}
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
            onPress={send}
            disabled={!text.trim() || sending}
            accessibilityLabel="Envoyer"
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Charte de la communauté */}
      <Modal visible={rulesVisible} transparent animationType="fade" onRequestClose={() => setRulesVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ThemedText style={styles.modalTitle}>Bienvenue dans la Communauté Oheve 💍</ThemedText>
            <ThemedText style={styles.modalText}>
              Un espace d&apos;entraide entre mariés. Vous y apparaissez avec le prénom, le nom et la photo de votre compte.
            </ThemedText>
            {[
              'Restez bienveillant et respectueux.',
              'Pas de publicité, de spam ni de démarchage.',
              'Aucun propos haineux, offensant ou harcelant.',
              'Ne partagez pas d\'informations personnelles sensibles.',
            ].map((r) => (
              <View key={r} style={styles.ruleRow}>
                <Ionicons name="checkmark-circle" size={16} color={C.sauge} />
                <ThemedText style={styles.ruleTxt}>{r}</ThemedText>
              </View>
            ))}
            <ThemedText style={styles.modalSmall}>
              Touchez un message pour répondre, le supprimer, le signaler ou bloquer son auteur. L&apos;équipe Oheve examine chaque signalement et peut suspendre un compte.
            </ThemedText>
            <Pressable style={styles.modalBtn} onPress={acceptRules}>
              <ThemedText style={styles.modalBtnTxt}>J&apos;accepte les règles</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Feuille d'actions (Android / web) */}
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <ThemedText style={styles.actionTitle} numberOfLines={1}>{sheet?.title}</ThemedText>
            {sheet?.actions.map((a) => (
              <Pressable
                key={a.label}
                style={({ pressed }) => [styles.actionBtn, pressed && { backgroundColor: C.saugePale }]}
                onPress={() => { setSheet(null); setTimeout(a.onPress, 50); }}
              >
                <ThemedText style={[styles.actionTxt, a.destructive && styles.actionTxtDanger]}>{a.label}</ThemedText>
              </Pressable>
            ))}
            <Pressable style={[styles.actionBtn, styles.actionCancel]} onPress={() => setSheet(null)}>
              <ThemedText style={[styles.actionTxt, { fontWeight: '700' }]}>Annuler</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Personnes bloquées */}
      <Modal visible={blockedVisible} transparent animationType="slide" onRequestClose={() => setBlockedVisible(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHeader}>
              <ThemedText style={styles.sheetTitle}>Personnes bloquées</ThemedText>
              <Pressable onPress={() => setBlockedVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={C.textMid} />
              </Pressable>
            </View>
            {blocked.length === 0 ? (
              <ThemedText style={styles.stateSub}>Vous n&apos;avez bloqué personne.</ThemedText>
            ) : blocked.map((u) => (
              <View key={u.id} style={styles.blockedRow}>
                <Avatar uri={u.avatar_url} name={fullName(u)} size={36} />
                <ThemedText style={styles.blockedName} numberOfLines={1}>{fullName(u)}</ThemedText>
                <Pressable style={styles.unblockBtn} onPress={() => unblock(u)}>
                  <ThemedText style={styles.unblockTxt}>Débloquer</ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.saugePale, backgroundColor: '#fff',
  },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerCenter: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  headerSub: { fontSize: 12, color: C.textLight },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  stateEmoji: { fontSize: 40 },
  stateTitle: { fontSize: 18, fontWeight: '700', color: C.textDark, textAlign: 'center' },
  stateSub: { fontSize: 14, color: C.textMid, textAlign: 'center' },

  list: { paddingHorizontal: 12, paddingVertical: 12 },
  dayRow: { alignItems: 'center', marginVertical: 10 },
  dayTxt: { fontSize: 11, fontWeight: '600', color: C.textLight, backgroundColor: C.saugePale, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, overflow: 'hidden', textTransform: 'capitalize' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 3 },
  msgRowFirst: { marginTop: 10 },
  msgRowMe: { justifyContent: 'flex-end' },
  avatarSlot: { width: 34, flexShrink: 0 },
  avatarFallback: { backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackTxt: { color: '#fff', fontWeight: '700' },

  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 1 },
  bubbleMe: { backgroundColor: C.sauge, borderTopRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderTopLeftRadius: 4, borderWidth: 1, borderColor: C.beige },
  bubbleDeleted: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.taupe, borderStyle: 'dashed' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexShrink: 1 },
  senderName: { fontSize: 12, fontWeight: '700', color: C.saugeDark, flexShrink: 1 },
  adminBadge: { backgroundColor: C.saugePale, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1, flexShrink: 0 },
  adminBadgeTxt: { fontSize: 10, fontWeight: '700', color: C.saugeDark },
  bubbleText: { fontSize: 15, color: C.textDark },
  bubbleTextMe: { color: '#fff' },
  italic: { fontStyle: 'italic' },
  deletedTxt: { color: C.textLight, fontSize: 13 },
  time: { fontSize: 10, color: C.textLight, alignSelf: 'flex-end', marginTop: 2 },
  timeMe: { color: 'rgba(255,255,255,0.7)' },

  quote: { borderLeftWidth: 3, borderLeftColor: C.sauge, backgroundColor: C.saugePale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 },
  quoteMe: { borderLeftColor: '#fff', backgroundColor: 'rgba(255,255,255,0.18)' },
  quoteName: { fontSize: 11, fontWeight: '700', color: C.saugeDark },
  quoteNameMe: { color: '#fff' },
  quoteTxt: { fontSize: 12, color: C.textMid },
  quoteTxtMe: { color: 'rgba(255,255,255,0.9)' },

  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.saugePale },
  replyAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: C.sauge },
  replyName: { fontSize: 12, fontWeight: '700', color: C.saugeDark },
  replyPreview: { fontSize: 12, color: C.textMid },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 8, gap: 8, borderTopWidth: 1, borderTopColor: C.saugePale, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1.5, borderColor: C.beige, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: C.textDark, maxHeight: 120, backgroundColor: C.ivoire },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnOff: { opacity: 0.4 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(52,54,48,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, gap: 10, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 19, fontFamily: 'OheveSerif-Medium', color: C.textDark },
  modalText: { fontSize: 14, color: C.textMid },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ruleTxt: { flex: 1, fontSize: 14, color: C.textDark },
  modalSmall: { fontSize: 12, color: C.textLight },
  modalBtn: { backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  modalBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(52,54,48,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12, maxHeight: '70%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  actionTitle: { fontSize: 13, color: C.textLight, textAlign: 'center', fontWeight: '600' },
  actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionTxt: { fontSize: 16, color: C.textDark },
  actionTxtDanger: { color: C.error },
  actionCancel: { backgroundColor: C.saugePale, marginTop: 4 },
  blockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockedName: { flex: 1, fontSize: 14, color: C.textDark },
  unblockBtn: { backgroundColor: C.saugePale, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  unblockTxt: { fontSize: 12, fontWeight: '700', color: C.saugeDark },
});
