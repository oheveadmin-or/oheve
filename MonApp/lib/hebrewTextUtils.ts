const HEBREW_REGEX = /[\u0590-\u05FF]/;
const LATIN_OR_DIGIT_REGEX = /[A-Za-z0-9]/;

export function containsHebrew(text: string) {
  return HEBREW_REGEX.test(text);
}

export function reverseRTLIfNeeded(text: string) {
  if (!containsHebrew(text)) return text;
  if (LATIN_OR_DIGIT_REGEX.test(text)) return text;
  return [...text].reverse().join('');
}

export function prepareRTLText(text: string) {
  if (!containsHebrew(text)) return text.trim();
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return reverseRTLIfNeeded(cleaned);
}

export function prepareMixedDirectionText(text: string) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (!containsHebrew(trimmed)) return trimmed;
      if (!LATIN_OR_DIGIT_REGEX.test(trimmed)) return prepareRTLText(trimmed);
      return trimmed;
    })
    .join('\n');
}

export function chooseFontPairByTemplateStyle(styleMode: string) {
  if (styleMode === 'modern_luxury') {
    return { latinTitle: 'Helvetica-Bold', latinBody: 'Helvetica', hebrew: 'Alef-Regular' };
  }
  if (styleMode === 'floral_romantic') {
    return { latinTitle: 'Times-BoldItalic', latinBody: 'Times-Roman', hebrew: 'Alef-Regular' };
  }
  if (styleMode === 'hebrew_elegant_bilingual') {
    return { latinTitle: 'Times-Bold', latinBody: 'Helvetica', hebrew: 'Alef-Regular' };
  }
  return { latinTitle: 'Times-Bold', latinBody: 'Times-Roman', hebrew: 'Alef-Regular' };
}
