import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, schema } from '@/lib/db';
import { clerkUserInputFromCurrentUser, getOrCreateUserFromClerk } from '@/lib/services/users';

export type SessionUser = typeof schema.users.$inferSelect;
export type SessionStore = typeof schema.artistStores.$inferSelect;

export interface SessionInfo {
  user: SessionUser;
  store: SessionStore | null;
  role: SessionUser['role'];
}

// Local development only: with AUTH_DEV_BYPASS=1 (and never in production)
// every request runs as a fixed dev user so the app can be exercised
// before real Clerk keys exist. The proxy skips Clerk under the same flag.
export const DEV_BYPASS = process.env.AUTH_DEV_BYPASS === '1' && process.env.NODE_ENV !== 'production';

/** Name shown for the dev-bypass user: an artist-style name, never "Dev". */
export const DEV_DISPLAY_NAME = process.env.AUTH_DEV_NAME ?? 'Nova Halo';

async function devUser(): Promise<SessionUser> {
  return getOrCreateUserFromClerk({
    clerkId: 'dev-bypass',
    email: process.env.AUTH_DEV_EMAIL ?? 'dev@merchfrom.test',
    displayName: DEV_DISPLAY_NAME,
    imageUrl: null,
    publicMetadataRole: process.env.AUTH_DEV_ROLE ?? null,
  });
}

/** Server-only: requires a signed-in user, syncing the users row from Clerk. */
export async function requireUser(): Promise<SessionInfo> {
  if (DEV_BYPASS) {
    const user = await devUser();
    const stores = await db
      .select()
      .from(schema.artistStores)
      .where(eq(schema.artistStores.artistId, user.id))
      .limit(1);
    return { user, store: stores[0] ?? null, role: user.role };
  }

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const clerkUser = await currentUser();
  if (!clerkUser) redirect('/sign-in');

  const user = await getOrCreateUserFromClerk(clerkUserInputFromCurrentUser(clerkUser));

  const stores = await db
    .select()
    .from(schema.artistStores)
    .where(eq(schema.artistStores.artistId, user.id))
    .limit(1);

  return { user, store: stores[0] ?? null, role: user.role };
}

/** Server-only: requires a signed-in user who has finished registration. */
export async function requireRegistered(): Promise<SessionInfo> {
  const session = await requireUser();
  if (session.role !== 'admin' && !session.store) {
    redirect('/register');
  }
  return session;
}
