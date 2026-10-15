// Who the dev bypass can sign in as (AUTH_DEV_BYPASS=1, never in production).
// The /dev page lists these, and /dev/as/<key> sets the mf_dev_as cookie that
// lib/auth.ts reads to pick the user, instead of its one fixed dev user. The
// users themselves are made by `npm run demo:local` (scripts/local-demo.ts),
// with these emails and clerk ids; a key whose user doesn't exist signs in as
// the fixed dev user, as if there were no cookie.
//
// Pure data and two small checks, no server imports: the page, the route, the
// auth code, the demo script and the tests all read this one list.
import type { PresetId } from '@/lib/auth/permissions';

export const DEV_AS_COOKIE = 'mf_dev_as';

export type DevIdentityKey = 'owner' | 'artist' | 'prepress' | 'production' | 'support';

export interface DevIdentity {
  key: DevIdentityKey;
  /** the name on the /dev page */
  label: string;
  role: 'admin' | 'artist' | 'staff';
  /** the clerk id of the users row: 'dev-bypass' is the fixed dev user lib/auth.ts has always used */
  clerkId: string;
  email: string;
  displayName: string;
  /** staff: the job title on /admin/team */
  title?: string;
  /** staff: the access preset the user is given (lib/auth/permissions.ts PRESETS) */
  preset?: PresetId;
  /** one line on what this identity is for */
  blurb: string;
}

export const DEV_IDENTITIES: readonly DevIdentity[] = [
  {
    key: 'owner',
    label: 'Owner',
    role: 'admin',
    clerkId: 'dev-bypass',
    email: 'dev@merchfrom.test',
    displayName: 'Owner',
    blurb: 'Everything: pre-press, production, the ink system, the team.',
  },
  {
    key: 'artist',
    label: 'Artist',
    role: 'artist',
    clerkId: 'dev-bypass:artist',
    email: 'nova@merchfrom.test',
    displayName: 'Nova Halo',
    blurb: 'Owns the Underwriter shop: approves artwork, sees products, runs and billing.',
  },
  {
    key: 'prepress',
    label: 'Pre-press',
    role: 'staff',
    clerkId: 'dev-bypass:prepress',
    email: 'ines@merchfrom.test',
    displayName: 'Ines Vidal',
    title: 'Pre-press',
    preset: 'prepress',
    blurb: 'Employee on the Pre-press preset: checks packs, types Pantone codes, approves files.',
  },
  {
    key: 'production',
    label: 'Production',
    role: 'staff',
    clerkId: 'dev-bypass:production',
    email: 'marc@merchfrom.test',
    displayName: 'Marc Soler',
    title: 'Production',
    preset: 'production',
    blurb: 'Employee on the Production preset: moves orders along, can only look at pre-press.',
  },
  {
    key: 'support',
    label: 'Support',
    role: 'staff',
    clerkId: 'dev-bypass:support',
    email: 'laia@merchfrom.test',
    displayName: 'Laia Ferrer',
    title: 'Support',
    preset: 'support',
    blurb: 'Employee on the Support preset: no admin pages of her own, so the Studio opens.',
  },
];

/** The identity a cookie value names, or null for anything that isn't a known key. */
export function devIdentityByKey(value: string | null | undefined): DevIdentity | null {
  if (!value) return null;
  return DEV_IDENTITIES.find((identity) => identity.key === value) ?? null;
}

/** A path on this site, or the fallback. /dev/as/<key> redirects to the `next` it is given, so it only
 * takes a path that stays on this site: one slash first (not '//host' or '/\host', which browsers read
 * as another site), no line breaks or other control characters, and a sane length. */
export function safeNextPath(next: string | null | undefined, fallback = '/dev'): string {
  if (!next || next.length > 600) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  return next;
}
