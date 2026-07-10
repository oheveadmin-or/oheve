import { pool } from '../config/database';

export interface PhotoRow {
  id: number;
  prestataire_id: number;
  url: string;
  filename: string;
  is_cover: boolean;
  caption?: string | null;
  created_at: string;
}

export class PhotosRepository {
  async findByPrestataire(prestataireId: number): Promise<PhotoRow[]> {
    const r = await pool.query(
      `SELECT * FROM prestataire_photos WHERE prestataire_id=$1 ORDER BY is_cover DESC, created_at ASC`,
      [prestataireId]
    );
    return r.rows as PhotoRow[];
  }

  async insert(prestataireId: number, url: string, filename: string, caption?: string | null): Promise<PhotoRow> {
    const hasCover = await pool.query(
      `SELECT 1 FROM prestataire_photos WHERE prestataire_id=$1 AND is_cover=true LIMIT 1`,
      [prestataireId]
    );
    const isCover = hasCover.rowCount === 0;
    const r = await pool.query(
      `INSERT INTO prestataire_photos (prestataire_id, url, filename, is_cover, caption)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [prestataireId, url, filename, isCover, caption?.trim() || null]
    );
    return r.rows[0] as PhotoRow;
  }

  async updateCaption(prestataireId: number, photoId: number, caption: string): Promise<PhotoRow | null> {
    const r = await pool.query(
      `UPDATE prestataire_photos SET caption=$1 WHERE id=$2 AND prestataire_id=$3 RETURNING *`,
      [caption.trim() || null, photoId, prestataireId]
    );
    return (r.rows[0] as PhotoRow) ?? null;
  }

  async setCover(prestataireId: number, photoId: number): Promise<void> {
    await pool.query(
      `UPDATE prestataire_photos SET is_cover=false WHERE prestataire_id=$1`,
      [prestataireId]
    );
    await pool.query(
      `UPDATE prestataire_photos SET is_cover=true WHERE id=$1 AND prestataire_id=$2`,
      [photoId, prestataireId]
    );
  }

  async delete(prestataireId: number, photoId: number): Promise<PhotoRow | null> {
    const r = await pool.query(
      `DELETE FROM prestataire_photos WHERE id=$1 AND prestataire_id=$2 RETURNING *`,
      [photoId, prestataireId]
    );
    const deleted = r.rows[0] as PhotoRow | undefined;
    if (!deleted) return null;
    // Si on supprime la couverture, la prochaine photo devient couverture
    if (deleted.is_cover) {
      await pool.query(
        `UPDATE prestataire_photos SET is_cover=true
         WHERE id=(SELECT id FROM prestataire_photos WHERE prestataire_id=$1 ORDER BY created_at ASC LIMIT 1)`,
        [prestataireId]
      );
    }
    return deleted;
  }

  async findFeedPhotos(limit: number, offset: number, viewerUserId?: number): Promise<(PhotoRow & { business_name: string; category: string; prenom: string; nom: string; like_count: number; comment_count: number; liked_by_me: boolean; caption?: string | null })[]> {
    const r = await pool.query(
      `SELECT pp.id, pp.filename, pp.is_cover, pp.caption, pp.created_at,
              p.business_name, p.category,
              u.id AS user_id, u.prenom, u.nom,
              COUNT(DISTINCT pl.id)::int AS like_count,
              COUNT(DISTINCT pc.id)::int AS comment_count,
              bool_or(pl2.user_id IS NOT NULL) AS liked_by_me
       FROM prestataire_photos pp
       JOIN prestataire_profiles p ON pp.prestataire_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN photo_likes pl ON pl.photo_id = pp.id
       LEFT JOIN photo_comments pc ON pc.photo_id = pp.id
       LEFT JOIN photo_likes pl2 ON pl2.photo_id = pp.id AND pl2.user_id = $3
       WHERE COALESCE(p.is_hidden, false) = false AND COALESCE(p.is_suspended, false) = false
       GROUP BY pp.id, pp.caption, p.business_name, p.category, u.id, u.prenom, u.nom
       ORDER BY pp.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, viewerUserId ?? 0]
    );
    return r.rows;
  }

  async toggleLike(photoId: number, userId: number): Promise<{ liked: boolean; like_count: number }> {
    const existing = await pool.query(`SELECT id FROM photo_likes WHERE photo_id=$1 AND user_id=$2`, [photoId, userId]);
    if (existing.rowCount && existing.rowCount > 0) {
      await pool.query(`DELETE FROM photo_likes WHERE photo_id=$1 AND user_id=$2`, [photoId, userId]);
    } else {
      await pool.query(`INSERT INTO photo_likes(photo_id, user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [photoId, userId]);
    }
    const count = await pool.query(`SELECT COUNT(*)::int AS cnt FROM photo_likes WHERE photo_id=$1`, [photoId]);
    return { liked: !(existing.rowCount && existing.rowCount > 0), like_count: count.rows[0].cnt };
  }

  async addComment(photoId: number, userId: number, text: string): Promise<{ id: number; text: string; prenom: string; nom: string; created_at: string }> {
    const r = await pool.query(
      `INSERT INTO photo_comments(photo_id, user_id, text) VALUES($1,$2,$3) RETURNING id, text, created_at`,
      [photoId, userId, text.trim()]
    );
    const u = await pool.query(`SELECT prenom, nom FROM users WHERE id=$1`, [userId]);
    return { ...r.rows[0], prenom: u.rows[0]?.prenom ?? '', nom: u.rows[0]?.nom ?? '' };
  }

  async getComments(photoId: number): Promise<{ id: number; text: string; prenom: string; nom: string; created_at: string }[]> {
    const r = await pool.query(
      `SELECT pc.id, pc.text, pc.created_at, u.prenom, u.nom
       FROM photo_comments pc JOIN users u ON pc.user_id = u.id
       WHERE pc.photo_id = $1 ORDER BY pc.created_at ASC`,
      [photoId]
    );
    return r.rows;
  }

  async findPrestataireIdByUserId(userId: number): Promise<number | null> {
    const r = await pool.query(
      `SELECT id FROM prestataire_profiles WHERE user_id=$1 LIMIT 1`,
      [userId]
    );
    return r.rows[0]?.id ?? null;
  }

  async countByPrestataire(prestataireId: number): Promise<number> {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM prestataire_photos WHERE prestataire_id=$1`,
      [prestataireId]
    );
    return r.rows[0]?.cnt ?? 0;
  }

  async getUserSubscription(userId: number): Promise<{ role: string; subscription_plan: string | null; subscription_status: string | null; presta_sub_status: string | null } | null> {
    const r = await pool.query(
      `SELECT role, subscription_plan, subscription_status, presta_sub_status FROM users WHERE id=$1`,
      [userId]
    );
    return r.rows[0] ?? null;
  }
}
