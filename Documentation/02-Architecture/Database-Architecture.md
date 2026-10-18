# Database Architecture Documentation

## Overview

Blackout Merchandise uses a **dual-database architecture** by design, not by accident. This document explains why we have two separate databases, what each contains, and when to use which.

---

## Schema Comparison Table

| Aspect | Mainpage DB | App DB |
|--------|-------------|--------|
| **Purpose** | Marketing landing + Waitlist | Full production platform |
| **Tables** | 1 (`waitlist`) | 14+ (users, stores, products, orders, GDPR, etc.) |
| **Size** | ~1KB per row | KB to MB per row |
| **Complexity** | Simple | Complex with relations |
| **Latency Target** | <50ms (edge-cached) | <200ms (standard) |
| **Connection** | Drizzle (Neon) | Drizzle (Neon) |
| **File Location** | `/mainpage/src/db/schema.ts` | `/src/db/schema.ts` |

### Mainpage Schema (`/mainpage/src/db/schema.ts`)

```typescript
// Waitlist only - 16 lines
export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  socialLink: text('social_link'),
  followerRange: text('follower_range'),
  interviewResponses: jsonb('interview_responses'),
  source: text('source').default('organic').notNull(),
  position: integer('position'),
  status: text('status').default('pending').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  notified: boolean('notified').default(false).notNull(),
});
```

### App Schema (`/src/db/schema.ts`)

```typescript
// Core Tables (12 tables)
users                    // Artist/Customer accounts (Clerk-backed)
artistStores             // Artist store configurations
shopCustomizations       // Store theming (colors, fonts, images)
products                 // Products in each store
orders                   // Customer orders
orderItems               // Line items in orders
chatSessions             // AI chat history
productBlanks            // Catalog of producible items
processedWebhookEvents  // Idempotency for webhooks

// GDPR Tables (5 tables)
consents                // User consent tracking
dataSubjectRequests     // GDPR deletion/portability requests
dataBreachLogs          // Security incident tracking
waitlist               // Enhanced version (with indexes)
```

---

## Dual-Database Strategy

### Why Two Databases?

```
┌─────────────────────────────────────────────────────────────────┐
│                        BLACKOUT MERCHANDISE                               │
│                                                                 │
│   ┌──────────────────────┐      ┌──────────────────────────┐  │
│   │    MAINPAGE APP      │      │       APP (PWA)          │  │
│   │   (marketing site)  │      │   (artist dashboard)      │  │
│   │                      │      │                          │  │
│   │  - Landing page     │      │  - AI Chat Interface      │  │
│   │  - Waitlist form    │      │  - Store management       │  │
│   │  - Feature showcase │      │  - Product catalog        │  │
│   │  - CTAs             │      │  - Order processing       │  │
│   └──────────┬───────────┘      └───────────┬──────────────┘  │
│              │                              │                  │
│              ▼                              ▼                  │
│   ┌──────────────────────┐      ┌──────────────────────────┐  │
│   │   MAINPAGE DB        │      │        APP DB           │  │
│   │                      │      │                          │  │
│   │  Waitlist Table     │      │  Users, Stores, Products │  │
│   │  (read-heavy)       │      │  Orders, GDPR, Chat      │  │
│   │                     │      │  (write-heavy)            │  │
│   │  ~5,000 rows        │      │  ~100,000+ rows          │  │
│   │                     │      │                          │  │
│   │  Edge-cached        │      │  Standard connection     │  │
│   └──────────────────────┘      └──────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Responsibilities

#### Mainpage DB (Lightweight)

| Responsibility | Details |
|----------------|---------|
| **Waitlist Signups** | Email collection, position tracking |
| **Source Attribution** | Track how users found us (organic, social, referral) |
| **Interview Responses** | JSON storage for vet questions |
| **Quick Reads** | Display "2,847 interested" on landing |

**Characteristics:**
- Single table, no relations
- 99% reads, 1% writes
- Safe to edge-cache
- Fast cold starts (small dataset)
- No sensitive user data

#### App DB (Full Production)

| Responsibility | Details |
|----------------|---------|
| **User Management** | Clerk-backed user accounts |
| **Store Creation** | Artist storefronts with slugs |
| **Product Management** | Mockups, pricing, inventory |
| **Order Processing** | Stripe payments, shipping |
| **AI Chat** | Conversation history, context |
| **GDPR Compliance** | Consent, deletion, breach logs |
| **Webhooks** | Idempotency for Stripe/Clerk |

**Characteristics:**
- 14+ tables with relations
- Complex queries (joins, aggregations)
- PII/Sensitive data (emails, addresses)
- ACID compliance critical
- Regular backups required

---

## Connection Patterns

### Mainpage DB Connection

```typescript
// /mainpage/src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.MAINPAGE_DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Environment Variable:** `MAINPAGE_DATABASE_URL`

### App DB Connection

```typescript
// /src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**Environment Variable:** `DATABASE_URL`

### Data Flow Diagram

```
USER ACTION
     │
     ▼
┌─────────────────────────────────────────────┐
│         ROUTER / PAGE                      │
│   (Next.js App Router)                      │
└─────────────────────────────────────────────┘
     │
     ├──────────────────┐
     ▼                  ▼
MAINPAGE ROUTE     APP ROUTE
(/, /waitlist)     (/dashboard, /chat)
     │                  │
     ▼                  ▼
MAINPAGE DB        APP DB
(Waitlist only)    (Full schema)
     │                  │
     │                  ▼
     │         ┌─────────────────┐
     │         │  Clerk Auth     │
     │         │  (user ID)      │
     │         └─────────────────┘
     │                  │
     ▼                  ▼
RESPONSE           RESPONSE
```

---

## When to Use Which Database

### Use Mainpage DB When:

| Scenario | Example |
|----------|---------|
| ✅ Collecting waitlist signups | `/waitlist` form submission |
| ✅ Reading waitlist count | Displaying "2,847 interested" |
| ✅ Marketing page features | Any mainpage component |
| ✅ Landing page analytics | Source attribution only |

### Use App DB When:

| Scenario | Example |
|----------|---------|
| ✅ User authentication | Signing in with Clerk |
| ✅ Managing stores | Creating/editing artist stores |
| ✅ Product management | Adding products to catalog |
| ✅ Order processing | Stripe checkout flow |
| ✅ AI chat history | Storing conversation context |
| ✅ GDPR requests | Processing deletion requests |
| ✅ Webhook handling | Stripe/Clerk webhooks |

### Never Do This:

```typescript
// ❌ WRONG: Cross-database queries
const user = await db.query.users.findFirst({
  where: eq(users.email, email)  // Can't access App DB from mainpage
});

// ✅ CORRECT: Separate by concern
// In mainpage: db.query.waitlist.findMany()
// In app: db.query.users.findFirst()
```

---

## Why This Separation Makes Sense

### 1. Security Isolation

```
Mainpage DB:     App DB:
┌──────────┐     ┌──────────┐
│ waitlist │     │ users    │ ← PII (emails, names)
│ (public) │     │ orders   │ ← Payment data
│          │     │ addresses│ ← Sensitive
└──────────┘     └──────────┘

Breach Scenario:
- Mainpage DB leaked → Only emails (low impact)
- App DB leaked → Full user data (high impact)
```

### 2. Performance Optimization

| Factor | Mainpage DB | App DB |
|--------|-------------|--------|
| Cold start | ~50ms | ~500ms |
| Query complexity | Simple (1 table) | Complex (joins) |
| Caching | Aggressive (stale OK) | Minimal (fresh required) |
| Connection pool | Small (5-10) | Large (50-100) |

### 3. Operational Independence

```
Mainpage Deploy     App Deploy
        │                │
        ▼                ▼
   DB Migration     DB Migration
   (safe to break)   (needs rollback)
        │                │
   Quick rollback   Careful process
```

- Mainpage can be redeployed without affecting App
- App schema changes don't require mainpage coordination
- Different backup/snapshot schedules

### 4. Cost Optimization

| Resource | Mainpage | App |
|----------|----------|-----|
| Database size | <50MB | 500MB+ |
| Connections | 5 | 50 |
| Compute | Minimal | Standard |
| Backup frequency | Daily | Hourly |

---

## Environment Configuration

### Required Environment Variables

```env
# Mainpage (.env.local)
MAINPAGE_DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB

# App (.env.local)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB
```

### Development Setup

```bash
# Mainpage
cd mainpage
npm run dev  # Uses MAINPAGE_DATABASE_URL

# App  
cd app
bun dev     # Uses DATABASE_URL
```

---

## Future Considerations

### Potential Mergers

If we eventually unify the sites, we could:

1. **Keep separate DBs, add cross-db queries** via API layer
2. **Migrate mainpage waitlist → App DB** (requires auth wall)
3. **Use foreign data wrappers** (advanced PostgreSQL)

### Current Decision

> **Keep separation.** The complexity of two databases is worth:
> - Security isolation
> - Performance optimization  
> - Operational independence
> - Clear architectural boundaries

---

## Quick Reference

| Need | Database |
|------|----------|
| Waitlist signup form | Mainpage DB |
| Displaying waitlist count | Mainpage DB |
| User login | App DB |
| Creating a store | App DB |
| Adding products | App DB |
| Processing orders | App DB |
| AI chat history | App DB |
| GDPR compliance | App DB |

---

**Last Updated:** February 2026
**Maintained by:** Victor Bendas
