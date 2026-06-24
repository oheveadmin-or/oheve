import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/requireAuth';
import {
  checkSlugAvailable,
  createWeddingSite,
  getMySites,
  getWeddingSiteBySlug,
  updateWeddingSite,
} from './weddingSites.controller';

export const weddingSitesRoutes = Router();

weddingSitesRoutes.get('/check-slug', checkSlugAvailable);
weddingSitesRoutes.get('/me', requireAuth, getMySites);
weddingSitesRoutes.get('/:slug', getWeddingSiteBySlug);
weddingSitesRoutes.post('/', optionalAuth, createWeddingSite);
weddingSitesRoutes.patch('/:id', optionalAuth, updateWeddingSite);
