import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://merchfrom.com',
  'https://www.merchfrom.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Add CORS headers to API responses
 *
 * @param response - NextResponse to add headers to
 * @param origin - Request origin
 * @returns NextResponse with CORS headers
 */
export function withCors(response: NextResponse, origin: string): NextResponse {
  if (ALLOWED_ORIGINS.includes(origin)) {
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
export function handleCorsPreflight(origin: string): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, origin);
}
