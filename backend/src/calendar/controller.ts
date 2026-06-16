import { Request, Response } from 'express';

import { CalendarRepository } from './repository';
import { parseEventDate, parseEventTime } from './validate';

const repo = new CalendarRepository();

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
      if (req.auth!.role !== 'client' && req.auth!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Réservé aux clients' });
      }
      const { prestataire_id, title, requested_date, requested_time, notes } = req.body;
      if (!prestataire_id || !title || !requested_date || !requested_time) {
        return res.status(400).json({ success: false, message: 'Champs requis manquants' });
      }

      const slots = await repo.computeAvailableSlots(
        parseInt(prestataire_id, 10),
        requested_date,
        requested_date,
      );
      const daySlots = slots.find((s) => s.date === requested_date);
      const timeStr = String(requested_time).slice(0, 5);
      if (!daySlots?.slots.includes(timeStr)) {
        return res.status(400).json({ success: false, message: 'Ce créneau n\'est pas disponible' });
      }

      const appointment = await repo.createAppointmentRequest({
        client_id: req.auth!.sub,
        prestataire_id: parseInt(prestataire_id, 10),
        title: String(title).trim(),
        requested_date,
        requested_time: timeStr,
        notes: notes ? String(notes).trim() : undefined,
      });
      return res.status(201).json({ success: true, data: appointment });
    } catch (err) {
      console.error('createAppointmentRequest:', err);
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
