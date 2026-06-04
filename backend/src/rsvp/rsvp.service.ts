import type { Response } from 'express';
import type { CreateRSVPInput } from './rsvp.repository';
import { rsvpRepository } from './rsvp.repository';

/** SSE streams keyed by weddingSlug → list of active Response streams */
const sseClients = new Map<string, Set<Response>>();

export function addSSEClient(slug: string, res: Response): () => void {
  if (!sseClients.has(slug)) sseClients.set(slug, new Set());
  sseClients.get(slug)!.add(res);
  return () => {
    sseClients.get(slug)?.delete(res);
  };
}

function pushSSEEvent(slug: string, data: unknown) {
  const clients = sseClients.get(slug.toLowerCase());
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { /* stream closed */ }
  }
}

async function sendExpoPushNotifications(tokens: string[], title: string, body: string) {
  if (tokens.length === 0) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        tokens.map((to) => ({ to, title, body, sound: 'default', data: { type: 'rsvp_new' } }))
      ),
    });
  } catch (e) {
    console.error('[RSVP] Expo push failed:', e);
  }
}

export async function submitRSVP(data: CreateRSVPInput) {
  const row = await rsvpRepository.insert(data);

  // Notify SSE clients (app listening for new RSVPs)
  pushSSEEvent(data.weddingSlug, {
    type: 'rsvp_new',
    answer: {
      id: row.id,
      firstname: row.firstname,
      lastname: row.lastname,
      email: row.email,
      phone: row.phone,
      events: row.events,
      submittedAt: row.submitted_at,
    },
  });

  // Send Expo push notification to registered devices
  const tokens = await rsvpRepository.getPushTokensForSlug(data.weddingSlug);
  const attendingEvents = Object.values(data.events).filter((e) => e.attending).length;
  await sendExpoPushNotifications(
    tokens,
    '🎉 Nouvelle réponse RSVP',
    `${data.firstname} ${data.lastname} a répondu (${attendingEvents} événement${attendingEvents > 1 ? 's' : ''})`
  );

  return row;
}

export async function getRSVPAnswers(slug: string) {
  return rsvpRepository.findBySlug(slug);
}
