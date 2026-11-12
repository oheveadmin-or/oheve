import bcrypt from 'bcrypt';
import { Router, Request, Response } from 'express';

import { isAdminEmail, sanitizeAssignedRole } from '../auth/admin';
import {
  USERNAME_RULE, normalizeUsername, placeholderEmail, sqlVisibleEmail, visibleEmail,
} from '../auth/username';
import { UserRole, generateRefreshToken, signAccessToken } from '../auth/jwt';
import { ConnexionInscriptionRepository } from '../connexion-inscription/repository';
import { pool } from '../config/database';
import { EXPORT_SHEETS, buildAdminExport, isExportSheetKey } from './export';
import { duplicateMessage, findIn, loadExisting, lockPrestaCreation } from './duplicates';
import { ADMIN_GRANT_SUB_ID, isAdminGrant, isPrestaSubActive } from '../prestataire-subscription';
import { requireAdmin } from '../middleware/requireAdmin';

const sessionRepo = new ConnexionInscriptionRepository();

export const adminRoutes = Router();

const MIN_PWD = 8;
const SALT_ROUNDS = 10;

/**
 * Fin de gratuité demandée par l'admin : null = offert sans limite,
 * 'invalid' si la date n'est pas lisible ou déjà passée.
 */
function parseGrantUntil(until: unknown): Date | null | 'invalid' {
  if (until === undefined || until === null || until === '') return null;
  const d = new Date(String(until));
  if (isNaN(d.getTime()) || d.getTime() <= Date.now()) return 'invalid';
  return d;
}

adminRoutes.use(requireAdmin);

// ── GET /api/admin/users ──────────────────────────────────────────────────────
adminRoutes.get('/users', async (req: Request, res: Response) => {
  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (role) { conditions.push(`role=$${i++}`); vals.push(role); }
  if (search) {
    conditions.push(`(nom ILIKE $${i} OR prenom ILIKE $${i} OR email ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  vals.push(limit, offset);

  try {
    const r = await pool.query(
      `SELECT id,email,nom,prenom,role,is_active,avatar_url,phone,
              subscription_plan,subscription_status,subscription_expires_at,created_at,
              COALESCE(NULLIF(event_type, ''), 'mariage') AS event_type
       FROM users ${where}
       ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
      vals
    );
    const count = await pool.query(`SELECT COUNT(*)::int FROM users ${where}`, vals.slice(0, -2));
    return res.json({ success: true, data: r.rows, total: count.rows[0].count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
adminRoutes.get('/users/:id', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  try {
    const r = await pool.query(
      `SELECT id,email,nom,prenom,role,is_active,avatar_url,phone,
              subscription_plan,subscription_status,subscription_expires_at,
              date_mariage,budget_mode,budget_global,created_at
       FROM users WHERE id=$1`,
      [userId]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/users/:id ────────────────────────────────────────────────
adminRoutes.patch('/users/:id', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { role, is_active, nom, prenom, phone } = req.body;

  try {
    const existing = await pool.query(`SELECT id,email,role FROM users WHERE id=$1`, [userId]);
    if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;

    if (role !== undefined) {
      const safeRole = sanitizeAssignedRole(existing.rows[0].email, role);
      if (!safeRole) {
        return res.status(403).json({ success: false, message: 'Rôle non autorisé pour cet utilisateur' });
      }
      sets.push(`role=$${i++}`); vals.push(safeRole);
    }
    if (is_active !== undefined) { sets.push(`is_active=$${i++}`); vals.push(is_active); }
    if (nom !== undefined) { sets.push(`nom=$${i++}`); vals.push(nom); }
    if (prenom !== undefined) { sets.push(`prenom=$${i++}`); vals.push(prenom); }
    if (phone !== undefined) { sets.push(`phone=$${i++}`); vals.push(phone); }

    if (sets.length === 0) return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });
    vals.push(userId);

    const r = await pool.query(
      `UPDATE users SET ${sets.join(',')} WHERE id=$${i} RETURNING id,email,nom,prenom,role,is_active,phone`,
      vals
    );
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
adminRoutes.delete('/users/:id', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.auth!.sub) {
    return res.status(400).json({ success: false, message: 'Impossible de supprimer son propre compte' });
  }
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
    return res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
adminRoutes.get('/stats', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE role='client') AS clients,
        (SELECT COUNT(*)::int FROM users WHERE role='prestataire') AS prestataires,
        (SELECT COUNT(*)::int FROM users WHERE role='boutique') AS boutiques,
        (SELECT COUNT(*)::int FROM users WHERE role='admin') AS admins,
        (SELECT COUNT(*)::int FROM users WHERE is_active=true) AS active_users,
        (SELECT COUNT(*)::int FROM users WHERE subscription_status='active') AS active_subscriptions,
        (SELECT COUNT(*)::int FROM users WHERE subscription_plan='plus' AND subscription_status='active') AS plus_subscribers,
        (SELECT COUNT(*)::int FROM conversations) AS conversations,
        (SELECT COUNT(*)::int FROM messages) AS messages,
        (SELECT COUNT(*)::int FROM prestataire_profiles WHERE is_verified=true) AS verified_prestataires,
        (SELECT COUNT(*)::int FROM prestataire_profiles WHERE is_suspended=true) AS suspended_prestataires,
        (SELECT COUNT(*)::int FROM reservations) AS reservations,
        (SELECT COUNT(*)::int FROM reservations WHERE status='confirmed') AS confirmed_reservations,
        (SELECT COUNT(*)::int FROM public_sites) AS public_sites,
        (SELECT COUNT(*)::int FROM payments WHERE status='succeeded') AS succeeded_payments,
        (SELECT COALESCE(SUM(amount_total),0)::int FROM payments WHERE status='succeeded') AS total_revenue_cents,
        (SELECT COALESCE(SUM(commission_amount),0)::int FROM payments WHERE status='succeeded') AS total_commission_cents,
        (SELECT COALESCE(json_object_agg(t, n), '{}'::json) FROM (
           SELECT COALESCE(NULLIF(event_type, ''), 'mariage') AS t, COUNT(*)::int AS n
           FROM users WHERE role='client' GROUP BY 1
         ) ev) AS events_by_type
    `);
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/export?sheets=utilisateurs,paiements ───────────────────────
// Données des exports Excel (toutes les lignes, colonnes déjà titrées en
// français). Sans `sheets` : tous les onglets.
adminRoutes.get('/export', async (req: Request, res: Response) => {
  const asked = String(req.query.sheets ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const keys = asked.length ? asked.filter(isExportSheetKey) : (Object.keys(EXPORT_SHEETS) as (keyof typeof EXPORT_SHEETS)[]);
  if (!keys.length) return res.status(400).json({ success: false, message: 'Export inconnu' });
  try {
    return res.json({ success: true, data: { generated_at: new Date().toISOString(), sheets: await buildAdminExport(keys) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Impossible de préparer l'export" });
  }
});

// ── GET /api/admin/credentials ────────────────────────────────────────────────
// Liste complète des comptes prestataires/boutiques avec leurs identifiants :
// ID, identifiant, email, et le mot de passe donné par l'admin (NULL si le
// prestataire l'a changé lui-même : seul son hash existe alors).
adminRoutes.get('/credentials', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.role, u.username, ${sqlVisibleEmail('u.email')} AS email,
              u.prenom, u.nom, u.must_change_password, u.is_active, u.created_at,
              pp.business_name, pp.category, pp.location_city AS city,
              COALESCE(pp.phone, u.phone) AS phone,
              apc.password AS admin_password,
              api.source, api.contact_email,
              COALESCE(ph.n, 0)::int AS photo_count
       FROM users u
       LEFT JOIN prestataire_profiles pp ON pp.user_id = u.id
       LEFT JOIN admin_presta_credentials apc ON apc.user_id = u.id
       LEFT JOIN admin_presta_import api ON api.user_id = u.id
       LEFT JOIN (SELECT prestataire_id, COUNT(*) AS n FROM prestataire_photos GROUP BY prestataire_id) ph
              ON ph.prestataire_id = pp.id
       WHERE u.role IN ('prestataire','boutique')
       ORDER BY (apc.user_id IS NULL), (api.source IS NOT NULL), api.source, u.id`
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/events?type=mariage|bar_mitsva|bat_mitsva|brit_mila ─────────
// Vue unique de TOUS les événements organisés dans l'app (un compte client =
// un événement). users.event_type NULL = mariage (comptes d'avant l'option).
const EVENT_TYPE_SQL = `COALESCE(NULLIF(u.event_type, ''), 'mariage')`;
const ADMIN_EVENT_TYPES = ['mariage', 'bar_mitsva', 'bat_mitsva', 'brit_mila'];

adminRoutes.get('/events', async (req: Request, res: Response) => {
  const type = String(req.query.type ?? '');
  const search = String(req.query.search ?? '').trim();
  const conditions = [`u.role = 'client'`];
  const vals: unknown[] = [];
  if (ADMIN_EVENT_TYPES.includes(type)) { vals.push(type); conditions.push(`${EVENT_TYPE_SQL} = $${vals.length}`); }
  if (search) {
    vals.push(`%${search}%`);
    const p = `$${vals.length}`;
    conditions.push(`(u.nom ILIKE ${p} OR u.prenom ILIKE ${p} OR u.email ILIKE ${p} OR u.bride_name ILIKE ${p}
                      OR u.groom_name ILIKE ${p} OR u.wedding_city ILIKE ${p})`);
  }
  try {
    const [list, summary] = await Promise.all([
      pool.query(
        `SELECT u.id, u.prenom, u.nom, ${sqlVisibleEmail('u.email')} AS email, u.phone,
                ${EVENT_TYPE_SQL} AS event_type, u.bride_name, u.groom_name,
                to_char(u.date_mariage, 'YYYY-MM-DD') AS event_date, u.wedding_city AS city,
                u.premium, u.is_active, u.created_at,
                COALESCE(g.guests, 0)::int AS guests, COALESCE(g.people, 0)::int AS guest_people,
                ws.slug AS site_slug,
                COALESCE(pay.total, 0)::int AS paid_cents
         FROM users u
         LEFT JOIN (
           SELECT user_id, COUNT(*) AS guests, SUM(guest_count) AS people
           FROM wedding_guests GROUP BY user_id
         ) g ON g.user_id = u.id
         LEFT JOIN LATERAL (
           SELECT slug FROM wedding_sites WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1
         ) ws ON true
         LEFT JOIN (
           SELECT client_id, SUM(amount_total) AS total FROM payments WHERE status = 'succeeded' GROUP BY client_id
         ) pay ON pay.client_id = u.id
         WHERE ${conditions.join(' AND ')}
         ORDER BY (u.date_mariage IS NULL), (u.date_mariage < CURRENT_DATE), u.date_mariage, u.created_at DESC
         LIMIT 500`,
        vals
      ),
      pool.query(
        `SELECT ${EVENT_TYPE_SQL} AS event_type,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE u.date_mariage >= CURRENT_DATE)::int AS upcoming,
                COUNT(*) FILTER (WHERE u.premium)::int AS premium
         FROM users u WHERE u.role = 'client'
         GROUP BY 1`
      ),
    ]);
    return res.json({ success: true, data: list.rows, summary: summary.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/prestataires ───────────────────────────────────────────────
adminRoutes.get('/prestataires', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = [`u.role IN ('prestataire','boutique')`];
  const vals: unknown[] = [];
  let i = 1;
  if (search) {
    conditions.push(`(pp.business_name ILIKE $${i} OR u.email ILIKE $${i} OR u.username ILIKE $${i} OR u.nom ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  vals.push(limit, offset);

  try {
    const r = await pool.query(
      `SELECT pp.*, ${sqlVisibleEmail('u.email')} AS email, u.username, u.must_change_password,
              u.nom, u.prenom, u.role, u.is_active AS user_active,
              u.subscription_plan, u.subscription_status,
              u.presta_sub_status, u.presta_current_period_end, u.presta_trial_end,
              CASE
                WHEN u.presta_sub_id = '${ADMIN_GRANT_SUB_ID}' THEN 'admin'
                WHEN u.presta_sub_id LIKE 'apple:%' THEN 'apple'
                WHEN u.presta_sub_id LIKE 'google:%' THEN 'google'
                WHEN u.presta_sub_id IS NOT NULL THEN 'stripe'
              END AS presta_sub_provider,
              (u.mot_de_passe IS NOT NULL) AS has_password,
              apc.password AS admin_password,
              sca.stripe_account_id, COALESCE(sca.charges_enabled, false) AS charges_enabled,
              COALESCE(sca.payouts_enabled, false) AS payouts_enabled
       FROM prestataire_profiles pp
       JOIN users u ON u.id = pp.user_id
       LEFT JOIN stripe_connect_accounts sca ON sca.user_id = pp.user_id
       LEFT JOIN admin_presta_credentials apc ON apc.user_id = pp.user_id
       ${where}
       ORDER BY pp.created_at DESC LIMIT $${i++} OFFSET $${i}`,
      vals
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── POST /api/admin/prestataires ──────────────────────────────────────────────
// L'admin crée le compte d'un prestataire : identifiants de connexion (email +
// mot de passe à lui transmettre), fiche annuaire, et mode de fonctionnement :
//   - 'offert' : abonnement gratuit, visible tout de suite (jusqu'à `offert_until`
//     ou sans limite) ;
//   - 'payant' : le prestataire active lui-même son abonnement depuis l'app.
adminRoutes.post('/prestataires', async (req: Request, res: Response) => {
  const {
    username, email, mot_de_passe, prenom, nom, business_name, category,
    location_city, phone, description, instagram_url, mode, offert_until,
  } = req.body ?? {};

  // Identifiant de connexion (l'email est facultatif : le prestataire l'ajoute
  // lui-même à sa première connexion).
  const login = normalizeUsername(username);
  if (!USERNAME_RULE.test(login)) {
    return res.status(400).json({
      success: false,
      message: 'Identifiant : 3 à 30 caractères, lettres minuscules, chiffres, point, tiret ou _ (sans espace ni accent)',
    });
  }
  const typedEmail = String(email ?? '').trim().toLowerCase();
  if (typedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typedEmail)) {
    return res.status(400).json({ success: false, message: 'Email invalide' });
  }
  const normalizedEmail = typedEmail || placeholderEmail(login);
  if (isAdminEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: 'Cet email est réservé à l\'administrateur' });
  }
  if (String(mot_de_passe ?? '').length < MIN_PWD) {
    return res.status(400).json({ success: false, message: `Mot de passe : ${MIN_PWD} caractères minimum` });
  }
  const bizName = String(business_name ?? '').trim();
  const cat = String(category ?? '').trim();
  if (!bizName || !cat) {
    return res.status(400).json({ success: false, message: 'Nom de l\'entreprise et catégorie requis' });
  }
  if (bizName.length > 200 || cat.length > 100 || String(phone ?? '').length > 50
      || String(prenom ?? '').length > 100 || String(nom ?? '').length > 100) {
    return res.status(400).json({ success: false, message: 'Un des champs est trop long' });
  }
  if (mode !== 'offert' && mode !== 'payant') {
    return res.status(400).json({ success: false, message: 'Mode : « offert » ou « payant »' });
  }
  const until = mode === 'offert' ? parseGrantUntil(offert_until) : null;
  if (until === 'invalid') {
    return res.status(400).json({ success: false, message: 'Date de fin de gratuité invalide ou déjà passée' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Anti-doublon : même entreprise (nom + ville) ou même téléphone qu'un
    // compte existant → refus, avec le compte déjà présent dans le message.
    await lockPrestaCreation(client);
    const dup = findIn(await loadExisting(client), { business_name: bizName, city: location_city, phone });
    if (dup) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: duplicateMessage(dup), duplicate: dup });
    }
    const hash = await bcrypt.hash(String(mot_de_passe), SALT_ROUNDS);
    const u = await client.query(
      `INSERT INTO users (email, nom, prenom, mot_de_passe, role, phone,
                          presta_sub_id, presta_sub_status, presta_current_period_end,
                          username, must_change_password)
       VALUES ($1,$2,$3,$4,'prestataire',$5,$6,$7,$8,$9,true)
       RETURNING id, username, nom, prenom, role`,
      [
        normalizedEmail,
        String(nom ?? '').trim() || bizName,
        String(prenom ?? '').trim() || bizName,
        hash,
        phone ? String(phone).trim() : null,
        mode === 'offert' ? ADMIN_GRANT_SUB_ID : null,
        mode === 'offert' ? 'active' : null,
        mode === 'offert' ? until : null,
        login,
      ]
    );
    const user = u.rows[0];
    await client.query(
      `INSERT INTO prestataire_profiles
         (user_id, business_name, category, description, location_city, phone, instagram_url, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [
        user.id, bizName, cat,
        description ? String(description).trim() : null,
        location_city ? String(location_city).trim() : null,
        phone ? String(phone).trim() : null,
        instagram_url ? String(instagram_url).trim().slice(0, 300) : null,
      ]
    );
    await client.query(
      `INSERT INTO admin_presta_credentials (user_id, email, password) VALUES ($1,$2,$3)`,
      [user.id, login, String(mot_de_passe)]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: 'Compte prestataire créé',
      data: { ...user, mode, offert_until: until ? until.toISOString() : null },
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => {});
    if ((err as { code?: string }).code === '23505') {
      return res.status(409).json({ success: false, message: 'Cet identifiant (ou cet email) est déjà utilisé' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  } finally {
    client.release();
  }
});

// ── POST /api/admin/prestataires/:userId/session ──────────────────────────────
// « Ouvrir son compte » : l'admin obtient une session du prestataire pour tout
// gérer à sa place (fiche, photos, vidéos, PDF, messages…). Réservé aux comptes
// prestataire/boutique ; jamais un autre admin ni un client. Le mot de passe du
// prestataire n'est ni lu ni modifié.
adminRoutes.post('/prestataires/:userId/session', async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ success: false, message: 'ID invalide' });
  try {
    const user = await sessionRepo.findById(userId);
    if (!user || (user.role !== 'prestataire' && user.role !== 'boutique') || isAdminEmail(user.email)) {
      return res.status(404).json({ success: false, message: 'Compte prestataire introuvable' });
    }
    const { mot_de_passe: _pwd, ...safeUser } = user as typeof user & { mot_de_passe?: string };
    const accessToken = signAccessToken(user.id, user.email, user.role as UserRole);
    const refreshToken = generateRefreshToken();
    // Session courte (24 h), repérable dans refresh_tokens.
    await sessionRepo.saveRefreshToken(user.id, refreshToken, new Date(Date.now() + 24 * 3600 * 1000), `admin:${req.auth!.sub}`);
    console.log(`[admin] session ouverte par l'admin ${req.auth!.sub} sur le compte ${user.id}`);
    return res.json({
      success: true,
      data: { ...safeUser, email: visibleEmail(user.email), role: user.role, accessToken, refreshToken },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/prestataires/:userId/email ───────────────────────────────
// L'admin renseigne (ou change) l'email d'un prestataire. Vide = retire l'email
// (le compte garde son identifiant de connexion).
adminRoutes.patch('/prestataires/:userId/email', async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const typed = String(req.body?.email ?? '').trim().toLowerCase();
  if (typed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) {
    return res.status(400).json({ success: false, message: 'Email invalide' });
  }
  if (typed && isAdminEmail(typed)) {
    return res.status(400).json({ success: false, message: "Cet email est réservé à l'administrateur" });
  }
  try {
    const row = (await pool.query(`SELECT id, role, username FROM users WHERE id=$1`, [userId])).rows[0];
    if (!row || (row.role !== 'prestataire' && row.role !== 'boutique')) {
      return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
    }
    if (!typed && !row.username) {
      return res.status(400).json({ success: false, message: "Ce compte n'a pas d'identifiant : l'email est obligatoire pour se connecter" });
    }
    const email = typed || placeholderEmail(row.username);
    const taken = await pool.query(`SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND id<>$2`, [email, userId]);
    if (taken.rowCount) {
      return res.status(409).json({ success: false, message: `Doublon : cet email est déjà utilisé par le compte ID ${taken.rows[0].id}` });
    }
    await pool.query(`UPDATE users SET email=$1 WHERE id=$2`, [email, userId]);
    // L'email est dans le JWT : on déconnecte les sessions pour qu'il soit repris.
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [userId]).catch(() => {});
    return res.json({ success: true, data: { email: typed || null } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/prestataires/:userId/mode ────────────────────────────────
// Bascule un prestataire existant entre « offert » et « payant ».
// Un abonnement réellement payé (Stripe / App Store / Google Play) n'est jamais
// écrasé : il faut d'abord que le prestataire le résilie.
adminRoutes.patch('/prestataires/:userId/mode', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { mode, offert_until } = req.body ?? {};
  if (mode !== 'offert' && mode !== 'payant') {
    return res.status(400).json({ success: false, message: 'Mode : « offert » ou « payant »' });
  }
  try {
    const row = (await pool.query(
      `SELECT id, role, presta_sub_id, presta_sub_status FROM users WHERE id=$1`, [userId]
    )).rows[0];
    if (!row || row.role !== 'prestataire') {
      return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
    }
    const paidSub = row.presta_sub_id && !isAdminGrant(row.presta_sub_id)
      && isPrestaSubActive(row.presta_sub_status);

    if (mode === 'offert') {
      if (paidSub) {
        return res.status(409).json({
          success: false,
          message: 'Ce prestataire a déjà un abonnement payant actif. Il doit le résilier avant de passer en offert.',
        });
      }
      const until = parseGrantUntil(offert_until);
      if (until === 'invalid') {
        return res.status(400).json({ success: false, message: 'Date de fin de gratuité invalide ou déjà passée' });
      }
      await pool.query(
        `UPDATE users SET presta_sub_id=$1, presta_sub_status='active',
                          presta_trial_end=NULL, presta_current_period_end=$2
         WHERE id=$3`,
        [ADMIN_GRANT_SUB_ID, until, userId]
      );
    } else {
      if (!isAdminGrant(row.presta_sub_id)) {
        return res.json({ success: true, message: 'Déjà en mode payant', data: { mode: 'payant' } });
      }
      await pool.query(
        `UPDATE users SET presta_sub_id=NULL, presta_sub_status=NULL,
                          presta_trial_end=NULL, presta_current_period_end=NULL
         WHERE id=$1`,
        [userId]
      );
    }
    return res.json({ success: true, data: { mode } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/users/:id/password ───────────────────────────────────────
// Nouveau mot de passe choisi par l'admin (prestataire qui a perdu ses identifiants).
adminRoutes.patch('/users/:id/password', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { mot_de_passe } = req.body ?? {};
  if (String(mot_de_passe ?? '').length < MIN_PWD) {
    return res.status(400).json({ success: false, message: `Mot de passe : ${MIN_PWD} caractères minimum` });
  }
  try {
    const row = (await pool.query(`SELECT email, username FROM users WHERE id=$1`, [userId])).rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    if (isAdminEmail(row.email)) {
      return res.status(403).json({ success: false, message: 'Impossible de modifier le compte administrateur ici' });
    }
    const hash = await bcrypt.hash(String(mot_de_passe), SALT_ROUNDS);
    // Mot de passe donné par l'admin : l'app proposera de le changer.
    await pool.query(`UPDATE users SET mot_de_passe=$1, must_change_password=true WHERE id=$2`, [hash, userId]);
    await pool.query(
      `INSERT INTO admin_presta_credentials (user_id, email, password) VALUES ($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password, updated_at=NOW()`,
      [userId, row.username ?? row.email, String(mot_de_passe)]
    );
    // Déconnecte les sessions existantes : l'ancien mot de passe ne doit plus servir.
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [userId]).catch(() => {});
    return res.json({ success: true, message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/prestataires/:userId/verify ──────────────────────────────
adminRoutes.patch('/prestataires/:userId/verify', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { is_verified } = req.body;
  try {
    const r = await pool.query(
      `UPDATE prestataire_profiles SET is_verified=$1, updated_at=NOW() WHERE user_id=$2
       RETURNING id, user_id, is_verified`,
      [Boolean(is_verified), userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Profil introuvable' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/prestataires/:userId/suspend ─────────────────────────────
adminRoutes.patch('/prestataires/:userId/suspend', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { is_suspended } = req.body;
  try {
    const r = await pool.query(
      `UPDATE prestataire_profiles SET is_suspended=$1, updated_at=NOW() WHERE user_id=$2
       RETURNING id, user_id, is_suspended`,
      [Boolean(is_suspended), userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Profil introuvable' });
    if (is_suspended) {
      await pool.query(`UPDATE users SET is_active=false WHERE id=$1`, [userId]);
    }
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── DELETE /api/admin/prestataires/:userId ────────────────────────────────────
adminRoutes.delete('/prestataires/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    const r = await pool.query(
      `DELETE FROM prestataire_profiles WHERE user_id=$1 RETURNING id`,
      [userId]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Profil prestataire introuvable' });
    }
    return res.json({ success: true, message: 'Profil prestataire supprimé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/boutiques ──────────────────────────────────────────────────
adminRoutes.get('/boutiques', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = [`u.role='boutique'`];
  const vals: unknown[] = [];
  let i = 1;
  if (search) {
    conditions.push(`(u.email ILIKE $${i} OR u.nom ILIKE $${i} OR pp.business_name ILIKE $${i})`);
    vals.push(`%${search}%`); i++;
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  vals.push(limit, offset);

  try {
    const r = await pool.query(
      `SELECT u.id, u.email, u.nom, u.prenom, u.is_active, u.subscription_plan,
              u.subscription_status, u.subscription_started_at, u.subscription_expires_at,
              pp.business_name, pp.category, pp.location_city, pp.is_suspended
       FROM users u
       LEFT JOIN prestataire_profiles pp ON pp.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC LIMIT $${i++} OFFSET $${i}`,
      vals
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/boutiques/:userId ────────────────────────────────────────
adminRoutes.patch('/boutiques/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  const { is_active, subscription_plan, subscription_status, business_name, is_suspended } = req.body;

  try {
    const u = await pool.query(`SELECT id FROM users WHERE id=$1 AND role='boutique'`, [userId]);
    if (!u.rows[0]) return res.status(404).json({ success: false, message: 'Boutique introuvable' });

    if (is_active !== undefined) {
      await pool.query(`UPDATE users SET is_active=$1 WHERE id=$2`, [is_active, userId]);
    }
    if (subscription_plan !== undefined || subscription_status !== undefined) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let j = 1;
      if (subscription_plan !== undefined) { sets.push(`subscription_plan=$${j++}`); vals.push(subscription_plan); }
      if (subscription_status !== undefined) { sets.push(`subscription_status=$${j++}`); vals.push(subscription_status); }
      vals.push(userId);
      await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${j}`, vals);
    }
    if (business_name !== undefined || is_suspended !== undefined) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let j = 1;
      if (business_name !== undefined) { sets.push(`business_name=$${j++}`); vals.push(business_name); }
      if (is_suspended !== undefined) { sets.push(`is_suspended=$${j++}`); vals.push(is_suspended); }
      vals.push(userId);
      await pool.query(
        `UPDATE prestataire_profiles SET ${sets.join(',')}, updated_at=NOW() WHERE user_id=$${j}`,
        vals
      );
    }

    const r = await pool.query(
      `SELECT u.id, u.email, u.nom, u.prenom, u.is_active, u.subscription_plan, u.subscription_status,
              pp.business_name, pp.is_suspended
       FROM users u LEFT JOIN prestataire_profiles pp ON pp.user_id = u.id WHERE u.id=$1`,
      [userId]
    );
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── DELETE /api/admin/boutiques/:userId ───────────────────────────────────────
adminRoutes.delete('/boutiques/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  if (userId === req.auth!.sub) {
    return res.status(400).json({ success: false, message: 'Impossible de supprimer son propre compte' });
  }
  try {
    await pool.query(`DELETE FROM users WHERE id=$1 AND role='boutique'`, [userId]);
    return res.json({ success: true, message: 'Boutique supprimée' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/public-sites (annonces / contenus) ─────────────────────────
adminRoutes.get('/public-sites', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const r = await pool.query(
      `SELECT ps.*, u.email AS owner_email, u.prenom AS owner_prenom, u.nom AS owner_nom
       FROM public_sites ps
       JOIN users u ON u.id = ps.user_id
       ORDER BY ps.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/public-sites/:id ─────────────────────────────────────────
adminRoutes.patch('/public-sites/:id', async (req: Request, res: Response) => {
  const siteId = parseInt(req.params.id, 10);
  const { is_published, is_hidden, bride_name, groom_name, location } = req.body;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (is_published !== undefined) { sets.push(`is_published=$${i++}`); vals.push(is_published); }
  if (is_hidden !== undefined) { sets.push(`is_hidden=$${i++}`); vals.push(is_hidden); }
  if (bride_name !== undefined) { sets.push(`bride_name=$${i++}`); vals.push(bride_name); }
  if (groom_name !== undefined) { sets.push(`groom_name=$${i++}`); vals.push(groom_name); }
  if (location !== undefined) { sets.push(`location=$${i++}`); vals.push(location); }
  if (sets.length === 0) return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });
  sets.push(`updated_at=NOW()`);
  vals.push(siteId);
  try {
    const r = await pool.query(
      `UPDATE public_sites SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Site introuvable' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── DELETE /api/admin/public-sites/:id ────────────────────────────────────────
adminRoutes.delete('/public-sites/:id', async (req: Request, res: Response) => {
  const siteId = parseInt(req.params.id, 10);
  try {
    await pool.query(`DELETE FROM public_sites WHERE id=$1`, [siteId]);
    return res.json({ success: true, message: 'Site supprimé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/annonces/:profileId (masquer profil prestataire) ─────────
adminRoutes.patch('/annonces/:profileId', async (req: Request, res: Response) => {
  const profileId = parseInt(req.params.profileId, 10);
  const { is_hidden, business_name, description } = req.body;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (is_hidden !== undefined) { sets.push(`is_hidden=$${i++}`); vals.push(is_hidden); }
  if (business_name !== undefined) { sets.push(`business_name=$${i++}`); vals.push(business_name); }
  if (description !== undefined) { sets.push(`description=$${i++}`); vals.push(description); }
  if (sets.length === 0) return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });
  sets.push(`updated_at=NOW()`);
  vals.push(profileId);
  try {
    const r = await pool.query(
      `UPDATE prestataire_profiles SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Annonce introuvable' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/reservations ───────────────────────────────────────────────
adminRoutes.get('/reservations', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (status) { conditions.push(`r.status=$${i++}`); vals.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  vals.push(limit, offset);

  try {
    const r = await pool.query(
      `SELECT r.*,
              uc.prenom AS client_prenom, uc.nom AS client_nom, uc.email AS client_email,
              up.prenom AS presta_prenom, up.nom AS presta_nom,
              pp.business_name
       FROM reservations r
       JOIN users uc ON uc.id = r.client_id
       JOIN users up ON up.id = r.prestataire_id
       LEFT JOIN prestataire_profiles pp ON pp.user_id = r.prestataire_id
       ${where}
       ORDER BY r.created_at DESC LIMIT $${i++} OFFSET $${i}`,
      vals
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── PATCH /api/admin/reservations/:id ─────────────────────────────────────────
adminRoutes.patch('/reservations/:id', async (req: Request, res: Response) => {
  const resId = parseInt(req.params.id, 10);
  const { status, event_date, amount_cents, notes } = req.body;
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (status !== undefined) { sets.push(`status=$${i++}`); vals.push(status); }
  if (event_date !== undefined) { sets.push(`event_date=$${i++}`); vals.push(event_date); }
  if (amount_cents !== undefined) { sets.push(`amount_cents=$${i++}`); vals.push(amount_cents); }
  if (notes !== undefined) { sets.push(`notes=$${i++}`); vals.push(notes); }
  if (sets.length === 0) return res.status(400).json({ success: false, message: 'Rien à mettre à jour' });
  sets.push(`updated_at=NOW()`);
  vals.push(resId);
  try {
    const r = await pool.query(
      `UPDATE reservations SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Réservation introuvable' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── DELETE /api/admin/reservations/:id ────────────────────────────────────────
adminRoutes.delete('/reservations/:id', async (req: Request, res: Response) => {
  const resId = parseInt(req.params.id, 10);
  try {
    await pool.query(`DELETE FROM reservations WHERE id=$1`, [resId]);
    return res.json({ success: true, message: 'Réservation annulée' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/payments ───────────────────────────────────────────────────
adminRoutes.get('/payments', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const r = await pool.query(
      `SELECT p.*,
              uc.nom AS client_nom, uc.prenom AS client_prenom, uc.email AS client_email,
              up.nom AS presta_nom, up.prenom AS presta_prenom,
              pp.business_name
       FROM payments p
       JOIN users uc ON uc.id = p.client_id
       JOIN users up ON up.id = p.prestataire_id
       LEFT JOIN prestataire_profiles pp ON pp.user_id = p.prestataire_id
       ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/payments/stats ─────────────────────────────────────────────
adminRoutes.get('/payments/stats', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total_transactions,
        COUNT(*) FILTER (WHERE status='succeeded')::int AS succeeded,
        COUNT(*) FILTER (WHERE status='pending')::int AS pending,
        COUNT(*) FILTER (WHERE status='failed')::int AS failed,
        COALESCE(SUM(amount_total) FILTER (WHERE status='succeeded'),0)::int AS revenue_cents,
        COALESCE(SUM(commission_amount) FILTER (WHERE status='succeeded'),0)::int AS commission_cents,
        COALESCE(SUM(net_amount) FILTER (WHERE status='succeeded'),0)::int AS net_to_prestataires_cents
      FROM payments
    `);
    const connect = await pool.query(`
      SELECT COUNT(*)::int AS total_connect_accounts,
             COUNT(*) FILTER (WHERE charges_enabled=true)::int AS active_connect_accounts
      FROM stripe_connect_accounts
    `);
    return res.json({
      success: true,
      data: { ...r.rows[0], ...connect.rows[0] },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/admin/subscriptions ──────────────────────────────────────────────
adminRoutes.get('/subscriptions', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const where = status ? `WHERE subscription_status=$1 AND role='boutique'` : `WHERE role='boutique'`;
  const vals: unknown[] = status ? [status, limit, offset] : [limit, offset];
  const limitIdx = status ? 2 : 1;

  try {
    const r = await pool.query(
      `SELECT id,email,nom,prenom,role,is_active,
              subscription_plan,subscription_status,subscription_started_at,subscription_expires_at
       FROM users ${where}
       ORDER BY subscription_started_at DESC NULLS LAST
       LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      vals
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});
