import type { WeddingCardAnalysisResponse, WeddingClientData, WeddingFieldId, WeddingOverlay } from '@/src/types/weddingCard';
import { sanitizeWeddingCardResponse } from '../utils/weddingCardSanitizer';

const API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const PROMPT = `
You are a professional wedding invitation layout detector.
Return ONLY raw valid JSON. No markdown. No backticks. No explanation.

════════════════════════════════════════
CARD BOUNDARIES — CRITICAL
════════════════════════════════════════
The card is a white rectangle. There may be an envelope or marble background BEHIND it.
Detect ONLY text physically INSIDE the white card area.
The card white area typically starts around y_pct = 8-15%.
If "בס״ד" or any text appears ABOVE the card (y_pct < 8%), SKIP IT — it is on the envelope.
If "בס״ד" is INSIDE the card (y_pct >= 10%), include it as religious_text with correct y_pct.

════════════════════════════════════════
NAMES — CRITICAL
════════════════════════════════════════
bride_full_name: LEFT only. x_pct 4–40. width_pct max 36.
groom_full_name: RIGHT only. x_pct 58–94. width_pct max 36.
NEVER merge both names into one overlay.
NEVER let a name zone cross center (bride: x+w < 44, groom: x > 56).
Center area 44%–56% = decorative ("et","to",ornament) — DO NOT TOUCH.

════════════════════════════════════════
source_box vs render_box
════════════════════════════════════════
source_box = EXACT area of OLD text to erase.
  - For cursive (names): add 40% height padding above and below visible baseline.
  - For serif/hebrew: add 15% height padding.
  - Width: exact + 4% each side.
  - bride source_box: x_pct+width_pct must be < 44.
  - groom source_box: x_pct must be > 56.
render_box = area where NEW text will be drawn. Same center, slightly larger.

════════════════════════════════════════
font_match — look carefully
════════════════════════════════════════
Identify the closest Google Font:
- Very tall loops, flowing calligraphy → "Great Vibes"
- Round medium calligraphy → "Alex Brush" or "Parisienne"
- Thin light script → "Allura"
- Bold calligraphy → "Pinyon Script"
- Modern handwriting → "Dancing Script"
- Classic elegant serif → "Cormorant Garamond"
- Modern bold serif → "Playfair Display"
- Hebrew → "Noto Serif Hebrew"

════════════════════════════════════════
font_family rules
════════════════════════════════════════
Names (bride/groom) → "cursive"
Hebrew/religious    → "hebrew"
ALL other text      → "serif" (never "cursive" for body text)

════════════════════════════════════════
Return format
════════════════════════════════════════
{
  "bg_color": "#ffffff",
  "background_is_white": true,
  "overlays": [
    {
      "id": "bride_full_name",
      "label": "Prénom et nom mariée",
      "original_text": "Bat Sheva Cohen",
      "text": "Bat Sheva Cohen",
      "font_match": "Great Vibes",
      "source_box": { "x_pct": 8, "y_pct": 37, "width_pct": 28, "height_pct": 22 },
      "render_box": { "x_pct": 5, "y_pct": 35, "width_pct": 34, "height_pct": 26 },
      "font_size_pct": 5.5,
      "font_family": "cursive",
      "font_weight": "400",
      "color": "#6b7280",
      "text_align": "center",
      "line_height": 1.45,
      "uppercase": false
    }
  ]
}

Detectable IDs:
bride_first_name, bride_last_name, bride_full_name,
groom_first_name, groom_last_name, groom_full_name,
bride_parents, groom_parents, religious_text,
main_invitation, subtitle, weekday, date_full, date_short,
ceremony_time, reception_time, venue_name,
address_line_1, address_line_2, city, country,
rsvp, rsvp_phone, dress_code, custom_note, website

REPLY WITH ONLY THE RAW JSON. NOTHING ELSE.
`;

type AnthropicResp = { content?: Array<{ type?: string; text?: string }> };

export async function analyzeWeddingCardWithClaude(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
): Promise<WeddingCardAnalysisResponse> {
  const resp = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });
  if (!resp.ok) throw new Error(`Erreur API Claude ${resp.status}`);
  const json = await resp.json() as AnthropicResp;
  const raw = (json.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('').trim();
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Réponse JSON Claude invalide');
  const parsed = JSON.parse(raw.slice(start, end + 1)) as {
    bg_color?: string; background_is_white?: boolean; overlays?: unknown[];
  };
  const result: WeddingCardAnalysisResponse = {
    bg_color: parsed.bg_color || '#ffffff',
    background_is_white: Boolean(parsed.background_is_white ?? true),
    overlays: (parsed.overlays || []).map(normalizeOverlay).filter(Boolean) as WeddingOverlay[],
  };
  return sanitizeWeddingCardResponse(result);
}

export const analyzeWeddingCard = analyzeWeddingCardWithClaude;

export function applyClientDataToOverlays(
  overlays: WeddingOverlay[],
  clientData: WeddingClientData,
): WeddingOverlay[] {
  return overlays.map(ov => ({
    ...ov,
    original_text: (ov.original_text || ov.text || '').trim(),
    new_text: (clientData[ov.id] || '').trim() || undefined,
    text: (clientData[ov.id] || '').trim() || ov.original_text || ov.text || '',
  }));
}

function normalizeOverlay(item: unknown, index: number): WeddingOverlay | null {
  const r = (item || {}) as Record<string, unknown>;
  const id = String(r.id || '').trim();
  if (!isWeddingFieldId(id)) return null;
  return {
    id,
    label: String(r.label || id),
    text: String(r.text || r.original_text || ''),
    original_text: String(r.original_text || r.text || ''),
    new_text: undefined,
    x_pct:         pct(r.x_pct, 10),
    y_pct:         pct(r.y_pct, 10),
    width_pct:     pct(r.width_pct, id.includes('name') ? 28 : 58),
    height_pct:    pct(r.height_pct, id.includes('name') ? 16 : 8),
    source_box:    normBox(r.source_box, r, 'source'),
    render_box:    normBox(r.render_box,  r, 'render'),
    font_size_pct: pct(r.font_size_pct, id.includes('name') ? 5.2 : 3.4),
    font_family:   normFF(r.font_family, id),
    font_match:    typeof r.font_match === 'string' && r.font_match.trim().length > 2 ? r.font_match.trim() : undefined,
    font_weight:   normFW(r.font_weight),
    color:         normColor(r.color, '#6b7280'),
    bg_color:      normColor(r.bg_color, '#ffffff'),
    text_align:    normAlign(r.text_align),
    line_height:   clamp(Number(r.line_height) || (id.includes('name') ? 1.45 : 1.25), 0.8, 2),
    letter_spacing:clamp(Number(r.letter_spacing) || 0, -1, 3),
    uppercase:     Boolean(r.uppercase),
  };
}

function normBox(raw: unknown, fb: Record<string, unknown>, type: 'source'|'render') {
  const b  = (raw || {}) as Record<string, unknown>;
  const fb2= (type === 'source' ? fb.source_box : fb.render_box) as Record<string, unknown> || {};
  return {
    x_pct:      pct(b.x_pct,      pct(fb2.x_pct ?? fb.x_pct, 10)),
    y_pct:      pct(b.y_pct,      pct(fb2.y_pct ?? fb.y_pct, 10)),
    width_pct:  pct(b.width_pct,  pct(fb2.width_pct ?? fb.width_pct, 28)),
    height_pct: pct(b.height_pct, pct(fb2.height_pct ?? fb.height_pct, 14)),
  };
}

function pct(v: unknown, fallback: number): number {
  const n = Number(v); return (isNaN(n) ? fallback : Math.max(0, Math.min(100, n)));
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function normFF(v: unknown, id: string): WeddingOverlay['font_family'] {
  const s = String(v || '').trim();
  if (s === 'cursive' || s === 'serif' || s === 'sans-serif' || s === 'hebrew') return s;
  if (id.includes('religious')) return 'hebrew';
  if (id.includes('bride') || id.includes('groom')) return 'cursive';
  return 'serif';
}
function normFW(v: unknown): string {
  const s = String(v || '400');
  return ['300','400','500','600','700','800'].includes(s) ? s : '400';
}
function normAlign(v: unknown): WeddingOverlay['text_align'] {
  const s = String(v || 'center');
  return s === 'left' || s === 'right' ? s : 'center';
}
function normColor(v: unknown, fallback: string): string {
  const s = String(v || fallback);
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}
function isWeddingFieldId(id: string): id is WeddingFieldId {
  return ['bride_first_name','bride_last_name','bride_full_name',
    'groom_first_name','groom_last_name','groom_full_name',
    'bride_parents','groom_parents','religious_text',
    'main_invitation','subtitle','weekday','date_full','date_short',
    'ceremony_time','reception_time','venue_name',
    'address_line_1','address_line_2','city','country',
    'rsvp','rsvp_phone','dress_code','custom_note','website',
  ].includes(id);
}
