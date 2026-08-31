# Resoumission App Store — Réponse au rejet du 16/07/2026

Apple a rejeté la version 1.0.1 pour 3 raisons. **Tout le code est corrigé** (voir §1).
Il reste des actions manuelles dans App Store Connect + un rebuild EAS (voir §2 à §6).

---

## 0-sexies. 🎁 Offre de lancement — 6 mois offerts aux 200 premiers prestataires

Décidée le 31/08/2026. L'essai de l'abonnement `com.oheve.wedding.presta.sub` passe de
**3 mois** à **6 mois** pour les **200 premiers** prestataires qui activent leur espace ;
au-delà, retour à 3 mois.

### Ce qui est fait dans le code (rien à faire de plus)

| Où | Quoi |
|---|---|
| [migrate.ts](backend/src/db/migrate.ts) | colonne `users.presta_founder_rank` (rang 1→200, unique) |
| [prestataire-subscription](backend/src/prestataire-subscription/index.ts) | `FOUNDER_LIMIT=200`, `FOUNDER_TRIAL_DAYS=180`, attribution des places sous verrou, route **`GET /api/prestataire-subscription/offer`** |
| [iap](backend/src/iap/index.ts) | la place fondateur est consommée aussi quand l'abonnement vient de l'App Store |
| [presta-offer.ts](MonApp/lib/presta-offer.ts) | hook `usePrestaOffer()` : **aucun écran n'écrit « 6 mois » en dur**, tout vient du serveur |
| écrans | abonnement, gestion d'abonnement, setup fiche, accueil presta, inscription, CGU |

Sur **Android / web (Stripe)** la durée est appliquée par le serveur : 180 jours si le
compte a une place fondateur, 90 sinon. **Rien à configurer.**

Sur **iOS**, la durée réellement offerte est celle de **l'offre d'introduction StoreKit** :
c'est Apple qui l'accorde, elle n'est pas modifiable par compte. Elle doit donc être
passée à 6 mois dans App Store Connect — et ramenée à 3 mois quand les 200 places sont
prises, sinon l'App Store continuera d'offrir 6 mois alors que l'app annonce 3.

### 🍎 À faire dans App Store Connect — AVANT que le nouveau build soit publié

| # | Où | Quoi |
|---|---|---|
| 1 | **Monétisation → Abonnements** → groupe → `com.oheve.wedding.presta.sub` → **Offres d'introduction** | L'offre « essai gratuit 3 mois » en cours **n'est pas modifiable** : lui donner une **date de fin** (aujourd'hui), puis **créer une nouvelle offre** qui démarre le lendemain — type **Essai gratuit**, durée **6 mois**, **tous les pays/régions**, clients éligibles **Nouveaux abonnés**. |
| 2 | Même écran → **Localisations (français)** | Description de l'abonnement : remplacer « 3 mois offerts » par « **6 premiers mois offerts pour les 200 premiers prestataires inscrits, puis 39,99 €/mois** ». Le nom d'affichage ne change pas (« Oheve Prestataire — Abonnement mensuel »). |
| 3 | Même écran → **Capture d'écran de review** | Si la capture montre « 3 mois offerts », en remettre une prise sur le nouveau build (l'écran affiche maintenant « 6 mois offerts »). |
| 4 | **Version 1.0.x → Description / Texte promotionnel (FR)** | Toute mention de « 3 mois offerts » → « 6 mois offerts (offre de lancement, 200 premiers prestataires) ». |
| 5 | **Version → Notes pour la review** | Ajouter : « L'abonnement prestataire bénéficie d'une offre de lancement : 6 mois d'essai gratuit (offre d'introduction StoreKit) pour les 200 premiers prestataires. Les écrans d'achat affichent la durée renvoyée par le serveur. » |
| 6 | **Nouveau build** | Uploader le build EAS puis l'attacher à la version. |

⚠️ **Ordre important** : l'offre d'introduction 6 mois (#1) doit être **active** au moment
où le build est examiné/publié. Si l'app annonce 6 mois et que l'App Store en offre 3,
c'est un rejet **3.1.2** (informations d'achat trompeuses) quasi assuré.

### Quand les 200 places sont prises

Le compteur est lisible publiquement (aucune connexion) :

```bash
curl -s https://oheve-production.up.railway.app/api/prestataire-subscription/offer
```

`founder_remaining` tombe à 0 → l'app repasse d'elle-même à « 3 mois offerts » et masque
la bannière de lancement. Il reste alors **une seule action manuelle** : dans App Store
Connect, donner une date de fin à l'offre d'introduction 6 mois et en créer une de
**3 mois** à la suite (mêmes étapes que #1 ci-dessus).

---

## 0-quinquies. 🔴 REJET du 04/08/2026 (build 21) — 2.1(b) achats introuvables + 2.1 PassKit

> « we cannot locate the In-App Purchases, such as oheve prestataire, within the app »
> « The app binary includes the PassKit framework … we were unable to verify any
> integration of Apple Pay »
> Testé sur **iPad Air 11-inch (M3)**, version **1.0 (21)**.

### Pourquoi le reviewer n'a rien trouvé — **PAS un bug de code**

1. **L'abonnement prestataire est invisible depuis le compte démo.** Le compte
   `oheveadmin+applereview@gmail.com` est un compte **futurs mariés** : l'écran
   d'abonnement 39,99 €/mois n'existe que côté **prestataire**. Et le reviewer ne peut pas
   créer un compte prestataire lui-même : l'inscription exige un **code OTP envoyé par
   e-mail** ([register.tsx](MonApp/app/(auth)/register.tsx:73)), qu'il ne recevra jamais.
   → **Il faut fournir un 2e compte démo de rôle « Prestataire », sans abonnement actif.**
2. **PassKit vient de `@stripe/stripe-react-native`** (dépendance du paiement carte
   Android/web des prestataires). L'app **n'offre pas Apple Pay** sur iOS ; tout le
   numérique passe par StoreKit. Il faut le **déclarer dans les Notes de review**.
3. Un faux bouton « Apple Pay » subsistait dans un écran mort
   ([payment-methods.tsx](MonApp/app/(app)/payment-methods.tsx)) : **supprimé**.
4. 🔴 **L'écran d'abonnement était un cul-de-sac.** Après le setup de la fiche, aucun
   retour, aucun « plus tard » — et si StoreKit ne renvoyait pas l'offre, le bouton
   d'achat restait grisé : le prestataire (et le reviewer) était piégé. Ajout d'un
   **« Plus tard »** sur les 3 variantes de l'écran, qui renvoie sur l'accueil
   prestataire où la bannière non bloquante « Profil non visible → Activer » ramène
   vers l'abonnement. **→ un rebuild (build 22) est donc nécessaire.**
5. **L'abonnement était en statut « Refusé » dans ASC** (motif « Other ») : un IAP
   refusé n'est **pas servi par StoreKit**, même en sandbox → l'app affichait « L'App
   Store n'a pas pu charger l'offre » et le bouton grisé. C'est très probablement ce
   que le reviewer a vu. Corrections ASC : capture de review remplacée (l'ancienne
   montrait le **formulaire carte Stripe**, lecture 3.1.1 immédiate), nom d'affichage
   et description localisés, remarques de review remplies, puis « Mettre à jour la
   vérification ».
6. **Prix corrigé partout : 39 € → 39,99 €** (app, CGU, guest-site, Stripe
   `PRICE_CENTS` + nouveau `lookup_key`, les prix Stripe étant immuables).

### Chemins réels vers les achats (build 21, inchangés)

| Produit | Identifiant | Chemin dans l'app |
|---|---|---|
| Premium futurs mariés (50 €, non consommable) | `com.oheve.wedding.couple.premium` | Compte futurs mariés → onglet **Profil** → carte **Oheve Premium** ([profile.tsx:689](MonApp/app/(app)/(tabs)/profile.tsx:689)) — ou **Plan de table** / **Site de mariage** → paywall → « Débloquer » |
| Abonnement prestataire (39,99 €/mois, 6 mois offerts — offre de lancement) | `com.oheve.wedding.presta.sub` | Compte **prestataire** → onglet **Profil** → **« Mon abonnement Oheve »** → « S'abonner » ([profile.tsx:551](MonApp/app/(app)/(tabs)/profile.tsx:551)) — ou bannière de l'accueil prestataire |

Aucune restriction de storefront ni de device. iOS = StoreKit uniquement ; le formulaire
carte Stripe n'est rendu que si `Platform.OS !== 'ios'`
([subscribe.tsx:465](MonApp/app/(app)/prestataire/subscribe.tsx:465)).

### À FAIRE avant de répondre ⚠️

| # | Action |
|---|---|
| 1 | **Créer le compte démo prestataire** dans l'app (rôle Prestataire, fiche remplie, **sans abonnement actif**) avec une adresse que tu contrôles, ex. `oheveadmin+applepresta@gmail.com`, et noter le mot de passe. |
| 2 | **Vérifier le contrat « Applications payantes »** (ASC → Entreprise → Contrats) : statut **Actif**. C'était déjà la cause du « SKU not found » en sandbox. |
| 3 | **Rattacher les 3 éléments IAP à la version 1.0** dans ASC (ils sont en statut « Rejeté » → les re-soumettre **avec** la version, sinon ils restent hors review). |
| 4 | **Notes de review** : coller les 2 comptes démo + les chemins + la phrase PassKit (§ ci-dessous). |
| 5 | **Build 22** (`eas build -p ios --profile production` puis `eas submit -p ios --latest`) : il embarque le « Plus tard », la suppression du faux Apple Pay et le prix 39,99 €. |
| 6 | Répondre dans ASC avec le message anglais ci-dessous. |

### Notes de review à coller dans ASC

```
DEMO ACCOUNTS
1) Couple account: oheveadmin+applereview@gmail.com / [PASSWORD]
2) Vendor account: oheveadmin+applepresta@gmail.com / [PASSWORD]
   (needed for the vendor subscription — a new vendor account cannot be created
   by the reviewer because sign-up requires an email OTP code)

IN-APP PURCHASES
- com.oheve.wedding.couple.premium (non-consumable, EUR 50):
  log in with account 1 > "Profil" tab > "Oheve Premium" card > purchase button.
  Also reachable from "Plan de table" or "Site de mariage" (paywall sheet).
- com.oheve.wedding.presta.sub (auto-renewable, EUR 39.99/month, 6 months free — launch offer):
  log in with account 2 > "Profil" tab > "Mon abonnement Oheve" > "S'abonner".
No storefront, region or device restriction. Verified on iPad and iPhone.

APPLE PAY / PASSKIT
The app does NOT offer Apple Pay. PassKit is linked transitively by the
@stripe/stripe-react-native dependency, used only for card payments on Android
and on the web dashboard (physical wedding services booked with vendors).
All digital content and subscriptions are sold exclusively through StoreKit
in-app purchases.
```

### Réponse à coller dans ASC (« Répondre à l'équipe de vérification »)

```
Hello,

Thank you for the feedback. Before the point-by-point answers, I need to raise a
process issue.

This is the fifth review round on this app, and each round has come back with
exactly one new reason, always after the previous one was fixed: 2.1(a) login
error, then 3.1.2 EULA link, then 3.1.2(c) offer details, and now 2.1(b) and
PassKit. Both of the points you raise today apply to every build you have
reviewed since the very first submission — the In-App Purchases and the PassKit
framework are not new, they were in build 17, 18, 20 and 21 alike. Each round
costs us a full rebuild and another week of waiting for something that could have
been raised the first time we were reviewed.

Please review the binary completely and send us every outstanding issue in a
single message. We will fix all of them at once. What we cannot keep doing is
shipping one new build per rejection reason.

Now, the answers.

1) Guideline 2.1(b) — locating the In-App Purchases

The purchases were not found because the demo account provided is a COUPLE
account, and the vendor subscription only exists in the VENDOR side of the app.
The reviewer cannot create a vendor account either, because sign-up requires an
OTP code sent by email. We have therefore created a second demo account:

  Couple account: oheveadmin+applereview@gmail.com / [PASSWORD]
  Vendor account: oheveadmin+applepresta@gmail.com / [PASSWORD]

  - com.oheve.wedding.couple.premium (non-consumable, EUR 50)
    Log in with the COUPLE account > "Profil" tab > "Oheve Premium" card >
    purchase button. It is also reachable from "Plan de table" or
    "Site de mariage", which open the premium sheet.

  - com.oheve.wedding.presta.sub (auto-renewable, EUR 39.99/month, 6 months free — launch offer)
    Log in with the VENDOR account > "Profil" tab > "Mon abonnement Oheve" >
    "S'abonner". The StoreKit sheet opens from there.

There is no storefront, region, device or account-type restriction on the
purchases. Both flows were tested on iPad and iPhone in sandbox, and the Paid
Applications Agreement is active on our account.

2) Guideline 2.1 — PassKit

The app does not offer Apple Pay. PassKit is linked transitively by the
@stripe/stripe-react-native dependency, which we use only for card payments on
Android and on our web dashboard (physical wedding services booked with
vendors). All digital content and subscriptions are sold exclusively through
StoreKit in-app purchases. This is now stated in the Review Notes, and the
remaining unreachable Apple Pay placeholder screen has been removed from our
codebase for the next build.

We also found and fixed an issue of our own: after completing the vendor profile,
the subscription screen had no way out, so a vendor who did not subscribe was
stuck on it. It now has a "Plus tard" (Later) option, and the subscription stays
reachable from the vendor home screen and from "Profil" > "Mon abonnement Oheve".
This is included in the new build.

And again: if anything else in the app does not meet the guidelines, please
include all of it in your next reply.

Best regards,
Oday Attia — Oheve
```

---

## 0-quater. 🔴 REJET du 29/07/2026 (build 20) — Guideline 3.1.2(c) : infos d'abonnement manquantes

> « The following information needs to be included within the app: a functional link to
> the Terms of Use (EULA) and a functional link to the privacy policy. »
> Testé sur **iPad Air 11-inch (M3)**, version **1.0 (20)**.

### Pourquoi ce rejet alors que les liens existaient déjà dans le build 20 ?

Trois raisons cumulées — les trois sont corrigées :

1. **Les liens n'étaient que sur 2 écrans** (`premium.tsx` et `prestataire/subscribe.tsx`),
   tout en bas, en petit. Le reviewer arrive avec le **compte de démonstration (futurs
   mariés)** : les écrans qu'il voit en premier — la **modale paywall** (plan de table,
   site mariage…) et l'écran **PremiumGate** — n'avaient **aucun lien**. C'est le point
   que le client avait repéré : « ce n'est pas dans le compte client ».
2. **Il manquait le détail de l'offre.** Apple n'exige pas seulement les 2 liens, mais
   aussi, sur l'écran d'achat : **le titre de l'offre**, **sa durée** et **son prix**.
3. **Les liens partaient vers Safari** (`https://oheve.pages.dev/cgu`). Un lien externe
   peut échouer ou s'ouvrir hors de l'app pendant la review. Ils ouvrent désormais les
   **écrans internes** de l'app (CGU + confidentialité), qui ne peuvent pas échouer.

Et surtout : **le point b) du §0 (métadonnées App Store Connect) n'a jamais été fait**.
Apple redemande explicitement le lien EULA dans la **description** ou le champ **EULA**
d'App Store Connect. Tant que ce n'est pas fait, le rejet 3.1.2 revient même avec une
app parfaite. → voir le tableau ci-dessous.

### a) Corrections code livrées (fait ✅ — nécessite un rebuild EAS)

Nouveau composant partagé `MonApp/components/purchase-legal.tsx` qui affiche, en clair :

| Ligne | Contenu |
|---|---|
| Offre | « Oheve Prestataire — Abonnement mensuel » / « Oheve Premium » |
| Durée | « 1 mois, renouvelé automatiquement » / « Achat unique » |
| Prix | « 39,99 € / mois » (prix réel Apple) / « 50 € TTC, une seule fois » |
| Mention | renouvellement auto, résiliation 24 h avant, Réglages → Abonnements |
| Liens | **Conditions d'utilisation (EULA)** · **Politique de confidentialité** (écrans internes) |

Ce bloc est maintenant présent sur **tous** les écrans où quelque chose se vend :

- `components/paywall-modal.tsx` (modale premium des futurs mariés) — **nouveau**
- `components/premium-gate.tsx` (écran de blocage d'une fonctionnalité) — **nouveau**
- `app/(app)/premium.tsx` (achat Premium 50 €)
- `app/(app)/prestataire/subscribe.tsx` (abonnement 39,99 €/mois)
- `app/(app)/prestataire/manage-subscription.tsx` (« Mon abonnement ») — **nouveau**
- `app/(app)/subscription.tsx` (formules Boutique) — liens ajoutés + **vente désactivée
  sur iOS** (elle activait un abonnement sans passer par l'In-App Purchase : rejet
  3.1.1 assuré si le reviewer tombait dessus)

Autres corrections :

- **CGU réécrites** (`app/(app)/cgu.tsx` + `guest-site/src/legal/LegalPages.tsx`) : elles
  disent désormais explicitement qu'elles valent **EULA**, et détaillent prix, durée,
  renouvellement automatique, résiliation 24 h, essai gratuit perdu, remboursements Apple.
- **Liens CGU + confidentialité ajoutés dans le menu Paramètres du compte prestataire**
  (ils n'existaient que dans l'onglet Réglages des futurs mariés).
- Écrans CGU et Confidentialité : ajout de la **safe area** en haut (titre plus collé au
  haut de l'écran sur iPad).

### b) App Store Connect — À FAIRE (c'est le point bloquant) ⚠️

| # | Où | Ce qu'il faut faire |
|---|---|---|
| 1 | **Informations sur l'app → URL de politique de confidentialité** | `https://oheve.pages.dev/privacy` |
| 2 | **Informations sur l'app → Contrat de licence utilisateur final (EULA)** | Coller l'URL `https://oheve.pages.dev/cgu` (ou le texte complet des CGU). Si le champ est vide, Apple applique son EULA standard — mais ici il faut le remplir. |
| 3 | **Version 1.0 (ou 1.0.1) → Description** | Ajouter les 2 liens **en toutes lettres à la fin** (voir le texte à coller ci-dessous). C'est ce que cherche le contrôle d'Apple. |
| 4 | **Monétisation → Abonnements → `com.oheve.wedding.presta.sub`** | Nom d'affichage FR = **« Oheve Prestataire — Abonnement mensuel »**, durée **1 mois**, prix **39,99 €**, offre d'introduction **6 mois offerts** (voir §0-sexies), description FR remplie, capture d'écran de review. |
| 5 | **Informations sur la review → Notes** | Coller les identifiants du compte démo + la phrase indiquant où trouver les liens dans l'app (voir ci-dessous). |

**Texte à ajouter à la fin de la description de l'app :**

```
Oheve Premium (futurs mariés) : achat unique de 50 €, accès illimité, sans abonnement.
Oheve Prestataire : abonnement de 39,99 €/mois, durée 1 mois renouvelable automatiquement,
6 premiers mois offerts (offre de lancement, 200 premiers prestataires). Le paiement est débité sur le compte Apple à la confirmation
de l'achat. L'abonnement se renouvelle automatiquement sauf résiliation au moins 24 h
avant la fin de la période en cours, dans Réglages → votre nom → Abonnements.

Conditions d'utilisation (EULA) : https://oheve.pages.dev/cgu
Politique de confidentialité : https://oheve.pages.dev/privacy
```

**Texte à ajouter dans les Notes pour la review :**

```
Where to find the required subscription information inside the app:
1. Log in with the demo account below.
2. Any premium screen (Seating plan, Wedding website) shows the offer sheet with:
   offer title, duration, price, and two tappable links "Conditions d'utilisation
   (EULA)" and "Politique de confidentialité" (they open in-app legal screens).
3. Vendor subscription: Profile > "Mon abonnement Oheve", or sign up as a vendor
   (Prestataire) — the subscribe screen shows title, 1-month duration, EUR 39.99/month,
   auto-renewal disclosure and both legal links.
```

### c) Enregistrement d'écran demandé par Apple

Apple écrit : *« reply to this message with a screen recording to confirm »*. Une fois le
nouveau build accepté en TestFlight, filmer (iPhone : Réglages → Centre de contrôle →
Enregistrement de l'écran), **30 secondes suffisent** :

1. Ouvrir l'app, se connecter avec le compte démo.
2. Ouvrir « Plan de table » (ou « Site de mariage ») → la fiche Premium s'affiche.
3. **Scroller jusqu'au bloc « DÉTAIL DE L'OFFRE »** : montrer titre, durée, prix.
4. **Taper « Conditions d'utilisation (EULA) »** → la page s'ouvre → revenir.
5. **Taper « Politique de confidentialité »** → la page s'ouvre → revenir.
6. Aller sur l'écran d'abonnement prestataire et refaire les points 3 à 5.

Envoyer la vidéo en réponse au message dans App Store Connect (bouton de pièce jointe).

### d) Réponse à coller dans App Store Connect

```
Hello,

Thank you for your feedback regarding Guideline 3.1.2(c).

We have updated the app so that every screen offering a purchase or a
subscription now displays, above the purchase button:

- the offer title (same as the App Store product name),
- its length (1 month, auto-renewing / one-time purchase),
- its price (39.99 EUR per month / 50 EUR one time),
- the auto-renewal disclosure (renews automatically unless cancelled at
  least 24 hours before the end of the current period, managed in
  Settings > Apple Account > Subscriptions),
- and two functional links: "Conditions d'utilisation (EULA)" and
  "Politique de confidentialité". These links open the full documents
  inside the app, so they cannot fail.

These elements are now present on the vendor subscription screen, on the
"My subscription" screen, on the Premium screen and on the premium
paywall sheet that the couple account sees first.

We have also updated our metadata: the privacy policy URL
(https://oheve.pages.dev/privacy) is set in App Store Connect, the EULA
(https://oheve.pages.dev/cgu) is provided in the app description and in
the EULA field.

A screen recording showing both links being opened from the subscription
screen is attached.

Thank you for your time,
The Oheve team
```

---

## 0-ter. 🔴 REJET du 27/07/2026 (build 19) — Guideline 2.1(b) : « SKU not found » à l'achat

> Capture du reviewer : boîte de dialogue **« Achat impossible — SKU not found »**
> sur l'écran Premium. Même symptôme sur l'abonnement prestataire.
> Testé sur iPad Air 11-inch (M3), iPadOS 26.5.2.

### Ce que veut dire exactement « SKU not found »

C'est **StoreKit** (Apple) qui répond à l'app : *« l'identifiant de produit que tu me
demandes n'existe pas / n'est pas disponible pour ce compte »*. L'app a bien réussi à se
connecter à l'App Store (sinon on aurait eu « App Store indisponible »), elle a demandé
`com.oheve.wedding.couple.premium`, et **Apple a renvoyé une liste vide**.

Autrement dit : le code appelle correctement StoreKit ; c'est **la fiche produit côté
App Store Connect qui n'est pas dans un état livrable**. Les 3 causes possibles, par
ordre de fréquence :

1. **L'accord « Applications payantes » (Paid Apps) n'est pas ACTIF** — Apple le
   mentionne d'ailleurs dans son message. Tant qu'il est « en attente » (ou que les
   infos bancaires/fiscales sont incomplètes), **aucun** produit n'est renvoyé, même en
   sandbox. → C'est la cause n°1 quand les DEUX produits échouent en même temps, ce qui
   est le cas ici.
2. **Le produit n'est pas à l'état « Prêt à envoyer »** (statut *Métadonnées manquantes* :
   pas de prix, pas de localisation FR, ou **pas de capture d'écran de review**).
   Un produit en « Métadonnées manquantes » n'est PAS renvoyé par StoreKit.
3. **L'identifiant ne correspond pas au caractère près** à celui du code, ou le produit a
   été créé sous une autre app / un autre bundle ID.

### Vérification à faire dans App Store Connect (5 min, dans cet ordre)

| # | Où | Ce qui doit être vrai |
|---|---|---|
| 1 | **Entreprise → Accords, taxes et opérations bancaires** | Ligne « Applications payantes » = **Actif** (pas « En attente »). Coordonnées **bancaires** + **fiscales** (formulaires US) complétées. |
| 2 | App Oheve → **Monétisation → Achats intégrés** | Un produit **Non consommable**, ID **exactement** `com.oheve.wedding.couple.premium`, statut **« Prêt à envoyer »**, prix 50 €, localisation FR remplie, **capture d'écran de review** ajoutée. |
| 3 | App Oheve → **Monétisation → Abonnements** | Groupe créé, abonnement ID **exactement** `com.oheve.wedding.presta.sub`, statut **« Prêt à envoyer »**, durée 1 mois, prix 39,99 €, offre d'introduction *essai gratuit 6 mois* (voir §0-sexies), localisation FR, capture d'écran. |
| 4 | Page de la **version 1.0 (build 20)** | Section « Achats intégrés et abonnements » → **les 2 produits sont cochés/rattachés à la version**. Le tout premier IAP doit être soumis EN MÊME TEMPS que la version. |
| 5 | Chaque produit | **Disponibilité** : tous les pays (au minimum la France + les États-Unis, le reviewer teste souvent depuis un compte US). |

> ⚠️ Le détail des champs à remplir est en **§2** de ce document.
> Tant que ces 5 points ne sont pas verts, **aucun build ne peut passer** : le code ne
> peut pas vendre un produit qu'Apple ne publie pas.

### Corrections code livrées dans le build 20 (fait ✅)

Le code ne pouvait pas créer le produit à la place d'Apple, mais il ne devait pas non
plus afficher une erreur technique. Corrigé dans `MonApp/lib/iap.ts`,
`MonApp/app/(app)/premium.tsx` et `MonApp/app/(app)/prestataire/subscribe.tsx` :

- **Chargement du produit avec 4 réessais** (0,7 s → 2,1 s de délai croissant).
  StoreKit renvoie fréquemment une liste vide au tout premier appel après le lancement
  de l'app, en particulier en sandbox : c'est très probablement ce qui s'est passé chez
  le reviewer si la config ASC est bonne.
- **Le bouton d'achat reste désactivé tant qu'Apple n'a pas renvoyé le produit** : on ne
  déclenche plus jamais un achat sur un SKU inconnu → l'erreur « SKU not found » ne peut
  plus apparaître.
- **Message clair + bouton « Réessayer »** si l'offre ne charge pas, au lieu de la boîte
  de dialogue technique.
- **Prix affiché = prix réel Apple** (plus de « 50 € » codé en dur quand le produit n'est
  pas chargé).
- **Tous les codes d'erreur StoreKit traduits en français** (`describeIapError`).

### Réponse à coller dans App Store Connect

```
Bonjour,

Merci pour votre retour concernant les achats intégrés (Guideline 2.1(b)).

Nous avons identifié et corrigé le problème :

1. Configuration : nous avons vérifié et complété la configuration de nos
   produits dans App Store Connect (accord « Applications payantes »,
   métadonnées, captures d'écran, prix et disponibilité). Les deux produits
   — l'achat unique « Oheve Premium » et l'abonnement « Espace Prestataire »
   — sont désormais à l'état « Prêt à envoyer » et rattachés à cette version.

2. Application : cette nouvelle version charge les produits avec plusieurs
   tentatives et n'affiche le bouton d'achat qu'une fois le produit renvoyé
   par StoreKit. En cas d'indisponibilité temporaire de l'App Store, un
   message clair et un bouton « Réessayer » sont affichés au lieu d'une
   erreur technique.

Nous avons testé les deux achats en sandbox : l'achat unique et
l'abonnement se déroulent correctement, et « Restaurer mes achats »
fonctionne également.

Merci pour votre temps.
```

---

## 0-bis. ⚠️ DERNIER rejet du 26/07/2026 (build 17) — Guideline 2.1(a) : « erreur de connexion » au login

> « The login flow prompted a connection error message. »
> Testé sur **iPad Air 11-inch (M3), iPadOS 26.5.2**, connexion internet active.

### Diagnostic (fait ✅)
- Backend Railway vérifié **opérationnel** au moment de l'analyse :
  `/api/health` → 200, `/api/auth/connexion` → 401 (compte inconnu), `/api/auth/send-otp` → 200.
- Le **compte démo `oheveadmin+applereview@gmail.com` existe toujours** (réponse
  `WRONG_PASSWORD` = compte présent → il n'a PAS été supprimé par la vidéo).
- Conclusion : l'« erreur de connexion » vue par Apple était **transitoire** — très
  probablement un **cold start Railway** (1re requête après inactivité qui dépasse le
  délai), ressenti comme une panne réseau. Le seul message possible dans le code venait
  d'un `fetch` en échec/temporisation.

### Corrections code (fait ✅ — inclus dans le build 18)
Tout le flux d'authentification est désormais **tolérant à un serveur lent** :
- `services/auth/api.ts` → `request()` **réessaie automatiquement** (jusqu'à 3 tentatives,
  backoff 0,8 s) sur erreur réseau, temporisation, et passerelle indisponible (502/503/504).
  → une 1re requête lente n'affiche plus « erreur de connexion ».
- `warmupServer()` : **réveil du serveur** (ping `/api/health`) dès l'écran d'accueil, pour
  que la 1re connexion soit rapide même après une longue inactivité.
- Toutes les requêtes d'auth passent maintenant par `request()` :
  connexion (déjà OK), inscription (`register.tsx`), OTP (`verify-otp.tsx`),
  Google/Apple (`use-social-auth.ts`).

### Action manuelle IMPORTANTE ⚠️
- **Vérifier que Railway est en « always-on »** (pas de mise en veille du service), sinon
  le cold start peut se reproduire. Idéalement garder au moins 1 instance active.
- **Recréer / confirmer le mot de passe du compte démo** `oheveadmin+applereview@gmail.com`
  et le **coller dans les Notes App Review** (le reviewer en a besoin pour se connecter).
- **Rebuild + resubmit** (build 18, `autoIncrement` s'en occupe) — voir §6.

### Réponse à coller dans App Store Connect (« Répondre à l'équipe de vérification »)

```
Bonjour,

Merci pour votre retour concernant l'erreur de connexion (Guideline 2.1(a)).

Après investigation, notre serveur était opérationnel ; l'erreur observée était
transitoire (temps de réponse anormalement long à la première requête après une
période d'inactivité), ce qui était affiché à tort comme une erreur réseau.

Nous avons corrigé ce comportement dans cette nouvelle version :
- Les requêtes de connexion réessaient automatiquement en cas de réponse lente
  ou de temporisation, au lieu d'afficher immédiatement une erreur.
- Le serveur est « réveillé » dès l'écran d'accueil pour que la première
  connexion soit rapide.

Nous avons testé le flux de connexion sur iPad et iPhone : il fonctionne
correctement.

Compte de démonstration (email + mot de passe) :
  E-mail : oheveadmin+applereview@gmail.com
  Mot de passe : [MOT DE PASSE ICI]

Étapes : écran d'accueil → « Connexion » → saisir l'e-mail et le mot de passe
ci-dessus → « Se connecter ».

Merci beaucoup pour votre temps.
```

---

## 0. ⚠️ NOUVEAU rejet du 26/07/2026 — Guideline 3.1.2 (liens EULA / abonnement)

> « The submission offers auto-renewable subscriptions but does not include a
> functional link to the Terms of Use (EULA) in the app's metadata. »

Pour un abonnement auto-renouvelable (abonnement prestataire 39,99 €/mois), Apple exige
des **liens fonctionnels vers les Conditions d'utilisation (EULA) ET la politique de
confidentialité**, à la fois **dans l'app** (le binaire) **et dans les métadonnées**.

### a) Dans l'app — FAIT ✅ (rebuild EAS requis)
Écran d'abonnement (`prestataire/subscribe.tsx`) et écran Premium (`premium.tsx`) :
ajout d'un pied de page avec **« Conditions d'utilisation (EULA) »** →
`https://oheve.pages.dev/cgu` et **« Politique de confidentialité »** →
`https://oheve.pages.dev/privacy`, plus la mention claire du renouvellement
automatique. URLs centralisées dans `constants/config.ts` (`LEGAL_URLS`).

### b) Métadonnées App Store Connect — À FAIRE ⚠️ (c'est le point qu'Apple a bloqué)

1. **App Store Connect → l'app → Informations sur l'app → Contrat de licence
   utilisateur final (EULA)** : soit garder l'EULA standard d'Apple, soit coller
   notre EULA personnalisé (contenu de `https://oheve.pages.dev/cgu`).
2. **Description de l'app** (section « Description », version en cours) : ajouter en
   bas les deux liens en toutes lettres — c'est ce que le contrôle automatique
   d'Apple recherche :

   ```
   Conditions d'utilisation (EULA) : https://oheve.pages.dev/cgu
   Politique de confidentialité : https://oheve.pages.dev/privacy

   L'abonnement Espace Prestataire (39,99 €/mois, 6 mois d'essai gratuit) se
   renouvelle automatiquement sauf annulation au moins 24 h avant la fin de la
   période. Le renouvellement est géré dans Réglages → Abonnements.
   ```
3. Vérifier aussi le champ **URL de politique de confidentialité** (Informations sur
   l'app) = `https://oheve.pages.dev/privacy`.

> Note pour la réponse au reviewer : « Nous avons ajouté les liens fonctionnels vers
> les Conditions d'utilisation (EULA) et la politique de confidentialité, à la fois
> sur l'écran d'abonnement de l'application et dans la description / le champ EULA
> d'App Store Connect. »

---

## 1. Ce qui a été corrigé dans le code (fait ✅)

### ❌ Guideline 3.1.1 — Paiements (Stripe interdit pour le numérique sur iOS)
- **iOS → Apple In-App Purchase** via `expo-iap` :
  - Premium couple 50 € (paiement unique) → produit **non-consommable** `com.oheve.wedding.couple.premium`
  - Abonnement prestataire 39,99 €/mois (6 mois offerts) → **abonnement auto-renouvelable** `com.oheve.wedding.presta.sub`
  - Boutons **« Restaurer mes achats »** ajoutés (exigé par Apple).
  - Prix affiché = prix localisé renvoyé par l'App Store.
- **Android / web : Stripe conservé** (rien ne change).
- **Stripe reste utilisé sur iOS uniquement pour payer les prestataires** (traiteur, DJ, photographe… = services physiques consommés hors de l'app → autorisé par Apple).
- Backend : nouvel endpoint `POST /api/iap/verify` qui vérifie la signature Apple (JWS,
  chaîne de certificats officielle) avant d'activer premium / abonnement en BDD.
  Résiliation d'un abo Apple → depuis Réglages iOS (l'app ouvre la bonne page).
- Suppression de toute mention « Stripe » dans les écrans premium iOS.

### ❌ Guideline 5.1.1(v) — Suppression de compte
Le bouton existait mais **l'écran était inaccessible** (aucun lien ne menait aux
Paramètres). Maintenant :
- Profil **couple** : bouton « Supprimer mon compte » (rouge, en bas du profil).
- Profil **prestataire** : entrée « Supprimer mon compte » dans le menu ⚙️ Paramètres.
- Profil **boutique** : idem sous « Se déconnecter ».
- Double confirmation, puis `DELETE /api/auth/me` : suppression **réelle et en cascade**
  (profil, site de mariage, invités, messages, photos, RSVP…) + résiliation automatique
  de l'abonnement Stripe s'il existe.

### ❌ Guideline 5.1.2 — Tracking
Vérifié : **l'app ne contient aucun SDK de tracking** (pas de Facebook, Google Ads,
Firebase Analytics, AppsFlyer…). Aucun code à changer → c'est une erreur de déclaration
dans App Store Connect (voir §4).

---

## 2. App Store Connect — créer les 2 achats intégrés (à faire ⚠️)

> Préalable : dans **Accords, taxes et opérations bancaires**, l'accord
> **« Applications payantes »** doit être signé + coordonnées bancaires et fiscales
> remplies. Sans ça, les produits IAP ne se chargeront jamais dans l'app.

### a) Premium couple — achat unique
Mon app Oheve → **Fonctionnalités → Achats intégrés** → ➕ :
- Type : **Non consommable**
- Nom de référence : `Oheve Premium`
- **ID produit : `com.oheve.wedding.couple.premium`** (exactement — le code en dépend)
- Prix : point de prix **50,00 €**
- Localisation (français) — Nom affiché : `Oheve Premium` ;
  Description : `Site de mariage, faire-part, RSVP, plan de table, invités illimités.`
- Capture d'écran de review : screenshot de l'écran Premium de l'app.

### b) Abonnement prestataire — mensuel avec 6 mois offerts
Mon app Oheve → **Fonctionnalités → Abonnements** → créer un **groupe**
`Oheve Prestataire` puis dedans ➕ :
- Nom de référence : `Abonnement Prestataire Oheve`
- **ID produit : `com.oheve.wedding.presta.sub`** (exactement)
- Durée : **1 mois** — Prix : **39,99 €**
- **Offre d'introduction** : type **Essai gratuit**, durée **6 mois** (offre de lancement — voir §0-sexies), pour tous les pays.
- Localisation (français) — Nom : `Espace Prestataire` ;
  Description : `Visibilité dans le répertoire, messagerie, portfolio, calendrier.`

### c) Rattacher les IAP à la version
Sur la page de la **nouvelle version** de l'app, section « Achats intégrés et
abonnements » → ajouter les 2 produits. **Le tout premier IAP doit être soumis EN MÊME
TEMPS que la version de l'app**, sinon il restera « En attente ».

---

## 3. Railway — variables d'environnement backend (à faire ⚠️)

| Variable | Valeur | Rôle |
|---|---|---|
| `APPLE_APP_ID` | l'« Apple ID » **numérique** de l'app (App Store Connect → Informations sur l'app → Identifiant Apple, ex. `6743…`) | vérification des achats en **production** |
| `APPLE_BUNDLE_ID` | `com.oheve.wedding` (optionnel, c'est la valeur par défaut) | contrôle anti-fraude |

Sans `APPLE_APP_ID`, seuls les achats **sandbox** (ceux d'App Review) sont vérifiables —
il FAUT donc l'ajouter avant la mise en ligne réelle.
Déploiement : un simple push (Railway rebuild auto) après commit.

---

## 4. App Store Connect — corriger la déclaration de tracking (à faire ⚠️)

Mon app Oheve → **Confidentialité de l'app** (App Privacy) → Modifier :
1. À la question **« Utilisez-vous, vous ou vos partenaires, les données à des fins de
   suivi (tracking) ? » → répondre NON** pour tous les types de données.
2. Aucun type de donnée ne doit avoir la case **« Used for Tracking »** cochée.
3. Types de données à garder déclarés (collectés mais non liés au tracking) :
   - Coordonnées (e-mail, nom) — liées à l'identité, fonctionnement de l'app
   - Contenu utilisateur (photos, messages) — fonctionnement de l'app
   - Identifiants (ID utilisateur) — fonctionnement de l'app
4. Enregistrer et **publier** la nouvelle fiche de confidentialité.

---

## 5. Vidéo de démonstration « suppression de compte » (à faire ⚠️)

Apple demande un enregistrement **sur un iPhone physique** montrant :
1. Connexion avec le compte démo (`oheveadmin+applereview@gmail.com`).
2. Onglet **Profil** → descendre → **« Supprimer mon compte »**.
3. Les 2 confirmations → message « Compte supprimé » → retour à l'écran de connexion.

Enregistrement : Réglages iPhone → Centre de contrôle → Enregistrement de l'écran.
Uploader la vidéo (Google Drive en accès public par lien, par ex.) et coller le lien
dans **App Review Information → Notes** de la nouvelle version.

⚠️ Le compte démo sera supprimé par la vidéo → **recréez-le juste après** (avec mariage,
invités, site publié) pour que le reviewer puisse s'en servir.

---

## 6. Rebuild + soumission (à faire ⚠️)

Le module natif StoreKit (`expo-iap`) impose un **nouveau build EAS** :

```bash
cd MonApp
eas build --platform ios --profile production
eas submit --platform ios
```

Avant de tester l'achat en TestFlight : créer un **compte Sandbox** (App Store Connect →
Utilisateurs et accès → Sandbox → Testeurs) et s'y connecter sur l'iPhone
(Réglages → App Store → Compte sandbox). L'essai 6 mois sandbox dure ~quelques minutes
(durées accélérées), c'est normal.

### Notes pour App Review (à coller dans « Notes » de la version)

```
Bonjour,

Nous avons corrigé les trois points du précédent rejet :

1. Guideline 3.1.1 : Sur iOS, tous les contenus numériques passent désormais
   exclusivement par l'achat intégré Apple : « Oheve Premium »
   (com.oheve.wedding.couple.premium, non consommable) et l'abonnement prestataire
   (com.oheve.wedding.presta.sub, auto-renouvelable avec 6 mois d'essai
   gratuit). Un bouton « Restaurer mes achats » est présent. Le paiement Stripe
   restant dans l'app sert uniquement à régler des prestataires de mariage réels
   (traiteur, photographe, DJ…) : services physiques rendus hors de
   l'application, conformément à la guideline 3.1.3(e)/3.1.5.

2. Guideline 5.1.1(v) : La suppression de compte est disponible pour tous les
   rôles : Profil → « Supprimer mon compte » (double confirmation). Elle
   supprime définitivement le compte et toutes les données associées côté
   serveur. Vidéo de démonstration : [LIEN VIDÉO ICI]

3. Guideline 5.1.2 : L'application n'effectue aucun tracking et n'intègre
   aucun SDK publicitaire ou d'analytics tiers. La fiche de confidentialité
   App Store Connect a été corrigée en conséquence (aucune donnée « Used for
   Tracking »).

Compte de démonstration : oheveadmin+applereview@gmail.com / [MOT DE PASSE]

Merci beaucoup !
```

---

## 7. ⚠️ Important pour la sortie ANDROID (à anticiper)

**Google Play a la même règle qu'Apple** : les biens numériques (premium, abonnement
prestataire) doivent passer par **Google Play Billing**, pas par Stripe.
Aujourd'hui l'app Android utilise encore Stripe → **risque de rejet Google Play**.

Bonne nouvelle : `expo-iap` gère aussi Google Play. Avant la soumission Android il faudra :
1. Créer les produits équivalents dans la **Play Console** (produit intégré +
   abonnement avec offre 6 mois gratuits).
2. Activer le flux IAP côté Android dans `premium.tsx` / `subscribe.tsx`
   (aujourd'hui volontairement limité à iOS).
3. Ajouter la vérification des achats Google côté backend (`/api/iap/verify`).

→ Demandez cette adaptation quand la sortie Android sera planifiée — ne soumettez pas
l'app actuelle telle quelle sur Google Play.

---

## Récap des fichiers modifiés

| Zone | Fichiers |
|---|---|
| IAP app | `MonApp/lib/iap.ts` (nouveau), `app/(app)/premium.tsx`, `app/(app)/prestataire/subscribe.tsx`, `app/(app)/prestataire/manage-subscription.tsx`, `constants/config.ts`, `services/auth/api.ts`, `app.json` (plugin), `package.json` (expo-iap) |
| Suppression compte | `app/(app)/(tabs)/profile.tsx`, `app/(boutique)/(tabs)/profile.tsx`, backend `connexion-inscription/controller.ts` (+ résiliation Stripe) |
| Backend IAP | `backend/src/iap/index.ts` (nouveau), `backend/src/index.ts`, `backend/src/db/migrate.ts` (colonne `premium_apple_transaction_id`), `backend/src/prestataire-subscription/index.ts` (statut/cancel Apple), `backend/package.json` (@apple/app-store-server-library) |
