import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { getRSVPAnswerList, postRegisterPushToken, postRSVPAnswer, sseRSVPStream } from './rsvp.controller';

export const rsvpRoutes = Router();

// Public — guests submit their RSVP
rsvpRoutes.post('/:slug', postRSVPAnswer);

// Authenticated — couple views the list
rsvpRoutes.get('/:slug/answers', requireAuth, getRSVPAnswerList);

// SSE stream — app connects to receive live RSVP notifications
rsvpRoutes.get('/:slug/stream', requireAuth, sseRSVPStream);

// Register Expo push token
rsvpRoutes.post('/:slug/push-token', requireAuth, postRegisterPushToken);
