import { pool } from '../config/database';

export interface WeddingSiteRow {
  id: string;
  user_id: number | null;
  slug: string;
  couple_name: string;
  groom_name: string;
  bride_name: string;
  date: string;
  time: string;
  city: string;
  venue: string;
  welcome_text: string;
  main_text: string;
  language: string;
  theme: unknown;
  sections: unknown;
  content: unknown;
  rsvp_form: unknown;
  invite_links: unknown;
  created_at: string;
  updated_at: string;
}

export const weddingSitesRepo = {
  async findBySlug(slug: string): Promise<WeddingSiteRow | null> {
    const { rows } = await pool.query(
      `SELECT * FROM wedding_sites WHERE slug = $1 LIMIT 1`,
      [slug.toLowerCase()]
    );
    return rows[0] ?? null;
  },

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT id FROM wedding_sites WHERE slug = $1 ${excludeId ? 'AND id != $2' : ''} LIMIT 1`,
      excludeId ? [slug.toLowerCase(), excludeId] : [slug.toLowerCase()]
    );
    return rows.length > 0;
  },

  async create(data: {
    userId?: number;
    slug: string;
    coupleName: string;
    groomName: string;
    brideName: string;
    date: string;
    time: string;
    city: string;
    venue: string;
    welcomeText: string;
    mainText: string;
    language: string;
    theme: unknown;
    sections: unknown;
    content: unknown;
    rsvpForm: unknown;
    inviteLinks: unknown;
  }): Promise<WeddingSiteRow> {
    const { rows } = await pool.query(
      `INSERT INTO wedding_sites
        (user_id, slug, couple_name, groom_name, bride_name, date, time, city, venue,
         welcome_text, main_text, language, theme, sections, content, rsvp_form, invite_links)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb)
       RETURNING *`,
      [
        data.userId ?? null,
        data.slug.toLowerCase(),
        data.coupleName,
        data.groomName,
        data.brideName,
        data.date,
        data.time ?? '',
        data.city ?? '',
        data.venue ?? '',
        data.welcomeText ?? '',
        data.mainText ?? '',
        data.language ?? 'fr',
        JSON.stringify(data.theme ?? {}),
        JSON.stringify(data.sections ?? {}),
        JSON.stringify(data.content ?? {}),
        JSON.stringify(data.rsvpForm ?? null),
        JSON.stringify(data.inviteLinks ?? []),
      ]
    );
    return rows[0];
  },

  async update(id: string, userId: number | null, data: Partial<{
    slug: string;
    coupleName: string;
    groomName: string;
    brideName: string;
    date: string;
    time: string;
    city: string;
    venue: string;
    welcomeText: string;
    mainText: string;
    language: string;
    theme: unknown;
    sections: unknown;
    content: unknown;
    rsvpForm: unknown;
    inviteLinks: unknown;
  }>): Promise<WeddingSiteRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;

    const add = (col: string, val: unknown, json = false) => {
      sets.push(`${col} = $${i++}${json ? '::jsonb' : ''}`);
      vals.push(json ? JSON.stringify(val) : val);
    };

    if (data.slug !== undefined) add('slug', data.slug.toLowerCase());
    if (data.coupleName !== undefined) add('couple_name', data.coupleName);
    if (data.groomName !== undefined) add('groom_name', data.groomName);
    if (data.brideName !== undefined) add('bride_name', data.brideName);
    if (data.date !== undefined) add('date', data.date);
    if (data.time !== undefined) add('time', data.time);
    if (data.city !== undefined) add('city', data.city);
    if (data.venue !== undefined) add('venue', data.venue);
    if (data.welcomeText !== undefined) add('welcome_text', data.welcomeText);
    if (data.mainText !== undefined) add('main_text', data.mainText);
    if (data.language !== undefined) add('language', data.language);
    if (data.theme !== undefined) add('theme', data.theme, true);
    if (data.sections !== undefined) add('sections', data.sections, true);
    if (data.content !== undefined) add('content', data.content, true);
    if (data.rsvpForm !== undefined) add('rsvp_form', data.rsvpForm, true);
    if (data.inviteLinks !== undefined) add('invite_links', data.inviteLinks, true);

    if (sets.length === 0) return this.findBySlug(id);

    sets.push(`updated_at = NOW()`);

    const whereClause = userId !== null
      ? `WHERE id = $${i++} AND user_id = $${i++}`
      : `WHERE id = $${i++}`;

    const params = userId !== null ? [...vals, id, userId] : [...vals, id];

    const { rows } = await pool.query(
      `UPDATE wedding_sites SET ${sets.join(', ')} ${whereClause} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },
};
