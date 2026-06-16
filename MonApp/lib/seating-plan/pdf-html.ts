import { T } from './pdf-theme';
import type { Guest, PdfCardStyle, PdfExportType, PdfOptions, SeatingPlanData, SeatingTable, TableShape } from './types';

// Palette Oheve export — remplace les couleurs aléatoires des tables
const ACCENTS = ['#8F947F', '#A09480', '#7B7063', '#C7B7A5', '#B5A692'];
const GOLD = '#C5A55A';

function ac(idx: number) { return ACCENTS[idx % ACCENTS.length]; }

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shapeLabel(s: TableShape) {
  if (s === 'round') return 'Ronde';
  if (s === 'oval') return 'Ovale';
  return 'Rectangulaire';
}

function tableGuests(t: SeatingTable, guests: Guest[]) {
  return t.guestIds.map((id) => guests.find((g) => g.id === id)).filter(Boolean) as Guest[];
}

function stats(data: SeatingPlanData) {
  const totalSeats = data.tables.reduce((s, t) => s + t.seats, 0);
  const totalPeople = data.guests.reduce((s, g) => s + g.guestCount, 0);
  const assignedPeople = data.guests
    .filter((g) => data.tables.some((t) => t.guestIds.includes(g.id)))
    .reduce((s, g) => s + g.guestCount, 0);
  return { totalSeats, totalPeople, assignedPeople, unassigned: totalPeople - assignedPeople, tableCount: data.tables.length };
}

function todayFr() {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Décorations SVG légères ───────────────────────────────────────────────────

function decoBar(w = 160) {
  const half = w / 2 - 14;
  return `<svg width="${w}" height="14" viewBox="0 0 ${w} 14" style="display:block;margin:0 auto;">
    <line x1="0" y1="7" x2="${half}" y2="7" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <circle cx="${w / 2}" cy="7" r="3" fill="${GOLD}" opacity="0.65"/>
    <line x1="${w / 2 + 14}" y1="7" x2="${w}" y2="7" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
  </svg>`;
}

function cornerL(size = 32) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <path d="M4 4 L4 ${size * 0.55}" stroke="${GOLD}" stroke-width="1" fill="none" opacity="0.45"/>
    <path d="M4 4 L${size * 0.55} 4" stroke="${GOLD}" stroke-width="1" fill="none" opacity="0.45"/>
  </svg>`;
}

function corners() {
  const s = 32;
  const pos = (top: boolean, left: boolean) =>
    `style="position:absolute;${top ? 'top:6px' : 'bottom:6px'};${left ? 'left:6px' : 'right:6px'};${!top ? 'transform:scaleY(-1)' : ''}${!left ? (top ? ';transform:scaleX(-1)' : ';transform:scale(-1,-1)') : ''}"`;
  return `<div ${pos(true, true)}>${cornerL(s)}</div>
          <div ${pos(true, false)}>${cornerL(s)}</div>
          <div ${pos(false, true)}>${cornerL(s)}</div>
          <div ${pos(false, false)}>${cornerL(s)}</div>`;
}

function ftr(name: string, label: string) {
  return `<div style="position:absolute;bottom:8mm;left:14mm;right:14mm;display:flex;justify-content:space-between;font-size:7.5px;color:${T.textLight};border-top:1px solid ${T.saugePale};padding-top:5px;letter-spacing:0.4px;">
    <span>${esc(name)}</span><span>${esc(label)}</span><span>${todayFr()}</span>
  </div>`;
}

// ── 1. COUVERTURE ─────────────────────────────────────────────────────────────

function coverPage(data: SeatingPlanData): string {
  const { wedding } = data;
  const s = stats(data);
  const name = wedding.coupleName || '';
  const wname = wedding.weddingTitle || name;

  return `<div class="page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:100vh;padding:20mm 16mm;background:${T.ivoire};position:relative;">
    ${corners()}

    <div style="font-size:8px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${T.sauge};margin-bottom:20px;">Plan de table</div>

    ${decoBar(180)}

    <div style="font-family:'Cormorant Garamond',serif;font-size:${name ? '46px' : '32px'};font-weight:700;color:${T.textDark};line-height:1.1;margin:22px 0 10px;">
      ${name ? esc(name) : `<span style="color:${T.saugePale};">Noms des mariés</span>`}
    </div>

    ${wedding.date ? `<div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:15px;color:${T.textMid};margin-bottom:4px;">${esc(wedding.date)}</div>` : ''}
    ${wedding.location ? `<div style="font-size:12px;color:${T.textLight};margin-bottom:4px;">${esc(wedding.location)}</div>` : ''}

    ${decoBar(180)}

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:30px;width:100%;max-width:380px;">
      ${[
        { v: s.tableCount, l: 'Tables' },
        { v: s.totalPeople, l: 'Invités' },
        { v: s.assignedPeople, l: 'Placés' },
        { v: s.unassigned, l: 'Restants' },
      ].map(({ v, l }) => `<div style="background:#fff;border:1px solid ${T.saugePale};border-radius:10px;padding:14px 6px;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:${T.saugeDark};line-height:1;">${v}</div>
        <div style="font-size:7.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.textLight};margin-top:3px;">${l}</div>
      </div>`).join('')}
    </div>

    ${ftr(wname, 'Couverture')}
  </div>`;
}

// ── 2. PLAN MURAL ─────────────────────────────────────────────────────────────

function muralPages(data: SeatingPlanData): string {
  const { tables, guests, wedding } = data;
  const wname = wedding.weddingTitle || wedding.coupleName || '';

  // Regrouper par pages de 12 tables max
  const PER_PAGE = 12;
  let html = '';

  for (let p = 0; p < Math.max(1, Math.ceil(tables.length / PER_PAGE)); p++) {
    const group = tables.slice(p * PER_PAGE, (p + 1) * PER_PAGE);
    const cols = group.length <= 4 ? 2 : 3;

    const blocks = group.map((t, gi) => {
      const idx = p * PER_PAGE + gi;
      const ag = tableGuests(t, guests);
      const occupied = ag.reduce((s, g) => s + g.guestCount, 0);
      const color = ac(idx);
      const guestLines = ag.length
        ? ag.map((g) => `<div style="font-size:10.5px;color:${T.textMid};padding:2px 0;line-height:1.4;">${esc(g.name)}${g.guestCount > 1 ? ` <span style="color:${T.textLight};font-size:9px;">(${g.guestCount})</span>` : ''}</div>`).join('')
        : `<div style="font-size:10px;color:${T.saugePale};font-style:italic;padding:2px 0;">—</div>`;

      return `<div style="break-inside:avoid;padding:10px 12px;border-top:2px solid ${color};background:#fff;border-radius:0 0 6px 6px;margin-bottom:0;">
        <div style="font-size:7.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${color};margin-bottom:2px;">Table ${idx + 1}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:${T.textDark};margin-bottom:5px;">${esc(t.name)}</div>
        ${guestLines}
        <div style="margin-top:5px;font-size:7.5px;color:${T.textLight};">${occupied} / ${t.seats} places · ${shapeLabel(t.shape)}</div>
      </div>`;
    }).join('');

    html += `<div class="page" style="padding:12mm 12mm 18mm;background:${T.ivoire};min-height:100vh;position:relative;">
      ${corners()}
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:7.5px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${T.sauge};margin-bottom:8px;">Mariage</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:700;color:${T.textDark};line-height:1.1;">
          ${wedding.coupleName ? esc(wedding.coupleName) : '&nbsp;'}
        </div>
        ${wedding.date || wedding.location
          ? `<div style="font-size:11px;color:${T.textMid};margin-top:5px;">${[wedding.date, wedding.location].filter(Boolean).map(esc).join(' · ')}</div>`
          : ''}
        <div style="margin:12px auto 10px;">${decoBar(160)}</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${T.textMid};">Trouvez votre table</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;">
        ${blocks}
      </div>

      ${ftr(wname, p > 0 ? `Plan mural — page ${p + 1}` : 'Plan mural')}
    </div>`;
  }

  return html;
}

// ── 3. CARTES DE TABLE (4 par A4) ────────────────────────────────────────────

function cartesPages(data: SeatingPlanData): string {
  const { tables, guests, wedding } = data;
  const wname = wedding.weddingTitle || wedding.coupleName || '';
  let html = '';

  for (let i = 0; i < Math.max(1, tables.length); i += 4) {
    const group = tables.slice(i, i + 4);

    const cards = group.map((t, gi) => {
      const idx = i + gi;
      const ag = tableGuests(t, guests);
      const occupied = ag.reduce((s, g) => s + g.guestCount, 0);
      const color = ac(idx);
      const guestList = ag.length
        ? ag.map((g) => `<div style="font-size:10px;color:${T.textMid};padding:3px 0;border-bottom:1px solid ${T.saugePale};line-height:1.3;">${esc(g.name)}${g.guestCount > 1 ? ` <span style="color:${T.textLight};font-size:9px;">×${g.guestCount}</span>` : ''}</div>`).join('')
        : `<div style="font-size:10px;color:${T.textLight};font-style:italic;padding:4px 0;">Aucun invité</div>`;

      return `<div style="border:1.5px solid ${T.saugePale};border-radius:12px;padding:16px 14px 40px;background:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${color},${T.beige},${T.ivoire});"></div>

        <div style="text-align:center;margin-bottom:10px;">
          ${wedding.coupleName ? `<div style="font-size:7px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${T.sauge};margin-bottom:6px;">${esc(wedding.coupleName)}</div>` : ''}
          <div style="font-family:'Cormorant Garamond',serif;font-size:56px;font-weight:700;color:${color};line-height:1;">${idx + 1}</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:${T.textDark};margin-top:2px;">${esc(t.name)}</div>
          <div style="margin:8px auto;">${decoBar(90)}</div>
        </div>

        <div style="font-size:7.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${T.textLight};margin-bottom:6px;">Invités</div>
        <div style="flex:1;overflow:hidden;">${guestList}</div>

        <div style="position:absolute;bottom:10px;left:14px;right:14px;display:flex;justify-content:space-between;font-size:7.5px;color:${T.textLight};">
          <span>${shapeLabel(t.shape)}</span>
          <span>${occupied} / ${t.seats} places</span>
        </div>
      </div>`;
    });

    // Compléter à 4 cartes pour alignement
    while (cards.length < 4) {
      cards.push(`<div style="border:1.5px dashed ${T.saugePale};border-radius:12px;opacity:0.25;background:${T.ivoire};"></div>`);
    }

    html += `<div class="page" style="padding:10mm;background:${T.ivoire};min-height:100vh;position:relative;">
      <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:7mm;height:calc(100vh - 20mm);">
        ${cards.join('')}
      </div>
      ${ftr(wname, `Cartes de table — page ${Math.floor(i / 4) + 1}`)}
    </div>`;
  }

  return html;
}

// ── 4. MARQUE-PLACES (8 par A4) ──────────────────────────────────────────────

function marquePlacesPages(data: SeatingPlanData): string {
  const { tables, guests, wedding } = data;
  const wname = wedding.weddingTitle || wedding.coupleName || '';

  type Card = { name: string; tableIdx: number; tableName: string; count: number };
  const cards: Card[] = [];

  tables.forEach((t, idx) => {
    tableGuests(t, guests).forEach((g) => {
      cards.push({ name: g.name, tableIdx: idx + 1, tableName: t.name, count: g.guestCount });
    });
  });

  // Invités non placés en bas
  guests
    .filter((g) => !tables.some((t) => t.guestIds.includes(g.id)))
    .forEach((g) => cards.push({ name: g.name, tableIdx: 0, tableName: '—', count: g.guestCount }));

  if (cards.length === 0) {
    return `<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:${T.ivoire};">
      <div style="text-align:center;color:${T.textLight};font-style:italic;">Aucun invité à afficher</div>
    </div>`;
  }

  const PER_PAGE = 8;
  let html = '';

  for (let i = 0; i < cards.length; i += PER_PAGE) {
    const group = cards.slice(i, i + PER_PAGE);

    const cardHtml = group.map((c) => {
      const color = c.tableIdx > 0 ? ac(c.tableIdx - 1) : T.textLight;
      return `<div style="border:1px dashed ${T.taupe};border-radius:8px;padding:9px 14px;background:#fff;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden;">
        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${color};"></div>
        <div style="padding-left:10px;flex:1;">
          <div style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:${T.textDark};line-height:1.2;">${esc(c.name)}${c.count > 1 ? ` <span style="font-size:12px;color:${T.textLight};">×${c.count}</span>` : ''}</div>
          <div style="font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${color};margin-top:2px;">${c.tableIdx > 0 ? `Table ${c.tableIdx} · ${esc(c.tableName)}` : 'Non placé'}</div>
        </div>
        ${wedding.coupleName ? `<div style="font-size:7px;color:${T.saugePale};letter-spacing:2px;text-transform:uppercase;text-align:right;max-width:60px;word-break:break-word;">${esc(wedding.coupleName)}</div>` : ''}
      </div>`;
    }).join('');

    html += `<div class="page" style="padding:10mm;background:${T.ivoire};min-height:100vh;position:relative;">
      <div style="text-align:center;margin-bottom:8mm;">
        <div style="font-size:7.5px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${T.sauge};">Marque-places${wname ? ` · ${esc(wname)}` : ''}</div>
        <div style="font-size:8px;color:${T.textLight};margin-top:3px;">Découpez le long des pointillés</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;">
        ${cardHtml}
      </div>
      ${ftr(wname, `Marque-places — page ${Math.floor(i / PER_PAGE) + 1}`)}
    </div>`;
  }

  return html;
}

// ── 5. LISTE TRAITEUR ─────────────────────────────────────────────────────────

function traiteurPage(data: SeatingPlanData): string {
  const { tables, guests, wedding } = data;
  const wname = wedding.weddingTitle || wedding.coupleName || '';

  const rows = tables.map((t, idx) => {
    const ag = tableGuests(t, guests);
    const occupied = ag.reduce((s, g) => s + g.guestCount, 0);
    const names = ag.map((g) => `${esc(g.name)}${g.guestCount > 1 ? ` (×${g.guestCount})` : ''}`).join(', ') || '—';
    const bg = idx % 2 === 0 ? '#fff' : T.ivoire;
    return `<tr style="background:${bg};">
      <td style="padding:7px 10px;font-weight:700;color:${T.textDark};white-space:nowrap;">${idx + 1}</td>
      <td style="padding:7px 10px;color:${T.textMid};">${esc(t.name)}</td>
      <td style="padding:7px 10px;text-align:center;color:${T.textLight};">${shapeLabel(t.shape)}</td>
      <td style="padding:7px 10px;text-align:center;font-weight:700;color:${T.saugeDark};">${occupied} / ${t.seats}</td>
      <td style="padding:7px 10px;font-size:10px;color:${T.textMid};line-height:1.5;">${names}</td>
    </tr>`;
  }).join('');

  const s = stats(data);

  return `<div class="page" style="padding:14mm 14mm 18mm;background:#fff;min-height:100vh;position:relative;">
    <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid ${T.saugePale};">
      <div style="font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${T.sauge};margin-bottom:4px;">Service · Traiteur</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:${T.textDark};">
        ${wedding.coupleName ? esc(wedding.coupleName) : 'Plan de service'}
      </div>
      ${wedding.date || wedding.location
        ? `<div style="font-size:11px;color:${T.textLight};margin-top:3px;">${[wedding.date, wedding.location].filter(Boolean).map(esc).join(' · ')}</div>`
        : ''}
    </div>

    <table style="width:100%;border-collapse:collapse;border:1px solid ${T.saugePale};border-radius:8px;overflow:hidden;font-size:11px;">
      <thead>
        <tr style="background:${T.saugePale};">
          <th style="padding:7px 10px;text-align:left;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.saugeDark};width:32px;">N°</th>
          <th style="padding:7px 10px;text-align:left;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.saugeDark};">Table</th>
          <th style="padding:7px 10px;text-align:center;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.saugeDark};">Forme</th>
          <th style="padding:7px 10px;text-align:center;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.saugeDark};">Pers.</th>
          <th style="padding:7px 10px;text-align:left;font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.saugeDark};">Invités</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="background:${T.saugePale};border-top:2px solid ${T.sauge};">
          <td colspan="3" style="padding:8px 10px;font-weight:700;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:${T.saugeDark};">Total général</td>
          <td style="padding:8px 10px;text-align:center;font-weight:700;color:${T.saugeDark};">${s.assignedPeople} / ${s.totalSeats}</td>
          <td style="padding:8px 10px;font-size:9px;color:${T.textLight};">${s.tableCount} tables · ${s.unassigned > 0 ? `${s.unassigned} non placés` : 'Tous placés ✓'}</td>
        </tr>
      </tbody>
    </table>

    ${ftr(wname, 'Feuille service')}
  </div>`;
}

// ── 6. LIVRE DES TABLES (3 tables par page) ───────────────────────────────────

function livrePages(data: SeatingPlanData): string {
  const { tables, guests, wedding } = data;
  const wname = wedding.weddingTitle || wedding.coupleName || '';
  const PER_PAGE = 3;
  let html = '';

  for (let i = 0; i < Math.max(1, tables.length); i += PER_PAGE) {
    const group = tables.slice(i, i + PER_PAGE);

    const blocks = group.map((t, gi) => {
      const idx = i + gi;
      const ag = tableGuests(t, guests);
      const occupied = ag.reduce((s, g) => s + g.guestCount, 0);
      const color = ac(idx);
      const half = Math.ceil(ag.length / 2);
      const col1 = ag.slice(0, half);
      const col2 = ag.slice(half);

      const guestRow = (g: Guest) =>
        `<div style="font-size:10.5px;color:${T.textMid};padding:3px 0;border-bottom:1px dotted ${T.saugePale};line-height:1.3;">${esc(g.name)}${g.guestCount > 1 ? ` <span style="color:${T.textLight};font-size:9px;">(${g.guestCount})</span>` : ''}</div>`;

      return `<div style="background:#fff;border-radius:12px;padding:14px 16px;border-left:3px solid ${color};margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <div style="display:flex;align-items:baseline;gap:10px;">
            <span style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:${color};line-height:1;">${idx + 1}</span>
            <span style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:${T.textDark};">${esc(t.name)}</span>
          </div>
          <div style="font-size:8.5px;color:${T.textLight};text-align:right;">
            ${shapeLabel(t.shape)}<br/>
            <strong style="color:${occupied === t.seats ? T.saugeDark : T.error};">${occupied} / ${t.seats} places</strong>
          </div>
        </div>
        <div style="height:1px;background:${T.saugePale};margin-bottom:8px;"></div>
        ${ag.length > 0
          ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
              <div>${col1.map(guestRow).join('')}</div>
              <div>${col2.map(guestRow).join('')}</div>
            </div>`
          : `<div style="font-size:10px;color:${T.textLight};font-style:italic;padding:4px 0;">Aucun invité assigné</div>`}
      </div>`;
    }).join('');

    const pageLabel = tables.length === 0
      ? 'Tables'
      : `Tables ${i + 1}–${Math.min(i + PER_PAGE, tables.length)}`;

    html += `<div class="page" style="padding:12mm 14mm 18mm;background:${T.ivoire};min-height:100vh;position:relative;">
      ${blocks}
      ${ftr(wname, pageLabel)}
    </div>`;
  }

  return html;
}

// ── 7. LISTE COMPACTE EN COLONNES ─────────────────────────────────────────────

function listePages(data: SeatingPlanData): string {
  const { tables, guests, wedding } = data;
  const wname = wedding.weddingTitle || wedding.coupleName || '';
  const s = stats(data);

  const blocks = tables.map((t, idx) => {
    const ag = tableGuests(t, guests);
    const occupied = ag.reduce((acc, g) => acc + g.guestCount, 0);
    const color = ac(idx);
    const lines = ag.length
      ? ag.map((g) => `<div style="font-size:10.5px;padding:2px 0;color:${T.textMid};">• ${esc(g.name)} <span style="color:${T.textLight};font-size:9px;">(${g.guestCount})</span></div>`).join('')
      : `<div style="font-size:10px;color:${T.textLight};font-style:italic;">—</div>`;

    return `<div style="break-inside:avoid;margin-bottom:10px;padding:10px 12px;background:#fff;border-radius:10px;border-left:3px solid ${color};">
      <div style="font-size:11px;font-weight:700;color:${T.textDark};margin-bottom:4px;">
        <span style="color:${color};">Table ${idx + 1}</span> — ${esc(t.name)}
        <span style="font-weight:400;color:${T.textLight};font-size:9px;margin-left:6px;">${occupied}/${t.seats} · ${shapeLabel(t.shape)}</span>
      </div>
      ${lines}
    </div>`;
  }).join('');

  const unassigned = guests.filter((g) => !tables.some((t) => t.guestIds.includes(g.id)));

  return `<div class="page" style="padding:14mm 14mm 18mm;background:${T.ivoire};min-height:100vh;position:relative;">
    <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid ${T.saugePale};display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div style="font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${T.sauge};margin-bottom:3px;">Liste des invités</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:${T.textDark};">${wedding.coupleName ? esc(wedding.coupleName) : 'Plan de table'}</div>
      </div>
      <div style="text-align:right;font-size:9px;color:${T.textLight};">${s.tableCount} tables · ${s.assignedPeople}/${s.totalPeople} invités placés</div>
    </div>

    <div style="column-count:2;column-gap:12px;">${blocks}</div>

    ${unassigned.length > 0
      ? `<div style="margin-top:12px;padding:10px 12px;background:${T.errorPale};border-radius:10px;border-left:3px solid ${T.error};">
          <div style="font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${T.error};margin-bottom:6px;">Non placés (${unassigned.length})</div>
          ${unassigned.map((g) => `<div style="font-size:10.5px;color:${T.textMid};padding:1px 0;">• ${esc(g.name)} (${g.guestCount})</div>`).join('')}
        </div>`
      : ''}

    ${ftr(wname, 'Liste par table')}
  </div>`;
}

// ── Expand guests (guestCount → lignes individuelles) ─────────────────────────

function expandGuests(guests: Guest[]): string[] {
  const lines: string[] = [];
  for (const g of guests) {
    for (let i = 0; i < Math.max(1, g.guestCount); i++) {
      lines.push(g.name);
    }
  }
  return lines;
}

// ── Ornement SVG décoratif ────────────────────────────────────────────────────

function ornamentSvg(style: PdfCardStyle): string {
  if (style === 'classique') {
    return `<svg width="120" height="28" viewBox="0 0 120 28">
      <line x1="0" y1="14" x2="44" y2="14" stroke="#1a1a1a" stroke-width="0.6" opacity="0.4"/>
      <path d="M52 14 C54 8, 60 6, 60 14 C60 6, 66 8, 68 14" stroke="#1a1a1a" stroke-width="0.8" fill="none" opacity="0.5"/>
      <line x1="76" y1="14" x2="120" y2="14" stroke="#1a1a1a" stroke-width="0.6" opacity="0.4"/>
    </svg>`;
  }
  if (style === 'moderne') {
    return `<svg width="80" height="6" viewBox="0 0 80 6">
      <rect x="0" y="2" width="80" height="2" fill="#3C352F" opacity="0.15"/>
    </svg>`;
  }
  // elegant (Oheve)
  return `<svg width="140" height="30" viewBox="0 0 140 30">
    <line x1="0" y1="15" x2="52" y2="15" stroke="${GOLD}" stroke-width="0.7" opacity="0.5"/>
    <circle cx="60" cy="15" r="5" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.6"/>
    <circle cx="60" cy="15" r="2" fill="${GOLD}" opacity="0.5"/>
    <circle cx="80" cy="15" r="5" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.6"/>
    <circle cx="80" cy="15" r="2" fill="${GOLD}" opacity="0.5"/>
    <line x1="88" y1="15" x2="140" y2="15" stroke="${GOLD}" stroke-width="0.7" opacity="0.5"/>
  </svg>`;
}

function sealSvg(style: PdfCardStyle, num: number): string {
  if (style === 'classique') {
    // Médaillon calligraphie sobre
    return `<svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke="#1a1a1a" stroke-width="0.8" opacity="0.2"/>
      <circle cx="40" cy="40" r="30" fill="none" stroke="#1a1a1a" stroke-width="0.4" opacity="0.15"/>
      <text x="40" y="52" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="34" font-weight="700" fill="#1a1a1a" opacity="0.85">${num}</text>
    </svg>`;
  }
  if (style === 'moderne') {
    return `<svg width="70" height="70" viewBox="0 0 70 70">
      <text x="35" y="52" text-anchor="middle" font-family="'DM Sans',sans-serif" font-size="40" font-weight="700" fill="#3C352F" opacity="0.9">${num}</text>
    </svg>`;
  }
  // elegant
  return `<svg width="90" height="90" viewBox="0 0 90 90">
    <circle cx="45" cy="45" r="40" fill="${GOLD}" opacity="0.08"/>
    <circle cx="45" cy="45" r="38" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.4"/>
    <circle cx="45" cy="45" r="32" fill="none" stroke="${GOLD}" stroke-width="0.5" opacity="0.3" stroke-dasharray="4 3"/>
    <text x="45" y="57" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="38" font-weight="700" fill="${GOLD}" opacity="0.85">${num}</text>
  </svg>`;
}

// ── 0. PANNEAUX CARTES (1 page par table — design imprimable) ─────────────────

function panneauxPages(data: SeatingPlanData, style: PdfCardStyle = 'elegant'): string {
  const { tables, guests, wedding } = data;
  const wname = wedding.weddingTitle || wedding.coupleName || '';

  const isClassique = style === 'classique';
  const isModerne = style === 'moderne';
  const isElegant = style === 'elegant';

  const bg = isModerne ? '#ffffff' : isClassique ? '#ffffff' : T.ivoire;
  const textFamily = isModerne
    ? "'DM Sans',sans-serif"
    : "'Cormorant Garamond',Georgia,serif";
  const tableLabelColor = isModerne ? '#3C352F' : isClassique ? '#1a1a1a' : T.sauge;
  const tableNumColor = isModerne ? '#3C352F' : isClassique ? '#1a1a1a' : GOLD;
  const guestColor = isModerne ? '#3C352F' : isClassique ? '#1a1a1a' : T.textMid;
  const borderStyle = isModerne
    ? `border:1.5px solid #e0dbd6;`
    : isClassique
    ? `border:1px solid #1a1a1a;`
    : `border:1.5px solid ${T.saugePale};`;
  const borderTop = isElegant ? `border-top:3px solid ${GOLD};` : '';

  if (tables.length === 0) {
    return `<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:${bg};">
      <div style="text-align:center;color:${T.textLight};font-style:italic;font-size:13px;">Aucune table à afficher</div>
    </div>`;
  }

  return tables.map((t, idx) => {
    const ag = tableGuests(t, guests);
    const names = expandGuests(ag); // chaque personne sur sa propre ligne
    const occupied = ag.reduce((s, g) => s + g.guestCount, 0);

    const guestLines = names.length > 0
      ? names.map((name, ni) => {
          const isLast = ni === names.length - 1;
          if (isModerne) {
            return `<div style="font-size:12px;color:${guestColor};padding:5px 0;${!isLast ? `border-bottom:1px solid #f0ede9;` : ''}letter-spacing:0.3px;font-weight:500;">${esc(name)}</div>`;
          }
          if (isClassique) {
            return `<div style="font-size:12.5px;color:${guestColor};padding:5px 0;${!isLast ? `border-bottom:1px dotted rgba(26,26,26,0.15);` : ''}font-family:'Cormorant Garamond',serif;letter-spacing:0.5px;">${esc(name)}</div>`;
          }
          // elegant
          return `<div style="font-size:12.5px;color:${guestColor};padding:5px 0;${!isLast ? `border-bottom:1px solid ${T.saugePale};` : ''}font-family:'Cormorant Garamond',serif;letter-spacing:0.3px;">${esc(name)}</div>`;
        }).join('')
      : `<div style="font-size:11px;color:${T.textLight};font-style:italic;padding:8px 0;">Aucun invité assigné</div>`;

    const tableTitle = isModerne
      ? `<div style="font-size:9px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${tableLabelColor};opacity:0.5;margin-bottom:6px;">TABLE</div>
         <div style="font-size:58px;font-weight:700;color:${tableNumColor};line-height:1;margin-bottom:4px;">${idx + 1}</div>
         ${t.name !== String(idx + 1) ? `<div style="font-size:14px;font-weight:600;color:${guestColor};margin-bottom:2px;">${esc(t.name)}</div>` : ''}`
      : isClassique
      ? `<div style="font-size:9px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${tableLabelColor};opacity:0.6;margin-bottom:10px;">Table</div>
         ${sealSvg(style, idx + 1)}
         ${t.name !== String(idx + 1) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:${guestColor};margin-top:6px;">${esc(t.name)}</div>` : ''}`
      : `<div style="font-size:7.5px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${tableLabelColor};margin-bottom:10px;">Table</div>
         ${sealSvg(style, idx + 1)}
         ${t.name !== String(idx + 1) ? `<div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:${T.textDark};margin-top:6px;">${esc(t.name)}</div>` : ''}`;

    return `<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:${isElegant ? T.ivoire : '#f5f4f2'};padding:14mm;">
      <div style="width:100%;max-width:360px;${borderStyle}${borderTop}border-radius:${isModerne ? '4px' : '2px'};padding:${isModerne ? '32px 28px' : '36px 32px'};background:${bg};position:relative;text-align:center;">

        ${isElegant ? `<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${GOLD},transparent);"></div>` : ''}
        ${isElegant ? `<div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${GOLD},transparent);"></div>` : ''}

        ${wname ? `<div style="font-size:7.5px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:${isElegant ? T.sauge : (isClassique ? 'rgba(26,26,26,0.4)' : '#aaa')};margin-bottom:${isModerne ? '20px' : '16px'};">${esc(wname)}</div>` : ''}

        ${tableTitle}

        <div style="margin:14px auto 16px;">${ornamentSvg(style)}</div>

        <div style="text-align:left;max-height:320px;overflow:hidden;">
          ${guestLines}
        </div>

        <div style="margin-top:14px;padding-top:10px;border-top:1px solid ${isElegant ? T.saugePale : (isClassique ? 'rgba(26,26,26,0.1)' : '#f0ede9')};font-size:8.5px;color:${isElegant ? T.textLight : (isModerne ? '#aaa' : 'rgba(26,26,26,0.4)')};letter-spacing:0.5px;">
          ${shapeLabel(t.shape)} · ${occupied} / ${t.seats} places
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── CSS de base ───────────────────────────────────────────────────────────────

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'DM Sans',-apple-system,sans-serif;font-size:12px;line-height:1.45;}
.page{page-break-after:always;position:relative;}
.page:last-child{page-break-after:auto;}
@page{margin:0;size:A4;}
`;

// ── Générateur principal ──────────────────────────────────────────────────────

export function generateSeatingPlanHtml(
  data: SeatingPlanData,
  type: PdfExportType,
  options: PdfOptions = {},
): string {
  const cardStyle: PdfCardStyle = options.cardStyle ?? 'elegant';
  let pages = '';

  switch (type) {
    case 'panneaux':
      pages += panneauxPages(data, cardStyle);
      break;
    case 'complet':
      pages += coverPage(data);
      pages += listePages(data);
      pages += livrePages(data);
      break;
    case 'mural':
      pages += muralPages(data);
      break;
    case 'cartes':
      pages += cartesPages(data);
      break;
    case 'marque-places':
      pages += marquePlacesPages(data);
      break;
    case 'traiteur':
      pages += traiteurPage(data);
      break;
    case 'livre':
      pages += coverPage(data);
      pages += livrePages(data);
      break;
    case 'liste':
      pages += coverPage(data);
      pages += listePages(data);
      break;
  }

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><style>${BASE_CSS}</style></head><body>${pages}</body></html>`;
}
