/**
 * Vidéos du portfolio : optimisation APRÈS la réponse.
 *
 * Avant, le serveur réencodait la vidéo (ffmpeg, jusqu'à 2 min de 720p sur le
 * CPU Railway) puis la copiait en base AVANT de répondre : le téléphone
 * attendait tout ce temps-là sur « Envoi 1/3… ». Maintenant la réponse part dès
 * que le fichier est reçu et enregistré ; le réencodage, le renommage
 * éventuel (.mov → .mp4) et la sauvegarde en base se font ensuite, une vidéo à
 * la fois pour ne pas saturer le CPU.
 *
 * Les images, elles, restent traitées avant la réponse (rapide).
 */
import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { forgetFile, persistFile } from '../utils/persistent-uploads';
import { isVideoFile, optimizeVideoFile } from '../utils/video-optim';
import { PhotosRepository } from './photos.repository';

const repo = new PhotosRepository();

let queue: Promise<void> = Promise.resolve();

async function processVideo(absPath: string): Promise<void> {
  const oldName = path.basename(absPath);
  const newPath = await optimizeVideoFile(absPath);
  const finalPath = newPath ?? absPath;
  const newName = path.basename(finalPath);
  if (newName !== oldName) {
    await repo.renameFilename(oldName, newName);
    // L'app qui vient d'envoyer garde l'ancienne URL jusqu'au prochain
    // rechargement : un lien vers le nouveau fichier évite une vidéo cassée.
    await fs.promises.link(finalPath, absPath).catch(() => {});
  }
  // Vidéo supprimée entre-temps : ne pas la sauvegarder en base.
  const still = await pool.query(`SELECT 1 FROM prestataire_photos WHERE filename = $1`, [newName]);
  if (!still.rowCount) {
    await fs.promises.unlink(finalPath).catch(() => {});
    await forgetFile(`photos/${newName}`);
    return;
  }
  await persistFile(finalPath);
}

function enqueue(absPath: string) {
  queue = queue
    .then(() => processVideo(absPath))
    .catch((err) => logger.error({ err, file: absPath }, 'Optimisation vidéo en arrière-plan échouée'));
}

/**
 * À placer après multer et l'anti-doublon, à la place de
 * `optimizeUploadedVideo() + persistUploadedFile()` :
 *  - image → sauvegarde en base tout de suite (comme avant) ;
 *  - vidéo → rien avant la réponse ; si l'envoi est accepté (201), la vidéo
 *    part dans la file d'optimisation.
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
      if (res.statusCode === 201) enqueue(absPath);
    });
    return next();
  };
}
