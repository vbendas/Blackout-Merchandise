import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://blackoutmerch.example',
  'https://www.blackoutmerch.example',
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Check if origin matches allowed patterns (including Vercel preview URLs)
 */
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Allow Vercel preview deployments
  if (origin.match(/^https:\/\/blackout-merchandise-.*-vbendas\.vercel\.app$/)) return true;

  return false;
}

/**
 * Add CORS headers to API responses
 *
 * @param response - NextResponse to add headers to
 * @param origin - Request origin (from req.headers.get('origin'))
 * @returns NextResponse with CORS headers
 */
export function withCors(response: NextResponse, origin: string | null): NextResponse {
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  return response;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCorsPreflight(origin: string | null): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, origin);
}
