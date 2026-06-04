import type { ClaudeLayoutResponse, Overlay, WeddingClientData } from '@/src/types/weddingLayout';
import { sanitizeFinalLayout } from '@/src/utils/weddingLayoutSanitizer';

const API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const DETECTION_PROMPT = `
You are a wedding invitation layout detection engine.

Return ONLY valid JSON.
Never return markdown.
Never explain.

Goal:
Detect only editable text zones.
Do not redesign the card.

Detect:
- bride_name
- groom_name
- religious_text
- main_invitation
- date
- time
- location
- address

Never detect:
- ornaments
- flourishes
- swirls
- lines
- decorative separators
- the center word "et" or "to" if decorative
- decorative center flourish area

Rules:
bride_name must be left side only.
groom_name must be right side only.
Never merge bride and groom names.
Each overlay must include:
- role (bride_name, groom_name, religious_text, main_invitation, date, time, location, address)
- render_mode ("tight_text" for names, "line_safe" for body text)
- preserve_center: true

bride_name:
x_pct between 5 and 40
width_pct max 35
font_family cursive
text_align center

groom_name:
x_pct between 58 and 95
width_pct max 35
font_family cursive
text_align center

All main text must be centered.

If card background is white or near white:
bg_color = "#ffffff"

Return:
{
  "bg_color": "#ffffff",
  "preserve_center": true,
  "overlays": []
}
`;

const LAYOUT_REBUILD_PROMPT = `
You are a premium wedding invitation layout reconstruction engine.

Return ONLY valid JSON.

You receive:
1. original invitation image
2. detected overlays
3. final client text

Your job:
Correct positions and typography so final rendering looks premium and clean.

Do not move decorations.
Do not erase decorations.
Do not place overlays over ornaments.
Do not create wide erase zones.

Rules:
- bride left, groom right
- keep center gap clean
- main invitation text centered
- date centered
- location centered
- address centered
- use elegant typography
- no overlay width above 42%
- names width max 35%
- names height max 18%
- serif text height max 10%
- if background is white, force bg_color "#ffffff"

Return corrected overlays only:
{
  "bg_color": "#ffffff",
  "preserve_center": true,
  "overlays": []
}
`;

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

export function extractJsonFromClaudeResponse(response: AnthropicResponse): ClaudeLayoutResponse {
  const raw = (response.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('')
    .trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Réponse JSON Claude invalide');

  const parsed = JSON.parse(raw.slice(start, end + 1)) as {
    bg_color?: string;
    overlays?: unknown[];
  };

  return {
    bg_color: parsed.bg_color || '#ffffff',
    overlays: (parsed.overlays ?? []).map(normalizeOverlay),
  };
}

export async function callClaudeVision(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
  maxTokens = 2200,
): Promise<AnthropicResponse> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}`);
  }

  return (await response.json()) as AnthropicResponse;
}

export async function detectWeddingLayout(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
): Promise<ClaudeLayoutResponse> {
  const response = await callClaudeVision(apiKey, imageBase64, imageMimeType, DETECTION_PROMPT, 2200);
  const detected = extractJsonFromClaudeResponse(response);
  return sanitizeFinalLayout(detected);
}

export async function rebuildWeddingLayout(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
  detectedLayout: ClaudeLayoutResponse,
  clientData: WeddingClientData,
): Promise<ClaudeLayoutResponse> {
  const payloadPrompt = `${LAYOUT_REBUILD_PROMPT}

DETECTED_LAYOUT_JSON:
${JSON.stringify(detectedLayout, null, 2)}

CLIENT_TEXT_JSON:
${JSON.stringify(clientData, null, 2)}`;

  const response = await callClaudeVision(apiKey, imageBase64, imageMimeType, payloadPrompt, 2600);
  const rebuilt = extractJsonFromClaudeResponse(response);
  const withClientData = rebuilt.overlays.map((ov) => {
    const next = { ...ov };
    if (clientData.customTexts?.[ov.id]) next.text = clientData.customTexts[ov.id] ?? ov.text;
    if (next.id === 'bride_name' || next.id === 'groom_name') {
      next.render_mode = 'tight_text';
      next.preserve_center = true;
    } else {
      next.render_mode = 'line_safe';
      next.preserve_center = true;
    }
    return next;
  });
  return sanitizeFinalLayout({ bg_color: rebuilt.bg_color, overlays: withClientData });
}

function clampPct(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : Math.max(0, Math.min(100, n));
}

function normalizeOverlay(item: unknown, index: number): Overlay {
  const v = item as Record<string, unknown>;
  const id = String(v.id || `overlay_${index + 1}`);
  const category = sanitizeCategory(v.category, id);
  return {
    id,
    label: String(v.label || id),
    category,
    role: String(v.role || id),
    text: String(v.text || ''),
    x_pct: clampPct(v.x_pct, 10),
    y_pct: clampPct(v.y_pct, 10),
    width_pct: clampPct(v.width_pct, 28),
    height_pct: clampPct(v.height_pct, 10),
    font_size_pct: clampPct(v.font_size_pct, 3.6),
    font_family: sanitizeFontFamily(v.font_family, id),
    font_weight: sanitizeFontWeight(v.font_weight),
    color: sanitizeColor(v.color, '#6b7280'),
    bg_color: sanitizeColor(v.bg_color, '#ffffff'),
    text_align: sanitizeAlign(v.text_align),
    italic: Boolean(v.italic),
    render_mode: sanitizeRenderMode(v.render_mode),
    preserve_center: Boolean(v.preserve_center ?? true),
  };
}

function sanitizeCategory(v: unknown, id: string): Overlay['category'] {
  const s = String(v || '').trim();
  const allowed: Overlay['category'][] = ['names', 'date', 'location', 'time', 'religious', 'subtitle', 'address', 'other'];
  if (allowed.includes(s as Overlay['category'])) return s as Overlay['category'];
  if (id.includes('bride') || id.includes('groom')) return 'names';
  if (id.includes('religious')) return 'religious';
  return 'other';
}

function sanitizeAlign(v: unknown): Overlay['text_align'] {
  const s = String(v || 'center');
  return s === 'left' || s === 'right' || s === 'center' ? s : 'center';
}

function sanitizeFontFamily(v: unknown, id: string): Overlay['font_family'] {
  const s = String(v || '').trim();
  if (s === 'serif' || s === 'sans-serif' || s === 'cursive' || s === 'monospace') return s;
  if (id.includes('bride') || id.includes('groom')) return 'cursive';
  return 'serif';
}

function sanitizeFontWeight(v: unknown): string {
  const s = String(v || '400');
  return ['300', '400', '500', '600', '700', '800'].includes(s) ? s : '400';
}

function sanitizeColor(v: unknown, fallback: string): string {
  const s = String(v || fallback);
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

function sanitizeRenderMode(v: unknown): Overlay['render_mode'] {
  const s = String(v || 'tight_text');
  return s === 'tight_text' || s === 'line_safe' || s === 'skip_erase' ? s : 'tight_text';
}
