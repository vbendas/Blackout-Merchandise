import { auth } from '@clerk/nextjs/server';
import { db } from '@db-root/index';
import { shopCustomizations } from '@db-root/schema';
import { createStore, getStoreByArtist, getStoreBySlug } from '@db-root/stores';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve-user';

export const dynamic = 'force-dynamic';

const createStoreSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
});

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    const user = await resolveUser(clerkId);

    const stores = await getStoreByArtist(user.id);

    if (stores.length === 0) {
      return NextResponse.json({ store: null });
    }

    return NextResponse.json({ store: stores[0] });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/stores error:', error);
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const user = await resolveUser(clerkId);

    if (user.role !== 'artist' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only artists can create stores' }, { status: 403 });
    }

    // Check if user already has a store
    const existing = await getStoreByArtist(user.id);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'You already have a store', store: existing[0] }, { status: 409 });
    }

    const body = await request.json();
    const validation = createStoreSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, slug } = validation.data;

    // Check slug uniqueness
    const slugTaken = await getStoreBySlug(slug);
    if (slugTaken.length > 0) {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 409 });
    }

    const [store] = await createStore({ artistId: user.id, name, slug });

    // Create default shopCustomizations row
    await db.insert(shopCustomizations).values({ storeId: store.id });

    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/stores error:', error);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}
