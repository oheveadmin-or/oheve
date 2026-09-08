import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import { logger } from './logger';

// ffmpeg-static embarque un binaire par plateforme. Comme sharp, on le charge
// paresseusement : si le binaire manque sur l'environnement de déploiement, les
// vidéos passent telles quelles au lieu de faire échouer tous les uploads.
let ffmpegBin: string | null | undefined;
function getFfmpeg(): string | null {
  if (ffmpegBin === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bin = require('ffmpeg-static') as string | null;
      ffmpegBin = bin && fs.existsSync(bin) ? bin : null;
    } catch {
      ffmpegBin = null;
    }
    if (!ffmpegBin) {
      logger.error("ffmpeg indisponible — les vidéos ne seront pas optimisées");
    }
  }
  return ffmpegBin;
}

const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi']);

// Au-delà de ce poids, la vidéo est réencodée en 720p ; en dessous on se
// contente du remux (rapide, sans perte).
const HEAVY_BYTES = 20 * 1024 * 1024;

const REMUX_TIMEOUT_MS = 60_000;
const TRANSCODE_TIMEOUT_MS = 5 * 60_000;

// Paysage → largeur plafonnée ; portrait → hauteur plafonnée. L'autre dimension
// (`-2`) suit le ratio en restant paire.
const SCALE_LONG_SIDE_1280 =
  "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'";

export function isVideoFile(filePath: string, mimetype?: string): boolean {
  if (mimetype?.startsWith('image/')) return false;
  return VIDEO_EXT.has(path.extname(filePath).toLowerCase());
}

function runFfmpeg(args: string[], timeoutMs: number): Promise<void> {
  const bin = getFfmpeg();
  if (!bin) return Promise.reject(new Error('ffmpeg indisponible'));
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      // On ne garde que la fin : ffmpeg est très bavard, seule l'erreur compte.
      stderr = (stderr + chunk.toString()).slice(-2000);
    });
    const timer = setTimeout(() => proc.kill('SIGKILL'), timeoutMs);
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg code ${code}: ${stderr}`));
    });
  });
}

/**
 * Optimise une vidéo pour la lecture en streaming progressif.
 *
 * Le vrai problème des vidéos iPhone n'est pas seulement leur poids : dans un
 * `.mov` l'atome `moov` (l'index) est écrit EN FIN de fichier, donc le lecteur
 * doit télécharger presque tout le fichier avant d'afficher la première image —
 * d'où plusieurs secondes de spinner. `-movflags +faststart` le déplace en tête,
 * la lecture démarre alors après quelques centaines de Ko.
 *
 * - fichier léger  → remux sans réencodage (quelques secondes, aucune perte)
 * - fichier lourd  → réencodage 720p H.264/AAC (le feed n'affiche jamais plus)
 *
 * Retourne le nouveau chemin (extension `.mp4`) ou `null` si rien n'a été fait.
 * Toute erreur laisse l'original intact : une vidéo lourde vaut mieux qu'aucune.
 */
export async function optimizeVideoFile(filePath: string): Promise<string | null> {
  if (!getFfmpeg()) return null;

  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const tmpPath = path.join(dir, `.tmp_${base}.mp4`);
  const finalPath = path.join(dir, `${base}.mp4`);

  try {
    const original = await fs.promises.stat(filePath);
    const heavy = original.size > HEAVY_BYTES;

    const args = heavy
      ? [
          '-i', filePath,
          // Plafonne le CÔTÉ LE PLUS LONG à 1280 : plafonner la largeur
          // donnerait 1280×2276 sur une vidéo verticale (les reels sont
          // portrait), soit plus lourd que l'original. `-2` = dimension
          // calculée en gardant un nombre pair, exigé par H.264.
          '-vf', SCALE_LONG_SIDE_1280,
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
          // Sans forçage, un source en 4:2:2/4:4:4 produit un MP4 que les
          // décodeurs matériels iOS/Android refusent de lire.
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '128k',
          '-movflags', '+faststart',
          '-y', tmpPath,
        ]
      : [
          '-i', filePath,
          '-c', 'copy',
          '-movflags', '+faststart',
          '-y', tmpPath,
        ];

    await runFfmpeg(args, heavy ? TRANSCODE_TIMEOUT_MS : REMUX_TIMEOUT_MS);

    const out = await fs.promises.stat(tmpPath);
    if (out.size === 0) throw new Error('sortie ffmpeg vide');

    // Le remux peut légèrement grossir le fichier (index déplacé en tête) : on
    // le garde quand même, le gain au démarrage de lecture prime. En revanche
    // un réencodage plus lourd que l'original n'a aucun intérêt.
    if (heavy && out.size >= original.size) {
      await fs.promises.unlink(tmpPath).catch(() => {});
      return null;
    }

    if (finalPath !== filePath) await fs.promises.unlink(filePath).catch(() => {});
    await fs.promises.rename(tmpPath, finalPath);
    logger.info(
      { from: original.size, to: out.size, mode: heavy ? 'transcode' : 'remux' },
      `🎬 ${path.basename(finalPath)} optimisée`,
    );
    return finalPath;
  } catch (err) {
    await fs.promises.unlink(tmpPath).catch(() => {});
    logger.warn({ err, filePath }, 'Optimisation vidéo ignorée');
    return null;
  }
}

/**
 * Middleware à placer juste après multer (et après `optimizeUploadedImage`) :
 * optimise `req.file` s'il s'agit d'une vidéo, et met à jour `filename`/`path`
 * pour que le contrôleur enregistre bien le nom `.mp4` en base.
 */
export function optimizeUploadedVideo() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.file?.path || !isVideoFile(req.file.path, req.file.mimetype)) return next();
    const newPath = await optimizeVideoFile(req.file.path);
    if (newPath) {
      req.file.path = newPath;
      req.file.filename = path.basename(newPath);
      req.file.mimetype = 'video/mp4';
      try {
        req.file.size = (await fs.promises.stat(newPath)).size;
      } catch { /* taille d'origine conservée */ }
    }
    next();
  };
}

/**
 * Passage unique sur les vidéos déjà uploadées (avant l'ajout de cette
 * optimisation) : lancé en tâche de fond au démarrage, en série pour ne pas
 * saturer le CPU du conteneur. Un manifeste évite de retraiter les mêmes
 * fichiers à chaque boot.
 *
 * ⚠️ Les fichiers renommés `.mov` → `.mp4` casseraient les URLs déjà en base :
 * `onRenamed` permet à l'appelant de mettre la base à jour.
 */
export async function optimizeExistingVideos(
  onRenamed?: (oldName: string, newName: string) => Promise<void>,
): Promise<void> {
  if (!getFfmpeg()) return;
  const dir = path.join(process.cwd(), 'uploads', 'photos');
  const manifestPath = path.join(process.cwd(), 'uploads', '.video-optim-manifest.json');

  let done: Set<string>;
  try {
    done = new Set(JSON.parse(await fs.promises.readFile(manifestPath, 'utf8')) as string[]);
  } catch {
    done = new Set();
  }

  let files: string[];
  try {
    files = await fs.promises.readdir(dir);
  } catch {
    return; // dossier absent (dev sans volume)
  }

  let processed = 0;
  for (const name of files) {
    if (done.has(name) || name.startsWith('.tmp_')) continue;
    const filePath = path.join(dir, name);
    if (!isVideoFile(filePath)) { done.add(name); continue; }
    const newPath = await optimizeVideoFile(filePath);
    if (newPath) {
      const newName = path.basename(newPath);
      if (newName !== name && onRenamed) {
        await onRenamed(name, newName).catch(() => {});
      }
      done.add(newName);
      processed++;
    }
    done.add(name);
    if (processed > 0 && processed % 5 === 0) {
      await fs.promises.writeFile(manifestPath, JSON.stringify([...done])).catch(() => {});
    }
  }

  try {
    await fs.promises.writeFile(manifestPath, JSON.stringify([...done]));
  } catch { /* uploads/ absent */ }
  if (processed > 0) logger.info(`🎬 ${processed} vidéos existantes optimisées`);
}
