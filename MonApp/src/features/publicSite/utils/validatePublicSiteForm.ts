import type { PublicSiteFormValues } from '../types/publicSite.types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  values?: PublicSiteFormValues;
}

export function validatePublicSiteForm(values: PublicSiteFormValues): ValidationResult {
  const errors: string[] = [];

  const brideName = values.brideName.trim();
  const groomName = values.groomName.trim();
  const weddingDate = values.weddingDate.trim();
  const location = values.location.trim();
  const phone = values.phone.trim();
  const templateId = values.templateId.trim();
  const customText = values.customText.trim();

  if (!brideName) errors.push('Le prénom / nom de la mariée est obligatoire');
  if (!groomName) errors.push('Le prénom / nom du marié est obligatoire');
  if (!weddingDate) errors.push('La date du mariage est obligatoire');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
    errors.push('La date doit être au format AAAA-MM-JJ');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    values: {
      brideName,
      groomName,
      weddingDate,
      location,
      phone,
      templateId,
      customText,
      isPublished: values.isPublished,
    },
  };
}
