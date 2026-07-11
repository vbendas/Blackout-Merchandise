# Merch From - Master Context File for OpenCode CLI

> **Purpose**: This is the primary context file for OpenCode CLI. OpenCode will use this to understand the entire Merch From project structure, goals, and development strategy before starting any work session.

> **Project State**: P0 Demo Hardening (Crowdfunding Sprint) - Day 1-2 Complete, May 9-10, 2026
> **Working Directory**: `/Users/victorbendas/Documents/GitHub/Merch-From`
> **Last Updated**: May 10, 2026

---

## Quick Navigation

### 📋 Current Status
**Documentation**: [Documentation/PRD.md](./Documentation/PRD.md) - Main PRD with current phase status

### 📋 Core Documents
**Product Vision**: [Documentation/PRD.md](./Documentation/PRD.md) - Full product requirements, AI agents, business model
**Roadmap**: [Documentation/05-Roadmap/Roadmap.md](./Documentation/05-Roadmap/Roadmap.md) - Development phases, task breakdown
**Crowdfunding Roadmap**: [Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md](./Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md) - Day-by-day crowdfunding sprint plan

### 🤖 AI & Automation
**AI System Prompts**: [Documentation/CAT_SUITE_PROMPTS.md](./Documentation/CAT_SUITE_PROMPTS.md) - Cat-Suite personality and system prompts
**Production Automation**: [Documentation/05-Shared/Production-Automation-Reference.md](./Documentation/05-Shared/Production-Automation-Reference.md) - Technical specs (Phase 8+)
**Mockup System**: [Documentation/05-Shared/Mockup-Architecture-Reference.md](./Documentation/05-Shared/Mockup-Architecture-Reference.md) - Product visualization
**ML Training**: [Documentation/04-ML-Training/](./Documentation/04-ML-Training/) - Expert panel workflow
**Color Separation**: [Documentation/05-Shared/Color-Separation-Reference.md](./Documentation/05-Shared/Color-Separation-Reference.md) - Technical printing process

### 💰 Marketing & Business
**Crowdfunding Overview**: [Documentation/04-Crowdfunding-Landing/Overview.md](./Documentation/04-Crowdfunding-Landing/Overview.md) - Campaign overview, timeline

### 📊 Research & Market Intelligence
**Market Analysis**: [Documentation/09-Reseach/merchandise-market-research.md](./Documentation/09-Reseach/merchandise-market-research.md) - $6.8B creator merch market data
**POD Competition**: [Documentation/09-Reseach/pod_competition_report.md](./Documentation/09-Reseach/pod_competition_report.md) - Competitive intelligence, Fyul analysis

### 🎨 Design & Brand
**Design System**: [Documentation/05-Shared/Design-System.md](./Documentation/05-Shared/Design-System.md) - Colors, typography, components
**Brand Guidelines**: [Documentation/05-Shared/Brand-Guidelines.md](./Documentation/05-Shared/Brand-Guidelines.md) - Cat-Suite voices, tone, messaging

### 📊 Database & API
**Database Schema**: [Documentation/05-Shared/Database-Schema.md](./Documentation/05-Shared/Database-Schema.md) - Drizzle tables, relationships

### 📈 Evaluations & Decisions
**Architecture Decisions**: [Documentation/03-Evaluations/Architecture-Decisions.md](./Documentation/03-Evaluations/Architecture-Decisions.md) - Structural decisions
**Feature Evaluations**: [Documentation/03-Evaluations/Feature-Evaluations.md](./Documentation/03-Evaluations/Feature-Evaluations.md) - Feature decisions
**Tool Stack Decisions**: [Documentation/03-Evaluations/Tool-Stack-Decisions.md](./Documentation/03-Evaluations/Tool-Stack-Decisions.md) - Technology choices
**Evaluation Archive**: [Documentation/03-Evaluations/Evaluation-Archive.md](./Documentation/03-Evaluations/Evaluation-Archive.md) - Historical scoring
**Customer Validation**: [Documentation/03-Evaluations/Customer-Validation-Framework.md](./Documentation/03-Evaluations/Customer-Validation-Framework.md) - Validation framework

### 💻 Development Context
**PWA Context**: [Documentation/01-PWA/Claude-Context.md](./Documentation/01-PWA/Claude-Context.md) - Merchandise Studio app work
**Website Context**: [Documentation/02-Website/Claude-Context.md](./Documentation/02-Website/Claude-Context.md) - Marketing website work

---

## Planning Mode Protocol

> **CRITICAL**: This section defines how ALL models must behave when Planning Mode is active in OpenCode TUI. Planning Mode is READ-ONLY. OpenCode will block all file edits, writes, and system modifications. Do NOT attempt to edit files, run write commands, create files, or modify configs -- these actions will be blocked and waste tokens. Your only job is to think, read, search, and produce a detailed implementation plan.

### When Planning Mode Activates

- The user explicitly requests it ("plan this", "plan mode", "create a plan")
- The user switches to plan mode in OpenCode TUI

### Core Rules

1. **No edits, no exceptions.** Do not attempt file writes, `sed`, `echo >`, `cat <<EOF`, or any mutation. OpenCode enforces read-only mode and will block these actions. Attempting them wastes time and tokens.
2. **Read everything first.** Use read, grep, glob, and explore agents to gather full context before drafting any plan.
3. **Ask before assuming.** If requirements are ambiguous, ask the user. Do not make large assumptions about intent, scope, or tradeoffs.
4. **Plan comes before all code.** No implementation plan, no implementation. The plan must be approved before any execution begins in a separate session.

### Planning Guidelines

#### Detailed Task Breakdown
- **Elaborate with granularity.** Break each task into discrete, actionable subtasks. Avoid high-level tasks that hide complexity.
- **Flag parallel execution.** When tasks have no dependencies on each other, mark them explicitly for parallel execution using `[PARALLEL]` or "Group X" notation.
- **The plan model ≠ build model.** Planning is done with Minimax M2.5 (or similar), but execution may use different models. Plan for reality: assume tasks will be executed by different subagents or sessions.

#### Verification Strategy
- **Always verify with Playwright.** After implementing changes that affect UI/UX, write and execute Playwright tests to verify the results in an actual browser.
- **Test before claiming success.** Run Playwright scripts to confirm:
  - Pages load correctly
  - Interactive elements work (buttons, forms, filters)
  - Data displays as expected
  - No console errors
- **Use the Playwright skill.** Invoke the `playwright-skill` to write and execute browser tests:
  ```javascript
  // Example: Test catalog loads products
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/app/workspace');
  await page.waitForTimeout(3000);
  // Verify products load, filters work, etc.
  ```

### Plan Structure

Every implementation plan must follow this structure:

#### 1. Overview
- **Goal**: What we're building and why
- **Scope**: What's included, what's explicitly excluded
- **Acceptance Criteria**: How we know it's done
- **Dependencies**: External services, APIs, packages needed
- **Affected Areas**: Which parts of the monorepo are touched (`/app`, `/mainpage`, `/src/db`, etc.)

#### 2. Task Breakdown

Break the work into discrete tasks and subtasks. Each task includes:

| Field | Description |
|-------|-------------|
| **Task ID** | Hierarchical ID (T1, T1.1, T1.2, T2, T2.1...) |
| **Description** | Clear, actionable description of what to do |
| **Subtasks** | Numbered sub-steps within the task |
| **Dependencies** | Which task IDs must complete before this one starts |
| **Parallelization Group** | Which tasks can run simultaneously (Group A, B, C...) |
| **Complexity** | S (small, <30min), M (medium, 1-2h), L (large, 2h+) |
| **Files Affected** | Exact file paths that will be created or modified |
| **Essential Comments** | Gotchas, warnings, architecture notes (see tagging below) |
| **Acceptance Criteria** | Per-task definition of done |

#### 3. Essential Comments Tagging

Flag important notes inline within task descriptions:

- `[CRITICAL]` -- Blockers, breaking changes, security concerns. Must be addressed or the plan fails.
- `[ARCH]` -- Architecture decisions. Explains WHY something is done a certain way, not just what.
- `[GOTCHA]` -- Non-obvious pitfalls, edge cases, known quirks. Saves debugging time.
- `[DEP]` -- Dependency notes. External packages, API versions, env vars needed.
- `[VERIFY]` -- Post-task verification steps. What to check after completing the task.

#### 4. Parallelization Map

Group tasks by execution order. Tasks within the same group have no dependencies on each other and can run simultaneously across different OpenCode sessions or subagents.

```
Group A (parallel, no dependencies):
  - T1: [description]
  - T2: [description]
  - T3: [description]

Group B (parallel, after Group A completes):
  - T4: [description] (depends on T1)
  - T5: [description] (depends on T2)

Group C (sequential, after Group B):
  - T6 → T7 → T8 (strict order)
```

#### 5. Agent / Session Assignment

Suggest how work should be distributed across OpenCode:

| Assignment Type | When to Use |
|-----------------|-------------|
| **Subagent (explore)** | Read-only research, codebase scanning, finding patterns |
| **Subagent (writer)** | Independent file creation or modification tasks |
| **Separate OpenCode session** | Large independent workstreams that don't share state |
| **Main session** | Tasks requiring sequential coordination or user decisions |

For each task, indicate the recommended assignment:
- `[MAIN]` -- Must run in the current main session
- `[SUBAGENT]` -- Can be delegated to an OpenCode subagent
- `[SESSION]` -- Can be run in a separate OpenCode session entirely
- `[PARALLEL]` -- Multiple subagents or sessions can work on this group simultaneously

#### 6. Approval Gate

After the plan is drafted:
1. Present the full plan to the user
2. Wait for explicit approval, modification requests, or rejection
3. **No execution begins until the user approves**
4. If the user requests changes, revise and re-present
5. Once approved, the plan is handed off for execution (in a non-plan-mode session)

### Plan Example (Condensed)

```
## Implementation Plan: Waitlist Landing Page

### Overview
- Goal: Build /waitlist page with email capture form
- Scope: Frontend only, no backend email integration yet
- Acceptance: Page renders, form validates, submits to API stub

### Tasks

T1 [SUBAGENT] [Group A] (S)
  Create page route at /mainpage/src/app/waitlist/page.tsx
  - T1.1: Scaffold basic page component with metadata
  - T1.2: Add responsive container layout
  [ARCH] Follow existing mainpage routing pattern (see /mainpage/src/app/page.tsx)
  Files: mainpage/src/app/waitlist/page.tsx

T2 [SUBAGENT] [Group A] (M)
  Build WaitlistForm component
  - T2.1: Create form with Name, Email, Social Link fields
  - T2.2: Add client-side validation (Zod schema)
  - T2.3: Add loading/success/error states
  [GOTCHA] Must use 'use client' directive -- form needs useState
  [DEP] Requires: zod, react-hook-form (already in package.json)
  Files: mainpage/src/components/sections/waitlist/WaitlistForm.tsx

T3 [MAIN] [Group B] (S) (depends on T1, T2)
  Wire form into page and verify build
  - T3.1: Import WaitlistForm into page
  - T3.2: Run npm run build to verify
  [VERIFY] npm run build passes with zero errors

### Parallelization Map
Group A (parallel): T1, T2
Group B (after A):  T3

### Assignment
T1, T2: Subagents (independent, no shared state)
T3: Main session (needs build verification)
```

---

## Project Overview

**Merch From** is an AI-powered premium merchandise platform for artists who care about quality.

### Key Differentiators
1. **In-House Production** — Own facility in Portugal, €113K equipment, quality control
2. **Zero Risk Model** — Artists pay nothing upfront, only when products sell
3. **Ethical First** — Vegan, fair-trade, organic blanks as standard
4. **Expert Guidance** — Dedicated team (Leopoldo, Francisca, Antonia) handles everything for artists
5. **Proprietary AI Pipeline** — Expert-scored dataset, EU-based technology (investor moat)

### Current Phase: P0 Demo Hardening (Crowdfunding Sprint) — May 9 → May 25, 2026
**Timeline**: 2.5 weeks
**Goal**: Working AI chat, voice, design gen, storefront for crowdfunding video
**Status**: Day 1-2 COMPLETE (May 9-10). Agent routing, security hardening, 23 issues closed.
**Branch**: `feat/crowdfunding-demo`
**See**: [Roadmap-Crowdfunding-v1.0.md](./Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md) for full day-by-day plan

**Market Timing Context:**
- **Fyul merger window**: 18-24 months of reduced innovation (Printful+Printify merged Nov 2024)
- **Marketplace collapse**: Redbubble (-98% share price), Society6 (5-10% royalties), Zazzle (35-50% fees)
- **AI differentiation**: 12-month category-exclusive window for multi-modal AI (text + image + voice)
- **EU regulatory tailwind**: EPR regulations (Oct 2025) favor zero-inventory POD models
- **Market size**: $6.8B creator merch market, $10.78B POD market growing at 23.6% CAGR

---

## Monorepo Structure

```
/Merch-From (Git root)
├── /app                    # Main application (Cat-Suite, AI chat, PWA features)
│   ├── src/
│   │   ├── app/            # Next.js App Router routes
│   │   ├── components/     # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/            # Utilities (ai/, demo/)
│   │   └── types/          # TypeScript definitions
│   ├── convex/             # LEGACY - Being replaced by Drizzle
│   └── public/             # Static assets
│
├── /mainpage               # Marketing landing page (merchfrom.com)
│   ├── src/
│   │   ├── app/            # Next.js App Router routes
│   │   ├── components/     # React components
│   │   ├── hooks/          # useIsMobile, etc.
│   │   ├── providers/      # HeroUI provider
│   │   └── lib/            # utils.ts (tailwind-merge)
│   └── public/             # Static assets (logo/, gallery/, avatars/)
│
├── /src                    # Shared backend (PRIMARY DATABASE LAYER)
│   └── db/
│       ├── schema.ts       # Drizzle PostgreSQL schema (SOURCE OF TRUTH)
│       ├── index.ts        # Neon serverless connection
│       ├── users.ts        # User operations
│       ├── products.ts     # Product operations
│       ├── orders.ts       # Order operations
│       └── stripe.ts       # Stripe webhook operations (backup)
│
├── /Documentation           # Project documentation
│   ├── PRD.md             # Main PRD (Source of Truth)
│   ├── DEVLOG.md          # Development log
│   ├── PRIVACY.md         # Legal
│   ├── DPIA.md            # Legal
│   ├── CAT_SUITE_PROMPTS.md  # AI personality prompts
│   ├── MOCKUP_ARCHITECTURE.md # Mockup system
│   ├── leopoldo-system-v2.md  # Leopoldo detailed
│   │
│   ├── 01-PWA/            # Merchandise Studio context
│   ├── 02-Roadmap/         # Roadmap + Agent Assignments
│   ├── 02-Website/         # Marketing website context
│   ├── 03-Evaluations/    # All evaluation documents
│   ├── 03-Waitlist-Landing/ # Waitlist page specs
│   ├── 04-Crowdfunding-Landing/ # Campaign overview
│   ├── 04-Design/         # Design assets
│   ├── 04-ML-Training/    # ML Training system (postponed, Phase 9+)
│   ├── 04-TUI/            # Terminal UI
│   ├── 05-Shared/         # Design, API, Database, Brand references
│   ├── 06-Legal/          # Legal documents
│   └── 07-Archive/        # Organized archives
│       ├── 01-Redundant-PRDs/
│       ├── 02-Brainstorms/
│       ├── 03-Pitch-Founders/
│       ├── 04-Abandoned-Features/
│       └── 05-Misc/
│
├── /drizzle                # Database migrations
└── docs/                  # Strategy documents
```
/Merch-From (Git root)
├── /app                    # Main application (Cat-Suite, AI chat, PWA features)
│   ├── src/
│   │   ├── app/            # Next.js App Router routes
│   │   ├── components/     # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/            # Utilities (ai/, demo/)
│   │   └── types/          # TypeScript definitions
│   ├── convex/             # LEGACY - Being replaced by Drizzle
│   └── public/            # Static assets
│   ├── convex/             # LEGACY - Being replaced by Drizzle
│   └── public/            # Static assets
│
├── /mainpage               # Marketing landing page (merchfrom.com)
│   ├── src/
│   │   ├── app/            # Next.js App Router routes
│   │   ├── components/     # React components
│   │   ├── hooks/          # useIsMobile, etc.
│   │   ├── providers/       # HeroUI provider
│   │   └── lib/            # utils.ts (tailwind-merge)
│   └── public/             # Static assets (logo/, gallery/, avatars/)
│
├── /src                    # Shared backend (PRIMARY DATABASE LAYER)
│   └── db/
│       ├── schema.ts         # Drizzle PostgreSQL schema (SOURCE OF TRUTH)
│       ├── index.ts          # Neon serverless connection
│       ├── users.ts          # User operations
│       ├── products.ts       # Product operations
│       ├── orders.ts         # Order operations
│       └── stripe.ts         # Stripe webhook operations (backup)
│
├── /Documentation           # Project documentation (this folder)
│   ├── 00-Index/          # Navigation hub, README, Quick-Links
│   ├── 00-PRD-Roadmap/    # Product requirements, roadmap
│   ├── 00-Evaluations/     # Architecture, features, tools decisions
│   ├── 01-PWA/            # Merchandise Studio context
│   ├── 02-Website/         # Marketing website context
│   ├── 03-Waitlist-Landing/  # Email signup page specs
│   ├── 04-Crowdfunding-Landing/ # Campaign overview
│   ├── 07-Archive/            # Organized archives (redundant PRDs, brainstorms, pitches)
│   │
│   ├── /drizzle                # Database migrations
│   └── docs/                  # Strategy documents
```

---

## Package Managers

| Project | Manager | Commands |
|---------|-----------|----------|
| **/app** | Bun | `bun install`, `bun dev`, `bun build`, `bun lint` |
| **/mainpage** | npm | `npm install`, `npm run dev`, `npm run build`, `npm run lint` |

---

## Tech Stack

### Framework & Runtime
- **Next.js**: 16.x - App Router, SSR/SSG
- **React**: 19.x - Latest with concurrent features
- **TypeScript**: 5.x - Strict mode enabled

### Database (PRIMARY)
- **Neon**: Serverless PostgreSQL + pgvector for AI embeddings
- **Drizzle ORM**: Type-safe queries, Neon serverless driver
- **Upstash Redis**: Sessions, caching, rate limiting

### Authentication & Payments
- **Clerk**: Passkeys, Magic Links, pre-built components
- **NexaPay**: Professional Plan ($249/mo) — 14 providers (Visa, MC, Amex, Apple/Google Pay, PayPal, etc.), instant USDC settlement on Polygon, per-sale artist payouts. **Primary gateway.**
- **Stripe**: Express Checkout (Apple/Google Pay), Connect payouts — retained as backup (feature-flag switchable)
- → Full architecture: [[Documentation/02-Architecture/Payment-Gateway]]

### AI & Voice
- **Mistral Large**: LLM for chat, agent routing, character personalities (EU-based, GDPR-native)
- **Mistral Voxtral Transcribe 2**: Speech-to-text ($0.003/min, sub-200ms, Apache 2.0)
- **Mistral Voxtral TTS**: Text-to-speech with zero-shot voice cloning (~90ms, Apache 2.0)
- **Real-Time Conversation**: Full Mistral voice pipeline for continuous Cat-Suite dialogue

**AI Moat Context:**
- Multi-modal AI stack (text + image + voice) is **category-exclusive** today — no competitor combines all three
- 12-month window before incumbents (Printify, Gelato, Canva) close the gap
- Sustainable moat: proprietary expert-scored dataset + workflow integration, not just image generation
- EU data sovereignty: all inference stays in Europe (GDPR-native)
- Open weights (Apache 2.0): self-hostable at scale, no vendor lock-in

### UI & Styling
- **Tailwind CSS v4**: Utility-first styling
- **HeroUI**: React component library (premium aesthetics)
- **Catalyst UI**: Headless components (Tailwind Labs)
- **shadcn/ui**: Copy-paste components (configured in /app)

### Animation
- **Framer Motion**: React-integrated animations
- **GSAP**: Advanced timeline/orchestration
- **Lenis**: Smooth scrolling

---

## Development Commands

### Main App (/app)
```bash
cd app
bun install          # Install dependencies
bun dev              # Development server (port 3000)
bun build            # Production build
bun lint             # ESLint check
```

### Marketing Page (/mainpage)
```bash
cd mainpage
npm install          # Install dependencies
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
```

### Database Operations (from root)
```bash
bunx drizzle-kit generate   # Generate migrations from schema
bunx drizzle-kit migrate    # Apply migrations to Neon
bunx drizzle-kit studio     # Open Drizzle Studio GUI
```

---

## Current Phase: P0 Demo Hardening (Crowdfunding Sprint)

> **Branch**: `feat/crowdfunding-demo`
> **Full plan**: [Roadmap-Crowdfunding-v1.0.md](./Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md)

### 3.1 Main Marketing Website (/) ✅ COMPLETE
**Status**: Production-ready for Desktop and Mobile. Tablet adjustment in progress.

**Completed:**
- Hero Section with Leopoldo avatar
- Trio Section (three agents)
- Glassmorphism effects
- Feature marquees
- Horizontal scroll section
- Production quality specs
- Waitlist CTA section (links to /waitlist page)
- Footer (5-column layout)
- Floating socials sidebar

**In Progress:**
- Tablet view adjustment (optimizing for iPad/Android tablets)

### 3.2 App AI Chat Interface (/app) 🚧 IN PROGRESS (P0 Sprint)
**Goal**: Working AI chat with real LLM responses, voice, and agent routing

**Completed (Day 1-2, May 9-10):**
- ✅ Intent classification module (Mistral-based agent routing)
- ✅ Agent routing middleware with automatic handoff
- ✅ Mistral client integration (rebuilt from scratch)
- ✅ Quick actions expanded to 9 per agent with carousel
- ✅ Voice conversation with VAD (Voice Activity Detection)
- ✅ Avatar expressions with context-aware sentiment mapping
- ✅ Clerk auth on all chat API routes
- ✅ Upstash rate limiting (20/min chat, 5/min voice)
- ✅ Prompt injection sanitization
- ✅ RBAC middleware for staff endpoints
- ✅ Zod env validation, CORS, structured logger
- ✅ Component extraction: ChatMessages, ChatInput, ChatWindow, ChatHeader
- ✅ Hook extraction: useVoiceConversation, useAudioRecording
- ✅ Error boundary, centralized CHAT_CONFIG
- ✅ 23 GitHub issues closed (#1-#23)
- ✅ Both /app and /mainpage build successfully

**Next (Day 3+, May 11+):**
- ⏳ Real LLM streaming responses with typewriter effect
- ⏳ Chat history persistence to database
- ⏳ Voice-to-voice full pipeline (STT → LLM → TTS)
- ⏳ FLUX 2 design generation integration
- ⏳ Demo mode with scripted responses for video

### 3.3 App UI Integration to Main Website ✅ DONE (widget)
**Status**: CatChat widget embedded on mainpage with shared components

### 3.4 Waitlist Landing Page (/waitlist) ✅ UI COMPLETE
**Status**: 5-step form flow complete, API integration pending

### 3.5 Crowdfunding Landing Page (/invest) ⏳ PENDING
**Goal**: Build crowdfunding campaign page (P3 phase, June 9-22)

---

## P0 Sprint Timeline (May 9 → May 25, 2026)

### Week 1 — AI Chat Core (May 9-15)
- ✅ Day 1 (May 9): Intent classification, agent routing, Mistral rebuild, voice VAD
- ✅ Day 2 (May 10): Security hardening (23 issues), component refactoring, RBAC
- ⏳ Day 3 (May 11): Real LLM streaming + chat history + typewriter
- ⏳ Day 4 (May 12): Typing indicator + message animations
- ⏳ Day 5 (May 13): Demo mode + fallback responses
- ⏳ Day 6 (May 14): Polish + mobile chat
- ⏳ Day 7 (May 15): Week 1 review + voice prep

### Week 2 — Voice + Design Generation (May 16-22)
- ⏳ Days 8-14: Voice STT/TTS, FLUX 2 design gen, refinement loop, storefront

### Week 3 — Storefront + Integration (May 23-25)
- ⏳ Days 15-17: Storefront, product grid, cart, integration testing

**Deliverable**: Working AI chat + voice + design gen + storefront for crowdfunding video

**Competitive Context:**
- **Fyul (Printful+Printify)**: Post-merger distraction window — 18-24 months of reduced R&D
- **Marketplace collapse**: Redbubble/Society6/Zazzle fee increases driving artist migration
- **AI window**: 12-month category-exclusive advantage for multi-modal AI (text + image + voice)
- **EU advantage**: EPR regulations (Oct 2025) favor sustainable on-demand production
- **Target market**: $6.8B creator merch, $1.97B EU POD growing at 24.06% CAGR

---

## Roadmap Phases (Future Reference)

### Phase 4: Production MVP - Backend Core ✅ COMPLETE
- Neon + Clerk, Auth, Real Data Architecture

### Phase 5: Production MVP - AI Agents ✅ COMPLETE
- Mistral Large LLM, agent routing, voice pipeline

### Phase 6: Production MVP - Commerce ✅ CORE COMPLETE
- NexaPay payment integration (Stripe retained as backup), cart, checkout, order management

### Phase 7: Production MVP - Launch ⏳ POST-CROWDFUNDING
- Testing, Artist Onboarding

### Phase 8: Social Commerce Integration Hub ⏳ 2027
- Discord, Meta, TikTok, Twitch catalog sync

### Phase 10: Accessories Expansion (Year 2 - 2027-2028)
- 3D-printed jewelry (pendants, rings, bracelets) via Cat-Suite guided design
- Meshy API for 3D generation + Python post-processing pipeline (port 8002)
- Three.js/React Three Fiber 3D viewer in-app
- Cast-resin-to-metal production at Portugal facility (Formlabs Form 4 + vacuum casting)
- Pilot with 5-10 artists → data collection → fine-tune proprietary model
- **Docs:** [Accessories-Expansion.md](./Documentation/02-Roadmap/Accessories-Expansion.md)

---

## Cat-Suite Team

Three dedicated team members with distinct roles:

| Member | Role | Domain | Personality |
|--------|------|--------|-------------|
| **Leopoldo** | Store Manager | Onboarding, administration, sales | São Paulo street-smart, persistent, protective |
| **Francisca** | Art Director | Design, catalog, visual identity | Porto princess, perfectionist, passionate |
| **Antonia** | Operations Lead | Order tracking, shipping, support | Irish gypsy, optimistic, "the hunter" |

**Expression System**: 20 expressions per character (60 total)
- neutral, speaking_a, speaking_b, happy, excited, thinking, confused, shocked, sad, angry_annoyed, wink, love, sleepy, mischievous, proud, mouth_closed, mouth_o_shape, mouth_wide_open, mouth_teeth_showing, blep

**Cloudinary Asset Path**: `merch-from/avatars/[character]/[expression]`

---

## Key Documents Summary

### 📋 Must Read for All Work
1. **[Documentation/PRD.md](./Documentation/PRD.md)** - Product requirements, AI agents, business model
2. **[Documentation/02-Roadmap/Roadmap.md](./Documentation/02-Roadmap/Roadmap.md)** - What phase we're in
3. **[Documentation/CAT_SUITE_PROMPTS.md](./Documentation/CAT_SUITE_PROMPTS.md)** - Cat-Suite personality directives

### 🤖 Read for Planning & Strategy
1. **[Documentation/04-Crowdfunding-Landing/Overview.md](./Documentation/04-Crowdfunding-Landing/Overview.md)** - Crowdfunding campaign overview
2. **[Documentation/02-Roadmap/Accessories-Expansion.md](./Documentation/02-Roadmap/Accessories-Expansion.md)** - Phase 10: 3D jewelry accessories plan

### 🎨 Read for Implementation Details
1. **[Documentation/05-Shared/Design-System.md](./Documentation/05-Shared/Design-System.md)** - Colors, typography, components
2. **[Documentation/05-Shared/Brand-Guidelines.md](./Documentation/05-Shared/Brand-Guidelines.md)** - Logo, tone, brand voice
3. **[Documentation/05-Shared/Database-Schema.md](./Documentation/05-Shared/Database-Schema.md)** - Drizzle tables

---

## Code Conventions

### Component Naming
- **PascalCase.tsx** for React components (`AvatarTrio.tsx`, `MasonryGrid.tsx`)
- **kebab-case.tsx** for utilities/providers (`floating-socials.tsx`, `smooth-scrolling.tsx`)
- **camelCase** for functions/variables

### Component Organization (mainpage)
```
components/
├── sections/          # Full-page sections
│   ├── cta/           # Call-to-action (WaitlistCTA.tsx)
│   ├── quality/       # Quality specs (ProductionQuality.tsx)
│   └── features/      # Feature showcase
├── ui/                # Atomic components (morphing-text.tsx)
├── layout/            # Layout shells (navbar.tsx, footer.tsx)
├── [standalone].tsx   # Top-level components (AvatarTrio.tsx)
└── catalyst/          # Headless components (Tailwind Labs)
```

### Hook Pattern
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

## Build Verification

### Main App (/app)
```bash
cd app
bun dev              # Start development server
bun build            # Production build (check for errors)
bun lint             # ESLint check
```

### Marketing Page (/mainpage)
```bash
cd mainpage
npm run dev          # Start development server
npm run build        # Production build (check for errors)
npm run lint         # ESLint check
```

---

## Quality Standards

### Color Palette (Dark Mode Only)
| Element | Value | Usage |
|---------|-------|-------|
| **Base** | `zinc-950` | Backgrounds, cards |
| **Base (Landing)** | `#000000` | Landing page only |
| **Primary Text** | `#FFFFFF` | Maximum contrast |
| **Accent (App)** | `#E11D48` (Recording Red) | Action buttons, active states |
| **Accent (Landing)** | Gold Sheen Gradient | CTAs, highlights |

### Typography
- **Headings**: Space Grotesk (quirky, tech-inspired)
- **Body**: Inter (clean, invisible)

### Gold Sheen Effect (Landing Page)
```css
background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
box-shadow: 0 0 60px rgba(212, 175, 55, 0.15);
```

---

## Project Score Breakdown

| Aspect | Score |
|--------|-------|
| Vision & Strategy | 9.7 |
| Business Model | 8.5 |
| Technical Architecture | 8.5 |
| Market Opportunity | 7.5 |
| Founder-Market Fit | 9.3 |
| Competitive Moats | 8.3 |
| Execution Progress | 8.2 |
| Investment Readiness | 8.0 |

**Overall Project Score**: 8.5/10

---

## Investment Ask

| Investment | Equity | Runway |
|------------|--------|--------|
| €300,000 | 16-18% | 24 months to profitability |

---

## Important Notes

### Convex Migration
- **IGNORE** `/app/convex/` folder - it's legacy code being replaced by Drizzle
- Use `/src/db/` for all database operations (SOURCE OF TRUTH)

### Equal Wage Model
- Everyone earns same base salary regardless of title
- Victor: €1,400/month
- 30% of net quarterly profits distributed equally to all contributors
- Vests after 6 months employment

### Facility Strategy
- Current: Ireland (active production until transition)
- Future: Castelo Branco, Portugal (interior region)
- Equipment: €113K shipped to Portugal (50% grant eligible via Portugal 2030 interior incentives)
- Land: €0.01/m² via Castelo Branco Invest CB industrial land program
- Target: 300-500 sqm industrial unit (own, not rent)
- De-risk: Own facility + grant-recovered equipment = hard assets from day one
- Crowdfunding angle: "We own our industrial unit and recovered 50% of equipment costs through grants"

### Expert Panel
- Expert A (Brazil): Process printing expert (15+ years, 6,600+ students)
- Expert B (Brazil): Industry legend (40+ years)
- Expert C (Brazil): Quality master (zero-defect production)
- Current Role: AI training and scoring system

---

## Related External Context Files

Future context files will be created in specific project folders (e.g., `/mainpage/OpenCode-Context.md` for website work, `/app/OpenCode-Context.md` for PWA work). Use this master file as project overview and navigation hub.

---

**Last Updated**: January 17, 2026
**Maintained by**: Victor Bendas
**Status**: Active (Phase 3 in progress, Week 2 starting Jan 19)

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
