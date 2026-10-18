# CLAUDE.md - Blackout Merchandise Development Guide

> **Last Updated:** October 11, 2026
> **Project Score:** 8.4/10 (Pre-MVP, Phase 3)

## Project Overview

**Blackout Merchandise** is an AI-powered premium merchandise platform for artists/creators. It features three AI "Cat-Suite" brand ambassadors (Leopoldo, Francisca, Antonia) that guide artists through design, production, and sales.

**Mission:** Help artists, brands, and companies design, source, and sell premium quality merchandise through an AI-managed platform with professional visual tools.

**Core Values:** Vegan, fair-trade, eco-friendly products with premium quality focus, direct in-house production, and no upfront costs for qualified creators.

---

## Repository Structure

```
/blackout-merchandise (Monorepo)
├── /app                    # Main application (Cat-Suite, Auth, Commerce)
│   ├── src/
│   │   ├── app/            # Next.js App Router routes
│   │   │   ├── api/        # API routes (Deepgram, chat, webhooks)
│   │   │   └── app/        # Protected routes (workshop, showroom, support)
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities (ai/, demo/)
│   │   └── types/          # TypeScript definitions
│   ├── convex/             # LEGACY - Being replaced by Drizzle
│   └── public/             # Static assets
│
├── /mainpage               # Public website: static HTML/CSS/JS, no framework, no build step
│   ├── index.html          # Members-only door (email hands off to the platform's /sign-in, where the key step lives), Apply flow with merch preview (posts to the platform's /api/apply), press board, Ask panel (scripted, keyword-matched answers from faq/faq.json), footer
│   ├── faq/                # FAQ page (index.html, entries inline) + faq.json (feeds the Ask panel on index.html only)
│   ├── agents/             # For agents / MCP page
│   ├── watch/              # Film page (media/show.mp4 and its own media/)
│   ├── img/                # Shared images (merch/, press/)
│   ├── fonts/              # Self-hosted fonts: fonts.css (Inter, IBM Plex Mono) and Mornsey.woff2
│   ├── favicon.ico, llms.txt
│   ├── LICENCES.md         # Font licence records
│   └── package.json        # Only a "dev" script (python3 http.server, port 3000)
│                           # Press rows are front-end sample data. Sign-in and applications go to the platform (STUDIO_ORIGIN in index.html)
│
├── /platform               # Agent-first platform app (Next.js 16, React 19, npm; see Documentation/Dev/Platform-Plan.md)
│   ├── app/                # App Router routes and api/
│   ├── lib/                # agent/, tools/, catalog/, mockups/, storefront/, etc.
│   │   └── catalog/        # Blank-catalog source of truth (products, details, variants, colours, size guides, filters, videos)
│   ├── scripts/            # seed.ts (seeds the catalog into Neon), *-smoke.ts checks
│   └── public/             # packshots/, gallery/
│
├── /aurora-dashboard       # Untracked UI template (single index.html) for app pages
│
├── /src                    # Shared backend (PRIMARY DATABASE LAYER)
│   └── db/
│       ├── schema.ts       # Drizzle PostgreSQL schema (SOURCE OF TRUTH)
│       ├── index.ts        # Neon serverless connection
│       ├── users.ts        # User operations
│       ├── products.ts     # Product operations
│       ├── orders.ts       # Order operations
│       └── stripe.ts       # Stripe webhook operations
│
├── /Documentation          # Project documentation
│   ├── PRD.md              # Product Requirements (SOURCE OF TRUTH)
│   ├── Dev/MVP Roadmap.md  # Development roadmap
│   ├── DEVLOG.md           # Development log
│   └── EVALUATION_*.md     # Progress evaluations
│
├── /docs                   # Strategy documents
│   └── Merchandise_Studio.md  # PWA strategy document
│
├── /Assets                 # Cat-Suite character assets
│   └── avatars/            # Leopoldo, Francisca, Antonia (20 expressions each)
│
├── /drizzle                # Database migrations
└── drizzle.config.ts       # Drizzle configuration
```

Retired site versions (website-v2, website-v3, the old Next.js mainpage) live outside the repo in `~/Documents/GitHub/_archive/blackout-merchandise-2026-10-11/` (website-v3 is also in git history).

---

## Technology Stack

### Framework & Runtime
| Tech | Version | Notes |
|------|---------|-------|
| Next.js | 16.x | App Router, SSR/SSG |
| React | 19.x | Latest with concurrent features |
| TypeScript | 5.x | Strict mode enabled |
| Node.js | 20.x | LTS version |

### Package Managers
| Project | Manager | Commands |
|---------|---------|----------|
| `/app` | **Bun** | `bun install`, `bun dev`, `bun run build` |
| `/platform` | **npm** | `npm install`, `npm run dev`, `npm run build` |
| `/mainpage` | none (static) | `npm run dev` (python3 http.server, port 3000); no install, build or lint |

### Database (PRIMARY)
| Tech | Purpose |
|------|---------|
| **Neon** | Serverless PostgreSQL + pgvector for AI embeddings |
| **Drizzle ORM** | Type-safe queries, Neon serverless driver |
| **Upstash Redis** | Sessions, caching, rate limiting |

> **IMPORTANT:** Ignore `/app/convex/` - it's legacy code. All database work uses Drizzle (`/src/db/schema.ts`).

### Authentication & Payments
| Tech | Purpose |
|------|---------|
| **Clerk** | Passkeys, Magic Links, pre-built components |
| **Stripe** | Express Checkout (Apple/Google Pay), Connect payouts |

### UI & Styling
| Tech | Purpose |
|------|---------|
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** | Copy-paste components (configured in /app and /platform) |

### Animation
| Tech | Purpose |
|------|---------|
| **Framer Motion** | React-integrated animations |
| **GSAP** | Advanced timeline/orchestration |
| **Lenis** | Smooth scrolling |

### AI & Voice
| Tech | Purpose |
|------|---------|
| **OpenRouter** | LLM API gateway (multi-model access) |
| **Deepgram** | Speech-to-text API |

### Media
| Tech | Purpose |
|------|---------|
| **Cloudinary** | Image CDN with auto-optimization (WebP/AVIF) |

---

## Development Commands

### Main App (`/app`)
```bash
cd app
bun install          # Install dependencies
bun dev              # Development server (port 3000)
bun run build        # Production build (plain `bun build` is Bun's bundler, not the script)
bun lint             # ESLint check
```

### Platform (`/platform`)
```bash
cd platform
npm install          # Install dependencies
npm run dev          # Development server (next dev)
npm run build        # Production build
npm run lint         # ESLint check
npm run seed         # Seed the blank catalog (tsx scripts/seed.ts)
npm run db:generate  # drizzle-kit generate (also db:migrate, db:studio)
```

### Website (`/mainpage`)
```bash
cd mainpage
npm run dev          # Static server: python3 http.server on 127.0.0.1:3000
```
Or start the `mainpage` config in `.claude/launch.json` (same server, port 3000). There is nothing to install, build or lint.

### Database Operations
```bash
# From project root
bunx drizzle-kit generate   # Generate migrations from schema
bunx drizzle-kit migrate    # Apply migrations to Neon
bunx drizzle-kit studio     # Open Drizzle Studio GUI
```

---

## Code Conventions

### Component Naming
- **PascalCase.tsx** for React components (`ProductCard.tsx`, `WaitlistForm.tsx` in `app/src/components/`)
- **kebab-case.tsx** for utilities/providers (`accessibility-widget.tsx`)

### Website Organization (mainpage)
- One self-contained `index.html` per page (`/`, `faq/`, `agents/`, `watch/`) with inline CSS and JS; fonts come from the shared `fonts/fonts.css`
- Shared assets in `img/` and `fonts/`; page-specific media next to the page (`watch/media/`)
- `faq/faq.json` feeds only the Ask panel on the door page (`index.html` fetches it, with a built-in `FALLBACK_FAQ` copy). The FAQ page (`faq/index.html`) has its entries inline and does not read `faq.json`: keep all three (`faq.json`, `faq/index.html`, `FALLBACK_FAQ`) in sync by hand
- No framework, no bundler, no build step: edit the HTML and reload

### Hook Pattern
Illustrative sketch; the real example is `app/src/hooks/useViewportSize.ts` (returns `isMobile` plus `hasMounted`).
```typescript
// Return hasMounted flag to prevent hydration mismatches
export function useIsMobile(): { isMobile: boolean; hasMounted: boolean } {
    const [hasMounted, setHasMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        // ... logic
    }, []);

    return { isMobile, hasMounted };
}

// In components - always check hasMounted for SSR safety
if (!hasMounted) return null;
```

### Utility Function
```typescript
// src/lib/utils.ts - Tailwind class merging
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
```

### Database Pattern (Drizzle)
```typescript
// Using Drizzle ORM with Neon
import { db } from '@/db';
import { users, artistStores } from '@/db/schema';
import { eq } from 'drizzle-orm';

const store = await db
    .select()
    .from(artistStores)
    .where(eq(artistStores.slug, slug))
    .limit(1);
```

---

## Styling Guidelines

### Color Palette (Dark Mode Only)
| Element | Value | Usage |
|---------|-------|-------|
| **Base** | `zinc-950` | Backgrounds, cards |
| **Base (Website)** | `#000000` | mainpage ground (`--bg`) |
| **Primary Text** | `#FFFFFF` | Maximum contrast |
| **Accent (App)** | `#E11D48` (Recording Red) | Action buttons, active states |
| **Grey Text (Website)** | White at 80/50/46% (`--a8`, `--a5`, `--a4`; 46% keeps small text at 4.5:1) | Secondary type; rules at 16% (`--rule`) |
| **Accent (Website)** | None | Monochrome only (orange and red were rejected) |

### Typography
- **Website (mainpage):** Inter 400/600 for text, IBM Plex Mono for labels (`--mono`), both self-hosted through `fonts/fonts.css` (no Google Fonts requests). Mornsey (`fonts/Mornsey.woff2`, copy in `watch/media/`) is used only for the sample artist marks printed on merch previews in `index.html` and on the `watch/` film page.
- **App (`/app`):** Space Grotesk headings, Inter body
- **Platform (`/platform`):** Inter body and display, IBM Plex Mono labels and key tiles (`lib/fonts.ts`), same identity as the website: black, white alpha greys, 16% hairlines, 2px radius, ecru `#ECE5DA` plates behind garments

### Tailwind Class Merging
```typescript
<div className={cn(
    "px-4 py-2 rounded-lg",
    isActive && "bg-blue-500 text-white",
    className // Allow prop overrides
)} />
```

---

## Cat-Suite AI Agents

Three brand ambassadors with distinct roles:

| Agent | Role | Domain |
|-------|------|--------|
| **Leopoldo** | Onboarding & Administration | Onboarding, account matters, platform guidance |
| **Francisca** | Catalog & Design | Product curation, design creation, visual identity |
| **Antonia** | Operations & Support | Order tracking, shipping, first-tier support |

### Expression System
20 expressions per character (60 total):
```
neutral, speaking_a, speaking_b, happy, excited, thinking, confused, shocked,
sad, angry_annoyed, wink, love, sleepy, mischievous, proud, mouth_closed,
mouth_o_shape, mouth_wide_open, mouth_teeth_showing, blep
```

### Cloudinary Asset Path
```
blackout-merchandise/avatars/[character]/[expression]
```
Example: `blackout-merchandise/avatars/leopoldo/happy`

---

## Git Conventions

### Commit Message Format
```
type: description

feat: Add waitlist form validation
fix: Correct lightbox z-index issue
refactor: Simplify avatar animation logic
docs: Update roadmap with Phase 3 details
chore: Update dependencies
```

### Commit Co-Author
When committing, include:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Key Files Reference

### Source of Truth Documents
| Document | Purpose |
|----------|---------|
| `Documentation/PRD.md` | Product requirements, architecture decisions |
| `Documentation/Dev/MVP Roadmap.md` | Development phases, timeline |
| `src/db/schema.ts` | Database schema (Drizzle) |
| `docs/Merchandise_Studio.md` | PWA strategy |

### Configuration Files
| File | Purpose |
|------|---------|
| `drizzle.config.ts` | Drizzle ORM config |
| `app/components.json` | shadcn/ui config |
| `app/middleware.ts` | Clerk auth middleware |

---

## Known Issues / Technical Debt

### /app - Convex Legacy Code
The `/app/convex/` folder contains legacy code being migrated to Drizzle. Some Convex functions are stubbed out with TODO comments.

---

## Current Development Phase

**Phase 3: Frontend Content Suite** (Jan 12 - Jan 26, 2026)

### Completed
- [x] Main website hero section
- [x] Avatar trio component
- [x] Masonry grid portfolio
- [x] Feature marquees
- [x] Horizontal scroll section
- [x] Production quality specs
- [x] Waitlist CTA section
- [x] Footer (5-column layout)

The items above were built in the old Next.js mainpage, now archived (see Repository Structure).

### In Progress
- [ ] Waitlist landing page (`/waitlist`)
- [ ] AI chat connection to frontend
- [ ] Discord community server setup

### Next Phase (Phase 4)
- Neon + Drizzle full integration
- Clerk auth flows
- User sync webhooks

---

## Environment Variables

### Required for /app
```env
# Database (Neon)
DATABASE_URL=postgresql://...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...

# Voice (Deepgram)
DEEPGRAM_API_KEY=...

# Media (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...

# Cache (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Current Priorities

**Primary Focus:** Frontend polish + Waitlist page completion (Phase 3)

### Immediate Tasks
1. Complete waitlist landing page (`/waitlist`)
2. Polish the static website pages (`mainpage/`)
3. Connect AI chat to frontend (when ready)
4. Discord community server setup

### AI/Cat-Suite Development
- Follow PRD agent definitions but can suggest improvements
- Leopoldo: Onboarding & Administration
- Francisca: Catalog & Design
- Antonia: Operations & Support
- Expression system ready (60 images in Cloudinary)

---

## Best Practices

### Do
- Always run `bun run build` (app) or `npm run build` (platform) after changes to verify; mainpage is static and has no build
- Use Drizzle for new database features (not Convex)
- Follow existing component patterns in the codebase
- Update relevant documentation when making changes
- Check `hasMounted` before rendering client-only components
- Use Cloudinary URLs with `f_auto,q_auto` for images

### Don't
- Create new files unless absolutely necessary
- Use Convex for new features (it's being deprecated)
- Add light mode support (dark mode only)
- Use emojis in code/comments unless explicitly requested
- Skip build verification after code changes

---

## Documentation Updates

When making code changes, update these files as needed:
- `Documentation/DEVLOG.md` - For significant progress
- `Documentation/Dev/MVP Roadmap.md` - For phase completion
- `Documentation/PRD.md` - For architectural decisions

---

## Code Verification Workflow

### Mandatory Verification Stack
All code changes must pass **formatting, linting, type checking, and secret scanning** before commit.

### Verification Commands

```bash
# Verify (checks app/ only); run from the repo root
./verify.sh

# Verify specific project
cd app && bun run verify      # App project
```

`verify.sh` runs Biome, oxlint, tsc and secretlint on `app/` only. mainpage is a static site with no TS toolchain, so nothing verifies it.

### Pre-commit Hook
Pre-commit hook runs verification automatically. **Failed verification BLOCKS commit**.

To bypass (use sparingly): `git commit --no-verify`

### Best Practices
1. Run verification before commits
2. Fix issues immediately
3. Never commit secrets
```

---

## Confidence Check Protocol

Before implementing any feature, run confidence assessment (≥90% required). This prevents wrong-direction work and saves tokens by identifying issues early.

### Confidence Check Criteria

1. **No duplicate implementations (25%)**
   - Search codebase for existing functionality
   - Check for similar patterns or components that already solve the problem

2. **Architecture compliance (25%)**
   - Verify tech stack alignment (Next.js, Drizzle, Clerk, etc.)
   - Check existing patterns are used (component naming, file structure, etc.)

3. **Official documentation verified (20%)**
   - Review official docs before implementation
   - Understand API constraints, best practices, and limitations

4. **Working OSS implementations referenced (15%)**
   - Search GitHub for examples
   - Verify working code samples and integration patterns

5. **Root cause identified (15%)**
   - Analyze error messages and stack traces
   - Understand the underlying problem, not just symptoms

### Confidence Calculation and Decision Logic

- **If total ≥ 0.90: ✅ Proceed with implementation**
- **If total ≥ 0.70: ⚠️ Present alternatives, ask questions**
- **If total < 0.70: ❌ STOP - Request more context**

### Token Savings Justification

Spend 100-200 tokens to save 5,000-50,000 on wrong-direction work. The confidence check protocol prevents wasting implementation time on features that already exist, don't align with architecture, or solve the wrong problem.

---

## Plan Mode Workflow

For complex features, use read-only plan mode to avoid wasting tokens on wrong-direction work.

### Workflow Steps

1. **Scan Context**
   - Read relevant files (PRD.md, CLAUDE.md, schema.ts)
   - Search codebase for related implementations

2. **Ask Questions**
   - Clarify requirements
   - Confirm constraints
   - Ask about preferences

3. **Draft Plan**
   - Create comprehensive implementation plan
   - Task breakdown
   - File changes
   - Acceptance criteria
   - Dependencies
   - Estimated time

4. **Get Approval**
   - Present plan to user
   - Answer questions
   - Modify plan based on feedback
   - Get final approval

5. **Execute**
   - Implement following approved plan

### When to Use Plan Mode

- Multi-hour tasks (>2 hours)
- Architecture changes
- New feature implementations
- Database schema changes

---

## Quick Reference

### Start Development
```bash
# Main app
cd app && bun dev

# Website (static, port 3000)
cd mainpage && npm run dev

# Platform
cd platform && npm run dev
```
app (`next dev`), platform (`next dev`) and mainpage (python http.server) all use port 3000, so run one at a time or move one, e.g. `cd platform && npm run dev -- -p 3001`. The mainpage port is fixed in its `dev` script and in `.claude/launch.json`.

### Check Database Schema
```bash
cat src/db/schema.ts
```

### View Migrations
```bash
bunx drizzle-kit studio
```

### Build App and Platform
```bash
cd app && bun run build && cd ../platform && npm run build
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
