import { pool } from '../config/database';
import { sendAppointmentReminderEmail } from '../utils/mailer';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPush(tokens: string[], title: string, body: string) {
  if (!tokens.length) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: 'default', title, body }))),
    });
  } catch (err) {
    console.error('Push reminder error:', err);
  }
}

async function getPushTokens(userId: number): Promise<string[]> {
  const r = await pool.query<{ token: string }>(
    `SELECT token FROM push_tokens WHERE user_id = $1`,
    [userId],
  );
  return r.rows.map((row) => row.token);
}

async function sendReminders() {
  const r = await pool.query<{
    id: number;
    user_id: number;
    title: string;
    event_date: string;
    event_time: string | null;
    user_email: string;
    user_prenom: string;
  }>(
    `SELECT ce.id, ce.user_id, ce.title, ce.event_date::text, ce.event_time::text,
            u.email AS user_email, u.prenom AS user_prenom
     FROM calendar_events ce
     JOIN users u ON u.id = ce.user_id
     WHERE ce.event_date = CURRENT_DATE + INTERVAL '1 day'
       AND ce.reminder_sent = FALSE
       AND ce.type = 'appointment'`,
  );

  for (const ev of r.rows) {
    const timeStr = ev.event_time?.slice(0, 5);

    // Push notification
    const tokens = await getPushTokens(ev.user_id);
    await sendPush(
      tokens,
      `📅 Rappel : ${ev.title}`,
      `Votre rendez-vous est demain${timeStr ? ` à ${timeStr}` : ''}.`,
    );

    // Email
    if (process.env.RESEND_API_KEY) {
      await sendAppointmentReminderEmail({
        to: ev.user_email,
        prenom: ev.user_prenom,
        title: ev.title,
        eventDate: ev.event_date,
        eventTime: ev.event_time ?? undefined,
      }).catch((err) => console.error('Reminder email error:', err));
    }

    await pool.query(`UPDATE calendar_events SET reminder_sent = TRUE WHERE id = $1`, [ev.id]);
  }

  if (r.rowCount && r.rowCount > 0) {
    console.log(`📧 ${r.rowCount} rappel(s) rendez-vous envoyé(s)`);
  }
}

async function deletePastAppointments() {
  const r = await pool.query(
    `DELETE FROM calendar_events
     WHERE type = 'appointment'
       AND (
         event_date < CURRENT_DATE
         OR (event_date = CURRENT_DATE AND event_time IS NOT NULL AND event_time < CURRENT_TIME)
       )
     RETURNING id`,
  );
  if (r.rowCount && r.rowCount > 0) {
    console.log(`🗑️  ${r.rowCount} rendez-vous passé(s) supprimé(s)`);
  }
}

export async function runReminderJob() {
  try {
    await sendReminders();
    await deletePastAppointments();
  } catch (err) {
    console.error('Reminder job error:', err);
  }
}

export function startReminderScheduler() {
  runReminderJob();
  setInterval(runReminderJob, 60 * 60 * 1000);
  console.log('⏰ Reminder scheduler démarré (toutes les heures)');
}
