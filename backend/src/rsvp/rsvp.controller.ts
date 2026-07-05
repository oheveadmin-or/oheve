import type { Request, Response } from 'express';
import { pool } from '../config/database';
import { addSSEClient, getRSVPAnswers, submitRSVP } from './rsvp.service';
import { rsvpRepository } from './rsvp.repository';

/**
 * Vérifie que le slug appartient bien à l'utilisateur authentifié.
 * Sans ce contrôle, n'importe quel compte pouvait lire les réponses RSVP
 * (noms, emails, téléphones) de n'importe quel mariage.
 * Les sites legacy sans propriétaire (user_id NULL) restent accessibles.
 */
async function userOwnsSlug(userId: number, slug: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT user_id FROM wedding_sites WHERE slug = $1
     UNION ALL
     SELECT user_id FROM public_sites WHERE slug = $1`,
    [slug.toLowerCase()]
  );
  if (rows.length === 0) return false;
  return rows.some((r: { user_id: number | null }) => r.user_id === null || r.user_id === userId);
}

export async function postRSVPAnswer(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const body = req.body as Record<string, unknown>;

  if (!body.firstname || !body.lastname) {
    res.status(400).json({ success: false, message: 'Prénom et nom requis.' });
    return;
  }

  try {
    const row = await submitRSVP({
      weddingSlug: slug,
      formId: typeof body.formId === 'string' ? body.formId : undefined,
      inviteToken: typeof body.inviteToken === 'string' ? body.inviteToken : undefined,
      firstname: String(body.firstname),
      lastname: String(body.lastname),
      email: typeof body.email === 'string' ? body.email : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      dietaryRestrictions: typeof body.dietaryRestrictions === 'string' ? body.dietaryRestrictions : undefined,
      dietarySelections: Array.isArray(body.dietarySelections) ? body.dietarySelections.map(String) : [],
      drinkPreference: typeof body.drinkPreference === 'string' ? body.drinkPreference : undefined,
      events: (body.events as Record<string, { attending: boolean; guestCount?: number }>) ?? {},
      message: typeof body.message === 'string' ? body.message : undefined,
    });

    res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('[RSVP] submit error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

export async function getRSVPAnswerList(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  try {
    if (req.auth?.role !== 'admin' && !(await userOwnsSlug(req.auth!.sub, slug))) {
      res.status(403).json({ success: false, message: 'Accès refusé : ce site ne vous appartient pas.' });
      return;
    }
    const rows = await getRSVPAnswers(slug);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[RSVP] list error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

/** SSE endpoint — the app connects here to receive live RSVP notifications */
export async function sseRSVPStream(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  if (req.auth?.role !== 'admin' && !(await userOwnsSlug(req.auth!.sub, slug).catch(() => false))) {
    res.status(403).json({ success: false, message: 'Accès refusé : ce site ne vous appartient pas.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  res.write(': connected\n\n');

  // Heartbeat every 25s to keep connection alive through proxies
  const hb = setInterval(() => res.write(': ping\n\n'), 25_000);

  const cleanup = addSSEClient(slug, res);

  req.on('close', () => {
    clearInterval(hb);
    cleanup();
  });
}

/** Register an Expo push token for a wedding slug */
export async function postRegisterPushToken(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { expoPushToken } = req.body as { expoPushToken?: string };
  // userId vient du token vérifié — jamais du body (usurpation possible sinon)
  const userId = req.auth!.sub;
  if (!expoPushToken) {
    res.status(400).json({ success: false, message: 'expoPushToken requis.' });
    return;
  }
  try {
    await rsvpRepository.savePushToken(userId, slug, expoPushToken);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}
