// Shared site-wide constants for metadata, sitemap, robots and the
// Organization JSON-LD block.
export const SITE_URL = 'https://merchfrom.com'; // PLACEHOLDER — set the real production domain
export const SITE_NAME = 'MERCHFROM®';
export const SITE_DESCRIPTION =
  'We help artists, musicians and creators design, source and sell premium merchandise, printed, folded and shipped from Barcelona. By application only.';

// Facts that don't have a confirmed value yet. Kept null rather than a
// placeholder string — anything reading these must hide the fact
// entirely when it's null instead of rendering "[€X]" on the live site.
export const SITE_FACTS = { fromPrice: null as string | null, lead: null as string | null };

// The platform app's own URL (e.g. the "Sign in" link in the header).
// Unset in this environment — consumers must hide that affordance
// rather than link to nothing.
export const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? null;
