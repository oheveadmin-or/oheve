import type { SiteLanguage } from '../types';

/**
 * Formate date + heure pour affichage invité.
 * Interdit d’afficher une ISO brute côté UI : utiliser toujours cette fonction.
 */
export function formatWeddingDate(date: string, language: SiteLanguage): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;

  const locale = language === 'fr' ? 'fr-FR' : language === 'he' ? 'he-IL' : 'en-US';

  const datePart = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  const trimmed = date.trim();

  /** Afficher l’heure seulement si l’instant contient une composante temps (pas une date seule `YYYY-MM-DD`). */
  if (!trimmed.includes('T')) {
    return datePart;
  }

  const h = d.getHours();
  const m = d.getMinutes();

  if (language === 'fr') {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${datePart} à ${hh}h${mm}`;
  }

  if (language === 'he') {
    const t = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(d);
    return `${datePart} בשעה ${t}`;
  }

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${datePart} at ${timePart}`;
}

/** Pour champs formulaire date / heure (local) */
export function splitIsoToDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '12:00' };
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date: `${y}-${mo}-${day}`, time: `${hh}:${mm}` };
}

export function mergeDateAndTimeToIso(dateYmd: string, timeHm: string): string {
  if (!dateYmd) return new Date().toISOString();
  const t = timeHm?.trim() || '12:00';
  const local = new Date(`${dateYmd}T${t}:00`);
  if (Number.isNaN(local.getTime())) return new Date().toISOString();
  return local.toISOString();
}
