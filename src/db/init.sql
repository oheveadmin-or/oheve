-- A exécuter dans Supabase SQL Editor (https://supabase.com/dashboard/project/xxx/sql/new)
-- Ce script crée la table users pour les inscriptions

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  date_mariage DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour rechercher par email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
