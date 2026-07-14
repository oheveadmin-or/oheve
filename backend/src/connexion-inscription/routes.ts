import path from 'path';
import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../middleware/requireAuth';
import { optimizeAvatarUpload } from '../utils/image-optim';
import { ConnexionInscriptionController } from './controller';

export const connexionInscriptionRoutes = Router();
const ctrl = new ConnexionInscriptionController();

const avatarStorage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads', 'avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

// Public
connexionInscriptionRoutes.post('/send-otp', ctrl.sendOtp.bind(ctrl));
connexionInscriptionRoutes.post('/inscription', ctrl.inscription.bind(ctrl));
connexionInscriptionRoutes.post('/connexion', ctrl.connexion.bind(ctrl));
connexionInscriptionRoutes.post('/forgot-password', ctrl.forgotPassword.bind(ctrl));
connexionInscriptionRoutes.post('/reset-password', ctrl.resetPassword.bind(ctrl));
connexionInscriptionRoutes.post('/social', ctrl.socialAuth.bind(ctrl));
connexionInscriptionRoutes.post('/refresh', ctrl.refresh.bind(ctrl));
connexionInscriptionRoutes.post('/create-admin', ctrl.createAdmin.bind(ctrl));

// Onboarding (protégé — le token est émis dès l'inscription/connexion)
connexionInscriptionRoutes.patch('/date-mariage', requireAuth, ctrl.mettreAJourDateMariage.bind(ctrl));
connexionInscriptionRoutes.patch('/budget', requireAuth, ctrl.mettreAJourBudget.bind(ctrl));
connexionInscriptionRoutes.patch('/wedding-location', requireAuth, ctrl.mettreAJourWeddingLocation.bind(ctrl));

// Protected
connexionInscriptionRoutes.post('/logout', requireAuth, ctrl.logout.bind(ctrl));
connexionInscriptionRoutes.get('/me', requireAuth, ctrl.me.bind(ctrl));
connexionInscriptionRoutes.delete('/me', requireAuth, ctrl.deleteAccount.bind(ctrl));
connexionInscriptionRoutes.get('/export', requireAuth, ctrl.exportData.bind(ctrl));
connexionInscriptionRoutes.patch('/profile', requireAuth, ctrl.updateProfile.bind(ctrl));
connexionInscriptionRoutes.post('/avatar', requireAuth, uploadAvatar.single('avatar'), optimizeAvatarUpload(), ctrl.uploadAvatar.bind(ctrl));
connexionInscriptionRoutes.patch('/change-password', requireAuth, ctrl.changePassword.bind(ctrl));

// Méthodes de connexion (lier/délier Google & Apple, ajouter un mot de passe)
connexionInscriptionRoutes.get('/auth-methods', requireAuth, ctrl.authMethods.bind(ctrl));
connexionInscriptionRoutes.post('/link-provider', requireAuth, ctrl.linkProvider.bind(ctrl));
connexionInscriptionRoutes.delete('/providers/:provider', requireAuth, ctrl.unlinkProvider.bind(ctrl));
connexionInscriptionRoutes.post('/set-password', requireAuth, ctrl.setPassword.bind(ctrl));
