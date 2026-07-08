import { pool } from '../config/database';

export interface PrestaProfileRow {
  id: number;
  user_id: number;
  business_name: string;
  category: string;
  description?: string;
  location_city?: string;
  location_country?: string;
  price_min?: number;
  price_max?: number;
  price_range?: string;
  phone?: string;
  website_url?: string;
  instagram_url?: string;
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  profile_views?: number;
  created_at: string;
  // joined fields
  email?: string;
  nom?: string;
  prenom?: string;
  avatar_url?: string;
  cover_url?: string;
}

export class PrestatairesRepository {
  async upsert(userId: number, data: {
    business_name: string;
    category: string;
    description?: string;
    location_city?: string;
    location_country?: string;
    price_min?: number;
    price_max?: number;
    price_range?: string;
    phone?: string;
    website_url?: string;
    instagram_url?: string;
  }) {
    const r = await pool.query(
      `INSERT INTO prestataire_profiles
         (user_id,business_name,category,description,location_city,location_country,
          price_min,price_max,price_range,phone,website_url,instagram_url,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         business_name=EXCLUDED.business_name,
         category=EXCLUDED.category,
         description=EXCLUDED.description,
         location_city=EXCLUDED.location_city,
         location_country=EXCLUDED.location_country,
         price_min=EXCLUDED.price_min,
         price_max=EXCLUDED.price_max,
         price_range=EXCLUDED.price_range,
         phone=EXCLUDED.phone,
         website_url=EXCLUDED.website_url,
         instagram_url=EXCLUDED.instagram_url,
         updated_at=NOW()
       RETURNING *`,
      [userId, data.business_name, data.category, data.description ?? null,
       data.location_city ?? null, data.location_country ?? 'France',
       data.price_min ?? null, data.price_max ?? null,
       data.price_range ?? null, data.phone ?? null,
       data.website_url ?? null, data.instagram_url ?? null]
    );
    return r.rows[0] as PrestaProfileRow;
  }

  async findByUserId(userId: number): Promise<PrestaProfileRow | null> {
    const r = await pool.query(
      `SELECT p.*,u.email,u.nom,u.prenom,u.avatar_url,
              ph.url AS cover_url
       FROM prestataire_profiles p
       JOIN users u ON u.id=p.user_id
       LEFT JOIN prestataire_photos ph ON ph.prestataire_id=p.id AND ph.is_cover=true
       WHERE p.user_id=$1`,
      [userId]
    );
    return r.rows[0] ?? null;
  }

  async list(category?: string, city?: string, limit = 50, offset = 0, includeHidden = false) {
    const conditions: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (!includeHidden) {
      conditions.push(`COALESCE(p.is_hidden, false)=false`);
      conditions.push(`COALESCE(p.is_suspended, false)=false`);
      conditions.push(`u.is_active=true`);
      // Visible dans le répertoire uniquement si l'abonnement est actif/en essai
      // (les admins restent visibles quoi qu'il arrive).
      conditions.push(`(u.role='admin' OR u.presta_sub_status IN ('trialing','active'))`);
    }
    if (category) { conditions.push(`p.category=$${i++}`); vals.push(category); }
    if (city) { conditions.push(`p.location_city ILIKE $${i++}`); vals.push(`%${city}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    vals.push(limit, offset);
    const r = await pool.query(
      `SELECT p.*,u.email,u.nom,u.prenom,u.avatar_url,
              u.role AS user_role,u.subscription_plan,u.subscription_status,
              ph.url AS cover_url
       FROM prestataire_profiles p
       JOIN users u ON u.id=p.user_id
       LEFT JOIN prestataire_photos ph ON ph.prestataire_id=p.id AND ph.is_cover=true
       ${where}
       ORDER BY
         CASE WHEN u.subscription_plan='plus' AND u.subscription_status='active' THEN 0
              WHEN u.subscription_plan='basic' AND u.subscription_status='active' THEN 1
              ELSE 2 END,
         p.rating DESC,
         p.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      vals
    );
    return r.rows as (PrestaProfileRow & { user_role?: string; subscription_plan?: string; subscription_status?: string })[];
  }

  async setVerified(userId: number, verified: boolean) {
    await pool.query(`UPDATE prestataire_profiles SET is_verified=$1 WHERE user_id=$2`, [verified, userId]);
  }

  /** Incrémente le compteur de vues du profil et renvoie le nouveau total (null si pas de profil). */
  async incrementViews(userId: number): Promise<number | null> {
    const r = await pool.query(
      `UPDATE prestataire_profiles SET profile_views = COALESCE(profile_views, 0) + 1
       WHERE user_id=$1 RETURNING profile_views`,
      [userId]
    );
    return r.rows[0]?.profile_views ?? null;
  }
}
