/**
 * « Ajouter à mon agenda » : fichier .ics (Apple, Outlook…) et lien Google
 * Agenda, construits côté navigateur à partir des dates saisies en texte libre
 * dans le builder. Aucune donnée ne quitte l'appareil de l'invité.
 *
 * Les heures sont « flottantes » (sans fuseau) : 19h00 reste 19h00 dans
 * l'agenda de l'invité, ce qui correspond à l'heure affichée sur l'invitation.
 */
import { parseEventDate, parseEventTime } from './eventOrder';

export type CalendarEventInput = {
  title: string;
  /** Date libre (« 14 juin 2026 », « 2026-06-14 », « 14/06 »…) */
  date?: string;
  /** Heure libre (« 19h00 », « 19:30 »…) — absente = journée entière */
  time?: string;
  place?: string;
  description?: string;
};

export type CalendarSlot = {
  /** AAAAMMJJ */
  day: string;
  /** HHMMSS, ou null pour une journée entière */
  start: string | null;
  end: string | null;
  /** Jour suivant (fin d'une journée entière ou d'une soirée qui passe minuit) */
  endDay: string;
};

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function ymd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Durée par défaut d'un événement horodaté */
const DEFAULT_DURATION_MIN = 4 * 60;

/** null si la date n'est pas reconnue ou sans année (impossible à placer dans un agenda). */
export function calendarSlot(ev: CalendarEventInput, fallbackYear?: number): CalendarSlot | null {
  const key = parseEventDate(ev.date, fallbackYear);
  if (!key || key < 10000000) return null;
  const y = Math.floor(key / 10000);
  const m = Math.floor((key % 10000) / 100);
  const d = key % 100;
  const startDate = new Date(y, m - 1, d);
  // 31 février & co : la date normalisée ne correspond plus à la saisie
  if (startDate.getMonth() !== m - 1 || startDate.getDate() !== d) return null;

  const minutes = parseEventTime(ev.time);
  if (minutes === null) {
    const next = new Date(y, m - 1, d + 1);
    return { day: ymd(startDate), start: null, end: null, endDay: ymd(next) };
  }
  const startAt = new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const endAt = new Date(startAt.getTime() + DEFAULT_DURATION_MIN * 60000);
  const hms = (t: Date) => `${pad(t.getHours())}${pad(t.getMinutes())}00`;
  return { day: ymd(startDate), start: hms(startAt), end: hms(endAt), endDay: ymd(endAt) };
}

/** Échappement RFC 5545 des valeurs texte */
function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lignes de 75 octets max (RFC 5545 §3.1) — découpage prudent par caractères */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 70) {
    out.push(rest.slice(0, 70));
    rest = ' ' + rest.slice(70);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(ev: CalendarEventInput, slot: CalendarSlot, uid: string): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Oheve//Invitation//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}@oheve`,
    `DTSTAMP:${stamp}`,
    slot.start ? `DTSTART:${slot.day}T${slot.start}` : `DTSTART;VALUE=DATE:${slot.day}`,
    slot.start ? `DTEND:${slot.endDay}T${slot.end}` : `DTEND;VALUE=DATE:${slot.endDay}`,
    `SUMMARY:${icsText(ev.title)}`,
    ev.place?.trim() ? `LOCATION:${icsText(ev.place.trim())}` : '',
    ev.description?.trim() ? `DESCRIPTION:${icsText(ev.description.trim())}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function googleCalendarUrl(ev: CalendarEventInput, slot: CalendarSlot): string {
  const dates = slot.start ? `${slot.day}T${slot.start}/${slot.endDay}T${slot.end}` : `${slot.day}/${slot.endDay}`;
  const params = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates });
  if (ev.place?.trim()) params.set('location', ev.place.trim());
  if (ev.description?.trim()) params.set('details', ev.description.trim());
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Télécharge le .ics (iPhone : propose directement « Ajouter au calendrier »). */
export function downloadIcs(ev: CalendarEventInput, slot: CalendarSlot, uid: string) {
  const blob = new Blob([buildIcs(ev, slot, uid)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${uid}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Liens d'itinéraire : ceux saisis par le couple, sinon une recherche sur l'adresse. */
export function directionsLinks(place: string, googleMapsUrl?: string, wazeUrl?: string): { google?: string; waze?: string } {
  const q = place.trim();
  return {
    google: googleMapsUrl?.trim() || (q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : undefined),
    waze: wazeUrl?.trim() || (q ? `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes` : undefined),
  };
}
