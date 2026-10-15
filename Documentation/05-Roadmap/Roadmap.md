# MerchFrom Master Roadmap

> **Document Version:** 4.1 — PRINT PREP ADDED  
> **Last Updated:** October 15, 2026  
> **Status:** P0 Demo Hardening — Week 1 COMPLETE, Week 2 IN PROGRESS  
> **Branch:** `feat/crowdfunding-demo`  
> **Campaign Launch:** June 30, 2026 (Indiegogo)

---

## Current Status

**Week of May 13, 2026 — P0 Sprint Week 2 Starting**

Week 1 (AI Chat Core) is complete. The chat now has real-time streaming responses with typewriter effect, demo mode with scripted conversations for all 3 agents, mobile polish with iOS safe areas, and zero Deepgram references. TypeScript compiles clean across both `/app` and `/mainpage`.

**This week's focus:** Voice pipeline polish (audio quality, interruption, latency), fal.ai design generation setup, and storefront shell. **Blocker:** Need fal.ai account + FAL_API_KEY before Day 10.

**Note:** Voxtral STT is already wired into the wave hold-to-speak flow (STT → Mistral LLM → ElevenLabs TTS pipeline is complete). Day 8 is polish, not integration.

**Active Tracks:**
- **Track A — Engineering:** Voice cleanup, fal.ai integration, storefront components, demo mode refinement
- **Track B — Training Data:** Victor generating 50 images/style → Photoshop → Separation Studio NXT (Weeks 2-3)

---

## Table of Contents

1. [Completed Phases (Summary)](#completed-phases-summary)
2. [Print Prep (Oct 2026)](#print-prep-oct-2026)
3. [Active: P0 — Demo Hardening](#active-p0--demo-hardening-may-9--june-8)
   - [Week 1: AI Chat Core](#week-1-may-9-15-ai-chat-core)
   - [Week 2: Voice + Design Gen](#week-2-may-16-22-voice--design-gen--dataset-start)
   - [Week 3: Storefront](#week-3-may-23-29-storefront--dataset-completion)
   - [Week 4: LoRA + Polish](#week-4-may-30-june-5-lora-integration--essential-polish)
   - [Week 5: Final Polish](#week-5-june-6-8-final-polish)
4. [Future: P1-P7 — Crowdfunding Campaign](#future-p1-p7--crowdfunding-campaign-june--oct-2026)
5. [Future: Phase 7-10 — Platform Scale](#future-phase-7-10--platform-scale-late-2026--2028)
6. [Appendix](#appendix)

---

## Completed Phases (Summary)

> Full historical detail archived in git history and `Documentation/99-Archive/`.

### Phase 0: Foundations ✅ COMPLETE (Jan 2026)
- GitHub, Vercel, Neon, Clerk accounts setup
- Next.js 16 + Tailwind + HeroUI project scaffold
- Cat-Suite avatars: 60 expressions across 3 characters
- GDPR compliance framework
- Multi-agent integration framework

### Phase 1: Demo MVP — Core Shell ✅ COMPLETE (Jan 2026)
- Route structure: `/`, `/app`, `/app/workshop`, `/app/showroom`, `/app/support`
- AppLayout with header, avatar container, chat panel
- Hero section with Leopoldo avatar
- TransitionLayout animations

### Phase 2: Demo MVP — Interactive ✅ COMPLETE (Jan 2026)
- Avatar emotion sync with sentiment detection
- Scripted demo flows (Leopoldo, Francisca, Antonia)
- Product mockup gallery with grid layout
- Bulk quote UI with Quote Card component

### Phase 3.1-3.4: Frontend Content Suite ✅ COMPLETE (Feb 2026)
- Main marketing website (`/`) with hero, masonry grid, marquees, waitlist CTA, footer
- App workspace (`/app/workspace`) with chat interface, history sidebar, notifications
- Quick prompt chips, sticky header, typing indicators
- Session history persistence, avatar expression system
- Accessibility widget, floating socials sidebar

### Phase 3.5-3.6: App Enhancement + Waitlist ✅ ~95% COMPLETE (Feb 2026)
- **Audio/Voice:** Mic button, voice conversation lightbox, ElevenLabs Orb, waveform, hold-to-speak
- **Inline Cards:** ProductCardInline, MockupCardInline, DesignCardInline with action buttons
- **Catalog System:** CatalogLightbox, CategoryFilters, ProductGrid, ProductSlider, SearchBar, MobileFilterSheet
- **Product Detail:** ProductDetailLightbox with size/color selectors, image gallery, QualityBadges
- **Waitlist:** 5-step form (Welcome → Basic Info → Social Proof → AI Interview → Success)
- **Database:** Waitlist schema with interview responses, social links, position tracking
- **Remaining:** Email confirmation (Resend), mobile refinements, Step 4 API polish

### Phase 3.7: Context-Aware Routing ✅ COMPLETE (Feb 20, 2026)
- Mistral Large-based agent routing (replaced keyword matching)
- Agent knowledge base (Leopoldo/Francisca/Antonia domains)
- 70% confidence threshold for auto-handoff
- Multi-intent detection ("design shirt and track order")
- Clarification UI for ambiguous intents
- Files: `agentKnowledgeBase.ts`, `routerProvider.ts`, `contextRouter.ts`, `route/route.ts`

### Phase 3.8: Product Catalog Database ✅ COMPLETE (Feb 20, 2026)
- 11 new Drizzle tables: categories, colors, sizes, products, variants, inventory, images, pricing
- Atomic inventory reservation (race-condition safe)
- AI-optimized queries (single join vs N+1)
- Full-text search + pagination
- Low-stock alerts

### Phase 4: Backend Core ✅ COMPLETE (Feb 2026)
- User CRUD (Clerk webhook sync)
- Product/Store/Order operations
- Waitlist API with database persistence
- Rate limiting (Upstash Redis)
- Error tracking (Sentry)
- **MerchStation TUI:** Terminal-based admin control center (replaced web admin dashboard)

### Phase 5: AI Integration ✅ COMPLETE (Mar 2026)
- Mistral Large for chat (streaming responses)
- Voxtral Transcribe 2 for STT ($0.003/min, sub-200ms)
- ElevenLabs TTS with character voice cloning (33M-min startup grant)
- Real-time conversation mode (Talk button)
- fal.ai image generation pipeline (FLUX.2-dev)
- OpenCV color separation + halftoning
- Response caching (Upstash Redis)

### Phase 5.5: Mockup Generation ✅ 83% COMPLETE (Mar 2026)
- Python service for realistic product mockups
- Halftone processing for screen-print simulation
- Compositing pipeline (design + blank → mockup)
- **Remaining 17%:** Full garment coverage, automated batch processing

### Phase 5.6: Color Separation ✅ COMPLETE (Feb 2026)
- K-means clustering for color extraction
- Pantone mapping for print accuracy
- Halftone layer generation
- CMYK-ready output

### Phase 6: Commerce ✅ Core COMPLETE (Mar-Apr 2026)
- Stripe webhooks (test mode)
- Cart + checkout flow
- Order management dashboard
- Artist payouts (manual for MVP)
- **Remaining:** Automated payouts (Stripe Connect), advanced analytics

---

## Print Prep (Oct 2026)

> **Plan:** [`Documentation/Dev/Print-Prep-Plan.md`](../Dev/Print-Prep-Plan.md). Branch `feat/print-prep`. The phase numbers below are print prep's own, not the project phases above.

### Print Prep Phase 0: Prerequisites — BUILT (Oct 2026)
- Ink system profile seeded from the MagnaPrint HB data sheet
- Schema and migration `0003` (not applied to Neon yet)
- Print storage, job queue and worker skeleton (R2 not set up yet)
- Test fixtures for print prep

### Print Prep Phase 1: Both outputs for flat art, end to end — BUILT, PENDING OWNER CHECKS (Oct 2026)
- Engine: colour, units, clean, knockout, halftone, marks and proofs
- Spot separations with traps, underbase, highlight white and screen sets
- DTG/DTF branch with PNG export; DTF offered on every blank
- Screen PSD (one layer per ink), DTG/DTF PSD, PSD reader for corrected uploads, job sheet, manifest and automatic checks
- Studio: 4K finals before approval, edit anchoring, capsule recipes, one approval per design
- Pre-press: audit queue, pack detail, ink system page, corrected PSD upload
- Pantone codes in admin only; clients see plain colour names
- Staff roles (owner, staff, artist) and per-area levels (none, view, work, manage)
- **Owner checks:** open the screen PSD in Photoshop and print the films one by one; open the PNG in GTX Graphics Lab and print it on black and white blanks; sign off a test print against the proof
- **Not live yet:** migration `0003` on Neon, R2, and the worker host

### Print Prep Phase 2: Any art up to 15 screens — NEXT
- Index separations (3 to 4 working days)
- Simulated process separations, using a print-model lookup table (6 to 10 working days)
- Dot-gain calibration from a printed test chart (2 to 3 working days)
- Screen-count pricing with the 9 to 15 screen surcharge (2 working days)
- Estimates are rough working days, for ordering only

### Print Prep Phase 3: Later
- Distress and texture library from our own scans
- DTF gang sheets
- Vectorising flat art
- RIP hot folders
- Multi-placement products
- Embroidery prep: only solid designs in solid colours can be embroidered, so it needs its own checks and conversion

---

## 🚧 ACTIVE: P0 — Demo Hardening (May 9 → June 8)

> **Goal:** Working AI chat, voice, LoRA design generation, storefront, and 300-image dataset for crowdfunding video.
> **Platform:** Indiegogo (Flexible Funding)  
> **Target:** €50,000 stretch goal  
> **Campaign Launch:** June 30, 2026

### Why This Timing

| Factor | Detail | Implication |
|--------|--------|-------------|
| **Fyul Merger Window** | Printful+Printify merged Nov 2024 | 18-24 months of reduced R&D — capture displaced artists |
| **Marketplace Collapse** | Redbubble (-98%), Society6 (5-10%), Zazzle (35-50%) | Structural, not cyclical — artists migrating |
| **AI Differentiation** | Multi-modal AI stack is category-exclusive | 12-month head start before incumbents close gap |
| **EU Regulatory Tailwind** | EPR regulations favor zero-inventory POD | 80% of EU consumers pay 9.7% premium for sustainable |

### Two-Track Execution (Weeks 2-4)

| Track | Who | What | When |
|-------|-----|------|------|
| **Track A — Engineering** | OpenCode + subagents | fal.ai wiring, Kontext editing, storefront, demo mode | All week |
| **Track B — Training Data** | Victor (10+ yr screen print expert) | Generate 50 images/style → Photoshop → Separation Studio NXT | Weeks 2-3 |

### Phase Overview

| Phase | Name | Duration | Goal |
|-------|------|----------|------|
| **P0** | Demo Hardening + Training Data | May 9 → June 8 (4.5 weeks) | Working AI chat, voice, LoRA design gen, storefront, 300-image dataset |
| **P1** | Essential Polish | June 9 → June 15 (1 week) | Core animations, mobile perfection, demo-ready |
| **P2** | Video Production | June 16 → June 22 (1 week) | Shoot, edit, render final video |
| **P3** | Campaign Prep | June 9 → June 22 (parallel) | /invest page, email sequences, influencer outreach |
| **P4** | Pre-Launch Warmup | June 23 → June 29 (1 week) | Waitlist activation, social tease, press outreach |
| **P5** | Campaign Live | June 30 → July 30 (30 days) | Indiegogo live, InDemand post-campaign |
| **P6** | Post-Campaign | Aug → Sep (6 weeks) | Fulfill rewards, investor deck, facility prep |
| **P7** | Investor Pitch | Sep → Oct (4 weeks) | Pitch with crowdfunding data |

---

### Week 1 (May 9-15): AI Chat Core ✅ COMPLETE

#### Day 1 (May 9): Intent Classification + Agent Routing
| Task | Description | Files | Status |
|------|-------------|-------|--------|
| Intent classification module | Mistral-based agent routing with confidence scoring | `lib/ai/contextRouter.ts` | ✅ |
| Agent routing middleware | Auto-handoff between Leopoldo/Francisca/Antonia | `lib/chat/agentRouter.ts` | ✅ |
| Mistral client rebuild | Custom fetch-based client with timeout + retry | `lib/ai/mistral-client.ts` | ✅ |
| Quick actions carousel | 9 quick actions per agent with swipe carousel | `components/chat/QuickActionsCarousel.tsx` | ✅ |
| Voice VAD | Voice Activity Detection for hold-to-speak | `hooks/useVoiceConversation.ts` | ✅ |
| Avatar preloading | Preload expressions on agent switch | `lib/AvatarExpressionContext.tsx` | ✅ |

**Acceptance:** Routing tests pass, 3 agents respond in character, voice button activates recording.

#### Day 2 (May 10): Security Hardening
| Task | Description | Files | Status |
|------|-------------|-------|--------|
| Clerk auth on API routes | All chat routes require authentication | `app/api/chat/**/route.ts` | ✅ |
| Upstash rate limiting | 20/min chat, 5/min voice | `lib/rateLimit.ts` | ✅ |
| Prompt injection sanitization | Input validation + regex filtering | `lib/chat/sanitize.ts` | ✅ |
| RBAC middleware | Role-based access for staff endpoints | `lib/rbac.ts` | ✅ |
| Zod env validation | Strict environment variable validation | `lib/env.ts` | ✅ |
| CORS headers | Proper CORS for API routes | `lib/cors.ts` | ✅ |
| Error boundary | Centralized error handling | `components/ErrorBoundary.tsx` | ✅ |
| Component extraction | ChatMessages, ChatInput, ChatWindow, ChatHeader | `components/chat/*.tsx` | ✅ |
| Hook extraction | useVoiceConversation, useAudioRecording | `hooks/*.ts` | ✅ |
| Centralized config | CHAT_CONFIG for all chat settings | `lib/chat/config.ts` | ✅ |

**Acceptance:** 23 GitHub issues closed (#1-#23), security scan passes, build succeeds.

#### Day 3 (May 11): Unified Wave Voice UX
| Task | Description | Files | Status |
|------|-------------|-------|--------|
| Stable hold-to-speak | Wave button with 200ms hold threshold, press-and-hold UX | `components/chat/ChatInput.tsx` | ✅ |
| Persona system prompt | Per-agent voice personality prompts | `lib/ai/personas.ts` | ✅ |
| Custom voices | ElevenLabs voice IDs per agent (Leopoldo: Brazilian male, Francisca: Portuguese female, Antonia: Irish female) | `lib/ai/voices.ts` | ✅ |
| Voice subtitle overlay | Real-time transcription display during conversation | `components/chat/VoiceSubtitle.tsx` | ✅ |
| Voice pipeline hardening | STT → LLM → TTS with error recovery | `app/api/chat/voice/process/route.ts` | ✅ |

**Acceptance:** Hold wave button → speak → release → hear AI response in character voice. No crashes. Issues #24-#26 closed.

#### Day 4 (May 12): Typing Indicator + Message Animations
| Task | Description | Files | Status |
|------|-------------|-------|--------|
| SSE streaming | Server-Sent Events for incremental LLM responses | `app/api/chat/unified/route.ts` | ✅ |
| Typewriter effect | Character-by-character reveal with cursor | `components/chat/TypewriterText.tsx` | ✅ |
| Streaming message updates | Incremental content updates in CatChatProvider | `components/chat/CatChatProvider.tsx` | ✅ |
| Improved typing indicator | Bouncing dots + agent avatar badge + phase-aware text | `components/chat/ChatMessages.tsx` | ✅ |
| Agent avatar badges | Colored initials on assistant messages | `components/chat/ChatMessages.tsx` | ✅ |

**Acceptance:** Messages stream in character-by-character, typing indicator shows agent name with animated dots, last message auto-scrolls.

#### Day 5 (May 13): Demo Mode + Fallback Responses
| Task | Description | Files | Status |
|------|-------------|-------|--------|
| Demo mode detection | `NEXT_PUBLIC_DEMO_MODE=true` activates scripted mode | `lib/ai/demoResponses.ts` | ✅ |
| Scripted conversations | 3 agents × 4 sequential responses + keyword triggers | `lib/ai/demoResponses.ts` | ✅ |
| Demo handoffs | Scripted agent transfers with welcome messages | `lib/ai/demoResponses.ts` | ✅ |
| Simulated typewriter | Demo mode streams scripted responses with artificial delay | `components/chat/CatChatProvider.tsx` | ✅ |
| Fallback responses | Per-agent fallback when no keyword/sequential match | `lib/ai/demoResponses.ts` | ✅ |

**Acceptance:** `DEMO_MODE=true` → no API calls, predictable responses, all 3 agents have scripted flows, keyword triggers work ("pricing", "design", "order").

#### Day 6 (May 13): Mobile Chat Polish
| Task | Description | Files | Status |
|------|-------------|-------|--------|
| Typewriter in CatChat | Streaming messages render with typewriter in main chat | `components/chat/CatChat.tsx` | ✅ |
| iOS safe areas | `safe-bottom` CSS class for notch/home bar | `app/globals.css` | ✅ |
| Chat open lock | Prevent iOS bounce scroll when chat is open | `app/globals.css` | ✅ |
| Agent badge consistency | Avatar badges on both ChatMessages and CatChat | `components/chat/CatChat.tsx` | ✅ |

**Acceptance:** Chat works on iPhone 14 and Pixel 7, no layout shifts, safe areas respected, keyboard doesn't obscure input.

#### Day 7 (May 13): Week 1 Review + Voice Cleanup
| Task | Description | Files | Status |
|------|-------------|-------|--------|
| Remove Deepgram | Delete all Deepgram references, routes, types | `app/` (multiple files) | ✅ |
| Voxtral for waitlist STT | Update speech/transcribe to use Voxtral | `app/api/speech/transcribe/route.ts` | ✅ |
| Type fix | VoiceMessageData model: 'deepgram' → 'voxtral' | `types/chat.ts` | ✅ |
| Build verification | tsc --noEmit clean on both /app and /mainpage | All | ✅ |

**Acceptance:** Zero Deepgram references in codebase, both projects compile clean, waitlist voice interview uses Voxtral.

---

### Week 2 (May 16-22): Voice + Design Gen + Dataset Start

#### Day 8 (May 16): Voice Pipeline Polish
| Task                     | Description                                                  | Files                                 | Est. |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------- | ---- |
| Audio quality refinement | Noise cancellation, gain normalization, format optimization  | `lib/ai/voxtral-speech.ts`            | 2h   |
| Voice interruption       | Stop TTS playback when user starts speaking                  | `components/chat/CatChat.tsx`         | 2h   |
| STT accuracy tuning      | Test with accents, noise, music terms; tune Voxtral settings | Manual testing                        | 1h   |
| Pipeline latency check   | Measure STT→LLM→TTS total time, optimize                     | `app/api/chat/voice/process/route.ts` | 1h   |

**Acceptance:** Voice pipeline works end-to-end in <3 seconds. Audio quality is clear. User interruption works.

#### Day 9 (May 17): ElevenLabs TTS Polish
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Mute/unmute toggle | Button to silence TTS while keeping voice mode active | `components/chat/ChatHeader.tsx` | 1h |
| Audio quality settings | Adjust ElevenLabs settings (stability, similarity) per agent | `lib/ai/elevenlabs.ts` | 1h |
| Audio queue management | Don't interrupt playing audio with new messages | `components/chat/CatChat.tsx` | 2h |
| Voice interruption | Stop speaking when user starts talking | `components/chat/CatChat.tsx` | 1h |

**Acceptance:** User can mute TTS, audio doesn't overlap, voice responds to interruptions.

#### Day 10 (May 18): fal.ai Client Setup
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| **BLOCKER: fal.ai account** | Sign up, get FAL_API_KEY | `.env.local` | 30min |
| falClient.ts implementation | Typed client for fal.ai FLUX.2-dev + LoRA | `lib/ai/falClient.ts` | 2h |
| generateDesign() | Generate image from prompt + LoRA style | `lib/ai/generateDesign.ts` | 2h |
| postProcessImage() | Auto-enhance, upscale, format for print | `lib/image/postProcess.ts` | 2h |
| Generation progress UI | Loading state with progress bar | `components/chat/GenerationProgress.tsx` | 1h |
| Design API route | POST /api/design/generate | `app/api/design/generate/route.ts` | 1h |

**Acceptance:** API call returns generated image in <10 seconds, progress UI shows status, image is print-ready.

#### Day 11 (May 19): DesignCard + Design History
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| DesignCard component | Display generated design with metadata (style, prompt, timestamp) | `components/chat/DesignCard.tsx` | 2h |
| Design history sidebar | Session-based design gallery | `components/chat/DesignHistory.tsx` | 2h |
| Save to session | Persist designs to chat session | `components/chat/CatChatProvider.tsx` | 1h |
| Download design | PNG/JPG export | `components/chat/DesignCard.tsx` | 1h |
| Design regeneration | "Try again" with same prompt | `components/chat/DesignCard.tsx` | 1h |

**Acceptance:** Design generates, displays in chat, saved to history, can download/regenerate.

#### Day 12 (May 20): Kontext Iterative Editing
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Kontext integration | fal.ai Kontext for text-guided image editing | `lib/ai/kontext.ts` | 2h |
| Edit prompt UI | "Change colors", "Add detail", "Make it darker" inputs | `components/chat/DesignEditor.tsx` | 2h |
| Side-by-side comparison | Before/after view for edits | `components/chat/DesignComparison.tsx` | 2h |
| Edit history | Track all edits with undo | `lib/ai/designHistory.ts` | 1h |
| Apply to product | "Put this on a t-shirt" button | `components/chat/DesignCard.tsx` | 1h |

**Acceptance:** User can edit design with text, see before/after, apply to product blank.

#### Day 13 (May 21): Pre-generate Demo Designs
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Generate 20 demo designs | One per style × product combination | Scripts | 2h |
| Design quality review | Visual check + discard low quality | Manual | 2h |
| Design catalog seed | Insert demo designs into database | `src/db/designs.ts` | 1h |
| Full pipeline test | End-to-end: prompt → generate → edit → mockup | Integration test | 2h |

**Acceptance:** 20 high-quality designs ready, pipeline works end-to-end, all styles represented.

#### Day 14 (May 22): Week 2 Review + Storefront Shell
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Week 2 retrospective | What worked, what didn't, blockers | `DEVLOG.md` | 30min |
| Storefront shell | Basic page layout for artist storefront | `app/app/storefront/page.tsx` | 2h |
| Storefront route | /storefront/[artistSlug] | `app/app/storefront/[slug]/page.tsx` | 1h |
| Artist context | Pull artist data from database | `src/db/artists.ts` | 1h |
| Theme system | Dark/light + accent color per artist | `lib/themes.ts` | 2h |

**Acceptance:** Storefront page renders with artist name, theme, product grid placeholder.

---

### Week 3 (May 23-29): Storefront + Dataset Completion

#### Day 15 (May 23): StorefrontHero + ArtistBio
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| StorefrontHero | Hero banner with artist name + avatar | `components/storefront/StorefrontHero.tsx` | 2h |
| ArtistBio section | Bio, social links, follower count | `components/storefront/ArtistBio.tsx` | 2h |
| Theme customization | Artist picks accent color, font | `components/storefront/ThemeCustomizer.tsx` | 2h |
| Storefront header | Logo, navigation, cart icon | `components/storefront/StorefrontHeader.tsx` | 1h |

#### Day 16 (May 24): ProductCard + ProductGrid
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| ProductCard | Image, name, price, quick add | `components/storefront/ProductCard.tsx` | 2h |
| ProductGrid | Responsive grid with filtering | `components/storefront/ProductGrid.tsx` | 2h |
| Category filter | T-shirts, hoodies, accessories | `components/storefront/CategoryFilter.tsx` | 1h |
| Sort dropdown | Price, popularity, new | `components/storefront/SortDropdown.tsx` | 1h |
| Empty state | "No products yet" with CTA | `components/storefront/EmptyState.tsx` | 1h |

#### Day 17 (May 25): CartDrawer + Checkout
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| CartDrawer | Slide-out cart with items, quantities | `components/storefront/CartDrawer.tsx` | 2h |
| Cart state | Zustand or React Context | `lib/cartStore.ts` | 2h |
| Demo mode checkout | Skip payment, simulate order | `components/storefront/DemoCheckout.tsx` | 2h |
| Order confirmation | Thank you page with order number | `app/app/storefront/order/confirm/page.tsx` | 1h |

#### Day 18 (May 26): Integration Testing
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Cross-browser testing | Chrome, Safari, Firefox | Manual | 2h |
| Mobile testing | iPhone 14, Pixel 7 | Manual | 2h |
| Tablet testing | iPad, Android tablet | Manual | 1h |
| Performance audit | Lighthouse score >90 | Chrome DevTools | 1h |
| Console error check | Zero errors, zero warnings | Browser console | 30min |

#### Day 19 (May 27): Landing Page Polish
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Waitlist finish | Connect waitlist form to Resend email | `app/api/waitlist/route.ts` | 2h |
| Email template | Welcome email design | `components/email/WaitlistWelcome.tsx` | 2h |
| Landing page animations | Scroll-triggered reveals | `components/landing/` | 2h |
| Social proof section | Testimonials, logos | `components/landing/SocialProof.tsx` | 1h |

#### Day 20 (May 28): End-to-End Demo Recording
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Demo script | Written script for video recording | `docs/demo-script.md` | 1h |
| Screen recording setup | OBS, mic, lighting | Hardware | 30min |
| Record demo | Walk through: chat → design → storefront | Screen capture | 2h |
| Voiceover | Narrate the demo | Audio recording | 1h |
| Raw footage review | Check quality, note edits | Video player | 1h |

#### Day 21 (May 29): Week 3 Review
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Retrospective | What worked, blockers, next week | `DEVLOG.md` | 30min |
| Dataset review | 300 images ready? Quality check | HuggingFace | 1h |
| Handoff prep | Document what's done vs remaining | README updates | 1h |
| Week 4 planning | Final polish tasks prioritized | Roadmap update | 30min |

---

### Week 4 (May 30-June 5): LoRA Integration + Essential Polish

#### Day 22-24 (May 30-June 1): LoRA Wiring
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| LoRA endpoint setup | fal.ai LoRA loading per style | `lib/ai/falClient.ts` | 3h |
| A/B test framework | Compare LoRA vs base FLUX quality | `lib/ai/abTest.ts` | 2h |
| Enhancement pipeline | Auto-post-process generated images | `lib/image/enhancement.ts` | 3h |
| Style selector UI | Dropdown to pick LoRA style | `components/chat/StyleSelector.tsx` | 2h |
| Quality validation | Automated check for print readiness | `lib/image/qualityCheck.ts` | 2h |

#### Day 25-28 (June 2-5): Animation + Performance
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Framer Motion transitions | Page transitions, chat open/close | `components/chat/*.tsx` | 3h |
| Scroll animations | IntersectionObserver + fade-in | `components/landing/` | 2h |
| Branded loading states | Skeleton loaders with brand colors | `components/ui/skeleton.tsx` | 2h |
| Mobile test pass | Full regression on iPhone + Pixel | Manual | 3h |
| Performance audit | Bundle size, image optimization, lazy loading | `next.config.ts` | 2h |
| 60fps check | No jank on animations | Chrome DevTools | 1h |

---

### Week 5 (June 6-8): Final Polish

#### Day 29-31 (June 6-8): Demo Completion
| Task | Description | Files | Est. |
|------|-------------|-------|------|
| Full demo run | End-to-end with LoRA designs | Manual | 2h |
| Bug fix sprint | Any issues from demo run | Various | 4h |
| Final build | Production build, verify zero errors | `npm run build` | 1h |
| Deploy to staging | Vercel preview deployment | Vercel | 30min |
| Team review | Victor reviews full demo | Meeting | 1h |
| P0 sign-off | Checklist complete, ready for P1 | Roadmap | 30min |

---

### Training Data Strategy (6 MVP LoRA Styles)

| Style | Images | Time (Victor) |
|-------|--------|---------------|
| American Traditional | 50 | ~10h |
| Japanese | 50 | ~10h |
| Blackwork | 50 | ~10h |
| Vintage 90's | 50 | ~10h |
| Realism | 50 | ~10h |
| Dark Art | 50 | ~10h |
| **Total** | **300** | **~60-85h** |

**Pipeline:** Generated Image → Photoshop Treatment (LoRA training) → Separation Studio NXT (U-Net training)

**Three Assets Produced:**

| Asset | Training Data | Moat Level |
|-------|--------------|------------|
| 6 Style LoRAs | 50 enhanced images each | Medium — replicable with effort |
| Color Separation U-Net | 300 input/output separation pairs | **High** — proprietary dataset |
| Enhancement Pipeline | 300 raw → enhanced pairs | **High** — tacit knowledge capture |

### Definition of Done (Crowdfunding Demo)

- [ ] New user can visit site, see Leopoldo greet them, have a 3-message conversation
- [ ] User can switch to Francisca and request a t-shirt design in a specific LoRA style
- [ ] Design generates in <10 seconds with LoRA-enhanced quality
- [ ] User can refine design with text or voice (Kontext editing)
- [ ] User can preview an artist storefront with products
- [ ] Voice mode works: speak → transcribe → respond → speak back
- [ ] Demo mode produces predictable responses for video recording
- [ ] Mobile experience is flawless (iPhone 14 + Pixel 7 tested)
- [ ] Every animation is smooth (60fps, no jank)
- [ ] Zero console errors, zero build warnings
- [ ] 6 LoRAs trained and integrated
- [ ] 300-image dataset on HuggingFace

### Key Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Video completion rate | >60% | Watch to end = conversion |
| Waitlist → backer conversion | >20% | 500 waitlist → 100 backers min |
| Average pledge | >€100 | Higher tiers = more capital |
| Day 1 funding % | >30% | Algorithm boost + momentum |

---

## ⏳ FUTURE: P1-P7 — Crowdfunding Campaign (June → Oct 2026)

### P1: Essential Polish (June 9-15, 1 week)

| Task | Description | Est. |
|------|-------------|------|
| Core animation polish | Smooth transitions, micro-interactions, loading states | 3 days |
| Mobile perfection | Final responsive fixes, touch targets, font sizes | 2 days |
| Performance optimization | Bundle split, image lazy loading, font subsetting | 2 days |
| Accessibility audit | WCAG 2.1 AA compliance, screen reader testing | 1 day |
| Cross-browser final pass | Safari, Chrome, Firefox, Edge | 1 day |
| Demo script finalization | Lock script, practice run | 1 day |

**Goal:** Everything is demo-ready. No rough edges.

### P2: Video Production (June 16-22, 1 week)

| Task | Description | Est. |
|------|-------------|------|
| Script recording | Professional voiceover in quiet space | 1 day |
| Screen capture | High-resolution demo walkthrough | 1 day |
| B-roll footage | Facility shots, product close-ups, team | 1 day |
| Music licensing | Background track (epic/inspiring) | 1 day |
| Editing | Cut together, color grade, add graphics | 2 days |
| Final render | 1080p and 4K versions | 1 day |
| Review + revisions | Team feedback, final tweaks | 1 day |

**Goal:** 90-120 second crowdfunding video ready for upload.

### P3: Campaign Prep (June 9-22, parallel with P1-P2)

| Task | Description | Est. |
|------|-------------|------|
| /invest page | Investor-facing page with pitch deck | 3 days |
| Email sequences | Welcome, nurture, launch day, urgency | 2 days |
| Influencer outreach | DM 50 creators, send preview kits | 5 days |
| Press kit | Press release, founder bio, screenshots | 2 days |
| Social media assets | Instagram carousels, TikTok teasers | 2 days |
| Campaign page copy | Indiegogo page text, tiers, FAQ | 2 days |
| Reward tier design | €25 sticker pack → €5000 founder tier | 1 day |

**Goal:** Everything ready before campaign goes live.

### P4: Pre-Launch Warmup (June 23-29, 1 week)

| Task | Description | Est. |
|------|-------------|------|
| Waitlist activation | Email blast to waitlist: "Campaign starts Monday" | 1 day |
| Social tease | Countdown posts, behind-the-scenes | Daily |
| Press outreach | Tech blogs, startup newsletters | 3 days |
| Influencer seeding | Send preview links to warm leads | 2 days |
| Landing page countdown | Timer, social proof, urgency | 1 day |
| Team preparation | Response templates, FAQ, shift schedule | 1 day |

**Goal:** 500+ people ready to back on Day 1.

### P5: Campaign Live (June 30 - July 30, 30 days)

| Task | Description | Est. |
|------|-------------|------|
| Daily social posts | Updates, milestones, thank-yous | Daily |
| Backer communication | Respond to comments, messages | Daily |
| Mid-campaign push | New reward tier, limited edition | Week 2 |
| Press follow-up | Pitch stories to tech blogs | Week 2-3 |
| Influencer amplification | Paid posts from creators who backed | Week 2-3 |
| Final 48h push | Urgency: "Last chance" | Final 2 days |
| InDemand transition | Keep campaign open post-deadline | Day 31 |

**Goal:** €50,000 funded (stretch), 500+ backers.

### P6: Post-Campaign (Aug → Sep, 6 weeks)

| Task | Description | Est. |
|------|-------------|------|
| Reward fulfillment | T-shirts, stickers, founder packs shipped | 4 weeks |
| Backer survey | Collect sizes, addresses, preferences | 1 week |
| Investor deck | Update with crowdfunding data | 2 weeks |
| Facility prep | Portugal facility equipment, staff hiring | 4 weeks |
| Financial reconciliation | Budget vs actual, grant applications | 2 weeks |
| Team expansion | Hire first production staff | 2 weeks |

**Goal:** Rewards shipped, investor pitch ready, facility operational.

### P7: Investor Pitch (Sep → Oct, 4 weeks)

| Task | Description | Est. |
|------|-------------|------|
| Pitch deck | 12-slide deck with crowdfunding proof | 1 week |
| Financial model | Revenue projections, unit economics | 3 days |
| Demo update | Latest product features in demo | 3 days |
| Investor meetings | Schedule with angels, VCs, syndicates | 2 weeks |
| Due diligence | Legal, financial, technical docs ready | 1 week |
| Term sheet negotiation | €300K for 16-18% equity | 1 week |

**Goal:** Term sheet signed, €300K committed.

---

## ⏳ FUTURE: Phase 7-10 — Platform Scale (Late 2026 → 2028)

### Phase 7: Beta Launch (Apr → Dec 2026, 9 months)

**Goal:** Launch with 10-100 artists, gather data, train models, iterate on feedback.

| Cohort | Artists | Timeline | Goal |
|--------|---------|----------|------|
| Cohort 1 | 10 | Months 1-3 | Proof of concept, product-market fit signals |
| Cohort 2 | 40+ | Months 4-6 | Scaling validation, model improvements |
| Cohort 3 | 100+ | Months 7-9 | Production readiness, launch prep |

**Key Tasks:**
- Shannon AI pentest (white-box security audit) before external onboarding
- Onboarding flow refinement based on waitlist feedback
- Production pipeline: real orders, real fulfillment
- Analytics dashboard: GMV, retention, satisfaction
- Model retraining with production data

**Success Criteria:**
- 100+ artists actively using
- 90%+ designs production-ready (minimal human intervention)
- >2.5/3 average satisfaction rating
- 10,000+ conversation examples collected
- U-Net model 95%+ accuracy

---

### Phase 7.5: Creator Success & Analytics (June 2026, 4 weeks)

**Goal:** Reduce creator churn from 76% industry baseline to <50%.

**Key Tasks:**
- Unified profit analytics dashboard (ad spend, fees, shipping, refunds)
- Creator onboarding education (design best practices, niche selection, pricing)
- Performance benchmarking vs platform averages
- Success milestone notifications (first sale, $100 month, 10th design)
- Cohort retention tracking

**Research Basis:**
- 65% of creators earn <$100/year (Precedence Research)
- 24% three-year survival rate makes retention existential
- Neither Printful nor Printify provides comprehensive profit tracking

**Success Criteria:**
- Profit dashboard live
- Education modules deployed
- Benchmarking system active
- Churn reduced to <50%

---

### Phase 8: Public Launch (Jan 2027, 1 month)

**Goal:** Remove beta restrictions, launch publicly, achieve profitability.

**Key Tasks:**
- Final testing and bug fixes
- Marketing campaign launch
- Support team training
- Artist onboarding at scale
- Performance monitoring

**Success Criteria:**
- 100+ active artists
- €10,000+ monthly revenue
- <5% defect rate
- >85% artist satisfaction
- **Seed fundraise trigger:** 1,000 artists OR $100K monthly GMV

---

### Phase 8.5: Traffic & Discovery Layer (Jan-Feb 2027, 6 weeks)

**Goal:** Close the #1 creator pain point: customer acquisition.

**Key Tasks:**
- SEO-optimized creator storefronts (structured data, sitemaps, Core Web Vitals)
- Social media automation pipeline (Instagram carousels, TikTok videos, Pinterest pins)
- Artist cross-promotion discovery feed
- Multi-channel publishing (Etsy, Amazon, TikTok Shop)

**Research Basis:**
- Customer acquisition, not design, is #1 creator pain point
- 65% earn <$100/year because they can't find buyers
- Fourthwall comes closest but provides no systematic traffic generation

**Success Criteria:**
- SEO storefronts with schema markup
- Social automation generating carousels and videos
- Cross-promotion feed live
- Multi-channel publishing active
- **Business Metric:** 30% organic traffic share; $15K monthly GMV

---

### Phase 9: Social Commerce Hub (Jan-May 2027, 17 weeks)

**Goal:** Enable artists to syndicate their MerchFrom catalog to Discord, Meta, TikTok, Twitch.

| Platform | Timeline | Integration |
|----------|----------|-------------|
| Discord | Weeks 1-3 | Bot with slash commands, embedded storefront |
| Meta | Weeks 4-6 | Business Manager OAuth, catalog sync |
| TikTok Shop | Weeks 7-9 | Products API, order sync |
| Twitch | Weeks 10-11 | Panel + overlay extensions |
| Dashboard | Weeks 12-13 | "Connect Channels" UX |
| Order Aggregation | Weeks 14-17 | Unified order ingestion |

**Success Criteria:**
- One-click sync to all platforms
- Inventory stays in sync across platforms
- Orders aggregate to single dashboard
- Fulfillment updates propagate to all channels

---

### Phase 9.5: AI Moat Conversion (Feb 2027+, Ongoing)

**Goal:** Convert AI advantage from "having AI" to "AI + proprietary workflow data + artist-specific training."

**Key Tasks:**
- Artist style preference tracking (opt-in)
- Design-to-conversion correlation database
- Successful design pattern recognition (ML model)
- Artist-specific training data collection (with explicit consent)
- Print-readiness validation pipeline (DPI, CMYK, bleed-check)

**Research Basis:**
- AI image generation commoditizing rapidly
- Sustainable moat is workflow integration, not generation
- Only ~20% of consumers trust AI; "AI-designed" labeling reduces purchase intention
- No competitor offers comprehensive print-readiness validation

**Success Criteria:**
- Style preference tracking collecting data
- Design-to-conversion database established
- Print-readiness pipeline deployed
- **Business Metric:** 10,000+ design-to-sale correlations in proprietary dataset

---

### Phase 10: Accessories Expansion (Year 2, 2027-2028)

**Goal:** Expand from garments into 3D-printed jewelry (pendants, rings, bracelets).

**Timeline:**

| Period | Milestone |
|--------|-----------|
| Now → Dec 2026 | Research & Architecture: Pipeline design, Meshy API integration, 3D viewer prototype |
| Jan 2027 | 3D Viewer Proof of Concept: Three.js viewer, Meshy API connected |
| Feb-Apr 2027 | Full Accessories UI: Cat-Suite guided design, material selection |
| May-Jul 2027 | Pilot Launch: 5-10 artists, simple pieces, data collection |
| Aug-Dec 2027 | Iteration & Data: Progressive complexity, synthetic dataset |
| Jan-Jun 2028 | Model Fine-Tuning: Train proprietary model on collected data |
| Jul 2028+ | Full Public Launch: Complex designs, automated pipeline |

**Pre-Crowdfunding Deliverable:**
- 3D accessory viewer embedded in app (Three.js / React Three Fiber)
- Meshy API integration generating 3D models from text/image
- Cat-Suite flow: "Design me a pendant" → 3D preview → approve
- Material/finish selector (brass, silver, gold-plated)
- Working end-to-end demo

**Tech Stack:**
- **3D Generation:** Meshy API (text/image → 3D mesh, STL export)
- **Post-Processing:** Python microservice (mesh repair, wall thickness, castability)
- **3D Viewer:** Three.js / React Three Fiber
- **Future Fine-Tuning:** Hunyuan3D-2 or TRELLIS with LoRA

**Equipment (Portugal Facility — €12K Budget):**
- Formlabs Form 4 + Wash+Cure: €5,500
- Vacuum caster + burnout oven: €3,500
- Finishing tools: €1,500
- Castable resin + casting grain: €1,500

**Pilot Program:**
- Pilot A (5 artists): Simple signet rings, plain bands, basic pendants
- Pilot B (8 artists): Medium complexity — engraved, textured
- Pilot C (10+ artists): Complex — filigree, articulated, stone settings

**Full Detail:** [`Accessories-Expansion.md`](./Accessories-Expansion.md)

---

## Appendix

### Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 16, React 19, TypeScript 5 | App Router, SSR/SSG |
| **Styling** | Tailwind CSS 4, HeroUI | Utility-first, dark mode only |
| **Animation** | Framer Motion, GSAP | React-integrated animations |
| **Backend** | Neon PostgreSQL + Drizzle ORM | Serverless, type-safe |
| **Auth** | Clerk | Passkeys, magic links |
| **Cache** | Upstash Redis | Sessions, rate limiting, response cache |
| **Storage** | Cloudinary | Images, avatars, mockups |
| **Email** | Resend | Transactional emails |
| **Payments** | Stripe | Card payments, subscriptions, payouts |
| **LLM** | Mistral Large | EU-based, GDPR-native, open weights |
| **STT** | Mistral Voxtral Transcribe 2 | $0.003/min, sub-200ms, Apache 2.0 |
| **TTS** | ElevenLabs | Zero-shot voice cloning, ~90ms |
| **Image Gen** | fal.ai (FLUX.2-dev + LoRAs) | Single vendor, Kontext editing |
| **Color Sep** | OpenCV (Python) | K-means, Pantone mapping, halftone |

### Deferred Features

| Feature | Phase | Notes |
|---------|-------|-------|
| Merch Coins System | Month 7+ | Database schema ready; full feature post-PMF |
| Production Automation | Post-Investment | Manual workflow for MVP |
| Automated EDI Ordering | Post-MVP | Manual ordering for MVP |
| Influencer Onboarding | Phase 8+ | Dedicated onboarding for large creators |

### Success Criteria (All Phases)

| Phase | Key Metric | Target |
|-------|-----------|--------|
| MVP (Phase 6) | First transaction | $1K monthly GMV |
| Beta (Phase 7) | Active artists + retention | $5K GMV, 20% 30-day retention |
| Creator Success (7.5) | Churn reduction | <50% (from 76% baseline) |
| Public Launch (Phase 8) | Revenue + scale | €10K/month, 100+ artists |
| Traffic (8.5) | Organic share | 30% organic, $15K GMV |
| AI Moat (9.5) | Dataset size | 10,000+ correlations |

### Related Documents

- **PRD:** [`/Documentation/PRD.md`](../PRD.md) — Product vision and features
- **Print Prep:** [`/Documentation/Dev/Print-Prep-Plan.md`](../Dev/Print-Prep-Plan.md) — Print prep plan, decisions and phases
- **AI Stack:** [`/Documentation/02-Architecture/AI-Stack.md`](../02-Architecture/AI-Stack.md) — All AI model routing
- **Image Generation:** [`/Documentation/05-Shared/Image-Generation-Architecture.md`](../05-Shared/Image-Generation-Architecture.md) — fal.ai pipeline, LoRA strategy
- **Design System:** [`/Documentation/05-Shared/Design-System.md`](../05-Shared/Design-System.md) — Colors, typography, components
- **Database Schema:** [`/Documentation/05-Shared/Database-Schema.md`](../05-Shared/Database-Schema.md) — Drizzle tables
- **Cat-Suite Prompts:** [`/Documentation/CAT_SUITE_PROMPTS.md`](../CAT_SUITE_PROMPTS.md) — Agent personalities
- **Accessories Expansion:** [`Accessories-Expansion.md`](./Accessories-Expansion.md) — Phase 10 detail
- **Mockup Generation:** [`IMPLEMENTATION-PLAN-Mockup-Generation.md`](./IMPLEMENTATION-PLAN-Mockup-Generation.md) — Mockup system plan

---

**Roadmap Owner:** Victor Bendas  
**Last Updated:** October 15, 2026  
**Next Review:** Daily during P0 Demo Hardening sprint  
**Version History:**
- v4.1 (Oct 15, 2026): Print prep phases added (Phase 0 and 1 built, pending owner checks; Phase 2 next; Phase 3 later)
- v4.0 (May 13, 2026): Restructured — P0 at top, chronological order, completed phases summarized, full task detail for active/future phases
- v3.0 (May 13, 2026): Consolidated — merged Roadmap-Crowdfunding, Sprint-Plan, Research-Gaps, Unified-Wave-Voice
- v2.0 (Feb 2026): Added crowdfunding sprint phases
- v1.0 (Jan 2026): Initial roadmap

**Archived versions:** `/Documentation/99-Archive/Roadmap/`
