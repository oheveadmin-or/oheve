/**
 * Rattachement d'une fiche créée par l'équipe.
 *
 * Cas : l'équipe a créé le compte d'un prestataire (identifiant + mot de passe
 * provisoire) mais lui, sans le savoir, s'inscrit lui-même. Au moment où il
 * remplit sa fiche, on compare nom + ville / téléphone (même règle que
 * l'anti-doublon admin) avec les comptes à identifiant.
 *
 *  - POST /api/prestataires/claim/check : y a-t-il une fiche qui lui ressemble ?
 *    Renvoie seulement le nom/ville/catégorie et un email MASQUÉ (c•••@gmail.com).
 *  - POST /api/prestataires/claim/send  : « oui c'est moi ».
 *      · email connu ET confirmé par lui → nouveau mot de passe provisoire
 *        envoyé à CET email (jamais à l'email qu'il vient de taper : sinon
 *        n'importe qui pourrait prendre la fiche d'un autre) ;
 *      · pas d'email connu (ou « ce n'est plus mon adresse ») → demande envoyée
 *        à l'équipe, qui vérifie à la main.
 *    Dans les deux cas, le compte vide qu'il vient de créer est supprimé, pour
 *    que son email reste libre et qu'il puisse l'ajouter à sa vraie fiche.
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Request, Response, Router } from 'express';

import { isPlaceholderEmail } from '../auth/username';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { sendClaimCredentialsEmail, sendClaimReviewEmail } from '../utils/mailer';
import { matches, type Candidate } from '../admin/duplicates';

export const claimRoutes = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const SEND_COOLDOWN_MS = 10 * 60 * 1000;
const CHECK_LIMIT_PER_HOUR = 30;

type Target = {
  id: number;
  business_name: string;
  city: string | null;
  category: string | null;
  username: string;
  activated: boolean;
  known_email: string | null;
};

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '';
  return `${local.slice(0, 1)}•••@${domain}`;
}

/** Fiche à identifiant (créée par l'équipe) qui ressemble à ce qu'il a saisi. */
async function findTarget(meId: number, c: Candidate): Promise<Target | null> {
  if (!String(c.business_name ?? '').trim() && !String(c.phone ?? '').trim()) return null;
  const r = await pool.query(
    `SELECT u.id, pp.business_name, pp.location_city AS city, pp.category, u.username,
            NOT u.must_change_password AS activated, u.email,
            COALESCE(pp.phone, u.phone) AS phone, api.contact_email
       FROM users u
       JOIN prestataire_profiles pp ON pp.user_id = u.id
       LEFT JOIN admin_presta_import api ON api.user_id = u.id
      WHERE u.role = 'prestataire' AND u.username IS NOT NULL AND u.id <> $1
      ORDER BY u.id`,
    [meId],
  ).catch(async (err) => {
    // admin_presta_import absente (base neuve) : même requête sans l'email de prospection.
    if ((err as { code?: string }).code !== '42P01') throw err;
    return pool.query(
      `SELECT u.id, pp.business_name, pp.location_city AS city, pp.category, u.username,
              NOT u.must_change_password AS activated, u.email,
              COALESCE(pp.phone, u.phone) AS phone, NULL AS contact_email
         FROM users u JOIN prestataire_profiles pp ON pp.user_id = u.id
        WHERE u.role = 'prestataire' AND u.username IS NOT NULL AND u.id <> $1
        ORDER BY u.id`,
      [meId],
    );
  });
  for (const row of r.rows) {
    if (!matches(c, row)) continue;
    const real = row.email && !isPlaceholderEmail(row.email) ? String(row.email).toLowerCase() : null;
    const contact = row.contact_email && EMAIL_RE.test(String(row.contact_email).trim())
      ? String(row.contact_email).trim().toLowerCase() : null;
    return {
      id: row.id,
      business_name: row.business_name ?? '',
      city: row.city,
      category: row.category,
      username: row.username,
      activated: !!row.activated,
      known_email: real ?? contact,
    };
  }
  return null;
}

function candidateFrom(body: unknown): Candidate {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    business_name: String(b.business_name ?? '').slice(0, 200),
    city: String(b.city ?? '').slice(0, 120),
    phone: String(b.phone ?? '').slice(0, 50),
  };
}

// Petites limites en mémoire : empêchent de deviner les fiches en boucle.
const checks = new Map<number, number[]>();
const lastSend = new Map<number, number>();

function tooManyChecks(userId: number): boolean {
  const now = Date.now();
  const recent = (checks.get(userId) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  checks.set(userId, recent);
  return recent.length > CHECK_LIMIT_PER_HOUR;
}

/** Le compte qui fait la demande doit être un compte prestataire neuf et vide. */
async function loadRequester(userId: number) {
  const r = await pool.query(
    `SELECT u.id, u.email, u.role, u.username, u.presta_sub_id,
            EXISTS (SELECT 1 FROM prestataire_profiles pp WHERE pp.user_id = u.id) AS has_profile
       FROM users u WHERE u.id = $1`,
    [userId],
  );
  return r.rows[0] as
    | { id: number; email: string; role: string; username: string | null; presta_sub_id: string | null; has_profile: boolean }
    | undefined;
}

function isFreshEmptyPresta(u: NonNullable<Awaited<ReturnType<typeof loadRequester>>>): boolean {
  return u.role === 'prestataire' && !u.username && !u.has_profile && !u.presta_sub_id;
}

function tempPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// ── POST /claim/check ─────────────────────────────────────────────────────────
claimRoutes.post('/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const me = await loadRequester(req.auth!.sub);
    if (!me || !isFreshEmptyPresta(me)) return res.json({ success: true, data: { match: null } });
    if (tooManyChecks(me.id)) {
      return res.status(429).json({ success: false, message: 'Trop de tentatives, réessayez plus tard.' });
    }
    const t = await findTarget(me.id, candidateFrom(req.body));
    if (!t) return res.json({ success: true, data: { match: null } });
    return res.json({
      success: true,
      data: {
        match: {
          id: t.id,
          business_name: t.business_name,
          city: t.city,
          category: t.category,
          activated: t.activated,
          email_hint: t.known_email ? maskEmail(t.known_email) : null,
        },
      },
    });
  } catch (err) {
    console.error('claim/check', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ── POST /claim/send ──────────────────────────────────────────────────────────
claimRoutes.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const me = await loadRequester(req.auth!.sub);
    if (!me || !isFreshEmptyPresta(me)) {
      return res.status(400).json({ success: false, message: 'Ce compte ne peut pas être rattaché.' });
    }
    const targetId = Number((req.body ?? {}).target_id);
    const emailConfirmed = (req.body ?? {}).email_confirmed === true;
    const c = candidateFrom(req.body);
    // On revérifie la correspondance : l'id seul ne suffit pas.
    const t = await findTarget(me.id, c);
    if (!t || t.id !== targetId) {
      return res.status(404).json({ success: false, message: 'Fiche introuvable.' });
    }
    const last = lastSend.get(t.id) ?? 0;
    if (Date.now() - last < SEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        message: 'Un email vient déjà d\'être envoyé pour cette fiche. Vérifiez votre boîte (et les spams) ou réessayez dans 10 minutes.',
      });
    }

    let outcome: 'sent' | 'already_active' | 'review';
    if (t.known_email && emailConfirmed && !t.activated) {
      // Nouveau mot de passe provisoire → envoyé à l'email déjà connu de la fiche.
      const pwd = tempPassword();
      const hash = await bcrypt.hash(pwd, SALT_ROUNDS);
      await sendClaimCredentialsEmail({ to: t.known_email, businessName: t.business_name, username: t.username, tempPassword: pwd });
      await pool.query(`UPDATE users SET mot_de_passe=$1, must_change_password=true WHERE id=$2`, [hash, t.id]);
      await pool.query(
        `INSERT INTO admin_presta_credentials (user_id, email, password) VALUES ($1,$2,$3)
         ON CONFLICT (user_id) DO UPDATE SET email=EXCLUDED.email, password=EXCLUDED.password, updated_at=NOW()`,
        [t.id, t.username, pwd],
      );
      await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [t.id]).catch(() => {});
      outcome = 'sent';
    } else if (t.known_email && emailConfirmed && t.activated) {
      // Fiche déjà activée par quelqu'un : on ne touche pas à son mot de passe.
      outcome = 'already_active';
    } else {
      await sendClaimReviewEmail({
        requesterEmail: me.email,
        requesterPhone: c.phone ?? '',
        typedName: c.business_name,
        typedCity: c.city ?? '',
        targetId: t.id,
        targetName: t.business_name,
        targetUsername: t.username,
        reason: t.known_email ? 'il dit que l\'email connu n\'est plus le sien' : 'aucun email connu pour cette fiche',
      });
      outcome = 'review';
    }
    lastSend.set(t.id, Date.now());

    // Son compte vide disparaît : son email redevient libre pour sa vraie fiche.
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [me.id]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE id=$1`, [me.id]);

    return res.json({
      success: true,
      data: {
        outcome,
        username: outcome === 'sent' ? t.username : null,
        email_hint: t.known_email ? maskEmail(t.known_email) : null,
      },
    });
  } catch (err) {
    console.error('claim/send', err);
    return res.status(500).json({ success: false, message: 'L\'envoi a échoué. Réessayez dans un instant.' });
  }
});
