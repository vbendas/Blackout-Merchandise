import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { SessionStore } from '@/lib/auth';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { fanProductName } from '@/lib/storefront/fan-names';
import { shopUrl, shopUrlLabel } from '@/lib/format/shop-url';
import { getMonthFigures } from '@/lib/services/billing';
import { listRunsForStore, type RunSummary } from '@/lib/services/runs';
import { storeSummary } from '@/lib/services/stores';

// What the Studio home and the sidebar's Shop block show about the shop:
// the shop itself, this month's sales, what is waiting on the artist
// ("Needs you") and the run to put in the top bar. Everything here is
// read-only. The words are the ones artists see, so no ids, statuses or
// supplier names leak into them.

export type NeedsYouKind = 'proof' | 'payment' | 'production' | 'shipping';

export interface NeedsYouItem {
  /** stable React key, never shown */
  id: string;
  kind: NeedsYouKind;
  title: string;
  /** stage in plain words, e.g. 'Waiting for your OK' */
  state: string;
  /** one word for the button, and the message it sends in the Studio */
  action: { label: string; prompt: string };
}

export interface StudioHomeShop {
  name: string;
  slug: string;
  url: string;
  /** the address as people read it, e.g. 'blackoutmerch.example/hellslain-merch' */
  urlLabel: string;
  /** published: fans can open it */
  live: boolean;
  productsLive: number;
  payoutsReady: boolean;
  runsTotal: number;
  runsOnPress: number;
}

export interface StudioHomeData {
  /** null for accounts without a shop (admins) */
  shop: StudioHomeShop | null;
  salesThisMonth: { count: number; grossCents: number };
  needsYou: NeedsYouItem[];
  /** the run the top bar points at: on the press first, then payment, proof, shipped */
  liveRun: { number: number; label: string; state: string; stage: NeedsYouKind } | null;
}

const STAGE_WORDS = {
  proof: 'Waiting for your OK',
  payment: 'Awaiting payment',
  production: 'On the press',
  shipping: 'Shipped',
} as const;

const EMPTY: StudioHomeData = {
  shop: null,
  salesThisMonth: { count: 0, grossCents: 0 },
  needsYou: [],
  liveRun: null,
};

const NEEDS_YOU_MAX = 12;
// A shipped run stays on the home for two weeks, then drops off.
const SHIPPED_VISIBLE_MS = 14 * 24 * 60 * 60 * 1000;
const KIND_ORDER: Record<NeedsYouKind, number> = { proof: 0, payment: 1, production: 2, shipping: 3 };

const euro = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });

/** Fan sales this month, counted the way Billing counts them (its payout
 * ledger: one row per paid sale, none for the artist's own runs, refunded
 * sales left out), so the two screens agree. */
export async function getSalesThisMonth(storeId: string): Promise<{ count: number; grossCents: number }> {
  const figures = await getMonthFigures(storeId);
  return { count: figures.sales, grossCents: figures.grossCents };
}

interface PendingProof {
  id: string;
  bulkOrderId: string;
}

/** Run proofs waiting for the artist's OK, newest first. A shop product has no proof of its own any more (its
 * design's approval replaces it), so a pending proof a product still has from before is not asked for here. */
async function pendingProofs(storeId: string): Promise<PendingProof[]> {
  const rows = await db
    .select({ id: schema.proofs.id, bulkOrderId: schema.proofs.bulkOrderId })
    .from(schema.proofs)
    .innerJoin(schema.bulkOrders, eq(schema.proofs.bulkOrderId, schema.bulkOrders.id))
    .where(and(eq(schema.proofs.status, 'pending'), eq(schema.bulkOrders.storeId, storeId)))
    .orderBy(desc(schema.proofs.createdAt));

  // One row per run: the newest proof is the one that counts.
  const seen = new Set<string>();
  const out: PendingProof[] = [];
  for (const row of rows) {
    if (!row.bulkOrderId || seen.has(row.bulkOrderId)) continue;
    seen.add(row.bulkOrderId);
    out.push({ id: row.id, bulkOrderId: row.bulkOrderId });
  }
  return out;
}

interface QuoteLineLite {
  productId?: string | null;
  blankCode?: string;
  blankName?: string;
}

/** What a run is made of, from its quote: the artist's own product name when
 * the line came from one, else the blank's display name. */
function describeRun(quote: unknown, productNames: Map<string, string>): string | null {
  const lines = (quote as { lines?: QuoteLineLite[] } | null)?.lines;
  if (!Array.isArray(lines)) return null;
  const names: string[] = [];
  for (const line of lines) {
    const productName = line.productId ? productNames.get(line.productId) : undefined;
    // Older quotes saved the supplier's model name as the line's blank name.
    const name = productName ?? (line.blankCode ? blankDisplayName(line.blankCode, line.blankName ?? '') : '');
    if (name && !names.includes(name)) names.push(name);
  }
  if (names.length === 0) return null;
  return names.length === 1 ? names[0] : `${names[0]} and ${names.length - 1} more`;
}

/** Quote text and last change of the runs that may show on the home. */
async function runDetails(runIds: string[]): Promise<Map<string, { descriptor: string | null; updatedAt: Date }>> {
  const details = new Map<string, { descriptor: string | null; updatedAt: Date }>();
  if (runIds.length === 0) return details;

  const rows = await db
    .select({ id: schema.bulkOrders.id, quote: schema.bulkOrders.quote, updatedAt: schema.bulkOrders.updatedAt })
    .from(schema.bulkOrders)
    .where(inArray(schema.bulkOrders.id, runIds));

  const productIds = new Set<string>();
  for (const row of rows) {
    const lines = (row.quote as { lines?: QuoteLineLite[] } | null)?.lines;
    if (!Array.isArray(lines)) continue;
    for (const line of lines) if (line.productId) productIds.add(line.productId);
  }
  const productNames = new Map<string, string>();
  if (productIds.size > 0) {
    const products = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        blankCode: schema.blanks.code,
        blankName: schema.blanks.name,
        blankSupplierName: schema.blanks.supplierName,
      })
      .from(schema.products)
      .innerJoin(schema.blanks, eq(schema.products.blankCode, schema.blanks.code))
      .where(inArray(schema.products.id, [...productIds]));
    for (const product of products) {
      productNames.set(
        product.id,
        fanProductName(product.name, { code: product.blankCode, name: product.blankName, supplierName: product.blankSupplierName }),
      );
    }
  }

  for (const row of rows) {
    details.set(row.id, { descriptor: describeRun(row.quote, productNames), updatedAt: row.updatedAt });
  }
  return details;
}

const ACTIVE_RUN_STATUSES: RunSummary['status'][] = ['proof_pending', 'awaiting_payment', 'paid', 'in_production', 'shipped'];

/** The run the top bar shows: the one on the press, else what is waiting on
 * the artist, else what has just shipped. Newest first within each stage. */
function pickLiveRun(runs: RunSummary[], shippedFresh: (run: RunSummary) => boolean): StudioHomeData['liveRun'] {
  const stages: [(run: RunSummary) => boolean, NeedsYouKind][] = [
    [(run) => run.status === 'in_production' || run.status === 'paid', 'production'],
    [(run) => run.status === 'awaiting_payment', 'payment'],
    [(run) => run.status === 'proof_pending', 'proof'],
    [(run) => run.status === 'shipped' && shippedFresh(run), 'shipping'],
  ];
  for (const [matches, stage] of stages) {
    const run = runs.find(matches); // runs are newest first
    if (run) return { number: run.number, label: run.label, state: STAGE_WORDS[stage], stage };
  }
  return null;
}

export async function getStudioHome(store: SessionStore | null): Promise<StudioHomeData> {
  if (!store) return EMPTY;

  const [summary, runs, proofs, sales] = await Promise.all([
    storeSummary(store.id),
    listRunsForStore(store.id),
    pendingProofs(store.id),
    getSalesThisMonth(store.id),
  ]);
  if (!summary) return EMPTY;

  const runById = new Map(runs.map((run) => [run.id, run]));
  const activeRuns = runs.filter((run) => ACTIVE_RUN_STATUSES.includes(run.status));
  const details = await runDetails(activeRuns.map((run) => run.id));
  const now = Date.now();
  const shippedFresh = (run: RunSummary) => {
    const updatedAt = details.get(run.id)?.updatedAt;
    return Boolean(updatedAt) && now - updatedAt!.getTime() <= SHIPPED_VISIBLE_MS;
  };
  const runTitle = (run: RunSummary) => {
    const descriptor = details.get(run.id)?.descriptor;
    return descriptor ? `${run.label}, ${descriptor}` : run.label;
  };

  const items: NeedsYouItem[] = [];

  for (const proof of proofs) {
    // A run's proof only counts while the run is waiting on it.
    const run = runById.get(proof.bulkOrderId);
    if (!run || run.status !== 'proof_pending') continue;
    items.push({
      id: `proof-${proof.id}`,
      kind: 'proof',
      title: runTitle(run),
      state: STAGE_WORDS.proof,
      action: { label: 'Review', prompt: `Show me the proof for ${run.label}` },
    });
  }

  for (const run of runs) {
    if (run.status === 'awaiting_payment') {
      items.push({
        id: `run-${run.id}`,
        kind: 'payment',
        title: runTitle(run),
        state: run.totalCents != null ? `${STAGE_WORDS.payment} · ${euro.format(run.totalCents / 100)}` : STAGE_WORDS.payment,
        action: { label: 'Pay', prompt: `Pay for ${run.label}` },
      });
    } else if (run.status === 'in_production' || run.status === 'paid') {
      items.push({
        id: `run-${run.id}`,
        kind: 'production',
        title: runTitle(run),
        state: STAGE_WORDS.production,
        action: { label: 'Watch', prompt: `Open ${run.label}` },
      });
    } else if (run.status === 'shipped' && shippedFresh(run)) {
      items.push({
        id: `run-${run.id}`,
        kind: 'shipping',
        title: runTitle(run),
        state: STAGE_WORDS.shipping,
        action: { label: 'Track', prompt: `Open ${run.label}` },
      });
    }
  }

  // Waiting-on-you first; Array.sort is stable, so newest stays first inside a kind.
  items.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

  return {
    shop: {
      name: summary.name,
      slug: summary.slug,
      url: shopUrl(summary.slug),
      urlLabel: shopUrlLabel(summary.slug),
      live: summary.isPublished,
      productsLive: summary.liveProducts,
      payoutsReady: summary.stripeReady,
      runsTotal: runs.length,
      runsOnPress: runs.filter((run) => run.status === 'in_production' || run.status === 'paid').length,
    },
    salesThisMonth: sales,
    needsYou: items.slice(0, NEEDS_YOU_MAX),
    liveRun: pickLiveRun(runs, shippedFresh),
  };
}
