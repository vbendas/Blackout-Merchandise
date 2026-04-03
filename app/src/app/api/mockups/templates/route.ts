import { type NextRequest, NextResponse } from 'next/server';
import { mockupClient } from '@/lib/mockup';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const result = await mockupClient.getTemplates();

    if (category) {
      const filtered = result.templates.filter((t) => t.category === category);
      return NextResponse.json({ templates: filtered });
    }

    return NextResponse.json({ templates: result.templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
