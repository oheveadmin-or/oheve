# Checklist avant chaque sortie (build App Store ou mise à jour)

À faire **à chaque fois**, ~5 minutes. C'est ce qui évite qu'un client tombe sur un bug.

## 1. Publier avec les bonnes commandes

Depuis `MonApp/` :

| Je veux… | Commande |
|---|---|
| Corriger du code (texte, écran, logique) — sans passer par Apple | `npm run release:update` |
| Sortir une nouvelle version sur l'App Store | `npm run release:build` |

Ces commandes vérifient d'abord la configuration (Google Sign-In…) et **refusent de publier** si quelque chose cloche. Les builds EAS font aussi cette vérification automatiquement.

## 2. Tester sur un vrai iPhone (TestFlight pour un build, l'app normale pour une mise à jour)

Fermer / rouvrir l'app **2 fois** avant de tester une mise à jour.

- [ ] Ouverture de l'app : pas de fermeture, pas d'écran blanc
- [ ] Connexion **e-mail + mot de passe**
- [ ] Connexion **Apple**
- [ ] Connexion **Google**
- [ ] Inscription d'un nouveau compte
- [ ] Déconnexion puis reconnexion
- [ ] Achat / abonnement (en mode test)
- [ ] L'écran que je viens de modifier

Si possible, tester aussi sur un **deuxième iPhone** (autre modèle ou autre version d'iOS).

## 3. Si un problème arrive quand même en production

**Un bouton de connexion est cassé** → le masquer tout de suite, sans mise à jour :

1. Railway → service backend → **Variables**
2. Ajouter `DISABLE_GOOGLE_LOGIN` = `true` (ou `DISABLE_APPLE_LOGIN` = `true`)
3. Railway redéploie tout seul : le bouton disparaît à la prochaine ouverture de l'app
4. Une fois corrigé : supprimer la variable

**L'app se ferme** → récupérer le rapport sur l'iPhone :
Réglages → Confidentialité et sécurité → Analyse et améliorations → Données d'analyse → fichier `Oheve-…`

## À ne pas faire

- Ne pas mettre les identifiants Google (Client ID) dans un `.env` : ils sont figés dans `MonApp/hooks/use-social-auth.ts` et doivent correspondre à `iosUrlScheme` dans `MonApp/app.json`.
- Ne pas lancer `eas submit` seul en pensant publier une correction : il renvoie le **dernier build existant**.
