import { Router } from 'express';

import { requireAuth } from '../middleware/requireAuth';
import { PlanningController } from './controller';

export const planningRoutes = Router();
const ctrl = new PlanningController();

planningRoutes.use(requireAuth);

planningRoutes.get('/', ctrl.listAll.bind(ctrl));
planningRoutes.get('/:scope', ctrl.get.bind(ctrl));
planningRoutes.put('/:scope', ctrl.put.bind(ctrl));
