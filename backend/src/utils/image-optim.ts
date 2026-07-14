import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import type SharpType from 'sharp';
import { logger } from './logger';

// sharp est un module natif : si son binaire ne se charge pas sur la plateforme
// (ex. binaire Linux absent du déploiement), un import classique ferait crasher
// TOUT le serveur au démarrage. Chargement paresseux : en cas d'échec on log
// l'erreur et l'app tourne sans optimisation d'images plutôt que pas du tout.
let sharpModule: typeof SharpType | null | undefined;
function getSharp(): typeof SharpType | null {
  if (sharpModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      sharpModule = require('sharp') as typeof SharpType;
    } catch (err) {
      sharpModule = null;
      logger.error({ err }, "sharp indisponible — les images ne seront pas compressées");
    }
  }
  return sharpModule;
}

// Les photos iPhone font 3–8 Mo : servies telles quelles, le feed et les
// portfolios téléchargent des dizaines de Mo → app très lente. On les
// redimensionne à l'upload (aucun écran n'affiche plus grand que ~1600px).
const MAX_DIM = 1600;
const AVATAR_MAX_DIM = 800;
const JPEG_QUALITY = 80;

// En dessous de ce poids, une image est considérée déjà optimisée (utile pour
// le passage sur les fichiers existants au démarrage).
const ALREADY_SMALL_BYTES = 400 * 1024;

const OPTIMIZABLE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);

function isOptimizableImage(filePath: string, mimetype?: string): boolean {
  if (mimetype && !mimetype.startsWith('image/')) return false;
  if (mimetype === 'image/gif') return false; // ne pas casser les GIF animés
  const ext = path.extname(filePath).toLowerCase();
  return OPTIMIZABLE_EXT.has(ext);
}

/**
 * Recompresse une image sur place : max 1600px (côté le plus long), JPEG/PNG/WebP
 * selon le format d'origine (le nom de fichier ne change pas, donc le
 * Content-Type servi par express.static reste cohérent). L'orientation EXIF est
 * appliquée. Ne réécrit le fichier que si le résultat est plus léger.
 * Toute erreur (format exotique, fichier corrompu) laisse l'original intact.
 */
export async function optimizeImageFile(filePath: string, maxDim: number = MAX_DIM): Promise<void> {
  const sharp = getSharp();
  if (!sharp) return;
  try {
    const original = await fs.promises.stat(filePath);
    const img = sharp(filePath).rotate().resize(maxDim, maxDim, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    const ext = path.extname(filePath).toLowerCase();
    let out: Buffer;
    if (ext === '.png') {
      out = await img.png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
    } else if (ext === '.webp') {
      out = await img.webp({ quality: JPEG_QUALITY }).toBuffer();
    } else {
      // .jpg/.jpeg — et .heic/.heif si le libvips embarqué sait les lire
      out = await img.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    }

    if (out.length < original.size) {
      await fs.promises.writeFile(filePath, out);
    }
  } catch (err) {
    logger.warn({ err, filePath }, 'Optimisation image ignorée');
  }
}

/**
 * Middleware à placer juste après multer : compresse req.file s'il s'agit
 * d'une image. Les vidéos, PDF, GIF… passent tels quels.
 */
export function optimizeUploadedImage(maxDim: number = MAX_DIM) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.file?.path && isOptimizableImage(req.file.path, req.file.mimetype)) {
      await optimizeImageFile(req.file.path, maxDim);
      try {
        req.file.size = (await fs.promises.stat(req.file.path)).size;
      } catch { /* taille d'origine conservée */ }
    }
    next();
  };
}

export const optimizeAvatarUpload = () => optimizeUploadedImage(AVATAR_MAX_DIM);

/**
 * Passage unique sur les images déjà uploadées (avant l'ajout de la
 * compression) : lancé en tâche de fond au démarrage. Un manifeste évite de
 * retraiter les mêmes fichiers à chaque boot ; les petits fichiers (<400 Ko)
 * sont considérés déjà bons.
 */
export async function optimizeExistingUploads(): Promise<void> {
  // Sans sharp, ne rien marquer comme traité : le passage se fera au prochain
  // démarrage où sharp sera disponible.
  if (!getSharp()) return;
  const base = path.join(process.cwd(), 'uploads');
  const manifestPath = path.join(base, '.optim-manifest.json');
  let done: Set<string>;
  try {
    done = new Set(JSON.parse(await fs.promises.readFile(manifestPath, 'utf8')) as string[]);
  } catch {
    done = new Set();
  }

  const dirs: Array<{ dir: string; maxDim: number }> = [
    { dir: path.join(base, 'photos'), maxDim: MAX_DIM },
    { dir: path.join(base, 'avatars'), maxDim: AVATAR_MAX_DIM },
    { dir: path.join(base, 'chat'), maxDim: MAX_DIM },
  ];

  let processed = 0;
  for (const { dir, maxDim } of dirs) {
    let files: string[];
    try {
      files = await fs.promises.readdir(dir);
    } catch {
      continue; // dossier absent
    }
    for (const name of files) {
      const key = `${path.basename(dir)}/${name}`;
      if (done.has(key)) continue;
      const filePath = path.join(dir, name);
      if (!isOptimizableImage(filePath)) { done.add(key); continue; }
      try {
        const stat = await fs.promises.stat(filePath);
        if (stat.isFile() && stat.size > ALREADY_SMALL_BYTES) {
          await optimizeImageFile(filePath, maxDim);
          processed++;
        }
        done.add(key);
      } catch { /* fichier disparu entre-temps */ }
      // Sauvegarde périodique du manifeste pour survivre à un redéploiement
      if (processed > 0 && processed % 20 === 0) {
        await fs.promises.writeFile(manifestPath, JSON.stringify([...done]));
      }
    }
  }

  try {
    await fs.promises.writeFile(manifestPath, JSON.stringify([...done]));
  } catch { /* uploads/ absent en dev sans volume */ }
  if (processed > 0) {
    logger.info(`🖼️  ${processed} images existantes recompressées`);
  }
}
