/**
 * Repository Connexion / Inscription
 * Toute la logique d'accès aux données pour inscription et connexion
 */

import { pool } from '../config/database';

export interface UserRow {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  mot_de_passe?: string;
  date_mariage?: string;
  budget_mode?: string;
  budget_global?: number;
  budget_categories?: object;
  wedding_location_type?: string;
  wedding_city?: string;
  wedding_country?: string;
  wedding_lat?: number;
  wedding_lng?: number;
  wedding_address?: string;
  created_at: string;
}

export class ConnexionInscriptionRepository {
  async createUser(email: string, nom: string, prenom: string, motDePasseHash: string) {
    const result = await pool.query(
      `INSERT INTO users (email, nom, prenom, mot_de_passe)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nom, prenom, created_at`,
      [email.trim(), nom.trim(), prenom.trim(), motDePasseHash]
    );
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query(
      `SELECT id, email, nom, prenom, mot_de_passe, date_mariage,
              budget_mode, budget_global, budget_categories,
              wedding_location_type, wedding_city, wedding_country, wedding_lat, wedding_lng, wedding_address,
              created_at
       FROM users WHERE email = $1`,
      [email.trim()]
    );
    return result.rows[0] ?? null;
  }

  async updateDateMariage(email: string, dateMariage: string) {
    const result = await pool.query(
      `UPDATE users SET date_mariage = $1 WHERE email = $2
       RETURNING id, email, nom, prenom, date_mariage, created_at`,
      [dateMariage, email.trim()]
    );
    return result;
  }

  async updateBudgetGlobal(email: string, montant: number) {
    const result = await pool.query(
      `UPDATE users
       SET budget_mode = 'global', budget_global = $1, budget_categories = NULL
       WHERE email = $2
       RETURNING id, email, budget_mode, budget_global, budget_categories`,
      [montant, email.trim()]
    );
    return result;
  }

  async updateBudgetCategories(
    email: string,
    categories: { photographe: number; salle: number; traiteurs: number }
  ) {
    const result = await pool.query(
      `UPDATE users
       SET budget_mode = 'categories', budget_global = NULL, budget_categories = $1
       WHERE email = $2
       RETURNING id, email, budget_mode, budget_categories`,
      [JSON.stringify(categories), email.trim()]
    );
    return result;
  }

  async updateWeddingLocation(
    email: string,
    data: {
      wedding_location_type: 'city' | 'address' | 'unknown';
      wedding_city?: string | null;
      wedding_country?: string | null;
      wedding_lat?: number | null;
      wedding_lng?: number | null;
      wedding_address?: string | null;
    }
  ) {
    const result = await pool.query(
      `UPDATE users SET
        wedding_location_type = $1,
        wedding_city = $2,
        wedding_country = $3,
        wedding_lat = $4,
        wedding_lng = $5,
        wedding_address = $6
       WHERE email = $7
       RETURNING id, email, wedding_location_type, wedding_city, wedding_country, wedding_lat, wedding_lng, wedding_address`,
      [
        data.wedding_location_type,
        data.wedding_city ?? null,
        data.wedding_country ?? null,
        data.wedding_lat ?? null,
        data.wedding_lng ?? null,
        data.wedding_address ?? null,
        email.trim(),
      ]
    );
    return result;
  }
}
