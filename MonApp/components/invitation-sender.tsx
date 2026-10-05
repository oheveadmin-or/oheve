import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import {
  configureGuestsSync,
  getGuests,
  loadGuests,
  subscribeGuests,
  type StoredGuest,
} from '@/lib/guests-store';
import {
  buildInvitationMessage,
  DEFAULT_INVITATION_TEMPLATE,
  loadInvitationTemplate,
  loadSentInvitations,
  markInvitationSent,
  saveInvitationTemplate,
  toWhatsAppNumber,
} from '@/lib/invitation-message';

const WHATSAPP_GREEN = '#25D366';

type Props = {
  slug: string;
  accessKey?: string | null;
  coupleName: string;
};

/**
 * Envoi de la carte de mariage aux invités : lien du site + message
 * personnalisé (« Madame Rachelle Layani, C'est avec beaucoup de joie… »).
 * Aperçu tel que l'invité le verra dans WhatsApp, envoi direct par invité
 * depuis la liste, suivi des invitations déjà envoyées.
 */
export function InvitationSender({ slug, accessKey, coupleName }: Props) {
  const { user } = useAuth();

  const siteUrl = `${API_ENDPOINTS.weddingSitePublicBase}/${slug}${accessKey ? `?k=${accessKey}` : ''}`;
  const previewImage = accessKey
    ? `${API_ENDPOINTS.weddingSites}/${encodeURIComponent(slug)}/og-image.jpg?k=${encodeURIComponent(accessKey)}`
    : null;

  const [template, setTemplate] = useState(DEFAULT_INVITATION_TEMPLATE);
  const [draft, setDraft] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);

  const [guests, setGuests] = useState<StoredGuest[]>([]);
  const [sent, setSent] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [showAllGuests, setShowAllGuests] = useState(false);

  useEffect(() => {
    loadInvitationTemplate().then(setTemplate);
    loadSentInvitations().then(setSent);
  }, []);

  useEffect(() => {
    let alive = true;
    configureGuestsSync(user?.accessToken ?? null, user?.id ?? null);
    loadGuests().then(() => { if (alive) setGuests(getGuests()); });
    const unsub = subscribeGuests(() => setGuests(getGuests()));
    return () => { alive = false; unsub(); };
  }, [user?.accessToken, user?.id]);

  const message = (name?: string) => buildInvitationMessage(template, { guestName: name, link: siteUrl, coupleName });
  const previewMessage = message(guestName.trim() || 'Madame Rachelle Layani');

  const flash = (what: 'link' | 'message') => {
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  /** Ouvre WhatsApp (conversation directe si numéro connu), sinon la feuille de partage. */
  const sendWhatsApp = async (text: string, phone?: string | null): Promise<boolean> => {
    const number = toWhatsAppNumber(phone);
    const url = number
      ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      try {
        const r = await Share.share({ message: text });
        return r.action === Share.sharedAction;
      } catch {
        return false;
      }
    }
  };

  const sendToGuest = async (g: StoredGuest) => {
    const ok = await sendWhatsApp(message(g.name), g.phone);
    if (ok) setSent(await markInvitationSent(g.id));
  };

  const shareOther = async () => {
    try { await Share.share({ message: message(guestName) }); } catch { /* annulé */ }
  };

  const copyMessage = async () => {
    await Clipboard.setStringAsync(message(guestName));
    flash('message');
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(siteUrl);
    flash('link');
  };

  const saveTemplate = async () => {
    const next = draft.trim() ? draft : DEFAULT_INVITATION_TEMPLATE;
    setTemplate(next);
    setEditorOpen(false);
    await saveInvitationTemplate(next);
  };

  const filteredGuests = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(search.trim());
    const list = q ? guests.filter((g) => norm(g.name).includes(q) || norm(g.group ?? '').includes(q)) : guests;
    // Non envoyés d'abord
    return [...list].sort((a, b) => Number(!!sent[a.id]) - Number(!!sent[b.id]));
  }, [guests, search, sent]);
  const sentCount = guests.filter((g) => sent[g.id]).length;
  const visibleGuests = showAllGuests || search.trim() ? filteredGuests : filteredGuests.slice(0, 8);

  if (!accessKey) {
    return (
      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>Envoyer à vos invités</ThemedText>
        <ThemedText style={styles.hint}>
          Votre lien d’invitation sera disponible dès que votre site sera publié. Ouvrez « Personnaliser » pour le finaliser.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="paper-plane" size={18} color={C.sauge} />
        <ThemedText style={styles.sectionTitle}>Envoyer à vos invités</ThemedText>
      </View>

      {/* Lien de la carte (privé, avec sa clé) */}
      <ThemedText style={styles.label}>Lien de votre carte</ThemedText>
      <Pressable style={styles.linkBox} onPress={copyLink}>
        <Ionicons name="link" size={14} color={C.sauge} />
        <ThemedText style={styles.linkText} numberOfLines={1}>{siteUrl.replace(/^https?:\/\//, '')}</ThemedText>
        <Ionicons name={copied === 'link' ? 'checkmark' : 'copy-outline'} size={16} color={C.saugeDark} />
      </Pressable>

      {/* Aperçu tel que l'invité le reçoit */}
      <ThemedText style={styles.label}>Ce que reçoit votre invité</ThemedText>
      <View style={styles.chat}>
        <View style={styles.bubble}>
          <View style={styles.preview}>
            {/* Carte de secours toujours dessous : visible tant que l'image n'est pas chargée */}
            <View style={[styles.previewImage, styles.previewFallback]}>
              <ThemedText style={styles.previewKicker}>NOUS NOUS MARIONS</ThemedText>
              <ThemedText style={styles.previewNames}>{coupleName}</ThemedText>
              {previewImage && !imageFailed && (
                <Image
                  source={{ uri: previewImage }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              )}
            </View>
            <View style={styles.previewMeta}>
              <ThemedText style={styles.previewTitle} numberOfLines={1}>{coupleName} — Invitation</ThemedText>
              <ThemedText style={styles.previewDesc} numberOfLines={1}>Vous êtes invités au mariage de {coupleName}.</ThemedText>
              <ThemedText style={styles.previewDomain}>oheve.pages.dev</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.bubbleText}>{previewMessage.replace(siteUrl, siteUrl.replace(/^https?:\/\//, ''))}</ThemedText>
        </View>
      </View>
      <Pressable style={styles.editRow} onPress={() => { setDraft(template); setEditorOpen(true); }}>
        <Ionicons name="create-outline" size={15} color={C.saugeDark} />
        <ThemedText style={styles.editTxt}>Modifier le message</ThemedText>
      </Pressable>

      {/* Envoi rapide à une personne */}
      <ThemedText style={styles.label}>Nom de l’invité</ThemedText>
      <TextInput
        style={styles.input}
        value={guestName}
        onChangeText={setGuestName}
        placeholder="Ex. Madame Rachelle Layani"
        placeholderTextColor={C.textLight}
        autoCapitalize="words"
      />
      <Pressable style={styles.waBtn} onPress={() => sendWhatsApp(message(guestName))}>
        <Ionicons name="logo-whatsapp" size={18} color="#fff" />
        <ThemedText style={styles.waBtnTxt}>Envoyer sur WhatsApp</ThemedText>
      </Pressable>
      <View style={styles.row}>
        <Pressable style={styles.btnOutline} onPress={copyMessage}>
          <Ionicons name={copied === 'message' ? 'checkmark' : 'copy-outline'} size={15} color={C.sauge} />
          <ThemedText style={styles.btnOutlineTxt}>{copied === 'message' ? 'Copié !' : 'Copier le message'}</ThemedText>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={shareOther}>
          <Ionicons name="share-outline" size={15} color={C.sauge} />
          <ThemedText style={styles.btnOutlineTxt}>Autre app</ThemedText>
        </Pressable>
      </View>

      {/* Depuis la liste d'invités */}
      {guests.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.listHead}>
            <ThemedText style={styles.sectionSub}>Depuis ma liste d’invités</ThemedText>
            <ThemedText style={styles.counter}>{sentCount}/{guests.length} envoyées</ThemedText>
          </View>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${Math.round((sentCount / guests.length) * 100)}%` }]} />
          </View>
          <TextInput
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un invité ou un groupe"
            placeholderTextColor={C.textLight}
          />
          {visibleGuests.map((g) => {
            const sentAt = sent[g.id];
            return (
              <View key={g.id} style={styles.guestRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.guestName} numberOfLines={1}>{g.name}</ThemedText>
                  <ThemedText style={styles.guestMeta} numberOfLines={1}>
                    {sentAt
                      ? `Envoyée le ${new Date(sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                      : [g.group, g.phone].filter(Boolean).join(' · ') || 'Pas encore envoyée'}
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.sendBtn, sentAt ? styles.sendBtnDone : null]}
                  onPress={() => sendToGuest(g)}
                  accessibilityLabel={`Envoyer l’invitation à ${g.name}`}
                >
                  <Ionicons name={sentAt ? 'checkmark' : 'logo-whatsapp'} size={15} color={sentAt ? C.saugeDark : '#fff'} />
                  <ThemedText style={[styles.sendBtnTxt, sentAt ? styles.sendBtnTxtDone : null]}>
                    {sentAt ? 'Renvoyer' : 'Envoyer'}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
          {!search.trim() && filteredGuests.length > visibleGuests.length && (
            <Pressable onPress={() => setShowAllGuests(true)} style={styles.editRow}>
              <ThemedText style={styles.editTxt}>Voir les {filteredGuests.length} invités</ThemedText>
            </Pressable>
          )}
        </>
      )}

      {/* Éditeur du message */}
      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditorOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalCard}>
              <ThemedText style={styles.sectionTitle}>Message d’invitation</ThemedText>
              <ThemedText style={styles.hint}>
                {'{invité}'} = nom de l’invité · {'{lien}'} = lien de votre carte · {'{mariés}'} = vos prénoms
              </ThemedText>
              <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                <TextInput
                  style={[styles.input, styles.templateInput]}
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  textAlignVertical="top"
                />
              </ScrollView>
              <Pressable onPress={() => setDraft(DEFAULT_INVITATION_TEMPLATE)} hitSlop={6}>
                <ThemedText style={styles.editTxt}>Revenir au message par défaut</ThemedText>
              </Pressable>
              <View style={styles.row}>
                <Pressable style={styles.btnOutline} onPress={() => setEditorOpen(false)}>
                  <ThemedText style={styles.btnOutlineTxt}>Annuler</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.btnFill}
                  onPress={() => {
                    if (!/\{lien\}/i.test(draft)) {
                      Alert.alert('Lien ajouté', 'Le lien de votre carte sera ajouté à la fin du message.');
                    }
                    saveTemplate();
                  }}
                >
                  <ThemedText style={styles.btnFillTxt}>Enregistrer</ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: C.sauge + '33',
    padding: 22,
    gap: 12,
    marginTop: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.textDark },
  sectionSub: { fontSize: 15, fontWeight: '700', color: C.textDark },
  hint: { fontSize: 12, color: C.textMid, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700', color: C.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  linkBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.saugePale, borderRadius: RADIUS.sm, padding: 12,
  },
  linkText: { flex: 1, fontSize: 13, color: C.saugeDark, fontWeight: '600' },

  // Aperçu façon WhatsApp
  chat: { backgroundColor: '#EFE7DC', borderRadius: RADIUS.sm, padding: 10 },
  bubble: { backgroundColor: '#fff', borderRadius: 10, padding: 6, alignSelf: 'stretch' },
  preview: { backgroundColor: '#F4F4F4', borderRadius: 8, overflow: 'hidden' },
  previewImage: { width: '100%', aspectRatio: 1200 / 630 },
  previewFallback: { backgroundColor: C.ivoire, alignItems: 'center', justifyContent: 'center', gap: 4 },
  previewKicker: { fontSize: 9, letterSpacing: 2, color: C.sauge, fontWeight: '600' },
  previewNames: { fontSize: 26, color: C.textDark, fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif', lineHeight: 34 },
  previewMeta: { padding: 8, gap: 2 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#111' },
  previewDesc: { fontSize: 12, color: '#666' },
  previewDomain: { fontSize: 11, color: '#888' },
  bubbleText: { fontSize: 13, color: '#111', lineHeight: 19, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 },
  editTxt: { fontSize: 13, fontWeight: '700', color: C.saugeDark },

  input: {
    borderWidth: 1.5, borderColor: C.saugePale, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.textDark, backgroundColor: '#fafafa',
  },
  templateInput: { minHeight: 300, fontSize: 13, lineHeight: 19 },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: WHATSAPP_GREEN, borderRadius: RADIUS.sm, paddingVertical: 13,
  },
  waBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  row: { flexDirection: 'row', gap: 10 },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.sauge, borderRadius: RADIUS.sm, paddingVertical: 10,
  },
  btnOutlineTxt: { fontSize: 13, fontWeight: '600', color: C.sauge },
  btnFill: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.sauge, borderRadius: RADIUS.sm, paddingVertical: 11,
  },
  btnFillTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  divider: { height: 1, backgroundColor: C.saugePale, marginVertical: 4 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 12, fontWeight: '700', color: C.saugeDark },
  progress: { height: 6, borderRadius: 3, backgroundColor: C.saugePale, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.sauge },
  guestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1EDE6',
  },
  guestName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  guestMeta: { fontSize: 12, color: C.textLight, marginTop: 1 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: WHATSAPP_GREEN, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7,
  },
  sendBtnDone: { backgroundColor: C.saugePale },
  sendBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  sendBtnTxtDone: { color: C.saugeDark },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34, gap: 12,
  },
});
