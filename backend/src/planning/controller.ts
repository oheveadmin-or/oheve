import { Request, Response } from 'express';

import { isPlanningScope, PlanningRepository, PLANNING_SCOPES } from './repository';

const repo = new PlanningRepository();

/** Garde-fou taille : un document de planification reste petit (~quelques Ko). */
const MAX_DOC_BYTES = 512 * 1024;

export class PlanningController {
  /** Tous les domaines du compte en un appel (démarrage de l'app). */
  async listAll(req: Request, res: Response) {
    try {
      const docs = await repo.getAll(req.auth!.sub);
      const byScope: Record<string, unknown> = {};
      for (const scope of PLANNING_SCOPES) {
        const doc = docs.find((d) => d.scope === scope);
        byScope[scope] = doc
          ? { data: doc.data, revision: doc.revision, updatedAt: doc.updated_at }
          : null;
      }
      return res.json({ success: true, data: byScope });
    } catch (err) {
      console.error('planning.listAll:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async get(req: Request, res: Response) {
    try {
      const scope = req.params.scope;
      if (!isPlanningScope(scope)) {
        return res.status(400).json({ success: false, message: 'Domaine inconnu' });
      }
      const doc = await repo.get(req.auth!.sub, scope);
      return res.json({
        success: true,
        data: doc ? { data: doc.data, revision: doc.revision, updatedAt: doc.updated_at } : null,
      });
    } catch (err) {
      console.error('planning.get:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async put(req: Request, res: Response) {
    try {
      const scope = req.params.scope;
      if (!isPlanningScope(scope)) {
        return res.status(400).json({ success: false, message: 'Domaine inconnu' });
      }
      if (!req.body || !('data' in req.body)) {
        return res.status(400).json({ success: false, message: 'Champ "data" requis' });
      }
      const data = req.body.data;
      if (Buffer.byteLength(JSON.stringify(data ?? null), 'utf8') > MAX_DOC_BYTES) {
        return res.status(413).json({ success: false, message: 'Document trop volumineux' });
      }

      const raw = req.body.revision;
      // `revision` absent → écriture forcée (première synchro d'un appareil).
      const expected = raw === undefined || raw === null ? null : Number(raw);
      if (expected !== null && (!Number.isFinite(expected) || expected < 0)) {
        return res.status(400).json({ success: false, message: 'Révision invalide' });
      }

      const result = await repo.put(req.auth!.sub, scope, data, expected);
      if (!result.ok) {
        // 409 : l'autre appareil a écrit entre-temps. On renvoie sa version.
        return res.status(409).json({
          success: false,
          conflict: true,
          message: 'Version obsolète',
          data: {
            data: result.doc.data,
            revision: result.doc.revision,
            updatedAt: result.doc.updated_at,
          },
        });
      }
      return res.json({
        success: true,
        data: {
          data: result.doc.data,
          revision: result.doc.revision,
          updatedAt: result.doc.updated_at,
        },
      });
    } catch (err) {
      console.error('planning.put:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
}
