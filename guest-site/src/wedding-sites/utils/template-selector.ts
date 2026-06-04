import type { SiteLanguage } from '../types';
import type { WeddingTemplateComponent } from '../types';
import type { WeddingTheme } from '../types';

import { ArtDecoTemplate } from '@guest/wedding-sites/templates/ArtDecoTemplate';
import { BohoTemplate } from '@guest/wedding-sites/templates/BohoTemplate';
import { ClassicElegantTemplate } from '@guest/wedding-sites/templates/ClassicElegantTemplate';
import { HebrewElegantTemplate } from '@guest/wedding-sites/templates/HebrewElegantTemplate';
import { LuxuryDarkTemplate } from '@guest/wedding-sites/templates/LuxuryDarkTemplate';
import { ModernMinimalTemplate } from '@guest/wedding-sites/templates/ModernMinimalTemplate';
import { OrientalRoyalTemplate } from '@guest/wedding-sites/templates/OrientalRoyalTemplate';
import { RomanticFloralTemplate } from '@guest/wedding-sites/templates/RomanticFloralTemplate';
import { TelAvivTemplate } from '@guest/wedding-sites/templates/TelAvivTemplate';

export function getTemplateByTheme(
  theme: WeddingTheme,
  language: SiteLanguage
): WeddingTemplateComponent {
  if (language === 'he') return HebrewElegantTemplate;

  if (theme.ambiance === 'religieux') return ClassicElegantTemplate;

  switch (theme.style) {
    case 'luxury':
    case 'celestial':
    case 'dark-romance':
      return LuxuryDarkTemplate;

    case 'art-deco':
    case 'black-tie':
    case 'navy-gold':
    case 'gold-leaf':
    case 'ivory-lace':
    case 'midnight-blue':
    case 'emerald-luxury':
      return ArtDecoTemplate;

    case 'boho':
    case 'rustic-chic':
    case 'garden-party':
    case 'tropical':
    case 'desert-sunset':
    case 'marrakech':
      return BohoTemplate;

    case 'tel-aviv':
    case 'nordic-minimal':
      return TelAvivTemplate;

    case 'romantic':
    case 'floral':
    case 'english-garden':
    case 'parisian':
    case 'vintage-rose':
    case 'cherry-blossom':
      return RomanticFloralTemplate;

    case 'oriental':
    case 'royal':
    case 'sephardic':
      return OrientalRoyalTemplate;

    case 'modern':
    case 'minimal':
    case 'minimal-white':
    case 'mediterranean':
      return ModernMinimalTemplate;

    case 'classic':
    case 'provence':
    default:
      return ClassicElegantTemplate;
  }
}
