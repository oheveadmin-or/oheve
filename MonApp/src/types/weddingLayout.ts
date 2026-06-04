export type TextAlign = 'left' | 'center' | 'right';

export type Category =
  | 'names'
  | 'date'
  | 'location'
  | 'time'
  | 'religious'
  | 'subtitle'
  | 'address'
  | 'other';

export type Overlay = {
  id: string;
  label: string;
  category: Category;
  role?: string;
  text: string;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  font_size_pct: number;
  font_family: 'serif' | 'sans-serif' | 'cursive' | 'monospace';
  font_weight: string;
  color: string;
  bg_color: string;
  text_align: TextAlign;
  italic?: boolean;
  render_mode?: 'tight_text' | 'line_safe' | 'skip_erase';
  preserve_center?: boolean;
};

export type ClaudeLayoutResponse = {
  bg_color?: string;
  overlays: Overlay[];
};

export type WeddingClientData = {
  bride_name?: string;
  groom_name?: string;
  religious_text?: string;
  main_invitation?: string;
  date?: string;
  time?: string;
  location?: string;
  address?: string;
  customTexts?: Record<string, string>;
};
