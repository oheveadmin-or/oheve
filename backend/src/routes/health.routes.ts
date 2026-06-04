import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'The Event Planner API',
    timestamp: new Date().toISOString(),
  });
});
