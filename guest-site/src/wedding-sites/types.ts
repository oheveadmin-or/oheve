import type { ComponentType } from 'react';

import type { RSVPForm } from '../rsvp/types';

export type SiteLanguage = 'fr' | 'he' | 'en';

export type ThemeStyle =
  | 'classic'
  | 'luxury'
  | 'modern'
  | 'romantic'
  | 'minimal'
  | 'floral'
  | 'oriental'
  | 'royal'
  | 'provence'
  | 'sephardic'
  | 'minimal-white'
  | 'english-garden'
  | 'mediterranean'
  | 'tel-aviv'
  | 'marrakech'
  | 'parisian'
  | 'art-deco'
  | 'garden-party'
  | 'desert-sunset'
  | 'navy-gold'
  | 'boho'
  | 'black-tie'
  | 'rustic-chic'
  | 'celestial'
  | 'tropical'
  | 'vintage-rose'
  | 'emerald-luxury'
  | 'nordic-minimal'
  | 'gold-leaf'
  | 'cherry-blossom'
  | 'dark-romance'
  | 'ivory-lace'
  | 'midnight-blue';

export type TitleSize = 'small' | 'medium' | 'large' | 'huge';

export type ThemeAmbiance = 'sobre' | 'chic' | 'festif' | 'religieux' | 'moderne';

export type CardStyle = 'glass' | 'solid' | 'outline' | 'shadow';

export type ThemeLayout = 'centered' | 'split' | 'hero' | 'magazine';

export type WeddingTheme = {
  style: ThemeStyle;
  /** Ambiance guides template selection & density; persisted with the site */
  ambiance: ThemeAmbiance;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  titleSize: TitleSize;
  borderRadius: number;
  cardStyle: CardStyle;
  layout: ThemeLayout;
};

export type WeddingSections = {
  hero: boolean;
  program: boolean;
  location: boolean;
  accommodations: boolean;
  rsvp: boolean;
  faq: boolean;
  gallery: boolean;
  practicalInfo: boolean;
  guestMessage: boolean;
  dressCode: boolean;
};

export type VenueInfo = {
  name: string;
  address: string;
  googleMapsUrl: string;
  wazeUrl: string;
  photoUrl: string;
  description: string;
};

export type AccommodationItem = {
  id: string;
  name: string;
  address: string;
  distanceOrDuration: string;
  googleMapsUrl: string;
  bookingUrl: string;
};

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

export type DressCodeConfig = {
  text: string;
  colors: string[];
};

export type WeddingNarrativeTexts = {
  memorialText?: string;
  familyText?: string;
};

export type WeddingSiteContent = {
  venue?: VenueInfo;
  accommodationsIntro?: string;
  accommodations?: AccommodationItem[];
  faq?: FAQItem[];
  texts?: WeddingNarrativeTexts;
  musicUrl?: string;
  dressCode?: DressCodeConfig;
};

export type InviteLink = {
  id: string;
  label: string;
  /** Event IDs from RSVPForm.events that this link unlocks (empty = all) */
  eventIds: string[];
  token: string;
};

/** Full persisted model — align API/Supabase columns to this shape */
export type WeddingSite = {
  id: string;
  slug: string;
  coupleName: string;
  groomName: string;
  brideName: string;
  /** ISO 8601 instants (includes time); never render raw — use formatWeddingDate */
  date: string;
  /** Redundant HH:mm for forms/APIs that split date/time; optional if fully in `date` */
  time: string;
  city: string;
  venue: string;
  welcomeText: string;
  mainText: string;
  language: SiteLanguage;
  theme: WeddingTheme;
  sections: WeddingSections;
  content?: WeddingSiteContent;
  /** Config RSVP dynamique publiée avec le mini-site (localStorage démo puis Supabase) */
  rsvpForm?: RSVPForm;
  /** Liens d'invitation segmentés par événement */
  inviteLinks?: InviteLink[];
  createdAt: string;
  updatedAt: string;
};

export type WeddingTemplateProps = {
  site: WeddingSite;
};

export type WeddingTemplateComponent = ComponentType<WeddingTemplateProps>;

export type StyleQuizAnswers = {
  solemnOrLuxury: 'sober' | 'luxury';
  modernOrRomantic: 'modern' | 'romantic';
  lightOrDark: 'light' | 'dark';
  scriptOrSimple: 'elegant' | 'simple';
  infoOrMinimal: 'rich' | 'minimal';
  culture: 'french' | 'israeli' | 'oriental' | 'international';
  heroMood: 'editorial' | 'warm' | 'cinematic';
  paletteFamily: 'neutral' | 'gold' | 'pastel' | 'terracotta';
  cardVisual: 'clean' | 'depth' | 'glass';
  rhythm: 'calm' | 'balanced' | 'celebration';
  photoTreatment: 'light' | 'moody' | 'vintage';
  ctaTone: 'discreet' | 'bold';
  storyDensity: 'short' | 'full';
  eventFormat: 'single-day' | 'multi-day';
  rtlSupport: 'auto' | 'force-hebrew';
};

export const defaultWeddingSections = (): WeddingSections => ({
  hero: true,
  program: true,
  location: true,
  accommodations: true,
  rsvp: true,
  faq: true,
  gallery: false,
  practicalInfo: true,
  guestMessage: true,
  dressCode: true,
});

export const defaultWeddingTheme = (): WeddingTheme => ({
  style: 'classic',
  ambiance: 'chic',
  primaryColor: '#5b4636',
  secondaryColor: '#c9a962',
  backgroundColor: '#faf7f2',
  textColor: '#2c241c',
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  titleSize: 'large',
  borderRadius: 12,
  cardStyle: 'shadow',
  layout: 'centered',
});
