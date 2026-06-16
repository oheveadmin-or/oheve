import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { sendOtpEmail, sendResetEmail } from '../utils/mailer';

import { isAdminEmail, sanitizeAssignedRole } from '../auth/admin';
import { ensureAndGetRole } from '../auth/resolveUserRole';
import {
  UserRole,
  generateRefreshToken,
  refreshTokenExpiresAt,
  signAccessToken,
  verifyAccessToken,
} from '../auth/jwt';
import { ConnexionInscriptionRepository } from './repository';

const SALT_ROUNDS = 12;
const MIN_PWD = 8;
const repo = new ConnexionInscriptionRepository();

function calcBudgetTotal(user: { budget_mode?: string; budget_global?: number; budget_categories?: unknown }): number | undefined {
  if (user.budget_mode === 'global' && user.budget_global != null) return Number(user.budget_global);
  if (user.budget_mode === 'categories' && user.budget_categories) {
    const c = user.budget_categories as { photographe?: number; salle?: number; traiteurs?: number };
    return (Number(c.photographe) || 0) + (Number(c.salle) || 0) + (Number(c.traiteurs) || 0);
  }
  return undefined;
}

export class ConnexionInscriptionController {

  // ── POST /send-otp ─────────────────────────────────────────────────────────
  async sendOtp(req: Request, res: Response) {
    const { email, purpose = 'inscription' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    try {
      await repo.saveOtp(email.trim().toLowerCase(), code, purpose, expiresAt);
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await sendOtpEmail(email.trim(), code);
      } else {
        // Fallback console si SMTP non configuré
        console.log(`\n📧 OTP pour ${email} : ${code} (valable 10 min)\n`);
      }
      return res.status(200).json({ success: true, message: 'Code OTP envoyé' });
    } catch (err) {
      console.error('Erreur sendOtp:', err);
      return res.status(500).json({ success: false, message: "Erreur envoi OTP" });
    }
  }

  // ── POST /inscription ──────────────────────────────────────────────────────
  async inscription(req: Request, res: Response) {
    const { email, nom, prenom, mot_de_passe, role, otp_code, bride_name, groom_name } = req.body;
    const userRole: UserRole = (['client', 'prestataire', 'boutique'] as UserRole[]).includes(role) ? role : 'client';
    const isClient = userRole === 'client';
    const effectiveBride = isClient ? String(bride_name ?? prenom ?? '').trim() : '';
    const effectiveGroom = isClient ? String(groom_name ?? nom ?? '').trim() : '';
    const effectiveNom = isClient ? effectiveGroom : String(nom ?? '').trim();
    const effectivePrenom = isClient ? effectiveBride : String(prenom ?? '').trim();

    if (!email || !mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    }
    if (!effectiveNom || !effectivePrenom) {
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
    }
    if (isClient && (!effectiveBride || !effectiveGroom)) {
      return res.status(400).json({ success: false, message: 'Les prénoms des deux mariés sont requis' });
    }
    if (String(mot_de_passe).length < MIN_PWD) {
      return res.status(400).json({ success: false, message: `Mot de passe min. ${MIN_PWD} caractères` });
    }
    if (!otp_code) {
      return res.status(400).json({ success: false, message: 'Code de vérification requis' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    let finalRole: UserRole = userRole;
    if (isAdminEmail(normalizedEmail)) finalRole = 'admin';

    try {
      const otpValid = await repo.verifyOtp(normalizedEmail, String(otp_code), 'inscription');
      if (!otpValid) {
        return res.status(400).json({ success: false, message: 'Code de vérification incorrect ou expiré' });
      }

      const hash = await bcrypt.hash(String(mot_de_passe), SALT_ROUNDS);
      const user = await repo.createUser(
        normalizedEmail,
        effectiveNom,
        effectivePrenom,
        hash,
        finalRole,
        isClient ? { bride_name: effectiveBride, groom_name: effectiveGroom } : undefined,
      );
      const effectiveRole = await ensureAndGetRole(user.id, user.email, user.role);

      const accessToken = signAccessToken(user.id, user.email, effectiveRole);
      const refreshToken = generateRefreshToken();
      await repo.saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt(), req.headers['user-agent']);

      return res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: { ...user, role: effectiveRole, accessToken, refreshToken },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        return res.status(409).json({ success: false, message: 'Cet email est déjà inscrit' });
      }
      console.error('Erreur inscription:', err);
      return res.status(500).json({ success: false, message: "Erreur lors de l'inscription" });
    }
  }

  // ── POST /connexion ────────────────────────────────────────────────────────
  async connexion(req: Request, res: Response) {
    const { email, mot_de_passe } = req.body;
    if (!email || !mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
    }
    try {
      const user = await repo.findByEmail(email.trim().toLowerCase());
      if (!user || !user.mot_de_passe || !user.is_active) {
        return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      }
      const ok = await bcrypt.compare(String(mot_de_passe), user.mot_de_passe);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
      }

      const effectiveRole = await ensureAndGetRole(user.id, user.email, user.role);
      const { mot_de_passe: _, ...safeUser } = user;
      const accessToken = signAccessToken(safeUser.id, safeUser.email, effectiveRole);
      const refreshToken = generateRefreshToken();
      await repo.saveRefreshToken(safeUser.id, refreshToken, refreshTokenExpiresAt(), req.headers['user-agent']);

      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          ...safeUser,
          role: effectiveRole,
          budget_total: calcBudgetTotal(safeUser),
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      console.error('Erreur connexion:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la connexion' });
    }
  }

  // ── POST /refresh ──────────────────────────────────────────────────────────
  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken requis' });
    }
    try {
      const stored = await repo.findRefreshToken(refreshToken);
      if (!stored || stored.expires_at < new Date()) {
        return res.status(401).json({ success: false, message: 'Session expirée — reconnecte-toi' });
      }
      const user = await repo.findById(stored.user_id);
      if (!user || !user.is_active) {
        return res.status(401).json({ success: false, message: 'Compte désactivé' });
      }

      const effectiveRole = await ensureAndGetRole(user.id, user.email, user.role);

      // Rotate: delete old, issue new
      await repo.deleteRefreshToken(refreshToken);
      const newRefreshToken = generateRefreshToken();
      await repo.saveRefreshToken(user.id, newRefreshToken, refreshTokenExpiresAt(), req.headers['user-agent']);
      const accessToken = signAccessToken(user.id, user.email, effectiveRole);

      return res.status(200).json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          role: effectiveRole,
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
        },
      });
    } catch (err) {
      console.error('Erreur refresh:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors du renouvellement de session' });
    }
  }

  // ── POST /logout ───────────────────────────────────────────────────────────
  async logout(req: Request, res: Response) {
    const { refreshToken, allDevices } = req.body;
    try {
      if (allDevices && req.auth?.sub) {
        await repo.deleteAllRefreshTokens(req.auth.sub);
      } else if (refreshToken) {
        await repo.deleteRefreshToken(refreshToken);
      }
      return res.status(200).json({ success: true, message: 'Déconnecté' });
    } catch (err) {
      console.error('Erreur logout:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
    }
  }

  // ── GET /me ────────────────────────────────────────────────────────────────
  async me(req: Request, res: Response) {
    try {
      const user = await repo.findById(req.auth!.sub);
      if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      const effectiveRole = await ensureAndGetRole(user.id, user.email, user.role);
      return res.status(200).json({
        success: true,
        data: { ...user, role: effectiveRole, budget_total: calcBudgetTotal(user) },
      });
    } catch (err) {
      console.error('Erreur me:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  // ── PATCH /profile ─────────────────────────────────────────────────────────
  async updateProfile(req: Request, res: Response) {
    const { nom, prenom, phone, avatar_url, role, bride_name, groom_name } = req.body;
    try {
      // Role update: update in DB then issue fresh tokens
      if (role) {
        const me = await repo.findById(req.auth!.sub);
        if (!me) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        const safeRole = sanitizeAssignedRole(me.email, role);
        if (!safeRole || safeRole === 'admin') {
          return res.status(403).json({ success: false, message: 'Rôle invalide ou non autorisé' });
        }
        const updated = await repo.updateRole(req.auth!.sub, safeRole);
        if (!updated) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        const accessToken = signAccessToken(updated.id, updated.email, updated.role);
        const refreshToken = generateRefreshToken();
        await repo.saveRefreshToken(updated.id, refreshToken, refreshTokenExpiresAt(), req.headers['user-agent']);
        return res.status(200).json({ success: true, data: { ...updated, accessToken, refreshToken } });
      }
      const updated = await repo.updateProfile(req.auth!.sub, {
        nom, prenom, phone, avatar_url, bride_name, groom_name,
      });
      if (!updated) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error('Erreur updateProfile:', err);
      return res.status(500).json({ success: false, message: 'Erreur mise à jour profil' });
    }
  }

  // ── PATCH /date-mariage ────────────────────────────────────────────────────
  async mettreAJourDateMariage(req: Request, res: Response) {
    const { email, date_mariage } = req.body;
    if (!email || !date_mariage) {
      return res.status(400).json({ success: false, message: 'Email et date requis' });
    }
    try {
      const r = await repo.updateDateMariage(email.trim(), date_mariage);
      if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return res.status(200).json({ success: true, message: 'Date enregistrée', data: r.rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  // ── PATCH /budget ──────────────────────────────────────────────────────────
  async mettreAJourBudget(req: Request, res: Response) {
    const { email, budget_mode, budget_global, budget_categories } = req.body;
    if (!email || !budget_mode) {
      return res.status(400).json({ success: false, message: 'Email et mode requis' });
    }
    try {
      if (budget_mode === 'global') {
        const montant = parseFloat(budget_global) || 0;
        const r = await repo.updateBudgetGlobal(email.trim(), montant);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        return res.status(200).json({ success: true, data: { ...r.rows[0], budget_total: montant } });
      }
      if (budget_mode === 'categories') {
        const cat = budget_categories || {};
        const photographe = parseFloat(cat.photographe) || 0;
        const salle = parseFloat(cat.salle) || 0;
        const traiteurs = parseFloat(cat.traiteurs) || 0;
        const r = await repo.updateBudgetCategories(email.trim(), { photographe, salle, traiteurs });
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        return res.status(200).json({ success: true, data: { ...r.rows[0], budget_total: photographe + salle + traiteurs } });
      }
      return res.status(400).json({ success: false, message: 'Mode invalide' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  // ── PATCH /wedding-location ────────────────────────────────────────────────
  async mettreAJourWeddingLocation(req: Request, res: Response) {
    const { email, wedding_location_type, wedding_city, wedding_country, wedding_lat, wedding_lng, wedding_address } = req.body;
    if (!email || !wedding_location_type) {
      return res.status(400).json({ success: false, message: 'Email et type requis' });
    }
    if (!['city', 'address', 'unknown'].includes(wedding_location_type)) {
      return res.status(400).json({ success: false, message: 'Type invalide' });
    }
    try {
      const r = await repo.updateWeddingLocation(email.trim(), {
        wedding_location_type,
        wedding_city: wedding_location_type === 'city' ? wedding_city : null,
        wedding_country: wedding_location_type === 'city' ? wedding_country : null,
        wedding_lat: wedding_location_type === 'city' ? wedding_lat : null,
        wedding_lng: wedding_location_type === 'city' ? wedding_lng : null,
        wedding_address: wedding_location_type === 'address' ? wedding_address?.trim() : null,
      });
      if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return res.status(200).json({ success: true, data: r.rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  // ── POST /social ───────────────────────────────────────────────────────────
  async socialAuth(req: Request, res: Response) {
    const { provider, provider_user_id, email, nom, prenom, avatar_url } = req.body;
    if (!provider || !provider_user_id || !email) {
      return res.status(400).json({ success: false, message: 'provider, provider_user_id et email requis' });
    }
    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Provider invalide' });
    }
    try {
      const user = await repo.findOrCreateSocialUser({
        email: email.trim().toLowerCase(),
        nom: (nom ?? '').trim(),
        prenom: (prenom ?? '').trim(),
        provider,
        providerId: String(provider_user_id),
        avatarUrl: avatar_url,
      });
      const effectiveRole = await ensureAndGetRole(user.id, user.email, user.role);
      const accessToken = signAccessToken(user.id, user.email, effectiveRole);
      const refreshToken = generateRefreshToken();
      await repo.saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt(), req.headers['user-agent']);
      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          ...user,
          role: effectiveRole,
          budget_total: calcBudgetTotal(user),
          accessToken,
          refreshToken,
          isNew: user.isNew,
        },
      });
    } catch (err) {
      console.error('Erreur social auth:', err);
      return res.status(500).json({ success: false, message: "Erreur lors de la connexion sociale" });
    }
  }

  // ── POST /avatar ───────────────────────────────────────────────────────────
  async uploadAvatar(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    }
    try {
      const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
      const host = req.headers['x-forwarded-host'] ?? req.get('host');
      const avatarUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;
      const updated = await repo.updateProfile(req.auth!.sub, { avatar_url: avatarUrl });
      if (!updated) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      }
      return res.status(200).json({ success: true, data: { avatar_url: avatarUrl } });
    } catch (err) {
      console.error('Erreur uploadAvatar:', err);
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch { /* ignoré */ } }
      return res.status(500).json({ success: false, message: "Erreur upload avatar" });
    }
  }

  // ── POST /forgot-password ──────────────────────────────────────────────────
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const user = await repo.findByEmail(normalizedEmail);
      // On répond toujours succès pour ne pas révéler si le compte existe
      if (!user || !user.is_active) {
        return res.status(200).json({ success: true, message: 'Si ce compte existe, un code a été envoyé' });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await repo.saveOtp(normalizedEmail, code, 'reset-password', expiresAt);
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await sendResetEmail(normalizedEmail, code, user.prenom);
      } else {
        console.log(`\n🔑 Code reset pour ${normalizedEmail} : ${code} (15 min)\n`);
      }
      return res.status(200).json({ success: true, message: 'Si ce compte existe, un code a été envoyé' });
    } catch (err) {
      console.error('Erreur forgotPassword:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  // ── POST /reset-password ───────────────────────────────────────────────────
  async resetPassword(req: Request, res: Response) {
    const { email, otp_code, new_password } = req.body;
    if (!email || !otp_code || !new_password) {
      return res.status(400).json({ success: false, message: 'Email, code et nouveau mot de passe requis' });
    }
    if (String(new_password).length < MIN_PWD) {
      return res.status(400).json({ success: false, message: `Mot de passe min. ${MIN_PWD} caractères` });
    }
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const otpValid = await repo.verifyOtp(normalizedEmail, String(otp_code), 'reset-password');
      if (!otpValid) {
        return res.status(400).json({ success: false, message: 'Code incorrect ou expiré' });
      }
      const hash = await bcrypt.hash(String(new_password), SALT_ROUNDS);
      const updated = await repo.updatePassword(normalizedEmail, hash);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Compte introuvable' });
      }
      // Invalider toutes les sessions pour sécurité
      await repo.deleteAllRefreshTokens(updated.id);
      return res.status(200).json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
      console.error('Erreur resetPassword:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  // ── PATCH /change-password ─────────────────────────────────────────────────
  async changePassword(req: Request, res: Response) {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel et nouveau requis' });
    }
    if (String(new_password).length < MIN_PWD) {
      return res.status(400).json({ success: false, message: `Nouveau mot de passe min. ${MIN_PWD} caractères` });
    }
    try {
      const user = await repo.findById(req.auth!.sub);
      if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      if (!user.mot_de_passe) {
        return res.status(400).json({ success: false, message: 'Compte social — aucun mot de passe à changer' });
      }
      const ok = await bcrypt.compare(String(current_password), user.mot_de_passe);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
      }
      const hash = await bcrypt.hash(String(new_password), SALT_ROUNDS);
      await repo.updatePassword(user.email, hash);
      return res.status(200).json({ success: true, message: 'Mot de passe modifié avec succès' });
    } catch (err) {
      console.error('Erreur changePassword:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  // ── POST /create-admin (ADMIN_SECRET) ──────────────────────────────────────
  async createAdmin(req: Request, res: Response) {
    const adminSecret = process.env.ADMIN_SECRET?.trim();
    const { secret, email, nom, prenom, mot_de_passe } = req.body;
    if (!adminSecret || secret !== adminSecret) {
      return res.status(403).json({ success: false, message: 'Secret admin invalide' });
    }
    if (!email || !nom || !prenom || !mot_de_passe) {
      return res.status(400).json({ success: false, message: 'Tous les champs sont requis' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAdminEmail(normalizedEmail)) {
      return res.status(403).json({ success: false, message: 'Seul l\'email administrateur autorisé peut recevoir ce rôle' });
    }
    try {
      const hash = await bcrypt.hash(String(mot_de_passe), SALT_ROUNDS);
      const user = await repo.createUser(normalizedEmail, nom.trim(), prenom.trim(), hash, 'admin');
      return res.status(201).json({ success: true, message: 'Compte admin créé', data: { id: user.id, email: user.email, role: user.role } });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
}
