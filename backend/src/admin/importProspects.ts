/**
 * Import en masse de prestataires « prospects » (listes de prospection) :
 * un compte prestataire par fiche, connexion par IDENTIFIANT (email technique
 * jamais affiché ni mailé), mot de passe généré gardé pour l'admin, fiche
 * annuaire visible tout de suite, SANS abonnement (le prestataire s'abonne
 * s'il le souhaite après sa 1re connexion).
 *
 * Les infos de prospection (liste d'origine, email public, statut « à
 * confirmer », remarques) vont dans `admin_presta_import`, table RÉSERVÉE à
 * l'admin : surtout pas dans prestataire_profiles, lue en entier (`p.*`) par
 * l'annuaire public et lisible via l'API Supabase.
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Pool } from 'pg';

import { USERNAME_RULE, placeholderEmail } from '../auth/username';
import { findIn, loadExisting, lockPrestaCreation } from './duplicates';

export type ProspectRow = {
  source: string;          // clé de la liste : lieux-paris, lieux-lyon, lieux-marseille-aix, traiteurs-casher-paris
  business_name: string;
  category: string;        // clé de lib/presta-categories (salle, traiteur…)
  city: string | null;
  description: string | null;
  phone: string | null;
  contact_email: string | null;
  instagram: string | null;
  website: string | null;
  admin_notes: string | null;
  source_ref: string | null; // n° ou rubrique dans le PDF
};

/** Table admin-only + RLS (refus par défaut pour les rôles publics Supabase). */
export async function ensureProspectSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_presta_import (
      user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      source        TEXT NOT NULL,
      source_ref    TEXT,
      contact_email TEXT,
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_presta_import_source ON admin_presta_import(source)`);
  // Le backend se connecte en propriétaire des tables (RLS ignorée pour lui) ;
  // sans policy, les rôles anon/authenticated de Supabase n'y lisent rien.
  await pool.query(`ALTER TABLE admin_presta_import ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE admin_presta_credentials ENABLE ROW LEVEL SECURITY`);
}

const PWD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generatePassword(): string {
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => PWD_CHARS[b % PWD_CHARS.length]).join('');
}

/** « Pavillon d'Armenonville » → « pavillon-armenonville » (règle USERNAME_RULE). */
export function slugify(name: string, max = 24): string {
  const base = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'a', 'au', 'aux', 'et'].includes(w))
    .join('-');
  let s = base.slice(0, max).replace(/-+$/, '');
  if (s.length < 3) s = `${s || 'presta'}-oh`;
  return s;
}

export type ImportResult = { created: number; skipped: number; rows: { id: number; username: string; password: string; business_name: string; source: string }[] };

/**
 * Crée les comptes. Idempotent : une fiche déjà présente (même nom + ville ou
 * même téléphone, voir duplicates.ts) est ignorée, on peut relancer sans doublon.
 */
export async function importProspects(pool: Pool, rows: ProspectRow[]): Promise<ImportResult> {
  await ensureProspectSchema(pool);

  const taken = new Set<string>(
    (await pool.query(`SELECT LOWER(username) AS u FROM users WHERE username IS NOT NULL`)).rows.map((r) => r.u as string),
  );
  const already = new Set<string>(
    (await pool.query(
      `SELECT api.source || '|' || LOWER(pp.business_name) AS k
       FROM admin_presta_import api JOIN prestataire_profiles pp ON pp.user_id = api.user_id`,
    )).rows.map((r) => r.k as string),
  );

  const pickUsername = (r: ProspectRow) => {
    const base = slugify(r.business_name);
    const cands = [base];
    if (r.city) cands.push(`${slugify(r.business_name, 17)}-${slugify(r.city, 12)}`.slice(0, 30).replace(/-+$/, ''));
    for (let i = 2; i < 100; i++) cands.push(`${base.slice(0, 26)}-${i}`);
    const u = cands.find((c) => USERNAME_RULE.test(c) && !taken.has(c));
    if (!u) throw new Error(`Aucun identifiant libre pour ${r.business_name}`);
    taken.add(u);
    return u;
  };

  const result: ImportResult = { created: 0, skipped: 0, rows: [] };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockPrestaCreation(client);
    // Anti-doublon toutes listes confondues : un prestataire déjà présent
    // (même nom + ville, ou même téléphone), créé à la main ou importé depuis
    // une autre liste, n'est pas recréé.
    const existing = await loadExisting(client);
    for (const r of rows) {
      const key = `${r.source}|${r.business_name.toLowerCase()}`;
      if (already.has(key) || findIn(existing, { business_name: r.business_name, city: r.city, phone: r.phone })) {
        result.skipped++; continue;
      }
      already.add(key);
      const username = pickUsername(r);
      const password = generatePassword();
      const hash = await bcrypt.hash(password, 10);
      const name = r.business_name.slice(0, 100);
      const u = await client.query(
        `INSERT INTO users (email, nom, prenom, mot_de_passe, role, phone, username, must_change_password)
         VALUES ($1,$2,$3,$4,'prestataire',$5,$6,true) RETURNING id`,
        [placeholderEmail(username), name, name, hash, r.phone, username],
      );
      const id = u.rows[0].id as number;
      await client.query(
        `INSERT INTO prestataire_profiles
           (user_id, business_name, category, description, location_city, phone, instagram_url, website_url, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [id, r.business_name.slice(0, 200), r.category, r.description, r.city, r.phone, r.instagram, r.website],
      );
      await client.query(
        `INSERT INTO admin_presta_credentials (user_id, email, password) VALUES ($1,$2,$3)`,
        [id, username, password],
      );
      await client.query(
        `INSERT INTO admin_presta_import (user_id, source, source_ref, contact_email, notes) VALUES ($1,$2,$3,$4,$5)`,
        [id, r.source, r.source_ref, r.contact_email, r.admin_notes],
      );
      existing.push({ id, business_name: r.business_name, username, city: r.city, phone: r.phone });
      result.created++;
      result.rows.push({ id, username, password, business_name: r.business_name, source: r.source });
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return result;
}
