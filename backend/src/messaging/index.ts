import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../middleware/requireAuth';
import { optimizeUploadedImage } from '../utils/image-optim';
import { MessagingController } from './controller';

export const messagingRoutes = Router();
const ctrl = new MessagingController();

// ── Multer : pièces jointes chat ──────────────────────────────────────────────
const chatUploadDir = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) fs.mkdirSync(chatUploadDir, { recursive: true });

const chatStorage = multer.diskStorage({
  destination: chatUploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '';
    cb(null, `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Certains uploads (FileSystem.uploadAsync) envoient un type générique : on
  // l'accepte, la validation fine se fait via l'extension côté allowedExt.
  'application/octet-stream',
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.pdf', '.doc', '.docx']);

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.mimetype.startsWith('image/') || ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé (images, PDF, Word uniquement)'));
    }
  },
});

messagingRoutes.use(requireAuth);

// Routes spécifiques avant les routes paramétrées
messagingRoutes.post('/push-token', ctrl.registerPushToken.bind(ctrl));
messagingRoutes.delete('/push-token', ctrl.deletePushToken.bind(ctrl));

messagingRoutes.get('/', ctrl.listConversations.bind(ctrl));
messagingRoutes.post('/', ctrl.startConversation.bind(ctrl));
messagingRoutes.get('/:id/messages', ctrl.getMessages.bind(ctrl));
messagingRoutes.post('/:id/messages', ctrl.sendMessage.bind(ctrl));
messagingRoutes.post('/:id/attachments', chatUpload.single('file'), optimizeUploadedImage(), ctrl.uploadAttachment.bind(ctrl));
messagingRoutes.post('/:id/devis', ctrl.sendDevis.bind(ctrl));
messagingRoutes.get('/:id/devis/:devisId', ctrl.getDevis.bind(ctrl));
messagingRoutes.patch('/:id/devis/:devisId/status', ctrl.updateDevisStatus.bind(ctrl));
