import type { WeddingSite } from '../types';

import { defaultWeddingSections, defaultWeddingTheme } from '../types';
import { mergeDateAndTimeToIso } from './date';

export type LegacyPublicPayload = {
  slug: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  templateId: string;
  customText: string;
};

function guessIsoFromWeddingDate(raw: string): string {
  const t = raw?.trim();
  if (!t) return new Date().toISOString();
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return mergeDateAndTimeToIso(t, '12:00');
}

function themeFromTemplateId(templateId: string) {
  const base = defaultWeddingTheme();
  const id = templateId.toLowerCase();
  if (id.includes('lux') || id.includes('gold')) {
    return {
      ...base,
      style: 'luxury' as const,
      backgroundColor: '#0c0c0f',
      textColor: '#f2ecdf',
      primaryColor: '#d4af37',
      secondaryColor: '#8b6914',
      cardStyle: 'glass' as const,
      layout: 'hero' as const,
    };
  }
  if (id.includes('min')) {
    return {
      ...base,
      style: 'minimal' as const,
      fontFamily: "'Inter', system-ui, sans-serif",
      cardStyle: 'outline' as const,
    };
  }
  return base;
}

/** Mappe la réponse actuelle de l’API invité vers le modèle riche `WeddingSite`. */
export function mapLegacyPublicSiteToWeddingSite(p: LegacyPublicPayload): WeddingSite {
  const now = new Date().toISOString();
  return {
    id: `legacy:${p.slug}`,
    slug: p.slug,
    coupleName: `${p.brideName} & ${p.groomName}`,
    groomName: p.groomName,
    brideName: p.brideName,
    date: guessIsoFromWeddingDate(p.weddingDate),
    time: '',
    city: '',
    venue: p.location ?? '',
    welcomeText: '',
    mainText: p.customText ?? '',
    language: 'fr',
    theme: themeFromTemplateId(p.templateId),
    sections: defaultWeddingSections(),
    createdAt: now,
    updatedAt: now,
  };
}
