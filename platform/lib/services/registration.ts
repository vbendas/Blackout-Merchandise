import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'chat',
  'register',
  'sign-in',
  'sign-up',
  'waitlist',
  'about',
  'contact',
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
