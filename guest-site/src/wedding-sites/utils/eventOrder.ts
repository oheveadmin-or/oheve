/**
 * Tri chronologique des événements du programme (Henné, Mairie, Houppa…).
 *
 * Les dates et heures sont saisies en texte libre dans le builder
 * (« 14 juin 2026 », « Dimanche 14/06 », « 2026-06-14 », « 19h00 », « 19:30 »…),
 * on les interprète ici pour afficher le programme dans l'ordre réel des dates
 * plutôt que dans l'ordre où les événements ont été activés.
 */

const MONTHS: Record<string, number> = {
  // FR
  janvier: 1, janv: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6,
  juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11,
  decembre: 12, dec: 12,
  // EN
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6,
  jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, october: 10, november: 11,
  december: 12,
  // HE
  'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'מרס': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6, 'יולי': 7,
  'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12,
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/** Retourne une clé triable (AAAAMMJJ) ou null si la date n'est pas reconnue. */
export function parseEventDate(raw: string | undefined, fallbackYear?: number): number | null {
  if (!raw) return null;
  const s = normalize(raw);
  if (!s) return null;
  const key = (y: number | undefined, m: number, d: number) =>
    m >= 1 && m <= 12 && d >= 1 && d <= 31 ? (y ?? fallbackYear ?? 0) * 10000 + m * 100 + d : null;

  // 2026-06-14
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return key(+m[1], +m[2], +m[3]);

  // 14/06/2026, 14.06.26, 14-06, 14/06
  m = s.match(/(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?/);
  if (m) return key(m[3] ? fullYear(+m[3]) : undefined, +m[2], +m[1]);

  const words = s.split(/[\s,]+/).filter(Boolean);
  const monthIdx = words.findIndex((w) => MONTHS[w.replace(/\.$/, '')] !== undefined);
  if (monthIdx >= 0) {
    const month = MONTHS[words[monthIdx].replace(/\.$/, '')];
    const num = (w: string | undefined) => {
      const n = w?.match(/^(\d{1,2})(?:er|st|nd|rd|th|e)?$/);
      return n ? +n[1] : undefined;
    };
    // « 14 juin » (FR/HE) ou « June 14 » (EN)
    const day = num(words[monthIdx - 1]) ?? num(words[monthIdx + 1]);
    const yearWord = words.slice(monthIdx + 1).find((w) => /^\d{4}$/.test(w));
    if (day !== undefined) return key(yearWord ? +yearWord : undefined, month, day);
  }
  return null;
}

/** Heure en minutes depuis minuit (« 19h00 », « 19h », « 19:30 », « 7pm »), sinon null. */
export function parseEventTime(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = normalize(raw);
  const m = s.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?|(\d{1,2})\s*(am|pm)/);
  if (!m) return null;
  if (m[3]) {
    let h = +m[3] % 12;
    if (m[4] === 'pm') h += 12;
    return h * 60;
  }
  const h = +m[1];
  const min = m[2] ? +m[2] : 0;
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/**
 * Trie les événements par date puis heure. Le tri est stable : les événements
 * sans date reconnue gardent leur ordre d'origine et passent après ceux datés.
 */
export function sortEventsChronologically<T>(
  events: T[],
  getDate: (e: T) => string | undefined,
  getTime: (e: T) => string | undefined,
  fallbackYear?: number,
): T[] {
  return events
    .map((e, i) => ({ e, i, d: parseEventDate(getDate(e), fallbackYear), t: parseEventTime(getTime(e)) }))
    .sort((a, b) => {
      if (a.d === null || b.d === null) {
        if (a.d !== b.d) return a.d === null ? 1 : -1;
        return a.i - b.i;
      }
      if (a.d !== b.d) return a.d - b.d;
      if (a.t !== null && b.t !== null && a.t !== b.t) return a.t - b.t;
      return a.i - b.i;
    })
    .map((x) => x.e);
}

/** Année du mariage (date ISO du site) pour compléter les dates saisies sans année. */
export function weddingYear(siteDate: string | undefined): number | undefined {
  const y = siteDate ? new Date(siteDate).getFullYear() : NaN;
  return Number.isNaN(y) ? undefined : y;
}

/**
 * Formulaire RSVP : remet les événements liés au programme (`jewish-<type>`)
 * dans l'ordre chronologique de leurs dates, en laissant les autres
 * événements (ajoutés à la main) à leur place.
 */
export function orderRsvpEventsByProgram<T extends { id: string }>(
  rsvpEvents: T[],
  program: Array<{ type: string; date?: string; time?: string; enabled?: boolean }> | undefined,
  fallbackYear?: number,
): T[] {
  if (!program?.length) return rsvpEvents;
  const byId = new Map(program.map((p) => [`jewish-${p.type}`, p]));
  const linked = rsvpEvents.filter((e) => byId.has(e.id));
  if (linked.length < 2) return rsvpEvents;
  const sorted = sortEventsChronologically(linked, (e) => byId.get(e.id)?.date, (e) => byId.get(e.id)?.time, fallbackYear);
  let k = 0;
  return rsvpEvents.map((e) => (byId.has(e.id) ? sorted[k++] : e));
}
