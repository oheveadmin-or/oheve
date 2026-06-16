import { buildBaseSlugFromNames } from '../utils/createSlug';
import { devReplaceLoopbackPublicBaseUrl } from '../utils/publicUrlDev';
import { CreatePublicSiteInput } from '../validators/publicSite.validator';
import { PublicSitesRepository } from './publicSites.repository';

function joinPublicUrl(base: string, slug: string): string {
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}/${encodeURIComponent(slug)}`;
}

export class PublicSitesService {
  private repo = new PublicSitesRepository();

  getPublicBaseUrl(): string {
    const base = process.env.PUBLIC_SITE_BASE_URL?.trim();
    let resolved: string;
    if (base) {
      resolved = base.replace(/\/+$/, '');
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('PUBLIC_SITE_BASE_URL non configuré sur le serveur');
    } else {
      const lan = process.env.DEV_LAN_HOST?.trim() || '172.20.10.4';
      console.warn(
        `[public-sites] PUBLIC_SITE_BASE_URL absent : fallback http://${lan}:5173 (guest-site en dev, sans TLS).`
      );
      resolved = `http://${lan}:5173`;
    }
    return devReplaceLoopbackPublicBaseUrl(resolved).replace(/\/+$/, '');
  }

  async createForUser(userId: number, input: CreatePublicSiteInput): Promise<{ id: number; slug: string; publicUrl: string }> {
    const baseSlug = buildBaseSlugFromNames(input.brideName, input.groomName);
    let slug = baseSlug;
    let suffix = 1;

    while (await this.repo.slugExists(slug)) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const { id, slug: finalSlug } = await this.repo.insert({
      userId,
      slug,
      brideName: input.brideName,
      groomName: input.groomName,
      weddingDate: input.weddingDate,
      location: input.location,
      phone: input.phone,
      templateId: input.templateId,
      customText: input.customText,
      isPublished: input.isPublished,
    });

    const publicUrl = joinPublicUrl(this.getPublicBaseUrl(), finalSlug);
    return { id, slug: finalSlug, publicUrl };
  }

  getPublishedPayload(slug: string) {
    return this.repo.findPublishedBySlug(slug);
  }

  getByUserId(userId: number) {
    return this.repo.findByUserId(userId);
  }

  async updateSiteConfig(userId: number, slug: string, siteConfig: unknown, inviteLinks: unknown): Promise<void> {
    await this.repo.updateSiteConfig(userId, slug, siteConfig, inviteLinks);
  }
}
