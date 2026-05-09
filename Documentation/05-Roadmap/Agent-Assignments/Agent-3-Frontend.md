# Agent 3: Frontend Specialist

> **Focus:** React components, UI/UX, styling, animations  
> **Phase 3.5-3.6 Estimated Time:** 60-70 hours  
> **Role Lead:** Frontend architect for all UI

---

## Phase 3.5-3.6 Assignment Summary

**Mega Task:** 3.5.1 (Audio UI), 3.5.2-3.5.4 (Inline Cards), 3.5.5-3.5.7 (Catalog Lightbox), 3.6 (Waitlist LP)

| Task | Files | Est. Time | Status |
|------|-------|-----------|--------|
| 3.5.1 | 7 components | 7-8h | 🔄 Ready |
| 3.5.2 | 3 components | 7-8h | ⏳ After audio |
| 3.5.3 | 1 component | 4-5h | ⏳ After inline |
| 3.5.4 | 1 component | 4-5h | ⏳ After inline |
| 3.5.5-3.5.7 | 10 components | 22-25h | ⏳ After cards |
| 3.6 | 13 components | 24-26h | ⏳ Last |

**Total: 60-70 hours**

---

## Task 3.5.1: Audio Button - Speech to Text

**Components to Create:**
1. `useSpeechToText.ts` hook
2. `RecordingIndicator.tsx` component
3. `VoiceModeToggle.tsx` component
4. Audio button in workspace

**Files:**
- `/app/src/hooks/useSpeechToText.ts` (new)
- `/app/src/components/ui/RecordingIndicator.tsx` (new)
- `/app/src/components/chat/VoiceModeToggle.tsx` (new)
- `/app/src/app/app/workspace/page.tsx` (update)

**Implementation Checklist:**
- [ ] useSpeechToText hook with Web Speech API + fallback
- [ ] Recording state management
- [ ] Browser permission handling
- [ ] RecordingIndicator with pulsing animation
- [ ] VoiceModeToggle radio button component
- [ ] Mic button next to send button in input area
- [ ] Connection to Deepgram API (from Agent 2)

**Success Criteria:**
- [ ] Click mic → recording starts
- [ ] Pulsing indicator while recording
- [ ] Click mic again → stops and transcribes
- [ ] Text appears in input field
- [ ] Works in Chrome, Safari, Firefox

---

## Task 3.5.2-3.5.4: Inline Chat Cards

### 3.5.2: Product Card Inline

**Components:**
- `ProductCardInline.tsx` - Individual product card
- `ProductCardCarousel.tsx` - Multiple products
- `ProductCardSkeleton.tsx` - Loading state

**Files:**
- `/app/src/components/chat/ProductCardInline.tsx`
- `/app/src/components/chat/ProductCardCarousel.tsx`
- `/app/src/components/chat/ProductCardSkeleton.tsx`

**Features:**
- [ ] Image thumbnail (from Cloudinary)
- [ ] Product name, price
- [ ] "View" CTA button
- [ ] Carousel for 2-3 products
- [ ] Loading skeleton
- [ ] Click opens ProductDetailLightbox

### 3.5.3: Mockup Card Inline

**Component:** `MockupCardInline.tsx`

**Features:**
- [ ] Show design on product blank
- [ ] Action buttons: Edit, Approve, Regenerate
- [ ] Preview of placement
- [ ] Click opens fullscreen lightbox
- [ ] Zoom/pan in fullscreen

### 3.5.4: Design Card Inline

**Component:** `DesignCardInline.tsx`

**Features:**
- [ ] Show generated artwork
- [ ] Metadata: LoRA style, prompt
- [ ] Action buttons: Apply, Download, Regenerate
- [ ] Fullscreen viewer with high-res
- [ ] Comparison slider (before/after)

---

## Task 3.5.5-3.5.7: Catalog Lightbox System

### Components to Create:

1. **CatalogLightbox** (shell)
   - File: `/app/src/components/catalog/CatalogLightbox.tsx`
   - Opens/closes with animation
   - Houses all sub-components

2. **CategoryFilters**
   - File: `/app/src/components/catalog/CategoryFilters.tsx`
   - Filter buttons: Tees, Hoodies, Sweaters, Caps, Bags
   - Active state styling

3. **ProductGrid**
   - File: `/app/src/components/catalog/ProductGrid.tsx`
   - CSS Grid layout
   - Product cards in responsive grid

4. **ProductSlider**
   - File: `/app/src/components/catalog/ProductSlider.tsx`
   - Framer Motion carousel
   - Drag to scroll

5. **ViewToggle**
   - File: `/app/src/components/catalog/ViewToggle.tsx`
   - Grid/Slider toggle buttons

6. **SearchBar**
   - File: `/app/src/components/catalog/SearchBar.tsx`
   - Text input with debounced search

7. **CatalogProductCard**
   - File: `/app/src/components/catalog/CatalogProductCard.tsx`
   - Image, name, price
   - Click opens ProductDetailLightbox

8. **ProductDetailLightbox**
   - File: `/app/src/components/catalog/ProductDetailLightbox.tsx`
   - Full product details
   - Image gallery, specs, sizes/colors
   - "Use This Blank" CTA

9. **ImageViewer**
   - File: `/app/src/components/catalog/ImageViewer.tsx`
   - Fullscreen image viewer
   - Zoom/pan controls
   - Share/download buttons

10. **LightboxContext & useLightbox**
    - File: `/app/src/lib/LightboxContext.tsx`
    - File: `/app/src/hooks/useLightbox.ts`
    - Global lightbox state management

**Implementation Checklist:**
- [ ] All components created
- [ ] Animations smooth (Framer Motion)
- [ ] Filters actually filter products
- [ ] Search works (case-insensitive)
- [ ] Grid and slider views toggle
- [ ] Keyboard navigation (arrows, escape)
- [ ] Mobile responsive (stacks on mobile)
- [ ] Accessibility (WCAG AA)

---

## Task 3.6: Waitlist Landing Page

### Page Components:

1. **Page Shell** (`/app/src/app/waitlist/page.tsx`)
2. **Step Indicator** (`/app/src/components/waitlist/StepIndicator.tsx`)
3. **Waitlist Layout** (`/app/src/components/waitlist/WaitlistLayout.tsx`)
4. **Step 1 - Welcome** (`/app/src/components/waitlist/Step1Welcome.tsx`)
5. **Step 2 - Basic Info** (`/app/src/components/waitlist/Step2BasicInfo.tsx`)
6. **Step 3 - Social Links** (`/app/src/components/waitlist/Step3SocialProof.tsx`)
7. **Step 4 - Interview** (`/app/src/components/waitlist/Step4Interview.tsx`)
8. **Step 5 - Success** (`/app/src/components/waitlist/Step5Success.tsx`)

### Implementation Checklist:

**Step 1: Welcome**
- [ ] Leopoldo avatar visible
- [ ] Welcome message
- [ ] "Next" button

**Step 2: Basic Info**
- [ ] Name input field
- [ ] Email input field
- [ ] Email validation
- [ ] "Next" button

**Step 3: Social Proof**
- [ ] Instagram URL input
- [ ] TikTok URL input
- [ ] URL validation
- [ ] Optional field message
- [ ] "Next" button

**Step 4: Interview**
- [ ] Display current question
- [ ] Text mode: Input field + submit
- [ ] Voice mode: Mic button + recorded indicator
- [ ] Text/Voice toggle
- [ ] Show previous responses
- [ ] Progress indicator ("Question 1 of 5")

**Step 5: Success**
- [ ] Confirmation message
- [ ] Waitlist position number
- [ ] Share button (generate referral link)
- [ ] Email confirmation notice

**General:**
- [ ] Step transitions animate smoothly
- [ ] Mobile responsive on all steps
- [ ] Leopoldo avatar throughout
- [ ] Form validation with error messages
- [ ] Save form state (don't lose data on refresh)

---

## Styling Guidelines

**Color Palette:**
- Primary: `#E11D48` (Recording Red)
- Background: `#000000` (Black)
- Text: `#FFFFFF` (White)
- Cards: `#1A1A1A` (Dark Gray)
- Borders: `#333333` (Medium Gray)

**Typography:**
- Headings: Space Grotesk
- Body: Inter

**Animations:**
- Use Framer Motion for all transitions
- Duration: 0.3-0.5s for most animations
- Easing: `easeInOut` for smooth feel

---

## Component Reuse Opportunities

- Use existing `ChatAvatar` for Leopoldo displays
- Reuse button styles from UI lib
- Reuse scroll area from Radix UI
- Follow existing card patterns

---

## Testing Checklist

- [ ] All components compile (no TypeScript errors)
- [ ] Responsive on mobile/tablet/desktop
- [ ] Dark mode only (no light mode)
- [ ] Accessibility: Tab through all inputs
- [ ] Keyboard navigation works
- [ ] Animations are smooth (60 FPS)
- [ ] No console errors
- [ ] Images load from Cloudinary
- [ ] Forms properly submit to APIs

---

**Status:** READY TO START  
**Estimated Completion:** Feb 9, 2026  
**Owner:** Agent 3 (Frontend Specialist)
