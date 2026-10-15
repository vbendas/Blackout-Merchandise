import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db, schema } from '@/lib/db';
import { DEV_AS_COOKIE, devIdentityByKey, type DevIdentity } from '@/lib/dev/identities';
import { clerkUserInputFromCurrentUser, getOrCreateUserFromClerk, parseUserRole } from '@/lib/services/users';
import { loadActor, recordStaffActivity } from '@/lib/services/team';
import { can, hasAnyAdminAccess, requirePermission, type Actor, type Area, type Level } from '@/lib/auth/permissions';

export type SessionUser = typeof schema.users.$inferSelect;
export type SessionStore = typeof schema.artistStores.$inferSelect;

export interface SessionInfo {
  user: SessionUser;
  store: SessionStore | null;
  role: SessionUser['role'];
  /** who is acting, for `can()`: the owner, an employee with their access
   * as of this request, or an artist (no admin access) */
  actor: Actor;
}

// Local development only: with AUTH_DEV_BYPASS=1 (and never in production)
// every request runs as a fixed dev user so the app can be exercised
// before real Clerk keys exist. The proxy skips Clerk under the same flag.
// The /dev page (local demo mode) can switch that user for another one the
// demo made, through the mf_dev_as cookie (lib/dev/identities.ts); nothing of
// that is read unless this flag is on.
export const DEV_BYPASS = process.env.AUTH_DEV_BYPASS === '1' && process.env.NODE_ENV !== 'production';

/** Name shown for the dev-bypass user: an artist-style name, never "Dev". */
export const DEV_DISPLAY_NAME = process.env.AUTH_DEV_NAME ?? 'Nova Halo';

/** Where a suspended employee is sent: a page that says so, and nothing else. */
export const STAFF_PAUSED_PATH = '/staff-invite/paused';

/** The identity the /dev page picked (the mf_dev_as cookie), or null: no cookie, a key that isn't one of
 * lib/dev/identities.ts, or no request to read one from (a test, a script). Dev bypass only. */
async function devIdentityFromCookie(): Promise<DevIdentity | null> {
  try {
    return devIdentityByKey((await cookies()).get(DEV_AS_COOKIE)?.value);
  } catch (err) {
    unstable_rethrow(err);
    return null;
  }
}

async function devUser(): Promise<SessionUser> {
  // A picked identity is read, never written or created here: it exists when `npm run demo:local` made it
  // (clerk ids 'dev-bypass' and 'dev-bypass:<key>'), otherwise the fixed dev user below signs in as before.
  const picked = await devIdentityFromCookie();
  if (picked) {
    const [row] = await db.select().from(schema.users).where(eq(schema.users.clerkId, picked.clerkId)).limit(1);
    if (row) return row;
  }
  return getOrCreateUserFromClerk({
    clerkId: 'dev-bypass',
    email: process.env.AUTH_DEV_EMAIL ?? 'dev@merchfrom.test',
    displayName: DEV_DISPLAY_NAME,
    imageUrl: null,
    devRole: parseUserRole(process.env.AUTH_DEV_ROLE),
  });
}

async function storeOf(userId: string): Promise<SessionStore | null> {
  const stores = await db.select().from(schema.artistStores).where(eq(schema.artistStores.artistId, userId)).limit(1);
  return stores[0] ?? null;
}

/** The signed-in session, read once per request (React cache: a layout and
 * its page share it). Null when nobody is signed in. The actor's access is
 * read fresh each request, so a change by the owner counts from the next. */
const loadSession = cache(async (): Promise<SessionInfo | null> => {
  let user: SessionUser;
  if (DEV_BYPASS) {
    user = await devUser();
  } else {
    const { userId } = await auth();
    if (!userId) return null;
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    user = await getOrCreateUserFromClerk(clerkUserInputFromCurrentUser(clerkUser));
  }
  const [store, actor] = await Promise.all([storeOf(user.id), loadActor(user.id, user.role)]);
  return { user, store, role: actor.role, actor };
});

/** Server-only: the session, or null when nobody is signed in. Never
 * redirects and does not block a suspended employee: for the few pages that
 * answer those cases themselves (/staff-invite). Everything else uses
 * requireUser. */
export async function getSession(): Promise<SessionInfo | null> {
  return loadSession();
}

/** True for an employee the owner has paused. */
export function isSuspended(session: Pick<SessionInfo, 'actor'>): boolean {
  return session.actor.role === 'staff' && session.actor.suspended === true;
}

/** Server-only: requires a signed-in user, syncing the users row from Clerk.
 * A suspended employee is sent to STAFF_PAUSED_PATH from every page, action
 * and route that asks, until the owner resumes them. */
export async function requireUser(): Promise<SessionInfo> {
  const session = await loadSession();
  if (!session) redirect('/sign-in');
  if (isSuspended(session)) redirect(STAFF_PAUSED_PATH);
  return session;
}

/** Server-only: requires a signed-in user who has finished registration.
 * The owner and staff work in the Studio without a shop, so only artists
 * are sent to register one. */
export async function requireRegistered(): Promise<SessionInfo> {
  const session = await requireUser();
  if (session.role === 'artist' && !session.store) {
    redirect('/register');
  }
  return session;
}

/** What a staff page view records in the activity log. */
export interface StaffPageView {
  /** the page's path, e.g. '/admin/production' */
  page: string;
  /** the item the page shows, when it shows one */
  itemType?: string;
  itemId?: string;
}

/** The gate for every admin page: the session when `can(actor, area, level)`
 * allows it. Anyone else is sent elsewhere: to /admin (their first allowed
 * page) when they have some admin access, or to the Studio when they have
 * none. Each page calls this itself; the admin layout's check alone would
 * not stop the page rendering (Next.js docs, Authentication: "Layouts and
 * auth checks"). An employee's page views go to the activity log. */
export async function requireStaffPage(area: Area, level: Level = 'view', view?: StaffPageView): Promise<SessionInfo> {
  const session = await requireUser();
  if (!can(session.actor, area, level)) {
    redirect(hasAnyAdminAccess(session.actor) ? '/admin' : '/studio');
  }
  if (session.actor.role === 'staff') {
    await recordStaffActivity(session.actor, {
      area,
      action: 'page.view',
      itemType: view?.itemType ?? (view ? 'page' : undefined),
      itemId: view?.itemId ?? view?.page,
      detail: view ? { page: view.page } : undefined,
    });
  }
  return session;
}

/** The gate for every admin server action and API route: the session when
 * `can(actor, area, level)` allows it, otherwise a PermissionError (a route
 * answers it with 403). Call it first, before reading any input. */
export async function requireStaffAction(area: Area, level: Level): Promise<SessionInfo> {
  const session = await requireUser();
  requirePermission(session.actor, area, level);
  return session;
}
