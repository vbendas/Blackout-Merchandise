import { type NextRequest, NextResponse } from 'next/server';

/**
 * Pricing API Endpoint
 * Calculates pricing for products based on configuration
 * Query params:
 *   - productId: string (required)
 *   - placements: number (active placements count)
 *   - colors: number (estimated color count)
 *
 * Returns pricing breakdown for studio calculations
 */

export interface PricingRequest {
  productId: string;
  placements?: number;
  colors?: number;
}

export interface PricingResponse {
  success: boolean;
  data?: {
    basePrice: number;
    placementPrice: number;
    colorPrice: number;
    maxPlacements: number;
    breakdown: {
      base: number;
      placements: number;
      colors: number;
      total: number;
    };
  };
  error?: string;
}

// Mock pricing data - in production, fetch from database
const PRICING_DATA: Record<
  string,
  {
    basePrice: number;
    placementPrice: number;
    colorPrice: number;
    maxPlacements: number;
  }
> = {
  't-shirt-premium': {
    basePrice: 25.0,
    placementPrice: 5.0,
    colorPrice: 3.0,
    maxPlacements: 5,
  },
  't-shirt-standard': {
    basePrice: 18.0,
    placementPrice: 4.0,
    colorPrice: 2.5,
    maxPlacements: 4,
  },
  'hoodie-premium': {
    basePrice: 45.0,
    placementPrice: 6.0,
    colorPrice: 3.5,
    maxPlacements: 6,
  },
  'tote-bag': {
    basePrice: 15.0,
    placementPrice: 3.0,
    colorPrice: 2.0,
    maxPlacements: 2,
  },
};

export async function GET(request: NextRequest): Promise<NextResponse<PricingResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const placements = parseInt(searchParams.get('placements') || '0', 10);
    const colors = parseInt(searchParams.get('colors') || '0', 10);

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // In production, fetch from database
    // const pricing = await getProductPricing(productId);
    const pricing = PRICING_DATA[productId] || PRICING_DATA['t-shirt-premium'];

    const breakdown = {
      base: pricing.basePrice,
      placements: placements * pricing.placementPrice,
      colors: colors * pricing.colorPrice,
      total: pricing.basePrice + placements * pricing.placementPrice + colors * pricing.colorPrice,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          basePrice: pricing.basePrice,
          placementPrice: pricing.placementPrice,
          colorPrice: pricing.colorPrice,
          maxPlacements: pricing.maxPlacements,
          breakdown,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate pricing',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<PricingResponse>> {
  try {
    const body: PricingRequest = await request.json();
    const { productId, placements = 0, colors = 0 } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // In production, fetch from database
    const pricing = PRICING_DATA[productId] || PRICING_DATA['t-shirt-premium'];

    const breakdown = {
      base: pricing.basePrice,
      placements: placements * pricing.placementPrice,
      colors: colors * pricing.colorPrice,
      total: pricing.basePrice + placements * pricing.placementPrice + colors * pricing.colorPrice,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          basePrice: pricing.basePrice,
          placementPrice: pricing.placementPrice,
          colorPrice: pricing.colorPrice,
          maxPlacements: pricing.maxPlacements,
          breakdown,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate pricing',
      },
      { status: 500 }
    );
  }
}
