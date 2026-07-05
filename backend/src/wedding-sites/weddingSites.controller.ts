import type { Request, Response } from 'express';
import { weddingSitesRepo } from './weddingSites.repository';

function rowToSite(row: Awaited<ReturnType<typeof weddingSitesRepo.findBySlug>>) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    coupleName: row.couple_name,
    groomName: row.groom_name,
    brideName: row.bride_name,
    date: row.date,
    time: row.time,
    city: row.city,
    venue: row.venue,
    welcomeText: row.welcome_text,
    mainText: row.main_text,
    language: row.language,
    theme: row.theme,
    sections: row.sections,
    content: row.content,
    rsvpForm: row.rsvp_form,
    inviteLinks: row.invite_links ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getMySites(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ success: false, message: 'Authentification requise' }); return; }
    const rows = await weddingSitesRepo.findByUserId(userId);
    res.json({ success: true, data: rows.map(rowToSite) });
  } catch (err) {
    console.error('getMySites:', err);
    res.status(500).json({ success: false });
  }
}

export async function getWeddingSiteBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = String(req.params.slug ?? '').trim().toLowerCase();
    if (!slug) { res.status(404).json({ success: false }); return; }
    const row = await weddingSitesRepo.findBySlug(slug);
    if (!row) { res.status(404).json({ success: false, message: 'Non trouvé' }); return; }

    // Abonnement impayé → site public bloqué. Le propriétaire authentifié
    // (et l'admin) gardent l'accès pour continuer à éditer dans le builder.
    const isOwner = !!req.auth && (req.auth.sub === row.user_id || req.auth.role === 'admin');
    const premiumOk = isOwner || await weddingSitesRepo.isOwnerPremium(row);
    if (!premiumOk) {
      res.status(403).json({
        success: false,
        code: 'PREMIUM_REQUIRED',
        message: 'Ce site de mariage est momentanément indisponible. Les mariés doivent activer Oheve Premium pour le publier.',
      });
      return;
    }

    res.json({ success: true, data: rowToSite(row) });
  } catch (err) {
    console.error('getWeddingSiteBySlug:', err);
    res.status(500).json({ success: false });
  }
}

export async function checkSlugAvailable(req: Request, res: Response): Promise<void> {
  try {
    const slug = String(req.query.slug ?? '').trim().toLowerCase();
    const excludeId = typeof req.query.excludeId === 'string' ? req.query.excludeId : undefined;
    if (!slug) { res.json({ available: false }); return; }
    const exists = await weddingSitesRepo.checkSlugExists(slug, excludeId);
    res.json({ available: !exists });
  } catch (err) {
    console.error('checkSlugAvailable:', err);
    res.status(500).json({ available: false });
  }
}

export async function createWeddingSite(req: Request, res: Response): Promise<void> {
  try {
    const b = req.body as Record<string, unknown>;
    const userId = req.auth?.sub ?? null;
    const isAdmin = req.auth?.role === 'admin';

    // Limit to 1 site per authenticated user (admins exempt)
    if (userId && !isAdmin) {
      const count = await weddingSitesRepo.countByUserId(userId);
      if (count > 0) {
        res.status(403).json({ success: false, message: 'Vous avez déjà un site mariage. Un seul site est autorisé par compte.' });
        return;
      }
    }

    const slug = String(b.slug ?? '').trim().toLowerCase();
    if (!slug) { res.status(400).json({ success: false, message: 'slug requis' }); return; }

    const exists = await weddingSitesRepo.checkSlugExists(slug);
    if (exists) { res.status(409).json({ success: false, message: 'Slug déjà utilisé' }); return; }

    const row = await weddingSitesRepo.create({
      userId: userId ?? undefined,
      slug,
      coupleName: String(b.coupleName ?? ''),
      groomName: String(b.groomName ?? ''),
      brideName: String(b.brideName ?? ''),
      date: String(b.date ?? ''),
      time: String(b.time ?? ''),
      city: String(b.city ?? ''),
      venue: String(b.venue ?? ''),
      welcomeText: String(b.welcomeText ?? ''),
      mainText: String(b.mainText ?? ''),
      language: String(b.language ?? 'fr'),
      theme: b.theme ?? {},
      sections: b.sections ?? {},
      content: b.content ?? {},
      rsvpForm: b.rsvpForm ?? null,
      inviteLinks: b.inviteLinks ?? [],
    });

    res.status(201).json({ success: true, data: rowToSite(row) });
  } catch (err) {
    console.error('createWeddingSite:', err);
    res.status(500).json({ success: false });
  }
}

export async function uploadGalleryPhoto(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    return;
  }
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  res.status(201).json({
    success: true,
    data: { url: `${protocol}://${host}/uploads/photos/${req.file.filename}` },
  });
}

export async function updateWeddingSite(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id ?? '').trim();
    const userId = req.auth?.sub ?? null;
    const b = req.body as Record<string, unknown>;

    const row = await weddingSitesRepo.update(id, userId, {
      slug: typeof b.slug === 'string' ? b.slug : undefined,
      coupleName: typeof b.coupleName === 'string' ? b.coupleName : undefined,
      groomName: typeof b.groomName === 'string' ? b.groomName : undefined,
      brideName: typeof b.brideName === 'string' ? b.brideName : undefined,
      date: typeof b.date === 'string' ? b.date : undefined,
      time: typeof b.time === 'string' ? b.time : undefined,
      city: typeof b.city === 'string' ? b.city : undefined,
      venue: typeof b.venue === 'string' ? b.venue : undefined,
      welcomeText: typeof b.welcomeText === 'string' ? b.welcomeText : undefined,
      mainText: typeof b.mainText === 'string' ? b.mainText : undefined,
      language: typeof b.language === 'string' ? b.language : undefined,
      theme: b.theme,
      sections: b.sections,
      content: b.content,
      rsvpForm: b.rsvpForm,
      inviteLinks: b.inviteLinks,
    });

    if (!row) { res.status(404).json({ success: false }); return; }
    res.json({ success: true, data: rowToSite(row) });
  } catch (err) {
    console.error('updateWeddingSite:', err);
    res.status(500).json({ success: false });
  }
}
