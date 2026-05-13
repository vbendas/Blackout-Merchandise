# Roadmap: Crowdfunding-First Strategy

> **Version**: 2.0  
> **Last Updated**: May 13, 2026  
> **Platform**: Indiegogo (Flexible Funding — keep what you raise)  
> **Strategy**: Build polished demo with expert-trained LoRAs → crowdfund → fast path to production  
> **Current Sprint**: P0 Demo Hardening — Day 1-3 COMPLETE ✅, Day 4-7 IN PROGRESS  
> **Branch**: `feat/crowdfunding-demo`

---

## Quick Links — Reference Documents

| Document | What It Covers | When You Need It |
|----------|---------------|-----------------|
| [Image-Generation-Architecture.md](../05-Shared/Image-Generation-Architecture.md) | fal.ai pipeline, Kontext editing, LoRA strategy, cost projections | Day 10+ (image gen work) |
| [AI-Stack.md](../02-Architecture/AI-Stack.md) | All AI model routing (Mistral, Voxtral, ElevenLabs, fal.ai) | Any AI-related work |
| [Design-System.md](../05-Shared/Design-System.md) | Colors, typography, component patterns | Any UI work |
| [Database-Schema.md](../05-Shared/Database-Schema.md) | Drizzle PostgreSQL tables | Any backend work |
| [CAT_SUITE_PROMPTS.md](../CAT_SUITE_PROMPTS.md) | Cat-Suite personality prompts | Agent behavior tuning |
| [PRD.md](../PRD.md) | Full product requirements, business model | Context for any feature |

---

## The Strategy

**Old path**: Build backend → build AI → build commerce → launch → crowdfund → pitch investors  
**New path**: Build **polished demo with expert-trained LoRAs** → **crowdfund with working AI** → fast path to production → pitch investors with real data

**Key insight**: Invest more effort NOW (expert-curated training data baked into MVP) so that MVP → Production is a sprint, not a marathon. When you go public, you're already 3 moves ahead.

---

## Why This Timing: Market Urgency

> **Sources**: [Market Analysis Report](../09-Reseach/merchandise-market-research.md) | [POD Competition Report](../09-Reseach/pod_competition_report.md)

### 1. Fyul Merger Window (18-24 Months)
- **Printful + Printify merged November 2024** into Fyul ($1.3-1.5B valuation)
- Historical precedent: post-merger innovation velocity declines **30-50%** for 12-24 months
- **Action**: Capture displaced artists while Fyul focuses on integration

### 2. Marketplace Collapse
- **Redbubble** (50% fees), **Society6** (5-10% royalties), **Zazzle** (35-50% fees)
- These changes are **structural, not cyclical** — the traffic-for-margin model is failing

### 3. AI Differentiation Window (12 Months)
- Merch From's multi-modal AI stack is **category-exclusive today**
- **12-month head start** before incumbents close the gap

### 4. EU Regulatory Tailwind
- **EPR regulations** favor zero-inventory POD models
- **80% of European consumers** will pay a **9.7% premium** for sustainable goods

### Market Validation

| Metric | Value | Implication |
|--------|-------|-------------|
| Creator Merch Market (2025) | $6.8 billion | Proven demand, growing 7.8% CAGR |
| POD Market Growth | 23.6% CAGR → $57.5B by 2033 | Fastest-growing e-commerce segment |
| EU POD Market | $1.97B → $13.69B by 2033 | 24.06% CAGR — our primary beachhead |
| Artist D2C Margin Advantage | 60-75% vs 15-30% retail | Economic rationale for our model |

---

## Success Criteria for the Crowdfunding Video

The video must make viewers think: *"This already exists and it's amazing. I need to back this."*

### Must Show (Working Features)

| # | Feature | Why It Matters |
|---|---------|---------------|
| 1 | **Leopoldo greets you by name** | Personalization = "this is real AI" |
| 2 | **Switch between 3 agents** | Shows depth, not just one chatbot |
| 3 | **Voice mode: "Talk to Francisca"** | The "wow" moment. No competitor has this |
| 4 | **Francisca generates a t-shirt design** | Core value proposition in 30 seconds |
| 5 | **Design refinement loop** | "Make it darker" → new design. Shows iteration |
| 6 | **Artist storefront preview** | The end goal: "Your art. Your store." |
| 7 | **Production quality specs** | Justifies premium pricing |
| 8 | **MRCH token + ownership** | "You're not just buying merch, you're buying into the platform" |

### Can Be Scripted/Mocked
- Specific AI responses (use demo mode)
- Design outputs (pre-generate 20 designs, cycle through them)
- Store transactions (static checkout flow)

---

## Phase Overview

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

**Total to campaign launch**: ~7 weeks (May 9 → June 30)  
**Campaign launch**: June 30, 2026  
**Platform**: Indiegogo (Flexible Funding)  
**Target**: €50,000 stretch goal

---

## Two-Track Execution Model (Weeks 2-4)

From Week 2 onward, work runs in **two parallel tracks**:

| Track | Who | What | When |
|-------|-----|------|------|
| **Track A — Engineering** | OpenCode + subagents | fal.ai wiring, Kontext editing, storefront, demo mode | All week |
| **Track B — Training Data** | Victor (10+ yr screen print expert) | Generate 50 images/style → Photoshop → Separation Studio NXT → dataset | Weeks 2-3 |

Tracks are independent until Week 4, when Track A needs the trained LoRAs.

---

## P0: Demo Hardening + Training Data (May 9 → June 8)

**Goal**: Every feature in the crowdfunding video works end-to-end. 6 LoRAs trained on expert-enhanced images. 300-image color separation dataset ready.

---

### Week 1 (May 9 → May 15): AI Chat Core

**Focus**: Agent routing, switching, avatar state sync, real LLM calls, chat polish.

#### Day 1 — Friday, May 9 ✅ COMPLETE
**Sprint**: Agent Router Foundation  
**Hours**: ~12h (overshoot due to momentum)

| # | Task | Status |
|---|------|--------|
| 1 | Intent classification module (Mistral Small 4) | ✅ DONE |
| 2 | Agent routing middleware (`/api/chat/route.ts`) | ✅ DONE |
| 3 | Write 10 test cases for intent classification | ✅ DONE |

**Additional**: Rebuilt Mistral integration, expanded quick actions (9/agent), avatar preloading, voice VAD, voice pipeline (ElevenLabs TTS), assets cleanup, docs restructure.

---

#### Day 2 — Saturday, May 10 ✅ COMPLETE
**Sprint**: Security & Infrastructure  

| Category | Work Done | Issues |
|----------|-----------|--------|
| **Auth** | Clerk auth on all 5 chat API routes | — |
| **Rate Limiting** | Upstash Redis (20/min chat, 5/min voice) | #21 |
| **Prompt Injection** | Sanitization pipeline | #3, #4, #19 |
| **RBAC** | `requireStaffRole()` middleware | #20 |
| **Env Validation** | Zod schema for all env vars | #6 |
| **Refactoring** | Extracted hooks + sub-components | #10-#14 |
| **Build** | Both /app and /mainpage build clean | #22, #23 |

**GitHub Issues Closed**: #1 through #23

---

#### Day 3 — Sunday, May 11 ✅ COMPLETE
**Sprint**: Unified Wave Voice UX + Voice Pipeline Hardening  
**Hours**: 8

| # | Task | Status |
|---|------|--------|
| 1 | Stable wave button hold-to-speak | ✅ DONE |
| 2 | Pointer capture + 200ms hold threshold | ✅ DONE |
| 3 | Voice pipeline: persona system prompt + custom voices | ✅ DONE |
| 4 | Remove dead code (AudioMessageComponent, inline mic, etc.) | ✅ DONE |
| 5 | Voice subtitle overlay during speaking | ✅ DONE |
| 6 | Voice messages → plain text in chat history | ✅ DONE |

**GitHub Issues**: #24, #25, #26 closed

---

#### Day 4 — Monday, May 12
**Sprint**: Test Fixes + Typing Indicator + Message Animations  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Fix 7 TypeScript test errors (stale mock data in 3 test files) | 1h | `tsc --noEmit` passes with zero errors |
| 2 | Create `.env.example` with all required env vars documented | 0.5h | File exists at `app/.env.example` |
| 3 | Build `TypingIndicator` component ("Francisca is thinking..." with animated dots) | 1.5h | Shows during LLM API calls, hides on response |
| 4 | Wire `isTyping` state into `CatChatProvider.tsx` | 0.5h | Set true before API call, false on response/error |
| 5 | Add Framer Motion message animations (user slide right, agent slide left) | 1.5h | Spring physics (stiffness: 300, damping: 24) |
| 6 | Add relative timestamps to messages ("just now", "2m ago") | 1h | Messages show time. Updates on re-render |

**End of day**: Tests clean. Typing indicator visible. Messages animate in.

---

#### Day 5 — Tuesday, May 13
**Sprint**: Demo Mode + Action Executor  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Add `NEXT_PUBLIC_DEMO_MODE` flag + `?demo` URL parameter support | 1h | Can toggle demo mode without restart |
| 2 | Create `lib/demo/demoScripts.ts` — 5 scripted conversations | 2h | Onboarding, design request, refinement, store preview, voice greeting |
| 3 | Intercept API calls in demo mode, return scripted responses with 800ms-2s delay | 1.5h | Demo produces predictable output for video |
| 4 | Add graceful LLM fallback (error toast + retry, never crash) | 0.5h | If Mistral fails → friendly error, not a crash |
| 5 | Wire `actionExecutor.ts` to real LLM (replace static fallback) | 1h | Falls back to static only on LLM failure |

**End of day**: Demo mode produces predictable scripted responses. LLM never crashes UI.

---

#### Day 6 — Wednesday, May 14
**Sprint**: Mobile Chat Polish  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Fix chat at 375px width (bubble max-width, input vs keyboard, scroll) | 2h | Chat works on iPhone 14 and Pixel 7 |
| 2 | Add suggested reply chips below agent messages | 1.5h | 2-3 contextual chips, tap to send, only on latest message |
| 3 | Add message actions (long-press/hover → Copy, Retry) | 1.5h | Fade in/out with Framer Motion |
| 4 | Auto-scroll to bottom (on new message, don't auto-scroll if scrolled up) | 1h | Smooth scroll, respects user scroll position |

**End of day**: Chat works flawlessly on mobile and desktop.

---

#### Day 7 — Thursday, May 15
**Sprint**: Week 1 Review + Voice Cleanup  
**Hours**: 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Record 5-minute demo video of current chat state | 1h | Screen recording showing all working features |
| 2 | Document remaining bugs and polish items for Week 2 | 1h | List of 5-10 items |
| 3 | Remove duplicate STT hook (`use-deepgram.ts` — keep `useSpeechToText.ts`) | 1h | Single STT hook, all imports updated |
| 4 | Verify voice pipeline end-to-end (STT → LLM → TTS) | 1.5h | Full voice conversation works |
| 5 | Fix mainpage logo path (`/logo/full.png` → `/logo/short.png`) | 0.5h | Logo loads on marketing page |
| 6 | Week 2 prep: set up fal.ai account, get API key | 1h | `FAL_API_KEY` ready for Day 10 |

**End of day**: Week 1 demo recorded. Voice pipeline verified. Week 2 prep done.

---

### Week 2 (May 16 → May 22): Voice + Design Gen + Dataset Start

**Focus**: Voice STT/TTS, fal.ai wiring, Kontext editing, Victor begins training dataset.

#### Day 8 — Friday, May 16

| Track A (Engineering) | Track B (Victor — Training Data) |
|----------------------|----------------------------------|
| Deepgram STT integration (if needed) | **Buy Separation Studio NXT** ($229/yr) + install |
| Set up voice input pipeline | Test workflow: generate 1 image → Photoshop → separate |
| Handle mic permissions, errors | Create folder structure for dataset |
| **Hours**: 6 | **Hours**: 4 |

---

#### Day 9 — Saturday, May 17

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| ElevenLabs TTS integration into chat flow | **Set up Photoshop Actions** for batch treatment |
| Mute/unmute toggle, audio overlap handling | Create caption template (.txt format for LoRA training) |
| **Hours**: 6 | **Hours**: 4 |

---

#### Day 10 — Sunday, May 18

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| **fal.ai client setup**: `bun add @fal-ai/client sharp` | **Generate batch 1**: American Traditional + Japanese |
| Wire `generateDesign()` in `falClient.ts` | 100 raw images generated (50/style) |
| Build `/api/design/generate` route with Zod validation | Curate best 50 per style, reject weak ones |
| Add generation progress UI ("Francisca is designing...") | |
| Implement `postProcessImage()` with Sharp | |
| **Hours**: 6 | **Hours**: 6 |

---

#### Day 11 — Monday, May 19

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Build `DesignCard` component (shows generated image) | **Photoshop treat batch 1** (50 images) |
| Add Approve/Refine action buttons | Levels, contrast, sharpening, cleanup |
| Implement design history (carousel/grid) | Save enhanced versions alongside raw |
| Save designs to session storage | |
| **Hours**: 6 | **Hours**: 6 |

---

#### Day 12 — Tuesday, May 20

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| **Kontext iterative editing**: build `/api/design/edit` route | **Separate batch 1** in Separation Studio NXT |
| Side-by-side comparison view (original vs refined) | Export individual color layers per image |
| Auto-escalation to kontext/max after round 3 | Organize: raw/ enhanced/ separated/ per image |
| "Use as base" option + Sharp auto-sharpen | |
| **Hours**: 6 | **Hours**: 5 |

---

#### Day 13 — Wednesday, May 21

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Pre-generate 20 demo designs for video (5 metal, 5 indie, 5 hip-hop, 5 pop) | **Generate batch 2**: Blackwork + Vintage 90s |
| Build design cycling component for demo mode | 100 raw images, curate to 50 per style |
| Test voice + design generation together (full pipeline <15s) | |
| **Hours**: 6 | **Hours**: 5 |

---

#### Day 14 — Thursday, May 22

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Week 2 review, record demo of voice + design | **Photoshop + separate batch 2** (100 images) |
| Fix any latency issues (voice <2s, generate <10s) | Same workflow as batch 1 |
| Design storefront component architecture | |
| Build storefront shell (empty state at `/shop/[artist-slug]`) | |
| **Hours**: 6 | **Hours**: 6 |

---

### Week 3 (May 23 → May 29): Storefront + Dataset Completion

**Focus**: Storefront build, Victor completes remaining styles.

#### Day 15 — Friday, May 23

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Build StorefrontHero component (banner, name, tagline) | **Generate batch 3**: Realism + Dark Art |
| Create ArtistBio section | 100 raw images, curate to 50 per style |
| Add store theme customization (colors) | |
| **Hours**: 6 | **Hours**: 5 |

---

#### Day 16 — Saturday, May 24

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Build ProductCard component (image, price, "Add to Cart") | **Photoshop + separate batch 3** (100 images) |
| Create ProductGrid layout (responsive 3→2→1 cols) | |
| Add product filtering (category) | |
| Pre-populate with 12 mock products | |
| **Hours**: 6 | **Hours**: 6 |

---

#### Day 17 — Sunday, May 25

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Build CartDrawer (slide-out, items, quantities, subtotal) | **Quality review all 300 images**: reject weak ones |
| Add cart state management (Zustand + localStorage) | Regenerate if any style has <40 acceptable images |
| Connect storefront to demo mode | |
| **Hours**: 6 | **Hours**: 4 |

---

#### Day 18 — Monday, May 26

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Integration testing: chat → design → store → cart | **Caption all 300 images** (.txt files for LoRA training) |
| Test on 3 devices (desktop, iPhone, Android) | Format: trigger word + description per image |
| Fix P0 bugs (anything blocking video) | |
| **Hours**: 6 | **Hours**: 5 |

---

#### Day 19 — Tuesday, May 27

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Polish main landing page (`/`) | **Upload full dataset to HuggingFace** |
| Add "Try the Demo" CTA → opens chat | 6 repos (one per style), organized by raw/enhanced/separated |
| Polish waitlist page (`/waitlist`) | |
| **Hours**: 6 | **Hours**: 3 |

---

#### Day 20 — Wednesday, May 28

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Script the 5-minute product demo | **Trigger fal.ai LoRA training** on all 6 styles |
| Record screen capture (4K, 60fps) | $48 total ($8/LoRA × 6), ~30 min per LoRA |
| Record voiceover or captions | Monitor training progress |
| **Hours**: 6 | **Hours**: 2 |

---

#### Day 21 — Thursday, May 29

| Track A (Engineering) | Track B (Victor) |
|----------------------|------------------|
| Week 3 review, document all features | **LoRA training completes** |
| Document known limitations for video | Download .safetensors files from fal.ai |
| Set up video production folder | Verify LoRA quality with test generations |
| **Hours**: 6 | **Hours**: 3 |

---

### Week 4 (May 30 → June 5): LoRA Integration + Essential Polish

**Focus**: Wire trained LoRAs into generation pipeline, polish remaining issues.

#### Day 22 — Friday, May 30

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | **Wire trained LoRAs into fal.ai generation** — replace base model with LoRA-enhanced calls | 2h | Generation uses custom LoRAs from HuggingFace URLs |
| 2 | Upload LoRAs to HuggingFace Spaces (if not already) | 0.5h | Public URLs accessible by fal.ai |
| 3 | Update `falClient.ts` with LoRA loading logic | 1.5h | `generateDesign()` accepts `loraStyle` and loads correct LoRA |
| 4 | Test generation with all 6 styles | 2h | Each style produces distinct aesthetic |

---

#### Day 23 — Saturday, May 31

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | A/B test: base model vs LoRA output quality | 2h | Document quality differences per style |
| 2 | Build design gallery component (show all 6 styles as options) | 2h | Visual style selector with thumbnails |
| 3 | Iteration: retrain weak styles if needed | 2h | Fall back to base model for styles that didn't train well |

---

#### Day 24 — Sunday, June 1

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Enhancement pipeline integration (raw → Sharp → display) | 2h | Post-processing runs automatically on every generation |
| 2 | Voice + LoRA demo integration | 2h | Speak "design a shirt in American Traditional style" → LoRA generation |
| 3 | Expert sync: share dataset, get quality feedback | 1h | Email with sample images + separations |
| 4 | U-Net training prep: organize 300 separation pairs | 1h | Input/output pairs documented and organized |

---

#### Day 25 — Monday, June 2

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Framer Motion page transitions | 2h | Fade between routes, no flash of unstyled content |
| 2 | Loading states between pages | 1.5h | Branded spinner, not default browser |
| 3 | Voice waveform visualization | 2h | Animated bars responding to mic input |
| 4 | Design comparison slider (drag to wipe original vs refined) | 0.5h | Start building |

---

#### Day 26 — Tuesday, June 3

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Design comparison slider (complete) | 2h | Drag slider to wipe between original and refined |
| 2 | Button hover states (scale, glow, color shift) | 1.5h | Consistent across all buttons |
| 3 | Toast notifications (success, error, info) | 1.5h | Slide in from top-right, auto-dismiss |
| 4 | Loading spinners (branded, gold/rose) | 1h | Custom spinner, not default browser |

---

#### Day 27 — Wednesday, June 4

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Mobile test: iPhone 14 full user journey | 2h | All features work on mobile |
| 2 | Fix touch targets (min 44px), keyboard handling | 1.5h | Easy to tap, input visible when keyboard opens |
| 3 | Android Pixel 7 test + fix Android bugs | 1.5h | Same quality as iPhone |
| 4 | Optimize images for mobile (Cloudinary `w_600`) | 1h | Smaller images served on mobile |

---

#### Day 28 — Thursday, June 5

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Lighthouse audit, fix issues | 1.5h | Performance >80, Accessibility >90 |
| 2 | Optimize bundle size (lazy load, code split) | 1.5h | Target: <200KB initial JS |
| 3 | Bug bash: fix all remaining P0 issues | 2h | Zero console errors, zero build warnings |
| 4 | Final integration test: full user journey | 1h | Chat → design → store → cart works end-to-end |

---

### Week 5 (June 6 → June 8): Final Polish

#### Day 29 — Friday, June 6

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Full demo with LoRA-quality designs + voice + storefront | 2h | End-to-end works smoothly |
| 2 | Branded loading screen with Cat-Suite logo | 2h | Full-screen loading, progress bar, fun tip text |
| 3 | Scroll-triggered animations (landing page sections) | 2h | Each section fades in as it enters viewport |

---

#### Day 30 — Saturday, June 7

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Polish pass: animations, transitions, edge cases | 3h | Every interaction feels premium |
| 2 | Counter animation ("500+ artists" counts up) | 1h | Numbers animate when scrolled into view |
| 3 | Input focus states (border, shadow, accessible) | 1h | Keyboard navigation works |
| 4 | Final demo recording test | 1h | Record 2-min test, review for issues |

---

#### Day 31 — Sunday, June 8

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | **P0 COMPLETE.** Final verification | 2h | All features in Definition of Done work |
| 2 | Document all features that work + known limitations | 1h | List for video production reference |
| 3 | Handoff document for video production | 1.5h | Recording setup, scripts, folder structure |
| 4 | Research video editors (Fiverr/Upwork) | 1.5h | Shortlist 3 editors with tech video portfolios |

---

## P1: Essential Polish (June 9 → June 15)

**Goal**: Polish the most visible elements. 1 week only — keep what matters, cut what doesn't.

#### Day 32 — Monday, June 9

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Agent entrance animation (Leopoldo "walks in") | 3h | First visit only, skippable, smooth on mobile |
| 2 | Confetti on design approval | 1.5h | Small gold/rose burst, not overwhelming |
| 3 | Image reveal animation (blur → sharpen) | 1.5h | Generated images reveal dramatically |

---

#### Day 33 — Tuesday, June 10

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Scroll-triggered animations final pass | 2h | All landing page sections animate |
| 2 | Micro-interactions (button hovers, input focus) | 2h | Every interaction has feedback |
| 3 | Mobile final pass | 2h | iPhone + Android, all features, 60fps |

---

#### Day 34 — Wednesday, June 11

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Landing page final polish (all sections) | 3h | Hero, features, quality, CTA all premium |
| 2 | Waitlist page polish (validation, success state, social proof) | 2h | Conversion-optimized |
| 3 | Performance final audit | 1h | Lighthouse >80 mobile, >90 desktop |

---

#### Day 35 — Thursday, June 12

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | **P1 COMPLETE.** Final review of all features | 2h | Every feature works, looks premium |
| 2 | Build `/invest` landing page (hero video, tier cards, FAQ) | 3h | Responsive, conversion-ready |
| 3 | Export any remaining social clip versions | 1h | 15-sec Instagram/TikTok clips ready |

---

## P2: Video Production (June 16 → June 22)

**Goal**: Professional crowdfunding video.

#### Day 36 — Monday, June 16

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Set up recording environment (clean browser, dark room) | 1h | No bookmarks bar, no extensions |
| 2 | Record all screen capture segments | 3h | Landing, chat, voice, design gen, refinement, storefront. 4K 60fps |
| 3 | Record founder talking to camera | 1.5h | 2-3 takes, authentic |
| 4 | Organize footage (label clips) | 0.5h | "01_landing", "02_chat", etc. |

---

#### Day 37 — Tuesday, June 17

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Record B-roll (close-ups, phone screen, design generating) | 2h | Rich visual variety |
| 2 | Record voiceover (if using) | 1.5h | Match timing to screen captures |
| 3 | Source music (royalty-free) | 1h | 2-3 tracks, epic but not corporate |
| 4 | Create rough cut (first assembly) | 1.5h | Clips in order, no transitions yet |

---

#### Day 38 — Wednesday, June 18

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Edit transitions and motion graphics | 2.5h | Smooth cuts, text animations, logo reveals |
| 2 | Add color grading | 1h | Consistent dark theme, gold highlights |
| 3 | Add subtitles/captions | 1.5h | All spoken text has captions |
| 4 | Render test versions (16:9, 9:16, 1:1) | 1h | Main video + social clips |

---

#### Day 39 — Thursday, June 19

| # | Task | Time | Acceptance |
|---|------|------|------------|
| 1 | Final video review + export | 1.5h | Watch full video, note tweaks, export 4K master |
| 2 | Create social clip versions (15-sec for TikTok/Reels) | 1h | Best moments, vertical format |
| 3 | Video review with fresh eyes | 1.5h | Step away, rewatch, fix anything jarring |
| 4 | Backup all video assets | 1h | Cloud backup, share with 1 trusted person |

---

## P3: Campaign Prep (June 9 → June 22)

**Runs parallel with P1 + P2.**

### Week 6 (June 9 → June 15): Campaign Assets

| Day | Task | Hours |
|-----|------|-------|
| **June 9** | Write campaign page copy (headline, body, reward tiers, FAQ) | 6 |
| **June 10** | Write pre-launch email sequence (5 emails) + set up automation | 6 |
| **June 11** | Create social media kit (10 Instagram graphics, 5 TikTok scripts, Twitter thread) | 6 |
| **June 12** | Build `/tokens` explainer page (MRCH token, governance, wallet setup) | 6 |

### Week 7 (June 16 → June 22): Press + Warmup

| Day | Task | Hours |
|-----|------|-------|
| **June 16** | Write press release + create press kit + contact 10 micro-influencers | 6 |
| **June 17** | Waitlist activation email ("something big is coming") + social teasers | 6 |
| **June 18** | Final campaign review (all assets, Indiegogo draft, schedule emails) | 6 |
| **June 19** | Backup all assets, create launch day checklist | 6 |

---

## P4: Pre-Launch Warmup (June 23 → June 29)

| Day | Focus | Key Actions |
|-----|-------|-------------|
| **June 23** | Email #2 "Meet the Cat-Suite" | Agent intro emails, Instagram carousel, TikTok |
| **June 24** | Email #3 "Your Art Deserves Better" | Problem agitation, comparison graphic, founder story |
| **June 25** | Email #4 "Here's What You Get" | Tier breakdown, MRCH token thread, final Indiegogo review |
| **June 26** | Email #5 "24 Hours Left" | Countdown, press push, influencer activation |
| **June 27** | Launch Day Minus 1 | Systems check, draft communications, UTM tracking, sleep |
| **June 28-29** | Buffer days | Fix anything that comes up, rest before launch |

---

## P5: Campaign Live (June 30 → July 30)

### Launch Day — Monday, June 30

| Time | Action |
|------|--------|
| 8:00 AM | Final website check. All systems green. |
| 9:00 AM | Post "We're LIVE" on all social channels. Video first. |
| 9:30 AM | Send launch email to full waitlist (500+ people). |
| 10:00 AM | **FLIP THE SWITCH.** Indiegogo goes live. |
| 10:15 AM | Monitor first 15 minutes. Respond to every comment. |
| 2:00 PM | Check funding progress. Post update. |
| 6:00 PM | Post TikTok: "We just launched!" |
| 8:00 PM | Discord AMA: 30-minute Q&A with founder. |
| 10:00 PM | Final check of Day 1. Document everything. |

### Campaign Maintenance (July 1-30)

**Daily**: Check funding, respond to comments, post update  
**Weekly**: Monday update email, Wednesday artist spotlight, Friday milestone, Sunday plan next week

**Key milestones**: 25% → 50% → 75% → 100% → Stretch goal (€50K = +50 Merch Coins)

---

## P6: Post-Campaign (August → September)

| Week | Focus | Key Actions |
|------|-------|-------------|
| Aug 1-2 | Fulfillment | Credit backer accounts with Merch Coins. Send wallet setup guide. |
| Aug 3-4 | Community | Create "Founding Artists" Discord channel. Weekly updates. |
| Aug 5-6 | Operations | Begin Castelo Branco facility setup. Apply for Portugal 2030 grant. |
| Aug 7-8 | Inventory | Order initial blanks, inks, screens. Test production workflow. |
| Sep 1-2 | Data | Compile crowdfunding metrics: backers, demographics, social reach. |
| Sep 3-4 | Deck | Build investor deck with real traction data. |
| Sep 5-6 | Outreach | Identify 20 seed-stage investors in EU. Warm intros. |

---

## P7: Investor Pitch (September → October)

**Opening**: "We raised €50K from 458 backers in 30 days with zero paid ads. Our AI works. We're not asking you to bet on an idea — we're asking you to fund growth."

**Slides**: Traction → Product demo → Market → Business model → Team → Moats (proprietary dataset) → Ask (€230K, 16-18%, 24 months)

---

## Training Data Strategy (Track B Detail)

### The Full Pipeline

```
Generated Image (raw FLUX.2-dev output)
    │
    ├─→ Photoshop Treatment (Victor's expert enhancement)
    │       ├─→ LoRA Training: enhanced image = style + print quality
    │       └─→ Enhancement Model: raw → enhanced input/output pairs
    │
    └─→ Separation Studio NXT (professional color separation)
            └─→ U-Net Training: enhanced → separated layers
```

### Dataset Structure

```
/lora-training-data/
├── american-traditional/
│   ├── 001/
│   │   ├── raw.png
│   │   ├── enhanced.png
│   │   ├── separation/ (layer-1.png, layer-2.png, ...)
│   │   ├── caption.txt
│   │   └── metadata.json
│   └── ... (50 images)
├── japanese/ ... (50)
├── blackwork/ ... (50)
├── vintage-90s/ ... (50)
├── realism/ ... (50)
├── dark-art/ ... (50)
└── README.md
```

### Three Assets Produced

| Asset | Training Data | Moat Level |
|-------|--------------|------------|
| 6 Style LoRAs | 50 enhanced images each | Medium — replicable with effort |
| Color Separation U-Net | 300 input/output separation pairs | **High** — proprietary dataset |
| Enhancement Pipeline | 300 raw → enhanced pairs | **High** — tacit knowledge capture |

### Time Estimate (Victor, 10+ yr expert)

| Task | Per Image | 300 Images |
|------|-----------|------------|
| Generate + curate | 2 min | 10 hours |
| Photoshop treatment | 5-8 min | 25-40 hours |
| Separation Studio | 3-5 min | 15-25 hours |
| Organize + caption | 2 min | 10 hours |
| **Total** | **~12-17 min** | **~60-85 hours** |

### Expert Handoff (Post-MVP)
- Victor's 300 images serve as initial dataset
- Expert validates quality, expands to 1,000+ images
- U-Net retrained on larger dataset with expert scoring

---

## What Gets Cut (Deferred to Post-Crowdfunding)

| Feature | Why Deferred | When It Returns |
|---------|-------------|-----------------|
| Easter egg (secret agent mode) | Fun but not critical | Post-crowdfunding |
| Cursor effects (gold glow trail) | Nice-to-have | Post-crowdfunding |
| Real-time payments (Stripe) | Mock checkout sufficient | Post-crowdfunding |
| Full order management | No real orders yet | Post-crowdfunding |
| Inventory tracking | Facility not operational | Post-crowdfunding |
| Social commerce hub | Phase 9 | 2027 |
| Accessories expansion | Phase 10 | 2027-2028 |
| Self-hosting AI models | API-only fine at scale | When >200K images/month |

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| LoRA training quality poor | Medium | A/B test vs base model, retrain with better data |
| AI generation too slow for video | Medium | Pre-generate 20 designs, show timelapse |
| Voice quality insufficient | Medium | ElevenLabs fallback, or skip voice in video |
| Dataset creation takes too long | Medium | Reduce to 30 images/style if behind schedule |
| Campaign doesn't hit goal | Low | Indiegogo Flexible Funding — keep whatever you raise |
| Video looks amateur | Low | Hire editor on Fiverr/Upwork if needed |
| fal.ai API downtime | Low | Pre-generate fallback images |

---

## Key Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Video completion rate | >60% | Watch to end = conversion |
| Waitlist → backer conversion | >20% | 500 waitlist → 100 backers min |
| Social shares per backer | >2 | Organic reach |
| Average pledge | >€100 | Higher tiers = more capital |
| Day 1 funding % | >30% | Algorithm boost + momentum |

---

## Definition of Done (Crowdfunding Demo)

The demo is ready for the video when:

- [ ] A new user can visit the site, see Leopoldo greet them, and have a 3-message conversation
- [ ] User can switch to Francisca and request a t-shirt design in a specific LoRA style
- [ ] Design generates in <10 seconds with LoRA-enhanced quality
- [ ] User can refine the design with text or voice (Kontext editing)
- [ ] User can preview an artist storefront with products
- [ ] Voice mode works: speak → transcribe → respond → speak back
- [ ] Demo mode produces predictable responses for video recording
- [ ] Mobile experience is flawless (iPhone 14 + Pixel 7 tested)
- [ ] Every animation is smooth (60fps, no jank)
- [ ] Zero console errors, zero build warnings
- [ ] 6 LoRAs trained and integrated
- [ ] 300-image dataset on HuggingFace

---

## Post-MVP Backlog

These tasks have existing plan files. Execute when ready.

| Task | Plan File | When |
|------|-----------|------|
| Eshop security hardening | `.opencode/plans/fix-eshop-security-hardening.md` | Post-campaign |
| GDPR database + API | `.opencode/plans/agent-2-gdpr-database-api.md` | Post-campaign |
| GDPR frontend | `.opencode/plans/agent-3-gdpr-frontend.md` | Post-campaign |
| GDPR automation docs | `.opencode/plans/agent-4-gdpr-automation-docs.md` | Post-campaign |
| MerchStation TUI | `.opencode/plans/merchstation-tui.md` | Phase 8+ |
| Quick wins (process) | `.opencode/plans/agent-5-quick-wins.md` | Anytime |
| U-Net color separation training | Needs new plan | Post-campaign (use 300-image dataset) |
| ostris/ai-toolkit self-hosted LoRA training | Evaluate post-campaign | Phase 2+ |

---

**Owner**: Victor Bendas  
**Campaign Launch**: June 30, 2026  
**Investor Pitch Target**: October 2026  
**Platform**: Indiegogo (Flexible Funding)
