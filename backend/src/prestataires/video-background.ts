/**
 * Vidéos du portfolio / des reels : traitement APRÈS la réponse.
 *
 * Avant, le serveur réencodait la vidéo (ffmpeg sur le CPU Railway) puis la
 * copiait en base AVANT de répondre : le téléphone attendait tout ce temps-là.
 * Maintenant la réponse part dès que le fichier est reçu ; ensuite, une vidéo
 * à la fois :
 *   1. image d'aperçu « <nom>_poster.jpg » (grilles et reels l'affichent tout
 *      de suite, sans télécharger la vidéo — fini les cases grises) ;
 *   2. réencodage si besoin (HEVC, > 720p, débit > 4,5 Mb/s) ;
 *   3. sauvegarde en base (le disque Railway est effacé à chaque déploiement).
 *
 * `backfillVideoPosters()` fait la même chose une fois pour les vidéos déjà
 * publiées (lancé au démarrage, en tâche de fond).
 */
import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { ensureLocalFile, forgetFile, isStored, persistFile } from '../utils/persistent-uploads';
import { isVideoFile, makeVideoPoster, optimizeVideoFile, posterNameFor } from '../utils/video-optim';
import { PhotosRepository } from './photos.repository';

const repo = new PhotosRepository();

let queue: Promise<void> = Promise.resolve();

async function stillExists(filename: string): Promise<boolean> {
  const r = await pool.query(`SELECT 1 FROM prestataire_photos WHERE filename = $1`, [filename]);
  return !!r.rowCount;
}

/**
 * Aperçu + optimisation + sauvegarde d'une vidéo déjà sur le disque.
 * `skipIfFine` : vidéo déjà publiée → on ne la réécrit que si elle est lourde.
 */
async function processVideo(absPath: string, opts: { skipIfFine?: boolean } = {}): Promise<void> {
  const oldName = path.basename(absPath);

  // 1. Aperçu d'abord (rapide) : la grille l'affiche avant la fin du réencodage.
  const poster = await makeVideoPoster(absPath);
  if (poster) await persistFile(poster).catch((err) => logger.warn({ err }, 'Aperçu non sauvegardé'));

  // 2. Réencodage éventuel.
  const newPath = await optimizeVideoFile(absPath, opts);
  const finalPath = newPath ?? absPath;
  const newName = path.basename(finalPath);
  if (newName !== oldName) {
    await repo.renameFilename(oldName, newName);
    // L'app qui vient d'envoyer garde l'ancienne URL jusqu'au prochain
    // rechargement : un lien vers le nouveau fichier évite une vidéo cassée.
    await fs.promises.link(finalPath, absPath).catch(() => {});
  }

  // Vidéo supprimée entre-temps : ne rien garder.
  if (!(await stillExists(newName))) {
    await fs.promises.unlink(finalPath).catch(() => {});
    await forgetFile(`photos/${newName}`);
    if (poster) { await fs.promises.unlink(poster).catch(() => {}); await forgetFile(`photos/${posterNameFor(newName)}`); }
    return;
  }

  // 3. Sauvegarde en base (toujours pour un nouvel envoi ; si réécrite sinon).
  if (newPath || !opts.skipIfFine) await persistFile(finalPath);
  if (newPath && newName !== oldName) await forgetFile(`photos/${oldName}`);
}

function enqueue(job: () => Promise<void>, label: string) {
  queue = queue
    .then(job)
    .catch((err) => logger.error({ err, file: label }, 'Traitement vidéo en arrière-plan échoué'));
  return queue;
}

/**
 * À placer après multer et l'anti-doublon, à la place de
 * `optimizeUploadedVideo() + persistUploadedFile()` :
 *  - image → sauvegarde en base tout de suite (comme avant) ;
 *  - vidéo → rien avant la réponse ; si l'envoi est accepté (201), la vidéo
 *    part dans la file de traitement.
 */
export function persistOrDeferVideo() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    if (!file?.path) return next();
    if (!isVideoFile(file.path, file.mimetype)) {
      try { await persistFile(file.path); } catch (err) { logger.error({ err, file: file.path }, 'Sauvegarde en base du fichier uploadé échouée'); }
      return next();
    }
    const absPath = path.resolve(file.path);
    res.on('finish', () => {
      if (res.statusCode === 201) enqueue(() => processVideo(absPath), absPath);
    });
    return next();
  };
}

/**
 * Vidéos déjà publiées sans aperçu : création de l'aperçu, et réencodage des
 * vidéos trop lourdes (débit > 4,5 Mb/s : démarrage lent dans les reels).
 * L'aperçu sauvegardé en base sert de marqueur « déjà traitée ».
 */
export async function backfillVideoPosters(): Promise<void> {
  const { rows } = await pool.query<{ filename: string }>(
    `SELECT filename FROM prestataire_photos WHERE media_type = 'video' ORDER BY created_at DESC`,
  );
  let done = 0;
  for (const { filename } of rows) {
    if (await isStored(`photos/${posterNameFor(filename)}`)) continue;
    await enqueue(async () => {
      const abs = await ensureLocalFile(`photos/${filename}`);
      if (!abs) return; // fichier perdu
      await processVideo(abs, { skipIfFine: true });
      done++;
    }, filename);
  }
  if (done) logger.info(`🎞️ ${done} vidéos existantes : aperçu créé (et réencodées si trop lourdes)`);
}
