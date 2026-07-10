import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { C } from '@/constants/OheveTheme';

function Block({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.block}>
      <ThemedText style={styles.heading}>{title}</ThemedText>
      <ThemedText style={styles.body}>{children}</ThemedText>
    </View>
  );
}

export default function MentionsLegalesScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.title}>Mentions légales</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Block title="Éditeur de l'application">
          {"Oheve Wedding Planner\nContact : oheveadmin@gmail.com\n\nDirecteur de la publication : Odaya Attia"}
        </Block>

        <Block title="Hébergement">
          {"Backend API :\nRailway, Inc.\n340 S Lemon Ave #4133\nWalnut, CA 91789 — États-Unis\nrailway.app\n\nBase de données :\nSupabase, Inc.\nsupabase.com"}
        </Block>

        <Block title="Paiements">
          {"Les transactions financières sont gérées par :\nStripe, Inc.\n510 Townsend Street\nSan Francisco, CA 94103 — États-Unis\nstripe.com\n\nOheve n'a accès à aucune donnée bancaire."}
        </Block>

        <Block title="Propriété intellectuelle">
          {"L'ensemble des contenus de l'application Oheve (textes, graphismes, design, code source) est protégé par le droit d'auteur français et les conventions internationales.\n\nToute reproduction, même partielle, est interdite sans autorisation préalable."}
        </Block>

        <Block title="Données personnelles">
          {"Conformément à la loi Informatique et Libertés du 6 janvier 1978 modifiée et au RGPD, vous disposez d'un droit d'accès, de rectification, de portabilité et d'effacement de vos données.\n\nPour exercer ces droits : oheveadmin@gmail.com\n\nDéclaration CNIL : en cours d'enregistrement."}
        </Block>

        <Block title="Médiation">
          {"En cas de litige, vous pouvez recourir à la médiation de la consommation conformément à l'ordonnance n°2015-1033 du 20 août 2015."}
        </Block>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { marginRight: 8, padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: C.textDark, flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  block: { marginBottom: 28 },
  heading: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 8 },
  body: { fontSize: 14, color: C.textMid, lineHeight: 22 },
});
