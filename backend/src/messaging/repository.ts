import { pool } from '../config/database';

export interface ConversationRow {
  id: number;
  client_id: number;
  prestataire_id: number;
  last_message_at?: string;
  created_at: string;
  // joined
  other_nom?: string;
  other_prenom?: string;
  other_avatar?: string;
  other_role?: string;
  business_name?: string;
  last_message?: string;
  unread_count?: number;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  is_read: boolean;
  created_at: string;
  sender_nom?: string;
  sender_prenom?: string;
}

export interface RecipientInfo {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  last_msg_notif_at?: Date | null;
}

export class MessagingRepository {

  async getOrCreateConversation(clientId: number, prestataireId: number): Promise<ConversationRow> {
    const existing = await pool.query(
      `SELECT * FROM conversations WHERE client_id=$1 AND prestataire_id=$2`,
      [clientId, prestataireId]
    );
    if (existing.rows[0]) return existing.rows[0];
    const created = await pool.query(
      `INSERT INTO conversations (client_id,prestataire_id) VALUES ($1,$2) RETURNING *`,
      [clientId, prestataireId]
    );
    return created.rows[0];
  }

  async listForUser(userId: number): Promise<ConversationRow[]> {
    const r = await pool.query(
      `SELECT
         c.*,
         CASE WHEN c.client_id=$1 THEN pu.nom ELSE cu.nom END AS other_nom,
         CASE WHEN c.client_id=$1 THEN pu.prenom ELSE cu.prenom END AS other_prenom,
         CASE WHEN c.client_id=$1 THEN pu.avatar_url ELSE cu.avatar_url END AS other_avatar,
         CASE WHEN c.client_id=$1 THEN pu.role ELSE cu.role END AS other_role,
         pp.business_name,
         (SELECT content FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
         (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id AND sender_id!=$1 AND is_read=false)::int AS unread_count
       FROM conversations c
       JOIN users cu ON cu.id=c.client_id
       JOIN users pu ON pu.id=c.prestataire_id
       LEFT JOIN prestataire_profiles pp ON pp.user_id=c.prestataire_id
       WHERE c.client_id=$1 OR c.prestataire_id=$1
       ORDER BY COALESCE(c.last_message_at,c.created_at) DESC`,
      [userId]
    );
    return r.rows;
  }

  async getConversation(conversationId: number, userId: number): Promise<ConversationRow | null> {
    const r = await pool.query(
      `SELECT * FROM conversations WHERE id=$1 AND (client_id=$2 OR prestataire_id=$2)`,
      [conversationId, userId]
    );
    return r.rows[0] ?? null;
  }

  async getMessages(conversationId: number, limit = 50, before?: number): Promise<MessageRow[]> {
    const vals: unknown[] = [conversationId, limit];
    const beforeClause = before ? `AND m.id < $3` : '';
    if (before) vals.push(before);
    const r = await pool.query(
      `SELECT m.*,u.nom AS sender_nom,u.prenom AS sender_prenom
       FROM messages m JOIN users u ON u.id=m.sender_id
       WHERE m.conversation_id=$1 ${beforeClause}
       ORDER BY m.created_at DESC LIMIT $2`,
      vals
    );
    return r.rows.reverse();
  }

  async sendMessage(conversationId: number, senderId: number, content: string): Promise<MessageRow> {
    await pool.query(
      `UPDATE conversations SET last_message_at=NOW() WHERE id=$1`,
      [conversationId]
    );
    const r = await pool.query(
      `INSERT INTO messages (conversation_id,sender_id,content)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [conversationId, senderId, content.trim()]
    );
    return r.rows[0];
  }

  async sendAttachment(
    conversationId: number,
    senderId: number,
    fileUrl: string,
    fileName: string,
    fileType: string,
    caption: string,
  ): Promise<MessageRow> {
    await pool.query(
      `UPDATE conversations SET last_message_at=NOW() WHERE id=$1`,
      [conversationId]
    );
    const r = await pool.query(
      `INSERT INTO messages (conversation_id,sender_id,content,file_url,file_name,file_type)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [conversationId, senderId, caption, fileUrl, fileName, fileType]
    );
    return r.rows[0];
  }

  async markRead(conversationId: number, userId: number) {
    await pool.query(
      `UPDATE messages SET is_read=true
       WHERE conversation_id=$1 AND sender_id!=$2 AND is_read=false`,
      [conversationId, userId]
    );
  }

  // ── Notifications ────────────────────────────────────────────────────────────

  async getRecipient(conversationId: number, senderId: number): Promise<RecipientInfo | null> {
    const r = await pool.query(
      `SELECT u.id,u.email,u.nom,u.prenom,u.last_msg_notif_at
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.client_id=$2 THEN c.prestataire_id ELSE c.client_id END
       WHERE c.id=$1`,
      [conversationId, senderId]
    );
    return r.rows[0] ?? null;
  }

  async updateLastNotifAt(userId: number) {
    await pool.query(`UPDATE users SET last_msg_notif_at=NOW() WHERE id=$1`, [userId]);
  }

  async upsertPushToken(userId: number, token: string, platform: string) {
    await pool.query(
      `INSERT INTO push_tokens (user_id,token,platform,updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id,token) DO UPDATE SET platform=$3, updated_at=NOW()`,
      [userId, token, platform]
    );
  }

  async deletePushToken(userId: number, token: string) {
    await pool.query(
      `DELETE FROM push_tokens WHERE user_id=$1 AND token=$2`,
      [userId, token]
    );
  }

  async getPushTokensForUser(userId: number): Promise<string[]> {
    const r = await pool.query(
      `SELECT token FROM push_tokens WHERE user_id=$1`,
      [userId]
    );
    return r.rows.map((row) => row.token);
  }

  async getSenderInfo(senderId: number): Promise<{ nom: string; prenom: string } | null> {
    const r = await pool.query(
      `SELECT nom,prenom FROM users WHERE id=$1`,
      [senderId]
    );
    return r.rows[0] ?? null;
  }
}
