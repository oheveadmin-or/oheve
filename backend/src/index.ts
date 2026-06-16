import './config/load-env';

import path from 'path';
import cors from 'cors';
import express from 'express';

import { adminRoutes } from './admin';
import { calendarRoutes } from './calendar';
import { connexionInscriptionRoutes } from './connexion-inscription';
import { runMigrations } from './db/migrate';
import { pool } from './config/database';
import { messagingRoutes } from './messaging';
import { paymentsRoutes } from './payments';
import { prestatairesRoutes } from './prestataires';
import { publicSitesRoutes } from './public-sites';
import { weddingSitesRoutes } from './wedding-sites';
import { rsvpRoutes } from './rsvp/rsvp.routes';
import { healthRoutes } from './routes/health.routes';
import { subscriptionRoutes } from './subscriptions';
import { premiumRoutes } from './premium';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors({ origin: '*' }));
// Le webhook Stripe nécessite le body brut (raw) avant express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', connexionInscriptionRoutes);
app.use('/api/public-sites', publicSitesRoutes);
app.use('/api/wedding-sites', weddingSitesRoutes);
app.use('/api/prestataires', prestatairesRoutes);
app.use('/api/conversations', messagingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/calendar', calendarRoutes);

runMigrations().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 API Wedding Planner sur http://localhost:${PORT}`);
    console.log(`👤 Rôles : client | prestataire | boutique | admin`);
    console.log(`⭐ Oheve Premium : /api/premium (50€ paiement unique)`);
    console.log(`💳 Abonnements boutique : /api/subscriptions (basic 7€ | plus 20€)`);
    console.log(`💰 Paiements Stripe : /api/payments (5% commission)`);
    console.log(`💬 Messagerie + Devis : /api/conversations`);
    console.log(`🔐 Refresh tokens : activés (multi-appareils)`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} occupé. Lance : kill $(lsof -ti:${PORT})`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown = () => {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
