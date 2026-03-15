/**
 * Migration automatique au démarrage - assure que la table et colonnes existent
 * Corrige l'erreur 42703 (colonnes introuvables) si la table a été créée avant les mises à jour
 */

import { pool } from '../config/database';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    mot_de_passe VARCHAR(255),
    date_mariage DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;
const CREATE_INDEX = `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
const ADD_COLUMNS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mot_de_passe VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_mariage DATE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_mode VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_global NUMERIC(12,2)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_categories JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_location_type VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_city TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_country TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_lat NUMERIC`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_lng NUMERIC`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_address TEXT`,
];

export async function runMigrations(): Promise<void> {
  try {
    await pool.query(CREATE_TABLE);
    await pool.query(CREATE_INDEX);
    for (const sql of ADD_COLUMNS) {
      await pool.query(sql);
    }
    console.log('✅ Schema DB synchronisé');
  } catch (err) {
    console.error('❌ Migration DB:', (err as Error).message);
  }
}
