// The job sheet: ONE per design, covering every garment that uses it (Print-Prep-Plan
// 6.3, owner decision of 15 Oct). It replaces the sheet each pack used to carry.
//
// What is on it. The design's current approved version (the version the artist approved,
// else the newest one with print files: the same rule orders find their files by, see
// packsFor in prepress.ts), then:
//   - every garment that uses the design: the shop products in front of fans or with an open
//     sale, and the lines of open runs, each with its blank, colour, placement, method and the
//     file to use (the set's screen PSD, or the colour's DTG PNG);
//   - per screen set: inks in print order, Pantone codes, HB bases, ruling, mesh, flash, cure,
//     choke, traps and the screen count against the press heads;
//   - per DTG/DTF file: size, offset and what happens to whites and fades;
//   - proof thumbnails, check results, the pieces waiting in open orders, the audit sign-off.
//
// How it is made. On demand, never on a schedule and never by a hook on whatever might
// change it. Each request works out what the sheet would say (a handful of reads), hashes
// that, and looks for the PDF stored under the hash. Found: it is served. Missing: it is
// drawn, stored under the hash and served. So the sheet is regenerated whenever (and only
// when) its contents change: an order paid or packed, a garment added, a code entered, a pack
// approved or replaced, the ink system edited. The stored PDFs are a cache and are safe to
// delete; they live under job-sheets/<design id>/ in print storage, so one lifecycle rule on
// that prefix can expire them. A cache that cannot be read or written never stops a sheet.
//
// The same sheet is also given as data (getJobSheetView, built by lib/print/job-sheet-view.ts, the
// very view the PDF is drawn from) for the iPads at the production stations: the paper and the
// screen never disagree.
//
// Pantone codes are on it, so only Pre-press or Production View (or the owner) may open it.
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { canOpenJobSheets, isDesignId, type JobSheetLink } from '@/lib/print/job-sheet-link';
import { printMockOn } from '@/lib/print/mock-mode';
import { buildJobSheetView, type JobSheetView } from '@/lib/print/job-sheet-view';
import { sampleJobSheetView } from '@/lib/print/job-sheet-sample';
import { MOCK_JOB_SHEET, MOCK_JOB_SHEET_PROOFS } from '@/lib/print/mock-views';
import { COLLAR_DISTANCE_UNSET_NOTE, describePrintHeight, standardCollarDistanceCm } from '@/lib/mockups/placements';
import { hashJson } from '@/lib/print/pack/hash';
import {
  designDisplayName,
  displayVersionNumbers,
  formatCm,
  isSuperseded,
  loadPacksForVersion,
  normaliseHex,
  packChecks,
  packFiles,
  packInfo,
  packPlacement,
  placementKey,
  placementShortLabel,
  positionLabel,
  printDeps,
  productUsesDesign,
  samePlacement,
  shortDesignCode,
  storedManifest,
  type PackRow,
  type PrintDeps,
} from '@/lib/print/pipeline';
import type {
  InkSystemProfile,
  JobSheetAudit,
  JobSheetChecks,
  JobSheetDtgFile,
  JobSheetDtgPack,
  JobSheetGarment,
  JobSheetInput,
  JobSheetPieceRow,
  JobSheetPieces,
  JobSheetScreenSet,
  PrintPlacement,
  PrintTechnique,
  ScreenMethod,
} from '@/lib/print/types';
import { getActiveInkSystem, getInkSystemById } from '@/lib/services/ink-system';
import { toPrintPlacement, type StoredPlacement } from '@/lib/services/prepress';
import { productAreas } from '@/lib/services/print-prep';
import { techniqueOfService } from '@/lib/services/quotes';
import { runNumberFor } from '@/lib/services/runs';
import { sortSizes } from '@/lib/storefront/present';

/** The drawing's own version, part of every sheet's hash: a sheet cached before lib/print/pack/job-sheet.ts drew something new
 * for the same contents (2: the dot-gain line, traps by method, index rulings) is drawn again rather than served as it was. */
const JOB_SHEET_LAYOUT = 2;

/** Production stages an order is open in: paid, and its pieces not yet printed and packed. */
const OPEN_PRODUCTION = ['queued', 'printing'] as const;
/** Products in front of fans: their proof is out, or they are on sale. A draft is not (yet). */
const SHOP_STATUSES = ['proof_pending', 'live'] as const;

type ProductRow = {
  id: string;
  name: string;
  designId: string | null;
  blankCode: string;
  printServiceCode: string;
  placement: unknown;
  placements: unknown;
  status: (typeof schema.products.$inferSelect)['status'];
};

/** What the sheet says, as plain data: the renderer's input before it has its proof images and its date. */
export type JobSheetSource = Omit<JobSheetInput, 'generatedAt' | 'proofs'> & {
  /** the proof files by their hash; the images are read only when the sheet has to be drawn */
  proofs: { colourName: string; label: string; key: string; sha256: string }[];
};

export interface CollectedJobSheet {
  source: JobSheetSource;
  /** of the source: the same contents, the same hash */
  contentHash: string;
  /** 'MF-UNDERWRITER-TEE-v3-job-sheet.pdf' */
  filename: string;
  /** The pack each of source.screenSets was built in, in the same order. Beside the source, not in it: the sheet's
   * hash (and so its stored PDF) is of what the sheet says, and a pack id says nothing on paper. */
  setPackIds: string[];
  /** Where a browser may load each proof from, by proof key (the source keeps only what the PDF needs). */
  proofVisibility: Record<string, 'public' | 'private'>;
}

export interface DesignJobSheet {
  bytes: Buffer;
  filename: string;
  contentHash: string;
  /** true when the PDF was already stored for these contents */
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Words

const orderRef = (orderId: string) => `ORD-${orderId.slice(0, 8).toUpperCase()}`;

function setNameOf(key: string | null, colourNames: Map<string, string>): string {
  if (!key) return '';
  if (key === 'darks') return 'Darks';
  if (key === 'lights') return 'Lights';
  return colourNames.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1);
}

const mmText = (n: number) => String(Math.round(n * 10) / 10);

/** '280 × 336 mm at 600 ppi' */
function printSizeText(size: { width: number; height: number } | undefined, ppi: number | undefined): string | null {
  if (!size) return null;
  return `${mmText(size.width)} × ${mmText(size.height)} mm${ppi ? ` at ${ppi} ppi` : ''}`;
}

/** The pre-press progress over a design's files, in a phrase. */
function packStatusWords(audits: JobSheetAudit[], building: number): string {
  const n = audits.length;
  if (n === 0) return building > 0 ? 'Print files are being prepared' : 'No print files yet';
  const approved = audits.filter((a) => a.state === 'approved').length;
  const files = `${n} ${n === 1 ? 'file' : 'files'}`;
  if (audits.some((a) => a.state === 'sent_back')) return `Sent back to the artist (${approved} of ${files} approved)`;
  if (approved === n) return `Approved by pre-press (${files})`;
  return `${approved} of ${files} approved by pre-press`;
}

/** File-name safe: 'MF-UNDERWRITER-TEE' stays, anything else becomes a dash. */
function fileSlug(text: string): string {
  return text.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'DESIGN';
}

// ---------------------------------------------------------------------------
// Which version, which packs

type VersionRow = typeof schema.designVersions.$inferSelect;
type ApprovalRow = typeof schema.designApprovals.$inferSelect;

interface Resolved {
  version: VersionRow | null;
  approval: ApprovalRow | null;
  /** built and not replaced: the files people work with */
  packs: PackRow[];
  /** packs of the version still being built */
  building: PackRow[];
}

/** The version the sheet is for: the one the artist's standing approval names, else the newest
 * with print files built, else (nothing built yet) the approved or newest version. The same
 * rule an order finds its files by (packsFor in prepress.ts). */
async function resolveVersion(designId: string): Promise<Resolved> {
  const versions = await db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, designId)).orderBy(desc(schema.designVersions.version));
  if (versions.length === 0) return { version: null, approval: null, packs: [], building: [] };

  const [valid] = await db
    .select()
    .from(schema.designApprovals)
    .where(and(eq(schema.designApprovals.designId, designId), isNull(schema.designApprovals.invalidatedAt)))
    .orderBy(desc(schema.designApprovals.approvedAt))
    .limit(1);
  const ordered = valid ? [...versions.filter((v) => v.id === valid.designVersionId), ...versions.filter((v) => v.id !== valid.designVersionId)] : versions;

  let first: Resolved | null = null;
  for (const version of ordered) {
    const all = await loadPacksForVersion(version.id);
    const resolved: Resolved = {
      version,
      approval: valid && valid.designVersionId === version.id ? valid : null,
      packs: all.filter((p) => p.buildStatus === 'ready' && !isSuperseded(p)),
      building: all.filter((p) => p.buildStatus === 'building'),
    };
    first ??= resolved;
    if (resolved.packs.length > 0) return resolved;
  }
  return first as Resolved;
}

// ---------------------------------------------------------------------------
// Collecting

interface RawLine {
  blankCode: string;
  colourCode: string;
  placement: PrintPlacement;
  technique: PrintTechnique | null;
  serviceCode: string;
  usedBy: string;
}

/** A print position of a run line, with the design printed there when it isn't the line's own. */
type RunPlacement = StoredPlacement & { designId?: string | null };

interface RunLine {
  productId?: string | null;
  designId?: string | null;
  blankCode?: string;
  printServiceCode?: string;
  placement?: RunPlacement | null;
  /** more positions on the same garment (a product's other print areas, or a screen print's extra positions) */
  extraPlacements?: RunPlacement[] | null;
  colourCode?: string;
}

/** The method order on the garments table: how shop products print first, then screen. */
const METHOD_ORDER: Record<string, number> = { dtg_dtf: 0, screen: 1, none: 2 };

export async function collectJobSheet(designId: string): Promise<CollectedJobSheet | null> {
  if (!isDesignId(designId)) return null;
  const [design] = await db
    .select({ id: schema.designs.id, storeId: schema.designs.storeId, shopName: schema.artistStores.name })
    .from(schema.designs)
    .innerJoin(schema.artistStores, eq(schema.designs.storeId, schema.artistStores.id))
    .where(eq(schema.designs.id, designId))
    .limit(1);
  if (!design) return null;

  const { version, approval, packs, building } = await resolveVersion(design.id);

  // -- what uses the design: its products (in any of their print areas), and the open orders on them
  const products: ProductRow[] = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      designId: schema.products.designId,
      blankCode: schema.products.blankCode,
      printServiceCode: schema.products.printServiceCode,
      placement: schema.products.placement,
      placements: schema.products.placements,
      status: schema.products.status,
    })
    .from(schema.products)
    .where(productUsesDesign(design.id))
    .orderBy(asc(schema.products.createdAt), asc(schema.products.id));
  const productById = new Map(products.map((p) => [p.id, p]));

  const items =
    products.length === 0
      ? []
      : await db
          .select({
            orderId: schema.orders.id,
            orderType: schema.orders.orderType,
            createdAt: schema.orders.createdAt,
            productId: schema.orderItems.productId,
            colourCode: schema.orderItems.colourCode,
            size: schema.orderItems.size,
            qty: schema.orderItems.quantity,
          })
          .from(schema.orderItems)
          .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
          .where(
            and(
              inArray(schema.orderItems.productId, products.map((p) => p.id)),
              eq(schema.orders.status, 'paid'),
              inArray(schema.orders.productionStatus, [...OPEN_PRODUCTION]),
            ),
          )
          .orderBy(asc(schema.orders.createdAt), asc(schema.orders.id));

  // A run is one bulk order: its lines say how each garment prints (the product behind a line
  // prints DTG/DTF whatever the run does), and its position among the shop's runs names it.
  const bulkOrderIds = [...new Set(items.filter((i) => i.orderType === 'bulk').map((i) => i.orderId))];
  const runRows =
    bulkOrderIds.length === 0
      ? []
      : await db
          .select({ id: schema.bulkOrders.id, orderId: schema.bulkOrders.orderId, quote: schema.bulkOrders.quote })
          .from(schema.bulkOrders)
          .where(inArray(schema.bulkOrders.orderId, bulkOrderIds));
  const runs = new Map<string, { label: string; lines: RunLine[] }>();
  for (const run of runRows) {
    if (!run.orderId) continue;
    const n = await runNumberFor(run.id).catch(() => null);
    const lines = (run.quote as { lines?: RunLine[] } | null)?.lines;
    runs.set(run.orderId, { label: n === null ? 'Run' : `Run ${n}`, lines: Array.isArray(lines) ? lines : [] });
  }

  const productColourRows =
    products.length === 0
      ? []
      : await db
          .select({ productId: schema.productColours.productId, colourCode: schema.productColours.colourCode })
          .from(schema.productColours)
          .where(inArray(schema.productColours.productId, products.map((p) => p.id)));
  const colourCodesOfProduct = new Map<string, Set<string>>();
  for (const row of productColourRows) colourCodesOfProduct.set(row.productId, (colourCodesOfProduct.get(row.productId) ?? new Set()).add(row.colourCode));

  // -- one line per garment colour that asks for the design
  const openSales = new Map<string, Set<string>>();
  for (const item of items) {
    if (item.orderType !== 'pod' || !item.colourCode) continue;
    openSales.set(item.productId, (openSales.get(item.productId) ?? new Set()).add(item.colourCode));
  }
  const lines: RawLine[] = [];
  for (const product of products) {
    const sold = openSales.get(product.id);
    const inFront = (SHOP_STATUSES as readonly string[]).includes(product.status);
    if (!inFront && !sold) continue;
    // A shop sale prints DTG/DTF whatever the product says; a service with no print file (embroidery) has none.
    const technique: PrintTechnique | null = techniqueOfService(product.printServiceCode) === null ? null : 'dtg_dtf';
    const colours = new Set([...(inFront ? (colourCodesOfProduct.get(product.id) ?? []) : []), ...(sold ?? [])]);
    // Only the areas that print this design: another area of the product is on its own design's sheet.
    const areas = productAreas(product).filter((a) => a.designId === design.id);
    for (const colourCode of colours) {
      for (const area of areas) {
        lines.push({
          blankCode: product.blankCode,
          colourCode,
          placement: toPrintPlacement(area),
          technique,
          serviceCode: product.printServiceCode,
          usedBy: `Shop · ${product.name}`,
        });
      }
    }
  }
  for (const run of runs.values()) {
    for (const line of run.lines) {
      // A line off one of this design's products, or one quoted off a blank: each of its positions that prints this design.
      const product = line.productId ? productById.get(line.productId) : undefined;
      if (line.productId && !product) continue;
      const blankCode = line.blankCode ?? product?.blankCode;
      if (!blankCode || !line.colourCode || !line.printServiceCode) continue;
      const lineDesign = product?.designId ?? line.designId ?? null;
      const extras = Array.isArray(line.extraPlacements) ? line.extraPlacements : [];
      const placements: (RunPlacement | null)[] = line.placement ? [line.placement, ...extras] : product ? productAreas(product) : [null, ...extras];
      for (const placement of placements) {
        if ((placement?.designId ?? lineDesign) !== design.id) continue;
        lines.push({
          blankCode,
          colourCode: line.colourCode,
          placement: toPrintPlacement(placement),
          technique: techniqueOfService(line.printServiceCode),
          serviceCode: line.printServiceCode,
          usedBy: run.label,
        });
      }
    }
  }

  // -- names: blanks, colours, services, the people who audited
  const packInfos = packs.map((p) => ({ pack: p, info: packInfo(p) }));
  const blankCodes = [...new Set([...lines.map((l) => l.blankCode), ...products.map((p) => p.blankCode), ...packInfos.map((p) => p.info?.blankCode).filter((c): c is string => Boolean(c))])];
  const colourCodes = [...new Set([...lines.map((l) => l.colourCode), ...items.map((i) => i.colourCode).filter((c): c is string => Boolean(c)), ...packs.flatMap((p) => p.garmentCodes as string[])])];
  const serviceCodes = [...new Set(lines.map((l) => l.serviceCode))];
  const auditorIds = [...new Set(packs.map((p) => p.auditedBy).filter((id): id is string => Boolean(id)))];
  const [blankRows, colourRows, serviceRows, auditorRows] = await Promise.all([
    blankCodes.length ? db.select({ code: schema.blanks.code, name: schema.blanks.name, type: schema.blanks.type }).from(schema.blanks).where(inArray(schema.blanks.code, blankCodes)) : [],
    colourCodes.length
      ? db.select({ code: schema.colours.code, name: schema.colours.name, hex: schema.colours.hex, order: schema.colours.displayOrder }).from(schema.colours).where(inArray(schema.colours.code, colourCodes))
      : [],
    serviceCodes.length ? db.select({ code: schema.printServices.code, name: schema.printServices.name }).from(schema.printServices).where(inArray(schema.printServices.code, serviceCodes)) : [],
    auditorIds.length ? db.select({ id: schema.users.id, name: schema.users.displayName, email: schema.users.email }).from(schema.users).where(inArray(schema.users.id, auditorIds)) : [],
  ]);
  const blankName = (code: string) => {
    const row = blankRows.find((b) => b.code === code);
    return row ? blankDisplayName(row.code, row.name) : code;
  };
  // Where a print sits: the real distance below the collar once the blank's standard collar distance is
  // set (standard plus the product's offset), else "Standard position" and the offset. A product's offset
  // is from the standard position, never from the collar, so the sheet must not say it is.
  let collarUnset = false;
  const placementText = (blankCode: string, p: PrintPlacement): string => {
    const blankType = blankRows.find((b) => b.code === blankCode)?.type;
    const height = describePrintHeight(standardCollarDistanceCm(blankType, p.position), p.offsetYMm === undefined ? undefined : p.offsetYMm / 10);
    if (!height.collarKnown) collarUnset = true;
    return `${positionLabel(p.position)} · ${formatCm(p.widthMm)} cm wide · ${height.text}`;
  };
  const colourNames = new Map(colourRows.map((c) => [c.code, c.name]));
  const colourName = (code: string) => colourNames.get(code) ?? code;
  const colourOrder = (code: string) => colourRows.find((c) => c.code === code)?.order ?? Number.MAX_SAFE_INTEGER;
  const serviceName = (code: string) => serviceRows.find((s) => s.code === code)?.name ?? null;
  const auditorName = (id: string) => {
    const row = auditorRows.find((u) => u.id === id);
    return row?.name?.trim() || row?.email || 'Pre-press';
  };

  // -- the file to use for each line
  const findPack = (technique: PrintTechnique, blankCode: string, placement: PrintPlacement, colourCode: string): PackRow | undefined =>
    [...packInfos]
      .filter(({ pack, info }) => pack.technique === technique && info?.blankCode === blankCode && samePlacement(packPlacement(pack), placement) && (pack.garmentCodes as string[]).includes(colourCode))
      .sort((a, b) => b.pack.createdAt.getTime() - a.pack.createdAt.getTime())[0]?.pack;
  const beingBuilt = (technique: PrintTechnique, blankCode: string, placement: PrintPlacement) =>
    building.some((p) => p.technique === technique && packInfo(p)?.blankCode === blankCode && samePlacement(packPlacement(p), placement));

  const merged = new Map<string, JobSheetGarment>();
  // Rows are put in order by where the print sits (position, width, offset), not by the words that describe it.
  const placed = new Map<JobSheetGarment, PrintPlacement>();
  for (const line of lines) {
    const base = {
      blankCode: line.blankCode,
      blankName: blankName(line.blankCode),
      colourCode: line.colourCode,
      colourName: colourName(line.colourCode),
      colourHex: normaliseHex(colourRows.find((c) => c.code === line.colourCode)?.hex),
      placement: placementText(line.blankCode, line.placement),
    };
    let row: JobSheetGarment;
    if (line.technique === null) {
      row = { ...base, method: 'none', methodLabel: serviceName(line.serviceCode) ?? 'No print file', setName: null, file: null, note: 'No print file is made for this method.', usedBy: [line.usedBy] };
    } else {
      const pack = findPack(line.technique, line.blankCode, line.placement, line.colourCode);
      const missing = beingBuilt(line.technique, line.blankCode, line.placement) ? 'Being prepared' : 'No print file yet';
      if (line.technique === 'dtg_dtf') {
        const file = pack ? (packFiles(pack).find((f) => f.kind === 'dtg_png' && f.garmentCode === line.colourCode)?.name ?? null) : null;
        row = { ...base, method: 'dtg_dtf', methodLabel: 'DTG/DTF', setName: null, file, note: file ? null : missing, usedBy: [line.usedBy] };
      } else {
        const set = pack ? setNameOf(pack.screenSetKey, colourNames) : null;
        const file = pack ? (packFiles(pack).find((f) => f.kind === 'screen_psd')?.name ?? null) : null;
        // A set with no films is a pack that was built: nothing prints on the colour, which is not "no file yet".
        const note = file ? null : pack ? 'Nothing prints on this colour.' : missing;
        row = { ...base, method: 'screen', methodLabel: set ? `Screen · ${set}` : 'Screen', setName: set, file, note, usedBy: [line.usedBy] };
      }
    }
    const key = [row.blankCode, row.colourCode, placementKey(line.placement), row.method, row.setName ?? '', row.file ?? row.note ?? ''].join('|');
    const existing = merged.get(key);
    if (existing) existing.usedBy = [...new Set([...existing.usedBy, ...row.usedBy])].sort();
    else {
      merged.set(key, row);
      placed.set(row, line.placement);
    }
  }
  const garments = [...merged.values()].sort(
    (a, b) =>
      a.blankName.localeCompare(b.blankName) ||
      a.blankCode.localeCompare(b.blankCode) ||
      positionLabel(placed.get(a)!.position).localeCompare(positionLabel(placed.get(b)!.position)) ||
      placed.get(a)!.widthMm - placed.get(b)!.widthMm ||
      (placed.get(a)!.offsetYMm ?? 0) - (placed.get(b)!.offsetYMm ?? 0) ||
      METHOD_ORDER[a.method] - METHOD_ORDER[b.method] ||
      colourOrder(a.colourCode) - colourOrder(b.colourCode) ||
      a.colourName.localeCompare(b.colourName) ||
      (a.setName ?? '').localeCompare(b.setName ?? ''),
  );

  // -- the design's production files: screen sets, DTG/DTF files, proofs, checks and audit
  const orderedPacks = [...packInfos].sort(
    (a, b) =>
      blankName(a.info?.blankCode ?? '').localeCompare(blankName(b.info?.blankCode ?? '')) ||
      placementKey(packPlacement(a.pack)).localeCompare(placementKey(packPlacement(b.pack))) ||
      (a.pack.technique === b.pack.technique ? 0 : a.pack.technique === 'screen' ? -1 : 1) ||
      (a.pack.screenSetKey ?? '').localeCompare(b.pack.screenSetKey ?? ''),
  );
  const inkSystems = new Map<string, InkSystemProfile>();
  let activeInks: InkSystemProfile | null = null;
  const systemOf = async (inkSystemId: string | null | undefined): Promise<InkSystemProfile> => {
    // The profile the set was built with: edits to the shop's profile never change a film already made.
    if (inkSystemId) {
      if (!inkSystems.has(inkSystemId)) {
        const pinned = await getInkSystemById(inkSystemId);
        if (pinned) inkSystems.set(inkSystemId, pinned);
      }
      const hit = inkSystems.get(inkSystemId);
      if (hit) return hit;
    }
    return (activeInks ??= (await getActiveInkSystem()).profile);
  };

  const severalBlanks = new Set(packInfos.map((p) => p.info?.blankCode ?? '')).size > 1;
  // A design printed in several areas (a front and a sleeve) says which area each proof is of.
  const severalAreas = new Set(packInfos.map((p) => placementKey(packPlacement(p.pack)))).size > 1;
  const screenSets: JobSheetScreenSet[] = [];
  const setPackIds: string[] = [];
  const proofVisibility: Record<string, 'public' | 'private'> = {};
  const dtgPacks: JobSheetDtgPack[] = [];
  const proofs: JobSheetSource['proofs'] = [];
  const checks: JobSheetChecks[] = [];
  const audits: JobSheetAudit[] = [];

  for (const { pack, info } of orderedPacks) {
    const manifest = storedManifest(pack);
    const files = packFiles(pack);
    const blankCode = info?.blankCode ?? '';
    const placement = packPlacement(pack);
    const blank = blankName(blankCode);
    const names = (pack.garmentCodes as string[]).map(colourName);
    const isScreen = pack.technique === 'screen';
    const set = setNameOf(pack.screenSetKey, colourNames);
    const technique = isScreen ? `Screen · ${set}` : 'DTG/DTF';
    const label = `${technique} · ${blank} (${blankCode}) · ${placementShortLabel(placement)}`;
    const recipe = info?.jobInput.recipe;
    const manifestDetail = manifest as { print?: { ppi: number; widthMm: number; heightMm: number }; dtg?: { garmentCode: string; widthPx: number; heightPx: number; ppi: number; offsetMm: { x: number; y: number }; sizeMm: { width: number; height: number }; whitesTransparent: boolean; fadeShare: number }[] } | null;

    if (isScreen && manifest) {
      const blocking = (info?.warnings ?? []).filter((w) => w.severity === 'block').map((w) => w.message);
      screenSets.push({
        setName: set,
        blankCode,
        blankName: blank,
        placement: placementText(blankCode, placement),
        colours: names,
        file: files.find((f) => f.kind === 'screen_psd')?.name ?? null,
        method: (manifest.method === 'dtg' ? 'spot' : manifest.method) as ScreenMethod,
        printSize: printSizeText(info?.printSizeMm, info?.canvas?.ppi ?? recipe?.screenPpi),
        inks: [...manifest.inks].sort((a, b) => a.index - b.index),
        underbaseChokeMm: recipe?.underbaseChokeMm ?? null,
        trapMm: recipe?.trapMm ?? null,
        system: await systemOf(info?.jobInput.inkSystemId),
        note: manifest.inks.length === 0 ? (blocking.join(' ') || null) : null,
      });
      setPackIds.push(pack.id);
    }
    if (!isScreen) {
      const png = (code: string) => files.find((f) => f.kind === 'dtg_png' && f.garmentCode === code);
      const listed = manifestDetail?.dtg ?? [];
      const dtgFiles: JobSheetDtgFile[] = (pack.garmentCodes as string[]).map((code) => {
        const crop = listed.find((d) => d.garmentCode === code);
        const file = png(code);
        return {
          colourCode: code,
          colourName: colourName(code),
          file: file?.name ?? null,
          widthPx: crop?.widthPx ?? file?.widthPx ?? 0,
          heightPx: crop?.heightPx ?? file?.heightPx ?? 0,
          ppi: crop?.ppi ?? file?.ppi ?? recipe?.dtg.ppi ?? 300,
          sizeMm: crop?.sizeMm ?? { width: 0, height: 0 },
          offsetMm: crop?.offsetMm ?? { x: 0, y: 0 },
          whitesTransparent: crop?.whitesTransparent ?? false,
          fadeShare: crop?.fadeShare ?? 0,
        };
      });
      dtgFiles.sort((a, b) => colourOrder(a.colourCode) - colourOrder(b.colourCode) || a.colourName.localeCompare(b.colourName));
      dtgPacks.push({
        blankCode,
        blankName: blank,
        placement: placementText(blankCode, placement),
        printSize: printSizeText(info?.printSizeMm, manifestDetail?.print?.ppi ?? recipe?.dtg.ppi),
        fadeLpi: recipe?.dtg.fadeLpi ?? null,
        files: dtgFiles,
      });
    }

    for (const file of [...files].filter((f) => f.kind === 'proof' && f.garmentCode).sort((a, b) => colourOrder(a.garmentCode as string) - colourOrder(b.garmentCode as string))) {
      const where = [severalBlanks ? blank : null, severalAreas ? positionLabel(placement.position) : null].filter(Boolean).join(' · ');
      proofs.push({ colourName: colourName(file.garmentCode as string), label: where ? `${technique} · ${where}` : technique, key: file.key, sha256: file.sha256 });
      proofVisibility[file.key] = file.visibility;
    }
    checks.push({ label, checks: packChecks(pack) });
    audits.push({
      label,
      state: pack.auditStatus,
      by: pack.auditedBy ? auditorName(pack.auditedBy) : null,
      at: pack.auditedAt ? pack.auditedAt.toISOString() : null,
    });
  }

  // -- pieces waiting: the open orders for the design, added up by garment, colour and size
  const pieceRows = new Map<string, JobSheetPieceRow>();
  const orderIds = new Set<string>();
  const sizes = new Set<string>();
  let total = 0;
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) continue;
    orderIds.add(item.orderId);
    const colourCode = item.colourCode ?? '';
    const size = item.size?.trim() || 'OS';
    sizes.add(size);
    const key = `${product.blankCode}|${colourCode}`;
    let row = pieceRows.get(key);
    if (!row) {
      row = {
        blankCode: product.blankCode,
        blankName: blankName(product.blankCode),
        colourCode,
        colourName: colourCode ? colourName(colourCode) : 'Colour not set',
        sizes: {},
        total: 0,
        from: [],
      };
      pieceRows.set(key, row);
    }
    row.sizes[size] = (row.sizes[size] ?? 0) + item.qty;
    row.total += item.qty;
    total += item.qty;
    const run = runs.get(item.orderId);
    const ref = run ? `${run.label} · ${orderRef(item.orderId)}` : orderRef(item.orderId);
    const from = row.from.find((f) => f.ref === ref);
    if (from) from.qty += item.qty;
    else row.from.push({ ref, qty: item.qty });
  }
  const pieces: JobSheetPieces = {
    sizes: sortSizes([...sizes]),
    rows: [...pieceRows.values()].sort((a, b) => a.blankName.localeCompare(b.blankName) || a.blankCode.localeCompare(b.blankCode) || colourOrder(a.colourCode) - colourOrder(b.colourCode) || a.colourName.localeCompare(b.colourName)),
    total,
    orders: orderIds.size,
  };

  const shown = version ? ((await displayVersionNumbers([version])).get(version.id) ?? version.version) : null;
  const code = packInfos.map((p) => p.info?.label.designCode).find((c): c is string => Boolean(c)) ?? shortDesignCode(design.id);
  const source: JobSheetSource = {
    design: {
      code,
      name: await designDisplayName(design.id),
      shopName: design.shopName,
      versionNumber: shown,
      approvedAt: approval ? approval.approvedAt.toISOString() : null,
    },
    packStatus: packStatusWords(audits, building.length),
    garments,
    placementNotes: collarUnset ? [COLLAR_DISTANCE_UNSET_NOTE] : [],
    screenSets,
    dtgPacks,
    proofs,
    checks,
    pieces,
    audits,
  };
  return {
    source,
    contentHash: hashJson({ layout: JOB_SHEET_LAYOUT, source }),
    filename: `${fileSlug(code)}${shown === null ? '' : `-v${shown}`}-job-sheet.pdf`,
    setPackIds,
    proofVisibility,
  };
}

// ---------------------------------------------------------------------------
// Making and caching the PDF

/** Where the PDF of one set of contents is kept: by design, named by the hash of what it says. */
export function jobSheetKey(designId: string, contentHash: string): string {
  return `job-sheets/${designId.toLowerCase()}/${contentHash.slice(0, 40)}.pdf`;
}

function requireAccess(actor: Actor): void {
  if (!canOpenJobSheets(actor)) throw new PermissionError('prepress', 'view');
}

async function withImages(source: JobSheetSource, deps: PrintDeps, generatedAt: string): Promise<JobSheetInput> {
  const proofs: JobSheetInput['proofs'] = [];
  for (const ref of source.proofs) {
    try {
      proofs.push({ colourName: ref.colourName, label: ref.label, image: await deps.storage.getObject(ref.key) });
    } catch (err) {
      // A proof that cannot be read leaves a gap in the thumbnails, not a sheet nobody can print.
      console.error(`[job sheet] could not read a proof (${ref.key}):`, err instanceof Error ? err.message : err);
    }
  }
  return { ...source, generatedAt, proofs };
}

/** The sample sheet for PRINT_MOCK=1: fixed contents, and stand-in proofs drawn here (no files are read). */
async function mockSheet(): Promise<DesignJobSheet> {
  const sharp = (await import('sharp')).default;
  const art = Buffer.from('<svg width="300" height="360"><circle cx="150" cy="150" r="70" fill="#ED90DC"/><rect x="80" y="240" width="140" height="30" fill="#5456AC"/></svg>');
  const proofs: JobSheetInput['proofs'] = await Promise.all(
    MOCK_JOB_SHEET_PROOFS.map(async (proof) => ({
      colourName: proof.colourName,
      label: proof.label,
      image: await sharp({ create: { width: 300, height: 360, channels: 3, background: proof.hex } }).composite([{ input: art }]).webp().toBuffer(),
    })),
  );
  const input: JobSheetInput = { ...MOCK_JOB_SHEET, generatedAt: new Date().toISOString(), proofs };
  const bytes = await printDeps().pack.renderJobSheet(input);
  return { bytes, filename: 'MF-UNDERWRITER-v3-job-sheet.pdf', contentHash: 'mock', cached: false };
}

/** The design's job sheet, as it reads now: from storage when the PDF for these contents is
 * already there, otherwise drawn and stored. Null when there is no such design. Throws a
 * PermissionError for anyone without Pre-press or Production View. */
export async function getDesignJobSheet(actor: Actor, designId: string): Promise<DesignJobSheet | null> {
  requireAccess(actor);
  if (printMockOn()) return mockSheet();

  const collected = await collectJobSheet(designId);
  if (!collected) return null;
  const { source, contentHash, filename } = collected;
  const deps = printDeps();
  const key = jobSheetKey(designId, contentHash);

  // The PDF for exactly these contents, when one was drawn before. Whatever goes wrong reading
  // it, the sheet is drawn again: the cache is only a shortcut.
  try {
    if (await deps.storage.statObject(key)) return { bytes: await deps.storage.getObject(key), filename, contentHash, cached: true };
  } catch (err) {
    console.error('[job sheet] could not read the stored sheet:', err instanceof Error ? err.message : err);
  }

  const bytes = await deps.pack.renderJobSheet(await withImages(source, deps, new Date().toISOString()));
  try {
    await deps.storage.putObject({ key, data: bytes, contentType: 'application/pdf', visibility: 'private' });
  } catch (err) {
    console.error('[job sheet] could not store the sheet:', err instanceof Error ? err.message : err);
  }
  return { bytes, filename, contentHash, cached: false };
}

// ---------------------------------------------------------------------------
// The sheet as data, for the production stations

/** A proof's address for a browser (the public domain when there is one, else the print files route), or null. */
async function proofUrl(deps: PrintDeps, key: string, visibility: 'public' | 'private'): Promise<string | null> {
  try {
    return await deps.storage.objectUrl(key, visibility);
  } catch {
    return null;
  }
}

/** The design's job sheet as data: everything the PDF says, in the same words (both are made by buildJobSheetView
 * from the same collected sheet), with each proof's address and each screen set's pack in place of the images, for
 * the iPads at the stations to show and to match their counts to. Null when there is no such design. Throws a
 * PermissionError for anyone without Pre-press or Production View: it carries Pantone codes. */
export async function getJobSheetView(actor: Actor, designId: string): Promise<JobSheetView | null> {
  requireAccess(actor);
  if (printMockOn()) return sampleJobSheetView();

  const collected = await collectJobSheet(designId);
  if (!collected) return null;
  const { source, setPackIds, proofVisibility } = collected;
  const deps = printDeps();
  const proofs = await Promise.all(source.proofs.map(async (ref) => ({ colourName: ref.colourName, label: ref.label, url: await proofUrl(deps, ref.key, proofVisibility[ref.key] ?? 'public') })));
  return buildJobSheetView({
    ...source,
    generatedAt: new Date().toISOString(),
    screenSets: source.screenSets.map((set, i) => ({ ...set, packId: setPackIds[i] })),
    proofs,
  });
}

/** A design's proof as a list shows it, for each way the design is printed: screen print, DTG/DTF. */
export type ProofThumbs = Record<string, { screen: string | null; dtg_dtf: string | null }>;

/** One small proof per design and technique, for the station's queue: the first proof of the newest built version that
 * has one (Darks before Lights, and the first area built). One read for all the designs, so a queue of many costs the
 * same as a queue of one. A design that is not an id, or has no proof yet, has nulls. */
export async function designProofThumbs(actor: Actor, designIds: string[]): Promise<ProofThumbs> {
  requireAccess(actor);
  const none = () => ({ screen: null, dtg_dtf: null });
  const out: ProofThumbs = Object.fromEntries(designIds.map((id) => [id, none()]));
  const ids = [...new Set(designIds.filter(isDesignId))];
  if (ids.length === 0) return out;
  if (printMockOn()) {
    for (const id of ids) out[id] = { screen: '/dev/print-mock/proof-screen-black.webp', dtg_dtf: '/dev/print-mock/proof-dtg-black.webp' };
    return out;
  }

  const rows = await db
    .select({ designId: schema.designVersions.designId, pack: schema.productionPacks })
    .from(schema.productionPacks)
    .innerJoin(schema.designVersions, eq(schema.productionPacks.designVersionId, schema.designVersions.id))
    .where(and(inArray(schema.designVersions.designId, ids), eq(schema.productionPacks.buildStatus, 'ready')))
    // Newest version first; within it the first set by name (Darks before Lights) and the first built, so the same list shows the same proof.
    .orderBy(desc(schema.designVersions.version), asc(schema.productionPacks.screenSetKey), asc(schema.productionPacks.createdAt), asc(schema.productionPacks.id));
  const deps = printDeps();
  for (const { designId, pack } of rows) {
    if (isSuperseded(pack)) continue;
    const slot = pack.technique === 'screen' ? 'screen' : 'dtg_dtf';
    const entry = out[designId] ?? (out[designId] = none());
    if (entry[slot]) continue;
    const proof = packFiles(pack).find((f) => f.kind === 'proof');
    if (proof) entry[slot] = await proofUrl(deps, proof.key, proof.visibility);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Links from orders

/** The designs behind each order's items, with the name people know each by, so an order or a
 * production row can link to their job sheets. An order can print several designs. */
export async function designsForOrders(orderIds: string[]): Promise<Map<string, JobSheetLink[]>> {
  const unique = [...new Set(orderIds)];
  const byOrder = new Map<string, JobSheetLink[]>();
  if (unique.length === 0) return byOrder;

  const items = await db
    .select({ orderId: schema.orderItems.orderId, designId: schema.products.designId, placement: schema.products.placement, placements: schema.products.placements })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
    .where(inArray(schema.orderItems.orderId, unique));
  // Every design an order's products print, in any of their areas (a front and a back can be different artwork).
  const pairs = new Map<string, Set<string>>();
  for (const item of items) {
    for (const area of productAreas(item)) {
      if (area.designId) pairs.set(item.orderId, (pairs.get(item.orderId) ?? new Set()).add(area.designId));
    }
  }
  const designIds = [...new Set([...pairs.values()].flatMap((ids) => [...ids]))];
  if (designIds.length === 0) return byOrder;

  // The name of a design is its first product's, as designDisplayName reads it.
  const names = new Map<string, string>();
  for (const id of designIds) names.set(id, await designDisplayName(id));

  for (const [orderId, ids] of pairs) {
    const links: JobSheetLink[] = [...ids].map((designId) => ({ designId, name: names.get(designId) ?? `Design ${shortDesignCode(designId).slice(3)}` }));
    byOrder.set(orderId, links.sort((a, b) => a.name.localeCompare(b.name) || a.designId.localeCompare(b.designId)));
  }
  return byOrder;
}
