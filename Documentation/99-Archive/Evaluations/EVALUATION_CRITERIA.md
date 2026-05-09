# MerchFrom: Standardized Evaluation Criteria

> **Adopted:** February 6, 2026
> **Version:** 2.0
> **Purpose:** Canonical reference for all future project evaluations. Every evaluation MUST use this framework to ensure consistency and comparability across time.

---

## Table of Contents

1. [Evaluation Principles](#1-evaluation-principles)
2. [Scoring Dimensions](#2-scoring-dimensions)
3. [Scoring Scale](#3-scoring-scale)
4. [Dimension Details & Rubrics](#4-dimension-details--rubrics)
5. [Composite Score Calculation](#5-composite-score-calculation)
6. [Founder Decision Quality Framework](#6-founder-decision-quality-framework)
7. [Code Verification Protocol](#7-code-verification-protocol)
8. [Documentation vs Code Gap Analysis](#8-documentation-vs-code-gap-analysis)
9. [Valuation Estimation Framework](#9-valuation-estimation-framework)
10. [Evaluation Output Template](#10-evaluation-output-template)
11. [Historical Score Registry](#11-historical-score-registry)
12. [Appendix: Anti-Inflation Rules](#appendix-anti-inflation-rules)

---

## 1. Evaluation Principles

### 1.1 Code Over Claims

**The Feb 1, 2026 codebase audit revealed that evaluations 6-8 scored based on documentation claims rather than verified code.** This inflated scores by up to 0.4 points. To prevent recurrence:

- Every claim about a feature MUST be verified against actual source code
- Documentation-only features receive ZERO credit in Technical Architecture, Competitive Moats, and Execution Progress
- Partially-built features (schema exists, API doesn't) receive partial credit with explicit annotation
- The evaluator MUST read key source files, not just documentation

### 1.2 Honest Correction

- If a prior evaluation's score was inflated, the current evaluation MUST correct it — even if the score decreases
- Score decreases are not failures. They are calibration improvements.
- A corrected 8.5 is more valuable than an inflated 9.0

### 1.3 Reproducibility

- Every score MUST include specific evidence (file paths, line numbers, git commits)
- Another evaluator reading the same files should arrive at the same score (+/- 0.2)
- Subjective impressions ("looks good") are insufficient. Cite specific patterns, metrics, or behaviors.

### 1.4 Forward-Looking Bias Prevention

- Score what EXISTS today, not what is planned
- Documentation of future features does not increase Execution Progress
- Strategic plans increase Vision & Strategy only if they are coherent and achievable

---

## 2. Scoring Dimensions

| # | Dimension | Weight | What It Measures |
|---|-----------|--------|------------------|
| 1 | Vision & Strategy | 15% | Clarity of direction, market positioning, differentiation, strategic coherence |
| 2 | Business Model | 15% | Revenue model, unit economics, payment infrastructure, scalability |
| 3 | Technical Architecture | 15% | Stack quality, code health, build systems, security, database design, performance |
| 4 | Market Opportunity | 15% | TAM/SAM/SOM, timing, competitive landscape, customer validation |
| 5 | Founder-Market Fit | 10% | Relevant experience, skills, network, execution velocity |
| 6 | Competitive Moats | 10% | Defensibility, unique assets, network effects, switching costs |
| 7 | Execution Progress | 10% | Features shipped, velocity, blocking issues resolved, code vs docs ratio |
| 8 | Investment Readiness | 10% | Demo quality, traction metrics, documentation package, pitch readiness |

**Total: 100%**

---

## 3. Scoring Scale

| Score | Label | Definition |
|-------|-------|------------|
| 10.0 | Exceptional | Best-in-class, no improvements possible at this stage |
| 9.0-9.9 | Excellent | Production-ready or near-production quality. Minor refinements only. |
| 8.0-8.9 | Strong | Solid foundation with known gaps. Clear path to excellence. |
| 7.0-7.9 | Good | Functional but with significant gaps or risks. Needs focused work. |
| 6.0-6.9 | Fair | Basic structure exists but multiple critical issues. |
| 5.0-5.9 | Weak | Significant problems. Major rework needed. |
| 4.0-4.9 | Poor | Fundamental issues. Core assumptions may be wrong. |
| 3.0-3.9 | Critical | Barely functional. Existential risks present. |
| 2.0-2.9 | Failing | More wrong than right. Pivot likely needed. |
| 1.0-1.9 | Non-viable | Does not meet minimum requirements. |

### Score Change Guidelines

| Change | Meaning | Requires |
|--------|---------|----------|
| +0.5 or more | Major milestone achieved | New feature category shipped, major risk eliminated |
| +0.1 to +0.4 | Incremental progress | Bug fixes, polish, partial features |
| 0.0 | No change | No relevant work, or improvements offset by new findings |
| -0.1 to -0.4 | Calibration correction or regression | New issues discovered, or prior score was inflated |
| -0.5 or more | Major regression | Critical bug introduced, key feature broken, strategic pivot |

---

## 4. Dimension Details & Rubrics

### 4.1 Vision & Strategy (15%)

**What to evaluate:**
- Is the product vision clearly articulated?
- Does the positioning differentiate from competitors?
- Is the go-to-market strategy coherent?
- Are strategic decisions well-reasoned and documented?
- Does the scope match the team's capacity?

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Clear, differentiated vision. Coherent GTM strategy. Scope appropriate for stage. All strategic decisions documented with rationale. |
| 7.0-8.9 | Vision exists but may have gaps. Strategy is mostly coherent. Some scope creep or unclear priorities. |
| 5.0-6.9 | Vision is vague or too broad. Strategy has logical gaps. Significant scope creep. |
| Below 5.0 | No clear vision. Strategy is incoherent or missing. |

**Evidence sources:** PRD.md, Brand-Guidelines.md, Architecture-Decisions.md, CLAUDE.md

---

### 4.2 Business Model (15%)

**What to evaluate:**
- Is the revenue model defined with unit economics?
- Does the pricing structure work (margins, payment flows)?
- Is the payment infrastructure functional (not just planned)?
- Are there runtime bugs in financial code?
- Is the model scalable?

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Revenue model validated with real transactions. Payment infrastructure works end-to-end. Unit economics are healthy. |
| 7.0-8.9 | Revenue model defined. Payment code exists but may have bugs. Unit economics modeled but not validated. |
| 5.0-6.9 | Revenue model exists in documentation only. Payment integration is partial or broken. |
| Below 5.0 | No revenue model defined. No payment infrastructure. |

**Evidence sources:** Stripe webhook code, order processing code, schema financial fields, pricing logic

**CRITICAL CHECK:** Run the payment flow mentally or in code — does `createOrder` use transactions? Does `fulfillOrder` use valid enum values? Does the webhook handle retries/idempotency?

---

### 4.3 Technical Architecture (15%)

**What to evaluate:**
- Stack quality and version currency
- Database schema design (indexes, constraints, relations, cascades)
- API route quality (validation, error handling, security)
- Authentication and authorization coverage
- Build system and CI/CD
- Test coverage and test quality
- Performance patterns (N+1 queries, O(n) operations, SSR)
- Security posture (rate limiting, CORS, CSP, secret scanning)
- Code duplication and architectural consistency

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Production-ready. All routes protected. Database indexed. Transactions where needed. Tests validate behavior. CI/CD catches regressions. |
| 7.0-8.9 | Solid foundation. Some gaps in auth, indexing, or testing. Build works. Known issues documented. |
| 5.0-6.9 | Basic structure. Multiple security gaps. Missing indexes. Tests exist but provide false confidence. Build may have warnings. |
| Below 5.0 | Fundamental architectural problems. Build broken. Security non-existent. |

**Evidence sources:** Direct code inspection of schema.ts, middleware.ts, API routes, test files, verify.sh, CI config

**MANDATORY CHECKS (must be performed every evaluation):**

| Check | How | What to Look For |
|-------|-----|------------------|
| Auth coverage | Read middleware.ts | Are all protected routes covered? |
| Schema indexes | Read schema.ts | Are frequently-queried columns indexed? |
| Transaction usage | Read order/payment code | Are multi-row operations wrapped in transactions? |
| Error handling | Sample 3+ API routes | Do they validate input, handle errors, avoid leaking internals? |
| Test validity | Read 2+ test files | Do mocks actually validate query parameters? |
| Build status | Run verify.sh or check CI | Does the build pass? |
| Schema duplication | Search for duplicate table definitions | Are there conflicting schemas targeting the same DB? |

---

### 4.4 Market Opportunity (15%)

**What to evaluate:**
- TAM/SAM/SOM sizing (documented or estimated)
- Competitive landscape analysis
- Customer validation data (interviews, signups, usage)
- Market timing (growing, shrinking, saturated?)
- Founder's access to the target market

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Large growing market. Customer interviews validate demand. Early traction (signups, revenue, engagement). Differentiated from competitors. |
| 7.0-8.9 | Market is large and growing. Competitive analysis exists. Customer validation planned but not started. Positioning is differentiated. |
| 5.0-6.9 | Market exists but sizing is vague. No customer validation. Competitive differentiation unclear. |
| Below 5.0 | Market is small, shrinking, or saturated. No evidence of demand. |

**CRITICAL RULE:** This dimension CANNOT exceed 8.0 until at least 5 customer interviews or validated waitlist signups exist. Market opportunity is a hypothesis until validated with real human feedback.

**Evidence sources:** Customer-Validation-Framework.md (check for actual data, not just templates), waitlist database entries, any analytics/metrics

---

### 4.5 Founder-Market Fit (10%)

**What to evaluate:**
- Relevant domain expertise
- Technical skills relative to product complexity
- Network access to target customers
- Execution velocity (commits, features shipped per week)
- Self-correction capacity (response to feedback)
- Team gaps and mitigation plans

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Deep domain expertise. Relevant technical skills. Active customer network. High execution velocity. Responds to feedback with action. |
| 7.0-8.9 | Strong domain expertise. Technical skills adequate. Network exists but untapped. Moderate velocity. |
| 5.0-6.9 | Some domain knowledge. Technical skill gaps. Limited network. Slow velocity. |
| Below 5.0 | No domain expertise. Can't build the product. No network. |

**Evidence sources:** Git log (commit frequency and substance), CLAUDE.md background section, response to prior evaluation recommendations

---

### 4.6 Competitive Moats (10%)

**What to evaluate:**
- What defensible advantages exist IN CODE (not just in docs)?
- Are there proprietary assets (data, models, algorithms)?
- Network effects present or planned?
- Switching costs for users?
- Brand/community moat?

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Multiple moats implemented in code. Proprietary data/models trained. Network effects active. High switching costs. |
| 7.0-8.9 | Moats identified and partially built. Some unique assets exist (e.g., brand, expressions). Clear path to defensibility. |
| 5.0-6.9 | Moats described in documentation only. No code implementation. Defensibility is theoretical. |
| Below 5.0 | No moats identified. Product is easily replicable. |

**CRITICAL RULE: The Moat Reality Check Table**

For each claimed moat, fill in this table:

| Claimed Moat | Documentation Exists? | Code Exists? | Works End-to-End? | Status |
|--------------|----------------------|--------------|-------------------|--------|
| [moat name] | Yes/No | Yes/No | Yes/No | SHIPPED / PARTIALLY BUILT / DOCS ONLY / NOT STARTED |

Only moats with status SHIPPED or PARTIALLY BUILT contribute to the score. DOCS ONLY moats score zero.

---

### 4.7 Execution Progress (10%)

**What to evaluate:**
- Features shipped (working in code, not just planned)
- Velocity trend (accelerating, stable, decelerating)
- Blocking issues resolved
- Code-to-documentation ratio
- Phase timeline adherence

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Core product works end-to-end. High velocity. On schedule. Blocking issues resolved within 1 sprint. |
| 7.0-8.9 | Major features built. Moderate velocity. Some delays. Known blocking issues being addressed. |
| 5.0-6.9 | Some features built. Slow velocity. Significant delays. Blocking issues unresolved for 2+ sprints. |
| Below 5.0 | Minimal code. Documentation-heavy. Major delays. Critical gaps unaddressed. |

**Velocity measurement:**
- Count git commits in the evaluation period (exclude docs-only commits)
- Count files modified (source code only, not .md files)
- Compare to prior sprint

**Blocking issue escalation rule:** If the same issue is flagged as "critical" or "P0" in 3+ consecutive evaluations without resolution, the Execution Progress score MUST decrease by at least 0.2 per evaluation until it is resolved.

---

### 4.8 Investment Readiness (10%)

**What to evaluate:**
- Can an investor try the product? (demo quality)
- Traction metrics (any users, signups, revenue?)
- Documentation package completeness
- Demo video exists?
- Pitch deck or narrative exists?
- Valuation justification?

**Scoring rubric:**

| Score Range | Criteria |
|-------------|----------|
| 9.0-10.0 | Working demo. Traction metrics. Demo video. Complete documentation. Compelling founder narrative. Defensible valuation. |
| 7.0-8.9 | Partial demo (some features work). Documentation exists. No traction yet. Demo video planned. |
| 5.0-6.9 | UI mockups only. No working product. Documentation exists but gaps. No traction. |
| Below 5.0 | Nothing to show an investor. |

**Evidence sources:** Try the product (run `bun dev`), check for demo video file, review documentation package

---

## 5. Composite Score Calculation

```
Composite = (Vision * 0.15) + (Business * 0.15) + (Technical * 0.15) + (Market * 0.15)
          + (Founder * 0.10) + (Moats * 0.10) + (Execution * 0.10) + (Investment * 0.10)
```

**Round to 1 decimal place.** Report the raw weighted sum and the rounded score.

**Example:**
```
(9.5 * 0.15) + (8.8 * 0.15) + (7.8 * 0.15) + (7.5 * 0.15)
+ (9.5 * 0.10) + (7.5 * 0.10) + (7.5 * 0.10) + (7.8 * 0.10)

= 1.425 + 1.320 + 1.170 + 1.125 + 0.950 + 0.750 + 0.750 + 0.780
= 8.270

Rounded: 8.3/10
```

**Note:** The evaluator may adjust +/- 0.2 from the raw calculation to account for cross-dimensional factors (e.g., a critical security bug in Technical that also impacts Investment Readiness). Any adjustment MUST be explained.

---

## 6. Founder Decision Quality Framework

Evaluated separately from the main 8 dimensions. Tracks decision-making quality over time.

### 6.1 Scoring Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Information Gathering | 20% | Did the founder research before deciding? Were relevant sources consulted? |
| Risk Assessment | 15% | Were risks identified and mitigated? Were downsides considered? |
| Cost-Benefit Analysis | 15% | Was the trade-off analysis accurate? Were costs/benefits quantified? |
| Timing | 15% | Was the decision made at the right time? Too early? Too late? |
| Implementation Quality | 20% | Was the decision executed well? Did it produce the intended outcome? |
| Reversibility Consideration | 15% | Was reversibility considered? Are there fallback plans? |

### 6.2 Calculation

```
FDQ = (Info * 0.20) + (Risk * 0.15) + (CostBenefit * 0.15)
    + (Timing * 0.15) + (Implementation * 0.20) + (Reversibility * 0.15)
```

### 6.3 Grade Scale

| Score | Grade | Meaning |
|-------|-------|---------|
| 9.0-10.0 | A+ | Exceptional decision-making. Rare miscalculations. |
| 8.0-8.9 | A | Strong decision-making. Minor misjudgments. |
| 7.0-7.9 | B+ | Good decisions overall. Some notable gaps. |
| 6.0-6.9 | B | Adequate. Decisions are reasonable but not optimized. |
| 5.0-5.9 | C | Concerning. Multiple poor decisions or repeated patterns. |
| Below 5.0 | D/F | Critical decision-making failures. |

---

## 7. Code Verification Protocol

Every evaluation MUST perform these verification steps:

### 7.1 Mandatory File Inspections

| File | What to Check |
|------|---------------|
| `src/db/schema.ts` | Indexes, constraints, cascades, enums, relations |
| `app/middleware.ts` | Route protection scope, security headers |
| `app/src/app/api/webhooks/stripe/route.ts` | Signature verification, error handling, idempotency |
| `app/src/app/api/webhooks/clerk/route.ts` | Event handling, user deletion completeness |
| `src/db/orders.ts` | Transaction usage in createOrder |
| `verify.sh` | What checks run, any auto-modification flags |

### 7.2 Build Verification

Run (or verify CI has run recently):
```bash
# From project root
./verify.sh
```

If verify.sh passes, record "Build: PASS". If it fails, record specific failures.

### 7.3 Test Execution

Run (or verify CI has run recently):
```bash
cd app && bun test
```

Record: number of tests, pass/fail, coverage percentage if available.

### 7.4 Route Audit

List all routes in the application and verify which are protected by authentication:

| Route | Protected? | Should Be? | Gap? |
|-------|-----------|------------|------|
| `/` | No | No | - |
| `/app/workspace` | ? | Yes | ? |
| `/api/waitlist` | ? | Partial (POST public, GET protected) | ? |

---

## 8. Documentation vs Code Gap Analysis

**This section was introduced after the Feb 1 codebase audit to prevent score inflation.**

For each major feature or capability claimed in documentation, verify:

| Feature | Documented In | Code Location | Works? | Gap |
|---------|--------------|---------------|--------|-----|
| [feature] | [doc file] | [code file or "NOT FOUND"] | Yes/Partial/No | [description] |

### Gap Classification

| Classification | Definition | Score Impact |
|----------------|------------|--------------|
| **SHIPPED** | Code exists, works end-to-end, tested | Full credit |
| **PARTIALLY BUILT** | Code exists but incomplete or has bugs | 30-70% credit (evaluator discretion) |
| **DOCS ONLY** | Documented but no code exists | Zero credit for Technical, Moats, Execution |
| **NOT STARTED** | Neither documented nor coded | Zero credit |
| **DEPRECATED** | Code exists but is legacy/unused | Zero credit (negative if it creates confusion) |

---

## 9. Valuation Estimation Framework

Provide valuation ranges at different milestones:

| Stage | Criteria | Typical Range |
|-------|----------|---------------|
| **Current** | What exists today, verified | Based on assets + potential |
| **With working MVP** | Core product functional end-to-end | 1.5-2.5x Current |
| **With early traction** | 10+ users, some revenue | 2-4x Current |
| **Post seed round** | Team built, market validated | 3-6x Current |

Valuation factors:
- Founder quality and domain expertise
- Owned production equipment value
- Technical asset quality (code, data, models)
- Market size and timing
- Competitive positioning
- Traction metrics (if any)

**Important:** Valuation estimates MUST reflect CODE REALITY, not documentation claims.

---

## 10. Evaluation Output Template

Every evaluation document MUST follow this structure:

```markdown
# MerchFrom: [Type] Evaluation — [Date]

**Evaluation Date:** [date]
**Evaluator:** [name/model]
**Status:** [phase description]
**Previous Evaluation:** [date]
**Method:** [what was inspected]
**Evaluation Criteria:** [link to this document]

---

## Executive Summary
[3-5 sentences: what happened, overall score, key insight]

---

## Score Trajectory
[ASCII chart showing all historical scores]

---

## Detailed Scoring Breakdown

### 1. Vision & Strategy — X.X/10 (change from prior)
[Evidence-based assessment]

### 2. Business Model — X.X/10 (change from prior)
[Evidence-based assessment]

### 3. Technical Architecture — X.X/10 (change from prior)
[Evidence-based assessment]

### 4. Market Opportunity — X.X/10 (change from prior)
[Evidence-based assessment]

### 5. Founder-Market Fit — X.X/10 (change from prior)
[Evidence-based assessment]

### 6. Competitive Moats — X.X/10 (change from prior)
[Include Moat Reality Check Table]

### 7. Execution Progress — X.X/10 (change from prior)
[Include velocity metrics]

### 8. Investment Readiness — X.X/10 (change from prior)
[Include valuation estimates]

---

## Composite Score Calculation
[Show the math]

---

## Documentation vs Code Gap Analysis
[Gap table for all major features]

---

## Code Verification Results
[Build status, test results, route audit, mandatory file checks]

---

## Founder Decision Quality
[FDQ scoring table and analysis]

---

## What It Takes to Reach [Next Milestone Score]
[Prioritized action table with estimated time and score impact]

---

## Recommendations
[Prioritized list: P0, P1, P2, P3]

---

## New Insights
[Anything discovered that wasn't in prior evaluations]

---

*Co-Authored-By: [evaluator]*
```

---

## 11. Historical Score Registry

All evaluation scores, maintained as a single source of truth.

| # | Date | Score | Evaluator | Key Event | File |
|---|------|-------|-----------|-----------|------|
| 1 | Jan 2, 2026 | 7.2 | Independent Analysis | Documentation-heavy, minimal code | Evaluation-Archive.md |
| 2 | Jan 10, 2026 | 8.0 | Independent Analysis | Backend functional, AI integrated | Evaluation-Archive.md |
| 3 | Jan 13, 2026 | 8.2 | Independent Analysis | Main website complete | Evaluation-Archive.md |
| 4 | Jan 14, 2026 | 8.4 | Independent Analysis | Strategy refinement | Evaluation-Archive.md |
| 5 | Jan 15, 2026 | 8.5 | Independent Analysis | Infrastructure, Claude Code | Evaluation-Archive.md |
| 6 | Jan 22, 2026 | 8.6 | Independent Analysis | GDPR complete, mobile polish | Evaluation-Archive.md |
| 7 | Jan 24, 2026 | 8.7 | Claude Code (Opus 4.5) | AI stack pivot | EVALUATION_JAN24_2026_AI_STACK_PIVOT.md |
| 8 | Jan 29, 2026 | 8.9 | Claude Code (Opus 4.5) | Holistic refinement (PEAK) | EVALUATION_JAN29_2026_HOLISTIC_REVIEW.md |
| 9 | Feb 1, 2026 | 8.5 | Claude Code (Opus 4.5) | Codebase audit reality check | EVALUATION_FEB01_2026_CODEBASE_AUDIT.md |
| 10 | Feb 4, 2026 | 8.6 | Claude Code (Opus 4.5) | UX polish, unified selection | EVALUATION_FEB04_2026_PROGRESS.md |
| 11 | Feb 6, 2026 | 8.5 | Claude Code (Opus 4) | Deep audit, new code-level findings | EVALUATION_FEB06_2026_COMPREHENSIVE_AUDIT.md |
| 12 | Feb 9, 2026 | 8.3 | Claude Code (DeepSeek-V3.2) | Code reality check: UI polish ≠ core progress | EVALUATION_FEB09_2026_CODE_REALITY_CHECK.md |
| 13 | Feb 12, 2026 | 8.5 | MiniMax-M2.5 | Infrastructure resolved: P0 issues fixed | Evaluation-Archive.md |
| 14 | Feb 23, 2026 | 8.7 | MiniMax-M2.5 | Phase 5.5 Mockup System 83%, 174 files added | EVALUATION_FEB23_2026_MOCKUP_SYSTEM_PROGRESS.md |
| 15 | Feb 24, 2026 | 8.9 | Antigravity | AI real (MiniMax M2-Her), 5 P0s resolved, Phase 6 commerce + color separation shipped | Evaluation-Archive.md |

**When adding a new evaluation:** Append a row to this table, increment the #, and link the file.

---

## Appendix: Anti-Inflation Rules

These rules exist because evaluations 6-8 (Jan 22-29) scored based on documentation quality rather than code reality, inflating scores by ~0.4 points.

### Rule 1: No Credit for Documentation-Only Features
A feature that is documented but has no corresponding code receives ZERO credit in Technical Architecture, Competitive Moats, and Execution Progress. It may receive partial credit in Vision & Strategy (if the plan is coherent).

### Rule 2: Verify Before Scoring
Before scoring any dimension above 8.5, the evaluator MUST cite specific files, functions, or behaviors that justify the score. "It's well-documented" is not sufficient for Technical Architecture.

### Rule 3: The P0 Escalation Rule
If a P0 issue is identified in an evaluation and remains unresolved in the next evaluation:
- Execution Progress decreases by at least 0.2
- The issue is escalated to a "Persistent P0" list
- After 3 consecutive evaluations with the same P0, Technical Architecture also decreases by 0.1

**Current Persistent P0s:**
| Issue | First Flagged | Evaluations Unresolved | Current Status |
|-------|--------------|----------------------|----------------|
| AI chat is simulated | Jan 10, 2026 (Eval #2) | 10 evaluations | ✅ RESOLVED (Feb 24) — MiniMax M2-Her real API |
| Middleware auth scope | Feb 1, 2026 (Eval #9) | 3 evaluations | ✅ RESOLVED (Feb 24) — `/app(.*)` + API routes protected |
| Zero database indexes | Feb 6, 2026 (Eval #11) | 2 evaluations | ✅ RESOLVED (Feb 24) — 20+ indexes added |
| Schema duplication | Feb 6, 2026 (Eval #11) | 4 evaluations | ⚠️ UNRESOLVED — `mainpage/src/db/schema.ts` still exists |
| Order fulfillment enum bug | Feb 6, 2026 (Eval #11) | 2 evaluations | ✅ RESOLVED (Feb 24) — `'fulfilled'` added to enum |

### Rule 4: Score Ceiling Without Customer Validation
- Market Opportunity CANNOT exceed 8.0 without validated customer data
- Investment Readiness CANNOT exceed 8.5 without a working demo
- Composite score CANNOT exceed 9.0 without at least one real user

### Rule 5: Cross-Check Composite Against Gut Feeling
After calculating the composite score mathematically, the evaluator should ask: "If an investor spent 1 hour with this product, what score would they give?" If the gut-feel score differs from the calculated score by more than 0.3, investigate why and adjust (with explanation).

---

*This document is the canonical reference for all MerchFrom evaluations. Update the version number if criteria change.*
