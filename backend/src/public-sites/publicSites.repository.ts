import { pool } from '../config/database';

export interface PublicSiteRow {
  id: number;
  user_id: number;
  slug: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  location: string | null;
  phone: string | null;
  template_id: string | null;
  custom_text: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export class PublicSitesRepository {
  async slugExists(slug: string): Promise<boolean> {
    const r = await pool.query(`SELECT 1 FROM public_sites WHERE slug = $1 LIMIT 1`, [slug]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async insert(row: {
    userId: number;
    slug: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
    location: string;
    phone: string;
    templateId: string;
    customText: string;
    isPublished: boolean;
  }): Promise<{ id: number; slug: string }> {
    const result = await pool.query(
      `INSERT INTO public_sites (
        user_id, slug, bride_name, groom_name, wedding_date,
        location, phone, template_id, custom_text, is_published
      ) VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10)
      RETURNING id, slug`,
      [
        row.userId,
        row.slug,
        row.brideName,
        row.groomName,
        row.weddingDate,
        row.location || null,
        row.phone || null,
        row.templateId || null,
        row.customText || null,
        row.isPublished,
      ]
    );
    return result.rows[0];
  }

  async findPublishedBySlug(slug: string): Promise<PublicSiteRow | null> {
    const result = await pool.query(
      `SELECT id, user_id, slug, bride_name, groom_name, wedding_date,
              location, phone, template_id, custom_text, is_published,
              site_config, invite_links, created_at, updated_at
       FROM public_sites WHERE slug = $1 AND is_published = true LIMIT 1`,
      [slug]
    );
    return result.rows[0] ?? null;
  }

  async findByUserId(userId: number): Promise<PublicSiteRow | null> {
    const result = await pool.query(
      `SELECT id, user_id, slug, bride_name, groom_name, wedding_date,
              location, phone, template_id, custom_text, is_published,
              site_config, invite_links, created_at, updated_at
       FROM public_sites WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  async updateSiteConfig(userId: number, slug: string, siteConfig: unknown, inviteLinks: unknown): Promise<void> {
    await pool.query(
      `UPDATE public_sites SET site_config = $1::jsonb, invite_links = $2::jsonb, updated_at = NOW()
       WHERE slug = $3 AND user_id = $4`,
      [JSON.stringify(siteConfig ?? null), JSON.stringify(inviteLinks ?? []), slug, userId]
    );
  }
}
