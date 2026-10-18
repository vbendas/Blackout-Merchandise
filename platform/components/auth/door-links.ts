// Where the door's links lead. The website (mainpage/) is its own static site:
// NEXT_PUBLIC_SITE_URL names it, comma-separated when it has more than one
// origin (app/api/apply/route.ts reads it the same way); the first is linked.
// Unset, links stay on this origin, as when the site and the Studio share one
// domain, except in development, where the site has its own dev server and
// this origin's '/' only leads back into the Studio. Client-safe: the
// variables are inlined at build time, so server and client agree.

const DEV_SITE_ORIGIN = 'http://localhost:3000';

export const CONTACT_EMAIL = 'hello@blackoutmerch.example';

function siteOrigin(): string {
  const first = (process.env.NEXT_PUBLIC_SITE_URL ?? '').split(',')[0]?.trim() ?? '';
  if (first) {
    try {
      return new URL(first).origin;
    } catch {
      // not a URL: fall through to the defaults
    }
  }
  return process.env.NODE_ENV === 'production' ? '' : DEV_SITE_ORIGIN;
}

/** A page of the website, e.g. siteHref('/#apply'). */
export function siteHref(path: string): string {
  return `${siteOrigin()}${path}`;
}

/** One value of a search param that may repeat. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** ?email= as the field's starting value: trimmed, no longer than the field
 * takes. It only fills the field; nothing is sent until the visitor asks. */
export function prefillEmail(value: string | string[] | undefined): string {
  return (firstParam(value) ?? '').trim().slice(0, 120);
}
