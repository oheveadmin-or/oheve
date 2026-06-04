export interface PublicSiteFormValues {
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  phone: string;
  templateId: string;
  customText: string;
  isPublished: boolean;
}

export interface CreatePublicSitePayload {
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  phone: string;
  templateId: string;
  customText: string;
  isPublished: boolean;
}

export interface CreatePublicSiteResponseData {
  id: number;
  slug: string;
  publicUrl: string;
}

export interface PublicSitePublicPayload {
  slug: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  templateId: string;
  customText: string;
}
