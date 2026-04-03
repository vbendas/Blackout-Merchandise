# MerchFrom Development Log

**Purpose:** Track daily progress, technical decisions, and session outcomes for development accountability
**Last Updated:** January 18, 2026
**Project Status:** Phase 3 - Frontend Content Suite (In Progress)

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
