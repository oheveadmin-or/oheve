import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';

import { pool } from '../config/database';
import { logger } from './logger';

/**
 * Fichiers uploadés (photos, vidéos/reels, pièces jointes, musique) stockés
 * EN BASE en plus du disque.
 *
 * Le disque du conteneur Railway est effacé à chaque redéploiement : les
 * fichiers de uploads/ disparaissaient, les URLs /uploads/... renvoyaient 404 et
 * l'Explore/les reels restaient vides (tuiles grises, page blanche) sur tous
 * les téléphones — sauf celui qui avait publié, qui les gardait en cache.
 * Même correctif que pour les avatars (user_avatars) : la base survit aux
 * déploiements. Le disque ne sert plus que de cache : un fichier absent est
 * restauré depuis la base au premier accès, puis servi par express.static
 * (requêtes Range comprises, indispensables à la lecture vidéo sur iOS).
 */

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
// Sous-dossiers servis par /uploads et alimentés par des uploads utilisateurs.
const PERSISTED_DIRS = ['photos', 'chat', 'music'];

export const CREATE_STORED_FILES = `
  CREATE TABLE IF NOT EXISTS stored_files (
    rel_path   TEXT PRIMARY KEY,
    mime       VARCHAR(100),
    size       BIGINT NOT NULL,
    data       BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.heic': 'image/heic', '.heif': 'image/heif',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

/** Chemin relatif à uploads/ (« photos/xxx.mp4 »), ou null hors du dossier. */
function relPathOf(absPath: string): string | null {
  const rel = path.relative(UPLOADS_ROOT, path.resolve(absPath)).split(path.sep).join('/');
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel;
}

/** Copie un fichier de uploads/ en base (écrase la version précédente). */
export async function persistFile(absPath: string): Promise<void> {
  const rel = relPathOf(absPath);
  if (!rel) return;
  const data = await fs.promises.readFile(absPath);
  const mime = MIME_BY_EXT[path.extname(absPath).toLowerCase()] ?? null;
  await pool.query(
    `INSERT INTO stored_files (rel_path, mime, size, data)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (rel_path) DO UPDATE SET mime = EXCLUDED.mime, size = EXCLUDED.size, data = EXCLUDED.data`,
    [rel, mime, data.length, data],
  );
}

export async function forgetFile(rel: string): Promise<void> {
  await pool.query('DELETE FROM stored_files WHERE rel_path = $1', [rel]).catch(() => {});
}

/**
 * Middleware à placer en DERNIER après multer et les optimisations
 * (image/vidéo) : enregistre `req.file` en base. Un échec est journalisé sans
 * bloquer l'upload (le fichier reste au moins disponible jusqu'au prochain
 * déploiement).
 */
export function persistUploadedFile() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.file?.path) {
      try {
        await persistFile(req.file.path);
      } catch (err) {
        logger.error({ err, file: req.file.path }, 'Sauvegarde en base du fichier uploadé échouée');
      }
    }
    next();
  };
}

/** Parmi ces chemins relatifs, ceux qui existent en base (→ leur taille). */
async function storedAmong(rels: string[]): Promise<Map<string, number>> {
  if (rels.length === 0) return new Map();
  const { rows } = await pool.query<{ rel_path: string; size: string }>(
    'SELECT rel_path, size FROM stored_files WHERE rel_path = ANY($1)',
    [rels],
  );
  return new Map(rows.map((r) => [r.rel_path, Number(r.size)]));
}

/**
 * Filtre les éléments dont le fichier est définitivement perdu (ni sur le
 * disque, ni en base) : mieux vaut ne pas les montrer que d'afficher une tuile
 * grise ou un reel noir aux clients.
 */
export async function filterAvailable<T>(items: T[], relOf: (item: T) => string): Promise<T[]> {
  const missing = items
    .map(relOf)
    .filter((rel) => !fs.existsSync(path.join(UPLOADS_ROOT, rel)));
  if (missing.length === 0) return items;
  let stored: Map<string, number>;
  try {
    stored = await storedAmong(missing);
  } catch {
    return items; // base indisponible : on ne masque rien par erreur
  }
  const lost = new Set(missing.filter((rel) => !stored.has(rel)));
  return items.filter((item) => !lost.has(relOf(item)));
}

// Restaurations en cours : deux requêtes simultanées sur la même vidéo
// (lecteur + miniature) ne lisent la base qu'une fois.
const restoring = new Map<string, Promise<boolean>>();

async function restoreFromDb(rel: string): Promise<boolean> {
  const { rows } = await pool.query<{ data: Buffer }>(
    'SELECT data FROM stored_files WHERE rel_path = $1',
    [rel],
  );
  if (!rows[0]) return false;
  const dest = path.join(UPLOADS_ROOT, rel);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  // Écriture atomique : express.static ne doit jamais servir un fichier à moitié écrit.
  const tmp = `${dest}.restore_${process.pid}_${Date.now()}`;
  await fs.promises.writeFile(tmp, rows[0].data);
  await fs.promises.rename(tmp, dest);
  return true;
}

/**
 * Middleware monté sur /uploads AVANT express.static : si le fichier demandé
 * n'est plus sur le disque, il est restauré depuis la base puis servi
 * normalement par express.static.
 */
export function restoreMissingUploads() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let rel: string;
    try {
      rel = decodeURIComponent(req.path).replace(/^\/+/, '');
    } catch {
      return next();
    }
    const [dir] = rel.split('/');
    if (!PERSISTED_DIRS.includes(dir) || rel.includes('..')) return next();
    if (fs.existsSync(path.join(UPLOADS_ROOT, rel))) return next();

    let job = restoring.get(rel);
    if (!job) {
      job = restoreFromDb(rel).finally(() => restoring.delete(rel));
      restoring.set(rel, job);
    }
    try {
      await job;
    } catch (err) {
      logger.error({ err, rel }, 'Restauration du fichier depuis la base échouée');
    }
    next();
  };
}

/**
 * Au démarrage (après les optimisations d'images/vidéos) : copie en base les
 * fichiers encore présents sur le disque qui n'y sont pas encore — tout ce qui
 * a été publié depuis le dernier déploiement est ainsi sauvé pour de bon. Un
 * fichier dont la taille a changé (vidéo réencodée au démarrage) est remplacé.
 */
export async function backfillStoredFiles(): Promise<void> {
  let saved = 0;
  for (const dir of PERSISTED_DIRS) {
    let names: string[];
    try {
      names = await fs.promises.readdir(path.join(UPLOADS_ROOT, dir));
    } catch {
      continue; // dossier absent
    }
    const candidates = names.filter((n) => !n.startsWith('.'));
    const rels = candidates.map((n) => `${dir}/${n}`);
    const already = await storedAmong(rels);
    for (const rel of rels) {
      const abs = path.join(UPLOADS_ROOT, rel);
      try {
        const stat = await fs.promises.stat(abs);
        if (!stat.isFile() || already.get(rel) === stat.size) continue;
        await persistFile(abs);
        saved++;
      } catch (err) {
        logger.warn({ err, rel }, 'Sauvegarde en base ignorée');
      }
    }
  }
  if (saved > 0) logger.info(`💾 ${saved} fichiers uploadés sauvegardés en base`);
}
