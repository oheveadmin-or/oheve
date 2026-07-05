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
import {
  isSupabaseVerifyConfigured,
  verifyAppleIdentityToken,
  verifySupabaseAccessToken,
} from '../auth/socialVerify';
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
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Adresse email invalide' });
    }
    try {
      // Bloquer l'inscription si l'email est déjà utilisé
      if (purpose === 'inscription') {
        const existing = await repo.findByEmail(normalizedEmail);
        if (existing) {
          return res.status(409).json({ success: false, message: 'Cet email est déjà inscrit. Connecte-toi ou utilise un autre email.' });
        }
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await repo.saveOtp(normalizedEmail, code, purpose, expiresAt);

      console.log(`\n📧 OTP pour ${normalizedEmail} : ${code} (valable 10 min)\n`);
      if (process.env.RESEND_API_KEY) {
        sendOtpEmail(normalizedEmail, code).catch(err => {
          console.error('Resend error (non-bloquant):', {
            message: err?.message,
            name: err?.name,
            statusCode: err?.statusCode,
            response: err?.response,
            body: JSON.stringify(err),
          });
        });
      } else {
        console.warn('⚠️  RESEND_API_KEY manquante — OTP non envoyé par email');
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
      if (!user || !user.is_active) {
        // Cas 2 : email inconnu → l'app propose la création de compte
        return res.status(401).json({
          success: false,
          code: 'EMAIL_NOT_FOUND',
          message: 'Aucun compte n\'existe avec cet email.',
        });
      }
      if (!user.mot_de_passe) {
        // Compte créé via Google/Apple, sans mot de passe
        const methods = await repo.getAuthMethods(user.id);
        const providers = methods.providers.map(p => p.provider === 'apple' ? 'Apple' : 'Google');
        return res.status(401).json({
          success: false,
          code: 'SOCIAL_ONLY',
          providers: methods.providers.map(p => p.provider),
          message: `Ce compte utilise ${providers.join(' / ') || 'une connexion sociale'}. Connecte-toi avec, puis ajoute un mot de passe depuis les réglages si tu veux.`,
        });
      }
      const ok = await bcrypt.compare(String(mot_de_passe), user.mot_de_passe);
      if (!ok) {
        return res.status(401).json({
          success: false,
          code: 'WRONG_PASSWORD',
          message: 'Mot de passe incorrect.',
        });
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

      // Sliding expiration : même token, validité prolongée. Pas de rotation —
      // si l'app était tuée avant d'avoir persisté un token tourné, l'ancien
      // était déjà supprimé côté serveur et la session devenait irrécupérable.
      await repo.touchRefreshToken(refreshToken, refreshTokenExpiresAt());
      const accessToken = signAccessToken(user.id, user.email, effectiveRole);

      return res.status(200).json({
        success: true,
        data: {
          accessToken,
          refreshToken,
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
    const { nom, prenom, phone, avatar_url, role, bride_name, groom_name, date_mariage } = req.body;
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
        date_mariage: date_mariage !== undefined ? (date_mariage || null) : undefined,
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
    const { date_mariage } = req.body;
    if (!date_mariage) {
      return res.status(400).json({ success: false, message: 'date_mariage requis' });
    }
    try {
      const r = await repo.updateDateMariage(req.auth!.sub, date_mariage);
      if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
      return res.status(200).json({ success: true, message: 'Date enregistrée', data: r.rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  // ── PATCH /budget ──────────────────────────────────────────────────────────
  async mettreAJourBudget(req: Request, res: Response) {
    const { budget_mode, budget_global, budget_categories } = req.body;
    if (!budget_mode) {
      return res.status(400).json({ success: false, message: 'budget_mode requis' });
    }
    try {
      if (budget_mode === 'global') {
        const montant = parseFloat(budget_global) || 0;
        const r = await repo.updateBudgetGlobal(req.auth!.sub, montant);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
        return res.status(200).json({ success: true, data: { ...r.rows[0], budget_total: montant } });
      }
      if (budget_mode === 'categories') {
        const cat = budget_categories || {};
        const photographe = parseFloat(cat.photographe) || 0;
        const salle = parseFloat(cat.salle) || 0;
        const traiteurs = parseFloat(cat.traiteurs) || 0;
        const r = await repo.updateBudgetCategories(req.auth!.sub, { photographe, salle, traiteurs });
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
    const { wedding_location_type, wedding_city, wedding_country, wedding_lat, wedding_lng, wedding_address } = req.body;
    if (!wedding_location_type) {
      return res.status(400).json({ success: false, message: 'wedding_location_type requis' });
    }
    if (!['city', 'address', 'unknown'].includes(wedding_location_type)) {
      return res.status(400).json({ success: false, message: 'Type invalide' });
    }
    try {
      const r = await repo.updateWeddingLocation(req.auth!.sub, {
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

  /**
   * Vérifie l'identité sociale côté serveur.
   * Renvoie l'identité vérifiée, ou null si aucun token n'est fourni (anciens
   * builds de l'app) — toléré tant que SOCIAL_AUTH_REQUIRE_VERIFIED n'est pas
   * activé, avec un warning en log.
   */
  private async verifySocialIdentity(req: Request): Promise<
    | { ok: true; identity: { providerUserId: string; email: string | null } | null }
    | { ok: false; status: number; message: string }
  > {
    const { provider, identity_token, supabase_access_token } = req.body;
    try {
      if (provider === 'apple' && identity_token) {
        const v = await verifyAppleIdentityToken(String(identity_token));
        return { ok: true, identity: v };
      }
      if (provider === 'google' && supabase_access_token && isSupabaseVerifyConfigured()) {
        const v = await verifySupabaseAccessToken(String(supabase_access_token));
        return { ok: true, identity: v };
      }
    } catch (err) {
      console.error(`Vérification ${provider} échouée:`, (err as Error).message);
      return { ok: false, status: 401, message: 'Identité sociale invalide — reconnecte-toi.' };
    }
    if (process.env.SOCIAL_AUTH_REQUIRE_VERIFIED === 'true') {
      return { ok: false, status: 401, message: 'Version de l\'app obsolète — mets-la à jour pour te connecter.' };
    }
    console.warn(`⚠️  /social ${provider} sans token vérifiable — identité NON vérifiée (legacy). ` +
      `Configure SUPABASE_URL + SUPABASE_ANON_KEY et active SOCIAL_AUTH_REQUIRE_VERIFIED=true.`);
    return { ok: true, identity: null };
  }

  // ── POST /social ───────────────────────────────────────────────────────────
  async socialAuth(req: Request, res: Response) {
    const { provider, provider_user_id, email, nom, prenom, avatar_url } = req.body;
    if (!provider || !['google', 'apple'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Provider invalide' });
    }
    try {
      const verified = await this.verifySocialIdentity(req);
      if (!verified.ok) {
        return res.status(verified.status).json({ success: false, message: verified.message });
      }
      // L'identité vérifiée (token) prime toujours sur ce que le client déclare
      const providerId = verified.identity?.providerUserId ?? String(provider_user_id ?? '');
      const verifiedEmail = verified.identity ? verified.identity.email : (email ? String(email).trim().toLowerCase() : null);
      if (!providerId) {
        return res.status(400).json({ success: false, message: 'provider_user_id requis' });
      }

      const user = await repo.findOrCreateSocialUser({
        email: verifiedEmail,
        nom: (nom ?? '').trim(),
        prenom: (prenom ?? '').trim(),
        provider,
        providerId,
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
      if ((err as { code?: string }).code === 'NO_EMAIL') {
        return res.status(400).json({ success: false, message: 'Impossible de récupérer ton email — réessaie.' });
      }
      console.error('Erreur social auth:', err);
      return res.status(500).json({ success: false, message: "Erreur lors de la connexion sociale" });
    }
  }

  // ── GET /auth-methods ──────────────────────────────────────────────────────
  async authMethods(req: Request, res: Response) {
    try {
      const methods = await repo.getAuthMethods(req.auth!.sub);
      return res.status(200).json({
        success: true,
        data: { has_password: methods.hasPassword, providers: methods.providers },
      });
    } catch (err) {
      console.error('Erreur authMethods:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  // ── POST /link-provider ────────────────────────────────────────────────────
  // Cas 7 : lier Google ou Apple au compte connecté.
  async linkProvider(req: Request, res: Response) {
    const { provider, provider_user_id, email } = req.body;
    if (!provider || !['google', 'apple'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Provider invalide' });
    }
    try {
      const verified = await this.verifySocialIdentity(req);
      if (!verified.ok) {
        return res.status(verified.status).json({ success: false, message: verified.message });
      }
      const providerId = verified.identity?.providerUserId ?? String(provider_user_id ?? '');
      const providerEmail = verified.identity ? verified.identity.email : (email ? String(email).trim().toLowerCase() : null);
      if (!providerId) {
        return res.status(400).json({ success: false, message: 'provider_user_id requis' });
      }

      const owner = await repo.findProviderOwner(provider, providerId);
      if (owner && owner !== req.auth!.sub) {
        return res.status(409).json({
          success: false,
          message: `Ce compte ${provider === 'apple' ? 'Apple' : 'Google'} est déjà associé à un autre profil.`,
        });
      }
      await repo.linkProvider(req.auth!.sub, provider, providerId, providerEmail);
      const methods = await repo.getAuthMethods(req.auth!.sub);
      return res.status(200).json({
        success: true,
        message: `${provider === 'apple' ? 'Apple' : 'Google'} lié à ton compte`,
        data: { has_password: methods.hasPassword, providers: methods.providers },
      });
    } catch (err) {
      console.error('Erreur linkProvider:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la liaison' });
    }
  }

  // ── DELETE /providers/:provider ────────────────────────────────────────────
  // Cas 7 : délier une méthode — uniquement s'il en reste au moins une autre.
  async unlinkProvider(req: Request, res: Response) {
    const provider = String(req.params.provider ?? '');
    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Provider invalide' });
    }
    try {
      const methods = await repo.getAuthMethods(req.auth!.sub);
      const remaining = (methods.hasPassword ? 1 : 0) +
        methods.providers.filter(p => p.provider !== provider).length;
      if (remaining === 0) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer ta dernière méthode de connexion. Ajoute d\'abord un mot de passe.',
        });
      }
      const removed = await repo.unlinkProvider(req.auth!.sub, provider);
      if (!removed) {
        return res.status(404).json({ success: false, message: 'Cette méthode n\'est pas liée à ton compte' });
      }
      const updated = await repo.getAuthMethods(req.auth!.sub);
      return res.status(200).json({
        success: true,
        message: 'Méthode de connexion supprimée',
        data: { has_password: updated.hasPassword, providers: updated.providers },
      });
    } catch (err) {
      console.error('Erreur unlinkProvider:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
    }
  }

  // ── POST /set-password ─────────────────────────────────────────────────────
  // Cas 7 : ajouter un mot de passe à un compte social (qui n'en a pas encore).
  async setPassword(req: Request, res: Response) {
    const { new_password } = req.body;
    if (!new_password) {
      return res.status(400).json({ success: false, message: 'Nouveau mot de passe requis' });
    }
    if (String(new_password).length < MIN_PWD) {
      return res.status(400).json({ success: false, message: `Mot de passe min. ${MIN_PWD} caractères` });
    }
    try {
      const methods = await repo.getAuthMethods(req.auth!.sub);
      if (methods.hasPassword) {
        return res.status(400).json({
          success: false,
          message: 'Ce compte a déjà un mot de passe — utilise "Changer le mot de passe".',
        });
      }
      const hash = await bcrypt.hash(String(new_password), SALT_ROUNDS);
      await repo.setPasswordById(req.auth!.sub, hash);
      return res.status(200).json({ success: true, message: 'Mot de passe ajouté — tu peux maintenant te connecter par email.' });
    } catch (err) {
      console.error('Erreur setPassword:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
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
      if (process.env.RESEND_API_KEY) {
        await sendResetEmail(normalizedEmail, code, user.prenom);
      } else if (process.env.NODE_ENV !== 'production') {
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

  // ── DELETE /me ────────────────────────────────────────────────────────────
  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.auth!.sub;
      await repo.deleteAllRefreshTokens(userId);
      await repo.deleteAccount(userId);
      return res.status(200).json({ success: true, message: 'Compte supprimé définitivement' });
    } catch (err) {
      console.error('Erreur deleteAccount:', err);
      return res.status(500).json({ success: false, message: 'Erreur lors de la suppression du compte' });
    }
  }

  // ── GET /export ────────────────────────────────────────────────────────────
  async exportData(req: Request, res: Response) {
    try {
      const data = await repo.exportData(req.auth!.sub);
      return res.status(200).json({
        success: true,
        exported_at: new Date().toISOString(),
        data,
      });
    } catch (err) {
      console.error('Erreur exportData:', err);
      return res.status(500).json({ success: false, message: "Erreur lors de l'export" });
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
