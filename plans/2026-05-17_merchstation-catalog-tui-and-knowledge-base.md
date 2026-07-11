# MerchStation Catalog TUI + Knowledge Base

> **Created**: 2026-05-17  
> **Updated**: 2026-05-17 (v2 — review fixes applied)  
> **Status**: Ready for Execution  
> **Total Effort**: ~14 hours  
> **Branch**: `feat/crowdfunding-demo`

---

## Changes From v1

| # | What Changed | Why |
|---|-------------|-----|
| 1 | **No demo mode** — focus on live Mistral chat only | Build production-ready from the start, no throwaway work |
| 2 | **Knowledge base: DB only, no JSON files** | Single source of truth, no dual storage confusion |
| 3 | **Both `/app` AND `/mainpage` get knowledge integration** | Two apps, two chat interfaces, both must be accurate |
| 4 | **Typesense sync: TUI calls HTTP reindex API** | Avoids refactoring working sync code; TUI just pings the endpoint |
| 5 | **Table name: `adminUsers`** not `tuiUsers` | Matches existing MerchStation-Plan.md for future compatibility |
| 6 | **Knowledge API: 2 endpoints only** (GET all, POST update) | Simplified; don't build what we don't need yet |
| 7 | **Knowledge content is placeholder** | Victor writes final content later; seed with test data for now |
| 8 | **T9 moved to main session** | Touches core chat logic in both apps — needs careful handling |

---

## Overview

Build the core of MerchStation TUI (product catalog management) and a Knowledge Base layer that stops AI agents from hallucinating about MerchFrom policies, pricing, and operations.

### Scope

**Phase 1**: MerchStation Catalog TUI — Ink/React terminal app with auth, product CRUD, image import to Cloudinary. Product changes ping the reindex API to keep Typesense in sync.

**Phase 2**: Knowledge Base — Structured facts in `appSettings` table (single source of truth), injected into Mistral system prompts for both `/app` and `/mainpage` chat. Content is placeholder test data for now; Victor finalizes later.

### What's NOT in scope

- Full MerchStation (orders, waitlist, analytics, campaigns, Leopoldo AI panel)
- Web admin dashboard
- Multi-user RBAC (single passphrase for now, `adminUsers` table ready for expansion)
- Demo mode / scripted responses
- Production deployment of TUI

### Acceptance Criteria

1. TUI launches, authenticates with passphrase, connects to Neon DB
2. Can list, view, add, edit catalog products from terminal
3. Can import local images → Cloudinary → product_images table
4. Product changes ping Typesense reindex API (app server must be running)
5. Both `/app` and `/mainpage` chat use verified knowledge base facts
6. Agents never hallucinate pricing, shipping, or policies — they use DB-sourced facts
7. Can edit knowledge settings from TUI
8. Both `/app` and `/mainpage` build cleanly

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    YOUR TERMINAL                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              MerchStation (Ink/React)               │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ Sidebar  │  │  Main Panel  │  │  Status Bar │  │  │
│  │  │          │  │              │  │             │  │  │
│  │  │ Login    │  │  Catalog     │  │  DB Status  │  │  │
│  │  │ Catalog  │  │  Categories  │  │  User       │  │  │
│  │  │ Images   │  │  Colors      │  │  Time       │  │  │
│  │  │ Settings │  │  Sizes       │  │             │  │  │
│  │  │          │  │  Settings    │  │             │  │  │
│  │  └──────────┘  └──────────────┘  └─────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Neon PostgreSQL│   │ Cloudinary   │    │ Reindex API  │
│ (Drizzle ORM) │    │ (upload API) │    │ (HTTP ping)  │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Typesense    │
                                        │ (auto-sync)  │
                                        └──────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Bun | Fast TypeScript runtime |
| **TUI Framework** | Ink 5.x + React 18 | Terminal UI components |
| **UI Components** | @inkjs/ui 2.0 | TextInput, Select, Spinner, etc. |
| **Database** | Drizzle ORM (shared from `/src/db`) | Type-safe SQL |
| **DB Driver** | @neondatabase/serverless | Neon connection |
| **Auth** | argon2 + Node.js crypto | Passphrase hashing + AES-256-GCM config encryption |
| **Cloudinary** | cloudinary npm package | Image upload API |
| **Validation** | Zod | Schema validation |
| **State** | Zustand | Global state management |

---

## Task Breakdown

### Phase 1: MerchStation Catalog TUI (~8 hours)

#### T1: TUI Scaffold & Auth (2h)
**Goal**: Working TUI that authenticates and connects to Neon DB.

- **T1.1**: Initialize `merchstation/` with Bun, Ink, React, dependencies
- **T1.2**: Set up project structure: `src/app.tsx`, `src/screens/`, `src/components/`, `src/lib/`
- **T1.3**: Build layout shell: sidebar nav, main content area, status bar
- **T1.4**: Implement keyboard navigation (arrow keys, Enter, Escape, Ctrl+Q)
- **T1.5**: Create `adminUsers` table in schema (id, name, argon2_hash, role, is_active, created_at)
- **T1.6**: Build login screen: passphrase input → argon2 verify → decrypt config → connect DB
- **T1.7**: Create encrypted config file (`~/.config/merchstation/config.enc`): stores Neon URL, Cloudinary creds, Typesense API key, app server URL (for reindex ping)
- **T1.8**: First-launch flow: if no config exists, prompt for all credentials, encrypt, save

**[CRITICAL]** The TUI's `db.ts` must create its OWN Neon+Drizzle connection from decrypted config values (set `process.env.DATABASE_URL` before importing Drizzle). Do NOT import `/src/db/index.ts` directly — it has a different env loading pattern.

**Files**:
- `merchstation/package.json`
- `merchstation/tsconfig.json`
- `merchstation/src/app.tsx`
- `merchstation/src/screens/login.tsx`
- `merchstation/src/components/sidebar.tsx`
- `merchstation/src/components/status-bar.tsx`
- `merchstation/src/lib/db.ts`
- `merchstation/src/lib/auth.ts`
- `merchstation/src/lib/config.ts`
- `merchstation/src/lib/encryption.ts`
- `src/db/schema.ts` (add `adminUsers` table)

**Acceptance**: `bun run dev` launches TUI, first-run prompts for credentials, subsequent runs require passphrase, DB connection works.

---

#### T2: Catalog List Screen (1.5h)
**Goal**: Table view of all catalog products with search, filter, pagination.

- **T2.1**: Build reusable table component for TUI (columns, rows, selection, pagination)
- **T2.2**: Fetch `catalogProducts` from DB, display in table
- **T2.3**: Add columns: SKU, Name, Category, Brand, Base Cost, Retail, Status
- **T2.4**: Implement pagination (20 per page, Prev/Next)
- **T2.5**: Add filter by category (dropdown) and status (active/archived/discontinued)
- **T2.6**: Add search by name/SKU (text input)
- **T2.7**: Select product → navigate to detail screen (T3)
- **T2.8**: Press `A` → navigate to add product screen (T4)

**[GOTCHA]** Verify `ink-table@3.1` works with Ink 5. If it doesn't, build a minimal table component (padded columns + borders) — it's simpler than debugging a broken dependency.

**Files**:
- `merchstation/src/screens/catalog/list.tsx`
- `merchstation/src/components/table.tsx`
- `merchstation/src/components/pagination.tsx`
- `merchstation/src/components/filter-bar.tsx`

**Acceptance**: Can browse all products, filter by category/status, search by name/SKU, navigate to detail.

---

#### T3: Product Detail & Edit Screen (2h)
**Goal**: View and edit individual product details.

- **T3.1**: Fetch full product by ID (with category, variants, images) using `getFullProductById()` from `catalog.ts`
- **T3.2**: Display product details: name, SKU, description, category, brand, material, weight, pricing, status
- **T3.3**: Show variants list (color + size + inventory)
- **T3.4**: Show images list (type, primary flag, URL)
- **T3.5**: Show pricing history (field changed, old value, new value, date, reason)
- **T3.6**: Edit mode: toggle fields editable (name, description, base cost, retail price, status)
- **T3.7**: Save → update PostgreSQL via `updateCatalogProduct()` → log pricing history → ping reindex API

**[ARCH]** Typesense sync via HTTP: after saving, the TUI calls `POST http://localhost:3000/api/search/admin/reindex` (or whatever port the app server runs on). If the app server isn't running, show a warning but don't block the save. This avoids refactoring the existing working Typesense sync code.

**Files**:
- `merchstation/src/screens/catalog/detail.tsx`
- `merchstation/src/screens/catalog/edit.tsx`
- `merchstation/src/components/product-form.tsx`
- `merchstation/src/lib/sync.ts` (HTTP reindex ping helper)

**Acceptance**: Can view full product details, edit fields, save changes, see pricing history. Typesense reindex attempted after save.

---

#### T4: Add Product Screen (1.5h)
**Goal**: Create new catalog products from TUI.

- **T4.1**: Build product creation form with fields: SKU, name, description, category (select), brand, material, weight, base cost, suggested retail, status
- **T4.2**: Validate with Zod (SKU unique, required fields, positive prices)
- **T4.3**: Save → insert into `catalogProducts` → ping reindex API
- **T4.4**: After save, prompt: "Import images for this product? (Y/n)"
- **T4.5**: If Y, navigate to image import screen (T5) pre-selected for this product

**Files**:
- `merchstation/src/screens/catalog/add.tsx`

**Acceptance**: Can create new product, validation works, product appears in list, reindex ping sent.

---

#### T5: Image Import & Cloudinary Upload (1.5h)
**Goal**: Import local images → upload to Cloudinary → link to product.

- **T5.1**: Prompt for local folder path (e.g., `~/merchfrom-assets/products/hypster-tee/`)
- **T5.2**: Scan folder for image files (.jpg, .png, .webp)
- **T5.3**: Display found images in list, let user select which to upload
- **T5.4**: Upload each selected image to Cloudinary
- **T5.5**: For each uploaded image, prompt for: image type (front/back/detail/lifestyle/swatch), is primary? (Y/n), display order, alt text (optional)
- **T5.6**: Save all to `product_images` table
- **T5.7**: Ping reindex API
- **T5.8**: Show summary: "X images uploaded, Y saved to database"

**Files**:
- `merchstation/src/screens/catalog/images.tsx`
- `merchstation/src/lib/cloudinary.ts`

**Acceptance**: Can point to local folder, upload images to Cloudinary, assign metadata, save to DB, reindex ping sent.

---

#### T6: Category/Color/Size Management (1h)
**Goal**: Manage reference data that products depend on.

- **T6.1**: Categories screen: list all, add new (name, slug, description), toggle active/inactive
- **T6.2**: Colors screen: list all, add new (name, hex code), toggle active/inactive
- **T6.3**: Sizes screen: list sizes by category, add new (name, measurements), toggle active/inactive
- **T6.4**: All changes save to PostgreSQL immediately

**Files**:
- `merchstation/src/screens/categories.tsx`
- `merchstation/src/screens/colors.tsx`
- `merchstation/src/screens/sizes.tsx`

**Acceptance**: Can manage categories, colors, sizes from TUI.

---

### Phase 2: Knowledge Base (~6 hours)

#### T7: Knowledge Base Schema & Seed Data (1.5h)
**Goal**: Structured facts about MerchFrom stored in `appSettings` table only. **Single source of truth. No JSON files.**

- **T7.1**: Add `valueJson` JSONB column to `appSettings` table (for structured data like shipping matrices, pricing tiers)
- **T7.2**: Create seed script (`src/db/seed-knowledge.ts`) that populates `appSettings` with placeholder test data:

  **Flat key-value settings** (using existing `value` text column):
  - `shipping_eu_days`: "7-14"
  - `shipping_uk_days`: "10-18"
  - `shipping_intl_days`: "14-21"
  - `shipping_eu_cost`: "Free over €50, €4.90 otherwise"
  - `revenue_split`: "50/50 (artist/platform)"
  - `return_policy_days`: "30"
  - `return_policy`: "Free replacement for quality issues, full refund if we can't make it right"
  - `facility_location`: "Castelo Branco, Portugal"
  - `production_capacity`: "On-demand print-on-demand, no minimums"
  - `production_lead_time`: "5-7 business days"
  - `sustainability`: "Vegan, fair-trade, organic blanks as standard"
  - `payment_methods`: "Visa, MC, Amex, Apple Pay, Google Pay, PayPal, USDC (Polygon)"
  - `payment_gateway`: "NexaPay (primary), Stripe (backup)"

  **Structured data** (using new `valueJson` JSONB column):
  - `product_catalog_summary`: `[{ sku, name, brand, baseCost, material, weightGsm }]`
  - `shipping_rates`: `{ eu, uk, us, international }` with costs and carriers
  - `pricing_rules`: `{ markup_min, markup_recommended, bulk_discounts }`

- **T7.3**: Seed script is idempotent — re-running it upserts (updates if exists, inserts if not)

**[DEP]** Content is **placeholder test data** for now. Victor writes final content later.

**Files**:
- `src/db/schema.ts` (add `valueJson` column to `appSettings`)
- `src/db/seed-knowledge.ts`
- `src/db/knowledge.ts` (CRUD functions: `getAllSettings()`, `getSetting(key)`, `updateSetting(key, value)`, `getKnowledgeForPrompt()`)

**Acceptance**: `bun run src/db/seed-knowledge.ts` populates all settings. Re-running is safe (upserts).

---

#### T8: Knowledge API (1h)
**Goal**: API endpoint for agents to access knowledge. **Simplified to 2 endpoints.**

- **T8.1**: `GET /api/knowledge` — returns all settings (both flat and JSONB) as single JSON object
- **T8.2**: `POST /api/knowledge` — update a setting (requires Clerk auth, key + value in body)
- **T8.3**: `getKnowledgeForPrompt()` server-side function in `/src/db/knowledge.ts` — loads from DB, formats as concise text block for system prompt injection, 5-minute in-memory TTL cache

**[CRITICAL]** This function must live in `/src/db/knowledge.ts` so BOTH `/app` and `/mainpage` can import it. Both apps already import from `/src/db/`.

**Files**:
- `src/db/knowledge.ts` (shared — importable by both apps)
- `app/src/app/api/knowledge/route.ts`
- `mainpage/src/app/api/knowledge/route.ts` (same route for mainpage)

**Acceptance**: API returns knowledge, can update settings, both apps can call `getKnowledgeForPrompt()`.

---

#### T9: Agent Integration — Both Apps (2h)
**Goal**: Wire knowledge base into Mistral system prompts for both `/app` and `/mainpage`.

- **T9.1**: In `app/src/lib/ai/mistral-chat.ts`, update `getSystemPrompt()` to call `getKnowledgeForPrompt()` and inject a "VERIFIED FACTS ABOUT MERCHFROM" section
- **T9.2**: Do the SAME in `mainpage/src/lib/ai/mistral-chat.ts`
- **T9.3**: Add anti-hallucination constraint to system prompt: "For any question about MerchFrom policies, pricing, shipping, or operations, use ONLY the verified facts below. If the answer is not in the verified facts, say you don't know and offer to connect with a human."
- **T9.4**: Test both apps: ask agents about shipping times, pricing, return policy — verify they use verified facts
- **T9.5**: Verify chat still works when knowledge DB is empty (graceful fallback — no facts section injected)

**[CRITICAL]** Knowledge is fetched per-request with TTL cache, NOT at startup. Serverless/Vercel cold starts mean there is no persistent "startup". The `getKnowledgeForPrompt()` function handles caching internally (5-min TTL).

**Files**:
- `app/src/lib/ai/mistral-chat.ts` (update `getSystemPrompt()`)
- `mainpage/src/lib/ai/mistral-chat.ts` (update `getSystemPrompt()`)
- `app/src/app/api/chat/unified/route.ts` (pass knowledge to chat provider)
- `mainpage/src/app/api/chat/unified/route.ts` (same)

**Acceptance**: Both apps' chat agents answer with verified facts, don't hallucinate pricing/shipping/policies. Graceful fallback when DB is empty.

---

#### T10: TUI Settings Screen (1.5h)
**Goal**: Edit platform settings (knowledge base) from TUI.

- **T10.1**: Settings screen: list all `appSettings` in editable table
- **T10.2**: Edit any setting inline, save → update PostgreSQL
- **T10.3**: View/edit JSONB structured data (formatted display, raw JSON edit mode)
- **T10.4**: After save, show confirmation: "Settings updated. Agents will use new facts within 5 minutes (cache TTL)."
- **T10.5**: Add "Run seed script" option to reset to defaults

**Files**:
- `merchstation/src/screens/settings.tsx`
- `merchstation/src/components/settings-editor.tsx`

**Acceptance**: Can view/edit all settings from TUI, changes persist, agents get updated facts after cache expires.

---

## Parallelization Map

```
Group A (parallel, no dependencies):
  ┌─ T1: TUI Scaffold & Auth (2h)
  └─ T7: Knowledge Base Schema & Seed Data (1.5h)

Group B (parallel, after Group A):
  ┌─ T2: Catalog List Screen (1.5h)      [depends on T1]
  └─ T8: Knowledge API (1h)              [depends on T7]

Group C (parallel, after Group B):
  ┌─ T3: Product Detail & Edit (2h)      [depends on T2]
  ├─ T4: Add Product Screen (1.5h)       [depends on T2]
  └─ T9: Agent Integration Both Apps (2h) [depends on T8]

Group D (parallel, after Group C):
  ┌─ T5: Image Import (1.5h)             [depends on T3]
  ├─ T6: Category/Color/Size (1h)        [depends on T2]
  └─ T10: TUI Settings (1.5h)            [depends on T9 + T1]
```

---

## Subagent Assignment

| Task | Assignment | Reason |
|------|-----------|--------|
| T1 | Main session | Auth + DB connection is foundational |
| T2 | Subagent (writer) | Independent screen |
| T3 | Subagent (writer) | Depends on T2 |
| T4 | Subagent (writer) | Parallel with T3 after T2 |
| T5 | Subagent (writer) | Depends on T3 |
| T6 | Subagent (writer) | Depends on T2, simple CRUD screens |
| T7 | Subagent (writer) | Independent DB work |
| T8 | Subagent (writer) | Depends on T7 |
| T9 | Main session | Touches both apps' core chat logic — needs careful handling |
| T10 | Subagent (writer) | Depends on T9 + T1 |

---

## Execution Order

1. **Start T1 + T7 in parallel** (main session + subagent)
2. **When T1 done → start T2** (subagent)
3. **When T7 done → start T8** (subagent)
4. **When T2 done → start T3 + T4 + T6 in parallel** (3 subagents)
5. **When T8 done → start T9** (main session — careful work)
6. **When T3 done → start T5** (subagent)
7. **When T9 done → start T10** (subagent)

---

## Dependencies

- Neon PostgreSQL database (existing)
- Cloudinary account with upload API key (existing)
- Typesense Cloud cluster (existing, EU region)
- Bun runtime installed
- `/src/db/schema.ts` already has `appSettings`, all catalog tables
- `/src/db/catalog.ts` already has full CRUD (551 lines)
- Both `/app` and `/mainpage` have working Mistral chat (`mistral-chat.ts`)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| `ink-table` incompatible with Ink 5 | Build minimal table component (padded columns + borders) |
| Cloudinary upload failures | Retry logic, clear errors, partial upload recovery |
| Typesense reindex fails (app server not running) | Show warning, don't block save. Retry on next edit. |
| Auth config file lost | Re-run setup wizard to re-enter credentials |
| Knowledge base content wrong | Placeholder data for now; Victor finalizes content later |
| Per-request knowledge fetch is slow | 5-minute TTL cache in `getKnowledgeForPrompt()` |

---

## Post-Implementation Checklist

- [ ] TUI launches and authenticates
- [ ] Can list, search, filter catalog products
- [ ] Can view and edit product details
- [ ] Can add new products
- [ ] Can import images from local folder to Cloudinary
- [ ] Can manage categories, colors, sizes
- [ ] Knowledge base seeded with placeholder data
- [ ] `GET /api/knowledge` returns correct data from both apps
- [ ] `/app` chat uses verified facts (no hallucination)
- [ ] `/mainpage` chat uses verified facts (no hallucination)
- [ ] Can edit settings from TUI
- [ ] Both `/app` and `/mainpage` build cleanly
- [ ] Commit and push to `feat/crowdfunding-demo`
