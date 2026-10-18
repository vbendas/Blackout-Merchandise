# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Blackout Merchandise is a merchandise platform connecting artists with e-commerce, featuring AI-driven design tools and avatar brand ambassadors (Leopoldo, Francisca, Antônia). The platform enables artists to create and sell merchandise with integrated payment processing and order fulfillment.

## Repository Structure

This is a **monorepo** with multiple Next.js applications:

- **`/app`** - Main application (Next.js 16 + Clerk auth + Stripe payments)
- **`/mainpage`** - Marketing landing page (Next.js 16 + HeroUI components)
- **`/src`** - Shared database schemas (Drizzle ORM + Neon PostgreSQL)
- **`/scripts`** - Utility scripts (asset upload to Cloudinary)
- **`/Assets`** - Character assets (Leopoldo, Francisca, Antônia)
- **`/Documentation`** - Product documentation and PRDs

## Development Commands

### Main App (`/app`)
```bash
cd app && bun install     # Install dependencies
cd app && bun dev         # Run dev server (localhost:3000)
cd app && bun build       # Production build
cd app && bun lint        # Run ESLint
```

### Landing Page (`/mainpage`)
```bash
cd mainpage && npm install   # Install dependencies
cd mainpage && npm run dev   # Run dev server
cd mainpage && npm run build # Production build
```

### Root Scripts
```bash
bun scripts/upload-assets.ts  # Upload optimized assets to Cloudinary
```

### Database (Drizzle + Neon)
```bash
bunx drizzle-kit generate    # Generate migrations
bunx drizzle-kit migrate     # Apply migrations
bunx drizzle-kit studio      # Open Drizzle Studio
```

## Architecture

### Tech Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Hosting** | Vercel | Frontend hosting + Edge caching |
| **Database** | Neon (Postgres) | Serverless Postgres + pgvector for AI embeddings |
| **ORM** | Drizzle | Type-safe queries, lightweight, Neon serverless driver |
| **Auth** | Clerk | Passkeys/Magic Links + Pre-built UI components |
| **Caching/Sessions** | Upstash (Redis) | Serverless Redis for sessions, rate limiting, AI response cache |
| **Storage** | Cloudinary | Public CDN + Image Transformations |
| **Payments** | Stripe | Express Checkout (Apple/Google Pay) + Connect (Payouts) |
| **AI Workflows** | Trigger.dev + Vercel Functions | Background jobs for AI, vector storage in Neon pgvector |

### Database: Drizzle ORM (`/src/db`)

Neon PostgreSQL with Drizzle ORM:
- `schema.ts` - Database schema (users, artistStores, products, orders, orderItems, chatSessions)
- `index.ts` - Database connection using `@neondatabase/serverless`

**User Roles:** `artist` | `customer` | `admin`
**Order Status:** `pending` | `paid` | `processing` | `shipped` | `cancelled`

### Authentication

Clerk authentication with middleware protection (`/app/middleware.ts`):
- Protected routes: `/dashboard(.*)`, `/api/checkout(.*)`
- Passkeys/Magic Links (no passwords)

### Payments

Stripe integration:
- Express Checkout (Apple/Google Pay)
- Stripe Connect for artist payouts

### Frontend (`/app/src`)

Next.js App Router structure:
- `/app/src/app/` - Routes (api/, app/showroom, app/support, app/workshop)
- `/app/src/components/` - React components
- `/app/src/hooks/` - Custom hooks
- Uses: Tailwind CSS v4, Framer Motion, GSAP, Lenis (smooth scroll), Zustand (state)

## Environment Variables

Required in `.env.local`:
```
# Database (Neon)
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
REDACTED

# Stripe
STRIPE_SECRET_KEY=
REDACTED

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
REDACTED
```

## Key Patterns

### Drizzle Queries
```typescript
import { db } from '@/db';
import { users, artistStores, products } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Query with filter
const store = await db
    .select()
    .from(artistStores)
    .where(eq(artistStores.slug, slug))
    .limit(1);

// Join query
const storeProducts = await db
    .select()
    .from(products)
    .where(eq(products.storeId, storeId))
    .where(eq(products.isActive, true));
```

### Upstash Redis (Sessions/Caching)
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache AI responses
await redis.set(`ai:response:${key}`, response, { ex: 3600 });
const cached = await redis.get(`ai:response:${key}`);
```

## AI Character Avatars (Cat-Suite)

Three brand ambassador characters stored in `/Assets`:
- **Leopoldo** - CEO/Sales Strategy (The "Boss")
- **Francisca** - Design & Print Strategy (The "Visionary")
- **Antônia** - Logistics & Support (The "Hunter")

Assets uploaded to Cloudinary at `blackout-merchandise/avatars/{character}/{expression}` in 4K WebP format.
