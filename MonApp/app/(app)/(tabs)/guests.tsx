import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { KeyboardDoneBar, keyboardDoneProps } from '@/components/ui/keyboard-done-bar';
import { API_ENDPOINTS as ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import {
  addGuest as storeAddGuest,
  addGuests as storeAddGuests,
  configureGuestsSync,
  getGuests,
  loadGuests,
  removeGuest as storeRemoveGuest,
  subscribeGuests,
  type GuestStatus,
  type StoredGuest as Guest,
} from '@/lib/guests-store';

type GuestFilter = 'all' | GuestStatus;

const KNOWN_EVENTS: { id: string; label: string; emoji: string }[] = [
  { id: 'jewish-henne',         label: 'Henné',          emoji: '🌸' },
  { id: 'jewish-mairie',        label: 'Mairie',          emoji: '🏛️' },
  { id: 'jewish-houppa',        label: 'Houppa',          emoji: '💍' },
  { id: 'jewish-chabbat-hatan', label: 'Chabbat Hatan',   emoji: '🕌' },
  { id: 'jewish-brunch',        label: 'Brunch',          emoji: '☕' },
  { id: 'jewish-sheva',         label: 'Sheva Berakhot',  emoji: '✡️' },
];

function eventLabel(id: string): string {
  return KNOWN_EVENTS.find((e) => e.id === id)?.label ?? id;
}
function eventEmoji(id: string): string {
  return KNOWN_EVENTS.find((e) => e.id === id)?.emoji ?? '📅';
}

export default function GuestsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [guests, setGuestsState] = useState<Guest[]>([]);

  // Le store est la source de vérité : synchronisé avec le serveur (partagé
  // entre les appareils d'un même compte), chargé au montage puis par abonnement.
  useEffect(() => {
    let alive = true;
    configureGuestsSync(user?.accessToken ?? null, user?.id ?? null);
    loadGuests().then(() => { if (alive) setGuestsState(getGuests()); });
    const unsub = subscribeGuests(() => setGuestsState(getGuests()));
    return () => { alive = false; unsub(); };
  }, [user?.accessToken, user?.id]);
  const [statusFilter, setStatusFilter] = useState<GuestFilter>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [weddingSlug, setWeddingSlug] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState(false);
  const sseAbortRef = useRef<AbortController | null>(null);

  // ── Computed ────────────────────────────────────────────────────────────────

  const availableEvents = useMemo(() => {
    const seen = new Set<string>();
    guests.forEach((g) => {
      if (g.events) {
        Object.entries(g.events).forEach(([id, ev]) => { if (ev.attending) seen.add(id); });
      }
      if (g.manualEventId) seen.add(g.manualEventId);
    });
    const ordered = KNOWN_EVENTS.filter((e) => seen.has(e.id));
    // also include any unknown event IDs not in KNOWN_EVENTS
    [...seen].forEach((id) => {
      if (!KNOWN_EVENTS.some((e) => e.id === id)) ordered.push({ id, label: id, emoji: '📅' });
    });
    return ordered;
  }, [guests]);

  const guestsByEvent = useMemo(() => {
    if (eventFilter === 'all') return guests;
    return guests.filter((g) => {
      if (g.events) return g.events[eventFilter]?.attending === true;
      if (g.manualEventId) return g.manualEventId === eventFilter;
      return false;
    });
  }, [guests, eventFilter]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? guestsByEvent : guestsByEvent.filter((g) => g.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((g) =>
        g.name.toLowerCase().includes(q) ||
        (g.email ?? '').toLowerCase().includes(q) ||
        (g.group ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [guestsByEvent, statusFilter, searchQuery]);

  const eventCount = useCallback(
    (id: string) => guests.filter((g) => g.events?.[id]?.attending === true || g.manualEventId === id).length,
    [guests],
  );

  const invitationCount   = guestsByEvent.length;
  const declinedCount     = guestsByEvent.filter((g) => g.status === 'declined').length;
  const totalPeople       = guestsByEvent.reduce((s, g) => s + g.guestCount, 0);
  const confirmedPeople   = guestsByEvent.filter((g) => g.status === 'confirmed').reduce((s, g) => s + g.guestCount, 0);
  const progress          = totalPeople > 0 ? confirmedPeople / totalPeople : 0;

  // ── RSVP sync ───────────────────────────────────────────────────────────────

  const addRSVPGuest = useCallback((answer: {
    id: string; firstname: string; lastname: string;
    email?: string; phone?: string;
    events?: Record<string, { attending: boolean; guestCount?: number }>;
    submittedAt?: string;
  }) => {
    const attending = answer.events
      ? Object.values(answer.events).filter((e) => e.attending)
      : [];
    const totalPpl = attending.length > 0 ? Math.max(...attending.map((e) => e.guestCount ?? 1)) : 1;

    // Via bulk pour que le serveur dédoublonne par rsvpRef : une même réponse
    // RSVP reçue plusieurs fois (sync initiale + SSE) ne crée pas de doublon.
    storeAddGuests([{
      id: `rsvp-${answer.id}`,
      name: `${answer.firstname} ${answer.lastname}`,
      guestCount: totalPpl,
      status: attending.length > 0 ? 'confirmed' : 'declined',
      group: 'RSVP site',
      email: answer.email,
      phone: answer.phone,
      fromRSVP: true,
      rsvpRef: answer.id,
      events: answer.events,
    }]);
  }, []);

  const connectSSE = useCallback((slug: string) => {
    sseAbortRef.current?.abort();
    if (!user?.accessToken) return;
    const ctrl = new AbortController();
    sseAbortRef.current = ctrl;
    const url = ENDPOINTS.rsvpStream(slug);

    (async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
          signal: ctrl.signal,
        });
        if (!res.body) return;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done || ctrl.signal.aborted) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as { type: string; answer: Parameters<typeof addRSVPGuest>[0] };
                if (data.type === 'rsvp_new') addRSVPGuest(data.answer);
              } catch { /* ignore malformed */ }
            }
          }
        }
      } catch { /* disconnected */ }
    })();
  }, [user?.accessToken, addRSVPGuest]);

  const extractSlug = (input: string): string => {
    const match = input.trim().match(/\/wedding\/([^/?#]+)/);
    return match ? match[1] : input.trim();
  };

  const syncFromBackend = useCallback(async (rawSlug: string) => {
    const slug = rawSlug.trim().match(/\/wedding\/([^/?#]+)/)?.[1] ?? rawSlug.trim();
    if (!slug || !user?.accessToken) return;
    setSyncLoading(true);
    try {
      const res = await fetch(ENDPOINTS.rsvp(slug), {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!res.ok) throw new Error('Non autorisé');
      const json = await res.json() as { success: boolean; data: Array<{
        id: string; firstname: string; lastname: string;
        email: string | null; phone: string | null;
        events: Record<string, { attending: boolean; guestCount?: number }>;
      }> };
      if (json.success && Array.isArray(json.data)) {
        for (const answer of json.data) addRSVPGuest({ ...answer, email: answer.email ?? undefined, phone: answer.phone ?? undefined });
        Alert.alert('Sync RSVP', `${json.data.length} réponse(s) importée(s).`);
        connectSSE(slug);
      }
    } catch (e) {
      Alert.alert('Erreur sync', (e as Error).message);
    } finally {
      setSyncLoading(false);
    }
  }, [user?.accessToken, addRSVPGuest, connectSSE]);

  useEffect(() => () => { sseAbortRef.current?.abort(); }, []);

  useEffect(() => {
    if (!user?.accessToken) return;
    fetch(ENDPOINTS.myPublicSite, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json: { success?: boolean; data?: { slug: string } } | null) => {
        const slug = json?.data?.slug;
        if (slug) {
          setWeddingSlug(slug);
          syncFromBackend(slug);
        }
      })
      .catch(() => null);
  }, [user?.accessToken, syncFromBackend]);

  // ── Lien carte de mariage rattaché à la liste d'invités ─────────────────────
  // Le site + ses liens d'invitation par groupe sont affichés ici pour que le
  // couple partage TOUJOURS le bon lien (fini les mauvais liens importés).

  type SiteInviteLink = { id: string; label: string; token: string };
  const [mySiteLinks, setMySiteLinks] = useState<{ slug: string; inviteLinks: SiteInviteLink[] } | null>(null);

  useEffect(() => {
    if (!user?.accessToken) return;
    fetch(ENDPOINTS.mySites, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { success?: boolean; data?: { slug: string; inviteLinks?: SiteInviteLink[] }[] } | null) => {
        const site = json?.data?.[0];
        if (site?.slug) {
          setMySiteLinks({ slug: site.slug, inviteLinks: (site.inviteLinks ?? []).filter((l) => l.token) });
          if (!weddingSlug) setWeddingSlug(site.slug);
        }
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken]);

  const siteBaseUrl = ENDPOINTS.weddingSitePublicBase;
  const shareInviteLink = async (url: string, label?: string) => {
    try {
      await Share.share({ message: label ? `${label} — ${url}` : url });
    } catch { /* annulé */ }
  };
  const copyInviteLink = async (url: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Copié', 'Le lien a été copié.');
  };

  // ── Modal state ──────────────────────────────────────────────────────────────

  const [modalVisible, setModalVisible]   = useState(false);
  const [name, setName]                   = useState('');
  const [guestCount, setGuestCount]       = useState('1');
  const [status, setStatus]               = useState<GuestStatus>('confirmed');
  const [group, setGroup]                 = useState('');
  const [table, setTable]                 = useState('');
  const [manualEventId, setManualEventId] = useState<string>('');

  const onDeleteGuest = (id: string) => {
    Alert.alert('Supprimer', 'Supprimer cet invité ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => storeRemoveGuest(id) },
    ]);
  };

  const onSyncFromSite = () => {
    if (!weddingSlug.trim()) {
      Alert.prompt
        ? Alert.prompt('Slug du site', 'Entrez le slug de votre site mariage', (val) => {
            if (val) { setWeddingSlug(val); syncFromBackend(val); }
          })
        : Alert.alert('Slug requis', 'Entrez le slug dans le champ avant de synchroniser.');
      return;
    }
    syncFromBackend(weddingSlug.trim());
  };

  const onAddGuest = () => {
    const cleanedName  = name.trim();
    const cleanedGroup = group.trim();
    const count = Number(guestCount);
    if (!cleanedName || !cleanedGroup || Number.isNaN(count) || count < 1) return;

    storeAddGuest({
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanedName,
      guestCount: Math.round(count),
      status,
      group: cleanedGroup,
      table: table.trim() || undefined,
      manualEventId: manualEventId || undefined,
    });
    setName(''); setGuestCount('1'); setStatus('confirmed');
    setGroup(''); setTable(''); setManualEventId('');
    setModalVisible(false);
  };

  // ── Import Excel ─────────────────────────────────────────────────────────────

  const onImportExcel = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv',
        'text/comma-separated-values',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const b64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const wb = XLSX.read(b64, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (rows.length === 0) {
        Alert.alert('Import Excel', 'Le fichier est vide.');
        return;
      }

      // Détection souple des colonnes (Nom / Personnes / Email / Téléphone / Groupe / Table)
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      const findKey = (row: Record<string, unknown>, candidates: string[]) =>
        Object.keys(row).find((k) => candidates.includes(norm(k)));

      const first = rows[0];
      const nameKey = findKey(first, ['nom', 'name', 'invite', 'invites', 'famille', 'foyer', 'nom / foyer']);
      if (!nameKey) {
        Alert.alert('Import Excel', 'Colonne "Nom" introuvable. Ajoute une colonne Nom (ou Name / Famille) dans ton fichier.');
        return;
      }
      const countKey = findKey(first, ['personnes', 'nombre', 'nb', 'count', 'pax', 'nombre de personnes']);
      const emailKey = findKey(first, ['email', 'mail', 'e-mail']);
      const phoneKey = findKey(first, ['telephone', 'phone', 'tel', 'portable']);
      const groupKey = findKey(first, ['groupe', 'group', 'famille/groupe', 'cote']);
      const tableKey = findKey(first, ['table', 'table n°', 'table no']);

      const imported: Guest[] = rows
        .map((row, i): Guest | null => {
          const nm = String(row[nameKey] ?? '').trim();
          if (!nm) return null;
          const rawCount = countKey ? Number(row[countKey]) : 1;
          return {
            id: `excel-${Date.now()}-${i}`,
            name: nm,
            guestCount: Number.isFinite(rawCount) && rawCount >= 1 ? Math.round(rawCount) : 1,
            status: 'confirmed' as GuestStatus,
            group: groupKey ? String(row[groupKey] ?? '').trim() || 'Import Excel' : 'Import Excel',
            email: emailKey ? String(row[emailKey] ?? '').trim() || undefined : undefined,
            phone: phoneKey ? String(row[phoneKey] ?? '').trim() || undefined : undefined,
            table: tableKey ? String(row[tableKey] ?? '').trim() || undefined : undefined,
          };
        })
        .filter((g): g is Guest => g !== null);

      const added = await storeAddGuests(imported);
      Alert.alert(
        'Import Excel',
        added > 0
          ? `${added} invité(s) importé(s)${imported.length - added > 0 ? ` (${imported.length - added} doublon(s) ignoré(s))` : ''}.`
          : 'Aucun nouvel invité (tous déjà présents dans la liste).',
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de lire ce fichier. Utilise un fichier .xlsx, .xls ou .csv.');
    }
  };

  // ── Labels ───────────────────────────────────────────────────────────────────

  const statusLabel: Record<GuestStatus, string> = { confirmed: 'Confirme', declined: 'Refuse' };
  const statusColor: Record<GuestStatus, string>  = { confirmed: '#7A8A72', declined: '#C17E7E' };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout constrainWidth={false} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.pageContent, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={styles.homeButton} onPress={() => router.replace('/(app)/(tabs)')}>
          <ThemedText style={styles.homeButtonText}>← Retour a l accueil</ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText style={styles.title}>Invites</ThemedText>
          <ThemedText style={styles.subtitle}>Gerez vos invites et suivez leurs confirmations.</ThemedText>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeadRow}>
            <ThemedText style={styles.summaryTitle}>
              {eventFilter === 'all' ? 'Tous les invités' : `${eventEmoji(eventFilter)} ${eventLabel(eventFilter)}`}
            </ThemedText>
            <View style={styles.summaryIconBadge}>
              <Ionicons name="people" size={12} color="#A7AD9A" />
            </View>
          </View>

          <ThemedText style={styles.summaryBigNumber}>
            {confirmedPeople} <ThemedText style={styles.summaryBigHint}>/ {totalPeople} personnes</ThemedText>
          </ThemedText>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
            <ThemedText style={styles.progressPercent}>{Math.round(progress * 100)}%</ThemedText>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatCol}>
              <ThemedText style={styles.summaryStatValue}>{invitationCount}</ThemedText>
              <ThemedText style={styles.summaryStatLabel}>invitations</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStatCol}>
              <ThemedText style={[styles.summaryStatValue, { color: '#dc2626' }]}>{declinedCount}</ThemedText>
              <ThemedText style={styles.summaryStatLabel}>refusees</ThemedText>
            </View>
            {availableEvents.length > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStatCol}>
                  <ThemedText style={styles.summaryStatValue}>{availableEvents.length}</ThemedText>
                  <ThemedText style={styles.summaryStatLabel}>evenements</ThemedText>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Event tabs — appear once data loaded */}
        {availableEvents.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventTabRow}>
            <Pressable
              style={[styles.eventTab, eventFilter === 'all' && styles.eventTabActive]}
              onPress={() => setEventFilter('all')}
            >
              <ThemedText style={[styles.eventTabText, eventFilter === 'all' && styles.eventTabTextActive]}>
                Tous ({guests.length})
              </ThemedText>
            </Pressable>
            {availableEvents.map((ev) => (
              <Pressable
                key={ev.id}
                style={[styles.eventTab, eventFilter === ev.id && styles.eventTabActive]}
                onPress={() => setEventFilter(ev.id)}
              >
                <ThemedText style={[styles.eventTabText, eventFilter === ev.id && styles.eventTabTextActive]}>
                  {ev.emoji} {ev.label} ({eventCount(ev.id)})
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Slug sync row */}
        <View style={styles.slugRow}>
          <TextInput
            style={styles.slugInput}
            placeholder="Slug du site (ex: sarah-et-david)"
            value={weddingSlug}
            onChangeText={(v) => setWeddingSlug(extractSlug(v))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.slugSyncBtn, syncLoading && { opacity: 0.6 }]}
            onPress={() => weddingSlug.trim() && syncFromBackend(weddingSlug.trim())}
            disabled={syncLoading}
          >
            <Ionicons name={syncLoading ? 'hourglass-outline' : 'sync-outline'} size={14} color="#fff" />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color="#A09890" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un invité..."
            placeholderTextColor="#A09890"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#A09890" />
            </Pressable>
          )}
        </View>

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'confirmed', 'declined'] as GuestFilter[]).map((key) => (
            <Pressable key={key} style={[styles.filterChip, statusFilter === key && styles.filterChipActive]} onPress={() => setStatusFilter(key)}>
              <ThemedText style={[styles.filterChipText, statusFilter === key && styles.filterChipTextActive]}>
                {{ all: 'Tous', confirmed: 'Confirmes', declined: 'Refuses' }[key]}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={onSyncFromSite}>
            <Ionicons name="sync-outline" size={14} color="#7A8A72" />
            <ThemedText style={styles.actionBtnText}>Sync site</ThemedText>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={onImportExcel}>
            <Ionicons name="document-attach-outline" size={14} color="#7A8A72" />
            <ThemedText style={styles.actionBtnText}>Importer Excel</ThemedText>
          </Pressable>
        </View>

        {/* Lien carte de mariage — rattaché à la liste d'invités */}
        {mySiteLinks && (
          <View style={styles.inviteLinksCard}>
            <View style={styles.inviteLinksHead}>
              <Ionicons name="link-outline" size={15} color="#7A8A72" />
              <ThemedText style={styles.inviteLinksTitle}>Lien carte de mariage</ThemedText>
            </View>
            <ThemedText style={styles.inviteLinksHint}>
              Partagez ces liens officiels à vos invités — les réponses arrivent directement dans cette liste.
            </ThemedText>

            <View style={styles.inviteLinkRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inviteLinkLabel}>Site principal</ThemedText>
                <ThemedText style={styles.inviteLinkUrl} numberOfLines={1}>
                  {siteBaseUrl}/{mySiteLinks.slug}
                </ThemedText>
              </View>
              <Pressable hitSlop={8} onPress={() => copyInviteLink(`${siteBaseUrl}/${mySiteLinks.slug}`)}>
                <Ionicons name="copy-outline" size={17} color="#7A8A72" />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => shareInviteLink(`${siteBaseUrl}/${mySiteLinks.slug}`)}>
                <Ionicons name="share-outline" size={17} color="#7A8A72" />
              </Pressable>
            </View>

            {mySiteLinks.inviteLinks.map((l) => {
              const url = `${siteBaseUrl}/${mySiteLinks.slug}/invite/${l.token}`;
              return (
                <View key={l.id} style={styles.inviteLinkRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inviteLinkLabel}>{l.label || 'Groupe'}</ThemedText>
                    <ThemedText style={styles.inviteLinkUrl} numberOfLines={1}>{url}</ThemedText>
                  </View>
                  <Pressable hitSlop={8} onPress={() => copyInviteLink(url)}>
                    <Ionicons name="copy-outline" size={17} color="#7A8A72" />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => shareInviteLink(url, l.label)}>
                    <Ionicons name="share-outline" size={17} color="#7A8A72" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Guest list */}
        <View style={styles.listContent}>
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                {eventFilter !== 'all'
                  ? `Aucun invité pour ${eventLabel(eventFilter)}`
                  : 'Aucun invité — synchronisez votre site ou ajoutez manuellement'}
              </ThemedText>
            </View>
          )}
          {filtered.map((guest) => {
            const attendingEvents = guest.events
              ? Object.entries(guest.events).filter(([, ev]) => ev.attending).map(([id]) => id)
              : guest.manualEventId ? [guest.manualEventId] : [];

            const details = [`${guest.guestCount} personne${guest.guestCount > 1 ? 's' : ''}`];
            if (guest.table) details.push(`Table ${guest.table}`);
            if (!guest.fromRSVP) details.push(guest.group);

            return (
              <Pressable
                key={guest.id}
                style={({ pressed }) => [styles.guestCard, pressed && styles.guestCardPressed]}
                onLongPress={() => onDeleteGuest(guest.id)}
              >
                <View style={styles.guestIconWrap}>
                  <Ionicons name="people-outline" size={11} color="#A7AD9A" />
                </View>
                <View style={styles.guestBody}>
                  <View style={styles.guestTopRow}>
                    <ThemedText style={styles.guestName} numberOfLines={1}>{guest.name}</ThemedText>
                    <View style={styles.guestRightSide}>
                      <ThemedText style={[styles.statusBadge, { color: statusColor[guest.status] }]} numberOfLines={1}>
                        {statusLabel[guest.status]}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.guestDetails} numberOfLines={1}>
                    {details.join(' • ')}{guest.email ? ` • ${guest.email}` : ''}
                  </ThemedText>
                  {attendingEvents.length > 0 && (
                    <View style={styles.guestEventRow}>
                      {attendingEvents.map((id) => (
                        <View key={id} style={styles.guestEventTag}>
                          <ThemedText style={styles.guestEventTagText}>{eventEmoji(id)} {eventLabel(id)}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                  {guest.fromRSVP && <ThemedText style={styles.rsvpBadge}>RSVP site</ThemedText>}
                </View>
                <Pressable onPress={() => onDeleteGuest(guest.id)} hitSlop={8} style={styles.guestDeleteBtn}>
                  <Ionicons name="trash-outline" size={14} color="#d1d5db" />
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listFooter}>
          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]} onPress={() => setModalVisible(true)}>
            <ThemedText style={styles.primaryBtnText}>+ Ajouter un invité</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add guest modal */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalCenter}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalCard}>
                <ThemedText style={styles.modalTitle}>Nouvel invité</ThemedText>

                <ThemedText style={styles.modalLabel}>Nom / foyer</ThemedText>
                <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Ex: Famille Martin" />

                <ThemedText style={styles.modalLabel}>Nombre de personnes</ThemedText>
                <TextInput style={styles.modalInput} value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" placeholder="Ex: 2" {...keyboardDoneProps} />

                <ThemedText style={styles.modalLabel}>Statut RSVP</ThemedText>
                <View style={styles.statusRow}>
                  {(['confirmed', 'declined'] as GuestStatus[]).map((opt) => (
                    <Pressable key={opt} style={[styles.statusChip, status === opt && styles.statusChipActive]} onPress={() => setStatus(opt)}>
                      <ThemedText style={[styles.statusChipText, status === opt && styles.statusChipTextActive]}>
                        {statusLabel[opt]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <ThemedText style={styles.modalLabel}>Événement</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventPickerRow}>
                  <Pressable
                    style={[styles.eventPickerChip, manualEventId === '' && styles.eventPickerChipActive]}
                    onPress={() => setManualEventId('')}
                  >
                    <ThemedText style={[styles.eventPickerChipText, manualEventId === '' && styles.eventPickerChipTextActive]}>Tous</ThemedText>
                  </Pressable>
                  {KNOWN_EVENTS.map((ev) => (
                    <Pressable
                      key={ev.id}
                      style={[styles.eventPickerChip, manualEventId === ev.id && styles.eventPickerChipActive]}
                      onPress={() => setManualEventId(ev.id)}
                    >
                      <ThemedText style={[styles.eventPickerChipText, manualEventId === ev.id && styles.eventPickerChipTextActive]}>
                        {ev.emoji} {ev.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>

                <ThemedText style={styles.modalLabel}>Groupe</ThemedText>
                <TextInput style={styles.modalInput} value={group} onChangeText={setGroup} placeholder="Ex: Famille" />

                <ThemedText style={styles.modalLabel}>Table (optionnel)</ThemedText>
                <TextInput style={styles.modalInput} value={table} onChangeText={setTable} placeholder="Ex: 7" />

                <View style={styles.modalActions}>
                  <Pressable style={styles.modalBtnSecondary} onPress={() => setModalVisible(false)}>
                    <ThemedText style={styles.modalBtnSecondaryText}>Annuler</ThemedText>
                  </Pressable>
                  <Pressable style={styles.modalBtnPrimary} onPress={onAddGuest}>
                    <ThemedText style={styles.modalBtnPrimaryText}>Ajouter</ThemedText>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
        <KeyboardDoneBar />
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  rsvpBadge: { fontSize: 10, color: '#7A8A72', fontWeight: '700', marginTop: 2 },
  slugRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  slugInput: { flex: 1, height: 36, borderWidth: 1, borderColor: '#EBEBF2', borderRadius: 10, paddingHorizontal: 10, fontSize: 13, backgroundColor: '#fff' },
  slugSyncBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#7A8A72', alignItems: 'center', justifyContent: 'center' },
  homeButton: { alignSelf: 'flex-start', marginBottom: 4, paddingVertical: 1 },
  homeButtonText: { color: '#7A8A72', fontSize: 13, fontWeight: '600', lineHeight: 16 },
  pageContent: { paddingBottom: 8 },
  header: { marginBottom: 8 },
  title: { fontWeight: '700', marginBottom: 2, color: '#3D3530', fontSize: 22 },
  subtitle: { fontSize: 12, color: '#8e8e98', lineHeight: 15, fontWeight: '500' },

  summaryCard: { borderWidth: 1, borderColor: '#EBEBF2', borderRadius: 14, backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8 },
  summaryHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryTitle: { fontSize: 11, color: '#707084', fontWeight: '600' },
  summaryIconBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E8EDE4', alignItems: 'center', justifyContent: 'center' },
  summaryBigNumber: { fontSize: 14, color: '#A7AD9A', fontWeight: '800', marginBottom: 6, lineHeight: 18 },
  summaryBigHint: { color: '#2f3140', fontSize: 12, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#E8EDE4', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#A7AD9A' },
  progressPercent: { color: '#A7AD9A', fontSize: 10, fontWeight: '700', minWidth: 28, textAlign: 'right' },
  summaryStatsRow: { flexDirection: 'row', alignItems: 'center' },
  summaryStatCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 20, backgroundColor: '#ececf1' },
  summaryStatValue: { fontSize: 11, fontWeight: '700', color: '#A7AD9A', marginBottom: 1 },
  summaryStatLabel: { fontSize: 9, color: '#7c7c8e', fontWeight: '500' },

  eventTabRow: { flexDirection: 'row', gap: 6, marginBottom: 8, paddingRight: 8 },
  eventTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E2D9CC', backgroundColor: '#fff' },
  eventTabActive: { backgroundColor: '#7A8A72', borderColor: '#7A8A72' },
  eventTabText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  eventTabTextActive: { color: '#fff' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2D9CC',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#3D3530' },
  filterRow: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 6, marginBottom: 8, paddingRight: 8 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: '#E2D9CC', backgroundColor: '#ffffff', justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#A7AD9A', borderColor: '#A7AD9A' },
  filterChipText: { color: '#4b5563', fontSize: 10, fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  inviteLinksCard: {
    borderWidth: 1, borderColor: '#E2D9CC', borderRadius: 12,
    backgroundColor: '#fff', padding: 12, marginBottom: 10, gap: 8,
  },
  inviteLinksHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inviteLinksTitle: { fontSize: 14, fontWeight: '700', color: '#3D3530' },
  inviteLinksHint: { fontSize: 11, color: '#A09890', lineHeight: 15 },
  inviteLinkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2D9CC',
    paddingTop: 8,
  },
  inviteLinkLabel: { fontSize: 12, fontWeight: '700', color: '#7A8A72' },
  inviteLinkUrl: { fontSize: 11, color: '#6B6058', marginTop: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#E2D9CC', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fff' },
  actionBtnText: { fontSize: 11, color: '#7A8A72', fontWeight: '600' },

  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  guestDeleteBtn: { padding: 4 },
  listContent: { gap: 4, paddingBottom: 2 },
  guestCard: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E2D9CC', width: '100%', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 0 },
  guestCardPressed: { opacity: 0.92 },
  guestIconWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#E8EDE4', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  guestBody: { flex: 1, minWidth: 0 },
  guestTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 1 },
  guestRightSide: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8, flexShrink: 0 },
  guestName: { fontSize: 13, fontWeight: '700', color: '#3D3530', flex: 1, minWidth: 0, lineHeight: 15 },
  statusBadge: { fontSize: 10, fontWeight: '700', textAlign: 'right' },
  guestDetails: { fontSize: 10, color: '#6b7280', lineHeight: 12, fontWeight: '500', flexShrink: 1 },
  guestEventRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  guestEventTag: { backgroundColor: '#F0F4EE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  guestEventTagText: { fontSize: 9, color: '#7A8A72', fontWeight: '600' },

  listFooter: { marginTop: 6, paddingHorizontal: 2 },
  primaryBtn: { backgroundColor: '#A7AD9A', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalRoot: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingVertical: 10 },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalCenter: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  modalScrollContent: { width: '100%' },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2D9CC', padding: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10, color: '#3D3530' },
  modalLabel: { fontSize: 12, color: '#4b5563', marginBottom: 4, fontWeight: '600' },
  modalInput: { borderWidth: 1, borderColor: '#E2D9CC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, marginBottom: 9, backgroundColor: '#FCFCFD' },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 9 },
  statusChip: { flex: 1, borderWidth: 1, borderColor: '#E2D9CC', borderRadius: 9, paddingVertical: 8, alignItems: 'center' },
  statusChipActive: { borderColor: '#A7AD9A', backgroundColor: '#E8EDE4' },
  statusChipText: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  statusChipTextActive: { color: '#A7AD9A' },
  eventPickerRow: { flexDirection: 'row', gap: 6, marginBottom: 9, paddingRight: 4 },
  eventPickerChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E2D9CC', backgroundColor: '#fff' },
  eventPickerChipActive: { backgroundColor: '#7A8A72', borderColor: '#7A8A72' },
  eventPickerChipText: { fontSize: 11, color: '#4b5563', fontWeight: '500' },
  eventPickerChipTextActive: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  modalBtnSecondary: { flex: 1, borderWidth: 1, borderColor: '#E2D9CC', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  modalBtnSecondaryText: { color: '#4b5563', fontWeight: '700' },
  modalBtnPrimary: { flex: 1, backgroundColor: '#A7AD9A', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
});
