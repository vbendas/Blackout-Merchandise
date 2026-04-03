import { type NextRequest, NextResponse } from 'next/server';
import { type MockupRequest, mockupClient } from '@/lib/mockup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.design_url || !body.product_sku || !body.color_code) {
      return NextResponse.json(
        { error: 'Missing required fields: design_url, product_sku, color_code' },
        { status: 400 }
      );
    }

    const mockupRequest: MockupRequest = {
      design_url: body.design_url,
      product_sku: body.product_sku,
      color_code: body.color_code,
      views: body.views ? [body.views] : ['flat'],
      placement: body.placement,
      fabric_type: body.fabric_type,
      halftone: body.halftone ?? true,
      dpi: body.dpi || 300,
    };

    const result = await mockupClient.generateMockup(mockupRequest);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mockup generation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const templates = await mockupClient.getTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
