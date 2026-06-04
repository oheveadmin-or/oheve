import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

import { sendNewMessageEmail } from '../utils/mailer';
import { MessagingRepository } from './repository';

const repo = new MessagingRepository();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPushNotification(tokens: string[], title: string, body: string) {
  if (!tokens.length) return;
  const messages = tokens.map((to) => ({ to, sound: 'default', title, body }));
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('Push notification error:', err);
  }
}

const NOTIF_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes entre deux emails

async function notifyRecipient(conversationId: number, senderId: number, messagePreview: string) {
  try {
    const [recipient, sender] = await Promise.all([
      repo.getRecipient(conversationId, senderId),
      repo.getSenderInfo(senderId),
    ]);
    if (!recipient || !sender) return;

    // Push notification (toujours)
    const pushTokens = await repo.getPushTokensForUser(recipient.id);
    if (pushTokens.length) {
      const title = `💬 ${sender.prenom} ${sender.nom}`;
      const body = messagePreview.length > 80 ? messagePreview.slice(0, 80) + '…' : messagePreview;
      await sendExpoPushNotification(pushTokens, title, body);
    }

    // Email : anti-spam (max 1 email toutes les 5 min par destinataire)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const lastNotif = recipient.last_msg_notif_at ? new Date(recipient.last_msg_notif_at).getTime() : 0;
    if (Date.now() - lastNotif < NOTIF_COOLDOWN_MS) return;

    await repo.updateLastNotifAt(recipient.id);
    await sendNewMessageEmail({
      to: recipient.email,
      recipientPrenom: recipient.prenom,
      senderPrenom: sender.prenom,
      senderNom: sender.nom,
      preview: messagePreview,
    });
  } catch (err) {
    console.error('Notification error (non-bloquant):', err);
  }
}

export class MessagingController {

  async listConversations(req: Request, res: Response) {
    try {
      const conversations = await repo.listForUser(req.auth!.sub);
      return res.status(200).json({ success: true, data: conversations });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async startConversation(req: Request, res: Response) {
    const { prestataire_id } = req.body;
    if (!prestataire_id) {
      return res.status(400).json({ success: false, message: 'prestataire_id requis' });
    }
    if (req.auth!.role !== 'client' && req.auth!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Seuls les clients peuvent initier une conversation' });
    }
    try {
      const conv = await repo.getOrCreateConversation(req.auth!.sub, parseInt(prestataire_id, 10));
      return res.status(200).json({ success: true, data: conv });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async getMessages(req: Request, res: Response) {
    const convId = parseInt(req.params.id, 10);
    const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
    try {
      const conv = await repo.getConversation(convId, req.auth!.sub);
      if (!conv) return res.status(404).json({ success: false, message: 'Conversation introuvable' });
      const messages = await repo.getMessages(convId, 50, before);
      await repo.markRead(convId, req.auth!.sub);
      return res.status(200).json({ success: true, data: messages });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async sendMessage(req: Request, res: Response) {
    const convId = parseInt(req.params.id, 10);
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Message vide' });
    }
    try {
      const conv = await repo.getConversation(convId, req.auth!.sub);
      if (!conv) return res.status(404).json({ success: false, message: 'Conversation introuvable' });
      const message = await repo.sendMessage(convId, req.auth!.sub, content);
      // Fire-and-forget : notifications ne bloquent pas la réponse
      notifyRecipient(convId, req.auth!.sub, content.trim()).catch(() => {});
      return res.status(201).json({ success: true, data: message });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async uploadAttachment(req: Request, res: Response) {
    const convId = parseInt(req.params.id, 10);
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    try {
      const conv = await repo.getConversation(convId, req.auth!.sub);
      if (!conv) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Conversation introuvable' });
      }
      const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
      const host = req.headers['x-forwarded-host'] ?? req.get('host');
      const fileUrl = `${protocol}://${host}/uploads/chat/${req.file.filename}`;
      const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
      const message = await repo.sendAttachment(
        convId,
        req.auth!.sub,
        fileUrl,
        req.file.originalname,
        req.file.mimetype,
        caption,
      );
      const preview = caption || req.file.originalname;
      notifyRecipient(convId, req.auth!.sub, `📎 ${preview}`).catch(() => {});
      return res.status(201).json({ success: true, data: message });
    } catch (err) {
      console.error(err);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ } }
      return res.status(500).json({ success: false, message: 'Erreur upload' });
    }
  }

  async registerPushToken(req: Request, res: Response) {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'token requis' });
    try {
      await repo.upsertPushToken(req.auth!.sub, token, platform ?? 'unknown');
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async deletePushToken(req: Request, res: Response) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'token requis' });
    try {
      await repo.deletePushToken(req.auth!.sub, token);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
}
