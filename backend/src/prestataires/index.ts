import path from 'path';
import { Router } from 'express';
import multer from 'multer';

import { optionalAuth, requireAuth } from '../middleware/requireAuth';
import { optimizeUploadedImage } from '../utils/image-optim';
import { PrestatairesController } from './controller';
import { PhotosController } from './photos.controller';

export const prestatairesRoutes = Router();
const ctrl = new PrestatairesController();
const photos = new PhotosController();

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'photos'),
  filename: (_req, file, cb) => {
    const fallbackExt = file.mimetype.startsWith('video/') ? '.mp4' : '.jpg';
    const ext = path.extname(file.originalname).toLowerCase() || fallbackExt;
    cb(null, `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
// Photos ET vidéos (reels) — 100 Mo max pour couvrir les vidéos de réalisation.
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Seules les images et les vidéos sont acceptées'));
  },
});

// ── Profil ────────────────────────────────────────────────────────────────────
prestatairesRoutes.get('/', optionalAuth, ctrl.list.bind(ctrl));
prestatairesRoutes.get('/me', requireAuth, ctrl.getMyProfile.bind(ctrl));
// NB : pas de barrière d'abonnement ici — la fiche est remplie PENDANT
// l'inscription (avant l'abonnement). La visibilité côté clients reste
// réservée aux abonnés via le filtre du répertoire (repository.list).
prestatairesRoutes.put('/me', requireAuth, ctrl.upsertProfile.bind(ctrl));

// ── Feed photos (toutes les photos publiques) ─────────────────────────────────
prestatairesRoutes.get('/feed/photos', optionalAuth, photos.getFeedPhotos.bind(photos));

// ── Photos (me) ───────────────────────────────────────────────────────────────
prestatairesRoutes.get('/me/photos', requireAuth, photos.getMyPhotos.bind(photos));
prestatairesRoutes.post('/me/photos', requireAuth, upload.single('photo'), optimizeUploadedImage(), photos.uploadPhoto.bind(photos));
prestatairesRoutes.put('/me/photos/:photoId/cover', requireAuth, photos.setCover.bind(photos));
prestatairesRoutes.put('/me/photos/:photoId/caption', requireAuth, photos.updateCaption.bind(photos));
prestatairesRoutes.delete('/me/photos/:photoId', requireAuth, photos.deletePhoto.bind(photos));

// ── Likes & commentaires ─────────────────────────────────────────────────────
prestatairesRoutes.post('/photos/:photoId/like', requireAuth, photos.toggleLike.bind(photos));
prestatairesRoutes.get('/photos/:photoId/comments', requireAuth, photos.getComments.bind(photos));
prestatairesRoutes.post('/photos/:photoId/comments', requireAuth, photos.addComment.bind(photos));

// ── Profil & photos par userId ────────────────────────────────────────────────
prestatairesRoutes.get('/:userId/photos', requireAuth, photos.getPhotos.bind(photos));
prestatairesRoutes.post('/:userId/view', optionalAuth, ctrl.recordView.bind(ctrl));
prestatairesRoutes.get('/:userId', optionalAuth, ctrl.getById.bind(ctrl));
