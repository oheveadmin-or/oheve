# App Store Connect — Textes prêts à coller (Oheve)

Tout ce qu'il faut copier-coller dans App Store Connect pour la soumission.

---

## ✅ Checklist vérifiée le 13/07/2026

**Prêt (vérifié aujourd'hui) :**
- Icône 1024×1024 sans transparence ✓
- Permissions iOS en français (photos, caméra) dans app.json ✓
- `ITSAppUsesNonExemptEncryption: false` (pas de question chiffrement à chaque build) ✓
- Sign in with Apple activé (obligatoire car Google Sign-In présent) ✓
- Suppression de compte dans l'app (Paramètres > Supprimer mon compte) ✓
- Pages légales EN LIGNE : oheve.pages.dev/privacy, /support, /cgu ✓
- Backend production Railway répond (api/health OK) ✓
- Variables EAS production toutes définies (API, Google iOS+web, Supabase, Stripe) ✓
- `iosUrlScheme` Google = client iOS 328961509377-jh9p… ✓

**⚠️ À FAIRE AVANT DE SOUMETTRE :**
1. **Clé Stripe = clé de TEST** : `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` sur EAS est une `pk_test_…`. En production, personne ne peut payer avec une vraie carte. Pour lancer en réel : passer la clé EAS en `pk_live_…` **ET** vérifier sur Railway que `STRIPE_SECRET_KEY` est `sk_live_…` + webhook Stripe en mode live. (Les deux doivent être du même mode, sinon tout paiement échoue.)
2. **Compte démo Apple : N'EXISTE PAS encore** (vérifié sur l'API prod : EMAIL_NOT_FOUND). Le créer dans l'app avec `oheveadmin+applereview@gmail.com` + mot de passe, et pré-remplir : un mariage, des invités, un site publié.
3. Captures d'écran 6,9" (3 à 10) — voir section 8.
4. Rebuild + submit EAS — voir section 9 (les fixes carte/photos/permissions ne sont PAS dans le build actuel).

---

## 1. Informations sur l'app

**Nom** (30 car. max)
```
Oheve : Wedding Planner
```

**Sous-titre** (30 car. max)
```
Organisez votre mariage
```

**Catégorie principale** : Style de vie (Lifestyle)
**Catégorie secondaire** : Productivité

---

## 2. Description

```
Oheve est l'application tout-en-un pour organiser votre mariage, pensée pour les mariages juifs et adaptée à tous les couples.

PLANIFIEZ SANS STRESS
• To-do list de mariage avec rappels
• Budget détaillé par poste, suivi des paiements
• Compte à rebours jusqu'au grand jour

VOS INVITÉS, ENFIN SIMPLES À GÉRER
• Liste d'invités avec import Excel
• Invitations et RSVP en ligne par événement (houppa, henné, chabbat hatan…)
• Plan de table interactif exportable en PDF

VOTRE SITE DE MARIAGE PERSONNALISÉ
• Créez en quelques minutes un site élégant à partager avec vos invités
• Plus de 30 thèmes premium : Classique, Luxe, Art Déco, Botanique…
• Faire-part numériques, versets hébraïques, musique, galerie photos
• Réponses RSVP collectées automatiquement dans l'application

TROUVEZ VOS PRESTATAIRES
• Annuaire de prestataires de mariage : traiteurs, photographes, DJ, salles…
• Portfolios, avis et messagerie intégrée
• Contactez et comparez directement depuis l'app

ET AUSSI
• Météo du jour J, calendrier partagé, export de vos données
• Connexion avec Apple, Google ou email
• Vos données sont protégées (RGPD) et supprimables à tout moment

Téléchargez Oheve et transformez l'organisation de votre mariage en un moment de plaisir.
```

**Mots-clés** (100 car. max — 98 utilisés)
```
mariage,wedding,planner,juif,invités,rsvp,budget,prestataire,houppa,henné,faire-part,plan de table
```

**URL d'assistance** : `https://oheve.pages.dev/support`
**URL de confidentialité** : `https://oheve.pages.dev/privacy`
**URL marketing** (facultatif) : `https://oheve.pages.dev`
**Copyright** : `© 2026 Oheve`

---

## 3. Nouveautés de cette version (obligatoire)

```
Première version d'Oheve : planification complète de mariage, invités et RSVP, budget, site de mariage personnalisé et annuaire de prestataires.
```

---

## 4. Classification du contenu (questionnaire Apple)

Répondre **Non / Aucun** partout, SAUF :
- « Contenu généré par les utilisateurs » : l'app contient photos + messagerie → si la question est posée, répondre honnêtement Oui (portfolio, chat). Ça ne change pas la note d'âge.
- Résultat attendu : **4+**

---

## 5. Confidentialité de l'app (App Privacy — le pavé rouge « Vérification de l'app »)

À déclarer dans App Store Connect > Confidentialité de l'app :

| Donnée | Collectée ? | Liée à l'identité | Tracking |
|---|---|---|---|
| Nom, adresse email | Oui | Oui | Non |
| Contenu utilisateur (photos, messages) | Oui | Oui | Non |
| Identifiants (ID utilisateur) | Oui | Oui | Non |
| Infos de paiement (via Stripe) | Oui | Oui | Non |
| Données d'utilisation / diagnostic | Non | — | — |

Finalité pour tout : « Fonctionnalités de l'app ». **Aucun tracking publicitaire** → répondre Non à « cette app suit-elle les utilisateurs ».

---

## 6. Informations pour la révision (App Review Information)

**Contact** : Prénom Nom, téléphone, email — mettre tes vraies coordonnées.

**Compte de démonstration** (à créer AVANT la soumission, voir checklist) :
```
Email : oheveadmin+applereview@gmail.com
Mot de passe : (à définir, ex. OheveDemo2026!)
```

**Notes pour le réviseur** :
```
Oheve is a wedding planning app (French market). 

Demo account (role: couple planning a wedding) is pre-filled with a sample
wedding, guest list and a published wedding website.

Sign in with Apple and Google are both supported, plus email/password.
Account deletion is available in Settings > "Supprimer mon compte".

The subscription for wedding vendors ("prestataires") is a business tool
for real-world service providers (caterers, photographers) to be listed
in the directory; it is not required to use the app as a couple.
```

---

## 7. ⚠️ Risque principal de rejet : paiements Stripe in-app

L'app encaisse via **Stripe** dans l'app (premium site mariage + abonnement prestataire). La règle Apple 3.1.1 impose l'achat intégré (IAP) Apple pour les **contenus/fonctions numériques**.

- **Abonnement prestataire (39€/mois)** : défendable hors IAP — c'est un outil pro pour des services rendus dans le monde réel (guideline 3.1.3(e) / apps type Thumbtack). La note au réviseur ci-dessus couvre ça.
- **Premium couple (publication du site)** : c'est une fonction numérique → risque réel de rejet. Si Apple rejette pour ce motif : soit basculer ce paiement en IAP Apple, soit déplacer l'achat sur le web (le compte devient premium partout). Ne rien changer avant la première réponse d'Apple — beaucoup d'apps passent.

---

## 8. Captures d'écran (à faire — 3 à 10, écran 6,9" et/ou 6,5")

Simulateur Xcode : iPhone 16 Pro Max (ou 15 Pro Max pour 6,5"), `Cmd+S` pour capturer.
Build simulateur : `cd MonApp && eas build --platform ios --profile simulator`

Écrans conseillés (dans cet ordre) :
1. Accueil couple (compte à rebours + to-do)
2. Site de mariage / aperçu iPhone d'un thème premium
3. Invités + RSVP
4. Plan de table
5. Budget
6. Annuaire prestataires
7. Faire-part / galerie

---

## 9. Rappel build

Les changements de `app.json` (textes de permission photos/caméra FR) + les fixes carte Stripe/photos de la session précédente nécessitent un **nouveau build EAS** :
```
cd MonApp
eas build --platform ios --profile production
eas submit --platform ios
```
Puis sélectionner CE nouveau build en bas de la page de la version dans App Store Connect.

---

## 10. Distribution privée (option « lancement discret »)

Pour un lancement privé : App Store Connect > Tarifs et disponibilité > **Distribution non répertoriée** (Unlisted App Distribution). L'app passe la révision normale mais n'apparaît pas dans les recherches — seul le lien direct permet de l'installer. La demande se fait via un formulaire Apple après (ou pendant) la soumission : https://developer.apple.com/apple-store/unlisted-app-distribution/
