import { pool } from '../config/database';

export type CalendarEventType = 'appointment' | 'task' | 'event';
export type AppointmentStatus = 'pending' | 'accepted' | 'refused' | 'counter_proposed';

export interface CalendarEventRow {
  id: number;
  user_id: number;
  type: CalendarEventType;
  title: string;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  prestataire_id: number | null;
  appointment_request_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySettings {
  prestataire_id: number;
  working_days: number[];
  work_start: string;
  work_end: string;
  slot_duration_minutes: number;
}

export interface BlockedPeriod {
  id: number;
  prestataire_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface AppointmentRequestRow {
  id: number;
  client_id: number;
  prestataire_id: number;
  title: string;
  requested_date: string;
  requested_time: string;
  proposed_date: string | null;
  proposed_time: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  client_prenom?: string;
  client_nom?: string;
  prestataire_name?: string;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

export class CalendarRepository {
  async listEvents(userId: number): Promise<CalendarEventRow[]> {
    const r = await pool.query<CalendarEventRow>(
      `SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY event_date NULLS LAST, event_time NULLS LAST, created_at DESC`,
      [userId],
    );
    return r.rows;
  }

  async createEvent(data: {
    user_id: number;
    type: CalendarEventType;
    title: string;
    description?: string;
    event_date?: string;
    event_time?: string;
    prestataire_id?: number;
    appointment_request_id?: number;
  }): Promise<CalendarEventRow> {
    const r = await pool.query<CalendarEventRow>(
      `INSERT INTO calendar_events (user_id, type, title, description, event_date, event_time, prestataire_id, appointment_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.user_id,
        data.type,
        data.title,
        data.description ?? null,
        data.event_date ?? null,
        data.event_time ?? null,
        data.prestataire_id ?? null,
        data.appointment_request_id ?? null,
      ],
    );
    return r.rows[0];
  }

  async updateEvent(
    id: number,
    userId: number,
    data: Partial<{ title: string; description: string; event_date: string | null; event_time: string | null; type: CalendarEventType }>,
  ): Promise<CalendarEventRow | null> {
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        fields.push(`${k} = $${i++}`);
        vals.push(v);
      }
    }
    if (!fields.length) return null;
    fields.push(`updated_at = NOW()`);
    vals.push(id, userId);
    const r = await pool.query<CalendarEventRow>(
      `UPDATE calendar_events SET ${fields.join(', ')} WHERE id = $${i++} AND user_id = $${i} RETURNING *`,
      vals,
    );
    return r.rows[0] ?? null;
  }

  async deleteEvent(id: number, userId: number): Promise<boolean> {
    const r = await pool.query(`DELETE FROM calendar_events WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (r.rowCount ?? 0) > 0;
  }

  async getAvailabilitySettings(prestataireId: number): Promise<AvailabilitySettings | null> {
    const r = await pool.query<AvailabilitySettings & { working_days: number[] }>(
      `SELECT prestataire_id, working_days, work_start::text, work_end::text, slot_duration_minutes
       FROM provider_availability_settings WHERE prestataire_id = $1`,
      [prestataireId],
    );
    if (!r.rows[0]) return null;
    const row = r.rows[0];
    return {
      ...row,
      work_start: row.work_start.slice(0, 5),
      work_end: row.work_end.slice(0, 5),
      working_days: Array.isArray(row.working_days) ? row.working_days : JSON.parse(String(row.working_days)),
    };
  }

  async upsertAvailabilitySettings(
    prestataireId: number,
    data: { working_days: number[]; work_start: string; work_end: string; slot_duration_minutes: number },
  ): Promise<AvailabilitySettings> {
    const r = await pool.query(
      `INSERT INTO provider_availability_settings (prestataire_id, working_days, work_start, work_end, slot_duration_minutes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (prestataire_id) DO UPDATE SET
         working_days = EXCLUDED.working_days,
         work_start = EXCLUDED.work_start,
         work_end = EXCLUDED.work_end,
         slot_duration_minutes = EXCLUDED.slot_duration_minutes,
         updated_at = NOW()
       RETURNING prestataire_id, working_days, work_start::text, work_end::text, slot_duration_minutes`,
      [prestataireId, JSON.stringify(data.working_days), data.work_start, data.work_end, data.slot_duration_minutes],
    );
    const row = r.rows[0];
    return {
      prestataire_id: row.prestataire_id,
      working_days: Array.isArray(row.working_days) ? row.working_days : JSON.parse(String(row.working_days)),
      work_start: row.work_start.slice(0, 5),
      work_end: row.work_end.slice(0, 5),
      slot_duration_minutes: row.slot_duration_minutes,
    };
  }

  async listBlockedPeriods(prestataireId: number): Promise<BlockedPeriod[]> {
    const r = await pool.query<BlockedPeriod>(
      `SELECT id, prestataire_id, start_date::text, end_date::text, reason
       FROM provider_blocked_periods WHERE prestataire_id = $1 ORDER BY start_date`,
      [prestataireId],
    );
    return r.rows;
  }

  async addBlockedPeriod(
    prestataireId: number,
    data: { start_date: string; end_date: string; reason?: string },
  ): Promise<BlockedPeriod> {
    const r = await pool.query<BlockedPeriod>(
      `INSERT INTO provider_blocked_periods (prestataire_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, prestataire_id, start_date::text, end_date::text, reason`,
      [prestataireId, data.start_date, data.end_date, data.reason ?? null],
    );
    return r.rows[0];
  }

  async deleteBlockedPeriod(id: number, prestataireId: number): Promise<boolean> {
    const r = await pool.query(
      `DELETE FROM provider_blocked_periods WHERE id = $1 AND prestataire_id = $2`,
      [id, prestataireId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async getBookedSlots(prestataireId: number, fromDate: string, toDate: string): Promise<{ date: string; time: string }[]> {
    const r = await pool.query<{ date: string; time: string }>(
      `SELECT requested_date::text AS date, requested_time::text AS time
       FROM appointment_requests
       WHERE prestataire_id = $1
         AND status IN ('pending', 'accepted')
         AND requested_date BETWEEN $2 AND $3
       UNION
       SELECT proposed_date::text AS date, proposed_time::text AS time
       FROM appointment_requests
       WHERE prestataire_id = $1
         AND status = 'counter_proposed'
         AND proposed_date BETWEEN $2 AND $3`,
      [prestataireId, fromDate, toDate],
    );
    return r.rows.map((row) => ({ date: row.date, time: row.time.slice(0, 5) }));
  }

  async computeAvailableSlots(
    prestataireId: number,
    fromDate: string,
    toDate: string,
  ): Promise<{ date: string; slots: string[] }[]> {
    const settings = await this.getAvailabilitySettings(prestataireId);
    if (!settings) return [];

    const blocked = await this.listBlockedPeriods(prestataireId);
    const booked = await this.getBookedSlots(prestataireId, fromDate, toDate);
    const bookedSet = new Set(booked.map((b) => `${b.date}|${b.time}`));

    const startMin = parseTimeToMinutes(settings.work_start);
    const endMin = parseTimeToMinutes(settings.work_end);
    const step = settings.slot_duration_minutes;

    const result: { date: string; slots: string[] }[] = [];
    const from = new Date(`${fromDate}T12:00:00`);
    const to = new Date(`${toDate}T12:00:00`);

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay();

      if (!settings.working_days.includes(dow)) continue;

      const isBlocked = blocked.some(
        (b) => iso >= b.start_date && iso <= b.end_date,
      );
      if (isBlocked) continue;

      const slots: string[] = [];
      for (let m = startMin; m + step <= endMin; m += step) {
        const time = minutesToTime(m).slice(0, 5);
        if (!bookedSet.has(`${iso}|${time}`)) {
          slots.push(time);
        }
      }
      if (slots.length) result.push({ date: iso, slots });
    }
    return result;
  }

  async createAppointmentRequest(data: {
    client_id: number;
    prestataire_id: number;
    title: string;
    requested_date: string;
    requested_time: string;
    notes?: string;
  }): Promise<AppointmentRequestRow> {
    const r = await pool.query<AppointmentRequestRow>(
      `INSERT INTO appointment_requests (client_id, prestataire_id, title, requested_date, requested_time, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'accepted') RETURNING *`,
      [data.client_id, data.prestataire_id, data.title, data.requested_date, data.requested_time, data.notes ?? null],
    );
    const appt = r.rows[0];

    // Ajouter dans le calendrier du client
    await this.createEvent({
      user_id: data.client_id,
      type: 'appointment',
      title: data.title,
      event_date: data.requested_date,
      event_time: data.requested_time,
      prestataire_id: data.prestataire_id,
      appointment_request_id: appt.id,
    });

    // Ajouter dans le calendrier du prestataire
    await this.createEvent({
      user_id: data.prestataire_id,
      type: 'appointment',
      title: data.title,
      event_date: data.requested_date,
      event_time: data.requested_time,
      prestataire_id: data.prestataire_id,
      appointment_request_id: appt.id,
    });

    return {
      ...appt,
      requested_time: String(appt.requested_time).slice(0, 5),
      proposed_time: appt.proposed_time ? String(appt.proposed_time).slice(0, 5) : null,
    };
  }

  async listAppointmentRequests(userId: number, role: string): Promise<AppointmentRequestRow[]> {
    const q =
      role === 'prestataire'
        ? `SELECT ar.*, u.prenom AS client_prenom, u.nom AS client_nom
           FROM appointment_requests ar
           JOIN users u ON u.id = ar.client_id
           WHERE ar.prestataire_id = $1
           ORDER BY ar.created_at DESC`
        : `SELECT ar.*, pp.business_name AS prestataire_name
           FROM appointment_requests ar
           LEFT JOIN prestataire_profiles pp ON pp.user_id = ar.prestataire_id
           WHERE ar.client_id = $1
           ORDER BY ar.created_at DESC`;
    const r = await pool.query<AppointmentRequestRow>(q, [userId]);
    return r.rows.map((row) => ({
      ...row,
      requested_time: String(row.requested_time).slice(0, 5),
      proposed_time: row.proposed_time ? String(row.proposed_time).slice(0, 5) : null,
    }));
  }

  async getAppointmentRequest(id: number): Promise<AppointmentRequestRow | null> {
    const r = await pool.query<AppointmentRequestRow>(`SELECT * FROM appointment_requests WHERE id = $1`, [id]);
    if (!r.rows[0]) return null;
    const row = r.rows[0];
    return {
      ...row,
      requested_time: String(row.requested_time).slice(0, 5),
      proposed_time: row.proposed_time ? String(row.proposed_time).slice(0, 5) : null,
    };
  }

  async respondToAppointment(
    id: number,
    prestataireId: number,
    action: 'accept' | 'refuse' | 'counter',
    counter?: { proposed_date: string; proposed_time: string },
  ): Promise<AppointmentRequestRow | null> {
    const existing = await this.getAppointmentRequest(id);
    if (!existing || existing.prestataire_id !== prestataireId) return null;

    let status: AppointmentStatus;
    let proposed_date: string | null = null;
    let proposed_time: string | null = null;

    if (action === 'accept') {
      status = 'accepted';
    } else if (action === 'refuse') {
      status = 'refused';
    } else {
      status = 'counter_proposed';
      proposed_date = counter?.proposed_date ?? null;
      proposed_time = counter?.proposed_time ?? null;
    }

    const r = await pool.query<AppointmentRequestRow>(
      `UPDATE appointment_requests
       SET status = $1, proposed_date = $2, proposed_time = $3, updated_at = NOW()
       WHERE id = $4 AND prestataire_id = $5 RETURNING *`,
      [status, proposed_date, proposed_time, id, prestataireId],
    );
    const row = r.rows[0];
    if (!row) return null;

    if (action === 'accept') {
      await this.createEvent({
        user_id: existing.client_id,
        type: 'appointment',
        title: existing.title,
        event_date: existing.requested_date,
        event_time: existing.requested_time,
        prestataire_id: prestataireId,
        appointment_request_id: id,
      });
      await this.createEvent({
        user_id: prestataireId,
        type: 'appointment',
        title: existing.title,
        event_date: existing.requested_date,
        event_time: existing.requested_time,
        prestataire_id: prestataireId,
        appointment_request_id: id,
      });
    }

    return {
      ...row,
      requested_time: String(row.requested_time).slice(0, 5),
      proposed_time: row.proposed_time ? String(row.proposed_time).slice(0, 5) : null,
    };
  }

  async countUpcomingAppointments(userId: number): Promise<number> {
    const r = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM calendar_events
       WHERE user_id = $1 AND type = 'appointment'
         AND (event_date IS NULL OR event_date >= CURRENT_DATE)`,
      [userId],
    );
    return parseInt(r.rows[0]?.count ?? '0', 10);
  }

  async listUpcomingAppointments(userId: number, limit = 3): Promise<CalendarEventRow[]> {
    const r = await pool.query<CalendarEventRow>(
      `SELECT * FROM calendar_events
       WHERE user_id = $1 AND type = 'appointment'
         AND event_date IS NOT NULL AND event_date >= CURRENT_DATE
       ORDER BY event_date, event_time NULLS LAST
       LIMIT $2`,
      [userId, limit],
    );
    return r.rows;
  }
}
