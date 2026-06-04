/**
 * Doit être importé en PREMIER pour charger .env avant toute autre config.
 * Charge d’abord le .env du répertoire courant, puis celui du dossier backend/
 * (même si npm/tsx est lancé depuis la racine du repo) — ce dernier écrase les clés en commun.
 */
import path from 'path';

import dotenv from 'dotenv';

const cwdEnvPath = path.resolve(process.cwd(), '.env');
// Ce fichier : backend/src/config → deux niveaux au-dessus = racine du package backend
const packageEnvPath = path.resolve(__dirname, '..', '..', '.env');

dotenv.config({ path: cwdEnvPath });
dotenv.config({ path: packageEnvPath, override: true });
