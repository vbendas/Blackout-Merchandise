// Print prep for artists (WP7): prepare a design's production files, show the
// approval view, approve a design version, change the screen count of a run.
// The approval view never carries Pantone codes: clients see colour names only.
// PRINT_MOCK=1 returns the sample views in lib/print/mock-views.ts so the
// Studio page can be built and checked before the pipeline exists.
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { getTypePlacement } from '@/lib/mockups/placements';
import { ABSOLUTE_MAX_SCREENS, DEFAULT_RECIPE, EXTRA_SCREEN_CENTS_PER_PIECE, STANDARD_MAX_SCREENS, mergeRecipe } from '@/lib/print/defaults';
import { MOCK_APPROVAL_VIEW } from '@/lib/print/mock-views';
import type { GarmentColour, Hex, PrintJobInput, PrintPlacement, PrintTechnique, RecipeOverride, Warning } from '@/lib/print/types';
import {
  approvalCovers,
  approvalsOfVersion,
  colourSet,
  designDisplayName,
  displayVersionNumbers,
  formatCm,
  invalidateApprovals,
  isSuperseded,
  loadCurrentPacks,
  loadGarments,
  loadPacksForVersion,
  packFiles,
  packHash,
  packInfo,
  packPlacement,
  positionLabel,
  printDeps,
  samePlacement,
  sha256Hex,
  sniffImage,
  storedManifest,
  type FinalArt,
  type PackRow,
  type PrintDeps,
} from '@/lib/print/pipeline';
import { getActiveInkSystem } from '@/lib/services/ink-system';
import { techniqueOfService } from '@/lib/services/quotes';
import { getStyleCapsule } from '@/lib/services/style-capsules';
import { printMockOn } from '@/lib/print/mock-mode';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type ApprovalStatus = 'preparing' | 'ready' | 'approved' | 'failed';

export interface ApprovalGarment {
  code: string;
  name: string;
  hex: Hex;
  isLight: boolean;
  /** which screen set prints this colour */
  screenSetKey: string | null;
}

export interface ApprovalProof {
  garmentCode: string;
  technique: PrintTechnique;
  url: string;
  alt: string;
}

export interface ApprovalLoupe {
  technique: PrintTechnique;
  garmentCode: string;
  url: string;
  caption: string;
}

/** One ink as the client sees it: a plain colour name, never a Pantone code. */
export interface ApprovalScreenInk {
  n: number;
  name: string;
  /** short explanation for the whites, empty for colour inks */
  detail: string;
  hex: Hex;
}

export interface ApprovalScreenSet {
  key: string;
  /** 'Darks', 'Lights' */
  name: string;
  garmentCodes: string[];
  screenCount: number;
  /** e.g. '6 screens, within the standard 8.' */
  headline: string;
  /** e.g. 'Black and French Navy print from the same 6 screens, over a white underbase.' */
  shared: string;
  /** e.g. 'No surcharge. On a run, each screen above 8 adds €1 per piece.' */
  priceNote: string;
  inks: ApprovalScreenInk[];
}

export interface ApprovalView {
  designId: string;
  designName: string;
  versionId: string;
  versionNumber: number;
  /** e.g. 'Front · 28 × 33.6 cm' */
  placementLabel: string;
  status: ApprovalStatus;
  garments: ApprovalGarment[];
  proofs: ApprovalProof[];
  loupes: ApprovalLoupe[];
  /** per garment colour: the DTG/DTF facts list */
  dtgFacts: Record<string, string[]>;
  /** empty until the separations are ready */
  screenSets: ApprovalScreenSet[];
  /** 'Worth a look' items, in plain words */
  warnings: string[];
  approvedAt: string | null;
  canApprove: boolean;
  /** approved, and the artist may still undo it: no order waits on the files
   * and pre-press hasn't checked them (revokeApproval says why not) */
  canRevoke: boolean;
}

export interface PreparePrintInput {
  storeId: string;
  userId: string;
  designId: string;
  blankCode: string;
  garmentCodes: string[];
  placements: PrintPlacement[];
}

function mockOn(): boolean {
  return printMockOn();
}

type DesignRow = typeof schema.designs.$inferSelect;
type VersionRow = typeof schema.designVersions.$inferSelect;
type ApprovalRow = typeof schema.designApprovals.$inferSelect;
type JobRow = typeof schema.printJobs.$inferSelect;

// ---------------------------------------------------------------------------
// Designs and versions

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The design, when it belongs to this shop and (when a user is given) that
 * user owns the shop. Services take the shop and the user from the session, but
 * the check is made here too, so a wrong pair of ids never reaches a write. */
async function loadOwnedDesign(storeId: string, designId: string, userId?: string): Promise<DesignRow | null> {
  if (!UUID.test(designId) || !UUID.test(storeId) || (userId !== undefined && !UUID.test(userId))) return null;
  const [row] = await db
    .select({ design: schema.designs, artistId: schema.artistStores.artistId })
    .from(schema.designs)
    .innerJoin(schema.artistStores, eq(schema.designs.storeId, schema.artistStores.id))
    .where(and(eq(schema.designs.id, designId), eq(schema.designs.storeId, storeId)))
    .limit(1);
  if (!row || (userId !== undefined && row.artistId !== userId)) return null;
  return row.design;
}

export async function latestVersion(designId: string): Promise<VersionRow | null> {
  const [row] = await db
    .select()
    .from(schema.designVersions)
    .where(eq(schema.designVersions.designId, designId))
    .orderBy(desc(schema.designVersions.version))
    .limit(1);
  return row ?? null;
}

const NO_FINALISER = 'The final artwork could not be prepared: the design service has no print-resolution render yet.';

/** WP4's finaliseDesignForPrint (lib/services/designs.ts) behind one tolerant
 * adapter: its ServiceResult of { artUrl, widthPx, heightPx, source, rendered, bytes? }
 * (a bare URL or a flat object is read too). It can run a 4K render, which takes
 * a minute, so only the print worker calls it. Loaded on demand: designs.ts pulls
 * in the model SDKs. */
export async function finaliseDesignArt(storeId: string, designId: string): Promise<ServiceResult<FinalArt>> {
  let raw: unknown;
  try {
    const mod = (await import('@/lib/services/designs')) as Record<string, unknown>;
    const finalise = mod.finaliseDesignForPrint;
    if (typeof finalise !== 'function') return { ok: false, error: NO_FINALISER };
    raw = await (finalise as (storeId: string, designId: string) => Promise<unknown>)(storeId, designId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : NO_FINALISER };
  }
  return toFinalArt(raw);
}

export function toFinalArt(raw: unknown): ServiceResult<FinalArt> {
  if (typeof raw === 'string') return raw ? { ok: true, value: { url: raw } } : { ok: false, error: NO_FINALISER };
  if (!raw || typeof raw !== 'object') return { ok: false, error: NO_FINALISER };
  const o = raw as Record<string, unknown>;
  if (o.ok === false) return { ok: false, error: typeof o.error === 'string' ? o.error : NO_FINALISER };
  if (o.ok === true && o.value !== undefined) return toFinalArt(o.value);

  const url = [o.url, o.printUrl, o.artUrl].find((u): u is string => typeof u === 'string' && u.length > 0);
  if (!url) return { ok: false, error: NO_FINALISER };
  const num = (...values: unknown[]) => values.find((v): v is number => typeof v === 'number' && v > 0);
  const bytes = [o.bytes, o.buffer].find((b): b is Buffer => Buffer.isBuffer(b));
  const source = o.source === 'upload' || o.source === 'generated' || o.source === 'edited' || o.source === 'final_4k' ? o.source : undefined;
  const rendered = typeof o.rendered === 'boolean' ? o.rendered : undefined;
  return { ok: true, value: { url, source, rendered, bytes, widthPx: num(o.widthPx, o.width), heightPx: num(o.heightPx, o.height) } };
}

function sourceOf(design: DesignRow): NonNullable<FinalArt['source']> {
  return design.source === 'generated' ? 'generated' : design.source === 'edited' ? 'edited' : 'upload';
}

/** The design's art as it is stored now: a draft for a generated or edited design, the artist's own file otherwise. */
function storedArt(design: DesignRow): FinalArt | null {
  const url = design.printUrl ?? design.originalUrl;
  if (!url) return null;
  // designs.ts records generationParams.finalRender once it has made the 4K final the design's print file.
  const isFinal = Boolean((design.generationParams as { finalRender?: unknown } | null)?.finalRender);
  return { url, source: isFinal ? 'final_4k' : sourceOf(design), rendered: false };
}

/** Pins art as an immutable design version. Art that is already a version is that
 * version (the 4K final of a draft, when it has one); new pixels make the next number,
 * with the version before as its parent. */
export async function pinDesignVersion(design: DesignRow, deps: PrintDeps, art: FinalArt, opts: { userId: string | null }): Promise<ServiceResult<VersionRow>> {
  let bytes: Buffer;
  try {
    bytes = art.bytes ?? (await deps.loadArt({ artKey: null, artUrl: art.url }));
  } catch (err) {
    return { ok: false, error: `Could not read the artwork: ${err instanceof Error ? err.message : 'download failed'}.` };
  }
  const sha256 = sha256Hex(bytes);

  for (let attempt = 0; attempt < 3; attempt++) {
    const versions = await db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, design.id)).orderBy(desc(schema.designVersions.version));
    const same = versions.find((v) => v.sha256 === sha256);
    if (same) return { ok: true, value: versions.find((v) => v.parentVersionId === same.id && v.source === 'final_4k') ?? same };

    const size = art.widthPx && art.heightPx ? { widthPx: art.widthPx, heightPx: art.heightPx } : await deps.imageSize(bytes);
    if (!size) return { ok: false, error: "Could not read the artwork's size. Try uploading it again as a PNG." };

    const latest = versions[0] ?? null;
    const version = (latest?.version ?? 0) + 1;
    const { mime, ext } = sniffImage(bytes);
    const artKey = deps.storage.printKey(design.id, version, `art.${ext}`);
    // The file is copied into print storage so the version cannot change under the pack.
    await deps.storage.putObject({ key: artKey, data: bytes, contentType: mime, visibility: 'private' });

    const inserted = await db
      .insert(schema.designVersions)
      .values({
        designId: design.id,
        version,
        artUrl: art.url,
        artKey,
        sha256,
        widthPx: size.widthPx,
        heightPx: size.heightPx,
        source: art.rendered || art.source === 'final_4k' ? 'final_4k' : (art.source ?? sourceOf(design)),
        parentVersionId: latest?.id ?? null,
        createdBy: opts.userId,
      })
      .onConflictDoNothing({ target: [schema.designVersions.designId, schema.designVersions.version] })
      .returning();
    if (inserted[0]) return { ok: true, value: inserted[0] };
    // Another request took this number between the read and the write: look again.
  }
  return { ok: false, error: 'The design changed while the print files were being prepared. Try again.' };
}

/** The version the design's stored art makes, for a job to start from. Nothing is rendered
 * here (a 4K render takes a minute): the worker job finalises the art before it builds. */
export async function ensureDesignVersion(design: DesignRow, deps: PrintDeps, opts: { userId: string | null }): Promise<ServiceResult<VersionRow>> {
  const art = storedArt(design);
  if (!art) return { ok: false, error: 'This design has no artwork yet.' };
  return pinDesignVersion(design, deps, art, opts);
}

// ---------------------------------------------------------------------------
// The recipe

/** The capsule a design was made with, found on it or on the designs it came from. */
async function capsuleIdFor(design: DesignRow): Promise<string | null> {
  let current: DesignRow | null = design;
  for (let hops = 0; current && hops < 6; hops++) {
    const id = (current.generationParams as { capsuleId?: unknown } | null)?.capsuleId;
    if (typeof id === 'string' && id) return id;
    if (!current.parentDesignId) return null;
    const [parent]: DesignRow[] = await db.select().from(schema.designs).where(eq(schema.designs.id, current.parentDesignId)).limit(1);
    current = parent ?? null;
  }
  return null;
}

/** Code defaults, then the capsule's printRecipe, then the capsule and design rows of print_recipes. */
export async function resolveRecipe(design: DesignRow) {
  const capsuleId = await capsuleIdFor(design);
  const capsule = capsuleId ? getStyleCapsule(capsuleId) : null;
  // StyleCapsule.printRecipe arrives with the Studio changes (WP4); until then there is none.
  const capsuleRecipe = (capsule as { printRecipe?: RecipeOverride } | null)?.printRecipe;

  const rows = await db
    .select()
    .from(schema.printRecipes)
    .where(or(eq(schema.printRecipes.designId, design.id), capsuleId ? eq(schema.printRecipes.capsuleId, capsuleId) : undefined));
  const capsuleRow = capsuleId ? rows.find((r) => r.capsuleId === capsuleId) : undefined;
  const designRow = rows.find((r) => r.designId === design.id);
  return mergeRecipe(DEFAULT_RECIPE, capsuleRecipe, capsuleRow?.recipe as RecipeOverride | undefined, designRow?.recipe as RecipeOverride | undefined);
}

// ---------------------------------------------------------------------------
// Preparing

const MAX_GARMENT_COLOURS = 20;
const MAX_PLACEMENTS = 4;

async function validateDrop(input: PreparePrintInput): Promise<ServiceResult<{ blankCode: string; garmentCodes: string[]; placements: PrintPlacement[] }>> {
  const [blank] = await db.select().from(schema.blanks).where(eq(schema.blanks.code, input.blankCode)).limit(1);
  if (!blank) return { ok: false, error: `Unknown blank "${input.blankCode}".` };
  const blankName = blankDisplayName(blank.code, blank.name);

  const codes = [...new Set(input.garmentCodes)];
  if (codes.length === 0) return { ok: false, error: 'Pick at least one garment colour.' };
  if (codes.length > MAX_GARMENT_COLOURS) return { ok: false, error: `Pick at most ${MAX_GARMENT_COLOURS} garment colours.` };
  const found = await loadGarments(blank.code, codes);
  const missing = codes.filter((c) => !found.some((g) => g.code === c));
  if (missing.length > 0) return { ok: false, error: `${missing.join(', ')} ${missing.length === 1 ? "isn't" : "aren't"} available on the ${blankName}.` };

  if (input.placements.length === 0) return { ok: false, error: 'Say where the print goes.' };
  if (input.placements.length > MAX_PLACEMENTS) return { ok: false, error: `A drop can have at most ${MAX_PLACEMENTS} placements.` };
  const table = getTypePlacement(blank.type);
  const placements: PrintPlacement[] = [];
  for (const p of input.placements) {
    if (table && !table.positions[p.position as keyof typeof table.positions]) {
      const known = Object.keys(table.positions).map(positionLabel).join(', ').toLowerCase();
      return { ok: false, error: `The ${blankName} has no "${p.position}" print position. Use one of: ${known}.` };
    }
    if (!Number.isFinite(p.widthMm) || p.widthMm < 20 || p.widthMm > 600) return { ok: false, error: 'The print width must be between 2 and 60 cm.' };
    placements.push({ position: p.position, widthMm: Math.round(p.widthMm), ...(p.offsetYMm === undefined ? {} : { offsetYMm: Math.round(p.offsetYMm) }) });
  }
  return { ok: true, value: { blankCode: blank.code, garmentCodes: found.map((g) => g.code), placements } };
}

/** Where a print goes when the artist did not say: the blank's usual position and its calibrated width. */
export async function defaultPlacement(blankCode: string, opts: { position?: string; widthCm?: number } = {}): Promise<PrintPlacement | null> {
  const [blank] = await db.select().from(schema.blanks).where(eq(schema.blanks.code, blankCode)).limit(1);
  if (!blank) return null;
  const table = getTypePlacement(blank.type);
  const position = opts.position ?? table?.defaultPosition ?? 'front_chest';
  const area = table?.positions[position as keyof typeof table.positions];
  const widthCm = opts.widthCm ?? area?.widthCm ?? 28;
  return { position, widthMm: Math.round(widthCm * 10) };
}

/** A job that already makes these packs: queued, running, or done with its packs still current.
 * A job counts by what it builds: its own input hash, or the resolved input its packs record
 * (the worker pins the 4K final, so its packs name a newer version than the job was queued on). */
async function reusableJob(input: PrintJobInput, deps: PrintDeps): Promise<string | null> {
  const hash = deps.jobs.hashJobInput(input);
  const rows = await db
    .select()
    .from(schema.printJobs)
    .where(and(eq(schema.printJobs.inputHash, hash), inArray(schema.printJobs.status, ['queued', 'running', 'done'])))
    .orderBy(desc(schema.printJobs.createdAt))
    .limit(5);
  for (const job of rows) {
    if (job.status !== 'done') return job.id;
    // A finished job only counts while its packs are the current ones: after a
    // different screen count, asking for the first one again has to build it again.
    const packs = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.jobId, job.id));
    if (packs.some((p) => p.buildStatus === 'ready' && !isSuperseded(p))) return job.id;
  }

  // The same drop on the same art once its final exists: the packs say what they were built from.
  const latest = await latestVersion(input.designId);
  if (latest) {
    for (const pack of await loadCurrentPacks(latest.id)) {
      const built = packInfo(pack)?.jobInput;
      if (built && pack.jobId && deps.jobs.hashJobInput(built) === hash) return pack.jobId;
    }
  }
  return null;
}

async function enqueueOrReuse(input: PrintJobInput, userId: string | null, deps: PrintDeps, kind: 'prepare' | 'rerun' = 'prepare'): Promise<{ jobId: string; reused: boolean }> {
  const existing = await reusableJob(input, deps);
  if (existing) return { jobId: existing, reused: true };
  const queued = await deps.jobs.enqueuePrintJob({ kind, input, createdBy: userId });
  return { jobId: queued.jobId, reused: queued.deduped };
}

/** Starts (or reuses) the print job for the design's latest version. */
export async function preparePrint(input: PreparePrintInput): Promise<ServiceResult<{ jobId: string; designVersionId: string }>> {
  if (mockOn()) return { ok: true, value: { jobId: 'mock-job', designVersionId: MOCK_APPROVAL_VIEW.versionId } };
  const deps = printDeps();

  const design = await loadOwnedDesign(input.storeId, input.designId, input.userId);
  if (!design) return { ok: false, error: 'Design not found for this shop.' };

  const drop = await validateDrop(input);
  if (!drop.ok) return drop;

  // The art as it is stored: the job's worker makes the 4K final (a render takes a minute,
  // so never in a request) and pins it as the version the packs are built on.
  const version = await ensureDesignVersion(design, deps, { userId: input.userId });
  if (!version.ok) return version;

  const [recipe, inkSystem] = await Promise.all([resolveRecipe(design), getActiveInkSystem()]);
  const jobInput: PrintJobInput = {
    designId: design.id,
    designVersionId: version.value.id,
    storeId: design.storeId,
    blankCode: drop.value.blankCode,
    garmentCodes: drop.value.garmentCodes,
    placements: drop.value.placements,
    // Every design gets both production versions; most art ends up used for both.
    techniques: ['screen', 'dtg_dtf'],
    recipe,
    inkSystemId: inkSystem.id,
  };
  const queued = await enqueueOrReuse(jobInput, input.userId, deps);
  return { ok: true, value: { jobId: queued.jobId, designVersionId: version.value.id } };
}

// ---------------------------------------------------------------------------
// The approval view

async function validApproval(designId: string, designVersionId: string): Promise<ApprovalRow | null> {
  const [row] = await db
    .select()
    .from(schema.designApprovals)
    .where(and(eq(schema.designApprovals.designId, designId), eq(schema.designApprovals.designVersionId, designVersionId), isNull(schema.designApprovals.invalidatedAt)))
    .orderBy(desc(schema.designApprovals.approvedAt))
    .limit(1);
  return row ?? null;
}

/** The design's jobs that make or remake its packs, newest first. They are found by design, not by
 * version: a job queued on the draft builds on the 4K final, which is a version of its own. */
async function jobsForDesign(designId: string): Promise<JobRow[]> {
  return db
    .select()
    .from(schema.printJobs)
    .where(and(sql`${schema.printJobs.input} ->> 'designId' = ${designId}`, inArray(schema.printJobs.kind, ['prepare', 'rerun'])))
    .orderBy(desc(schema.printJobs.createdAt))
    .limit(10);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function screens(n: number): string {
  return `${n} ${n === 1 ? 'screen' : 'screens'}`;
}

/** Warnings the artist reads: plain words, and never a Pantone name. */
function plainWarnings(warnings: Warning[]): string[] {
  const out: string[] = [];
  for (const w of warnings) {
    if (w.severity === 'info') continue;
    const message = w.message.trim();
    if (!message || /pantone/i.test(message) || out.includes(message)) continue;
    out.push(message);
  }
  return out;
}

const DETAIL: Record<string, string> = {
  underbase: 'Under the colours so they stay bright',
  highlight: 'The brightest points, printed last',
};

/** What a loupe shows, in the artist's words: halftone dots, or for an index set the square ink cells (its films keep the
 * cells per inch as their ruling). */
function loupeCaption(pack: PackRow, technique: PrintTechnique, recipe: PrintJobInput['recipe'] | undefined, garmentName: string): string {
  if (technique !== 'screen') return `True size · ${recipe?.dtg.fadeLpi ?? 45} lpi dots in fades · on ${garmentName}`;
  if (pack.method === 'index') {
    const cells = Math.round(storedManifest(pack)?.inks[0]?.lpi ?? recipe?.indexCellPpi ?? 200);
    return `True size · square ink cells, ${cells} to the inch · on ${garmentName}`;
  }
  return `True size · ${recipe?.halftone.lpi ?? 55} lpi dots · on ${garmentName}`;
}

function screenSetView(pack: PackRow, garmentNames: Map<string, string>): ApprovalScreenSet | null {
  const manifest = storedManifest(pack);
  const info = packInfo(pack);
  if (!manifest || !info || !pack.screenSetKey) return null;
  // A set where nothing prints has no screens to show; the warning that came with it says why.
  if (manifest.inks.length === 0) return null;

  const count = pack.screenCount ?? manifest.inks.length;
  const key = pack.screenSetKey;
  const codes = pack.garmentCodes as string[];
  const names = codes.map((c) => garmentNames.get(c) ?? c);
  const over = Math.max(0, count - STANDARD_MAX_SCREENS);
  const underbase = info.needsUnderbase ? ', over a white underbase' : '';

  return {
    key,
    name: key === 'darks' ? 'Darks' : key === 'lights' ? 'Lights' : (garmentNames.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1)),
    garmentCodes: codes,
    screenCount: count,
    headline: over === 0 ? `${screens(count)}, within the standard ${STANDARD_MAX_SCREENS}.` : `${screens(count)}, ${over} above the standard ${STANDARD_MAX_SCREENS}.`,
    shared:
      names.length > 1
        ? `${joinNames(names)} print from the same ${screens(count)}${underbase}.`
        : `${names[0] ?? 'This colour'} prints from its own ${screens(count)}${info.needsUnderbase ? ', over a white underbase' : ', with no underbase'}.`,
    priceNote:
      over === 0
        ? `No surcharge. On a run, each screen above ${STANDARD_MAX_SCREENS} adds €${EXTRA_SCREEN_CENTS_PER_PIECE / 100} per piece.`
        : `On a run, ${over} ${over === 1 ? 'screen' : 'screens'} above ${STANDARD_MAX_SCREENS} adds €${(over * EXTRA_SCREEN_CENTS_PER_PIECE) / 100} per piece.`,
    inks: manifest.inks.map((ink) => ({
      n: ink.index,
      // The client name only: a Pantone code or name never reaches this view.
      name: ink.clientName && !/pantone/i.test(ink.clientName) ? ink.clientName : `Ink ${ink.index}`,
      detail: DETAIL[ink.role] ?? '',
      hex: ink.hex,
    })),
  };
}

export async function getApprovalView(input: { storeId: string; designId: string }): Promise<ApprovalView | null> {
  if (mockOn()) return { ...MOCK_APPROVAL_VIEW, designId: input.designId };
  const deps = printDeps();

  const design = await loadOwnedDesign(input.storeId, input.designId);
  if (!design) return null;
  const version = await latestVersion(design.id);
  if (!version) return null;

  const [packs, jobs, approval, designName, shown] = await Promise.all([
    loadCurrentPacks(version.id),
    jobsForDesign(design.id),
    validApproval(design.id, version.id),
    designDisplayName(design.id),
    displayVersionNumbers([version]),
  ]);

  // Garments, by blank, in the order the drop named them.
  const blankCodes = [...new Set(packs.map((p) => packInfo(p)?.blankCode).filter((c): c is string => Boolean(c)))];
  const blanks = blankCodes.length > 0 ? await db.select().from(schema.blanks).where(inArray(schema.blanks.code, blankCodes)) : [];
  const blankNames = new Map(blanks.map((b) => [b.code, blankDisplayName(b.code, b.name)]));
  const wanted = [...new Set(packs.flatMap((p) => p.garmentCodes as string[]))];
  const byCode = new Map<string, GarmentColour>();
  for (const blankCode of blankCodes) for (const g of await loadGarments(blankCode, wanted)) if (!byCode.has(g.code)) byCode.set(g.code, g);
  const garmentNames = new Map([...byCode].map(([code, g]) => [code, g.name]));

  const screenPacks = packs.filter((p) => p.technique === 'screen');
  const garments = [...byCode.values()].map((g) => ({
    code: g.code,
    name: g.name,
    hex: g.hex,
    isLight: g.isLight,
    // null for a colour no screen set prints on (the art is the shirt's colour)
    screenSetKey: screenPacks.find((p) => (p.garmentCodes as string[]).includes(g.code) && (storedManifest(p)?.inks.length ?? 0) > 0)?.screenSetKey ?? null,
  }));

  const proofs: ApprovalProof[] = [];
  const loupes: ApprovalLoupe[] = [];
  const dtgFacts: Record<string, string[]> = {};
  const ordered = [...packs.filter((p) => p.technique === 'dtg_dtf'), ...screenPacks];
  for (const pack of ordered) {
    const info = packInfo(pack);
    const technique = pack.technique as PrintTechnique;
    const label = technique === 'screen' ? 'Screen print' : 'DTG';
    const blank = blankNames.get(info?.blankCode ?? '') ?? 'garment';
    for (const file of packFiles(pack)) {
      if (file.kind === 'proof' && file.garmentCode) {
        proofs.push({
          garmentCode: file.garmentCode,
          technique,
          url: await deps.storage.objectUrl(file.key, file.visibility),
          alt: `${label} proof of the ${designName} design on the ${blank.toLowerCase()} in ${garmentNames.get(file.garmentCode) ?? file.garmentCode}`,
        });
      }
      if (file.kind === 'loupe' && file.garmentCode) {
        const name = garmentNames.get(file.garmentCode) ?? file.garmentCode;
        const recipe = info?.jobInput.recipe;
        loupes.push({
          technique,
          garmentCode: file.garmentCode,
          url: await deps.storage.objectUrl(file.key, file.visibility),
          caption: loupeCaption(pack, technique, recipe, name),
        });
      }
    }
    for (const [code, facts] of Object.entries(info?.dtgFacts ?? {})) dtgFacts[code] ??= facts;
  }

  const screenSets = screenPacks.map((p) => screenSetView(p, garmentNames)).filter((s): s is ApprovalScreenSet => s !== null);

  const warnings = plainWarnings(packs.flatMap((p) => packInfo(p)?.warnings ?? []));
  const sentBack = packs.map((p) => packInfo(p)?.sendBack).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const heldBack = packs.some((p) => p.auditStatus === 'sent_back');
  for (const note of sentBack) if (heldBack) warnings.unshift(`Our pre-press team asked for a change: ${note.note}`);

  // The placements as the artist reads them: 'Front chest · 28 × 33.6 cm'.
  const placementLabels: string[] = [];
  for (const pack of packs) {
    const placement = packPlacement(pack);
    const size = packInfo(pack)?.printSizeMm;
    const label = `${positionLabel(placement.position)} · ${formatCm(placement.widthMm)}${size ? ` × ${formatCm(size.height)}` : ''} cm`;
    if (!placementLabels.includes(label)) placementLabels.push(label);
  }

  // Approved only while the approval covers every pack shown: what the artist approved, or a replacement
  // that kept the proof. A colour or print position added since makes the page ask again.
  const versionPacks = await loadPacksForVersion(version.id);
  const covered = approval ? packs.every((p) => approvalCovers(approval, p, versionPacks)) : false;
  const active = jobs.some((j) => j.status === 'queued' || j.status === 'running');
  let status: ApprovalStatus;
  if (active) status = 'preparing';
  else if (packs.length === 0) status = 'failed';
  else status = approval && covered ? 'approved' : 'ready';

  const blocked = packs.some((p) => (packInfo(p)?.warnings ?? []).some((w) => w.severity === 'block'));
  const canRevoke = status === 'approved' && revokeBlocker(versionPacks) === null;
  return {
    designId: design.id,
    designName,
    versionId: version.id,
    versionNumber: shown.get(version.id) ?? version.version,
    placementLabel: placementLabels.join(' + '),
    status,
    garments,
    proofs,
    loupes,
    dtgFacts,
    screenSets,
    warnings,
    approvedAt: status === 'approved' && approval ? approval.approvedAt.toISOString() : null,
    canApprove: status === 'ready' && !blocked && !heldBack && proofs.length > 0,
    canRevoke,
  };
}

// ---------------------------------------------------------------------------
// Approving

/** Approves the version for both techniques and every garment colour, pinning
 * the pack hashes (design_approvals). */
export async function approveDesign(input: { storeId: string; userId: string; designId: string; versionId: string }): Promise<ServiceResult<{ approvalId: string }>> {
  if (mockOn()) return { ok: true, value: { approvalId: `mock-approval-${input.versionId}` } };

  // The page and the tool have looked already; this is checked again here, from the ids alone.
  const design = await loadOwnedDesign(input.storeId, input.designId, input.userId);
  if (!design) return { ok: false, error: 'Design not found for this shop.' };
  const latest = await latestVersion(design.id);
  if (!latest) return { ok: false, error: 'This design has no print files yet.' };
  if (latest.id !== input.versionId) {
    const known = UUID.test(input.versionId) ? await db.select({ id: schema.designVersions.id }).from(schema.designVersions).where(and(eq(schema.designVersions.id, input.versionId), eq(schema.designVersions.designId, design.id))).limit(1) : [];
    return { ok: false, error: known.length > 0 ? 'There is a newer version of this design. Look over that one instead.' : "That version of the design wasn't found." };
  }

  const [packs, jobs, existing] = await Promise.all([loadCurrentPacks(latest.id), jobsForDesign(design.id), validApproval(design.id, latest.id)]);
  if (jobs.some((j) => j.status === 'queued' || j.status === 'running')) return { ok: false, error: 'The print files are still being prepared. Try again in a few minutes.' };
  if (packs.length === 0) return { ok: false, error: "The print files aren't ready, so there is nothing to approve yet." };

  const held = packs.find((p) => p.auditStatus === 'sent_back');
  if (held) {
    const note = packInfo(held)?.sendBack?.note;
    return { ok: false, error: `Our pre-press team asked for a change first${note ? `: ${note}` : '.'}` };
  }
  const blocking = packs.flatMap((p) => packInfo(p)?.warnings ?? []).find((w) => w.severity === 'block');
  if (blocking) return { ok: false, error: `This can't be printed yet: ${blocking.message}` };

  const garmentCodes = [...new Set(packs.flatMap((p) => p.garmentCodes as string[]))];
  // Approving twice is not an error; an approval that doesn't cover what is shown now (a colour or a print
  // position added since) is followed by a new one that does.
  if (existing) {
    const versionPacks = await loadPacksForVersion(latest.id);
    if (packs.every((p) => approvalCovers(existing, p, versionPacks))) return { ok: true, value: { approvalId: existing.id } };
  }

  const placements: PrintPlacement[] = [];
  for (const pack of packs) {
    const p = packPlacement(pack);
    if (!placements.some((q) => q.position === p.position && q.widthMm === p.widthMm && q.offsetYMm === p.offsetYMm)) placements.push(p);
  }
  const first = packInfo(packs[0]);
  const inks = Object.fromEntries(
    packs
      .filter((p) => p.technique === 'screen' && p.screenSetKey)
      .map((p) => [p.screenSetKey as string, (storedManifest(p)?.inks ?? []).map((ink) => ({ index: ink.index, role: ink.role, hex: ink.hex, base: ink.base, clientName: ink.clientName, pantone: ink.pantone }))]),
  );

  // The recipe column holds the recipe and the ink set the artist approved.
  const [row] = await db
    .insert(schema.designApprovals)
    .values({
      designId: design.id,
      designVersionId: latest.id,
      packHashes: Object.fromEntries(packs.map((p) => [p.id, packHash(p)])),
      garmentCodes,
      placements,
      // Every pack's own recipe too: a re-run (another screen count, ruling or choke) gives one set its own.
      recipe: {
        recipe: first?.jobInput.recipe ?? null,
        recipes: Object.fromEntries(packs.map((p) => [p.id, packInfo(p)?.jobInput.recipe ?? null])),
        inkSystemId: first?.jobInput.inkSystemId ?? null,
        inks,
      },
      approvedBy: input.userId,
    })
    .returning({ id: schema.designApprovals.id });
  return { ok: true, value: { approvalId: row.id } };
}

/** What the artist's session gives a service: who is acting, and for which shop.
 * SessionInfo (lib/auth.ts) fits it. */
export interface ArtistSession {
  user: { id: string };
  store: { id: string } | null;
}

/** Undoes the artist's approval of the design's current version. Allowed only
 * while the approved files are unused: no pack audited for production and no
 * order linked to one. After that, production is working from them. */
export async function revokeApproval(session: ArtistSession, designId: string): Promise<ServiceResult<null>> {
  if (mockOn()) return { ok: true, value: null };
  if (!session.store) return { ok: false, error: 'This account has no shop, so there is no approval to undo.' };

  const design = await loadOwnedDesign(session.store.id, designId, session.user.id);
  if (!design) return { ok: false, error: 'Design not found for this shop.' };
  const version = await latestVersion(design.id);
  const approval = version ? await validApproval(design.id, version.id) : null;
  if (!version || !approval) return { ok: false, error: "This design isn't approved, so there is nothing to undo." };

  const blocker = revokeBlocker(await loadPacksForVersion(version.id));
  if (blocker) return { ok: false, error: blocker };

  await invalidateApprovals(design.id, version.id, 'The artist undid their approval.');
  return { ok: true, value: null };
}

/** Why an approval of these packs can no longer be undone, or null when it can.
 * Every pack of the version counts, replaced ones too: a correction that replaced
 * an audited pack still means pre-press has worked on these files. */
function revokeBlocker(packs: PackRow[]): string | null {
  if (packs.some((p) => (Array.isArray(p.neededFor) ? p.neededFor.length : 0) > 0)) {
    return "An order is already waiting on these print files, so the approval can't be undone. Message us if something needs to change.";
  }
  if (packs.some((p) => p.auditStatus !== 'idle' || p.auditedAt !== null)) {
    return "Our pre-press team has already checked these print files, so the approval can't be undone. Message us if something needs to change.";
  }
  return null;
}

/** Re-runs the screen separation with another screen budget (1..15). */
export async function changeScreenCount(input: { storeId: string; userId: string; designId: string; screens: number }): Promise<ServiceResult<{ jobId: string }>> {
  if (mockOn()) return { ok: true, value: { jobId: 'mock-job' } };
  const deps = printDeps();

  if (!Number.isInteger(input.screens) || input.screens < 1 || input.screens > ABSOLUTE_MAX_SCREENS) {
    return { ok: false, error: `Choose between 1 and ${ABSOLUTE_MAX_SCREENS} screens.` };
  }
  const design = await loadOwnedDesign(input.storeId, input.designId, input.userId);
  if (!design) return { ok: false, error: 'Design not found for this shop.' };
  const version = await latestVersion(design.id);
  // The drop (blank, colours, placement) is the artist's own, from their last prepare; staff re-runs have their own settings.
  const [last] = (await jobsForDesign(design.id)).filter((j) => j.kind === 'prepare');
  if (!version || !last) return { ok: false, error: 'Prepare the print files first, then the screen count can change.' };

  const base = last.input as PrintJobInput;
  const inkSystem = await getActiveInkSystem();
  const next: PrintJobInput = {
    ...base,
    // The newest version: once the 4K final exists, the job starts from it and renders nothing.
    designVersionId: version.id,
    techniques: ['screen'],
    recipe: mergeRecipe(base.recipe, { maxScreens: input.screens }),
    inkSystemId: inkSystem.id,
    rerun: undefined,
    reupload: undefined,
  };

  // Remember the choice for this design, so a later prepare keeps it.
  const [stored] = await db.select().from(schema.printRecipes).where(eq(schema.printRecipes.designId, design.id)).limit(1);
  const recipe = { ...((stored?.recipe as RecipeOverride | undefined) ?? {}), maxScreens: input.screens };
  await db
    .insert(schema.printRecipes)
    .values({ designId: design.id, recipe, updatedBy: input.userId })
    .onConflictDoUpdate({ target: schema.printRecipes.designId, set: { recipe, updatedBy: input.userId, updatedAt: new Date() } });

  const existing = await reusableJob(next, deps);
  if (existing) return { ok: true, value: { jobId: existing } };

  // New separations mean a new proof: the artist looks and approves again.
  await invalidateApprovals(design.id, version.id, 'The screen count changed.');
  const queued = await enqueueOrReuse(next, input.userId, deps);
  return { ok: true, value: { jobId: queued.jobId } };
}

// ---------------------------------------------------------------------------
// Publishing: does the design's approval cover a product?
//
// A product goes in front of fans only when its design's current version has an approval that
// covers the product: its blank, every colour it has enabled, and its print position and width
// (Print-Prep-Plan section 7, the owner's decision of 15 Oct). A shop product always prints
// DTG/DTF, so the DTG/DTF packs are the ones that answer. An approval covers a pack by pinning
// it, or a replacement of it that kept the proof (approvalCovers); a colour it was never given
// is not covered, and needs its own approval. Everything here only reads.

/** Why an approval doesn't cover a product yet. */
export type ApprovalGap =
  /** no print files for this blank, colour or print position */
  | 'not_prepared'
  /** they are being made now */
  | 'preparing'
  /** they exist and were never approved */
  | 'not_approved'
  /** approved once, then withdrawn (undone, changed by pre-press, another screen count) */
  | 'withdrawn'
  /** the approval is of earlier artwork: the design has a newer version */
  | 'newer_version'
  /** approved, but not these colours or this position (added or prepared since) */
  | 'not_covered';

/** What a product prints: its blank, the colours to cover and where the print goes. */
export interface ApprovalDrop {
  blankCode: string;
  colours: string[];
  placement: PrintPlacement;
}

export interface ApprovalCoverage {
  covered: boolean;
  /** why not, when it isn't covered */
  reason: ApprovalGap | null;
  /** how many colours were asked about */
  asked: number;
  /** the colours not covered, named as the artist knows them, with the step each one waits on */
  missing: { code: string; name: string; step: 'prepare' | 'approve' }[];
}

/** True while a job is making DTG/DTF files for this blank and position that include one of these colours
 * (any colour, when none are named). */
async function beingPrepared(designId: string, drop: ApprovalDrop, codes?: string[]): Promise<boolean> {
  const jobs = (await jobsForDesign(designId)).filter((j) => j.status === 'queued' || j.status === 'running');
  return jobs.some((job) => {
    const input = job.input as Partial<PrintJobInput> | null;
    const placements = Array.isArray(input?.placements) ? input.placements : [];
    const garments = Array.isArray(input?.garmentCodes) ? input.garmentCodes : [];
    const techniques = Array.isArray(input?.techniques) ? input.techniques : [];
    return (
      input?.blankCode === drop.blankCode &&
      techniques.includes('dtg_dtf') &&
      placements.some((p) => samePlacement(p, drop.placement)) &&
      (!codes || garments.some((c) => codes.includes(c)))
    );
  });
}

/** Whether the design's current version has an approval covering this blank, these colours and this
 * placement (position, width and offset, as pre-press and production match them). Read-only.
 * `missing` names what isn't covered and what each colour waits on: files still to prepare, or an
 * approval still to give. With no colours given it asks about the print position alone. PRINT_MOCK
 * answers covered, like the other mocked approval calls. */
export async function approvalCoverage(designId: string, drop: ApprovalDrop): Promise<ApprovalCoverage> {
  const wanted = [...new Set(drop.colours)];
  if (mockOn()) return { covered: true, reason: null, asked: wanted.length, missing: [] };

  const version = await latestVersion(designId);
  const [versionPacks, approvals] = version ? await Promise.all([loadPacksForVersion(version.id), approvalsOfVersion(version.id)]) : [[], []];
  const matching = versionPacks.filter(
    (p) => p.buildStatus === 'ready' && !isSuperseded(p) && p.technique === 'dtg_dtf' && packInfo(p)?.blankCode === drop.blankCode && samePlacement(packPlacement(p), drop.placement),
  );
  // The newest approval that still stands, as the approval page and production read it.
  const valid = approvals.find((a) => !a.invalidatedAt) ?? null;

  const codes = wanted.length > 0 ? wanted : [...colourSet(matching)];
  if (codes.length === 0) return { covered: false, reason: (await beingPrepared(designId, drop)) ? 'preparing' : 'not_prepared', asked: 0, missing: [] };

  const steps = new Map<string, 'prepare' | 'approve'>();
  for (const code of codes) {
    const pack = matching.find((p) => (p.garmentCodes as string[]).includes(code));
    if (!pack) steps.set(code, 'prepare');
    else if (!valid || !approvalCovers(valid, pack, versionPacks, code)) steps.set(code, 'approve');
  }
  if (steps.size === 0) return { covered: true, reason: null, asked: codes.length, missing: [] };

  const unprepared = [...steps].filter(([, step]) => step === 'prepare').map(([code]) => code);
  let reason: ApprovalGap;
  if (unprepared.length > 0) reason = (await beingPrepared(designId, drop, unprepared)) ? 'preparing' : 'not_prepared';
  else if (!valid && approvals.length > 0) reason = 'withdrawn';
  else if (!valid) {
    const [earlier] = await db
      .select({ id: schema.designApprovals.id })
      .from(schema.designApprovals)
      .where(and(eq(schema.designApprovals.designId, designId), version ? sql`${schema.designApprovals.designVersionId} <> ${version.id}` : undefined))
      .limit(1);
    reason = earlier ? 'newer_version' : 'not_approved';
  } else reason = 'not_covered';

  const names = new Map((await loadGarments(drop.blankCode, [...steps.keys()])).map((g) => [g.code, g.name]));
  return {
    covered: false,
    reason,
    asked: codes.length,
    missing: [...steps].map(([code, step]) => ({ code, name: names.get(code) ?? code, step })),
  };
}

/** What the artist does next to cover a product. `prompt` is what a chip or button sends the assistant. */
export interface ApprovalStep {
  /** approve: the approval page; prepare: make the print files; design: the product has none */
  kind: 'approve' | 'prepare' | 'design';
  /** button words, short */
  label: string;
  prompt: string;
}

/** /studio/approve/<designId>; the ?from= carries the conversation, so the page's way back lands in it. */
export function approvalPath(designId: string, sessionId?: string | null): string {
  return `/studio/approve/${designId}${sessionId ? `?from=${encodeURIComponent(sessionId)}` : ''}`;
}

/** The sentence an artist reads when their approval doesn't cover a product, and the step it points to.
 * Plain words: the product's own name, colour names, never a Pantone code. Colours are named when only
 * some are missing, or always with `nameColours` ("the French Navy Underwriter tee"). */
export function describeApprovalGap(
  coverage: Pick<ApprovalCoverage, 'reason' | 'asked' | 'missing'>,
  productName: string,
  opts: { nameColours?: boolean } = {},
): { sentence: string; step: ApprovalStep } {
  const names = coverage.missing.map((m) => m.name);
  const named = names.length > 0 && (opts.nameColours || names.length < coverage.asked);
  const subject = named ? `the ${joinNames(names)} ${productName}` : `the ${productName}`;
  const proofs = `Show me the print proofs for ${productName}`;

  switch (coverage.reason) {
    case 'not_prepared':
      return {
        sentence: `The print files don't cover ${subject} yet. Prepare them and approve the artwork first.`,
        step: { kind: 'prepare', label: 'Prepare the print files', prompt: `Prepare the print files for ${productName}` },
      };
    case 'preparing':
      return {
        sentence: `The print files for ${subject} are still being prepared. Approve the artwork once they're ready.`,
        step: { kind: 'approve', label: 'Open the approval page', prompt: proofs },
      };
    case 'withdrawn':
      return { sentence: `Approve the artwork for ${subject} first. Your earlier approval was withdrawn.`, step: { kind: 'approve', label: 'Approve the artwork', prompt: proofs } };
    case 'newer_version':
      return { sentence: `Approve the artwork for ${subject} first. The artwork changed since you last approved it.`, step: { kind: 'approve', label: 'Approve the artwork', prompt: proofs } };
    case 'not_covered':
      return { sentence: `Approve the artwork for ${subject} first. Your earlier approval doesn't include it.`, step: { kind: 'approve', label: 'Approve the artwork', prompt: proofs } };
    default:
      return { sentence: `Approve the artwork for ${subject} first.`, step: { kind: 'approve', label: 'Approve the artwork', prompt: proofs } };
  }
}

/** A product's stored placement (products.placement, in cm). */
export interface StoredPlacement {
  position?: string;
  widthCm?: number;
  offsetYcm?: number;
}

/** A product's placement as print prep reads it (mm). What the product didn't save is the usual
 * front chest at 28 cm, the way pre-press reads it for an order. */
export function productPrintPlacement(placement: StoredPlacement | null | undefined): PrintPlacement {
  return {
    position: placement?.position || 'front_chest',
    widthMm: Math.round((placement?.widthCm ?? 28) * 10),
    ...(placement?.offsetYcm === undefined || placement?.offsetYcm === null ? {} : { offsetYMm: Math.round(placement.offsetYcm * 10) }),
  };
}

/** Where a product stands against the design approval. */
export interface ProductApproval {
  /** the product may go in front of fans, as far as its artwork goes */
  covered: boolean;
  /** it prints with no print file to make (embroidery is outside print prep), so there is nothing to approve */
  exempt: boolean;
  designId: string | null;
  reason: ApprovalGap | 'no_design' | null;
  /** what is missing, in the artist's words; null when covered */
  sentence: string | null;
  step: ApprovalStep | null;
  /** the colours not covered, by name */
  missingColours: string[];
  /** what prepare_print needs, for the assistant's tool call; never shown to the artist */
  prepare: { designId: string; blankCode: string; colourCodes: string[]; position: string; widthCm: number } | null;
}

type ProductRow = typeof schema.products.$inferSelect;

export async function productColourCodes(productId: string): Promise<string[]> {
  const rows = await db.select({ code: schema.productColours.colourCode }).from(schema.productColours).where(eq(schema.productColours.productId, productId));
  return rows.map((r) => r.code);
}

/** Checks one product against its design's approval for the colours and placement given: the product's
 * own to publish it, or the colours and position an edit would add to a live one. */
export async function checkProductApproval(
  product: ProductRow,
  drop: { colours: string[]; placement: StoredPlacement | null; /** name the colours in the sentence even when they are all there is to check (colours added to a live product) */ nameColours?: boolean },
): Promise<ProductApproval> {
  const base = { designId: product.designId, missingColours: [], prepare: null };
  // Embroidery has no print file to make, and print prep leaves it out (techniqueOfService): nothing to approve.
  if (techniqueOfService(product.printServiceCode) === null) return { ...base, covered: true, exempt: true, reason: null, sentence: null, step: null };

  const designId = product.designId;
  if (!designId) {
    return {
      ...base,
      covered: false,
      exempt: false,
      reason: 'no_design',
      sentence: `${product.name} has no artwork yet, so there is nothing to approve. Make a new product from your artwork and approve that.`,
      step: { kind: 'design', label: 'Add your artwork', prompt: 'I want to upload artwork' },
    };
  }

  const placement = productPrintPlacement(drop.placement);
  const coverage = await approvalCoverage(designId, { blankCode: product.blankCode, colours: drop.colours, placement });
  if (coverage.covered) return { ...base, covered: true, exempt: false, reason: null, sentence: null, step: null };

  const gap = describeApprovalGap(coverage, product.name, { nameColours: drop.nameColours });
  return {
    covered: false,
    exempt: false,
    designId,
    reason: coverage.reason,
    sentence: gap.sentence,
    step: gap.step,
    missingColours: coverage.missing.map((m) => m.name),
    prepare: { designId, blankCode: product.blankCode, colourCodes: [...new Set(drop.colours)], position: placement.position, widthCm: placement.widthMm / 10 },
  };
}

/** The product's standing against its design's approval, for the shop that owns it; null when it isn't theirs. */
export async function productApproval(storeId: string, productId: string): Promise<ProductApproval | null> {
  if (!UUID.test(productId) || !UUID.test(storeId)) return null;
  const [product] = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.storeId, storeId)))
    .limit(1);
  if (!product) return null;
  return checkProductApproval(product, { colours: await productColourCodes(product.id), placement: product.placement as StoredPlacement | null });
}
