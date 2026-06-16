import { Router } from 'express';

import { requireAuth } from '../middleware/requireAuth';
import { getMyPublicSite, getPublicSiteBySlug, postCreatePublicSite, putSiteConfig } from './publicSites.controller';

export const publicSitesRoutes = Router();

publicSitesRoutes.post('/', requireAuth, postCreatePublicSite);
publicSitesRoutes.get('/me', requireAuth, getMyPublicSite);
publicSitesRoutes.get('/:slug', getPublicSiteBySlug);
publicSitesRoutes.put('/:slug/config', requireAuth, putSiteConfig);
