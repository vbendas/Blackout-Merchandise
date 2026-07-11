/**
 * Visual Similarity Search API
 *
 * Finds visually similar products using vector embeddings.
 * Supports both catalog_products and artist_products collections.
 *
 * POST /api/search/similar
 * { "productId": "uuid", "collection": "catalog_products", "limit": 8 }
 *
 * [ARCH] Uses Typesense's built-in vector search with CLIP embeddings.
 * Currently disabled on 0.5GB cluster — CLIP model requires 1GB+ RAM.
 * Will be enabled when cluster is upgraded or self-hosted.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSharedServerClient, isTypesenseConfigured } from '@/lib/typesense/client';
import { CATALOG_PRODUCTS_COLLECTION, ARTIST_PRODUCTS_COLLECTION } from '@/lib/typesense/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const similarSearchSchema = z.object({
  productId: z.string().uuid(),
  collection: z.enum([CATALOG_PRODUCTS_COLLECTION, ARTIST_PRODUCTS_COLLECTION]).default(CATALOG_PRODUCTS_COLLECTION),
  limit: z.number().int().min(1).max(20).default(8),
});

// Flag: CLIP embeddings require 1GB+ RAM, not available on 0.5GB cluster
const VECTOR_SEARCH_ENABLED = false;

export async function POST(request: NextRequest) {
  if (!isTypesenseConfigured()) {
    return NextResponse.json(
      { error: 'Search not configured', results: [] },
      { status: 503 }
    );
  }

  // Visual search temporarily disabled — will be enabled on larger cluster
  if (!VECTOR_SEARCH_ENABLED) {
    return NextResponse.json(
      {
        error: 'Visual similarity search is temporarily unavailable. Text search is fully operational.',
        results: [],
        note: 'CLIP embeddings require 1GB+ RAM. Upgrade your Typesense cluster or self-host to enable visual search.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const validation = similarSearchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, collection, limit } = validation.data;
    const client = getSharedServerClient();

    // Step 1: Fetch the source product's embedding from Typesense
    let sourceDoc;
    try {
      sourceDoc = await client
        .collections(collection)
        .documents(productId)
        .retrieve() as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Source product not found in search index', results: [] },
        { status: 404 }
      );
    }

    const embedding = sourceDoc.image_embedding as number[] | undefined;

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      return NextResponse.json(
        { error: 'Source product has no image embedding (image may not be indexed yet)', results: [] },
        { status: 422 }
      );
    }

    // Step 2: Vector search using the source embedding
    const searchResult = await client
      .collections(collection)
      .documents()
      .search({
        q: '*',
        vector_query: `image_embedding:([${embedding.join(',')}], k:${limit + 1})`,
        filter_by: collection === ARTIST_PRODUCTS_COLLECTION ? 'isActive:=true' : 'status:=active',
        per_page: limit + 1, // +1 because the source product will be in results
      });

    // Remove the source product from results
    const results = (searchResult.hits ?? [])
      .filter((hit) => (hit.document as Record<string, unknown>).id !== productId)
      .slice(0, limit)
      .map((hit) => ({
        ...(hit.document as Record<string, unknown>),
        _vectorDistance: (hit as unknown as Record<string, unknown>).vector_distance,
      }));

    return NextResponse.json({
      results,
      total: results.length,
      sourceProductId: productId,
      collection,
    });
  } catch (error) {
    console.error('POST /api/search/similar error:', error);
    return NextResponse.json(
      { error: 'Similarity search failed', results: [] },
      { status: 500 }
    );
  }
}
