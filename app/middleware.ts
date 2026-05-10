import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require Clerk auth when real keys are configured
// During demo/crowdfunding phase, chat API routes are open (placeholder keys)
const isProtectedRoute = createRouteMatcher([
  '/app(.*)', // All app pages (workspace, eshop, etc.)
  '/app/shop/customize', // Shop customization (artist only)
  '/api/checkout(.*)', // Checkout API
  '/api/ai/(.*)', // AI chat endpoints
  // '/api/chat(.*)' — SKIPPED: chat routes are open for crowdfunding demo (placeholder Clerk keys)
  '/api/pricing(.*)', // Pricing API
  '/api/print-prepare(.*)', // Print preparation API
  '/api/shop/customize', // Shop customization API
  '/api/upload/(.*)', // Upload APIs
  '/api/orders(.*)', // Orders API - financial data
  '/api/stripe-connect(.*)', // Stripe Connect - financial operations
  '/api/shipping(.*)', // Shipping API
  '/data-rights', // Data rights portal (requires auth for personal data)
]);

// Shop subdomain patterns (e.g., artistname.merchfrom.com)

export default clerkMiddleware((auth, req: NextRequest) => {
  // Handle subdomain routing for artist shops
  const hostname = req.headers.get('host') || '';
  const url = req.nextUrl;
  
  // Check if this is a shop subdomain (e.g., artist.merchfrom.com, but not www.merchfrom.com)
  // In development, localhost:3000/artistname would need manual routing
  const isLocalDev = hostname.includes('localhost');
  
  if (!isLocalDev && hostname !== 'merchfrom.com' && !hostname.includes('www.merchfrom.com')) {
    // This is likely a subdomain like artist.merchfrom.com
    const slug = hostname.split('.')[0];
    
    // Only proceed if it looks like a shop subdomain (not www, app, api, etc.)
    if (slug && !['www', 'app', 'api', 'waitlist', 'privacy', 'data-rights'].includes(slug)) {
      // Rewrite to /shop/[slug]
      const rewriteUrl = new URL(`/shop/${slug}`, req.url);
      
      // Copy over the path and query params
      if (url.pathname !== '/') {
        rewriteUrl.pathname = `/shop/${slug}${url.pathname}`;
      }
      rewriteUrl.search = url.search;
      
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  if (isProtectedRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
