# The Event Planner - Wedding Planner

Application de planification de mariage (Android, iOS, Web).

## Structure du projet

```
jewishwedding/
├── MonApp/          # Frontend (Expo / React Native)
│   ├── app/         # Écrans et navigation
│   ├── components/  # Composants réutilisables
│   ├── services/    # Appels API (séparation front/back)
│   ├── constants/   # Config, thème
│   └── assets/      # Images, logo
│
└── backend/         # API (Express / Node.js)
    └── src/
        ├── index.ts
        ├── routes/
        ├── controllers/
        └── ...
```

## Démarrer le projet

### Backend
```bash
cd backend
npm install
npm run dev
```
API sur http://localhost:3000

### Frontend
```bash
cd MonApp
npm install
npx expo start
```

## Écran d'accueil

- Message de bienvenue
- Logo The Event Planner
- Bouton Inscription → formulaire dédié

## Bonnes pratiques

- **Frontend** : tous les appels API passent par `services/api.ts`
- **Backend** : routes → controllers → (futur: models)
- **Config** : `constants/config.ts` pour l'URL de l'API
