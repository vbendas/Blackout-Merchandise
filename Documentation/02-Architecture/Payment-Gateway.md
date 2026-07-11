# Payment Gateway Architecture

> **Version**: v1.0
> **Last Updated**: May 17, 2026
> **Status**: Active
> **Primary Gateway**: NexaPay (Professional Plan)
> **Backup Gateway**: Stripe (feature-flag switchable)

---

## 1. Overview

Merch From uses a **dual-gateway payment architecture** with NexaPay as the primary processor and Stripe retained as an instant-switchover backup.

| | Primary | Backup |
|--|---------|--------|
| **Gateway** | NexaPay | Stripe |
| **Plan** | Professional ($249/mo yearly) | Standard (pay-per-use) |
| **Processing Cap** | Up to $75,000/month | Unlimited |
| **Providers** | 14 (Visa, MC, Amex, Apple Pay, Google Pay, PayPal, Stripe, Crypto.com, Guardarian, Revolut, MoonPay, Binance Pay, Banxa, Transak) | Visa, MC, Apple Pay, Google Pay |
| **Settlement** | USDC on Polygon (1-2 min) | Fiat bank transfer (T+2 days) |
| **Commission** | 0% NexaPay (launch offer to Jun 28, 2026; projected 1.5% after) + 1-4% provider/network fees | 2.9% + $0.30 per transaction |
| **KYC** | No merchant KYC. Customer KYC only on transactions >$700 (provider-triggered) | Full merchant KYC required |
| **Feature Flag** | `use_nexapay: true` | `use_nexapay: false` |

**Why NexaPay as Primary:**
- Instant settlement (1-2 min) enables per-sale artist payouts — the #1 marketing differentiator
- 14 payment providers maximize global customer coverage (EUR, USD, BRL)
- 0% commission during launch offer; competitive 1.5% projected after
- No merchant KYC removes onboarding friction for artists
- MiCA-compliant, PCI DSS, SOC 2, GDPR certified (London, UK based)

**Why Stripe as Backup:**
- Universally trusted by grant evaluators, investors, and financial institutions
- Mature webhook ecosystem already built and tested in codebase
- Instant-switchover capability via feature flag protects revenue if NexaPay has issues
- Grant applications reference "Stripe" as payment infrastructure (truthful — wired and operational)

---

## 2. NexaPay Integration

### 2.1 Plan Details

| Item | Value |
|------|-------|
| **Plan** | Professional |
| **Monthly Cost** | $279/mo (monthly) or **$249/mo (yearly)** |
| **Processing Limit** | Up to $75,000/month |
| **NexaPay Commission** | 0% (launch offer, ends Jun 28, 2026) |
| **Projected Post-Promo Commission** | ~1.5% (conservative estimate) |
| **Provider + Network Fees** | 1-4% (NexaPay does not profit from these) |
| **Payment Providers** | All 14 (9 premium): Crypto.com, Guardarian, MoonPay, Banxa, Revolut, Unlimit, PayPal, Binance Pay, Stripe, Ramp, Transak, Sardine, UTORG, Topper |
| **Settlement Currency** | USDC (Polygon, Ethereum, BSC) — **Polygon primary for Merch From** |
| **Settlement Speed** | 1-2 minutes after payment confirmation |
| **Team Members** | 5 |
| **Support** | Priority 24/7 |
| **Webhooks** | Yes (real-time payment event callbacks) |

### 2.2 Customer Experience

Customers see a **standard, professional checkout page** — no crypto visible to the buyer.

1. Customer clicks "Buy" on artist's storefront
2. NexaPay checkout page loads: Visa, MC, Amex, Apple Pay, Google Pay, PayPal options
3. Customer pays normally with their card or wallet
4. NexaPay processes payment, deducts provider/network fees (1-4%)
5. NexaPay converts remaining fiat to USDC on Polygon
6. Webhook fires to `/api/payment/webhook` with settlement details
7. Customer sees "Order confirmed" — identical to any normal e-commerce checkout

### 2.3 KYC Policy

| Party | KYC Required | Threshold |
|-------|-------------|-----------|
| **Customers (buyers)** | No (provider may trigger for >$700) | $700 per transaction |
| **Artists (merchants)** | No | — |
| **Platform (Merch From)** | Yes (merchant account) | Exceeds $750/month |

Note: NexaPay's payment providers (MoonPay, Guardarian, etc.) may independently request customer identity verification for large transactions. This is standard in the industry and happens transparently during checkout.

### 2.4 Compliance & Security

- **PCI DSS**: Card processing infrastructure is PCI DSS compliant
- **SOC 2**: NexaPay holds SOC 2 certification
- **GDPR**: Full GDPR compliance (London, UK based)
- **MiCA**: MiCA-compliant (confirmed by NexaPay)
- **Non-custodial**: NexaPay never holds merchant funds — USDC goes directly to our wallet
- **SSL/TLS 1.3**: All API communications encrypted

### 2.5 Company Details

- **Name**: NexaPay
- **Website**: https://nexapay.one
- **Address**: 27 Three Kings' Yard, London W1K 4DF, UK
- **Contact**: support@nexapay.one
- **Telegram**: https://t.me/NexaPaySupport_Bot
- **Status Page**: https://nexapay.one/status
- **API Docs**: https://nexapay.one/docs
- **Founded**: 2025
- **Merchants**: 2,500+ (as of May 2026)

---

## 3. Stripe Backup Integration

Stripe is maintained in the codebase as a **fully operational backup gateway**. It can be activated instantly via feature flag.

### 3.1 When Stripe Activates

- NexaPay experiences downtime or service degradation
- NexaPay's post-promo pricing becomes unfavorable
- Grant or investor requirements mandate traditional payment infrastructure
- Regulatory situations require fiat-only settlement

### 3.2 Stripe Components Retained

| Component | Status | Location |
|-----------|--------|----------|
| Checkout Sessions | Built & tested | `/app/src/app/api/checkout/route.ts` |
| Webhook Handler | Built & tested | `/app/src/app/api/webhooks/stripe/route.ts` |
| Connect Onboarding | Built & tested | `/app/src/app/api/stripe-connect/route.ts` |
| Database Fields | Preserved | `stripeCustomerId`, `stripeConnectId`, `stripePaymentIntentId` |
| Tests | Passing | `*.test.ts` for all routes |

### 3.3 Switchover Mechanism

```typescript
// Feature flag in Upstash Redis or environment variable
const PAYMENT_ADAPTER = process.env.PAYMENT_ADAPTER || 'nexapay';

// Adapter pattern
const adapter = PAYMENT_ADAPTER === 'nexapay'
  ? new NexaPayAdapter()
  : new StripeAdapter();
```

Switchover requires: Update one environment variable → redeploy. All checkout, webhook, and payout logic routes through the adapter interface.

---

## 4. Per-Sale Settlement Flow

This is the core payment flow for every transaction on the platform.

### 4.1 Flow Diagram

```
Customer pays $35 USD (Visa/MC/Apple Pay/Google Pay/PayPal)
  │
  ▼
NexaPay processes card payment
  │ Customer sees normal checkout — no crypto visible
  │ Provider + network fees deducted: ~1-4%
  │
  ▼
NexaPay converts to USDC on Polygon: ~$34.30 USDC
  │ Settlement in 1-2 minutes
  │
  ▼
NexaPay webhook → POST /api/payment/webhook
  │
  ▼
Merch From settlement logic:
  │
  ├─ a. Receive $34.30 USDC in platform wallet (Polygon)
  │
  ├─ b. Lookup product base price: 12 EUR
  │
  ├─ c. Real-time EUR/USD rate (e.g., 1 EUR = 1.1625 USD)
  │     → Base price = 13.95 USDC
  │
  ├─ d. Split funds:
  │     ├─ Platform share: 13.95 USDC
  │     │   → Convert to EURC via Circle (Polygon)
  │     │   → Send 12.00 EURC to platform vault wallet
  │     │
  │     └─ Artist share: 34.30 - 13.95 = 20.35 USDC
  │         → If artist chose USDC: send 20.35 USDC to artist wallet
  │         → If artist chose EURC: convert via Circle → send EURC to artist wallet
  │
  ├─ e. Record all transactions in wallet_transactions table
  │
  ├─ f. Update order: settlementStatus = 'split_completed'
  │
  └─ g. Leopoldo notification: "You just sold a t-shirt! €17.51 sent to your wallet."
```

### 4.2 Financial Breakdown Example ($35 T-Shirt)

| Step | Amount | Currency | Notes |
|------|--------|----------|-------|
| Customer pays | $35.00 | USD | Visa/MC/Apple Pay/Google Pay/PayPal |
| Provider + network fees (1-4%) | -$1.40 | USD | Deducted by NexaPay's provider (not NexaPay) |
| NexaPay commission (0% current / 1.5% projected) | -$0.00 / -$0.52 | USD | Launch offer / projected post-Jun 28 |
| **Settled to Merch From** | **$33.60 / $33.08** | **USDC** | On Polygon, 1-2 min |
| Base price (platform) | $13.95 | USDC → EURC | 12 EUR at EUR/USD 1.1625 |
| **Artist payout** | **$19.65 / $19.13** | **USDC or EURC** | Sent to artist wallet instantly |

### 4.3 Comparison with Stripe Flow

| | NexaPay (Primary) | Stripe (Backup) |
|--|-------------------|-----------------|
| Customer pays | $35.00 | $35.00 |
| Processing fee | ~1-4% (provider) + 0-1.5% (NexaPay) | 2.9% + $0.30 = $1.32 |
| Net received | ~$33.08-$33.60 | $33.68 |
| **Artist payout timing** | **1-2 minutes** | **T+2 to T+7 days** |
| **Platform receives** | USDC on Polygon | USD bank transfer |

---

## 5. PaymentAdapter Architecture

All payment logic routes through a `PaymentAdapter` interface. This abstraction enables instant gateway switchover without touching business logic.

### 5.1 Interface Definition

```typescript
interface CheckoutParams {
  storeId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;        // In cents
  currency: string;           // 'USD', 'EUR', 'BRL'
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;  // artistId, storeSlug, etc.
}

interface CheckoutResult {
  checkoutUrl: string;        // Redirect URL for customer
  sessionId: string;          // Provider session ID
  expiresAt: Date;
}

interface WebhookResult {
  eventType: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'settled' | 'pending' | 'failed';
  metadata: Record<string, string>;
}

interface PaymentAdapter {
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult>;
  getSettlementStatus(transactionId: string): Promise<SettlementStatus>;
}
```

### 5.2 Implementations

```
PaymentAdapter (interface)
├── NexaPayAdapter (primary — feature flag: use_nexapay=true)
│   ├── createCheckoutSession() → NexaPay REST API
│   ├── handleWebhook()         → Verify NexaPay webhook signature
│   └── getSettlementStatus()   → Check Polygon tx status
│
└── StripeAdapter (backup — feature flag: use_nexapay=false)
    ├── createCheckoutSession() → Stripe Checkout Sessions
    ├── handleWebhook()         → Verify Stripe webhook signature
    └── getSettlementStatus()   → Check Stripe PaymentIntent status
```

### 5.3 File Structure

```
app/src/app/api/
├── payment/
│   ├── adapter.ts              # PaymentAdapter interface + factory
│   ├── nexapay/
│   │   ├── adapter.ts          # NexaPayAdapter implementation
│   │   ├── client.ts           # NexaPay REST API client
│   │   └── webhooks.ts         # Webhook signature verification
│   ├── stripe/
│   │   ├── adapter.ts          # StripeAdapter implementation
│   │   ├── client.ts           # Stripe SDK client
│   │   └── webhooks.ts         # Webhook signature verification
│   ├── settlement.ts           # Split logic (base price deduction, conversion, wallet sends)
│   └── wallet.ts               # Wallet management (platform vault, artist wallets)
├── checkout/
│   └── route.ts                # POST /api/checkout → adapter.createCheckoutSession()
└── webhooks/
    ├── nexapay/
    │   └── route.ts            # POST /api/webhooks/nexapay → adapter.handleWebhook()
    └── stripe/
        └── route.ts            # POST /api/webhooks/stripe → adapter.handleWebhook()
```

---

## 6. Multi-Currency Support

### 6.1 MVP Scope (Polygon Only)

| Currency | Use Case | Chain | Conversion Path | Status |
|----------|----------|-------|-----------------|--------|
| **USDC** | NexaPay settlement, default artist payout | Polygon | Received directly from NexaPay | MVP |
| **EURC** | Platform vault, EU artist payout option | Polygon | USDC → EURC via Circle API (Polygon) | MVP |
| **BRL1** | Brazil artist payouts | Stellar | Requires Polygon→Stellar bridge | Post-MVP |

### 6.2 Conversion Layer

```
NexaPay settles in USDC on Polygon
  │
  ├─ Platform share → Circle API converts USDC → EURC on Polygon → vault wallet
  │
  └─ Artist share:
      ├─ Artist chose USDC → send USDC directly to artist wallet (Polygon)
      └─ Artist chose EURC → Circle API converts USDC → EURC → artist wallet (Polygon)
```

**Circle API** handles all conversions on Polygon. No cross-chain bridging needed for MVP.

### 6.3 FX Rate Source

Real-time EUR/USD rates fetched from:
- Primary: Circle API exchange rate (at conversion time)
- Fallback: Open Exchange Rates API
- Stored in `conversion_rates` table for audit trail

### 6.4 Future: Brazil Launch (BRL1 on Stellar)

When Merch From expands to Brazil:
- Requires Polygon → Stellar bridge for USDC → BRL1 conversion
- Artist wallet setup on Stellar (LOBSTR) guided by Leopoldo
- BRL1 is a Stellar-native stablecoin pegged to Brazilian Real
- Aligns with MRCH token distribution plan (Stellar ecosystem)

---

## 7. Fee Structure & Financial Model

### 7.1 NexaPay Cost Breakdown

| Cost Component | Amount | Notes |
|----------------|--------|-------|
| **Monthly subscription** | **$249/mo** (yearly billing) | Professional plan |
| **NexaPay commission** | **0%** (launch offer to Jun 28) | Projected 1.5% after |
| **Provider + network fees** | **1-4%** per transaction | Paid to payment providers, not NexaPay |
| **Circle conversion fees** | ~0.1% per conversion | USDC → EURC on Polygon |
| **Polygon gas fees** | ~$0.01 per transaction | Negligible |

### 7.2 Monthly Cost Projection (at scale)

**Scenario: 2,000 sales/month, $35 avg order = $70,000 GMV**

| Cost Item | During Launch Offer (0%) | Post-Promo (est. 1.5%) |
|-----------|-------------------------|------------------------|
| NexaPay subscription | $249 | $249 |
| NexaPay commission | $0 | $1,050 |
| Provider fees (avg 2.5%) | $1,750 | $1,750 |
| Circle conversions | ~$70 | ~$70 |
| Polygon gas | ~$20 | ~$20 |
| **Total monthly cost** | **~$2,089** | **~$3,139** |
| **Effective rate** | **2.98%** | **4.48%** |

### 7.3 Comparison with Stripe-Only

| Metric | NexaPay (post-promo) | Stripe Only | Difference |
|--------|---------------------|-------------|------------|
| Monthly cost (2K sales) | ~$3,139 | ~$2,630 | +$509 |
| Artist payout speed | 1-2 minutes | T+2 to T+7 days | **Instant** |
| Payment providers | 14 | 4 | **+10 providers** |
| Customer countries | 195+ | ~46 | **+149 countries** |
| Artist onboarding | No KYC | Full KYC | **Zero friction** |

> **Note**: NexaPay costs slightly more per month at scale, but the instant settlement, 14 providers, global coverage, and zero-KYC onboarding create significant business value that cannot be replicated with Stripe alone.

---

## 8. Security Considerations

### 8.1 Wallet Security

- **Platform vault**: Multi-sig wallet on Polygon (requires 2-of-3 signatures for large transfers)
- **Artist wallets**: Artists provide their own Polygon wallet address — we never custody their funds
- **Private keys**: Merch From never stores private keys; all payouts are send-only to artist-provided addresses

### 8.2 Webhook Verification

- All NexaPay webhooks verified against HMAC signature
- All Stripe webhooks verified against Stripe-Signature header
- Idempotency enforced via `processed_webhook_events` table (prevents replay attacks)

### 8.3 Fraud Prevention

- Provider-level fraud detection (each of 14 providers has their own risk engine)
- NexaPay's Sardine integration for ML-based fraud scoring
- Platform-level: Rate limiting, suspicious order flagging via Leopoldo

### 8.4 Regulatory Posture

- NexaPay handles all payment provider regulatory compliance
- Merch From's role: receive USDC, convert to EURC, send to wallets
- Stablecoins (USDC, EURC) are pegged 1:1 to fiat — no volatility risk
- MiCA compliance managed by NexaPay (payment processor) and Circle (stablecoin issuer)

---

## 9. Migration Notes

### 9.1 From Stripe to NexaPay

This section documents the migration from Stripe (original) to NexaPay (primary).

**What Changed:**
- Primary checkout flow: Stripe Checkout → NexaPay Checkout
- Settlement: Fiat bank transfer (T+2) → USDC on Polygon (1-2 min)
- Artist payouts: Stripe Connect (weekly batch) → Polygon wallet (per-sale instant)
- Multi-currency: Stripe Currency Conversion → Circle USDC/EURC on Polygon

**What Stayed:**
- All Stripe code preserved in codebase (backup adapter)
- Stripe database fields retained (`stripeCustomerId`, `stripeConnectId`, `stripePaymentIntentId`)
- Stripe webhook handler remains active at `/api/webhooks/stripe/`
- Feature flag enables instant switchover back to Stripe

### 9.2 Grant Application Strategy

In grant applications and investor-facing documents:
- Reference "Stripe" as payment infrastructure (truthful — operational backup)
- Reference "multi-currency digital payment infrastructure with real-time settlement"
- Do NOT mention cryptocurrency, stablecoins, or blockchain in grant-facing documents
- The PaymentAdapter architecture cleanly supports this dual-narrative

---

## 10. Cross-References

- **Database Schema**: [[02-Architecture/Database-Schema]] — wallet fields, NexaPay transaction fields
- **Business Model**: [[01-Product/Business-Model]] — pricing, Merch Coins, revenue model
- **Tokenization**: [[07-Community/Tokenization]] — MRCH tokens, EURC distributions, Stellar alignment
- **Tech Stack**: [[02-Architecture/Tech-Stack]] — full technology stack
- **AI Stack**: [[02-Architecture/AI-Stack]] — production stack, cost models
- **Production Automation**: [[06-Operations/Production-Automation]] — payment flow in production context

---

**Owner**: Victor Bendas
**Last Updated**: May 17, 2026
**Next Review**: After NexaPay post-promo pricing is confirmed (post Jun 28, 2026)
