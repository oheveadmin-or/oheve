import bcrypt from 'bcrypt';
import { Request, Response } from 'express';

import { ConnexionInscriptionRepository } from './repository';

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export class ConnexionInscriptionController {
  private repo = new ConnexionInscriptionRepository();

  async inscription(req: Request, res: Response) {
    try {
      const { email, nom, prenom, mot_de_passe } = req.body;

      if (!email || !nom || !prenom || !mot_de_passe) {
        return res.status(400).json({
          success: false,
          message: 'Email, nom, prénom et mot de passe sont requis',
        });
      }

      if (String(mot_de_passe).length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`,
        });
      }

      const motDePasseHash = await bcrypt.hash(String(mot_de_passe), SALT_ROUNDS);
      const user = await this.repo.createUser(
        email.trim(),
        nom.trim(),
        prenom.trim(),
        motDePasseHash
      );

      res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        data: user,
      });
    } catch (error: unknown) {
      const pgError = error as { code?: string; detail?: string };

      if (pgError.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Cet email est déjà inscrit',
        });
      }

      console.error('Erreur inscription:', error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'inscription",
      });
    }
  }

  async connexion(req: Request, res: Response) {
    try {
      const { email, mot_de_passe } = req.body;

      if (!email || !mot_de_passe) {
        return res.status(400).json({
          success: false,
          message: 'Email et mot de passe sont requis',
        });
      }

      const user = await this.repo.findByEmail(email.trim());
      if (!user || !user.mot_de_passe) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect',
        });
      }

      const motDePasseValide = await bcrypt.compare(String(mot_de_passe), user.mot_de_passe);
      if (!motDePasseValide) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect',
        });
      }

      const { mot_de_passe: _, ...userSansMotDePasse } = user;

      // Calcul budget_total pour redirection directe vers confirmation
      let budgetTotal: number | null = null;
      if (user.budget_mode === 'global' && user.budget_global != null) {
        budgetTotal = Number(user.budget_global);
      } else if (user.budget_mode === 'categories' && user.budget_categories) {
        const cat = user.budget_categories as { photographe?: number; salle?: number; traiteurs?: number };
        budgetTotal = (Number(cat.photographe) || 0) + (Number(cat.salle) || 0) + (Number(cat.traiteurs) || 0);
      }

      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          ...userSansMotDePasse,
          budget_total: budgetTotal ?? undefined,
        },
      });
    } catch (error) {
      console.error('Erreur connexion:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la connexion',
      });
    }
  }

  async mettreAJourDateMariage(req: Request, res: Response) {
    try {
      const { email, date_mariage } = req.body;

      if (!email || !date_mariage) {
        return res.status(400).json({
          success: false,
          message: 'Email et date du mariage sont requis',
        });
      }

      const result = await this.repo.updateDateMariage(email.trim(), date_mariage);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Aucun utilisateur trouvé avec cet email",
        });
      }

      res.status(200).json({
        success: true,
        message: 'Date du mariage enregistrée',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erreur mise à jour date mariage:', error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'enregistrement de la date",
      });
    }
  }

  async mettreAJourBudget(req: Request, res: Response) {
    try {
      const { email, budget_mode, budget_global, budget_categories } = req.body;

      if (!email || !budget_mode) {
        return res.status(400).json({
          success: false,
          message: 'Email et mode de budget sont requis',
        });
      }

      if (budget_mode === 'global') {
        const montant = parseFloat(budget_global) || 0;
        const result = await this.repo.updateBudgetGlobal(email.trim(), montant);
        if (result.rowCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Aucun utilisateur trouvé avec cet email",
          });
        }
        const total = montant;
        return res.status(200).json({
          success: true,
          message: 'Budget global enregistré',
          data: { ...result.rows[0], budget_total: total },
        });
      }

      if (budget_mode === 'categories') {
        const categories = budget_categories || {};
        const photographe = parseFloat(categories.photographe) || 0;
        const salle = parseFloat(categories.salle) || 0;
        const traiteurs = parseFloat(categories.traiteurs) || 0;
        const total = photographe + salle + traiteurs;

        const result = await this.repo.updateBudgetCategories(email.trim(), {
          photographe,
          salle,
          traiteurs,
        });
        if (result.rowCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Aucun utilisateur trouvé avec cet email",
          });
        }
        return res.status(200).json({
          success: true,
          message: 'Budget par catégories enregistré',
          data: { ...result.rows[0], budget_total: total },
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Mode de budget invalide (global ou categories)',
      });
    } catch (error) {
      console.error('Erreur mise à jour budget:', error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'enregistrement du budget",
      });
    }
  }

  async mettreAJourWeddingLocation(req: Request, res: Response) {
    try {
      const {
        email,
        wedding_location_type,
        wedding_city,
        wedding_country,
        wedding_lat,
        wedding_lng,
        wedding_address,
      } = req.body;

      if (!email || !wedding_location_type) {
        return res.status(400).json({
          success: false,
          message: 'Email et type de lieu (city/address/unknown) sont requis',
        });
      }

      const validTypes = ['city', 'address', 'unknown'];
      if (!validTypes.includes(wedding_location_type)) {
        return res.status(400).json({
          success: false,
          message: 'wedding_location_type doit être city, address ou unknown',
        });
      }

      if (wedding_location_type === 'address' && !wedding_address?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Adresse requise pour le type address',
        });
      }

      const result = await this.repo.updateWeddingLocation(email.trim(), {
        wedding_location_type: wedding_location_type as 'city' | 'address' | 'unknown',
        wedding_city: wedding_location_type === 'city' ? wedding_city : null,
        wedding_country: wedding_location_type === 'city' ? wedding_country : null,
        wedding_lat: wedding_location_type === 'city' ? wedding_lat : null,
        wedding_lng: wedding_location_type === 'city' ? wedding_lng : null,
        wedding_address: wedding_location_type === 'address' ? wedding_address?.trim() : null,
      });

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Aucun utilisateur trouvé avec cet email",
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lieu du mariage enregistré',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erreur mise à jour lieu mariage:', error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de l'enregistrement du lieu",
      });
    }
  }
}
