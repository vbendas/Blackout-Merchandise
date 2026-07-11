/**
 * Shop Search API — MerchShop Storefront
 *
 * Searches the artist_products Typesense collection, scoped to a specific store.
 * Used by customers browsing an artist's MerchShop.
 *
 * GET /api/search/shop/[slug]?q=skull+tee&sort=retailPrice:desc&page=1&limit=20
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSharedServerClient, isTypesenseConfigured } from '@/lib/typesense/client';
import { ARTIST_PRODUCTS_COLLECTION } from '@/lib/typesense/schemas';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isTypesenseConfigured()) {
    return NextResponse.json(
      { error: 'Search not configured', results: [], total: 0 },
      { status: 503 }
    );
  }

  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const client = getSharedServerClient();

    const q = searchParams.get('q') || '*';
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(40, Math.max(1, Number(searchParams.get('limit') || '20')));
    const sortBy = searchParams.get('sort') || 'createdAt:desc';

    const searchResult = await client
      .collections(ARTIST_PRODUCTS_COLLECTION)
      .documents()
      .search({
        q,
        query_by: 'name,description',
        filter_by: `storeSlug:=${slug} && isActive:=true`,
        sort_by: sortBy,
        page,
        per_page: limit,
        num_typos: 2,
        typo_tokens_threshold: 1,
        highlight_fields: 'name,description',
      });

    return NextResponse.json({
      results: searchResult.hits?.map((hit) => ({
        ...(hit.document as Record<string, unknown>),
        _highlight: hit.highlight,
      })) ?? [],
      total: searchResult.found,
      page: searchResult.page,
      limit,
      searchTimeMs: searchResult.search_time_ms,
      storeSlug: slug,
    });
  } catch (error) {
    console.error('GET /api/search/shop/[slug] error:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [], total: 0 },
      { status: 500 }
    );
  }
}
