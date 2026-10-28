---
name: gestion-compte
description: Concevoir, implémenter ou auditer les parcours de compte Oheve (connexion, session, profil, propriété des sites, accès et suppression). À utiliser dès qu'une tâche concerne l'identité d'un utilisateur ou ses données.
---

# Gestion des comptes Oheve

Applique les instructions du `CLAUDE.md` à la racine du dépôt. Ce skill aide Claude Code à travailler sur la gestion de compte sans supposer que l'authentification est déjà complète.

## Cartographier l'existant

Avant de coder, repère et décris brièvement :

1. Le point d'entrée de la session dans l'application mobile et la façon dont le frontend reçoit son token.
2. Les endpoints backend disponibles, leurs validations et leur source de vérité pour l'identité du propriétaire.
3. Le stockage et le cycle de vie du token, ainsi que les réponses aux sessions absentes, expirées ou révoquées.
4. Les ressources appartenant au compte et leurs relations (sites, RSVP, images, abonnements ou achats).
5. Les écrans et textes existants concernés, y compris français, hébreu et RTL.

Inspecte le code et les migrations réellement présents. Signale clairement les éléments qui ne sont pas vérifiables dans ce dépôt. Ne déduis pas une API de la seule politique de confidentialité ou des CGU.

## Définir le comportement avant l'implémentation

Pour la demande, écris les états et règles utiles : compte connecté ou déconnecté, chargement, erreur réseau, session expirée, accès refusé, succès et reprise après erreur. Vérifie les règles de propriété et la compatibilité avec l'ouverture du builder depuis l'application mobile.

Si le backend nécessaire n'est pas dans le dépôt ou si son contrat manque, avance sur les parties frontend indépendantes et formule le contrat API minimal attendu. N'introduis pas un stockage client comme solution de sécurité.

## Mettre en œuvre avec sûreté

- Valide chaque accès et chaque mutation côté backend, à partir de l'identité authentifiée côté serveur.
- Évite l'énumération de comptes et les messages qui révèlent si une adresse existe.
- Pour changer l'adresse e-mail ou un moyen de connexion, prévois la vérification requise et la gestion des sessions existantes.
- Pour supprimer un compte, applique une confirmation explicite et une suppression cohérente des données associées; traite les échecs partiels sans annoncer un succès trompeur.
- Pour les sessions expirées, explique l'action à l'utilisateur et conserve les modifications non envoyées lorsque c'est possible et sûr.
- N'expose aucune donnée d'un autre compte dans les réponses, journaux, erreurs ou aperçus.
- Garde la clé du site/invitation et le token du propriétaire séparés.
- N'ajoute pas de fournisseur d'authentification ni de dépendance sans décision ou preuve dans le projet.

## Livrer

Fais des changements limités au parcours demandé, puis vérifie les flux touchés avec les moyens existants. Rapporte les fichiers concernés, le contrat backend utilisé ou manquant, les vérifications réellement effectuées et les risques ouverts. Ne déploie pas et ne lance pas de migration distante sans demande explicite.
