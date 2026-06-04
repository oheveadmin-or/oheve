-- VÉRIFICATION : À exécuter dans Supabase SQL Editor
-- Ce script crée une table de test pour confirmer que la base fonctionne

-- 1. Voir les colonnes de la table users (pour vérifier si mot_de_passe existe)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

CREATE TABLE IF NOT EXISTS verification_test (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer une ligne de test
INSERT INTO verification_test (nom) VALUES ('Test réussi - ' || NOW()::text);

-- Afficher le résultat (tu verras la ligne insérée)
SELECT * FROM verification_test ORDER BY id DESC LIMIT 5;
