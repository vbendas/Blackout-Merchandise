# Merch From: MVP Development Roadmap

**Last Updated**: January 22, 2026
**Current Phase**: Phase 3 - Frontend Content Suite
**Strategy**: "Hybrid Build" — One codebase architected for production, with mocked data for demo phase

---

## Build Philosophy

Building a throwaway "Demo" and then a separate "Production" app wastes time. Instead, we build **one codebase** with clean separation:

1. **Demo Mode:** Uses mocked API responses, static design assets, and scripted conversation flows
2. **Production Mode:** Swaps mocks for real Neon data, Stripe payments, and live AI calls via environment flags

Every line of code written for the demo is production-ready.

---

## High-Level Phases Overview

| Phase | Name | Goal | Duration | Status |
|-------|------|------|----------|--------|
| **0** | Foundations | Project setup, design system, avatar commissioning | 1 Week | ✅ COMPLETE |
| **1** | Demo MVP: Core Shell | Static pages, routing, placeholder states | 2 Weeks | ✅ COMPLETE |
| **2** | Demo MVP: Interactive | Scripted chat, mockup gallery, animated transitions | 2 Weeks | ✅ COMPLETE |
| **3** | Frontend Content Suite | Build ALL interfaces for video accuracy | 2 Weeks | 🔄 IN PROGRESS |
| **4** | Prod MVP: Backend | Neon + Clerk, Auth, Real Data Architecture | 2 Weeks | ⏳ Jan 26 → Feb 9 |
| **5** | Prod MVP: AI Agents | Connect LLMs, Real Voice, Avatar Sync | 2 Weeks | ⏳ Feb 9 → Feb 23 |
| **6** | Prod MVP: Commerce | Stripe, Orders, Artist Dashboard | 3 Weeks | ⏳ Feb 23 → Mar 16 |
| **7** | Prod MVP: Launch | Testing, Artist Onboarding | 2 Weeks | ⏳ Mar 16 → Mar 30 🚀 |
| **8** | Social Commerce Hub | Discord, Meta, TikTok, Twitch catalog sync | 17 Weeks | ⏳ Apr-Jul 2026 |

**Total Estimated Time:** ~32 Weeks (MVP: 15 Weeks + Social Commerce: 17 Weeks)
**Workload:** 6 days/week, 6 hours/day (36h/week)

---

## Phase 0: Foundations ✅ COMPLETE

**Goal:** Set up accounts, install tools, create project skeleton, commission avatar assets

### Completed Tasks

- [x] GitHub, Vercel, Neon, Clerk accounts created
- [x] Node.js v20, Bun, Git installed
- [x] Next.js 16 project initialized
- [x] HeroUI component library configured
- [x] Environment variables structure created
- [x] Folder structure established

### Cat-Suite Avatar Assets ✅ COMPLETE

**Method:** Google Gemini AI generation (switched from €800+ Rive commission to €20/mo AI generation)

- [x] Leopoldo: 20 expressions generated
- [x] Francisca: 20 expressions generated
- [x] Antonia: 20 expressions generated
- [x] All assets upscaled to 8K
- [x] Background removal complete
- [x] Cloudinary upload configured

**Expression List (20 per character):**
neutral, speaking_a, speaking_b, happy, excited, thinking, confused, shocked, sad, angry_annoyed, wink, love, sleepy, mischievous, proud, mouth_closed, mouth_o_shape, mouth_wide_open, mouth_teeth_showing, blep

---

## Phase 1: Demo MVP - Core Shell ✅ COMPLETE

**Goal:** Build skeleton with navigation, layouts, and static content

### Completed Tasks

| Task | Status |
|------|--------|
| Route Structure (`/`, `/app`, `/app/workshop`, `/app/showroom`, `/app/support`) | ✅ |
| AppLayout (shared layout with header, avatar, chat) | ✅ |
| Hero Section (landing page with Leopoldo avatar) | ✅ |
| AvatarContainer component | ✅ |
| Rive State Hook | ✅ |
| ChatPanel (fixed-bottom chat input) | ✅ |
| ChatBubbleList (scrollable messages) | ✅ |
| Mock Conversation Hook | ✅ |
| TransitionLayout (Framer Motion animations) | ✅ |

---

## Phase 2: Demo MVP - Interactive ✅ COMPLETE

**Goal:** Integrate assets, create scripted demo flows, build mockup gallery

### Completed Tasks

| Task | Status |
|------|--------|
| Demo Script JSON (Leopoldo Intro, Francisca Design, Antonia Support) | ✅ |
| Avatar emotion sync (mocked in console) | ✅ |
| Auto-Play Demo mode | ✅ |
| Bulk Quote UI (Quote Card component) | ✅ |
| Static mockups generated | ✅ |
| ProductCard component | ✅ |
| `/app/showroom` page with grid layout | ✅ |
| `/app/workshop` layout (75/25 split) | ✅ |

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

---

## Phase 3: Frontend Content Suite 🔄 IN PROGRESS

**Goal:** Build real, pixel-perfect frontends for ALL key surfaces for crowdfunding video
**Timeline:** Jan 12 → Jan 26, 2026 (2 weeks)
**Philosophy:** "What you see is what you get." Video shows actual React components.

### 3.1 Main Marketing Website (`/`) ✅ COMPLETE
**Status**: Desktop, Mobile, and Tablet production-ready. Comprehensive responsive polish complete.
- [x] Hero Section with Leopoldo avatar
- [x] Trio Section (three agents)
- [x] Glassmorphism effects
- [x] Feature marquees
- [x] Horizontal scroll section
- [x] Production quality specs
- [x] Waitlist CTA section (links to /waitlist page)
- [x] Footer (5-column layout with Discord, Instagram, TikTok)
- [x] Floating socials sidebar

**Note**: This is the MAIN WEBSITE (marketing/brand showcase), NOT the waitlist landing page itself.

### 3.2 App Front-End Structure (`/app`) ⏳ PENDING
**Goal**: Build REAL AI chat interface structure with working OpenRouter integration

**Components:**
- [ ] Collapsible sidebar with agent switcher (Leopoldo, Francisca, Antonia)
- [ ] Rich message bubbles (text, images, product cards)
- [ ] Multi-modal input (text + mic + upload)
- [ ] Real AI backend connection (OpenRouter API)
- [ ] Agent routing logic (topic-based handoffs)
- [ ] Chat history persistence
- [ ] Avatar state sync with AI responses

**Timeline**: Week 1 (Jan 12-19)

### 3.3 App UI Integration to Main Website ⏳ PENDING
**Goal**: Embed the real App AI Chat Interface into the main website

**Integration Points:**
- [ ] Embed app UI into main website layout
- [ ] Shared state between main website and app
- [ ] Navigation flow (main website → app → back to main)
- [ ] Context preservation across views

**Timeline**: Week 2 (Jan 19-26)

**Outcome**: Visitors to main website can experience the REAL AI chat system (not a demo).

### 3.4 Waitlist Landing Page (`/waitlist`) ⏳ PENDING
**Goal**: Build simple waitlist capture page after app UI is complete

**Components:**
- [ ] Clean, centered layout with "Access Request" form
- [ ] Form: Name, Email, Social Link (for vetting)
- [ ] Form validation & error handling
- [ ] Email integration (Mailgun, SendGrid, Brevo, or Loops)
- [ ] Progress counter (e.g., "2,847 interested")

**Timeline**: Week 2 (Jan 19-26)

**Note**: Waitlist page is NOT part of main website. It's a separate landing page.

### 3.5 Crowdfunding Landing Page (`/invest`) ⏳ PENDING
**Goal**: Build crowdfunding campaign page

**Components:**
- [ ] Pitch Deck Scroller (interactive storytelling)
- [ ] Video placeholder for pitch video
- [ ] "Invest" CTA (links to crowdfunding platform)
- [ ] Campaign progress tracker (goal vs raised)

**Timeline**: Week 2 (Jan 19-26)

---

## Phase 3 Summary (2 Weeks)

**Week 1 (Jan 12-19)**:
- ✅ Main website production-ready (desktop/mobile)
- ⏸ Main website tablet adjustment
- ⏸ Build app front-end structure (real AI UI)

**Week 2 (Jan 19-26)**:
- ⏸ Complete app AI backend integration
- ⏸ Integrate app UI into main website
- ⏸ Build waitlist landing page
- ⏸ Build crowdfunding landing page

**Deliverable**: Working AI chat embedded in main website + separate waitlist/crowdfunding landing pages

---

**Status**: ✅ Phase 3.1 COMPLETE, Phase 3.2-3.5 IN PROGRESS

---

## Phase 4: Production MVP - Backend Core

**Goal:** Build REAL application foundation using Neon + Clerk
**Timeline:** Jan 26 → Feb 9, 2026

### 4.1 Neon + Drizzle Project Setup

| Task | Notes |
|------|-------|
| Initialize Neon | Create project, get connection string |
| Install dependencies | `drizzle-orm`, `@neondatabase/serverless`, `@clerk/nextjs`, `@upstash/redis` |
| Configure Drizzle | `drizzle.config.ts` and `src/db/index.ts` |
| Configure Clerk Provider | Wrap app in `<ClerkProvider>` |
| Set Up Upstash Redis | For sessions, caching, rate limiting |

### 4.2 Database Schema (Drizzle Tables)

| Table | Fields |
|-------|--------|
| `users` | clerkId, email, displayName, userType, avatarUrl, stripeCustomerId |
| `artistStores` | artistId, slug, storeName, themeConfig, isLive |
| `products` | storeId, name, description, baseCost, retailPrice, mockupUrl, designFileUrl |
| `orders` | storeId, customerId, status, totalPrice, stripePaymentId, shippingAddress, type |
| `orderItems` | orderId, productId, quantity, priceAtPurchase |

### 4.3 Authentication (Clerk)

| Task | Notes |
|------|-------|
| Passkey/Magic Link setup | Enable in Clerk dashboard |
| Auth UI components | `<SignIn />`, `<SignUp />`, `<UserButton />` |
| Middleware | `middleware.ts` with `clerkMiddleware()` |
| User Sync Webhook | `/api/webhooks/clerk` to sync to `users` table |

---

## Phase 5: Production MVP - AI Agents

**Goal:** Connect Cat-Suite agents to real AI backends via Vercel Functions
**Timeline:** Feb 9 → Feb 23, 2026

### 5.1 AI Infrastructure

| Task | Notes |
|------|-------|
| OpenRouter API setup | API key, add to `.env` |
| AI API routes | `src/app/api/chat/route.ts` — streams response |
| System prompts | `src/lib/ai/prompts.ts` — agent personalities |
| Vector storage | Neon pgvector for agent memory/context |

### 5.2 Chat Backend

| Task | Notes |
|------|-------|
| Chat API route | Receives message, calls OpenRouter, streams response |
| Agent routing | Determine agent based on context/intent |
| Conversation history | Store in Neon, cache recent in Redis |
| Webhook endpoints | `/api/webhooks/*` for external integrations |

### 5.3 Avatar Sync

| Task | Notes |
|------|-------|
| "Speaking" state | Set Rive `is_speaking = true` when streaming |
| Emotion detection | Keyword analysis for emotion triggers |

---

## Phase 6: Production MVP - Commerce

**Goal:** Enable real payments, order creation, and artist payouts
**Timeline:** Feb 23 → Mar 16, 2026

### 6.1 Stripe Integration

| Task | Status |
|------|--------|
| Stripe account setup | ✅ DONE |
| Express Checkout (Payment Element) | ✅ DONE |
| Checkout Session API | ✅ DONE |
| Webhook handler | ✅ DONE |

### 6.2 Order Management

| Task | Notes |
|------|-------|
| Cart state | `useCart()` hook with Zustand, persists to localStorage |
| Order creation flow | addToCart → initiateCheckout → Stripe → Webhook → Order saved |
| Order confirmation page | `/order/[id]/confirmation` |
| Bulk quote request flow | Chat-based intent → draft_bulk_order → user confirms |

### 6.3 Artist Dashboard

| Task | Notes |
|------|-------|
| `/dashboard` route | Protected route for artists |
| Store overview | Total sales, revenue, pending orders |
| Product management | List, add, edit products |
| Order list | View orders with status |

---

## Phase 7: Production MVP - Polish & Launch

**Goal:** Bug fixes, testing, and onboarding first artists
**Timeline:** Mar 16 → Mar 30, 2026 🚀

### 7.1 Testing

- [ ] End-to-End test (manual walkthrough)
- [ ] AI conversation testing (hallucination checks)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile responsiveness
- [ ] Automated smoke tests
- [ ] Network resilience tests (Slow 3G/4G)
- [ ] Console error detection

### 7.2 Launch Prep

- [ ] Vercel deployment with environment variables
- [ ] Domain setup (`merchfrom.com`)
- [ ] First 1-3 pilot artists onboarded

### 7.3 Discord Community Setup

| Task | Notes |
|------|-------|
| Server structure | Public (`#welcome`, `#showcase`, `#general`), Private (`#artist-lounge`, `#announcements`) |
| Verified Artist role | Role assignment from waitlist conversion |
| Embed in Merchandise Studio | Discord widget for community access |
| Welcome flow | Leopoldo avatar greets new members |

---

## Phase 8: Social Commerce Integration Hub

**Goal:** Enable catalog syndication to Discord, Meta, TikTok, Twitch
**Timeline:** Apr-Jul 2026 (17 weeks)
**Dependencies:** Phase 7 (Launch) complete

### 8.1 Discord Integration (Week 3-5)

- Discord bot with slash commands (`/merch drop`, `/merch shop`)
- Embedded Activity (iframe storefront)
- OAuth flow for artist server connection
- Cat-Suite presence in Activity

### 8.2 Meta Commerce (Week 6-8)

- Business Manager OAuth integration
- Catalog sync (24h full, 15min delta)
- Order webhook handler
- Product tagging enablement

### 8.3 TikTok Shop (Week 9-11)

- Partner Portal registration
- Products API integration
- EU compliance (Manufacturer + Responsible Person fields)
- Order sync (bidirectional)

### 8.4 Twitch Extension (Week 12-13)

- Panel Extension (below stream merch showcase)
- Overlay Extension ("Now Selling" pop-up)
- External link CTA to MerchFrom e-shop

### 8.5 Dashboard UX (Week 14-15)

- "Connect Channels" page
- Sync status monitor
- Platform fee transparency

### 8.6 Order Aggregation (Week 16-17)

- Unified order ingestion (single `orders` table with `source` field)
- Cross-platform inventory sync
- Fulfillment status broadcast

---

## Deferred Features (Post-MVP)

| Feature | Phase | Notes |
|---------|-------|-------|
| Voice Input (Whisper) | Post-Launch | UI placeholder exists |
| Merch Coins System | Month 7+ | Database schema can be added |
| Production Automation (OpenCV/Sharp) | Post-Investment | Manual production for MVP |
| Artist Payouts (Stripe Connect) | Phase 6+ | Manual bank transfers for MVP |
| Automated EDI Ordering (Stanley Stella) | Post-MVP | Manual ordering for MVP |

---

## Verification Plan

### Demo MVP Verification (End of Phase 3)

1. Run app locally: `bun dev`
2. Navigate through all routes
3. Verify avatar placeholders load
4. Observe Hero-to-Copilot transitions
5. Watch "Product Walkthrough" cycle on landing page

### Production MVP Verification (End of Phase 7)

1. Create test artist account with Passkey/Magic Link
2. Add product via Artist Dashboard
3. Browse demo store, add to cart
4. Complete Stripe test checkout (`4242 4242 4242 4242`)
5. Verify order in customer and artist dashboards
6. Test AI chat with Leopoldo and Francisca

---

## Resources & Capacity

### Development Team

- **Frontend**: 1 developer (React, Next.js, design systems)
- **Backend**: 1 developer (Node.js, PostgreSQL, API design)
- **AI**: Victor (founder, AI Quality Specialist)

### External Services

| Service | Purpose | Cost |
|---------|---------|------|
| Vercel | Hosting (Next.js) | Free tier |
| Neon | PostgreSQL | Free tier |
| Clerk | Authentication | Free (10K MAUs) |
| OpenRouter | AI API gateway | Pay-as-you-go |
| Stripe | Payments | Transaction fees |
| Cloudinary | Image CDN | Free tier |

---

## Related Documents

- **PRD**: [[PRD]] - Product vision and features
- **Success Metrics**: [[Success-Metrics]] - Detailed KPIs
- **Constraints**: [[Constraints]] - Budget, team, technical limits
- **Feature Evaluations**: [[../00-Evaluations/Feature-Evaluations]] - Why features in each phase

---

**Roadmap Owner**: Victor Bendas
**Last Updated**: January 22, 2026
**Status**: On Track ✅ (Phase 3 in progress)

**Recent Completed Features**:
- ✅ GDPR Compliance Implementation (Jan 21, 2026)
- ✅ Multi-Agent System Integration (Jan 2026)
- ✅ Main Website Responsive Polish (Desktop, Mobile, Tablet)
- ✅ Waitlist CTA with Morphing Text and Marquees

**Current Focus**:
- 🔄 Phase 3.2: App Front-End Structure (AI chat interface)
- 📋 Phase 3.3: App UI Integration to Main Website
- 📋 Phase 3.4: Waitlist Landing Page
- 📋 Phase 3.5: Crowdfunding Landing Page
