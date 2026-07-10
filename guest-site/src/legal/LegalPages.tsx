import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

const SAGE = '#A7AD9A';
const MOKA = '#3d2e1f';
const MOKA_MID = '#6b5344';
const GOLD = '#b8965a';
const IVORY = '#faf8f3';
const IVORY_CARD = '#f5f0e8';

const CONTACT_EMAIL = 'oheveadmin@gmail.com';

function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div style={{ background: IVORY, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <nav style={navStyle}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.1rem', fontWeight: 600, color: MOKA, letterSpacing: '0.06em' }}>
            OHEVE <span style={{ color: SAGE }}>WEDDING</span>
          </span>
        </Link>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" style={{ marginBottom: '0.8rem' }}>
            <polygon points="18,2 21,12 31,12 23,19 26,29 18,23 10,29 13,19 5,12 15,12" fill={GOLD} opacity="0.6" />
          </svg>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '2.3rem', fontWeight: 300, color: MOKA, lineHeight: 1.2, marginBottom: '0.5rem' }}>
            {title}
          </h1>
          <p style={{ fontSize: '0.82rem', color: MOKA_MID, opacity: 0.6 }}>Dernière mise à jour : {updated}</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(91,70,54,0.08)', boxShadow: '0 2px 16px rgba(61,46,31,0.05)', padding: '2.2rem 2rem' }}>
          {children}
        </div>

        <div style={{ display: 'flex', gap: '1.4rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
          <Link to="/privacy" style={footLink}>Confidentialité</Link>
          <Link to="/cgu" style={footLink}>Conditions d'utilisation</Link>
          <Link to="/support" style={footLink}>Support</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: '1.8rem' }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.25rem', fontWeight: 600, color: MOKA, marginBottom: '0.5rem' }}>{title}</h2>
      <div style={{ fontSize: '0.92rem', color: MOKA_MID, lineHeight: 1.75, whiteSpace: 'pre-line' }}>{children}</div>
    </section>
  );
}

/* ─── POLITIQUE DE CONFIDENTIALITÉ ─────────────────────────────── */

export function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated="juillet 2026">
      <Section title="1. Responsable du traitement">
        {`Oheve, éditeur de l'application Oheve Wedding Planner et du site oheve.pages.dev, est le responsable du traitement de vos données personnelles au sens du RGPD (Règlement Général sur la Protection des Données).

Contact : ${CONTACT_EMAIL}`}
      </Section>

      <Section title="2. Données collectées">
        {`Nous collectons les données suivantes :

• Identité : prénom, nom, adresse email
• Données de mariage : date, lieu, noms des mariés, budget
• Invités : liste nominative, réponses RSVP
• Prestataires : contacts et échanges de messages
• Photos : celles que vous choisissez d'ajouter à votre profil, votre portfolio ou votre site mariage
• Données techniques : tokens d'authentification, logs de connexion
• Données de paiement : traitées directement par Stripe (nous ne stockons aucun numéro de carte)`}
      </Section>

      <Section title="3. Finalités du traitement">
        {`Vos données sont traitées pour :

• Créer et gérer votre compte
• Fournir les fonctionnalités de planification de mariage
• Publier le site mariage que vous créez et collecter les réponses RSVP de vos invités
• Envoyer des notifications et rappels
• Améliorer nos services
• Respecter nos obligations légales`}
      </Section>

      <Section title="4. Base légale">
        {`Le traitement est fondé sur :

• L'exécution du contrat (services de l'application)
• Votre consentement (notifications, emails)
• Notre intérêt légitime (sécurité, amélioration des services)`}
      </Section>

      <Section title="5. Conservation des données">
        {`Vos données sont conservées pendant toute la durée d'utilisation de votre compte, puis supprimées dans un délai de 3 ans après votre dernière connexion, sauf obligation légale contraire.

La suppression de votre compte (Paramètres > Supprimer mon compte) entraîne l'effacement immédiat et irréversible de vos données.`}
      </Section>

      <Section title="6. Partage des données">
        {`Vos données ne sont jamais vendues. Elles peuvent être partagées avec :

• Stripe (paiements) — politique disponible sur stripe.com
• Railway (hébergement) — politique disponible sur railway.app
• Cloudflare (hébergement du site mariage) — politique disponible sur cloudflare.com
• Resend (envoi d'emails transactionnels) — politique disponible sur resend.com
• Les prestataires que vous contactez via l'application`}
      </Section>

      <Section title="7. Vos droits (RGPD)">
        {`Conformément au RGPD, vous disposez des droits suivants :

• Droit d'accès : obtenir une copie de vos données (Paramètres > Exporter mes données)
• Droit de rectification : corriger vos données (Paramètres > Informations personnelles)
• Droit à l'effacement : supprimer votre compte (Paramètres > Supprimer mon compte)
• Droit à la portabilité : télécharger vos données en JSON
• Droit d'opposition et de limitation : nous contacter

Pour exercer vos droits : ${CONTACT_EMAIL}

Vous pouvez également déposer une réclamation auprès de la CNIL (cnil.fr).`}
      </Section>

      <Section title="8. Sécurité">
        {`Nous mettons en œuvre des mesures techniques adaptées : chiffrement des mots de passe (bcrypt), tokens JWT sécurisés, connexions HTTPS, protection contre les attaques par force brute.`}
      </Section>

      <Section title="9. Cookies">
        {`L'application mobile n'utilise pas de cookies. Le site invités (mini-site mariage) charge des polices Google Fonts — en cliquant sur « Accepter » sur la bannière cookies, vous consentez à ce transfert vers les serveurs de Google.`}
      </Section>
    </LegalLayout>
  );
}

/* ─── CONDITIONS D'UTILISATION ─────────────────────────────────── */

export function CguPage() {
  return (
    <LegalLayout title="Conditions d'utilisation" updated="juillet 2026">
      <Section title="1. Objet">
        {`Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation de l'application Oheve Wedding Planner et du site oheve.pages.dev, édités par Oheve.

En créant un compte, vous acceptez sans réserve ces CGU.`}
      </Section>

      <Section title="2. Description du service">
        {`Oheve est une application de planification de mariage permettant de :

• Organiser invités, RSVP et plans de table
• Gérer le budget du mariage
• Contacter des prestataires
• Créer un mini-site mariage personnalisé
• Générer des faire-part et documents`}
      </Section>

      <Section title="3. Compte utilisateur">
        {`Vous devez fournir une adresse email valide et un mot de passe sécurisé (minimum 8 caractères). Vous êtes responsable de la confidentialité de vos identifiants.

Un seul compte par personne est autorisé. Toute utilisation frauduleuse entraîne la suppression du compte.`}
      </Section>

      <Section title="4. Abonnement et paiements">
        {`Certaines fonctionnalités nécessitent un abonnement payant ou un achat unique. Les prix sont affichés en euros TTC.

Les paiements sont traités par Stripe, Inc. Oheve ne stocke aucune donnée bancaire.

Sauf mention contraire, les abonnements sont sans engagement et résiliables à tout moment depuis les Paramètres.`}
      </Section>

      <Section title="5. Propriété intellectuelle">
        {`L'ensemble des contenus de l'application (design, code, templates, textes) est la propriété exclusive d'Oheve et est protégé par le droit français de la propriété intellectuelle.

Les données que vous créez (invités, budget, site mariage) vous appartiennent. Vous nous accordez une licence limitée pour les afficher et les traiter dans le cadre du service.`}
      </Section>

      <Section title="6. Responsabilité">
        {`Oheve s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité et la sécurité du service.

Oheve ne peut être tenu responsable des pertes de données dues à des cas de force majeure, ni des erreurs provenant d'informations incorrectes saisies par l'utilisateur.`}
      </Section>

      <Section title="7. Résiliation">
        {`Vous pouvez supprimer votre compte à tout moment depuis Paramètres > Supprimer mon compte. La suppression est immédiate et irréversible.

Oheve se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.`}
      </Section>

      <Section title="8. Droit applicable">
        {`Ces CGU sont soumises au droit français. Tout litige relève de la compétence des tribunaux français.`}
      </Section>
    </LegalLayout>
  );
}

/* ─── SUPPORT ──────────────────────────────────────────────────── */

export function SupportPage() {
  return (
    <LegalLayout title="Support & Assistance" updated="juillet 2026">
      <Section title="Nous contacter">
        {`Une question, un problème avec l'application Oheve Wedding Planner ou votre site mariage ? Écrivez-nous, nous répondons généralement sous 24 à 48 heures :`}
      </Section>

      <div style={{ textAlign: 'center', margin: '0 0 1.8rem' }}>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Support%20Oheve`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.85rem 2.1rem', background: SAGE, color: '#fff',
            borderRadius: 50, fontSize: '0.97rem', fontWeight: 600, textDecoration: 'none',
            boxShadow: '0 4px 18px rgba(122,153,117,0.32)',
          }}
        >
          ✉️ {CONTACT_EMAIL}
        </a>
      </div>

      <Section title="Questions fréquentes">
        {`• Comment supprimer mon compte ? — Dans l'application : Paramètres > Supprimer mon compte. La suppression est immédiate et irréversible.

• Comment gérer ou résilier mon abonnement ? — Dans l'application : Paramètres > Abonnement. La résiliation prend effet à la fin de la période en cours.

• Mes invités ne reçoivent pas le lien RSVP ? — Vérifiez que le lien partagé correspond bien à votre site publié, et que le site est en ligne depuis l'écran « Mon site mariage ».

• Comment modifier mon site mariage ? — Depuis l'application, ouvrez « Mon site mariage » puis « Modifier » : vos changements sont publiés instantanément.

• Un paiement a échoué ou a été débité deux fois ? — Contactez-nous par email avec la date et le montant : les paiements sont traités par Stripe et nous pouvons vérifier immédiatement.`}
      </Section>

      <Section title="Signaler un problème technique">
        {`Pour nous aider à résoudre votre problème rapidement, précisez dans votre email :

• Le modèle de votre téléphone et sa version iOS/Android
• L'écran concerné et l'action effectuée
• Une capture d'écran si possible`}
      </Section>

      <div style={{ borderTop: '1px solid rgba(91,70,54,0.08)', paddingTop: '1.2rem', textAlign: 'center', fontSize: '0.8rem', color: MOKA_MID, opacity: 0.6, background: IVORY_CARD, borderRadius: 12, padding: '1rem' }}>
        Oheve Wedding Planner — {CONTACT_EMAIL}
      </div>
    </LegalLayout>
  );
}

/* ─── STYLES ───────────────────────────────────────────────────── */

const navStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.9rem 2rem',
  background: 'rgba(250,248,243,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(91,70,54,0.07)',
};

const footLink: CSSProperties = {
  fontSize: '0.8rem',
  color: MOKA_MID,
  opacity: 0.7,
  textDecoration: 'none',
};
