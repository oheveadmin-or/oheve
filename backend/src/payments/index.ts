import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { PaymentsController } from './controller';

export const paymentsRoutes = Router();
const ctrl = new PaymentsController();

// Stripe webhook — pas d'auth JWT, signature Stripe
paymentsRoutes.post(
  '/webhook',
  // express.raw est monté dans index.ts sur ce path spécifique
  ctrl.webhook.bind(ctrl),
);

paymentsRoutes.use(requireAuth);

// Créer un PaymentIntent (client paie un prestataire)
paymentsRoutes.post('/create-intent', ctrl.createIntent.bind(ctrl));

// Stripe Connect — onboarding prestataire
paymentsRoutes.post('/connect/onboard', ctrl.connectOnboard.bind(ctrl));
paymentsRoutes.get('/connect/status', ctrl.connectStatus.bind(ctrl));
paymentsRoutes.post('/connect/refresh', ctrl.connectRefresh.bind(ctrl));

// Historique paiements
paymentsRoutes.get('/history', ctrl.history.bind(ctrl));
