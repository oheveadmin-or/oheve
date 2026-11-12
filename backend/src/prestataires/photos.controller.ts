import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { NextFunction, Request, Response } from 'express';
import { PhotosRepository } from './photos.repository';
import { isPrestaSubActive } from '../prestataire-subscription';
import { filterAvailable, forgetFile } from '../utils/persistent-uploads';

const repo = new PhotosRepository();

function buildPhotoUrl(req: Request, filename: string): string {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  return `${protocol}://${host}/uploads/photos/${filename}`;
}

function isVideoFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.filename || file.originalname || '').toLowerCase();
  return file.mimetype.startsWith('video/') || ['.mp4', '.mov', '.m4v', '.webm', '.avi'].includes(ext);
}

/**
 * Champ multipart/JSON `inFeed` : publier aussi dans les reels ?
 * Absent → `fallback` (true pour une photo de portfolio, false pour une couverture admin).
 */
function readInFeed(body: unknown, fallback: boolean): boolean {
  const v = (body as { inFeed?: unknown } | undefined)?.inFeed;
  if (v === true || v === 'true' || v === '1') return true;
  if (v === false || v === 'false' || v === '0') return false;
  return fallback;
}

function adminTargetUserId(req: Request): number | null {
  const id = Number(req.params.userId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Empreinte SHA-256 en flux : une vidéo de plusieurs centaines de Mo n'est pas chargée en mémoire. */
function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(filePath).on('data', (c) => h.update(c)).on('error', reject).on('end', () => resolve(h.digest('hex')));
  });
}

/**
 * Anti-doublon (à placer juste après multer, AVANT les optimisations qui
 * réécrivent le fichier) : empreinte SHA-256 du fichier reçu ; si ce
 * prestataire a déjà exactement ce fichier, l'envoi est refusé (409).
 */
export function rejectDuplicatePhoto() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file?.path) return next();
    try {
      const hash = await hashFile(req.file.path);
      (req as Request & { contentHash?: string }).contentHash = hash;
      const userId = adminTargetUserId(req);
      const prestataireId = userId ? await repo.findPrestataireIdByUserId(userId) : null;
      if (prestataireId !== null && await repo.findByHash(prestataireId, hash)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ }
        return res.status(409).json({ success: false, duplicate: true, message: 'Cette photo est déjà sur la fiche de ce prestataire.' });
      }
    } catch (err) {
      console.error('rejectDuplicatePhoto:', err);
    }
    return next();
  };
}

export class PhotosController {
  async getFeedPhotos(req: Request, res: Response) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
      const offset = parseInt(req.query.offset as string || '0', 10);
      // Les posts dont le fichier a été perdu (anciens redéploiements) sont
      // masqués : sinon les clients voient des tuiles grises / reels noirs.
      const rows = await filterAvailable(
        await repo.findFeedPhotos(limit, offset, req.auth?.sub),
        (p) => `photos/${p.filename}`,
      );
      const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
      const host = req.headers['x-forwarded-host'] ?? req.get('host');
      const withUrl = rows.map((p) => ({
        ...p,
        url: `${protocol}://${host}/uploads/photos/${p.filename}`,
        cover_url: p.cover_filename ? `${protocol}://${host}/uploads/photos/${p.cover_filename}` : null,
      }));
      return res.status(200).json({ success: true, data: withUrl });
    } catch (err) {
      console.error('getFeedPhotos:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  /** Fiche publique d'un post — consommée par la page de partage /p/:photoId
   *  du site Oheve (sans authentification). */
  async getPublicPhoto(req: Request, res: Response) {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      if (!Number.isFinite(photoId)) {
        return res.status(400).json({ success: false, message: 'Identifiant invalide' });
      }
      const photo = await repo.findPublicById(photoId);
      if (!photo) {
        return res.status(404).json({ success: false, message: 'Publication introuvable' });
      }
      return res.status(200).json({
        success: true,
        data: { ...photo, url: buildPhotoUrl(req, photo.filename) },
      });
    } catch (err) {
      console.error('getPublicPhoto:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async toggleLike(req: Request, res: Response) {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      const result = await repo.toggleLike(photoId, req.auth!.sub);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error('toggleLike:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async addComment(req: Request, res: Response) {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Texte requis' });
    try {
      const photoId = parseInt(req.params.photoId, 10);
      const comment = await repo.addComment(photoId, req.auth!.sub, text);
      return res.status(201).json({ success: true, data: comment });
    } catch (err) {
      console.error('addComment:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async getComments(req: Request, res: Response) {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      const comments = await repo.getComments(photoId);
      return res.status(200).json({ success: true, data: comments });
    } catch (err) {
      console.error('getComments:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async getPhotos(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId, 10);
      const prestataireId = await repo.findPrestataireIdByUserId(userId);
      if (prestataireId === null) {
        return res.status(200).json({ success: true, data: [] });
      }
      const photos = await filterAvailable(
        await repo.findByPrestataire(prestataireId),
        (p) => `photos/${p.filename}`,
      );
      const withUrl = photos.map((p) => ({ ...p, url: buildPhotoUrl(req, p.filename) }));
      return res.status(200).json({ success: true, data: withUrl });
    } catch (err) {
      console.error('getPhotos:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async getMyPhotos(req: Request, res: Response) {
    try {
      const prestataireId = await repo.findPrestataireIdByUserId(req.auth!.sub);
      if (prestataireId === null) {
        return res.status(200).json({ success: true, data: [] });
      }
      const photos = await repo.findByPrestataire(prestataireId);
      const withUrl = photos.map((p) => ({ ...p, url: buildPhotoUrl(req, p.filename) }));
      return res.status(200).json({ success: true, data: withUrl });
    } catch (err) {
      console.error('getMyPhotos:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async uploadPhoto(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    try {
      const prestataireId = await repo.findPrestataireIdByUserId(req.auth!.sub);
      if (prestataireId === null) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Veuillez d\'abord sauvegarder votre profil avant d\'ajouter des photos.' });
      }

      // Vérification des limites selon l'abonnement
      const userSub = await repo.getUserSubscription(req.auth!.sub);
      if (userSub && userSub.role !== 'admin') {
        let photoLimit = 10; // prestataire sans abonnement
        if (userSub.role === 'boutique') {
          if (userSub.subscription_plan === 'plus' && userSub.subscription_status === 'active') {
            photoLimit = Infinity;
          } else if (userSub.subscription_plan === 'basic' && userSub.subscription_status === 'active') {
            photoLimit = 20;
          } else {
            photoLimit = 5; // boutique sans abonnement actif
          }
        } else if (userSub.role === 'prestataire' && isPrestaSubActive(userSub.presta_sub_status)) {
          photoLimit = Infinity;
        }
        if (photoLimit !== Infinity) {
          const count = await repo.countByPrestataire(prestataireId);
          if (count >= photoLimit) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({
              success: false,
              message: `Limite de ${photoLimit} photos atteinte. Passez à un abonnement supérieur pour en ajouter plus.`,
              limit_reached: true,
              photo_limit: photoLimit,
            });
          }
        }
      }

      const caption = typeof req.body?.caption === 'string' ? req.body.caption : '';
      // Détection vidéo par mimetype OU par extension (iOS envoie parfois
      // application/octet-stream, ce qui ferait passer une vidéo pour une image).
      const ext = path.extname(req.file.filename || req.file.originalname || '').toLowerCase();
      const isVideo =
        req.file.mimetype.startsWith('video/') ||
        ['.mp4', '.mov', '.m4v', '.webm', '.avi'].includes(ext);
      const mediaType = isVideo ? 'video' : 'image';
      // `asCover` : photo choisie comme couverture (profil, inscription) ; `inFeed` :
      // la publier aussi dans les reels (le prestataire est interrogé avant).
      const asCover = req.body?.asCover === 'true' && mediaType === 'image';
      const photo = await repo.insert(prestataireId, '', req.file.filename, caption, mediaType, null, readInFeed(req.body, true));
      if (asCover) await repo.setCover(prestataireId, photo.id);
      const url = buildPhotoUrl(req, req.file.filename);
      return res.status(201).json({ success: true, data: { ...photo, ...(asCover ? { is_cover: true } : {}), url } });
    } catch (err) {
      console.error('uploadPhoto:', err);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ } }
      return res.status(500).json({ success: false, message: 'Erreur upload' });
    }
  }

  /** Admin : ajoute une image et en fait la couverture du prestataire `:userId`. */
  async adminUploadCover(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    try {
      const prestataireId = await repo.findPrestataireIdByUserId(parseInt(req.params.userId, 10));
      if (prestataireId === null) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
      }
      const hash = (req as Request & { contentHash?: string }).contentHash ?? null;
      // Couverture : PAS dans les reels sauf si l'admin a répondu « Oui » (inFeed=true).
      const photo = await repo.insert(prestataireId, '', req.file.filename, '', 'image', hash, readInFeed(req.body, false));
      await repo.setCover(prestataireId, photo.id);
      const url = buildPhotoUrl(req, req.file.filename);
      return res.status(201).json({ success: true, data: { ...photo, is_cover: true, url } });
    } catch (err) {
      console.error('adminUploadCover:', err);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ } }
      return res.status(500).json({ success: false, message: 'Erreur upload' });
    }
  }

  /** Admin : ajoute une photo ou une vidéo au portfolio du prestataire `:userId` (sans limite). */
  async adminUploadPhoto(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    try {
      const userId = adminTargetUserId(req);
      const prestataireId = userId ? await repo.findPrestataireIdByUserId(userId) : null;
      if (prestataireId === null) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ }
        await forgetFile(`photos/${req.file.filename}`);
        return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
      }
      const caption = typeof req.body?.caption === 'string' ? req.body.caption.slice(0, 500) : '';
      const hash = (req as Request & { contentHash?: string }).contentHash ?? null;
      const photo = await repo.insert(prestataireId, '', req.file.filename, caption, isVideoFile(req.file) ? 'video' : 'image', hash, readInFeed(req.body, true));
      return res.status(201).json({ success: true, data: { ...photo, url: buildPhotoUrl(req, req.file.filename) } });
    } catch (err) {
      console.error('adminUploadPhoto:', err);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ } }
      return res.status(500).json({ success: false, message: 'Erreur upload' });
    }
  }

  /** Admin : choisit la photo de couverture du prestataire `:userId`. */
  async adminSetCover(req: Request, res: Response) {
    try {
      const userId = adminTargetUserId(req);
      const prestataireId = userId ? await repo.findPrestataireIdByUserId(userId) : null;
      if (prestataireId === null) return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
      const photoId = parseInt(req.params.photoId, 10);
      await repo.setCover(prestataireId, photoId);
      if (req.body?.inFeed !== undefined) await repo.setInFeed(prestataireId, photoId, readInFeed(req.body, true));
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('adminSetCover:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  /** Admin : retire une photo du prestataire `:userId`. */
  async adminDeletePhoto(req: Request, res: Response) {
    try {
      const userId = adminTargetUserId(req);
      const prestataireId = userId ? await repo.findPrestataireIdByUserId(userId) : null;
      if (prestataireId === null) return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
      const deleted = await repo.delete(prestataireId, parseInt(req.params.photoId, 10));
      if (!deleted) return res.status(404).json({ success: false, message: 'Photo introuvable' });
      try { fs.unlinkSync(path.join(process.cwd(), 'uploads', 'photos', deleted.filename)); } catch { /* ignoré */ }
      await forgetFile(`photos/${deleted.filename}`);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('adminDeletePhoto:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async setCover(req: Request, res: Response) {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      const prestataireId = await repo.findPrestataireIdByUserId(req.auth!.sub);
      if (prestataireId === null) {
        return res.status(404).json({ success: false, message: 'Profil introuvable' });
      }
      await repo.setCover(prestataireId, photoId);
      if (req.body?.inFeed !== undefined) await repo.setInFeed(prestataireId, photoId, readInFeed(req.body, true));
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('setCover:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  /** Prestataire : publier / retirer une de ses photos des reels (elle reste sur sa fiche). */
  async setInFeed(req: Request, res: Response) {
    try {
      const prestataireId = await repo.findPrestataireIdByUserId(req.auth!.sub);
      if (prestataireId === null) return res.status(404).json({ success: false, message: 'Profil introuvable' });
      const updated = await repo.setInFeed(prestataireId, parseInt(req.params.photoId, 10), readInFeed(req.body, true));
      if (!updated) return res.status(404).json({ success: false, message: 'Photo introuvable' });
      return res.status(200).json({ success: true, data: { ...updated, url: buildPhotoUrl(req, updated.filename) } });
    } catch (err) {
      console.error('setInFeed:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  /** Admin : publier / retirer une photo du prestataire `:userId` des reels. */
  async adminSetInFeed(req: Request, res: Response) {
    try {
      const userId = adminTargetUserId(req);
      const prestataireId = userId ? await repo.findPrestataireIdByUserId(userId) : null;
      if (prestataireId === null) return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
      const updated = await repo.setInFeed(prestataireId, parseInt(req.params.photoId, 10), readInFeed(req.body, true));
      if (!updated) return res.status(404).json({ success: false, message: 'Photo introuvable' });
      return res.status(200).json({ success: true, data: { ...updated, url: buildPhotoUrl(req, updated.filename) } });
    } catch (err) {
      console.error('adminSetInFeed:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async updateCaption(req: Request, res: Response) {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      const caption = typeof req.body?.caption === 'string' ? req.body.caption : '';
      const prestataireId = await repo.findPrestataireIdByUserId(req.auth!.sub);
      if (prestataireId === null) {
        return res.status(404).json({ success: false, message: 'Profil introuvable' });
      }
      const updated = await repo.updateCaption(prestataireId, photoId, caption);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Photo introuvable' });
      }
      return res.status(200).json({ success: true, data: { ...updated, url: buildPhotoUrl(req, updated.filename) } });
    } catch (err) {
      console.error('updateCaption:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async deletePhoto(req: Request, res: Response) {
    try {
      const photoId = parseInt(req.params.photoId, 10);
      const prestataireId = await repo.findPrestataireIdByUserId(req.auth!.sub);
      if (prestataireId === null) {
        return res.status(404).json({ success: false, message: 'Profil introuvable' });
      }
      const deleted = await repo.delete(prestataireId, photoId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Photo introuvable' });
      }
      // Supprimer le fichier physique
      const filePath = path.join(process.cwd(), 'uploads', 'photos', deleted.filename);
      try { fs.unlinkSync(filePath); } catch { /* ignoré si déjà supprimé */ }
      await forgetFile(`photos/${deleted.filename}`);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('deletePhoto:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
}
