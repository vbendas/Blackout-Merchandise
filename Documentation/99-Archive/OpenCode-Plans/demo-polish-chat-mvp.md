> Archived: the LoRA plan described here was retired on 2026-08-24 in favour of hosted reference-guided generation.

# Plan: Demo Polish — Chat MVP (Days 4-7)

> **Version**: 1.0  
> **Created**: May 13, 2026  
> **Scope**: P0 Demo Hardening — Chat polish, demo mode, mobile optimization  
> **Timeline**: Days 4-7 (May 12-15)  
> **Branch**: `feat/crowdfunding-demo`  
> **Precedes**: [LoRA Dataset Strategy](../Documentation/05-Shared/Image-Generation-Architecture.md) (Week 2+)

---

## Overview

### Goal
Polish the chat experience to demo-ready quality. Fix technical debt, add typing indicators, message animations, demo mode with scripted responses, and mobile optimization.

### Scope
- Fix 7 TypeScript test errors from stale mock data
- Build TypingIndicator component
- Add Framer Motion message animations
- Implement demo mode with 5 scripted conversations
- Wire actionExecutor to real LLM (replace static fallback)
- Mobile chat polish
- Voice prep and cleanup

### Out of Scope (Week 2+)
- fal.ai client wiring (Day 10)
- Sharp post-processing (Day 10)
- LoRA training dataset creation (Victor, Week 2)
- Kontext editing (Day 12)
- Storefront build (Days 15-17)
- Print-prepare TIFF generation (production)

### Acceptance Criteria
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `bun build` passes
- [ ] Chat shows typing indicator during LLM calls
- [ ] Messages animate in with spring physics
- [ ] Demo mode produces predictable scripted responses with `NEXT_PUBLIC_DEMO_MODE=true`
- [ ] LLM fallback never crashes the UI
- [ ] actionExecutor uses real LLM responses
- [ ] Mobile chat works on 375px viewport
- [ ] `.env.example` documents all required variables

---

## Task Breakdown

### T0 [SUBAGENT] [Group A] (S) — Fix Test Type Errors
**Priority: Immediate — blocks typecheck**

7 TypeScript errors in 3 test files, all from mock data not matching updated interfaces:

| File | Errors | Root Cause |
|------|--------|------------|
| `src/lib/ai/studioFlow.test.ts` | 2 | Mock StudioContext missing `editRound` and `designHistory` (added in Day 2 sprint) |
| `src/app/api/studio/session/route.test.ts` | 3 | `agent` property typed as `string` instead of union `"leopoldo" \| "francisca" \| "antonia"` |
| `src/app/api/upload/design-reference/route.test.ts` | 2 | Mock `UploadApiResponse` missing required Cloudinary properties |

**Subtasks:**
- T0.1: Add `editRound: 0` and `designHistory: []` to all mock StudioContext objects in `studioFlow.test.ts`
- T0.2: Cast agent strings with `as AgentId` or use `as const` in `studio/session/route.test.ts`
- T0.3: Add required UploadApiResponse properties (`version`, `signature`, `format`, `resource_type`, etc.) to mocks in `design-reference/route.test.ts`

**[VERIFY]** `bunx tsc --noEmit` passes with zero errors  
**Files**: `app/src/lib/ai/studioFlow.test.ts`, `app/src/app/api/studio/session/route.test.ts`, `app/src/app/api/upload/design-reference/route.test.ts`

---

### T1 [SUBAGENT] [Group A] (S) — Create `.env.example`

**Subtasks:**
- T1.1: Create `app/.env.example` with all required env vars documented:
  - `DATABASE_URL` — Neon PostgreSQL connection
  - `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `MISTRAL_API_KEY` — Mistral Large + Voxtral STT
  - `ELEVENLABS_API_KEY` — TTS voice synthesis
  - `DEEPGRAM_API_KEY` — Speech-to-text
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Rate limiting
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `FAL_API_KEY` — (Day 10) Image generation
- T1.2: Add comments for each var explaining purpose

**[VERIFY]** File exists with all vars documented  
**Files**: `app/.env.example` (new)

---

### T2 [SUBAGENT] [Group B] (M) — TypingIndicator Component

**Subtasks:**
- T2.1: Create `components/chat/TypingIndicator.tsx`
  - Shows "{Agent name} is thinking..." with animated dots (CSS animation)
  - Agent name comes from AGENT_CONFIGS (capitalize first letter)
  - Smooth fade-in/out transition
  - Uses avatar mini-icon from current agent
- T2.2: Add `isTyping` state to `CatChatProvider.tsx`
  - Set `true` before API call
  - Set `false` on response OR error (always reset)
  - Expose via context value
- T2.3: Integrate into `CatChat.tsx`
  - Render TypingIndicator between last message and input
  - Only show when `isTyping && !isLoading` (isLoading covers initial load)
  - Animate with Framer Motion `AnimatePresence`

**[ARCH]** Provider already has `isLoading` state — `isTyping` is separate because loading = "chat initializing", typing = "agent is generating a response"  
**[GOTCHA]** Must reset `isTyping` in error handler too, not just success handler  
**Files**: `app/src/components/chat/TypingIndicator.tsx` (new), `app/src/components/chat/CatChatProvider.tsx`, `app/src/components/chat/CatChat.tsx`

---

### T3 [SUBAGENT] [Group B] (M) — Message Animations

**Subtasks:**
- T3.1: Wrap each message bubble in `CatChat.tsx` with `motion.div`
  - User messages: slide in from right (`initial={{ x: 50, opacity: 0 }}`, `animate={{ x: 0, opacity: 1 }}`)
  - Agent messages: slide in from left (`initial={{ x: -50, opacity: 0 }}`)
  - Spring physics: `transition={{ type: "spring", stiffness: 300, damping: 24 }}`
- T3.2: Use `AnimatePresence` for enter/exit animations
- T3.3: Add relative timestamp to each message:
  - < 1 min: "just now"
  - < 60 min: "{X}m ago"
  - < 24h: "{X}h ago"
  - else: formatted date
- T3.4: Stagger animation for multiple messages appearing at once (e.g., on load)

**[DEP]** Framer Motion v12.23.26 already installed  
**[GOTCHA]** Don't animate messages that were already visible — only animate NEW messages. Track with a ref for "last rendered count"  
**Files**: `app/src/components/chat/CatChat.tsx`

---

### T4 [MAIN] [Group C] (M) — Demo Mode

**Subtasks:**
- T4.1: Add demo mode detection:
  ```typescript
  const isDemoMode = typeof window !== 'undefined' && 
    (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || 
     new URLSearchParams(window.location.search).has('demo'));
  ```
  - Can be enabled via env var OR `?demo` URL parameter (for video recording flexibility)
- T4.2: Create `lib/demo/demoScripts.ts` with 5 scripted conversations:
  1. **Onboarding** (Leopoldo, 3 messages): Welcome, explain Cat-Suite, ask what they need
  2. **Design Request** (Francisca, 4 messages): Acknowledge concept, show "designing...", present design card, ask for feedback
  3. **Design Refinement** (Francisca, 3 messages): Acknowledge feedback, show refined design, ask for approval
  4. **Store Preview** (Leopoldo, 2 messages): Show store setup status, confirm next steps
  5. **Voice Greeting** (any agent, 1 message): Short voice-friendly greeting
- T4.3: In `CatChatProvider.tsx`, intercept message sending when demo mode:
  - Match user input to closest script using keyword matching
  - Return scripted response with realistic delay (800ms-2s random)
  - Support "script progression" — advance through conversation steps
- T4.4: Add graceful LLM fallback for non-demo mode:
  - If API call fails: show error toast "Something went wrong. Tap to retry."
  - Never crash the UI — wrap all API calls in try/catch
  - Auto-retry once on network error (not on 4xx)

**[CRITICAL]** Demo mode must not break real mode — they share the same code path  
**[GOTCHA]** Use `URLSearchParams` check so video recording can add `?demo` to any URL without env restart  
**Files**: `app/src/lib/demo/demoScripts.ts` (new), `app/src/components/chat/CatChatProvider.tsx`

---

### T5 [SUBAGENT] [Group C] (S) — Wire actionExecutor LLM Call

**Subtasks:**
- T5.1: In `actionExecutor.ts`, replace the TODO at L82 with a real call:
  ```typescript
  // Instead of falling back to static response:
  const response = await fetch('/api/chat/unified', { ... });
  ```
- T5.2: Keep existing static responses as fallback if LLM call fails
- T5.3: Add timeout (5s) — if LLM doesn't respond, use static fallback

**Files**: `app/src/lib/ai/actionExecutor.ts`

---

### T6 [MAIN] [Group D] (M) — Mobile Chat Polish

**Subtasks:**
- T6.1: Test and fix chat at 375px width (iPhone 14):
  - Chat bubble max-width: 85% viewport
  - Input area not hidden by virtual keyboard
  - Message list scrollable without body scroll
  - Avatar and action buttons remain accessible
- T6.2: Add suggested reply chips below agent messages:
  - 2-3 contextual chips per agent response
  - Generated from `quickActions.ts` filtered by current agent
  - Horizontally scrollable, tap to send
  - Only show for most recent message
- T6.3: Add message actions:
  - Long-press (mobile) / hover (desktop) shows action bar
  - Actions: Copy text, Retry (regenerate response)
  - Fade in/out with Framer Motion
- T6.4: Auto-scroll to bottom:
  - On new message received
  - On message sent
  - Smooth scroll behavior
  - Don't auto-scroll if user has manually scrolled up (check if bottom is visible)

**Files**: `app/src/components/chat/CatChat.tsx`, `app/src/components/chat/ChatInput.tsx`, `app/src/components/chat/MessageActions.tsx` (new)

---

### T7 [MAIN] [Group E] (S) — Week 1 Review + Voice Prep

**Subtasks:**
- T7.1: Record 5-minute screen capture of current chat state
- T7.2: Document remaining bugs and polish items for Week 2
- T7.3: Deepgram vs Voxtral STT decision:
  - `useSpeechToText.ts` (Deepgram, 224 lines) — already wired, chunked processing
  - `use-deepgram.ts` (Deepgram, 186 lines) — alternative implementation
  - `api/chat/voice/process/route.ts` uses Voxtral (server-side)
  - **Decision needed**: Which client-side hook to keep? Remove the other.
- T7.4: Remove deprecated STT hook, update imports
- T7.5: Verify all voice pipeline works end-to-end (STT → LLM → TTS)

**[ARCH]** Two client-side Deepgram hooks exist because one was built before the other. Keep the one used by CatChatProvider (`useSpeechToText.ts`)  
**Files**: `app/src/hooks/use-deepgram.ts` (deprecate), any files importing it

---

## Parallelization Map

```
Group A (parallel, immediate):
  T0: Fix test type errors
  T1: Create .env.example

Group B (parallel, after Group A):
  T2: TypingIndicator component
  T3: Message animations

Group C (parallel, after Group B):
  T4: Demo mode with scripts
  T5: actionExecutor LLM wiring

Group D (after Group C):
  T6: Mobile chat polish

Group E (after Group D):
  T7: Week review + voice cleanup
```

## Assignment

| Task | Type | Rationale |
|------|------|-----------|
| T0 | SUBAGENT | Pure test fix, no architecture decisions |
| T1 | SUBAGENT | Documentation task |
| T2 | SUBAGENT | Independent component creation |
| T3 | SUBAGENT | Independent animation work |
| T4 | MAIN (Victor session) | Demo mode affects core provider logic |
| T5 | SUBAGENT | Small wiring task |
| T6 | MAIN (Victor session) | Mobile polish needs visual verification |
| T7 | MAIN (Victor session) | Review needs human judgment |

---

## Daily Schedule

| Day | Date | Tasks | Hours | Deliverable |
|-----|------|-------|-------|-------------|
| **Day 4** | May 12 (today) | T0, T1, T2, T3 | 6 | Tests fixed, typing indicator, animations |
| **Day 5** | May 13 | T4, T5 | 6 | Demo mode + scripts, actionExecutor LLM |
| **Day 6** | May 14 | T6 | 6 | Mobile polish, reply chips, message actions |
| **Day 7** | May 15 | T7 | 6 | Review, voice cleanup, week wrap-up |

---

## Current App State Reference

### Hard Blockers (throw errors)
| Location | Error | This Plan? |
|----------|-------|------------|
| `lib/ai/falClient.ts` | fal.ai not configured | No — Day 10 |
| `lib/image/postProcess.ts` | Sharp not installed | No — Day 10 |

### Soft TODOs (work but need enhancement)
| Location | Issue | This Plan? |
|----------|-------|------------|
| `actionExecutor.ts` L82 | Static fallback, no LLM | **Yes — T5** |
| `CatChat.tsx` L548 | Image upload just logs | No — Phase 5 |
| `api/support/handoff/route.ts` L70 | Duplicate tickets possible | No — post-MVP |
| `lib/logger.ts` | No Sentry/Datadog | No — production |

### Key Architecture Notes
1. **Two chat systems exist**: CatChatProvider (new, used in CatChat widget) and ChatContext (legacy, used in workspace). They share types but are separate state machines.
2. **Auth is demo-bypassed**: All chat API routes skip Clerk auth during crowdfunding sprint.
3. **Voice pipeline is functional**: Voxtral STT → Mistral LLM → ElevenLabs TTS fully wired.
4. **Two duplicate STT hooks**: `useSpeechToText.ts` and `use-deepgram.ts` — T7 cleans this up.
5. **49 API routes, 15 pages** — comprehensive backend already built.
6. **18 unit tests, 5 E2E specs** — 7 test type errors fixed in T0.

---

## Next Steps After This Plan

### Week 2 (May 16-22): Voice + Design Gen + Dataset Start
- Day 8: Deepgram STT integration (if needed) + buy Separation Studio NXT
- Day 10: fal.ai client + Sharp wiring
- Day 12: Kontext editing
- **Parallel Track B**: Victor begins training dataset creation (50 images/style × 6 styles)

### Week 3 (May 23-29): Storefront + Dataset Completion
- Days 15-17: Storefront, product grid, cart
- **Track B**: Victor completes Photoshop + separation on all 300 images

### Week 4 (May 30-June 5): LoRA Training + Integration
- Day 22: Wire trained LoRAs into generation pipeline
- U-Net training prep begins

### Full timeline: See `Documentation/05-Roadmap/Roadmap-Crowdfunding-v1.0.md`
