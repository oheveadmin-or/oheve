/**
 * Calendrier du builder : date hébraïque calculée automatiquement à partir
 * d'une date grégorienne (calendrier hébraïque natif d'Intl), et conversion
 * entre le sélecteur de date (ISO) et le texte libre des événements
 * (« 14 juin 2026 »), qui reste le format affiché par les templates.
 */

const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** "2026-06-14" → Date à midi local (évite le décalage de jour lié au fuseau) */
function fromIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Nombre → lettres hébraïques (gematria), avec ״ / ׳ : 29 → כ״ט, 786 → תשפ״ו */
function gematria(n: number): string {
  const units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];
  let rest = n % 1000;
  let out = '';
  while (rest >= 400) { out += 'ת'; rest -= 400; }
  out += hundreds[Math.floor(rest / 100)];
  rest %= 100;
  // 15 et 16 s'écrivent ט״ו / ט״ז (jamais les lettres du Nom divin)
  if (rest === 15) out += 'טו';
  else if (rest === 16) out += 'טז';
  else out += tens[Math.floor(rest / 10)] + units[rest % 10];
  return out.length === 1 ? `${out}׳` : `${out.slice(0, -1)}״${out.slice(-1)}`;
}

export interface HebrewDate {
  /** « 29 sivan 5786 » */
  fr: string;
  /** « כ״ט בסיוון תשפ״ו » */
  he: string;
}

export function hebrewDateFromIso(iso: string): HebrewDate | null {
  const d = fromIso(iso);
  if (!d) return null;
  try {
    const fr = new Intl.DateTimeFormat('fr-FR-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(d)
      .replace(/\s*A\.\s*M\.?$/i, '');
    const parts = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    // formatToParts rend le mois sans sa préposition : « כ״ט בסיוון », pas « כ״ט סיוון »
    const he = day && year ? `${gematria(day)} ב${month} ${gematria(year)}` : '';
    return { fr, he };
  } catch {
    return null;
  }
}

/** « dimanche 14 juin 2026 » */
export function frenchLongDate(iso: string): string {
  const d = fromIso(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** ISO → texte d'événement « 14 juin 2026 » (le premier mot reste le numéro du jour) */
export function isoToEventDateText(iso: string): string {
  const d = fromIso(iso);
  if (!d) return '';
  return `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Texte d'événement « 14 juin 2026 » → ISO pour le sélecteur ('' si texte libre non reconnu) */
export function eventDateTextToIso(text: string): string {
  const m = /^\s*(\d{1,2})\s+([a-zéû]+)\s+(\d{4})\s*$/i.exec(text ?? '');
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test((text ?? '').trim()) ? text.trim() : '';
  const month = FR_MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return '';
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
