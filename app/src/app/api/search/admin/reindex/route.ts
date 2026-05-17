/**
 * Search Admin — Reindex API
 *
 * Triggers a full reindex of PostgreSQL data into Typesense.
 * Admin-only endpoint (requires Clerk authentication).
 *
 * POST /api/search/admin/reindex
 * { "collection": "catalog_products" | "artist_products" | "all" }
 */

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isTypesenseConfigured } from '@/lib/typesense/client';
import { reindexAll, reindexCatalog, reindexArtistProducts, ensureCollections } from '@/lib/typesense/collections';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reindexSchema = z.object({
  collection: z.enum(['catalog_products', 'artist_products', 'all']).default('all'),
});

export async function POST(request: NextRequest) {
  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized. Authentication required.' },
      { status: 401 }
    );
  }

  if (!isTypesenseConfigured()) {
    return NextResponse.json(
      { error: 'Typesense not configured. Set TYPESENSE_API_KEY and TYPESENSE_HOST.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const validation = reindexSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { collection } = validation.data;

    // Ensure collections exist first
    await ensureCollections();

    let result: { catalog?: number; artist?: number };

    switch (collection) {
      case 'catalog_products':
        result = { catalog: await reindexCatalog() };
        break;
      case 'artist_products':
        result = { artist: await reindexArtistProducts() };
        break;
      case 'all':
      default:
        result = await reindexAll();
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Reindexed ${collection}`,
      ...result,
    });
  } catch (error) {
    console.error('POST /api/search/admin/reindex error:', error);
    // Sanitize error — never expose internal details to client
    return NextResponse.json(
      { error: 'Reindex failed. Check server logs for details.' },
      { status: 500 }
    );
  }
}
