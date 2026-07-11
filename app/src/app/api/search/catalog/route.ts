/**
 * Catalog Search API — Artist Dashboard
 *
 * Searches the catalog_products Typesense collection.
 * Used by artists when browsing blank garments to apply designs to.
 *
 * GET /api/search/catalog?q=hoodie&category=t-shirts&brand=Stanley+Stella&minPrice=500&maxPrice=3000&sort=baseCostEur:asc&page=1&limit=20
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSharedServerClient, isTypesenseConfigured } from '@/lib/typesense/client';
import { CATALOG_PRODUCTS_COLLECTION } from '@/lib/typesense/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Graceful fallback when Typesense isn't configured
  if (!isTypesenseConfigured()) {
    return NextResponse.json(
      { error: 'Search not configured', results: [], total: 0 },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const client = getSharedServerClient();

    const q = searchParams.get('q') || '*';
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(40, Math.max(1, Number(searchParams.get('limit') || '20')));
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const material = searchParams.get('material');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sort') || 'createdAt:desc';

    // Build filter_by string
    const filters: string[] = ['status:=active'];

    if (category) filters.push(`category:=${category}`);
    if (brand) filters.push(`brand:=${brand}`);
    if (material) filters.push(`material:=${material}`);
    if (minPrice) filters.push(`baseCostEur:>=${minPrice}`);
    if (maxPrice) filters.push(`baseCostEur:<=${maxPrice}`);

    const filterBy = filters.join(' && ');

    const searchResult = await client
      .collections(CATALOG_PRODUCTS_COLLECTION)
      .documents()
      .search({
        q,
        query_by: 'name,description,brand,sku,material',
        filter_by: filterBy,
        sort_by: sortBy,
        page,
        per_page: limit,
        facet_by: 'category,brand,material',
        max_facet_values: 20,
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
      facets: searchResult.facet_counts,
      searchTimeMs: searchResult.search_time_ms,
    });
  } catch (error) {
    console.error('GET /api/search/catalog error:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [], total: 0 },
      { status: 500 }
    );
  }
}
