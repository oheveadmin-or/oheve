# Achats intégrés Android — Google Play Console

Sur Android, Google Play impose sa facturation (Play Billing) pour les biens
numériques vendus dans l'app. Les deux achats d'Oheve passent donc par Google
Play, comme ils passent par l'App Store sur iPhone :

| Achat | Type Google Play | ID produit (à recopier À L'IDENTIQUE) | Prix |
|---|---|---|---|
| Oheve Premium (couple) | Produit intégré (achat unique) | `com.oheve.wedding.couple.premium` | 50 € |
| Abonnement prestataire | Abonnement | `com.oheve.wedding.presta.sub` | 39,99 € / mois |

Les ID doivent être exactement ceux-là : ce sont ceux de l'app
(`MonApp/constants/config.ts`) et du serveur (`backend/src/iap`).

---

## 1. Prérequis

1. **Profil de paiement** : Play Console → *Configuration → Profil de paiement*.
   Sans lui, on ne peut pas créer de produits payants.
2. **Une version de l'app avec la facturation envoyée sur Play Console**.
   Google n'autorise la création des produits qu'après l'envoi d'un build qui
   contient la librairie Billing (c'est le cas des nouveaux builds : `expo-iap`).
   ```bash
   cd MonApp
   npx eas-cli build -p android --profile production
   ```
   Puis envoyer le `.aab` dans *Tests → Tests internes → Créer une version*.

## 2. Créer le Premium (achat unique)

*Monétiser → Produits → Produits intégrés → Créer un produit*

- **ID produit** : `com.oheve.wedding.couple.premium`
- **Nom** : Oheve Premium
- **Description** : Accès complet : site de mariage, faire-part, RSVP, plan de table…
- **Prix par défaut** : 50,00 € (Google convertit pour les autres pays)
- Enregistrer, puis **Activer**.

## 3. Créer l'abonnement prestataire

*Monétiser → Produits → Abonnements → Créer un abonnement*

- **ID produit** : `com.oheve.wedding.presta.sub`
- **Nom** : Oheve Prestataire

Dans l'abonnement :

1. **Ajouter un forfait de base** :
   - ID : `mensuel`
   - Type : *Renouvellement automatique*, période de facturation **1 mois**
   - Prix : **39,99 €**
   - **Activer** le forfait.
2. **Ajouter une offre** (les mois offerts) sur ce forfait :
   - ID : `essai-offert`
   - Éligibilité : *Nouvel acquéreur*
   - Phase : **Essai sans frais**, durée **6 mois** (passer à 3 mois quand les
     200 places de l'offre de lancement sont prises)
   - **Activer** l'offre.

L'app choisit automatiquement l'offre « essai sans frais » si le client y a
droit, sinon le forfait de base à 39,99 €.

## 4. Compte de service (pour que le serveur vérifie les achats)

Le serveur vérifie chaque achat auprès de Google avant de débloquer le premium
ou l'abonnement (sinon n'importe qui pourrait se l'activer).

1. Google Cloud Console (https://console.cloud.google.com), dans le projet lié
   à Play Console :
   - *API et services → Bibliothèque* → activer **Google Play Android Developer API**.
   - *IAM → Comptes de service → Créer* (ex. `oheve-play-billing`), sans rôle.
   - Ouvrir le compte → *Clés → Ajouter une clé → JSON* → un fichier `.json` se télécharge.
2. Play Console → *Utilisateurs et autorisations → Inviter un utilisateur* :
   - e-mail : celui du compte de service (`…@….iam.gserviceaccount.com`)
   - autorisations (sur l'app Oheve) : **Afficher les données financières**
     et **Gérer les commandes et les abonnements**.
3. Railway → service backend → *Variables* :
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` = tout le contenu du fichier `.json`
     (copier-coller tel quel, ou encodé en base64)
   - `GOOGLE_PLAY_PACKAGE_NAME` = `com.oheve.wedding` (valeur par défaut, facultatif)

⚠️ Les autorisations d'un nouveau compte de service peuvent mettre jusqu'à
24 h à être actives côté Google : si la vérification échoue juste après, attendre.

## 5. Tester sans payer

1. Play Console → *Configuration → Tests de licence* : ajouter les adresses
   Gmail des testeurs → réponse « RESPOND_NORMALLY ».
2. *Tests → Tests internes* : ajouter ces mêmes testeurs, leur envoyer le lien
   d'invitation, installer l'app **depuis le Play Store** (obligatoire : un APK
   installé à la main ou via BrowserStack ne peut pas acheter).
3. Dans l'app : Premium → Payer → Google affiche « Carte de test, toujours
   approuvée ». Rien n'est débité.
   Les abonnements de test se renouvellent toutes les 5 minutes (au lieu d'1 mois).

## 6. Ce qu'il faut savoir

- **Remboursement automatique à 3 jours** : Google rembourse tout achat non
  « confirmé » (acknowledge). Le serveur le confirme dès qu'il a débloqué l'accès.
- **Résiliation** : l'abonnement se gère dans Google Play → *Paiements et
  abonnements → Abonnements* (l'app l'indique au client).
- **Commission Google** : 15 % (abonnements, et jusqu'à 1 M$ de CA annuel
  après inscription au programme « 15 % » dans *Configuration → Programme
  de frais de service*), 30 % sinon.
- Les anciens builds Android (sans `expo-iap`) gardent le paiement Stripe ;
  les nouveaux passent tous par Google Play.
