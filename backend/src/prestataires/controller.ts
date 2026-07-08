import { Request, Response } from 'express';

import { PrestatairesRepository } from './repository';

const repo = new PrestatairesRepository();

export class PrestatairesController {

  async upsertProfile(req: Request, res: Response) {
    const userId = req.auth!.sub;
    if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
    }
    const { business_name, category, description, location_city, location_country,
            price_min, price_max, price_range, phone, website_url, instagram_url } = req.body;
    if (!business_name || !category) {
      return res.status(400).json({ success: false, message: 'Nom et catégorie requis' });
    }
    try {
      const profile = await repo.upsert(userId, {
        business_name, category, description, location_city,
        location_country, price_min, price_max, price_range, phone, website_url, instagram_url,
      });
      return res.status(200).json({ success: true, data: profile });
    } catch (err) {
      console.error('Erreur upsert prestataire:', err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async getMyProfile(req: Request, res: Response) {
    try {
      const profile = await repo.findByUserId(req.auth!.sub);
      if (!profile) return res.status(404).json({ success: false, message: 'Profil introuvable' });
      return res.status(200).json({ success: true, data: profile });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async getById(req: Request, res: Response) {
    const userId = parseInt(req.params.userId, 10);
    try {
      const profile = await repo.findByUserId(userId);
      if (!profile) return res.status(404).json({ success: false, message: 'Prestataire introuvable' });
      return res.status(200).json({ success: true, data: profile });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }

  async list(req: Request, res: Response) {
    const { category, city, limit, offset } = req.query;
    try {
      const items = await repo.list(
        category as string | undefined,
        city as string | undefined,
        parseInt(limit as string) || 50,
        parseInt(offset as string) || 0
      );
      return res.status(200).json({ success: true, data: items });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
}
