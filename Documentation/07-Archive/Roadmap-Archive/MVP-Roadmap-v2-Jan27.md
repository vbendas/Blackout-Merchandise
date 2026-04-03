# Merch From: MVP Development Roadmap

> **Scope:** Demo MVP (for Crowdfunding Video) → Production MVP (for Launch)
> **Strategy:** "Hybrid Build" – One codebase architected for production, with mocked data for demo phase.
> **Last Updated:** January 22, 2026

---

## Build Philosophy: Why "Hybrid" Over "Two Builds"

Building a throwaway "Demo" and then a separate "Production" app wastes time. Instead, we build **one codebase** with a clean separation:

1.  **Demo Mode:** Uses mocked API responses (`/api/mock/...`), static design assets, and scripted conversation flows.
2.  **Production Mode:** Swaps mocks for real Supabase data, Stripe payments, and live AI calls via environment flags.

This means every line of code written for the demo is production-ready. The only "demo-only" work is creating the **scripted content** (fake conversations, pre-generated mockups).

---

## High-Level Phases Overview

| Phase | Name | Goal | Duration | Est. Completion |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **Foundations** | Project setup, design system, Rive asset commissioning | 1 Week | **COMPLETE** |
| **1** | **Demo MVP: Core Shell** | Static pages, routing, Rive integration (placeholder states) | 2 Weeks | **COMPLETE** |
| **2** | **Demo MVP: Interactive** | Scripted chat, mockup gallery, animated transitions | 2 Weeks | **COMPLETE (Dec 16)** |
| **3** | **Frontend Content Suite** | Build ALL interfaces (Home, Waitlist, Crowd, Shop, App) for video accuracy. | 2 Weeks | **Jan 12 → Jan 26** |
| **4** | **Prod MVP: Backend (The Core)** | Neon + Clerk, Auth, Real Data Architecture | 2 Weeks | **Jan 26 → Feb 9** |
| **5** | **Prod MVP: AI Agents (The Brains)** | Ollama + U-Net Training, Llama 3.1 8B, Attention U-Net | 2 Weeks | **Feb 9 → Feb 23** |
| **6** | **Prod MVP: Commerce (The Money)** | Stripe, Orders, Artist Dashboard | 3 Weeks | **Feb 23 → Mar 16** |
| **7** | **Beta Launch & Dataset Growth** | 10 → 50 → 100 artists, U-Net training flywheel | 9 Months | **Mar 2026 → Nov 2026** |
| **8** | **Public Launch** | Final polish, marketing, unrestricted access | 1 Month | **Dec 2026** (🚀 PUBLIC) |
| **9** | **Social Commerce Hub** | Discord, Meta, TikTok, Twitch catalog sync | 17 Weeks | **Jan-May 2027** |

**Total Estimated Time:** ~58 Weeks (MVP: 15 Weeks + Beta: 36 Weeks + Polish: 4 Weeks + Social: 17 Weeks)
**Critical Path:** Beta phase builds proprietary dataset moat while generating revenue
**Workload:** 6 days/week, 6 hours/day (36h/week).
**Timeline Update (Jan 7, 2026):** Revised dates to reflect Phase 3 expansion (V0 customization, gamified waitlist). Launch target moved from Feb to mid-March. Buffer consumed but pace can accelerate.

---

## Phase 0: Foundations (COMPLETE)

> **Goal:** Set up accounts, install tools, create the project skeleton, and commission Rive avatar assets.
> **Status:** COMPLETED

---

### 0.0 Prerequisites (Before ANY Code)

This section is for **first-time setup**. These steps only need to be done once.

---

#### Step 0.0.1: Create Required Accounts

> [!IMPORTANT]
> Create these accounts NOW before writing any code. Free tiers are sufficient for MVP.

| # | Service | URL | Plan | Why You Need It |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **GitHub** | [github.com](https://github.com) | Free | Version control. Connects to Vercel for auto-deploy. |
| 2 | **Vercel** | [vercel.com](https://vercel.com) | **Hobby (Free)** | Hosts your Next.js app. Pro plan is NOT required for MVP. |
| 3 | **Neon** | [neon.tech](https://neon.tech) | Free | Serverless Postgres + pgvector for AI embeddings. |
| 4 | **Upstash** | [upstash.com](https://upstash.com) | Free | Serverless Redis for caching, sessions, rate limiting. |
| 5 | **Clerk** | [clerk.com](https://clerk.com) | Free (10K MAUs) | Authentication. Passkeys, Magic Links, pre-built components. |
| 6 | **OpenRouter** | [openrouter.ai](https://openrouter.ai) | Pay-as-you-go | AI API gateway. ~$5 gets you started. |
| 7 | **Stripe** | [stripe.com](https://stripe.com) | Free (Test Mode) | Payments. No fees until you go live. |
| 8 | **Rive** | [rive.app](https://rive.app) | Free | ~~(DEPRECATED for MVP)~~ Animation editor. |
| 9 | **Cloudinary** | [cloudinary.com](https://cloudinary.com) | Free Forever | Image transformations. Free tier = 25K transforms/month. |
| 10 | **Recraft.ai** | [recraft.ai](https://recraft.ai) | €20/mo | AI Vector/Raster Avatar generation. Replaces Rive commission. |

> [!NOTE]
> **Stack Pivot (Jan 6, 2025):** Switched to **Neon (Postgres)** + **Upstash (Redis)** + **Drizzle ORM** for better AI integration and ecosystem flexibility. Added **V0 (Vercel)** for rapid frontend generation. Clerk retained for auth.

**Checklist:**
- [x] GitHub account created
- [x] Vercel account created (sign up with GitHub for easy linking)
- [ ] Neon account created (sign up with GitHub)
- [ ] Upstash account created
- [ ] Clerk account created
- [x] OpenRouter account created, $5 credits added
- [x] Stripe account created
- [x] Rive account created
- [x] Cloudinary account created

---

#### Step 0.0.2: Install Local Tools (macOS)

Open your **Terminal** app and run these commands one by one:

**1. Install Homebrew (macOS package manager):**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
*Follow the on-screen instructions. This may take a few minutes.*

**2. Install Node.js (via nvm - Node Version Manager):**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Close and reopen your terminal, then:
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation:
node --version  # Should print v20.x.x
```

**3. Install Bun (faster package manager):**
```bash
curl -fsSL https://bun.sh/install | bash

# Verify installation:
bun --version  # Should print 1.x.x
```

**4. Install Git:**
```bash
brew install git

# Verify installation:
git --version  # Should print git version 2.x.x
```

**5. Configure Git (replace with your info):**
```bash
git config --global user.name "Victor Bendas"
git config --global user.email "your-email@example.com"
```

**Checklist:**
- [x] Homebrew installed
- [x] Node.js v20 installed via nvm
- [x] Bun installed
- [x] Git installed and configured

---

#### Step 0.0.3: Create the GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Fill in:
   - **Repository name:** `merch-from`
   - **Description:** `AI-powered premium merch platform`
   - **Visibility:** Private (or Public if you prefer)
   - ✅ Add a README file
   - ✅ Add .gitignore: Select `Node`
3. Click **Create repository**

**Clone to your local machine:**
```bash
# Navigate to your projects folder (create if needed)
mkdir -p ~/Documents/GitHub && cd ~/Documents/GitHub

# Clone the repo
git clone https://github.com/YOUR_USERNAME/merch-from.git 

# Enter the project folder
cd merch-from
```

**Checklist:**
- [x] GitHub repo created
- [x] Repo cloned locally to `~/Documents/GitHub/merch-from`

---

#### Step 0.0.4: Connect Vercel to GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your `merch-from` repo
4. Click **Import**
5. **IMPORTANT:** Don't deploy yet. We need the Next.js app first. Click **"Skip for now"** or just close the tab.

This creates the project shell. Auto-deploy will work later.

**Checklist:**
- [x] Vercel project linked to GitHub repo

---

### 0.1 Project Initialization

Now we create the actual Next.js app.

---

#### Step 0.1.1: Create Next.js 14 App

Open Terminal in your project folder (`~/Documents/GitHub/merch-from`) and run:

```bash
# Make sure you're in the right folder
cd ~/Documents/GitHub/merch-from

# Create Next.js app (this will REPLACE the README)
bunx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

**When prompted:**
- Would you like to use ESLint? → **Yes**
- Would you like to use Tailwind CSS? → **Yes**
- Would you like to use `src/` directory? → **Yes**
- Would you like to use App Router? → **Yes**
- Would you like to customize the default import alias? → **No**

*This will take 1-2 minutes.*

**Verify it works:**
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the Next.js welcome page.

Press `Ctrl+C` in Terminal to stop the dev server.

**Checklist:**
- [ ] Next.js app created
- [ ] `bun dev` runs without errors
- [ ] Browser shows Next.js welcome page

---

#### Step 0.1.2: Install Core Dependencies

Run these commands in your project folder:

```bash
# Core UI & Animation
bun add framer-motion zustand zod @rive-app/react-canvas

# HeroUI setup
bun add @heroui/react framer-motion
```

**Configure HeroUI provider in your app:**
Add `HeroUIProvider` wrapper in your root layout (we'll do this in the next step).

**Add essential HeroUI components via their CLI (optional, for individual imports):**
```bash
npx heroui-cli add button card input avatar
```

**Checklist:**
- [ ] `framer-motion`, `zustand`, `zod`, `@rive-app/react-canvas` installed
- [ ] HeroUI initialized
- [ ] Button, Card, Input, Avatar components added

---

#### Step 0.1.3: Create Environment Variables File

Create a file called `.env.local` in your project root:

```bash
touch .env.local
```

Add placeholder values (we'll fill in real values later):

```env
# Demo Mode Toggle (set to 'true' for demo, 'false' for production)
NEXT_PUBLIC_DEMO_MODE=true

# Neon Database (get from neon.tech dashboard)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB

# Upstash Redis (get from upstash.com dashboard)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# Clerk (get from clerk.com dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# OpenRouter (get from openrouter.ai dashboard later)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Stripe (get from stripe.com dashboard later)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Cloudinary (get from cloudinary.com dashboard later)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

> [!WARNING]
> Never commit `.env.local` to Git! It's already in `.gitignore` by default.

**Checklist:**
- [ ] `.env.local` file created with placeholder values

---

#### Step 0.1.4: Set Up Folder Structure

Create the project folders:

```bash
# Create folder structure
mkdir -p src/components/ui
mkdir -p src/lib/ai
mkdir -p src/lib/demo
mkdir -p src/hooks
mkdir -p src/types
mkdir -p public/rive
mkdir -p public/mockups
```

**Checklist:**
- [ ] Folder structure created

---

#### Step 0.1.5: Commit & Push to GitHub

```bash
git add .
git commit -m "🎉 Initial Next.js setup with HeroUI"
git push origin main
```

After pushing, Vercel will automatically detect the change and deploy your app. Check your Vercel dashboard for the live URL!

**Checklist:**
- [ ] Changes committed and pushed to GitHub
- [ ] Vercel auto-deployed successfully

---

### 0.2 Design System Scaffold

*(Same as before - will be implemented in the next coding session)*

| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **0.2.1** Base UI Components | Button, Card, Input, Avatar, ChatBubble, Spinner, Kbd, ButtonGroup, Separator. | **DONE (Jan 2026)** - Upgraded to Lyra-style (sharper radius), zinc base color, Recording Red accent. |
| **0.2.2** Layout Components | `StickyHeader`, `HeroSection`, `SplitLayout` (75/25), `FloatingDock`. | For Hero-to-Copilot transitions. |

---

---

## GDPR Compliance Implementation ✅ COMPLETE (January 21, 2026)

**Status**: Fully implemented across all platform operations
**Documentation**: Complete privacy policy, DPIA, and implementation guide

### Completed Tasks

| Task | Status | Completion Date |
|------|--------|----------------|
| **Privacy Policy & Terms** | ✅ | Jan 21, 2026 |
| **Data Protection Impact Assessment (DPIA)** | ✅ | Jan 21, 2026 |
| **Privacy Implementation Guide** | ✅ | Jan 21, 2026 |
| **Consent Banner Implementation** | ✅ | Jan 21, 2026 |
| **Consent Management UI** | ✅ | Jan 21, 2026 |
| **Data Subject Rights API** | ✅ | Jan 21, 2026 |
| - Right to Access | ✅ | |
| - Right to Deletion | ✅ | |
| - Right to Portability | ✅ | |
| **Automated Data Retention Cron** | ✅ | Jan 21, 2026 |
| **GDPR Frontend Components** | ✅ | Jan 21, 2026 |
| **Clerk Webhook Integration** | ✅ | Jan 21, 2026 |
| **Security Implementation** | ✅ | Jan 21, 2026 |

### Key Features Delivered

**Consent Management**
- Footer banner across all pages
- Three consent categories (Essential, Analytics, Marketing)
- Granular control with real-time withdrawal
- Database storage with audit trail

**Data Subject Rights**
- Complete data export (JSON, CSV, XML)
- Account deletion with automatic cleanup
- Portable data formats
- Response within 30 days

**Data Retention**
- Automated daily cleanup cron job
- User accounts: 2 years from last activity
- Order data: 7 years (legal requirement)
- Consents: Until withdrawn + 30 days

**Security**
- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- MFA authentication (Clerk)
- Role-based access controls
- Real-time threat monitoring

**Documentation**
- `Documentation/PRIVACY.md` - Complete implementation guide
- `Documentation/DPIA.md` - Data Protection Impact Assessment
- `/privacy` page - Public privacy policy
- Test procedures and monitoring schedule

---

## Multi-Agent System Integration ✅ COMPLETE (January 2026)

**Status**: Core infrastructure and confidence check protocol implemented
**Documentation**: System prompts and agent behavior guidelines

### Completed Tasks

| Task | Status |
|------|--------|
| **Confidence Check Protocol** | ✅ |
| **Track Management System** | ✅ |
| **Plan Workflow** | ✅ |
| **Skills Integration** | ✅ |
| **Agent Behavior Guidelines** | ✅ |

### 5 Agents Completed

| Agent | File | Focus | Status |
|-------|------|-------|--------|
| **Agent 1** | `agent-1-code-verification.md` | Code verification stack (Biome, oxlint, tsgo, secretlint, Husky) | ✅ |
| **Agent 2** | `agent-2-gdpr-database-api.md` | GDPR database & API (schema, migrations, data rights routes) | ✅ |
| **Agent 3** | `agent-3-gdpr-frontend.md` | GDPR frontend (consent banner, privacy policy, data rights portal) | ✅ |
| **Agent 4** | `agent-4-gdpr-automation-docs.md` | GDPR automation (cron job, webhooks, layout, documentation) | ✅ |
| **Agent 5** | `agent-5-quick-wins.md` | Quick wins (confidence, tracking, planning workflows) | ✅ |

---

### 0.3 Cat-Suite Avatar Asset Generation ✅ COMPLETE

> **Strategic Shift (Dec 21):** Switched from commissioned Rive animations (€800+) to AI-generated 2D avatars (€20/mo).
> **Benefit:** Reallocating €1,000 budget to Waiting List Ads. Higher marketing velocity/testing.
> **Status (Jan 2026):** ✅ **COMPLETE** — All 60 expression images generated, upscaled, and processed.

#### Step 0.3.1: Generate Expression Sets ✅ DONE
**Tool Used:** Google Gemini (AI Image Generation)
**Characters:**
- **Leopoldo:** Tuxedo cat in black sweatshirt (20 expressions)
- **Francisca:** Calico cat in black sweatshirt (20 expressions)
- **Antônia:** Black cat in black hoodie with hood up (20 expressions)

**Expression List (20 per character):**
1. Neutral, 2. Speaking A, 3. Speaking B, 4. Happy, 5. Excited, 6. Thinking, 7. Confused, 8. Shocked, 9. Sad, 10. Angry/Annoyed, 11. Wink, 12. Love (heart-eyes), 13. Sleepy, 14. Mischievous, 15. Proud, 16. Mouth Closed, 17. Mouth O Shape, 18. Mouth Wide Open, 19. Mouth Teeth Showing, 20. Blep

#### Step 0.3.2: Upscale to 8K ✅ DONE
**Tool Used:** Upscayl (High-Fidelity 4x)
**Source:** 2048x2048 (2K)
**Output:** 8192x8192 (8K)
**Location:** `/Assets/[Character]/upscayl_png_high-fidelity-4x_4x/`

#### Step 0.3.3: Background Removal ✅ DONE
**Tool Used:** Batch background removal processing
**Output:** Transparent PNG files ready for Cloudinary upload

#### Step 0.3.4: Cloudinary Setup (NEXT)
- [x] Upload 60 transparent PNGs to Cloudinary
- [ ] Configure auto-format (WebP/AVIF) delivery
- [ ] Set up responsive breakpoints
- [ ] Test CDN delivery

**Checklist:**
- [x] Leopoldo: 20 expressions generated ✅
- [x] Francisca: 20 expressions generated ✅
- [x] Antônia: 20 expressions generated ✅
- [x] All assets upscaled to 8K ✅
- [x] Background removal complete ✅
- [ ] Cloudinary upload and configuration


---

## Phase 1: Demo MVP – Core Shell (COMPLETE)

> **Goal:** Build the skeleton of the app with navigation, layouts, and static content.
> **Status:** COMPLETED

### 1.1 Page Routing & Layout
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **1.1.1** Create Route Structure | `/` (Landing), `/app` (Main App Shell), `/app/workshop`, `/app/showroom`, `/app/support`. | **DONE** |
| **1.1.2** Implement `AppLayout` | Shared layout for `/app/*` routes with header, avatar container, and chat panel. | **DONE** |
| **1.1.3** Implement Hero Section | Landing page with large Leopoldo avatar (static placeholder initially), headline, subheadline. | **DONE** |

### 1.2 Avatar Container Component
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **1.2.1** `<AvatarContainer />` | A wrapper component that renders the Rive canvas OR a static fallback image. | **DONE** |
| **1.2.2** Rive State Hook | `useRiveAvatar(character, viewMode)` – Loads the correct `.riv` file and sets the initial state. | **DONE** |
| **1.2.3** Layout Mode Prop | Accept `mode: 'hero' | 'sidebar' | 'orb'` to handle positioning via parent CSS. | **DONE** |

### 1.3 Chat UI Shell
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **1.3.1** `<ChatPanel />` | Fixed-bottom chat input bar with text input and (placeholder) mic button. | **DONE** |
| **1.3.2** `<ChatBubbleList />` | Scrollable list of chat bubbles (user vs. agent). | **DONE** |
| **1.3.3** Mock Conversation Hook | `useMockConversation(script)` – Iterates through a JSON script of messages with timed delays. | **DONE** |

### 1.4 Hero-to-Copilot Transition
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **1.4.1** `<TransitionLayout />` | Uses `framer-motion` `LayoutGroup` to animate the `AvatarContainer` between positions. | **DONE** |
| **1.4.2** Route-Based Triggers | When navigating `/app` → `/app/workshop`, trigger the `hero -> sidebar` animation. | **DONE** |
| **1.4.3** Orb Mode | When navigating to `/app/showroom`, trigger the `hero -> orb` animation. Avatar shrinks to bottom-right. | **DONE** |

---

---

## Phase 2: Demo MVP – Interactive Showcase (COMPLETE)

> **Goal:** Integrate Rive assets, create scripted "demo flows," and build the mockup gallery.
> **Status:** COMPLETED (Rive skipped as per request).

### 2.1 Rive Integration (SKIPPED - Pending Assets)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **2.1.1** Import `.riv` Files | Place commissioned assets in `/public/rive/`. | **SKIPPED** |
| **2.1.2** Connect State Machines | Wire `useRiveAvatar` hook to Rive inputs (e.g., `avatar.setInput('view_mode', 'sidebar')`). | **SKIPPED** |
| **2.1.3** Test All States | Verify `Idle`, `Thinking`, `Speaking`, `Listening`, and mode transitions work. | **SKIPPED** |

### 2.2 Scripted Demo Flows
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **2.2.1** Write Demo Script JSON | Define 3 scripts: (1) Leopoldo Intro + **Bulk Quote**, (2) Francisca Design, (3) Antônia Support. | **DONE** |
| **2.2.2** Trigger Avatar Emotions | Sync Rive `emotion` input with message sentiment (e.g., `approval`, `concern`). | **Mocked in Console** |
| **2.2.3** Auto-Play Mode | A "Play Demo" button that runs the script automatically for video recording. | **DONE** |
| **2.2.4** Bulk Quote UI (Mock) | A visual "Quote Card" component that slides up during the script showing breakdown (50 units @ €15). | **DONE** |

### 2.3 Product Mockup Gallery (Showroom)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **2.3.1** Generate Static Mockups | Use Cloudinary (or Photoshop) to create 15-20 realistic product images. | **DONE (1 Generated)** |
| **2.3.2** `<ProductCard />` Component | Displays mockup image, product name, artist name, price. | **DONE** |
| **2.3.3** `/app/showroom` Page | Grid layout of `ProductCard` components with filtering pills (Tees, Hoodies, etc.). | **DONE** |

### 2.4 Workshop Canvas (Placeholder)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **2.4.1** `/app/workshop` Layout | 75% canvas area, 25% Francisca sidebar. | **DONE** |
| **2.4.2** Static Canvas Content | Display a single large mockup image that can be "presented" by Francisca in the demo script. | **SKIPPED (Pivot to Real)** |

## Phase 3: Frontend Content Suite (Jan 12 - Jan 26)

> **Goal:** Build real, pixel-perfect frontends for ALL key surfaces. No fakes. These will be used to record the "Real Product" video for crowdfunding.
> **Philosophy:** "What you see is what you get." The video will show actual React components, not After Effects or Figma prototypes.
> **Status:** 🔄 IN PROGRESS

### 3.1 Main Website (Home) ✅ COMPLETE
*   **Status:** **100% COMPLETE** (Hero, Trio, Glassmorphism).
*   **Completed:**
    *   [x] Hero section with animated headline
    *   [x] Avatar trio component
    *   [x] Masonry grid portfolio
    *   [x] Feature marquees
    *   [x] Horizontal scroll section
    *   [x] Production quality specs
    *   [x] Waitlist CTA section
    *   [x] Footer (5-column layout)
    *   [x] Mobile polish for Social Proof
    *   [x] GDPR compliance banner
    *   [x] Privacy policy page
    *   [x] Data rights portal

### 3.2 Waitlist Landing Page (`/waitlist`)
> **Concept:** The "Velvet Rope" entry point. High-conversion, mysterious.
*   **3.2.1** Layout: Clean, centered layout with "Access Request" form.
*   **3.2.2** Video Placeholder: A cinematic container where the crowdfunding video will eventually live.
*   **3.2.3** Form: Name, Email, Social Link (for vetting).

### 3.3 Crowdfunding Landing Page (`/invest`)
> **Concept:** For investors/backers. Professional, data-driven, "Visionary".
*   **3.3.1** Pitch Deck Scroller: Interactive storytelling of the problem/solution.
*   **3.3.2** Video Placeholder: The main pitch video.
*   **3.3.3** "Invest" CTA: Links to crowdfunding platform (or email capture).

### 3.4 Artist E-Shop Template (`/shop/[artist]`)
> **Concept:** The "Product". What the artist actually gets. MUST look stunning.
*   **3.4.1** Layout: Masonry grid, verified badge, immersive header.
*   **3.4.2** Interactivity: Quick-view, "Add to Cart" slide-over.
*   **3.4.3** Aesthetics: Minimalist, "Gallery-like" (letting the merch shine).

### 3.5 APP AI Chat Interface (`/app`)
> **Concept:** The "Workstation". Where the magic happens.
*   **3.5.1** Sidebar: Collapsible, with "Agent Switcher" (Leopoldo/Francisca).
*   **3.5.2** Chat Area: Rich message bubbles (Text, Images, Product Cards).
*   **3.5.3** Input Area: Multi-modal (Text + Mic + Upload).
*   **3.5.4** V0 Integration (Visuals): The chat needs to render HTML/CSS previews (simulating the V0 capability).

---

## Phase 4: Production MVP – Backend Core (Weeks 7-8)

> **Goal:** Build the REAL application foundation using Neon + Clerk. No more mocks.
> **Pivot Note (Dec 18):** Acceleration Strategy active. Merging Phase 3 video goals into actual product usage.
> **Stack Pivot (Jan 6, 2025):** Switched to Neon (Postgres) + Drizzle ORM + Upstash (Redis) for AI-native architecture.

### 4.1 Neon + Drizzle Project Setup
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **4.1.1** Initialize Neon | Create project on neon.tech, get connection string. | Add `DATABASE_URL` to `.env`. |
| **4.1.2** Install Dependencies | `bun add drizzle-orm @neondatabase/serverless @clerk/nextjs @upstash/redis` | |
| **4.1.3** Configure Drizzle | Create `drizzle.config.ts` and `src/db/index.ts`. | Setup Neon serverless driver. |
| **4.1.4** Configure Clerk Provider | Wrap app in `<ClerkProvider>`. | |
| **4.1.5** Set Up Upstash Redis | Create instance on upstash.com, add `UPSTASH_REDIS_*` to `.env`. | For sessions, caching, rate limiting. |

### 4.2 Database Schema (Drizzle Tables)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **4.2.1** Define Schema | Create `src/db/schema.ts` with Drizzle table definitions. | Migrate from existing Convex schema. |
| **4.2.2** `users` table | `clerkId`, `email`, `displayName`, `userType` (artist/customer), `avatarUrl`, `stripeCustomerId`. | |
| **4.2.3** `artistStores` table | `artistId`, `slug`, `storeName`, `themeConfig`, `isLive`. | |
| **4.2.4** `products` table | `storeId`, `name`, `description`, `baseCost`, `retailPrice`, `mockupUrl`, `designFileUrl`. | |
| **4.2.5** `orders` table | `storeId`, `customerId`, `status`, `totalPrice`, `stripePaymentId`, `shippingAddress`, `type` (retail/bulk). | |
| **4.2.6** `orderItems` table | `orderId`, `productId`, `quantity`, `priceAtPurchase`. | |
| **4.2.7** Run Migrations | Use `drizzle-kit push` to sync schema to Neon. | |

### 4.3 Authentication (Clerk)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **4.3.1** Passkey/Magic Link Setup | Enable in Clerk dashboard (built-in support). | PRD 1.10.9. |
| **4.3.2** Auth UI Components | Use `<SignIn />`, `<SignUp />`, `<UserButton />` from `@clerk/nextjs`. | Pre-built, customizable. |
| **4.3.3** Middleware | Create `middleware.ts` with `clerkMiddleware()` for protected routes. | |
| **4.3.4** User Sync Webhook | Create `/api/webhooks/clerk` route to sync Clerk user data to `users` table. | Clerk webhook on user create/update. |

---

## Phase 5: Production MVP – AI Agents (Weeks 9-10)

> **Goal:** Connect Leopoldo and Francisca to real AI backends (OpenRouter) via Vercel Functions.

### 5.1 AI Infrastructure
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **5.1.1** OpenRouter API Setup | Create account, get API key, add to `.env`. | |
| **5.1.2** Replicate API Setup | Create account, get API key for FLUX.1 [dev] fine-tuned models. | Commercial license included. |
| **5.1.3** Create AI API Routes | `src/app/api/chat/route.ts` – Route that calls OpenRouter, streams response. | Vercel Functions handle external API calls. |
| **5.1.4** System Prompts | Define agent prompts in `src/lib/ai/prompts.ts`. | Refer to `CAT_SUITE_PROMPTS.md`. |
| **5.1.5** Vector Storage Setup | Configure Neon pgvector for agent memory/context. | Native Postgres vector extension. |
| **5.1.6** FLUX LoRA Registry | Create `loraStyles` table in Neon for LoRA metadata (display name, trigger word, Replicate model ID, example images). | See `flux-lora-replicate-training-plan.md` for schema. |
| **5.1.7** Hivelocity GPU Setup | Deploy Ollama (Llama 3.1 8B) + Attention U-Net on RTX 4090. | €300/month Hivelocity GPU server. |

### 5.2 Chat Backend (Vercel Functions)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **5.2.1** Chat API Route | API route that receives user message, calls OpenRouter, streams response. | Use Vercel AI SDK for streaming. |
| **5.2.2** Agent Routing Logic | Determine which agent to use based on context (e.g., current page, user intent). | |
| **5.2.3** Conversation History | Store in Neon `chatSessions` table, cache recent in Upstash Redis. | Polling or SWR for updates. |
| **5.2.4** Webhook Endpoints | Create `/api/webhooks/*` routes for external integrations. | For Stripe, Clerk, etc. |

### 5.3 FLUX.1 [dev] LoRA Training & Integration
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **5.3.1** Dataset Preparation | Curate 20 designs per style (American Traditional, Vintage Band, Skull Art, Minimalist Logo) from Expert's archive. | 80 images total for 4 LoRAs. |
| **5.3.2** LoRA Training via Replicate | Train 4 LoRAs using Replicate API ($2 per LoRA = $8 total). | See `flux-lora-replicate-training-plan.md` for training script. |
| **5.3.3** LoRA Registry Database | Populate `loraStyles` table with LoRA metadata (display name, slug, trigger word, Replicate model ID). | Enables dynamic LoRA selection. |
| **5.3.4** Image Generation API | Create `/api/generate-artwork` route that calls Replicate with selected LoRA + prompt. | Handles trigger word injection, Replicate polling. |
| **5.3.5** Visual Style Gallery UI | Build style card gallery in `/app/workshop` for customer-facing LoRA selection. | Includes example images from Cloudinary. |
| **5.3.6** Integration Testing | Test all 4 LoRAs with various prompts, verify output quality. | Ensure 90%+ designs are print-ready. |

### 5.4 Rive Avatar Sync
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **5.4.1** "Speaking" State | When AI response is streaming, set Rive `is_speaking = true`. | |
| **5.4.2** Emotion Detection | Simple keyword analysis on AI response to set `emotion` input (e.g., "Congratulations" → `approval`). | |

---

## Phase 6: Production MVP – Commerce (Weeks 11-13)

> **Goal:** Enable real payments, order creation, and artist payouts.

### 6.1 Stripe Integration
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **6.1.1** Stripe Account Setup | Create Stripe account, get API keys. | **DONE** |
| **6.1.2** Express Checkout (Payment Element) | Integrate `@stripe/react-stripe-js` for Apple Pay / Google Pay. | **DONE (Session-based)** |
| **6.1.3** Checkout Session API | `/api/checkout/create-session` – Creates Stripe Checkout Session for an order. | **DONE (via API Route)** |
| **6.1.4** Webhook Handler | `/api/webhooks/stripe` – Listens for `checkout.session.completed`, updates order status. | **DONE** |

### 6.2 Order Management
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **6.2.1** Cart State | `useCart()` hook with Zustand. Persists to `localStorage`. | |
| **6.2.2** Order Creation Flow | `addToCart` → `initiateCheckout` → Stripe redirect → Webhook → Order saved to Supabase. | |
| **6.2.3** Order Confirmation Page | `/order/[id]/confirmation` – Shows order details after successful payment. | |
| **6.2.4** Bulk Quote Request Flow | Chat-based Intent ("I need 50 tees") → AI creates `draft_bulk_order` → User confirms → Invoiced via Stripe. | |

### 6.3 Artist Dashboard
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **6.3.1** `/dashboard` Route | Protected route for authenticated artists. | |
| **6.3.2** Store Overview | Display store stats: Total Sales, Total Revenue, Pending Orders. | |
| **6.3.3** Product Management | List products, Add Product form, Edit Product. | |
| **6.3.4** Order List | View incoming orders with status (Pending, Shipped, Completed). | |

### 6.4 Supplier Integration (Stanley Stella)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **6.4.1** Stock Check Service | `StanleyStellaService.getStock(sku)` – Checks supplier inventory. | Read-Only API. |
| **6.4.2** Dynamic Shipping Dates | UI logic: If Local Stock=0 AND Supplier Stock>0 → "Ships in 5-7 days". | |


---

## Phase 7: Beta Launch & Dataset Growth (Months 1-9)

> **Goal:** Controlled beta scaling (10 → 50 → 100 artists) while training Attention U-Net with Expert's expert dataset.
> **Strategy:** Each cohort provides training data + quality feedback → Model retraining → Better accuracy for next cohort.

### 7.0 Pre-Beta: Model Training (Weeks 1-2)

| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **7.0.1** U-Net Dataset Preparation | Export 100 existing designs + separations from Expert's archive. | High-quality baseline. |
| **7.0.2** Separation Studio Augmentation | Generate 400 "good quality" separations via Separation Studio. | Fast augmentation, acceptable quality. |
| **7.0.3** Dataset Validation | Verify 500-sample dataset structure (images + masks). | Ensure consistent format for training. |
| **7.0.4** U-Net Training (Nebius H100) | Train Attention U-Net on 500 samples. Target: 85-90% accuracy. | €1,500 one-time training cost. |
| **7.0.5** Hivelocity Ollama Setup | Deploy Llama 3.1 8B on RTX 4090. | Fine-tune on 1K synthetic conversation samples. |
| **7.0.6** FLUX LoRA Pre-Training | Train 4 initial LoRAs (American Traditional, Vintage Band, Skull Art, Minimalist Logo) via Replicate. | $8 total cost. See Phase 5.3 for details. |
| **7.0.7** Visual Style Gallery | Deploy LoRA visual gallery UI in `/app/workshop` for customer style selection. | Includes example images from Cloudinary. |
| **7.0.8** Integration Testing | Connect U-Net → OpenCV halftoning → PSD export pipeline. Test FLUX LoRA generation end-to-end. | Full workflow verification. |

### 7.1 Beta Cohort 1: 10 Artists (Months 1-3)

| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **7.1.1** Artist Selection | Invite known artists (friends, early supporters). | Trust-based beta, tolerant of 5-10% failures. |
| **7.1.2** Onboarding Flow | Guide artists through store creation + first design. | Leopoldo + Francisca conversational onboarding. |
| **7.1.3** Design Volume | 10 artists × 30 designs = 300 new designs. | Expert curates 10/day = +900 expert samples. |
| **7.1.4** Quality Metrics | Customer approval (1-3 rating) + Internal audit (1-5 rubric). | Track failures, improvement opportunities. |
| **7.1.5** U-Net Dataset Growth | 500 → 2,200 samples (+500 Separation Studio augmentation). | Weekly U-Net retraining. |
| **7.1.6** Model Accuracy | Target: 90-95% separation quality. | 5-10% failures routed to human designer queue. |
| **7.1.7** LoRA Dataset Collection | Collect customer 3/3 rated designs per style for retraining dataset. | Manual curation by Expert (Months 1-3). |
| **7.1.8** Monthly LoRA Retraining | Retrain 4 LoRAs at end of Month 3 with customer-approved designs. | $8 per retraining cycle. |

**Success Criteria:**
- ✅ 90%+ designs require zero human intervention
- ✅ Customer approval rating >2.5/3 average
- ✅ Internal audit scores >3.5/5 average
- ✅ Dataset: 2,200+ expert-curated samples

### 7.2 Beta Cohort 2: 50 Artists (Months 4-6)

| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **7.2.1** Cohort Expansion | Invite 40 more artists (referrals + waitlist). | Still controlled, known community members. |
| **7.2.2** Design Volume | 50 artists × 30 designs = 1,500 new designs. | Expert: +900 expert samples. |
| **7.2.3** U-Net Dataset Growth | 2,200 → 5,100 samples (+500 Separation Studio). | Bi-weekly U-Net retraining. |
| **7.2.4** Model Accuracy | Target: 95-98% separation quality. | <5% failures, human review only for edge cases. |
| **7.2.5** Ollama Fine-Tuning | Fine-tune Llama 3.1 8B on 50K real conversation samples. | Custom intent classifier better than GPT-4. |
| **7.2.6** Infrastructure Scaling | Upgrade to A6000 if RTX 4090 bottlenecks. | Monitor GPU utilization, scale when >80%. |
| **7.2.7** LoRA Dataset Automation | Automate LoRA dataset collection (all customer 3/3 ratings → training dataset). | Reduce manual curation overhead. |
| **7.2.8** Monthly LoRA Retraining | Retrain 4 LoRAs monthly (Months 4, 5, 6) with automated dataset. | $8 × 3 months = $24 total. |
| **7.2.9** LoRA Version A/B Testing | A/B test new LoRA versions (v4, v5, v6) vs. existing versions. | Keep all versions for comparison. |

**Success Criteria:**
- ✅ 95%+ designs require zero human intervention
- ✅ Customer approval rating >2.7/3 average
- ✅ Internal audit scores >4.0/5 average
- ✅ Dataset: 5,100+ expert-curated samples

### 7.3 Beta Cohort 3: 100 Artists (Months 7-9)

| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **7.3.1** Final Beta Expansion | Invite 50 more artists (waitlist + public applications). | Semi-public beta, diverse artist types. |
| **7.3.2** Design Volume | 100 artists × 30 designs = 3,000 new designs. | Expert: +900 expert samples. |
| **7.3.3** U-Net Dataset Growth | 5,100 → 9,500 samples (+500 Separation Studio). | Monthly U-Net retraining. |
| **7.3.4** Model Accuracy | Target: 98%+ separation quality (production-ready). | <2% failures, world-class accuracy. |
| **7.3.5** Quality Benchmark | Compare U-Net output vs Expert's manual work. | Blind A/B test: Can experts tell the difference? |
| **7.3.6** Public Launch Prep | Final polish, marketing materials, press outreach. | Prepare for unrestricted public launch. |
| **7.3.7** LoRA Version Consolidation | Replace older LoRA versions (v1-v6) with latest (v7+) to simplify deployment. | Keep best-performing version only. |
| **7.3.8** Monthly LoRA Retraining | Retrain 4 LoRAs monthly (Months 7, 8, 9) with fully automated dataset. | $8 × 3 months = $24 total. |
| **7.3.9** LoRA Quality Benchmark | Compare LoRA output vs base FLUX.1 [dev]. | Measure quality improvement from fine-tuning. |

**Success Criteria:**
- ✅ 98%+ designs require zero human intervention
- ✅ Customer approval rating >2.8/3 average
- ✅ Internal audit scores >4.5/5 average
- ✅ Dataset: **10,000+ expert-curated samples** (WORLD-CLASS)
- ✅ U-Net output indistinguishable from Expert's manual work in blind tests

### 7.4 Quality Assurance Framework

**Customer Approval Rating (Every Design):**
- User rates final design: 1 = Poor, 2 = Okay, 3 = Excellent
- Triggers human review if rating < 2
- Tracks satisfaction per artist, style, complexity
- Data feeds back into model training priorities

**Internal Manual Audit (10% Sample Monthly):**
- Expert + expert panel scores representative designs
- 5-point rubric:
  1. **Color Accuracy (1-5):** Pantone matching precision
  2. **Edge Quality (1-5):** Clean vector boundaries, no bleeding
  3. **Halftone Compatibility (1-5):** Moiré prevention, proper angles
  4. **Registration Complexity (1-5):** Screen count optimization
  5. **Production Readiness (1-5):** Overall print-ready quality
- Aggregate scores guide retraining focus areas
- Creates high-confidence ground truth for supervised learning

---

## Phase 8: Production MVP – Polish & Public Launch (Months 10-11)

> **Goal:** Final testing, marketing launch, unrestricted public access.

### 7.1 Testing
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **7.1.1** End-to-End Test (Manual) | Run through the full user journey: Browse → Add to Cart → Checkout → Order Confirmation. | |
| **7.1.2** AI Conversation Testing | Test various prompts with Leopoldo/Francisca. Check for hallucinations. | |
| **7.1.3** Cross-Browser Testing | Test on Chrome, Safari, Firefox. | |
| **7.1.4** Mobile Responsiveness | Test all pages on mobile viewport. | |
| **7.1.5** Automated Smoke Tests | Script critical path (Home → Chat → Checkout) using `click`, `fill`, `wait_for`. | Replaces repetitive manual testing. |
| **7.1.6** Network Resilience Tests | Use `emulate` to simulate Slow 3G/4G connections. | Verify graceful degradation/loading states. |
| **7.1.7** Console Error Detection | Use `list_console_messages` during test runs. | Assert ZERO `error` type messages. |
| **7.1.8** Hover Interaction Tests | Use `hover` to validate CSS states on ProductCards. | Ensure interactive elements feel "alive". |

### 7.2 Launch Prep
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **7.2.1** Vercel Deployment | Connect GitHub repo, configure environment variables, deploy. | |
| **7.2.2** Domain Setup | Point `merchfrom.com` (or staging domain) to Vercel. | |
| **7.2.3** First Artist Onboarding | Manually onboard 1-3 pilot artists. Create their stores. | |

---

## Phase 8: Social Commerce Integration Hub (Post-Launch Expansion)

> **Goal:** Enable artists to syndicate their MerchFrom catalog to Discord, Meta (Instagram/Facebook Shop), TikTok Shop, and Twitch with a few clicks.
> **Dependencies:** Requires Phase 7 (Launch) to be complete.
> **Full Spec:** See `Documentation/SOCIAL_COMMERCE_HUB.md`

### 8.0 Foundation (Week 1-2 Post-Launch)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **8.0.1** Catalog Sync Schema | Add `platformSync` and `platformOverrides` fields to `products` table. | Drizzle schema migration. |
| **8.0.2** Platform Adapter Interfaces | Create abstract `CatalogAdapter` class with platform-specific implementations. | `src/lib/adapters/` |
| **8.0.3** Integration Tools (MCPO) | Evaluate **open-webui/mcpo** to stick agents to OpenAPI endpoints. | Standardize external agent interfaces. |
| **8.0.4** Integration Tables | Define `discordIntegrations`, `metaIntegrations`, `tiktokIntegrations`, `twitchIntegrations` tables. | OAuth tokens, sync status. |

### 8.1 Discord Integration (Week 3-5)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **8.1.1** Discord Bot Setup | Create Discord Application, register slash commands (`/merch drop`, `/merch shop`). | discord.js |
| **8.1.2** Embedded Activity (MVP) | Build iframe-based storefront using Discord Embedded App SDK. | Launches in voice/text channels. |
| **8.1.3** OAuth Flow | Artist connects Discord server from dashboard. | Store `guildId`, `botToken`. |
| **8.1.4** Cat-Suite Presence | Leopoldo avatar greets users in Activity. | Reuse existing avatar assets. |

### 8.2 Meta Commerce (Week 6-8)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **8.2.1** Business Manager Integration | OAuth flow to connect artist's Facebook Page + Instagram. | Graph API permissions: `catalog_management`, `commerce_manage_accounts`. |
| **8.2.2** Catalog Sync Engine | Full sync every 24h, delta sync every 15min for inventory/price. | Meta requirement. |
| **8.2.3** Order Webhook Handler | Ingest Meta orders into MerchFrom `orders` table. | `/api/webhooks/meta` endpoint. |
| **8.2.4** Product Tagging Enablement | Guide artists to tag products in posts/Reels after sync. | In-app tutorial. |

### 8.3 TikTok Shop (Week 9-11)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **8.3.1** Partner Portal Registration | Register MerchFrom as TikTok Shop Partner (US + Global). | 2-3 biz days approval. |
| **8.3.2** Products API Integration | Create/update products via TikTok Open API. | Rate limit: 50 req/s/store. |
| **8.3.3** EU Compliance (Dec 2024)** | Add Manufacturer + Responsible Person fields for EU sellers. | Dashboard UI addition. |
| **8.3.4** Order Sync | Ingest TikTok orders, sync fulfillment status back. | Bidirectional sync. |

### 8.4 Twitch Extension (Week 12-13)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **8.4.1** Panel Extension | Persistent merch showcase below stream. | Engagement only (no direct commerce). |
| **8.4.2** Overlay Extension | "Now Selling" pop-up triggered by streamer. | |
| **8.4.3** External Link CTA | "Get It" button redirects to MerchFrom e-shop. | Twitch prohibits external payments in Extensions. |

### 8.5 Dashboard UX (Week 14-15)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **8.5.1** "Connect Channels" Page | `/dashboard/integrations` — Platform cards with connect buttons. | |
| **8.5.2** Sync Status Monitor | Real-time sync status per platform with error alerts. | |
| **8.5.3** Platform Fee Transparency | Display estimated artist net per platform in product settings. | |

### 8.6 Order Aggregation (Week 16-17)
| Task | Subtasks | Notes |
| :--- | :--- | :--- |
| **8.6.1** Unified Order Ingestion | All platform orders flow into single `orders` table with `source` field. | |
| **8.6.2** Cross-Platform Inventory Sync | Inventory update on one platform triggers sync to all connected platforms. | Prevents overselling. |
| **8.6.3** Fulfillment Status Broadcast | Shipping updates pushed back to all platforms. | Per-platform API calls. |

> [!NOTE]
> **Pricing Model Reminder:** MerchFrom uses **fixed base costs** (tees €15, hoodies €25+). Artists set their retail price and keep the spread. Platform fees (Discord 15-30%, TikTok ~5%, Meta ~5%) are deducted from artist net, never from MerchFrom base cost. Always prefer off-site checkout (redirect to MerchFrom e-shop) to maximize artist margins.

---

## Deferred Features (Post-MVP)

The following are explicitly **out of scope** for the MVP but architected to be added later:

| Feature | Phase | Notes |
| :--- | :--- | :--- |
| Voice Input (Whisper) | Post-Launch | UI placeholder exists. Add real Whisper integration later. |
| Merch Coins System | Month 7+ | Database schema can be added; full feature is post-PMF. |
| ~~AI Store Designer (v0 API)~~ | **Phase 3** | Moved to Phase 3 — Demo-ready for crowdfunding video! |
| Production Automation (OpenCV/Sharp) | Post-Investment | Manual production workflow for MVP. |
| Artist Payouts (Stripe Connect) | Phase 6+ | Manual bank transfers for MVP; automate later. |
| Automated EDI Ordering (Stanley Stella) | Post-MVP | Requires FTP/EDI integration. Manual ordering for MVP. |
| ~~Social Commerce Hub~~ | **Phase 8** | Moved to Phase 8 — Now part of main roadmap! |


---

## Skills Integration Plan

### Phase 3 (Current) - P0 Skills
- [x] code-change-verification (Agent 1)
- [x] lint-fixer (Agent 1)
- [x] confidence-check (Agent 5)
- [x] data-privacy-compliance (Agents 2, 3, 4)
- [ ] agile-product-owner
- [x] create-plan (Agent 5)
- [x] track-management (Agent 5)

### Phase 4 - Backend Skills (P1)
- [ ] architecture-decision-records
- [ ] postgresql-table-design
- [ ] backend-dev-guidelines
- [ ] auth-implementation-patterns
- [ ] gdpr-dsgvo-expert

### Phase 5 - AI Skills (P1)
- [ ] rag-implementation
- [ ] chroma
- [ ] embedding-strategies
- [ ] vector-index-tuning
- [ ] langchain
- [ ] langsmith-fetch
- [ ] evaluating-llms-harness
- [ ] llm-evaluation
- [ ] whisper
- [ ] long-context
- [ ] hybrid-search-implementation

### Phase 6 - Commerce Skills (P1/P2)
- [ ] pci-compliance (P1)
- [ ] competitive-landscape (P2)
- [ ] lead-research-assistant (P2)

### Phase 7 - Launch Skills (P1)
- [ ] e2e-testing-patterns
- [ ] test-coverage-improver
- [ ] verify-tests-fail-without-fix
- [ ] final-release-review
- [ ] it-operations (P2)

### Phase 8 - Social Commerce (P2)
- [ ] content-creator
- [ ] python-packaging
- [ ] websocket-patterns

### Post-Launch (P3)
- [ ] ui-ux-pro-max
- [ ] frontend-ui-ux
- [ ] kpi-dashboard-design
- [ ] developer-growth-analysis
- [ ] team-composition-analysis
- [ ] cto-advisor
- [ ] iso27001-security

---

## Verification Plan

Since there is no existing codebase or tests, verification will be **manual** during development.

### Demo MVP Verification (End of Phase 3)
1.  **Run the app locally:** `bun dev`
2.  **Navigate through all routes:** `/`, `/app`, `/app/workshop`, `/app/showroom`, `/app/support`.
3.  **Verify Rive placeholders** load correctly.
4.  **(SKIPPED)** Click "Play Demo" and watch the scripted conversation.
5.  **Observe Hero-to-Copilot transitions** when navigating between routes.
6.  **Verify Hero Animation:** Watch the "Product Walkthrough" cycle on the landing page (replaces Step 4).

### Production MVP Verification (End of Phase 7)
1.  **Create a test artist account** using Passkey/Magic Link.
2.  **Add a product** via the Artist Dashboard.
3.  **As a customer, browse the demo store** and add the product to cart.
4.  **Complete checkout** using Stripe test mode (card `4242 4242 4242 4242`).
5.  **Verify order appears** in both the customer's order history and the artist's dashboard.
6.  **Test AI chat** with Leopoldo on the landing page and Francisca in the workshop.

---

## Key Orchestrator Notes

> [!TIP]
> **For Victor (Orchestrator):**
>
> 1.  **Start Phase 0.3 (Rive Commissioning) immediately.** This is the biggest external dependency. Post the job today.
> 2.  **Use this document as your session prompt.** When starting a new Antigravity session, copy the relevant Phase/Task section into the prompt.
> 3.  **Mark tasks as complete** in this document or a separate `task.md` as you go.
> 4.  **(OBSOLETE) Demo Mode Flag:** Since we are building real features, the `NEXT_PUBLIC_DEMO_MODE` flag is now deprecated. We build for Prod.
> 5.  **(NEW)** Focus on robustness. The video will be real usage, not a script.

---

**Roadmap Owner**: Victor Bendas
**Last Updated**: January 27, 2026
**Status**: On Track ✅ (Phase 3 in progress)

**Recent Completed Features**:
- ✅ GDPR Compliance Implementation (Jan 21, 2026)
- ✅ Multi-Agent System Integration (Jan 2026)
- ✅ Main Website Responsive Polish (Desktop, Mobile, Tablet)
- ✅ Waitlist CTA with Morphing Text and Marquees
- ✅ Workspace AI Chat Interface with Expression System
- ✅ Session History & Notifications Sidebar
- ✅ Quick Prompt Chips with Gradient Borders
- ✅ Sticky Header with User Menu & History Icon

**Current Focus**:
- 🔄 Phase 3.2: App Front-End Structure (AI chat interface) - **COMPLETE**
- 🔄 Phase 3.3: App UI Integration to Main Website - **COMPLETE**
- 📋 Phase 3.4: Waitlist Landing Page
- 📋 Phase 3.5: Crowdfunding Landing Page

---

## Appendix: File/Folder Structure (Proposed)

```
/merch-from
├── /app
│   ├── /(marketing)
│   │   └── page.tsx         # Landing page
│   ├── /app
│   │   ├── layout.tsx       # App shell with header, avatar, chat
│   │   ├── page.tsx         # Main app entry (Hero Mode)
│   │   ├── /workshop
│   │   │   └── page.tsx     # Design canvas (Copilot Studio)
│   │   ├── /showroom
│   │   │   └── page.tsx     # Product gallery (Ambient Orb)
│   │   └── /support
│   │       └── page.tsx     # Antônia support (Tag-In)
│   ├── /dashboard
│   │   └── page.tsx         # Artist dashboard (protected)
│   └── /api
│       ├── /chat
│       │   └── route.ts     # AI chat endpoint
│       ├── /checkout
│       │   └── route.ts     # Stripe checkout
│       └── /webhooks
│           └── stripe/route.ts
├── /components
│   ├── /ui                  # HeroUI components
│   ├── AvatarContainer.tsx
│   ├── ChatPanel.tsx
│   ├── ProductCard.tsx
│   └── TransitionLayout.tsx
├── /lib
│   ├── /ai
│   │   ├── openrouter.ts
│   │   └── prompts.ts
│   ├── /demo
│   │   └── scripts.ts       # Mock conversation scripts
│   ├── supabase.ts
│   └── stripe.ts
├── /hooks
│   ├── useRiveAvatar.ts
│   ├── useMockConversation.ts
│   └── useCart.ts
├── /public
│   ├── /rive
│   │   ├── leopoldo.riv
│   │   ├── francisca.riv
│   │   └── antonia.riv
│   └── /mockups
│       └── *.png
├── /types
│   └── index.ts
├── .env.local
├── tailwind.config.ts
└── package.json
```
