import type { WeddingCardAnalysisResponse, WeddingFieldId, WeddingOverlay } from '@/src/types/weddingCard';

const CENTERED: WeddingFieldId[] = [
  'main_invitation','subtitle','weekday','date_full','date_short',
  'venue_name','address_line_1','address_line_2','city','country','rsvp',
];
const BRIDE = new Set<WeddingFieldId>(['bride_first_name','bride_last_name','bride_full_name','bride_parents']);
const GROOM = new Set<WeddingFieldId>(['groom_first_name','groom_last_name','groom_full_name','groom_parents']);

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, isNaN(v) ? min : v)); }
function isWhite(c?: string) {
  if (!c) return false;
  const m = c.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return false;
  const r = parseInt(m[1].slice(0,2),16), g = parseInt(m[1].slice(2,4),16), b = parseInt(m[1].slice(4,6),16);
  return r>=228 && g>=228 && b>=228;
}
function col(v?: string, fb = '#ffffff') { return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb; }
function w(v: string) { return ['300','400','500','600','700','800'].includes(v) ? v : '400'; }

function sanitizeBox(
  box: WeddingOverlay['source_box'] | undefined,
  ov: WeddingOverlay,
  id: WeddingFieldId,
): NonNullable<WeddingOverlay['source_box']> {
  const x = clamp(box?.x_pct ?? ov.x_pct, 0, 98);
  const y = clamp(box?.y_pct ?? ov.y_pct, 0, 98);
  const wi= clamp(box?.width_pct ?? ov.width_pct, 2, 90);
  const h = clamp(box?.height_pct ?? ov.height_pct, 2, 30);
  if (BRIDE.has(id)) return { x_pct: clamp(x,4,40), y_pct: y, width_pct: Math.min(wi,36), height_pct: Math.min(h,26) };
  if (GROOM.has(id)) return { x_pct: clamp(x,55,74), y_pct: y, width_pct: Math.min(wi,36), height_pct: Math.min(h,26) };
  if (CENTERED.includes(id)) return { x_pct: clamp(x,8,22), y_pct: y, width_pct: Math.min(Math.max(wi,55),80), height_pct: Math.min(h,12) };
  return { x_pct: x, y_pct: y, width_pct: wi, height_pct: h };
}

export function sanitizeFinalWeddingLayout(overlays: WeddingOverlay[]): WeddingOverlay[] {
  return overlays.filter(Boolean).filter(ov => ov.width_pct <= 80).map(ov => {
    const o: WeddingOverlay = { ...ov };

    if (BRIDE.has(o.id)) {
      o.x_pct      = clamp(o.x_pct, 4, 40);
      o.width_pct  = Math.min(o.width_pct, 36);
      o.height_pct = clamp(o.height_pct, 10, 26);
      o.text_align = 'center'; o.font_family = 'cursive'; o.bg_color = '#ffffff';
    }
    if (GROOM.has(o.id)) {
      o.x_pct      = clamp(o.x_pct, 55, 74);
      o.width_pct  = Math.min(o.width_pct, 36);
      o.height_pct = clamp(o.height_pct, 10, 26);
      o.text_align = 'center'; o.font_family = 'cursive'; o.bg_color = '#ffffff';
    }
    if (CENTERED.includes(o.id)) {
      o.x_pct      = clamp(o.x_pct, 8, 22);
      o.width_pct  = Math.min(Math.max(o.width_pct, 55), 80);
      o.height_pct = clamp(o.height_pct, 4, 12);
      o.text_align = 'center';
      o.font_family= o.font_family === 'hebrew' ? 'hebrew' : 'serif';
      o.bg_color   = '#ffffff';
    }
    if (o.id === 'religious_text') {
      o.height_pct = clamp(o.height_pct, 4, 10);
      // Si y_pct trop petit = hors carte → corriger
      if (o.y_pct < 8) o.y_pct = 10;
    }
    o.color        = o.color || '#6b7280';
    o.font_weight  = w(o.font_weight);
    o.line_height  = clamp(o.line_height ?? (o.font_family === 'cursive' ? 1.45 : 1.25), 0.8, 2);
    o.letter_spacing= clamp(o.letter_spacing ?? 0, -1, 3);
    o.y_pct        = clamp(o.y_pct, 0, 98);
    o.font_size_pct= clamp(o.font_size_pct, 1.2, 9.0);
    o.font_match   = typeof ov.font_match === 'string' && ov.font_match.trim().length > 2 ? ov.font_match.trim() : undefined;
    o.original_text= String(o.original_text ?? o.text ?? '');
    o.new_text     = typeof o.new_text === 'string' && o.new_text.trim() ? o.new_text.trim() : undefined;
    o.source_box   = sanitizeBox(o.source_box, o, o.id);
    o.render_box   = sanitizeBox(o.render_box,  o, o.id);
    return o;
  });
}

export function sanitizeWeddingCardResponse(input: WeddingCardAnalysisResponse): WeddingCardAnalysisResponse {
  const bgWhite = isWhite(input.bg_color) || input.background_is_white;
  return {
    bg_color: bgWhite ? '#ffffff' : col(input.bg_color, '#ffffff'),
    background_is_white: bgWhite ?? true,
    overlays: sanitizeFinalWeddingLayout(input.overlays || []),
  };
}
