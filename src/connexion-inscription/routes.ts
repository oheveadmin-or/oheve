import { Router } from 'express';

import { ConnexionInscriptionController } from './controller';

export const connexionInscriptionRoutes = Router();
const controller = new ConnexionInscriptionController();

connexionInscriptionRoutes.post('/inscription', controller.inscription.bind(controller));
connexionInscriptionRoutes.post('/connexion', controller.connexion.bind(controller));
connexionInscriptionRoutes.patch('/date-mariage', controller.mettreAJourDateMariage.bind(controller));
connexionInscriptionRoutes.patch('/budget', controller.mettreAJourBudget.bind(controller));
connexionInscriptionRoutes.patch('/wedding-location', controller.mettreAJourWeddingLocation.bind(controller));
