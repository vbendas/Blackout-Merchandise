# Plan: Merch Studio → Conversational UI Refactor

> Created: 2026-05-11  
> Branch: feat/crowdfunding-demo  
> Status: Pending approval

---

## Goal

Replace the current split-panel Merch Studio (GarmentCanvas + right-panel chat) with a fully conversational, mobile-first interface where the chat expands to full-screen when the user enters the Studio. All design iteration happens through Francisca in conversation. The "Conversation Story" icon surfaces persistent session memory across all visits.

---

## Phase 0: Findings (Documentation Discovery)

**Files identified — do not re-derive these:**

| Concern | File | Key lines |
|---|---|---|
| Studio route | `app/src/app/app/studio/page.tsx` | Sets Francisca on mount, renders GarmentCanvas + StudioToolbar + GarmentCarousel |
| Chat widget | `app/src/components/chat/CatChat.tsx` | Floating bubble, hidden on studio page |
| Chat provider | `app/src/components/chat/CatChatProvider.tsx` | `isOpen`, `currentAgent` state, `toggleChat()` L136 |
| Left panel nav | `app/src/components/layout/IconStripNav.tsx` | Session History icon L301-334 (`lucide:rotate-ccw`) |
| Conversation Story | `app/src/components/SessionHistory.tsx` | Slides in from left, shows past sessions |
| Persistence (local) | `app/src/lib/sessionPersistence.ts` | localStorage keys: chat (24h), studio/products (7d) |
| DB chat functions | `src/db/chat.ts` | `createChatSession`, `addMessageToSession`, `getUserChatSessions` |
| DB schema | `src/db/schema.ts` | `chatSessions` table: JSONB messages, userId FK |
| Francisca persona | `app/src/types/chat.ts:65-87` | id, role, context paths, keywords |
| Francisca responses | `app/src/lib/ai/franciscaResponses.ts` | Pre-written responses per action |
| Main chat API | `app/src/app/api/chat/unified/route.ts` | → mistral-large-latest via MiniMaxM2HerProvider |
| Image upload | `app/src/app/api/upload/slider/route.ts` | → Cloudinary, 5MB, `image/*`, Clerk auth |
| Mockup generation | `app/src/app/api/mockups/route.ts` | `design_url`, `product_sku`, `color_code` |

---

## Phase 1: Strip the Studio Split-Panel

**Goal:** Remove GarmentCanvas, StudioToolbar, and GarmentCarousel from the studio route. The studio page becomes a thin wrapper that signals the chat to go full-screen.

**Files to change:**
- `app/src/app/app/studio/page.tsx`

**What to do:**
1. Read the current studio page in full.
2. Remove the `GarmentCanvas` component and its right-padding logic (380px chat offset).
3. Remove `StudioToolbar` and `GarmentCarousel` imports and JSX.
4. Replace the page body with a single `<StudioChatTrigger />` wrapper that:
   - Sets `currentAgent` to Francisca (keep existing behaviour on mount).
   - Calls a new `enterStudioMode()` action on the chat provider.
   - Renders nothing else — the full-screen chat IS the page content.

**Verification:**
- `grep -r "GarmentCanvas\|StudioToolbar\|GarmentCarousel" app/src/app/app/studio/` returns 0 results.
- Navigating to `/app/studio` shows a blank page (chat not yet full-screen — that's Phase 2).
- `bun build` passes with no type errors.

**Anti-patterns:**
- Do NOT delete GarmentCanvas/StudioToolbar/GarmentCarousel component files — they may be used elsewhere or needed later.
- Do NOT remove the `useEffect` that sets Francisca as active agent.

---

## Phase 2: Full-Screen Chat Mode

**Goal:** When `studioMode` is active, the chat panel expands to cover the full viewport with a smooth Framer Motion animation. On exit, it collapses back.

**Files to change:**
- `app/src/components/chat/CatChatProvider.tsx`
- `app/src/components/chat/CatChat.tsx`

**What to do:**

### 2a. Extend the provider (CatChatProvider.tsx)
1. Read `CatChatProvider.tsx` in full.
2. Add `isStudioMode: boolean` to `ChatContextValue` interface.
3. Add `enterStudioMode()` and `exitStudioMode()` to the interface.
4. Implement state: `const [isStudioMode, setIsStudioMode] = useState(false)`.
5. `enterStudioMode` sets `isStudioMode = true` AND `isOpen = true`.
6. `exitStudioMode` sets `isStudioMode = false`.

### 2b. Full-screen layout in CatChat.tsx
1. Read `CatChat.tsx` in full.
2. The chat panel currently uses `fixed` positioning with a right-slide animation. Add a conditional layout branch:
   - **Normal mode:** existing right-panel behaviour (unchanged).
   - **Studio mode:** `position: fixed; inset: 0; z-index: 200` — full viewport coverage.
3. Use Framer Motion `AnimatePresence` + `motion.div` with:
   ```
   initial:  { opacity: 0, scale: 0.95, y: 20 }
   animate:  { opacity: 1, scale: 1,    y: 0  }
   exit:     { opacity: 0, scale: 0.95, y: 20 }
   transition: { type: 'spring', damping: 28, stiffness: 300 }
   ```
4. In studio mode, hide the floating bubble avatar entirely (the user is already in the chat).
5. Add a top-right close/exit button in studio mode that calls `exitStudioMode()` and navigates the user back to `/app/dashboard`.
6. On mobile (< 768px): studio mode is the ONLY mode — the floating bubble never appears, entering `/app/studio` always triggers full-screen chat.

**Verification:**
- Navigating to `/app/studio` shows full-screen chat with Francisca active.
- Pressing close returns to dashboard.
- Floating bubble is absent on the studio route on all screen sizes.
- Framer Motion transition is visible (not instant).
- `bun build` passes.

**Anti-patterns:**
- Do NOT use CSS transitions directly — use Framer Motion to match the existing animation system.
- Do NOT break the existing right-panel mode for non-studio routes.

---

## Phase 3: Studio Message Types

**Goal:** Add four new message type variants that Francisca can send and the user can trigger in the studio chat. These are visual-first components rendered inside chat message bubbles.

**Files to change:**
- `app/src/types/chat.ts`
- New component: `app/src/components/chat/messages/StudioStatusCard.tsx`
- New component: `app/src/components/chat/messages/ImageMessage.tsx`
- New component: `app/src/components/chat/messages/ImageUploadMessage.tsx`
- New component: `app/src/components/chat/messages/OptionChips.tsx`
- `app/src/components/chat/CatChat.tsx` (render new types)

**What to do:**

### 3a. Extend ChatMessage type (types/chat.ts L94-111)
Read the file, then add to the `type` union field:
```
type: 'text' | 'voice' | 'status_card' | 'image_result' | 'image_upload_prompt' | 'option_chips'
```
Add to `metadata` on `ChatMessage`:
```typescript
studioMeta?: {
  phase?: StudioPhase           // which conversation phase this message belongs to
  statusCard?: GarmentStatus[]  // for status_card type
  imageUrl?: string             // for image_result type
  options?: StudioOption[]      // for option_chips type
}
```
Add new types:
```typescript
type StudioPhase = 
  | 'greeting' | 'garment_selection' | 'design_intent' 
  | 'reference_gathering' | 'design_generation' | 'design_iteration'
  | 'garment_application' | 'mockup_generation' | 'approval' 
  | 'next_item' | 'complete'

interface GarmentStatus {
  id: string
  name: string        // e.g. "Black Hoodie M"
  sku: string
  status: 'pending' | 'in_progress' | 'approved'
  designUrl?: string  // thumbnail of approved design
}

interface StudioOption {
  id: string
  label: string
  imageUrl?: string  // optional visual preview
}
```

### 3b. StudioStatusCard component
- Renders a compact card inside a chat bubble (Francisca-side).
- Lists garments with status icons: `⬜ pending`, `⟳ in-progress`, `✓ done` (use Tailwind + Lucide icons).
- Tapping a garment row does nothing in Phase 3 (interaction added later).
- Card has a subtle purple border matching Francisca's color (`#a855f7`).

### 3c. ImageMessage component
- Renders an image in a chat bubble with rounded corners.
- Tap → full-screen lightbox (use a `<dialog>` element or Framer Motion overlay).
- Shows a subtle "tap to expand" label on hover/long-press.
- Handles loading state (skeleton placeholder while `imageUrl` loads).

### 3d. ImageUploadMessage component
- Rendered when Francisca asks the user to upload a reference image.
- Shows a dashed upload zone inside the bubble (drag-and-drop on desktop, tap-to-pick on mobile).
- On file selection: calls `POST /api/upload/design-reference` (created in Phase 5).
- On success: inserts a new user message with type `image_result` containing the uploaded URL.

### 3e. OptionChips component
- Renders 2-6 tappable chip buttons inside a Francisca bubble.
- Tapping a chip sends it as a user text message and removes the chips.
- Used for: font style choices, garment confirmation, approval yes/no.

### 3f. Wire up in CatChat.tsx
Add a `renderMessage(message: ChatMessage)` switch that routes to the correct component by `message.type`.

**Verification:**
- `grep -r "StudioStatusCard\|ImageMessage\|OptionChips" app/src/components/chat/` shows the new files.
- TypeScript: `bun tsc --noEmit` passes with the new types.
- Each component renders in isolation without crashing.

---

## Phase 4: Francisca Studio Flow (Conversation State Machine)

**Goal:** Francisca guides the user through a structured conversation in the studio. Each phase has a specific opening message and response logic. The state machine tracks which phase the current studio session is in.

**Files to change:**
- New file: `app/src/lib/ai/studioFlow.ts`
- `app/src/lib/ai/franciscaResponses.ts` (extend with studio phase responses)
- `app/src/app/api/chat/unified/route.ts` (detect studio context, inject phase into system prompt)

**What to do:**

### 4a. Studio flow definition (studioFlow.ts)
Create a state machine with 11 phases (see StudioPhase type from Phase 3).

For each phase, define:
```typescript
interface StudioPhaseConfig {
  phase: StudioPhase
  openingMessage: string           // What Francisca says when entering this phase
  expectedInputType: 'text' | 'image_upload' | 'option_select' | 'any'
  nextPhase: (userInput: string, context: StudioContext) => StudioPhase
  statusCardUpdate?: (context: StudioContext) => GarmentStatus[]
}
```

Phase opening messages (write these in Francisca's voice — design-savvy, warm, direct):
- `greeting`: "Hey! Ready to make something great. Here's what you've selected — let's start with the first piece."  → posts initial StatusCard
- `garment_selection`: "Want to add or remove anything from this list before we start?"
- `design_intent`: "What do you have in mind for the [garment]? Tell me the concept, a vibe, or just describe what you're picturing."
- `reference_gathering`: "Love it. Got any reference images? Drop them here — photos, artwork, logos, anything. Or describe what you're visualising and I'll work from that."
- `design_generation`: "On it. Give me a moment…" → triggers generation
- `design_iteration`: "Here's the design. Like the direction? Tell me what you'd change — font, size, placement, colour, anything."
- `garment_application`: "Great, approved! Which pieces from your list gets this design? You can put it on all of them or just some."
- `mockup_generation`: "Perfect. Here's how it looks on the [garment]."
- `approval`: "Happy with this? Say yes and we'll lock it in, or tell me what to tweak."
- `next_item`: "Done! Moving on to the [next garment]. What's the concept for this one?"
- `complete`: "All pieces are ready. Want to add them to your store, get a bulk quote, or review everything first?"

### 4b. Inject studio context into the system prompt
When the chat API receives a request from the studio (detect via `agent === 'francisca'` + `studioPhase` in request body):
1. Read the unified route (`/api/chat/unified/route.ts`).
2. Add `studioPhase?: StudioPhase` and `garmentList?: GarmentStatus[]` to `ChatRequestBody`.
3. Prepend a studio-specific system prompt section:
   ```
   You are Francisca, in the Merch Studio. Current phase: [phase].
   Garment list: [garmentList as compact JSON].
   Stay in character. Guide the user through [phase] only. 
   Do not skip phases. If the user goes off-topic, acknowledge briefly then redirect.
   ```
4. Keep existing persona/knowledge base system prompt — append studio context to it.

### 4c. Phase transition logic in the client
- Track `studioPhase` in `CatChatProvider` state alongside `isStudioMode`.
- After each Francisca response, parse her reply to detect phase advancement signals.
- Simple heuristic first: if the API returns a `nextPhase` field in the response metadata, advance.
- On phase change: Francisca automatically sends the next phase's opening message.
- On phase change: post an updated StatusCard message if `statusCardUpdate` is defined.

**Verification:**
- A fresh studio session opens with the greeting message and a StatusCard showing all garments as `pending`.
- Replying "let's start" advances to `design_intent`.
- The system prompt in network tab includes `Current phase: design_intent`.
- `bun build` passes.

---

## Phase 5: Image Handling in Chat

**Goal:** Users can upload reference images inside the chat. Francisca can send design results and mockup images as tappable image bubbles. All images flow through Cloudinary.

**Files to change:**
- New API route: `app/src/app/api/upload/design-reference/route.ts`
- `app/src/components/chat/ChatInput.tsx` (or equivalent input component)
- `app/src/components/chat/messages/ImageMessage.tsx` (already created in Phase 3)

**What to do:**

### 5a. New upload route: /api/upload/design-reference
Copy the structure from `app/src/app/api/upload/slider/route.ts` (Cloudinary pattern).

Differences from slider upload:
- Cloudinary folder: `merch-from/studio/references/[userId]`
- Max size: 10MB (design files can be larger)
- No resize transform — preserve original dimensions for design work
- Add `auto:good` quality and `f_auto` format
- Auth: verify Clerk session (same as slider route L24-27)
- Return: `{ url, publicId, width, height }`

### 5b. Wire image upload into chat input
1. Read the chat input component (likely inside `CatChat.tsx` or a child).
2. In studio mode only, add a paperclip/image icon button next to the text input.
3. On click: opens native file picker (`accept="image/*"`, `capture="environment"` on mobile for camera option).
4. On file selected:
   - Show a loading state in the input area (thumbnail preview with spinner).
   - POST to `/api/upload/design-reference`.
   - On success: add a user message with `type: 'image_result'` and the Cloudinary URL in `metadata.studioMeta.imageUrl`.
   - Send a follow-up text message summarising the upload: "Here's my reference."
5. Only show the image upload button when `studioPhase` is `reference_gathering` OR when `isStudioMode` is true (Francisca can request uploads at any point).

### 5c. Francisca image outputs
When the unified chat API returns a design or mockup image URL in its response metadata:
- Automatically insert an `image_result` message into the conversation from Francisca.
- Follow it with Francisca's text comment about the design.
- The ImageMessage component (Phase 3) handles the lightbox tap behaviour.

**Verification:**
- In studio mode, the paperclip icon appears in the chat input.
- Uploading a 3MB JPG succeeds and appears as an image bubble in the chat.
- Tapping the image shows a full-screen lightbox.
- Upload fails gracefully with an error message (not a crash) for files > 10MB.
- `bun build` passes.

---

## Phase 6: Project Status Card (Persistent Inline Summary)

**Goal:** A pinned status card at the top of the studio chat shows all garments and their current design state. Francisca also re-posts a compact version of this card at phase transitions so the user never loses track of progress.

**Files to change:**
- `app/src/components/chat/StudioChatHeader.tsx` (new — pinned header in full-screen mode)
- `app/src/components/chat/messages/StudioStatusCard.tsx` (created in Phase 3)
- `app/src/components/chat/CatChat.tsx` (add header in studio mode)
- `app/src/lib/ai/studioFlow.ts` (auto-post card on phase transitions)

**What to do:**

### 6a. Pinned studio header
In studio full-screen mode, add a sticky header above the message list:
- Left: Francisca avatar (small, 32px) + "Merch Studio" label.
- Centre: compact garment progress `3 of 5 pieces approved` (counts from `studioContext.garmentList`).
- Right: exit button (→ calls `exitStudioMode()`).
- Styled with `backdrop-blur` and a subtle `border-b` — does not scroll with messages.

### 6b. Auto-post StatusCard on phase transitions
In `studioFlow.ts`, phases that trigger a StatusCard post:
- `greeting` → initial card (all pending)
- `garment_application` → card updated (current item moves to in_progress)
- `approval` → card updated (approved item moves to ✓)
- `next_item` → card updated (next item becomes in_progress)
- `complete` → final card (all items shown with final state)

The card is posted as a Francisca message of `type: 'status_card'` in `metadata.studioMeta.statusCard`. It does NOT replace previous cards — it's a new message, so the user can scroll up and see the history of progress.

### 6c. Status card visual design
- `StudioStatusCard.tsx` renders:
  - Title: "Your Studio Session" in small caps
  - Garment rows: `[status icon] [garment name] [sku]` on each row
  - Status icons: `CheckCircle` (green, Lucide) for approved, `Loader2` (purple, spinning) for in_progress, `Circle` (zinc-500) for pending
  - Subtle purple-tinted card background matching Francisca's brand colour
  - Max-height with internal scroll if > 6 garments

**Verification:**
- Opening studio shows a StatusCard as the first message (all pending).
- After approving a design, a new StatusCard appears showing one item as `approved`.
- The pinned header shows correct progress count.
- Card renders correctly on 375px (iPhone SE) viewport.

---

## Phase 7: Studio Conversation Persistence (localStorage → Database)

**Goal:** Move studio chat sessions from localStorage (24h expiry) to the Neon `chatSessions` table (persistent, linked to Clerk userId). This enables cross-device access and long-running sessions.

**Files to change:**
- New API route: `app/src/app/api/studio/session/route.ts`
- `app/src/lib/sessionPersistence.ts` (add studio session DB functions)
- `app/src/components/chat/CatChatProvider.tsx` (load/save via API instead of localStorage)

**What to do:**

### 7a. New API route: /api/studio/session
Endpoints (single route file with method branching):
- `GET /api/studio/session` → returns the user's most recent active studio session (from `chatSessions` table, filtered by `messages[].agent = 'francisca'` + studio metadata)
- `POST /api/studio/session` → creates a new session via `createChatSession()` from `src/db/chat.ts`
- `PATCH /api/studio/session/:id` → appends messages via `addMessageToSession()`
- Auth: Clerk `auth()` server-side — reject unauthenticated requests with 401

Studio-specific metadata stored in the JSONB `messages` array alongside standard `ChatMessage` fields:
```typescript
// First message in every studio session is a metadata sentinel
{
  id: 'studio-meta',
  role: 'system',
  content: '',
  metadata: {
    studioMeta: {
      phase: StudioPhase,
      garmentList: GarmentStatus[],
      createdAt: string,
      lastActiveAt: string
    }
  }
}
```

### 7b. Provider integration
In `CatChatProvider.tsx`:
1. On `enterStudioMode()`: fetch `GET /api/studio/session`.
   - If an existing session is returned: restore messages into state, restore `studioPhase` and `garmentList` from the sentinel metadata message.
   - If no session: call `POST /api/studio/session` to create one, then emit the greeting message.
2. After every message exchange in studio mode: call `PATCH /api/studio/session/:id` to append new messages (debounce 2 seconds to avoid hammering the DB).
3. On `exitStudioMode()`: flush any pending messages immediately.

### 7c. Migration
- Keep localStorage fallback for unauthenticated users (guest mode — use localStorage as before).
- For authenticated users, DB is authoritative; localStorage is ignored.
- No migration of old localStorage data to DB required.

**Verification:**
- Open studio, send 3 messages. Close browser. Reopen `/app/studio` — conversation restores.
- `getUserChatSessions(userId)` returns the studio session in psql.
- Unauthenticated users still get localStorage behaviour (no crash).
- `bun build` passes.

---

## Phase 8: Conversation Story Integration (Cross-Session Memory)

**Goal:** The "Conversation Story" icon (`lucide:rotate-ccw`) in the left panel opens `SessionHistory.tsx` and shows ALL past studio sessions, not just the current one. Tapping a session restores it into the full-screen chat.

**Files to change:**
- `app/src/components/SessionHistory.tsx`
- `app/src/components/layout/IconStripNav.tsx` (update icon label/tooltip)
- `app/src/components/chat/CatChatProvider.tsx` (add `loadSession(sessionId)` action)

**What to do:**

### 8a. Extend SessionHistory.tsx
1. Read `SessionHistory.tsx` in full.
2. Currently: reads from a `HistoryContext` (likely localStorage). Change: fetch from `GET /api/studio/session` (returns all sessions, not just latest — add `?all=true` query param support to the route created in Phase 7).
3. For each studio session, render a card showing:
   - Francisca avatar (small) + "Merch Studio" label
   - Date/time of last activity
   - Progress summary: "3 of 5 pieces approved"
   - First garment name as subtitle preview
4. Visually distinguish studio sessions from regular chat sessions (purple Francisca accent vs. standard chat styling).
5. Tap a session card → calls `loadSession(sessionId)` and opens studio full-screen mode.

### 8b. Add loadSession to provider
In `CatChatProvider.tsx`:
1. Add `loadSession(sessionId: string): Promise<void>` to the context interface.
2. Implementation: fetch the session from DB, restore messages and studio metadata into state, call `enterStudioMode()`.

### 8c. Update the icon tooltip
In `IconStripNav.tsx` at L301-334:
- Update the tooltip/aria-label from "Session History" to "Conversation Story" to match the product language.
- Icon stays as `lucide:rotate-ccw` (no change needed).

### 8d. Memory continuity prompt injection
When loading a past session in the unified API (Phase 4, step 4b):
- Append a "memory context" block to the system prompt:
  ```
  Previous session summary:
  - [garmentList items with their last known status]
  - Last active phase: [phase]
  - Last message: [final message content truncated to 200 chars]
  Welcome back the user and continue naturally.
  ```
- This gives Francisca the context to say "Welcome back! Last time we were working on your hoodie design — want to pick up where we left off?"

**Verification:**
- Create a studio session, approve 2 garments, exit.
- Open Conversation Story panel — previous session appears with "2 of 5 approved".
- Tapping it restores the full-screen chat with all previous messages.
- Francisca's welcome-back message references the correct progress.
- On mobile (375px), SessionHistory panel is scrollable and sessions are tap-friendly (min 48px height per card).

---

## Final Phase: Verification & Build Check

**Goal:** Confirm the entire refactor is coherent, type-safe, and builds cleanly.

### Checks to run in sequence:
```bash
# Type checking
cd app && bun tsc --noEmit

# Lint
cd app && bun lint

# Build
cd app && bun build

# Grep for removed split-panel code (should return 0 results)
grep -r "GarmentCanvas\|StudioToolbar\|GarmentCarousel" app/src/app/app/studio/

# Confirm new routes exist
ls app/src/app/api/upload/design-reference/
ls app/src/app/api/studio/session/

# Confirm new components exist
ls app/src/components/chat/messages/
ls app/src/components/chat/StudioChatHeader.tsx
```

### Manual smoke test (do these after build):
- [ ] Navigate to `/app/studio` → full-screen chat opens with Francisca greeting
- [ ] Send a message → Francisca responds in-phase
- [ ] Upload an image → appears as image bubble, tap opens lightbox
- [ ] StatusCard appears at start and updates on phase transitions
- [ ] Exit studio → returns to dashboard, chat collapses
- [ ] Open Conversation Story panel → past session appears
- [ ] Tap past session → restores conversation

---

## Execution Order

| Phase | Estimated effort | Depends on |
|---|---|---|
| 1 — Strip split-panel | 30 min | — |
| 2 — Full-screen chat mode | 2h | Phase 1 |
| 3 — Message types | 2h | Phase 2 |
| 4 — Francisca flow | 3h | Phase 3 |
| 5 — Image handling | 2h | Phase 3 |
| 6 — Status card | 1h | Phases 3, 4 |
| 7 — DB persistence | 2h | Phase 4 |
| 8 — Conversation Story | 1.5h | Phase 7 |
| Final — Verification | 30 min | All |

**Total estimated: ~14 hours of implementation**

---

## What We Are NOT Doing

- No live canvas / real-time mockup panel (by design)
- No changes to Leopoldo or Antonia flows
- No changes to `/mainpage` (marketing site)
- No changes to Drizzle schema (chatSessions table already fits our needs)
- No changes to the voice pipeline (voice works within the same chat input)
