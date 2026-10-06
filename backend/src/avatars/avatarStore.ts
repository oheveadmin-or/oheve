import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

import { pool } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Photos de profil stockées EN BASE (bytea).
 *
 * Avant, l'avatar n'était qu'un fichier dans uploads/avatars sur le disque du
 * conteneur : chaque redéploiement effaçait le disque et la photo disparaissait
 * (rond vide dans l'onglet Profil). La base, elle, survit aux déploiements.
 */

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

export const CREATE_USER_AVATARS = `
  CREATE TABLE IF NOT EXISTS user_avatars (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    mime       VARCHAR(50) NOT NULL,
    data       BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

export function mimeForFile(filePath: string, fallback?: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? fallback ?? 'image/jpeg';
}

export async function saveAvatar(userId: number, data: Buffer, mime: string): Promise<void> {
  await pool.query(
    `INSERT INTO user_avatars (user_id, mime, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = NOW()`,
    [userId, mime, data],
  );
}

/** URL publique et stable de l'avatar (?v= casse le cache après un changement). */
export function avatarPublicUrl(req: Request, userId: number): string {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  return `${protocol}://${host}/api/auth/avatar-file/${userId}?v=${Date.now()}`;
}

/** GET /api/auth/avatar-file/:userId — public (affiché dans l'app, la messagerie…). */
export async function serveAvatar(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).end();
    return;
  }
  try {
    const { rows } = await pool.query<{ mime: string; data: Buffer }>(
      'SELECT mime, data FROM user_avatars WHERE user_id = $1',
      [userId],
    );
    if (!rows[0]) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', rows[0].mime);
    // L'URL change (?v=) à chaque nouvel avatar : cache long sans risque.
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(rows[0].data);
  } catch (err) {
    logger.error({ err, userId }, 'Lecture avatar échouée');
    res.status(500).end();
  }
}

/**
 * Au démarrage : importe en base les avatars encore présents sur le disque
 * (anciennes URL /uploads/avatars/…) et réécrit leur URL vers la route
 * persistante. Les avatars dont le fichier a déjà disparu ne sont pas
 * récupérables : l'app affiche alors l'initiale, et un nouvel envoi suffit.
 */
export async function migrateDiskAvatarsToDb(): Promise<void> {
  const { rows } = await pool.query<{ id: number; avatar_url: string }>(
    `SELECT u.id, u.avatar_url FROM users u
     LEFT JOIN user_avatars a ON a.user_id = u.id
     WHERE a.user_id IS NULL AND u.avatar_url LIKE '%/uploads/avatars/%'`,
  );
  let imported = 0;
  for (const row of rows) {
    const filename = path.basename(row.avatar_url.split('?')[0]);
    const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
    try {
      const data = await fs.promises.readFile(filePath);
      await saveAvatar(row.id, data, mimeForFile(filePath));
      const newUrl = row.avatar_url.replace(/\/uploads\/avatars\/[^?]+.*$/, `/api/auth/avatar-file/${row.id}?v=${Date.now()}`);
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [newUrl, row.id]);
      imported++;
    } catch {
      /* fichier déjà perdu : rien à importer */
    }
  }
  if (imported > 0) logger.info({ imported }, 'Avatars disque importés en base');
}
