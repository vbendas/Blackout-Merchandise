# Kimi Design Migration - Fix Plan
## Reverting Incorrect Changes & Proper Integration

---

## Critical Errors Made

### Error 1: Light Theme Implementation ❌
**What was done**: Changed the entire app to a Kimi-inspired light theme (white backgrounds, light grays)
**Why it's wrong**: The PRD and Design System explicitly require **DARK MODE ONLY**
**Fix**: Revert to zinc-950 dark theme per Design System

### Error 2: Avatar Removal ❌
**What was done**: Removed the animated avatars with expression glow from the sidebar
**Why it's wrong**: The Cat-Suite avatars (Leopoldo, Francisca, Antonia) are **core brand identity** - they're not decorative, they're essential AI agent representations
**Fix**: Restore avatars with expression system

---

## What SHOULD Have Been Done

The goal was to adopt Kimi's **UX PATTERNS** and **RESPONSIVE BEHAVIOR**, not their visual design:

| Kimi Feature | What to Adopt | What to Keep (Merch From) |
|--------------|---------------|---------------------------|
| **Sidebar collapse** | ✅ Collapsible 72px/280px | Dark theme, avatars |
| **Mobile drawer** | ✅ Slide-out with backdrop | Dark theme styling |
| **Clean layout** | ✅ Minimal chrome, focus on content | Dark backgrounds |
| **Light theme** | ❌ Don't adopt | Keep zinc-950 dark |
| **Simple icons** | ✅ Iconify icons | Keep current set |
| **No avatars** | ❌ Don't adopt | Keep Cat-Suite avatars |

---

## Fix Implementation Plan

### Phase A: Revert Theme (CRITICAL)
**Priority**: P0 - Must fix immediately

**Tasks**:
1. **Revert globals.css to dark theme**
   - Restore zinc-950 backgrounds
   - Restore white text
   - Restore zinc-800 borders
   - Keep the NEW spacing/shadow tokens (these are useful)

2. **Revert workspace page to dark**
   - Dark message bubbles (zinc-800/zinc-900)
   - Dark input area
   - Restore gradient send button

3. **Revert QuickActions & QuickPromptChips**
   - Dark backgrounds
   - Zinc borders

4. **Revert ProductCard, Catalog components**
   - Dark card backgrounds
   - Zinc borders

### Phase B: Restore Avatars (CRITICAL)
**Priority**: P0 - Must fix immediately

**Tasks**:
1. **Restore Sidebar avatar section**
   - Add back the avatar with expression glow
   - Keep collapse functionality (this was correct)
   - Agent name display with expression

2. **Restore ChatAvatar, UserAvatar**
   - Dark theme styling
   - Expression integration

3. **Restore AvatarExpressionContext functionality**
   - Expression system
   - Glow effects

### Phase C: Keep Good Kimi Patterns (PRESERVE)
**These changes were correct and should stay:**

1. ✅ **Collapsible sidebar** (72px/280px)
2. ✅ **Mobile drawer with backdrop**
3. ✅ **Responsive breakpoints**
4. ✅ **useBreakpoint hook**
5. ✅ **ResponsiveContainer component**
6. ✅ **Touch optimizations** (44px targets)
7. ✅ **MobileBottomSheet** (useful component)
8. ✅ **Responsive product grid** (1/2/3/4 columns)

---

## Detailed Fix Instructions

### Fix 1: globals.css Dark Theme Restoration

**Current (WRONG - Light)**:
```css
--background: #ffffff
--surface: #f9f9f9
--text-primary: #000000
--border: #e5e5e5
--accent: #3b82f6
```

**Target (CORRECT - Dark per Design System)**:
```css
--background: #0a0a0a (zinc-950)
--surface: #18181b (zinc-900)
--text-primary: #ffffff (white)
--text-secondary: #a3a3a3 (zinc-400)
--border: #27272a (zinc-800)
--accent: #E11D48 (Recording Red - rose-600)
```

### Fix 2: Sidebar Avatar Restoration

**Structure to restore**:
```
Sidebar
├── Avatar Section (120px circle)
│   ├── Expression glow effect
│   ├── Agent image
│   └── Expression label
├── New Chat Button
├── Navigation Menu
└── User Menu
```

**Keep the collapse functionality** - just restore the avatar section in the expanded state.

### Fix 3: Message Bubbles Dark Theme

**User Messages**:
- Background: zinc-800 with subtle gradient
- Text: white
- Border: zinc-700

**Assistant Messages**:
- Background: zinc-900
- Text: white
- Border: zinc-800

---

## Files to Fix

### Must Fix (P0 - Critical)
- [ ] `app/src/app/globals.css` - Revert to dark theme
- [ ] `app/src/components/Sidebar.tsx` - Restore avatars
- [ ] `app/src/app/app/workspace/page.tsx` - Dark theme chat
- [ ] `app/src/components/ChatAvatar.tsx` - Dark styling
- [ ] `app/src/components/UserAvatar.tsx` - Dark styling
- [ ] `app/src/components/QuickActionsGrid.tsx` - Dark styling
- [ ] `app/src/components/QuickPromptChips.tsx` - Dark styling

### Should Fix (P1 - Important)
- [ ] `app/src/components/ProductCard.tsx` - Dark cards
- [ ] `app/src/components/catalog/*` - Dark theme
- [ ] `app/src/components/FilterDropdown.tsx` - Dark styling

### Keep As Is (Correct)
- [x] `app/src/hooks/useBreakpoint.ts` - Keep
- [x] `app/src/components/ResponsiveContainer.tsx` - Keep
- [x] `app/src/components/MobileSidebar.tsx` - Keep structure
- [x] `app/src/components/MainContent.tsx` - Keep responsive logic
- [x] `app/src/components/MobileBottomSheet.tsx` - Keep
- [x] `app/src/components/catalog/ResponsiveProductGrid.tsx` - Keep

---

## Design System Compliance Check

After fixes, verify:

| Token | Value | Status |
|-------|-------|--------|
| Background (App) | #0a0a0a | ✅ Required |
| Background (Landing) | #000000 | ✅ Required |
| Text Primary | #FFFFFF | ✅ Required |
| Text Secondary | #a3a3a3 | ✅ Required |
| Border | #27272a | ✅ Required |
| Recording Red | #E11D48 | ✅ Required |
| Gold Gradient | #D4AF37 → #F5E6A3 | ✅ Landing only |

---

## Success Criteria

1. **Theme**: All screens use dark zinc-950 background
2. **Avatars**: Cat-Suite agents visible in sidebar with expressions
3. **Chat**: Dark message bubbles with proper contrast
4. **Responsive**: All breakpoints work correctly
5. **Brand**: Matches Design System and Brand Guidelines

---

## Summary

**Remove**: Light theme colors, white backgrounds
**Restore**: Dark theme, avatars with expressions
**Keep**: Collapsible sidebar, mobile drawer, responsive layout, touch optimizations
