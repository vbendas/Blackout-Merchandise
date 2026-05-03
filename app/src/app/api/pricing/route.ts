import { getCatalogProductById, getCatalogProductBySku } from '@db-root/catalog';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Pricing API Endpoint
 * Calculates pricing for products based on catalog data.
 * Query params:
 *   - productId: string (catalog product UUID or SKU, required)
 *   - placements: number (active placements count)
 *   - colors: number (estimated color count)
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

// Default per-placement and per-color surcharges in EUR
const PLACEMENT_PRICE = 5.0;
const COLOR_PRICE = 3.0;
const MAX_PLACEMENTS = 5;

function validatePricingParams(
  productId: string,
  placements: number,
  colors: number
): { productId: string; placements: number; colors: number } | NextResponse<PricingResponse> {
  if (!productId || typeof productId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Product ID is required' },
      { status: 400 }
    );
  }

  const clampedPlacements = Number.isNaN(placements) || placements < 0 ? 0 : placements;
  const clampedColors = Number.isNaN(colors) || colors < 0 ? 0 : colors;

  if (clampedPlacements > MAX_PLACEMENTS) {
    return NextResponse.json(
      { success: false, error: `Placements cannot exceed ${MAX_PLACEMENTS}` },
      { status: 400 }
    );
  }

  return { productId, placements: clampedPlacements, colors: clampedColors };
}

async function calculatePricing(
  productId: string,
  placements: number,
  colors: number
): Promise<NextResponse<PricingResponse>> {
  // Validate inputs
  const validated = validatePricingParams(productId, placements, colors);
  if (validated instanceof NextResponse) return validated;

  const { productId: validProductId, placements: validPlacements, colors: validColors } = validated;

  // Try by UUID first, then by SKU
  let rows = await getCatalogProductById(validProductId);
  if (rows.length === 0) {
    rows = await getCatalogProductBySku(validProductId);
  }

  if (rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const product = rows[0];
  // Fall back to baseCostEur if suggestedRetailEur is not set
  const retailCents = product.suggestedRetailEur ?? product.baseCostEur;
  const basePrice = retailCents / 100; // stored in cents
  const breakdown = {
    base: basePrice,
    placements: validPlacements * PLACEMENT_PRICE,
    colors: validColors * COLOR_PRICE,
    total: basePrice + validPlacements * PLACEMENT_PRICE + validColors * COLOR_PRICE,
  };

  return NextResponse.json({
    success: true,
    data: {
      basePrice,
      placementPrice: PLACEMENT_PRICE,
      colorPrice: COLOR_PRICE,
      maxPlacements: MAX_PLACEMENTS,
      breakdown,
    },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse<PricingResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const placements = parseInt(searchParams.get('placements') || '0', 10);
    const colors = parseInt(searchParams.get('colors') || '0', 10);

    return calculatePricing(productId ?? '', placements, colors);
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<PricingResponse>> {
  try {
    const body: PricingRequest = await request.json();
    const { productId, placements = 0, colors = 0 } = body;

    return calculatePricing(productId ?? '', placements, colors);
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}
