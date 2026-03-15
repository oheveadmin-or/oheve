# 🔄 Tout relancer - Étapes à suivre

## 1. Fermer tous les terminaux

Ferme les terminaux où tourne le backend ou Expo (clic poubelle ou Ctrl+C).

## 2. Terminal 1 - Backend

```bash
cd /Users/odayaattia/jewishwedding/backend
npm run dev
```

**Tu dois voir :**
- `DATABASE_URL chargé: Oui (Supabase)`
- `Connecté à la base de données`
- `API Wedding Planner démarrée sur http://localhost:3003`

❌ Si "DATABASE_URL manquant" → assure-toi d’être dans le dossier `backend/` avant de lancer.

## 3. Terminal 2 - App Expo

```bash
cd /Users/odayaattia/jewishwedding/MonApp
npx expo start
```

Puis appuie sur **`i`** pour le simulateur iPhone.

## 4. Tester l’inscription

1. Dans l’app : clic sur **Inscription**
2. Remplis nom, prénom, email
3. Clique sur **S'inscrire**

---

## Si le port 3003 est occupé

```bash
kill $(lsof -t -i:3003)
```

Puis relance `npm run dev` dans le dossier backend.
