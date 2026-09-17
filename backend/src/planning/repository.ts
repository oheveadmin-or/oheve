import { pool } from '../config/database';

/**
 * Domaines de planification partagés entre les appareils d'un même compte.
 * `todo` et `budget` alimentent la progression affichée sur l'accueil ;
 * `providers` garde les prestataires épinglés (dont la salle de réception) ;
 * `seating` porte le plan de table (tables, places, dimensions de la salle).
 */
export const PLANNING_SCOPES = ['todo', 'budget', 'providers', 'seating'] as const;
export type PlanningScope = (typeof PLANNING_SCOPES)[number];

export function isPlanningScope(value: unknown): value is PlanningScope {
  return typeof value === 'string' && (PLANNING_SCOPES as readonly string[]).includes(value);
}

export interface PlanningDoc {
  scope: PlanningScope;
  data: unknown;
  revision: number;
  updated_at: string;
}

interface PlanningRow {
  scope: PlanningScope;
  data: unknown;
  revision: string | number;
  updated_at: string;
}

function toDoc(row: PlanningRow): PlanningDoc {
  return {
    scope: row.scope,
    data: row.data,
    // BIGINT arrive en string depuis pg : sans coercition les comparaisons
    // de révision côté client seraient faites sur des chaînes.
    revision: Number(row.revision),
    updated_at: row.updated_at,
  };
}

export class PlanningRepository {
  /** Document d'un domaine, ou null s'il n'a jamais été synchronisé. */
  async get(userId: number, scope: PlanningScope): Promise<PlanningDoc | null> {
    const r = await pool.query(
      `SELECT scope, data, revision, updated_at
         FROM wedding_planning
        WHERE user_id = $1 AND scope = $2`,
      [userId, scope],
    );
    const row = r.rows[0] as PlanningRow | undefined;
    return row ? toDoc(row) : null;
  }

  /** Tous les domaines du compte, pour une synchro complète au démarrage. */
  async getAll(userId: number): Promise<PlanningDoc[]> {
    const r = await pool.query(
      `SELECT scope, data, revision, updated_at
         FROM wedding_planning
        WHERE user_id = $1`,
      [userId],
    );
    return (r.rows as PlanningRow[]).map(toDoc);
  }

  /**
   * Écrit un document et incrémente sa révision.
   *
   * `expectedRevision` protège des écrasements entre les deux téléphones d'un
   * couple : si la révision fournie n'est plus celle du serveur, l'écriture est
   * refusée et l'appelant reçoit la version serveur pour se recaler.
   * Passer `null` force l'écriture (première synchro, résolution manuelle).
   */
  async put(
    userId: number,
    scope: PlanningScope,
    data: unknown,
    expectedRevision: number | null,
  ): Promise<{ ok: true; doc: PlanningDoc } | { ok: false; doc: PlanningDoc }> {
    const payload = JSON.stringify(data ?? null);

    if (expectedRevision === null) {
      const r = await pool.query(
        `INSERT INTO wedding_planning (user_id, scope, data, revision, updated_at)
         VALUES ($1, $2, $3::jsonb, 1, NOW())
         ON CONFLICT (user_id, scope) DO UPDATE
           SET data = EXCLUDED.data,
               revision = wedding_planning.revision + 1,
               updated_at = NOW()
         RETURNING scope, data, revision, updated_at`,
        [userId, scope, payload],
      );
      return { ok: true, doc: toDoc(r.rows[0] as PlanningRow) };
    }

    // Écriture conditionnelle : n'aboutit que si la révision correspond, ou si
    // le document n'existe pas encore (révision attendue 0).
    const r = await pool.query(
      `INSERT INTO wedding_planning (user_id, scope, data, revision, updated_at)
       VALUES ($1, $2, $3::jsonb, 1, NOW())
       ON CONFLICT (user_id, scope) DO UPDATE
         SET data = EXCLUDED.data,
             revision = wedding_planning.revision + 1,
             updated_at = NOW()
         WHERE wedding_planning.revision = $4
       RETURNING scope, data, revision, updated_at`,
      [userId, scope, payload, expectedRevision],
    );
    if (r.rows.length > 0) return { ok: true, doc: toDoc(r.rows[0] as PlanningRow) };

    const current = await this.get(userId, scope);
    // Conflit : on rend la version serveur pour que le client la fusionne.
    return {
      ok: false,
      doc: current ?? { scope, data: null, revision: 0, updated_at: new Date().toISOString() },
    };
  }
}
