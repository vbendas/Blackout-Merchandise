# NexaPay Payment Gateway Integration — Implementation Plan

> **Created**: May 17, 2026
> **Status**: Approved — Ready for Execution
> **Primary Gateway**: NexaPay (Professional Plan, $249/mo yearly)
> **Backup Gateway**: Stripe (feature-flag switchable)
> **Settlement Chain**: Polygon (USDC/EURC)

---

## 1. Overview

**Goal**: Implement NexaPay as the primary payment gateway with Stripe retained as a backup, enabling instant per-sale artist payouts via USDC on Polygon.

**Scope**:
- Create PaymentAdapter abstraction layer
- Implement NexaPayAdapter (checkout, webhooks, settlement)
- Refactor existing Stripe code into StripeAdapter
- Add database fields for NexaPay + wallet transactions
- Build settlement logic (split funds, convert USDC→EURC, send to wallets)
- Update frontend checkout flow
- Add wallet management UI for artists
- Update environment configuration
- Write tests

**Out of scope**:
- BRL1 / Stellar integration (deferred to Brazil launch)
- Circle API integration (Phase 2 — use manual conversion for MVP)
- Multi-sig vault wallet (Phase 2)
- Artist KYC flow (handled by NexaPay)

**Acceptance Criteria**:
- Customer can pay via NexaPay checkout (Visa/MC/Apple Pay/Google Pay/PayPal)
- NexaPay webhook triggers order creation + settlement
- Artist receives USDC payout to their Polygon wallet within 2 minutes
- Platform receives EURC to vault wallet
- Stripe checkout still works when `PAYMENT_ADAPTER=stripe`
- All existing tests pass
- New NexaPay tests pass

**Dependencies**:
- NexaPay API key + webhook secret (from NexaPay dashboard)
- Polygon wallet for platform vault
- Circle API key (for USDC→EURC conversion — can be deferred)
- Real-time FX rate API (Open Exchange Rates or similar)

**Affected Areas**:
- `/app/src/app/api/` — New payment routes, refactored checkout/webhooks
- `/app/src/lib/` — New payment adapter, wallet management, FX rates
- `/src/db/` — Schema migration, new tables
- `/app/src/app/checkout/` — Updated checkout page
- `/app/src/components/eshop/` — Updated dashboard with real payouts
- `/app/.env.local` — New env vars
- `/app/package.json` — New dependencies

---

## 2. Task Breakdown

### T1 `[MAIN]` `[Group A]` — PaymentAdapter Interface + Factory (M)

**Description**: Create the abstraction layer that enables instant gateway switchover.

**Subtasks**:
- T1.1: Create `app/src/lib/payment/types.ts` — TypeScript interfaces
  ```typescript
  interface CheckoutParams {
    storeId: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
    totalAmount: number;
    currency: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }

  interface CheckoutResult {
    checkoutUrl: string;
    sessionId: string;
    expiresAt: Date;
  }

  interface WebhookEvent {
    type: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: 'settled' | 'pending' | 'failed';
    metadata: Record<string, string>;
    rawBody: string;
  }

  interface PaymentAdapter {
    createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
    handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookEvent>;
    getSettlementStatus(transactionId: string): Promise<{ status: string; txHash?: string }>;
  }
  ```

- T1.2: Create `app/src/lib/payment/factory.ts` — Adapter factory
  ```typescript
  export function getPaymentAdapter(): PaymentAdapter {
    const adapter = process.env.PAYMENT_ADAPTER || 'nexapay';
    if (adapter === 'stripe') return new StripeAdapter();
    return new NexaPayAdapter();
  }
  ```

- T1.3: Create `app/src/lib/payment/index.ts` — Barrel exports

**Files**: `app/src/lib/payment/types.ts`, `app/src/lib/payment/factory.ts`, `app/src/lib/payment/index.ts`

---

### T2 `[SUBAGENT]` `[Group A]` — NexaPayAdapter Implementation (L)

**Description**: Implement the primary payment adapter using NexaPay's REST API.

**Subtasks**:
- T2.1: Create `app/src/lib/payment/nexapay/client.ts` — NexaPay REST API client
  - `createPayment()` — POST to NexaPay API to create checkout session
  - `verifyWebhook()` — Verify NexaPay webhook signature (HMAC)
  - `getTransaction()` — GET transaction status
  - Base URL: `https://api.nexapay.one/v1` (confirm with docs)
  - Auth: API key in header

- T2.2: Create `app/src/lib/payment/nexapay/adapter.ts` — NexaPayAdapter class
  - `createCheckoutSession()` → calls NexaPay API, returns checkout URL
  - `handleWebhook()` → verifies signature, parses event, returns WebhookEvent
  - `getSettlementStatus()` → checks NexaPay API for transaction status

- T2.3: Create `app/src/lib/payment/nexapay/constants.ts` — NexaPay config
  - API endpoints, event types, supported currencies

**Files**: `app/src/lib/payment/nexapay/client.ts`, `app/src/lib/payment/nexapay/adapter.ts`, `app/src/lib/payment/nexapay/constants.ts`

`[DEP]` Requires NexaPay API documentation for exact endpoint paths, request/response schemas, and webhook signature verification method.

---

### T3 `[SUBAGENT]` `[Group A]` — StripeAdapter Refactor (M)

**Description**: Refactor existing Stripe code into the adapter pattern.

**Subtasks**:
- T3.1: Create `app/src/lib/payment/stripe/adapter.ts` — StripeAdapter class
  - `createCheckoutSession()` → wraps existing `/api/checkout` logic
  - `handleWebhook()` → wraps existing webhook handler logic
  - `getSettlementStatus()` → checks Stripe PaymentIntent status

- T3.2: Create `app/src/lib/payment/stripe/client.ts` — Stripe client wrapper
  - Extract Stripe instantiation from API routes into reusable client

- T3.3: Create `app/src/lib/payment/stripe/constants.ts` — Stripe config

**Files**: `app/src/lib/payment/stripe/adapter.ts`, `app/src/lib/payment/stripe/client.ts`, `app/src/lib/payment/stripe/constants.ts`

---

### T4 `[SUBAGENT]` `[Group A]` — Database Schema Migration (M)

**Description**: Add NexaPay fields and new tables to the Drizzle schema.

**Subtasks**:
- T4.1: Update `src/db/schema.ts` — Add NexaPay fields to existing tables
  - `users`: Add `payoutWalletAddress`, `payoutCurrency`, `nexapayMerchantId`
  - `orders`: Add `nexapayTransactionId`, `settlementStatus`, `platformShareEurc`, `artistShareUsdc`, `artistPayoutTxHash`, `vaultDepositTxHash`, `fxRateUsed`

- T4.2: Add `walletTransactions` table to `src/db/schema.ts`
  ```typescript
  export const walletTransactions = pgTable('wallet_transactions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    orderId: uuid('order_id').references(() => orders.id),
    type: text('type').notNull(), // 'platform_income' | 'artist_payout' | 'vault_deposit' | 'conversion'
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(), // 'USDC' | 'EURC'
    txHash: text('tx_hash'),
    status: text('status').default('pending').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  });
  ```

- T4.3: Add `conversionRates` table to `src/db/schema.ts`
  ```typescript
  export const conversionRates = pgTable('conversion_rates', {
    id: uuid('id').defaultRandom().primaryKey(),
    fromCurrency: text('from_currency').notNull(),
    toCurrency: text('to_currency').notNull(),
    rate: decimal('rate').notNull(),
    source: text('source').notNull(), // 'circle' | 'openxr' | 'manual'
    fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  });
  ```

- T4.4: Generate and apply migration
  ```bash
  bunx drizzle-kit generate
  bunx drizzle-kit migrate
  ```

- T4.5: Update `src/db/orders.ts` — Update `createOrder` to accept NexaPay fields

**Files**: `src/db/schema.ts`, `src/db/orders.ts`, `drizzle/` (new migration file)

`[CRITICAL]` Do NOT remove existing Stripe fields (`stripeCustomerId`, `stripeConnectId`, `stripePaymentIntentId`). They must remain for backup gateway support.

---

### T5 `[SUBAGENT]` `[Group B]` (after T1, T2) — NexaPay API Routes (L)

**Description**: Create new API routes for NexaPay checkout and webhooks.

**Subtasks**:
- T5.1: Create `app/src/app/api/checkout/route.ts` — Refactor to use adapter
  - Replace direct Stripe call with `getPaymentAdapter().createCheckoutSession()`
  - Keep existing request/response shape for frontend compatibility

- T5.2: Create `app/src/app/api/webhooks/nexapay/route.ts` — NexaPay webhook handler
  - Verify NexaPay webhook signature
  - Handle `payment.settled` event → trigger settlement logic
  - Handle `payment.failed` event → mark order cancelled
  - Idempotency via `processedWebhookEvents` table

- T5.3: Refactor `app/src/app/api/webhooks/stripe/route.ts` — Keep as-is but mark as backup

**Files**: `app/src/app/api/checkout/route.ts` (refactor), `app/src/app/api/webhooks/nexapay/route.ts` (new)

`[CRITICAL]` The NexaPay webhook handler must be idempotent — same event ID processed twice should not create duplicate orders.

---

### T6 `[SUBAGENT]` `[Group B]` (after T1, T2, T4) — Settlement Logic (L)

**Description**: The core business logic that splits funds and sends payouts after each sale.

**Subtasks**:
- T6.1: Create `app/src/lib/payment/settlement.ts` — Settlement engine
  ```typescript
  async function processSettlement(orderId: string, settledAmountUsdc: number): Promise<void>
  ```
  - Lookup order + product base price
  - Fetch real-time EUR/USD rate
  - Calculate platform share (base price in USDC) and artist share (remainder)
  - Convert platform share to EURC (via Circle API or manual for MVP)
  - Send platform share to vault wallet
  - Send artist share to artist wallet (USDC or EURC based on preference)
  - Record all transactions in `walletTransactions` table
  - Update order `settlementStatus` to `'split_completed'`

- T6.2: Create `app/src/lib/payment/wallet.ts` — Wallet management
  - `sendToWallet(address, amount, currency)` — Send USDC/EURC on Polygon
  - `getWalletBalance(address)` — Check wallet balance
  - Uses ethers.js or viem for Polygon interactions

- T6.3: Create `app/src/lib/payment/fx-rates.ts` — FX rate service
  - `getEurUsdRate()` — Fetch from Open Exchange Rates or Circle API
  - Cache rates in `conversionRates` table
  - Fallback to cached rate if API unavailable

**Files**: `app/src/lib/payment/settlement.ts`, `app/src/lib/payment/wallet.ts`, `app/src/lib/payment/fx-rates.ts`

`[CRITICAL]` For MVP, the Circle API conversion can be simulated. The actual USDC→EURC conversion can be done manually via Circle dashboard until volume justifies API integration. The settlement logic should support both modes via feature flag.

`[DEP]` Requires:
- Polygon RPC URL (Alchemy, Infura, or public)
- Platform vault wallet private key (stored in env var, encrypted)
- Circle API key (optional for MVP)
- Open Exchange Rates API key (or free FX rate source)

---

### T7 `[SUBAGENT]` `[Group B]` (after T5) — Frontend Checkout Update (S)

**Description**: Update the checkout page to work with NexaPay.

**Subtasks**:
- T7.1: Update `app/src/app/checkout/page.tsx`
  - Change "Powered by Stripe" → "Secure checkout" (gateway-agnostic)
  - Remove Stripe-specific branding
  - Keep existing flow: POST to `/api/checkout` → redirect to checkout URL
  - The API route handles which gateway to use via feature flag

- T7.2: Update `app/src/lib/cart/store.ts` — No changes needed (already gateway-agnostic)

**Files**: `app/src/app/checkout/page.tsx`

---

### T8 `[SUBAGENT]` `[Group B]` (after T4, T6) — Artist Wallet Setup UI (M)

**Description**: Artists need to configure their Polygon wallet address and payout currency preference.

**Subtasks**:
- T8.1: Create `app/src/app/app/wallet/page.tsx` — Wallet settings page
  - Input field for Polygon wallet address
  - Dropdown for payout currency: USDC (default) or EURC
  - Validation: Check address format (0x... 42 chars)
  - Save to `users.payoutWalletAddress` and `users.payoutCurrency`

- T8.2: Create `app/src/app/app/wallet/components/WalletForm.tsx` — Wallet form component
  - Address input with validation
  - Currency selector
  - Save button with loading state
  - Success/error messages

- T8.3: Update `app/src/components/eshop/StatsOverview.tsx` — Show real payouts
  - Replace hardcoded `pendingPayout: 0` with actual data from `walletTransactions`
  - Show recent payout history

- T8.4: Update `app/src/components/eshop/EshopDashboard.tsx` — Fetch real payout stats

**Files**: `app/src/app/app/wallet/page.tsx`, `app/src/app/app/wallet/components/WalletForm.tsx`, `app/src/components/eshop/StatsOverview.tsx`, `app/src/components/eshop/EshopDashboard.tsx`

---

### T9 `[MAIN]` `[Group C]` (after T1-T8) — Environment Configuration (S)

**Description**: Add all new environment variables.

**Subtasks**:
- T9.1: Update `app/.env.local` — Add NexaPay + wallet env vars
  ```
  # Payment Gateway
  PAYMENT_ADAPTER=nexapay  # 'nexapay' or 'stripe'

  # NexaPay
  NEXAPAY_API_KEY=nxp_live_...
  NEXAPAY_WEBHOOK_SECRET=whsec_...
  NEXAPAY_BASE_URL=https://api.nexapay.one/v1

  # Polygon Wallet (Platform Vault)
  POLYGON_RPC_URL=https://polygon-rpc.com
  POLYGON_VAULT_PRIVATE_KEY=0x...
  POLYGON_VAULT_ADDRESS=0x...

  # Circle API (optional for MVP)
  CIRCLE_API_KEY=circle_...

  # FX Rates
  OPEN_XRATES_API_KEY=oxr_...

  # Stripe (backup)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

- T9.2: Update `.env.example` — Add all new env var templates

- T9.3: Update `app/src/lib/env.ts` — Add Zod validation for new env vars

- T9.4: Update `app/package.json` — Add new dependencies
  ```json
  "viem": "^2.x",  // Polygon wallet interactions
  "axios": "^1.x"   // NexaPay API client (or use fetch)
  ```

**Files**: `app/.env.local`, `.env.example`, `app/src/lib/env.ts`, `app/package.json`

`[CRITICAL]` `POLYGON_VAULT_PRIVATE_KEY` must be encrypted at rest. Consider using a secrets manager (Upstash, Vercel env vars) — never commit to git.

---

### T10 `[SUBAGENT]` `[Group C]` (after T1-T9) — Tests (M)

**Description**: Write tests for the new payment infrastructure.

**Subtasks**:
- T10.1: Create `app/src/lib/payment/nexapay/adapter.test.ts` — NexaPayAdapter tests
  - Test `createCheckoutSession()` with mock API responses
  - Test `handleWebhook()` with valid/invalid signatures
  - Test `getSettlementStatus()` with mock transaction data

- T10.2: Create `app/src/lib/payment/stripe/adapter.test.ts` — StripeAdapter tests
  - Test adapter interface compliance
  - Test checkout session creation
  - Test webhook handling

- T10.3: Create `app/src/lib/payment/settlement.test.ts` — Settlement logic tests
  - Test fund splitting with various base prices
  - Test FX rate conversion
  - Test wallet send simulation

- T10.4: Create `app/src/app/api/webhooks/nexapay/route.test.ts` — Webhook handler tests
  - Test idempotency (same event processed twice)
  - Test valid webhook → order created
  - Test invalid signature → 400 error
  - Test payment.failed → order cancelled

- T10.5: Update `app/src/middleware.test.ts` — Add NexaPay webhook route to unprotected routes

- T10.6: Update `app/src/lib/test-utils/factories.ts` — Add NexaPay test factories

**Files**: `app/src/lib/payment/nexapay/adapter.test.ts`, `app/src/lib/payment/stripe/adapter.test.ts`, `app/src/lib/payment/settlement.test.ts`, `app/src/app/api/webhooks/nexapay/route.test.ts`, `app/src/middleware.test.ts`, `app/src/lib/test-utils/factories.ts`

---

### T11 `[MAIN]` `[Group C]` (after T10) — Build Verification + Demo Mode (S)

**Description**: Verify everything builds and works.

**Subtasks**:
- T11.1: Run `cd app && bun install` — Install new dependencies
- T11.2: Run `cd app && bun build` — Verify production build passes
- T11.3: Run `cd app && bun lint` — Verify no lint errors
- T11.4: Run `cd app && bun test` — Verify all tests pass
- T11.5: Create demo mode for crowdfunding video
  - Add `DEMO_MODE=true` env var
  - When enabled, simulate NexaPay settlement with scripted responses
  - Show instant payout notification in Leopoldo chat

**Files**: Various (demo mode additions)

---

## 3. Parallelization Map

```
Group A (parallel, no dependencies — can start immediately):
  T1: PaymentAdapter Interface + Factory          [MAIN session]
  T2: NexaPayAdapter Implementation               [SUBAGENT]
  T3: StripeAdapter Refactor                      [SUBAGENT]
  T4: Database Schema Migration                   [SUBAGENT]

Group B (parallel, after Group A completes):
  T5: NexaPay API Routes                          [SUBAGENT]  (depends on T1, T2)
  T6: Settlement Logic                            [SUBAGENT]  (depends on T1, T2, T4)
  T7: Frontend Checkout Update                    [SUBAGENT]  (depends on T5)
  T8: Artist Wallet Setup UI                      [SUBAGENT]  (depends on T4, T6)

Group C (sequential, after Group B):
  T9: Environment Configuration                   [MAIN]      (depends on T1-T8)
  T10: Tests                                      [SUBAGENT]  (depends on T1-T9)
  T11: Build Verification + Demo Mode             [MAIN]      (depends on T10)
```

---

## 4. Agent / Session Assignment

| Task | Assignment | Rationale |
|------|-----------|-----------|
| T1 | `[MAIN]` | Defines the interface all other tasks depend on |
| T2 | `[SUBAGENT]` | Independent implementation, can run in parallel |
| T3 | `[SUBAGENT]` | Independent refactor, can run in parallel |
| T4 | `[SUBAGENT]` | Independent schema changes, can run in parallel |
| T5 | `[SUBAGENT]` | Needs T1+T2 interfaces defined first |
| T6 | `[SUBAGENT]` | Needs T1+T2+T4 — settlement logic is complex but isolated |
| T7 | `[SUBAGENT]` | Simple frontend update, needs T5 API routes |
| T8 | `[SUBAGENT]` | New UI pages, needs T4 schema + T6 wallet logic |
| T9 | `[MAIN]` | Sensitive env vars, needs founder input on secrets |
| T10 | `[SUBAGENT]` | Tests depend on all implementation being complete |
| T11 | `[MAIN]` | Build verification + demo mode requires manual review |

---

## 5. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| NexaPay API docs incomplete | T2 blocked | Use their `llms-full.txt` + contact support for exact endpoints |
| Polygon wallet setup complex | T6 delayed | Use viem for simple send-only transactions; no smart contracts needed |
| Circle API not available for MVP | T6 partial | Manual USDC→EURC conversion via Circle dashboard; flag in code |
| FX rate API costs | Ongoing | Use free tier of Open Exchange Rates; cache rates in DB |
| Webhook signature verification differs | T5 blocked | Test with NexaPay sandbox first; have fallback to accept all webhooks in dev |

---

## 6. Estimated Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1** (Group A) | T1-T4 | 2-3 hours |
| **Phase 2** (Group B) | T5-T8 | 3-4 hours |
| **Phase 3** (Group C) | T9-T11 | 1-2 hours |
| **Total** | | **6-9 hours** |

---

## 7. Pre-Execution Checklist

- [ ] NexaPay API documentation obtained (endpoints, schemas, webhook signature method)
- [ ] NexaPay Professional plan activated ($249/mo yearly)
- [ ] Polygon wallet created for platform vault
- [ ] Circle API key obtained (or deferred to manual conversion)
- [ ] FX rate API key obtained (Open Exchange Rates or similar)
- [ ] Plan approved by Victor Bendas

---

## 8. Cross-References

- **Payment Gateway Architecture**: `Documentation/02-Architecture/Payment-Gateway.md`
- **Database Schema**: `Documentation/02-Architecture/Database-Schema.md`
- **Business Model**: `Documentation/01-Product/Business-Model.md`
- **Tokenization**: `Documentation/07-Community/Tokenization.md`

---

**Owner**: Victor Bendas
**Created**: May 17, 2026
**Status**: Approved — Ready for Execution
