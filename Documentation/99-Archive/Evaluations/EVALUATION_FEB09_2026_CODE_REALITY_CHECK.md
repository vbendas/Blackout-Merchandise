# MerchFrom: Code Reality Check Evaluation — February 9, 2026

**Evaluation Date:** February 9, 2026
**Evaluator:** Claude Code (DeepSeek-V3.2)
**Status:** Pre-MVP Phase 3.10 (UI Polish Complete, Core Gap Persists)
**Previous Evaluation:** February 6, 2026
**Method:** Full codebase inspection of all source files, git history analysis, verification of claims vs code reality
**Evaluation Criteria:** [EVALUATION_CRITERIA.md](./EVALUATION_CRITERIA.md)

---

## Executive Summary

MerchFrom has delivered impressive UI polish in the last 10 commits — a beautiful eShop Dashboard, conversational merch studio, and unified selection system. However, **the fundamental assessment from the Feb 6 evaluation remains unchanged: the core product (AI-powered commerce) is simulated, and critical architectural issues flagged for 30+ days remain unaddressed.**

This evaluation focuses on **code reality over documentation claims**, applying the Feb 6 audit methodology to the recent commits. The result is sobering: 78 files modified in 12 days with zero progress on P0 issues. The eShop Dashboard UI is beautiful but shows hardcoded analytics. The conversational studio has simulated AI. The database still has zero indexes. The middleware still only protects 2 routes.

**Overall Score: 8.3/10** (Effectively unchanged from Feb 6's calculated 8.26 → 8.3)

The score reflects stabilization at a "strong foundation with known gaps" level. Without addressing the P0 issues, further UI polish provides diminishing returns. The product looks production-ready to an investor but would fail under load.

---

## Score Trajectory

```
Jan 2:   ████░░░░░░ 7.2/10  Documentation-heavy, minimal code
Jan 10:  ████████░░ 8.0/10  Backend functional, AI integrated
Jan 13:  ████████▓░ 8.2/10  Main website complete, community strategy
Jan 14:  ████████▓░ 8.4/10  Strategy refinement, Merchandise Studio
Jan 15:  ████████▓░ 8.5/10  Infrastructure, Claude Code migration
Jan 22:  ████████▓░ 8.6/10  GDPR complete, mobile polish
Jan 24:  ████████▓▓ 8.7/10  AI stack pivot, LoRA strategy
Jan 29:  █████████░ 8.9/10  Holistic refinement (PEAK — later corrected)
Feb 1:   ████████▓░ 8.5/10  Codebase audit reality check (-0.4)
Feb 4:   ████████▓▓ 8.6/10  UX polish, unified selection
Feb 6:   ████████▓░ 8.5/10  Deep audit reveals new code-level issues
Feb 9:   ████████▓░ 8.3/10  Code reality check: UI polish ≠ core progress
        └──────────────────────────────────────────────────────────────────────┘
        Trend: Stabilized ~8.3 after reality check. Core gap blocks 9.0+.
```

---

## Detailed Scoring Breakdown

### 1. Vision & Strategy — 9.5/10 (unchanged)

**Strengths:**
- Differentiated "velvet rope" strategy consistently implemented across all UI touchpoints
- Three Cat-Suite agents provide unique brand personality competitors cannot replicate
- Vegan/eco-friendly positioning hits an underserved niche in creator merchandise
- Business model (no upfront costs for qualified creators) removes key adoption barrier

**New Concern:**
- **Scope creep in documentation vs code divergence.** The PRD has grown to 1,200+ lines covering ML training plans to crowdfunding tokenomics, while critical P0 issues (AI chat, auth, indexes) remain unaddressed for 30+ days.

**Evidence:**
- `Documentation/PRD.md`: 1,200+ lines, comprehensive strategic vision
- `CLAUDE.md`: Clear positioning, technical stack decisions
- UI consistency: All components reflect premium positioning

---

### 2. Business Model — 8.6/10 (-0.2 from Feb 6)

**Strengths:**
- Healthy margin structure: base cost + artist markup = retail price (stored as cents)
- Stripe Connect for artist payouts is architecturally correct
- No-upfront-cost model removes key adoption barrier
- Cost optimization (FLUX.1 LoRA pivot) shows financial discipline

**Critical Issues (Unchanged Since Feb 6):**
- **`fulfillOrder` calls `updateOrderStatus(id, 'fulfilled')` — `'fulfilled'` is NOT in `orderStatusEnum`**
- **`createOrder` has no database transaction** — order + items inserted separately
- **Stripe webhook only handles `checkout.session.completed`** — no failed payment, refund, or dispute handling
- **eShop Dashboard analytics are hardcoded** — shows revenue €12,580 regardless of actual data

**Code Evidence:**
- `src/db/orders.ts:52-54`: `fulfillOrder()` calls `updateOrderStatus(id, 'fulfilled')`
- `src/db/orders.ts:15-33`: `createOrder()` inserts order then items without transaction
- `app/src/components/eshop/AIAssistantSidebar.tsx:66-100`: Hardcoded revenue responses

**Score decrease rationale:** The business model score was previously inflated by assuming payment infrastructure worked. Code inspection reveals runtime bugs that would prevent transactions from completing correctly.

---

### 3. Technical Architecture — 7.8/10 (unchanged)

**Strengths:**
- Monorepo structure with shared `/src/db/` is architecturally sound
- Technology choices are modern and well-matched (Next.js 16, React 19, Drizzle, Neon)
- Build verification pipeline (Biome + oxlint + tsc + secretlint) is robust
- 14 unit tests + 5 E2E test files exist
- Rate limiting with Redis sliding window is production-grade

**Critical Issues (All Unresolved Since Feb 6):**

| Issue | Severity | Location | Status |
|-------|----------|----------|--------|
| **Schema duplication** | CRITICAL | `/mainpage/src/db/schema.ts` vs `/src/db/schema.ts` | UNRESOLVED |
| **Zero database indexes** | HIGH | No indexes on `users.email`, `products.storeId`, `orders.customerId` | UNRESOLVED |
| **Middleware auth scope** | CRITICAL | Only protects `/dashboard(.*)` and `/api/checkout(.*)` | UNRESOLVED |
| **Homepage client-only** | HIGH | `mainpage/src/app/page.tsx` is `'use client'` | UNRESOLVED |
| **`chatSessions.id` type mismatch** | MODERATE | UUID column populated with ULID-format strings | UNRESOLVED |
| **Test mocks don't validate queries** | HIGH | All tests pass regardless of query parameters | UNRESOLVED |
| **`verify.sh` auto-modifies files** | MODERATE | Uses `biome check --write` during verification | UNRESOLVED |

**Recent Commit Analysis:**
- 10 commits (Feb 3-8): 78 files modified, all UI polish, zero addressing above issues
- Pattern: High velocity on visible features, zero velocity on invisible infrastructure

**Score rationale:** Technical debt accumulates with each new UI feature built atop shaky foundations. The architecture is sound in theory but flawed in implementation details.

---

### 4. Market Opportunity — 7.5/10 (unchanged)

**Strengths:**
- Creator economy growing rapidly ($250B+ TAM)
- Premium/eco-friendly merch is underserved niche
- Existing POD platforms optimize for commodity, not quality
- Founder has 9 years screen printing experience + EUR113K owned equipment

**Persistent Weakness:**
- **Zero customer validation data.** No waitlist signups, no interviews conducted, no beta users.
- Competitive analysis remains internal, unvalidated with users
- "100 artists in 6 months" target has no supporting evidence

**Evidence:**
- `Documentation/Customer-Validation-Framework.md`: Contains interview templates, zero completed interviews
- Waitlist table: Schema exists, no evidence of use

**This score cannot exceed 8.0 without customer validation data** (per evaluation criteria Rule 4).

---

### 5. Founder-Market Fit — 9.4/10 (-0.1)

**Strengths:**
- Rare combination: computer engineering + 9 years screen printing + 12 years growth marketing
- Owns EUR113K in production equipment (already amortized)
- Deep domain expertise in color separation and production workflows
- Demonstrates self-correction capacity (accepted Feb 1 audit findings)

**Persistent Concern:**
- **Documentation-over-code pattern continues.** Despite explicit feedback in 5 consecutive evaluations, the Feb 3-8 sprint delivered 78 files of UI polish while P0 infrastructure issues (flagged Feb 1) remain untouched.
- No technical co-founder for AI integration complexity

**Velocity Metrics (Feb 3-8):**
- Commits: 10
- Files modified: 78
- Lines added: ~3,400
- Lines removed: ~800
- **P0 issues addressed: 0**

**Pattern:** Exceptional at research, planning, and UI polish. Consistent gap in converting documented plans into shipped core features.

---

### 6. Competitive Moats — 7.5/10 (unchanged)

**Documented Moats vs Code Reality (Updated for Recent Commits):**

| Claimed Moat | Documentation | Code Reality | Status |
|--------------|---------------|--------------|--------|
| Proprietary LoRA models | 1,200-line training plan | Zero LoRA code | DOCS ONLY |
| Custom Attention U-Net | Training architecture documented | No model files | DOCS ONLY |
| Cat-Suite AI personalities | 60 expressions, sentiment system | `setTimeout` + templates | PARTIALLY BUILT |
| Production quality scoring | PRD section with specs | No scoring code | DOCS ONLY |
| eShop Dashboard analytics | UI with charts, revenue tracking | Hardcoded stats | PARTIALLY BUILT |
| Conversational merch studio | Francisca AI design assistant | Simulated responses | PARTIALLY BUILT |
| GDPR compliance | Schema tables exist, UI exists | API endpoints return 404 | PARTIALLY BUILT |

**Score rationale:** Of 7 claimed moats, 3 are documentation-only, 3 are partially built, and 0 are fully implemented. A moat that exists only in a markdown file provides zero competitive defense.

**Recent development:** The eShop Dashboard and MerchFrom Studio are visually impressive UI components built atop simulated foundations.

---

### 7. Execution Progress — 7.8/10 (+0.3)

**What's Genuinely Working (Verified in Code):**
- eShop Dashboard: Overview, Products, Orders, Analytics tabs with StatsOverview
- Conversational merch studio with Francisca: Design upload, placement, mockup viewer
- Mobile-first workspace redesign: Bottom navigation, responsive components
- Unified My Selection: Showroom and Catalog share product list
- Smooth scroll fixes: Keyboard/trackpad compatibility restored
- Build stability: TypeScript errors resolved, builds pass

**What's Still Missing (Critical Path to MVP):**
1. Real AI chat (LLM integration) — flagged since Jan 10 (30 days)
2. Working checkout flow — Stripe webhook has runtime bugs
3. Auth middleware covering actual app routes
4. Database indexes for performance
5. Customer validation data (any form)

**Velocity Analysis:**
- **Feb 3-8 (6 days):** 10 commits, 78 files, ~3,400 lines added
- **Focus:** 100% UI polish, 0% infrastructure fixes
- **Pattern:** High output on visible features, zero on invisible P0 issues

**Score increase rationale:** The UI polish represents genuine execution velocity. However, velocity on polish while ignoring P0 issues is a concerning pattern.

---

### 8. Investment Readiness — 7.8/10 (unchanged)

**Strengths:**
- Documentation package is comprehensive (PRD, Roadmap, Architecture, Evaluations)
- Visual quality is impressive — workspace UI and marketing page look production-ready
- Founder story is compelling (engineer → screen printer → AI platform builder)
- Cost optimization work shows financial sophistication

**Critical Gaps:**
- **No demo video.** Recommended in every evaluation since Jan 2.
- **No working product demo.** Investor would find: nice marketing page, waitlist form, workspace with simulated chat.
- **Zero traction metrics.** No waitlist signups, no users, no revenue.
- **Core product is simulated.** AI chat is `setTimeout`, analytics are hardcoded.

**Valuation Reality Check:**

| Scenario | Estimate | Evidence Required |
|----------|----------|-------------------|
| Current state (no working demo, no users) | EUR 400K-600K | Codebase quality, founder expertise |
| With real AI chat + working checkout | EUR 800K-1.2M | Actual LLM integration, transaction flow |
| With 50+ waitlist signups + demo video | EUR 1.0M-1.5M | Market validation, pitch materials |
| With 10 active artists + revenue | EUR 1.5M-2.5M | Traction metrics, unit economics |

**This score cannot exceed 8.5 without working demo** (per evaluation criteria Rule 4).

---

## Composite Score Calculation

```
Vision & Strategy:     9.5 × 0.15 = 1.425
Business Model:        8.6 × 0.15 = 1.290
Technical Architecture: 7.8 × 0.15 = 1.170
Market Opportunity:    7.5 × 0.15 = 1.125
Founder-Market Fit:    9.4 × 0.10 = 0.940
Competitive Moats:     7.5 × 0.10 = 0.750
Execution Progress:    7.8 × 0.10 = 0.780
Investment Readiness:  7.8 × 0.10 = 0.780

Raw Weighted Sum:                   8.260
Rounded to 1 decimal:               8.3/10
```

**Note:** Mathematically identical to Feb 6 calculation (8.26 → 8.3), reflecting stabilization despite UI progress.

---

## Documentation vs Code Gap Analysis

| Feature | Documented In | Code Location | Works? | Gap |
|---------|--------------|---------------|--------|-----|
| AI Chat (LLM) | PRD: 3-agent system | `AIAssistantSidebar.tsx:66-100` (`setTimeout`) | No | Simulated responses, no LLM integration |
| LoRA Models | Training plan document | NOT FOUND | No | Documentation-only |
| Production Scoring | PRD quality section | NOT FOUND | No | Documentation-only |
| eShop Analytics | UI shows charts | Hardcoded stats in `defaultStats` | Partial | No real data connection |
| GDPR Data Rights | Schema tables exist | API endpoints return 404 | No | UI exists, backend missing |
| Stripe Checkout | Schema, webhook | Only handles `checkout.session.completed` | Partial | Missing error/failure handling |
| Database Indexes | Schema design docs | Zero custom indexes | No | Full table scans on all queries |
| Auth Middleware | Security requirements | Only protects 2 routes | No | `/app/workspace` unprotected |

**Gap Classification:**
- **SHIPPED:** 0/8 features
- **PARTIALLY BUILT:** 3/8 features (eShop UI, GDPR schema, Stripe partial)
- **DOCS ONLY:** 3/8 features (LoRA, scoring, indexes)
- **NOT STARTED:** 2/8 features (AI integration, auth scope)

---

## Code Verification Results

### Build Verification
```bash
# From project root
./verify.sh
```
**Result:** Build passes with warnings about auto-modification (`biome check --write`)

### Test Execution
```bash
cd app && bun test
```
**Result:** 14 tests pass, but mocks don't validate query parameters

### Route Audit

| Route | Protected? | Should Be? | Gap |
|-------|-----------|------------|-----|
| `/` (marketing) | No | No | - |
| `/app/workspace` | No | Yes | CRITICAL |
| `/app/eshop` | No | Yes | CRITICAL |
| `/api/waitlist` | Partial | Partial | - |
| `/api/checkout` | Yes | Yes | - |
| `/api/webhooks/stripe` | No | Yes | MODERATE |
| `/api/webhooks/clerk` | No | Yes | MODERATE |

**Auth Coverage Gap:** Middleware (`app/middleware.ts`) only protects `/dashboard(.*)` and `/api/checkout(.*)`. The actual application routes (`/app/workspace`, `/app/eshop`) are unprotected.

### Mandatory File Checks

| File | Check | Status |
|------|-------|--------|
| `src/db/schema.ts` | Indexes | FAIL: Zero custom indexes |
| `src/db/schema.ts` | Schema duplication | FAIL: `waitlist` table defined twice |
| `app/middleware.ts` | Auth coverage | FAIL: Only 2 routes protected |
| `src/db/orders.ts` | Transaction usage | FAIL: `createOrder` has no transaction |
| `src/db/orders.ts` | Enum validation | FAIL: `'fulfilled'` not in `orderStatusEnum` |
| `mainpage/src/app/page.tsx` | SSR | FAIL: `'use client'` directive |
| Test files | Mock validation | FAIL: Return data regardless of query |

---

## Founder Decision Quality — February 9, 2026

| Dimension | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Information Gathering | 20% | 9/10 | Exceptional research on tech stack, compliance, market |
| Risk Assessment | 15% | 6/10 | UI risks well-managed; security/architectural risks persistently under-assessed |
| Cost-Benefit Analysis | 15% | 5/10 | Time allocation skewed: 78 UI files vs 0 infrastructure fixes |
| Timing | 15% | 4/10 | P0 issues flagged 30+ days without progress; priority mismatch |
| Implementation Quality | 20% | 9/10 | When building, code quality is high; architecture choices sound |
| Reversibility | 15% | 9/10 | All decisions easily reversible; no lock-in |

**Weighted Score: 7.4/10** (Grade: B)

**Pattern Analysis:** 
1. **Consistent preference for visible polish** over invisible infrastructure
2. **High research capacity** but **execution selectivity** on comfortable tasks
3. **Response to feedback:** Accepts evaluation findings but doesn't prioritize recommendations
4. **Documentation-as-progress bias:** Comprehensive docs created while code gaps persist

**Decision Quality Trend:** Stable at B level. The gap between capability (A+) and execution priority (C) creates the B average.

---

## What It Takes to Reach 9.0/10

| Action | Score Impact | Time Estimate | Priority |
|--------|-------------|---------------|----------|
| Fix middleware auth scope | +0.1 | 10 minutes | P0 |
| Add database indexes | +0.1 | 30 minutes | P0 |
| Fix order fulfillment enum bug | +0.05 | 5 minutes | P0 |
| Delete duplicate schema files | +0.05 | 1 hour | P0 |
| Real AI chat (OpenRouter) | +0.3 | 2-3 days | P1 |
| 5+ customer interviews | +0.2 | 1 week | P1 |
| Demo video (90 seconds) | +0.1 | 1 day | P1 |
| SSR homepage for SEO | +0.1 | 1 day | P2 |
| Complete Stripe webhook handling | +0.15 | 1 day | P2 |

**Estimated time to 9.0: 5-7 focused days + 1 week customer outreach**

**Critical Path:** Address P0 infrastructure issues (1 day) → Implement real AI chat (2-3 days) → Get customer validation (1 week).

---

## New Insights (Not in Prior Evaluations)

### 1. The UI Polish Acceleration Paradox
The Feb 3-8 sprint (78 files, 3,400 lines) demonstrates **exceptional UI development velocity**. However, this velocity was 100% directed at visible polish while 0% directed at invisible P0 infrastructure issues flagged in the Feb 1 audit.

**Implication:** High output capacity exists, but prioritization system is misaligned with project critical path.

### 2. The Simulation Stack
A pattern emerges across features:
- **AI Chat:** `setTimeout` + template responses
- **Analytics:** Hardcoded stats
- **Design Generation:** Placeholder images
- **Checkout:** Partial webhook handling

**Implication:** The product has a "simulation stack" — UI components that look functional but connect to simulated backends.

### 3. Documentation as Progress Proxy
The comprehensive evaluation system itself may be contributing to the problem. With 30+ evaluation and documentation files, there's a risk that **documenting progress substitutes for making progress**.

**Implication:** The evaluation framework (this document) must not become another form of documentation-as-progress.

### 4. Founder Work Pattern Analysis
Pattern from git history:
- **Comfort Zone:** UI/UX polish, animations, component design
- **Avoidance Zone:** Database optimization, security, error handling, infrastructure
- **Research Zone:** Technology evaluation, architecture planning

**Implication:** The work naturally flows toward comfort/research zones and away from avoidance zones.

---

## Recommendations

### P0 (This Week — Must Do)
1. **Fix middleware auth scope** — Change protected routes from `/dashboard(.*)` to `/app(.*)`. (10 minutes)
2. **Add database indexes** — Index `users.email`, `products.storeId`, `orders.customerId`, `orders.stripePaymentIntentId`, `waitlist.status`. (30 minutes)
3. **Fix order fulfillment enum** — Change `'fulfilled'` to `'shipped'` or add to enum. (5 minutes)
4. **Delete duplicate schema** — Remove `/mainpage/src/db/schema.ts`. (1 hour)

### P1 (Next 2 Weeks — Should Do)
5. **Implement real AI chat** — Connect OpenRouter to `AIAssistantSidebar.tsx` and `StudioChat.tsx`. (2-3 days)
6. **Record demo video** — 90-second screen recording of workspace flow. (1 day)
7. **Customer discovery sprint** — 5 artist interviews using validation framework. (1 week)

### P2 (Strategic — Could Do)
8. **Restructure homepage for SSR** — Split `page.tsx` into server + client components. (1 day)
9. **Complete Stripe webhook** — Add failed payment, refund, dispute handling. (1 day)
10. **Create shared DB package** — `@merchfrom/db` package to eliminate duplication. (2 days)

### P3 (Process — How to Work)
11. **Implement "P0 First" rule** — No UI polish commits until all P0 infrastructure issues resolved.
12. **Timebox research** — Limit documentation/evaluation to 1 hour/day maximum.
13. **Pair programming session** — Work with a technical peer on avoidance zone tasks.

---

## Final Assessment

MerchFrom is at a critical inflection point. The **vision is exceptional**, the **founder capability is high**, the **UI is production-quality**, and the **infrastructure is sound in theory**. 

**The single blockage is prioritization.**

The last 10 commits prove velocity exists. The P0 issues are trivial to fix (10 minutes to 1 hour each). The path to 9.0 is clear and achievable in a week of focused work.

**The question is not "can this be built?"** The codebase demonstrates it can. **The question is "will the uncomfortable work get prioritized over the comfortable work?"**

For the sixth consecutive evaluation, the recommendation is identical: **ship the core product.** The documentation is comprehensive. The UI is polished. The strategy is brilliant. What's missing is the engine.

**Score: 8.3/10**

---

*Co-Authored-By: Claude Code (DeepSeek-V3.2) <noreply@anthropic.com>*