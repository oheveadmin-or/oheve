import './config/load-env'; // MUST be first - load .env before database

import cors from 'cors';
import express from 'express';

import { runMigrations } from './db/migrate';
import { connexionInscriptionRoutes } from './connexion-inscription';
import { healthRoutes } from './routes/health.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', connexionInscriptionRoutes);


// Demarrage : migrations puis serveur
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API Wedding Planner démarrée sur http://localhost:${PORT}`);
    console.log('📡 DATABASE_URL chargé:', process.env.DATABASE_URL ? 'Oui (Supabase)' : 'NON - vérifie ton .env');
  });
});
