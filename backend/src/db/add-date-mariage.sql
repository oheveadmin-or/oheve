-- Migration: ajouter la colonne date_mariage à la table users
-- À exécuter dans Supabase SQL Editor si la colonne n'existe pas

ALTER TABLE users ADD COLUMN IF NOT EXISTS date_mariage DATE;
