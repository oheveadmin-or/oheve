import { NextFunction, Request, Response, Router } from 'express';

import { verifyAccessToken } from '../auth/jwt';
import { pool } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import {
  DemandeError,
  desactiverEmails,
  envoyerMessageClient,
  envoyerMessagePresta,
  listeDemandes,
  notifierMessage,
  prestatairesSimilaires,
  vueDemande,
} from './service';
import { creerCheckout } from './stripe';
import { verifyDemandeLink, verifyUnsubscribe } from './tokens';

function fail(res: Response, err: unknown) {
  if (err instanceof DemandeError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  console.error('[demandes]', err);
  return res.status(500).json({ success: false, message: 'Une erreur est survenue. Réessayez dans un instant.' });
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prestataires/:id/demande  (monté sur /api/prestataires)
// ─────────────────────────────────────────────────────────────────────────────
export const demandePrestataireRoutes = Router();

demandePrestataireRoutes.post('/:id/demande', requireAuth, async (req: Request, res: Response) => {
  const prestataireId = parseId(req.params.id);
  if (!prestataireId) return res.status(404).json({ success: false, message: 'Prestataire introuvable.' });
  if (req.auth!.role !== 'client' && req.auth!.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Seuls les comptes client peuvent contacter un prestataire.' });
  }
  const { contenu, consentement_contact } = (req.body ?? {}) as { contenu?: unknown; consentement_contact?: unknown };
  if (consentement_contact !== true) {
    return res.status(400).json({
      success: false,
      message: 'Cochez la case pour accepter que vos coordonnées soient transmises à ce prestataire.',
    });
  }
  try {
    const r = await envoyerMessageClient({
      clientId: req.auth!.sub,
      prestataireId,
      contenu,
      consentement: true,
      origine: 'formulaire',
    });
    // L'e-mail est attendu (statut_email à jour), mais un échec d'envoi
    // n'annule pas la demande : elle est enregistrée et visible dans l'app.
    await notifierMessage(r.demandeId, r.message, r.nouvelle);
    return res.status(r.nouvelle ? 201 : 200).json({
      success: true,
      message: 'Votre demande a bien été transmise.',
      data: { demande_id: r.demandeId, conversation_id: r.conversationId, nouvelle: r.nouvelle },
    });
  } catch (err) {
    return fail(res, err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/demandes
// ─────────────────────────────────────────────────────────────────────────────
export const demandesRoutes = Router();

/**
 * Qui regarde ? Session de l'app (Bearer) OU lien magique reçu par e-mail
 * (en-tête X-Demande-Token). Le lien magique ne vaut que pour SA demande.
 */
function viewer(req: Request, res: Response, next: NextFunction) {
  const id = parseId(req.params.id);
  if (!id) { res.status(404).json({ success: false, message: 'Demande introuvable.' }); return; }
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const a = verifyAccessToken(header.slice(7).trim());
      res.locals.userId = a.sub;
      res.locals.demandeId = id;
      next();
      return;
    } catch { /* on tente le lien magique */ }
  }
  const link = String(req.headers['x-demande-token'] ?? '');
  const v = link ? verifyDemandeLink(link) : null;
  if (v && v.demandeId === id) {
    res.locals.userId = v.userId;
    res.locals.demandeId = id;
    next();
    return;
  }
  res.status(401).json({
    success: false,
    message: link ? 'Ce lien a expiré. Connectez-vous à Ohevé pour voir la demande.' : 'Connectez-vous pour voir cette demande.',
  });
}

demandesRoutes.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await listeDemandes(req.auth!.sub) });
  } catch (err) {
    return fail(res, err);
  }
});

// ── Désinscription (avant /:id) ──────────────────────────────────────────────
demandesRoutes.post('/unsubscribe', async (req: Request, res: Response) => {
  const userId = verifyUnsubscribe(String(req.body?.token ?? ''));
  if (!userId) return res.status(400).json({ success: false, message: 'Lien de désinscription invalide.' });
  try {
    await desactiverEmails(userId);
    return res.json({ success: true, message: 'C\'est noté : vous ne recevrez plus d\'e-mails de demandes d\'Ohevé.' });
  } catch (err) {
    return fail(res, err);
  }
});

// Désinscription « en un clic » du client mail (RFC 8058 : POST sans interaction).
demandesRoutes.post('/unsubscribe/one-click', async (req: Request, res: Response) => {
  const userId = verifyUnsubscribe(String(req.query.token ?? ''));
  if (!userId) return res.status(400).send('Lien invalide');
  try {
    await desactiverEmails(userId);
    return res.status(200).send('OK');
  } catch {
    return res.status(500).send('Erreur');
  }
});

// Réactiver les e-mails (depuis l'app).
demandesRoutes.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  const enabled = req.body?.notifications_email;
  if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'notifications_email (booléen) requis' });
  await pool.query(`UPDATE users SET notifications_email=$2 WHERE id=$1`, [req.auth!.sub, enabled]);
  return res.json({ success: true, data: { notifications_email: enabled } });
});

demandesRoutes.get('/:id', viewer, async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await vueDemande(res.locals.demandeId, res.locals.userId) });
  } catch (err) {
    return fail(res, err);
  }
});

demandesRoutes.post('/:id/messages', viewer, async (req: Request, res: Response) => {
  try {
    const d = (await pool.query(`SELECT client_id, prestataire_id FROM demandes WHERE id=$1`, [res.locals.demandeId])).rows[0];
    const userId: number = res.locals.userId;
    if (!d || (d.client_id !== userId && d.prestataire_id !== userId)) {
      return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    }
    if (d.prestataire_id === userId) {
      const message = await envoyerMessagePresta(res.locals.demandeId, userId, req.body?.contenu);
      await notifierMessage(res.locals.demandeId, message, false);
      return res.status(201).json({ success: true, message: 'Réponse envoyée.', data: { id: message.id } });
    }
    const r = await envoyerMessageClient({
      clientId: userId,
      prestataireId: d.prestataire_id,
      contenu: req.body?.contenu,
      consentement: false,
      origine: 'formulaire',
      minLength: 1,
    });
    await notifierMessage(r.demandeId, r.message, false);
    return res.status(201).json({ success: true, message: 'Message envoyé.', data: { id: r.message.id } });
  } catch (err) {
    return fail(res, err);
  }
});

demandesRoutes.get('/:id/similaires', viewer, async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await prestatairesSimilaires(res.locals.demandeId, res.locals.userId) });
  } catch (err) {
    return fail(res, err);
  }
});

demandesRoutes.post('/:id/checkout', viewer, async (req: Request, res: Response) => {
  const type = req.body?.type;
  if (type !== 'deblocage' && type !== 'abonnement') {
    return res.status(400).json({ success: false, message: 'type doit valoir « deblocage » ou « abonnement ».' });
  }
  try {
    const r = await creerCheckout({ demandeId: res.locals.demandeId, prestataireId: res.locals.userId, type });
    return res.json({ success: true, data: r });
  } catch (err) {
    if (err instanceof DemandeError) return fail(res, err);
    console.error('[demandes] checkout Stripe:', (err as Error).message);
    return res.status(502).json({ success: false, message: 'Le paiement n\'a pas pu démarrer. Réessayez dans un instant.' });
  }
});
