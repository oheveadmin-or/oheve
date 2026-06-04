import '../config/load-env';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';

const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@jewishwedding.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@2026!';

async function main() {
  console.log('🔧 Création du compte administrateur...');
  const hash = await bcrypt.hash(PASSWORD, 12);
  const r = await pool.query(
    `INSERT INTO users (email, nom, prenom, mot_de_passe, role, is_active)
     VALUES ($1, 'Admin', 'Principal', $2, 'admin', true)
     ON CONFLICT (email) DO UPDATE
       SET role = 'admin',
           mot_de_passe = EXCLUDED.mot_de_passe,
           is_active = true
     RETURNING id, email, role`,
    [EMAIL, hash]
  );
  console.log('✅ Compte admin créé/mis à jour :');
  console.log(`   ID          : ${r.rows[0].id}`);
  console.log(`   Email       : ${EMAIL}`);
  console.log(`   Mot de passe: ${PASSWORD}`);
  console.log(`   Rôle        : admin`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
