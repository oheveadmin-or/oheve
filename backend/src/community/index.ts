import { NextFunction, Request, Response, Router } from 'express';

import { requireAdmin } from '../middleware/requireAdmin';
import { requireAuth } from '../middleware/requireAuth';
import { CommunityRepository } from './repository';

export { ensureCommunitySchema } from './repository';

// ── Communauté Oheve : salon commun des mariés ────────────────────────────────
// Accès : rôle « client » (les mariés) + l'admin. Prestataires et boutiques
// n'y ont pas accès. L'identité affichée (prénom, nom, photo) vient
// directement du compte : aucun pseudonyme.
//
// « Temps réel » : l'app interroge GET /messages toutes les 3 s tant que
// l'écran est ouvert (même principe que la messagerie privée). L'app
// n'utilise pas Supabase Auth (JWT maison), donc Supabase Realtime + RLS ne
// pourraient pas filtrer par compte sans exposer la table publiquement.

export const communityRoutes = Router();
const repo = new CommunityRepository();

const MAX_LENGTH = 2000;
const PAGE_SIZE = 50;
// Anti-spam : au plus 8 messages par minute et par marié.
const RATE_WINDOW_S = 60;
const RATE_MAX = 8;

function parseId(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function requireMember(req: Request, res: Response, next: NextFunction) {
  const role = req.auth!.role;
  if (role !== 'client' && role !== 'admin') {
    res.status(403).json({ success: false, message: 'La Communauté Oheve est réservée aux mariés.' });
    return;
  }
  try {
    if (role !== 'admin' && await repo.isBanned(req.auth!.sub)) {
      res.status(403).json({
        success: false,
        banned: true,
        message: 'Votre accès à la Communauté a été suspendu par l\'équipe Oheve.',
      });
      return;
    }
  } catch (err) {
    console.error('[community] ban check:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
    return;
  }
  next();
}

async function notifyReply(replyToAuthorId: number, from: { prenom: string; nom: string }, content: string) {
  const tokens = await repo.pushTokens(replyToAuthorId);
  if (!tokens.length) return;
  const body = content.length > 80 ? `${content.slice(0, 80)}…` : content;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({
        to, sound: 'default',
        title: `💬 ${from.prenom} vous a répondu dans la Communauté`,
        body,
        data: { type: 'community' },
      }))),
    });
  } catch (err) {
    console.error('[community] push:', err);
  }
}

// ── Administration (déclarée AVANT le middleware membre) ──────────────────────
const admin = Router();
admin.use(requireAdmin);

admin.get('/reports', async (req, res) => {
  const status = ['open', 'resolved', 'dismissed', 'all'].includes(String(req.query.status))
    ? String(req.query.status) : 'open';
  try {
    res.json({ success: true, data: await repo.listReports(status) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

admin.patch('/reports/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const status = String(req.body?.status ?? '');
  if (!id || !['resolved', 'dismissed', 'open'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Statut invalide' });
  }
  try {
    const ok = await repo.setReportStatus(id, status, req.auth!.sub);
    return ok ? res.json({ success: true }) : res.status(404).json({ success: false, message: 'Signalement introuvable' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

admin.get('/members', async (_req, res) => {
  try {
    res.json({ success: true, data: await repo.listMembers() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

admin.post('/bans', async (req, res) => {
  const userId = parseId(req.body?.user_id);
  const reason = String(req.body?.reason ?? '').trim().slice(0, 500);
  const purge = req.body?.delete_messages === true;
  if (!userId) return res.status(400).json({ success: false, message: 'user_id requis' });
  try {
    const target = await repo.userBasic(userId);
    if (!target) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    if (target.role === 'admin') return res.status(400).json({ success: false, message: 'Impossible de bloquer un administrateur' });
    await repo.ban(userId, req.auth!.sub, reason);
    await repo.resolveReportsForUser(userId, req.auth!.sub);
    const deleted = purge ? await repo.deleteAllMessagesOf(userId, req.auth!.sub) : 0;
    return res.json({ success: true, data: { deleted_messages: deleted } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

admin.delete('/bans/:userId', async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) return res.status(400).json({ success: false, message: 'user_id requis' });
  try {
    await repo.unban(userId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

communityRoutes.use('/admin', admin);

// ── Routes des mariés ─────────────────────────────────────────────────────────
communityRoutes.use(requireAuth, requireMember);

communityRoutes.get('/messages', async (req, res) => {
  const before = parseId(req.query.before) ?? undefined;
  try {
    const roomId = await repo.generalRoomId();
    const messages = await repo.listMessages(roomId, req.auth!.sub, PAGE_SIZE, before);
    res.json({ success: true, data: messages, has_more: messages.length === PAGE_SIZE });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

communityRoutes.post('/messages', async (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  const replyToId = req.body?.reply_to_id == null ? null : parseId(req.body.reply_to_id);
  if (!content) return res.status(400).json({ success: false, message: 'Message vide' });
  if (content.length > MAX_LENGTH) {
    return res.status(400).json({ success: false, message: `Message trop long (${MAX_LENGTH} caractères maximum)` });
  }
  try {
    const me = req.auth!.sub;
    if (req.auth!.role !== 'admin' && await repo.countRecentByUser(me, RATE_WINDOW_S) >= RATE_MAX) {
      return res.status(429).json({ success: false, message: 'Vous envoyez beaucoup de messages : patientez une minute.' });
    }
    const roomId = await repo.generalRoomId();
    let replyTarget: Awaited<ReturnType<typeof repo.rawMessage>> = null;
    if (replyToId) {
      replyTarget = await repo.rawMessage(replyToId);
      if (!replyTarget || replyTarget.room_id !== roomId) {
        return res.status(400).json({ success: false, message: 'Le message auquel vous répondez n\'existe plus' });
      }
    }
    const id = await repo.insertMessage(roomId, me, content, replyTarget ? replyTarget.id : null);
    const msg = await repo.getMessage(id);
    if (replyTarget && replyTarget.user_id !== me && !replyTarget.deleted_at && msg) {
      notifyReply(replyTarget.user_id, { prenom: msg.prenom, nom: msg.nom }, content).catch(() => {});
    }
    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

communityRoutes.delete('/messages/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Message invalide' });
  try {
    const msg = await repo.rawMessage(id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message introuvable' });
    if (msg.user_id !== req.auth!.sub && req.auth!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez supprimer que vos propres messages' });
    }
    await repo.softDelete(id, req.auth!.sub);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

communityRoutes.post('/reports', async (req, res) => {
  const messageId = req.body?.message_id == null ? null : parseId(req.body.message_id);
  let userId = req.body?.user_id == null ? null : parseId(req.body.user_id);
  const reason = String(req.body?.reason ?? '').trim().slice(0, 500);
  try {
    if (messageId) {
      const msg = await repo.rawMessage(messageId);
      if (!msg) return res.status(404).json({ success: false, message: 'Message introuvable' });
      userId = msg.user_id;
    }
    if (!userId) return res.status(400).json({ success: false, message: 'Message ou utilisateur requis' });
    if (userId === req.auth!.sub) return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous signaler vous-même' });
    const created = await repo.report(req.auth!.sub, userId, messageId, reason);
    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Merci, l\'équipe Oheve va examiner ce signalement.' : 'Vous avez déjà signalé ce message.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

communityRoutes.get('/blocks', async (req, res) => {
  try {
    res.json({ success: true, data: await repo.listBlocks(req.auth!.sub) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

communityRoutes.post('/blocks', async (req, res) => {
  const userId = parseId(req.body?.user_id);
  if (!userId || userId === req.auth!.sub) return res.status(400).json({ success: false, message: 'Utilisateur invalide' });
  try {
    await repo.block(req.auth!.sub, userId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

communityRoutes.delete('/blocks/:userId', async (req, res) => {
  const userId = parseId(req.params.userId);
  if (!userId) return res.status(400).json({ success: false, message: 'Utilisateur invalide' });
  try {
    await repo.unblock(req.auth!.sub, userId);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
