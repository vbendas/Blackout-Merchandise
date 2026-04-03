# Tasks: Unify Lightbox Design

## 1. Add Framer Motion imports

- [ ] 1.1 Import `AnimatePresence` and `motion` from 'framer-motion'
- [ ] 1.2 Wrap main content in AnimatePresence component

## 2. Update container styling

- [ ] 2.1 Change backdrop from `bg-black/90 backdrop-blur-sm` to `bg-zinc-950`
- [ ] 2.2 Update container: add `rounded-2xl`, change `max-h` to `max-h-[80vh]`
- [ ] 2.3 Adjust container width from `max-w-[85vw]` to `w-full max-w-lg` (matching showroom ratio)

## 3. Update header with mode indicator

- [ ] 3.1 Add "Individual Mode" indicator with icon (similar to Showroom "Showroom Mode")
- [ ] 3.2 Add product counter display
- [ ] 3.3 Update header border styling

## 4. Add selected state indicator

- [ ] 4.1 Import `useProductList` hook (or verify already imported)
- [ ] 4.2 Add state check: `isProductInList = items.some(p => p.productId === selectedProduct?.id)`
- [ ] 4.3 Add emerald checkmark overlay on product image when selected

## 5. Update action button states

- [ ] 5.1 Add conditional button text: "Update Selection" vs "Add to Selection"
- [ ] 5.2 Add conditional button styling (emerald for update state)

## 6. Verify scroll gradients

- [ ] 6.1 Verify scroll gradient overlays work correctly with new structure

## 7. Test and verify

- [ ] 7.1 Test lightbox opens with animation
- [ ] 7.2 Test selected state indicator appears correctly
- [ ] 7.3 Test "Update Selection" shows for already-selected products
- [ ] 7.4 Verify styling matches Showroom Lightbox
