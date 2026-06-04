# Configuration Supabase

## Étape 1 : Récupérer la connection string

1. Va sur [supabase.com](https://supabase.com) → ton projet
2. Clique sur **⚙️ Project Settings** (en bas à gauche)
3. Onglet **Database**
4. Section **Connection string** → onglet **URI**
5. Copie l'URL (elle ressemble à : `postgresql://postgres.xxx:xxx@...`)
6. Remplace `[YOUR-PASSWORD]` par ton mot de passe de projet si demandé

## Étape 2 : Créer le fichier .env

Dans le dossier `backend/`, crée un fichier `.env` :

```bash
cp .env.example .env
```

Ouvre `.env` et colle ta connection string :

```
DATABASE_URL=postgresql://postgres.xxx:Ez08092676!!@aws-0-xx.pooler.supabase.com:6543/postgres
PORT=3001
NODE_ENV=development
```

## Étape 3 : Créer la table dans Supabase

1. Va dans **SQL Editor** (Supabase)
2. Copie le contenu de `backend/src/db/init.sql`
3. Colle dans l'éditeur et clique sur **Run**

**Si la table `users` existe déjà** (sans certaines colonnes) :

- Sans `date_mariage` : exécute `add-date-mariage.sql`
- Pour le budget : exécute `add-budget.sql`
- Sans `mot_de_passe` : exécute `add-mot-de-passe.sql`
- Pour le lieu du mariage : exécute `add-wedding-location.sql` (ou laisse le backend ajouter les colonnes au démarrage)

## Étape 4 : Tester

```bash
cd backend
npm run dev
```

Tu devrais voir : `✅ Connecté à la base de données`
