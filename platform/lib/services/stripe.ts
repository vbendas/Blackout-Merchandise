import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { db, schema } from '@/lib/db';

// Everything MerchFrom needs from Stripe for wave 2 (Money): Connect Express
// onboarding, hosted Checkout with destination charges, and webhook
// verification, behind one interface with two implementations — a real one
// on the `stripe` SDK and an in-memory mock — so onboarding -> checkout ->
// webhook can be exercised end to end before real Stripe keys land (see
// Platform-Plan.md §0 Money row, §6 Commerce flows). Selection is automatic:
// STRIPE_MOCK=1 or a secret key that doesn't look like a real 'sk_...' key
// forces the mock. This file also owns the small DB-backed helpers
// (startOnboarding, syncStripeAccountStatus*) that read/write stripe_accounts
// — kept here rather than split into a separate service so every write to
// that table goes through one place.

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://merchfrom.com').replace(/\/$/, '');
}

// -- gateway contract ---------------------------------------------------

export interface AccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: string[];
}

export interface CheckoutLineItemInput {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity: number;
}

export interface CreateCheckoutSessionInput {
  lineItems: CheckoutLineItemInput[];
  /** lowercase ISO currency, e.g. 'eur' */
  currency: string;
  customerEmail?: string;
  /** what MerchFrom keeps: Σ base cost + shipping (see checkout.ts). Omit
   * entirely for a plain (non-Connect) charge — bulk orders (checkout.ts's
   * buildBulkCheckout) pay 100% to MerchFrom with no connected account at
   * all, so there is no application fee to set, only ever a POD concept. */
  applicationFeeAmountCents?: number;
  /** the connected account that receives the transfer. Omitting this (along
   * with transferAmountCents) is what makes the session a plain charge on
   * the platform's own account instead of a destination charge — see the
   * bulk order doc on applicationFeeAmountCents above. */
  destinationAccountId?: string;
  /**
   * Fixed amount transferred to the connected account, distinct from
   * "whatever's left after the fee". Setting this explicitly (rather than
   * relying on destination-charge default behaviour) keeps any tax Stripe
   * collects on the platform's own balance instead of it silently riding
   * along into the artist's payout — see checkout.ts for the derivation
   * (subtotal − Σ base cost). Omit for a plain charge (see destinationAccountId).
   */
  transferAmountCents?: number;
  /** Omit to skip Stripe's own shipping collection entirely — used when the
   * address is already known (bulk orders) and shipping is instead folded
   * into a plain line item. */
  shippingAmountCents?: number;
  shippingLabel?: string;
  /** ISO-2 countries for shipping_address_collection.allowed_countries.
   * Omit (along with shippingAmountCents/shippingLabel) to skip Stripe
   * shipping collection — see shippingAmountCents. */
  shippingCountries?: string[];
  /** real gateway only: mock ignores this (there is no Stripe Tax to call) */
  automaticTax: boolean;
  /** may contain the literal Stripe template token '{CHECKOUT_SESSION_ID}' */
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export interface CheckoutShippingDetails {
  name: string | null;
  address: Record<string, unknown> | null;
}

export interface CheckoutSessionSnapshot {
  id: string;
  amountTotalCents: number | null;
  amountSubtotalCents: number | null;
  taxCents: number;
  shippingCents: number;
  currency: string;
  customerEmail: string | null;
  paymentIntentId: string | null;
  metadata: Record<string, string>;
  shippingDetails: CheckoutShippingDetails | null;
  /**
   * Mock mode only: the success_url with '{CHECKOUT_SESSION_ID}' already
   * resolved, so the mock-checkout page's server action knows where to send
   * the fan after "paying". Real Checkout redirects the browser itself, so
   * this is left undefined there.
   */
  successUrl?: string;
}

export interface RefundResult {
  id: string;
  status: string;
}

export interface StripeGateway {
  /** discriminant used instead of `instanceof` — Next.js dev (Turbopack) and
   * some serverless setups instantiate the same source file's classes more
   * than once across separate route bundles, so a plain field survives
   * where `instanceof MockStripeGateway` would not (see getStripeGateway's
   * globalThis-backed singleton doc below). */
  readonly mode: 'real' | 'mock';
  createExpressAccount(input: { storeId: string; country: string; email: string }): Promise<{ accountId: string }>;
  createAccountLink(accountId: string, opts: { returnUrl: string; refreshUrl: string }): Promise<{ url: string }>;
  retrieveAccount(accountId: string): Promise<AccountStatus>;
  createCheckoutSession(params: CreateCheckoutSessionInput): Promise<CheckoutSessionResult>;
  retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionSnapshot>;
  constructWebhookEvent(rawBody: string, signature: string | null): Stripe.Event;
  refund(paymentIntentId: string, amountCents?: number): Promise<RefundResult>;
}

// -- real -----------------------------------------------------------------

export function toCheckoutSessionSnapshot(session: Stripe.Checkout.Session): CheckoutSessionSnapshot {
  const shipping = session.collected_information?.shipping_details ?? null;
  return {
    id: session.id,
    amountTotalCents: session.amount_total,
    amountSubtotalCents: session.amount_subtotal,
    taxCents: session.total_details?.amount_tax ?? 0,
    shippingCents: session.shipping_cost?.amount_total ?? 0,
    currency: session.currency ?? 'eur',
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
    metadata: (session.metadata as Record<string, string> | null) ?? {},
    shippingDetails: shipping ? { name: shipping.name ?? null, address: shipping.address as unknown as Record<string, unknown> } : null,
  };
}

class RealStripeGateway implements StripeGateway {
  readonly mode = 'real' as const;
  private readonly client: Stripe;

  constructor(secretKey: string) {
    // No apiVersion pin: the SDK default for the pinned `stripe` package
    // version is used, per the wave brief.
    this.client = new Stripe(secretKey);
  }

  async createExpressAccount(input: { storeId: string; country: string; email: string }): Promise<{ accountId: string }> {
    const account = await this.client.accounts.create({
      type: 'express',
      country: input.country,
      email: input.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { storeId: input.storeId },
    });
    return { accountId: account.id };
  }

  async createAccountLink(accountId: string, opts: { returnUrl: string; refreshUrl: string }): Promise<{ url: string }> {
    const link = await this.client.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      return_url: opts.returnUrl,
      refresh_url: opts.refreshUrl,
    });
    return { url: link.url };
  }

  async retrieveAccount(accountId: string): Promise<AccountStatus> {
    const account = await this.client.accounts.retrieve(accountId);
    return {
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      requirements: account.requirements?.currently_due ?? [],
    };
  }

  async createCheckoutSession(params: CreateCheckoutSessionInput): Promise<CheckoutSessionResult> {
    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      line_items: params.lineItems.map((line) => ({
        price_data: {
          currency: params.currency,
          product_data: { name: line.name, ...(line.description ? { description: line.description } : {}) },
          unit_amount: line.unitAmountCents,
          tax_behavior: 'exclusive',
        },
        quantity: line.quantity,
      })),
      ...(params.automaticTax ? { automatic_tax: { enabled: true } } : {}),
      // Shipping collection is POD-only: bulk orders already know the ship-to
      // address and fold shipping into a plain line item instead.
      ...(params.shippingCountries ? { shipping_address_collection: { allowed_countries: params.shippingCountries } } : {}),
      ...(params.shippingAmountCents != null && params.shippingLabel
        ? {
            shipping_options: [
              {
                shipping_rate_data: {
                  type: 'fixed_amount' as const,
                  fixed_amount: { amount: params.shippingAmountCents, currency: params.currency },
                  display_name: params.shippingLabel,
                  tax_behavior: 'exclusive' as const,
                },
              },
            ],
          }
        : {}),
      customer_email: params.customerEmail,
      // A destination charge (POD, split with the artist's Connect account)
      // only when destinationAccountId is given; a bulk order omits it for a
      // plain 100%-to-MerchFrom charge — see the interface doc.
      ...(params.destinationAccountId
        ? {
            payment_intent_data: {
              application_fee_amount: params.applicationFeeAmountCents ?? 0,
              transfer_data: { destination: params.destinationAccountId, amount: params.transferAmountCents ?? 0 },
            },
          }
        : {}),
      metadata: params.metadata,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    return { id: session.id, url: session.url ?? '' };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionSnapshot> {
    const session = await this.client.checkout.sessions.retrieve(sessionId);
    return toCheckoutSessionSnapshot(session);
  }

  constructWebhookEvent(rawBody: string, signature: string | null): Stripe.Event {
    if (!signature) throw new Error('Missing stripe-signature header.');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set.');
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }

  async refund(paymentIntentId: string, amountCents?: number): Promise<RefundResult> {
    const refund = await this.client.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      reverse_transfer: true,
    });
    return { id: refund.id, status: refund.status ?? 'unknown' };
  }
}

// -- mock -----------------------------------------------------------------

interface MockAccountRecord extends AccountStatus {
  accountId: string;
}

interface MockSessionRecord {
  id: string;
  lineItems: CheckoutLineItemInput[];
  currency: string;
  customerEmail: string | null;
  shippingAmountCents: number;
  metadata: Record<string, string>;
  successUrl: string;
}

class MockStripeGateway implements StripeGateway {
  readonly mode = 'mock' as const;
  private readonly accounts = new Map<string, MockAccountRecord>();
  private readonly sessions = new Map<string, MockSessionRecord>();

  async createExpressAccount(_input: { storeId: string; country: string; email: string }): Promise<{ accountId: string }> {
    const accountId = `acct_mock_${randomUUID()}`;
    this.accounts.set(accountId, {
      accountId,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirements: ['business_profile.url', 'external_account', 'tos_acceptance.date'],
    });
    return { accountId };
  }

  async createAccountLink(_accountId: string, opts: { returnUrl: string; refreshUrl: string }): Promise<{ url: string }> {
    // No hosted onboarding UI to send the browser to: returnUrl is our own
    // /api/stripe/connect?return=1, which completes onboarding in mock mode
    // the moment it loads (see the connect route's GET handler).
    return { url: opts.returnUrl };
  }

  async retrieveAccount(accountId: string): Promise<AccountStatus> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Unknown mock Stripe account "${accountId}".`);
    return { chargesEnabled: account.chargesEnabled, payoutsEnabled: account.payoutsEnabled, requirements: account.requirements };
  }

  completeMockOnboarding(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Unknown mock Stripe account "${accountId}".`);
    account.chargesEnabled = true;
    account.payoutsEnabled = true;
    account.requirements = [];
  }

  async createCheckoutSession(params: CreateCheckoutSessionInput): Promise<CheckoutSessionResult> {
    const id = `cs_mock_${randomUUID()}`;
    this.sessions.set(id, {
      id,
      lineItems: params.lineItems,
      currency: params.currency,
      customerEmail: params.customerEmail ?? null,
      shippingAmountCents: params.shippingAmountCents ?? 0,
      metadata: params.metadata,
      successUrl: params.successUrl.replace('{CHECKOUT_SESSION_ID}', id),
    });
    return { id, url: `/mock-checkout/${id}` };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionSnapshot> {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error(`Unknown mock Checkout Session "${sessionId}".`);
    const subtotal = record.lineItems.reduce((sum, li) => sum + li.unitAmountCents * li.quantity, 0);
    return {
      id: record.id,
      amountTotalCents: subtotal + record.shippingAmountCents,
      amountSubtotalCents: subtotal,
      taxCents: 0, // automatic_tax is real-mode only
      shippingCents: record.shippingAmountCents,
      currency: record.currency,
      customerEmail: record.customerEmail,
      paymentIntentId: `pi_mock_${record.id}`,
      metadata: record.metadata,
      shippingDetails: null,
      successUrl: record.successUrl,
    };
  }

  constructWebhookEvent(rawBody: string, _signature: string | null): Stripe.Event {
    return JSON.parse(rawBody) as Stripe.Event;
  }

  async refund(_paymentIntentId: string, _amountCents?: number): Promise<RefundResult> {
    return { id: `re_mock_${randomUUID()}`, status: 'succeeded' };
  }
}

// -- selection --------------------------------------------------------------

function isMockMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return process.env.STRIPE_MOCK === '1' || !key.startsWith('sk_');
}

// The mock gateway's accounts/sessions maps must survive across the
// checkout POST and the browser's subsequent navigation to
// /mock-checkout/<id> — two separate requests that, under Next.js dev
// (Turbopack) and some serverless setups, can each instantiate this module
// fresh, resetting a plain module-level `let`. Stashing the singleton on
// globalThis (the same trick used for e.g. a dev-mode Prisma client) makes
// it survive that, as long as both requests land on the same warm process —
// true for `next dev` and a single Vercel function instance, which is all
// the mock gateway ever needs to be true for (real Stripe keeps no local
// state at all, so this only matters pre-launch).
declare global {
  var __merchfromStripeGateway: StripeGateway | undefined;
}

export function getStripeGateway(): StripeGateway {
  if (!globalThis.__merchfromStripeGateway) {
    globalThis.__merchfromStripeGateway = isMockMode() ? new MockStripeGateway() : new RealStripeGateway(process.env.STRIPE_SECRET_KEY!);
  }
  return globalThis.__merchfromStripeGateway;
}

export function isStripeMockMode(): boolean {
  return getStripeGateway().mode === 'mock';
}

/** Flips a mock Express account to charges/payouts enabled — called by the
 * connect route's GET (return/refresh) handler in mock mode. Throws in real
 * mode: there is no hosted onboarding to fake there. */
export function completeMockOnboarding(accountId: string): void {
  const gateway = getStripeGateway();
  if (gateway.mode !== 'mock') {
    throw new Error('completeMockOnboarding is only available in mock mode.');
  }
  (gateway as MockStripeGateway).completeMockOnboarding(accountId);
}

// -- stripe_accounts (DB-backed) --------------------------------------------

export interface StoreStripeStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: string[];
}

function statusFromRow(row: typeof schema.stripeAccounts.$inferSelect): StoreStripeStatus {
  return {
    connected: true,
    accountId: row.accountId,
    chargesEnabled: row.chargesEnabled,
    payoutsEnabled: row.payoutsEnabled,
    requirements: Array.isArray(row.requirements) ? (row.requirements as string[]) : [],
  };
}

export async function getStripeAccountStatus(storeId: string): Promise<StoreStripeStatus> {
  const rows = await db.select().from(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, storeId)).limit(1);
  const row = rows[0];
  return row ? statusFromRow(row) : { connected: false, accountId: null, chargesEnabled: false, payoutsEnabled: false, requirements: [] };
}

export type StartOnboardingResult = { ok: true; url: string; accountId: string } | { ok: false; error: string };

/** Creates the Express account for a store if none exists yet, and returns a
 * fresh onboarding Account Link. Idempotent: a second call reuses the
 * existing account and just issues a new link. */
export async function startOnboarding(storeId: string, urls: { returnUrl: string; refreshUrl: string }): Promise<StartOnboardingResult> {
  const storeRows = await db.select().from(schema.artistStores).where(eq(schema.artistStores.id, storeId)).limit(1);
  const store = storeRows[0];
  if (!store) return { ok: false, error: 'Shop not found.' };

  const gateway = getStripeGateway();
  const existing = await db.select().from(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, storeId)).limit(1);

  let accountId = existing[0]?.accountId;
  if (!accountId) {
    const artistRows = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, store.artistId)).limit(1);
    const email = artistRows[0]?.email ?? `artist-${storeId}@merchfrom.test`;
    const created = await gateway.createExpressAccount({ storeId, country: store.country ?? 'ES', email });
    accountId = created.accountId;
    await db.insert(schema.stripeAccounts).values({ storeId, accountId, chargesEnabled: false, payoutsEnabled: false });
  }

  const link = await gateway.createAccountLink(accountId, urls);
  return { ok: true, url: link.url, accountId };
}

/** Re-reads the account from Stripe and writes charges/payouts/requirements
 * back to stripe_accounts. Returns null when this store has no account yet. */
export async function syncStripeAccountStatus(storeId: string): Promise<StoreStripeStatus | null> {
  const rows = await db.select().from(schema.stripeAccounts).where(eq(schema.stripeAccounts.storeId, storeId)).limit(1);
  const row = rows[0];
  if (!row) return null;

  const status = await getStripeGateway().retrieveAccount(row.accountId);
  await db
    .update(schema.stripeAccounts)
    .set({ chargesEnabled: status.chargesEnabled, payoutsEnabled: status.payoutsEnabled, requirements: status.requirements, lastSyncedAt: new Date() })
    .where(eq(schema.stripeAccounts.storeId, storeId));

  return { connected: true, accountId: row.accountId, ...status };
}

/** Same sync, looked up by Stripe account id — the shape the account.updated
 * webhook arrives in. Also returns the store's artist id so the caller can
 * notify them without a second query. */
export async function syncStripeAccountStatusByAccountId(accountId: string): Promise<{ storeId: string; artistId: string; status: StoreStripeStatus } | null> {
  const rows = await db
    .select({ storeId: schema.stripeAccounts.storeId, artistId: schema.artistStores.artistId })
    .from(schema.stripeAccounts)
    .innerJoin(schema.artistStores, eq(schema.stripeAccounts.storeId, schema.artistStores.id))
    .where(eq(schema.stripeAccounts.accountId, accountId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const status = await getStripeGateway().retrieveAccount(accountId);
  await db
    .update(schema.stripeAccounts)
    .set({ chargesEnabled: status.chargesEnabled, payoutsEnabled: status.payoutsEnabled, requirements: status.requirements, lastSyncedAt: new Date() })
    .where(eq(schema.stripeAccounts.storeId, row.storeId));

  return { storeId: row.storeId, artistId: row.artistId, status: { connected: true, accountId, ...status } };
}
