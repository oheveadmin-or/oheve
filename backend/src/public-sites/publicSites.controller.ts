import { Request, Response } from 'express';

import { validateCreatePublicSiteBody } from '../validators/publicSite.validator';
import { PublicSitesService } from './publicSites.service';

const service = new PublicSitesService();

export async function postCreatePublicSite(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.auth?.sub;
    if (userId == null) {
      res.status(401).json({ success: false, message: 'Non authentifié' });
      return;
    }

    const parsed = validateCreatePublicSiteBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ success: false, message: 'Validation échouée', errors: parsed.errors });
      return;
    }

    const result = await service.createForUser(userId, parsed.value);
    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        slug: result.slug,
        publicUrl: result.publicUrl,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur';
    if (msg.includes('PUBLIC_SITE_BASE_URL')) {
      res.status(500).json({ success: false, message: 'Configuration serveur incomplète' });
      return;
    }
    console.error('postCreatePublicSite:', err);
    res.status(500).json({ success: false, message: 'Impossible de créer le mini-site' });
  }
}

export async function getPublicSiteBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = String(req.params.slug ?? '').trim();
    if (!slug || slug.length > 200) {
      res.status(404).json({ success: false, message: 'Non trouvé' });
      return;
    }

    const row = await service.getPublishedPayload(slug);
    if (!row) {
      res.status(404).json({ success: false, message: 'Non trouvé' });
      return;
    }

    // Même règle que /api/wedding-sites : abonnement premium requis pour que
    // le site reste consultable publiquement (cette route legacy laissait
    // sinon un accès libre en devinant le slug).
    const isOwner = !!req.auth && (req.auth.sub === row.user_id || req.auth.role === 'admin');
    if (!isOwner && !(await service.isOwnerPremium(row.user_id))) {
      res.status(403).json({
        success: false,
        code: 'PREMIUM_REQUIRED',
        message: 'Ce site de mariage est momentanément indisponible. Les mariés doivent activer Oheve Premium pour le publier.',
      });
      return;
    }

    // Accès privé : il faut un token d'invitation du site (?k=), sinon le slug
    // seul suffirait à ouvrir la page.
    if (!isOwner) {
      const providedKey = String(req.query.k ?? '').trim();
      const rawLinks = (row as unknown as { invite_links?: unknown }).invite_links;
      const tokens = Array.isArray(rawLinks)
        ? (rawLinks as { token?: unknown }[])
            .map((l) => String(l?.token ?? '').trim())
            .filter(Boolean)
        : [];
      if (!providedKey || !tokens.includes(providedKey)) {
        res.status(403).json({
          success: false,
          code: 'PRIVATE_LINK_REQUIRED',
          message: "Ce site de mariage est privé. Utilisez le lien d'invitation transmis par les mariés pour y accéder.",
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        slug: row.slug,
        brideName: row.bride_name,
        groomName: row.groom_name,
        weddingDate: row.wedding_date,
        location: row.location ?? '',
        templateId: row.template_id ?? '',
        customText: row.custom_text ?? '',
        // Full rich config if available
        siteConfig: (row as any).site_config ?? null,
        inviteLinks: (row as any).invite_links ?? [],
      },
    });
  } catch (err) {
    console.error('getPublicSiteBySlug:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

/** Get the authenticated user's own site slug */
export async function getMyPublicSite(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.auth?.sub;
    if (userId == null) {
      res.status(401).json({ success: false, message: 'Non authentifié' });
      return;
    }
    const row = await service.getByUserId(userId);
    if (!row) {
      res.status(404).json({ success: false, message: 'Aucun site trouvé' });
      return;
    }
    res.json({
      success: true,
      data: {
        slug: row.slug,
        brideName: row.bride_name,
        groomName: row.groom_name,
        isPublished: row.is_published,
      },
    });
  } catch (err) {
    console.error('getMyPublicSite:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

/** Save or update full site config (theme, sections, RSVP, invite links) */
export async function putSiteConfig(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.auth?.sub;
    if (userId == null) {
      res.status(401).json({ success: false, message: 'Non authentifié' });
      return;
    }
    const slug = String(req.params.slug ?? '').trim();
    const { siteConfig, inviteLinks } = req.body as { siteConfig?: unknown; inviteLinks?: unknown };

    await service.updateSiteConfig(userId, slug, siteConfig, inviteLinks);
    res.json({ success: true });
  } catch (err) {
    console.error('putSiteConfig:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}
