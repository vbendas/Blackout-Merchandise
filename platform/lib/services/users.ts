import { eq } from 'drizzle-orm';
import type { User as ClerkBackendUser, UserJSON } from '@clerk/backend';
import { db, schema } from '@/lib/db';
import { linkWaitlistSignupToUser } from '@/lib/services/waitlist';

export type UserRole = 'artist' | 'staff' | 'admin';

export interface ClerkUserInput {
  clerkId: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
  publicMetadataRole?: string | null;
  /** AUTH_DEV_BYPASS only (lib/auth.ts): the fixed dev user's role from
   * AUTH_DEV_ROLE, applied as it is on every sync. Never set from Clerk. */
  devRole?: UserRole | null;
}

export function parseUserRole(value: string | null | undefined): UserRole | null {
  return value === 'artist' || value === 'staff' || value === 'admin' ? value : null;
}

function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

async function ownerExists(): Promise<boolean> {
  const rows = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, 'admin')).limit(1);
  return rows.length > 0;
}

/** The role a sync gives a Clerk identity. Roles are the team's to change
 * (lib/services/team.ts: invites, owner and staff changes, removal), so a
 * sync keeps the role a person has. ADMIN_EMAILS (or Clerk metadata saying
 * 'admin') only bootstraps the first owner: it promotes while the platform
 * has no owner at all, and never again after that. */
async function resolveRole(input: ClerkUserInput, existingRole?: UserRole): Promise<UserRole> {
  if (input.devRole) return input.devRole;
  if (existingRole && existingRole !== 'artist') return existingRole;
  const named =
    (!!input.email && adminEmailList().includes(input.email.toLowerCase())) ||
    input.publicMetadataRole === 'admin';
  if (named && !(await ownerExists())) return 'admin';
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

/** Upserts the users row for a Clerk identity. The role only changes here to
 * bootstrap the first owner (resolveRole). */
export async function getOrCreateUserFromClerk(input: ClerkUserInput) {
  const existing = await getUserByClerkId(input.clerkId);
  const role = await resolveRole(input, existing?.role as UserRole | undefined);
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
      // Clerk seeds the name once; after that the artist owns it (Studio
      // Settings), so a sync never overwrites an edited name.
      displayName: existing.displayName ?? input.displayName,
      imageUrl: input.imageUrl ?? existing.imageUrl,
      // Written only when this sync changes it: a sync running while the
      // owner removes or changes someone must not write the old role back.
      ...(role !== existing.role ? { role } : {}),
    })
    .where(eq(schema.users.clerkId, input.clerkId))
    .returning();
  return updated;
}
