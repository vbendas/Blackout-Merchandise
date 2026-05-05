# Plan: Fix Remaining Reviewer Findings — E-shop API Routes

**Status:** COMPLETED  
**Created:** 2026-05-03  
**Last Updated:** 2026-05-03  

---

## Overview
- **Scope:** 5 targeted fixes across 4 files + bun.lock
- **Complexity:** All S (small, <30min each)
- **Dependencies:** None — all tasks are independent
- **Parent Review:** Score improved from 85 → 90/100 after previous fixes (commit `b49de4a`)

---

## Task T1: Fix Zod version mismatch in bun.lock
**Complexity:** S | **Parallel Group:** A

**T1.1:** Run `bun install` in the root to regenerate `bun.lock` with consistent Zod versions
- `bun.lock` has some packages still referencing `zod@3.25.76` while others use `zod@4.3.6`
- **Files:** `bun.lock` (regenerated)
- **Verify:** Check `bun.lock` for no `zod@3.25.76` entries

---

## Task T2: Improve `.env.example` placeholders
**Complexity:** S | **Parallel Group:** A

**T2.1:** Replace look-alike real keys with clearly fake placeholders
- `pk_test_...` → `pk_test_your_clerk_publishable_key`
- `sk_test_...` → `sk_test_your_clerk_secret_key`
- `whsec_...` → `whsec_your_clerk_webhook_secret`
- `sk-or-v1-...` → `sk-or-v1-your_openrouter_key`
- `your_token_here` → `your_upstash_redis_token`
- **Files:** `.env.example`

---

## Task T3: Remove tracked `.DS_Store` from git
**Complexity:** S | **Parallel Group:** A

**T3.1:** Run `git rm --cached .DS_Store` to untrack the file
- File is already in `.gitignore` (line 25), but was committed before `.gitignore` existed
- **Command:** `git rm --cached .DS_Store`
- **Files:** `.DS_Store` (removal from index only, keeps local file)

---

## Task T4: Fix profit margin coloring in ProductsTab
**Complexity:** S | **Parallel Group:** A

**T4.1:** Add conditional coloring for negative margins
- Current: always `text-green-400` regardless of profit value
- Fix: if `profit < 0`, use `text-red-400` instead
- **File:** `app/src/components/eshop/ProductsTab.tsx:133`
- **Code change:** `className={profit >= 0 ? "text-green-400" : "text-red-400"}`

---

## Task T5: Add placeholder comment for pendingPayout
**Complexity:** S | **Parallel Group:** A

**T5.1:** Replace hardcoded `0` with a more descriptive TODO
- Current: `pendingPayout: 0` with inline comment `// Requires Stripe Connect data`
- Fix: add `// TODO: Fetch from Stripe Connect API when onboarding is complete`
- Keep value as `0` (correct until Stripe Connect integration is built)
- **File:** `app/src/components/eshop/EshopDashboard.tsx:47`

---

## Parallelization Map

```
Group A (parallel, no dependencies):
  - T1: bun install (regenerate lockfile)
  - T2: Update .env.example placeholders
  - T3: git rm --cached .DS_Store
  - T4: Fix profit margin coloring
  - T5: Add TODO comment for pendingPayout
```

---

## Verification
- [ ] `bun run typecheck` — zero errors
- [ ] `git status` — .DS_Store is untracked (U), not modified (M)
- [ ] `grep zod@3.25 bun.lock` — no results
- [ ] Build passes (DATABASE_URL env required)

---

## Notes
- All tasks are independent — can be done in any order
- T1 (bun install) may update other lockfile entries beyond zod — review diff before committing
- T4 (profit coloring) is purely cosmetic but improves UX for loss-making products
- T5 (pendingPayout TODO) documents technical debt for future Stripe Connect integration

---

## Related Commits
- `b49de4a` — Fix reviewer findings in e-shop API routes and components (parent commit)
- `3f89088` — Wire up rich chat cards for Cat-Suite agents (unrelated, but recent)