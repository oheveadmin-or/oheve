import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { C } from '@/constants/OheveTheme';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.heading}>{title}</ThemedText>
      <ThemedText style={styles.body}>{children}</ThemedText>
    </View>
  );
}

export default function CguScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.title}>Conditions d'utilisation</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.date}>Dernière mise à jour : juin 2026</ThemedText>

        <Section title="1. Objet">
          {"Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application Oheve Wedding Planner, éditée par Oheve.\n\nEn créant un compte, vous acceptez sans réserve ces CGU."}
        </Section>

        <Section title="2. Description du service">
          {"Oheve est une application de planification de mariage permettant de :\n\n• Organiser invités, RSVP et plans de table\n• Gérer le budget du mariage\n• Contacter des prestataires\n• Créer un mini-site mariage personnalisé\n• Générer des faire-part et documents"}
        </Section>

        <Section title="3. Compte utilisateur">
          {"Vous devez fournir une adresse email valide et un mot de passe sécurisé (minimum 8 caractères). Vous êtes responsable de la confidentialité de vos identifiants.\n\nUn seul compte par personne est autorisé. Toute utilisation frauduleuse entraîne la suppression du compte."}
        </Section>

        <Section title="4. Abonnement et paiements">
          {"Certaines fonctionnalités nécessitent un abonnement payant ou un achat unique. Les prix sont affichés en euros TTC.\n\nLes paiements sont traités par Stripe, Inc. Oheve ne stocke aucune donnée bancaire.\n\nSauf mention contraire, les abonnements sont sans engagement et résiliables à tout moment depuis les Paramètres."}
        </Section>

        <Section title="5. Propriété intellectuelle">
          {"L'ensemble des contenus de l'application (design, code, templates, textes) est la propriété exclusive d'Oheve et est protégé par le droit français de la propriété intellectuelle.\n\nLes données que vous créez (invités, budget, site mariage) vous appartiennent. Vous nous accordez une licence limitée pour les afficher et les traiter dans le cadre du service."}
        </Section>

        <Section title="6. Responsabilité">
          {"Oheve s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité et la sécurité du service.\n\nOheve ne peut être tenu responsable des pertes de données dues à des cas de force majeure, ni des erreurs provenant d'informations incorrectes saisies par l'utilisateur."}
        </Section>

        <Section title="7. Résiliation">
          {"Vous pouvez supprimer votre compte à tout moment depuis Paramètres > Supprimer mon compte. La suppression est immédiate et irréversible.\n\nOheve se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU."}
        </Section>

        <Section title="8. Droit applicable">
          {"Ces CGU sont soumises au droit français. Tout litige relève de la compétence des tribunaux français."}
        </Section>

        <Section title="9. Contact">
          {"Pour toute question : oheveadmin@gmail.com"}
        </Section>
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
  date: { fontSize: 13, color: C.textLight, marginBottom: 20 },
  section: { marginBottom: 24 },
  heading: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 8 },
  body: { fontSize: 14, color: C.textMid, lineHeight: 22 },
});
