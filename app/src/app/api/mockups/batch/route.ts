import { type NextRequest, NextResponse } from 'next/server';
import { type MockupBatchRequest, mockupClient } from '@/lib/mockup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.designs || !Array.isArray(body.designs)) {
      return NextResponse.json({ error: 'Missing or invalid designs array' }, { status: 400 });
    }

    if (body.designs.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 mockups per batch' }, { status: 400 });
    }

    const batchRequest: MockupBatchRequest = {
      designs: body.designs,
    };

    const result = await mockupClient.generateBatch(batchRequest);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch generation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
