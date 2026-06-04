-- Migration: ajouter les colonnes budget à la table users
-- À exécuter dans Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_mode VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_global NUMERIC(12,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_categories JSONB;

-- budget_mode: 'global' ou 'categories'
-- budget_global: utilisé si budget_mode = 'global'
-- budget_categories: ex. {"photographe": 3000, "salle": 200, "traiteurs": 200} si budget_mode = 'categories'
