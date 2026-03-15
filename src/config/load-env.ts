/**
 * Doit être importé en PREMIER pour charger .env avant toute autre config
 * Toujours lancer depuis backend/ : cd backend && npm run dev
 */
import path from 'path';

import dotenv from 'dotenv';

// process.cwd() = backend/ quand on fait "cd backend && npm run dev"
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });
