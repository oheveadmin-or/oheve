const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{1,2}:\d{2}(:\d{2})?$/;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

export function parseEventDate(value: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (isBlank(value)) return { ok: true, value: null };
  const s = String(value).trim();
  if (!ISO_DATE.test(s)) {
    return { ok: false, message: 'Date invalide — utilisez le format AAAA-MM-JJ (ex. 2026-09-15)' };
  }
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    return { ok: false, message: 'Date invalide' };
  }
  return { ok: true, value: s };
}

export function parseEventTime(value: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
  if (isBlank(value)) return { ok: true, value: null };
  const s = String(value).trim();
  if (!ISO_TIME.test(s)) {
    return { ok: false, message: 'Heure invalide — utilisez le format HH:MM (ex. 14:30)' };
  }
  const [h, m] = s.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return { ok: false, message: 'Heure invalide' };
  }
  return { ok: true, value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}
