import { Router } from 'express';

import { requireAuth } from '../middleware/requireAuth';
import { GuestsController } from './controller';

export const guestsRoutes = Router();
const ctrl = new GuestsController();

guestsRoutes.use(requireAuth);

guestsRoutes.get('/', ctrl.list.bind(ctrl));
guestsRoutes.post('/', ctrl.create.bind(ctrl));
guestsRoutes.post('/bulk', ctrl.bulk.bind(ctrl));
guestsRoutes.patch('/:id', ctrl.update.bind(ctrl));
guestsRoutes.delete('/:id', ctrl.remove.bind(ctrl));
