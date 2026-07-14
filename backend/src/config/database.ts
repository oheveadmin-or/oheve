import { Pool, types } from 'pg';

// ── Parseur DATE (OID 1082) ─────────────────────────────────────────────────
// Par défaut node-postgres convertit les colonnes DATE en objet Date JS, ensuite
// sérialisé en timestamp UTC ("2026-07-10T00:00:00.000Z") — ce qui provoque des
// "Invalid Date" côté app et un décalage de fuseau (jour -1). On renvoie la date
// brute 'YYYY-MM-DD' telle quelle.
types.setTypeParser(1082, (v) => v);

/**
 * Pool de connexion PostgreSQL (Supabase)
 * Utiliser le pooler (port 6543) pour IPv4 - la connexion directe (5432) requiert IPv6
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL manquant dans .env - impossible de se connecter à Supabase');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false,
  // Par défaut pg ferme les connexions inactives après 10 s : presque chaque
  // requête après une pause payait une reconnexion TCP+TLS+auth au pooler
  // Supabase (jusqu'à plusieurs secondes) → app perçue comme lente partout.
  idleTimeoutMillis: 10 * 60 * 1000,
  keepAlive: true,
  connectionTimeoutMillis: 10 * 1000,
});

// Battement de cœur : garde au moins une connexion chaude en permanence
// (sinon la première action après 10 min d'inactivité reste lente).
setInterval(() => {
  pool.query('SELECT 1').catch(() => { /* le prochain vrai appel réessaiera */ });
}, 4 * 60 * 1000).unref();

// Test de connexion au demarrage
pool.on('connect', () => {
  console.log('✅ Connecté à la base de données');
});

pool.on('error', (err) => {
  console.error('❌ Erreur de connexion à la base:', err.message);
});

export { pool };
