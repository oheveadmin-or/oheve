import { pool } from '../config/database';

// ── Communauté Oheve ──────────────────────────────────────────────────────────
// Un salon commun où les mariés (rôle « client ») discutent entre eux.
// Les messages supprimés sont conservés en « soft delete » (deleted_at) : une
// réponse à un message supprimé affiche alors « Message supprimé » au lieu de
// disparaître, et l'admin garde la trace en cas de signalement.

export const COMMUNITY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS community_rooms (
     id         SERIAL PRIMARY KEY,
     slug       VARCHAR(40) NOT NULL UNIQUE,
     name       TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `INSERT INTO community_rooms (slug, name) VALUES ('general', 'Communauté Oheve')
   ON CONFLICT (slug) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS community_messages (
     id          SERIAL PRIMARY KEY,
     room_id     INTEGER NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE,
     user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     content     TEXT NOT NULL,
     reply_to_id INTEGER REFERENCES community_messages(id) ON DELETE SET NULL,
     deleted_at  TIMESTAMPTZ,
     deleted_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_community_messages_room ON community_messages(room_id, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_community_messages_user ON community_messages(user_id)`,
  `CREATE TABLE IF NOT EXISTS community_reports (
     id               SERIAL PRIMARY KEY,
     reporter_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     message_id       INTEGER REFERENCES community_messages(id) ON DELETE CASCADE,
     reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     reason           TEXT NOT NULL DEFAULT '',
     status           VARCHAR(20) NOT NULL DEFAULT 'open',
     created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     resolved_at      TIMESTAMPTZ,
     resolved_by      INTEGER REFERENCES users(id) ON DELETE SET NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status, created_at DESC)`,
  // Un même marié ne signale pas deux fois le même message.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reports_once
     ON community_reports(reporter_id, message_id) WHERE message_id IS NOT NULL`,
  // Bannissement par l'admin : le marié ne peut plus lire ni écrire.
  `CREATE TABLE IF NOT EXISTS community_bans (
     user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     banned_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
     reason     TEXT NOT NULL DEFAULT '',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  // Blocage personnel : je ne vois plus les messages de cette personne
  // (exigence Apple 1.2 pour le contenu généré par les utilisateurs).
  `CREATE TABLE IF NOT EXISTS community_user_blocks (
     blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (blocker_id, blocked_id)
   )`,
];

export async function ensureCommunitySchema(): Promise<void> {
  for (const sql of COMMUNITY_SCHEMA) await pool.query(sql);
}

export interface CommunityMessage {
  id: number;
  user_id: number;
  content: string | null;
  created_at: string;
  deleted: boolean;
  prenom: string;
  nom: string;
  avatar_url: string | null;
  is_admin: boolean;
  reply_to: null | { id: number; prenom: string; content: string | null; deleted: boolean };
}

const MESSAGE_SELECT = `
  SELECT m.id, m.user_id, m.created_at,
         (m.deleted_at IS NOT NULL) AS deleted,
         CASE WHEN m.deleted_at IS NULL THEN m.content ELSE NULL END AS content,
         u.prenom, u.nom, u.avatar_url, (u.role = 'admin') AS is_admin,
         CASE WHEN r.id IS NULL THEN NULL ELSE json_build_object(
           'id', r.id,
           'prenom', ru.prenom,
           'content', CASE WHEN r.deleted_at IS NULL THEN LEFT(r.content, 140) ELSE NULL END,
           'deleted', r.deleted_at IS NOT NULL
         ) END AS reply_to
    FROM community_messages m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN community_messages r ON r.id = m.reply_to_id
    LEFT JOIN users ru ON ru.id = r.user_id`;

export class CommunityRepository {
  async generalRoomId(): Promise<number> {
    const r = await pool.query<{ id: number }>(`SELECT id FROM community_rooms WHERE slug='general'`);
    return r.rows[0].id;
  }

  async isBanned(userId: number): Promise<boolean> {
    const r = await pool.query(`SELECT 1 FROM community_bans WHERE user_id=$1`, [userId]);
    return r.rowCount! > 0;
  }

  /** Les `limit` messages les plus récents (ou antérieurs à `before`), du plus ancien au plus récent.
   *  Les messages des personnes que `viewerId` a bloquées sont exclus. */
  async listMessages(roomId: number, viewerId: number, limit: number, before?: number): Promise<CommunityMessage[]> {
    const params: unknown[] = [roomId, viewerId, limit];
    let beforeSql = '';
    if (before) { params.push(before); beforeSql = `AND m.id < $4`; }
    const r = await pool.query(
      `SELECT * FROM (
         ${MESSAGE_SELECT}
          WHERE m.room_id = $1 ${beforeSql}
            AND NOT EXISTS (SELECT 1 FROM community_user_blocks b WHERE b.blocker_id=$2 AND b.blocked_id=m.user_id)
          ORDER BY m.id DESC
          LIMIT $3
       ) t ORDER BY id ASC`,
      params,
    );
    return r.rows;
  }

  async getMessage(id: number): Promise<CommunityMessage | null> {
    const r = await pool.query(`${MESSAGE_SELECT} WHERE m.id=$1`, [id]);
    return r.rows[0] ?? null;
  }

  async rawMessage(id: number): Promise<{ id: number; user_id: number; room_id: number; deleted_at: string | null; content: string } | null> {
    const r = await pool.query(`SELECT id, user_id, room_id, deleted_at, content FROM community_messages WHERE id=$1`, [id]);
    return r.rows[0] ?? null;
  }

  async countRecentByUser(userId: number, seconds: number): Promise<number> {
    const r = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM community_messages WHERE user_id=$1 AND created_at > NOW() - ($2 || ' seconds')::interval`,
      [userId, String(seconds)],
    );
    return r.rows[0].n;
  }

  async insertMessage(roomId: number, userId: number, content: string, replyToId: number | null): Promise<number> {
    const r = await pool.query<{ id: number }>(
      `INSERT INTO community_messages (room_id, user_id, content, reply_to_id) VALUES ($1,$2,$3,$4) RETURNING id`,
      [roomId, userId, content, replyToId],
    );
    return r.rows[0].id;
  }

  async softDelete(id: number, by: number): Promise<void> {
    await pool.query(
      `UPDATE community_messages SET deleted_at=NOW(), deleted_by=$2 WHERE id=$1 AND deleted_at IS NULL`,
      [id, by],
    );
  }

  /** Renvoie false si ce signalement existait déjà. */
  async report(reporterId: number, reportedUserId: number, messageId: number | null, reason: string): Promise<boolean> {
    const r = await pool.query(
      `INSERT INTO community_reports (reporter_id, reported_user_id, message_id, reason)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [reporterId, reportedUserId, messageId, reason],
    );
    return r.rowCount! > 0;
  }

  async block(blockerId: number, blockedId: number): Promise<void> {
    await pool.query(
      `INSERT INTO community_user_blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [blockerId, blockedId],
    );
  }

  async unblock(blockerId: number, blockedId: number): Promise<void> {
    await pool.query(`DELETE FROM community_user_blocks WHERE blocker_id=$1 AND blocked_id=$2`, [blockerId, blockedId]);
  }

  async listBlocks(blockerId: number) {
    const r = await pool.query(
      `SELECT u.id, u.prenom, u.nom, u.avatar_url, b.created_at
         FROM community_user_blocks b JOIN users u ON u.id=b.blocked_id
        WHERE b.blocker_id=$1 ORDER BY b.created_at DESC`,
      [blockerId],
    );
    return r.rows;
  }

  async userBasic(id: number): Promise<{ id: number; role: string; prenom: string; nom: string } | null> {
    const r = await pool.query(`SELECT id, role, prenom, nom FROM users WHERE id=$1`, [id]);
    return r.rows[0] ?? null;
  }

  async pushTokens(userId: number): Promise<string[]> {
    try {
      const r = await pool.query<{ token: string }>(`SELECT token FROM push_tokens WHERE user_id=$1`, [userId]);
      return r.rows.map((x) => x.token);
    } catch {
      return [];
    }
  }

  // ── Administration ──────────────────────────────────────────────────────────

  async listReports(status: string) {
    const r = await pool.query(
      `SELECT rp.id, rp.reason, rp.status, rp.created_at, rp.message_id,
              rp.reported_user_id, ru.prenom AS reported_prenom, ru.nom AS reported_nom,
              rp.reporter_id, rr.prenom AS reporter_prenom, rr.nom AS reporter_nom,
              m.content AS message_content, (m.deleted_at IS NOT NULL) AS message_deleted,
              EXISTS (SELECT 1 FROM community_bans b WHERE b.user_id=rp.reported_user_id) AS reported_banned
         FROM community_reports rp
         JOIN users ru ON ru.id=rp.reported_user_id
         JOIN users rr ON rr.id=rp.reporter_id
         LEFT JOIN community_messages m ON m.id=rp.message_id
        WHERE ($1 = 'all' OR rp.status=$1)
        ORDER BY rp.created_at DESC LIMIT 200`,
      [status],
    );
    return r.rows;
  }

  async setReportStatus(id: number, status: string, by: number): Promise<boolean> {
    const r = await pool.query(
      `UPDATE community_reports SET status=$2, resolved_at=NOW(), resolved_by=$3 WHERE id=$1`,
      [id, status, by],
    );
    return r.rowCount! > 0;
  }

  async resolveReportsForUser(userId: number, by: number): Promise<void> {
    await pool.query(
      `UPDATE community_reports SET status='resolved', resolved_at=NOW(), resolved_by=$2
        WHERE reported_user_id=$1 AND status='open'`,
      [userId, by],
    );
  }

  async listMembers() {
    const r = await pool.query(
      `SELECT u.id, u.prenom, u.nom, u.email, u.avatar_url,
              COUNT(m.id) FILTER (WHERE m.deleted_at IS NULL)::int AS message_count,
              MAX(m.created_at) AS last_message_at,
              (SELECT COUNT(*)::int FROM community_reports rp WHERE rp.reported_user_id=u.id AND rp.status='open') AS open_reports,
              b.user_id IS NOT NULL AS banned, b.reason AS ban_reason
         FROM users u
         LEFT JOIN community_messages m ON m.user_id=u.id
         LEFT JOIN community_bans b ON b.user_id=u.id
        WHERE u.role='client'
        GROUP BY u.id, b.user_id, b.reason
        ORDER BY (b.user_id IS NOT NULL) DESC, MAX(m.created_at) DESC NULLS LAST, u.id DESC
        LIMIT 500`,
    );
    return r.rows;
  }

  async ban(userId: number, by: number, reason: string): Promise<void> {
    await pool.query(
      `INSERT INTO community_bans (user_id, banned_by, reason) VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET reason=EXCLUDED.reason, banned_by=EXCLUDED.banned_by, created_at=NOW()`,
      [userId, by, reason],
    );
  }

  async unban(userId: number): Promise<void> {
    await pool.query(`DELETE FROM community_bans WHERE user_id=$1`, [userId]);
  }

  async deleteAllMessagesOf(userId: number, by: number): Promise<number> {
    const r = await pool.query(
      `UPDATE community_messages SET deleted_at=NOW(), deleted_by=$2 WHERE user_id=$1 AND deleted_at IS NULL`,
      [userId, by],
    );
    return r.rowCount ?? 0;
  }
}
