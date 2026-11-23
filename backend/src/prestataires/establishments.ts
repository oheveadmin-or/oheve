/**
 * Plusieurs établissements sous un même compte prestataire
 * (ex. un groupe hôtelier avec plusieurs hôtels).
 *
 * Chaque établissement est un compte prestataire à part entière (sa fiche, ses
 * photos, ses messages, ses demandes, son agenda, son abonnement) : tout le
 * reste de l'app continue de fonctionner par `user_id` sans changement.
 * Ce qui les relie : `users.presta_owner_id` = le compte principal (celui qui
 * se connecte). Les établissements ajoutés n'ont ni mot de passe ni email réel :
 * on y entre uniquement en basculant depuis un compte du même groupe.
 *
 * Ouvert à TOUS les prestataires, abonnés ou non. L'abonnement (et donc le
 * badge partenaire) reste par établissement.
 */
import crypto from 'crypto';
import { Router, Request, Response } from 'express';

import { PLACEHOLDER_EMAIL_DOMAIN, visibleEmail } from '../auth/username';
import { UserRole, generateRefreshToken, refreshTokenExpiresAt, signAccessToken } from '../auth/jwt';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { findIn, loadExisting, lockPrestaCreation } from '../admin/duplicates';

/** Garde-fou : nombre maximal d'établissements dans un groupe (compte principal inclus). */
export const MAX_ESTABLISHMENTS = 30;

export async function ensureEstablishmentsSchema(): Promise<void> {
  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS presta_owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_users_presta_owner ON users(presta_owner_id) WHERE presta_owner_id IS NOT NULL`
  );
}

/** Compte principal du groupe auquel appartient `userId` (lui-même s'il n'est rattaché à personne). */
export async function groupOwnerOf(userId: number): Promise<number | null> {
  const r = await pool.query(`SELECT id, presta_owner_id, role FROM users WHERE id=$1`, [userId]);
  const row = r.rows[0];
  if (!row || row.role !== 'prestataire') return null;
  return row.presta_owner_id ?? row.id;
}

type EstablishmentRow = {
  id: number;
  is_owner: boolean;
  business_name: string | null;
  category: string | null;
  location_city: string | null;
  cover_filename: string | null;
  presta_sub_status: string | null;
};

async function listGroup(ownerId: number): Promise<EstablishmentRow[]> {
  const r = await pool.query(
    `SELECT u.id, (u.id = $1) AS is_owner, u.presta_sub_status,
            p.business_name, p.category, p.location_city, ph.filename AS cover_filename
       FROM users u
       LEFT JOIN prestataire_profiles p ON p.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT filename FROM prestataire_photos
          WHERE prestataire_id = p.id AND COALESCE(media_type,'image')='image'
          ORDER BY is_cover DESC, created_at ASC LIMIT 1
       ) ph ON true
      WHERE u.role = 'prestataire' AND (u.id = $1 OR u.presta_owner_id = $1)
      ORDER BY (u.id = $1) DESC, u.id ASC`,
    [ownerId]
  );
  return r.rows as EstablishmentRow[];
}

function coverUrl(req: Request, filename: string | null): string | null {
  if (!filename) return null;
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  return `${protocol}://${host}/uploads/photos/${filename}`;
}

function onlyPrestataire(req: Request, res: Response): boolean {
  if (req.auth?.role !== 'prestataire') {
    res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
    return false;
  }
  return true;
}

export const establishmentRoutes = Router();
establishmentRoutes.use(requireAuth);

// ── GET /api/prestataires/establishments ──────────────────────────────────────
// Tous les établissements du groupe (compte principal en premier).
establishmentRoutes.get('/', async (req: Request, res: Response) => {
  if (!onlyPrestataire(req, res)) return;
  try {
    const ownerId = await groupOwnerOf(req.auth!.sub);
    if (!ownerId) return res.status(404).json({ success: false, message: 'Compte introuvable' });
    const rows = await listGroup(ownerId);
    return res.json({
      success: true,
      data: {
        current_id: req.auth!.sub,
        owner_id: ownerId,
        max: MAX_ESTABLISHMENTS,
        items: rows.map((r) => ({
          id: r.id,
          is_owner: r.is_owner,
          is_current: r.id === req.auth!.sub,
          business_name: r.business_name,
          category: r.category,
          location_city: r.location_city,
          cover_url: coverUrl(req, r.cover_filename),
          sub_status: r.presta_sub_status,
        })),
      },
    });
  } catch (err) {
    console.error('establishments list:', err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── POST /api/prestataires/establishments ─────────────────────────────────────
// Ajoute un établissement au groupe : un nouveau compte prestataire (sans mot
// de passe) + sa fiche, rattaché au compte principal.
establishmentRoutes.post('/', async (req: Request, res: Response) => {
  if (!onlyPrestataire(req, res)) return;
  const bizName = String(req.body?.business_name ?? '').trim();
  const category = String(req.body?.category ?? '').trim();
  const city = String(req.body?.location_city ?? '').trim();
  if (!bizName || !category) {
    return res.status(400).json({ success: false, message: "Nom de l'établissement et catégorie requis" });
  }
  if (bizName.length > 200 || category.length > 100 || city.length > 120) {
    return res.status(400).json({ success: false, message: 'Un des champs est trop long' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ownerId = await groupOwnerOf(req.auth!.sub);
    if (!ownerId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Compte introuvable' });
    }
    const count = (await client.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE role='prestataire' AND (id=$1 OR presta_owner_id=$1)`,
      [ownerId]
    )).rows[0].n as number;
    if (count >= MAX_ESTABLISHMENTS) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Vous avez atteint ${MAX_ESTABLISHMENTS} établissements. Contactez-nous pour en ajouter davantage.`,
      });
    }

    // Anti-doublon (même règle que l'admin) : un établissement qui existe déjà
    // HORS du groupe est refusé (sinon deux fiches pour le même lieu). Dans le
    // groupe, deux hôtels du même nom dans la même ville sont aussi refusés.
    await lockPrestaCreation(client);
    const hit = findIn(await loadExisting(client), { business_name: bizName, city: city || null });
    if (hit) {
      await client.query('ROLLBACK');
      const inGroup = (await pool.query(
        `SELECT 1 FROM users WHERE id=$1 AND (id=$2 OR presta_owner_id=$2)`, [hit.id, ownerId]
      )).rowCount;
      return res.status(409).json({
        success: false,
        message: inGroup
          ? `« ${hit.business_name} »${hit.city ? ` (${hit.city})` : ''} fait déjà partie de vos établissements.`
          : `Un établissement « ${hit.business_name} »${hit.city ? ` (${hit.city})` : ''} existe déjà sur Oheve. Si c'est le vôtre, contactez-nous pour le rattacher à votre compte.`,
      });
    }

    // Email technique (jamais montré ni utilisé pour écrire) : la colonne est NOT NULL UNIQUE.
    const email = `etab-${ownerId}-${crypto.randomBytes(6).toString('hex')}@${PLACEHOLDER_EMAIL_DOMAIN}`;
    const owner = (await client.query(`SELECT phone, notifications_email FROM users WHERE id=$1`, [ownerId])).rows[0];
    const u = await client.query(
      `INSERT INTO users (email, nom, prenom, mot_de_passe, role, phone, presta_owner_id)
       VALUES ($1, $2, $2, NULL, 'prestataire', $3, $4)
       RETURNING id`,
      [email, bizName.slice(0, 100), owner?.phone ?? null, ownerId]
    );
    const newId = u.rows[0].id as number;
    if (owner && owner.notifications_email === false) {
      await client.query(`UPDATE users SET notifications_email=false WHERE id=$1`, [newId]).catch(() => {});
    }
    await client.query(
      `INSERT INTO prestataire_profiles (user_id, business_name, category, location_city, updated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [newId, bizName, category, city || null]
    );
    await client.query('COMMIT');
    console.log(`[etablissements] ${req.auth!.sub} a ajouté l'établissement ${newId} au groupe ${ownerId}`);
    return res.status(201).json({ success: true, data: { id: newId } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('establishments create:', err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  } finally {
    client.release();
  }
});

// ── POST /api/prestataires/establishments/:id/session ─────────────────────────
// Bascule vers un autre établissement du MÊME groupe : nouvelle session sur ce
// compte (aucun mot de passe demandé, la personne est déjà connectée au groupe).
establishmentRoutes.post('/:id/session', async (req: Request, res: Response) => {
  if (!onlyPrestataire(req, res)) return;
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ success: false, message: 'ID invalide' });
  }
  try {
    const ownerId = await groupOwnerOf(req.auth!.sub);
    const target = (await pool.query(
      `SELECT * FROM users WHERE id=$1 AND role='prestataire' AND is_active = true AND (id=$2 OR presta_owner_id=$2)`,
      [targetId, ownerId]
    )).rows[0];
    if (!ownerId || !target) {
      return res.status(404).json({ success: false, message: 'Établissement introuvable dans votre compte' });
    }
    const { mot_de_passe: _pwd, ...safeUser } = target;
    const accessToken = signAccessToken(target.id, target.email, target.role as UserRole);
    const refreshToken = generateRefreshToken();
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, device_name) VALUES ($1,$2,$3,$4)`,
      [target.id, refreshToken, refreshTokenExpiresAt(), `etab:${req.auth!.sub}`]
    );
    return res.json({
      success: true,
      data: { ...safeUser, email: visibleEmail(target.email), accessToken, refreshToken },
    });
  } catch (err) {
    console.error('establishments session:', err);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

/**
 * Suppression du compte principal : ses établissements partent avec lui
 * (sinon des fiches orphelines resteraient en ligne sans personne pour les gérer).
 * Renvoie les ids supprimés.
 */
export async function establishmentsOf(ownerId: number): Promise<number[]> {
  const r = await pool.query(`SELECT id FROM users WHERE presta_owner_id=$1 AND role='prestataire'`, [ownerId]);
  return r.rows.map((x) => x.id as number);
}
