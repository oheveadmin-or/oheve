import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

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

export default function PrivacyPolicyScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.title}>Politique de confidentialité</ThemedText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ThemedText style={styles.date}>Dernière mise à jour : juin 2026</ThemedText>

        <Section title="1. Responsable du traitement">
          {"La société Oheve, responsable de l'application Oheve Wedding Planner, est le responsable du traitement de vos données personnelles au sens du RGPD (Règlement Général sur la Protection des Données).\n\nContact : oheveadmin@gmail.com"}
        </Section>

        <Section title="2. Données collectées">
          {"Nous collectons les données suivantes :\n\n• Identité : prénom, nom, adresse email\n• Données de mariage : date, lieu, noms des mariés, budget\n• Invités : liste nominative, réponses RSVP\n• Prestataires : contacts et échanges de messages\n• Données techniques : tokens d'authentification, logs de connexion\n• Données de paiement : traitées directement par Stripe (nous ne stockons pas de numéros de carte)"}
        </Section>

        <Section title="3. Finalités du traitement">
          {"Vos données sont traitées pour :\n\n• Créer et gérer votre compte\n• Fournir les fonctionnalités de planification de mariage\n• Envoyer des notifications et rappels\n• Améliorer nos services\n• Respecter nos obligations légales"}
        </Section>

        <Section title="4. Base légale">
          {"Le traitement est fondé sur :\n\n• L'exécution du contrat (services de l'application)\n• Votre consentement (notifications, emails marketing)\n• Notre intérêt légitime (sécurité, amélioration des services)"}
        </Section>

        <Section title="5. Conservation des données">
          {"Vos données sont conservées pendant toute la durée d'utilisation de votre compte, puis supprimées dans un délai de 3 ans après votre dernière connexion, sauf obligation légale contraire."}
        </Section>

        <Section title="6. Partage des données">
          {"Vos données ne sont jamais vendues. Elles peuvent être partagées avec :\n\n• Stripe (paiements) — politique Stripe disponible sur stripe.com\n• Railway (hébergement) — politique disponible sur railway.app\n• Les prestataires que vous contactez via l'application"}
        </Section>

        <Section title="7. Vos droits (RGPD)">
          {"Conformément au RGPD, vous disposez des droits suivants :\n\n• Droit d'accès : obtenir une copie de vos données (Paramètres > Exporter mes données)\n• Droit de rectification : corriger vos données (Paramètres > Informations personnelles)\n• Droit à l'effacement : supprimer votre compte (Paramètres > Supprimer mon compte)\n• Droit à la portabilité : télécharger vos données en JSON\n• Droit d'opposition et de limitation : nous contacter\n\nPour exercer vos droits : oheveadmin@gmail.com\n\nVous pouvez également déposer une réclamation auprès de la CNIL (cnil.fr)."}
        </Section>

        <Section title="8. Sécurité">
          {"Nous mettons en œuvre des mesures techniques adaptées : chiffrement des mots de passe (bcrypt), tokens JWT sécurisés, connexions HTTPS, rate limiting contre les attaques par force brute."}
        </Section>

        <Section title="9. Cookies">
          {"L'application mobile n'utilise pas de cookies. Le site invités (mini-site mariage) charge des polices Google Fonts — en cliquant sur 'Accepter' sur la bannière cookies, vous consentez à ce transfert vers les serveurs de Google."}
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
