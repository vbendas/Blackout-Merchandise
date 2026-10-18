# Implementation Plan: Unified AI Assistant & Collapsible Navigation

## Overview
Transform the fragmented chat experience into a unified, floating AI assistant that persists across all views, while collapsing the navigation to maximize workspace.

**Status:** Ready for Implementation  
**Estimated Time:** 24-30 hours  
**Created:** February 8, 2026  

---

## Architecture Changes

### Before (Current)
```
Sidebar (280px fixed)
├── Avatar (Leopoldo/Francisca/Antônia)
├── "Talk to X" button
├── NavigationMenu
└── User menu

Main Content
├── Multiple chat states (empty/active/catalog/eshop/support/studio)
├── Separate AI sidebars
└── Context switching confusion
```

### After (New)
```
CollapsibleNav (64px closed / 200px open)
├── Hamburger toggle
├── Logo
├── Icon navigation
└── User avatar

Main Content (full width)
├── Dashboard/Catalog/Studio/etc.
└── Maximum workspace

FloatingChat (fixed bottom-right)
├── Avatar bubble (minimized)
│   ├── Current agent face
│   ├── Expression animations
│   └── Notification badge
└── Chat panel (expanded)
    ├── Unified conversation
    ├── Auto agent switching
    └── Persistent across pages
```

---

## Phase 1: Chat Infrastructure (Priority: HIGH) - 8-10 hours

### Task 1.1: Create ChatContext
**Purpose:** Global state management for unified chat
**File:** `/app/src/lib/ChatContext.tsx`

**Subtasks:**
1. Define TypeScript interfaces:
   - `Message` (id, role, content, agent, timestamp)
   - `ChatSession` (id, title, messages, createdAt)
   - `ChatContextType` (state + actions)

2. Implement context provider with:
   - `messages: Message[]` - current conversation
   - `currentAgent: AgentName` - active agent
   - `isOpen: boolean` - chat panel visibility
   - `unreadCount: number` - notification badge
   - `sessionHistory: ChatSession[]` - past conversations

3. Implement actions:
   - `sendMessage(content: string)` - add user message, trigger AI response
   - `openChat()` - expand chat panel
   - `closeChat()` - minimize to bubble
   - `toggleChat()` - open/close toggle
   - `switchAgent(agent: AgentName)` - change active agent
   - `clearHistory()` - clear current conversation
   - `saveSession()` - move current chat to history

4. Add agent detection logic:
   - Keyword matching for automatic agent switching
   - Context-based routing

5. Add localStorage persistence for session history

6. Export `useChat()` hook

**Instructions:**
- Use the existing context pattern from NavigationContext.tsx
- Follow the same structure: createContext, Provider component, useMemo for value, custom hook
- Agent detection keywords:
  - Francisca: "design", "mockup", "create", "art", "catalog", "product", "blank"
  - Antônia: "order", "ship", "track", "delivery", "help", "support", "problem"
  - Leopoldo: "revenue", "payout", "money", "sales", "price", "analytics" (default)
- Use `useCallback` for all actions to prevent unnecessary re-renders

---

### Task 1.2: Create FloatingChat Component
**Purpose:** Main unified chat interface
**File:** `/app/src/components/chat/FloatingChat.tsx`

**Subtasks:**
1. Implement minimized state (avatar bubble):
   - Fixed position: `bottom-6 right-6`
   - Size: 64px × 64px circular
   - Display current agent avatar from Cloudinary
   - Expression animation (breathing effect)
   - Notification badge (red dot with count)
   - Pulse animation on new messages
   - Hover: scale(1.05) with transition
   - Click handler to expand chat

2. Implement expanded state (chat panel):
   - Fixed position: `bottom-6 right-6`
   - Size: 380px width × 600px height (max)
   - Rounded corners: 16px
   - Shadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`
   - Background: zinc-900 with border
   - Slide-up animation from bubble position

3. Create chat header:
   - Current agent avatar (small)
   - Agent name and role
   - Close button (minimize)
   - Optional: agent switcher dropdown

4. Create message list area:
   - Scrollable message history
   - User messages (right-aligned, different color)
   - AI messages (left-aligned, with agent avatar)
   - Auto-scroll to bottom on new messages
   - Timestamp display

5. Create quick actions section:
   - Horizontal scrollable chips
   - Context-aware suggestions
   - Click to send predefined messages

6. Create input area:
   - Text input with placeholder
   - Send button
   - Voice input button (optional for MVP)

7. Add animations:
   - Expand/collapse transitions (300ms ease)
   - Message appear animations
   - Agent switch transitions

**Instructions:**
- Use Framer Motion for all animations (`motion.div`, `AnimatePresence`)
- Use existing `getCloudinaryUrl()` from `/lib/expressions/cloudinary.ts` for avatars
- Use `useChat()` hook from ChatContext for state
- Use `useAvatarExpression()` for expression changes
- Match existing dark theme: zinc-950 background, zinc-800 borders
- Use Iconify for icons (`@iconify/react`)
- Ensure touch targets are minimum 44px for mobile

---

### Task 1.3: Create ChatHeader Component
**Purpose:** Header showing current agent with smooth transitions
**File:** `/app/src/components/chat/ChatHeader.tsx`

**Subtasks:**
1. Display current agent:
   - Avatar image (40px)
   - Agent name (Leopoldo/Francisca/Antônia)
   - Role description ("Store Assistant", "Design Expert", "Support")

2. Add agent switcher UI:
   - Dropdown or horizontal selector
   - Show all 3 agents
   - Highlight current agent
   - Click to manually switch (optional override)

3. Add close button (X) to minimize chat

4. Add smooth transitions:
   - Crossfade between agent avatars
   - Slide animation for name change
   - Color accent change per agent:
     - Leopoldo: amber/yellow (#F59E0B)
     - Francisca: purple (#A855F7)
     - Antônia: blue (#3B82F6)

**Instructions:**
- Use Framer Motion's `AnimatePresence` for smooth agent transitions
- Use `layoutId` for shared element transitions
- Keep header height fixed to prevent layout shift
- Use Tailwind's `transition-colors` for smooth color changes

---

### Task 1.4: Create ChatMessages Component
**Purpose:** Message list with auto-scroll
**File:** `/app/src/components/chat/ChatMessages.tsx`

**Subtasks:**
1. Implement scrollable message list:
   - Use ScrollArea from shadcn/ui
   - Reverse scroll (newest at bottom)
   - Auto-scroll to bottom on new messages

2. Render message types:
   - User messages: right-aligned, zinc-700 background
   - AI messages: left-aligned, zinc-800 background, with agent avatar

3. Add message animations:
   - Fade in + slide up on appear
   - Stagger effect for multiple messages

4. Add typing indicator:
   - Show when AI is "thinking"
   - Animated dots
   - Current agent avatar

5. Add empty state:
   - Welcome message from current agent
   - Quick start suggestions

**Instructions:**
- Use `useRef` for scroll container
- Use `useEffect` to scroll to bottom when messages change
- Use existing `TypingIndicator` component if available
- Use `ChatAvatar` component for agent avatars in messages

---

### Task 1.5: Create ChatInput Component
**Purpose:** Message input with send functionality
**File:** `/app/src/components/chat/ChatInput.tsx`

**Subtasks:**
1. Create input layout:
   - Text input field (flex-1)
   - Send button (icon)
   - Voice button (optional)

2. Add functionality:
   - Enter key to send
   - Shift+Enter for new line
   - Disable send when empty
   - Clear input after send

3. Add visual states:
   - Focus ring
   - Disabled state
   - Loading state (while AI responds)

4. Add quick action chips:
   - Horizontal scroll below input
   - Context-aware suggestions
   - Click to auto-fill input

**Instructions:**
- Use shadcn/ui `Input` component
- Use Iconify for send icon (`lucide:send`)
- Use `useState` for input value
- Call `sendMessage` from ChatContext on submit

---

## Phase 2: Collapsible Navigation (Priority: HIGH) - 5-6 hours

### Task 2.1: Create CollapsibleNav Component
**Purpose:** Minimal, collapsible sidebar
**File:** `/app/src/components/layout/CollapsibleNav.tsx`

**Subtasks:**
1. Implement desktop version:
   - Collapsed state: 64px width, icons only
   - Expanded state: 200px width, icons + labels
   - Smooth width transition (300ms ease)
   - Toggle button (hamburger icon)

2. Implement mobile version:
   - Hidden by default
   - Hamburger button triggers full-screen overlay
   - Slide-in from left animation
   - Close button or tap outside to close

3. Add navigation items:
   - Logo (top)
   - Catalog icon (solar:gallery-linear)
   - Studio icon (solar:palette-linear)
   - E-Shop icon (solar:cart-large-2-linear)
   - Support icon (solar:headphones-round-linear)
   - User avatar (bottom)

4. Add active state indicators:
   - Highlight current route
   - Active indicator dot or border

5. Remove from current Sidebar:
   - Large avatar section
   - "Talk to X" button
   - Dynamic chat button

**Instructions:**
- Use Framer Motion for width animation
- Use `useNavigation()` hook for route state
- Use Iconify icons (solar icon set)
- Match existing color scheme: zinc-950 background, zinc-800 borders
- Ensure touch targets are 44px minimum
- Add `aria-label` attributes for accessibility

---

### Task 2.2: Update App Layout
**Purpose:** Integrate new navigation and chat
**File:** `/app/src/app/app/layout.tsx`

**Subtasks:**
1. Modify layout:
   - Replace `Sidebar` with `CollapsibleNav`
   - Add `ChatProvider` wrapper
   - Add `FloatingChat` component (outside main content)
   - Remove `AvatarExpressionProvider` from here (move to ChatContext)

2. Adjust main content area:
   - Remove `md:ml-[280px]` margin
   - Add responsive margin for collapsed nav
   - Full width when nav is collapsed

3. Update provider hierarchy:
   ```
   NavigationProvider
   ├── ChatProvider (NEW)
   │   └── AvatarExpressionProvider
   │       └── Other providers...
   ```

**Instructions:**
- Keep all existing providers
- Add ChatProvider as a new wrapper
- Place FloatingChat at the end of the layout (fixed position)
- Ensure no z-index conflicts (chat should be on top)

---

## Phase 3: Remove Legacy Components (Priority: MEDIUM) - 4-5 hours

### Task 3.1: Remove AI Sidebar from EshopDashboard
**Purpose:** Remove duplicate chat interface
**File:** `/app/src/components/eshop/EshopDashboard.tsx`

**Subtasks:**
1. Remove `AIAssistantSidebar` import
2. Remove `isAISidebarOpen` state
3. Remove AI sidebar JSX
4. Keep dashboard full width

5. Update layout:
   - Remove flex layout for sidebar
   - Single column layout
   - Full width content

**Instructions:**
- Simply remove the AI sidebar components
- Keep all dashboard functionality intact
- Ensure responsive design still works

---

### Task 3.2: Simplify NavigationContext
**Purpose:** Remove chat-related state from navigation
**File:** `/app/src/lib/NavigationContext.tsx`

**Subtasks:**
1. Remove `chatState` from state
2. Remove `setChatState` from actions
3. Keep `activeAgent` (for reference)
4. Keep `setAgent` (for manual override)
5. Remove `ChatState` type

6. Update all imports:
   - Find files importing `ChatState`
   - Remove or update those imports

**Instructions:**
- Chat state moves to ChatContext
- NavigationContext focuses on routing only
- Keep agent state for compatibility with existing components

---

### Task 3.3: Update Workspace Page
**Purpose:** Remove multiple chat states
**File:** `/app/src/app/app/workspace/page.tsx`

**Subtasks:**
1. Remove `chatState` usage
2. Remove `setChatState` calls
3. Remove `EmptyState` component (moved to FloatingChat)
4. Remove `ActiveState` component (moved to FloatingChat)
5. Keep `CatalogPageContent` for catalog view
6. Keep `EshopDashboard` for eshop view
7. Keep `MerchFromStudio` for studio view
8. Keep `SupportState` (or integrate into chat)

9. Simplify state management:
   - Remove message state (moved to ChatContext)
   - Remove input state (moved to ChatContext)
   - Remove typing state (moved to ChatContext)

10. Update render logic:
    - Render views based on route, not chatState
    - Views are always full content (no chat overlay)

**Instructions:**
- This is a major refactoring
- Move all chat-related code to FloatingChat component
- Workspace page focuses on content views only
- Test each view (catalog, eshop, studio, support) still works

---

### Task 3.4: Update Sidebar Component
**Purpose:** Remove chat button, keep minimal version
**File:** `/app/src/components/Sidebar.tsx`

**Subtasks:**
1. Remove `handleStartChat` function
2. Remove `handleAvatarClick` function
3. Remove chat button JSX
4. Keep navigation menu
5. Keep user menu
6. Simplify avatar section (or remove)

7. Alternative: Deprecate Sidebar
   - Mark as deprecated
   - Redirect to CollapsibleNav

**Instructions:**
- Option A: Modify existing Sidebar to be minimal
- Option B: Remove Sidebar entirely, use only CollapsibleNav
- Recommend Option B for cleaner codebase

---

### Task 3.5: Remove AgentSelector
**Purpose:** Agent switching is now automatic
**File:** `/app/src/components/AgentSelector.tsx`

**Subtasks:**
1. Review if used elsewhere
2. If only for manual switching, remove
3. If used for display, keep but simplify

4. Update imports in other files

**Instructions:**
- AgentSelector may still be useful for debugging
- Consider keeping but hiding in production
- Or move to settings/preferences

---

## Phase 4: Agent Switching & Polish (Priority: MEDIUM) - 4-5 hours

### Task 4.1: Implement Agent Detection Logic
**Purpose:** Automatic agent switching based on intent
**File:** `/app/src/lib/chat/agentDetection.ts`

**Subtasks:**
1. Implement keyword matching:
   ```typescript
   const franciscaKeywords = ['design', 'mockup', 'create', 'art', 'draw', 'image', 'logo', 'shirt', 'hoodie', 'product', 'catalog', 'blank', 'color', 'style'];
   const antoniaKeywords = ['order', 'ship', 'track', 'delivery', 'help', 'support', 'problem', 'issue', 'return', 'refund', 'where', 'when'];
   const leopoldoKeywords = ['revenue', 'payout', 'money', 'sales', 'price', 'cost', 'profit', 'analytics', 'dashboard', 'store', 'account'];
   ```

2. Create detection function:
   - Input: user message string
   - Output: AgentName
   - Logic: Check keywords, return matching agent or current agent

3. Add confidence scoring (optional):
   - Count keyword matches
   - Switch only if confidence > threshold

4. Integrate into ChatContext:
   - Call detection before sending message
   - Switch agent if different from current
   - Add visual feedback for switch

**Instructions:**
- Use simple regex or string.includes() for matching
- Case-insensitive matching
- Keep it simple for MVP, enhance later with NLP

---

### Task 4.2: Add Agent Transition Animations
**Purpose:** Smooth visual feedback when agents switch

**Subtasks:**
1. Update `ChatHeader.tsx`:
   - Add `AnimatePresence` for avatar crossfade
   - Add slide animation for name change
   - Add color transition for accent

2. Update `FloatingChat.tsx` bubble:
   - Morph avatar when agent changes
   - Pulse effect on switch

3. Add transition states:
   - "Switching to Francisca..." message
   - Brief loading state
   - Smooth handoff

**Instructions:**
- Use Framer Motion variants for complex animations
- Keep transitions under 500ms
- Use ease-in-out easing

---

### Task 4.3: Add Expression Changes
**Purpose:** Avatar expressions react to conversation

**Subtasks:**
1. Integrate with `useAvatarExpression()` hook
2. Trigger expressions based on:
   - User message sentiment (positive/negative)
   - Agent response type (thinking, happy, excited)
   - Context (designing = excited, problem = concerned)

3. Update FloatingChat bubble:
   - Show current expression
   - Animate expression changes

4. Add idle animation:
   - Random blinking
   - Subtle breathing
   - Occasional expression shifts

**Instructions:**
- Use existing expression system
- Call `setExpression()` from ChatContext
- Use `useIdleAnimation` hook for idle states

---

### Task 4.4: Mobile Optimization
**Purpose:** Ensure great mobile experience

**Subtasks:**
1. Update FloatingChat for mobile:
   - Full-screen modal on small screens
   - Bottom sheet style (swipe to close)
   - Larger touch targets

2. Update CollapsibleNav for mobile:
   - Full-screen overlay
   - Larger tap areas
   - Swipe gestures

3. Test responsive breakpoints:
   - 375px (mobile)
   - 768px (tablet)
   - 1024px+ (desktop)

**Instructions:**
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- Test on actual devices or browser dev tools
- Ensure no horizontal scroll

---

### Task 4.5: Add Notification System
**Purpose:** Alert users to new messages

**Subtasks:**
1. Update FloatingChat bubble:
   - Red badge with unread count
   - Pulse animation when new message arrives
   - Different states: idle, new message, typing

2. Add browser notifications (optional):
   - Request permission
   - Show notification when chat closed

3. Add sound (optional):
   - Subtle notification sound
   - Mute option

**Instructions:**
- Use `unreadCount` from ChatContext
- CSS animations for pulse effect
- Web Notifications API for browser alerts

---

## Phase 5: Testing & Integration (Priority: HIGH) - 3-4 hours

### Task 5.1: Integration Testing
**Purpose:** Ensure all components work together

**Subtasks:**
1. Test chat functionality:
   - Send messages
   - Receive responses
   - Switch agents
   - Persist history

2. Test navigation:
   - Collapse/expand sidebar
   - Navigate between routes
   - Mobile hamburger menu

3. Test integration:
   - Chat persists across page navigation
   - Agent switches correctly
   - No state conflicts

**Instructions:**
- Manual testing first
- Check browser console for errors
- Verify no memory leaks

---

### Task 5.2: Build Verification
**Purpose:** Ensure production build succeeds

**Subtasks:**
1. Run TypeScript checks:
   ```bash
   cd app && bun run build
   ```
2. Fix any type errors
3. Fix any lint errors
4. Verify all pages generate successfully

**Instructions:**
- Must pass `bun run build` without errors
- Fix all TypeScript strict mode errors
- No unused variables or imports

---

### Task 5.3: Accessibility Audit
**Purpose:** Ensure WCAG compliance

**Subtasks:**
1. Keyboard navigation:
   - Tab through all interactive elements
   - Focus visible on all buttons
   - Escape key closes chat

2. Screen reader support:
   - ARIA labels on icon buttons
   - Role attributes for chat
   - Alt text on avatars

3. Color contrast:
   - Verify 4.5:1 ratio for text
   - Check focus indicators

**Instructions:**
- Use browser dev tools accessibility panel
- Test with keyboard only (no mouse)
- Verify with screen reader (NVDA/VoiceOver)

---

## File Summary

### New Files to Create:
1. `/app/src/lib/ChatContext.tsx` - Global chat state
2. `/app/src/components/chat/FloatingChat.tsx` - Main chat component
3. `/app/src/components/chat/ChatHeader.tsx` - Chat header with agent
4. `/app/src/components/chat/ChatMessages.tsx` - Message list
5. `/app/src/components/chat/ChatInput.tsx` - Input area
6. `/app/src/components/layout/CollapsibleNav.tsx` - New navigation
7. `/app/src/lib/chat/agentDetection.ts` - Intent detection logic

### Files to Modify:
1. `/app/src/app/app/layout.tsx` - Integrate new components
2. `/app/src/app/app/workspace/page.tsx` - Remove legacy chat
3. `/app/src/lib/NavigationContext.tsx` - Remove chat state
4. `/app/src/components/eshop/EshopDashboard.tsx` - Remove AI sidebar
5. `/app/src/components/Sidebar.tsx` - Deprecate or simplify

### Files to Remove (Optional):
1. `/app/src/components/AgentSelector.tsx` - If no longer needed
2. `/app/src/components/SupportState.tsx` - Integrate into chat

---

## Design System (UI/UX Pro Max)

### Colors:
- Background: `#020617` (deep black)
- Surface: `#0F172A` (card backgrounds)
- Text: `#F8FAFC` (white)
- CTA/Accent: `#22C55E` (green for positive actions)

### Typography:
- Use existing Space Grotesk + Inter (already in the app)

### Animations:
- Ease-out for entering elements
- Ease-in for exiting elements
- Duration: 200-300ms
- Respect `prefers-reduced-motion`

### Agent Colors:
- Leopoldo: Amber/Yellow (#F59E0B)
- Francisca: Purple (#A855F7)
- Antônia: Blue (#3B82F6)

---

## Estimated Timeline

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1 | Chat Infrastructure | 8-10 hours |
| Phase 2 | Collapsible Navigation | 5-6 hours |
| Phase 3 | Remove Legacy | 4-5 hours |
| Phase 4 | Polish & Animation | 4-5 hours |
| Phase 5 | Testing & Build | 3-4 hours |
| **Total** | | **24-30 hours** |

---

## Success Criteria

- [ ] Single floating chat works across all pages
- [ ] Agents switch automatically based on keywords
- [ ] Navigation collapses to 64px, expands to 200px
- [ ] Chat minimizes to avatar bubble, expands to full panel
- [ ] No TypeScript or build errors
- [ ] Mobile responsive (375px+)
- [ ] Accessibility compliant (keyboard navigation, ARIA labels)
- [ ] Smooth animations (300ms transitions)
- [ ] Conversation persists during session

---

## Notes for Build Model

### Current Codebase Context:
- Uses Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4 with dark mode
- Framer Motion for animations
- shadcn/ui component library
- Iconify for icons (@iconify/react)
- Cloudinary for avatar images
- Existing agent system: Leopoldo, Francisca, Antônia
- Expression system with 20 expressions per agent

### Key Patterns to Follow:
- Context pattern: createContext + Provider + useMemo + custom hook
- Component naming: PascalCase.tsx for components
- Hook naming: camelCase.ts for utilities
- Use `useCallback` for all action functions
- Use `useMemo` for context values
- Add `aria-label` for icon-only buttons
- Ensure 44px minimum touch targets

### Agent Keywords Reference:
```typescript
// Francisca - Design/Creative
['design', 'mockup', 'create', 'art', 'draw', 'image', 'logo', 'shirt', 'hoodie', 'product', 'catalog', 'blank', 'color', 'style']

// Antônia - Support/Orders
['order', 'ship', 'track', 'delivery', 'help', 'support', 'problem', 'issue', 'return', 'refund', 'where', 'when']

// Leopoldo - Business/Default
['revenue', 'payout', 'money', 'sales', 'price', 'cost', 'profit', 'analytics', 'dashboard', 'store', 'account']
```

---

**Ready for Implementation!**

This plan provides clear, actionable tasks that can be distributed to build models. Each task includes specific file paths, requirements, and success criteria.
