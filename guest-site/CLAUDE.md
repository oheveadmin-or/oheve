# Instructions pour Claude Code

## Projet

Oheve Guest Site est une application React 18 + TypeScript, construite avec Vite. Elle sert les pages publiques de mariage, le RSVP et le builder de mini-sites. Le backend est appelé via `/api`; le front ne contient pas le serveur d'authentification.

## Avant toute modification

1. Lis les fichiers concernés et suis les flux existants avant de proposer une nouvelle architecture.
2. Pour les comptes, sessions, propriétaires et autorisations, trace le parcours complet entre l'application mobile, le frontend et l'API. Le token du builder est injecté par `?token=`, puis conservé en `sessionStorage` par `src/wedding-sites/services/weddingSiteService.ts`.
3. Ne suppose pas que les mentions dans les pages légales décrivent une fonctionnalité déjà implémentée. Vérifie le backend et le schéma avant d'affirmer qu'une opération existe.
4. Demande une précision seulement si un choix produit ou une donnée manquante bloque réellement le travail. Sinon, avance avec une hypothèse explicite et réversible.

## Conventions techniques

- Utilise TypeScript strict et les alias `@guest/*` vers `src/*`.
- Garde les composants React cohérents avec les patterns déjà présents dans le dossier concerné.
- Le site prend en charge le français et l'hébreu; préserve le RTL et les textes localisés lorsque tu touches aux interfaces.
- Les routes publiques sont dans `src/App.tsx`. Les données des sites et les appels API passent principalement par `src/wedding-sites/services/weddingSiteService.ts`.
- Le fallback `localStorage` sert au développement sans backend. Ne le présente jamais comme une authentification ou un stockage sûr.
- N'ajoute pas de dépendance sans nécessité démontrée.

## Sécurité des comptes

- L'authentification et l'autorisation doivent être vérifiées côté serveur. Masquer un bouton dans React n'est pas un contrôle d'accès.
- Ne stocke jamais de mot de passe, secret ou token durable dans `localStorage`. Respecte le mécanisme de session existant et son cycle de vie.
- Ne fais pas confiance à un `userId`, un slug, un identifiant de site ou un rôle fourni par le client pour déterminer le propriétaire d'une ressource.
- Toute lecture, modification, exportation ou suppression doit vérifier côté serveur que la ressource appartient bien au compte authentifié.
- Pour une suppression de compte, considère les dépendances (sites, RSVP, photos, facturation et données liées), l'effacement effectif, les erreurs partielles et la confirmation explicite. N'invente pas de suppression si le backend ne la prend pas en charge.
- Ne journalise pas de token, mot de passe, donnée personnelle sensible ou contenu de RSVP.
- Préserve les clés d'accès des invités et les sessions propriétaires comme deux mécanismes distincts.

## Vérification et compte rendu

- N'exécute pas de déploiement ni de migration distante sans demande explicite.
- Quand une vérification est demandée, utilise les scripts présents dans `package.json` et rapporte exactement ce qui a réussi ou échoué.
- À la fin, résume les fichiers modifiés, le comportement obtenu, les vérifications effectuées et les questions restant bloquantes.
