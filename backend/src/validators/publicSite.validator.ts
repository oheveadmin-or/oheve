export interface CreatePublicSiteInput {
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  phone: string;
  templateId: string;
  customText: string;
  isPublished: boolean;
}

const MAX_LEN = {
  name: 200,
  location: 500,
  phone: 50,
  templateId: 80,
  customText: 5000,
} as const;

function asTrimmedString(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function asBool(v: unknown, defaultValue: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return defaultValue;
}

export function validateCreatePublicSiteBody(body: unknown):
  | { ok: true; value: CreatePublicSiteInput }
  | { ok: false; errors: string[] } {
  if (body == null || typeof body !== 'object') {
    return { ok: false, errors: ['Corps de requête invalide'] };
  }

  const b = body as Record<string, unknown>;
  const brideName = asTrimmedString(b.brideName);
  const groomName = asTrimmedString(b.groomName);
  const weddingDate = asTrimmedString(b.weddingDate);
  const location = asTrimmedString(b.location);
  const phone = asTrimmedString(b.phone);
  const templateId = asTrimmedString(b.templateId);
  const customText = asTrimmedString(b.customText);
  const isPublished = asBool(b.isPublished, false);

  const errors: string[] = [];

  if (!brideName) errors.push('brideName est obligatoire');
  else if (brideName.length > MAX_LEN.name) errors.push('brideName trop long');

  if (!groomName) errors.push('groomName est obligatoire');
  else if (groomName.length > MAX_LEN.name) errors.push('groomName trop long');

  if (!weddingDate) errors.push('weddingDate est obligatoire');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
    errors.push('weddingDate doit être au format YYYY-MM-DD');
  }

  if (location.length > MAX_LEN.location) errors.push('location trop longue');
  if (phone.length > MAX_LEN.phone) errors.push('phone trop long');
  if (templateId.length > MAX_LEN.templateId) errors.push('templateId trop long');
  if (customText.length > MAX_LEN.customText) errors.push('customText trop long');

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      brideName,
      groomName,
      weddingDate,
      location,
      phone,
      templateId,
      customText,
      isPublished,
    },
  };
}
