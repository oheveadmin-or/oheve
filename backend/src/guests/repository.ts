import { pool } from '../config/database';

export type GuestStatus = 'confirmed' | 'declined';

export interface GuestRow {
  id: number;
  user_id: number;
  name: string;
  guest_count: number;
  status: GuestStatus;
  guest_group: string;
  table_name: string | null;
  email: string | null;
  phone: string | null;
  from_rsvp: boolean;
  rsvp_ref: string | null;
  events: Record<string, { attending: boolean; guestCount?: number }> | null;
  manual_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestInput {
  name: string;
  guest_count?: number;
  status?: GuestStatus;
  guest_group?: string;
  table_name?: string | null;
  email?: string | null;
  phone?: string | null;
  from_rsvp?: boolean;
  rsvp_ref?: string | null;
  events?: Record<string, { attending: boolean; guestCount?: number }> | null;
  manual_event_id?: string | null;
}

/** Forme renvoyée à l'app mobile (aligne avec StoredGuest côté client). */
export function toClientGuest(row: GuestRow) {
  return {
    id: String(row.id),
    name: row.name,
    guestCount: row.guest_count,
    status: row.status,
    group: row.guest_group,
    table: row.table_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    fromRSVP: row.from_rsvp,
    events: row.events ?? undefined,
    manualEventId: row.manual_event_id ?? undefined,
  };
}

export class GuestsRepository {
  async list(userId: number): Promise<GuestRow[]> {
    const r = await pool.query(
      `SELECT * FROM wedding_guests WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
      [userId],
    );
    return r.rows as GuestRow[];
  }

  async create(userId: number, g: GuestInput): Promise<GuestRow> {
    const r = await pool.query(
      `INSERT INTO wedding_guests
         (user_id, name, guest_count, status, guest_group, table_name, email, phone, from_rsvp, rsvp_ref, events, manual_event_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        userId,
        g.name,
        g.guest_count ?? 1,
        g.status ?? 'confirmed',
        g.guest_group ?? '',
        g.table_name ?? null,
        g.email ?? null,
        g.phone ?? null,
        g.from_rsvp ?? false,
        g.rsvp_ref ?? null,
        g.events ? JSON.stringify(g.events) : null,
        g.manual_event_id ?? null,
      ],
    );
    return r.rows[0] as GuestRow;
  }

  /**
   * Insertion en masse (import Excel / sync RSVP) avec dédoublonnage côté serveur :
   * - par rsvp_ref si présent (réponses du site),
   * - sinon par nom (insensible à la casse).
   * Renvoie la liste complète à jour.
   */
  async bulkAdd(userId: number, guests: GuestInput[]): Promise<GuestRow[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `SELECT lower(name) AS lname, rsvp_ref FROM wedding_guests WHERE user_id = $1`,
        [userId],
      );
      const seenNames = new Set<string>(existing.rows.map((x) => x.lname));
      const seenRefs = new Set<string>(existing.rows.filter((x) => x.rsvp_ref).map((x) => x.rsvp_ref));

      for (const g of guests) {
        const lname = g.name.trim().toLowerCase();
        if (!lname) continue;
        if (g.rsvp_ref && seenRefs.has(g.rsvp_ref)) continue;
        if (!g.rsvp_ref && seenNames.has(lname)) continue;
        seenNames.add(lname);
        if (g.rsvp_ref) seenRefs.add(g.rsvp_ref);
        await client.query(
          `INSERT INTO wedding_guests
             (user_id, name, guest_count, status, guest_group, table_name, email, phone, from_rsvp, rsvp_ref, events, manual_event_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            userId,
            g.name.trim(),
            g.guest_count ?? 1,
            g.status ?? 'confirmed',
            g.guest_group ?? '',
            g.table_name ?? null,
            g.email ?? null,
            g.phone ?? null,
            g.from_rsvp ?? false,
            g.rsvp_ref ?? null,
            g.events ? JSON.stringify(g.events) : null,
            g.manual_event_id ?? null,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.list(userId);
  }

  async update(id: number, userId: number, updates: Partial<GuestInput>): Promise<GuestRow | null> {
    const allowed: Record<string, string> = {
      name: 'name',
      guest_count: 'guest_count',
      status: 'status',
      guest_group: 'guest_group',
      table_name: 'table_name',
      email: 'email',
      phone: 'phone',
      manual_event_id: 'manual_event_id',
    };
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const [key, col] of Object.entries(allowed)) {
      if (key in updates) {
        sets.push(`${col} = $${i++}`);
        vals.push((updates as Record<string, unknown>)[key]);
      }
    }
    if ('events' in updates) {
      sets.push(`events = $${i++}`);
      vals.push(updates.events ? JSON.stringify(updates.events) : null);
    }
    if (sets.length === 0) {
      const cur = await pool.query(`SELECT * FROM wedding_guests WHERE id = $1 AND user_id = $2`, [id, userId]);
      return (cur.rows[0] as GuestRow) ?? null;
    }
    sets.push(`updated_at = NOW()`);
    vals.push(id, userId);
    const r = await pool.query(
      `UPDATE wedding_guests SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`,
      vals,
    );
    return (r.rows[0] as GuestRow) ?? null;
  }

  async remove(id: number, userId: number): Promise<boolean> {
    const r = await pool.query(`DELETE FROM wedding_guests WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (r.rowCount ?? 0) > 0;
  }
}
