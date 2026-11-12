import path from 'path';
import { Router } from 'express';
import multer from 'multer';

import { requireAdmin } from '../middleware/requireAdmin';
import { optionalAuth, requireAuth } from '../middleware/requireAuth';
import { optimizeUploadedImage } from '../utils/image-optim';
import { persistUploadedFile } from '../utils/persistent-uploads';
import { optimizeUploadedVideo } from '../utils/video-optim';
import { PrestatairesController } from './controller';
import { myDocumentRoutes, userDocumentRoutes } from './documents';
import { PhotosController, rejectDuplicatePhoto } from './photos.controller';

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
// Photos ET vidéos (reels) — vidéos jusqu'à 2 min : 720p depuis l'iPhone
// (~100 Mo), mais Android envoie l'original (1080p/4K) → marge large. Le
// fichier est ensuite réencodé en 720p (optimizeUploadedVideo) avant d'être
// stocké en base.
const MAX_MEDIA_MB = 600;
const upload = multer({
  storage,
  limits: { fileSize: MAX_MEDIA_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // iOS envoie parfois la vidéo en application/octet-stream : on retombe alors
    // sur l'extension pour ne pas rejeter à tort une vidéo légitime.
    const ext = path.extname(file.originalname).toLowerCase();
    const looksLikeMedia =
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext);
    if (looksLikeMedia) cb(null, true);
    else cb(new Error('Seules les images et les vidéos sont acceptées'));
  },
});

// ── Profil ────────────────────────────────────────────────────────────────────
prestatairesRoutes.get('/', optionalAuth, ctrl.list.bind(ctrl));
prestatairesRoutes.get('/me', requireAuth, ctrl.getMyProfile.bind(ctrl));
// NB : pas de barrière d'abonnement ici — la fiche est remplie PENDANT
// l'inscription (avant l'abonnement). Tous les prestataires inscrits sont
// visibles dans l'annuaire client (repository.list).
prestatairesRoutes.put('/me', requireAuth, ctrl.upsertProfile.bind(ctrl));

// ── Feed photos (toutes les photos publiques) ─────────────────────────────────
prestatairesRoutes.get('/feed/photos', optionalAuth, photos.getFeedPhotos.bind(photos));

// ── Photos (me) ───────────────────────────────────────────────────────────────
prestatairesRoutes.get('/me/photos', requireAuth, photos.getMyPhotos.bind(photos));
prestatairesRoutes.post('/me/photos', requireAuth, upload.single('photo'), optimizeUploadedImage(), optimizeUploadedVideo(), persistUploadedFile(), photos.uploadPhoto.bind(photos));
// Admin : photo de couverture d'un prestataire qu'il a créé.
prestatairesRoutes.post('/:userId/cover', requireAdmin, upload.single('photo'), rejectDuplicatePhoto(), optimizeUploadedImage(), persistUploadedFile(), photos.adminUploadCover.bind(photos));
prestatairesRoutes.put('/me/photos/:photoId/cover', requireAuth, photos.setCover.bind(photos));
prestatairesRoutes.put('/me/photos/:photoId/caption', requireAuth, photos.updateCaption.bind(photos));
prestatairesRoutes.put('/me/photos/:photoId/feed', requireAuth, photos.setInFeed.bind(photos));
prestatairesRoutes.delete('/me/photos/:photoId', requireAuth, photos.deletePhoto.bind(photos));
// Documents PDF (brochure, menu, tarifs) — /me d'abord, puis /:userId (public + admin).
prestatairesRoutes.use(myDocumentRoutes);
prestatairesRoutes.use(userDocumentRoutes);
// ⚠️ APRÈS les routes /me/… : sinon « me » serait pris pour un :userId (et refusé par requireAdmin).
// Admin : portfolio d'un prestataire (ajout photo/vidéo sans limite, refus des doublons, couverture, suppression).
prestatairesRoutes.post('/:userId/photos', requireAdmin, upload.single('photo'), rejectDuplicatePhoto(), optimizeUploadedImage(), optimizeUploadedVideo(), persistUploadedFile(), photos.adminUploadPhoto.bind(photos));
prestatairesRoutes.put('/:userId/photos/:photoId/cover', requireAdmin, photos.adminSetCover.bind(photos));
prestatairesRoutes.put('/:userId/photos/:photoId/feed', requireAdmin, photos.adminSetInFeed.bind(photos));
prestatairesRoutes.delete('/:userId/photos/:photoId', requireAdmin, photos.adminDeletePhoto.bind(photos));

// ── Fiche publique d'un post (page de partage /p/:photoId du site) ───────────
prestatairesRoutes.get('/photos/:photoId/public', photos.getPublicPhoto.bind(photos));

// ── Likes & commentaires ─────────────────────────────────────────────────────
prestatairesRoutes.post('/photos/:photoId/like', requireAuth, photos.toggleLike.bind(photos));
prestatairesRoutes.get('/photos/:photoId/comments', requireAuth, photos.getComments.bind(photos));
prestatairesRoutes.post('/photos/:photoId/comments', requireAuth, photos.addComment.bind(photos));

// ── Profil & photos par userId ────────────────────────────────────────────────
// Portfolio public (comme le feed) : visible par tout client, même si son jeton
// a expiré — sinon la fiche s'affiche sans aucune photo.
prestatairesRoutes.get('/:userId/photos', optionalAuth, photos.getPhotos.bind(photos));
prestatairesRoutes.post('/:userId/view', optionalAuth, ctrl.recordView.bind(ctrl));
prestatairesRoutes.get('/:userId', optionalAuth, ctrl.getById.bind(ctrl));
