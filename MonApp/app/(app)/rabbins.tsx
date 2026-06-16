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
const RABBINS: Officiant[] = [
  // ── Île-de-France ──────────────────────────────────────────────────────────
  { id: 'r001', nom: 'ABEHSIR', prenom: 'Mordechai Michel', region: 'Île-de-France', tel: '06 13 35 20 11', email: 'rabbimoukassou@hotmail.fr' },
  { id: 'r002', nom: 'AROUSTAL', prenom: 'Ismaël', region: 'Île-de-France', tel: '06 32 97 76 89' },
  { id: 'r003', nom: 'ATERET', prenom: 'Noa', region: 'Île-de-France' },
  { id: 'r004', nom: 'ATLAN', prenom: 'Hazel', region: 'Île-de-France' },
  { id: 'r005', nom: 'ATTAL', prenom: 'Haim', region: 'Île-de-France', tel: '06 16 56 57 31' },
  { id: 'r006', nom: 'ATTAL', prenom: 'Dov', region: 'Île-de-France' },
  { id: 'r007', nom: 'AVDOLAT', prenom: 'Moshé', region: 'Île-de-France', tel: '01 41 14 78 15', email: 'rabbiavdolat@gmail.com' },
  { id: 'r008', nom: 'AVIRAM', prenom: 'Raphaël', region: 'Île-de-France', tel: '06 59 41 24 82' },
  { id: 'r009', nom: 'AZOUCHE', prenom: 'Nissim', region: 'Île-de-France', tel: '01 48 74 37 56', email: 'nissimssoul@laposte.fr' },
  { id: 'r010', nom: 'BELZANGER', prenom: 'Simon', region: 'Île-de-France', tel: '07 63 66 22 27' },
  { id: 'r011', nom: 'BENATA', prenom: 'Assi', region: 'Île-de-France' },
  { id: 'r012', nom: 'BENISTI', prenom: 'Yohantan', region: 'Île-de-France', tel: '06 77 13 42 54' },
  { id: 'r013', nom: 'BERGSTEIN', prenom: 'Gilles', region: 'Île-de-France', email: 'gilles.bergstein@gmail.com' },
  { id: 'r014', nom: 'BERKNISBERG', prenom: 'Yannis-Richard', region: 'Île-de-France' },
  { id: 'r015', nom: 'BIOCH', prenom: 'Philippe', region: 'Île-de-France', tel: '01 47 63 09 36', email: 'khalid.personnel@consistoire.org' },
  { id: 'r016', nom: 'BONDIT', prenom: 'Marc', region: 'Île-de-France', tel: '06 67 20 47 00', email: 'rabbinbondit@gmail.com' },
  { id: 'r017', nom: 'BONITA', prenom: 'Laurent', region: 'Île-de-France', tel: '06 93 39 78 77', email: 'bonital@gmail.com' },
  { id: 'r018', nom: 'BRAHAMI', prenom: 'Claude', region: 'Île-de-France', email: 'sinechine@wanadoo.fr' },
  { id: 'r019', nom: 'BRIERRE', prenom: 'Sacha', region: 'Île-de-France', tel: '05 59 74 41 46' },
  { id: 'r020', nom: 'CHERLET', prenom: 'Benjamin', region: 'Île-de-France', tel: '07 54 83 09 30', email: 'deputaire@consistoire.org' },
  { id: 'r021', nom: 'CHOMROB', prenom: 'Yonathan', region: 'Île-de-France' },
  { id: 'r022', nom: 'COHEN', prenom: 'Alain Abraham', region: 'Île-de-France' },
  { id: 'r023', nom: 'COHEN', prenom: 'Maxime', region: 'Île-de-France' },
  { id: 'r024', nom: 'COHEN', prenom: 'Moshé', region: 'Île-de-France' },
  { id: 'r025', nom: 'COHEN', prenom: 'Raphaël', region: 'Île-de-France' },
  { id: 'r026', nom: 'DAHAN', prenom: 'Simon', region: 'Île-de-France' },
  { id: 'r027', nom: 'ELBAZ', prenom: 'Avraham-Mordechai', region: 'Île-de-France' },
  { id: 'r028', nom: 'ELBEZE', prenom: 'Élie', region: 'Île-de-France' },
  { id: 'r029', nom: 'ELBLAU', prenom: 'Freddy', region: 'Île-de-France' },
  { id: 'r030', nom: 'EDRAS', prenom: 'Michaël', region: 'Île-de-France' },
  { id: 'r031', nom: 'EISENRIEB', prenom: 'Philippe', region: 'Île-de-France' },
  { id: 'r032', nom: 'ELGAON', prenom: 'Élie', region: 'Île-de-France' },
  { id: 'r033', nom: 'ELFANE', prenom: 'Bernard', region: 'Île-de-France' },
  { id: 'r034', nom: 'ELFASSI', prenom: 'Gabriel', region: 'Île-de-France', email: 'elfassi.gab@wanadoo.fr' },
  { id: 'r035', nom: 'ELISTAN', prenom: 'Dov', region: 'Île-de-France' },
  { id: 'r036', nom: 'FINK', prenom: 'Elisha', region: 'Île-de-France' },
  { id: 'r037', nom: 'FRANKFORTER', prenom: 'E.-David', region: 'Île-de-France' },
  { id: 'r038', nom: 'GABBAI', prenom: 'Mickaël', region: 'Île-de-France', tel: '06 64 83 67 60', email: 'mickaelgabbai@gmail.com' },
  { id: 'r039', nom: 'GABET', prenom: 'Isaël', region: 'Île-de-France' },
  { id: 'r040', nom: 'GALLULA', prenom: 'David', region: 'Île-de-France', email: 'dgallula@hotmail.com' },
  { id: 'r041', nom: 'GUIGUI', prenom: 'Albert', region: 'Île-de-France', email: 'albert.guigui@skynet.be' },
  { id: 'r042', nom: 'GUIGUI', prenom: 'Prosper', region: 'Île-de-France', tel: '01 83 21 32 97' },
  { id: 'r043', nom: 'GUTMAN', prenom: 'René', region: 'Île-de-France', email: 'rsgutman@hotmail.com' },
  { id: 'r044', nom: 'KAUFMANN', prenom: 'Olivier', region: 'Île-de-France' },
  { id: 'r045', nom: 'LELLOUCHE', prenom: 'Joë', region: 'Île-de-France', tel: '06 10 26 93' },
  { id: 'r046', nom: 'LEWIN', prenom: 'Moché', region: 'Île-de-France', tel: '01 43 02 06 11', email: 'lewinm@free.fr' },
  { id: 'r047', nom: 'LEVY', prenom: 'Alain', region: 'Île-de-France' },
  { id: 'r048', nom: 'LEVY', prenom: 'Benoît', region: 'Île-de-France' },
  { id: 'r049', nom: 'MALKA', prenom: 'Meyer', region: 'Île-de-France', tel: '01 40 82 26 10', email: 'meyer.malka@consistoire.org' },
  { id: 'r050', nom: 'MARCIANO', prenom: 'Yves-Henri', region: 'Île-de-France', tel: '01 40 82 26 40', email: 'conversions@consistoire.org' },
  { id: 'r051', nom: 'MECHALY', prenom: 'Raphaël Mouchy', region: 'Île-de-France', tel: '01 48 48 16 17', email: 'raphael.mechaly@gmail.com' },
  { id: 'r052', nom: 'MELKA', prenom: 'Otnieil', region: 'Île-de-France', tel: '06 45 48 65 50', email: 'melkaotnieil@gmail.com' },
  { id: 'r053', nom: 'MELTZER', prenom: 'Jacky', region: 'Île-de-France', tel: '01 45 04 66 73', email: 'jacky.milewski@wanadoo.fr' },
  { id: 'r054', nom: 'MESSAS', prenom: 'Ariel', region: 'Île-de-France', tel: '01 45 20 58 15', email: 'messasariel@yahoo.fr' },
  { id: 'r055', nom: 'MILEWSKI', prenom: 'Jacky', region: 'Île-de-France', tel: '01 45 04 66 73', email: 'jacky.milewski@wanadoo.fr' },
  { id: 'r056', nom: 'MIMRAN', prenom: 'Élie', region: 'Île-de-France', tel: '06 63 43 59 22', email: 'eliemimran2@gmail.com' },
  { id: 'r057', nom: 'MIMRAN', prenom: 'Dan', region: 'Île-de-France', tel: '06 46 71 32 63', email: 'mimran.dan@gmail.com' },
  { id: 'r058', nom: 'MOCHE-BIRAU', prenom: 'Maurice', region: 'Île-de-France', tel: '06 21 56 17 48' },
  { id: 'r059', nom: 'MOUYAL', prenom: 'Mikaël', region: 'Île-de-France', tel: '06 98 15 98 52', email: 'jessicamouyal@gmail.com' },
  { id: 'r060', nom: 'NACACHE', prenom: 'Alain', region: 'Île-de-France', email: 'anacache@hotmail.fr' },
  { id: 'r061', nom: 'NAGEL', prenom: 'Anton', region: 'Île-de-France' },
  { id: 'r062', nom: 'NAKACHE', prenom: 'Albert', region: 'Île-de-France', tel: '01 48 03 80 70', email: 'avikach@yahoo.fr' },
  { id: 'r063', nom: 'NAKACHE', prenom: 'Georges Moché', region: 'Île-de-France', tel: '06 12 36 74 86', email: 'georgesnakache@hotmail.fr' },
  { id: 'r064', nom: 'NEZRI', prenom: 'Maurice', region: 'Île-de-France', tel: '01 47 07 21 22', email: 'bureauif@free.fr' },
  { id: 'r065', nom: 'OHAYON', prenom: 'Joseph', region: 'Île-de-France', tel: '06 18 42 78 96', email: 'joseph.ohayon1@free.fr' },
  { id: 'r066', nom: 'PENYA', prenom: 'Isaac', region: 'Île-de-France', tel: '06 99 24 23 31', email: 'isapen@yahoo.fr' },
  { id: 'r067', nom: 'PENYA', prenom: 'David', region: 'Île-de-France', tel: '06 20 35 34 81', email: 'david.penya@hotmail.fr' },
  { id: 'r068', nom: 'PEREZ', prenom: 'Haïm', region: 'Île-de-France' },
  { id: 'r069', nom: 'SAKNINE', prenom: 'Gabriel', region: 'Île-de-France', email: 'gabriel.saknine@consistoire.org' },
  { id: 'r070', nom: 'SEBBAG', prenom: 'Moshé', region: 'Île-de-France', tel: '01 40 82 26 20', email: 'moshe.sebbag@gmail.com' },
  { id: 'r071', nom: 'SELLOU', prenom: 'Daniel', region: 'Île-de-France' },
  { id: 'r072', nom: 'SENIOR', prenom: 'Alain Salomon', region: 'Île-de-France', tel: '06 34 36 75 73', email: 'as.senior@gmail.com' },
  { id: 'r073', nom: 'SERFATY', prenom: 'Michel', region: 'Île-de-France', tel: '01 69 43 07 83', email: 'michel.serfaty@orange.fr' },
  { id: 'r074', nom: 'SERERO', prenom: 'David', region: 'Île-de-France', tel: '06 58 84 13 42', email: 'rlserero@gmail.com' },
  { id: 'r075', nom: 'SULTAN', prenom: 'Hamdal', region: 'Île-de-France', email: 'albert.sultan@hotmail.com' },
  { id: 'r076', nom: 'TOLEDANO', prenom: 'Arié', region: 'Île-de-France', tel: '06 13 43 69 64', email: 'arie.toledano@sfr.fr' },
  { id: 'r077', nom: 'TOLEDANO', prenom: 'Samuel', region: 'Île-de-France', tel: '06 91 62 64 93' },
  { id: 'r078', nom: 'TORJMAN', prenom: 'Henry Haïm', region: 'Île-de-France', tel: '01 42 78 00 30', email: 'r.torjman@gmail.com' },
  { id: 'r079', nom: 'TOUITOU', prenom: 'Joseph', region: 'Île-de-France', tel: '01 39 92 29 00', email: 'jtouitou26@gmail.com' },
  { id: 'r080', nom: 'TOUITOU', prenom: 'Mickaël', region: 'Île-de-France', tel: '01 69 20 94 21' },
  { id: 'r081', nom: 'WEIL', prenom: 'Oscar', region: 'Île-de-France', email: 'oscweil@gmail.com' },
  { id: 'r082', nom: 'WIZMAN', prenom: 'Salomon', region: 'Île-de-France', tel: '06 12 65 10 09', email: 'thorawiz@gmail.com' },
  { id: 'r083', nom: 'YELLOZ', prenom: 'Daniel', region: 'Île-de-France', tel: '06 85 14 12 69' },
  { id: 'r084', nom: 'ZERBIB', prenom: 'Mévorath', region: 'Île-de-France', tel: '01 42 83 28 75', email: 'mevorah207@gmail.com' },
  { id: 'r085', nom: 'ZINI', prenom: 'Shelomo', region: 'Île-de-France', tel: '01 45 61 20 25', email: 'beth.hamidrach@aio-syna.org' },
  { id: 'r086', nom: 'AMAR', prenom: 'Mardoché', region: 'Île-de-France', tel: '07 69 25 35 78' },
  { id: 'r087', nom: 'BENHAMOU', prenom: 'Yshak', region: 'Île-de-France', tel: '06 61 99 01 01' },
  { id: 'r088', nom: 'BENHAROCH', prenom: 'Mendel', region: 'Île-de-France', tel: '06 50 94 79 16', email: 'mendel_benaroch@yahoo.fr' },
  { id: 'r089', nom: 'SHOSHAN', prenom: 'David', region: 'Île-de-France', tel: '06 34 36 05 76', email: 'shoushana7@hotmail.fr' },

  // ── Grand Est ─────────────────────────────────────────────────────────────
  { id: 'r100', nom: 'BENHAMRON', prenom: 'Armand', region: 'Grand Est', ville: 'Strasbourg', tel: '06 60 86 32 09', email: 'armand.benhamron@gmail.com' },
  { id: 'r101', nom: 'BISMUTH', prenom: 'Charles', region: 'Grand Est', ville: 'Strasbourg', email: 'chibismuth@gmail.com' },
  { id: 'r102', nom: 'BRAKA', prenom: 'Abraham', region: 'Grand Est', ville: 'Strasbourg', email: 'abraham.braka@free.fr' },
  { id: 'r103', nom: 'FAVIER', prenom: 'Claude', region: 'Grand Est', ville: 'Colmar' },
  { id: 'r104', nom: 'KLEIN', prenom: 'Samy', region: 'Grand Est', ville: 'Forbach', tel: '03 87 56 17 45' },
  { id: 'r105', nom: 'SULTAN', prenom: 'Mondechai', region: 'Grand Est', ville: 'Strasbourg' },

  // ── Auvergne-Rhône-Alpes ───────────────────────────────────────────────────
  { id: 'r110', nom: 'DAHAN', prenom: 'David', region: 'Auvergne-Rhône-Alpes', ville: 'Lyon' },
  { id: 'r111', nom: 'KAKOU', prenom: 'Ilan', region: 'Auvergne-Rhône-Alpes', ville: 'Lyon' },
  { id: 'r112', nom: 'WERTENSCHLAG', prenom: 'Richard', region: 'Auvergne-Rhône-Alpes', ville: 'Lyon' },

  // ── Bourgogne-Franche-Comté ───────────────────────────────────────────────
  { id: 'r120', nom: 'OUAKNIN', prenom: 'Jacques', region: 'Bourgogne-Franche-Comté', ville: 'Tresserve', tel: '04 91 71 18 38', email: 'jacouak333@012.net.il' },
  { id: 'r121', nom: 'SUISSA', prenom: 'Neftaly', region: 'Bourgogne-Franche-Comté', ville: 'Cran-Gévrier', tel: '04 50 67 69 37' },

  // ── Nouvelle-Aquitaine ────────────────────────────────────────────────────
  { id: 'r130', nom: 'AMBRUEL', prenom: 'David', region: 'Nouvelle-Aquitaine', ville: 'Bordeaux', tel: '05 34 08 69 87' },
  { id: 'r131', nom: 'ELMAN', prenom: 'Isaac', region: 'Nouvelle-Aquitaine', ville: 'Bordeaux' },
  { id: 'r132', nom: 'NACIAS', prenom: 'Nassim', region: 'Occitanie', ville: 'Toulouse', email: 'nacias.raffy@gmail.com' },

  // ── Provence-Alpes-Côte d'Azur ────────────────────────────────────────────
  { id: 'r140', nom: 'AMRAM', prenom: 'Ilan', region: "Provence-Alpes-Côte d'Azur", ville: 'Marseille', tel: '06 35 71 46 58' },
  { id: 'r141', nom: 'BELLOUS', prenom: 'Clément', region: "Provence-Alpes-Côte d'Azur", ville: 'Marseille', email: 'cbellous@consistoire.fr' },
  { id: 'r142', nom: 'MOKALI', prenom: 'David', region: "Provence-Alpes-Côte d'Azur", ville: 'Cannes', email: 'davidmokali@hotmail.fr' },
  { id: 'r143', nom: 'ZEMOUR', prenom: 'Marcel', region: "Provence-Alpes-Côte d'Azur", ville: 'Nice', tel: '04 93 67 55 38', email: 'marcelzemour@hotmail.fr' },
  { id: 'r144', nom: 'ANOUCHY', prenom: 'Eliab', region: "Provence-Alpes-Côte d'Azur", ville: 'Toulon', tel: '06 17 15 58 46' },
];

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
            <ThemedText style={s.emptyTxt}>Aucun résultat pour « {search} »</ThemedText>
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
