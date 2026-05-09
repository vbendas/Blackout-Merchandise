# Quick Wins Implementation Plan — February 6, 2026

> **Source:** EVALUATION_FEB06_2026_COMPREHENSIVE_AUDIT.md
> **Estimated Total Time:** 2-3 hours
> **Expected Score Impact:** +0.15 to +0.25 (Technical Architecture, Execution Progress)
> **Priority:** All items are P0 or P1 — fix today before any new feature work

---

## Overview

These are code fixes that can be applied today in a single focused session. Every item has a specific file, a specific problem, and a specific solution. No research, no architecture decisions, no new dependencies — just fixes.

| # | Fix | File(s) | Time | Severity |
|---|-----|---------|------|----------|
| 1 | [Expand middleware auth scope](#1-expand-middleware-auth-scope) | `app/middleware.ts` | 5 min | CRITICAL |
| 2 | [Fix order fulfillment enum bug](#2-fix-order-fulfillment-enum-bug) | `src/db/orders.ts` | 5 min | HIGH |
| 3 | [Fix user deletion — actually delete the user](#3-fix-user-deletion) | `app/src/app/api/webhooks/clerk/route.ts` | 10 min | HIGH |
| 4 | [Wrap createOrder in a transaction](#4-wrap-createorder-in-a-transaction) | `src/db/orders.ts` | 15 min | HIGH |
| 5 | [Add database indexes](#5-add-database-indexes) | `src/db/schema.ts` | 20 min | HIGH |
| 6 | [Delete duplicate mainpage schema](#6-delete-duplicate-mainpage-schema) | `mainpage/src/db/` | 30 min | CRITICAL |
| 7 | [Fix verify.sh auto-modification](#7-fix-verifysh-auto-modification) | `verify.sh` | 5 min | MODERATE |
| 8 | [Type-safe order status updates](#8-type-safe-order-status-updates) | `src/db/orders.ts` | 10 min | MODERATE |
| 9 | [Fix unused imports and variables](#9-fix-unused-imports-and-variables) | Multiple files | 15 min | LOW |

**Total: ~2 hours**

---

## Detailed Implementation Guide

### 1. Expand Middleware Auth Scope

**File:** `app/middleware.ts`
**Problem:** Only `/dashboard(.*)` and `/api/checkout(.*)` are protected. The actual app lives at `/app/workspace`, `/app/catalog`, etc. — all unprotected. `/dashboard` doesn't even exist as a route.
**Risk if unfixed:** Any unauthenticated user can access the full workspace.

**Current code (line 5-8):**
```typescript
const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/api/checkout(.*)'
]);
```

**Fix — replace with:**
```typescript
const isProtectedRoute = createRouteMatcher([
    '/app(.*)',
    '/api/checkout(.*)',
    '/api/chat(.*)',
    '/api/catalog(.*)',
]);
```

**Why this works:** All authenticated app routes live under `/app/*`. Public routes (`/`, `/waitlist`, `/privacy`, `/data-rights`) are intentionally not under `/app/`. The `/api/waitlist` POST remains public for signups, while `/api/catalog` and `/api/chat` are protected.

---

### 2. Fix Order Fulfillment Enum Bug

**File:** `src/db/orders.ts`
**Problem:** `fulfillOrder()` (line 52-54) passes `'fulfilled'` to `updateOrderStatus()`, but the `orderStatusEnum` in `schema.ts` (line 6) only has: `pending`, `paid`, `processing`, `shipped`, `cancelled`. This would crash at runtime with a PostgreSQL enum violation.
**Risk if unfixed:** Every order fulfillment attempt crashes the application.

**Current code (line 52-54):**
```typescript
export async function fulfillOrder(id: string) {
  return await updateOrderStatus(id, 'fulfilled');
}
```

**Fix — replace with:**
```typescript
export async function fulfillOrder(id: string) {
  return await updateOrderStatus(id, 'shipped');
}
```

**Why `shipped` and not adding `fulfilled`:** Adding a new enum value requires a database migration. `shipped` is the semantically closest valid value and avoids a migration. If a distinct `fulfilled` state is needed later (e.g., "delivered and confirmed"), add it via a proper migration.

---

### 3. Fix User Deletion

**File:** `app/src/app/api/webhooks/clerk/route.ts`
**Problem:** `handleUserDeleted()` (line 73-88) finds the user, deletes their GDPR consent and data subject request records, but **never deletes the user row itself**. The user becomes an orphaned record with no Clerk account.
**Risk if unfixed:** GDPR violation — user requests account deletion but their data persists. Orphaned rows accumulate.

**Current code (line 73-88):**
```typescript
async function handleUserDeleted(data: any) {
  const clerkUserId = data.id;
  const user = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

  if (user.length > 0) {
    const userId = user[0].id;
    await db.delete(consents).where(eq(consents.userId, userId));
    await db.delete(dataSubjectRequests).where(eq(dataSubjectRequests.userId, userId));
  }
}
```

**Fix — replace with:**
```typescript
async function handleUserDeleted(data: any) {
  const clerkUserId = data.id;
  const user = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

  if (user.length > 0) {
    const userId = user[0].id;

    // Delete GDPR records first (child rows)
    await db.delete(consents).where(eq(consents.userId, userId));
    await db.delete(dataSubjectRequests).where(eq(dataSubjectRequests.userId, userId));

    // Delete chat sessions
    await db.delete(chatSessions).where(eq(chatSessions.userId, userId));

    // Finally delete the user record itself
    await db.delete(users).where(eq(users.id, userId));
  }
}
```

**Additional import needed at the top of the file:**
```typescript
import { chatSessions, consents, dataSubjectRequests, users } from '@/db/schema';
```
Note: `chatSessions` must be added to the existing import from `@/db/schema`.

**Why manual deletion instead of CASCADE:** The schema doesn't have `onDelete: 'cascade'` on most foreign keys (stores, orders, chatSessions). Adding cascades would require a migration. Manual deletion of child records is the safe approach for now.

**Note on orders/stores:** We intentionally do NOT delete orders or stores here. Orders are financial records that should be retained. Artist stores may have products and order history. A full "right to erasure" implementation should anonymize rather than delete these records (replace `customerId`/`artistId` with null and scrub PII).

---

### 4. Wrap createOrder in a Transaction

**File:** `src/db/orders.ts`
**Problem:** `createOrder()` (line 5-34) inserts the order first, then loops through items inserting each one individually. If any item insert fails, the order exists without all its items — data corruption.
**Risk if unfixed:** Partial orders in production. Customer charged for incomplete order.

**Current code (line 5-34):**
```typescript
export async function createOrder(data: { ... }) {
  const [order] = await db.insert(orders).values({...}).returning();

  for (const item of data.items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      ...
    });
  }

  return order;
}
```

**Fix — replace entire function with:**
```typescript
export async function createOrder(data: {
  userId: string;
  storeId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  stripeSessionId: string;
}) {
  return await db.transaction(async (tx) => {
    // Create order
    const [order] = await tx.insert(orders).values({
      customerId: data.userId,
      storeId: data.storeId,
      totalAmount: Math.round(data.total * 100),
      stripePaymentIntentId: data.stripeSessionId,
      status: 'paid',
    }).returning();

    // Create order items — all or nothing
    if (data.items.length > 0) {
      await tx.insert(orderItems).values(
        data.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: Math.round(item.price * 100),
        }))
      );
    }

    return order;
  });
}
```

**Key improvements:**
1. `db.transaction()` ensures atomicity — all inserts succeed or all roll back
2. Batch insert for items (single INSERT with multiple VALUES) instead of N+1 queries
3. Empty items array check prevents unnecessary database call

---

### 5. Add Database Indexes

**File:** `src/db/schema.ts`
**Problem:** Zero custom indexes across 11 tables. Every filtered query is a full table scan.
**Risk if unfixed:** Degrading performance as data grows. Already a problem for O(n) queries.

**Add the following after the table definitions and before the relations section (around line 160):**

```typescript
import { index } from 'drizzle-orm/pg-core';
```

Then add indexes to the table definitions:

**Users table — add email index:**
Add to the `users` pgTable definition, as a second argument:
```typescript
export const users = pgTable('users', {
    // ... existing columns ...
}, (table) => [
    index('users_email_idx').on(table.email),
]);
```

**Products table — add storeId index:**
```typescript
export const products = pgTable('products', {
    // ... existing columns ...
}, (table) => [
    index('products_store_id_idx').on(table.storeId),
]);
```

**Orders table — add customer, store, and stripe indexes:**
```typescript
export const orders = pgTable('orders', {
    // ... existing columns ...
}, (table) => [
    index('orders_customer_id_idx').on(table.customerId),
    index('orders_store_id_idx').on(table.storeId),
    index('orders_stripe_pi_idx').on(table.stripePaymentIntentId),
]);
```

**Order Items — add orderId index:**
```typescript
export const orderItems = pgTable('order_items', {
    // ... existing columns ...
}, (table) => [
    index('order_items_order_id_idx').on(table.orderId),
]);
```

**Chat Sessions — add userId index:**
```typescript
export const chatSessions = pgTable('chat_sessions', {
    // ... existing columns ...
}, (table) => [
    index('chat_sessions_user_id_idx').on(table.userId),
]);
```

**Waitlist — add status index:**
```typescript
export const waitlist = pgTable('waitlist', {
    // ... existing columns ...
}, (table) => [
    index('waitlist_status_idx').on(table.status),
]);
```

**Product Blanks — add category and isActive indexes:**
```typescript
export const productBlanks = pgTable('product_blanks', {
    // ... existing columns ...
}, (table) => [
    index('product_blanks_category_idx').on(table.category),
    index('product_blanks_is_active_idx').on(table.isActive),
]);
```

**After adding indexes, generate migration:**
```bash
bunx drizzle-kit generate
```

**Do NOT apply the migration yet** (`drizzle-kit migrate`) — review the generated SQL first, then apply after verification.

---

### 6. Delete Duplicate Mainpage Schema

**Files affected:**
- `mainpage/src/db/schema.ts` (DELETE)
- `mainpage/src/db/index.ts` (DELETE)
- `mainpage/src/db/waitlist.ts` (MODIFY — change import path)
- `mainpage/src/app/api/waitlist/route.ts` (MODIFY — change import path)
- `mainpage/src/app/api/test-db/route.ts` (DELETE — test endpoint should not exist in production)

**Problem:** Two incompatible `waitlist` table definitions target the same Neon database. Running `drizzle-kit generate` from `/mainpage` would produce a migration that drops 6 columns from the root waitlist table.

**Step-by-step:**

1. **Delete `mainpage/src/db/schema.ts`** — the 5-field waitlist definition
2. **Delete `mainpage/src/db/index.ts`** — exact duplicate of root `/src/db/index.ts`
3. **Update `mainpage/src/db/waitlist.ts`** — change imports to use root DB:

**Current:**
```typescript
import { eq } from 'drizzle-orm';
import { db } from './index';
import { waitlist } from './schema';
```

**Replace with:**
```typescript
import { eq } from 'drizzle-orm';
import { db } from '../../../src/db/index';
import { waitlist } from '../../../src/db/schema';
```

**Alternative (cleaner):** Add a path alias in `mainpage/tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@db/*": ["../src/db/*"]
    }
  }
}
```
Then import as:
```typescript
import { db } from '@db/index';
import { waitlist } from '@db/schema';
```

4. **Update `mainpage/src/app/api/waitlist/route.ts`** — update any imports from `@/db/` to use the root DB path

5. **Delete `mainpage/src/app/api/test-db/route.ts`** — this endpoint exposes database connectivity status and should not exist

6. **Verify build:**
```bash
cd mainpage && npm run build
```

---

### 7. Fix verify.sh Auto-Modification

**File:** `verify.sh`
**Problem:** Line 28 uses `biome check --write` which auto-modifies source files during verification. Verification should be read-only.
**Risk if unfixed:** Silent auto-formatting masks style issues and creates unexpected file changes.

**Current code (line 28):**
```bash
if $package_manager biome check --write src/; then
```

**Fix — replace with:**
```bash
if $package_manager biome check src/; then
```

The `--write` flag is removed. `biome check` without `--write` reports issues without modifying files (exit code 1 if issues found, 0 if clean).

---

### 8. Type-Safe Order Status Updates

**File:** `src/db/orders.ts`
**Problem:** `updateOrderStatus()` (line 48-50) accepts `status: string` — any arbitrary string. It should only accept valid enum values.
**Risk if unfixed:** Runtime crashes when an invalid status is passed (already happened with `'fulfilled'`).

**Current code (line 48-50):**
```typescript
export async function updateOrderStatus(id: string, status: string) {
  return await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
}
```

**Fix — replace with:**
```typescript
type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'cancelled';

export async function updateOrderStatus(id: string, status: OrderStatus) {
  return await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
}
```

**Key improvements:**
1. TypeScript enforces valid status values at compile time
2. `updatedAt` is set automatically (the schema's `defaultNow()` only applies on INSERT, not UPDATE)
3. Any caller passing an invalid string will get a compile error

---

### 9. Fix Unused Imports and Variables

These are LSP errors already flagged by the build tooling. Quick cleanup.

**`app/src/lib/rate-limit.ts` (line 186, 222):**
- Remove or prefix with `_` the unused `cacheTtl` variables

**`app/src/app/api/waitlist/route.ts` (line 6):**
- Remove unused import `getCachedWaitlistCount`

**`app/e2e/waitlist.spec.ts` (line 19):**
- Rename unused `page` parameter to `_page`

**`app/e2e/auth.spec.ts` (line 3):**
- Remove unused `ChatPage` import

---

## Execution Order

Run these in order — some fixes depend on earlier ones:

```
1. Fix middleware auth scope          (5 min)  — standalone
2. Fix fulfillOrder enum              (5 min)  — standalone
3. Fix user deletion webhook          (10 min) — standalone
4. Wrap createOrder in transaction    (15 min) — standalone
5. Type-safe order status             (10 min) — depends on #2
6. Add database indexes               (20 min) — standalone, generates migration
7. Delete duplicate mainpage schema   (30 min) — standalone, verify build after
8. Fix verify.sh                      (5 min)  — standalone
9. Fix unused imports/variables       (15 min) — standalone
```

**After all fixes:**
```bash
# Run verification
./verify.sh

# Run tests
cd app && bun test

# Build both projects
cd app && bun build && cd ../mainpage && npm run build
```

---

## Post-Fix Verification Checklist

- [ ] `app/middleware.ts` protects `/app(.*)` routes
- [ ] `fulfillOrder` uses `'shipped'` (valid enum value)
- [ ] `handleUserDeleted` deletes the user row after GDPR cleanup
- [ ] `createOrder` uses `db.transaction()`
- [ ] `updateOrderStatus` only accepts `OrderStatus` type
- [ ] Database indexes added to schema (migration generated but not applied)
- [ ] `mainpage/src/db/schema.ts` no longer exists
- [ ] `mainpage/src/db/index.ts` no longer exists
- [ ] `mainpage/src/app/api/test-db/` no longer exists
- [ ] `verify.sh` uses `biome check` (no `--write`)
- [ ] No unused imports/variables in flagged files
- [ ] `./verify.sh` passes
- [ ] `cd app && bun build` succeeds
- [ ] `cd mainpage && npm run build` succeeds

---

*Generated from EVALUATION_FEB06_2026_COMPREHENSIVE_AUDIT.md*
*Co-Authored-By: Claude Opus 4 <noreply@anthropic.com>*
