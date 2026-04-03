# Design: Unify Lightbox Design

## Context

The ProductDetailLightbox component in `app/src/components/catalog/ProductDetailLightbox.tsx` needs to match the ShowroomLightbox design in `app/src/components/catalog/ShowroomLightbox.tsx`. Both components serve similar purposes (product selection) but have inconsistent UX.

## Goals / Non-Goals

**Goals:**
- Add Framer Motion animations matching Showroom Lightbox
- Match container styling (max-height, border radius, backdrop)
- Add mode indicator and product counter to header
- Add selected state indicator (emerald checkmark)
- Add Update Selection button state
- Standardize scroll gradients

**Non-Goals:**
- Merge components into a single shared component
- Add new functionality beyond design unification
- Modify the DraggableImageCarousel behavior

## Decisions

### Decision 1: Keep Image Carousel

**Choice:** Keep the DraggableImageCarousel in ProductDetailLightbox rather than switching to static image with arrows.

**Rationale:** The carousel provides better UX for products with multiple images. The Showroom Lightbox uses navigation arrows because it cycles between different products, whereas ProductDetailLightbox shows one product that may have multiple images.

### Decision 2: Import Framer Motion

**Choice:** Import AnimatePresence and motion from framer-motion package.

**Rationale:** ShowroomLightbox already uses Framer Motion. ProductDetailLightbox currently has no animations. Using the same library ensures consistency.

### Decision 3: Access Selection State via useProductList

**Choice:** Use the existing useProductList hook to check if product is already selected.

**Rationale:** This is the same pattern used in ShowroomLightbox. The hook already provides access to the items list.

## Risks / Trade-offs

- **Risk:** Animation conflicts with existing state management → **Mitigation:** Wrap content in AnimatePresence as done in ShowroomLightbox
- **Risk:** Breaking existing carousel behavior → **Mitigation:** Keep carousel as-is, only add wrapper animations
