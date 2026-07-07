import type { SiteLanguage } from '../types';
import type { WeddingTemplateComponent } from '../types';
import type { WeddingTheme } from '../types';

import { HebrewElegantTemplate } from '@guest/wedding-sites/templates/HebrewElegantTemplate';
import { UniversalTemplate } from '@guest/wedding-sites/templates/UniversalTemplate';
import { EditorialCardsTemplate } from '@guest/wedding-sites/templates/EditorialCardsTemplate';
import { StripesEditorialTemplate } from '@guest/wedding-sites/templates/StripesEditorialTemplate';
import { VoileIvoireTemplate } from '@guest/wedding-sites/templates/VoileIvoireTemplate';

// Legacy templates — kept for sites created before the UniversalTemplate system
import { ArtDecoTemplate } from '@guest/wedding-sites/templates/ArtDecoTemplate';
import { BohoTemplate } from '@guest/wedding-sites/templates/BohoTemplate';
import { ClassicElegantTemplate } from '@guest/wedding-sites/templates/ClassicElegantTemplate';
import { LuxuryDarkTemplate } from '@guest/wedding-sites/templates/LuxuryDarkTemplate';
import { ModernMinimalTemplate } from '@guest/wedding-sites/templates/ModernMinimalTemplate';
import { OrientalRoyalTemplate } from '@guest/wedding-sites/templates/OrientalRoyalTemplate';
import { RomanticFloralTemplate } from '@guest/wedding-sites/templates/RomanticFloralTemplate';
import { TelAvivTemplate } from '@guest/wedding-sites/templates/TelAvivTemplate';

/**
 * Route a site to its template component.
 *
 * Sites that already have `theme.heroStyle` set are "v2" sites — they use
 * the UniversalTemplate which renders based on the full theme config.
 *
 * Sites without `heroStyle` are legacy sites — we keep their original template
 * for backwards compatibility.
 */
export function getTemplateByTheme(
  theme: WeddingTheme,
  language: SiteLanguage
): WeddingTemplateComponent {
  // Hebrew always uses the dedicated RTL template
  if (language === 'he') return HebrewElegantTemplate;

  // Guard: theme can be null if DB row was created before theme column existed
  if (!theme) return ClassicElegantTemplate;

  // Standalone templates — routed by style id before the heroStyle catch-all
  if (theme.style === 'stripes-editorial') return StripesEditorialTemplate;
  if (theme.style === 'editorial-cards') return EditorialCardsTemplate;
  if (theme.style === 'voile-ivoire') return VoileIvoireTemplate;

  // v2 sites: heroStyle is set → use the new universal template
  if (theme.heroStyle) return UniversalTemplate;

  // v1 legacy routing (unchanged for old sites)
  if (theme.ambiance === 'religieux') return ClassicElegantTemplate;

  switch (theme.style) {
    // Vintage blue always uses UniversalTemplate (handles isVintage check internally)
    case 'vintage-blue':
      return UniversalTemplate;

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
