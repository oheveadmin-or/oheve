import { pool } from '../config/database';

export interface RSVPAnswerRow {
  id: string;
  wedding_slug: string;
  form_id: string | null;
  invite_token: string | null;
  firstname: string;
  lastname: string;
  email: string | null;
  phone: string | null;
  dietary_restrictions: string | null;
  dietary_selections: string[];
  drink_preference: string | null;
  events: Record<string, { attending: boolean; guestCount?: number }>;
  message: string | null;
  submitted_at: string;
}

export interface CreateRSVPInput {
  weddingSlug: string;
  formId?: string;
  inviteToken?: string;
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
  dietaryRestrictions?: string;
  dietarySelections?: string[];
  drinkPreference?: string;
  events: Record<string, { attending: boolean; guestCount?: number }>;
  message?: string;
}

export class RSVPRepository {
  async insert(data: CreateRSVPInput): Promise<RSVPAnswerRow> {
    const result = await pool.query(
      `INSERT INTO rsvp_answers
        (wedding_slug, form_id, invite_token, firstname, lastname, email, phone,
         dietary_restrictions, dietary_selections, drink_preference, events, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12)
       RETURNING *`,
      [
        data.weddingSlug,
        data.formId ?? null,
        data.inviteToken ?? null,
        data.firstname,
        data.lastname,
        data.email ?? null,
        data.phone ?? null,
        data.dietaryRestrictions ?? null,
        JSON.stringify(data.dietarySelections ?? []),
        data.drinkPreference ?? null,
        JSON.stringify(data.events),
        data.message ?? null,
      ]
    );
    return result.rows[0];
  }

  async findBySlug(slug: string): Promise<RSVPAnswerRow[]> {
    const result = await pool.query(
      `SELECT * FROM rsvp_answers WHERE wedding_slug = $1 ORDER BY submitted_at DESC`,
      [slug.toLowerCase()]
    );
    return result.rows;
  }

  async savePushToken(userId: number, weddingSlug: string, expoPushToken: string): Promise<void> {
    await pool.query(
      `INSERT INTO rsvp_push_tokens (user_id, wedding_slug, expo_push_token)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, wedding_slug) DO UPDATE SET expo_push_token = $3`,
      [userId, weddingSlug.toLowerCase(), expoPushToken]
    );
  }

  async getPushTokensForSlug(slug: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT expo_push_token FROM rsvp_push_tokens WHERE wedding_slug = $1 AND expo_push_token IS NOT NULL`,
      [slug.toLowerCase()]
    );
    return result.rows.map((r) => r.expo_push_token);
  }
}

export const rsvpRepository = new RSVPRepository();
