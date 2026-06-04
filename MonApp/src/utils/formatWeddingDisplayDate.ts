/**
 * Affichage lisible pour l’UI (formulaire mini-site dans l’app).
 * Garde la saisie au format technique AAAA-MM-JJ pour l’API.
 */

export type WeddingDisplayLang = 'fr' | 'he' | 'en';

function parseFlexibleDate(trimmed: string): Date | null {
  if (!trimmed) return null;

  const ymdOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdOnly) {
    const d = new Date(`${trimmed}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Date mariage lisible (jamais d’ISO brute pour l’utilisateur).
 * Si `input` est `YYYY-MM-DD` sans composante temps, aucune partie “heure”.
 */
export function formatWeddingDisplayDate(input: string, language: WeddingDisplayLang = 'fr'): string {
  const trimmed = input.trim();
  const d = parseFlexibleDate(trimmed);
  if (!d) return '';

  const locale = language === 'fr' ? 'fr-FR' : language === 'he' ? 'he-IL' : 'en-US';

  const datePart = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  if (!trimmed.includes('T')) {
    return datePart;
  }

  const frTime = (): string => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} à ${hh}h${mm}`;
  };

  if (language === 'fr') return frTime();
  if (language === 'he') {
    const t = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(d);
    return `${datePart} בשעה ${t}`;
  }

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${datePart} ${timePart}`;
}
