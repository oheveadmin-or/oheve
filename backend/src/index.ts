import './config/load-env';

import path from 'path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initSentry, Sentry } from './utils/sentry';
import { logger } from './utils/logger';

initSentry();

import { adminRoutes } from './admin';
import { calendarRoutes } from './calendar';
import { startReminderScheduler } from './calendar/reminder';
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

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS : autoriser uniquement les origines connues ─────────────────────────
const BUILTIN_ORIGINS = [
  'https://oheve.pages.dev',
  'https://www.ohevewedding.com',
  'https://ohevewedding.com',
];

const ALLOWED_ORIGINS = [
  ...BUILTIN_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Requêtes sans origin (mobile natif, Postman en dev) toujours autorisées
    if (!origin) return callback(null, true);
    // En dev, tout est permis
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // Tests locaux (vite dev / preview) même quand NODE_ENV=production
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Autoriser les previews Cloudflare Pages (*.oheve.pages.dev)
    if (/^https:\/\/[a-z0-9-]+\.oheve\.pages\.dev$/.test(origin)) return callback(null, true);
    return callback(new Error(`CORS: origine non autorisée — ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ── Rate limiting global (brute-force protection) ────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessaie dans 15 minutes.' },
});
app.use('/api/', globalLimiter);

// Rate limit strict sur les endpoints sensibles (OTP, connexion, reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives, réessaie dans 15 minutes.' },
});
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/connexion', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/inscription', authLimiter);

// ── Body parsers ──────────────────────────────────────────────────────────────
// Le webhook Stripe nécessite le body brut (raw) avant express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
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

// Sentry error handler doit être après les routes (cast pour compatibilité types)
if (typeof Sentry.expressErrorHandler === 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(Sentry.expressErrorHandler() as any);
}

const server = app.listen(PORT, () => {
  logger.info(`API Wedding Planner démarrée sur le port ${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} déjà occupé.`);
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

runMigrations()
  .then(() => startReminderScheduler())
  .catch(err => {
    logger.error({ err }, 'Migrations failed');
  });
