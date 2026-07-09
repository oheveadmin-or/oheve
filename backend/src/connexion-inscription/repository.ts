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
              presta_sub_status,presta_trial_end,presta_current_period_end,
              bride_name,groom_name,premium,premium_purchased_at,created_at
       FROM users WHERE LOWER(email)=LOWER($1)`,
      [email.trim()]
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
              presta_sub_status,presta_trial_end,presta_current_period_end,
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

  async touchRefreshToken(token: string, expiresAt: Date) {
    await pool.query(`UPDATE refresh_tokens SET expires_at=$2 WHERE token=$1`, [token, expiresAt]);
  }

  async deleteRefreshToken(token: string) {
    await pool.query(`DELETE FROM refresh_tokens WHERE token=$1`, [token]);
  }

  async deleteAllRefreshTokens(userId: number) {
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [userId]);
  }

  // ── onboarding updates ──────────────────────────────────────────────────────

  async updateDateMariage(userId: number, date: string) {
    return pool.query(
      `UPDATE users SET date_mariage=$1 WHERE id=$2
       RETURNING id,email,nom,prenom,date_mariage,created_at`,
      [date, userId]
    );
  }

  async updateBudgetGlobal(userId: number, montant: number) {
    return pool.query(
      `UPDATE users SET budget_mode='global',budget_global=$1,budget_categories=NULL WHERE id=$2
       RETURNING id,email,budget_mode,budget_global`,
      [montant, userId]
    );
  }

  async updateBudgetCategories(userId: number, cats: { photographe: number; salle: number; traiteurs: number }) {
    return pool.query(
      `UPDATE users SET budget_mode='categories',budget_global=NULL,budget_categories=$1 WHERE id=$2
       RETURNING id,email,budget_mode,budget_categories`,
      [JSON.stringify(cats), userId]
    );
  }

  async updateWeddingLocation(userId: number, data: {
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
       WHERE id=$7
       RETURNING id,email,wedding_location_type,wedding_city,wedding_country,
                 wedding_lat,wedding_lng,wedding_address`,
      [data.wedding_location_type, data.wedding_city ?? null, data.wedding_country ?? null,
       data.wedding_lat ?? null, data.wedding_lng ?? null, data.wedding_address ?? null, userId]
    );
  }

  // ── Méthodes de connexion (user_auth_providers) ─────────────────────────────

  /** Retrouve l'utilisateur possédant ce provider (google/apple) + ID. */
  async findByProvider(provider: string, providerId: string): Promise<UserRow | null> {
    const r = await pool.query(
      `SELECT u.id FROM user_auth_providers p
       JOIN users u ON u.id = p.user_id
       WHERE p.provider=$1 AND p.provider_user_id=$2`,
      [provider, providerId]
    );
    if (!r.rows[0]) return null;
    return this.findById(r.rows[0].id);
  }

  /** À quel compte ce provider est-il déjà lié ? (null si à personne) */
  async findProviderOwner(provider: string, providerId: string): Promise<number | null> {
    const r = await pool.query(
      `SELECT user_id FROM user_auth_providers WHERE provider=$1 AND provider_user_id=$2`,
      [provider, providerId]
    );
    return r.rows[0]?.user_id ?? null;
  }

  /** Lie un provider à un compte (idempotent pour le même couple user/provider). */
  async linkProvider(userId: number, provider: string, providerId: string, email?: string | null) {
    await pool.query(
      `INSERT INTO user_auth_providers (user_id, provider, provider_user_id, email)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET provider_user_id=EXCLUDED.provider_user_id, email=EXCLUDED.email`,
      [userId, provider, providerId, email ?? null]
    );
    // Colonnes legacy conservées pour compat (affichage admin, anciens builds)
    await pool.query(
      `UPDATE users SET social_provider=$1, social_provider_id=$2
       WHERE id=$3 AND social_provider IS NULL`,
      [provider, providerId, userId]
    );
  }

  async unlinkProvider(userId: number, provider: string): Promise<boolean> {
    const r = await pool.query(
      `DELETE FROM user_auth_providers WHERE user_id=$1 AND provider=$2`,
      [userId, provider]
    );
    if ((r.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE users SET social_provider=NULL, social_provider_id=NULL
         WHERE id=$1 AND social_provider=$2`,
        [userId, provider]
      );
      return true;
    }
    return false;
  }

  /** Méthodes de connexion d'un compte : mot de passe + providers liés. */
  async getAuthMethods(userId: number): Promise<{
    hasPassword: boolean;
    providers: { provider: string; email: string | null; created_at: string }[];
  }> {
    const [pwd, providers] = await Promise.all([
      pool.query(`SELECT (mot_de_passe IS NOT NULL) AS has_password FROM users WHERE id=$1`, [userId]),
      pool.query(
        `SELECT provider, email, created_at FROM user_auth_providers WHERE user_id=$1 ORDER BY created_at`,
        [userId]
      ),
    ]);
    return {
      hasPassword: Boolean(pwd.rows[0]?.has_password),
      providers: providers.rows,
    };
  }

  async setPasswordById(userId: number, hash: string) {
    await pool.query(`UPDATE users SET mot_de_passe=$1 WHERE id=$2`, [hash, userId]);
  }

  /**
   * Connexion sociale — garantit un compte unique par personne :
   * 1. Le provider (google/apple + ID) est déjà lié → on renvoie ce compte.
   *    (Indispensable pour Apple : l'email n'est fourni qu'à la 1ère connexion.)
   * 2. Un compte existe avec le même email → on lui lie le provider (cas 4/5).
   * 3. Sinon → création d'un nouveau compte (cas 3, et cas 6 "Masquer mon email" :
   *    l'email relay ne matche personne, on ne fusionne jamais automatiquement).
   */
  async findOrCreateSocialUser(data: {
    email: string | null;
    nom: string;
    prenom: string;
    provider: string;
    providerId: string;
    avatarUrl?: string;
  }): Promise<UserRow & { isNew: boolean }> {
    // 1. Lookup par provider ID — fonctionne même sans email (Apple, connexions suivantes)
    const byProvider = await this.findByProvider(data.provider, data.providerId);
    if (byProvider) return { ...byProvider, isNew: false };

    // 2. Lookup par email → liaison au compte existant
    if (data.email) {
      const existing = await this.findByEmail(data.email);
      if (existing) {
        await this.linkProvider(existing.id, data.provider, data.providerId, data.email);
        return { ...existing, isNew: false };
      }
    }

    if (!data.email) {
      throw Object.assign(new Error('Email requis pour créer un compte'), { code: 'NO_EMAIL' });
    }

    // 3. Création atomique (compte + provider) — un échec partiel est annulé
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `INSERT INTO users (email, nom, prenom, role, social_provider, social_provider_id, avatar_url)
         VALUES ($1, $2, $3, 'client', $4, $5, $6)
         RETURNING id, email, nom, prenom, role, is_active, avatar_url, created_at`,
        // Jamais la partie locale d'un email relay Apple comme nom : c'est un
        // identifiant opaque ("000416.fd0b…") qui s'affichait comme nom de profil.
        [
          data.email,
          data.nom || (data.email.endsWith('@privaterelay.appleid.com') ? '' : data.email.split('@')[0]),
          data.prenom || '',
          data.provider,
          data.providerId,
          data.avatarUrl ?? null,
        ]
      );
      const user = r.rows[0] as UserRow;
      await client.query(
        `INSERT INTO user_auth_providers (user_id, provider, provider_user_id, email)
         VALUES ($1,$2,$3,$4)`,
        [user.id, data.provider, data.providerId, data.email]
      );
      await client.query('COMMIT');
      return { ...user, isNew: true };
    } catch (err) {
      await client.query('ROLLBACK');
      // Course : le compte vient d'être créé par une requête concurrente → on le récupère
      if ((err as { code?: string }).code === '23505') {
        const raced = (await this.findByProvider(data.provider, data.providerId))
          ?? (await this.findByEmail(data.email));
        if (raced) return { ...raced, isNew: false };
      }
      throw err;
    } finally {
      client.release();
    }
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

  async deleteAccount(userId: number) {
    await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
  }

  async exportData(userId: number): Promise<Record<string, unknown>> {
    const user = await this.findById(userId);
    if (!user) return {};

    const [guests, conversations, payments, publicSite, calendarEvents] = await Promise.all([
      pool.query(`SELECT id,guest_name,attending,guest_count,message,submitted_at FROM rsvp_answers ra
                  JOIN public_sites ps ON ps.slug=ra.site_slug
                  WHERE ps.user_id=$1 ORDER BY ra.submitted_at DESC`, [userId]),
      pool.query(`SELECT id,created_at FROM conversations WHERE client_id=$1 OR prestataire_id=$1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT id,amount_total,currency,status,description,created_at FROM payments WHERE client_id=$1 OR prestataire_id=$1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT id,slug,bride_name,groom_name,wedding_date,location,is_published,created_at FROM public_sites WHERE user_id=$1`, [userId]),
      pool.query(`SELECT id,title,event_date,event_time,location,created_at FROM calendar_events WHERE user_id=$1 ORDER BY event_date DESC`, [userId]),
    ]);

    const { mot_de_passe: _pwd, ...safeUser } = user as typeof user & { mot_de_passe?: string };
    return {
      profile: safeUser,
      guests: guests.rows,
      conversations: conversations.rows,
      payments: payments.rows,
      public_site: publicSite.rows[0] ?? null,
      calendar_events: calendarEvents.rows,
    };
  }

  async updateProfile(userId: number, data: {
    nom?: string;
    prenom?: string;
    phone?: string;
    avatar_url?: string;
    bride_name?: string;
    groom_name?: string;
    date_mariage?: string | null;
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
    if (data.date_mariage !== undefined) { sets.push(`date_mariage=$${i++}`); vals.push(data.date_mariage); }
    if (sets.length === 0) return null;
    vals.push(userId);
    const r = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${i}
       RETURNING id,email,nom,prenom,role,is_active,avatar_url,phone,bride_name,groom_name,date_mariage,created_at`,
      vals
    );
    return r.rows[0] ?? null;
  }
}
