# Hero Redesign: DGB-Inspired Typography-First Layout

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the redundant AvatarTrio with a Damn Good Brands-inspired typography-first hero — bold, confident, minimal. The headline IS the hero. No competing imagery.

**Architecture:** Remove AvatarTrio, restructure the hero to center a multi-weight headline vertically, simplify the nav, add a cinematic entrance animation. The floating CatChat already introduces the agents — the hero should sell the outcome with the same confidence as DGB: pure typography on black.

**Tech Stack:** React, Next.js App Router, Framer Motion, Tailwind CSS

---

## Context

### Inspiration: Damn Good Brands (damngoodbrands.com)

DGB's homepage is a masterclass in confident minimalism:
- **Typography IS the design** — multiple font families/weights create visual richness without imagery
- **Pure `#000` + `#fff` + one accent** — no gradients, no glassmorphism, no blur on background
- **Grayscale imagery** — `filter: grayscale(1)` on all photos, color only on interactive elements
- **Bold, irreverent voice** — "Shoot the shit" as a CTA, "Unapologetically Bold" as tagline
- **Cinematic intro** — counter animation before page reveals
- **Minimal nav** — 4 items, no dropdowns, no mega-menus

### Why this is perfect for Merch From

| DGB Quality | Merch From Equivalent |
|-------------|----------------------|
| Typography-first hero | Your headline already works — just needs to be THE star |
| Pure black background | You already have `#000000` for landing |
| Grayscale imagery | MasonryGrid already uses `saturate-[0.65] sepia-[0.08]` |
| Bold voice | "We help artists, creators and brands" — same energy |
| Lime green accent | Your gold sheen gradient — same role, more premium |
| Minimal nav | You have 3 items + logo — already close |

### What the new hero looks like

```
┌─────────────────────────────────────────────────────────────┐
│  [Portfolio]  [Services]              [Logo]     [Join Waitlist] │
│                                                             │
│                                                             │
│                                                             │
│                    WE HELP                                   │
│              ARTISTS, CREATORS                               │  ← Space Grotesk
│                   AND BRANDS                                 │    mixed weights
│            design, source and sell                           │
│          premium merchandise hassle-free                     │
│                                                             │
│                                                             │
│     ┌─────────────────────────────────────────────┐         │
│     │  Zero risk. You create, we handle the rest.  │         │  ← Inter, zinc-400
│     └─────────────────────────────────────────────┘         │
│                                                             │
│                    [ Join the Waitlist → ]                   │  ← Gold sheen CTA
│                                                             │
│                                                             │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ gradient fade to black ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└─────────────────────────────────────────────────────────────┘
```

**Key differences from previous plan:**
- **No product imagery in the hero** — typography IS the hero (DGB style)
- **Mixed font weights** — "WE HELP" in light, "ARTISTS, CREATORS" in bold, creating rhythm
- **More whitespace** — let the text breathe, don't fill every pixel
- **Single CTA** — one button, gold sheen, no competing actions
- **Simplified nav** — remove "About" (hero IS the about), keep Portfolio + Services + Join Waitlist

---

## Tasks

### Task 1: Restructure the hero section in page.tsx

**Files:**
- Modify: `mainpage/src/app/page.tsx`

**Step 1: Replace the hero section**

Replace the entire hero `<section>` (lines 28-82) with the DGB-inspired typography-first layout:

```tsx
{/* Hero Section */}
<section id="hero" className="relative min-h-screen flex flex-col items-center justify-center z-10">
  {/* Social Proof - Absolute Position - Desktop */}
  <div className="absolute top-[122px] md:top-[100px] lg:top-[122px] left-0 w-full z-[55] pointer-events-none hidden md:block">
    <div className="max-w-7xl mx-auto px-6">
      <div className="pointer-events-auto inline-block scale-90 md:scale-85 lg:scale-90 origin-left">
        <SocialProof />
      </div>
    </div>
  </div>

  {/* Mobile Social Proof - Centered */}
  <div className="absolute top-[110px] max-[389px]:top-[75px] left-1/2 -translate-x-1/2 z-[55] md:hidden scale-90 opacity-90 pointer-events-auto w-full flex justify-center">
    <SocialProof />
  </div>

  {/* Hero Content - Centered Typography */}
  <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-6 pointer-events-none">
    <div className="text-center max-w-5xl mx-auto flex flex-col items-center gap-8 pointer-events-auto">
      {/* Main Headline - DGB style: mixed weights, mixed sizes */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-1"
      >
        <h1 className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.05] text-balance">
          <span className="font-light text-zinc-300">We help </span>
          <span className="font-semibold text-white">artists, creators</span>
          <span className="font-light text-zinc-300"> and </span>
          <span className="font-semibold text-white">brands</span>
        </h1>
        <h1 className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.05] text-balance">
          <span className="font-light text-zinc-300">design, source and sell</span>
        </h1>
        <h1 className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.05] text-balance">
          <span className="font-semibold text-white">premium merchandise.</span>
        </h1>
      </motion.div>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-base md:text-lg lg:text-xl text-zinc-500 max-w-xl leading-relaxed font-light"
      >
        Zero risk. You create, we handle everything else.
      </motion.p>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <a
          href="/waitlist"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(212,175,55,0.3)]"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)',
          }}
        >
          Join the Waitlist
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </motion.div>
    </div>
  </div>

  {/* Gradient fade at bottom */}
  <div className="absolute bottom-0 left-0 w-full h-[20vh] bg-gradient-to-t from-black to-transparent pointer-events-none" />
</section>
```

**Step 2: Remove AvatarTrio import**

```tsx
// Remove this line:
import { AvatarTrio } from '@/components/AvatarTrio';
```

**Step 3: Verify build**

Run: `cd mainpage && npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add mainpage/src/app/page.tsx
git commit -m "feat: restructure hero with DGB-inspired typography-first layout"
```

---

### Task 2: Simplify the navbar

**Files:**
- Modify: `mainpage/src/components/layout/navbar.tsx`

**Step 1: Update menu items**

Replace the current menu items (lines 12-16):

```tsx
// Before:
const menuItems = [
  { name: 'Portfolio', href: '#portfolio' },
  { name: 'About', href: '#hero' },
  { name: 'Services', href: '#process' },
];

// After:
const menuItems = [
  { name: 'Portfolio', href: '#portfolio' },
  { name: 'Services', href: '#process' },
];
```

**Step 2: Verify build**

Run: `cd mainpage && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add mainpage/src/components/layout/navbar.tsx
git commit -m "refactor: simplify nav to Portfolio + Services (hero IS the about)"
```

---

### Task 3: Delete AvatarTrio component

**Files:**
- Delete: `mainpage/src/components/AvatarTrio.tsx`

**Step 1: Delete the file**

```bash
rm mainpage/src/components/AvatarTrio.tsx
```

**Step 2: Check for remaining references**

```bash
grep -r "AvatarTrio" mainpage/src/
```

Expected: No results

**Step 3: Verify build**

Run: `cd mainpage && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove AvatarTrio component (redundant with floating chat)"
```

---

### Task 4: Adjust ValueProposition section spacing

**Files:**
- Modify: `mainpage/src/app/page.tsx`

**Step 1: Update the ValueProposition section margins**

The current section has negative margins to overlap with the avatar area. With avatars removed, tighten the spacing:

```tsx
{/* Value Proposition - Between Hero and Gallery */}
<section className="relative z-40 bg-black py-10 max-[389px]:pt-0 max-[389px]:pb-6 -mt-[60px] max-[389px]:-mt-[80px] md:-mt-[40px]">
```

**Step 2: Verify build**

Run: `cd mainpage && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add mainpage/src/app/page.tsx
git commit -m "fix: adjust ValueProposition spacing for new hero layout"
```

---

### Task 5: Visual verification with Playwright

**Files:**
- Create: `mainpage/scripts/verify-hero.mjs` (temporary)

**Step 1: Write verification script**

```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:3000');
await page.waitForTimeout(2500);

// Verify headline is visible
const headline = await page.locator('h1').first();
const headlineText = await headline.textContent();
console.log('Headline:', headlineText);

// Verify CTA button exists
const cta = await page.locator('a[href="/waitlist"]').first();
const ctaText = await cta.textContent();
console.log('CTA:', ctaText);

// Verify AvatarTrio is gone
const avatarImgs = await page.locator('img[src*="avatars"]').count();
console.log('Avatar images in hero:', avatarImgs);

// Verify SocialProof still exists
const socialProof = await page.locator('text=Meet our AI Team').count();
console.log('SocialProof present:', socialProof > 0);

// Verify CatChat floating button still exists
const chatButton = await page.locator('button[aria-label="Open chat"]').count();
console.log('CatChat button present:', chatButton > 0);

// Verify nav is simplified
const navLinks = await page.locator('nav a').count();
console.log('Nav links:', navLinks);

// Screenshot desktop
await page.screenshot({ path: 'mainpage/scripts/hero-desktop.png', fullPage: false });
console.log('Desktop screenshot saved');

// Mobile view
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'mainpage/scripts/hero-mobile.png', fullPage: false });
console.log('Mobile screenshot saved');

await browser.close();
console.log('Verification complete!');
```

**Step 2: Run verification**

```bash
cd mainpage && node scripts/verify-hero.mjs
```

Expected output:
- Headline contains "artists, creators"
- CTA contains "Join the Waitlist"
- Avatar images in hero: 0 (only CatChat floating button should remain)
- SocialProof present: true
- CatChat button present: true
- Nav links: 2 (Portfolio, Services)

**Step 3: Clean up**

```bash
rm mainpage/scripts/verify-hero.mjs mainpage/scripts/hero-desktop.png mainpage/scripts/hero-mobile.png
```

**Step 4: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: hero visual verification adjustments"
```

---

## Parallelization Map

```
Group A (sequential):
  T1 → T2 → T3 → T4 → T5
```

All tasks are sequential — each depends on the previous.

## Assignment

All tasks: Main session (requires visual verification and coordination)

---

## Design Decisions

### Why DGB style over product showcase?

DGB proves that typography alone can carry a hero. Their site has no product imagery on the homepage — just type, space, and confidence. For Merch From, this means:
1. **Immediate clarity** — visitors read what you do in 2 seconds
2. **Confidence signal** — clean typography = professional brand
3. **No competition** — nothing competes with the message
4. **Faster load** — no images to preload in the hero

### Why mixed font weights?

DGB uses multiple font families (NeueMontreal, Nord, Chomsky, InstrumentSerif) to create visual rhythm. We can achieve a similar effect with Space Grotesk's weight range:
- `font-light` for connecting words ("We help", "and", "design, source and sell")
- `font-semibold` for key words ("artists, creators", "brands", "premium merchandise")

This creates a natural reading rhythm: light → bold → light → bold.

### Why keep SocialProof?

SocialProof is small (~40px tall) and serves a different purpose: it introduces the AI team with a "Meet our AI Team" link. It's a secondary element that doesn't compete with the headline. It also provides a natural transition point for users who want to learn about the agents.

### Why keep the floating CatChat?

The CatChat is the PRIMARY way users interact with the agents. It's always visible, has expression animations, speech bubbles, and opens a full chat window. This is where the agents shine — through actual conversation, not static hero images.

### Why gold CTA instead of DGB's lime green?

The design system specifies gold gradient for landing page CTAs and red for app CTAs. Gold is more premium than lime green — it fits the "premium merchandise" positioning. DGB's lime green works for their "unapologetically bold" agency vibe; Merch From's gold works for "premium quality for artists."

### Why simplify the nav?

DGB has 4 items. We had 3 + logo. Removing "About" makes sense because:
- The hero IS the about — visitors read what you do immediately
- "Portfolio" and "Services" are the action-oriented links
- "Join Waitlist" stays as the CTA in the nav

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Headline too long on mobile | Split into 3 `<h1>` lines, test at 320px |
| Mixed weights look inconsistent | Use only `font-light` and `font-semibold`, no `font-normal` |
| SocialProof overlaps with headline | Already has responsive positioning, verify visually |
| Gold CTA doesn't stand out enough | Add `hover:shadow-[0_0_60px_rgba(212,175,55,0.3)]` glow |
| Removing "About" confuses users | Hero copy IS the about — visitors learn everything in 2 seconds |
