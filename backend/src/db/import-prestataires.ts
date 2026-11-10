/**
 * Crée en base les comptes prestataires d'un fichier JSON de prospects.
 *
 *   npm run import:prestataires -- /chemin/vers/prospects.json
 *
 * Vise la base du .env du backend (production). Idempotent : relancer ne crée
 * pas de doublon. Les identifiants se retrouvent ensuite dans l'app :
 * Admin → Identifiants (export Excel, un onglet par liste).
 */
import '../config/load-env';

import fs from 'fs';

import { pool } from '../config/database';
import { importProspects, type ProspectRow } from '../admin/importProspects';

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage : npm run import:prestataires -- /chemin/vers/prospects.json');
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(file, 'utf-8')) as ProspectRow[];
  console.log(`📄 ${rows.length} fiches à importer…`);
  const res = await importProspects(pool, rows);
  const bySource: Record<string, number> = {};
  for (const r of res.rows) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  console.log(`✅ ${res.created} comptes créés, ${res.skipped} déjà présents (ignorés)`);
  for (const [k, n] of Object.entries(bySource)) console.log(`   • ${k} : ${n}`);
  console.log('➡️  Identifiants : app → Admin → Identifiants → « Exporter les listes »');
  await pool.end();
}

main().catch(async (err) => {
  console.error('❌ Import échoué (rien n\'a été créé) :', (err as Error).message);
  await pool.end().catch(() => {});
  process.exit(1);
});
