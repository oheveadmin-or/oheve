-- Migration: ajouter les colonnes lieu du mariage à la table users
-- Exécuter dans Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_location_type VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_lat NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_lng NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_address TEXT;

-- wedding_location_type: 'city' | 'address' | 'unknown'
