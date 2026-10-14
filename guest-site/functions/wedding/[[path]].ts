/**
 * Cloudflare Pages Function — aperçu de lien des sites de mariage.
 *
 * WhatsApp, iMessage, Messenger… ne lisent pas le JavaScript : sans cette
 * fonction, tout lien /wedding/<slug>?k=… affichait l'aperçu générique Oheve
 * (logo en grand). Ici on récupère le titre/la description du site auprès de
 * l'API puis on réécrit les balises <title> / og:* de index.html : l'aperçu
 * montre les prénoms des mariés, la date, le lieu et une image aux couleurs
 * de leur site.
 *
 * Routes couvertes : /wedding/:slug, /wedding/:slug/rsvp,
 * /wedding/:slug/invite/:token. En cas d'erreur ou de lien sans clé, la page
 * est servie telle quelle (aperçu Oheve par défaut).
 */

interface Env {
  /** Origine de l'API (sans /api). Défaut : API de production Railway. */
  API_BASE_URL?: string;
  ASSETS: { fetch(input: Request | string | URL): Promise<Response> };
}

type Ctx = {
  request: Request;
  env: Env;
  params: { path?: string | string[] };
  next(): Promise<Response>;
};

type Preview = { title: string; description: string; lang?: string; version?: string };

interface RewriterElement {
  setAttribute(name: string, value: string): RewriterElement;
  setInnerContent(content: string): RewriterElement;
  after(content: string, options?: { html: boolean }): RewriterElement;
}
declare class HTMLRewriter {
  on(selector: string, handlers: { element(el: RewriterElement): void }): HTMLRewriter;
  transform(response: Response): Response;
}

const DEFAULT_API = 'https://oheve-production.up.railway.app';

function attr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchPreview(api: string, slug: string, key: string): Promise<Preview | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(
      `${api}/api/wedding-sites/${encodeURIComponent(slug)}/share-preview?k=${encodeURIComponent(key)}`,
      { signal: ctrl.signal, headers: { Accept: 'application/json' } },
    );
    if (!r.ok) return null;
    const json = (await r.json()) as { success?: boolean; data?: Preview };
    return json.success && json.data?.title ? json.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const onRequestGet = async (context: Ctx): Promise<Response> => {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = ([] as string[]).concat(context.params.path ?? []).filter(Boolean);

  let res = await context.next();
  // Route SPA : s'assurer qu'on réécrit bien index.html
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) {
    res = await env.ASSETS.fetch(new URL('/', url));
  }

  const [slug, sub, token] = parts;
  const isPublicPage = !!slug && slug !== 'build' && (
    parts.length === 1 ||
    (parts.length === 2 && sub === 'rsvp') ||
    (parts.length === 3 && sub === 'invite')
  );
  if (!isPublicPage) return res;

  const key = url.searchParams.get('k') || (sub === 'invite' ? token : '') || '';
  if (!key) return res;

  const api = (env.API_BASE_URL || DEFAULT_API).replace(/\/+$/, '');
  const preview = await fetchPreview(api, slug, key);
  if (!preview) return res;

  const image = `${api}/api/wedding-sites/${encodeURIComponent(slug)}/og-image.jpg?k=${encodeURIComponent(key)}${preview.version ? `&v=${encodeURIComponent(preview.version)}` : ''}`;
  const pageUrl = url.toString();

  const setContent = (value: string) => ({ element(el: RewriterElement) { el.setAttribute('content', value); } });

  const out = new HTMLRewriter()
    .on('html', { element(el) { if (preview.lang) el.setAttribute('lang', preview.lang); } })
    .on('title', { element(el) { el.setInnerContent(preview.title); } })
    .on('meta[name="description"]', setContent(preview.description))
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', pageUrl); } })
    .on('meta[property="og:site_name"]', setContent(preview.title))
    .on('meta[property="og:title"]', setContent(preview.title))
    .on('meta[property="og:description"]', setContent(preview.description))
    .on('meta[property="og:url"]', setContent(pageUrl))
    .on('meta[property="og:image"]', {
      element(el) {
        el.setAttribute('content', image);
        el.after(
          `<meta property="og:image:secure_url" content="${attr(image)}" />` +
          '<meta property="og:image:type" content="image/jpeg" />' +
          '<meta property="og:image:width" content="1200" />' +
          '<meta property="og:image:height" content="630" />' +
          `<meta property="og:image:alt" content="${attr(preview.title)}" />` +
          `<meta name="twitter:title" content="${attr(preview.title)}" />` +
          `<meta name="twitter:description" content="${attr(preview.description)}" />` +
          `<meta name="twitter:image" content="${attr(image)}" />`,
          { html: true },
        );
      },
    })
    .transform(res);

  const headers = new Headers(out.headers);
  // La page dépend de la clé : pas de cache partagé entre liens différents
  headers.set('Cache-Control', 'private, no-cache');
  return new Response(out.body, { status: out.status, headers });
};
