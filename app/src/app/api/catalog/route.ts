import { getActiveProductBlanks, getActiveProductBlanksByCategory } from '@db-root/productBlanks';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Catalog API Endpoint
 * Fetches product blanks with optional filtering
 * Query params:
 *   - category?: string (filter by category)
 *   - limit?: number (default: 50)
 *   - offset?: number (default: 0)
 *
 * Part of Phase 3.5.5 - Catalog Lightbox System
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    // Fetch products
    const products = category ? await getActiveProductBlanksByCategory(category) : await getActiveProductBlanks();

    // Pagination
    const paginatedProducts = products.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        data: paginatedProducts,
        pagination: {
          offset,
          limit,
          total: products.length,
          hasMore: offset + limit < products.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Catalog API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch catalog',
      },
      { status: 500 }
    );
  }
}
