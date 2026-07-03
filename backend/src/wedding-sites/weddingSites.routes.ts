import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { optionalAuth, requireAuth } from '../middleware/requireAuth';
import {
  checkSlugAvailable,
  createWeddingSite,
  getMySites,
  getWeddingSiteBySlug,
  updateWeddingSite,
  uploadGalleryPhoto,
} from './weddingSites.controller';

// Même stockage disque que les photos prestataires : uploads/photos est déjà
// servi statiquement par /uploads dans index.ts.
const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'photos'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
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

export const weddingSitesRoutes = Router();

weddingSitesRoutes.get('/check-slug', checkSlugAvailable);
weddingSitesRoutes.get('/me', requireAuth, getMySites);
weddingSitesRoutes.post('/upload-photo', optionalAuth, upload.single('photo'), uploadGalleryPhoto);
weddingSitesRoutes.get('/:slug', getWeddingSiteBySlug);
weddingSitesRoutes.post('/', optionalAuth, createWeddingSite);
weddingSitesRoutes.patch('/:id', optionalAuth, updateWeddingSite);
