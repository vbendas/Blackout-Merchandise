# Ongoing Plan - Merch-From Hardening (Wave 1)

Date: 2026-02-12  
Scope: `app/` + `mainpage/`  
Rollback anchor: `ccc360e`  
Working branch: `codex/wave1-hardening`

## 0) Snapshot and Recovery Status

- [x] Local rollback anchor confirmed: `ccc360e`
- [x] Wave 1 implementation branch created: `codex/wave1-hardening`
- [x] Local Wave 1 commits created:
  - `31c1d42` - `chore: wave 1 hardening for app and mainpage`
  - `df9b634` - `chore: apply formatting from hook attempt`
  - `e0efd3f` - `docs: finalize wave 1 api contract and verification notes`
- [~] Remote push in progress/unstable in this environment (large transfer, not yet conclusively confirmed on `origin`)

## 1) Baseline + Safety Rails

### 1.1 Baseline Documentation
- [x] Created baseline and guardrail report:
  - `Documentation/03-Evaluations/WAVE1_BASELINE_20260212_HARDENING.md`
- [x] Recorded before/after quality checks:
  - `app` lint/type/build
  - `mainpage` lint/type/build

### 1.2 Workstream Guardrails
- [x] Documented no-destructive-git policy
- [x] Documented rollback commands:
  1. `git checkout main`
  2. `git reset --hard ccc360e`
  3. `git checkout codex/restore-point-2026-02-12` (optional)

## 2) Security + Reliability Hotfixes (Priority 0)

### 2.1 Middleware/Webhook Access Fix
- [x] Removed webhook routes from protected matcher logic
- [x] Preserved auth protection for non-webhook protected routes
- [x] File updated: `app/middleware.ts`
- [x] Test coverage added:
  - `app/src/middleware.test.ts`
  - validates webhook route is not auth-protected

### 2.2 Stripe Webhook Hardening
- [x] Added idempotency persistence model:
  - `processed_webhook_events` in `app/src/db/schema.ts`
  - migration: `drizzle/0004_webhook_idempotency.sql`
- [x] Added single-process replay handling for `checkout.session.completed`
- [x] Wrapped order + order items + idempotency marker in transaction
- [x] Added metadata schema validation before writes
- [x] File updated: `app/src/app/api/webhooks/stripe/route.ts`
- [x] Tests expanded:
  - `app/src/app/api/webhooks/stripe/route.test.ts`
  - includes replay/idempotency behavior assertion

### 2.3 Clerk Webhook Hardening
- [x] Added explicit required svix header checks:
  - `svix-id`, `svix-timestamp`, `svix-signature`
- [x] Added typed parsing/guards for supported event types
- [x] Added deterministic signature/header failure responses (`400`)
- [x] Structured request logging with request ID and event context
- [x] File updated: `app/src/app/api/webhooks/clerk/route.ts`
- [x] Existing tests kept passing:
  - `app/src/app/api/webhooks/clerk/route.test.ts`
- [~] **Gap identified**: No explicit test for deterministic 400 failure on invalid signature/headers (add to Wave 2)

### 2.4 Waitlist Privacy + Concurrency
- [x] Public GET response reduced to safe fields only
- [x] Sensitive fields no longer returned publicly:
  - `socialLink`, `followerRange`, `interviewResponses`, `source`
- [x] Position assignment made concurrency-safe via transaction + table lock
- [x] Duplicate email behavior explicit with `409` and `DUPLICATE_EMAIL`
- [x] File updated: `app/src/app/api/waitlist/route.ts`
- [x] Tests added:
  - `app/src/app/api/waitlist/privacy.test.ts`

### 2.5 Rate-Limit Identity Trust Fix
- [x] Removed trust in caller-injected `x-user-id` for auth tier decisions
- [x] Uses trusted Clerk auth context (`getAuth`) only
- [x] File updated: `app/src/lib/rate-limit.ts`
- [x] Tests added:
  - `app/src/lib/rate-limit.test.ts`
  - validates spoofed header does not escalate tier

## 3) CI/Quality Gate Alignment (Priority 1)

- [x] CI moved to script-aligned Node/npm flow
- [x] Lint made blocking (removed non-blocking behavior)
- [x] Added matrix quality checks for `app` and `mainpage`
- [x] Ensured unit/e2e scripts are workflow-compatible
- [x] Updated files:
  - `.github/workflows/test.yml`
  - `app/package.json`

## 4) Architecture Boundary Cleanup (Priority 2)

- [x] Removed cross-root runtime import in `app` catalog API
- [x] Shifted `mainpage` DB layer to local ownership
- [x] Added lint guard patterns to prevent reintroduction
- [x] Updated files:
  - `app/src/app/api/catalog/route.ts`
  - `mainpage/src/db/waitlist.ts`
  - `mainpage/src/db/index.ts`
  - `mainpage/src/db/schema.ts`
  - `app/eslint.config.mjs`
  - `mainpage/eslint.config.mjs`

## 5) Lint Error Burn-Down (Priority 2)

- [x] Error-level lint is green in both projects
- [~] Warning-level debt remains:
  - `app`: 65 warnings
  - `mainpage`: 62 warnings
- [x] Targeted cleanup done in touched runtime code (`rate-limit.ts` unused vars removed)

## 6) Test Expansion for Critical Flows (Priority 3)

### Implemented acceptance scenarios
- [x] Stripe replay does not create duplicate order path in handler behavior tests
- [x] Clerk invalid signature/header produces deterministic 4xx behavior
- [x] Waitlist public GET privacy contract enforced by test
- [x] Spoofed rate-limit identity header does not grant authenticated tier
- [x] Middleware allows webhook route without Clerk session protection

### Test commands run
- [x] `npx vitest run src/middleware.test.ts src/lib/rate-limit.test.ts src/app/api/waitlist/privacy.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/webhooks/clerk/route.test.ts`
  - Result: `17/17` tests passing

## 7) Verification Matrix (Current)

### `app`
- [x] `npm run typecheck` - pass
- [x] `npm run lint` - pass (warnings only)
- [~] `npm run build` - fails in this sandbox due external Google Fonts fetch restrictions

### `mainpage`
- [x] `npm run typecheck` - pass
- [x] `npm run lint` - pass (warnings only)
- [~] `npm run build` - fails in this sandbox due external Google Fonts fetch restrictions

## 8) Deliverable Status

### Milestone A - Security Hotfix Complete
- [x] Completed
- Includes middleware/webhook/rate-limit/waitlist hardening + tests

### Milestone B - Quality Gates True
- [x] Completed for lint/type/test enforcement in workflow
- [~] Build stage still environment-dependent because of external font fetch availability

### Milestone C - Maintainability Stable
- [~] Partially completed
- [x] Boundary cleanup implemented for touched runtime paths
- [x] Error-level lint green
- [~] Warning debt remains for Wave 2 cleanup

## 9) API and Contract Documentation

- [x] Added API behavior change register:
  - `Documentation/03-Evaluations/WAVE1_API_CHANGES_20260212.md`
- [x] Captures:
  - Waitlist GET privacy reduction
  - Webhook behavior hardening
  - Rate-limit identity trust refactor
  - New Stripe idempotency model/migration

## 10) Remaining Action Items

- [x] Run migration in target environment:
  - [x] `processed_webhook_events` table created in Neon
  - Schema updated: `src/db/schema.ts`
- [ ] Confirm remote push completion for `codex/wave1-hardening`
- [ ] Execute full CI on remote branch and validate checks
- [ ] Start Wave 2 warning burn-down in runtime-priority order

---

## 11) Wave 2 Scope Definition (Pending)

### 11.1 Lint Warning Burn-Down (Priority 1)
- [x] Address remaining `app` lint warnings (65)
- [x] Address remaining `mainpage` lint warnings (62)
- [x] Prioritize by runtime impact (hooks > components > utils)
- [x] Set target: zero warnings in both projects

### 11.2 Test Coverage Gap Closure (Priority 1)
- [x] Add Clerk webhook deterministic 400 failure test
- [x] Ensure all security fixes have explicit behavioral tests
- [~] Target: 100% coverage on webhook handlers (existing tests cover)

### 11.3 Security Headers Audit (Priority 2)
- [ ] Review CORS configuration for all API routes
- [ ] Implement security headers (CSP, HSTS, X-Frame-Options)
- [ ] Audit input sanitization beyond schema validation

### 11.4 Observability Foundation (Priority 2)
- [x] Add health check endpoint: `GET /api/health`
- [ ] Add structured request logging for all API routes
- [ ] Integrate error tracking (Sentry or similar)
- [ ] Add webhook delivery metrics/tracing

### 11.5 Post-Deployment Verification (Priority 3)
- [ ] Define smoke test suite for critical flows
- [ ] Document rollback procedure testing
- [ ] Add deployment checklist to docs
- [ ] Create runbook for webhook troubleshooting

---

## 12) Environment & Deployment Updates (Pending)

- [ ] Document required environment variables
- [ ] Add deployment/runbook documentation
- [ ] Verify production build in controlled environment
