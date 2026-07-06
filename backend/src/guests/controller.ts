import { Request, Response } from 'express';

import { GuestInput, GuestsRepository, GuestStatus, toClientGuest } from './repository';

const repo = new GuestsRepository();

const STATUSES: GuestStatus[] = ['confirmed', 'declined'];

/** Nettoie un invité venant du client (import Excel / saisie / RSVP) vers un GuestInput sûr. */
function sanitizeGuest(raw: unknown): GuestInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const name = typeof g.name === 'string' ? g.name.trim() : '';
  if (!name) return null;
  const count = Number(g.guestCount ?? g.guest_count ?? 1);
  const status = STATUSES.includes(g.status as GuestStatus) ? (g.status as GuestStatus) : 'confirmed';
  return {
    name,
    guest_count: Number.isFinite(count) && count > 0 ? Math.round(count) : 1,
    status,
    guest_group: typeof g.group === 'string' ? g.group.trim() : (typeof g.guest_group === 'string' ? g.guest_group.trim() : ''),
    table_name: typeof g.table === 'string' && g.table.trim() ? g.table.trim() : null,
    email: typeof g.email === 'string' && g.email.trim() ? g.email.trim() : null,
    phone: typeof g.phone === 'string' && g.phone.trim() ? g.phone.trim() : null,
    from_rsvp: Boolean(g.fromRSVP ?? g.from_rsvp ?? false),
    rsvp_ref: typeof g.rsvpRef === 'string' ? g.rsvpRef : (typeof g.rsvp_ref === 'string' ? g.rsvp_ref : null),
    events: g.events && typeof g.events === 'object' ? (g.events as GuestInput['events']) : null,
    manual_event_id: typeof g.manualEventId === 'string' ? g.manualEventId : (typeof g.manual_event_id === 'string' ? g.manual_event_id : null),
  };
}

export class GuestsController {
  async list(req: Request, res: Response) {
    try {
      const rows = await repo.list(req.auth!.sub);
      return res.json({ success: true, data: rows.map(toClientGuest) });
    } catch (err) {
      console.error('guests.list:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const input = sanitizeGuest(req.body);
      if (!input) return res.status(400).json({ success: false, message: 'Nom requis' });
      const row = await repo.create(req.auth!.sub, input);
      return res.status(201).json({ success: true, data: toClientGuest(row) });
    } catch (err) {
      console.error('guests.create:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async bulk(req: Request, res: Response) {
    try {
      const list = Array.isArray(req.body?.guests) ? req.body.guests : [];
      const inputs = list.map(sanitizeGuest).filter((g: GuestInput | null): g is GuestInput => g !== null);
      if (inputs.length === 0) {
        const rows = await repo.list(req.auth!.sub);
        return res.json({ success: true, data: rows.map(toClientGuest), added: 0 });
      }
      const before = await repo.list(req.auth!.sub);
      const rows = await repo.bulkAdd(req.auth!.sub, inputs);
      return res.json({ success: true, data: rows.map(toClientGuest), added: rows.length - before.length });
    } catch (err) {
      console.error('guests.bulk:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Id invalide' });
      const b = req.body as Record<string, unknown>;
      const updates: Partial<GuestInput> = {};
      if ('name' in b && typeof b.name === 'string') updates.name = b.name.trim();
      if ('guestCount' in b || 'guest_count' in b) {
        const c = Number(b.guestCount ?? b.guest_count);
        if (Number.isFinite(c) && c > 0) updates.guest_count = Math.round(c);
      }
      if ('status' in b && STATUSES.includes(b.status as GuestStatus)) updates.status = b.status as GuestStatus;
      if ('group' in b && typeof b.group === 'string') updates.guest_group = b.group.trim();
      if ('table' in b) updates.table_name = typeof b.table === 'string' && b.table.trim() ? b.table.trim() : null;
      if ('email' in b) updates.email = typeof b.email === 'string' && b.email.trim() ? b.email.trim() : null;
      if ('phone' in b) updates.phone = typeof b.phone === 'string' && b.phone.trim() ? b.phone.trim() : null;
      if ('manualEventId' in b) updates.manual_event_id = typeof b.manualEventId === 'string' ? b.manualEventId : null;
      if ('events' in b) updates.events = b.events && typeof b.events === 'object' ? (b.events as GuestInput['events']) : null;

      const row = await repo.update(id, req.auth!.sub, updates);
      if (!row) return res.status(404).json({ success: false, message: 'Invité introuvable' });
      return res.json({ success: true, data: toClientGuest(row) });
    } catch (err) {
      console.error('guests.update:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: 'Id invalide' });
      const ok = await repo.remove(id, req.auth!.sub);
      if (!ok) return res.status(404).json({ success: false, message: 'Invité introuvable' });
      return res.json({ success: true });
    } catch (err) {
      console.error('guests.remove:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
}
