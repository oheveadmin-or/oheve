import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import {
  MADRICHIM_HATAN,
  MADRICHOT_KALA,
  MIKVES,
  groupByRegion,
  type Officiant,
} from '@/data/officiants';

type Onglet = 'kala' | 'hatan' | 'mikve';

const ONGLETS: {
  key: Onglet;
  label: string;
  court: string;
  emoji: string;
  data: Officiant[];
  note: string;
}[] = [
  {
    key: 'kala',
    label: 'Madrichot Kala',
    court: 'Kala',
    emoji: '👰',
    data: MADRICHOT_KALA,
    note: 'La madricha kala accompagne la mariée avant la houppa : lois de pureté familiale et préparation au mariage.',
  },
  {
    key: 'hatan',
    label: 'Madrichim Hatan',
    court: 'Hatan',
    emoji: '🤵',
    data: MADRICHIM_HATAN,
    note: 'Le madrikh hatan accompagne le marié avant la houppa. Aucun contact direct n’a été communiqué pour cette liste : rapprochez-vous de la synagogue de la ville indiquée.',
  },
  {
    key: 'mikve',
    label: 'Mikvés',
    court: 'Mikvés',
    emoji: '💧',
    data: MIKVES,
    note: 'Appelez toujours le mikvé avant de vous déplacer : les horaires d’ouverture et la prise de rendez-vous varient d’une ville à l’autre.',
  },
];

// ─── Composant carte ──────────────────────────────────────────────────────────

function OfficiantCard({ o }: { o: Officiant }) {
  const isMikve = o.adresse !== undefined;
  const initials = isMikve ? '' : ((o.prenom?.[0] ?? '') + o.nom[0]).toUpperCase();
  const hasTel = !!o.tel;
  const hasEmail = !!o.email;
  const villes = o.villes
    .map((v) => (v.cp !== '00000' ? `${v.ville} · ${v.cp}` : v.ville))
    .join('   ·   ');
  const sousTitre = isMikve && o.adresse ? o.adresse : villes;

  return (
    <View style={card.wrap}>
      <View style={card.header}>
        <View style={card.avatar}>
          {isMikve
            ? <ThemedText style={card.avatarEmoji}>💧</ThemedText>
            : <ThemedText style={card.avatarText}>{initials}</ThemedText>}
        </View>
        <View style={card.info}>
          <ThemedText style={card.nom} numberOfLines={2}>
            {o.prenom ? `${o.prenom} ${o.nom}` : o.nom}
          </ThemedText>
          <View style={card.locationRow}>
            <Ionicons name="location-outline" size={11} color={C.textLight} />
            <ThemedText style={card.location} numberOfLines={2}>{sousTitre}</ThemedText>
          </View>
        </View>
      </View>

      {(hasTel || hasEmail || (isMikve && !!o.adresse)) && (
        <View style={card.actions}>
          {hasTel && (
            <Pressable
              style={card.btn}
              onPress={() => Linking.openURL(`tel:${o.tel!.replace(/\s/g, '')}`)}
            >
              <Ionicons name="call-outline" size={14} color={C.sauge} />
              <ThemedText style={card.btnTel}>{o.tel}</ThemedText>
            </Pressable>
          )}
          {hasEmail && (
            <Pressable
              style={[card.btn, card.btnMail]}
              onPress={() => Linking.openURL(`mailto:${o.email}`)}
            >
              <Ionicons name="mail-outline" size={14} color={C.moka} />
              <ThemedText style={[card.btnTel, { color: C.moka, flexShrink: 1 }]} numberOfLines={1}>
                {o.email}
              </ThemedText>
            </Pressable>
          )}
          {isMikve && !!o.adresse && (
            <Pressable
              style={card.btn}
              onPress={() =>
                Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(o.adresse!)}`)
              }
            >
              <Ionicons name="navigate-outline" size={14} color={C.sauge} />
              <ThemedText style={card.btnTel}>Itinéraire</ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function OfficiantsScreen() {
  // ?tab=kala|hatan|mikve → ouverture directe sur le bon onglet depuis l'accueil.
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const ongletInitial: Onglet =
    tab === 'hatan' || tab === 'mikve' || tab === 'kala' ? tab : 'kala';

  const [onglet, setOnglet] = useState<Onglet>(ongletInitial);
  const [search, setSearch] = useState('');

  const current = ONGLETS.find((t) => t.key === onglet)!;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return current.data;
    return current.data.filter((o) =>
      [
        o.nom,
        o.prenom ?? '',
        o.adresse ?? '',
        o.villes.map((v) => `${v.ville} ${v.cp} ${v.region}`).join(' '),
        o.tel ?? '',
        o.email ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [search, current]);

  const grouped = useMemo(() => groupByRegion(filtered), [filtered]);

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.sauge} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText style={s.overline}>{current.label} · France & Israël</ThemedText>
          <ThemedText style={s.title}>Annuaire juif ✡️</ThemedText>
        </View>
      </View>

      {/* Les 3 cases : Madrichot Kala / Madrichim Hatan / Mikvés */}
      <View style={s.tabs}>
        {ONGLETS.map((t) => {
          const active = t.key === onglet;
          return (
            <Pressable
              key={t.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => { setOnglet(t.key); setSearch(''); }}
            >
              <ThemedText style={s.tabEmoji}>{t.emoji}</ThemedText>
              <ThemedText style={[s.tabLabel, active && s.tabLabelActive]} numberOfLines={1}>
                {t.court}
              </ThemedText>
              <ThemedText style={[s.tabCount, active && s.tabCountActive]}>
                {t.data.length}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color={C.textLight} />
        <TextInput
          style={s.searchInput}
          placeholder="Nom, ville, code postal, adresse…"
          placeholderTextColor={C.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={15} color={C.textLight} />
          </Pressable>
        )}
      </View>

      {/* Liste */}
      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {grouped.length === 0 ? (
          <View style={s.empty}>
            <ThemedText style={s.emptyTxt}>Aucun résultat pour « {search} »</ThemedText>
          </View>
        ) : (
          grouped.map(([region, items]) => (
            <View key={region} style={s.regionBlock}>
              <View style={s.regionHeader}>
                <Ionicons name="location" size={12} color={C.sauge} />
                <ThemedText style={s.regionLabel} numberOfLines={1}>{region}</ThemedText>
                <View style={s.badge}>
                  <ThemedText style={s.badgeTxt}>{items.length}</ThemedText>
                </View>
              </View>
              {items.map((o) => <OfficiantCard key={o.id} o={o} />)}
            </View>
          ))
        )}

        <View style={s.footer}>
          <Ionicons name="information-circle-outline" size={14} color={C.sauge} />
          <ThemedText style={s.footerTxt}>{current.note}</ThemedText>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 13,
    gap: 8,
    shadowColor: C.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.saugePale,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: C.saugeDark },
  avatarEmoji: { fontSize: 17 },
  info: { flex: 1, gap: 3 },
  nom: { fontSize: 14, fontWeight: '700', color: C.textDark },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
  location: { fontSize: 11, color: C.textLight, flex: 1 },
  actions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: C.ivoire,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.saugePale, borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  btnMail: { backgroundColor: C.warningPale, flexShrink: 1 },
  btnTel: { fontSize: 12, color: C.sauge, fontWeight: '600' },
});

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
  back: { padding: 4 },
  overline: { fontSize: 11, color: C.textLight },
  title: { fontSize: 22, fontWeight: '700', color: C.textDark },

  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: {
    flex: 1, alignItems: 'center', gap: 1,
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    paddingVertical: 9, paddingHorizontal: 4,
    borderWidth: 1, borderColor: C.saugePale,
  },
  tabActive: { backgroundColor: C.saugePale, borderColor: C.sauge },
  tabEmoji: { fontSize: 19 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: C.textMid },
  tabLabelActive: { color: C.saugeDark, fontWeight: '700' },
  tabCount: { fontSize: 11, color: C.textLight },
  tabCountActive: { color: C.saugeDark },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
    borderWidth: 1, borderColor: C.saugePale,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark, paddingVertical: 0 },

  list: { gap: 16 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { color: C.textLight, fontSize: 14, textAlign: 'center' },

  regionBlock: { gap: 8 },
  regionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  regionLabel: { fontSize: 13, fontWeight: '700', color: C.saugeDark, flex: 1 },
  badge: { backgroundColor: C.saugePale, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, color: C.saugeDark, fontWeight: '600' },

  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.saugePale, borderRadius: RADIUS.sm,
    padding: 12, marginTop: 4,
  },
  footerTxt: { fontSize: 12, color: C.textMid, flex: 1 },
});
