import { pool } from '../config/database';

export interface PhotoRow {
  id: number;
  prestataire_id: number;
  url: string;
  filename: string;
  is_cover: boolean;
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

  async insert(prestataireId: number, url: string, filename: string): Promise<PhotoRow> {
    const hasCover = await pool.query(
      `SELECT 1 FROM prestataire_photos WHERE prestataire_id=$1 AND is_cover=true LIMIT 1`,
      [prestataireId]
    );
    const isCover = hasCover.rowCount === 0;
    const r = await pool.query(
      `INSERT INTO prestataire_photos (prestataire_id, url, filename, is_cover)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [prestataireId, url, filename, isCover]
    );
    return r.rows[0] as PhotoRow;
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

  async getUserSubscription(userId: number): Promise<{ role: string; subscription_plan: string | null; subscription_status: string | null } | null> {
    const r = await pool.query(
      `SELECT role, subscription_plan, subscription_status FROM users WHERE id=$1`,
      [userId]
    );
    return r.rows[0] ?? null;
  }
}
