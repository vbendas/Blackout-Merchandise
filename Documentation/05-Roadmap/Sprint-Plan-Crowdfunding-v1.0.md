# Sprint Plan: Crowdfunding Demo — Tasks & Subtasks

> **Version**: 1.0 for Review  
> **Scope**: Weeks 1-3 (P0: Demo Hardening)  
> **Daily Capacity**: 6 hours  
> **Total Days**: 21  
> **Total Hours**: 126

---

## How to Review This Plan

1. Read each week's goals and daily breakdown
2. Check if task scope feels right for 6 hours/day
3. Flag any tasks you want reprioritized, removed, or added
4. Approve or request changes
5. Once approved, we execute Day-by-Day with no further planning overhead

---

## Week 1: AI Chat Core (May 9 → May 15)

**Week Goal**: A user can chat with any agent, switch between them, see avatar reactions, and get real LLM responses — all persisted and polished.

---

### Day 1 — Friday, May 9
**Theme**: Intent Classification & Routing Foundation  
**Hours**: 6

#### Task 1.1: Build Intent Classification Module
- **Subtask 1.1.1**: Create `lib/intent-classifier.ts` with prompt template for Mistral Small 4
- **Subtask 1.1.2**: Define intent categories: `onboarding`, `design`, `order_tracking`, `general`, `billing`
- **Subtask 1.1.3**: Map intents to agents: `onboarding`→Leopoldo, `design`→Francisca, `order_tracking`→Antonia, `general`→auto-routed by context
- **Subtask 1.1.4**: Build confidence threshold logic (if <0.7, ask clarifying question)
- **Subtask 1.1.5**: Write 10 test cases covering edge cases (ambiguous queries, multi-intent, off-topic)
- **Subtask 1.1.6**: Run classification tests, verify >80% accuracy

#### Task 1.2: Create Agent Routing Middleware
- **Subtask 1.2.1**: Create `app/api/chat/route.ts` with POST handler
- **Subtask 1.2.2**: Parse incoming message, run intent classification
- **Subtask 1.2.3**: Route to appropriate agent handler function
- **Subtask 1.2.4**: Inject agent-specific system prompt before LLM call
- **Subtask 1.2.5**: Return structured response: `{agent, message, intent, confidence}`
- **Subtask 1.2.6**: Add error handling for classification failures (fallback to Leopoldo)

#### Task 1.3: Project Setup & Sanity Checks
- **Subtask 1.3.1**: Verify `/app` and `/mainpage` builds pass (`npm run build` in both)
- **Subtask 1.3.2**: Verify Mistral API key is in `.env.local` and working (test ping)
- **Subtask 1.3.3**: Verify Drizzle connection to Neon is active
- **Subtask 1.3.4**: Create feature branch: `git checkout -b feat/crowdfunding-demo`

**Day 1 Deliverable**: `curl` test to `/api/chat` returns correct agent assignment for 5 test messages.

---

### Day 2 — Saturday, May 10
**Theme**: Agent Switcher UI + Avatar States  
**Hours**: 6

#### Task 2.1: Build Agent Switcher Component
- **Subtask 2.1.1**: Create `components/chat/AgentSwitcher.tsx`
- **Subtask 2.1.2**: Design: horizontal tabs or vertical sidebar showing Leopoldo/Francisca/Antonia
- **Subtask 2.1.3**: Active agent highlighted with gold border + glow effect
- **Subtask 2.1.4**: On switch: clear current input, show agent welcome message, change avatar
- **Subtask 2.1.5**: Track active agent in Zustand store (`useChatStore`)
- **Subtask 2.1.6**: Animate switch: fade out old avatar, fade in new (300ms)

#### Task 2.2: Create Avatar Component with Expression States
- **Subtask 2.2.1**: Create `components/chat/AgentAvatar.tsx`
- **Subtask 2.2.2**: Load Cloudinary avatar image based on `agentId` + `expression`
- **Subtask 2.2.3**: Expressions: `neutral`, `thinking`, `speaking`, `happy`, `confused`
- **Subtask 2.2.4**: Expression transitions: CSS transition or Framer Motion (scale + opacity)
- **Subtask 2.2.5**: Size variants: `sm` (header), `md` (chat bubble), `lg` (hero)
- **Subtask 2.2.6**: Add subtle idle animation: gentle breathing/pulse on `neutral`

#### Task 2.3: Integrate Avatar State with Message Lifecycle
- **Subtask 2.3.1**: `neutral` when idle (no activity for 3s)
- **Subtask 2.3.2**: `thinking` when waiting for LLM response
- **Subtask 2.3.3**: `speaking` when message is streaming in
- **Subtask 2.3.4**: `happy` when user approves/positive sentiment detected
- **Subtask 2.3.5**: `confused` when intent confidence <0.5 or user asks off-topic
- **Subtask 2.3.6**: Add state transition debounce (don't flicker between states)

**Day 2 Deliverable**: Can switch agents in UI, avatar expression changes, no visual glitches.

---

### Day 3 — Sunday, May 11
**Theme**: Real LLM Integration + Streaming + Persistence  
**Hours**: 6

#### Task 3.1: Integrate Mistral Large 3 API
- **Subtask 3.1.1**: Create `lib/mistral-client.ts` with streaming support
- **Subtask 3.1.2**: Build prompt assembler: `systemPrompt + conversationHistory + userMessage`
- **Subtask 3.1.3**: System prompts per agent (use existing `CAT_SUITE_PROMPTS.md` content)
- **Subtask 3.1.4**: Call Mistral API with streaming enabled (`stream: true`)
- **Subtask 3.1.5**: Handle API errors gracefully (rate limit, timeout, invalid key)
- **Subtask 3.1.6**: Add request timeout (15s) with retry logic (1 retry)

#### Task 3.2: Implement Streaming Response Display
- **Subtask 3.2.1**: Modify `/api/chat/route.ts` to return ReadableStream
- **Subtask 3.2.2**: Frontend: consume stream with `fetch` + `reader.read()`
- **Subtask 3.2.3**: Append chunks to message state as they arrive (typewriter effect)
- **Subtask 3.2.4**: Auto-scroll chat to bottom as message grows
- **Subtask 3.2.5**: Show "stop generation" button during streaming (optional)
- **Subtask 3.2.6**: Handle stream interruption (user navigates away, connection drops)

#### Task 3.3: Persist Conversations to Database
- **Subtask 3.3.1**: Create `chat_sessions` row on first message (or reuse existing)
- **Subtask 3.3.2**: Append each message to `messages` JSONB array: `{role, content, agent_id, timestamp, model}`
- **Subtask 3.3.3**: Update `updated_at` on each message
- **Subtask 3.3.4**: Load conversation history on page load (from `chat_sessions`)
- **Subtask 3.3.5**: Handle anonymous users (session ID in localStorage, no DB persistence)
- **Subtask 3.3.6**: Add conversation list sidebar ("Previous chats") — MVP: just current session

**Day 3 Deliverable**: Can have a 10-message conversation with real LLM, streaming works, persists on refresh.

---

### Day 4 — Monday, May 12
**Theme**: Typing Indicator + Message Animations + Polish  
**Hours**: 6

#### Task 4.1: Build TypingIndicator Component
- **Subtask 4.1.1**: Create `components/chat/TypingIndicator.tsx`
- **Subtask 4.1.2**: Animated dots (3 dots bouncing) with brand colors
- **Subtask 4.1.3**: Dynamic text: "Leopoldo is thinking..." / "Francisca is designing..." based on agent
- **Subtask 4.1.4**: Show immediately after user sends message, hide when response starts streaming
- **Subtask 4.1.5**: Add subtle shimmer effect on the indicator background
- **Subtask 4.1.6**: Handle case where API is slow (>5s): show "Still thinking..." message

#### Task 4.2: Animate Message Bubbles
- **Subtask 4.2.1**: User messages: slide in from right + fade (Framer Motion)
- **Subtask 4.2.2**: Agent messages: slide in from left + fade
- **Subtask 4.2.3**: Use spring physics (not linear) for natural feel
- **Subtask 4.2.4**: Stagger animation when multiple messages load at once
- **Subtask 4.2.5**: Add subtle hover state: message slightly lifts (scale 1.01)
- **Subtask 4.2.6**: Ensure animations don't cause layout shift (use `transform` only)

#### Task 4.3: Message Metadata + Read Status
- **Subtask 4.3.1**: Show timestamp below each message (relative: "2 min ago")
- **Subtask 4.3.2**: Show agent name + avatar on agent messages
- **Subtask 4.3.3**: Add "copy message" button on hover (agent messages)
- **Subtask 4.3.4**: Add "retry" button if LLM call failed
- **Subtask 4.3.5**: Show small checkmark when message is successfully sent
- **Subtask 4.3.6**: Test full conversation: 10 messages, verify no animation glitches

**Day 4 Deliverable**: Chat feels alive. Messages animate in smoothly, typing indicator adds personality.

---

### Day 5 — Tuesday, May 13
**Theme**: Demo Mode + Fallback Responses + Quick Replies  
**Hours**: 6

#### Task 5.1: Implement Demo Mode
- **Subtask 5.1.1**: Add `NEXT_PUBLIC_DEMO_MODE=true` to `.env.local`
- **Subtask 5.1.2**: Create `lib/demo-scripts.ts` with pre-written conversations
- **Subtask 5.1.3**: Script 1: Onboarding (Leopoldo walks user through setup)
- **Subtask 5.1.4**: Script 2: Design request (Francisca generates design)
- **Subtask 5.1.5**: Script 3: Refinement loop ("Make it darker" → new design)
- **Subtask 5.1.6**: Script 4: Store preview (Leopoldo shows storefront)
- **Subtask 5.1.7**: Script 5: Voice mode demo
- **Subtask 5.1.8**: In demo mode: bypass LLM API, return scripted responses with realistic delay (1-2s)

#### Task 5.2: Graceful Error Handling
- **Subtask 5.2.1**: If Mistral API fails: show "I'm having trouble connecting. Retry?" with retry button
- **Subtask 5.2.2**: If rate limited: show "Too many requests. Please wait 10 seconds." with countdown
- **Subtask 5.2.3**: If timeout (>15s): show "This is taking longer than expected. Want to try again?"
- **Subtask 5.2.4**: Log all errors to Sentry (if configured) or console
- **Subtask 5.2.5**: Never show raw error messages to user (always friendly copy)
- **Subtask 5.2.6**: Add `console.error` with request ID for debugging

#### Task 5.3: Quick Reply Buttons
- **Subtask 5.3.1**: After agent welcome message, show 3 quick-reply chips
- **Subtask 5.3.2**: Leopoldo: ["Set up my store", "Pricing", "How it works"]
- **Subtask 5.3.3**: Francisca: ["Design a shirt", "See my designs", "Change style"]
- **Subtask 5.3.4**: Antonia: ["Track order", "Shipping info", "Contact support"]
- **Subtask 5.3.5**: Clicking chip sends that text as user message
- **Subtask 5.3.6**: Chips animate in (staggered fade) after agent message completes

**Day 5 Deliverable**: Can toggle demo mode, scripted conversations flow perfectly, errors handled gracefully.

---

### Day 6 — Wednesday, May 14
**Theme**: Mobile Polish + Chat Refinements  
**Hours**: 6

#### Task 6.1: Mobile-Responsive Chat Layout
- **Subtask 6.1.1**: Chat container: full width on mobile, max-width 800px centered on desktop
- **Subtask 6.1.2**: Input bar: fixed at bottom, stays visible when keyboard opens
- **Subtask 6.1.3**: Message bubbles: max-width 85% on mobile (was 70% on desktop)
- **Subtask 6.1.4**: Avatar size: `md` on mobile, `lg` on desktop
- **Subtask 6.1.5**: Agent switcher: horizontal scrollable tabs on mobile (was sidebar on desktop)
- **Subtask 6.1.6**: Test on iPhone 14 Simulator: verify no horizontal scroll, no cut-off text

#### Task 6.2: Keyboard Handling
- **Subtask 6.2.1**: When input is focused, scroll page so input is visible (not hidden by keyboard)
- **Subtask 6.2.2**: On mobile Safari: handle `visualViewport` resize event
- **Subtask 6.2.3**: Send button: large enough for thumb (min 48×48px)
- **Subtask 6.2.4**: Mic button: same size, hold-to-speak gesture works on touch
- **Subtask 6.2.5**: Test: open chat, focus input, type message, send — all without manual scrolling
- **Subtask 6.2.6**: Test on Android Chrome: same flow, no issues

#### Task 6.3: Final Chat Polish
- **Subtask 6.3.1**: Auto-focus input on page load
- **Subtask 6.3.2**: Press Enter to send (Shift+Enter for new line)
- **Subtask 6.3.3**: Show character count (optional, max 500 chars)
- **Subtask 6.3.4**: Scroll to bottom button (appears when user scrolls up)
- **Subtask 6.3.5**: Empty state: "Start chatting with Leopoldo" with animated arrow
- **Subtask 6.3.6**: Bug bash: fix any console warnings, alignment issues, z-index problems

**Day 6 Deliverable**: Chat works flawlessly on iPhone 14 and Pixel 7. No UI bugs.

---

### Day 7 — Thursday, May 15
**Theme**: Week 1 Review + Voice Prep  
**Hours**: 6

#### Task 7.1: Record Week 1 Demo Video
- **Subtask 7.1.1**: Screen record: landing page → chat with Leopoldo → switch to Francisca → 3-message conversation
- **Subtask 7.1.2**: Record in 4K, 60fps, no notifications, clean browser
- **Subtask 7.1.3**: Add voiceover or text captions explaining features
- **Subtask 7.1.4**: Export as MP4, upload to shared folder
- **Subtask 7.1.5**: Watch recording, note any stutters or visual issues

#### Task 7.2: Review & Document
- **Subtask 7.2.1**: List 5-10 polish items for Week 2 (prioritized)
- **Subtask 7.2.2**: Document any architectural decisions made (e.g., "Used Zustand over React Context for chat state")
- **Subtask 7.2.3**: Update `Project-Status.md` with Week 1 completion
- **Subtask 7.2.4**: Verify all code is committed and pushed to branch

#### Task 7.3: Voice Input Skeleton
- **Subtask 7.3.1**: Create `components/chat/VoiceInput.tsx`
- **Subtask 7.3.2**: Mic button UI: circular, pulsing when recording, red when active
- **Subtask 7.3.3**: Implement `MediaRecorder` API: start/stop recording on hold/release
- **Subtask 7.3.4**: Capture audio as `Blob` (WebM format)
- **Subtask 7.3.5**: Show recording duration timer
- **Subtask 7.3.6**: Test: hold button, speak, release → audio blob created successfully

**Day 7 Deliverable**: Week 1 demo video recorded. Voice input UI ready for STT integration.

---

## Week 2: Voice + Design Generation (May 16 → May 22)

**Week Goal**: User can speak to agents, get voice responses, and generate/refine t-shirt designs with FLUX 2.

---

### Day 8 — Friday, May 16
**Theme**: Deepgram STT Integration  
**Hours**: 6

#### Task 8.1: Deepgram API Setup
- **Subtask 8.1.1**: Add `DEEPGRAM_API_KEY` to `.env.local`
- **Subtask 8.1.2**: Create `lib/deepgram-client.ts` with basic transcription test
- **Subtask 8.1.3**: Verify API key works: send test audio, get back transcript
- **Subtask 8.1.4**: Note: Deepgram Nova-2 model, language `pt` + `en` (multilingual)
- **Subtask 8.1.5**: Handle API errors: invalid key, quota exceeded, network issues

#### Task 8.2: Voice Input Pipeline
- **Subtask 8.2.1**: On mic hold: start `MediaRecorder`, begin recording
- **Subtask 8.2.2**: On mic release: stop recording, get audio Blob
- **Subtask 8.2.3**: Send Blob to `/api/transcribe` endpoint
- **Subtask 8.2.4**: Endpoint sends audio to Deepgram, returns transcript
- **Subtask 8.2.5**: Frontend receives transcript, inserts into chat input field
- **Subtask 8.2.6**: Auto-send message if user releases mic and transcript is non-empty

#### Task 8.3: Voice Waveform Visualization
- **Subtask 8.3.1**: Create `components/chat/VoiceWaveform.tsx`
- **Subtask 8.3.2**: Use Web Audio API `AnalyserNode` to get frequency data
- **Subtask 8.3.3**: Render 20-30 bars that respond to voice volume
- **Subtask 8.3.4**: Gold/rose gradient on bars
- **Subtask 8.3.5**: Bars animate smoothly (lerp between values, not jerky)
- **Subtask 8.3.6**: Hide waveform when not recording

**Day 8 Deliverable**: Hold mic, speak, see waveform, release, transcript appears in chat.

---

### Day 9 — Saturday, May 17
**Theme**: Voxtral TTS Integration  
**Hours**: 6

#### Task 9.1: Voxtral TTS API Setup
- **Subtask 9.1.1**: Add `MISTRAL_API_KEY` to `.env.local` (should already be there)
- **Subtask 9.1.2**: Research Voxtral TTS endpoint and payload format
- **Subtask 9.1.3**: Create `lib/voxtral-tts.ts` client
- **Subtask 9.1.4**: Test: send "Hello, I am Leopoldo" → receive audio file
- **Subtask 9.1.5**: Handle errors: API unavailable, text too long, unsupported language
- **Subtask 9.1.6**: Fallback plan: if Voxtral fails, use browser `speechSynthesis` (Web Speech API)

#### Task 9.2: Integrate TTS into Chat Response Flow
- **Subtask 9.2.1**: After LLM generates response text, check if voice is enabled
- **Subtask 9.2.2**: If enabled: send text to TTS API
- **Subtask 9.2.3**: Receive audio (MP3 or WAV), play in browser (`Audio` element)
- **Subtask 9.2.4**: Show "speaking" avatar state while audio plays
- **Subtask 9.2.5**: Allow user to interrupt: click anywhere → stop audio, set avatar to neutral
- **Subtask 9.2.6**: Queue system: if new message arrives while speaking, stop current, start new

#### Task 9.3: Voice Settings UI
- **Subtask 9.3.1**: Add mute/unmute toggle button in chat header
- **Subtask 9.3.2**: Persist voice preference in `localStorage`
- **Subtask 9.3.3**: Add voice speed slider (0.8x - 1.5x) — optional, MVP: default 1x
- **Subtask 9.3.4**: Show "🔊 Voice On" / "🔇 Voice Off" indicator
- **Subtask 9.3.5**: Test: full conversation with voice on, then toggle off mid-conversation

**Day 9 Deliverable**: Agent responses spoken aloud. Can interrupt. Toggle works.

---

### Day 10 — Sunday, May 18
**Theme**: FLUX 2 API Integration  
**Hours**: 6

#### Task 10.1: BFL API Setup
- **Subtask 10.1.1**: Add `BFL_API_KEY` to `.env.local`
- **Subtask 10.1.2**: Create `lib/bfl-client.ts` for FLUX 2 API
- **Subtask 10.1.3**: Test Flex model: simple prompt → image URL
- **Subtask 10.1.4**: Test Pro model: compare quality vs Flex
- **Subtask 10.1.5**: Test Max model: highest quality option
- **Subtask 10.1.6**: Document cost per call: Flex $0.008, Pro $0.020, Max $0.050

#### Task 10.2: Design Generation Endpoint
- **Subtask 10.2.1**: Create `app/api/generate-design/route.ts`
- **Subtask 10.2.2**: Accept: `prompt`, `category`, `style`, `complexity` (flex/pro/max)
- **Subtask 10.2.3**: Enhance prompt with print-specific instructions: "t-shirt design, centered, transparent background, 300 DPI, screen print aesthetic"
- **Subtask 10.2.4**: Call BFL API with appropriate model based on complexity
- **Subtask 10.2.5**: Return: `{imageUrl, prompt, modelUsed, generationTime}`
- **Subtask 10.2.6**: Handle errors: timeout (>15s), API failure, NSFW filter

#### Task 10.3: Generation Progress UI
- **Subtask 10.3.1**: Create `components/chat/DesignGenerating.tsx`
- **Subtask 10.3.2**: Animated progress: "Analyzing your vision..." → "Sketching ideas..." → "Adding details..." → "Finalizing..."
- **Subtask 10.3.3**: Progress bar or step dots with animation
- **Subtask 10.3.4**: Estimated time: "~8 seconds remaining"
- **Subtask 10.3.5**: Cancel button (optional MVP: skip)
- **Subtask 10.3.6**: Show fun tip while waiting: "Did you know? Screen printing can produce over 16 million colors."

**Day 10 Deliverable**: Can send "Design a metal band shirt" → Francisca generates image in <10s.

---

### Day 11 — Monday, May 19
**Theme**: Design Display + Approval Flow  
**Hours**: 6

#### Task 11.1: DesignCard Component
- **Subtask 11.1.1**: Create `components/chat/DesignCard.tsx`
- **Subtask 11.1.2**: Large image display: max-width 100%, rounded corners, subtle shadow
- **Subtask 11.1.3**: Below image: prompt text (truncated), timestamp, model used badge
- **Subtask 11.1.4**: Action buttons: "✅ Approve" (gold), "✏️ Refine" (white), "🔄 Regenerate" (gray)
- **Subtask 11.1.5**: Image lazy loading + Cloudinary optimization (`f_auto,q_auto,w_800`)
- **Subtask 11.1.6**: Click image to open full-screen lightbox

#### Task 11.2: Design History
- **Subtask 11.2.1**: Create `components/chat/DesignHistory.tsx`
- **Subtask 11.2.2**: Horizontal scrollable carousel of all designs in session
- **Subtask 11.2.3**: Each thumbnail: small image + generation number ("Design #1")
- **Subtask 11.2.4**: Click thumbnail → scrolls to that design in chat
- **Subtask 11.2.5**: Active design highlighted with gold border
- **Subtask 11.2.6**: Empty state: "No designs yet. Ask Francisca to create one!"

#### Task 11.3: Save Designs to Database
- **Subtask 11.3.1**: When design is generated, append to `chat_sessions.messages`:
  ```json
  {
    "role": "assistant",
    "type": "design",
    "imageUrl": "...",
    "prompt": "...",
    "model": "flux-2-pro",
    "timestamp": "..."
  }
  ```
- **Subtask 11.3.2**: On conversation load, render design cards from message history
- **Subtask 11.3.3**: Add `designs` array to chat state for quick access
- **Subtask 11.3.4**: Handle image URL expiration (Cloudinary URLs are permanent)

**Day 11 Deliverable**: Generated designs displayed beautifully. Can view history. Designs persist.

---

### Day 12 — Tuesday, May 20
**Theme**: Design Refinement Loop  
**Hours**: 6

#### Task 12.1: Refinement Prompt Input
- **Subtask 12.1.1**: When user clicks "Refine", show inline input below design
- **Subtask 12.1.2**: Placeholder: "Make it darker, add a skull, change the font..."
- **Subtask 12.1.3**: Suggest common refinements as chips: ["Darker"], ["Brighter"], ["Add text"], ["Simpler"]
- **Subtask 12.1.4**: Submit refinement → send to `/api/generate-design` with `baseImageUrl`

#### Task 12.2: img2img Refinement (FLUX 2 Flex)
- **Subtask 12.2.1**: Update endpoint to accept `baseImageUrl` (optional)
- **Subtask 12.2.2**: If `baseImageUrl` provided: use img2img mode (not text-to-img)
- **Subtask 12.2.3**: Pass original image + refinement prompt to BFL API
- **Subtask 12.2.4**: Return new image URL
- **Subtask 12.2.5**: Same progress UI as initial generation
- **Subtask 12.2.6**: Handle case where img2img is not supported → fallback to text-to-img with enhanced prompt

#### Task 12.3: Side-by-Side Comparison
- **Subtask 12.3.1**: Create `components/chat/DesignComparison.tsx`
- **Subtask 12.3.2**: Show original on left, refined on right
- **Subtask 12.3.3**: Add draggable slider to wipe between images (before/after effect)
- **Subtask 12.3.4**: Labels: "Original" / "Refined" with version numbers
- **Subtask 12.3.5**: Mobile: stacked vertically with toggle button
- **Subtask 12.3.6**: Add "Use this as base" button on any past design

**Day 12 Deliverable**: Can refine a design 3+ times with visual comparison.

---

### Day 13 — Wednesday, May 21
**Theme**: Pre-generate Video Assets + Optimization  
**Hours**: 6

#### Task 13.1: Generate 20 Pre-Made Designs
- **Subtask 13.1.1**: Prompt batch 1 (5 prompts): Metal band shirts
- **Subtask 13.1.2**: Prompt batch 2 (5 prompts): Indie/pop designs
- **Subtask 13.1.3**: Prompt batch 3 (5 prompts): Hip-hop/graffiti styles
- **Subtask 13.1.4**: Prompt batch 4 (5 prompts): Abstract/minimalist
- **Subtask 13.1.5**: Save all image URLs + prompts to `data/video-designs.json`
- **Subtask 13.1.6**: Verify all images load, no broken URLs

#### Task 13.2: Build Design Cycling for Demo Mode
- **Subtask 13.2.1**: In demo mode, when Francisca "generates" a design:
  - Show progress animation (3-4 steps, 2-3s total)
  - Pick next pre-made design from JSON
  - Display with "generation" effect (blur → sharpen)
- **Subtask 13.2.2**: Cycle through designs in order, loop after 20
- **Subtask 13.2.3**: Add slight random delay (1.5-3s) to feel realistic
- **Subtask 13.2.4**: Show model badge: "Generated with FLUX 2 Pro"

#### Task 13.3: Full Pipeline Optimization
- **Subtask 13.3.1**: Test: speak "Create a black metal shirt" → transcribe (target <2s)
- **Subtask 13.3.2**: Generate design (target <10s real, <3s demo)
- **Subtask 13.3.3**: Display design (target <1s)
- **Subtask 13.3.4**: Total pipeline: target <15s real, <5s demo
- **Subtask 13.3.5**: Optimize Cloudinary: all images with `f_auto,q_auto,w_800`
- **Subtask 13.3.6**: Add `loading="lazy"` to design images below the fold

**Day 13 Deliverable**: 20 designs ready. Full voice→design pipeline <15s. Demo mode <5s.

---

### Day 14 — Thursday, May 22
**Theme**: Week 2 Review + Storefront Prep  
**Hours**: 6

#### Task 14.1: Record Week 2 Demo Video
- **Subtask 14.1.1**: Record: speak to Francisca → generate design → refine → compare
- **Subtask 14.1.2**: Record voice mode: Leopoldo speaks, user interrupts
- **Subtask 14.1.3**: Export, review, note issues

#### Task 14.2: Review & Plan Week 3
- **Subtask 14.2.1**: Document Week 2 achievements
- **Subtask 14.2.2**: List remaining bugs/improvements
- **Subtask 14.2.3**: Plan storefront component architecture
- **Subtask 14.2.4**: Verify all code committed

#### Task 14.3: Storefront Shell
- **Subtask 14.3.1**: Create route: `app/shop/[artist-slug]/page.tsx`
- **Subtask 14.3.2**: Build layout: header (store name), main content area, footer
- **Subtask 14.3.3**: Add placeholder sections: hero, products, bio
- **Subtask 14.3.4**: Test route with 3 mock artist slugs
- **Subtask 14.3.5**: Add loading skeleton for storefront

**Day 14 Deliverable**: Week 2 demo recorded. Storefront route exists with layout.

---

## Week 3: Storefront + Integration (May 23 → May 29)

**Week Goal**: Artist storefront looks like a real Shopify store. Cart works. Full user journey is seamless.

---

### Day 15 — Friday, May 23
**Theme**: Storefront Hero + Artist Bio  
**Hours**: 6

#### Task 15.1: StorefrontHero Component
- **Subtask 15.1.1**: Full-width banner image (artist's hero image from Cloudinary)
- **Subtask 15.1.2**: Artist name: large, bold, with gradient text effect
- **Subtask 15.1.3**: Tagline/genre: smaller text below name
- **Subtask 15.1.4**: Social links: Instagram, Twitter/X, Spotify icons
- **Subtask 15.1.5**: Responsive: banner height 300px desktop, 200px mobile
- **Subtask 15.1.6**: Parallax: banner moves at 0.5x scroll speed

#### Task 15.2: ArtistBio Section
- **Subtask 15.2.1**: Artist photo (circular, bordered in gold)
- **Subtask 15.2.2**: Bio text: max 300 chars, expandable on click
- **Subtask 15.2.3**: Genre tags: pill-shaped badges (Metal, Indie, etc.)
- **Subtask 15.2.4**: Collapsible on mobile: "Read more" → expand
- **Subtask 15.2.5**: Test with 3 mock artists, each unique

#### Task 15.3: Store Theme Customization
- **Subtask 15.3.1**: `theme_config` JSONB: `{backgroundColor, accentColor, textColor, fontFamily}`
- **Subtask 15.3.2**: Apply theme via CSS variables on storefront container
- **Subtask 15.3.3**: Default theme: black bg, gold accent, white text
- **Subtask 15.3.4**: Test theme switching with 3 different color combos
- **Subtask 15.3.5**: Ensure contrast ratios pass WCAG AA

**Day 15 Deliverable**: Storefront hero and bio look professional and unique per artist.

---

### Day 16 — Saturday, May 24
**Theme**: Product Grid + Product Cards  
**Hours**: 6

#### Task 16.1: ProductCard Component
- **Subtask 16.1.1**: Image: square aspect ratio, rounded corners, hover zoom (scale 1.05)
- **Subtask 16.1.2**: Product name: below image, bold, truncate if too long
- **Subtask 16.1.3**: Price: "€29.99" in gold accent color
- **Subtask 16.1.4**: "Add to Cart" button: appears on hover (desktop), always visible (mobile)
- **Subtask 16.1.5**: Badge: "New" or "Best Seller" (optional)
- **Subtask 16.1.6**: Loading state: skeleton with shimmer animation

#### Task 16.2: ProductGrid Layout
- **Subtask 16.2.1**: CSS Grid: 3 columns desktop, 2 tablet, 1 mobile
- **Subtask 16.2.2**: Gap: 24px consistent
- **Subtask 16.2.3**: Padding: responsive, no horizontal scroll
- **Subtask 16.2.4**: Infinite scroll or "Load more" button (MVP: show all)
- **Subtask 16.2.5**: Empty state: "No products yet. Check back soon!"

#### Task 16.3: Product Filtering
- **Subtask 16.3.1**: Filter buttons: All, T-Shirts, Hoodies, Posters, Stickers
- **Subtask 16.3.2**: Active state: gold background, black text
- **Subtask 16.3.3**: Inactive state: transparent border, white text
- **Subtask 16.3.4**: Filter animation: grid items fade/reorder smoothly
- **Subtask 16.3.5**: URL sync: `?category=t-shirts` updates filter
- **Subtask 16.3.6**: Pre-populate 12 mock products (3 artists × 4 products)

**Day 16 Deliverable**: Storefront shows realistic product grid with filtering.

---

### Day 17 — Sunday, May 25
**Theme**: Cart Drawer + Demo Mode Integration  
**Hours**: 6

#### Task 17.1: CartDrawer Component
- **Subtask 17.1.1**: Slide-out from right (Framer Motion, 300ms)
- **Subtask 17.1.2**: Header: "Your Cart" + close button
- **Subtask 17.1.3**: Item list: image thumbnail, name, quantity stepper, price, remove button
- **Subtask 17.1.4**: Footer: subtotal, "Checkout" button (gold, full width)
- **Subtask 17.1.5**: Empty state: "Your cart is empty" + CTA to browse
- **Subtask 17.1.6**: Responsive: full width on mobile, 400px on desktop

#### Task 17.2: Cart State Management
- **Subtask 17.2.1**: Zustand store: `cartStore` with `items`, `addItem`, `removeItem`, `updateQuantity`
- **Subtask 17.2.2**: Calculate subtotal automatically
- **Subtask 17.2.3**: Persist cart in `localStorage`
- **Subtask 17.2.4**: Cart icon in header with item count badge
- **Subtask 17.2.5**: Badge animates (scale bump) when item is added

#### Task 17.3: Demo Mode Checkout
- **Subtask 17.3.1**: In demo mode: clicking "Checkout" shows success modal
- **Subtask 17.3.2**: Modal: "Thanks for trying the demo! Back us on Indiegogo to launch your store."
- **Subtask 17.3.3**: CTA button: "Back the Project" → links to `/invest`
- **Subtask 17.3.4**: No real Stripe integration (deferred to post-crowdfunding)
- **Subtask 17.3.5**: Add "This is a demo" subtle watermark on checkout button

**Day 17 Deliverable**: Full storefront → cart → demo checkout flow works.

---

### Day 18 — Monday, May 26
**Theme**: Integration Testing + Bug Bash  
**Hours**: 6

#### Task 18.1: Full User Journey Test
- **Subtask 18.1.1**: Path 1: New user → landing page → chat with Leopoldo → switch to Francisca → generate design → view storefront → add to cart
- **Subtask 18.1.2**: Path 2: Returning user → conversation loads → continues chat → refines design
- **Subtask 18.1.3**: Path 3: Voice user → speaks to Francisca → generates design by voice
- **Subtask 18.1.4**: Time each path, note any friction points
- **Subtask 18.1.5**: Document 3 "wow" moments and 3 friction points

#### Task 18.2: Cross-Device Testing
- **Subtask 18.2.1**: Desktop Chrome: full journey
- **Subtask 18.2.2**: iPhone 14 Simulator: full journey
- **Subtask 18.2.3**: Android Chrome (Pixel 7): full journey
- **Subtask 18.2.4**: iPad: full journey
- **Subtask 18.2.5**: Note any device-specific bugs

#### Task 18.3: Performance Audit
- **Subtask 18.3.1**: Run Lighthouse: target >80 mobile, >90 desktop
- **Subtask 18.3.2**: Check bundle size: target <200KB initial JS
- **Subtask 18.3.3**: Check image sizes: all images <200KB each
- **Subtask 18.3.4**: Fix any P0 performance issues
- **Subtask 18.3.5**: Run `npm run build` in both `/app` and `/mainpage`, fix errors

**Day 18 Deliverable**: All core flows work on all devices. Build passes. No P0 bugs.

---

### Day 19 — Tuesday, May 27
**Theme**: Landing Page Polish + Waitlist Finish  
**Hours**: 6

#### Task 19.1: Landing Page Polish
- **Subtask 19.1.1**: Hero section: verify Leopoldo avatar, headline, CTA button
- **Subtask 19.1.2**: Feature marquees: smooth infinite scroll, no jank
- **Subtask 19.1.3**: Quality specs section: icons, text, layout
- **Subtask 19.1.4**: Waitlist CTA: morphing text effect works, button prominent
- **Subtask 19.1.5**: Footer: all links work, social icons link correctly
- **Subtask 19.1.6**: Floating socials sidebar: positioned correctly, doesn't overlap content

#### Task 19.2: "Try the Demo" CTA
- **Subtask 19.2.1**: Add prominent "Try the Demo" button in hero
- **Subtask 19.2.2**: Click → smooth scroll to chat section OR open chat in modal
- **Subtask 19.2.3**: Button pulses subtly to draw attention
- **Subtask 19.2.4**: A/B test: button text ("Try Demo" vs "Chat with Leopoldo" vs "See It In Action")

#### Task 19.3: Waitlist Page Finish
- **Subtask 19.3.1**: Form: Name, Email, Social Link (optional), Follower Range
- **Subtask 19.3.2**: Validation: email required, valid format
- **Subtask 19.3.3**: Success state: "You're on the list! Position #XXX" with confetti
- **Subtask 19.3.4**: Social proof: "Join 500+ artists" (dynamic counter)
- **Subtask 19.3.5**: Save to `waitlist` table in Neon
- **Subtask 19.3.6**: Send confirmation email (Resend)

**Day 19 Deliverable**: Landing page and waitlist are polished and conversion-ready.

---

### Day 20 — Wednesday, May 28
**Theme**: End-to-End Demo Recording  
**Hours**: 6

#### Task 20.1: Demo Script
- **Subtask 20.1.1**: Write 5-minute script: landing → chat → voice → design → store
- **Subtask 20.1.2**: Time each segment (target: 30s landing, 60s chat, 30s voice, 90s design, 60s store)
- **Subtask 20.1.3**: Note exact clicks and typing for reproducibility
- **Subtask 20.1.4**: Prepare backup: if real LLM is slow, switch to demo mode mid-recording

#### Task 20.2: Recording
- **Subtask 20.2.1**: Set up: clean browser, no notifications, dark room, 4K 60fps
- **Subtask 20.2.2**: Record 3 takes of full demo
- **Subtask 20.2.3**: Record B-roll: close-ups of typing, mouse clicks, phone screen
- **Subtask 20.2.4**: Record founder talking to camera (2-3 takes)

#### Task 20.3: Organization
- **Subtask 20.3.1**: Label all clips: `01_landing_v1`, `02_chat_v2`, etc.
- **Subtask 20.3.2**: Upload to shared folder (Google Drive/Dropbox)
- **Subtask 20.3.3**: Create `video-production/` folder structure
- **Subtask 20.3.4**: Note best takes for each segment

**Day 20 Deliverable**: Raw demo footage recorded. Ready for editing in Week 5.

---

### Day 21 — Thursday, May 29
**Theme**: Week 3 Review + Handoff  
**Hours**: 6

#### Task 21.1: Document Achievements
- **Subtask 21.1.1**: List all working features: chat, voice, design gen, refinement, storefront, cart
- **Subtask 21.1.2**: List known limitations: demo mode, pre-generated designs, mock checkout
- **Subtask 21.1.3**: Update `Project-Status.md`
- **Subtask 21.1.4**: Update `Roadmap-Crowdfunding-v1.0.md` with actual progress

#### Task 21.2: Code Review & Commit
- **Subtask 21.2.1**: Review all code changes
- **Subtask 21.2.2**: Fix any obvious issues
- **Subtask 21.2.3**: Write commit message: `feat(crowdfunding-demo): P0 complete - chat, voice, design, storefront`
- **Subtask 21.2.4**: Push to branch, create draft PR

#### Task 21.3: Week 4-5 Planning
- **Subtask 21.3.1**: Rank polish priorities: animations > mobile > voice quality > design quality
- **Subtask 21.3.2**: Shortlist 3 video editors (Fiverr/Upwork)
- **Subtask 21.3.3**: Prepare video production assets folder
- **Subtask 21.3.4**: Set Week 4 Day 1 goal

**Day 21 Deliverable**: P0 complete. Handoff document written. Ready for polish phase.

---

## Approval Checklist

Before we begin execution, confirm:

- [ ] **Scope**: Week 1-3 covers the right features (chat, voice, design, storefront)
- [ ] **Depth**: Each day's 6 hours feels realistic, not overloaded
- [ ] **Priority**: Any tasks you want moved earlier or later?
- [ ] **Cuts**: Any tasks you want removed to save time?
- [ ] **Adds**: Any missing tasks you want added?
- [ ] **Start Date**: Confirm May 9 start (tomorrow)
- [ ] **Branch**: Confirm `feat/crowdfunding-demo` branch name

---

## Post-Approval: How We Execute

1. **Daily**: I'll present the day's plan → you approve or adjust → I execute
2. **End of day**: I'll summarize what was done, show screenshots/demos
3. **Weekly**: Record demo video, review progress, adjust next week if needed
4. **No replanning**: Once approved, we execute. Only blockers or major issues trigger re-evaluation.

---

**Ready for your review. Flag anything you want changed.**
