// The print job handler (WP7): design version -> engine -> pack files ->
// print storage -> production_packs rows. The worker (worker/print-worker.ts)
// calls handlePrintJob for each claimed job; it never runs in a request.
//
// This module is also the hub the print services share: the dependency seam
// (engine, pack writers, storage and the job queue are reached through
// printDeps(), so tests inject fakes and no request pulls in sharp or the PSD
// libraries), the pack row helpers, and the corrected-upload path.
//
// It imports the services only lazily (pantone-library, ink-system, prepress),
// so the services can import it without a cycle.
import { createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { Actor } from '@/lib/auth/permissions';
import { STANDARD_PACKSHOT, isSleevePosition, keepOnPhoto, printOffsetPx, printPositionLabel, sleeveKindFor, type PrintArea } from '@/lib/mockups/placements';
import type { SleeveProofInput } from '@/lib/mockups/sleeve-proof';
import { ENGINE_TUNING } from '@/lib/print/defaults';
import { clientColourName } from '@/lib/print/colour-names';
import { hexToLab } from '@/lib/print/engine/colour';
import type { PrintJobRow } from '@/lib/print/jobs';
import type * as EngineModule from '@/lib/print/engine';
import type * as PackModule from '@/lib/print/pack';
import type { BuildManifestInput, ScreenPsdDiff } from '@/lib/print/pack';
import { dtgPngFileName, dtgPsdFileName, screenPsdFileName, type FileStemInput } from '@/lib/print/pack/names';
import type * as JobsModule from '@/lib/print/jobs';
import type * as StorageModule from '@/lib/services/print-storage';
import { loadPackshot } from '@/lib/services/packshots';
import { PRINT_FILES_ROUTE, getObject, isNotFound, isValidKey, objectUrl, openObject, printKey, putObject, statObject } from '@/lib/services/print-storage';
import { localDemoOn } from '@/lib/dev/local-demo';
import { enqueuePrintJob, hashJobInput } from '@/lib/print/jobs';
import { recordStaffActivity } from '@/lib/services/team';
import { notify, type NotificationEvent } from '@/lib/services/notifications';
import type {
  CanvasSpec,
  CheckResult,
  DtgLayer,
  FractionRect,
  GarmentColour,
  InkPlate,
  InkSystemProfile,
  JobSheetInput,
  PackshotInput,
  Lab,
  OriginalArt,
  PackFile,
  PackNeed,
  PackFileKind,
  PackManifest,
  ParsedScreenPsd,
  Plate,
  PlateLabelInfo,
  PrintJobInput,
  PrintJobResult,
  PrintPlacement,
  PrintTechnique,
  ProofImage,
  Raster,
  ScreenMethod,
  ScreenSet,
  Warning,
} from '@/lib/print/types';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Dependencies

export type EngineApi = Pick<
  typeof EngineModule,
  'decodeArt' | 'separateScreen' | 'prepareDtg' | 'renderScreenProof' | 'renderDtgProof' | 'renderScreenLoupe' | 'renderDtgLoupe'
> & {
  /** redraws a film's label strip in place, e.g. with its Pantone code (sync in the engine); the recipe's old
   * targetOffsetMm only places the strip on a film made before engine 3 */
  relabelPlate: (set: ScreenSet, plateIndex: number, label: PlateLabelInfo, inks: InkSystemProfile, legacyTargetOffsetMm: number | undefined, inkName?: string, garmentNames?: Record<string, string>) => void | Promise<void>;
};
export type PackApi = Pick<typeof PackModule, 'writeScreenPsd' | 'writeDtgPsd' | 'writeDtgPng' | 'renderFilmPreview' | 'runChecks'> & {
  /** what the real reader returns is richer; the pipeline only needs the contract's shape */
  readScreenPsd: (bytes: Buffer) => Promise<ParsedScreenPsd>;
  /** these are sync in the pack module; the seam allows a promise so the module can load on first use */
  buildManifest: (input: BuildManifestInput) => PackManifest | Promise<PackManifest>;
  rebuildScreenSet: (original: ScreenSet, parsed: ParsedScreenPsd) => ScreenSet | Promise<ScreenSet>;
  diffScreenPsd: (original: ScreenSet, parsed: ParsedScreenPsd) => ScreenPsdDiff | Promise<ScreenPsdDiff>;
  /** the design's job sheet (lib/services/job-sheets.ts), one PDF for every garment that uses the design */
  renderJobSheet: (input: JobSheetInput) => Promise<Buffer>;
  /** false for a set where nothing prints (the art is the shirt's colour): no PSD, previews or proofs for it */
  screenSetPrints: (set: ScreenSet) => boolean | Promise<boolean>;
};
export type StorageApi = Pick<typeof StorageModule, 'putObject' | 'getObject' | 'objectUrl' | 'printKey' | 'statObject'> & {
  /** the first `bytes` bytes of an object, read as a range so a PSD of hundreds of MB is never pulled; null when it isn't there */
  peek: (key: string, bytes: number) => Promise<Buffer | null>;
};
export type JobsApi = Pick<typeof JobsModule, 'enqueuePrintJob' | 'hashJobInput'>;

/** Print-resolution artwork for a design, ready to be pinned as a version. */
export interface FinalArt {
  url: string;
  /** left out when the finaliser does not say: the design's own source is used */
  source?: 'upload' | 'generated' | 'edited' | 'final_4k';
  /** true when this is a fresh 4K render, false when the art is kept as it was or the final already existed */
  rendered?: boolean;
  /** set when the finaliser already holds the pixels (saves a download) */
  bytes?: Buffer;
  widthPx?: number;
  heightPx?: number;
}

export interface ActivityEntry {
  area: string;
  action: string;
  itemType?: string;
  itemId?: string;
  detail?: unknown;
}

export interface PrintDeps {
  engine: EngineApi;
  pack: PackApi;
  storage: StorageApi;
  jobs: JobsApi;
  loadPackshot: typeof loadPackshot;
  /** width and height of an image, or null when it can't be read */
  imageSize: (bytes: Buffer) => Promise<{ widthPx: number; heightPx: number } | null>;
  /** the artwork bytes of a version: print storage first, then its URL */
  loadArt: (version: { artKey: string | null; artUrl: string }) => Promise<Buffer>;
  /** print-resolution art for a design; when absent, print-prep calls WP4's
   * finaliseDesignForPrint through its adapter (finaliseDesignArt) */
  finaliseArt?: (storeId: string, designId: string, opts: { render: boolean }) => Promise<ServiceResult<FinalArt>>;
  /** a staff action in the activity log (lib/services/team.ts); never throws */
  recordActivity: (actor: Actor, entry: ActivityEntry) => Promise<void>;
  /** a sleeve print drawn flat and true size on a sleeve outline (lib/mockups/sleeve-proof.ts): sleeves have no photo */
  sleeveProof: (input: SleeveProofInput) => Promise<Buffer>;
  /** how long uploadCorrectedPsd waits for the worker to rebuild the pack (default: 250 s, inside the route's 300) */
  uploadWait?: { timeoutMs: number; intervalMs: number };
}

// The engine and the pack writers load on first use: they pull in sharp,
// ag-psd, pdfkit and friends, which a page or an agent request never needs.
const lazyEngine: EngineApi = {
  decodeArt: async (bytes) => (await import('@/lib/print/engine')).decodeArt(bytes),
  separateScreen: async (input) => (await import('@/lib/print/engine')).separateScreen(input),
  prepareDtg: async (input) => (await import('@/lib/print/engine')).prepareDtg(input),
  renderScreenProof: async (set, request, inks) => (await import('@/lib/print/engine')).renderScreenProof(set, request, inks),
  renderDtgProof: async (layer, request, inks) => (await import('@/lib/print/engine')).renderDtgProof(layer, request, inks),
  renderScreenLoupe: async (set, garmentCode, inks, sizeMm, garment) => (await import('@/lib/print/engine')).renderScreenLoupe(set, garmentCode, inks, sizeMm, garment),
  renderDtgLoupe: async (layer, garmentHex, sizeMm, isLight) => (await import('@/lib/print/engine')).renderDtgLoupe(layer, garmentHex, sizeMm, isLight),
  relabelPlate: async (set, plateIndex, label, inks, targetOffsetMm, inkName, garmentNames) =>
    (await import('@/lib/print/engine')).relabelPlate(set, plateIndex, label, inks, targetOffsetMm, inkName, garmentNames),
};

const lazyPack: PackApi = {
  writeScreenPsd: async (input) => (await import('@/lib/print/pack')).writeScreenPsd(input),
  writeDtgPsd: async (input) => (await import('@/lib/print/pack')).writeDtgPsd(input),
  writeDtgPng: async (layer) => (await import('@/lib/print/pack')).writeDtgPng(layer),
  renderFilmPreview: async (plate, label, heightPx) => (await import('@/lib/print/pack')).renderFilmPreview(plate, label, heightPx),
  readScreenPsd: async (bytes) => (await import('@/lib/print/pack')).readScreenPsd(bytes),
  buildManifest: async (input) => (await import('@/lib/print/pack')).buildManifest(input),
  runChecks: async (input) => (await import('@/lib/print/pack')).runChecks(input),
  rebuildScreenSet: async (original, parsed) => (await import('@/lib/print/pack')).rebuildScreenSet(original, parsed),
  diffScreenPsd: async (original, parsed) => (await import('@/lib/print/pack')).diffScreenPsd(original, parsed),
  renderJobSheet: async (input) => (await import('@/lib/print/pack')).renderJobSheet(input),
  screenSetPrints: async (set) => (await import('@/lib/print/pack')).screenSetPrints(set),
};

/** Local demo mode keeps its designs' art in print storage and names it by the route that serves it
 * ('/api/print-files/print/<design>/source/original.png'), an address a server cannot fetch: this is the
 * storage key behind one, or null for any other address and always outside local demo mode. */
function demoArtKey(artUrl: string): string | null {
  if (!localDemoOn() || !artUrl.startsWith(`${PRINT_FILES_ROUTE}/`)) return null;
  try {
    const key = decodeURIComponent(artUrl.slice(PRINT_FILES_ROUTE.length + 1).split('?')[0]);
    return isValidKey(key) ? key : null;
  } catch {
    return null;
  }
}

async function defaultLoadArt(version: { artKey: string | null; artUrl: string }): Promise<Buffer> {
  if (version.artKey) return getObject(version.artKey);
  const demoKey = demoArtKey(version.artUrl);
  if (demoKey) return getObject(demoKey);
  const response = await fetch(version.artUrl);
  if (!response.ok) throw new Error(`Could not download the artwork (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

async function defaultPeek(key: string, bytes: number): Promise<Buffer | null> {
  let opened;
  try {
    opened = await openObject(key, { start: 0, end: bytes - 1 });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
  const reader = opened.stream.getReader();
  const chunks: Buffer[] = [];
  let got = 0;
  try {
    while (got < bytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      got += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks).subarray(0, bytes);
}

async function defaultImageSize(bytes: Buffer): Promise<{ widthPx: number; heightPx: number } | null> {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(bytes).metadata();
    return meta.width && meta.height ? { widthPx: meta.width, heightPx: meta.height } : null;
  } catch {
    return null;
  }
}

const defaultDeps: PrintDeps = {
  engine: lazyEngine,
  pack: lazyPack,
  storage: { putObject, getObject, objectUrl, printKey, statObject, peek: defaultPeek },
  jobs: { enqueuePrintJob, hashJobInput },
  loadPackshot,
  loadArt: defaultLoadArt,
  imageSize: defaultImageSize,
  recordActivity: (actor, entry) => recordStaffActivity(actor, entry),
  // Loaded on first use, like the engine: it draws with sharp, which only the worker needs.
  sleeveProof: async (input) => (await import('@/lib/mockups/sleeve-proof')).renderSleeveProof(input),
};

let overrides: Partial<PrintDeps> | null = null;

/** Tests swap parts of the dependencies (fake engine, pack, storage, queue). Pass null to restore. */
export function overridePrintDeps(next: Partial<PrintDeps> | null): void {
  overrides = next;
}

export function printDeps(): PrintDeps {
  return { ...defaultDeps, ...(overrides ?? {}) };
}

// ---------------------------------------------------------------------------
// Small helpers

export function sha256Hex(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** '#RRGGBB' uppercase, or null when it isn't a colour. */
export function normaliseHex(hex: string | null | undefined): string | null {
  const clean = (hex ?? '').trim().replace(/^#/, '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  return /^[0-9a-fA-F]{6}$/.test(full) ? `#${full.toUpperCase()}` : null;
}

export function sniffImage(bytes: Buffer): { mime: string; ext: string } {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return { mime: 'image/jpeg', ext: 'jpg' };
  if (bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'application/octet-stream', ext: 'bin' };
}

function slug(text: string, max: number): string {
  return text
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

/** 'Front chest', 'Left sleeve': the words lib/mockups/placements.ts keeps for every position. */
export function positionLabel(position: string): string {
  return printPositionLabel(position);
}

/** 280 mm -> '28', 336 mm -> '33.6'. */
export function formatCm(mm: number): string {
  return String(Math.round(mm) / 10);
}

export function placementKey(p: PrintPlacement): string {
  return `${p.position}:${Math.round(p.widthMm)}:${Math.round(p.offsetYMm ?? 0)}`;
}

export function samePlacement(a: PrintPlacement, b: PrintPlacement): boolean {
  return placementKey(a) === placementKey(b);
}

/** 'Front chest · 28 cm' for the film label strip. */
export function placementShortLabel(p: PrintPlacement): string {
  return `${positionLabel(p.position)} · ${formatCm(p.widthMm)} cm`;
}

/** 'MF-3F9A2C': a short code from a design id. */
export function shortDesignCode(designId: string): string {
  return `MF-${designId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

type DesignRow = typeof schema.designs.$inferSelect;
export type PackRow = typeof schema.productionPacks.$inferSelect;
type VersionRow = typeof schema.designVersions.$inferSelect;

/** The products that print a design: as their main design (products.design_id) or in any of their print areas
 * (products.placements, where each area names its own design). */
export function productUsesDesign(designId: string): SQL {
  return or(eq(schema.products.designId, designId), sql`${schema.products.placements} @> ${JSON.stringify([{ designId }])}::jsonb`) as SQL;
}

/** What clients and staff call a design: its first product's name, or a short code. A design printed only in one area
 * of a product (its back, say) is named after that product too. */
export async function designDisplayName(designId: string): Promise<string> {
  const [row] = await db
    .select({ name: schema.products.name })
    .from(schema.products)
    .where(productUsesDesign(designId))
    .orderBy(asc(schema.products.createdAt))
    .limit(1);
  return row?.name?.trim() || `Design ${shortDesignCode(designId).slice(3)}`;
}

/** The colours of a blank, in the order asked for; colours the blank doesn't have are left out. */
export async function loadGarments(blankCode: string, codes: string[]): Promise<GarmentColour[]> {
  if (codes.length === 0) return [];
  const rows = await db
    .select({ code: schema.colours.code, name: schema.colours.name, hex: schema.colours.hex, isLight: schema.colours.isLight })
    .from(schema.blankColours)
    .innerJoin(schema.colours, eq(schema.blankColours.colourCode, schema.colours.code))
    .where(and(eq(schema.blankColours.blankCode, blankCode), inArray(schema.colours.code, codes)));
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const garments: GarmentColour[] = [];
  for (const code of codes) {
    const r = byCode.get(code);
    if (!r) continue;
    // A colour without a swatch still needs a ground for proofs and knockouts.
    garments.push({ code: r.code, name: r.name, hex: normaliseHex(r.hex) ?? (r.isLight ? '#F2F2F0' : '#1B1C1E'), isLight: r.isLight });
  }
  return garments;
}

/** The version number a person reads. A 4K final is the same version as the draft it was rendered
 * from (the artist made one piece of art, not two), so it takes its parent's number. */
export async function displayVersionNumbers(versions: VersionRow[]): Promise<Map<string, number>> {
  const byId = new Map(versions.map((v) => [v.id, v]));
  const missing = [...new Set(versions.map((v) => v.parentVersionId).filter((id): id is string => id !== null && !byId.has(id)))];
  if (missing.length > 0) {
    for (const row of await db.select().from(schema.designVersions).where(inArray(schema.designVersions.id, missing))) byId.set(row.id, row);
  }
  return new Map(versions.map((v) => [v.id, v.source === 'final_4k' && v.parentVersionId ? (byId.get(v.parentVersionId)?.version ?? v.version) : v.version]));
}

// ---------------------------------------------------------------------------
// Packs: the row, what rides beside the manifest, and which rows are current

/** What the pipeline keeps beside the typed manifest. production_packs has no
 * column for it, so it rides in production_packs.manifest under `pipeline`.
 * The manifest.json file in storage stays exactly the PackManifest. */
export interface PackPipelineInfo {
  /** packs of other blanks never replace each other */
  blankCode: string;
  /** the job input that built this pack: re-runs and re-uploads start from it */
  jobInput: PrintJobInput;
  label: PlateLabelInfo;
  designName: string;
  methodReason: string | null;
  needsManual: boolean;
  needsUnderbase: boolean;
  /** engine and pipeline warnings for this pack */
  warnings: Warning[];
  /** target colours per press position, for Pantone matching */
  inkLabs: Record<string, Lab>;
  /** the Pantone codes written into the PSD layer names, per press position */
  bakedPantones: Record<string, string | null>;
  canvas: CanvasSpec | null;
  printSizeMm: { width: number; height: number };
  /** DTG/DTF: what the artist reads for each garment colour */
  dtgFacts: Record<string, string[]>;
  /** a newer pack replaced this one; views and the queue skip it */
  supersededBy: string | null;
  /** pre-press sent the design back to the artist */
  sendBack: { note: string; by: string; at: string } | null;
  /** set on a pack made from a corrected PSD: what that upload changed (a repeat of it finds this and builds nothing) */
  correction?: { fromPackId: string; filename: string; changes: string[]; needsReapproval: boolean } | null;
  /** DTG/DTF packs: every garment colour's PNG in one zip (kind 'dtg_zip'), for the pre-press download. It sits in
   * storage beside the pack, not among the files the checks re-open, so a build writes it and the idempotency check
   * verifies it. */
  pngZip?: { key: string; name: string; sha256: string; bytes: number } | null;
}

export type StoredManifest = PackManifest & { pipeline?: PackPipelineInfo };

export function storedManifest(row: PackRow): StoredManifest | null {
  return (row.manifest as StoredManifest | null) ?? null;
}

export function packInfo(row: PackRow): PackPipelineInfo | null {
  return storedManifest(row)?.pipeline ?? null;
}

export function packFiles(row: PackRow): PackFile[] {
  return Array.isArray(row.files) ? (row.files as PackFile[]) : [];
}

export function packChecks(row: PackRow): CheckResult[] {
  return Array.isArray(row.checks) ? (row.checks as CheckResult[]) : [];
}

export function packPlacement(row: PackRow): PrintPlacement {
  return row.placement as PrintPlacement;
}

export function isSuperseded(row: PackRow): boolean {
  return Boolean(packInfo(row)?.supersededBy);
}

/** The garment colours a set of packs prints. */
export function colourSet(rows: readonly { garmentCodes: unknown }[]): Set<string> {
  return new Set(rows.flatMap((r) => (Array.isArray(r.garmentCodes) ? (r.garmentCodes as string[]) : [])));
}

/** True when every colour the pack prints is in `codes`. */
export function printsOnlyFrom(codes: Set<string>, row: { garmentCodes: unknown }): boolean {
  return (Array.isArray(row.garmentCodes) ? (row.garmentCodes as string[]) : []).every((c) => codes.has(c));
}

type PackRowChange = Partial<typeof schema.productionPacks.$inferInsert>;

/** A json column equal to what was read, for a guarded update. */
function sameJson(column: typeof schema.productionPacks.manifest | typeof schema.productionPacks.neededFor, value: unknown) {
  return value === null || value === undefined ? sql`${column} is null` : sql`${column} = ${JSON.stringify(value)}::jsonb`;
}

/** Writes a change worked out from the pack row as it is now, only if nobody wrote its manifest, needs or
 * audit state in between (another job, an order being paid, pre-press). The Neon HTTP driver has no
 * transactions, so this is how two writers stay out of each other's way: read, work out, write if
 * unchanged, else read again. False when the row is gone, `change` declines, or it kept changing. */
export async function updatePackRow(id: string, change: (row: PackRow) => PackRowChange | null | Promise<PackRowChange | null>): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [row] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, id)).limit(1);
    if (!row) return false;
    const set = await change(row);
    if (!set) return false;
    const written = await db
      .update(schema.productionPacks)
      .set({ ...set, updatedAt: new Date() })
      .where(
        and(
          eq(schema.productionPacks.id, id),
          eq(schema.productionPacks.auditStatus, row.auditStatus),
          sameJson(schema.productionPacks.manifest, row.manifest),
          sameJson(schema.productionPacks.neededFor, row.neededFor),
        ),
      )
      .returning({ id: schema.productionPacks.id });
    if (written.length > 0) return true;
  }
  console.error(`[print] pack ${id} kept changing; a change to it was not written.`);
  return false;
}

/** Every pack row of a version, built or not. */
export async function loadPacksForVersion(designVersionId: string): Promise<PackRow[]> {
  return db
    .select()
    .from(schema.productionPacks)
    .where(eq(schema.productionPacks.designVersionId, designVersionId))
    .orderBy(asc(schema.productionPacks.createdAt), asc(schema.productionPacks.id));
}

/** The packs people work with: built, and not replaced by a newer one. */
export async function loadCurrentPacks(designVersionId: string): Promise<PackRow[]> {
  return (await loadPacksForVersion(designVersionId)).filter((p) => p.buildStatus === 'ready' && !isSuperseded(p));
}

const HASHED_KINDS = new Set<PackFileKind>(['screen_psd', 'dtg_psd', 'dtg_png', 'proof']);

/** What approval pins for a pack: the job input and the hash of every file that
 * prints or is proofed. The manifest is out: it is written again when Pantone codes are entered. */
export function packHash(row: PackRow): string {
  const files = packFiles(row)
    .filter((f) => HASHED_KINDS.has(f.kind))
    .map((f) => [f.kind, f.garmentCode ?? null, f.plateIndex ?? null, f.sha256] as const)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return sha256Hex(JSON.stringify({ inputHash: row.inputHash, technique: row.technique, setKey: row.screenSetKey ?? null, garments: row.garmentCodes, files }));
}

// ---------------------------------------------------------------------------
// Approvals and the artist

export type ApprovalRow = typeof schema.designApprovals.$inferSelect;

/** The packs an artist approval pinned (the keys of design_approvals.pack_hashes). */
function pinnedPackIds(approval: ApprovalRow): Set<string> {
  const hashes = approval.packHashes;
  return new Set(hashes && typeof hashes === 'object' && !Array.isArray(hashes) ? Object.keys(hashes as Record<string, unknown>) : []);
}

/** Whether a valid artist approval covers a pack, for one garment colour or (left out) every colour the pack
 * prints: the colour was approved, and the pack is one the approval pinned or a replacement of one (a re-run,
 * a corrected PSD, a rebuild of the same drop). Every replacement compares its proof with the one it replaces
 * and withdraws the approval itself when the proof changed (applyReapprovalRule), so a replacement under an
 * approval that still stands printed what the artist saw. The id chain is used rather than file hashes:
 * entering Pantone codes rewrites the PSD without changing what prints. */
export function approvalCovers(approval: ApprovalRow, pack: PackRow, versionPacks: readonly PackRow[], colour?: string): boolean {
  if (approval.invalidatedAt || approval.designVersionId !== pack.designVersionId) return false;
  const approved = new Set(Array.isArray(approval.garmentCodes) ? (approval.garmentCodes as string[]) : []);
  const colours = colour ? [colour] : (pack.garmentCodes as string[]);
  if (!colours.every((c) => approved.has(c))) return false;
  const pinned = pinnedPackIds(approval);
  const byId = new Map(versionPacks.map((p) => [p.id, p]));
  let current: PackRow | undefined = pack;
  for (let hops = 0; current && hops < 100; hops++) {
    if (pinned.has(current.id)) return true;
    current = current.correctedFromPackId ? byId.get(current.correctedFromPackId) : undefined;
  }
  return false;
}

/** Every approval row of a version, newest first (withdrawn ones included). */
export async function approvalsOfVersion(designVersionId: string): Promise<ApprovalRow[]> {
  return db
    .select()
    .from(schema.designApprovals)
    .where(eq(schema.designApprovals.designVersionId, designVersionId))
    .orderBy(desc(schema.designApprovals.approvedAt));
}

/** Withdraws the approvals of a version. Returns how many were valid. */
export async function invalidateApprovals(designId: string, designVersionId: string, reason: string): Promise<number> {
  const rows = await db
    .update(schema.designApprovals)
    .set({ invalidatedAt: new Date(), invalidatedReason: reason })
    .where(
      and(
        eq(schema.designApprovals.designId, designId),
        eq(schema.designApprovals.designVersionId, designVersionId),
        isNull(schema.designApprovals.invalidatedAt),
      ),
    )
    .returning({ id: schema.designApprovals.id });
  return rows.length;
}

/** A note for the artist who owns a design: the inbox row, plus the email and
 * Discord DM their preferences allow (lib/services/notifications.ts). The inbox
 * shows payload.message and runs payload.prompt when it is tapped. Never throws. */
export async function notifyArtist(
  designId: string,
  event: Extract<NotificationEvent, 'print.sent_back' | 'print.reapproval'>,
  message: string,
  prompt: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const [row] = await db
      .select({ artistId: schema.artistStores.artistId })
      .from(schema.designs)
      .innerJoin(schema.artistStores, eq(schema.designs.storeId, schema.artistStores.id))
      .where(eq(schema.designs.id, designId))
      .limit(1);
    if (!row) return;
    const designName = typeof payload.designName === 'string' ? payload.designName : await designDisplayName(designId);
    await notify({ userId: row.artistId, event, text: message, prompt, payload: { ...payload, designId, designName } });
  } catch (err) {
    console.error(`[print] could not notify the artist (${event}):`, errorMessage(err));
  }
}

const REAPPROVAL_MESSAGE = 'Our pre-press team made a change that alters your print proof. Please look it over and approve it again.';

/** Plan section 8: when pre-press changes what the proof shows beyond the
 * threshold, the approval is withdrawn and the artist approves again. A change
 * that leaves the proof alone (specks, traps, choke) never reaches here.
 * Safe to repeat: an approval already withdrawn is not withdrawn (or announced)
 * twice. Returns true when an approval was withdrawn. */
export async function applyReapprovalRule(args: { designId: string; designVersionId: string; proofChanged: boolean; reason: string; message?: string }): Promise<boolean> {
  if (!args.proofChanged) return false;
  const withdrawn = await invalidateApprovals(args.designId, args.designVersionId, args.reason);
  if (withdrawn === 0) return false;
  await notifyArtist(args.designId, 'print.reapproval', args.message ?? REAPPROVAL_MESSAGE, `Show me the print proof for design ${args.designId}`, { reason: args.reason });
  return true;
}

// ---------------------------------------------------------------------------
// The job

interface BuildContext {
  deps: PrintDeps;
  input: PrintJobInput;
  jobId: string | null;
  inputHash: string;
  /** ISO time the pack is made at: the job's own time, so building a job again gives the same manifest */
  createdAt: string;
  /** the version the packs are built on (the 4K final, when the art had one rendered) */
  version: VersionRow;
  /** the number a person reads for it: a final shares its draft's (see displayVersionNumbers) */
  versionNumber: number;
  design: DesignRow;
  designName: string;
  /** 'UNDERWRITER-TEE': the design as file names carry it */
  designSlug: string;
  /** 'MF-UNDERWRITER-TEE': the design code printed on the films */
  fileCode: string;
  artBytes: Buffer;
  original: OriginalArt;
  garments: GarmentColour[];
  garmentNames: Record<string, string>;
  inks: InkSystemProfile;
  /** the code the house library holds for a colour, if a close one is there */
  suggestPantone: (lab: Lab) => string | null;
  /** decoded lazily: a corrected upload never needs the raster */
  art: () => Promise<Raster>;
}

interface PackMeta {
  method: ScreenMethod | 'dtg';
  methodReason: string | null;
  needsManual: boolean;
  warnings: Warning[];
}

interface BuiltPack {
  packId: string;
  technique: PrintTechnique;
  placement: PrintPlacement;
  setKey: string | null;
  /** the proof check did not pass against the approved proof */
  proofChanged: boolean;
  warnings: Warning[];
}

async function loadBuildContext(args: { designVersionId: string; input: PrintJobInput; jobId: string | null; inputHash: string; createdAt: string }, deps: PrintDeps): Promise<BuildContext> {
  const [version] = await db.select().from(schema.designVersions).where(eq(schema.designVersions.id, args.designVersionId)).limit(1);
  if (!version) throw new Error('The design version is gone.');
  const [design] = await db.select().from(schema.designs).where(eq(schema.designs.id, version.designId)).limit(1);
  if (!design) throw new Error('The design is gone.');

  const artBytes = await deps.loadArt({ artKey: version.artKey, artUrl: version.artUrl });
  // A version is immutable: if the file behind it changed, nothing built from it can be trusted.
  if (sha256Hex(artBytes) !== version.sha256) throw new Error('The artwork no longer matches the version it was saved as.');

  const designName = await designDisplayName(design.id);
  const designSlug = slug(designName, 20) || shortDesignCode(design.id).slice(3);
  const versionNumber = (await displayVersionNumbers([version])).get(version.id) ?? version.version;
  const { mime, ext } = sniffImage(artBytes);

  const garments = await loadGarments(args.input.blankCode, args.input.garmentCodes);
  const missing = args.input.garmentCodes.filter((code) => !garments.some((g) => g.code === code));
  if (missing.length > 0) throw new Error(`Garment colours not available on ${args.input.blankCode}: ${missing.join(', ')}.`);

  const { getActiveInkSystem, getInkSystemById } = await import('@/lib/services/ink-system');
  const pinned = args.input.inkSystemId ? await getInkSystemById(args.input.inkSystemId) : null;
  const inks = pinned ?? (await getActiveInkSystem()).profile;

  const { loadAssignedLibrary, suggestFromLibrary } = await import('@/lib/services/pantone-library');
  const library = await loadAssignedLibrary();

  let decoded: Raster | null = null;
  return {
    deps,
    // The input as it was built: on the version the worker settled on, which a job
    // queued on the draft finds only once it has pinned the 4K final.
    input: { ...args.input, designVersionId: version.id },
    jobId: args.jobId,
    inputHash: args.inputHash,
    createdAt: args.createdAt,
    version,
    versionNumber,
    design,
    designName,
    designSlug,
    fileCode: `MF-${designSlug}`,
    artBytes,
    original: { bytes: artBytes, filename: `MF-${designSlug}-v${versionNumber}-original.${ext}`, mime, widthPx: version.widthPx, heightPx: version.heightPx },
    garments,
    garmentNames: Object.fromEntries(garments.map((g) => [g.code, g.name])),
    inks,
    suggestPantone: (lab) => suggestFromLibrary(library, lab)?.code ?? null,
    art: async () => (decoded ??= await deps.engine.decodeArt(artBytes)),
  };
}

function plateLabel(ctx: BuildContext, placement: PrintPlacement): PlateLabelInfo {
  return { designCode: ctx.fileCode, version: ctx.versionNumber, placementLabel: placementShortLabel(placement) };
}

/** What pack file names are built from (lib/print/pack/names.ts). */
function stemOf(ctx: BuildContext, placement: PrintPlacement): FileStemInput {
  return { designCode: ctx.designSlug, version: ctx.versionNumber, position: positionLabel(placement.position) };
}

function printSizeMm(ctx: BuildContext, placement: PrintPlacement): { width: number; height: number } {
  const aspect = ctx.version.widthPx > 0 ? ctx.version.heightPx / ctx.version.widthPx : 1;
  return { width: placement.widthMm, height: Math.round(placement.widthMm * aspect * 10) / 10 };
}

/** The print box a proof is drawn in: the packshot's calibrated box for the position, resized so
 * its width is the placement's width (the box is calibrated at `widthCm`, the engine scales the
 * art to the box's width) and moved by the placement's vertical offset, so the proof shows the print
 * where it will print. The print stays centred.
 *
 * The offset (offsetYMm: from the standard position, positive = lower) is converted and held on the
 * photo by the rules the mockup uses (printOffsetPx and keepOnPhoto, lib/mockups/placements.ts), so a
 * print a product moved sits at the same height in both. The usable area ends where it did, and above
 * a hoodie's pocket: moving the print down leaves it less room, so a print that now runs into the hem
 * or the pocket comes back flagged (overflow) instead of being drawn into room it doesn't have. A
 * proof never shrinks a print to fit, as the mockup shrinks one to clear the pocket. */
export function printBoxFor(
  shot: { printBox: FractionRect; widthCm: number; size?: { widthPx: number; heightPx: number } | null; pocketLine?: number },
  placement: PrintPlacement,
): FractionRect {
  const calibratedMm = shot.widthCm * 10;
  if (!(calibratedMm > 0) || !(placement.widthMm > 0)) return shot.printBox;
  const scale = placement.widthMm / calibratedMm;
  const { x, y, w, h } = shot.printBox;
  const width = Math.min(1, w * scale);
  const height = Math.min(1, h * scale);

  // A cm of offset is a fraction of the photo's height at the box's own scale; the photo's size is the standard one when it isn't known.
  const photo = shot.size ?? STANDARD_PACKSHOT;
  const area: PrintArea = { x, y, w, h, widthCm: shot.widthCm, image: 'front' };
  const offsetCm = placement.offsetYMm === undefined ? undefined : placement.offsetYMm / 10;
  const kept = keepOnPhoto({ left: x + (w - width) / 2, top: y + printOffsetPx(area, photo.widthPx, offsetCm) / photo.heightPx }, { width, height }, { width: 1, height: 1 });

  let room = height - (kept.top - y);
  if (shot.pocketLine !== undefined) room = Math.min(room, shot.pocketLine - kept.top);
  return { x: kept.left, y: kept.top, w: width, h: Math.min(1 - kept.top, Math.max(room, 1 / photo.heightPx)) };
}

/** Every file of a pack as it is written: the record plus the bytes (for the checks). */
class FileSink {
  readonly files: PackFile[] = [];
  readonly blobs: { file: PackFile; bytes: Buffer }[] = [];

  constructor(
    private readonly ctx: BuildContext,
    private readonly keyParts: string[],
  ) {}

  async add(
    kind: PackFileKind,
    name: string,
    data: Buffer,
    contentType: string,
    visibility: 'public' | 'private',
    extra: Partial<Pick<PackFile, 'widthPx' | 'heightPx' | 'ppi' | 'garmentCode' | 'plateIndex'>> = {},
  ): Promise<PackFile> {
    const { storage } = this.ctx.deps;
    const key = storage.printKey(this.ctx.design.id, this.ctx.version.version, ...this.keyParts, name);
    const stored = await storage.putObject({ key, data, contentType, visibility });
    const file: PackFile = { kind, name, key: stored.key, visibility, contentType, sha256: stored.sha256, bytes: stored.bytes, ...extra };
    this.files.push(file);
    this.blobs.push({ file, bytes: data });
    return file;
  }

  /** Stores a file that belongs to the pack but is not one of its files (not hashed into the manifest, not checked). */
  async addBeside(name: string, data: Buffer, contentType: string, visibility: 'public' | 'private'): Promise<{ key: string; name: string; sha256: string; bytes: number }> {
    const { storage } = this.ctx.deps;
    const stored = await storage.putObject({ key: storage.printKey(this.ctx.design.id, this.ctx.version.version, ...this.keyParts, name), data, contentType, visibility });
    return { key: stored.key, name, sha256: stored.sha256, bytes: stored.bytes };
  }
}

// ---------------------------------------------------------------------------
// The PNG download

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip of the given files, stored without compression (a PNG is compressed already), in name order and with
 * fixed dates, so the same files always make the same bytes. No ZIP64: it refuses what would not fit. */
export function zipStore(entries: { name: string; data: Uint8Array }[]): Buffer {
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const total = sorted.reduce((sum, e) => sum + e.data.length + 2 * Buffer.byteLength(e.name) + 76, 22);
  if (sorted.length > 0xfffe || total > 0xfffffffe) throw new Error('Too much to put in one zip.');

  const DOS_TIME = 0; // 00:00:00
  const DOS_DATE = (1 << 5) | 1; // 1980-01-01
  const parts: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const entry of sorted) {
    const name = Buffer.from(entry.name, 'utf8');
    const size = entry.data.length;
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // names are UTF-8
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    parts.push(local, name, Buffer.from(entry.data.buffer, entry.data.byteOffset, size));

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4); // version made by
    header.writeUInt16LE(20, 6); // version needed
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(DOS_TIME, 12);
    header.writeUInt16LE(DOS_DATE, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(size, 20);
    header.writeUInt32LE(size, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(offset, 42);
    directory.push(header, name);
    offset += 30 + name.length + size;
  }

  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, central, end]);
}

interface PackageArgs {
  placement: PrintPlacement;
  label: PlateLabelInfo;
  meta: PackMeta;
  /** the pack this one replaces, when it is a correction */
  correctedFromPackId?: string | null;
  /** the proof the artist approved, for the proof check */
  approvedProof?: Buffer;
  /** redraw every film's label strip (a corrected file: the numbers and codes may have moved) */
  relabelAll?: boolean;
}

/** A pack is what made it: the job's input (its hash), on one version, for one set and placement. The
 * same inputs are the same pack, so a job that runs again (a lost worker, a recovery, a second job
 * for the same drop) fills the row it made before instead of adding another. */
async function beginPackRow(
  ctx: BuildContext,
  args: { placement: PrintPlacement; technique: PrintTechnique; setKey: string | null; garmentCodes: string[]; correctedFromPackId?: string | null },
): Promise<string> {
  const same = (await loadPacksForVersion(ctx.version.id)).find(
    (r) => r.inputHash === ctx.inputHash && r.technique === args.technique && (r.screenSetKey ?? null) === args.setKey && samePlacement(packPlacement(r), args.placement),
  );
  if (same) {
    await db.update(schema.productionPacks).set({ buildStatus: 'building', jobId: ctx.jobId, updatedAt: new Date() }).where(eq(schema.productionPacks.id, same.id));
    return same.id;
  }
  const [row] = await db
    .insert(schema.productionPacks)
    .values({
      designVersionId: ctx.version.id,
      placement: args.placement,
      technique: args.technique,
      screenSetKey: args.setKey,
      garmentCodes: args.garmentCodes,
      inputHash: ctx.inputHash,
      buildStatus: 'building',
      auditStatus: 'idle',
      neededFor: [],
      correctedFromPackId: args.correctedFromPackId ?? null,
      jobId: ctx.jobId,
    })
    .returning({ id: schema.productionPacks.id });
  return row.id;
}

/** Redraws a film's label strip in the engine's standard form, with the Pantone code once it has one. */
async function relabel(ctx: BuildContext, set: ScreenSet, plate: InkPlate, label: PlateLabelInfo): Promise<void> {
  await ctx.deps.engine.relabelPlate(set, plate.index, label, ctx.inks, ctx.input.recipe.marks.targetOffsetMm, plate.role === 'ink' ? (plate.pantone ?? undefined) : undefined, ctx.garmentNames);
}

/** A colour the engine did not name (a film new in a corrected file has no real target colour). */
const UNKNOWN_INK_HEX = '#808080';

/** Names the inks the way the shop and the client read them, and writes a
 * library code on the film's label strip where one was found. */
async function nameInks(ctx: BuildContext, set: ScreenSet, label: PlateLabelInfo, relabelAll: boolean): Promise<void> {
  for (const plate of set.plates) {
    if (!plate.clientName) {
      plate.clientName =
        plate.role === 'underbase' ? 'White underbase' : plate.role === 'highlight' ? 'Highlight white' : plate.target.hex === UNKNOWN_INK_HEX ? `Ink ${plate.index}` : clientColourName(plate.target.hex);
    }
    let named = false;
    if (plate.role === 'ink' && !plate.pantone && plate.target.hex !== UNKNOWN_INK_HEX) {
      const hit = ctx.suggestPantone(plate.target.lab);
      if (hit) {
        plate.pantone = hit;
        named = true;
      }
    }
    if (named || relabelAll) await relabel(ctx, set, plate, label);
  }
}

function inkLabsOf(plates: InkPlate[]): Record<string, Lab> {
  return Object.fromEntries(plates.map((p) => [String(p.index), p.target.lab]));
}

function bakedPantonesOf(plates: InkPlate[]): Record<string, string | null> {
  return Object.fromEntries(plates.map((p) => [String(p.index), p.role === 'ink' ? (p.pantone ?? null) : null]));
}

function uniqueWarnings(warnings: Warning[]): Warning[] {
  const seen = new Set<string>();
  return warnings.filter((w) => {
    const key = `${w.code}|${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A print taller than the garment's print box runs toward the hem or a seam: the proofs show it at true
 * size, and this says so in words, for the artist and for pre-press. Under 2% of the height is the box's own
 * margin, not worth a word. */
function tallPrintWarning(ctx: BuildContext, placement: PrintPlacement, overflows: (number | undefined)[]): Warning[] {
  const worst = Math.max(0, ...overflows.map((o) => o ?? 0));
  if (worst < 0.02) return [];
  const size = printSizeMm(ctx, placement);
  const past = Math.max(1, Math.round(size.height * worst));
  return [
    {
      code: 'print_too_tall',
      severity: 'review',
      message: `At ${formatCm(placement.widthMm)} cm wide the print is ${formatCm(size.height)} cm tall, and its bottom ${formatCm(past)} cm runs past the ${positionLabel(placement.position).toLowerCase()} print area of this garment, toward the hem. Make it narrower if that isn't wanted.`,
    },
  ];
}

/** The two checks the pipeline adds to WP2's: a method that needs a human eye, and garments with no photo. */
function pipelineChecks(meta: PackMeta, missingPhotos: string[]): CheckResult[] {
  const extra: CheckResult[] = [];
  if (meta.needsManual) {
    extra.push({
      id: 'method',
      title: 'Method',
      state: 'review',
      detail: `${meta.methodReason ?? 'This art needs a different method.'} The engine made a spot draft: check every film by hand.`,
    });
  }
  if (missingPhotos.length > 0) {
    extra.push({
      id: 'garment_photos',
      title: 'Garment photos',
      state: 'review',
      detail: `No garment photo for ${missingPhotos.join(', ')}, so no proof was made on ${missingPhotos.length === 1 ? 'it' : 'them'}.`,
    });
  }
  return extra;
}

/** What the manifest is built from, besides the files. */
interface ManifestParts {
  placement: PrintPlacement;
  technique: PrintTechnique;
  setKey: string | null;
  garmentCodes: string[];
  garments: GarmentColour[];
  method: ScreenMethod | 'dtg';
  label: PlateLabelInfo;
  set?: ScreenSet;
  dtgLayers?: DtgLayer[];
}

/** The pack module's manifest input, with the hashes of every input it records (Plan 6.3). */
function manifestInput(ctx: BuildContext, parts: ManifestParts, files: PackFile[]): BuildManifestInput {
  return {
    designId: ctx.design.id,
    designVersionId: ctx.version.id,
    versionNumber: ctx.versionNumber,
    placement: parts.placement,
    technique: parts.technique,
    screenSetKey: parts.setKey,
    garmentCodes: parts.garmentCodes,
    method: parts.method,
    plates: parts.set?.plates,
    // a copy: the manifest must not grow when a file is added to the list afterwards
    files: [...files],
    inputHash: ctx.inputHash,
    createdAt: ctx.createdAt,
    label: parts.label,
    artSha256: ctx.version.sha256,
    recipe: ctx.input.recipe,
    garments: parts.garments,
    inkSystem: ctx.inks,
    inkSystemVersion: ctx.input.inkSystemId ?? undefined,
    set: parts.set,
    dtgLayers: parts.dtgLayers,
  };
}

/** Writes manifest.json, then stores the row (it stays 'building' until the whole job is done). There
 * is no job sheet among a pack's files: the job sheet is one per design (lib/services/job-sheets.ts),
 * made when it is opened from what the packs, products and orders say then. */
async function finishPack(
  ctx: BuildContext,
  sink: FileSink,
  rowId: string,
  args: {
    parts: ManifestParts;
    checks: CheckResult[];
    info: Omit<PackPipelineInfo, 'jobInput' | 'blankCode' | 'designName' | 'supersededBy' | 'sendBack'>;
  },
): Promise<void> {
  const { pack } = ctx.deps;
  const { parts } = args;
  const manifest = await pack.buildManifest(manifestInput(ctx, parts, sink.files));
  await sink.add('manifest', 'manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json', 'private');

  const stored: StoredManifest = {
    ...manifest,
    pipeline: {
      ...args.info,
      blankCode: ctx.input.blankCode,
      jobInput: ctx.input,
      designName: ctx.designName,
      supersededBy: null,
      sendBack: null,
    },
  };

  await db
    .update(schema.productionPacks)
    .set({
      method: parts.method,
      screenCount: parts.technique === 'screen' ? (parts.set?.plates.length ?? null) : null,
      garmentCodes: parts.garmentCodes,
      files: sink.files,
      manifest: stored,
      checks: args.checks,
      inputHash: ctx.inputHash,
      updatedAt: new Date(),
    })
    .where(eq(schema.productionPacks.id, rowId));
}

/** A job's packs become visible together, once every one of them is built. */
async function publishPacks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.update(schema.productionPacks).set({ buildStatus: 'ready', updatedAt: new Date() }).where(inArray(schema.productionPacks.id, ids));
}

async function markPackFailed(rowId: string): Promise<void> {
  await db.update(schema.productionPacks).set({ buildStatus: 'failed', updatedAt: new Date() }).where(eq(schema.productionPacks.id, rowId)).catch(() => undefined);
}

function proofChangedBy(checks: CheckResult[]): boolean {
  const proof = checks.find((c) => c.id === 'proof');
  return proof ? proof.state !== 'passed' : false;
}

// ---------------------------------------------------------------------------
// Sleeves: no photo, a flat proof (owner decision, 16 Oct 2026)

/** The long side of a sleeve print drawn flat, in px: plenty for a proof drawn at about 100 ppi. */
const FLAT_PRINT_LONG_SIDE_PX = 1200;
/** A pixel this close to the garment colour, channel by channel, is bare garment (the proofs are lossy). */
const BARE_GARMENT_TOLERANCE = 6;

function rgbOf(hex: string): [number, number, number] {
  const full = normaliseHex(hex) ?? '#808080';
  const n = Number.parseInt(full.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A sleeve print as it prints, drawn flat: the proof renderer the photo proofs use, on a plain ground in the garment
 * colour sized to the print, cut to the print, with the bare garment made clear so the print keeps its transparency.
 * Never wider than the print is in pixels, so the renderer always averages the print down. A proof that can't be read
 * back (a stand-in in a test) is handed on as it is. */
async function flatSleevePrint(area: { width: number; height: number }, garment: GarmentColour, render: (packshot: PackshotInput) => Promise<ProofImage>): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const proofWidth = ENGINE_TUNING.proofWidthPx;
  const aw = Math.max(1, Math.round(area.width));
  const ah = Math.max(1, Math.round(area.height));
  const w = Math.max(1, Math.min(aw, proofWidth, Math.round((FLAT_PRINT_LONG_SIDE_PX * aw) / Math.max(aw, ah))));
  const h = Math.max(1, Math.round((w * ah) / aw));
  const [r, g, b] = rgbOf(garment.hex);
  const ground = await sharp({ create: { width: proofWidth, height: h, channels: 4, background: { r, g, b, alpha: 1 } } }).png().toBuffer();
  const proof = await render({ image: ground, printBox: { x: 0, y: 0, w: w / proofWidth, h: 1 } });
  try {
    const { data, info } = await sharp(proof.image).extract({ left: 0, top: 0, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - r) <= BARE_GARMENT_TOLERANCE && Math.abs(data[i + 1] - g) <= BARE_GARMENT_TOLERANCE && Math.abs(data[i + 2] - b) <= BARE_GARMENT_TOLERANCE) data[i + 3] = 0;
    }
    return await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  } catch {
    return proof.image;
  }
}

/** Why a sleeve proof wasn't drawn on a garment colour. */
interface SleeveProofFailure {
  garment: string;
  /** the renderer's code (SleeveProofError: 'no_font', 'too_large'...), when it gave one */
  code: string | null;
  message: string;
}

/** The flat, true-size proof of a sleeve print on one garment colour (lib/mockups/sleeve-proof.ts), drawn here in the
 * worker beside the other proofs and stored like them; or why it couldn't be: the approval page then shows the print's
 * size on a "sleeve proof coming" card, and the pack's checks say why (sleeveProofCheck). A missing font is logged too:
 * the worker's image is meant to have one. Never throws. */
async function sleeveProofOf(
  ctx: BuildContext,
  garment: GarmentColour,
  placement: PrintPlacement,
  areaPx: { width: number; height: number },
  render: (packshot: PackshotInput) => Promise<ProofImage>,
): Promise<{ image: Buffer } | { failure: SleeveProofFailure }> {
  try {
    const size = printSizeMm(ctx, placement);
    const print = await flatSleevePrint(areaPx, garment, render);
    const image = await ctx.deps.sleeveProof({
      print,
      printWidthCm: size.width / 10,
      printHeightCm: size.height / 10,
      garmentHex: garment.hex,
      side: placement.position === 'sleeve_right' ? 'right' : 'left',
      sleeve: sleeveKindFor(ctx.input.blankCode) ?? 'short',
    });
    return { image };
  } catch (err) {
    const code = typeof (err as { code?: unknown })?.code === 'string' ? ((err as { code: string }).code as string) : null;
    const message = errorMessage(err);
    if (code === 'no_font') console.error(`[print] the sleeve proof on ${garment.name} could not be drawn, there is no font for its labels: ${message}`);
    return { failure: { garment: garment.name, code, message } };
  }
}

/** The check that says a sleeve proof is missing, and why, so pre-press sees it (a missing font most of all). The
 * print files themselves are not affected: it asks for a look, and blocks nothing. */
function sleeveProofCheck(failures: SleeveProofFailure[]): CheckResult[] {
  if (failures.length === 0) return [];
  const font = failures.find((f) => f.code === 'no_font');
  const first = font ?? failures[0];
  const names = [...new Set(failures.map((f) => f.garment))].join(', ');
  return [
    {
      id: 'sleeve_proof',
      title: 'Sleeve proof',
      state: 'review',
      detail: font
        ? `No sleeve proof on ${names}: the worker has no font to label it (${first.message}). Install fontconfig and DejaVu in the worker image, then run the pack again. The artist sees the print's size instead of the proof.`
        : `No sleeve proof on ${names}: ${first.message}${/[.!?]$/.test(first.message.trim()) ? '' : '.'} The artist sees the print's size instead of the proof.`,
    },
  ];
}

/** Whether a pack's proof check says the print changed. A sleeve pack with no proof drawn, replacing one that had none
 * either, shows nothing that could have changed: its files are checked by pre-press like any other. */
function proofChangedFor(checks: CheckResult[], placement: PrintPlacement, proofsDrawn: number, approvedProof: Buffer | undefined): boolean {
  if (isSleevePosition(placement.position) && proofsDrawn === 0 && approvedProof === undefined) return false;
  return proofChangedBy(checks);
}

/** Writes one screen set: PSD, film previews, proofs, loupe, checks, manifest, row. */
async function packageScreenSet(ctx: BuildContext, set: ScreenSet, args: PackageArgs): Promise<BuiltPack> {
  await nameInks(ctx, set, args.label, args.relabelAll ?? false);
  const rowId = await beginPackRow(ctx, { placement: args.placement, technique: 'screen', setKey: set.key, garmentCodes: set.garmentCodes, correctedFromPackId: args.correctedFromPackId });
  try {
    return await buildScreenSet(ctx, set, args, rowId);
  } catch (err) {
    await markPackFailed(rowId);
    throw err;
  }
}

async function buildScreenSet(ctx: BuildContext, set: ScreenSet, args: PackageArgs, rowId: string): Promise<BuiltPack> {
  const { deps, input } = ctx;
  const { placement, label } = args;
  // The separation's sets can have different methods: the pack gives its own set's reason.
  const meta: PackMeta = { ...args.meta, methodReason: set.methodReason ?? args.meta.methodReason };
  const garments = ctx.garments.filter((g) => set.garmentCodes.includes(g.code));
  const stem = stemOf(ctx, placement);
  const sink = new FileSink(ctx, ['pack', `${placementKey(placement).replace(/:/g, '-')}`, `screen-${set.key}`, ctx.inputHash.slice(0, 10)]);

  const proofed: string[] = [];
  const missingPhotos: string[] = [];
  const overflows: (number | undefined)[] = [];
  const sleeve = isSleevePosition(placement.position);
  const sleeveFailures: SleeveProofFailure[] = [];

  // A set where nothing prints (black art on a black shirt) has no films: no PSD, no previews, no
  // proofs. The checks still run on it, and the one they return carries the engine's warning, which
  // pre-press has to see; the warning also keeps the artist from approving.
  if (await deps.pack.screenSetPrints(set)) {
    const psd = await deps.pack.writeScreenPsd({ set, garments, original: ctx.original, label, inks: ctx.inks });
    await sink.add('screen_psd', screenPsdFileName(stem, set.key), psd, 'image/vnd.adobe.photoshop', 'private', {
      widthPx: set.canvas.widthPx,
      heightPx: set.canvas.heightPx,
      ppi: set.canvas.ppi,
    });

    // Private: a film carries its Pantone code (label strip and PNG title), and artists never see one.
    for (const plate of set.plates) {
      const preview = await deps.pack.renderFilmPreview(plate, label);
      await sink.add('film_preview', `film-${set.key}-${plate.index}.png`, preview, 'image/png', 'private', { plateIndex: plate.index });
    }

    for (const garment of garments) {
      // A sleeve has no photo: its proof is drawn flat on a sleeve outline, or (not drawn) left to the approval page's card.
      if (sleeve) {
        const flat = await sleeveProofOf(ctx, garment, placement, set.canvas.art, (packshot) => deps.engine.renderScreenProof(set, { garment, packshot, placement }, ctx.inks));
        if ('failure' in flat) {
          sleeveFailures.push(flat.failure);
          continue;
        }
        await sink.add('proof', `proof-screen-${set.key}-${garment.code}.png`, flat.image, 'image/png', 'public', { garmentCode: garment.code });
        proofed.push(garment.code);
        continue;
      }
      const shot = await deps.loadPackshot(input.blankCode, garment.code, placement.position);
      if (!shot) {
        missingPhotos.push(garment.name);
        continue;
      }
      const proof = await deps.engine.renderScreenProof(set, { garment, packshot: { image: shot.image, printBox: printBoxFor(shot, placement) }, placement }, ctx.inks);
      overflows.push(proof.overflow);
      await sink.add('proof', `proof-screen-${set.key}-${garment.code}.webp`, proof.image, 'image/webp', 'public', {
        garmentCode: garment.code,
        widthPx: proof.width,
        heightPx: proof.height,
      });
      proofed.push(garment.code);
    }
    // The loupe needs no photo, so a sleeve gets one even before its flat proof can be drawn.
    const loupeCode = proofed[0] ?? (sleeve ? garments[0]?.code : undefined);
    if (loupeCode) {
      // The garment is passed because a set rebuilt from an uploaded PSD was never separated here.
      const loupeGarment = garments.find((g) => g.code === loupeCode);
      const loupe = await deps.engine.renderScreenLoupe(set, loupeCode, ctx.inks, undefined, loupeGarment);
      await sink.add('loupe', `loupe-screen-${set.key}-${loupeCode}.png`, loupe.image, 'image/png', 'public', { garmentCode: loupeCode, ppi: loupe.ppi });
    }
  }

  const parts: ManifestParts = { placement, technique: 'screen', setKey: set.key, garmentCodes: set.garmentCodes, garments, method: set.method, label, set };
  const draft = await deps.pack.buildManifest(manifestInput(ctx, parts, sink.files));
  const checks = [
    ...(await deps.pack.runChecks({
      technique: 'screen',
      manifest: draft,
      files: sink.blobs,
      recipe: input.recipe,
      inks: ctx.inks,
      garments,
      expected: { set },
      approvedProof: args.approvedProof,
    })),
    ...pipelineChecks(meta, missingPhotos),
    ...sleeveProofCheck(sleeveFailures),
  ];

  const warnings = uniqueWarnings([...meta.warnings, ...set.warnings, ...tallPrintWarning(ctx, placement, overflows)]);
  await finishPack(ctx, sink, rowId, {
    parts,
    checks,
    info: {
      label,
      methodReason: meta.methodReason,
      needsManual: meta.needsManual,
      needsUnderbase: set.needsUnderbase,
      warnings,
      inkLabs: inkLabsOf(set.plates),
      bakedPantones: bakedPantonesOf(set.plates),
      canvas: set.canvas,
      printSizeMm: printSizeMm(ctx, placement),
      dtgFacts: {},
    },
  });

  return { packId: rowId, technique: 'screen', placement, setKey: set.key, proofChanged: proofChangedFor(checks, placement, proofed.length, args.approvedProof), warnings };
}

/** The plain-words list the artist reads for one garment colour. */
export function dtgFactsFor(layer: DtgLayer): string[] {
  const facts = layer.whitesTransparent
    ? ['The background is removed, so only the illustration prints.']
    : ['Areas close to the shirt colour are left out, so the shirt itself shows through.'];
  if (layer.fadeShare > 0.005) facts.push('Fades and glows print as fine dots, so no white halo shows around them.');
  facts.push(layer.whitesTransparent ? 'White areas print no ink on a white shirt.' : 'White areas print in white ink.');
  facts.push('The same file prints DTG on the shirt or DTF on film for transfers.');
  return facts;
}

async function packageDtg(ctx: BuildContext, placement: PrintPlacement, args: { approvedProof?: Buffer; correctedFromPackId?: string | null }): Promise<BuiltPack> {
  const { deps, input } = ctx;
  const dtg = await deps.engine.prepareDtg({ art: await ctx.art(), placement, garments: ctx.garments, recipe: input.recipe });
  const garmentCodes = dtg.layers.map((l) => l.garmentCode);
  const rowId = await beginPackRow(ctx, { placement, technique: 'dtg_dtf', setKey: null, garmentCodes, correctedFromPackId: args.correctedFromPackId });
  try {
    return await buildDtgPack(ctx, placement, args, dtg, rowId);
  } catch (err) {
    await markPackFailed(rowId);
    throw err;
  }
}

async function buildDtgPack(
  ctx: BuildContext,
  placement: PrintPlacement,
  args: { approvedProof?: Buffer },
  dtg: Awaited<ReturnType<EngineApi['prepareDtg']>>,
  rowId: string,
): Promise<BuiltPack> {
  const { deps, input } = ctx;
  const label = plateLabel(ctx, placement);
  const garmentCodes = dtg.layers.map((l) => l.garmentCode);
  const garments = ctx.garments.filter((g) => garmentCodes.includes(g.code));
  const stem = stemOf(ctx, placement);
  const sink = new FileSink(ctx, ['pack', `${placementKey(placement).replace(/:/g, '-')}`, 'dtg-dtf', ctx.inputHash.slice(0, 10)]);

  const psd = await deps.pack.writeDtgPsd({ layers: dtg.layers, garments, original: ctx.original, label });
  await sink.add('dtg_psd', dtgPsdFileName(stem), psd, 'image/vnd.adobe.photoshop', 'private', { ppi: input.recipe.dtg.ppi });

  const missingPhotos: string[] = [];
  const dtgFacts: Record<string, string[]> = {};
  const overflows: (number | undefined)[] = [];
  const sleeve = isSleevePosition(placement.position);
  const sleeveFailures: SleeveProofFailure[] = [];
  let proofsDrawn = 0;
  let loupeDone = false;
  for (const layer of dtg.layers) {
    const garment = garments.find((g) => g.code === layer.garmentCode);
    if (!garment) continue;
    dtgFacts[garment.code] = dtgFactsFor(layer);

    const png = await deps.pack.writeDtgPng(layer);
    await sink.add('dtg_png', dtgPngFileName(stem, garment.name), png, 'image/png', 'private', {
      garmentCode: garment.code,
      widthPx: layer.raster.width,
      heightPx: layer.raster.height,
      ppi: layer.raster.ppi,
    });

    // A sleeve has no photo: its proof is drawn flat on a sleeve outline, or (not drawn yet) left to the approval page's
    // card. Its loupe needs no photo.
    if (sleeve) {
      const flat = await sleeveProofOf(ctx, garment, placement, layer.printAreaPx, (packshot) => deps.engine.renderDtgProof(layer, { garment, packshot, placement }, ctx.inks));
      if ('failure' in flat) sleeveFailures.push(flat.failure);
      else {
        await sink.add('proof', `proof-dtg-${garment.code}.png`, flat.image, 'image/png', 'public', { garmentCode: garment.code });
        proofsDrawn += 1;
      }
      if (!loupeDone) {
        const loupe = await deps.engine.renderDtgLoupe(layer, garment.hex, undefined, garment.isLight);
        await sink.add('loupe', `loupe-dtg-${garment.code}.png`, loupe.image, 'image/png', 'public', { garmentCode: garment.code, ppi: loupe.ppi });
        loupeDone = true;
      }
      continue;
    }

    const shot = await deps.loadPackshot(input.blankCode, garment.code, placement.position);
    if (!shot) {
      missingPhotos.push(garment.name);
      continue;
    }
    const proof = await deps.engine.renderDtgProof(layer, { garment, packshot: { image: shot.image, printBox: printBoxFor(shot, placement) }, placement }, ctx.inks);
    overflows.push(proof.overflow);
    await sink.add('proof', `proof-dtg-${garment.code}.webp`, proof.image, 'image/webp', 'public', { garmentCode: garment.code, widthPx: proof.width, heightPx: proof.height });
    proofsDrawn += 1;
    if (!loupeDone) {
      const loupe = await deps.engine.renderDtgLoupe(layer, garment.hex, undefined, garment.isLight);
      await sink.add('loupe', `loupe-dtg-${garment.code}.png`, loupe.image, 'image/png', 'public', { garmentCode: garment.code, ppi: loupe.ppi });
      loupeDone = true;
    }
  }

  // One download for the pressroom: every garment colour's PNG in a zip. A convenience, so a build never fails on it.
  let pngZip: PackPipelineInfo['pngZip'] = null;
  const pngs = sink.blobs.filter((b) => b.file.kind === 'dtg_png');
  if (pngs.length > 0) {
    try {
      const zip = zipStore(pngs.map((b) => ({ name: b.file.name, data: b.bytes })));
      pngZip = await sink.addBeside(`${dtgPsdFileName(stem).replace(/\.psd$/i, '')}-PNGs.zip`, zip, 'application/zip', 'private');
    } catch (err) {
      console.error('[pipeline] could not make the PNG zip:', err instanceof Error ? err.message : err);
    }
  }

  const parts: ManifestParts = { placement, technique: 'dtg_dtf', setKey: null, garmentCodes, garments, method: 'dtg', label, dtgLayers: dtg.layers };
  const draft = await deps.pack.buildManifest(manifestInput(ctx, parts, sink.files));
  const dtgWarnings = uniqueWarnings([...dtg.warnings, ...tallPrintWarning(ctx, placement, overflows)]);
  const meta: PackMeta = { method: 'dtg', methodReason: null, needsManual: false, warnings: dtgWarnings };
  const checks = [
    ...(await deps.pack.runChecks({
      technique: 'dtg_dtf',
      manifest: draft,
      files: sink.blobs,
      recipe: input.recipe,
      inks: ctx.inks,
      garments,
      expected: { dtgLayers: dtg.layers },
      approvedProof: args.approvedProof,
    })),
    ...pipelineChecks(meta, missingPhotos),
    ...sleeveProofCheck(sleeveFailures),
  ];

  await finishPack(ctx, sink, rowId, {
    parts,
    checks,
    info: {
      label,
      methodReason: null,
      needsManual: false,
      needsUnderbase: false,
      warnings: dtgWarnings,
      inkLabs: {},
      bakedPantones: {},
      canvas: null,
      printSizeMm: printSizeMm(ctx, placement),
      dtgFacts,
      pngZip,
    },
  });

  return { packId: rowId, technique: 'dtg_dtf', placement, setKey: null, proofChanged: proofChangedFor(checks, placement, proofsDrawn, args.approvedProof), warnings: dtgWarnings };
}

async function approvedProofFrom(deps: PrintDeps, old: PackRow | undefined, garmentCodes: string[]): Promise<Buffer | undefined> {
  if (!old) return undefined;
  const files = packFiles(old).filter((f) => f.kind === 'proof');
  const proof = garmentCodes.map((code) => files.find((f) => f.garmentCode === code)).find(Boolean) ?? files[0];
  if (!proof) return undefined;
  try {
    return await deps.storage.getObject(proof.key);
  } catch {
    return undefined;
  }
}

async function jobCreatedAt(jobIds: string[]): Promise<Map<string, Date>> {
  const ids = [...new Set(jobIds)];
  if (ids.length === 0) return new Map();
  const rows = await db.select({ id: schema.printJobs.id, createdAt: schema.printJobs.createdAt }).from(schema.printJobs).where(inArray(schema.printJobs.id, ids));
  return new Map(rows.map((r) => [r.id, r.createdAt]));
}

function mergeNeeds(a: unknown, b: unknown): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const need of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const key = JSON.stringify([(need as { orderId?: string })?.orderId ?? null, (need as { bulkOrderId?: string })?.bulkOrderId ?? null, (need as { kind?: string })?.kind ?? null]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(need);
  }
  return out;
}

/** Marks a pack replaced by another. Its needs go: the orders find their pack again (attachWaitingOrders). */
async function markSuperseded(rowId: string, byId: string): Promise<void> {
  await updatePackRow(rowId, (row) => {
    const manifest = storedManifest(row);
    if (!manifest?.pipeline || manifest.pipeline.supersededBy === byId) return null;
    return { manifest: { ...manifest, pipeline: { ...manifest.pipeline, supersededBy: byId } }, neededFor: [], auditStatus: 'idle' };
  });
}

/** A new pack takes over the orders that needed the one it replaces, and goes
 * back to the auditor: a rebuilt pack is a new thing to check. Only for a new
 * pack that prints every colour the old one did, so every order it takes over
 * finds its colour in it. */
async function takeOver(oldRow: PackRow, newRow: PackRow, mode: 'prepare' | 'rerun' | 'reupload'): Promise<void> {
  await updatePackRow(newRow.id, async (row) => {
    // The old pack's needs as they are now: an order paid a moment ago is taken over too.
    const [oldNow] = await db.select({ neededFor: schema.productionPacks.neededFor }).from(schema.productionPacks).where(eq(schema.productionPacks.id, oldRow.id)).limit(1);
    const needs = mergeNeeds(row.neededFor, oldNow?.neededFor ?? oldRow.neededFor);
    const audit: PackRow['auditStatus'] = needs.length === 0 ? 'idle' : mode === 'prepare' ? 'waiting' : 'being_fixed';
    return { neededFor: needs, auditStatus: audit, correctedFromPackId: row.correctedFromPackId ?? oldRow.id };
  });
  await markSuperseded(oldRow.id, newRow.id);
}

/** After a job: packs of the same version, placement, technique and blank that
 * an older job made are replaced by this job's, where this job's packs print
 * every colour the older ones did. A pack that still prints a colour the new
 * ones don't stays current beside them, so no order loses its files (a job for
 * one new colour never retires the others). A job that finishes after a newer
 * one is itself the older one: its packs are born replaced, as far as the newer
 * packs print their colours. */
async function settleSupersession(job: { versionId: string; createdAt: Date }, built: BuiltPack[], blankCode: string, mode: 'prepare' | 'rerun'): Promise<void> {
  if (built.length === 0) return;
  const all = await loadPacksForVersion(job.versionId);
  const mine = new Set(built.map((b) => b.packId));
  const times = await jobCreatedAt(all.map((p) => p.jobId).filter((id): id is string => Boolean(id)));
  const whenMade = (p: PackRow): Date => (p.jobId ? times.get(p.jobId) : undefined) ?? p.createdAt;
  const sameSet = (a: PackRow, b: PackRow) => (a.screenSetKey ?? null) === (b.screenSetKey ?? null);

  const groups = new Map<string, BuiltPack[]>();
  for (const b of built) {
    const key = `${placementKey(b.placement)}|${b.technique}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  for (const members of groups.values()) {
    const sample = members[0];
    const olds = all.filter(
      (p) =>
        !mine.has(p.id) &&
        p.buildStatus === 'ready' &&
        !isSuperseded(p) &&
        p.technique === sample.technique &&
        samePlacement(packPlacement(p), sample.placement) &&
        packInfo(p)?.blankCode === blankCode,
    );
    if (olds.length === 0) continue;

    const fresh = await db
      .select()
      .from(schema.productionPacks)
      .where(inArray(schema.productionPacks.id, members.map((m) => m.packId)));

    const newer = olds.filter((p) => whenMade(p).getTime() > job.createdAt.getTime());
    const newerColours = colourSet(newer);
    const live: PackRow[] = [];
    for (const row of fresh) {
      if (newer.length > 0 && printsOnlyFrom(newerColours, row)) {
        const winner = newer.find((p) => sameSet(p, row) && printsOnlyFrom(colourSet([p]), row)) ?? newer[newer.length - 1];
        await markSuperseded(row.id, winner.id);
      } else {
        live.push(row);
      }
    }
    if (live.length === 0) continue;

    const older = olds.filter((p) => !newer.includes(p));
    const used = new Set<string>();
    for (const row of live) {
      const twin = older.find((o) => !used.has(o.id) && sameSet(o, row) && printsOnlyFrom(colourSet([row]), o));
      if (!twin) continue;
      used.add(twin.id);
      await takeOver(twin, row, mode);
    }
    // An older set with no counterpart (the groups changed) goes when the new sets print all its colours.
    const liveColours = colourSet(live);
    for (const old of older) {
      if (used.has(old.id) || !printsOnlyFrom(liveColours, old)) continue;
      const shared = (row: PackRow) => (row.garmentCodes as string[]).filter((c) => (old.garmentCodes as string[]).includes(c)).length;
      const heir = [...live].sort((a, b) => shared(b) - shared(a))[0];
      await markSuperseded(old.id, heir.id);
    }
  }
}

/** The design's still-open orders can now find the packs they were waiting on. */
async function attachWaitingOrders(designId: string): Promise<void> {
  try {
    const rows = await db
      .selectDistinct({ orderId: schema.orders.id })
      .from(schema.orders)
      .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
      .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .where(and(productUsesDesign(designId), eq(schema.orders.status, 'paid'), eq(schema.orders.productionStatus, 'queued')));
    if (rows.length === 0) return;
    // Attach only: a build that still misses a colour must not start another build here.
    const { attachBuiltPacksToOrder } = await import('@/lib/services/prepress');
    for (const row of rows) await attachBuiltPacksToOrder(row.orderId);
  } catch (err) {
    console.error('[print] could not attach waiting orders:', errorMessage(err));
  }
}

async function markBuildingPacksFailed(jobId: string): Promise<void> {
  await db
    .update(schema.productionPacks)
    .set({ buildStatus: 'failed', updatedAt: new Date() })
    .where(and(eq(schema.productionPacks.jobId, jobId), eq(schema.productionPacks.buildStatus, 'building')));
}

/** What a storage object is, without reading it: there, the size and the hash the pack row says. */
async function outputsIntact(row: PackRow, deps: PrintDeps): Promise<boolean> {
  const files = packFiles(row);
  if (files.length === 0) return false;
  for (const file of files) {
    const info = await deps.storage.statObject(file.key).catch(() => null);
    // A hash storage doesn't know is not a match: the pack is built again rather than trusted.
    if (!info || info.bytes !== file.bytes || info.sha256 !== file.sha256) return false;
  }
  // The PNG zip is part of what a DTG/DTF build leaves behind.
  const zip = packInfo(row)?.pngZip;
  if (zip) {
    const info = await deps.storage.statObject(zip.key).catch(() => null);
    if (!info || info.bytes !== zip.bytes || info.sha256 !== zip.sha256) return false;
  }
  return true;
}

/** The packs a job made on an earlier run, when every one of them is still in storage as it was
 * written. The same input makes the same bytes, so a job that comes back (a lost or recovered
 * worker) has nothing to build again: it finds these and goes on to the steps after the build. */
async function intactOutputs(versionId: string, input: PrintJobInput, inputHash: string, deps: PrintDeps): Promise<PackRow[] | null> {
  const rows = (await loadPacksForVersion(versionId)).filter((p) => p.inputHash === inputHash && p.buildStatus === 'ready' && packInfo(p)?.blankCode === input.blankCode);
  const covers = input.placements.every((pl) => input.techniques.every((t) => rows.some((p) => p.technique === t && samePlacement(packPlacement(p), pl))));
  if (!covers) return null;
  for (const row of rows) if (!(await outputsIntact(row, deps))) return null;
  return rows;
}

/** Packs that a later job replaced and that this job's inputs make again are current again;
 * settleSupersession then puts them in order against whatever is current now. */
async function reactivate(rows: PackRow[]): Promise<void> {
  for (const row of rows) {
    await updatePackRow(row.id, (now) => {
      const manifest = storedManifest(now);
      if (!manifest?.pipeline?.supersededBy) return null;
      return { manifest: { ...manifest, pipeline: { ...manifest.pipeline, supersededBy: null } } };
    });
  }
}

function builtFromRow(row: PackRow): BuiltPack {
  return {
    packId: row.id,
    technique: row.technique as PrintTechnique,
    placement: packPlacement(row),
    setKey: row.screenSetKey ?? null,
    proofChanged: proofChangedBy(packChecks(row)),
    warnings: packInfo(row)?.warnings ?? [],
  };
}

async function defaultFinalise(storeId: string, designId: string): Promise<ServiceResult<FinalArt>> {
  return (await import('@/lib/services/print-prep')).finaliseDesignArt(storeId, designId);
}

/** The version a prepare job builds on. The job was queued on the art as it was stored; the 4K
 * final (a render that takes a minute, so never in a request) is made here, in the worker, and
 * pinned as a version of its own. Art that needs no render (an upload) is the version it was. */
async function resolveJobVersion(job: PrintJobRow, deps: PrintDeps): Promise<string> {
  const [draft] = await db.select().from(schema.designVersions).where(eq(schema.designVersions.id, job.designVersionId)).limit(1);
  if (!draft) throw new Error('The design version is gone.');
  // Only a prepare job finalises: a re-run or a re-upload works on the version its pack was built on.
  if (job.kind !== 'prepare' || draft.source === 'final_4k') return draft.id;

  const [design] = await db.select().from(schema.designs).where(eq(schema.designs.id, draft.designId)).limit(1);
  if (!design) throw new Error('The design is gone.');

  // A job that comes back finds the final it already pinned instead of asking for another.
  const versions = await db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, design.id));
  const pinned = versions.find((v) => v.parentVersionId === draft.id && v.source === 'final_4k');
  if (pinned) return pinned.id;

  const art = await (deps.finaliseArt ?? defaultFinalise)(design.storeId, design.id, { render: true });
  // A render that fails is tried again (the worker backs off) and the artist is told if it never works.
  if (!art.ok) throw new Error(art.error);
  const { pinDesignVersion } = await import('@/lib/services/print-prep');
  const version = await pinDesignVersion(design, deps, art.value, { userId: job.createdBy });
  if (!version.ok) throw new Error(version.error);
  return version.value.id;
}

/** The engine and the pack writers, for every placement and technique the job asks for. */
async function buildPacks(ctx: BuildContext, before: PackRow[]): Promise<BuiltPack[]> {
  const { deps, input } = ctx;
  const built: BuiltPack[] = [];
  for (const placement of input.placements) {
    if (input.techniques.includes('screen')) {
      const art = await ctx.art();
      const label = plateLabel(ctx, placement);
      const result = await deps.engine.separateScreen({ art, placement, garments: ctx.garments, recipe: input.recipe, inks: ctx.inks, label });
      const meta: PackMeta = { method: result.method, methodReason: result.methodReason, needsManual: result.needsManual, warnings: result.warnings };
      for (const set of result.sets) {
        const old = before.find((p) => p.technique === 'screen' && (p.screenSetKey ?? null) === set.key && samePlacement(packPlacement(p), placement) && p.buildStatus === 'ready' && !isSuperseded(p));
        built.push(await packageScreenSet(ctx, set, { placement, label, meta, approvedProof: await approvedProofFrom(deps, old, set.garmentCodes) }));
      }
    }
    if (input.techniques.includes('dtg_dtf')) {
      const old = before.find((p) => p.technique === 'dtg_dtf' && samePlacement(packPlacement(p), placement) && p.buildStatus === 'ready' && !isSuperseded(p));
      built.push(await packageDtg(ctx, placement, { approvedProof: await approvedProofFrom(deps, old, input.garmentCodes) }));
    }
  }
  return built;
}

async function handlePrepareJob(job: PrintJobRow, input: PrintJobInput, deps: PrintDeps): Promise<PrintJobResult> {
  const versionId = await resolveJobVersion(job, deps);
  const [version] = await db.select().from(schema.designVersions).where(eq(schema.designVersions.id, versionId)).limit(1);
  if (!version) throw new Error('The design version is gone.');
  const rerun = job.kind === 'rerun' ? input.rerun : undefined;
  // Every job compares its proofs with the packs it replaces, re-runs and rebuilds alike (Plan section 8).
  const before = await loadPacksForVersion(version.id);

  // Idempotent per input hash: what an earlier run of these inputs left in storage is not built again.
  let built: BuiltPack[];
  const reused = await intactOutputs(version.id, input, job.inputHash, deps);
  if (reused) {
    await reactivate(reused);
    built = reused.map(builtFromRow);
  } else {
    const ctx = await loadBuildContext({ designVersionId: version.id, input, jobId: job.id, inputHash: job.inputHash, createdAt: job.createdAt.toISOString() }, deps);
    built = await buildPacks(ctx, before);
    await publishPacks(built.map((b) => b.packId));
  }
  await settleSupersession({ versionId: version.id, createdAt: job.createdAt }, built, input.blankCode, rerun ? 'rerun' : 'prepare');

  // The packs that replaced one the artist may have approved: their rows now name it.
  const rows = built.length > 0 ? await db.select().from(schema.productionPacks).where(inArray(schema.productionPacks.id, built.map((b) => b.packId))) : [];
  const replacing = rows.filter((row) => row.correctedFromPackId && !isSuperseded(row) && before.some((p) => p.id === row.correctedFromPackId));

  // Ask the artist again only if a proof they may have approved moved. This repeats harmlessly: an
  // approval already withdrawn is not withdrawn (or announced) twice.
  await applyReapprovalRule({
    designId: version.designId,
    designVersionId: version.id,
    proofChanged: built.some((b) => b.proofChanged && replacing.some((row) => row.id === b.packId)),
    reason: rerun ? 'Pre-press ran the pack again with changes that alter the proof.' : 'The print files were made again and the proof changed.',
    message: rerun ? undefined : 'Your print files were made again and the proof changed. Please look it over and approve it again.',
  });

  await attachWaitingOrders(version.designId);
  await askArtistForWaitingOrders(version);
  return { packIds: built.map((b) => b.packId), warnings: uniqueWarnings(built.flatMap((b) => b.warnings)) };
}

/** A shop order waits on files the artist's approval doesn't cover yet (a colour or print position added
 * after they approved): they are asked to look, once for those packs. Only while an approval of the version
 * stands: a withdrawn one was announced when it was withdrawn, and a version never approved this way goes on
 * pre-press's approval alone. A run on a new colour goes on the run's own proof. Never throws. */
async function askArtistForWaitingOrders(version: VersionRow): Promise<void> {
  try {
    const valid = (await approvalsOfVersion(version.id)).find((a) => !a.invalidatedAt);
    if (!valid) return;
    const packs = await loadPacksForVersion(version.id);
    const uncovered = packs.filter(
      (p) =>
        p.buildStatus === 'ready' &&
        !isSuperseded(p) &&
        (Array.isArray(p.neededFor) ? (p.neededFor as PackNeed[]) : []).some((need) => need.kind === 'shop_order') &&
        !approvalCovers(valid, p, packs),
    );
    if (uncovered.length === 0) return;
    const askKey = uncovered.map((p) => p.id).sort().join(',');
    const [artist] = await db
      .select({ artistId: schema.artistStores.artistId })
      .from(schema.designs)
      .innerJoin(schema.artistStores, eq(schema.designs.storeId, schema.artistStores.id))
      .where(eq(schema.designs.id, version.designId))
      .limit(1);
    if (!artist) return;
    const [asked] = await db
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, artist.artistId), eq(schema.notifications.event, 'print.reapproval'), sql`${schema.notifications.payload} ->> 'askKey' = ${askKey}`))
      .limit(1);
    if (asked) return;
    await notifyArtist(
      version.designId,
      'print.reapproval',
      'An order is waiting on a colour or print position you have not approved yet. Please look over the print proof and approve it.',
      `Show me the print proof for design ${version.designId}`,
      { askKey },
    );
  } catch (err) {
    console.error('[print] could not ask the artist to approve:', errorMessage(err));
  }
}

// ---------------------------------------------------------------------------
// Re-uploads: a corrected PSD from pre-press, and the refresh that puts
// freshly entered Pantone codes into the layer names and the film strips.

function coverageOf(plate: Plate, canvas: CanvasSpec | null): number {
  const rect = canvas?.art;
  const height = plate.height;
  const x0 = rect ? Math.max(0, rect.x) : 0;
  const y0 = rect ? Math.max(0, rect.y) : 0;
  const x1 = rect ? Math.min(plate.width, rect.x + rect.width) : plate.width;
  const y1 = rect ? Math.min(height, rect.y + rect.height) : height;
  let ink = 0;
  for (let y = y0; y < y1; y++) {
    const row = y * plate.width;
    for (let x = x0; x < x1; x++) if (plate.data[row + x] > 127) ink++;
  }
  const area = Math.max(1, (x1 - x0) * (y1 - y0));
  return ink / area;
}

function labOf(hex: string): Lab {
  try {
    return hexToLab(hex);
  } catch {
    return { L: 50, a: 0, b: 0 };
  }
}

/** The set a stored pack was built as: the films read back from its own PSD, with the
 * pack's ink facts by press position. `pantones` says which codes the films carry:
 * 'baked' is what the PSD's layer names say, 'current' what pre-press has entered since. */
function setFromParsed(row: PackRow, parsed: ParsedScreenPsd, pantones: 'baked' | 'current'): ScreenSet {
  const manifest = storedManifest(row)!;
  const info = manifest.pipeline!;
  const ordered = [...parsed.plates].sort((a, b) => a.index - b.index);
  const canvas: CanvasSpec = info.canvas ?? { widthPx: parsed.widthPx, heightPx: parsed.heightPx, ppi: parsed.ppi, marginMm: info.jobInput.recipe.marks.marginMm, art: { x: 0, y: 0, width: parsed.widthPx, height: parsed.heightPx } };
  const halftone = info.jobInput.recipe.halftone;

  const plates: InkPlate[] = ordered.map((p, i) => {
    const was = manifest.inks.find((ink) => ink.index === i + 1);
    const role = was?.role ?? 'ink';
    const hex = was?.hex ?? UNKNOWN_INK_HEX;
    const code = pantones === 'baked' ? (info.bakedPantones?.[String(i + 1)] ?? null) : (was?.pantone ?? null);
    return {
      index: i + 1,
      role,
      target: { hex, lab: info.inkLabs?.[String(i + 1)] ?? labOf(hex) },
      base: was?.base ?? 'HB Opaque',
      pantone: role === 'ink' ? code : null,
      clientName: was?.clientName || undefined,
      plate: p.plate,
      coverage: was?.coverage ?? coverageOf(p.plate, info.canvas),
      halftone: { ...halftone, lpi: was?.lpi ?? halftone.lpi, angleDeg: was?.angleDeg ?? halftone.angleDeg },
      meshSuggestion: was?.mesh ?? 230,
    };
  });

  return {
    key: row.screenSetKey ?? 'set',
    garmentCodes: row.garmentCodes as string[],
    needsUnderbase: info.needsUnderbase,
    method: (manifest.method === 'dtg' ? 'spot' : manifest.method) as ScreenMethod,
    canvas,
    plates,
    warnings: [],
  };
}

function share(v: number): string {
  return `${(Math.round(v * 1000) / 10).toFixed(1)}%`;
}

/** What a corrected file changed against the automatic pack, as sentences for the auditor. */
function describeDiff(diff: ScreenPsdDiff, parsed: ParsedScreenPsd, original: ScreenSet): string[] {
  const nameOf = (index: number) => original.plates.find((p) => p.index === index)?.clientName || `film ${index}`;
  const out: string[] = [];
  for (const c of diff.changed) {
    out.push(`Film ${c.index} (${nameOf(c.originalIndex)}) changed: ${share(c.changedShare)} of the print area is different, and its coverage went from ${share(c.coverageBefore)} to ${share(c.coverageAfter)}.`);
  }
  for (const a of diff.added) out.push(`Film ${a.index} (${a.name}) is new.`);
  for (const r of diff.removed) out.push(`Film ${r.index} (${r.name}) was removed.`);
  if (diff.reordered) out.push('The press order changed.');
  if (diff.effectsOn) out.push('The colour overlays were switched on in the file. They were switched off again.');
  if (diff.otherLayers.length > 0) out.push(`Left out of the pack: ${diff.otherLayers.join(', ')}.`);
  for (const w of parsed.warnings) if (w.severity !== 'info') out.push(w.message);
  return out.length > 0 ? out : ['No film changed.'];
}

/** A file the reader refused says what to do about it; anything else gets a lead-in. */
function readError(err: unknown): string {
  if (err instanceof Error && err.name === 'PsdReadError') return err.message;
  return `That file could not be read as a screen PSD: ${errorMessage(err)}`;
}

export interface CorrectedUploadResult {
  newPackId: string;
  checks: CheckResult[];
  needsReapproval: boolean;
  changes: string[];
}

/** Context for a pack that already exists: its version, art and the job input that built it. */
async function contextForPack(row: PackRow, inputHash: string, jobId: string | null, createdAt: string, deps: PrintDeps): Promise<BuildContext> {
  const info = packInfo(row);
  if (!info) throw new Error('This pack was built before the pipeline kept its settings. Run it again first.');
  return loadBuildContext({ designVersionId: row.designVersionId, input: info.jobInput, jobId, inputHash, createdAt }, deps);
}

/** Parses a corrected screen PSD, rebuilds the exports from it, re-runs the
 * checks and applies the re-approval rule.
 * The same file for the same pack is the same correction: a repeat (a recovered job, a second
 * click) finds what the first made and gives its outcome back instead of building again. */
export async function runCorrectedUpload(
  args: { packId: string; bytes: Buffer; filename: string; actorId: string | null; jobId?: string | null },
  deps: PrintDeps = printDeps(),
): Promise<ServiceResult<CorrectedUploadResult>> {
  const [old] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, args.packId)).limit(1);
  if (!old) return { ok: false, error: 'Pack not found.' };
  if (old.technique !== 'screen') return { ok: false, error: 'A corrected PSD is for screen packs. For DTG/DTF files, run the pack again.' };
  const manifest = storedManifest(old);
  const info = manifest?.pipeline;
  const psd = packFiles(old).find((f) => f.kind === 'screen_psd');
  if (old.buildStatus === 'ready' && manifest && info && !psd && manifest.inks.length === 0) {
    return { ok: false, error: 'Nothing prints on this set, so there is no PSD to correct. Run the pack again with other settings, or send it back to the artist.' };
  }
  if (old.buildStatus !== 'ready' || !manifest || !info || !psd) return { ok: false, error: 'This pack is not ready to be replaced yet.' };

  const inputHash = sha256Hex(`${old.inputHash}:corrected:${sha256Hex(args.bytes)}`);
  // A repeat of this upload (a recovered job, a second click) finds the pack the first one built and
  // finishes whatever that run left undone after the build; it never builds twice.
  const earlier = (await loadPacksForVersion(old.designVersionId)).find(
    (p) => p.inputHash === inputHash && p.technique === 'screen' && p.correctedFromPackId === old.id && packInfo(p)?.correction,
  );
  if (earlier && (await outputsIntact(earlier, deps))) return finishCorrection(old.id, earlier.id);
  if (isSuperseded(old)) return { ok: false, error: 'A newer pack replaced this one while the file was waiting. Upload the corrected file to the newer one.' };

  let parsed: ParsedScreenPsd;
  try {
    parsed = await deps.pack.readScreenPsd(args.bytes);
  } catch (err) {
    return { ok: false, error: readError(err) };
  }
  if (psd.widthPx && psd.heightPx && (parsed.widthPx !== psd.widthPx || parsed.heightPx !== psd.heightPx)) {
    return { ok: false, error: `The PSD is ${parsed.widthPx} × ${parsed.heightPx} px; the pack is ${psd.widthPx} × ${psd.heightPx} px. Keep the canvas size when you edit.` };
  }
  if (parsed.plates.length === 0) return { ok: false, error: 'The PSD has no film layers.' };
  if (parsed.plates.length > 15) return { ok: false, error: `The PSD has ${parsed.plates.length} films. The most a run can use is 15.` };

  const ctx = await contextForPack(old, inputHash, args.jobId ?? null, new Date().toISOString(), deps);
  const placement = packPlacement(old);

  // The films are matched by ink and compared by pixel against the pack as it was
  // sent out, so a reordered or renamed film is not mistaken for a change of ink.
  const original = setFromParsed(old, await deps.pack.readScreenPsd(await deps.storage.getObject(psd.key)), 'baked');
  const set = await deps.pack.rebuildScreenSet(original, parsed);
  const diff = await deps.pack.diffScreenPsd(original, parsed);
  const changes = describeDiff(diff, parsed, original);

  // A film pre-press did not touch carries the code entered since the file went out;
  // one whose code they typed in keeps the typed one.
  const bakedByHex = new Map<string, string | null>();
  const currentByHex = new Map<string, string | null>();
  for (const ink of manifest.inks) {
    if (ink.role !== 'ink') continue;
    bakedByHex.set(ink.hex, info.bakedPantones?.[String(ink.index)] ?? null);
    currentByHex.set(ink.hex, ink.pantone ?? null);
  }
  for (const plate of set.plates) {
    if (plate.role !== 'ink' || !currentByHex.has(plate.target.hex)) continue;
    if ((plate.pantone ?? null) === (bakedByHex.get(plate.target.hex) ?? null)) plate.pantone = currentByHex.get(plate.target.hex) ?? null;
  }
  // What the reader noted is for pre-press (it is in `changes`); the artist's warnings stay the engine's.
  set.warnings = original.warnings;

  const built = await packageScreenSet(ctx, set, {
    placement,
    label: info.label,
    meta: { method: set.method, methodReason: info.methodReason, needsManual: info.needsManual, warnings: info.warnings },
    correctedFromPackId: old.id,
    approvedProof: await approvedProofFrom(deps, old, set.garmentCodes),
    relabelAll: true,
  });

  // What the upload changed is kept on the new pack before anything else, so a run that stops after the
  // build finishes from here (finishCorrection) instead of building again.
  await updatePackRow(built.packId, (row) => {
    const manifest = storedManifest(row);
    if (!manifest?.pipeline) return null;
    const correction = { fromPackId: old.id, filename: args.filename, changes, needsReapproval: built.proofChanged };
    return { manifest: { ...manifest, pipeline: { ...manifest.pipeline, correction } } };
  });
  return finishCorrection(old.id, built.packId);
}

/** The steps after a correction's build, each safe to repeat: the re-approval rule first (nothing after it
 * may skip it), then the new pack goes live, takes over the old one's orders, and the design's waiting
 * orders are attached. */
async function finishCorrection(oldId: string, madeId: string): Promise<ServiceResult<CorrectedUploadResult>> {
  const [made] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, madeId)).limit(1);
  const correction = made ? packInfo(made)?.correction : null;
  if (!made || !correction) return { ok: false, error: 'The corrected pack went missing. Upload the file again.' };
  const [version] = await db.select().from(schema.designVersions).where(eq(schema.designVersions.id, made.designVersionId)).limit(1);
  if (!version) return { ok: false, error: 'The design version is gone.' };

  await applyReapprovalRule({
    designId: version.designId,
    designVersionId: version.id,
    proofChanged: correction.needsReapproval,
    reason: 'Pre-press corrected the films in a way that alters the proof.',
  });
  await publishPacks([made.id]);

  const [old] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, oldId)).limit(1);
  if (old && !isSuperseded(old)) {
    const [fresh] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, made.id)).limit(1);
    await takeOver(old, fresh, 'reupload');
  }
  await attachWaitingOrders(version.designId);

  const [done] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, made.id)).limit(1);
  return { ok: true, value: { newPackId: made.id, checks: packChecks(done ?? made), needsReapproval: correction.needsReapproval, changes: correction.changes } };
}

/** Rewrites a screen pack's PSD and film previews so the layer names and the
 * label strips carry the Pantone codes entered since it was built. The art on the films
 * does not change, so the pack stays where it is: same row, same audit state. */
export async function refreshScreenPackFiles(packId: string, deps: PrintDeps = printDeps()): Promise<ServiceResult<null>> {
  // A code typed while the files were being written is baked by another round, up to a few.
  for (let round = 0; round < 3; round++) {
    const done = await refreshScreenPackFilesOnce(packId, deps);
    if (!done.ok) return done;
    const [row] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, packId)).limit(1);
    if (!row || !filesNeedRefresh(row)) break;
  }
  return { ok: true, value: null };
}

async function refreshScreenPackFilesOnce(packId: string, deps: PrintDeps): Promise<ServiceResult<null>> {
  const [row] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, packId)).limit(1);
  const manifest = row ? storedManifest(row) : null;
  const info = manifest?.pipeline;
  if (!row || !manifest || !info) return { ok: false, error: 'Pack not found.' };
  if (row.technique !== 'screen') return { ok: false, error: 'Only screen packs carry Pantone codes.' };
  const files = packFiles(row);
  const psdFile = files.find((f) => f.kind === 'screen_psd');
  if (!psdFile) return { ok: false, error: 'This pack has no PSD to update.' };
  // A job that comes back after it finished (or two for the same codes) finds nothing left to do.
  if (!filesNeedRefresh(row)) return { ok: true, value: null };

  const ctx = await contextForPack(row, row.inputHash, row.jobId, manifest.createdAt, deps);
  const set = setFromParsed(row, await deps.pack.readScreenPsd(await deps.storage.getObject(psdFile.key)), 'current');
  for (const plate of set.plates) await relabel(ctx, set, plate, info.label);

  const garments = ctx.garments.filter((g) => set.garmentCodes.includes(g.code));
  const replace = async (file: PackFile, data: Buffer): Promise<PackFile> => {
    // A film preview now carries a Pantone code, so it is private whatever it was written as.
    const visibility = file.kind === 'film_preview' ? 'private' : file.visibility;
    const put = await deps.storage.putObject({ key: file.key, data, contentType: file.contentType, visibility });
    return { ...file, visibility, sha256: put.sha256, bytes: put.bytes };
  };

  const psdBytes = await deps.pack.writeScreenPsd({ set, garments, original: ctx.original, label: info.label, inks: ctx.inks });
  const blobs: { file: PackFile; bytes: Buffer }[] = [];
  const kept: PackFile[] = [];
  const newPsd = await replace(psdFile, psdBytes);
  blobs.push({ file: newPsd, bytes: psdBytes });
  kept.push(newPsd);
  for (const file of files) {
    if (file.kind === 'screen_psd' || file.kind === 'manifest') continue;
    if (file.kind === 'film_preview') {
      const plate = set.plates.find((p) => p.index === file.plateIndex);
      const bytes = plate ? await deps.pack.renderFilmPreview(plate, info.label) : await deps.storage.getObject(file.key);
      const next = plate ? await replace(file, bytes) : file;
      blobs.push({ file: next, bytes });
      kept.push(next);
      continue;
    }
    const bytes = await deps.storage.getObject(file.key);
    blobs.push({ file, bytes });
    kept.push(file);
  }

  const parts: ManifestParts = { placement: packPlacement(row), technique: 'screen', setKey: row.screenSetKey, garmentCodes: row.garmentCodes as string[], garments, method: set.method, label: info.label, set };
  // The same checks as a re-upload: the file was written again, so it is opened again.
  const draft = await deps.pack.buildManifest(manifestInput(ctx, parts, kept));
  const checks = [
    ...(await deps.pack.runChecks({ technique: 'screen', manifest: draft, files: blobs, recipe: info.jobInput.recipe, inks: ctx.inks, garments, expected: { set } })),
    ...packChecks(row).filter((c) => c.id === 'method' || c.id === 'garment_photos'),
  ];

  // The inks stay as the auditor saw them (coverage included); only the files changed. The design's job
  // sheet needs no rewriting: it reads the codes from the pack when it is next opened.
  const fresh: PackManifest = { ...(await deps.pack.buildManifest(manifestInput(ctx, parts, kept))), inks: manifest.inks };
  const oldManifestFile = files.find((f) => f.kind === 'manifest');
  const manifestKey = oldManifestFile?.key ?? deps.storage.printKey(ctx.design.id, ctx.version.version, 'pack', 'manifest.json');
  const manifestBytes = Buffer.from(JSON.stringify(fresh, null, 2));
  const manifestPut = await deps.storage.putObject({ key: manifestKey, data: manifestBytes, contentType: 'application/json', visibility: 'private' });
  const manifestFile: PackFile = { kind: 'manifest', name: 'manifest.json', key: manifestKey, visibility: 'private', contentType: 'application/json', sha256: manifestPut.sha256, bytes: manifestPut.bytes };

  // Written over the row as it is now: codes typed while this ran stay (the next round bakes them), and so
  // does anything else said about the pack meanwhile (replaced, sent back). Only the files, the checks and
  // the codes these files carry are this run's.
  const baked = bakedPantonesOf(set.plates);
  await updatePackRow(row.id, (latest) => {
    const now = storedManifest(latest);
    if (!now?.pipeline) return null;
    return { files: [...kept, manifestFile], manifest: { ...fresh, inks: now.inks, pipeline: { ...now.pipeline, bakedPantones: baked } }, checks };
  });
  return { ok: true, value: null };
}

/** True when a screen pack's files were written before its current Pantone codes were entered. */
export function filesNeedRefresh(row: PackRow): boolean {
  const manifest = storedManifest(row);
  if (!manifest?.pipeline || row.technique !== 'screen') return false;
  return manifest.inks.some((ink) => ink.role === 'ink' && (ink.pantone ?? null) !== (manifest.pipeline?.bakedPantones?.[String(ink.index)] ?? null));
}

/** Queues the file refresh for the worker. False when nothing needs refreshing or the job was already queued. */
export async function requestScreenFilesRefresh(packId: string, createdBy: string | null, deps: PrintDeps = printDeps()): Promise<boolean> {
  const [row] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, packId)).limit(1);
  if (!row || !filesNeedRefresh(row)) return false;
  const info = packInfo(row)!;
  const psd = packFiles(row).find((f) => f.kind === 'screen_psd');
  if (!psd) return false;
  // Codes entered while a refresh waits or runs join it: it reads the codes when it runs, and goes round
  // again for any typed meanwhile (refreshScreenPackFiles). approvePack asks again if one slipped past.
  const queued = await deps.jobs.enqueuePrintJob({
    kind: 'reupload',
    input: { ...info.jobInput, techniques: ['screen'], reupload: { packId: row.id, key: psd.key } },
    createdBy,
  });
  return !queued.deduped;
}

/** What a re-upload job leaves in print_jobs.result besides the pack ids: the outcome
 * uploadCorrectedPsd hands back, or why the file could not be used. A refusal ends the job
 * normally (a bad file is just as bad on the next try), so the worker does not retry it. */
export type UploadJobOutcome = { ok: true; outcome: CorrectedUploadResult } | { ok: false; error: string };
export interface ReuploadJobResult extends PrintJobResult {
  upload?: UploadJobOutcome;
}

async function handleReuploadJob(job: PrintJobRow, input: PrintJobInput, deps: PrintDeps): Promise<ReuploadJobResult> {
  const target = input.reupload;
  if (!target) throw new Error('A re-upload job needs the pack and the file it works from.');
  const [row] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, target.packId)).limit(1);
  if (!row) throw new Error('The pack for this job is gone.');
  const refuse = (error: string): ReuploadJobResult => ({ packIds: [], warnings: [], upload: { ok: false, error } });

  // The pack's own PSD is the Pantone refresh; any other file is a correction.
  const current = packFiles(row).find((f) => f.kind === 'screen_psd');
  if (current && current.key === target.key) {
    const done = await refreshScreenPackFiles(row.id, deps);
    if (!done.ok) throw new Error(done.error);
    return { packIds: [row.id], warnings: [] };
  }

  let bytes: Buffer;
  try {
    bytes = await deps.storage.getObject(target.key);
  } catch (err) {
    if ((err as { code?: string } | null)?.code === 'not_found') return refuse('The uploaded file is no longer in storage. Upload it again.');
    throw err;
  }
  const result = await runCorrectedUpload({ packId: row.id, bytes, filename: target.key.split('/').pop() ?? 'corrected.psd', actorId: job.createdBy, jobId: job.id }, deps);
  if (!result.ok) return refuse(result.error);
  return { packIds: [result.value.newPackId], warnings: [], upload: { ok: true, outcome: result.value } };
}

// ---------------------------------------------------------------------------
// Entry point

/** The worker's handler. `injected` swaps dependencies for tests. */
export async function handlePrintJob(job: PrintJobRow, injected?: Partial<PrintDeps>): Promise<PrintJobResult> {
  const deps: PrintDeps = { ...printDeps(), ...(injected ?? {}) };
  const input = job.input as PrintJobInput;
  try {
    if (job.kind === 'reupload') return await handleReuploadJob(job, input, deps);
    return await handlePrepareJob(job, input, deps);
  } catch (err) {
    // A retry starts these packs over; until then they must not look half-built.
    await markBuildingPacksFailed(job.id).catch(() => undefined);
    throw err;
  }
}
