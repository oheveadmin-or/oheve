/**
 * Détection des comptes prestataires en double.
 *
 * Deux fiches sont considérées comme le même prestataire si :
 *   - même nom d'entreprise (sans accents, majuscules, ponctuation ni
 *     « le/la/les… ») ET même ville — ou l'une des deux sans ville ;
 *   - OU même numéro de téléphone (9 derniers chiffres : « +33 6 … » = « 06 … »).
 *
 * La même règle est recopiée côté app (onglet Identifiants) pour signaler les
 * doublons déjà présents : garder les deux synchronisées.
 */
import type { Pool, PoolClient } from 'pg';

const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'a', 'au', 'aux', 'et', 'the']);

export function normName(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(' ');
}

/** 9 derniers chiffres, ou '' si le numéro est trop court pour être fiable. */
export function normPhone(s: string | null | undefined): string {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
}

export type DuplicateHit = {
  id: number;
  business_name: string;
  username: string | null;
  city: string | null;
  reason: 'nom' | 'telephone';
};

type Candidate = { business_name: string; city?: string | null; phone?: string | null };

function matches(c: Candidate, row: { business_name: string | null; city: string | null; phone: string | null }): DuplicateHit['reason'] | null {
  const n = normName(c.business_name);
  const city = normName(c.city);
  const rowCity = normName(row.city);
  if (n && n === normName(row.business_name) && (!city || !rowCity || city === rowCity)) return 'nom';
  const p = normPhone(c.phone);
  if (p && p === normPhone(row.phone)) return 'telephone';
  return null;
}

type Existing = { id: number; business_name: string | null; username: string | null; city: string | null; phone: string | null };

/** Tous les comptes prestataires/boutiques existants (pour comparer). */
export async function loadExisting(db: Pool | PoolClient): Promise<Existing[]> {
  const r = await db.query(
    `SELECT u.id, pp.business_name, u.username, pp.location_city AS city,
            COALESCE(pp.phone, u.phone) AS phone
     FROM users u JOIN prestataire_profiles pp ON pp.user_id = u.id
     WHERE u.role IN ('prestataire','boutique')`
  );
  return r.rows as Existing[];
}

export function findIn(existing: Existing[], c: Candidate): DuplicateHit | null {
  for (const row of existing) {
    const reason = matches(c, row);
    if (reason) return { id: row.id, business_name: row.business_name ?? '', username: row.username, city: row.city, reason };
  }
  return null;
}

export function duplicateMessage(hit: DuplicateHit): string {
  const who = `« ${hit.business_name} »${hit.city ? ` (${hit.city})` : ''} — ID ${hit.id}${hit.username ? `, identifiant ${hit.username}` : ''}`;
  return hit.reason === 'telephone'
    ? `Doublon : ce numéro de téléphone est déjà celui de ${who}.`
    : `Doublon : ce prestataire existe déjà : ${who}.`;
}

/**
 * Verrou de transaction : deux créations simultanées (double appui sur
 * « Créer ») passent l'une après l'autre, la 2e voit donc la 1re.
 */
export async function lockPrestaCreation(client: PoolClient): Promise<void> {
  await client.query(`SELECT pg_advisory_xact_lock(918273645)`);
}
