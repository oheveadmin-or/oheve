import { pool } from '../config/database';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Envoie une notification push Expo à tous les appareils d'un utilisateur.
 * Fire-and-forget : ne jette jamais (une notif ratée ne doit pas faire
 * échouer l'action métier qui la déclenche).
 */
export async function sendPushToUser(userId: number, title: string, body: string): Promise<void> {
  try {
    const r = await pool.query<{ token: string }>(
      `SELECT token FROM push_tokens WHERE user_id = $1`,
      [userId],
    );
    const tokens = r.rows.map((row) => row.token);
    if (!tokens.length) return;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: 'default', title, body }))),
    });
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}
