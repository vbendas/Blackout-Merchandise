import { type NextRequest, NextResponse } from 'next/server';

const COLOR_SEPARATION_SERVICE_URL = process.env.COLOR_SEPARATION_SERVICE_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    const proxyFormData = new FormData();
    proxyFormData.append('image', image);

    const garmentColor = formData.get('garment_color');
    const maxColors = formData.get('max_colors');
    const threshold = formData.get('threshold');
    const includeWhite = formData.get('include_white');

    if (garmentColor) proxyFormData.append('garment_color', garmentColor.toString());
    if (maxColors) proxyFormData.append('max_colors', maxColors.toString());
    if (threshold) proxyFormData.append('threshold', threshold.toString());
    if (includeWhite) proxyFormData.append('include_white', includeWhite.toString());

    const response = await fetch(`${COLOR_SEPARATION_SERVICE_URL}/api/v1/separate`, {
      method: 'POST',
      body: proxyFormData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json({ error: error.detail || 'Color separation failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Color separation proxy error:', error);
    return NextResponse.json({ error: 'Failed to process color separation' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const response = await fetch(`${COLOR_SEPARATION_SERVICE_URL}/health`);

    if (response.ok) {
      return NextResponse.json({ status: 'healthy', service: 'color-separation' });
    }

    return NextResponse.json({ status: 'unhealthy', service: 'color-separation' }, { status: 503 });
  } catch {
    return NextResponse.json(
      { status: 'unavailable', service: 'color-separation', error: 'Service unreachable' },
      { status: 503 }
    );
  }
}
