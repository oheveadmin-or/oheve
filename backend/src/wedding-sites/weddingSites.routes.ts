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
// Sécurité : création, modification et upload exigent un compte authentifié.
// Le builder web reçoit le token via ?token= depuis l'app — plus aucune
// écriture anonyme possible (avant : n'importe qui pouvait modifier un site par id).
weddingSitesRoutes.post('/upload-photo', requireAuth, upload.single('photo'), uploadGalleryPhoto);
weddingSitesRoutes.get('/:slug', optionalAuth, getWeddingSiteBySlug);
weddingSitesRoutes.post('/', requireAuth, createWeddingSite);
weddingSitesRoutes.patch('/:id', requireAuth, updateWeddingSite);
