# MerchFrom Development Log

**Purpose:** Track daily progress, technical decisions, and session outcomes for development accountability
**Last Updated:** October 15, 2026
**Project Status:** Phase 3 - Frontend Content Suite (In Progress)

---

## October 15, 2026 — Print Prep: Phases 0 and 1 Built

### Session Summary
Built print prep phases 0 and 1 on branch `feat/print-prep`: one engine for every design, DTG/DTF and screen outputs, production packs with automatic checks, a pre-press audit queue, and staff access by area. Nothing is committed or live yet.

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
- **Commit Hash:** none yet (branch `feat/print-prep`, from `22678b3`)
- **Commit Message:** none yet
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
