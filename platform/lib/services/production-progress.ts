// Production progress, as the stations record it (owner request, 16 Oct 2026).
// Job sheets are shown on iPads at the production stations, not printed.
// There, production marks screens ready, counts printed pieces (partial
// counts too) and moves each job through its stages. The same numbers feed
// the website's "On the press" board live.
//
// Contract (PS-B builds the station screens against these types): keep the
// names and shapes; additive fields are fine.
//
// The model (migration 0006):
//   - production_jobs: one design's batch for one method (screen, DTG or DTF), and its stage. One batch per design
//     and method takes new pieces at a time, the one not yet off the press (queued, screens or printing); pieces paid
//     for once it has moved on start the next batch.
//   - production_lines: what the job prints for one order or run, by garment, colour, size and print position, with
//     how many are printed. The pieces are added up the way the job sheet adds up its "pieces waiting".
//   - screen_progress: a screen-print job's screens, one per film of each approved screen pack it prints from.
//
// Where jobs come from: syncProductionJobs() reads the paid orders and runs that are not yet packed, keeps those whose
// print files pre-press approved (the production gate's own test, read-only), and makes or updates their jobs and
// lines. It runs when a station reads its list, when an order is paid, when a pack is approved, and when an order is
// refunded or shipped, and it is safe to run any number of times: a printed count is never reset, a total that drops
// below what was printed is clamped and flagged, and a cancelled or refunded order's lines go.
//
// What a station changes: counts (one atomic UPDATE each, so several iPads can count the same line), screen statuses
// and stages, each guarded, each in the activity log. The order follows: its first printed piece moves it from queued
// to printing, and once every piece is printed and every job it is in has reached folding, it is packed. Shipping
// stays the Production page's step, with tracking; a job reads shipped once every order in it has shipped.
//
// The website's board (onThePressFeed) reads the jobs with no personal data: the shop's name only when the shop
// opted in (artist_stores.show_on_press_board), else "Private"; never an email, an order or an address.
import { createHash } from 'node:crypto';
import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, notInArray, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { SessionInfo } from '@/lib/auth';
import { can, PermissionError, type Actor } from '@/lib/auth/permissions';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { jobSheetPath } from '@/lib/print/job-sheet-link';
import { designDisplayName, formatCm, isSuperseded, packInfo, packPlacement, placementKey, positionLabel, samePlacement, storedManifest, type PackRow } from '@/lib/print/pipeline';
import type { PrintPlacement, PrintTechnique } from '@/lib/print/types';
import { advanceFrom } from '@/lib/services/production';
import { toPrintPlacement, type StoredPlacement } from '@/lib/services/prepress';
import { productAreas } from '@/lib/services/print-prep';
import { techniqueOfService } from '@/lib/services/quotes';
import { runNumberFor } from '@/lib/services/runs';
import { recordStaffActivity } from '@/lib/services/team';
import { sortSizes } from '@/lib/storefront/present';

/** The website board's stages, in order (mainpage press board). */
export type ProductionStage = 'queued' | 'screens' | 'printing' | 'curing' | 'folding' | 'shipped';

/** Per screen (film), screen print only. */
export type ScreenStatus = 'waiting' | 'film_printed' | 'screen_ready' | 'on_press' | 'reclaimed';

export type StationKind = 'screen' | 'dtg' | 'dtf' | 'all';

/** One countable line of a job: a garment, colour and size from one order or run. */
export interface ProgressLine {
  /** stable key for updates, unique within the job */
  key: string;
  orderRef: string;
  blankName: string;
  colourName: string;
  size: string;
  total: number;
  printed: number;
  /** additive: where the design prints on the garment, 'Front chest · 28 cm' or 'Front chest · 28 cm + Back · 30 cm' */
  position: string | null;
  /** additive: set when the order came to ask for fewer pieces than were printed; what happened, in plain words */
  flag: string | null;
}

export interface ScreenProgress {
  /** stable key for updates, unique within the job: pack id plus film number */
  key: string;
  setName: string;
  /** "2/6" */
  position: string;
  inkName: string;
  status: ScreenStatus;
  /** additive: the pack the film is in, and its press position (1-based), which the job sheet's films are matched by */
  packId: string;
  filmNumber: number;
}

/** One job: a design's batch for one method, the pieces of every open order and run that use it. */
export interface StationJobSummary {
  jobId: string;
  designId: string;
  designTitle: string;
  shopName: string;
  method: 'screen' | 'dtg' | 'dtf';
  stage: ProductionStage;
  total: number;
  printed: number;
  /** screens ready / screens needed, screen print only */
  screensReady?: number;
  screensTotal?: number;
  updatedAt: string;
  /** additive: staff hid the job from the website's board */
  hiddenFromBoard: boolean;
  /** additive: lines the sync flagged (the order came to ask for fewer pieces than were printed) */
  flaggedLines: number;
}

export interface StationJobDetail extends StationJobSummary {
  lines: ProgressLine[];
  screens: ScreenProgress[];
  /** the job sheet's link (PDF) for the same design */
  jobSheetUrl: string;
  /** additive: the viewer may change counts, screens and stages (Production, Work) */
  canWork: boolean;
}

export interface OnThePressRow {
  /** opaque and stable for the job (a hash, not an id), so the board can follow a row from one read to the next */
  id: string;
  /** shop name if the shop opted in to the board, else "Private" */
  client: string;
  /** "T-shirt", "Hoodie": the garment's name as the catalogue gives it ("Classic tee", "Heavy hoodie") */
  piece: string;
  printed: number;
  total: number;
  /** "6 colours" or "Full colour (DTG)" */
  ink: string;
  /** the board's stage words */
  stage: 'QUEUED' | 'SCREENS' | 'ON THE PRESS' | 'CURING' | 'FOLDING' | 'SHIPPED';
  updatedAt: string;
}

export type ProgressResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** What the services read of who is acting: a SessionInfo, or anything that carries its actor. */
type Who = Pick<SessionInfo, 'actor'>;
type Method = StationJobSummary['method'];
type JobRow = typeof schema.productionJobs.$inferSelect;
type LineRow = typeof schema.productionLines.$inferSelect;

// ---------------------------------------------------------------------------
// Words and rules

const STAGES: readonly ProductionStage[] = ['queued', 'screens', 'printing', 'curing', 'folding', 'shipped'];
const SCREEN_STATUSES: readonly ScreenStatus[] = ['waiting', 'film_printed', 'screen_ready', 'on_press', 'reclaimed'];
const STATIONS: readonly StationKind[] = ['screen', 'dtg', 'dtf', 'all'];
/** The stages a job takes new pieces in: it is not off the press yet. */
const OPEN_STAGES = ['queued', 'screens', 'printing'] as const satisfies readonly ProductionStage[];
/** A screen that can print: burned and checked, or on the press already. */
const READY_SCREENS: readonly ScreenStatus[] = ['screen_ready', 'on_press'];
/** Screens that were made, for "ready / needed" (a reclaimed screen was ready once). */
const MADE_SCREENS: readonly ScreenStatus[] = ['screen_ready', 'on_press', 'reclaimed'];

const BOARD_WORDS: Record<ProductionStage, OnThePressRow['stage']> = {
  queued: 'QUEUED',
  screens: 'SCREENS',
  printing: 'ON THE PRESS',
  curing: 'CURING',
  folding: 'FOLDING',
  shipped: 'SHIPPED',
};
const STAGE_WORDS: Record<ProductionStage, string> = { queued: 'Queued', screens: 'Screens', printing: 'Printing', curing: 'Curing', folding: 'Folding', shipped: 'Shipped' };
const METHOD_WORDS: Record<Method, string> = { screen: 'screen print', dtg: 'DTG', dtf: 'DTF' };
const SCREEN_WORDS: Record<ScreenStatus, string> = { waiting: 'waiting', film_printed: 'film printed', screen_ready: 'ready', on_press: 'on the press', reclaimed: 'reclaimed' };

/** The biggest count a station can enter for one line. */
const MAX_COUNT = 100_000;
/** How long a shipped job stays on the website's board. */
const SHIPPED_ON_BOARD_MS = 48 * 60 * 60 * 1000;
/** The most rows the board gets. */
const BOARD_ROWS = 60;
/** Which rows the board keeps when there are more jobs than it holds, first to last: the press, then what is nearest to done. */
const BOARD_KEEP: Record<ProductionStage, number> = { printing: 0, curing: 1, folding: 2, screens: 3, shipped: 4, queued: 5 };
/** An empty job is removed once it is this old: a job a sync is still filling is never taken from under it. */
const EMPTY_JOB_GRACE_MS = 60_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rank = (stage: ProductionStage) => STAGES.indexOf(stage);
const orderRefOf = (orderId: string) => `ORD-${orderId.slice(0, 8).toUpperCase()}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function denied(who: Who, level: 'view' | 'work'): string | null {
  return can(who.actor, 'production', level) ? null : new PermissionError('production', level).message;
}

/** 'Darks', 'Lights', or the colour a set was made for. */
function setNameOf(key: string | null, colourNames: Map<string, string>): string {
  if (!key) return 'Screens';
  if (key === 'darks') return 'Darks';
  if (key === 'lights') return 'Lights';
  return colourNames.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** 'front_chest:280:0+back:300:0' -> 'Front chest · 28 cm + Back · 30 cm'. */
function positionWords(placement: string | null): string | null {
  if (!placement) return null;
  const parts = placement
    .split('+')
    .map((key) => {
      const [position, width] = key.split(':');
      const widthMm = Number(width);
      return position ? `${positionLabel(position)}${Number.isFinite(widthMm) && widthMm > 0 ? ` · ${formatCm(widthMm)} cm` : ''}` : '';
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' + ') : null;
}

function hashOf(text: string, length: number): string {
  return createHash('sha256').update(text).digest('hex').slice(0, length);
}

// ---------------------------------------------------------------------------
// What an order prints: by design and method, at which positions

/** A run line, as bulk_orders.quote keeps it (bulk.ts BulkQuoteLine); only what production reads. */
interface RunLine {
  productId?: string | null;
  designId?: string | null;
  printServiceCode?: string;
  placement?: (StoredPlacement & { designId?: string | null }) | null;
  extraPlacements?: (StoredPlacement & { designId?: string | null })[] | null;
  colourCode?: string;
}

interface OpenOrder {
  id: string;
  storeId: string;
  orderType: 'pod' | 'bulk';
  productionStatus: string | null;
}

interface OpenItem {
  orderId: string;
  productId: string;
  colourCode: string | null;
  size: string | null;
  qty: number;
  designId: string | null;
  blankCode: string;
  printServiceCode: string;
  placement: unknown;
  placements: unknown;
}

/** One design printed on one order item by one method at one position. */
interface Print {
  designId: string;
  technique: PrintTechnique;
  method: Method;
  placement: PrintPlacement;
}

function methodFor(serviceCode: string, technique: PrintTechnique): Method {
  return technique === 'screen' ? 'screen' : serviceCode === 'dtf' ? 'dtf' : 'dtg';
}

/** What an order item prints, the way pre-press reads the order (resolveOrderRequirements): a shop sale prints DTG/DTF
 * whatever its product says, at every print area of the product; a run line prints the method its artist chose, at the
 * positions it was quoted with (each with its own design when it has one); a run's backing product (a line quoted off a
 * blank) carries the run's method and positions itself. A service with no print file (embroidery) prints nothing here. */
function printsOf(item: OpenItem, orderType: OpenOrder['orderType'], run: RunLine[] | null): Print[] {
  const prints: Print[] = [];
  const add = (designId: string | null | undefined, technique: PrintTechnique, method: Method, at: StoredPlacement | null | undefined) => {
    if (!designId) return;
    const placement = toPrintPlacement(at);
    if (prints.some((p) => p.designId === designId && p.method === method && samePlacement(p.placement, placement))) return;
    prints.push({ designId, technique, method, placement });
  };

  if (orderType === 'bulk' && run) {
    const line = run.find((l) => l.productId === item.productId && l.colourCode === item.colourCode) ?? run.find((l) => l.productId === item.productId);
    if (line?.printServiceCode) {
      const technique = techniqueOfService(line.printServiceCode);
      if (!technique) return [];
      const method = methodFor(line.printServiceCode, technique);
      // The product's own design first, as pre-press reads a run line.
      const lineDesign = item.designId ?? line.designId ?? null;
      const positions: (StoredPlacement & { designId?: string | null })[] = line.placement ? [line.placement, ...(line.extraPlacements ?? [])] : productAreas(item);
      for (const at of positions) add(at?.designId ?? lineDesign, technique, method, at);
      return prints;
    }
  }

  const technique = techniqueOfService(item.printServiceCode);
  if (!technique) return [];
  const printedAs: PrintTechnique = orderType === 'pod' ? 'dtg_dtf' : technique;
  const method = methodFor(item.printServiceCode, printedAs);
  for (const area of productAreas(item)) add(area.designId, printedAs, method, area);
  return prints;
}

type NeededPack = { pack: PackRow; designId: string };

/** The packs that orders are waiting on (production_packs.needed_for names them), not replaced, by order. */
async function packsNeededBy(orderIds: string[]): Promise<Map<string, NeededPack[]>> {
  const wanted = new Set(orderIds);
  const byOrder = new Map<string, NeededPack[]>();
  if (wanted.size === 0) return byOrder;
  const rows = await db
    .select({ pack: schema.productionPacks, designId: schema.designVersions.designId })
    .from(schema.productionPacks)
    .innerJoin(schema.designVersions, eq(schema.productionPacks.designVersionId, schema.designVersions.id))
    .where(
      sql`case when jsonb_typeof(${schema.productionPacks.neededFor}) = 'array' then exists (select 1 from jsonb_array_elements(${schema.productionPacks.neededFor}) as need where need ->> 'orderId' in ${[...wanted]}) else false end`,
    );
  for (const row of rows) {
    if (isSuperseded(row.pack)) continue;
    const needs = Array.isArray(row.pack.neededFor) ? (row.pack.neededFor as { orderId?: unknown }[]) : [];
    const ids = new Set(needs.map((n) => n.orderId).filter((id): id is string => typeof id === 'string' && wanted.has(id)));
    for (const id of ids) {
      const list = byOrder.get(id) ?? [];
      list.push(row);
      byOrder.set(id, list);
    }
  }
  return byOrder;
}

function answers(n: NeededPack, print: Print, blankCode: string): boolean {
  return n.designId === print.designId && n.pack.technique === print.technique && packInfo(n.pack)?.blankCode === blankCode && samePlacement(packPlacement(n.pack), print.placement);
}

/** True when pre-press has approved every print file the order needs: for each design, method, garment, position and
 * colour it prints, a pack built for it, and every such pack approved and built (assertPacksApprovedForOrder's test,
 * without its side effects). An order already printing passed that gate when it moved. */
function filesApproved(order: OpenOrder, needs: { print: Print; blankCode: string; colourCode: string }[], packs: NeededPack[]): boolean {
  if (order.productionStatus === 'printing') return true;
  if (needs.length === 0) return false;
  return needs.every(({ print, blankCode, colourCode }) => {
    const answering = packs.filter((n) => answers(n, print, blankCode));
    if (answering.length === 0) return false;
    if (colourCode && !answering.some((n) => (n.pack.garmentCodes as string[]).includes(colourCode))) return false;
    return answering.every((n) => n.pack.auditStatus === 'approved' && n.pack.buildStatus === 'ready');
  });
}

// ---------------------------------------------------------------------------
// The sync

export interface SyncReport {
  jobsCreated: number;
  jobsRemoved: number;
  jobsShipped: number;
  linesAdded: number;
  linesUpdated: number;
  linesFlagged: number;
  linesRemoved: number;
}

interface WantedLine {
  key: string;
  designId: string;
  designStoreId: string;
  method: Method;
  orderId: string;
  orderRef: string;
  blankCode: string;
  colourCode: string;
  size: string;
  placement: string;
  total: number;
}

/** A JS time as drizzle writes a timestamp column (UTC, the zone dropped), for a raw SQL expression. */
const sqlTime = (date: Date) => sql`${date.toISOString()}::timestamp`;

/** Sets a line's total. Printed is clamped to it in the same statement (so a count landing meanwhile is clamped too),
 * and a line that had more printed than the new total is flagged with the numbers. */
async function setLineTotal(lineId: string, total: number, orderRef?: string): Promise<void> {
  const t = schema.productionLines;
  const now = new Date();
  const over = sql`${t.printed} > ${total}::int`;
  await db
    .update(t)
    .set({
      flag: sql`case when ${over} then format('%s printed; the order now asks for %s, so %s %s extra.', ${t.printed}, ${total}::int, ${t.printed} - ${total}::int, case when ${t.printed} - ${total}::int = 1 then 'is' else 'are' end) else ${t.flag} end`,
      flaggedAt: sql`case when ${over} then ${sqlTime(now)} else ${t.flaggedAt} end`,
      printed: sql`least(${t.printed}, ${total}::int)`,
      total,
      ...(orderRef ? { orderRef } : {}),
      updatedAt: now,
    })
    .where(eq(t.id, lineId));
}

async function runSync(): Promise<SyncReport> {
  const report: SyncReport = { jobsCreated: 0, jobsRemoved: 0, jobsShipped: 0, linesAdded: 0, linesUpdated: 0, linesFlagged: 0, linesRemoved: 0 };
  const touched = new Set<string>();
  const now = new Date();

  // 1. A cancelled order (refunded in full) leaves its jobs.
  const cancelled = await db
    .delete(schema.productionLines)
    .where(inArray(schema.productionLines.orderId, db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.status, 'cancelled'))))
    .returning({ jobId: schema.productionLines.jobId });
  report.linesRemoved += cancelled.length;
  for (const row of cancelled) touched.add(row.jobId);

  // 2. The open orders: paid, not yet packed. What their items print, and the files pre-press holds for them.
  const orders: OpenOrder[] = await db
    .select({ id: schema.orders.id, storeId: schema.orders.storeId, orderType: schema.orders.orderType, productionStatus: schema.orders.productionStatus })
    .from(schema.orders)
    .where(and(eq(schema.orders.status, 'paid'), inArray(schema.orders.productionStatus, ['queued', 'printing'])));
  const orderIds = orders.map((o) => o.id);

  const items: OpenItem[] =
    orderIds.length === 0
      ? []
      : await db
          .select({
            orderId: schema.orderItems.orderId,
            productId: schema.orderItems.productId,
            colourCode: schema.orderItems.colourCode,
            size: schema.orderItems.size,
            qty: schema.orderItems.quantity,
            designId: schema.products.designId,
            blankCode: schema.products.blankCode,
            printServiceCode: schema.products.printServiceCode,
            placement: schema.products.placement,
            placements: schema.products.placements,
          })
          .from(schema.orderItems)
          .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
          .where(inArray(schema.orderItems.orderId, orderIds))
          .orderBy(asc(schema.orderItems.id));

  const bulkIds = orders.filter((o) => o.orderType === 'bulk').map((o) => o.id);
  const runRows =
    bulkIds.length === 0
      ? []
      : await db.select({ id: schema.bulkOrders.id, orderId: schema.bulkOrders.orderId, quote: schema.bulkOrders.quote }).from(schema.bulkOrders).where(inArray(schema.bulkOrders.orderId, bulkIds));
  const runs = new Map<string, { label: string; lines: RunLine[] }>();
  for (const run of runRows) {
    if (!run.orderId) continue;
    const n = await runNumberFor(run.id).catch(() => null);
    const lines = (run.quote as { lines?: RunLine[] } | null)?.lines;
    runs.set(run.orderId, { label: n === null ? 'Run' : `Run ${n}`, lines: Array.isArray(lines) ? lines : [] });
  }

  const printsByItem = new Map<OpenItem, Print[]>();
  const orderById = new Map(orders.map((o) => [o.id, o]));
  for (const item of items) {
    const order = orderById.get(item.orderId);
    if (order) printsByItem.set(item, printsOf(item, order.orderType, runs.get(item.orderId)?.lines ?? null));
  }

  // An order only ever prints its own shop's art (ownDesignsOnly in prepress.ts).
  const designIds = [...new Set([...printsByItem.values()].flatMap((prints) => prints.map((p) => p.designId)))];
  const designRows = designIds.length === 0 ? [] : await db.select({ id: schema.designs.id, storeId: schema.designs.storeId }).from(schema.designs).where(inArray(schema.designs.id, designIds));
  const designStore = new Map(designRows.map((d) => [d.id, d.storeId]));
  for (const [item, prints] of printsByItem) {
    const order = orderById.get(item.orderId)!;
    printsByItem.set(
      item,
      prints.filter((p) => designStore.get(p.designId) === order.storeId),
    );
  }

  const packs = await packsNeededBy(orderIds);

  // 3. The lines each open order should have, when pre-press has approved its files.
  const wanted = new Map<string, WantedLine>();
  const clearedOrders = new Set<string>();
  for (const order of orders) {
    const own = items.filter((i) => i.orderId === order.id);
    const needs = own.flatMap((item) => (printsByItem.get(item) ?? []).map((print) => ({ print, blankCode: item.blankCode, colourCode: item.colourCode ?? '' })));
    if (!filesApproved(order, needs, packs.get(order.id) ?? [])) continue;
    clearedOrders.add(order.id);
    const run = runs.get(order.id);
    const orderRef = run ? `${run.label} · ${orderRefOf(order.id)}` : orderRefOf(order.id);
    for (const item of own) {
      // One line per design and method on the item, with every position that design prints at on it.
      const byJob = new Map<string, Print[]>();
      for (const print of printsByItem.get(item) ?? []) {
        const k = `${print.designId}|${print.method}`;
        byJob.set(k, [...(byJob.get(k) ?? []), print]);
      }
      for (const prints of byJob.values()) {
        const { designId, method } = prints[0];
        const placement = [...new Set(prints.map((p) => placementKey(p.placement)))].sort().join('+');
        const colourCode = item.colourCode ?? '';
        const size = item.size?.trim() || 'OS';
        const key = hashOf([designId, method, order.id, item.blankCode, colourCode, size, placement].join('|'), 24);
        const line = wanted.get(key);
        if (line) line.total += item.qty;
        else wanted.set(key, { key, designId, designStoreId: designStore.get(designId)!, method, orderId: order.id, orderRef, blankCode: item.blankCode, colourCode, size, placement, total: item.qty });
      }
    }
  }

  // 4. Bring the open orders' lines to that.
  const existing: LineRow[] = orderIds.length === 0 ? [] : await db.select().from(schema.productionLines).where(inArray(schema.productionLines.orderId, orderIds));
  const existingByKey = new Map(existing.map((l) => [l.lineKey, l]));
  const removeIds: string[] = [];
  for (const line of existing) {
    if (wanted.has(line.lineKey)) continue;
    if (line.printed === 0 && line.flag === null) {
      // Files no longer approved (an approval undone before anything printed), or a line the order no longer has.
      removeIds.push(line.id);
      touched.add(line.jobId);
    } else if (clearedOrders.has(line.orderId) && line.total !== 0) {
      // Printed pieces the order no longer asks for: kept, clamped and flagged, never silently dropped.
      await setLineTotal(line.id, 0);
      report.linesUpdated += 1;
      report.linesFlagged += 1;
      touched.add(line.jobId);
    }
  }
  if (removeIds.length > 0) {
    // Guarded again: a count that landed meanwhile keeps its line. A flagged line stays, with its note, until the order
    // is done with (packed, shipped or cancelled).
    const removed = await db
      .delete(schema.productionLines)
      .where(and(inArray(schema.productionLines.id, removeIds), eq(schema.productionLines.printed, 0), isNull(schema.productionLines.flag)))
      .returning({ id: schema.productionLines.id });
    report.linesRemoved += removed.length;
  }

  const openJobs = new Map<string, string>();
  const openJobFor = async (designId: string, method: Method, storeId: string): Promise<string> => {
    const k = `${designId}|${method}`;
    const known = openJobs.get(k);
    if (known) return known;
    const find = async () =>
      (
        await db
          .select({ id: schema.productionJobs.id })
          .from(schema.productionJobs)
          .where(and(eq(schema.productionJobs.designId, designId), eq(schema.productionJobs.method, method), inArray(schema.productionJobs.stage, [...OPEN_STAGES])))
          .limit(1)
      )[0]?.id;
    let id = await find();
    if (!id) {
      // One open batch per design and method (a unique index): a sync running at the same moment may make it first.
      const [made] = await db
        .insert(schema.productionJobs)
        .values({ designId, storeId, method, createdAt: now, updatedAt: now, stageChangedAt: now })
        .onConflictDoNothing()
        .returning({ id: schema.productionJobs.id });
      if (made) report.jobsCreated += 1;
      id = made?.id ?? (await find());
    }
    if (!id) throw new Error(`no open production job for design ${designId} (${method})`);
    openJobs.set(k, id);
    return id;
  };

  const inserts: (typeof schema.productionLines.$inferInsert)[] = [];
  for (const line of wanted.values()) {
    const had = existingByKey.get(line.key);
    if (had) {
      if (had.total !== line.total || had.orderRef !== line.orderRef) {
        await setLineTotal(had.id, line.total, line.orderRef);
        report.linesUpdated += 1;
        if (had.printed > line.total) report.linesFlagged += 1;
        touched.add(had.jobId);
      }
      continue;
    }
    const jobId = await openJobFor(line.designId, line.method, line.designStoreId);
    inserts.push({
      jobId,
      lineKey: line.key,
      orderId: line.orderId,
      orderRef: line.orderRef,
      blankCode: line.blankCode,
      colourCode: line.colourCode,
      size: line.size,
      placement: line.placement,
      total: line.total,
      createdAt: now,
      updatedAt: now,
    });
    touched.add(jobId);
  }
  if (inserts.length > 0) {
    // A line another sync added meanwhile is left as it is (its key is unique).
    const added = await db.insert(schema.productionLines).values(inserts).onConflictDoNothing().returning({ id: schema.productionLines.id });
    report.linesAdded += added.length;
  }

  // 5. The screens of every screen-print job still before or on the press: one per film of each approved pack it prints from.
  await syncScreens(now);

  // 6. A job whose orders have all shipped reads shipped; a job left with no lines goes.
  const t = schema.productionJobs;
  const shipped = await db
    .update(t)
    .set({ stage: 'shipped', shippedAt: now, stageChangedAt: now, updatedAt: now })
    .where(
      and(
        ne(t.stage, 'shipped'),
        sql`exists (select 1 from production_lines as l where l.job_id = ${t.id})`,
        sql`not exists (select 1 from production_lines as l inner join orders as o on o.id = l.order_id where l.job_id = ${t.id} and (o.production_status is null or o.production_status not in ('shipped', 'delivered')))`,
      ),
    )
    .returning({ id: t.id });
  report.jobsShipped = shipped.length;

  const emptied = await db
    .delete(t)
    .where(and(ne(t.stage, 'shipped'), lt(t.createdAt, new Date(now.getTime() - EMPTY_JOB_GRACE_MS)), sql`not exists (select 1 from production_lines as l where l.job_id = ${t.id})`))
    .returning({ id: t.id });
  report.jobsRemoved = emptied.length;

  const changed = [...touched].filter((id) => !emptied.some((e) => e.id === id));
  if (changed.length > 0) await db.update(t).set({ updatedAt: now }).where(inArray(t.id, changed));
  return report;
}

async function syncScreens(now: Date): Promise<void> {
  const jobs = await db
    .select({ id: schema.productionJobs.id, designId: schema.productionJobs.designId })
    .from(schema.productionJobs)
    .where(and(eq(schema.productionJobs.method, 'screen'), inArray(schema.productionJobs.stage, [...OPEN_STAGES])));
  if (jobs.length === 0) return;
  const lines = await db
    .select({ jobId: schema.productionLines.jobId, orderId: schema.productionLines.orderId, blankCode: schema.productionLines.blankCode, colourCode: schema.productionLines.colourCode, placement: schema.productionLines.placement })
    .from(schema.productionLines)
    .where(
      inArray(
        schema.productionLines.jobId,
        jobs.map((j) => j.id),
      ),
    );
  const packs = await packsNeededBy([...new Set(lines.map((l) => l.orderId))]);

  const packsOfJob = new Map<string, Map<string, PackRow>>();
  for (const job of jobs) {
    const found = new Map<string, PackRow>();
    for (const line of lines.filter((l) => l.jobId === job.id)) {
      const positions = (line.placement ?? '').split('+').filter(Boolean);
      for (const { pack, designId } of packs.get(line.orderId) ?? []) {
        if (designId !== job.designId || pack.technique !== 'screen' || pack.auditStatus !== 'approved' || pack.buildStatus !== 'ready') continue;
        if (packInfo(pack)?.blankCode !== line.blankCode || !positions.includes(placementKey(packPlacement(pack)))) continue;
        if (line.colourCode && !(pack.garmentCodes as string[]).includes(line.colourCode)) continue;
        found.set(pack.id, pack);
      }
    }
    packsOfJob.set(job.id, found);
  }

  const setKeys = [...new Set([...packsOfJob.values()].flatMap((found) => [...found.values()].map((p) => p.screenSetKey).filter((k): k is string => Boolean(k))))];
  const colourRows = setKeys.length === 0 ? [] : await db.select({ code: schema.colours.code, name: schema.colours.name }).from(schema.colours).where(inArray(schema.colours.code, setKeys));
  const colourNames = new Map(colourRows.map((c) => [c.code, c.name]));

  for (const job of jobs) {
    const rows: (typeof schema.screenProgress.$inferInsert)[] = [];
    for (const pack of packsOfJob.get(job.id)?.values() ?? []) {
      const inks = [...(storedManifest(pack)?.inks ?? [])].sort((a, b) => a.index - b.index);
      for (const ink of inks) {
        rows.push({
          jobId: job.id,
          screenKey: `${pack.id}:${ink.index}`,
          packId: pack.id,
          filmNumber: ink.index,
          filmCount: inks.length,
          setName: setNameOf(pack.screenSetKey, colourNames),
          inkName: ink.role === 'underbase' ? 'Underbase' : ink.role === 'highlight' ? 'Highlight white' : ink.pantone ? `${ink.pantone} · ${ink.clientName}` : ink.clientName,
          inkRole: ink.role,
          updatedAt: now,
        });
      }
    }
    if (rows.length > 0) {
      // A screen's status is never touched here: only what describes its film (a Pantone code entered since, say).
      await db
        .insert(schema.screenProgress)
        .values(rows)
        .onConflictDoUpdate({
          target: [schema.screenProgress.jobId, schema.screenProgress.screenKey],
          set: { filmCount: sql`excluded.film_count`, setName: sql`excluded.set_name`, inkName: sql`excluded.ink_name`, inkRole: sql`excluded.ink_role` },
          setWhere: sql`(${schema.screenProgress.filmCount}, ${schema.screenProgress.setName}, ${schema.screenProgress.inkName}, ${schema.screenProgress.inkRole}) is distinct from (excluded.film_count, excluded.set_name, excluded.ink_name, excluded.ink_role)`,
        });
    }
    // A film no pack of the job prints any more (the pack was replaced) is no screen of this job.
    await db
      .delete(schema.screenProgress)
      .where(
        and(
          eq(schema.screenProgress.jobId, job.id),
          rows.length > 0
            ? notInArray(
                schema.screenProgress.screenKey,
                rows.map((r) => r.screenKey),
              )
            : undefined,
        ),
      );
  }
}

let inFlight: Promise<SyncReport> | null = null;
let lastSyncAt = 0;

/** How often a station's read brings the jobs up to date (tests set 0). The hooks always do. */
export const productionSyncTiming = { minIntervalMs: 5_000 };

/**
 * Builds and updates the production jobs and their lines from the paid orders and runs whose print files pre-press
 * approved. Idempotent: run it any number of times. It never resets a printed count; a total that drops below what was
 * printed is clamped and flagged; a cancelled or refunded order's lines go; a job whose orders have all shipped reads
 * shipped. One run at a time in this process: a call while one runs waits for it, then runs again, so it sees every
 * change made before it was called.
 */
export async function syncProductionJobs(): Promise<SyncReport> {
  while (inFlight) await inFlight.catch(() => undefined);
  const run = runSync().finally(() => {
    lastSyncAt = Date.now();
    if (inFlight === run) inFlight = null;
  });
  inFlight = run;
  return run;
}

/** The same, for the hooks (an order paid, a pack approved, a refund, a shipment): never throws into its caller. */
export async function syncProductionJobsQuietly(reason: string): Promise<void> {
  try {
    await syncProductionJobs();
  } catch (err) {
    console.error(`[production progress] could not bring the jobs up to date after ${reason}:`, err instanceof Error ? err.message : err);
  }
}

/** A station's read: brings the jobs up to date unless that was done a moment ago. */
async function syncIfStale(): Promise<void> {
  if (inFlight) {
    await inFlight.catch(() => undefined);
    return;
  }
  if (Date.now() - lastSyncAt < productionSyncTiming.minIntervalMs) return;
  await syncProductionJobsQuietly('a station read');
}

// ---------------------------------------------------------------------------
// Reading

interface Totals {
  total: number;
  printed: number;
  lines: number;
  flagged: number;
}

async function totalsOf(jobIds: string[]): Promise<Map<string, Totals>> {
  const out = new Map<string, Totals>();
  if (jobIds.length === 0) return out;
  const t = schema.productionLines;
  const rows = await db
    .select({
      jobId: t.jobId,
      total: sql<number>`coalesce(sum(${t.total}), 0)::int`,
      printed: sql<number>`coalesce(sum(${t.printed}), 0)::int`,
      lines: sql<number>`count(*)::int`,
      flagged: sql<number>`count(${t.flag})::int`,
    })
    .from(t)
    .where(inArray(t.jobId, jobIds))
    .groupBy(t.jobId);
  for (const row of rows) out.set(row.jobId, { total: Number(row.total), printed: Number(row.printed), lines: Number(row.lines), flagged: Number(row.flagged) });
  return out;
}

async function screenCountsOf(jobIds: string[]): Promise<Map<string, { ready: number; total: number }>> {
  const out = new Map<string, { ready: number; total: number }>();
  if (jobIds.length === 0) return out;
  const s = schema.screenProgress;
  const rows = await db
    .select({ jobId: s.jobId, total: sql<number>`count(*)::int`, ready: sql<number>`(count(*) filter (where ${s.status} in ${[...MADE_SCREENS]}))::int` })
    .from(s)
    .where(inArray(s.jobId, jobIds))
    .groupBy(s.jobId);
  for (const row of rows) out.set(row.jobId, { ready: Number(row.ready), total: Number(row.total) });
  return out;
}

async function designTitles(designIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(designIds)];
  const names = await Promise.all(unique.map((id) => designDisplayName(id)));
  return new Map(unique.map((id, i) => [id, names[i]]));
}

function summaryOf(job: JobRow, shopName: string, title: string, totals: Totals | undefined, screens: { ready: number; total: number } | undefined): StationJobSummary {
  return {
    jobId: job.id,
    designId: job.designId,
    designTitle: title,
    shopName,
    method: job.method,
    stage: job.stage,
    total: totals?.total ?? 0,
    printed: totals?.printed ?? 0,
    ...(job.method === 'screen' ? { screensReady: screens?.ready ?? 0, screensTotal: screens?.total ?? 0 } : {}),
    updatedAt: job.updatedAt.toISOString(),
    hiddenFromBoard: job.hiddenFromBoard,
    flaggedLines: totals?.flagged ?? 0,
  };
}

/** The jobs a station works on, oldest first: every job not yet shipped, for one method or all. Brings the jobs up to
 * date first (at most every few seconds). Production View. */
export async function listStationJobs(session: Who, station: StationKind): Promise<ProgressResult<StationJobSummary[]>> {
  const no = denied(session, 'view');
  if (no) return { ok: false, error: no };
  if (!STATIONS.includes(station)) return { ok: false, error: 'That station is not one of screen, DTG, DTF or all.' };
  await syncIfStale();

  const t = schema.productionJobs;
  const rows = await db
    .select({ job: t, shopName: schema.artistStores.name })
    .from(t)
    .innerJoin(schema.artistStores, eq(t.storeId, schema.artistStores.id))
    .where(and(ne(t.stage, 'shipped'), station === 'all' ? undefined : eq(t.method, station)))
    .orderBy(asc(t.createdAt), asc(t.id));
  const ids = rows.map((r) => r.job.id);
  const [totals, screens, titles] = await Promise.all([totalsOf(ids), screenCountsOf(ids), designTitles(rows.map((r) => r.job.designId))]);
  return {
    ok: true,
    value: rows
      // A job with no lines left is on its way out (the sync removes it): nothing to show.
      .filter((r) => (totals.get(r.job.id)?.lines ?? 0) > 0)
      .map((r) => summaryOf(r.job, r.shopName, titles.get(r.job.designId) ?? 'Design', totals.get(r.job.id), screens.get(r.job.id))),
  };
}

async function loadJob(jobId: string): Promise<JobRow | null> {
  if (typeof jobId !== 'string' || !UUID.test(jobId)) return null;
  const [row] = await db.select().from(schema.productionJobs).where(eq(schema.productionJobs.id, jobId)).limit(1);
  return row ?? null;
}

async function detailOf(job: JobRow, who: Who): Promise<StationJobDetail> {
  const [store] = await db.select({ name: schema.artistStores.name }).from(schema.artistStores).where(eq(schema.artistStores.id, job.storeId)).limit(1);
  const lineRows = await db
    .select({ line: schema.productionLines, orderCreatedAt: schema.orders.createdAt })
    .from(schema.productionLines)
    .innerJoin(schema.orders, eq(schema.productionLines.orderId, schema.orders.id))
    .where(eq(schema.productionLines.jobId, job.id));
  const screenRows = await db.select().from(schema.screenProgress).where(eq(schema.screenProgress.jobId, job.id));

  const blankCodes = [...new Set(lineRows.map((r) => r.line.blankCode))];
  const colourCodes = [...new Set(lineRows.map((r) => r.line.colourCode).filter(Boolean))];
  const [blankRows, colourRows, titles] = await Promise.all([
    blankCodes.length === 0 ? [] : db.select({ code: schema.blanks.code, name: schema.blanks.name }).from(schema.blanks).where(inArray(schema.blanks.code, blankCodes)),
    colourCodes.length === 0 ? [] : db.select({ code: schema.colours.code, name: schema.colours.name, order: schema.colours.displayOrder }).from(schema.colours).where(inArray(schema.colours.code, colourCodes)),
    designTitles([job.designId]),
  ]);
  const blankName = (code: string) => {
    const row = blankRows.find((b) => b.code === code);
    return blankDisplayName(code, row?.name ?? code);
  };
  const colour = (code: string) => colourRows.find((c) => c.code === code);
  const sizeOrder = sortSizes([...new Set(lineRows.map((r) => r.line.size))]);

  const sorted = [...lineRows].sort(
    (a, b) =>
      a.orderCreatedAt.getTime() - b.orderCreatedAt.getTime() ||
      a.line.orderRef.localeCompare(b.line.orderRef) ||
      blankName(a.line.blankCode).localeCompare(blankName(b.line.blankCode)) ||
      (colour(a.line.colourCode)?.order ?? Number.MAX_SAFE_INTEGER) - (colour(b.line.colourCode)?.order ?? Number.MAX_SAFE_INTEGER) ||
      sizeOrder.indexOf(a.line.size) - sizeOrder.indexOf(b.line.size) ||
      (a.line.placement ?? '').localeCompare(b.line.placement ?? ''),
  );
  const lines: ProgressLine[] = sorted.map(({ line }) => ({
    key: line.lineKey,
    orderRef: line.orderRef,
    blankName: blankName(line.blankCode),
    colourName: line.colourCode ? (colour(line.colourCode)?.name ?? line.colourCode) : 'Colour not set',
    size: line.size,
    total: line.total,
    printed: line.printed,
    position: positionWords(line.placement),
    flag: line.flag,
  }));
  const screens: ScreenProgress[] = [...screenRows]
    .sort((a, b) => a.setName.localeCompare(b.setName) || a.packId.localeCompare(b.packId) || a.filmNumber - b.filmNumber)
    .map((s) => ({ key: s.screenKey, setName: s.setName, position: `${s.filmNumber}/${s.filmCount}`, inkName: s.inkName, status: s.status, packId: s.packId, filmNumber: s.filmNumber }));

  const totals: Totals = {
    total: lines.reduce((sum, l) => sum + l.total, 0),
    printed: lines.reduce((sum, l) => sum + l.printed, 0),
    lines: lines.length,
    flagged: lines.filter((l) => l.flag).length,
  };
  const made = screens.filter((s) => MADE_SCREENS.includes(s.status)).length;
  return {
    ...summaryOf(job, store?.name ?? '', titles.get(job.designId) ?? 'Design', totals, { ready: made, total: screens.length }),
    lines,
    screens,
    jobSheetUrl: jobSheetPath(job.designId),
    canWork: can(who.actor, 'production', 'work'),
  };
}

/** One job with its lines and screens, as the station shows it. Production View. */
export async function getStationJob(session: Who, jobId: string): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'view');
  if (no) return { ok: false, error: no };
  await syncIfStale();
  const job = await loadJob(jobId);
  if (!job) return { ok: false, error: 'That job was not found. It may have shipped or been cleared: go back to the list.' };
  return { ok: true, value: await detailOf(job, session) };
}

// ---------------------------------------------------------------------------
// The order follows the job

/** True when every item of the order has a line on some job: an item nothing here tracks (an embroidered piece, a
 * product with no design) means the order can't be packed from the stations' counts alone. */
async function everyItemTracked(orderId: string, lines: { blankCode: string; colourCode: string; size: string }[]): Promise<boolean> {
  const orderItems = await db
    .select({ blankCode: schema.products.blankCode, colourCode: schema.orderItems.colourCode, size: schema.orderItems.size })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
    .where(eq(schema.orderItems.orderId, orderId));
  if (orderItems.length === 0) return false;
  return orderItems.every((item) => lines.some((l) => l.blankCode === item.blankCode && l.colourCode === (item.colourCode ?? '') && l.size === (item.size?.trim() || 'OS')));
}

/** Moves an order along with its pieces: queued to printing at its first printed piece; printing to packed once every
 * piece of it is printed and every job it is in has reached folding. Through advanceFrom() (production.ts: advance() for
 * one step from a known status), so the production gate and the one-step rule hold, and when several iPads trigger the
 * same move only one makes it; a refusal is logged and leaves the order where it is. */
async function settleOrder(actor: Actor, orderId: string): Promise<void> {
  const [order] = await db.select({ status: schema.orders.status, productionStatus: schema.orders.productionStatus }).from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  if (!order || order.status !== 'paid') return;
  let current = order.productionStatus ?? 'queued';
  if (current !== 'queued' && current !== 'printing') return;

  const lines = await db
    .select({ printed: schema.productionLines.printed, total: schema.productionLines.total, stage: schema.productionJobs.stage, blankCode: schema.productionLines.blankCode, colourCode: schema.productionLines.colourCode, size: schema.productionLines.size })
    .from(schema.productionLines)
    .innerJoin(schema.productionJobs, eq(schema.productionLines.jobId, schema.productionJobs.id))
    .where(eq(schema.productionLines.orderId, orderId));
  if (lines.length === 0) return;
  const ref = orderRefOf(orderId);

  const moveTo = async (to: 'printing' | 'packed', why: string): Promise<boolean> => {
    // From where it was seen, and only from there: when two iPads trigger the same move, one moves the order and logs it.
    const moved = await advanceFrom(orderId, current as 'queued' | 'printing', to);
    if (!moved.ok) {
      console.error(`[production progress] order ${ref} stays ${current}: ${moved.error}`);
      return false;
    }
    current = to;
    await recordStaffActivity(actor, { area: 'production', action: 'production.advance', itemType: 'order', itemId: orderId, detail: { to, automatic: true, summary: `Order ${ref} is ${to}: ${why}` } });
    return true;
  };

  if (current === 'queued' && lines.some((l) => l.printed > 0)) {
    if (!(await moveTo('printing', 'its first piece is printed'))) return;
  }
  const counted = lines.filter((l) => l.total > 0);
  const done = counted.length > 0 && counted.every((l) => l.printed >= l.total && rank(l.stage) >= rank('folding'));
  if (!done || !(await everyItemTracked(orderId, lines))) return;
  if (current === 'queued' && !(await moveTo('printing', 'its pieces are printed'))) return;
  await moveTo('packed', 'every piece is printed and folded');
}

async function settleOrders(actor: Actor, orderIds: string[]): Promise<void> {
  for (const orderId of [...new Set(orderIds)]) {
    try {
      await settleOrder(actor, orderId);
    } catch (err) {
      console.error(`[production progress] could not move order ${orderRefOf(orderId)} along:`, err instanceof Error ? err.message : err);
    }
  }
}

// ---------------------------------------------------------------------------
// Changing things

/** Why a screen-print job can't print yet ('2 of 6 screens aren't ready yet.'), or null. */
async function screensBlocking(job: JobRow): Promise<string | null> {
  if (job.method !== 'screen') return null;
  const rows = await db.select({ status: schema.screenProgress.status }).from(schema.screenProgress).where(eq(schema.screenProgress.jobId, job.id));
  const waiting = rows.filter((r) => !READY_SCREENS.includes(r.status)).length;
  if (waiting === 0) return null;
  return `${waiting} of ${plural(rows.length, 'screen', 'screens')} ${waiting === 1 ? "isn't" : "aren't"} ready yet.`;
}

/** Moves a job's stage from `from` to `to`, only if nobody moved it meanwhile. */
async function moveStage(job: JobRow, to: ProductionStage): Promise<ProgressResult<null>> {
  const now = new Date();
  try {
    const moved = await db
      .update(schema.productionJobs)
      .set({ stage: to, stageChangedAt: now, updatedAt: now, shippedAt: to === 'shipped' ? now : null })
      .where(and(eq(schema.productionJobs.id, job.id), eq(schema.productionJobs.stage, job.stage)))
      .returning({ id: schema.productionJobs.id });
    if (moved.length === 0) return { ok: false, error: 'The job changed while you were moving it. Look at it again.' };
    return { ok: true, value: null };
  } catch (err) {
    // The unique index: another batch of the design is open for the press.
    const code = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === '23505') return { ok: false, error: 'Another batch of this design is already waiting for the press. Move that one on first.' };
    throw err;
  }
}

async function touchJob(jobId: string): Promise<void> {
  await db.update(schema.productionJobs).set({ updatedAt: new Date() }).where(eq(schema.productionJobs.id, jobId));
}

async function jobTitle(job: JobRow): Promise<string> {
  return `${await designDisplayName(job.designId)} (${METHOD_WORDS[job.method]})`;
}

/** A count on a job that isn't printing yet starts it printing: a DTG/DTF job at once, a screen-print job once its
 * screens are ready. A shipped job's counts are closed. */
async function readyToCount(job: JobRow): Promise<ProgressResult<JobRow>> {
  if (job.stage === 'shipped') return { ok: false, error: 'This job has shipped, so its counts are closed.' };
  if (rank(job.stage) >= rank('printing')) return { ok: true, value: job };
  const blocking = await screensBlocking(job);
  if (blocking) return { ok: false, error: `This job isn't printing yet: ${blocking} Mark the screens ready first.` };
  const moved = await moveStage(job, 'printing');
  if (moved.ok) return { ok: true, value: { ...job, stage: 'printing' } };
  // Another iPad's count (or a stage change) moved it first: count on whatever it is now.
  const now = await loadJob(job.id);
  if (!now) return { ok: false, error: 'That job was not found. Go back to the list.' };
  if (now.stage === 'shipped') return { ok: false, error: 'This job has shipped, so its counts are closed.' };
  return rank(now.stage) >= rank('printing') ? { ok: true, value: now } : moved;
}

type CountChange = { set: number } | { add: number };

/** Count taps by one person on one line of a job that come less than this far apart are one row of the activity log. */
const COUNT_LOG_GAP_MS = 60_000;
/** ...and a row takes taps for at most this long, so the log still says roughly when the counting happened. */
const COUNT_LOG_SPAN_MS = 10 * 60_000;

/**
 * The activity log's row for a count. A station counts piece by piece, so taps by the same person on the same line of the
 * same job, each within a minute of the last (and within ten minutes of the first), update one row: the latest count, the
 * count before the first tap and how many taps, in one atomic UPDATE. A first tap, or one after a pause, writes a new row.
 * Stage and screen changes are never merged (they keep a row each). Never throws into the count.
 */
async function logCount(actor: Actor, job: JobRow, entry: { lineKey: string; orderRef: string; size: string; printed: number; total: number; before: number }): Promise<void> {
  if (actor.role !== 'admin' && actor.role !== 'staff') return;
  const title = await jobTitle(job);
  const at = Date.now();
  const a = schema.staffActivity;
  try {
    const latest = db
      .select({ id: a.id })
      .from(a)
      .where(
        and(
          eq(a.actorId, actor.userId),
          eq(a.action, 'production.count'),
          eq(a.itemType, 'production_job'),
          eq(a.itemId, job.id),
          sql`${a.detail} ->> 'lineKey' = ${entry.lineKey}`,
          sql`coalesce((${a.detail} ->> 'lastAtMs')::bigint, 0) >= ${at - COUNT_LOG_GAP_MS}::bigint`,
          gte(a.createdAt, new Date(at - COUNT_LOG_SPAN_MS)),
        ),
      )
      .orderBy(desc(a.createdAt))
      .limit(1);
    const taps = sql`coalesce((${a.detail} ->> 'taps')::int, 1) + 1`;
    const from = sql`coalesce((${a.detail} ->> 'from')::int, 0)`;
    const merged = await db
      .update(a)
      .set({
        detail: sql`${a.detail} || jsonb_build_object(
          'printed', ${entry.printed}::int,
          'total', ${entry.total}::int,
          'added', ${entry.printed}::int - ${from},
          'taps', ${taps},
          'lastAtMs', ${at}::bigint,
          'summary', format('Counted %s of %s printed on %s, %s, size %s (from %s, in %s taps)', ${entry.printed}::int, ${entry.total}::int, ${title}::text, ${entry.orderRef}::text, ${entry.size}::text, ${from}, ${taps})
        )`,
      })
      .where(inArray(a.id, latest))
      .returning({ id: a.id });
    if (merged.length > 0) return;
  } catch (err) {
    console.error('[production progress] the count could not be added to the last activity row:', err instanceof Error ? err.message : err);
  }
  await recordStaffActivity(actor, {
    area: 'production',
    action: 'production.count',
    itemType: 'production_job',
    itemId: job.id,
    detail: {
      lineKey: entry.lineKey,
      orderRef: entry.orderRef,
      size: entry.size,
      printed: entry.printed,
      total: entry.total,
      from: entry.before,
      added: entry.printed - entry.before,
      taps: 1,
      lastAtMs: at,
      summary: `Counted ${entry.printed} of ${entry.total} printed on ${title}, ${entry.orderRef}, size ${entry.size}`,
    },
  });
}

async function changeCount(session: Who, jobId: string, lineKey: string, change: CountChange): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  const amount = 'set' in change ? change.set : change.add;
  if (!Number.isInteger(amount) || Math.abs(amount) > MAX_COUNT || ('set' in change && amount < 0)) {
    return { ok: false, error: 'set' in change ? 'Enter a whole number of pieces, 0 or more.' : 'Add or take away a whole number of pieces.' };
  }
  if (typeof lineKey !== 'string' || !lineKey) return { ok: false, error: 'That line is not on this job. Reload the job.' };
  let job = await loadJob(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };

  // Only a count that adds pieces starts the job printing; a correction to 0 changes nothing else.
  const [current] = await db
    .select({ printed: schema.productionLines.printed })
    .from(schema.productionLines)
    .where(and(eq(schema.productionLines.jobId, job.id), eq(schema.productionLines.lineKey, lineKey)))
    .limit(1);
  if (!current) return { ok: false, error: 'That line is not on this job any more. Reload the job.' };
  const adds = 'set' in change ? change.set > current.printed : change.add > 0;
  if (job.stage === 'shipped' || adds) {
    const ready = await readyToCount(job);
    if (!ready.ok) return ready;
    job = ready.value;
  }

  // One statement, clamped to 0..total in the database, so counts from several iPads add up and never overshoot.
  const l = schema.productionLines;
  const printed = 'set' in change ? sql`least(${l.total}, greatest(0, ${change.set}::int))` : sql`least(${l.total}, greatest(0, ${l.printed} + ${change.add}::int))`;
  const [row] = await db
    .update(l)
    .set({ printed, updatedBy: session.actor.userId, updatedAt: new Date() })
    .where(and(eq(l.jobId, job.id), eq(l.lineKey, lineKey)))
    .returning({ printed: l.printed, total: l.total, orderId: l.orderId, orderRef: l.orderRef, blankCode: l.blankCode, colourCode: l.colourCode, size: l.size });
  if (!row) return { ok: false, error: 'That line is not on this job any more. Reload the job.' };
  await touchJob(job.id);

  await logCount(session.actor, job, { lineKey, orderRef: row.orderRef, size: row.size, printed: row.printed, total: row.total, before: current.printed });
  await settleOrders(session.actor, [row.orderId]);

  const fresh = await loadJob(job.id);
  return fresh ? { ok: true, value: await detailOf(fresh, session) } : { ok: false, error: 'That job was not found. Go back to the list.' };
}

/** Set a line's printed count exactly (0..total). */
export async function setPrintedCount(session: Who, jobId: string, lineKey: string, printed: number): Promise<ProgressResult<StationJobDetail>> {
  return changeCount(session, jobId, lineKey, { set: printed });
}

/** Add to (or take from) a line's printed count, clamped to 0..total. */
export async function adjustPrintedCount(session: Who, jobId: string, lineKey: string, delta: number): Promise<ProgressResult<StationJobDetail>> {
  return changeCount(session, jobId, lineKey, { add: delta });
}

/** A screen's status. Any status can be set again (a screen burned badly goes back to waiting), except that a screen is
 * reclaimed only once the job is off the press, and a shipped job's screens can only be reclaimed. The first screen
 * that moves on takes a queued job to Screens. */
export async function setScreenStatus(session: Who, jobId: string, screenKey: string, status: ScreenStatus): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  if (!SCREEN_STATUSES.includes(status)) return { ok: false, error: 'That screen status is not one of waiting, film printed, ready, on the press or reclaimed.' };
  const job = await loadJob(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };
  if (job.method !== 'screen') return { ok: false, error: 'DTG and DTF jobs have no screens.' };
  if (job.stage === 'shipped' && status !== 'reclaimed') return { ok: false, error: 'This job has shipped: its screens can only be reclaimed.' };
  if (status === 'reclaimed' && rank(job.stage) < rank('curing')) {
    return { ok: false, error: 'Reclaim the screens once the job is off the press. To burn a screen again, set it back to waiting.' };
  }

  const s = schema.screenProgress;
  const [row] = await db
    .update(s)
    .set({ status, updatedBy: session.actor.userId, updatedAt: new Date() })
    .where(and(eq(s.jobId, job.id), eq(s.screenKey, typeof screenKey === 'string' ? screenKey : '')))
    .returning({ setName: s.setName, filmNumber: s.filmNumber, filmCount: s.filmCount, inkName: s.inkName });
  if (!row) return { ok: false, error: 'That screen is not on this job any more. Reload the job.' };
  if (job.stage === 'queued' && status !== 'waiting') await moveStage(job, 'screens');
  await touchJob(job.id);

  await recordStaffActivity(session.actor, {
    area: 'production',
    action: 'production.screen',
    itemType: 'production_job',
    itemId: job.id,
    detail: { screenKey, status, summary: `Screen ${row.filmNumber}/${row.filmCount} (${row.setName}, ${row.inkName}) of ${await jobTitle(job)}: ${SCREEN_WORDS[status]}` },
  });
  const fresh = await loadJob(job.id);
  return fresh ? { ok: true, value: await detailOf(fresh, session) } : { ok: false, error: 'That job was not found. Go back to the list.' };
}

/**
 * Moves a job to another stage. Forward: Screens is for screen print only; a screen-print job prints once its screens
 * are all ready; Curing and Folding wait for every piece to be printed. `force` passes those two checks (it is in the
 * activity log). Back: allowed, to put a mistake right, unless another batch of the design already took its place.
 * Shipped is not a station's step: an order ships from Production with its tracking, and a job reads shipped once every
 * order in it has. Reaching Folding packs the orders whose pieces are all printed and folded.
 */
export async function setJobStage(session: Who, jobId: string, stage: ProductionStage, opts: { force?: boolean } = {}): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  if (!STAGES.includes(stage)) return { ok: false, error: 'That stage is not one of queued, screens, printing, curing, folding or shipped.' };
  const job = await loadJob(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };
  if (job.stage === stage) return { ok: true, value: await detailOf(job, session) };
  if (job.stage === 'shipped') return { ok: false, error: 'This job has shipped.' };
  const force = opts.force === true;

  const lines = await db.select({ orderId: schema.productionLines.orderId, total: schema.productionLines.total, printed: schema.productionLines.printed }).from(schema.productionLines).where(eq(schema.productionLines.jobId, job.id));
  if (stage === 'shipped') {
    const orderIds = [...new Set(lines.map((l) => l.orderId))];
    const open = orderIds.length === 0 ? [] : await db.select({ id: schema.orders.id }).from(schema.orders).where(and(inArray(schema.orders.id, orderIds), or(sql`${schema.orders.productionStatus} is null`, notInArray(schema.orders.productionStatus, ['shipped', 'delivered']))));
    if (orderIds.length === 0 || open.length > 0) {
      return { ok: false, error: 'A job reads shipped once every order in it has shipped. Ship each order from Production, with its tracking.' };
    }
  }
  if (stage === 'screens' && job.method !== 'screen') return { ok: false, error: 'DTG and DTF jobs have no screens: move the job to printing.' };

  if (rank(stage) > rank(job.stage) && !force) {
    if (rank(stage) >= rank('printing') && rank(job.stage) < rank('printing')) {
      const blocking = await screensBlocking(job);
      if (blocking) return { ok: false, error: `${blocking} Mark them ready first, or force the move.` };
    }
    if (rank(stage) >= rank('curing') && stage !== 'shipped') {
      const total = lines.reduce((sum, l) => sum + l.total, 0);
      const printed = lines.reduce((sum, l) => sum + l.printed, 0);
      if (printed < total) return { ok: false, error: `${printed} of ${total} pieces are printed. Count the rest first, or force the move.` };
    }
  }
  if ((OPEN_STAGES as readonly ProductionStage[]).includes(stage) && !(OPEN_STAGES as readonly ProductionStage[]).includes(job.stage)) {
    const [other] = await db
      .select({ id: schema.productionJobs.id })
      .from(schema.productionJobs)
      .where(and(eq(schema.productionJobs.designId, job.designId), eq(schema.productionJobs.method, job.method), inArray(schema.productionJobs.stage, [...OPEN_STAGES]), ne(schema.productionJobs.id, job.id)))
      .limit(1);
    if (other) return { ok: false, error: 'Another batch of this design is already waiting for the press. Move that one on first.' };
  }

  const moved = await moveStage(job, stage);
  if (!moved.ok) return moved;
  await recordStaffActivity(session.actor, {
    area: 'production',
    action: 'production.stage',
    itemType: 'production_job',
    itemId: job.id,
    detail: { from: job.stage, to: stage, ...(force ? { forced: true } : {}), summary: `Moved ${await jobTitle(job)} from ${STAGE_WORDS[job.stage]} to ${STAGE_WORDS[stage]}${force ? ' (forced)' : ''}` },
  });
  if (rank(stage) >= rank('folding')) await settleOrders(session.actor, lines.map((l) => l.orderId));

  const fresh = await loadJob(job.id);
  return fresh ? { ok: true, value: await detailOf(fresh, session) } : { ok: false, error: 'That job was not found. Go back to the list.' };
}

/** Takes a job off the website's board, or puts it back (the client's name follows their shop's own opt-in either way). */
export async function setHiddenFromBoard(session: Who, jobId: string, hidden: boolean): Promise<ProgressResult<StationJobDetail>> {
  const no = denied(session, 'work');
  if (no) return { ok: false, error: no };
  if (typeof hidden !== 'boolean') return { ok: false, error: 'Say whether to hide the job or show it.' };
  const job = await loadJob(jobId);
  if (!job) return { ok: false, error: 'That job was not found. Go back to the list.' };
  if (job.hiddenFromBoard !== hidden) {
    await db.update(schema.productionJobs).set({ hiddenFromBoard: hidden, updatedAt: new Date() }).where(eq(schema.productionJobs.id, job.id));
    await recordStaffActivity(session.actor, {
      area: 'production',
      action: 'production.board',
      itemType: 'production_job',
      itemId: job.id,
      detail: { hidden, summary: `${hidden ? 'Hid' : 'Showed'} ${await jobTitle(job)} ${hidden ? 'from' : 'on'} the press board` },
    });
  }
  const fresh = await loadJob(job.id);
  return fresh ? { ok: true, value: await detailOf(fresh, session) } : { ok: false, error: 'That job was not found. Go back to the list.' };
}

// ---------------------------------------------------------------------------
// The website's board

/** 'Classic tee', or 'Classic tee + 1 more' for a job on several garments (the one with the most pieces first). */
function pieceWords(blanks: { code: string; name: string; pieces: number }[]): string {
  const byName = new Map<string, number>();
  for (const b of blanks) {
    const name = blankDisplayName(b.code, b.name);
    byName.set(name, (byName.get(name) ?? 0) + b.pieces);
  }
  const names = [...byName.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  if (names.length === 0) return 'Garment';
  return names.length === 1 ? names[0] : `${names[0]} + ${names.length - 1} more`;
}

/** Public, no personal data: what the website's "On the press" board shows. */
export async function onThePressFeed(): Promise<OnThePressRow[]> {
  const t = schema.productionJobs;
  const since = new Date(Date.now() - SHIPPED_ON_BOARD_MS);
  const jobs = await db
    .select({
      id: t.id,
      method: t.method,
      stage: t.stage,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      shopName: schema.artistStores.name,
      optedIn: schema.artistStores.showOnPressBoard,
    })
    .from(t)
    .innerJoin(schema.artistStores, eq(t.storeId, schema.artistStores.id))
    .where(and(eq(t.hiddenFromBoard, false), or(ne(t.stage, 'shipped'), gte(t.shippedAt, since))));
  if (jobs.length === 0) return [];
  const ids = jobs.map((j) => j.id);

  const l = schema.productionLines;
  const [totals, blankRows, inkRows] = await Promise.all([
    totalsOf(ids),
    db.select({ jobId: l.jobId, code: l.blankCode, pieces: sql<number>`sum(${l.total})::int` }).from(l).where(inArray(l.jobId, ids)).groupBy(l.jobId, l.blankCode),
    db
      .select({ jobId: schema.screenProgress.jobId, packId: schema.screenProgress.packId, colours: sql<number>`(count(*) filter (where ${schema.screenProgress.inkRole} in ('ink', 'highlight')))::int` })
      .from(schema.screenProgress)
      .where(inArray(schema.screenProgress.jobId, ids))
      .groupBy(schema.screenProgress.jobId, schema.screenProgress.packId),
  ]);
  const blankCodes = [...new Set(blankRows.map((b) => b.code))];
  const names = blankCodes.length === 0 ? [] : await db.select({ code: schema.blanks.code, name: schema.blanks.name }).from(schema.blanks).where(inArray(schema.blanks.code, blankCodes));
  const nameOf = new Map(names.map((n) => [n.code, n.name]));

  const rows = jobs
    // Nothing to show for a job with no pieces left (its lines going, or only flagged ones the orders dropped).
    .filter((job) => (totals.get(job.id)?.total ?? 0) > 0)
    .map((job) => {
      const sum = totals.get(job.id)!;
      // The most colours any of its screen sets prints: the inks the eye sees (the underbase is under them).
      const colours = Math.max(0, ...inkRows.filter((r) => r.jobId === job.id).map((r) => Number(r.colours)));
      const ink = job.method === 'screen' ? (colours > 0 ? plural(colours, 'colour', 'colours') : 'Screen print') : `Full colour (${job.method.toUpperCase()})`;
      return {
        stage: job.stage,
        createdAt: job.createdAt.getTime(),
        updatedAt: job.updatedAt.getTime(),
        row: {
          id: hashOf(`press-board:${job.id}`, 12),
          client: job.optedIn ? job.shopName : 'Private',
          piece: pieceWords(blankRows.filter((b) => b.jobId === job.id).map((b) => ({ code: b.code, name: nameOf.get(b.code) ?? b.code, pieces: Number(b.pieces) }))),
          // Every order of a shipped job has shipped, so its pieces were all made, counted at a station or not.
          printed: job.stage === 'shipped' ? sum.total : sum.printed,
          total: sum.total,
          ink,
          stage: BOARD_WORDS[job.stage],
          updatedAt: job.updatedAt.toISOString(),
        } satisfies OnThePressRow,
      };
    });
  return boardSelection(rows).map((r) => r.row);
}

/** The rows the board shows, in its order. More jobs than it holds: what is on the press stays, then what is nearest to done,
 * the latest first, and the queue gives way first. The rows then read in the order of the stages, the oldest first. Pure. */
export function boardSelection<T extends { stage: ProductionStage; createdAt: number; updatedAt: number }>(rows: readonly T[], limit: number = BOARD_ROWS): T[] {
  const kept = [...rows].sort((a, b) => BOARD_KEEP[a.stage] - BOARD_KEEP[b.stage] || b.updatedAt - a.updatedAt).slice(0, Math.max(0, limit));
  return kept.sort((a, b) => rank(a.stage) - rank(b.stage) || a.createdAt - b.createdAt);
}
