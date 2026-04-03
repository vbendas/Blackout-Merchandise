import fs from 'fs';
import { type NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const metadataPath = path.join(process.cwd(), '../../services/mockup-generator/data/metadata.json');

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let products = Object.values(metadata.products);

    if (category) {
      products = products.filter((p: any) => p.category === category);
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
