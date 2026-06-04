import './config/load-env';

import path from 'path';
import cors from 'cors';
import express from 'express';

import { adminRoutes } from './admin';
import { connexionInscriptionRoutes } from './connexion-inscription';
import { runMigrations } from './db/migrate';
import { messagingRoutes } from './messaging';
import { prestatairesRoutes } from './prestataires';
import { publicSitesRoutes } from './public-sites';
import { rsvpRoutes } from './rsvp/rsvp.routes';
import { healthRoutes } from './routes/health.routes';
import { subscriptionRoutes } from './subscriptions';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', connexionInscriptionRoutes);
app.use('/api/public-sites', publicSitesRoutes);
app.use('/api/prestataires', prestatairesRoutes);
app.use('/api/conversations', messagingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/rsvp', rsvpRoutes);

runMigrations().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 API Wedding Planner sur http://localhost:${PORT}`);
    console.log(`👤 Rôles : client | prestataire | boutique | admin`);
    console.log(`💳 Abonnements : /api/subscriptions (basic 7€ | plus 20€)`);
    console.log(`💬 Messagerie : /api/conversations`);
    console.log(`🔐 Refresh tokens : activés (multi-appareils)`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} occupé. Lance : kill $(lsof -ti:${PORT})`);
      process.exit(1);
    }
    throw err;
  });
});
