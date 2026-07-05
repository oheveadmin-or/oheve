import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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

type Officiant = {
  id: string;
  nom: string;
  prenom: string;
  ville?: string;
  region: string;
  tel?: string;
  email?: string;
};

// Source : consistoiredefrance.fr/trouver/rabbins
// Données remises à zéro le 2026-07-05 — nouvel annuaire à venir.
const RABBINS: Officiant[] = [];

// ─── Composant carte ──────────────────────────────────────────────────────────

function OfficiantCard({ o }: { o: Officiant }) {
  const initials = (o.prenom[0] + o.nom[0]).toUpperCase();
  const hasTel = !!o.tel;
  const hasEmail = !!o.email;

  return (
    <View style={card.wrap}>
      <View style={card.header}>
        <View style={card.avatar}>
          <ThemedText style={card.avatarText}>{initials}</ThemedText>
        </View>
        <View style={card.info}>
          <ThemedText style={card.nom}>{o.prenom} {o.nom}</ThemedText>
          <View style={card.locationRow}>
            <Ionicons name="location-outline" size={11} color={C.textLight} />
            <ThemedText style={card.location}>
              {o.ville ? `${o.ville} · ` : ''}{o.region}
            </ThemedText>
          </View>
        </View>
      </View>

      {(hasTel || hasEmail) && (
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
              <ThemedText style={[card.btnTel, { color: C.moka }]} numberOfLines={1}>
                {o.email}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Regroupement par région ──────────────────────────────────────────────────

function groupByRegion(list: Officiant[]) {
  const map: Record<string, Officiant[]> = {};
  for (const r of list) {
    if (!map[r.region]) map[r.region] = [];
    map[r.region].push(r);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'fr'));
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RabbinsScreen() {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? RABBINS.filter((o) =>
        [o.nom, o.prenom, o.ville ?? '', o.region, o.tel ?? '', o.email ?? '']
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : RABBINS;

  const grouped = groupByRegion(filtered);
  const total = RABBINS.length;

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.sauge} />
        </Pressable>
        <View>
          <ThemedText style={s.overline}>Consistoire de France</ThemedText>
          <ThemedText style={s.title}>Annuaire des Rabbins ✡️</ThemedText>
        </View>
      </View>

      {/* Bandeau officiel */}
      <Pressable
        style={s.banner}
        onPress={() => Linking.openURL('https://www.consistoiredefrance.fr/trouver/rabbins')}
      >
        <View>
          <ThemedText style={s.bannerCount}>{total} rabbins répertoriés</ThemedText>
          <ThemedText style={s.bannerSub}>Source officielle · Tél: 01 49 70 88 00</ThemedText>
        </View>
        <View style={s.bannerBtn}>
          <Ionicons name="open-outline" size={13} color={C.saugeDark} />
          <ThemedText style={s.bannerBtnTxt}>Site complet</ThemedText>
        </View>
      </Pressable>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color={C.textLight} />
        <TextInput
          style={s.searchInput}
          placeholder="Nom, ville, région, email…"
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
            <ThemedText style={s.emptyTxt}>
              {search.trim()
                ? `Aucun résultat pour « ${search} »`
                : 'Annuaire en cours de préparation.\nRetrouvez bientôt les rabbins et madrichot kala ici.'}
            </ThemedText>
          </View>
        ) : (
          grouped.map(([region, items]) => (
            <View key={region} style={s.regionBlock}>
              <View style={s.regionHeader}>
                <Ionicons name="location" size={12} color={C.sauge} />
                <ThemedText style={s.regionLabel}>{region}</ThemedText>
                <View style={s.badge}>
                  <ThemedText style={s.badgeTxt}>{items.length}</ThemedText>
                </View>
              </View>
              {items.map((o) => <OfficiantCard key={o.id} o={o} />)}
            </View>
          ))
        )}

        <Pressable
          style={s.footer}
          onPress={() => Linking.openURL('https://www.consistoiredefrance.fr/trouver/rabbins')}
        >
          <Ionicons name="information-circle-outline" size={14} color={C.sauge} />
          <ThemedText style={s.footerTxt}>
            Liste complète & à jour sur consistoiredefrance.fr
          </ThemedText>
          <Ionicons name="chevron-forward" size={12} color={C.sauge} />
        </Pressable>
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
  info: { flex: 1, gap: 3 },
  nom: { fontSize: 14, fontWeight: '700', color: C.textDark },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: 11, color: C.textLight },
  actions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: C.ivoire,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.saugePale, borderRadius: 8,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  btnMail: { backgroundColor: C.warningPale },
  btnTel: { fontSize: 12, color: C.sauge, fontWeight: '600' },
});

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
  back: { padding: 4 },
  overline: { fontSize: 11, color: C.textLight },
  title: { fontSize: 22, fontWeight: '700', color: C.textDark },

  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.saugePale, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  bannerCount: { fontSize: 15, fontWeight: '700', color: C.saugeDark },
  bannerSub: { fontSize: 11, color: C.textMid, marginTop: 2 },
  bannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerBtnTxt: { fontSize: 12, color: C.saugeDark, fontWeight: '600' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
    borderWidth: 1, borderColor: C.saugePale,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark, paddingVertical: 0 },

  list: { gap: 16 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { color: C.textLight, fontSize: 14 },

  regionBlock: { gap: 8 },
  regionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  regionLabel: { fontSize: 13, fontWeight: '700', color: C.saugeDark, flex: 1 },
  badge: { backgroundColor: C.saugePale, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, color: C.saugeDark, fontWeight: '600' },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.saugePale, borderRadius: RADIUS.sm,
    padding: 12, marginTop: 4,
  },
  footerTxt: { fontSize: 12, color: C.textMid, flex: 1 },
});
