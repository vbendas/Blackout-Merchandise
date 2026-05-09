# MerchFrom Master Roadmap

> **Document Version:** 2.10 (Updated)  
> **Last Updated:** February 24, 2026  
> **Status:** Phase 6 (Commerce) - STARTING  
> **Timeline to MVP:** 3-5 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Build Philosophy](#build-philosophy)
3. [High-Level Phases Overview](#high-level-phases-overview)
4. [Completed Phases (0-3.4)](#completed-phases-0-34)
5. [Current Phase: 3.5-3.6 (App Enhancement + Waitlist)](#current-phase-35-36-app-enhancement--waitlist)
6. [Phase 3.7: Context-Aware Routing](#phase-37-context-aware-agent-routing)
7. [Phase 3.8: Product Catalog Database](#phase-38-product-catalog-database-feb-20-2026)
8. [Phase 4: Backend Core](#phase-4-backend-core)
9. [Phase 5: AI Integration](#phase-5-ai-integration)
10. [Phase 5.5: Mockup Generation System](#phase-55-mockup-generation-system)
11. [Phase 6: Commerce](#phase-6-commerce)
12. [Phase 7: Beta Launch](#phase-7-beta-launch)
12. [Phase 8: Public Launch](#phase-8-public-launch)
13. [Phase 9: Social Commerce Hub](#phase-9-social-commerce-hub)
12. [Deferred Features](#deferred-features)
13. [Agent Assignments Summary](#agent-assignments-summary)
14. [Success Criteria](#success-criteria)
15. [Verification Plan](#verification-plan)

---

## Executive Summary

**MerchFrom** is an AI-powered premium merchandise platform for artists and creators. We're building a platform where three "Cat-Suite" brand ambassadors (Leopoldo, Francisca, Antonia) guide artists through design, production, and sales—all powered by real AI.

**Mission:** Help artists, brands, and companies design, source, and sell premium quality merchandise through an AI-managed platform with professional visual tools.

**Current Status:**
- ✅ Phases 0-3.4 COMPLETE (Core shell, interactive demo, frontend content suite)
- ✅ Phase 3.5-3.6 ~95% Complete (Audio, cards, waitlist AI interview)
- ✅ Phase 3.7 COMPLETE (Context-aware agent routing with M2-Her)
- ✅ Phase 3.8 COMPLETE (Product catalog database - 11 tables, operations, AI queries)
- ⏳ Phase 4+ Ready to begin (Backend core, AI integration, commerce, launch)

**Key Deliverables (Next 2 Weeks):**
- ✅ Context-aware agent routing with M2-Her (just completed)
- ✅ Product Catalog Database (11 tables, operations, AI-optimized queries)
- Waitlist landing page with AI interview (text + voice options) - 95% complete
- Inline product, mockup, and design cards
- Full product catalog lightbox with filters

---

## Build Philosophy

### Hybrid Build: One Codebase, Two Modes

Building a throwaway "Demo" and then a separate "Production" app wastes time. Instead, we build **one codebase** with clean separation:

1. **Demo Mode:** Uses mocked API responses, static design assets, and scripted conversation flows
2. **Production Mode:** Swaps mocks for real Neon data, Stripe payments, and live AI calls via environment flags

**Every line of code written for the demo is production-ready.**

---

## High-Level Phases Overview

| Phase | Name | Goal | Duration | Status |
|-------|------|------|----------|--------|
| **0** | Foundations | Project setup, design system, avatar commissioning | 1 Week | ✅ COMPLETE |
| **1** | Demo MVP: Core Shell | Static pages, routing, placeholder states | 2 Weeks | ✅ COMPLETE |
| **2** | Demo MVP: Interactive | Scripted chat, mockup gallery, animated transitions | 2 Weeks | ✅ COMPLETE |
| **3** | Frontend Content Suite | Build ALL interfaces (home, app, waitlist) | 2 Weeks | ✅ COMPLETE (3.1-3.4) |
| **3.5-3.6** | App Enhancement + Waitlist | Audio input, inline cards, catalog, AI interview | 2 Weeks | 🔄 ~95% COMPLETE |
| **3.7** | Context-Aware Routing | M2-Her agent routing with knowledge base | 1 Day | ✅ COMPLETE |
| **3.8** | Product Catalog Database | Full catalog schema, operations, AI queries | 1 Day | ✅ COMPLETE |
| **4** | Prod MVP: Backend | Neon + Clerk, Auth, Real Data Architecture | 2 Weeks | ⏳ Feb 9 → Feb 23 |
| **5** | Prod MVP: AI Agents | Connect real AI (MiMo, Flux, U-Net) | 2 Weeks | ⏳ Feb 26 → Mar 12 |
| **5.5** | Mockup Generation | Realistic product mockups with halftone | 2 Weeks | ⏳ Mar 12 → Mar 26 |
| **6** | Prod MVP: Commerce | Stripe, Orders, Artist Dashboard | 3 Weeks | ⏳ Mar 26 → Apr 16 |
| **7** | Beta Launch | Onboard 10-100 artists, gather data | 9 Months | ⏳ Apr 2026 → Dec 2026 |
| **8** | Public Launch | Final polish, marketing, profitability | 1 Month | ⏳ Dec 2026 |
| **9** | Social Commerce Hub | Discord, Meta, TikTok, Twitch catalog sync | 17 Weeks | ⏳ Jan-May 2027 |
| **10** | Accessories Expansion | 3D-printed jewelry (pendants, rings, bracelets) via Cat-Suite AI | Year 2 | ⏳ 2027-2028 |

**Total Estimated Time:** ~58 weeks (MVP: 15 weeks + Beta: 36 weeks + Polish: 4 weeks + Social: 17 weeks)

---

## Completed Phases (0-3.4)

### Phase 0: Foundations ✅ COMPLETE
- GitHub, Vercel, Neon, Clerk accounts setup
- Next.js 16 project initialized with Tailwind & HeroUI
- Cat-Suite avatar assets generated (60 expressions across 3 characters)
- GDPR compliance fully implemented
- Multi-agent system integration framework

### Phase 1: Demo MVP - Core Shell ✅ COMPLETE
- Route structure (`/`, `/app`, `/app/workshop`, `/app/showroom`, `/app/support`)
- AppLayout with header, avatar container, chat panel
- Hero section with Leopoldo avatar
- TransitionLayout for hero-to-copilot animations

### Phase 2: Demo MVP - Interactive ✅ COMPLETE
- Avatar emotion sync with sentiment detection
- Scripted demo flows (Leopoldo, Francisca, Antonia)
- Product mockup gallery with grid layout
- Bulk quote UI with Quote Card component
- Product card component for `/app/showroom`

### Phase 3.1-3.4: Frontend Content Suite ✅ COMPLETE
- Main marketing website (/) with hero, masonry grid, marquees, waitlist CTA, footer
- App workspace (`/app/workspace`) with chat interface, history sidebar, notifications
- Quick prompt chips, sticky header with user menu, typing indicators
- Session history persistence, avatar expression system
- Accessibility widget, floating socials sidebar

---

## Current Phase: 3.5-3.6 (App Enhancement + Waitlist)

### Overview
Complete the app AI chat interface with voice input, inline product suggestions, full catalog browser, and a sophisticated waitlist landing page with AI interview.

### Timeline
**Weeks: 2 weeks (Jan 27 - Feb 9, 2026)**

### Phase 3.5: App UI Enhancements

#### 3.5.0: Database Schema Updates
| Task | Subtasks | Est. Time |
|------|----------|-----------|
| Update Drizzle schema for waitlist | Add fields: socialLink, followerRange, interviewResponses, position, status | 1.5 hours |
| Create productBlanks table | New table for catalog items (tees, hoodies, etc.) | 1 hour |
| Add message type system | TypeScript types for inline cards in chat | 30 min |
| Generate & run migrations | Use drizzle-kit push | 15 min |
| Create DB operations files | waitlist.ts enhancements, productBlanks.ts new file | 1.5 hours |

**Total: 5-6 hours** | **Agent: Database Specialist**

---

#### 3.5.1: Audio Button - Speech to Text
| Task | Details | Files | Est. Time |
|------|---------|-------|-----------|
| Add mic button to input | Visual button next to send button | `/app/src/app/app/workspace/page.tsx` | 30 min |
| **Audio Conversation Lightbox** | Voice conversation UI with agent orb, waveform | `/app/src/components/AudioConversationLightbox.tsx` | **2 hours** |
| **ElevenLabs Integration** | Orb, LiveWaveform, ShimmeringText components | `/app/src/components/ui/orb.tsx`, `live-waveform.tsx`, `shimmering-text.tsx` | **1.5 hours** |
| **Portal Component** | Portal wrapper for proper overlay positioning | `/app/src/components/ui/portal.tsx` | **30 min** |
| Create `useSpeechToText` hook | Web Speech API with browser permission handling | `/app/src/hooks/useSpeechToText.ts` | 1 hour |
| Recording indicator | Pulsing animation, recording state | `/app/src/components/ui/RecordingIndicator.tsx` | 45 min |
| Deepgram STT API route | Transcribe audio to text via Deepgram | `/app/src/app/api/speech/transcribe/route.ts` | 1.5 hours |
| Voice mode toggle | Text/voice conversation mode switch | `/app/src/components/chat/VoiceModeToggle.tsx` | 45 min |
| Voice-to-voice API (Deepgram) | Full pipeline: audio → STT → MiMo → TTS → audio | `/app/src/app/api/speech/voice-agent/route.ts` | 2 hours |
| Fallback to Web Speech API | Browser native speech recognition | Hook enhancement | 30 min |

**Total: 10-11 hours** | **Agent: Frontend + API Specialist**

**Features Implemented:**
- Audio button in bottom bar opens voice conversation lightbox
- ElevenLabs Orb (3D animated agent visualization) with agent-specific colors
- ElevenLabs LiveWaveform for real-time audio visualization
- ShimmeringText for animated state labels
- Portal wrapper ensures lightbox overlays all content properly
- Auto-selects current chat agent (Leopoldo/Francisca/Antônia)
- Pulsing animation on Orb during active states (listening/speaking/processing)

**Voice-to-Voice Architecture:**
```
User Audio → MiniMax Speech 2.6 Real-Time
          → MiniMax M2-her (LLM)
          → MiniMax Speech 2.6 Real-Time (response)
          → User Speakers
```

**Cost:** ~$0.03-0.05/min (pure MiniMax - no external STT/TTS)

---

#### 3.5.2: Product Card Box - Inline Chat Suggestions
| Task | Details | Files | Est. Time |
|------|---------|-------|-----------|
| ProductCardInline component | Thumbnail, name, price, "View" button | `/app/src/components/chat/ProductCardInline.tsx` | 1.5 hours |
| ProductCardCarousel | Carousel for multiple product suggestions | `/app/src/components/chat/ProductCardCarousel.tsx` | 1.5 hours |
| Click handler → Lightbox | Opens product detail lightbox | Integration | 30 min |
| ProductCardSkeleton | Loading state while fetching | `/app/src/components/chat/ProductCardSkeleton.tsx` | 45 min |
| Database integration | Query real products from DB | `/src/db/products.ts` integration | 1 hour |
| Message type handling | Render product cards in chat flow | Workspace component | 45 min |

**Total: 6-7 hours** | **Agent: Frontend Specialist**

---

#### 3.5.3: Mockup Card - Design Preview in Chat
| Task | Details | Files | Est. Time |
|------|---------|-------|-----------|
| MockupCardInline component | Show design preview on product blank | `/app/src/components/chat/MockupCardInline.tsx` | 1.5 hours |
| Action buttons | Edit, Approve, Regenerate buttons | Same file | 45 min |
| Fullscreen lightbox | Opens full-screen mockup viewer | Integration | 30 min |
| Zoom/pan capability | Pinch-to-zoom, drag to pan in fullscreen | Lightbox component | 1 hour |
| Francisca agent integration | Show mockup cards in agent responses | Chat handling | 30 min |

**Total: 4-5 hours** | **Agent: Frontend Specialist**

---

#### 3.5.4: Design Card - AI Generated Artwork in Chat
| Task | Details | Files | Est. Time |
|------|---------|-------|-----------|
| DesignCardInline component | Show generated artwork with metadata | `/app/src/components/chat/DesignCardInline.tsx` | 1.5 hours |
| Action buttons | Apply, Download, Regenerate | Same file | 45 min |
| Fullscreen viewer | High-res design viewer | Lightbox integration | 30 min |
| Metadata display | LoRA style, prompt used, generation details | Card component | 45 min |
| Integration with Flux | Show designs generated by Flux | Chat handling | 30 min |

**Total: 4-5 hours** | **Agent: Frontend Specialist**

---

#### 3.5.5-3.5.7: Catalog Lightbox System
| Task | Details | Files | Est. Time |
|------|----------|-------|-----------|
| CatalogLightbox shell | Main lightbox container | `/app/src/components/catalog/CatalogLightbox.tsx` | 1 hour |
| Category filters | Filter by tees, hoodies, sweaters, etc. | `/app/src/components/catalog/CategoryFilters.tsx` | 1.5 hours |
| ProductGrid view | Grid layout of product cards | `/app/src/components/catalog/ProductGrid.tsx` | 1.5 hours |
| ProductSlider view | Carousel/slider layout | `/app/src/components/catalog/ProductSlider.tsx` | 1.5 hours |
| View toggle | Switch between grid/slider | `/app/src/components/catalog/ViewToggle.tsx` | 45 min |
| Search functionality | Filter by name, category, price | `/app/src/components/catalog/SearchBar.tsx` | 1 hour |
| Catalog product card | Card component for catalog items | `/app/src/components/catalog/CatalogProductCard.tsx` | 1 hour |
| Open/close animations | Slide up from bottom with Framer Motion | Lightbox component | 45 min |
| Keyboard navigation | Arrow keys, escape to close | Accessibility | 1 hour |
| Browse button | Add to workspace | `/app/src/app/app/workspace/page.tsx` | 30 min |
| Seed product blanks data | Insert catalog items into database | `/src/db/seed/productBlanks.ts` | 2 hours |
| Catalog API route | GET /api/catalog with filters | `/app/src/app/api/catalog/route.ts` | 1 hour |

**Total: 16-18 hours** | **Agent: Frontend Specialist**

---

#### 3.5.6: Product Detail Lightbox
| Task | Details | Files | Est. Time |
|------|---------|-------|-----------|
| ProductDetailLightbox component | Full product details view | `/app/src/components/catalog/ProductDetailLightbox.tsx` | 1.5 hours |
| Image gallery | Thumbnails + main image viewer | Same file | 1.5 hours |
| Product info section | Name, description, price, specs | Same file | 1 hour |
| Size selector | Interactive size selection | `/app/src/components/catalog/SizeSelector.tsx` | 45 min |
| Color selector | Interactive color selection | `/app/src/components/catalog/ColorSelector.tsx` | 45 min |
| "Use This Blank" CTA | Add blank to conversation | Same file | 30 min |
| Related products | Show similar items | Same file | 1 hour |
| Quality badges | Eco, fair-trade, sustainable indicators | `/app/src/components/catalog/QualityBadges.tsx` | 30 min |
| Navigation | Back to catalog, close lightbox | Same file | 30 min |

**Total: 8-9 hours** | **Agent: Frontend Specialist**

---

#### 3.5.7: Unified Lightbox System
| Task | Details | Files | Est. Time |
|------|---------|-------|-----------|
| LightboxContext | Global state management | `/app/src/lib/LightboxContext.tsx` | 1 hour |
| useLightbox hook | Custom hook for lightbox control | `/app/src/hooks/useLightbox.ts` | 45 min |
| ImageViewer | Fullscreen image viewer | `/app/src/components/catalog/ImageViewer.tsx` | 1.5 hours |
| Zoom/pan controls | Pinch-to-zoom, drag navigation | Same file | 1 hour |
| Share/download | Export image functionality | Same file | 30 min |
| Consistent close behavior | Escape, click outside, close button | All lightbox components | 45 min |
| Add lightbox provider | Wrap app layout with provider | `/app/src/app/app/layout.tsx` | 30 min |

**Total: 6-7 hours** | **Agent: Frontend Specialist**

---

### Phase 3.6: Waitlist Landing Page with AI Interview

#### Overview
Build a multi-step waitlist experience where users go through a conversational flow with Leopoldo (the onboarding cat agent). Support both text and voice interview modes.

#### Steps

| Step | Component | Description |
|------|-----------|-------------|
| **1** | Welcome | Leopoldo greets user with pitch |
| **2** | Basic Info | Name, email form |
| **3** | Social Proof | Instagram/TikTok link |
| **4** | AI Interview | 5-question conversational interview (text or voice) |
| **5** | Success | Confirmation + waitlist position |

#### Tasks

| Task | Details | Files | Est. Time |
|------|---------|-------|-----------|
| Waitlist page shell | Main page component | `/app/src/app/waitlist/page.tsx` | 45 min |
| StepIndicator | Visual progress bar | `/app/src/components/waitlist/StepIndicator.tsx` | 1 hour |
| WaitlistLayout | Layout with Leopoldo avatar | `/app/src/components/waitlist/WaitlistLayout.tsx` | 1.5 hours |
| **Step 1 Welcome** | | | |
| Step1Welcome component | Greeting from Leopoldo | `/app/src/components/waitlist/Step1Welcome.tsx` | 1 hour |
| **Step 2 Basic Info** | | | |
| Step2BasicInfo form | Name, email inputs | `/app/src/components/waitlist/Step2BasicInfo.tsx` | 1.5 hours |
| Zod validation | Schema for name/email | `/app/src/lib/validation/waitlist.ts` | 30 min |
| **Step 3 Social Links** | | | |
| Step3SocialProof form | Instagram/TikTok URL inputs | `/app/src/components/waitlist/Step3SocialProof.tsx` | 1.5 hours |
| URL validation | Validate social media links | Validation file | 30 min |
| **Step 4 AI Interview** | | | |
| Step4Interview component | Main interview UI with text/voice toggle | `/app/src/components/waitlist/Step4Interview.tsx` | 3 hours |
| Interview questions config | 5 questions array | `/app/src/lib/waitlist/interview-questions.ts` | 45 min |
| Text interview API (MiMo) | OpenRouter integration for text responses | `/app/src/app/api/waitlist/interview/route.ts` | 1.5 hours |
| Voice interview API (Deepgram) | Voice-to-voice full pipeline | `/app/src/app/api/waitlist/voice-interview/route.ts` | 2 hours |
| Text/voice toggle UI | Switch between modes in interview | Step4Interview component | 45 min |
| **Step 5 Success** | | | |
| Step5Success component | Confirmation page | `/app/src/components/waitlist/Step5Success.tsx` | 1 hour |
| Waitlist position | Calculate and display position | Database query | 30 min |
| Share/referral buttons | Invite friends feature | Step5Success component | 45 min |
| **Integration** | | | |
| useWaitlistForm hook | Form state management | `/app/src/hooks/useWaitlistForm.ts` | 1.5 hours |
| Waitlist API route | Save to database | `/app/src/app/api/waitlist/route.ts` | 1.5 hours |
| Waitlist DB operations | Enhanced with interview data | `/src/db/waitlist.ts` | 45 min |
| Drizzle schema update | Add fields to waitlist table | `/src/db/schema.ts` | 30 min |
| Step transitions | Framer Motion animations | All step components | 1.5 hours |
| Mobile responsive design | Mobile-first responsive layout | All components | 1.5 hours |
| Email confirmation | Resend/SendGrid integration | `/app/src/app/api/waitlist/confirm/route.ts` | 1 hour |

**Total: 24-26 hours** | **Agent: Frontend + API + AI Specialist**

---

### Phase 3.5-3.6 Completion Summary (Feb 8, 2026)

#### What Was Completed Today
**UI Polish & Functionality Sprint**

✅ **X Button Fix on Placement Tabs**
- Repositioned from `-top-1 -right-1` to `-top-2 -right-2` 
- Fixed overflow clipping by removing `overflow-x-auto` that was coercing `overflow-y-visible` to `overflow-y: auto`
- Adjusted MerchFromStudio overflow boundaries for proper containment
- Result: Fully visible rounded X button in top-right corner of tabs

✅ **Session History & Notifications Icons Functional**
- Added click handlers to Clock and Bell icons in studio header
- Integrated `useHistory()` and `useNotifications()` hooks
- Icons now properly toggle slide-out panels

✅ **Global Rename: Design Studio → Merch Studio**
- Updated across 5 files:
  - NavigationMenu.tsx (menu label + comments)
  - StudioProgressBar.tsx (header display)
  - StudioChat.tsx (welcome message)
  - DesignProcessModal.tsx (button text + documentation)
  - StudioHeader.tsx (implicit context)

✅ **Legacy Code Cleanup**
- Removed ViewMode state management system entirely
- Deleted viewMode from StudioContext, session persistence, and all references
- Cleaned up MerchFromStudio useEffect hooks
- Removed color swatches from product header, reduced line height with `leading-tight`

✅ **Build Verification**
- TypeScript strict mode: PASSED
- Next.js compilation: PASSED
- All 15 static pages generated successfully

#### Remaining Phase 3.5-3.6 Tasks (Estimated ~15%)
- Inline product cards in chat
- Catalog lightbox system with filters
- Waitlist landing page AI interview component (Step 4 API integration)
- Product detail lightbox with size/color selectors
- Email confirmation system (Resend integration)
- Mobile responsive refinements

#### Next Phase: Ready to Begin
**Phase 4 Backend Core** can begin immediately after these remaining UI components are completed.

---

### Phase 3.5-3.6 Completion Summary (Feb 13, 2026)

#### What Was Completed Today
**Visitor Chat + Mainpage Polish Sprint**

✅ **Visitor Floating Chat Component**
- Created `VisitorFloatingChat.tsx` with collapsible UI for mainpage
- Text and voice chat modes with Minimax integration
- 20 Antônia Cloudinary avatar expressions
- Context-aware expressions based on sentiment detection
- Silver orb design with subtle pulsing glow animation

✅ **Expression Context System**
- Created `AvatarExpressionContext.tsx` for state management
- Speaking animation: cycles between `speaking_a` and `speaking_b` every 500ms
- Idle animation: cycles between `neutral`, `thinking`, `mouth_closed` after 5s inactivity
- Sentiment detection with Portuguese keywords for expression mapping

✅ **Cloudinary Integration**
- Updated cloudinary.ts with correct cloud name (`drhfgth7c`)
- Added `_attr1_subject` suffix for proper avatar paths
- 20 expressions per character available

✅ **Mainpage Logo Update**
- Changed navbar logo from short.png to full.png
- Copied full logo from Assets/Logo to mainpage/public/logo

✅ **Orb Design Iterations**
- Started with gold/amber accent → too strong
- Switched to violet (#8B5CF6) → still too different
- Settled on subtle silver/zinc theme (#a1a1aa)
- Final design: 80px dark orb with subtle white radial pulse from center

✅ **Build Verification**
- Next.js build: PASSED
- TypeScript: PASSED

---

### Phase 3.5-3.6 Completion Summary (Feb 19, 2026)

#### What Was Completed Today
**Waitlist UI Implementation (WAVE2_1) + App Audio Input System (WAVE2_4)**

✅ **Waitlist 5-Step Flow Components Created:**
- `Step1Welcome.tsx` - Welcome screen with CTA and trust badges
- `Step2BasicInfo.tsx` - Form with name, email, artist name (with Zod validation)
- `Step3SocialProof.tsx` - Instagram/TikTok links and follower range selector
- `Step5Success.tsx` - Success screen with position display and share buttons
- `StepIndicator.tsx` - Progress bar with animated step circles
- `WaitlistLayout.tsx` - Layout wrapper with Leopoldo avatar

✅ **State Management:**
- `useWaitlistForm.ts` hook - 5-step form state management
- Updated with `interviewResponses` field for Step 4 integration

✅ **Validation:**
- `basicInfoSchema` - Name/email validation
- `socialProofSchema` - URL validation for social links

✅ **App Audio Input System (Voice Conversation Pipeline):**
- `useAudioRecording.ts` hook - MediaRecorder API with base64 export
- `MiniMaxOrb.tsx` - Animated orb visualization with status-aware colors
- `RecordingButton.tsx` - Recording button with pulsing ring animations
- `minimax-speech.ts` - MiniMax STT/TTS client for voice pipeline
- `/api/chat/voice/route.ts` - Voice chat API (Clerk auth → STT → MiniMax LLM → TTS)
- Updated `AudioConversationLightbox.tsx` - Real voice pipeline replacing mock setTimeout logic, with transcript bubbles
- Updated `ChatInput.tsx` - Added voice conversation button (AudioWaveform icon) opening lightbox

✅ **Voice Pipeline Architecture:**
```
User Audio → useAudioRecording (MediaRecorder)
           → /api/chat/voice (Clerk auth)
           → MiniMax STT (speech-to-text)
           → MiniMax M2.1 (LLM with agent personality)
           → MiniMax TTS (text-to-speech)
           → Audio playback in lightbox
```

✅ **Build Verification:**
- Next.js build: PASSED
- TypeScript: PASSED
- ESLint: PASSED (no new errors)

#### What Remains for Phase 3.6
- Step 4 Interview component (already exists, needs API integration)
- API routes for waitlist submission
- Email confirmation
- Database persistence

#### Ready for Next Phase
**Phase 4 Backend Core** can begin after waitlist API integration is complete.

---

### Phase 3.7: Context-Aware Agent Routing (NEW)

#### Overview
Implemented intelligent agent routing using MiniMax M2-Her to replace brittle keyword-based routing. The system analyzes conversation context and user intent to route to the appropriate agent.

#### What Was Implemented

| Component | Description | Files |
|-----------|-------------|-------|
| **Agent Knowledge Base** | Condensed routing knowledge for each agent (Leopoldo, Francisca, Antonia) | `agentKnowledgeBase.ts` |
| **Router Provider** | Dedicated M2-Her provider with 950ms timeout | `routerProvider.ts` |
| **Context Router** | LLM-based routing with explicit intent detection | `contextRouter.ts` |
| **Routing API** | POST /api/chat/route endpoint | `route/route.ts` |
| **Clarification UI** | Inline message for ambiguous intents | `ClarificationMessage.tsx` |
| **Provider Integration** | Updated CatChatProvider with async routing | `CatChatProvider.tsx` |

#### Key Features

- **Explicit Intent Priority**: "I want to track my order" → Antonia (regardless of conversation history)
- **Multi-Intent Detection**: "Design shirt and track order" → asks which to address first
- **Confidence Threshold**: 70% confidence required for automatic handoff
- **Feature Flag**: `ENABLE_LLM_ROUTING=true` in `.env.local`
- **Logging**: All routing decisions logged for improvement

#### Routing Logic

```
1. Path Context → Direct route based on URL (/waitlist → Leopoldo, /support → Antonia)
2. Button Trigger → Direct route based on UI action
3. LLM Analysis → Use M2-Her to analyze:
   - Current message intent
   - Conversation history (last 5 messages)
   - Agent knowledge base
   - Explicit vs implicit intent
```

#### Agent Expertise

| Agent | Primary Domains |
|-------|----------------|
| **Leopoldo** | Onboarding, pricing, business strategy, waitlist, bulk orders |
| **Francisca** | Design, artwork, catalog, print quality, mockups |
| **Antônia** | Order tracking, shipping, returns, support, issues |

#### Files Created/Modified

```
app/src/lib/ai/agentKnowledgeBase.ts       (NEW)
app/src/lib/ai/routerProvider.ts           (NEW)
app/src/lib/ai/contextRouter.ts             (NEW)
app/src/app/api/chat/route/route.ts        (NEW)
app/src/components/chat/ClarificationMessage.tsx (NEW)
app/src/components/chat/CatChatProvider.tsx (MODIFIED)
app/src/components/chat/CatChat.tsx        (MODIFIED)
app/src/lib/chat/agentRouter.ts            (MODIFIED)
app/src/types/chat.ts                      (MODIFIED)
```

#### Status: ✅ COMPLETE (Feb 20, 2026)

---

### Phase 3.8: Product Catalog Database (Feb 20, 2026)

#### Overview
Built comprehensive product catalog database system as single source of truth for AI agents, frontend, and orders.

#### What Was Implemented

| Component | Description | Files |
|-----------|-------------|-------|
| **Catalog Schema** | 11 new tables for product catalog | `src/db/schema.ts` |
| **Database Migration** | Tables + seed data applied | `drizzle/0006_catalog_schema.sql` |
| **Operations Layer** | Full CRUD + AI-optimized queries | `src/db/catalog.ts` |
| **UNIQUE Constraints** | Data integrity fixes | `drizzle/0007_unique_constraints.sql` |
| **Performance Indexes** | 5 new indexes for query optimization | `drizzle/0008_performance_indexes.sql` |

#### Schema Tables Created

| Table | Purpose |
|-------|---------|
| `categories` | Product categories (T-Shirts, Hoodies, etc.) |
| `category_attributes` | Dynamic attributes per category |
| `colors` | Standardized color palette |
| `sizes` | Category-specific sizes_products` | Main products with pricing |
| `product_v |
| `catalogariants` | Size/color combinations |
| `inventory` | Stock tracking per variant |
| `product_images` | Cloudinary URLs |
| `pricing_history` | Audit trail |
| `pricing_schedules` | Future price changes |
| `product_batches` | Internal profit tracking |

#### Key Functions Added

| Function | Purpose |
|----------|---------|
| `getProductPricing(sku)` | AI-optimized pricing query (single join query) |
| `getFullProductById(id)` | Full product with variants (Drizzle `.with()`) |
| `reserveInventory()` | Atomic inventory reservation (race-condition safe) |
| `releaseInventory()` | Atomic release back to available |
| `confirmReservation()` | Move reserved to sold (order fulfillment) |
| `searchProducts(query, page, filters)` | Full-text search + pagination |
| `getLowStockVariants(threshold)` | Reorder alerts |

#### Race Condition Fix
- **Before:** Read-modify-write pattern (vulnerable to concurrent updates)
- **After:** Atomic `UPDATE...WHERE quantity_available >= qty` (database-level guarantee)

#### Query Optimization
- **Before:** N+1 queries (5-7 queries per product)
- **After:** Single query with Drizzle relational joins

#### Status: ✅ COMPLETE (Feb 20, 2026)

---

### Overview
Build the REAL application foundation using Neon PostgreSQL + Clerk authentication + Drizzle ORM.

### Timeline
**Weeks: 2 weeks (Feb 12-26, 2026)**

### Key Tasks
- User CRUD operations (create user, get by ID, update, delete)
- Product operations (create, list, update, delete)
- Store operations (create artist stores, list products)
- Order operations (create, update status, fulfillment)
- Clerk webhook for user sync
- Waitlist API with database persistence
- Email system (Resend/SendGrid)
- Rate limiting (Upstash Redis)
- **Error tracking setup (Sentry) - integrated**
- **API monitoring - integrated**
- ~~Admin dashboard (user management, analytics)~~ **REPLACED BY TUI** - See MerchStation TUI Plan
- **MerchStation TUI** - Terminal-based admin control center (built in parallel)
  - Production pipeline for floor manager
  - Waitlist approval workflow
  - User management (ban, roles)
  - Real-time order tracking
  - Leopoldo AI assistant
- Customer support system (tickets, FAQ, knowledge base)

### Success Criteria
- ✅ All CRUD operations tested
- ✅ Auth flows working (Clerk + Drizzle)
- ✅ Waitlist persists to database
- ✅ Email confirmations sending
- ✅ Rate limiting prevents abuse
- ✅ Error tracking captures exceptions (Sentry)
- ✅ ~~Admin dashboard functional~~ **REPLACED** - MerchStation TUI functional with production pipeline
- ✅ Production floor setup with real-time order tracking

---

## Phase 5: AI Integration

### Overview
Connect real AI models (Mistral Large, SDXL, Mistral Voxtral, OpenCV) to the platform. Full EU-sovereign AI stack.

### Timeline
**Weeks: 2 weeks (Feb 26 - Mar 12, 2026)**

### Key Tasks
- Mistral Large integration for chat (replaces MiniMax M2-her)
- Mistral Voxtral Transcribe 2 for STT (replaces Deepgram)
- ElevenLabs TTS for voice synthesis (replaces MiniMax TTS) — 33M-min startup grant
- Voice cloning: record 30s samples per Cat-Suite character (ElevenLabs zero-shot cloning)
- Real-time conversation mode ("Talk" button in CatChat)
- SDXL + Custom LoRAs setup for image generation (replaces Flux)
- OpenCV for color separation + halftoning
- AI routing logic (determine which agent/model)
- Chat API with streaming responses
- **AI response caching (Upstash Redis) - integrated**
- Conversation logging for dataset

### Voice Pipeline Architecture
```
User Audio → Mistral Voxtral Transcribe 2 (STT, sub-200ms)
          → Mistral Large (LLM + agent personality)
          → ElevenLabs TTS (character voice, ~200-400ms)
          → User Speakers
```

### CatChat UI: Two Voice Modes
| Mode | Button | Behavior |
|------|--------|----------|
| **Speak-to-Text** | 🎤 (existing) | Hold to speak, release, get transcript + text/audio reply. One-shot. |
| **Talk** | 🗣️ (NEW) | Click to start continuous conversation. Agent speaks back in character voice. Click again or say "stop" to end. |

### Success Criteria
- ✅ Chat works with real AI (Mistral Large)
- ✅ Voice transcription via Voxtral Transcribe 2
- ✅ Voice synthesis via ElevenLabs TTS with character voices
- ✅ Real-time conversation mode working (Talk button)
- ✅ Voice cloning samples recorded for all 3 characters
- ✅ Image generation via SDXL + LoRAs
- ✅ Color separation + halftoning working
- ✅ Conversations logged
- ✅ Response quality acceptable
- ✅ AI response caching reduces API costs

---

## Phase 5.5: Mockup Generation System

### Overview
Build production-ready mockup generation service based on CTDave001's `automated_mockups` foundation, extended with Merch From's unique requirements. Creates realistic product visualizations with halftone patterns, fabric textures, and authentic screen print aesthetics.

**Why 5.5?** This phase bridges AI Integration (Phase 5) and Commerce (Phase 6) because realistic mockups are required for:
- Product catalog display
- Artist design approval workflow
- Customer purchase decisions
- Order confirmation visuals

### Timeline
**Weeks: 2 weeks (Mar 12 - Mar 26, 2026)**
**Status: 83% COMPLETE (Feb 23, 2026)**

### Key Tasks
- ✅ Python microservice scaffold (FastAPI)
- ✅ Stanley Stella template processing (127 products, 3,344 images)
- ⏳ Fabric texture library (pending texture pack purchase - $5 Gumroad)
- ✅ Halftone processing engine (300 DPI + 72 DPI dual output)
- ✅ Compositing engine with realistic effects
- ✅ Cloudinary integration for CDN storage
- ✅ Node.js backend integration (TypeScript client + Next.js API routes)
- ✅ Docker deployment setup

### Product Coverage (Stanley Stella)
| Category | Products | Status |
|----------|----------|--------|
| **T-Shirts** | Creator, Changer, Painted, Imaginer, etc. | P0 - Core |
| **Hoodies** | Connector, Cultor, Drummer, Buddy | P0 - Core |
| **Sweatshirts** | Changer, Roller, Radder | P0 - Core |
| **Tote Bags** | Tote Bag, Shopping Bag | P1 - Extended |
| **Beanies** | Rocker, Hugger, Finisher | P1 - Extended |
| **Posters** | Wall Art | P2 - Future |

### Technical Architecture
```
Node.js Backend → Python Microservice (FastAPI) → Cloudinary Storage
                     ↓
              ┌──────────────────┐
              │ Processing Stack │
              │ • Pillow (PIL)   │
              │ • NumPy          │
              │ • OpenCV         │
              │ • scikit-image   │
              └──────────────────┘
                     ↓
         Halftone → Template → Composite → Effects → Export
```

### API Endpoints
- `POST /generate` - Single mockup generation (design URL → mockup URLs)
- `POST /generate-batch` - Batch processing (50 mockups in < 30s)
- `GET /templates` - List available products and views
- `GET /health` - Service health check

### Success Criteria
- ✅ Generate single mockup in < 3 seconds
- ✅ Batch process 50 mockups in < 30 seconds
- ✅ Halftone dots visible at 100% zoom
- ✅ Dual output: 300 DPI (print) + 72 DPI (web)
- ✅ All Stanley Stella P0 products supported
- ✅ Visual quality matches studio photos
- ✅ Docker containerized and deployable

### Implementation Plan
See detailed plan: `/Documentation/02-Roadmap/IMPLEMENTATION-PLAN-Mockup-Generation.md`

### Dependencies
- Stanley Stella studio mockup packshots (provided by user) ✅
- CTDave001 automated_mockups codebase (reference) ✅
- Cloudinary account for image storage
- Python 3.11+ environment

### Integration Points
- **Phase 5:** Uses halftoned designs from AI image generation
- **Phase 6:** Provides mockups for product catalog and checkout
- **Phase 7:** Mockups used in artist dashboard and customer orders

---

## Phase 5.6: Spot Color Separation System

### Overview
Build spot color separation system for screen printing production. Takes RGB design images, clusters colors using K-means, maps to Pantone using CIEDE2000 Delta E, filters based on garment color, creates separation layers, applies halftone processing, and outputs Magna HB ink recipes.

**Why 5.6?** This system bridges mockups (Phase 5.5) and production - users see mockups, but print-ready files with separation layers are stored for the production team via MerchStation TUI.

### Timeline
**Status: COMPLETE (Feb 24, 2026)**

### Key Tasks
- ✅ Pantone database (130+ colors with RGB values)
- ✅ K-means color clustering for dominant color extraction
- ✅ CIEDE2000 Delta E color matching algorithm
- ✅ Garment color filtering (smart dark-on-dark, light-on-light)
- ✅ Layer separation masks for spot color printing
- ✅ Halftone processing per layer (integrated from mockup-generator)
- ✅ FastAPI endpoints for color separation pipeline
- ✅ Next.js integration (TypeScript client, API proxy, UI components)
- ✅ Port 8001 (isolated from mockup service on 8000)

### Technical Architecture
```
Design Upload → Color Clustering → Pantone Mapping → Garment Filter
       ↓              ↓                ↓              ↓
   K-means      CIEDE2000      Delta E      Similarity
       ↓              ↓                ↓              ↓
   Layers ← Separation Masks ← Ink Recipes ← Magna HB
       ↓
  Halftone Processing
       ↓
  Print-Ready Files (for MerchStation TUI)
```

### API Endpoints
- `POST /api/v1/separate` - Full color separation pipeline
- `POST /api/v1/cluster` - Extract dominant colors
- `GET /api/v1/pantone` - List all Pantone colors
- `POST /api/v1/map-color` - Map RGB/hex to Pantone
- `GET /health` - Service health check

### Integration Points
- **User Flow:** User sees mockup only - print files stored for production
- **MerchStation TUI:** Production team accesses separation layers + ink recipes
- **Mockup Generator:** Halftone processing shared between services

### Success Criteria
- ✅ Extract up to 8 colors from design
- ✅ Map colors to Pantone with Delta E < 5 (good match)
- ✅ Filter colors similar to garment color
- ✅ Generate separation layer masks
- ✅ Apply halftone to each layer
- ✅ Return Magna HB ink recipes
- ✅ Isolated service on port 8001

---

## Phase 6: Commerce

### Overview
Enable real payments, order creation, artist payouts, and shipping calculation. Build complete commerce flow from cart to order fulfillment.

### Timeline
**Weeks: 3 weeks (Feb 24 - Mar 16, 2026)**

### Key Technical Decisions
- **Stripe Connect**: Express accounts (split payments, Apple Pay, Google Pay)
- **Email**: Resend for transactional emails
- **Shipping**: CTT Portugal API (real-time rates), extensible for future couriers

### Key Tasks
- ✅ Stripe webhook handler (existing)
- ✅ Cart system (Zustand + localStorage)
- ✅ Checkout flow (Stripe Checkout)
- ✅ Order management API
- ✅ Artist dashboard (orders, payouts)
- ✅ Stripe Connect onboarding (Express)
- ✅ Email notifications (Resend)
- ✅ Inventory tracking + CTT shipping

### Completed This Week
- ✅ Auth middleware protection for /api/orders, /stripe-connect, /shipping
- ✅ Server-side auth guards on financial operations
- ✅ Stripe webhook handlers (payment_failed, charge.refunded)
- ✅ eShop analytics with real order data

### Success Criteria
- ✅ Auth middleware protects all financial routes
- ✅ Webhook handlers for payment failures and refunds
- ✅ eShop analytics shows real order data
- ⬜ Test purchases working (Stripe test mode)
- ⬜ Orders saved to database
- ⬜ Split payments working (base cost → Merch From, margin → artist)
- ⬜ Apple Pay / Google Pay working
- ⬜ Artist dashboard shows orders
- ⬜ Confirmation emails sending
- ⬜ Shipping rates calculated (CTT)
- ⬜ End-to-end purchase flow complete

### Technical Architecture
```
User → Shop → Cart → Checkout → Stripe → Webhook → Order → Email
                                    ↓
                              Stripe Connect (Express)
                                    ↓
                        Split: Base Cost → Merch From
                               Profit → Artist
```

---

## Phase 7: Beta Launch

### Overview
Launch with 10-100 artists, gather data, train models, iterate on feedback.

### Timeline
**Months: 9 months (Apr 2026 - Dec 2026)**

### Cohorts
| Cohort | Artists | Timeline | Goal |
|--------|---------|----------|------|
| Cohort 1 | 10 | Months 1-3 | Proof of concept, product-market fit signals |
| Cohort 2 | 40+ | Months 4-6 | Scaling validation, model improvements |
| Cohort 3 | 100+ | Months 7-9 | Production readiness, launch prep |

### Pre-Beta Security Audit

Before onboarding any external artists, run a comprehensive security audit using Shannon (autonomous AI pentester) to identify and fix vulnerabilities.

| Task | Details | Est. Time |
|------|---------|-----------|
| Run Shannon AI Pentest | White-box pentest against staging environment (auth, payments, API routes, AI endpoints) | 2 hours (1-1.5h automated + setup) |
| Review Shannon report | Validate findings, triage severity, assign fixes to backlog | 3-4 hours |
| Fix critical/high findings | Address all Critical and High severity vulnerabilities before Beta | Variable |
| Re-run Shannon (regression test) | Verify fixes, confirm no new issues introduced | 2 hours |

**Tool:** [Shannon](https://github.com/KeygraphHQ/shannon) - Autonomous AI pentester with 96.15% success rate on OWASP benchmarks
**Cost:** ~$50/run (Claude Sonnet model), ~$100 total for two runs
**Scope:** Auth flows (Clerk), payment webhooks (Stripe), API routes, AI chat endpoints, admin TUI
**Prerequisite:** Staging environment with all Phase 4-6 features deployed and populated with test data
**Note:** Run on staging ONLY. Never run against production.

### Success Criteria
- ✅ 100+ artists actively using platform
- ✅ 90%+ designs production-ready (minimal human intervention)
- ✅ >2.5/3 average customer satisfaction rating
- ✅ 10,000+ conversation examples collected
- ✅ U-Net model 95%+ accuracy

---

## Phase 8: Public Launch

### Overview
Remove beta restrictions, launch publicly, achieve profitability.

### Timeline
**Month: 1 month (Jan 2027)**

### Key Tasks
- Final testing and bug fixes
- Marketing campaign launch
- Support team training
- Artist onboarding scale
- Performance monitoring

### Success Criteria
- ✅ 100+ active artists
- ✅ €10,000+ monthly revenue
- ✅ <5% defect rate
- ✅ >85% artist satisfaction

---

## Phase 9: Social Commerce Hub

### Overview
Enable artists to syndicate their MerchFrom catalog to Discord, Meta, TikTok, Twitch.

### Timeline
**Weeks: 17 weeks (Jan-May 2027)**

### Integrations
| Platform | Timeline | Goal |
|----------|----------|------|
| Discord | Weeks 1-3 | Bot with slash commands, embedded storefront |
| Meta | Weeks 4-6 | Business Manager OAuth, catalog sync |
| TikTok Shop | Weeks 7-9 | Products API, order sync |
| Twitch | Weeks 10-11 | Panel + overlay extensions |
| Dashboard | Weeks 12-13 | "Connect Channels" UX |
| Order Aggregation | Weeks 14-17 | Unified order ingestion |

### Success Criteria
- ✅ Artists can sync to all platforms with one click
- ✅ Inventory stays in sync across platforms
- ✅ Orders aggregate to single dashboard
- ✅ Fulfillment updates propagate to all channels

---

## Phase 10: Accessories Expansion (Year 2)

### Overview
Expand Merch From from garments into **3D-printed jewelry accessories** — pendants, rings, bracelets, and more. Artists design accessories through Cat-Suite AI (Francisca guides design, Leopoldo handles pricing, Antonia tracks production). 3D models generated via Meshy API, post-processed to production-ready STL, then manufactured via cast-resin-to-metal at the Portugal facility.

**Strategic Goal:** Working 3D accessory design flow in-app for **crowdfunding launch** — demonstrates platform extensibility and premium product range to investors.

### Timeline
| Period | Milestone | Goal |
|--------|-----------|------|
| **Now → Dec 2026** | Research & Architecture | Pipeline design, Meshy API integration, 3D viewer prototype |
| **Jan 2027** | 3D Viewer Proof of Concept | Three.js viewer in app, Meshy API connected, basic design flow |
| **Feb-Apr 2027** | Full Accessories UI | Cat-Suite guided design, material selection, preview + approve |
| **May-Jul 2027** | Pilot Launch | 5-10 artists, simple pieces, data collection starts |
| **Aug-Dec 2027** | Iteration & Data | Progressive complexity, synthetic dataset generation |
| **Jan-Jun 2028** | Model Fine-Tuning | Train proprietary model on collected data (Hunyuan3D-2 or TRELLIS) |
| **Jul 2028+** | Full Public Launch | Complex designs, automated pipeline, all artists |

### Pre-Crowdfunding Deliverable (Priority)
**Must-have for crowdfunding/investor showcase:**
- 3D accessory viewer embedded in app (Three.js / React Three Fiber)
- Meshy API integration generating 3D models from text/image input
- Cat-Suite conversation flow: "Design me a pendant" → 3D preview → approve
- Material/finish selector (brass, silver, gold-plated)
- Working end-to-end demo (design → preview → "order" button)

### Tech Stack (Accessories)
| Component | Technology | Notes |
|-----------|-----------|-------|
| **3D Generation** | Meshy API (SaaS) | Text/image → 3D mesh, STL export |
| **Post-Processing** | Python microservice (port 8002) | Mesh repair, wall thickness, castability checks |
| **3D Viewer** | Three.js / React Three Fiber | In-app interactive preview |
| **File Formats** | STL (print), GLB (web preview), 3MF (production) | |
| **Future Fine-Tuning** | Hunyuan3D-2 or TRELLIS | LoRA on proprietary jewelry dataset |

### Equipment (Portugal Facility — €10-25K Budget)
| Category | Equipment | Est. Cost |
|----------|-----------|-----------|
| **Printer** | Formlabs Form 4 + Wash+Cure | €5,500 |
| **Casting** | Neycraft vacuum caster + burnout oven | €3,500 |
| **Finishing** | Flex shaft, tumbler, electroplating kit | €1,500 |
| **Supplies** | Castable resin + casting grain (silver/brass) | €1,500 |
| **Total** | | **€12,000** |

### Pilot Program (5-10 Artists)
| Phase | Artists | Complexity | Data Goal |
|-------|---------|------------|-----------|
| **Pilot A** (Months 1-3) | 5 | Simple: signet rings, plain bands, basic pendants | 50-100 designs |
| **Pilot B** (Months 4-6) | 8 | Medium: engraved, textured, multi-element | 150-300 designs |
| **Pilot C** (Months 7-12) | 10+ | Complex: filigree, articulated, stone settings | 500+ designs |

### Synthetic Data Pipeline (Future Phase)
- Curate 500-1,000 reference jewelry designs (commercially licensed)
- Generate variations via Meshy, run through post-processing pipeline
- Score each output (castability, print success, customer approval)
- Create paired dataset: (reference image + text) → (production-ready STL)
- Fine-tune TRELLIS or Hunyuan3D-2 using LoRA on domain-specific data
- **Est. cost:** €2-5K dataset licensing + €500-1K compute

### Success Criteria
- ✅ 3D viewer working in app (interactive, mobile-responsive)
- ✅ Meshy API generating 3D models from text/image input
- ✅ Post-processing pipeline producing print-ready STL files
- ✅ Cat-Suite guided design flow functional end-to-end
- ✅ Crowdfunding demo working (design → preview → order)
- ✅ Pilot: 5 artists producing accessories, data collection active
- ✅ Fine-tuned model outperforming generic Meshy output (Year 2 end)

### Detailed Plan
See: [`/Documentation/02-Roadmap/Accessories-Expansion.md`](./Accessories-Expansion.md)

---

## Deferred Features

The following are explicitly **out of scope** for the MVP but architected to be added later:

| Feature | Phase | Notes |
|---------|-------|-------|
| Voice Input (Whisper) | Post-Launch | UI placeholder exists. Add real Whisper integration later. |
| Merch Coins System | Month 7+ | Database schema can be added; full feature is post-PMF. |
| Production Automation | Post-Investment | Manual production workflow for MVP. |
| Artist Payouts (Stripe Connect) | Phase 6+ | Manual bank transfers for MVP; automate later. |
| Automated EDI Ordering | Post-MVP | Manual ordering for MVP. |
| Influencer Onboarding | Phase 8+ | Dedicated onboarding for creators with large followings. |

---

## Agent Assignments Summary

For detailed breakdowns, see the Agent Assignment documents in `/Documentation/02-Roadmap/Agent-Assignments/`.

| Agent | Role | Primary Phase Tasks | Est. Hours |
|-------|------|---------------------|------------|
| **Agent 1** | Database Specialist | 3.5.0, 4.1, 4.2, Phase 4 database ops | 40-50 |
| **Agent 2** | API Specialist | 3.5.1, 3.6 (APIs), 4.2, 5.1, Phase 4 APIs | 45-55 |
| **Agent 3** | Frontend Specialist | 3.5.1-7, 3.6 (UI), 4.3, Phase 6 dashboards | 60-75 |
| **Agent 4** | Full-Stack Specialist | 3.6 (integration), Phase 4-6 integration | 30-40 |
| **Agent 5** | AI Specialist | 3.5.1 (voice), 3.6 (interview), Phase 5 AI | 15-20 |
| **Agent 6** | Operations Specialist | Documentation, processes, hiring | 8-12 |

---

## Success Criteria

### Phase 3.5-3.6 (Current)
- ✅ Microphone button records and transcribes speech
- ✅ Inline product, mockup, design cards render in chat
- ✅ Catalog lightbox opens with category filters
- ✅ Product detail view shows all specs
- ✅ Waitlist form collects basic info
- ✅ AI interview works (text or voice)
- ✅ Waitlist position displayed
- ✅ All components mobile responsive
- ✅ Context-aware agent routing with M2-Her

### MVP Success (End of Phase 6)
- ✅ All database operations working
- ✅ Authentication flow (Clerk) complete
- ✅ Real AI integration (MiMo, Flux)
- ✅ Orders can be created and fulfilled
- ✅ Artist dashboard functional
- ✅ Email confirmations sending
- ✅ Stripe test payments working
- ✅ ~~Admin dashboard operational~~ **REPLACED** - MerchStation TUI operational with production pipeline
- ✅ Support system ready

### Beta Success (End of Phase 7)
- ✅ Shannon pentest completed with 0 unresolved Critical/High findings
- ✅ 100+ artists actively using
- ✅ 90%+ designs production-ready
- ✅ >2.5/3 satisfaction rating
- ✅ 10,000+ training examples collected
- ✅ Model improvements validated

### Public Launch Success (End of Phase 8)
- ✅ 100+ active artists
- ✅ €10,000+ monthly revenue
- ✅ <5% defect rate
- ✅ >85% artist satisfaction
- ✅ Profitability achieved

---

## Verification Plan

### Phase 3.5-3.6 Verification
1. Test microphone button on all major browsers
2. Verify speech transcription accuracy
3. Confirm inline cards render correctly
4. Test catalog filters and view toggles
5. Verify lightbox animations smooth
6. Complete waitlist form flow (all 5 steps)
7. Test AI interview (both text and voice)
8. Check mobile responsiveness on real devices
9. Verify database persistence (check Neon)

### MVP Verification (End of Phase 6)
1. Create test artist account via Clerk
2. Add a product via artist dashboard
3. Browse as customer, add to cart
4. Complete checkout (Stripe test mode: 4242 4242 4242 4242)
5. Verify order in both customer and artist dashboards
6. Test AI chat with Leopoldo and Francisca
7. Generate design with Flux
8. Check order confirmation email

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16, React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4, HeroUI
- **Animation:** Framer Motion, GSAP
- **Package Manager:** Bun (for /app), npm (for /mainpage)

### Backend
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Authentication:** Clerk (passkeys, magic links)
- **Cache:** Upstash Redis
- **File Storage:** Cloudinary
- **Email:** Resend or SendGrid

### AI & Voice
- **LLM (Chat):** Mistral Large via Mistral API (EU-based, GDPR-native, open weights available)
- **STT (Speech-to-Text):** Mistral Voxtral Transcribe 2 ($0.003/min, sub-200ms, Apache 2.0)
- **TTS (Text-to-Speech):** ElevenLabs TTS (zero-shot voice cloning, ~90ms, Apache 2.0)
- **Real-Time Conversation:** Full Mistral voice pipeline -- continuous back-and-forth dialogue
- **Image Generation:** SDXL via Replicate + Custom LoRAs
- **Color Separation + Halftoning:** OpenCV (Python)

### Payments
- **Stripe:** Card payments, subscriptions, payouts

---

## Related Documents

- **PRD:** `/Documentation/01-PRD/PRD.md` - Product vision and features
- **Agent Assignments:** `/Documentation/02-Roadmap/Agent-Assignments/` - Detailed task breakdowns by agent
- **Evaluations:** `/Documentation/03-Evaluations/` - Progress evaluations and decisions
- **Archive:** `/Documentation/07-Archive/` - Previous versions for reference
- **MerchStation TUI Plan:** `/Documentation/04-TUI/MerchStation-Plan.md` - Admin terminal control center (replaces web admin dashboard)
- **Campaign Management MCP:** `/Documentation/04-TUI/Campaign-Management-MCP-Plan.md` - Meta/TikTok Ads integration with auto-pause

---

## Roadmap Maintenance

**This document is the single source of truth for the MerchFrom roadmap.**

- Update status weekly during standup meetings
- Add new phases/tasks to Agent Assignments folder as they emerge
- Link to this document from all project management tools
- Archive old roadmap versions in `/Documentation/07-Archive/Roadmap-Archive/`

---

**Roadmap Owner:** Victor Bendas  
**Last Updated:** May 4, 2026  
**Next Review:** Weekly during Phase 6 implementation

**Recent Changes:**
- 🆕 **May 4, 2026:** Added Phase 10: Accessories Expansion — 3D-printed jewelry (pendants, rings, bracelets) using Meshy API + Cat-Suite AI. Pre-crowdfunding 3D viewer prototype prioritized. Cast-resin-to-metal production at Portugal facility. Pilot program with 5-10 artists for data collection + future model fine-tuning.
- 🔄 **Feb 25, 2026:** STRATEGIC PIVOT - AI Stack: MiniMax → Mistral (full pipeline: LLM + STT + TTS). EU sovereignty, open weights, voice cloning, 50%+ cost reduction.
- 🔄 **Feb 25, 2026:** STRATEGIC PIVOT - Facility: Porto → Castelo Branco. 50% equipment grant, €0.01/m² industrial land, own facility instead of rent. De-risk crowdfunding pitch.
- 🔄 **Feb 25, 2026:** NEW FEATURE - Real-time voice conversation mode ("Talk" button). Continuous back-and-forth dialogue with Cat-Suite agents via Mistral Voxtral pipeline.
- ✅ **Feb 24, 2026:** T1 Schema Deduplication COMPLETE - mainpage now uses shared @db-root/* imports from /src/db, upgraded drizzle-orm to ^0.45.1
- ✅ **Feb 24, 2026:** Phase 6 Auth Fixes - Added middleware protection for /api/orders, /stripe-connect, /shipping routes, server-side auth guards
- ✅ **Feb 24, 2026:** Phase 6 Webhook Fixes - Added payment_intent.payment_failed and charge.refunded handlers
- ✅ **Feb 24, 2026:** eShop Analytics Fix - Replaced hardcoded €12,580 with real order data from API
- ✅ **Feb 24, 2026:** Evaluation #15 complete - Score improved to 8.9/10
- ✅ **Feb 24, 2026:** Phase 5.6 Color Separation System COMPLETE - Spot color separation Python service (K-means clustering, CIEDE2000 Delta E, Pantone mapping, garment filtering, layer separation, halftone). Next.js integration on port 8001. Users see mockups, print-ready files stored for MerchStation TUI production team.
- ✅ **Feb 23, 2026:** Phase 5.5 Mockup System 83% complete - Python microservice (halftone, compositing, templates), 127 products organized (3,344 images), TypeScript client, Next.js API routes, UI components. Waiting on fabric textures ($5 Gumroad pack).
- ✅ **Feb 21, 2026:** Added Phase 5.5: Mockup Generation System - Python microservice based on CTDave001's automated_mockups, extended with halftone integration, dual-resolution output, fabric textures, Stanley Stella catalog support. Bridges Phase 5 (AI) and Phase 6 (Commerce).
- ✅ **Feb 20, 2026:** Context-Aware Agent Routing complete - M2-Her based routing with knowledge base, explicit intent detection, multi-intent clarification, feature flag (ENABLE_LLM_ROUTING)
- ✅ **Feb 19, 2026:** App Audio Input System complete (WAVE2_4) - Full voice conversation pipeline with MiniMax STT/TTS, useAudioRecording hook, MiniMaxOrb, RecordingButton, /api/chat/voice route, ChatInput voice button
- ✅ **Feb 19, 2026:** Waitlist UI implementation complete (Steps 1-3, 5) - 5-step form flow with Framer Motion animations, Zod validation
- ✅ **Feb 19, 2026:** Added Campaign Management with MCP integration (Phase 4b) - Meta/TikTok Ads auto-pause on CAC/CPC limits, daily reports, Leopoldo AI alerts
- ✅ **Feb 13, 2026:** Added Visitor Floating Chat with Antônia for mainpage (text + voice modes, 20 Cloudinary avatars, context-aware expressions)
- ✅ **Feb 13, 2026:** Added Audio Conversation Lightbox with ElevenLabs components (Orb, LiveWaveform, ShimmeringText)
- ✅ **Feb 8, 2026:** Added Pre-Beta Security Audit task using Shannon AI pentester to Phase 7
- ✅ **Feb 4, 2026:** Internal admin web dashboard replaced by MerchStation TUI (see `/Documentation/04-TUI/MerchStation-Plan.md`)

**Current Focus (This Week):**
- 🚧 Phase 6 Commerce: Cart system, Checkout, Stripe Connect
- 🔄 T1: Cart System (Zustand + localStorage)
- 🔄 T2: Checkout Flow (Stripe Checkout)

---

## Phase 4b: Campaign Management (Post Phase 4 Core)

> **Added:** February 19, 2026

**Feature:** Automated ad campaign management via MCP servers in MerchStation TUI

| Aspect | Details |
|--------|---------|
| **Platforms** | Meta Ads, TikTok Ads |
| **Duration** | 3-4 days |
| **Start** | After Phase 4 core complete |
| **Docs** | [`/Documentation/04-TUI/Campaign-Management-MCP-Plan.md`](../04-TUI/Campaign-Management-MCP-Plan.md) |

**Key Requirements (User-Validated):**
- ✅ Pause immediately when CAC/CPC limits exceeded
- ✅ Different limits per campaign
- ✅ Daily report of paused campaigns in TUI
- ✅ TUI notifications (real-time + daily summary)
- ✅ Bidirectional sync (read + edit)
