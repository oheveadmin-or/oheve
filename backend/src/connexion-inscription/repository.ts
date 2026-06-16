import { pool } from '../config/database';
import { UserRole } from '../auth/jwt';

export interface UserRow {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  phone?: string;
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
  social_provider?: string;
  social_provider_id?: string;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_started_at?: string;
  subscription_expires_at?: string;
  bride_name?: string;
  groom_name?: string;
  created_at: string;
}

export class ConnexionInscriptionRepository {
  async createUser(
    email: string,
    nom: string,
    prenom: string,
    hash: string,
    role: UserRole,
    couple?: { bride_name?: string; groom_name?: string },
  ) {
    const r = await pool.query(
      `INSERT INTO users (email, nom, prenom, mot_de_passe, role, bride_name, groom_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,email,nom,prenom,role,is_active,bride_name,groom_name,created_at`,
      [email, nom, prenom, hash, role, couple?.bride_name ?? null, couple?.groom_name ?? null]
    );
    return r.rows[0] as UserRow;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const r = await pool.query(
      `SELECT id,email,nom,prenom,role,is_active,avatar_url,phone,mot_de_passe,
              date_mariage,budget_mode,budget_global,budget_categories,
              wedding_location_type,wedding_city,wedding_country,
              wedding_lat,wedding_lng,wedding_address,
              subscription_plan,subscription_status,subscription_started_at,subscription_expires_at,
              bride_name,groom_name,premium,premium_purchased_at,created_at
       FROM users WHERE email=$1`,
      [email]
    );
    return r.rows[0] ?? null;
  }

  async findById(id: number): Promise<UserRow | null> {
    const r = await pool.query(
      `SELECT id,email,nom,prenom,role,is_active,avatar_url,phone,
              date_mariage,budget_mode,budget_global,budget_categories,
              wedding_location_type,wedding_city,wedding_country,
              wedding_lat,wedding_lng,wedding_address,
              subscription_plan,subscription_status,subscription_started_at,subscription_expires_at,
              bride_name,groom_name,premium,premium_purchased_at,created_at
       FROM users WHERE id=$1`,
      [id]
    );
    return r.rows[0] ?? null;
  }

  // ── refresh tokens ──────────────────────────────────────────────────────────

  async saveRefreshToken(userId: number, token: string, expiresAt: Date, deviceName?: string) {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id,token,expires_at,device_name)
       VALUES ($1,$2,$3,$4)`,
      [userId, token, expiresAt, deviceName ?? null]
    );
  }

  async findRefreshToken(token: string): Promise<{ user_id: number; expires_at: Date } | null> {
    const r = await pool.query(
      `SELECT user_id,expires_at FROM refresh_tokens WHERE token=$1`,
      [token]
    );
    return r.rows[0] ?? null;
  }

  async deleteRefreshToken(token: string) {
    await pool.query(`DELETE FROM refresh_tokens WHERE token=$1`, [token]);
  }

  async deleteAllRefreshTokens(userId: number) {
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [userId]);
  }

  // ── onboarding updates ──────────────────────────────────────────────────────

  async updateDateMariage(email: string, date: string) {
    return pool.query(
      `UPDATE users SET date_mariage=$1 WHERE email=$2
       RETURNING id,email,nom,prenom,date_mariage,created_at`,
      [date, email]
    );
  }

  async updateBudgetGlobal(email: string, montant: number) {
    return pool.query(
      `UPDATE users SET budget_mode='global',budget_global=$1,budget_categories=NULL WHERE email=$2
       RETURNING id,email,budget_mode,budget_global`,
      [montant, email]
    );
  }

  async updateBudgetCategories(email: string, cats: { photographe: number; salle: number; traiteurs: number }) {
    return pool.query(
      `UPDATE users SET budget_mode='categories',budget_global=NULL,budget_categories=$1 WHERE email=$2
       RETURNING id,email,budget_mode,budget_categories`,
      [JSON.stringify(cats), email]
    );
  }

  async updateWeddingLocation(email: string, data: {
    wedding_location_type: string;
    wedding_city?: string | null;
    wedding_country?: string | null;
    wedding_lat?: number | null;
    wedding_lng?: number | null;
    wedding_address?: string | null;
  }) {
    return pool.query(
      `UPDATE users SET
         wedding_location_type=$1,wedding_city=$2,wedding_country=$3,
         wedding_lat=$4,wedding_lng=$5,wedding_address=$6
       WHERE email=$7
       RETURNING id,email,wedding_location_type,wedding_city,wedding_country,
                 wedding_lat,wedding_lng,wedding_address`,
      [data.wedding_location_type, data.wedding_city ?? null, data.wedding_country ?? null,
       data.wedding_lat ?? null, data.wedding_lng ?? null, data.wedding_address ?? null, email]
    );
  }

  async findOrCreateSocialUser(data: {
    email: string;
    nom: string;
    prenom: string;
    provider: string;
    providerId: string;
    avatarUrl?: string;
  }): Promise<UserRow & { isNew: boolean }> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      if (!existing.social_provider) {
        await pool.query(
          'UPDATE users SET social_provider=$1, social_provider_id=$2 WHERE id=$3',
          [data.provider, data.providerId, existing.id]
        );
      }
      return { ...existing, isNew: false };
    }
    const r = await pool.query(
      `INSERT INTO users (email, nom, prenom, role, social_provider, social_provider_id, avatar_url)
       VALUES ($1, $2, $3, 'client', $4, $5, $6)
       RETURNING id, email, nom, prenom, role, is_active, avatar_url, created_at`,
      [data.email, data.nom || data.email.split('@')[0], data.prenom || '', data.provider, data.providerId, data.avatarUrl ?? null]
    );
    return { ...r.rows[0] as UserRow, isNew: true };
  }

  // ── OTP ─────────────────────────────────────────────────────────────────────

  async saveOtp(email: string, code: string, purpose: string, expiresAt: Date) {
    await pool.query(
      `DELETE FROM otp_codes WHERE email=$1 AND purpose=$2`,
      [email, purpose]
    );
    await pool.query(
      `INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES ($1,$2,$3,$4)`,
      [email, code, purpose, expiresAt]
    );
  }

  async verifyOtp(email: string, code: string, purpose: string): Promise<boolean> {
    const r = await pool.query(
      `SELECT id FROM otp_codes
       WHERE email=$1 AND code=$2 AND purpose=$3 AND used=false AND expires_at > NOW()`,
      [email, code, purpose]
    );
    if (r.rows.length === 0) return false;
    await pool.query(`UPDATE otp_codes SET used=true WHERE id=$1`, [r.rows[0].id]);
    return true;
  }

  async updatePassword(email: string, hash: string): Promise<{ id: number; email: string } | null> {
    const r = await pool.query(
      `UPDATE users SET mot_de_passe=$1 WHERE email=$2 RETURNING id, email`,
      [hash, email]
    );
    return r.rows[0] ?? null;
  }

  async updateRole(userId: number, role: string) {
    const r = await pool.query(
      `UPDATE users SET role=$1 WHERE id=$2 RETURNING id,email,nom,prenom,role,is_active,avatar_url,phone,created_at`,
      [role, userId]
    );
    return r.rows[0] ?? null;
  }

  async updateProfile(userId: number, data: {
    nom?: string;
    prenom?: string;
    phone?: string;
    avatar_url?: string;
    bride_name?: string;
    groom_name?: string;
  }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (data.nom !== undefined) { sets.push(`nom=$${i++}`); vals.push(data.nom); }
    if (data.prenom !== undefined) { sets.push(`prenom=$${i++}`); vals.push(data.prenom); }
    if (data.phone !== undefined) { sets.push(`phone=$${i++}`); vals.push(data.phone); }
    if (data.avatar_url !== undefined) { sets.push(`avatar_url=$${i++}`); vals.push(data.avatar_url); }
    if (data.bride_name !== undefined) { sets.push(`bride_name=$${i++}`); vals.push(data.bride_name); }
    if (data.groom_name !== undefined) { sets.push(`groom_name=$${i++}`); vals.push(data.groom_name); }
    if (sets.length === 0) return null;
    vals.push(userId);
    const r = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${i}
       RETURNING id,email,nom,prenom,role,is_active,avatar_url,phone,bride_name,groom_name,created_at`,
      vals
    );
    return r.rows[0] ?? null;
  }
}
