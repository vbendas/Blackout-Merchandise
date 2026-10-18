# Agent 1: Database Specialist

> **Focus:** Database operations, schema design, migrations, data persistence  
> **Phase 3.5-3.6 Estimated Time:** 5-6 hours  
> **Role Lead:** Database architect for all phases

---

## Phase 3.5-3.6 Assignment Summary

**Primary Task:** 3.5.0 (Database Schema Updates) + Seed Data  
**Secondary Task:** DB operations for waitlist enhancements

| Task | Subtasks | Est. Time | Status |
|------|----------|-----------|--------|
| 3.5.0 | 6 subtasks | 5-6 hours | 🔄 READY TO START |
| Seed Data | Product blanks seeding | 2 hours | ⏳ Depends on schema |

---

## Task 3.5.0: Database Schema Updates

### Overview
Update Drizzle schema to support:
1. Enhanced waitlist table (for AI interview data)
2. New productBlanks table (for catalog system)
3. Message type system (TypeScript types)

### Detailed Subtasks

#### 3.5.0.1: Update Waitlist Table
**File:** `/src/db/schema.ts`  
**Est. Time:** 30 min

**Current Schema:**
```typescript
export const waitlist = pgTable('waitlist', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    notified: boolean('notified').default(false).notNull(),
});
```

**New Fields to Add:**
- `socialLink` (text, optional) - Instagram/TikTok URL
- `followerRange` (text, optional) - "1k-10k", "10k-50k", etc.
- `interviewResponses` (jsonb, optional) - AI interview Q&A responses
- `source` (text, default 'organic') - Where they came from
- `position` (integer, optional) - Calculated waitlist position
- `status` (text, default 'pending') - pending, approved, rejected

**Success Criteria:**
- [ ] Fields added to schema
- [ ] Types are correct (text, jsonb, etc.)
- [ ] Defaults are set appropriately
- [ ] No duplicate field names

---

#### 3.5.0.2: Create productBlanks Table
**File:** `/src/db/schema.ts`  
**Est. Time:** 30 min

**New Table:**
```typescript
export const productBlanks = pgTable('product_blanks', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),                    // e.g., "Classic T-Shirt"
    category: text('category').notNull(),             // tee, hoodie, sweater, etc.
    brand: text('brand'),                             // Stanley Stella, Gildan, etc.
    sku: text('sku'),                                 // Supplier SKU
    description: text('description'),                 // Full product description
    baseCost: integer('base_cost').notNull(),        // In cents (e.g., 1500 = €15.00)
    suggestedRetail: integer('suggested_retail'),    // Recommended price
    imageUrls: jsonb('image_urls').notNull(),       // Array: [{ url, alt, color }]
    colors: jsonb('colors'),                         // Array: [{ name, hex, imageUrl }]
    sizes: jsonb('sizes'),                           // Array: [{ size, available }]
    specs: jsonb('specs'),                           // { material, weight, fit, etc. }
    sustainabilityBadges: jsonb('sustainability_badges'), // eco, fair-trade, vegan, etc.
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Success Criteria:**
- [ ] All fields present
- [ ] JSONB fields properly typed
- [ ] Timestamps auto-generated
- [ ] Constraints applied (notNull, unique, etc.)

---

#### 3.5.0.3: Generate & Run Drizzle Migration
**File:** Command line  
**Est. Time:** 15 min

**Steps:**
```bash
# From project root
bunx drizzle-kit generate postgresql
# Review changes in /drizzle directory
bunx drizzle-kit push
# Verify in Neon dashboard
```

**Success Criteria:**
- [ ] Migration files generated in `/drizzle/`
- [ ] Migration runs without errors
- [ ] Tables visible in Neon dashboard
- [ ] No SQL syntax errors

---

#### 3.5.0.4: Update waitlist.ts Operations
**File:** `/src/db/waitlist.ts`  
**Est. Time:** 30 min

**Current Operations:**
- `addToWaitlist(email, name)`
- `getWaitlist()`
- `markAsNotified(email)`

**New Operations to Add:**
```typescript
// Save interview responses
export async function saveInterviewResponses(
  email: string, 
  responses: Record<string, string>
) { ... }

// Get waitlist position
export async function getWaitlistPosition(email: string): Promise<number> {
  // Count how many emails are earlier in the list
}

// Update status (approved, rejected)
export async function updateWaitlistStatus(
  email: string, 
  status: 'pending' | 'approved' | 'rejected'
) { ... }

// Get by email (for lookups)
export async function getWaitlistEntry(email: string) { ... }
```

**Success Criteria:**
- [ ] All functions tested with sample data
- [ ] Proper error handling (e.g., entry not found)
- [ ] Types are correct (TypeScript)
- [ ] Functions follow existing patterns

---

#### 3.5.0.5: Create productBlanks.ts Operations
**File:** `/src/db/productBlanks.ts` (NEW)  
**Est. Time:** 45 min

**Operations to Create:**
```typescript
// Get all blanks (with filters)
export async function getProductBlanks(
  category?: string,
  isActive?: boolean
) { ... }

// Get by ID
export async function getProductBlankById(id: string) { ... }

// Get by category
export async function getProductBlanksByCategory(category: string) { ... }

// Search by name
export async function searchProductBlanks(query: string) { ... }

// Create new blank
export async function createProductBlank(
  data: typeof productBlanks.$inferInsert
) { ... }

// Update blank
export async function updateProductBlank(
  id: string,
  data: Partial<typeof productBlanks.$inferSelect>
) { ... }
```

**Success Criteria:**
- [ ] All CRUD operations working
- [ ] Filtering works correctly
- [ ] Search is case-insensitive
- [ ] Functions follow existing patterns
- [ ] TypeScript types correct

---

#### 3.5.0.6: Create Message Types File
**File:** `/app/src/types/chat.ts`  
**Est. Time:** 30 min

**TypeScript Types for Message System:**
```typescript
export type MessageType = 'text' | 'product' | 'mockup' | 'design' | 'carousel';

export interface MessageContent {
  type: MessageType;
  text?: string;
  productIds?: string[];        // For product card suggestions
  mockupUrl?: string;            // For mockup cards
  designUrl?: string;            // For design cards
  designPrompt?: string;         // The prompt used to generate
  designStyle?: string;          // Which style preset was used
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent;
  agent: AgentName;
  timestamp: Date;
}
```

**Success Criteria:**
- [ ] All message types defined
- [ ] Types are extensible for future card types
- [ ] Used throughout chat components
- [ ] No TypeScript errors

---

## Task: Seed Product Blanks Data

### Overview
Populate the `productBlanks` table with initial merchandise options.

**File:** `/src/db/seed/productBlanks.ts` (NEW)  
**Est. Time:** 2 hours

**What to Seed:**
- 15-20 product blanks across 5 categories
- Categories: Tees, Hoodies, Sweaters, Caps, Bags
- Include realistic data: colors, sizes, specs, prices, images

**Sample Data Structure:**
```typescript
{
  name: "Classic Unisex T-Shirt",
  category: "tee",
  brand: "Stanley Stella",
  sku: "STNR110",
  baseCost: 1500,  // €15.00
  suggestedRetail: 2995,  // €29.95
  colors: [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Navy", hex: "#001F3F" }
  ],
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  specs: {
    material: "100% organic cotton",
    weight: "155 g/m²",
    fit: "regular",
    origin: "Portugal"
  },
  sustainabilityBadges: ["organic", "fair-trade", "vegan"]
}
```

**Success Criteria:**
- [ ] 15-20 blanks in database
- [ ] All categories represented
- [ ] Realistic pricing (€15-50)
- [ ] Image URLs point to Cloudinary
- [ ] Seed script runs without errors

---

## Dependencies

### Blocking Other Agents:
- **Agent 2:** Needs schema before creating catalog API routes
- **Agent 3:** Needs seed data before building catalog UI

### Depends On:
- None! This is a foundation task

---

## Timeline

**Week 1 (Jan 27-29):**
- Start immediately: All 6 subtasks (5-6 hours)
- Day 1: 3.5.0.1-3.5.0.3 (Schema updates + migration)
- Day 2: 3.5.0.4-3.5.0.6 (DB operations + types)

**Week 2 (Feb 2-6):**
- Task: Seed data (2 hours, after API ready)
- Coordinate with Agent 2 on API design

---

## Testing Checklist

Before marking complete, verify:
- [ ] Connect to Neon dashboard and view new tables
- [ ] Run sample queries: `SELECT * FROM waitlist`
- [ ] Test all DB operation functions with mock data
- [ ] Check TypeScript compilation (no errors)
- [ ] Verify message types work in chat components
- [ ] Seed script populates data correctly

---

## Code Patterns to Follow

**Existing Pattern in `/src/db/products.ts`:**
```typescript
import { db } from './index';
import { products } from './schema';
import { eq, and } from 'drizzle-orm';

export async function getProductById(id: string) {
  return await db.select().from(products).where(eq(products.id, id)).limit(1);
}
```

**Follow this pattern for all new operations.**

---

## Deliverables

When complete, provide:
1. ✅ Updated `/src/db/schema.ts` with new tables + relations
2. ✅ Migration files in `/drizzle/`
3. ✅ Updated `/src/db/waitlist.ts`
4. ✅ New `/src/db/productBlanks.ts`
5. ✅ New `/app/src/types/chat.ts`
6. ✅ Seed data script (run and verify in Neon)
7. ✅ Brief README explaining schema changes

---

**Status:** READY TO START  
**Estimated Completion:** Jan 29, 2026 (schema) + Feb 6, 2026 (seed data)  
**Owner:** Agent 1 (Database Specialist)
