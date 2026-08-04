import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { C } from '@/constants/OheveTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.heading}>{title}</ThemedText>
      <ThemedText style={styles.body}>{children}</ThemedText>
    </View>
  );
}

export default function CguScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.title}>Conditions d'utilisation</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.date}>Dernière mise à jour : août 2026</ThemedText>

        <Section title="1. Objet">
          {"Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application Oheve Wedding Planner, éditée par Oheve.\n\nElles constituent le contrat de licence utilisateur final (EULA) de l'application. En créant un compte ou en effectuant un achat, vous les acceptez sans réserve."}
        </Section>

        <Section title="2. Description du service">
          {"Oheve est une application de planification de mariage permettant de :\n\n• Organiser invités, RSVP et plans de table\n• Gérer le budget du mariage\n• Contacter des prestataires\n• Créer un mini-site mariage personnalisé\n• Générer des faire-part et documents"}
        </Section>

        <Section title="3. Compte utilisateur">
          {"Vous devez fournir une adresse email valide et un mot de passe sécurisé (minimum 8 caractères). Vous êtes responsable de la confidentialité de vos identifiants.\n\nUn seul compte par personne est autorisé. Toute utilisation frauduleuse entraîne la suppression du compte."}
        </Section>

        <Section title="4. Offres payantes, prix et durée">
          {"Oheve propose deux offres payantes, toutes deux en euros TTC :\n\n• Oheve Premium (futurs mariés) — achat unique de 50 €. Accès illimité dans le temps, sans abonnement ni renouvellement.\n\n• Oheve Prestataire — abonnement mensuel de 39,99 € par mois, d'une durée d'un (1) mois renouvelable, avec les 3 premiers mois offerts."}
        </Section>

        <Section title="5. Renouvellement automatique et résiliation">
          {"Sur iPhone et iPad, les achats sont réalisés via l'App Store : le paiement est débité sur votre compte Apple à la confirmation de l'achat.\n\nL'abonnement mensuel se renouvelle automatiquement pour la même durée et au même tarif, sauf résiliation au moins 24 heures avant la fin de la période en cours. Le renouvellement est prélevé dans les 24 heures qui précèdent la fin de la période en cours.\n\nVous pouvez gérer ou résilier votre abonnement à tout moment dans Réglages → votre nom → Abonnements. Supprimer l'application ne résilie pas l'abonnement.\n\nToute partie non utilisée d'une période d'essai gratuite est perdue en cas de souscription à un abonnement payant.\n\nSur Android et sur le web, les paiements sont traités par Stripe, Inc. et l'abonnement se résilie depuis « Mon abonnement ». Oheve ne stocke aucune donnée bancaire.\n\nLes demandes de remboursement des achats effectués via l'App Store relèvent d'Apple : reportaproblem.apple.com"}
        </Section>

        <Section title="6. Propriété intellectuelle">
          {"L'ensemble des contenus de l'application (design, code, templates, textes) est la propriété exclusive d'Oheve et est protégé par le droit français de la propriété intellectuelle.\n\nLes données que vous créez (invités, budget, site mariage) vous appartiennent. Vous nous accordez une licence limitée pour les afficher et les traiter dans le cadre du service."}
        </Section>

        <Section title="7. Responsabilité">
          {"Oheve s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité et la sécurité du service.\n\nOheve ne peut être tenu responsable des pertes de données dues à des cas de force majeure, ni des erreurs provenant d'informations incorrectes saisies par l'utilisateur."}
        </Section>

        <Section title="8. Résiliation du compte">
          {"Vous pouvez supprimer votre compte à tout moment depuis Paramètres > Supprimer mon compte. La suppression est immédiate et irréversible.\n\nOheve se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU."}
        </Section>

        <Section title="9. Droit applicable">
          {"Ces CGU sont soumises au droit français. Tout litige relève de la compétence des tribunaux français."}
        </Section>

        <Section title="10. Contact">
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
