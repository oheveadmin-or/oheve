export type WeddingFieldId =
  | 'bride_first_name'
  | 'bride_last_name'
  | 'bride_full_name'
  | 'groom_first_name'
  | 'groom_last_name'
  | 'groom_full_name'
  | 'bride_parents'
  | 'groom_parents'
  | 'religious_text'
  | 'main_invitation'
  | 'subtitle'
  | 'weekday'
  | 'date_full'
  | 'date_short'
  | 'ceremony_time'
  | 'reception_time'
  | 'venue_name'
  | 'address_line_1'
  | 'address_line_2'
  | 'city'
  | 'country'
  | 'rsvp'
  | 'rsvp_phone'
  | 'dress_code'
  | 'custom_note'
  | 'website';

export type WeddingOverlay = {
  id: WeddingFieldId;
  label: string;
  original_text?: string;
  text: string;
  new_text?: string;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  source_box: {
    x_pct: number;
    y_pct: number;
    width_pct: number;
    height_pct: number;
  };
  render_box: {
    x_pct: number;
    y_pct: number;
    width_pct: number;
    height_pct: number;
  };
  font_size_pct: number;
  font_family: 'cursive' | 'serif' | 'sans-serif' | 'hebrew';
  font_match?: string;
  font_weight: string;
  color: string;
  bg_color: string;
  text_align: 'left' | 'center' | 'right';
  line_height?: number;
  letter_spacing?: number;
  uppercase?: boolean;
};

export type WeddingClientData = Partial<Record<WeddingFieldId, string>>;

export type WeddingCardAnalysisResponse = {
  bg_color: string;
  background_is_white: boolean;
  overlays: WeddingOverlay[];
};

export const WEDDING_FIELD_IDS: WeddingFieldId[] = [
  'bride_first_name',
  'bride_last_name',
  'bride_full_name',
  'groom_first_name',
  'groom_last_name',
  'groom_full_name',
  'bride_parents',
  'groom_parents',
  'religious_text',
  'main_invitation',
  'subtitle',
  'weekday',
  'date_full',
  'date_short',
  'ceremony_time',
  'reception_time',
  'venue_name',
  'address_line_1',
  'address_line_2',
  'city',
  'country',
  'rsvp',
  'rsvp_phone',
  'dress_code',
  'custom_note',
  'website',
];
