import type { ClaudeLayoutResponse, Overlay } from '@/src/types/weddingLayout';

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function isNearWhite(color: string | undefined): boolean {
  if (!color) return false;
  const m = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return false;
  const hex = m[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r >= 232 && g >= 232 && b >= 232;
}

export function clampOverlay(overlay: Overlay): Overlay {
  const next = { ...overlay };
  next.x_pct = clamp(next.x_pct, 0, 98);
  next.y_pct = clamp(next.y_pct, 0, 98);
  next.width_pct = clamp(next.width_pct, 3, 90);
  next.height_pct = clamp(next.height_pct, 3, 30);
  next.font_size_pct = clamp(next.font_size_pct, 1.2, 8);
  return next;
}

export function preventNameOverlap(overlays: Overlay[]): Overlay[] {
  const bride = overlays.find((ov) => ov.id === 'bride_name');
  const groom = overlays.find((ov) => ov.id === 'groom_name');
  if (!bride || !groom) return overlays;

  const brideRight = bride.x_pct + bride.width_pct;
  const groomLeft = groom.x_pct;
  const minGap = 12;
  if (groomLeft - brideRight >= minGap) return overlays;

  const targetBrideRight = Math.max(6, 50 - minGap / 2);
  const targetGroomLeft = Math.min(94, 50 + minGap / 2);

  const patched = overlays.map((ov) => ({ ...ov }));
  const b = patched.find((ov) => ov.id === 'bride_name');
  const g = patched.find((ov) => ov.id === 'groom_name');
  if (!b || !g) return patched;

  b.width_pct = Math.min(b.width_pct, Math.max(18, targetBrideRight - b.x_pct));
  if (b.x_pct + b.width_pct > targetBrideRight) {
    b.x_pct = Math.max(6, targetBrideRight - b.width_pct);
  }

  g.x_pct = Math.max(g.x_pct, targetGroomLeft);
  g.width_pct = Math.min(g.width_pct, 34);
  if (g.x_pct + g.width_pct > 95) {
    g.x_pct = Math.max(targetGroomLeft, 95 - g.width_pct);
  }

  return patched;
}

export function forceWeddingCardStructure(overlays: Overlay[]): Overlay[] {
  return overlays.map((ov) => {
    const next = { ...ov };

    if (next.id === 'bride_name') {
      next.x_pct = clamp(next.x_pct, 6, 32);
      next.width_pct = Math.min(next.width_pct, 34);
      next.height_pct = Math.min(next.height_pct, 18);
      next.text_align = 'center';
      next.font_family = 'cursive';
      next.bg_color = '#ffffff';
      next.category = 'names';
      next.role = 'bride_name';
      next.render_mode = 'tight_text';
      next.preserve_center = true;
    }

    if (next.id === 'groom_name') {
      next.x_pct = clamp(next.x_pct, 60, 72);
      next.width_pct = Math.min(next.width_pct, 34);
      next.height_pct = Math.min(next.height_pct, 18);
      next.text_align = 'center';
      next.font_family = 'cursive';
      next.bg_color = '#ffffff';
      next.category = 'names';
      next.role = 'groom_name';
      next.render_mode = 'tight_text';
      next.preserve_center = true;
    }

    if (['main_invitation', 'date', 'location', 'address', 'time'].includes(next.id)) {
      next.x_pct = 15;
      next.width_pct = 70;
      next.text_align = 'center';
      next.font_family = 'serif';
      next.category =
        next.id === 'main_invitation'
          ? 'subtitle'
          : next.id === 'time'
            ? 'time'
            : (next.id as Overlay['category']);
      next.bg_color = '#ffffff';
      next.role = next.id;
      next.render_mode = 'line_safe';
      next.preserve_center = true;
    }

    next.height_pct = Math.min(next.height_pct, next.font_family === 'cursive' ? 18 : 10);
    next.color = next.color || '#6b7280';
    next.width_pct = Math.min(next.width_pct, next.category === 'names' ? 35 : 80);

    // Prevent accidental decoration wipe around center flourish.
    const rightEdge = next.x_pct + next.width_pct;
    const intersectsCenter = rightEdge > 44 && next.x_pct < 56;
    if (next.category === 'names' && intersectsCenter) {
      if (next.id === 'bride_name') {
        next.width_pct = Math.min(next.width_pct, Math.max(18, 42 - next.x_pct));
      } else if (next.id === 'groom_name') {
        const minStart = 58;
        next.x_pct = Math.max(next.x_pct, minStart);
      }
    }

    return clampOverlay(next);
  });
}

export function sanitizeFinalLayout(input: ClaudeLayoutResponse | Overlay[]): ClaudeLayoutResponse {
  const layout: ClaudeLayoutResponse = Array.isArray(input)
    ? { bg_color: '#ffffff', overlays: input }
    : input;

  const filtered = layout.overlays.filter((ov) => ov.width_pct <= 60 && ov.height_pct <= 30);
  const structured = forceWeddingCardStructure(filtered).map((ov) => {
    const next = { ...ov };
    if (next.id === 'bride_name') next.x_pct = clamp(next.x_pct, 6, 32);
    if (next.id === 'groom_name') next.x_pct = clamp(next.x_pct, 60, 72);
    return next;
  });
  const nonOverlap = preventNameOverlap(structured);
  const bg = isNearWhite(layout.bg_color) ? '#ffffff' : layout.bg_color || '#ffffff';
  const overlays = nonOverlap.map((ov) => ({
    ...ov,
    bg_color: isNearWhite(ov.bg_color) ? '#ffffff' : ov.bg_color || bg || '#ffffff',
    preserve_center: ov.preserve_center ?? true,
  }));
  return { bg_color: bg, overlays };
}
