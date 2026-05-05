# Plan: E-shop Security Hardening

**Status:** PENDING
**Created:** 2026-05-03
**Source:** Hy3 security review of current diff (tencent/hy3-preview:free)

---

## Overview
- **Scope:** 3 targeted fixes across 2 code files + 1 config file
- **Complexity:** All S (small, <30min each)
- **Dependencies:** None — all tasks are independent
- **Reviewer Score:** Current 90/100 → Target 95/100

---

## Task T1: Guard against undefined store ID in hooks
**Complexity:** S | **Priority:** Medium

**T1.1:** Update `useOrders` hook to skip fetch when `storeId` is undefined/null
- Currently `useOrders(store?.id)` is called even when store is loading
- Add early return or disabled state when `storeId` is falsy
- **File:** `app/src/hooks/useOrders.ts`

**T1.2:** Update `useProducts` hook with same guard pattern
- Ensure consistency across data-fetching hooks
- **File:** `app/src/hooks/useProducts.ts`

**[GOTCHA]:** SWR hooks cannot be called conditionally (React rules of hooks), so the guard must be inside the hook itself, not in the component.

---

## Task T2: Add confirmation dialog for product deletion
**Complexity:** S | **Priority:** Low

**T2.1:** Add confirmation before `deleteProduct` call in ProductsTab
- Use `window.confirm()` or a styled modal before calling `deleteProduct(product.id)`
- **File:** `app/src/components/eshop/ProductsTab.tsx`
- **Code:** Wrap the delete handler with confirmation check

**[ARCH]:** Keep it simple — `window.confirm()` is sufficient for MVP. A styled modal can be added later if UX requires it.

---

## Task T3: Improve .env.example security hygiene
**Complexity:** S | **Priority:** Low

**T3.1:** Replace secret variable placeholders with empty strings + format comments
- Change `CLERK_SECRET_KEY="sk_test_your_clerk_secret_key"` → `CLERK_SECRET_KEY= # Format: sk_test_...`
- Apply to all secret-type variables: Stripe, Clerk, OpenRouter, Deepgram, Upstash
- Keep non-secret variables as-is (CLOUDINARY_CLOUD_NAME, APP_URL)
- **File:** `.env.example`

**[VERIFY]:** `grep -c "your_" .env.example` should return 0 after fix

---

## Parallelization Map

```
Group A (parallel, no dependencies):
  - T1: Guard undefined store IDs in hooks
  - T2: Add delete confirmation dialog
  - T3: Clean up .env.example placeholders
```

---

## Verification
- [ ] `bun run typecheck` — zero errors
- [ ] `git diff` shows only expected changes
- [ ] No functional regressions in e-shop dashboard
