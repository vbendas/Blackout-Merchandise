# MerchFrom Development Log

**Purpose:** Track daily progress, technical decisions, and session outcomes for development accountability
**Last Updated:** October 16, 2026
**Project Status:** Phase 3 - Frontend Content Suite (In Progress)

---

## October 16, 2026 — Print Prep: Shop Prices and Print Areas

### Session Summary
Built shop prices per garment, several print areas per product (a front, a back and sleeve prints, each with its own design), and flat sleeve proofs, on branch `feat/print-prep`. Not committed yet. Pending integration review and the owner's checks.

### Work Completed

#### Shop prices (`platform/lib/pricing/`, `/admin/pricing`)
- Each garment has a base price for shop products (DTG/DTF). It covers one print area up to A2, on the front or the back.
- Extras: €1 when the print is on both front and back, and €2 once for sleeve prints (one or both sleeves).
- The price table is one JSON row in `app_settings` (`pod_price_table`), so it needs no migration.
- Unset garments are placeholders: the DTG base cost at quantity 1, or DTF where the garment has no DTG.
- `/admin/pricing?tab=shop` has search, filters, "set all of a type", an optional DTF price, and live examples.
- Embroidery keeps its own base cost and gets no extras.

#### Several print areas (`platform/lib/mockups/placements.ts`, `products.placements`)
- A product holds a list of print areas, `{ position, widthCm, offsetYcm?, designId }`. Each area has its own design.
- Rules: one front, one back, sleeves only on garments with sleeves, and A2 at most (portrait, 42 × 59.4 cm).
- Default sleeve print sizes: 10 × 10 cm for a short sleeve, 8 × 40 cm for a long sleeve.
- Migration `0005_products_print_areas` is additive. It copies the old `placement` and `design_id` into the list. The old column is read as a fallback and is no longer written.
- Artists see the price breakdown and their margin when they add areas. Product cards and the panel show the areas, with buttons such as "Add a back print" and "Add a sleeve print".
- Publishing needs every area approved. The approval page has an area button for each one.
- Agent tools: `create_product` takes areas, the new `set_print_areas` changes them, `get_quote` prices shop products from the shop table, and `prepare_print` prepares every area, one job per design.
- Runs carry a product's other areas as `extraPlacements`. Each run position reads its own design's screen files (`platform/lib/services/quotes.ts`).

#### Sleeve prints (`platform/lib/mockups/sleeve-proof.ts`, `sleeve-geometry.ts`)
- A sleeve print is a flat, true-size proof on a sleeve outline, with dimension brackets and a label.
- The outline uses adult M measurements. The right sleeve is a mirror of the left.
- Proofs are drawn only in the print pipeline, for both techniques, and stored as pack proof files.
- If a proof cannot be drawn (the label needs a system font), the pack shows a `sleeve_proof` review check. The approval page shows a "Sleeve proof coming" card with the size until the proof exists.

### Technical Notes
- `pod-table.ts` holds the price table and its rules. It is pure and safe for the client. `pod.ts` is the server side, with the same exports.
- The base cost is set from the shop price on create, on every area change and at publish. A change that lifts the base cost past the shop price less €1 is refused with `priceNeeded`, and the artist is asked for a new price.
- The worker image has DejaVu, and a serverless build may not. Sleeve proofs are therefore drawn in the worker.

### Not Live Yet
- Nothing from this increment is live.
- Shop prices are placeholders until the owner sets them in `/admin/pricing`.
- Migration `0005` is not applied to Neon. It was tested on PGlite, from `0004`.
- Sleeve proofs are drawn by the worker, so restart it after this change.
- Catalogue "from" prices (`platform/lib/services/blanks.ts`) still read the base-cost rows, not the shop table. The `set_base_cost` tool is on the same to-do.

### Owner Decisions Still Open
- **Sleeve print sizes.** The defaults are 10 × 10 cm (short sleeve) and 8 × 40 cm (long sleeve). Confirm or change.
- **Garments with no sleeve prints.** The list to confirm: dolman tee, puffers and padded jackets, sherpa, bomber, woven shirts, Kids & Baby, and polos.
- **A2 in portrait only.** The build allows A2 in portrait only (42 × 59.4 cm). Confirm.
- **Shop extras on DTG/DTF runs.** The build charges the shop extras for extra areas on DTG/DTF runs. Confirm.

### Key Insights
- The two extras are the same for every garment. The owner sets one base price per garment.
- Sleeve prints are drawn on an outline, not on a photo, because the garment photos are front and back only.
- Publishing waits for every area, so one unapproved sleeve holds back the whole product.

### Commit Details
- **Commit Hash:** none yet. The work is in the working tree on `feat/print-prep`, on top of `65de03a`.
- **Commit Message:** none yet
- **Files Changed:** not counted yet
- **New Files:** `platform/lib/pricing/pod-table.ts` and `pod.ts`, `platform/lib/mockups/sleeve-proof.ts` and `sleeve-geometry.ts`, `platform/drizzle/0005_products_print_areas.sql` with its snapshot, and their tests.

### Files Modified
1. `platform/lib/pricing/` and `platform/lib/services/pricing-admin.ts`: the shop price table and its admin tab.
2. `platform/lib/services/`: products, quotes, runs, print prep, pre-press, job sheets and mockups, so each follows every area.
3. `platform/lib/mockups/placements.ts`: the area rules (`checkPrintAreas`) and the sleeve sizes.
4. `platform/lib/tools/`: `products.ts` (areas on `create_product`, `set_print_areas`), `print.ts`, `bulk.ts` and `mockups.ts`.
5. `src/db/schema.ts` and `platform/drizzle/`: `products.placements` and migration `0005`.
6. Studio and admin screens: the Shop tab of `/admin/pricing`, the product cards and panel, and the approval page.

### Next Steps
- Integration review with Phase 2: typecheck, lint, tests and build together.
- Owner: set the shop prices in `/admin/pricing`, and decide the four open points above.
- Owner: decide on migration `0005` for Neon.

---

## October 16, 2026 — Print Prep: Phase 2 Built

### Session Summary
Built print prep phase 2 on branch `feat/print-prep`: index and simulated process separations, dot-gain calibration, and screen-count pricing for runs. Pending integration review and the owner's checks.

### Work Completed

#### Separation methods (`platform/lib/print/engine/`)
- **Method dispatch:** spot, index or simulated process, chosen per design and screen set. The auditor can override the choice.
- **Index:** square cells at 200 per inch, one ink per cell, no overlap. On dark garments, each ink cell sits on an underbase.
- **Simulated process:** inks are chosen from the art, and their amounts come from the same print model that draws the proofs. All inks print at 55 lpi and 22.5°.
- **Test images** in `platform/scripts/fixtures/print/`: `many-colours-flat.png` for index, and `smooth-gradients.png`, `painted-shading.png` and `low-chroma-tonal.png` for simulated process.

#### Dot-gain calibration (`platform/lib/print/calibration/`)
- A printable chart, 182 × 165 mm.
- Read it by typing in the values, by flatbed scan (Murray–Davies), or later with a spectrophotometer.
- The correction curve applies to every new film. Packs already approved keep their files.
- Lives in the ink system admin area (`/admin/ink-system`).

#### Screen-count pricing (`platform/lib/pricing/`, `/admin/pricing`)
- Quotes take the screen count from the design's current screen pack for each colour and position: the approved version, else the newest. With no pack yet, the quote is an estimate and says why.
- Each screen above 8 adds €1 per piece, up to 15. Shop products are never surcharged.
- `/admin/pricing` holds the price table as one JSON row in `app_settings`, so there is no schema change. The numbers are placeholders.
- Quotes are re-priced when a proof is sent. Approval is refused if the screen count has moved since the quote.
- The quote tool offers to use 8 screens.

### Technical Notes
- These figures compare the model with the art. They are not measured prints, because the inks are not measured yet.
- Simulated process, on the Underwriter art: about ΔE 1.5 (mean) on dark shirts.
- Index, on 12 flat colours at 8 screens: mean ΔE 1.25 on white and 1.5 on black. One lime colour came out at ΔE 12.7 and is flagged.
- Speed: a full 38 cm front at 600 ppi, with two screen sets of 8 films, took 31 s and peaked at 2.2 GB (simulated process). Index on a full front at 600 ppi with 8 films took 1.2 s and 0.92 GB on flat art, and up to 3.7 s and 1.5 GB on painted art.
- Tones past the 5% and 90% mesh limits are dithered cell by cell. That removes contours. It is a design choice for the owner to review.
- Optional env var: `CALIBRATION_SCAN_MAX_MB` sets the largest calibration scan (default 300 MB).

### Not Live Yet
- Nothing from Phase 2 is live. No calibration chart has been printed, and the placeholder prices are not set.

### Commit Details
- **Commit Hash:** Phase 2 is committed locally on `feat/print-prep`, as `39fb225` (code) and `65de03a` (docs), and not pushed. Phases 0 and 1 are in `639fd3a`. The 16 Oct shop pricing and print-areas increment (entry above) is not yet committed.
- **Commit Message:** `feat(print): Phase 2 separation methods, dot-gain calibration and run pricing`; `docs: print prep Phase 2 status, notes, plan, DEVLOG, roadmap and PRD`
- **Files Changed:** not counted yet
- **New Files:** `platform/lib/pricing/`, `platform/lib/print/calibration/`, the index and simulated process modules in `platform/lib/print/engine/`, the `/admin/pricing` page and its components, the calibration page and API routes, and four test images

### Files Modified
1. `platform/lib/print/` — method dispatch, index and simulated process, calibration, shared types and defaults
2. `platform/lib/services/` and `platform/lib/tools/bulk.ts` — quotes, runs, pricing admin, the ink system's dot-gain profile, and the quote tool
3. `platform/app/(chat)/admin/pricing/`, `platform/app/(chat)/admin/ink-system/` and `platform/app/api/calibration/` — pages and routes
4. `platform/components/admin/` and `platform/components/studio/approve/` — pricing and calibration screens, and method panels on the approval screen
5. `platform/scripts/fixtures/print/` — four new test images, with the fixture script and README
6. `Documentation/` — print prep plan, roadmap, PRD and this log

### Key Insights
- The engine chooses the method from the art: spot for flat art, index for bright many-colour art, and simulated process for gradients, photos and painted art.
- Calibration changes only new films. Approved packs keep their files.
- Approval is refused if the screen count has moved since the quote, so the approved count and the price match.

### Next Steps
- Integration review of Phase 2 with Phases 0 and 1: typecheck, lint, tests and build together.
- Owner: set the real prices in `/admin/pricing`. The tiers, quantity breaks, margin and garment costs are placeholders.
- Owner: print the calibration chart and scan it, or type in the readings.
- Owner: measure the inks with the spectrophotometer when it arrives.
- Owner: test the index and simulated process files in Photoshop and GTX Graphics Lab, as in the Phase 1 checks.
- Owner: review the dithering note above.
- Print prep Phase 3: texture and distress library from our own scans, DTF gang sheets, vectorising flat art, RIP hot folders, multi-placement products, per-ink screen angles, and embroidery prep for solid designs in solid colours.

---

## October 15, 2026 — Print Prep: Phases 0 and 1 Built

### Session Summary
Built print prep phases 0 and 1 on branch `feat/print-prep`: one engine for every design, DTG/DTF and screen outputs, production packs with automatic checks, a pre-press audit queue, and staff access by area. Committed locally on `feat/print-prep` (`639fd3a`, `699fcad`, `d88bd7c`), not pushed, and not live yet.

### Work Completed

#### Phase 0: Prerequisites
- Migration `0003_print_prep_and_staff`: print, pack and staff tables, and the `staff` role. Applied to PGlite in tests only.
- Ink system profile seeded from the MagnaPrint HB data sheet (`platform/scripts/seed-print.ts`). It inserts only when no active row exists.
- Print storage (local driver by default, R2 driver written), a job table using `FOR UPDATE SKIP LOCKED`, and a worker loop (`platform/worker/print-worker.ts`).
- Test fixtures in `platform/scripts/fixtures/print/`.

#### Engine (`platform/lib/print/engine/`)
- Physical units, OKLab and CIEDE2000 colour, clean and knockout, AM halftone, marks and label strips, proofs and loupes.
- Spot separations: ink extraction, edge folding, traps, underbase with choke, highlight white and screen sets.
- DTG/DTF branch with PNG export. Alpha is strictly 0 or 255.
- Art that needs index or simulated process returns a spot draft flagged `needsManual` for the auditor.

#### Production packs (`platform/lib/print/pack/`)
- Screen PSD (one layer per ink, colour overlays switched off), DTG/DTF PSD, DTG PNG, film previews.
- PSD reader for corrected uploads, and the manifest.
- Job sheet: one A4 landscape PDF per design, covering every garment that uses it (shop products and open run lines, screen sets, DTG/DTF files, proofs, checks, pieces waiting, audit sign-off). Made on demand and kept by a hash of what it says (`platform/lib/services/job-sheets.ts`), so it is made again exactly when its contents change. Opened by Pre-press or Production View from `/api/job-sheets/<design id>`, and linked from the pack page, the production table and the order card.
- Automatic checks on every pack, re-read with an independent decoder.

#### Studio and shop
- Final render at 4K before approval. Drafts stay at 1K. Edits anchor on the current version.
- Capsules carry print recipes, with prompt fixes.
- Shop products are DTG/DTF only. DTF is offered on all 122 blanks.
- Approval page at `/studio/approve/[designId]`, one approval per design.

#### Permissions and pre-press
- Roles owner, staff and artist. Levels none, view, work and manage per area, checked by one `can()` function (`platform/lib/auth/permissions.ts`).
- `/admin/team`, with invites and an activity log. Staff Clerk accounts are created at invite time; the real Clerk call is not yet tested.
- Pre-press queue (`/admin/prepress`), pack detail, ink system page (`/admin/ink-system`), and corrected PSD upload straight to storage.
- Pantone codes appear in admin only. Clients see plain colour names from `lib/print/colour-names.ts`.

### Technical Notes
- Test front (28 × 33.6 cm, 600 ppi, 8 films, 4K original): RLE PSD 193 MB, or 272 MB with every plate halftoned. ZIP was 3 to 5 times slower and the independent decoder could not read it, so RLE is the default.
- Full front (38 × 46 cm, 600 ppi, 8 plates) in an engine test: separation 8.9 s, proof and loupe 2.0 s, DTG 1.0 s, peak memory 1.3 GB.
- Ink opacities are estimates, and proof thresholds are not calibrated. Dot-gain calibration is Phase 2.
- Until the spectrophotometer arrives, proofs use each ink's target colour from the art.
- Owner decisions, 15 Oct: DTF on every blank, including bags, accessories, beanies and jackets. Embroidery later, for solid designs in solid colours only.

### Not Live Yet
- Migration `0003` is not applied to Neon. Ask the owner first.
- R2 is not set up, and the R2 driver is untested against the real service. The worker host and its Dockerfile are not set up. Corrected PSD uploads need the worker running.
- The screen PSD is not yet opened in Photoshop, and no films have been printed from it. The PNG is not yet opened in Brother GTX Graphics Lab. No test print has been made.
- Dev-only images in `platform/public/dev/print-mock/` (2.9 MB) must be removed or moved before deploy.
- Deploy: R2 bucket CORS for browser uploads, and a lifecycle rule for `prepress-uploads/`. Optional: a lifecycle rule for `job-sheets/` (the stored job sheets are a cache; one that expired is just made again).
- Beanie and bucket-hat print boxes reuse the bag table (unverified). Joggers STBU157 and STBU185 only partly overlap their box.

### Commit Details
- **Commit Hash:** `639fd3a` (code), `699fcad` (docs), `d88bd7c` (local demo mode), committed locally on `feat/print-prep` from `22678b3`, not pushed
- **Commit Message:** `feat(platform): print prep Phase 0 and 1`; `docs: print prep plan, build notes, approved mocks and decision updates`; `chore(platform): local demo mode for print prep`
- **Files Changed:** not counted yet
- **New Files:** most print prep code under `platform/lib/print/`, `platform/worker/`, the approval and pre-press pages, and `platform/drizzle/0003_print_prep_and_staff.sql`

### Files Modified
1. `platform/lib/print/` — engine, pack, pipeline, jobs and the frozen types
2. `platform/lib/auth/permissions.ts` — roles, levels and `can()`, used by tools, pages and actions
3. `platform/lib/services/` — print-prep, prepress, pantone-library, ink-system, print-storage and team services
4. `platform/app/(chat)/studio/approve/`, `platform/app/(chat)/admin/prepress/`, `platform/app/(chat)/admin/ink-system/`, `platform/app/(chat)/admin/team/` — pages
5. `src/db/schema.ts` and `platform/drizzle/0003_print_prep_and_staff.sql` — schema and migration
6. `platform/scripts/seed-print.ts` and `platform/scripts/fixtures/print/` — seed and fixtures
7. `Documentation/` — PRD, roadmap, image architecture, print prep plan, and this log

### Key Insights
- Regenerating art after approval can change details the client approved. The post-approval 4K re-render is dropped, and only deterministic steps run after approval.
- AutoThresh is a behaviour reference only. Its licence wording is not on file, so none of its code or assets ships.
- The old Python print services are not extended. Their CIEDE2000 code and `Assets/test_design.png` stay as reference and test fixture.

### Next Steps
- Integration review (WP10): full typecheck, lint, tests and build together, plus a security review of the permission checks.
- Owner: decide on migration `0003` for Neon, and set up R2 and the worker host.
- Owner checks: Photoshop, GTX Graphics Lab and a test print, as in Phase 1 acceptance.
- Print prep Phase 2: index and simulated process separations, dot-gain calibration, screen-count pricing.

---

## January 18, 2026 — Mobile & iPad Responsive Polish

### Session Summary
Investigated "disappeared" responsive polish changes (they were never committed to git), then committed comprehensive mobile/iPad responsive improvements to the mainpage website.

### Work Completed

#### Hamburger Menu Fixes (`mainpage/src/components/layout/navbar.tsx`)
- Moved `NavbarMenuToggle` from inside `NavbarContent` to direct child of `Navbar` (HeroUI pattern requirement)
- Replaced `NavbarMenuToggle` with custom Button component using Icon from `@iconify/react`
- Fixed z-index hierarchy:
  - Navbar: `z-[60]`
  - Hamburger: `!z-[9999]`
  - Mobile menu: `!z-[100]`
  - Social proof: `z-[55]`
  - Logo: `z-40`
- Positioned hamburger on right side with absolute positioning: `absolute right-4 top-1/2 -translate-y-1/2`
- Added `isMenuOpen={isMenuOpen}` controlled state to Navbar component
- Standardized breakpoints from `sm:` to `md:` across navbar (640px→768px)

#### Mobile Responsiveness Polish

**`mainpage/src/app/globals.css`**
- Added custom media query for small phones: `@custom-media --small-phone (max-width: 389px)`
- Added fluid typography system using `clamp()`:
  - `.text-fluid-xs` through `.text-fluid-5xl` utilities
  - `.text-mobile-headline` and `.text-mobile-subheadline` for mobile
  - `.text-fluid-sm` for body text
- Added line height utilities: `.leading-headline`, `.leading-subheadline`, `.leading-body`, `.leading-tight-body`
- Added max-width prose classes: `.max-w-prose-narrow`, `.max-w-prose`, `.max-w-prose-wide`
- Added text balance utilities: `.text-balance`, `.text-pretty`

**`mainpage/src/app/page.tsx`**
- Added `max-[389px]:h-[85vh]` for small phone hero height adjustment
- Added `max-[389px]:top-[75px]` for mobile social proof positioning
- Added `max-[389px]:-mt-[59px]` and `max-[389px]:scale-[0.85]` for slogan scaling on small phones
- Created `ValuePropositionCarousel` component for mobile swipeable carousel (auto-advances every 3s)
- Implemented separate mobile/desktop versions of hero slogan using conditional rendering:
  - Mobile: `text-mobile-headline`, `.text-balance`, `tracking-normal`
  - Desktop: `text-5xl`, `tracking-wide`, `text-balance`
- Updated value proposition section: mobile carousel vs desktop static text

**`mainpage/src/components/AvatarTrio.tsx`**
- Added `max-[389px]:scale-90 max-[389px]:origin-bottom` for avatar container scaling on small phones

**`mainpage/src/components/MasonryGrid.tsx`**
- Added mobile slider/carousel implementation for <768px viewports
- Added auto-advance timer (3 seconds) with drag-to-navigate support
- Fixed React warning by wrapping setState in `requestAnimationFrame()`
- Added `useIsMobile` hook for SSR-safe mobile detection

**`mainpage/src/components/sections/cta/WaitlistCTA.tsx`**
- Replaced fixed font sizes with `clamp()` for responsive scaling:
  - Headline: `fontSize: 'clamp(2rem, 8vw, 5rem)'`
  - Button: `fontSize: 'clamp(1rem, 3vw, 1.125rem)'`
  - Subtitle: `fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'`
- Added non-breaking spaces (`&nbsp;`) for better text wrapping
- Added `minHeight: 'clamp(280px, 45vw, 300px)'` for morphing text container

**`mainpage/src/hooks/useIsMobile.ts` (NEW FILE)**
- Created SSR-safe mobile detection hook
- Returns `{ isMobile: boolean, hasMounted: boolean }`
- Uses 768px breakpoint matching Tailwind's `md:` breakpoint
- Includes `hasMounted` flag to prevent hydration mismatches

### Technical Notes
- **Z-Index Hierarchy:** hamburger (9999) > navbar/menu (60-100) > social proof (55) > logo (40)
- **Breakpoint Standardization:** All breakpoints now use `md:` (768px+) instead of `sm:` (640px+)
- **Small Phone Breakpoint:** `max-[389px]` for ultra-compact devices
- **SSR Safety:** All client-side components check `hasMounted` flag before rendering

### Commit Details
- **Commit Hash:** `0c4a0cd`
- **Commit Message:** `feat: comprehensive mobile and iPad responsive polish`
- **Files Changed:** 7 files, +444 lines, -88 lines
- **New File:** `mainpage/src/hooks/useIsMobile.ts`

### Files Modified
1. `mainpage/src/app/globals.css` — Fluid typography system
2. `mainpage/src/app/page.tsx` — Mobile layout components
3. `mainpage/src/components/AvatarTrio.tsx` — Small phone scaling
4. `mainpage/src/components/MasonryGrid.tsx` — Mobile slider + setState fix
5. `mainpage/src/components/layout/navbar.tsx` — Hamburger menu refactoring
6. `mainpage/src/components/sections/cta/WaitlistCTA.tsx` — Fluid sizing
7. `mainpage/src/hooks/useIsMobile.ts` — NEW FILE

### Key Insights
- Responsive polish changes weren't "lost"—they existed in the working directory but were never committed to git
- Investigation revealed the importance of committing work incrementally rather than accumulating uncommitted changes
- Fluid typography with `clamp()` is more maintainable than multiple media queries for font sizes

### Next Steps
- Begin work on waitlist landing page (`/waitlist`)
- Connect AI chat to frontend
- Complete Discord community server setup

---

## Session Log Format Template

```markdown
## [DATE] — [SESSION TITLE]

### Session Summary
[One-sentence overview of what was accomplished]

### Work Completed
#### [Component/Feature Name] ([File Path])
- [Bullet points of changes made]
- [Technical decisions or considerations]

### Technical Notes
- [Important technical details]
- [Architecture decisions]
- [Edge cases handled]

### Commit Details
- **Commit Hash:** [hash]
- **Commit Message:** [message]
- **Files Changed:** [count] files, +[added] lines, -[removed] lines
- **New Files:** [list of new files]

### Files Modified
1. [File path] — [Brief description of changes]
2. [File path] — [Brief description of changes]

### Key Insights
- [Important lessons learned]
- [Decisions that impact future work]
- [Issues discovered and resolved]

### Next Steps
- [Upcoming tasks]
- [Dependencies identified]
```

---

**Log Owner:** Victor Bendas
**Purpose:** Daily progress tracking for development transparency and accountability
