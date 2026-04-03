# Wave 1 API/Behavior Changes (2026-02-12)

## Scope
- `app/`
- `mainpage/`

## Public/External Contract Changes

### `GET /api/waitlist`
- Status: contract reduced for privacy.
- Previous behavior: returned additional user-provided fields (including social/interview payloads).
- New behavior: returns only minimal safe fields:
  - `id`
  - `email`
  - `name`
  - `position`
  - `status`
  - `timestamp`
  - `notified`
- Sensitive fields intentionally excluded from public response:
  - `socialLink`
  - `followerRange`
  - `interviewResponses`
  - `source`

### `POST /api/waitlist`
- Duplicate email remains explicit: `409` with `code: DUPLICATE_EMAIL`.
- Position assignment behavior changed to transaction-serialized assignment to avoid race-related duplicates.

### `POST /api/webhooks/stripe`
- Endpoint path unchanged.
- Adds replay protection via persisted idempotency event tracking.
- `checkout.session.completed` processing is now transaction-wrapped.
- Invalid/missing signature returns deterministic `400`.

### `POST /api/webhooks/clerk`
- Endpoint path unchanged.
- Explicit header validation:
  - `svix-id`
  - `svix-timestamp`
  - `svix-signature`
- Invalid signature/header path now deterministic `400` instead of generic `500`.

### Rate limiting behavior
- Identity for privileged/authenticated tier is sourced from trusted Clerk auth context.
- Caller-injected identity headers (`x-user-id`) are ignored for privilege decisions.

## Internal Type/Model Additions
- New idempotency persistence model:
  - `processed_webhook_events` table
  - unique key on `(provider, event_id)`
- Migration:
  - `drizzle/0004_webhook_idempotency.sql`
