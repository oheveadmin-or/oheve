# Google Play Console — Textes prêts à coller (Oheve)

Adapté depuis [APP_STORE.md](APP_STORE.md) (Apple) pour Google Play. Copie-colle directement.

---

## 1. Fiche du store (Store listing)

**Nom de l'application** (30 car. max)
```
Oheve : Wedding Planner
```

**Description courte** (80 car. max — champ spécifique à Play, n'existe pas sur Apple)
```
Organisez votre mariage : invités, budget, site personnalisé, prestataires
```
(73 caractères)

**Description complète** (4000 car. max)
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
• Connexion avec Google ou email
• Vos données sont protégées (RGPD) et supprimables à tout moment

Téléchargez Oheve et transformez l'organisation de votre mariage en un moment de plaisir.
```

**Catégorie de l'application** : Style de vie (Lifestyle)
**Tags** (5 max, choisis dans la liste proposée par Play) : Mariage / Planification / Organisation / Productivité / Style de vie

**Coordonnées**
- Email : ton email de contact (celui que tu veux afficher publiquement)
- Site web : `https://oheve.pages.dev`
- Téléphone : facultatif, laisse vide si tu ne veux pas l'afficher

**Politique de confidentialité** (obligatoire)
```
https://oheve.pages.dev/privacy
```

---

## 2. Graphismes requis

| Élément | Format | Statut |
|---|---|---|
| Icône | 512×512 PNG, sans transparence | à exporter depuis `assets/images/icon.png` (vérifier qu'il est bien en 512×512 sans alpha) |
| Feature graphic (bannière) | 1024×500 PNG/JPG | **à créer** — dis-moi si tu veux que je t'en génère une |
| Captures d'écran téléphone | min 2, max 8, ratio ≤ 2:1 | ✅ déjà générées cette session (`android_screenshots/*_android.png`) |

---

## 3. Classification du contenu (questionnaire IARC)

Play Console pose une série de questions par catégorie (violence, contenu sexuel, drogue, jeu d'argent, contenu généré par les utilisateurs…).

Réponds **Non** à tout, SAUF :
- **« Communication entre utilisateurs / partage de contenu »** → **Oui** (messagerie avec les prestataires, portfolios photo)
- **« Achats numériques »** → **Oui** (abonnement prestataire, premium couple)

Résultat attendu : classification **PEGI 3 / Tout public** (l'app n'a aucun contenu sensible).

---

## 4. Sécurité des données (Data safety form)

C'est le formulaire le plus long — voici les réponses exactes basées sur le code actuel de l'app.

**Collecte et partage de données ?** → Oui

| Catégorie | Type de donnée | Collectée | Partagée | Finalité |
|---|---|---|---|---|
| Infos personnelles | Nom | Oui | Non | Fonctionnalité de l'app |
| Infos personnelles | Adresse e-mail | Oui | Non | Fonctionnalité de l'app, authentification |
| Infos financières | Infos de paiement | Oui | Oui (Stripe, processeur de paiement) | Traitement des paiements |
| Photos et vidéos | Photos | Oui | Non | Fonctionnalité de l'app (portfolio, site de mariage) |
| Messages | Messages dans l'app | Oui | Non | Fonctionnalité de l'app (messagerie prestataires) |
| Identifiants | ID utilisateur | Oui | Non | Fonctionnalité de l'app |
| Identifiants de l'appareil | Jeton de notification push | Oui | Non | Fonctionnalité de l'app (notifications) |

**Toutes les données sont-elles chiffrées en transit ?** → Oui (HTTPS partout)

**Les utilisateurs peuvent-ils demander la suppression de leurs données ?** → Oui (bouton "Supprimer mon compte" dans Paramètres, + email de contact)

**Cette app suit-elle les utilisateurs à des fins publicitaires (tracking) ?** → Non (aucun SDK publicitaire, aucun tracker tiers)

---

## 5. Public cible et contenu

- **Tranche d'âge cible** : 18 ans et plus (pas d'app pour enfants)
- **App destinée principalement aux enfants ?** → Non
- **Contient de la publicité ?** → Non
- **Achats intégrés ?** → Oui (mentionner "Achats via l'application" — même si c'est Stripe et non Play Billing, Google demande de le déclarer dès qu'il y a un paiement, même web/Stripe)

---

## 6. Accès à l'application (App access)

Comme pour Apple, Google peut demander un compte de test pour vérifier l'app pendant la review.

**Compte de démonstration** (réutilise celui d'Apple si déjà créé, sinon à créer) :
```
Email : oheveadmin+applereview@gmail.com
Mot de passe : (celui défini pour Apple)
```

Si tu n'as pas encore créé ce compte, dis-le-moi, on peut préparer un compte pré-rempli (mariage, invités, site publié) comme pour Apple.

---

## 7. Nouveautés de cette version

```
Première version d'Oheve sur Android : planification complète de mariage, invités et RSVP, budget, site de mariage personnalisé et annuaire de prestataires.
```

---

## 8. ⚠️ Point de vigilance : paiements Stripe hors Play Billing

Comme pour Apple (règle 3.1.1), Google impose en général **Google Play Billing** pour les achats de contenu numérique (règle "Paiements" de la Play Policy). Le premium couple et l'abonnement prestataire passent aujourd'hui par Stripe, pas par Play Billing.

- Beaucoup d'apps passent quand même en test interne (Google ne bloque pas la review automatiquement comme Apple).
- Si Google rejette pour ce motif au moment de demander l'accès en production (pas en test interne), il faudra migrer vers Play Billing — c'est un chantier séparé, pas la peine de l'anticiper maintenant.
- Pour le **test interne**, ce n'est généralement pas un blocage : lance-le, on ajustera si Google le signale.

---

## 9. Ordre des captures d'écran (déjà générées)

1. Accueil (compte à rebours + météo)
2. To-do list (liste détaillée par catégorie)
3. Budget (répartition par poste)

D'autres captures possibles si tu veux enrichir la fiche : Invités, Site Mariage, Annuaire prestataires, Plan de table.
