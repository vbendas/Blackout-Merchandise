# Chat-First MerchStudio Implementation Plan

> **Author:** Claude Opus 4 + Victor
> **Date:** February 10, 2026
> **Target:** Kimi K2.5 Implementation
> **Repository:** /path/to/blackout-merchandise

---

## Overview

Replace the split-panel MerchStudio (MockupViewer + StudioChat) with a **fully conversational design experience** inside the existing chat system (FloatingAssistant + UnifiedBottomBar). Every design action -- uploads, AI generation, transformations, mockup previews, approvals -- happens as rich message cards inside chat bubbles.

### Guiding Principle
**Everything is a message.** No separate studio view. No interactive canvas. The chat IS the studio.

---

## Important Context

### Package Manager
- `/app` uses **Bun** (`bun install`, `bun dev`, `bun build`)
- Run `bun build` after all changes to verify

### Tech Stack
- Next.js 16.x with App Router, React 19.x, TypeScript strict mode
- Framer Motion for animations
- Tailwind CSS v4
- Cloudinary for image CDN + transformations
- All AI responses are currently MOCKED (no real LLM integration yet)

### Existing Chat Architecture
- `ChatContext.tsx` -- global chat state (messages, agents, open/close)
- `FloatingAssistant.tsx` -- renders floating message bubbles above the bottom bar
- `UnifiedBottomBar.tsx` -- fixed bottom bar with quick action pills + text input
- Three AI agents: Leopoldo (admin), **Francisca** (design), Antonia (support)
- Agent auto-detection via keyword scoring in messages

### File Naming Conventions
- **PascalCase.tsx** for React components
- **kebab-case.tsx** for utilities/providers
- **camelCase.ts** for pure logic files

---

## What Gets Removed
- `MockupViewer.tsx` (interactive canvas with zoom/pan)
- `DesignOverlay.tsx` (drag-to-move/resize)
- `BlackoutMerchStudio.tsx` (split-panel orchestrator)
- `StudioChat.tsx` (separate chat with own state)
- `StudioHeader.tsx` (studio top bar)
- `StudioProgressBar.tsx`
- The `chatState === 'studio'` branch in `workspace/page.tsx`
- The 6-step `StudioStep` workflow concept from `StudioContext`

## What Gets Kept/Repurposed
- `ChatContext.tsx` (becomes the single source of truth for all conversation)
- `FloatingAssistant.tsx` (renders all messages including rich cards)
- `UnifiedBottomBar.tsx` (contextual quick actions + input)
- `DesignUploadZone.tsx` (repurposed as overlay triggered from chat)
- All transformation types/categories from `types/transformations.ts`
- `cloudinary/transformations.ts` (URL building for transformations)
- `colorClustering.ts`, `halftone.ts`, `printProcessing.ts` (print pipeline)
- `usePricing.ts` hook
- `summaryGenerator.ts`
- Inline chat cards: `DesignCardInline`, `MockupCardInline`, `ProductCardInline`
- `PrintPreparationModal.tsx` (final step)
- `AdjustmentSlider.tsx` (brightness/contrast/saturation)
- AI response templates: `franciscaResponses.ts`, `quickActionResponses.ts`

---

## Batch 1: Foundation (Extend Message System + Design Flow State)

### Task 1.1: Extend `Message` type in ChatContext

**File:** `app/src/lib/ChatContext.tsx`

Add the following types ABOVE the existing `Message` interface (around line 8):

```typescript
// Rich message content types
export type MessageContentType =
  | 'text'               // Plain text (default)
  | 'image'              // Design image (uploaded or AI-generated)
  | 'mockup'             // Product mockup with design applied
  | 'upload-prompt'      // Upload CTA with drag-drop zone
  | 'action-buttons'     // Inline action buttons
  | 'transformation'     // Before/after transformation result
  | 'price-summary'      // Price breakdown card
  | 'color-separation'   // Color separation preview
  | 'product-select';    // Product selection carousel

// Inline action button definition
export interface InlineChatAction {
  id: string;
  label: string;
  icon?: string;         // Iconify icon name (e.g. 'lucide:upload')
  variant: 'primary' | 'secondary' | 'outline';
  action: string;        // Message text to send when clicked
}

// Attachment data for rich messages
export interface MessageAttachment {
  type: MessageContentType;
  imageUrl?: string;           // For 'image', 'mockup'
  beforeUrl?: string;          // For 'transformation'
  afterUrl?: string;           // For 'transformation'
  transformationName?: string; // For 'transformation' (e.g. "Remove Background")
  actions?: InlineChatAction[];// For 'action-buttons', also used on other types
  pricingData?: {
    basePrice: number;
    placementPrice: number;
    colorPrice: number;
    total: number;
    breakdown: string[];
  };
  colorData?: Array<{
    name: string;
    hex: string;
    pantone: string;
    visible: boolean;
  }>;
  productData?: {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
    colors: Array<{ name: string; hex: string }>;
  };
}

// Design workflow step tracking
export type DesignFlowStep =
  | 'idle'              // No design in progress
  | 'product-selected'  // Product chosen, awaiting design intent
  | 'awaiting-upload'   // Waiting for user to upload artwork
  | 'awaiting-prompt'   // Waiting for AI generation prompt
  | 'design-received'   // Design uploaded/generated, show transformation options
  | 'transforming'      // Transformation in progress
  | 'placement-review'  // Reviewing design on product mockup
  | 'approval'          // Final approval step
  | 'processing';       // Print file generation
```

Modify the existing `Message` interface to add optional attachment:

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent: ChatAgent;
  timestamp: Date;
  attachment?: MessageAttachment;  // NEW
}
```

Add to `ChatState`:

```typescript
export interface ChatState {
  messages: Message[];
  currentAgent: ChatAgent;
  isOpen: boolean;
  unreadCount: number;
  isTyping: boolean;
  sessionHistory: ChatSession[];
  designFlowStep: DesignFlowStep;     // NEW
  currentDesignUrl: string | null;      // NEW
  currentProductId: string | null;      // NEW
}
```

Add to `ChatActions`:

```typescript
export interface ChatActions {
  sendMessage: (content: string, attachment?: MessageAttachment) => void; // MODIFIED
  sendSystemMessage: (content: string, attachment?: MessageAttachment) => void; // NEW
  openChat: (customMessage?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  switchAgent: (agent: ChatAgent) => void;
  clearHistory: () => void;
  saveSession: () => void;
  setTyping: (typing: boolean) => void;
  markAsRead: () => void;
  setDesignFlowStep: (step: DesignFlowStep) => void;  // NEW
  setCurrentDesign: (url: string | null) => void;       // NEW
  setCurrentProduct: (id: string | null) => void;       // NEW
}
```

Update the `ChatProvider` to:
- Initialize `designFlowStep: 'idle'`, `currentDesignUrl: null`, `currentProductId: null`
- Modify `sendMessage` to accept optional `attachment` parameter
- Add `sendSystemMessage` -- same as sendMessage but with `role: 'assistant'` and auto-sets the current agent
- Add the 3 new setter functions
- Include all new state in the context value

**Acceptance Criteria:**
- All existing chat functionality works unchanged
- New fields available via `useChat()` hook
- `sendMessage('hello', { type: 'image', imageUrl: '...' })` creates a message with attachment
- `sendSystemMessage('Welcome!', { type: 'action-buttons', actions: [...] })` creates assistant message
- TypeScript compiles with no errors

---

### Task 1.2: Create Design Flow Step Machine

**File:** `app/src/lib/designFlow.ts` (NEW)

```typescript
import type { DesignFlowStep, InlineChatAction } from './ChatContext';

// Define valid transitions
const VALID_TRANSITIONS: Record<DesignFlowStep, DesignFlowStep[]> = {
  'idle': ['product-selected'],
  'product-selected': ['awaiting-upload', 'awaiting-prompt', 'idle'],
  'awaiting-upload': ['design-received', 'product-selected', 'idle'],
  'awaiting-prompt': ['design-received', 'product-selected', 'idle'],
  'design-received': ['transforming', 'placement-review', 'idle'],
  'transforming': ['design-received', 'placement-review', 'idle'],
  'placement-review': ['approval', 'design-received', 'transforming', 'idle'],
  'approval': ['processing', 'design-received', 'placement-review', 'idle'],
  'processing': ['idle'],
};

export function canTransition(from: DesignFlowStep, to: DesignFlowStep): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// Quick actions per step
export function getQuickActionsForStep(step: DesignFlowStep): InlineChatAction[] {
  switch (step) {
    case 'idle':
      return [
        { id: 'browse', label: 'Browse catalog', icon: 'lucide:shirt', variant: 'secondary', action: 'Show me the catalog' },
        { id: 'upload', label: 'Upload artwork', icon: 'lucide:upload', variant: 'primary', action: 'I want to upload my artwork' },
        { id: 'create', label: 'Create a design', icon: 'lucide:sparkles', variant: 'primary', action: 'I want to create a design' },
        { id: 'orders', label: 'My orders', icon: 'lucide:package', variant: 'secondary', action: 'Show my orders' },
      ];
    case 'product-selected':
      return [
        { id: 'upload', label: 'Upload artwork', icon: 'lucide:upload', variant: 'primary', action: 'I want to upload my artwork' },
        { id: 'create-ai', label: 'Create with AI', icon: 'lucide:sparkles', variant: 'primary', action: 'Create a design with AI' },
        { id: 'change', label: 'Change product', icon: 'lucide:arrow-left', variant: 'secondary', action: 'I want to change the product' },
      ];
    case 'awaiting-upload':
      return [
        { id: 'upload', label: 'Upload file', icon: 'lucide:upload', variant: 'primary', action: '__TRIGGER_UPLOAD__' },
        { id: 'cancel', label: 'Cancel', icon: 'lucide:x', variant: 'outline', action: 'Cancel upload' },
      ];
    case 'design-received':
      return [
        { id: 'remove-bg', label: 'Remove background', icon: 'lucide:eraser', variant: 'secondary', action: 'Remove the background' },
        { id: 'enhance', label: 'Enhance', icon: 'lucide:zap', variant: 'secondary', action: 'Enhance the image' },
        { id: 'flip', label: 'Flip', icon: 'lucide:flip-horizontal', variant: 'secondary', action: 'Flip the design' },
        { id: 'effects', label: 'Add effect', icon: 'lucide:wand-2', variant: 'secondary', action: 'Show me effects' },
        { id: 'adjust', label: 'Adjust colors', icon: 'lucide:sliders-horizontal', variant: 'secondary', action: 'Adjust colors' },
        { id: 'approve', label: 'Approve design', icon: 'lucide:check', variant: 'primary', action: 'I approve this design' },
      ];
    case 'transforming':
      return [
        { id: 'undo', label: 'Undo', icon: 'lucide:undo-2', variant: 'secondary', action: 'Undo that change' },
        { id: 'more', label: 'More edits', icon: 'lucide:plus', variant: 'secondary', action: 'I want to make more edits' },
        { id: 'approve', label: 'Approve result', icon: 'lucide:check', variant: 'primary', action: 'I approve this design' },
        { id: 'restart', label: 'Start over', icon: 'lucide:refresh-cw', variant: 'outline', action: 'Start over with the design' },
      ];
    case 'placement-review':
      return [
        { id: 'adjust', label: 'Adjust placement', icon: 'lucide:move', variant: 'secondary', action: 'Adjust the placement' },
        { id: 'size', label: 'Change size', icon: 'lucide:maximize-2', variant: 'secondary', action: 'Change the design size' },
        { id: 'approve', label: 'Approve mockup', icon: 'lucide:check', variant: 'primary', action: 'Approve this mockup' },
        { id: 'different', label: 'Try different product', icon: 'lucide:shirt', variant: 'outline', action: 'Try a different product' },
      ];
    case 'approval':
      return [
        { id: 'confirm', label: 'Confirm & process', icon: 'lucide:check-circle', variant: 'primary', action: 'Confirm and process my order' },
        { id: 'changes', label: 'Request changes', icon: 'lucide:edit-3', variant: 'secondary', action: 'I want to make changes' },
        { id: 'add-more', label: 'Add more products', icon: 'lucide:plus-circle', variant: 'outline', action: 'Add more products' },
      ];
    case 'awaiting-prompt':
      return [
        { id: 'cancel', label: 'Cancel', icon: 'lucide:x', variant: 'outline', action: 'Cancel' },
      ];
    case 'processing':
      return [];
    default:
      return [];
  }
}
```

**Acceptance Criteria:**
- `canTransition('idle', 'product-selected')` returns true
- `canTransition('idle', 'processing')` returns false
- `getQuickActionsForStep('design-received')` returns 6 actions
- `getQuickActionsForStep('processing')` returns empty array
- TypeScript compiles with no errors

---

## Batch 2: Rich Message Rendering

### Task 2.1: Create ChatMessageRenderer

**File:** `app/src/components/assistant/ChatMessageRenderer.tsx` (NEW)

This component receives a `Message` and renders the appropriate content. It replaces the plain `<p>` tag currently used in `FloatingAssistant.tsx`.

```typescript
interface ChatMessageRendererProps {
  message: Message;
  onAction?: (actionText: string) => void;
}
```

**Rendering logic:**
- If `message.attachment` is undefined -> render plain text `<p>` (existing behavior)
- Always render `message.content` as text first (if not empty)
- Then render card based on `message.attachment.type`:
  - `'image'` -> `ImageMessageCard`
  - `'mockup'` -> `ImageMessageCard` with mockup styling
  - `'upload-prompt'` -> `UploadPromptCard`
  - `'action-buttons'` -> `InlineActionButtons`
  - `'transformation'` -> `TransformationResultCard`
  - `'price-summary'` -> `PriceSummaryCard`
  - `'color-separation'` -> `ColorSeparationCard`
  - `'product-select'` -> existing `ProductCardInline`
- If attachment also has `actions` array, render `InlineActionButtons` below the card

**Acceptance Criteria:**
- Plain text messages render identically to current behavior
- Messages with attachments render both text + card
- `onAction` callback fires when inline buttons are clicked
- All cards respect the chat bubble styling

---

### Task 2.2: Create Inline Card Components

**Directory:** `app/src/components/assistant/cards/` (NEW)

#### 2.2.1 `ImageMessageCard.tsx`
- Full-width image within chat bubble
- Rounded corners (`rounded-xl`), subtle border (`border-white/10`)
- Loading skeleton while image loads (use useState for load state)
- Optional badge: "AI Generated" (purple) or "Uploaded" (zinc)
- Max height 300px, `object-contain` with `bg-zinc-900` background
- Click to view full-size is optional (not required for MVP)

```typescript
interface ImageMessageCardProps {
  imageUrl: string;
  alt?: string;
  badge?: 'ai-generated' | 'uploaded';
}
```

#### 2.2.2 `UploadPromptCard.tsx`
- Dashed border zone (`border-dashed border-2 border-white/20`)
- Upload icon + "Drop your artwork here" text
- "Browse files" button (glass morphism style)
- Accepts: `image/png,image/jpeg,image/svg+xml,.psd,.ai`
- Drag-and-drop support (onDragOver, onDrop handlers)
- On file selected -> calls `onFileSelected(file: File)` callback

```typescript
interface UploadPromptCardProps {
  onFileSelected: (file: File) => void;
}
```

#### 2.2.3 `TransformationResultCard.tsx`
- Two images side by side (50/50 split, `grid grid-cols-2 gap-2`)
- "Before" / "After" labels (`text-xs text-zinc-500`)
- Transformation name as badge at top (`bg-purple-500/20 text-purple-200`)
- Both images: `rounded-lg`, same max height, `object-contain`

```typescript
interface TransformationResultCardProps {
  beforeUrl: string;
  afterUrl: string;
  transformationName: string;
}
```

#### 2.2.4 `PriceSummaryCard.tsx`
- Card with `bg-zinc-800/50 border border-white/10 rounded-xl p-4`
- Line items as `flex justify-between` rows
- Divider: `border-t border-white/10 my-2`
- Bold total at bottom
- Currency: EUR format

```typescript
interface PriceSummaryCardProps {
  basePrice: number;
  placementPrice: number;
  colorPrice: number;
  total: number;
  breakdown: string[];
}
```

#### 2.2.5 `ColorSeparationCard.tsx`
- Header: "X colors detected"
- Grid of color swatches: `grid grid-cols-2 gap-2`
- Each: circle swatch (16px) + name + Pantone code
- Dark theme styling

```typescript
interface ColorSeparationCardProps {
  colors: Array<{ name: string; hex: string; pantone: string }>;
}
```

#### 2.2.6 `InlineActionButtons.tsx`
- `flex flex-wrap gap-2` container
- Primary: `bg-white/90 text-zinc-900 hover:bg-white`
- Secondary: `bg-zinc-800/60 border border-white/10 text-zinc-300 hover:bg-zinc-700/60`
- Outline: `border border-white/20 text-zinc-400 hover:text-white`
- Optional Iconify icon before label
- `whileTap={{ scale: 0.95 }}` with Framer Motion
- On click -> calls `onAction(action.action)`

```typescript
interface InlineActionButtonsProps {
  actions: InlineChatAction[];
  onAction: (actionText: string) => void;
}
```

#### 2.2.7 `cards/index.ts`
Barrel export all 6 card components.

**Acceptance Criteria for ALL cards:**
- Dark theme matching existing glass morphism aesthetic
- Responsive within chat bubble constraints
- No external UI libraries beyond what's installed (Tailwind, Framer Motion, Iconify)

---

### Task 2.3: Update FloatingAssistant to Use ChatMessageRenderer

**File:** `app/src/components/assistant/FloatingAssistant.tsx`

**Current code (approximately line 228):**
```tsx
<p className="text-sm leading-relaxed break-words">{message.content}</p>
```

**Replace with:**
```tsx
<ChatMessageRenderer
  message={message}
  onAction={(actionText) => {
    if (actionText === '__TRIGGER_UPLOAD__') {
      // Trigger file upload (handled by UnifiedBottomBar's file input)
      return;
    }
    sendMessage(actionText);
  }}
/>
```

Import `ChatMessageRenderer` and add `sendMessage` to the `useChat()` destructure (already available).

**Acceptance Criteria:**
- Existing plain text messages render unchanged
- Rich messages render cards inside bubbles
- Clicking inline action buttons sends messages
- No visual regression

---

## Batch 3: Contextual Quick Actions

### Task 3.1: Make UnifiedBottomBar Contextual

**File:** `app/src/components/layout/UnifiedBottomBar.tsx`

**Changes:**
1. Import `getQuickActionsForStep` from `@/lib/designFlow`
2. Get `designFlowStep` from `useChat()`
3. Derive quick actions contextually:

```typescript
const { currentAgent, sendMessage, openChat, designFlowStep } = useChat();

const quickActions = currentAgent === 'Francisca'
  ? getQuickActionsForStep(designFlowStep).map(a => ({
      label: a.label,
      action: a.action,
    }))
  : QUICK_ACTIONS[currentAgent];
```

4. Keep existing `QUICK_ACTIONS` for Leopoldo and Antonia.

**Acceptance Criteria:**
- Francisca + idle: shows "Browse catalog", "Upload artwork", "Create a design", "My orders"
- Francisca + design-received: shows transformation actions
- Leopoldo/Antonia: unchanged
- Quick actions trigger `sendMessage()`

---

### Task 3.2: Add File Attachment Button

**File:** `app/src/components/layout/UnifiedBottomBar.tsx`

Add paperclip button LEFT of the textarea:

```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => fileInputRef.current?.click()}
  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/5 bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-all"
>
  <Icon icon="lucide:paperclip" className="w-4 h-4" />
</motion.button>
<input
  ref={fileInputRef}
  type="file"
  accept="image/png,image/jpeg,image/svg+xml,.psd,.ai"
  className="hidden"
  onChange={handleFileUpload}
/>
```

Add `fileInputRef = useRef<HTMLInputElement>(null)`.

`handleFileUpload`:
1. Get file from event
2. Create blob URL: `URL.createObjectURL(file)`
3. Send message with image attachment
4. Switch to Francisca if not already
5. Set `designFlowStep` to `'design-received'`

**Acceptance Criteria:**
- Paperclip button visible next to text input
- File picker opens on click
- Image appears in chat
- Flow transitions to design-received

---

## Batch 4: Francisca Conversational Flow

### Task 4.1: Proactive Greeting

**File:** `app/src/lib/ChatContext.tsx`

When `designFlowStep` transitions to `'product-selected'`, auto-send:
1. Greeting: "Hi! I'm Francisca, your design assistant. Let's create something amazing!"
2. Action prompt with `upload-prompt` and `create-with-ai` buttons

**Acceptance Criteria:**
- Product selection triggers greeting
- Two action buttons appear in chat
- Chat opens automatically

---

### Task 4.2: Upload Flow

When user says "I want to upload my artwork":
1. Set step to `'awaiting-upload'`
2. Respond with `upload-prompt` attachment

When file is uploaded (message has `type: 'image'` attachment):
1. Set step to `'design-received'`
2. Set `currentDesignUrl`
3. Respond with design-received action buttons

**Acceptance Criteria:**
- Upload prompt appears in chat
- File upload creates image message
- Francisca responds with options

---

### Task 4.3: AI Generation Flow

When user says "Create a design with AI":
1. Set step to `'awaiting-prompt'`
2. Ask for description

When user sends description:
1. Show typing indicator 2-3 seconds
2. Set step to `'design-received'`
3. Respond with placeholder image + actions

**Use placeholder:** `https://placehold.co/800x800/1a1a2e/e94560?text=AI+Generated+Design`

**Acceptance Criteria:**
- Prompt triggers description request
- Description triggers placeholder image
- Design-received actions appear

---

### Task 4.4: Transformation Flow

When user requests transformation (e.g. "Remove the background"):
1. Detect type via keywords matching `TRANSFORMATION_LABELS`
2. Typing indicator 1-2 seconds
3. Build transformed URL via `buildTransformedUrl()` from `lib/cloudinary`
4. Respond with `transformation` attachment (before/after)
5. Update `currentDesignUrl`

Use response templates from `franciscaResponses.ts`.

**Acceptance Criteria:**
- Transformation keywords detected
- Before/after card shows
- `currentDesignUrl` updated
- Francisca responses use existing templates

---

### Task 4.5: Mockup Preview

When user approves design ("I approve this design"):
1. Set step to `'placement-review'`
2. Respond with mockup image (placeholder)
3. Show placement-review actions

**Placeholder:** `https://placehold.co/800x1000/2d2d3d/ffffff?text=Product+Mockup`

---

### Task 4.6: Approval & Pricing

When user approves mockup:
1. Set step to `'approval'`
2. Respond with `price-summary` attachment (mock data)
3. Show approval actions

When user confirms:
1. Set step to `'processing'`
2. Trigger `PrintPreparationModal` (existing component)
3. On completion, reset to `'idle'`

---

## Batch 5: Cleanup

### Task 5.1: Delete Studio Split-Panel Components

**Delete these files:**
- `app/src/components/studio/MockupViewer.tsx`
- `app/src/components/studio/DesignOverlay.tsx`
- `app/src/components/studio/StudioChat.tsx`
- `app/src/components/studio/BlackoutMerchStudio.tsx`
- `app/src/components/studio/StudioHeader.tsx`
- `app/src/components/studio/StudioProgressBar.tsx`
- `app/src/components/studio/HalftonePreview.tsx`
- `app/src/components/studio/PrintAreaTabs.tsx`
- `app/src/components/studio/AddPlacementModal.tsx`
- `app/src/components/studio/StyleCarousel.tsx`
- `app/src/components/studio/ColorSeparationView.tsx`

### Task 5.2: Update workspace/page.tsx

**File:** `app/src/app/app/workspace/page.tsx`

- Remove the `chatState === 'studio'` rendering branch
- Remove imports for deleted components
- Remove studio-specific local state

### Task 5.3: Slim Down StudioContext

**File:** `app/src/lib/StudioContext.tsx`

Remove: zoom, pan, overlay drag/resize, print area tabs, 6-step workflow, auto-save.
Keep: transformation history (undo/redo), color separation data.
If remaining state is <100 lines, fold into ChatContext. Otherwise create slim `DesignStateContext.tsx`.

### Task 5.4: Update NavigationContext

**File:** `app/src/lib/NavigationContext.tsx`

Remove `'studio'` from `ChatState` type union.

### Task 5.5: Update Barrel Exports

**File:** `app/src/components/studio/index.ts` -- keep only: AdjustmentSlider, PrintPreparationModal, TransformationMenu, TransformationPreview, LoadingIndicator, QuickActionsBar.

**File:** `app/src/components/assistant/index.ts` -- add `ChatMessageRenderer`.

### Task 5.6: Clean Up Layout

**File:** `app/src/app/app/layout.tsx`

Remove `StudioProvider` from provider hierarchy if StudioContext was fully removed.

---

## File Change Summary

### New Files (10)
| File | Purpose |
|------|---------|
| `app/src/lib/designFlow.ts` | Design flow step machine + transitions |
| `app/src/components/assistant/ChatMessageRenderer.tsx` | Rich message type router |
| `app/src/components/assistant/cards/ImageMessageCard.tsx` | Full-width design image in chat |
| `app/src/components/assistant/cards/UploadPromptCard.tsx` | Inline upload CTA |
| `app/src/components/assistant/cards/TransformationResultCard.tsx` | Before/after comparison |
| `app/src/components/assistant/cards/PriceSummaryCard.tsx` | Price breakdown |
| `app/src/components/assistant/cards/ColorSeparationCard.tsx` | Color sep preview |
| `app/src/components/assistant/cards/InlineActionButtons.tsx` | Action button row |
| `app/src/components/assistant/cards/index.ts` | Barrel exports |
| `app/src/components/assistant/ChatUploadOverlay.tsx` | Inline file upload in chat |

### Modified Files (7)
| File | Changes |
|------|---------|
| `app/src/lib/ChatContext.tsx` | Add MessageAttachment, DesignFlowStep, design state, sendSystemMessage |
| `app/src/components/assistant/FloatingAssistant.tsx` | Use ChatMessageRenderer instead of plain `<p>` |
| `app/src/components/layout/UnifiedBottomBar.tsx` | Contextual quick actions + file attachment button |
| `app/src/app/app/workspace/page.tsx` | Remove 'studio' case |
| `app/src/lib/StudioContext.tsx` | Slim down or remove |
| `app/src/lib/NavigationContext.tsx` | Remove 'studio' from ChatState |
| `app/src/components/assistant/index.ts` | Add ChatMessageRenderer export |

### Deleted Files (11)
| File | Reason |
|------|--------|
| `app/src/components/studio/MockupViewer.tsx` | Replaced by mockup cards in chat |
| `app/src/components/studio/DesignOverlay.tsx` | No interactive canvas |
| `app/src/components/studio/StudioChat.tsx` | Replaced by FloatingAssistant |
| `app/src/components/studio/BlackoutMerchStudio.tsx` | No split-panel layout |
| `app/src/components/studio/StudioHeader.tsx` | No studio header bar |
| `app/src/components/studio/StudioProgressBar.tsx` | No progress bar |
| `app/src/components/studio/HalftonePreview.tsx` | CSS overlay for canvas |
| `app/src/components/studio/PrintAreaTabs.tsx` | Replaced by chat flow |
| `app/src/components/studio/AddPlacementModal.tsx` | Replaced by chat prompts |
| `app/src/components/studio/StyleCarousel.tsx` | Replaced by inline style pills |
| `app/src/components/studio/ColorSeparationView.tsx` | Replaced by ColorSeparationCard |

---

## Overall Acceptance Criteria

1. **`bun build` passes** with no TypeScript errors
2. **No visual regression** for Leopoldo and Antonia chat flows
3. **Francisca design flow** works end-to-end via chat:
   - Product selection triggers greeting
   - Upload artwork shows image in chat
   - Transformations show before/after
   - Mockup preview shows in chat
   - Pricing summary shows in chat
   - Processing triggers PrintPreparationModal
4. **Quick actions** in bottom bar change based on design workflow step
5. **Click outside** closes chat (existing behavior preserved)
6. **ESC key** closes chat (existing behavior preserved)
7. **All deleted components** have no remaining imports in the codebase
8. **Dark theme only** -- all new cards match existing glass morphism aesthetic

---

## Implementation Notes for Kimi K2.5

1. **Start with Batch 1** -- the type extensions are the foundation
2. **Batch 2 can be partially parallelized** -- card components are independent
3. **Batch 3 depends on Batch 1** -- needs `designFlowStep` from ChatContext
4. **Batch 4 depends on Batches 1-3** -- uses types, cards, and contextual actions
5. **Batch 5 (cleanup) should be LAST** -- don't delete until new system works
6. **Use placeholder images** everywhere -- real AI integration comes later
7. **Use existing response templates** from `franciscaResponses.ts` and `quickActionResponses.ts`
8. **Test each batch** with `bun build` before moving to next
9. **Preserve all existing agent detection** -- Leopoldo/Antonia must not break
10. **`__TRIGGER_UPLOAD__`** is a sentinel action string -- trigger file input instead of sending message
