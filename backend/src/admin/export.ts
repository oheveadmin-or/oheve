/**
 * Export Excel de l'admin : chaque onglet du classeur = une requête SQL dont
 * les colonnes portent déjà leur titre français. Dates mises en forme à l'heure
 * de Paris, montants en euros (nombres, pour que Excel puisse les additionner).
 * Le classeur .xlsx est construit côté app à partir de ces lignes.
 */
import { pool } from '../config/database';
import { ADMIN_GRANT_SUB_ID } from '../prestataire-subscription';
import { sqlVisibleEmail } from '../auth/username';

const day = (col: string) => `to_char(${col}, 'DD/MM/YYYY')`;
const stamp = (col: string) => `to_char(${col} AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY HH24:MI')`;
const euros = (cents: string) => `ROUND(COALESCE(${cents}, 0) / 100.0, 2)::float`;
const yesNo = (cond: string) => `CASE WHEN ${cond} THEN 'Oui' ELSE 'Non' END`;

export const EXPORT_SHEETS = {
  utilisateurs: {
    title: 'Utilisateurs',
    sql: `
      SELECT u.id AS "ID", u.prenom AS "Prénom", u.nom AS "Nom",
             ${sqlVisibleEmail('u.email')} AS "Email", u.username AS "Identifiant",
             u.phone AS "Téléphone", u.role AS "Rôle", ${yesNo('u.is_active')} AS "Actif",
             ${day('u.date_mariage')} AS "Date du mariage", u.wedding_city AS "Ville du mariage",
             ${yesNo('u.premium')} AS "Premium", ${stamp('u.created_at')} AS "Inscrit le"
      FROM users u
      ORDER BY u.created_at DESC`,
  },
  prestataires: {
    title: 'Prestataires',
    sql: `
      SELECT pp.user_id AS "ID", pp.business_name AS "Entreprise", pp.category AS "Catégorie",
             u.prenom AS "Prénom", u.nom AS "Nom",
             ${sqlVisibleEmail('u.email')} AS "Email", u.username AS "Identifiant",
             COALESCE(pp.phone, u.phone) AS "Téléphone", pp.location_city AS "Ville",
             pp.price_range AS "Gamme de prix", pp.website_url AS "Site web", pp.instagram_url AS "Instagram",
             CASE
               WHEN u.presta_sub_id = '${ADMIN_GRANT_SUB_ID}' THEN 'Offert'
               WHEN u.presta_sub_status IN ('trialing', 'active') THEN 'Payant (abonné)'
               ELSE 'Payant (pas abonné)'
             END AS "Mode",
             u.presta_sub_status AS "Statut abonnement",
             ${day('u.presta_current_period_end')} AS "Fin de période",
             ${yesNo('pp.is_verified')} AS "Vérifié", ${yesNo('pp.is_suspended')} AS "Suspendu",
             ${yesNo('COALESCE(sca.charges_enabled, false)')} AS "Paiements Stripe actifs",
             pp.profile_views AS "Vues de la fiche", pp.rating::float AS "Note", pp.reviews_count AS "Avis",
             ${stamp('pp.created_at')} AS "Créé le"
      FROM prestataire_profiles pp
      JOIN users u ON u.id = pp.user_id
      LEFT JOIN stripe_connect_accounts sca ON sca.user_id = pp.user_id
      ORDER BY pp.created_at DESC`,
  },
  paiements: {
    title: 'Paiements',
    sql: `
      SELECT p.id AS "ID", ${stamp('p.created_at')} AS "Date",
             TRIM(CONCAT(uc.prenom, ' ', uc.nom)) AS "Client", ${sqlVisibleEmail('uc.email')} AS "Email client",
             COALESCE(pp.business_name, TRIM(CONCAT(up.prenom, ' ', up.nom))) AS "Prestataire",
             pp.category AS "Catégorie",
             ${euros('p.amount_total')} AS "Montant (€)", ${euros('p.commission_amount')} AS "Commission (€)",
             ${euros('p.net_amount')} AS "Net prestataire (€)",
             CASE p.status WHEN 'succeeded' THEN 'Payé' WHEN 'pending' THEN 'En attente'
                           WHEN 'failed' THEN 'Échoué' ELSE p.status END AS "Statut",
             p.description AS "Description", p.stripe_payment_intent_id AS "Référence Stripe"
      FROM payments p
      JOIN users uc ON uc.id = p.client_id
      JOIN users up ON up.id = p.prestataire_id
      LEFT JOIN prestataire_profiles pp ON pp.user_id = p.prestataire_id
      ORDER BY p.created_at DESC`,
  },
  reservations: {
    title: 'Réservations',
    sql: `
      SELECT r.id AS "ID", ${stamp('r.created_at')} AS "Demandée le", ${day('r.event_date')} AS "Date de l'événement",
             TRIM(CONCAT(uc.prenom, ' ', uc.nom)) AS "Client", ${sqlVisibleEmail('uc.email')} AS "Email client",
             COALESCE(pp.business_name, TRIM(CONCAT(up.prenom, ' ', up.nom))) AS "Prestataire",
             CASE r.status WHEN 'confirmed' THEN 'Confirmée' WHEN 'pending' THEN 'En attente'
                           WHEN 'cancelled' THEN 'Annulée' ELSE r.status END AS "Statut",
             ${euros('r.amount_cents')} AS "Montant (€)", r.notes AS "Notes"
      FROM reservations r
      JOIN users uc ON uc.id = r.client_id
      JOIN users up ON up.id = r.prestataire_id
      LEFT JOIN prestataire_profiles pp ON pp.user_id = r.prestataire_id
      ORDER BY r.created_at DESC`,
  },
  sites: {
    title: 'Sites mariage',
    sql: `
      SELECT ps.id AS "ID", ps.bride_name AS "Mariée", ps.groom_name AS "Marié",
             ${day('ps.wedding_date')} AS "Date du mariage", ps.location AS "Lieu",
             ps.slug AS "Adresse du site", ${yesNo('ps.is_published')} AS "Publié",
             ${sqlVisibleEmail('u.email')} AS "Email du compte", ${stamp('ps.created_at')} AS "Créé le"
      FROM public_sites ps
      JOIN users u ON u.id = ps.user_id
      ORDER BY ps.created_at DESC`,
  },
} as const;

export type ExportSheetKey = keyof typeof EXPORT_SHEETS;

export function isExportSheetKey(v: unknown): v is ExportSheetKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(EXPORT_SHEETS, v);
}

export async function buildAdminExport(keys: ExportSheetKey[]) {
  const sheets = [];
  for (const key of keys) {
    const { title, sql } = EXPORT_SHEETS[key];
    const r = await pool.query(sql);
    sheets.push({ key, title, columns: r.fields.map((f) => f.name), rows: r.rows });
  }
  return sheets;
}
