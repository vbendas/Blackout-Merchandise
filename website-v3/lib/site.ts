// Shared site-wide constants for metadata, sitemap, robots and the
// Organization JSON-LD block.
export const SITE_URL = 'https://merchfrom.com'; // PLACEHOLDER — set the real production domain
export const SITE_NAME = 'MERCHFROM®';
export const SITE_DESCRIPTION = 'Merch for bands, tattoo studios, festivals and labels. Describe it, approve the proof, we print and ship from Barcelona. By application.';

// Facts that don't have a confirmed value yet. Kept null (or empty)
// rather than a placeholder string: anything reading these must hide
// the fact entirely when it is unset instead of rendering "[X]" on the
// live site. Never copy a value into an i18n string; pass it as a param.
export interface SiteFacts {
  /** Price-from, display string with currency, e.g. set by the owner. */
  fromPrice: string | null;
  /** Typical lead time, display string. */
  lead: string | null;
  /** Minimum order quantity. */
  moq: number | null;
  /** Current run label (the number part only, no "Run" word). */
  runs: string | null;
  /** City shown next to the run label. */
  city: string | null;
  /** Real artists the owner has cleared for display. Empty hides the roster. */
  roster: string[];
}

export const SITE_FACTS: SiteFacts = {
  fromPrice: null,
  lead: null,
  moq: null,
  runs: null,
  city: null,
  roster: [],
};

// Date (ISO, YYYY-MM-DD) from which the MCP / bring-your-own-agent link is
// promised to work. null hides the roadmap row entirely.
export const MCP_TARGET: string | null = null;

// The platform app's own URL (e.g. the "Sign in" link in the header).
// Unset in this environment — consumers must hide that affordance
// rather than link to nothing.
export const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? null;
