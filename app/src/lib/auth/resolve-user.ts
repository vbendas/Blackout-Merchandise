import { getUserByClerkId } from '@db-root/users';
import { getStoreByArtist } from '@db-root/stores';
import { NextResponse } from 'next/server';

export type ResolvedUser = {
  id: string;
  clerkId: string;
  email: string;
  displayName: string | null;
  role: 'customer' | 'artist' | 'admin';
  stripeCustomerId: string | null;
  stripeConnectId: string | null;
};

export type ResolvedStore = {
  id: string;
  artistId: string;
  slug: string;
  name: string;
  isLive: boolean;
};

/**
 * Resolves a Clerk user ID to the corresponding DB user row.
 * Returns the DB user (with UUID id) or throws a NextResponse error.
 *
 * Use this instead of raw `auth()` whenever you need to compare against
 * DB foreign keys — Clerk IDs (user_xxx) are NOT the same as DB UUIDs.
 */
export async function resolveUser(clerkId: string | null | undefined): Promise<ResolvedUser> {
  if (!clerkId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await getUserByClerkId(clerkId);

  if (users.length === 0) {
    throw NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return users[0] as ResolvedUser;
}

/**
 * Resolves a Clerk ID to a DB user AND their artist store.
 * Throws 403 if the user has no store.
 *
 * Use this for any endpoint that must verify store ownership.
 */
export async function requireStoreOwner(
  clerkId: string | null | undefined
): Promise<{ user: ResolvedUser; store: ResolvedStore }> {
  const user = await resolveUser(clerkId);

  const stores = await getStoreByArtist(user.id);

  if (stores.length === 0) {
    throw NextResponse.json({ error: 'Forbidden: No artist store found for this user' }, { status: 403 });
  }

  return { user, store: stores[0] as ResolvedStore };
}
