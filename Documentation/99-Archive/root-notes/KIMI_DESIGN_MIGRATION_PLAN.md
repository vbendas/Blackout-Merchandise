# Kimi Design Migration Plan
## Merch-From /app UI/UX Redesign

---

## Executive Summary

Based on analysis of kimi.com, this plan outlines a comprehensive redesign of the `/app` to adopt Kimi's clean, minimalist, and highly functional design language while improving responsiveness across Desktop, Tablet, and Mobile.

### Kimi Design Analysis

**Key Characteristics Observed:**
- **Clean Sidebar**: Minimalist left sidebar with logo, new chat button, and simple navigation
- **Light Theme Default**: Uses a clean light color scheme with subtle borders
- **Collapsible Navigation**: Sidebar can be collapsed/expanded with smooth animations
- **Mobile Drawer**: On mobile, sidebar becomes a slide-out drawer with overlay
- **Focus on Content**: Maximized content area with minimal chrome
- **Subtle Typography**: Clean sans-serif fonts with good hierarchy
- **Consistent Spacing**: 8px grid system with consistent padding
- **Simple Icons**: Iconify icons with consistent 20x20 sizing

---

## Phase 1: Design System Foundation

### 1.1 Color Palette Migration
**Current**: Dark zinc-based theme with heavy shadows
**Target**: Kimi-style light theme with subtle borders

**Tasks:**
- [ ] Create new CSS variables for light theme
- [ ] Update `globals.css` with Kimi-inspired color scheme:
  - Background: `#ffffff` (pure white)
  - Surface: `#f9f9f9` (subtle gray)
  - Border: `#e5e5e5` (light gray)
  - Text Primary: `#000000` (black)
  - Text Secondary: `#666666` (gray)
  - Accent: Keep brand color or use Kimi's blue
- [ ] Add dark mode toggle support
- [ ] Update all component color references

**Files to Modify:**
- `app/src/app/globals.css`
- `app/src/components/ui/*`

### 1.2 Typography System
**Tasks:**
- [ ] Update font stack to match Kimi's clean aesthetic
- [ ] Implement type scale:
  - H1: 24px/32px (bold)
  - H2: 20px/28px (semibold)
  - Body: 14px/20px (regular)
  - Small: 12px/16px (regular)
  - Caption: 11px/14px (medium)
- [ ] Add font-smoothing CSS

### 1.3 Spacing & Layout Grid
**Tasks:**
- [ ] Implement 8px base grid system
- [ ] Define consistent spacing tokens:
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px

---

## Phase 2: Sidebar Redesign (Kimi-Style)

### 2.1 Sidebar Layout Restructure
**Current Issues:**
- Heavy avatar with expression glow (distracting)
- Fixed width only
- No collapse functionality
- Mobile toggle is always visible

**Target Kimi Style:**
- Clean header with logo only
- "New Chat" primary button
- Simple navigation list
- Collapsible on desktop
- Drawer on mobile

**Tasks:**
- [ ] Redesign `Sidebar.tsx`:
  - Remove avatar/expression system from sidebar
  - Add logo/header section
  - Create prominent "New Chat" button
  - Simplify navigation menu styling
- [ ] Add collapse/expand functionality:
  - Collapsed width: 72px (icon only)
  - Expanded width: 280px
  - Smooth CSS transitions
  - Persist state in localStorage
- [ ] Create collapse toggle button

### 2.2 Mobile Sidebar (Drawer Pattern)
**Tasks:**
- [ ] Implement mobile drawer:
  - Full-height slide from left
  - Backdrop overlay with blur
  - Close on backdrop click or swipe
  - Lock body scroll when open
- [ ] Add hamburger menu button (mobile only)
- [ ] Animate drawer with Framer Motion

**Files to Modify:**
- `app/src/components/Sidebar.tsx`
- `app/src/components/NavigationMenu.tsx`
- `app/src/components/MainContent.tsx`

---

## Phase 3: Responsive Breakpoint System

### 3.1 Breakpoint Definitions
```
Mobile:     0px - 639px    (sm)
Tablet:     640px - 1023px (md)
Desktop:    1024px - 1279px (lg)
Large:      1280px+        (xl)
```

### 3.2 Layout Behaviors by Breakpoint

**Mobile (0-639px):**
- [ ] Sidebar hidden by default
- [ ] Hamburger menu to open drawer
- [ ] Full-width content area
- [ ] Bottom-safe-area padding for mobile
- [ ] Touch-optimized tap targets (min 44px)

**Tablet (640-1023px):**
- [ ] Collapsed sidebar by default (72px)
- [ ] Tap to expand temporarily
- [ ] Content area with generous margins
- [ ] 2-column grids where applicable

**Desktop (1024px+):**
- [ ] Expanded sidebar (280px) by default
- [ ] Collapse toggle available
- [ ] Max-width content container (1200px)
- [ ] Multi-column layouts

### 3.3 Component Responsive Updates
**Tasks:**
- [ ] Update `MainContent.tsx` with responsive margin logic
- [ ] Create responsive container component
- [ ] Update all grid layouts (product grids, dashboards)
- [ ] Implement responsive typography scaling

---

## Phase 4: Workspace UI Improvements

### 4.1 Chat Interface Polish
**Current Issues:**
- Heavy dark theme
- Input area too prominent
- Message bubbles have heavy shadows

**Kimi-Style Improvements:**
- [ ] Light theme chat background
- [ ] Subtle message bubbles:
  - User: Light gray background `#f3f3f3`
  - Assistant: White with subtle border
  - No heavy shadows
  - Rounded corners: 12px
- [ ] Clean input area:
  - White background
  - Subtle border `#e5e5e5`
  - Focus state: Blue border
  - Send button: Blue accent

### 4.2 Empty State Redesign
**Tasks:**
- [ ] Centered minimalist layout
- [ ] Kimi-style quick action chips
- [ ] Subtle logo/icon
- [ ] Clear call-to-action

### 4.3 Input Area Improvements
**Tasks:**
- [ ] Redesign input bar:
  - White background
  - Rounded-full or rounded-xl
  - Border: 1px solid #e5e5e5
  - Shadow: subtle on focus
- [ ] Update mic button styling
- [ ] Add keyboard shortcut hints

**Files to Modify:**
- `app/src/app/app/workspace/page.tsx`
- `app/src/components/QuickActionsGrid.tsx`
- `app/src/components/QuickPromptChips.tsx`

---

## Phase 5: Mobile-First Components

### 5.1 Touch Optimization
**Tasks:**
- [ ] Increase tap targets to minimum 44px
- [ ] Add touch feedback (active states)
- [ ] Prevent zoom on input focus (iOS)
- [ ] Optimize swipe gestures

### 5.2 Mobile-Specific Components
**Tasks:**
- [ ] Mobile-optimized filter dropdowns (sheet modal)
- [ ] Bottom sheet for product selection
- [ ] Floating action button (FAB) for new chat
- [ ] Mobile-optimized product cards (larger touch areas)

### 5.3 Performance Optimizations
**Tasks:**
- [ ] Lazy load off-screen content
- [ ] Optimize animations for mobile (reduced motion)
- [ ] Implement virtual scrolling for long lists

**Files to Modify:**
- `app/src/components/ProductCard.tsx`
- `app/src/components/FilterDropdown.tsx`
- `app/src/components/ProductLightbox.tsx`

---

## Phase 6: Catalog & E-shop Updates

### 6.1 Product Grid Responsiveness
**Tasks:**
- [ ] Mobile: 1-2 columns
- [ ] Tablet: 2-3 columns
- [ ] Desktop: 3-4 columns
- [ ] Consistent gap spacing (16px)

### 6.2 Filter Bar Redesign
**Tasks:**
- [ ] Horizontal scroll on mobile
- [ ] Collapsible on tablet
- [ ] Full sidebar on desktop
- [ ] Kimi-style filter chips

### 6.3 Dashboard Responsive Layout
**Tasks:**
- [ ] Stack metrics cards on mobile
- [ ] 2-column grid on tablet
- [ ] 4-column on desktop
- [ ] Horizontal scroll table on mobile

---

## Phase 7: Implementation Priority

### Week 1: Foundation
1. Design system (colors, typography, spacing)
2. Sidebar redesign (structure only)

### Week 2: Responsive Layout
1. Breakpoint system
2. Main content responsiveness
3. Mobile drawer

### Week 3: Components
1. Chat interface updates
2. Input area redesign
3. Product grid responsiveness

### Week 4: Polish
1. Mobile optimizations
2. Touch interactions
3. Performance
4. Testing & bug fixes

---

## File Modification Checklist

### Core Files
- [ ] `app/src/app/globals.css` - New design tokens
- [ ] `app/src/app/layout.tsx` - Theme provider setup
- [ ] `app/src/app/app/layout.tsx` - Responsive layout structure

### Components
- [ ] `app/src/components/Sidebar.tsx` - Full redesign
- [ ] `app/src/components/MainContent.tsx` - Responsive margins
- [ ] `app/src/components/NavigationMenu.tsx` - Simplified styling
- [ ] `app/src/components/MobileSidebarToggle.tsx` - New component
- [ ] `app/src/components/ui/button.tsx` - Updated variants
- [ ] `app/src/components/ui/input.tsx` - Updated styling

### Workspace
- [ ] `app/src/app/app/workspace/page.tsx` - Chat UI updates
- [ ] `app/src/components/QuickActionsGrid.tsx` - Kimi-style
- [ ] `app/src/components/QuickPromptChips.tsx` - Kimi-style

### Catalog
- [ ] `app/src/components/ProductCard.tsx` - Responsive
- [ ] `app/src/components/FilterDropdown.tsx` - Mobile optimize
- [ ] `app/src/components/catalog/ProductGrid.tsx` - Responsive grid

---

## Design Tokens Reference

### Colors (Kimi-Inspired)
```css
/* Light Theme (Default) */
--background: #ffffff;
--surface: #f9f9f9;
--surface-hover: #f3f3f3;
--border: #e5e5e5;
--border-strong: #d4d4d4;
--text-primary: #000000;
--text-secondary: #666666;
--text-tertiary: #999999;
--accent: #3b82f6; /* Blue */
--accent-hover: #2563eb;
--user-message: #f3f3f3;
--assistant-message: #ffffff;
```

### Shadows (Subtle)
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.05);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.05);
```

### Border Radius
```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

---

## Success Metrics

1. **Visual Consistency**: All components follow Kimi design language
2. **Responsive Score**: 100% of pages functional on all breakpoints
3. **Performance**: Lighthouse mobile score > 90
4. **Accessibility**: WCAG 2.1 AA compliance maintained
5. **User Experience**: Simplified navigation, faster task completion
