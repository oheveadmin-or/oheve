import path from 'path';
import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../middleware/requireAuth';
import { PrestatairesController } from './controller';
import { PhotosController } from './photos.controller';

export const prestatairesRoutes = Router();
const ctrl = new PrestatairesController();
const photos = new PhotosController();

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'photos'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

// ── Profil ────────────────────────────────────────────────────────────────────
prestatairesRoutes.get('/', requireAuth, ctrl.list.bind(ctrl));
prestatairesRoutes.get('/me', requireAuth, ctrl.getMyProfile.bind(ctrl));
prestatairesRoutes.put('/me', requireAuth, ctrl.upsertProfile.bind(ctrl));

// ── Photos (me) ───────────────────────────────────────────────────────────────
prestatairesRoutes.get('/me/photos', requireAuth, photos.getMyPhotos.bind(photos));
prestatairesRoutes.post('/me/photos', requireAuth, upload.single('photo'), photos.uploadPhoto.bind(photos));
prestatairesRoutes.put('/me/photos/:photoId/cover', requireAuth, photos.setCover.bind(photos));
prestatairesRoutes.delete('/me/photos/:photoId', requireAuth, photos.deletePhoto.bind(photos));

// ── Profil & photos par userId ────────────────────────────────────────────────
prestatairesRoutes.get('/:userId/photos', requireAuth, photos.getPhotos.bind(photos));
prestatairesRoutes.get('/:userId', requireAuth, ctrl.getById.bind(ctrl));
