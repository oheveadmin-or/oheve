import { pool } from '../config/database';
import { sqlVisibleEmail } from '../auth/username';

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
  /** Événements couverts ; null/vide = tous (fiches d'avant l'option) */
  event_types?: string[] | null;
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
  cover_filename?: string;
}

export const EVENT_TYPES = ['mariage', 'bar_mitsva', 'bat_mitsva', 'brit_mila'];

/** Garde uniquement les valeurs connues, sans doublon. */
export function sanitizeEventTypes(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return EVENT_TYPES.filter((t) => v.includes(t));
}

/** Condition SQL « la fiche `alias` couvre l'événement `param` » (NULL/vide = tous). */
export function sqlCoversEvent(alias: string, param: string): string {
  return `(${alias}.event_types IS NULL OR cardinality(${alias}.event_types)=0 OR ${param} = ANY(${alias}.event_types))`;
}

/** Événement du compte client qui consulte (null = pas un client → pas de filtre). */
export async function viewerEventType(userId?: number | null): Promise<string | null> {
  if (!userId) return null;
  const r = await pool.query(`SELECT role, to_jsonb(u) ->> 'event_type' AS event_type FROM users u WHERE id=$1`, [userId]);
  const row = r.rows[0] as { role?: string; event_type?: string | null } | undefined;
  if (!row || row.role !== 'client') return null;
  return EVENT_TYPES.includes(String(row.event_type)) ? String(row.event_type) : 'mariage';
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
    /** undefined = inchangé (anciennes versions de l'app ne l'envoient pas) */
    event_types?: string[];
  }) {
    const r = await pool.query(
      `INSERT INTO prestataire_profiles
         (user_id,business_name,category,description,location_city,location_country,
          price_min,price_max,price_range,phone,website_url,instagram_url,event_types,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
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
         event_types=COALESCE(EXCLUDED.event_types, prestataire_profiles.event_types),
         updated_at=NOW()
       RETURNING *`,
      [userId, data.business_name, data.category, data.description ?? null,
       data.location_city ?? null, data.location_country ?? 'France',
       data.price_min ?? null, data.price_max ?? null,
       data.price_range ?? null, data.phone ?? null,
       data.website_url ?? null, data.instagram_url ?? null,
       data.event_types ?? null]
    );
    return r.rows[0] as PrestaProfileRow;
  }

  async findByUserId(userId: number): Promise<PrestaProfileRow | null> {
    const r = await pool.query(
      `SELECT p.*,${sqlVisibleEmail('u.email')} AS email,u.nom,u.prenom,u.avatar_url,
              ph.url AS cover_url, ph.filename AS cover_filename,
              -- Le client ne peut payer que si le prestataire a activé Stripe Connect
              COALESCE(sca.charges_enabled, false) AS payments_enabled
       FROM prestataire_profiles p
       JOIN users u ON u.id=p.user_id
       LEFT JOIN stripe_connect_accounts sca ON sca.user_id=p.user_id
       LEFT JOIN LATERAL (
         SELECT url, filename FROM prestataire_photos
         -- Couverture = une IMAGE (une vidéo ne s'affiche pas en vignette)
         WHERE prestataire_id=p.id AND COALESCE(media_type,'image')='image'
         ORDER BY is_cover DESC, created_at ASC
         LIMIT 1
       ) ph ON true
       WHERE p.user_id=$1`,
      [userId]
    );
    return r.rows[0] ?? null;
  }

  async list(category?: string, city?: string, limit = 50, offset = 0, includeHidden = false, eventType?: string | null) {
    const conditions: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (!includeHidden) {
      conditions.push(`COALESCE(p.is_hidden, false)=false`);
      conditions.push(`COALESCE(p.is_suspended, false)=false`);
      conditions.push(`u.is_active=true`);
      // TOUS les prestataires inscrits sont visibles dans l'annuaire, avec ou
      // sans abonnement actif (2026-11-08) : avant, un prestataire qui
      // publiait des reels pouvait être absent de sa catégorie côté client.
      // Seuls les comptes masqués / suspendus / désactivés par l'admin sortent.
    }
    if (category) { conditions.push(`p.category=$${i++}`); vals.push(category); }
    if (city) { conditions.push(`p.location_city ILIKE $${i++}`); vals.push(`%${city}%`); }
    // Compte Bar Mitsva → seulement les prestataires qui font les Bar Mitsva
    // (les fiches sans choix restent visibles partout).
    if (eventType) { conditions.push(sqlCoversEvent('p', `$${i++}`)); vals.push(eventType); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    vals.push(limit, offset);
    const r = await pool.query(
      `SELECT p.*,${sqlVisibleEmail('u.email')} AS email,u.nom,u.prenom,u.avatar_url,
              u.role AS user_role,u.subscription_plan,u.subscription_status,
              ph.url AS cover_url, ph.filename AS cover_filename
       FROM prestataire_profiles p
       JOIN users u ON u.id=p.user_id
       LEFT JOIN LATERAL (
         SELECT url, filename FROM prestataire_photos
         -- Couverture = une IMAGE (une vidéo ne s'affiche pas en vignette)
         WHERE prestataire_id=p.id AND COALESCE(media_type,'image')='image'
         ORDER BY is_cover DESC, created_at ASC
         LIMIT 1
       ) ph ON true
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
