import type { StyleQuizAnswers, WeddingSections, WeddingTheme } from '../types';
import { defaultWeddingSections, defaultWeddingTheme } from '../types';

function titleSizeFrom(scriptOrSimple: StyleQuizAnswers['scriptOrSimple']): WeddingTheme['titleSize'] {
  return scriptOrSimple === 'elegant' ? 'huge' : 'medium';
}

function sectionsFrom(
  infoOrMinimal: StyleQuizAnswers['infoOrMinimal'],
  storyDensity: StyleQuizAnswers['storyDensity'],
  eventFormat: StyleQuizAnswers['eventFormat']
): WeddingSections {
  const base = defaultWeddingSections();
  const minimalMode = infoOrMinimal === 'minimal' || storyDensity === 'short';

  if (minimalMode) {
    return {
      ...base,
      program: eventFormat === 'multi-day',
      gallery: false,
      practicalInfo: false,
      guestMessage: true,
    };
  }

  if (eventFormat === 'multi-day') {
    return {
      ...base,
      gallery: true,
      practicalInfo: true,
    };
  }

  return base;
}

/**
 * Construit un `WeddingTheme` + sections à partir des réponses du quiz guidé.
 */
export function buildThemeFromQuizAnswers(answers: StyleQuizAnswers): {
  theme: WeddingTheme;
  sections: WeddingSections;
  languageHint: 'fr' | 'he' | 'en';
} {
  const t = defaultWeddingTheme();

  if (answers.solemnOrLuxury === 'luxury') {
    t.style = 'luxury';
    t.ambiance = 'chic';
    t.backgroundColor = '#0f0f12';
    t.textColor = '#f5f0e6';
    t.primaryColor = '#d4af37';
    t.secondaryColor = '#8b7355';
    t.cardStyle = 'glass';
    t.layout = 'hero';
  } else {
    t.style = 'minimal';
    t.ambiance = 'sobre';
    t.backgroundColor = '#fafafa';
    t.textColor = '#1a1a1a';
    t.primaryColor = '#333333';
    t.secondaryColor = '#888888';
    t.cardStyle = 'outline';
    t.layout = 'centered';
  }

  if (answers.modernOrRomantic === 'romantic') {
    t.style = answers.solemnOrLuxury === 'luxury' ? 'romantic' : 'floral';
    t.primaryColor = '#a8557a';
    t.secondaryColor = '#f9d5e5';
    t.backgroundColor = answers.lightOrDark === 'dark' ? '#2a1f24' : '#fff5f8';
    t.textColor = answers.lightOrDark === 'dark' ? '#fce7f0' : '#4a3040';
    t.ambiance = 'festif';
  } else if (answers.modernOrRomantic === 'modern') {
    t.style = 'modern';
    t.fontFamily = "'Inter', system-ui, sans-serif";
    t.cardStyle = 'solid';
    t.layout = 'split';
    t.ambiance = 'moderne';
  }

  if (answers.lightOrDark === 'dark' && answers.solemnOrLuxury === 'luxury') {
    t.backgroundColor = '#121016';
    t.textColor = '#eee8dc';
  } else if (answers.lightOrDark === 'light' && t.style !== 'luxury') {
    t.backgroundColor = '#fdfcfa';
    t.textColor = '#2c2825';
  }

  if (answers.culture === 'oriental') {
    t.style = 'oriental';
    t.primaryColor = '#b8860b';
    t.secondaryColor = '#2c1810';
    t.backgroundColor = answers.lightOrDark === 'dark' ? '#1a120d' : '#faf6f0';
    t.textColor = answers.lightOrDark === 'dark' ? '#f5ebe0' : '#3d2914';
    t.layout = 'magazine';
    t.ambiance = 'chic';
  } else if (answers.culture === 'israeli') {
    t.fontFamily = "'Heebo', 'Segoe UI', sans-serif";
  } else if (answers.culture === 'french') {
    t.fontFamily = "'Playfair Display', Georgia, serif";
    t.style = t.style === 'modern' ? 'classic' : t.style;
  }

  if (answers.solemnOrLuxury === 'sober' && answers.culture === 'international') {
    t.layout = 'centered';
  }

  if (answers.paletteFamily === 'gold') {
    t.primaryColor = '#caa24a';
    t.secondaryColor = '#2b2418';
  } else if (answers.paletteFamily === 'pastel') {
    t.primaryColor = '#bf6f93';
    t.secondaryColor = '#f4dbe6';
  } else if (answers.paletteFamily === 'terracotta') {
    t.primaryColor = '#b2603d';
    t.secondaryColor = '#f1d4bf';
  } else if (answers.paletteFamily === 'neutral') {
    t.primaryColor = '#3d342d';
    t.secondaryColor = '#d8c8b6';
  }

  if (answers.heroMood === 'cinematic') {
    t.layout = 'hero';
    t.ambiance = 'festif';
    if (answers.lightOrDark === 'light') {
      t.backgroundColor = '#f4efe8';
      t.textColor = '#2b221b';
    }
  } else if (answers.heroMood === 'warm') {
    t.layout = 'centered';
    if (answers.paletteFamily === 'neutral') {
      t.backgroundColor = '#fbf5ef';
      t.textColor = '#3a3028';
    }
  } else if (answers.heroMood === 'editorial') {
    t.layout = answers.modernOrRomantic === 'modern' ? 'split' : 'magazine';
  }

  if (answers.cardVisual === 'glass') {
    t.cardStyle = 'glass';
  } else if (answers.cardVisual === 'depth') {
    t.cardStyle = 'shadow';
  } else {
    t.cardStyle = 'outline';
  }

  if (answers.rhythm === 'celebration') {
    t.ambiance = 'festif';
    t.layout = 'hero';
  } else if (answers.rhythm === 'calm') {
    t.ambiance = 'sobre';
    if (t.layout === 'hero') t.layout = 'centered';
  }

  if (answers.photoTreatment === 'moody') {
    t.backgroundColor = '#19161d';
    t.textColor = '#efeaf7';
    if (answers.paletteFamily === 'gold') {
      t.primaryColor = '#d4af37';
    }
  } else if (answers.photoTreatment === 'vintage') {
    t.backgroundColor = '#f6efe6';
    t.textColor = '#4b3a2e';
  }

  if (answers.ctaTone === 'bold') {
    t.titleSize = 'huge';
    t.secondaryColor = answers.lightOrDark === 'dark' ? '#ffcf66' : '#e9b445';
  }

  t.titleSize = titleSizeFrom(answers.scriptOrSimple);
  if (answers.ctaTone === 'bold' && answers.scriptOrSimple === 'simple') {
    t.titleSize = 'large';
  }
  t.borderRadius = t.style === 'romantic' || t.style === 'floral' ? 22 : t.style === 'modern' ? 8 : 14;

  const lang =
    answers.rtlSupport === 'force-hebrew'
      ? 'he'
      : answers.culture === 'israeli'
        ? 'he'
        : answers.culture === 'international'
          ? 'en'
          : 'fr';

  return {
    theme: t,
    sections: sectionsFrom(answers.infoOrMinimal, answers.storyDensity, answers.eventFormat),
    languageHint: lang,
  };
}
