import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { DEV_BYPASS } from '@/lib/auth';
import { findInvite, isEmailApproved, type WaitlistSignup } from '@/lib/services/waitlist';

/** Shop addresses an artist can't take, at sign-up or later (stores.ts):
 * every top-level route the app owns, where a shop would never be reached,
 * plus a few words kept for the app. The same list as APP_SEGMENTS in
 * proxy.ts; scripts/public-routes-smoke.ts checks both against app/. */
export const RESERVED_SLUGS = new Set([
  // app routes
  'admin',
  'api',
  'dev',
  'mock-checkout',
  'privacy',
  'register',
  'sign-in',
  'sign-up',
  'staff-invite',
  'station',
  'studio',
  'terms',
  // kept for the app (/chat redirects to /studio in next.config.ts)
  'about',
  'chat',
  'contact',
  'waitlist',
]);

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const normalised = slug.trim().toLowerCase();
  if (!normalised || RESERVED_SLUGS.has(normalised)) return false;

  const rows = await db
    .select({ id: schema.artistStores.id })
    .from(schema.artistStores)
    .where(eq(schema.artistStores.slug, normalised))
    .limit(1);
  return rows.length === 0;
}

export interface RegistrationEligibilityInput {
  email: string | null;
  /** the `mf-invite` cookie value, if any (see proxy.ts) */
  inviteToken: string | null;
  role: 'artist' | 'staff' | 'admin';
}

export type RegistrationEligibility =
  | { eligible: true; invite: WaitlistSignup | null }
  | { eligible: false };

/** Platform-Plan §7: an artist may register only if (a) their invite token
 * is valid, (b) their Clerk email matches an approved/registered waitlist
 * row, (c) AUTH_DEV_BYPASS, or (d) they are an admin. Staff never register
 * a shop: staff accounts are kept apart from shops (Print-Prep-Plan §9). */
export async function checkRegistrationEligibility(input: RegistrationEligibilityInput): Promise<RegistrationEligibility> {
  if (input.role === 'staff') return { eligible: false };
  if (DEV_BYPASS || input.role === 'admin') return { eligible: true, invite: null };

  if (input.inviteToken) {
    const invite = await findInvite(input.inviteToken);
    if (invite && (invite.status === 'approved' || invite.status === 'registered')) {
      return { eligible: true, invite };
    }
  }

  if (input.email && (await isEmailApproved(input.email))) {
    return { eligible: true, invite: null };
  }

  return { eligible: false };
}

export interface RegisterArtistInput {
  userId: string;
  displayName: string;
  storeName: string;
  slug: string;
  country: string;
  discordDm: boolean;
  acceptedTerms: boolean;
}

/** Creates the store + notification prefs + consent trail for a newly registered artist. */
export async function registerArtist(input: RegisterArtistInput) {
  const { userId, displayName, storeName, slug, country, discordDm, acceptedTerms } = input;
  const now = new Date();

  const [store] = await db
    .insert(schema.artistStores)
    .values({
      artistId: userId,
      slug,
      name: storeName,
      isLive: false,
      isPublished: false,
      country,
      currency: 'EUR',
      locale: 'en',
    })
    .returning();

  await db.insert(schema.notificationPrefs).values({
    userId,
    discordDm,
    email: true,
  });

  // The consents table's consentType enum only has 'essential' | 'analytics' |
  // 'marketing' (no dedicated terms/privacy values); terms + privacy
  // acceptance is recorded as two 'essential' rows (the single checkbox in
  // the registration form covers both documents).
  const consentRows: {
    userId: string;
    consentType: 'essential' | 'marketing';
    granted: boolean;
    grantedAt: Date;
    method: 'explicit_opt_in';
  }[] = [
    {
      userId,
      consentType: 'essential',
      granted: acceptedTerms,
      grantedAt: now,
      method: 'explicit_opt_in',
    },
    {
      userId,
      consentType: 'essential',
      granted: acceptedTerms,
      grantedAt: now,
      method: 'explicit_opt_in',
    },
  ];
  if (discordDm) {
    consentRows.push({
      userId,
      consentType: 'marketing',
      granted: true,
      grantedAt: now,
      method: 'explicit_opt_in',
    });
  }
  await db.insert(schema.consents).values(consentRows);

  await db.update(schema.users).set({ displayName }).where(eq(schema.users.id, userId));

  return store;
}
