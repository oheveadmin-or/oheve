export type TableShape = 'round' | 'oval' | 'rect';

export type SeatingTable = {
  id: string;
  name: string;
  shape: TableShape;
  seats: number;
  x: number;
  y: number;
  color: string;
  guestIds: string[];
  tableWidthCm: number;
  tableHeightCm: number;
};

export type Guest = {
  id: string;
  name: string;
  guestCount: number;
};

export type WeddingMeta = {
  coupleName: string;
  weddingTitle: string;
  date: string;
  location: string;
};

export type SeatingPlanData = {
  tables: SeatingTable[];
  guests: Guest[];
  roomWidth?: string;
  roomHeight?: string;
  wedding: WeddingMeta;
};

export type PdfExportType =
  | 'complet'
  | 'panneaux'
  | 'mural'
  | 'cartes'
  | 'marque-places'
  | 'traiteur'
  | 'livre'
  | 'liste';

export type PdfCardStyle = 'classique' | 'moderne' | 'elegant';

export type { PanelTemplateId } from './panel-templates';

export type PdfOptions = {
  cardStyle?: PdfCardStyle;
  expandGuests?: boolean;
  panelTemplate?: import('./panel-templates').PanelTemplateId;
};

export const CARD_STYLES: { value: PdfCardStyle; label: string; desc: string }[] = [
  { value: 'classique', label: 'Classique', desc: 'Blanc · Serif · Sobre' },
  { value: 'elegant', label: 'Élégant', desc: 'Ivoire · Doré · Oheve' },
  { value: 'moderne', label: 'Moderne', desc: 'Minimaliste · Sans-serif' },
];

export const EXPORT_OPTIONS: { type: PdfExportType; label: string; desc: string; icon: string }[] = [
  {
    type: 'panneaux',
    label: 'Cartes panneau ★',
    desc: 'Une page par table — numéro, invités nominatifs. À épingler ou encadrer.',
    icon: 'albums-outline',
  },
  {
    type: 'liste',
    label: 'Liste par table',
    desc: 'Récapitulatif compact en colonnes, tous les invités',
    icon: 'list-outline',
  },
  {
    type: 'complet',
    label: 'PDF Complet',
    desc: 'Couverture + liste + livre des tables (tout en un)',
    icon: 'document-text-outline',
  },
];
