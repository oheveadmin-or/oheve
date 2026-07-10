import { Request, Response } from 'express';

import { pool } from '../config/database';
import { sendPushToUser } from '../utils/push';
import { CalendarRepository } from './repository';
import { parseEventDate, parseEventTime } from './validate';

const repo = new CalendarRepository();

// « jeudi 16 juillet » — pour les notifications envoyées aux deux parties.
function frDate(iso: string): string {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function displayName(userId: number): Promise<string> {
  const r = await pool.query<{ prenom: string; nom: string; business_name: string | null }>(
    `SELECT u.prenom, u.nom, pp.business_name
     FROM users u LEFT JOIN prestataire_profiles pp ON pp.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  const row = r.rows[0];
  if (!row) return '';
  return row.business_name || `${row.prenom ?? ''} ${row.nom ?? ''}`.trim();
}

export class CalendarController {
  async listEvents(req: Request, res: Response) {
    try {
      const events = await repo.listEvents(req.auth!.sub);
      return res.json({ success: true, data: events });
    } catch (err) {
      console.error('listEvents:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async createEvent(req: Request, res: Response) {
    try {
      const { type, title, description, event_date, event_time } = req.body;
      if (!type || !title) {
        return res.status(400).json({ success: false, message: 'type et title requis' });
      }
      if (!['appointment', 'task', 'event'].includes(type)) {
        return res.status(400).json({ success: false, message: 'type invalide' });
      }
      const parsedDate = parseEventDate(event_date);
      if (!parsedDate.ok) return res.status(400).json({ success: false, message: parsedDate.message });
      const parsedTime = parseEventTime(event_time);
      if (!parsedTime.ok) return res.status(400).json({ success: false, message: parsedTime.message });

      const event = await repo.createEvent({
        user_id: req.auth!.sub,
        type,
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        event_date: parsedDate.value ?? undefined,
        event_time: parsedTime.value ?? undefined,
      });
      return res.status(201).json({ success: true, data: event });
    } catch (err) {
      console.error('createEvent:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async updateEvent(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const body = { ...req.body } as Record<string, unknown>;
      if ('event_date' in body) {
        const parsedDate = parseEventDate(body.event_date);
        if (!parsedDate.ok) return res.status(400).json({ success: false, message: parsedDate.message });
        body.event_date = parsedDate.value;
      }
      if ('event_time' in body) {
        const parsedTime = parseEventTime(body.event_time);
        if (!parsedTime.ok) return res.status(400).json({ success: false, message: parsedTime.message });
        body.event_time = parsedTime.value;
      }
      const event = await repo.updateEvent(id, req.auth!.sub, body);
      if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable' });
      return res.json({ success: true, data: event });
    } catch (err) {
      console.error('updateEvent:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async deleteEvent(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const ok = await repo.deleteEvent(id, req.auth!.sub);
      if (!ok) return res.status(404).json({ success: false, message: 'Événement introuvable' });
      return res.json({ success: true });
    } catch (err) {
      console.error('deleteEvent:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async getMyAvailability(req: Request, res: Response) {
    try {
      if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
      }
      const settings = await repo.getAvailabilitySettings(req.auth!.sub);
      const blocked = await repo.listBlockedPeriods(req.auth!.sub);
      return res.json({ success: true, data: { settings, blocked } });
    } catch (err) {
      console.error('getMyAvailability:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async updateMyAvailability(req: Request, res: Response) {
    try {
      if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
      }
      const { working_days, work_start, work_end, slot_duration_minutes } = req.body;
      if (!Array.isArray(working_days) || !work_start || !work_end) {
        return res.status(400).json({ success: false, message: 'Paramètres invalides' });
      }
      const settings = await repo.upsertAvailabilitySettings(req.auth!.sub, {
        working_days,
        work_start,
        work_end,
        slot_duration_minutes: slot_duration_minutes ?? 60,
      });
      return res.json({ success: true, data: settings });
    } catch (err) {
      console.error('updateMyAvailability:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async addBlockedPeriod(req: Request, res: Response) {
    try {
      if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
      }
      const { start_date, end_date, reason } = req.body;
      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Dates requises' });
      }
      const period = await repo.addBlockedPeriod(req.auth!.sub, { start_date, end_date, reason });
      return res.status(201).json({ success: true, data: period });
    } catch (err) {
      console.error('addBlockedPeriod:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async deleteBlockedPeriod(req: Request, res: Response) {
    try {
      if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
      }
      const id = parseInt(req.params.id, 10);
      const ok = await repo.deleteBlockedPeriod(id, req.auth!.sub);
      if (!ok) return res.status(404).json({ success: false, message: 'Période introuvable' });
      return res.json({ success: true });
    } catch (err) {
      console.error('deleteBlockedPeriod:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async getProviderSlots(req: Request, res: Response) {
    try {
      const prestataireId = parseInt(req.params.prestataireId, 10);
      const from = (req.query.from as string) || new Date().toISOString().slice(0, 10);
      const toDate = new Date(from);
      toDate.setDate(toDate.getDate() + 30);
      const to = (req.query.to as string) || toDate.toISOString().slice(0, 10);

      const settings = await repo.getAvailabilitySettings(prestataireId);
      const slots = settings ? await repo.computeAvailableSlots(prestataireId, from, to) : [];
      return res.json({
        success: true,
        data: { has_availability: !!settings, slots },
      });
    } catch (err) {
      console.error('getProviderSlots:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async listAppointments(req: Request, res: Response) {
    try {
      const appointments = await repo.listAppointmentRequests(req.auth!.sub, req.auth!.role);
      return res.json({ success: true, data: appointments });
    } catch (err) {
      console.error('listAppointments:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async createAppointmentRequest(req: Request, res: Response) {
    try {
      const role = req.auth!.role;
      const { prestataire_id, client_id, title, requested_date, requested_time, notes } = req.body;
      const timeStr = String(requested_time ?? '').slice(0, 5);

      let clientId: number;
      let prestataireId: number;

      if (role === 'prestataire') {
        // Un prestataire peut proposer un RDV à un client (depuis le chat) :
        // c'est SON agenda, pas de contrôle de créneau, confirmation directe.
        if (!client_id || !title || !requested_date || !requested_time) {
          return res.status(400).json({ success: false, message: 'Champs requis manquants' });
        }
        clientId = parseInt(client_id, 10);
        prestataireId = req.auth!.sub;
      } else if (role === 'client' || role === 'admin') {
        if (!prestataire_id || !title || !requested_date || !requested_time) {
          return res.status(400).json({ success: false, message: 'Champs requis manquants' });
        }
        clientId = req.auth!.sub;
        prestataireId = parseInt(prestataire_id, 10);

        // Le client réserve uniquement dans les créneaux ouverts par le prestataire.
        const slots = await repo.computeAvailableSlots(prestataireId, requested_date, requested_date);
        const daySlots = slots.find((s) => s.date === requested_date);
        if (!daySlots?.slots.includes(timeStr)) {
          return res.status(400).json({ success: false, message: 'Ce créneau n\'est pas disponible' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }

      const appointment = await repo.createAppointmentRequest({
        client_id: clientId,
        prestataire_id: prestataireId,
        title: String(title).trim(),
        requested_date,
        requested_time: timeStr,
        notes: notes ? String(notes).trim() : undefined,
      });

      // Notifier l'autre partie (fire-and-forget, ne bloque pas la réponse).
      const when = `${frDate(requested_date)} à ${timeStr}`;
      if (role === 'prestataire') {
        displayName(prestataireId).then((name) =>
          sendPushToUser(clientId, '📅 Nouveau rendez-vous',
            `${name || 'Votre prestataire'} a fixé un rendez-vous : ${appointment.title}, ${when}.`),
        ).catch(() => {});
      } else {
        displayName(clientId).then((name) =>
          sendPushToUser(prestataireId, '📅 Nouveau rendez-vous',
            `${name || 'Un client'} a réservé : ${appointment.title}, ${when}.`),
        ).catch(() => {});
      }

      return res.status(201).json({ success: true, data: appointment });
    } catch (err) {
      console.error('createAppointmentRequest:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  /** Déplace un rendez-vous (prestataire) et notifie le client. */
  async rescheduleAppointment(req: Request, res: Response) {
    try {
      if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
      }
      const id = parseInt(req.params.id, 10);
      const { new_date, new_time } = req.body;

      const parsedDate = parseEventDate(new_date);
      if (!parsedDate.ok || !parsedDate.value) {
        return res.status(400).json({ success: false, message: 'Nouvelle date invalide' });
      }
      const parsedTime = parseEventTime(new_time);
      if (!parsedTime.ok || !parsedTime.value) {
        return res.status(400).json({ success: false, message: 'Nouvelle heure invalide' });
      }

      const updated = await repo.rescheduleAppointment(id, req.auth!.sub, parsedDate.value, parsedTime.value);
      if (!updated) return res.status(404).json({ success: false, message: 'Rendez-vous introuvable' });

      displayName(updated.prestataire_id).then((name) =>
        sendPushToUser(
          updated.client_id,
          '📅 Rendez-vous déplacé',
          `${name || 'Votre prestataire'} a déplacé « ${updated.title} » au ${frDate(updated.requested_date)} à ${String(updated.requested_time).slice(0, 5)}.`,
        ),
      ).catch(() => {});

      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error('rescheduleAppointment:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  /** Annule un rendez-vous (prestataire ou client) et notifie l'autre partie. */
  async cancelAppointment(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const cancelled = await repo.cancelAppointment(id, req.auth!.sub);
      if (!cancelled) return res.status(404).json({ success: false, message: 'Rendez-vous introuvable' });

      const byPrestataire = req.auth!.sub === cancelled.prestataire_id;
      const notifyUserId = byPrestataire ? cancelled.client_id : cancelled.prestataire_id;
      const cancellerId = byPrestataire ? cancelled.prestataire_id : cancelled.client_id;

      displayName(cancellerId).then((name) =>
        sendPushToUser(
          notifyUserId,
          '❌ Rendez-vous annulé',
          `${name || (byPrestataire ? 'Votre prestataire' : 'Votre client')} a annulé « ${cancelled.title} » du ${frDate(cancelled.requested_date)} à ${String(cancelled.requested_time).slice(0, 5)}.`,
        ),
      ).catch(() => {});

      return res.json({ success: true, data: cancelled });
    } catch (err) {
      console.error('cancelAppointment:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async respondToAppointment(req: Request, res: Response) {
    try {
      if (req.auth!.role !== 'prestataire' && req.auth!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Réservé aux prestataires' });
      }
      const id = parseInt(req.params.id, 10);
      const { action, proposed_date, proposed_time } = req.body;
      if (!['accept', 'refuse', 'counter'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Action invalide' });
      }
      if (action === 'counter' && (!proposed_date || !proposed_time)) {
        return res.status(400).json({ success: false, message: 'Nouveau créneau requis' });
      }
      const result = await repo.respondToAppointment(
        id,
        req.auth!.sub,
        action,
        action === 'counter' ? { proposed_date, proposed_time } : undefined,
      );
      if (!result) return res.status(404).json({ success: false, message: 'Demande introuvable' });
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error('respondToAppointment:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async upcomingSummary(req: Request, res: Response) {
    try {
      const count = await repo.countUpcomingAppointments(req.auth!.sub);
      const upcoming = await repo.listUpcomingAppointments(req.auth!.sub);
      return res.json({ success: true, data: { count, upcoming } });
    } catch (err) {
      console.error('upcomingSummary:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
}
