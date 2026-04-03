import { type NextRequest, NextResponse } from 'next/server';
import { mockupClient } from '@/lib/mockup';

export async function GET(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  try {
    const { sku } = await params;
    const template = await mockupClient.getTemplate(sku);
    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
}
