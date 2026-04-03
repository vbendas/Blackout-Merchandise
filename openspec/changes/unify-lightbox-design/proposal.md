# Proposal: Unify Lightbox Design

## Why

The Product Detail Lightbox and Showroom Lightbox serve similar purposes (product selection) but have inconsistent designs. This creates a fragmented user experience when navigating between the catalog and showroom. The Showroom Lightbox has superior UX patterns (animations, selected state indicators, "Update" vs "Add" actions) that should be applied to the Product Detail Lightbox.

## What Changes

- Add Framer Motion entrance/exit animations to ProductDetailLightbox
- Update container styling to match Showroom Lightbox (max-height, border radius, backdrop)
- Enhance header with mode indicator ("Individual Mode") and product counter
- Add selected state indicator (emerald checkmark) when product is in selection
- Add "Update Selection" button state when product already exists in list
- Standardize scroll gradient overlays

## Capabilities

### Modified Capabilities
- `product-detail-lightbox`: Unified design matching showroom lightbox

## Impact

- `app/src/components/catalog/ProductDetailLightbox.tsx`: Primary file to update
- `app/src/components/catalog/ShowroomLightbox.tsx`: Reference for design patterns
