import { Router } from 'express';

import { optionalAuth, requireAuth } from '../middleware/requireAuth';
import { getMyPublicSite, getPublicSiteBySlug, postCreatePublicSite, putSiteConfig } from './publicSites.controller';

export const publicSitesRoutes = Router();

publicSitesRoutes.post('/', requireAuth, postCreatePublicSite);
publicSitesRoutes.get('/me', requireAuth, getMyPublicSite);
// optionalAuth : le propriétaire connecté garde l'accès à son propre site même
// si l'accès public est verrouillé (premium impayé ou lien privé absent).
publicSitesRoutes.get('/:slug', optionalAuth, getPublicSiteBySlug);
publicSitesRoutes.put('/:slug/config', requireAuth, putSiteConfig);
