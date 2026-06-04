-- Ajoute le support des connexions sociales (Google, Apple)
-- À exécuter dans Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS social_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS social_provider_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Rend mot_de_passe optionnel pour les comptes sociaux
ALTER TABLE users ALTER COLUMN mot_de_passe DROP NOT NULL;
