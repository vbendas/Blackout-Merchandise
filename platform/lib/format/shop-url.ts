// Public address of an artist's shop. Client-safe: NEXT_PUBLIC_APP_URL is
// inlined at build time, so server code, tools and client components all
// build the same link. lib/services/stores.ts's storeUrl delegates here.

const DEFAULT_ORIGIN = 'https://merchfrom.com';

/** Full shop URL, e.g. 'https://merchfrom.com/hellslain-merch'. */
export function shopUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_ORIGIN;
  return `${base.replace(/\/+$/, '')}/${slug}`;
}

/** The same address as people read it, without protocol or a leading 'www.':
 * 'merchfrom.com/hellslain-merch'. */
export function shopUrlLabel(slug: string): string {
  return shopUrl(slug)
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/^www\./i, '');
}
