import { Router } from 'express';
import { optionalAuth } from '../middleware/requireAuth';
import {
  checkSlugAvailable,
  createWeddingSite,
  getWeddingSiteBySlug,
  updateWeddingSite,
} from './weddingSites.controller';

export const weddingSitesRoutes = Router();

weddingSitesRoutes.get('/check-slug', checkSlugAvailable);
weddingSitesRoutes.get('/:slug', getWeddingSiteBySlug);
weddingSitesRoutes.post('/', optionalAuth, createWeddingSite);
weddingSitesRoutes.patch('/:id', optionalAuth, updateWeddingSite);
