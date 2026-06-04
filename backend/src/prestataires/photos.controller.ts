import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { PhotosRepository } from './photos.repository';

const repo = new PhotosRepository();

function buildPhotoUrl(req: Request, filename: string): string {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  return `${protocol}://${host}/uploads/photos/${filename}`;
}

export class PhotosController {
  async getPhotos(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId, 10);
      const prestataireId = await repo.findPrestataireIdByUserId(userId);
      if (prestataireId === null) {
        return res.status(200).json({ success: true, data: [] });
      }
      const photos = await repo.findByPrestataire(prestataireId);
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
        return res.status(404).json({ success: false, message: 'Profil prestataire introuvable' });
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

      const photo = await repo.insert(prestataireId, '', req.file.filename);
      const url = buildPhotoUrl(req, req.file.filename);
      return res.status(201).json({ success: true, data: { ...photo, url } });
    } catch (err) {
      console.error('uploadPhoto:', err);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ } }
      return res.status(500).json({ success: false, message: 'Erreur upload' });
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
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('setCover:', err);
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
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('deletePhoto:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
}
