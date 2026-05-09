# Wave 1 Baseline and Safety Rails (2026-02-12)

## Scope
- `app/`
- `mainpage/`

## Rollback Anchor
- Local snapshot commit: `ccc360e`
- Optional local snapshot branch: `codex/restore-point-2026-02-12`

## Workstream Guardrails
- No destructive git operations (`reset --hard`, forced checkouts, history rewrites) during implementation.
- No feature work mixed into this hardening wave.
- Runtime boundary policy:
  - `app` must import only from `app/src/**`.
  - `mainpage` must import only from `mainpage/src/**`.

## Rollback Procedure
1. `git checkout main`
2. `git reset --hard ccc360e`
3. Optional: `git checkout codex/restore-point-2026-02-12`

## Baseline Commands and Results

### `app`
- `npm run lint`: failed (`136 problems`: `68 errors`, `68 warnings`).
- `npm run typecheck`: passed.
- `npm run build`: failed in this environment due Google Fonts fetch restrictions and workspace-root lockfile warning.

### `mainpage`
- `npm run lint`: failed (`83 problems`: `21 errors`, `62 warnings`).
- `npm run typecheck`: failed (cross-boundary DB import + missing `@heroui/framer-utils` type/module resolution).
- `npm run build`: failed in this environment due Google Fonts fetch restrictions and workspace-root lockfile warning.

## Baseline Risk Snapshot
- Security/reliability risks:
  - webhook endpoints protected by auth middleware.
  - webhook idempotency absent.
  - waitlist GET exposed unnecessary PII.
  - rate-limit tier trusted client-provided `x-user-id`.
- Architecture risks:
  - cross-project import (`app` API importing root `src/db`, `mainpage` importing root `src/db`).
- Delivery risks:
  - CI lint was non-blocking.
  - workflow and script contracts were inconsistent.

## Post-Implementation Verification (2026-02-12)

### Quality Gate Status

#### `app`
- `npm run typecheck`: passed.
- `npm run lint`: passed with warnings only (`0 errors`, `67 warnings`).
- `npx vitest run src/middleware.test.ts src/lib/rate-limit.test.ts src/app/api/waitlist/privacy.test.ts src/app/api/webhooks/stripe/route.test.ts src/app/api/webhooks/clerk/route.test.ts`: passed (`17/17 tests`).
- `npm run build`: still fails in this environment due blocked Google Fonts fetch (not code regression).

#### `mainpage`
- `npm run typecheck`: passed.
- `npm run lint`: passed with warnings only (`0 errors`, `62 warnings`).
- `npm run build`: still fails in this environment due blocked Google Fonts fetch (not code regression).

### Risk Delta Report
- Reduced:
  - Webhook routes are no longer auth-gated by Clerk middleware.
  - Stripe checkout webhook processing has idempotency persistence and transactional writes.
  - Clerk webhook input/headers are validated with deterministic 4xx responses for invalid signatures/headers.
  - Waitlist GET response excludes sensitive profile/interview fields.
  - Waitlist position assignment is transaction-serialized to avoid race-based duplicates.
  - Rate-limit trust now derives identity from Clerk auth context, not caller headers.
  - CI lint is blocking and workflow commands align with project scripts.
  - Cross-root runtime imports removed for touched endpoints and guarded via lint restrictions.
- Remaining:
  - Lint warning debt remains in both projects and should be burned down in Wave 2.
  - Builds require either network access to Google Fonts or local font/self-hosting fallback in CI.
