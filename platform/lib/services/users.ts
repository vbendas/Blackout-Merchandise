import { eq } from 'drizzle-orm';
import type { User as ClerkBackendUser, UserJSON } from '@clerk/backend';
import { db, schema } from '@/lib/db';
import { linkWaitlistSignupToUser } from '@/lib/services/waitlist';

export type UserRole = 'artist' | 'admin';

export interface ClerkUserInput {
  clerkId: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
  publicMetadataRole?: string | null;
}

function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function resolveRole(input: ClerkUserInput, existingRole?: UserRole): UserRole {
  const isAdmin =
    (!!input.email && adminEmailList().includes(input.email.toLowerCase())) ||
    input.publicMetadataRole === 'admin';
  if (isAdmin) return 'admin';
  return existingRole ?? 'artist';
}

/** Normalises the `currentUser()` shape (camelCase) into ClerkUserInput. */
export function clerkUserInputFromCurrentUser(user: ClerkBackendUser): ClerkUserInput {
  const primaryEmail =
    user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  const roleMeta = (user.publicMetadata as Record<string, unknown> | null)?.role;
  return {
    clerkId: user.id,
    email: primaryEmail,
    displayName,
    imageUrl: user.imageUrl ?? null,
    publicMetadataRole: typeof roleMeta === 'string' ? roleMeta : null,
  };
}

/** Normalises a webhook payload's `UserJSON` (snake_case) into ClerkUserInput. */
export function clerkUserInputFromWebhookUser(data: UserJSON): ClerkUserInput {
  const primaryEmail =
    data.email_addresses.find((address) => address.id === data.primary_email_address_id)
      ?.email_address ??
    data.email_addresses[0]?.email_address ??
    null;
  const displayName = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
  const roleMeta = (data.public_metadata as Record<string, unknown> | null)?.role;
  return {
    clerkId: data.id,
    email: primaryEmail,
    displayName,
    imageUrl: data.image_url ?? null,
    publicMetadataRole: typeof roleMeta === 'string' ? roleMeta : null,
  };
}

export async function getUserByClerkId(clerkId: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1);
  return rows[0] ?? null;
}

/** Upserts the users row for a Clerk identity; role is promoted, never demoted here. */
export async function getOrCreateUserFromClerk(input: ClerkUserInput) {
  const existing = await getUserByClerkId(input.clerkId);
  const role = resolveRole(input, existing?.role as UserRole | undefined);
  const email = input.email ?? existing?.email ?? '';

  if (!existing) {
    const [created] = await db
      .insert(schema.users)
      .values({
        clerkId: input.clerkId,
        email,
        displayName: input.displayName,
        imageUrl: input.imageUrl,
        role,
      })
      .returning();

    // Best-effort attribution the moment a brand-new Clerk account shows up:
    // tags an unclaimed approved waitlist row for this email, ahead of the
    // status -> 'registered' flip that happens once the artist actually
    // finishes /register (see markRegistered in lib/services/waitlist.ts).
    if (created.email) {
      try {
        await linkWaitlistSignupToUser(created.email, created.id);
      } catch (err) {
        console.error('[getOrCreateUserFromClerk] waitlist link failed:', err instanceof Error ? err.message : err);
      }
    }

    return created;
  }

  const [updated] = await db
    .update(schema.users)
    .set({
      email,
      displayName: input.displayName ?? existing.displayName,
      imageUrl: input.imageUrl ?? existing.imageUrl,
      role,
    })
    .where(eq(schema.users.clerkId, input.clerkId))
    .returning();
  return updated;
}
