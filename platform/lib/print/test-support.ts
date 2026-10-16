// Test support for print prep (WP7): fakes for the engine, the pack writers,
// print storage, the job queue and the artwork source, plus seed helpers for
// the catalogue, designs, products and orders. Nothing here imports lib/db (or
// anything that does), so a test can call setupTestDb() first and import the
// services after it.
//
//   const t = await setupTestDb();
//   const fakes = makeFakes(t.db);
//   const { overridePrintDeps } = await import('@/lib/print/pipeline');
//   overridePrintDeps(fakes.deps);
// PGlite stamps timestamp defaults in the host's time zone, and drizzle reads them as UTC;
// Neon runs in UTC, so tests do too, or a time written by the database and one written by
// the code (a need's `at`) would not sort together.
process.env.TZ = 'UTC';

import { createHash, randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from '@db/schema';
import { seedUser, setupTestDb } from '@/scripts/test/pglite';
import type { Actor, PermissionMap } from '@/lib/auth/permissions';
import type * as PipelineModule from '@/lib/print/pipeline';
import type * as PrintPrepModule from '@/lib/services/print-prep';
import type * as PrepressModule from '@/lib/services/prepress';
import type * as PantoneModule from '@/lib/services/pantone-library';
import type * as InkSystemModule from '@/lib/services/ink-system';
import { plateLayerName } from '@/lib/print/pack/names';
import { diffScreenPsd, rebuildScreenSet } from '@/lib/print/pack/psd-read';
import type { ActivityEntry, EngineApi, JobsApi, PackApi, PackRow, PrintDeps, StorageApi } from '@/lib/print/pipeline';
import type { SleeveProofInput } from '@/lib/mockups/sleeve-proof';
import type {
  CheckResult,
  DtgLayer,
  GarmentColour,
  InkPlate,
  JobSheetInput,
  Lab,
  PackManifest,
  ParsedScreenPsd,
  Plate,
  PrintJobInput,
  PrintJobResult,
  ScreenSet,
  Warning,
} from '@/lib/print/types';

export type TestDb = PgliteDatabase<typeof schema>;

export function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** JSON with sorted keys and no undefined values, the form job inputs are hashed in. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

// ---------------------------------------------------------------------------
// Storage

export interface FakeStorage extends StorageApi {
  objects: Map<string, { data: Buffer; contentType: string; visibility: 'public' | 'private' }>;
  keys(prefix?: string): string[];
}

export function makeFakeStorage(): FakeStorage {
  const objects = new Map<string, { data: Buffer; contentType: string; visibility: 'public' | 'private' }>();
  return {
    objects,
    keys: (prefix = '') => [...objects.keys()].filter((k) => k.startsWith(prefix)).sort(),
    // The same rule as lib/services/print-storage.ts printKey.
    printKey: (designId, version, ...parts) => ['print', designId, `v${version}`, ...parts.map((p) => p.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''))].join('/'),
    putObject: async ({ key, data, contentType, visibility }) => {
      const buffer = Buffer.from(data);
      objects.set(key, { data: buffer, contentType, visibility });
      return { key, visibility, contentType, bytes: buffer.length, sha256: sha256(buffer) };
    },
    getObject: async (key) => {
      const hit = objects.get(key);
      if (!hit) throw new Error(`No such object: ${key}`);
      return hit.data;
    },
    objectUrl: async (key, visibility, opts) => `/fake-files/${visibility}/${key}${opts?.download ? `?download=${encodeURIComponent(opts.download)}` : ''}`,
    statObject: async (key) => {
      const hit = objects.get(key);
      return hit ? { key, visibility: hit.visibility, contentType: hit.contentType, bytes: hit.data.length, sha256: sha256(hit.data) } : null;
    },
    peek: async (key, bytes) => objects.get(key)?.data.subarray(0, bytes) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Job queue (the contract of lib/print/jobs.ts, on the test database)

/** A stand-in worker: when set, jobs of these kinds are run `delayMs` after they are queued. */
export interface FakeQueue {
  worker: { kinds: Set<string>; delayMs: number } | null;
  /** runs one job through the handler (set once the pipeline is loaded) */
  runner: ((jobId: string) => Promise<unknown>) | null;
  /** the runs the worker has started, so a test can wait for them */
  pending: Promise<unknown>[];
}

export function makeFakeJobs(db: TestDb, queue: FakeQueue = { worker: null, runner: null, pending: [] }): JobsApi {
  const hashJobInput = (input: PrintJobInput) => sha256(stableJson(input));
  return {
    hashJobInput,
    enqueuePrintJob: async ({ kind, input, createdBy }) => {
      const hash = hashJobInput(input);
      const [existing] = await db
        .select({ id: schema.printJobs.id })
        .from(schema.printJobs)
        .where(and(eq(schema.printJobs.inputHash, hash), inArray(schema.printJobs.status, ['queued', 'running'])))
        .limit(1);
      if (existing) return { jobId: existing.id, deduped: true };
      const [row] = await db
        .insert(schema.printJobs)
        .values({ kind, designVersionId: input.designVersionId, input, inputHash: hash, createdBy: createdBy ?? null })
        .returning({ id: schema.printJobs.id });
      const { worker, runner } = queue;
      if (worker && runner && worker.kinds.has(kind)) {
        // The worker picks it up a moment later, like a separate process would.
        queue.pending.push(new Promise((resolve) => setTimeout(resolve, worker.delayMs)).then(() => runner(row.id)).catch(() => undefined));
      }
      return { jobId: row.id, deduped: false };
    },
  };
}

/** Stands in for the worker: runs one queued job through a handler and records the outcome. */
export async function runJob(db: TestDb, jobId: string, handle: (job: typeof schema.printJobs.$inferSelect) => Promise<PrintJobResult>): Promise<PrintJobResult> {
  const [job] = await db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId)).limit(1);
  if (!job) throw new Error(`No job ${jobId}`);
  const running = { ...job, status: 'running' as const, attempts: job.attempts + 1 };
  await db.update(schema.printJobs).set({ status: 'running', attempts: running.attempts, startedAt: new Date() }).where(eq(schema.printJobs.id, jobId));
  try {
    const result = await handle(running);
    await db.update(schema.printJobs).set({ status: 'done', result, finishedAt: new Date() }).where(eq(schema.printJobs.id, jobId));
    return result;
  } catch (err) {
    await db.update(schema.printJobs).set({ status: 'failed', error: err instanceof Error ? err.message : String(err), finishedAt: new Date() }).where(eq(schema.printJobs.id, jobId));
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Engine

export const PALETTE = [
  { hex: '#ED90DC', name: 'Orchid pink', lab: { L: 71.67, a: 43.95, b: -23.54 } },
  { hex: '#C363DA', name: 'Violet', lab: { L: 57.4, a: 52.22, b: -44.96 } },
  { hex: '#5456AC', name: 'Indigo', lab: { L: 39.82, a: 18.06, b: -47.27 } },
  { hex: '#3E0E61', name: 'Deep purple', lab: { L: 16.06, a: 34.61, b: -39.01 } },
] as const;
const WHITE_LAB: Lab = { L: 95.45, a: -0.26, b: 0.97 };
const CANVAS = { widthPx: 8, heightPx: 8, ppi: 600, marginMm: 25, art: { x: 1, y: 1, width: 6, height: 6 } };

export interface FakeEngineOptions {
  needsManual: boolean;
  warnings: Warning[];
  /** most colour inks a set gets, whatever the screen budget allows */
  colourCap: number;
  /** the dark garments' set comes back with no films and a blocking warning, as for black art on a black shirt */
  nothingPrintsOnDarks: boolean;
}

export interface FakeEngine {
  engine: EngineApi;
  options: FakeEngineOptions;
  /** names of the engine calls, in order */
  calls: string[];
  /** every label strip redrawn: the film and the code it was given */
  relabels: { plateIndex: number; inkName: string | undefined }[];
  /** every proof asked for: the print box it was drawn in, and the placement */
  proofRequests: { technique: 'screen' | 'dtg_dtf'; garmentCode: string; printBox: { x: number; y: number; w: number; h: number }; widthMm: number }[];
}

function fakePlate(seed: number): Plate {
  const data = new Uint8Array(64);
  for (let i = 0; i < data.length; i++) data[i] = (i * (seed + 3) + seed) % 7 < 2 ? 255 : 0;
  return { width: 8, height: 8, ppi: 600, data };
}

function share(plate: Plate): number {
  let on = 0;
  for (const v of plate.data) if (v > 127) on++;
  return on / plate.data.length;
}

export function makeFakeEngine(initial: Partial<FakeEngineOptions> = {}): FakeEngine {
  const options: FakeEngineOptions = { needsManual: false, warnings: [], colourCap: 4, nothingPrintsOnDarks: false, ...initial };
  const calls: string[] = [];
  const relabels: FakeEngine['relabels'] = [];
  const proofRequests: FakeEngine['proofRequests'] = [];

  const plateOf = (index: number, input: PrintJobInput['recipe'], role: InkPlate['role'], colour: number, dark: boolean): InkPlate => {
    const plate = fakePlate(index + colour);
    const swatch = PALETTE[colour % PALETTE.length];
    return {
      index,
      role,
      target: role === 'ink' ? { hex: swatch.hex, lab: swatch.lab } : { hex: '#F2F2F0', lab: WHITE_LAB },
      base: role === 'ink' ? (dark ? 'HB Opaque' : 'HB Neutral') : role === 'underbase' ? 'Aquaflex V2 White · flash' : 'Aquaflex V2 White',
      pantone: null,
      // The real engine names the whites too; leaving them off here keeps the pipeline's own naming covered.
      ...(role === 'ink' ? { clientName: swatch.name } : {}),
      plate,
      coverage: share(plate),
      halftone: input.halftone,
      meshSuggestion: role === 'ink' ? 230 : 200,
    };
  };

  const setOf = (key: string, garments: GarmentColour[], recipe: PrintJobInput['recipe'], dark: boolean): ScreenSet => {
    const inkCount = Math.min(options.colourCap, Math.max(1, dark ? recipe.maxScreens - 2 : recipe.maxScreens));
    const plates: InkPlate[] = [];
    if (dark) plates.push(plateOf(1, recipe, 'underbase', 0, dark));
    for (let c = 0; c < inkCount; c++) plates.push(plateOf(plates.length + 1, recipe, 'ink', c, dark));
    if (dark) plates.push(plateOf(plates.length + 1, recipe, 'highlight', 0, dark));
    return { key, garmentCodes: garments.map((g) => g.code), needsUnderbase: dark, method: 'spot', canvas: CANVAS, plates, warnings: [] };
  };

  const engine: EngineApi = {
    decodeArt: async (bytes) => {
      calls.push('decodeArt');
      return { width: 4, height: 4, channels: 4, data: new Uint8Array(64).fill(bytes.length % 255), ppi: 300 };
    },
    separateScreen: async (input) => {
      calls.push('separateScreen');
      const darks = input.garments.filter((g) => !g.isLight);
      const lights = input.garments.filter((g) => g.isLight);
      const sets: ScreenSet[] = [];
      if (darks.length > 0 && options.nothingPrintsOnDarks) {
        const names = darks.map((g) => g.name).join(', ');
        const nothing: Warning = { code: 'empty_print', severity: 'block', message: `Screen print: nothing prints on ${names}. The art is the same colour as the shirt.` };
        sets.push({ key: 'darks', garmentCodes: darks.map((g) => g.code), needsUnderbase: true, method: 'spot', canvas: CANVAS, plates: [], warnings: [nothing] });
      } else if (darks.length > 0) sets.push(setOf('darks', darks, input.recipe, true));
      if (lights.length > 0) sets.push(setOf('lights', lights, input.recipe, false));
      return {
        method: 'spot',
        methodReason: options.needsManual ? 'Soft shading runs through most of the art.' : 'Flat colours with little shading.',
        needsManual: options.needsManual,
        sets,
        warnings: options.warnings,
      };
    },
    prepareDtg: async (input) => {
      calls.push('prepareDtg');
      const layers: DtgLayer[] = input.garments.map((g) => ({
        garmentCode: g.code,
        raster: { width: 4, height: 4, channels: 4, data: new Uint8Array(64).fill(g.isLight ? 9 : 200), ppi: 300 },
        offsetPx: { x: 0, y: 0 },
        printAreaPx: { width: 4, height: 4 },
        fadeShare: 0.1,
        whitesTransparent: g.isLight,
      }));
      return { layers, warnings: [] };
    },
    renderScreenProof: async (set, request) => {
      calls.push('renderScreenProof');
      proofRequests.push({ technique: 'screen', garmentCode: request.garment.code, printBox: request.packshot.printBox, widthMm: request.placement.widthMm });
      // The plates are in the bytes, so a changed plate changes the proof.
      return { garmentCode: request.garment.code, technique: 'screen', image: Buffer.from(`proof-screen:${set.key}:${request.garment.code}:${set.plates.map((p) => sha256(p.plate.data).slice(0, 6)).join('')}`), width: 1000, height: 1250 };
    },
    renderDtgProof: async (layer, request) => {
      calls.push('renderDtgProof');
      proofRequests.push({ technique: 'dtg_dtf', garmentCode: request.garment.code, printBox: request.packshot.printBox, widthMm: request.placement.widthMm });
      return { garmentCode: request.garment.code, technique: 'dtg_dtf', image: Buffer.from(`proof-dtg:${layer.garmentCode}:${sha256(layer.raster.data).slice(0, 6)}`), width: 1000, height: 1250 };
    },
    renderScreenLoupe: async (set, garmentCode) => {
      calls.push('renderScreenLoupe');
      return { technique: 'screen', garmentCode, image: Buffer.from(`loupe-screen:${set.key}:${garmentCode}`), ppi: 600 };
    },
    renderDtgLoupe: async (layer) => {
      calls.push('renderDtgLoupe');
      return { technique: 'dtg_dtf', garmentCode: layer.garmentCode, image: Buffer.from(`loupe-dtg:${layer.garmentCode}`), ppi: 300 };
    },
    relabelPlate: (_set, plateIndex, _label, _inks, _offset, inkName) => {
      calls.push('relabelPlate');
      relabels.push({ plateIndex, inkName });
    },
  };
  return { engine, options, calls, relabels, proofRequests };
}

// ---------------------------------------------------------------------------
// Pack writers

export interface FakePackOptions {
  /** the state of the 'proof' check when an approved proof was given to compare against */
  proofState: CheckResult['state'];
  /** id of a check that fails on every pack, or null */
  failCheck: string | null;
}

export interface FakePack {
  pack: PackApi;
  options: FakePackOptions;
  /** what runChecks was asked, in order */
  checkCalls: { technique: string; hadApprovedProof: boolean }[];
  /** every job sheet drawn (lib/services/job-sheets.ts), in order: what each was asked to say */
  sheets: JobSheetInput[];
  /** how many PSDs the pack was asked to write */
  psdWrites: number;
}

/** What the fake pack writes as a "PSD": the real 6-byte header ('8BPS', version 1), so signature checks pass, then JSON. */
export interface FakePsd {
  kind: 'fake-screen-psd';
  widthPx: number;
  heightPx: number;
  ppi: number;
  effectsOn: boolean;
  plates: { index: number; name: string; data: string }[];
}

const PSD_HEAD = Buffer.from([0x38, 0x42, 0x50, 0x53, 0, 1]);

export function writeFakePsd(psd: FakePsd): Buffer {
  return Buffer.concat([PSD_HEAD, Buffer.from(JSON.stringify(psd))]);
}

export function readFakePsd(bytes: Buffer): FakePsd {
  if (!bytes.subarray(0, 6).equals(PSD_HEAD)) throw new Error('not a screen PSD');
  const psd = JSON.parse(bytes.subarray(6).toString('utf8')) as FakePsd;
  if (psd.kind !== 'fake-screen-psd') throw new Error('not a screen PSD');
  return psd;
}

export function makeFakePack(initial: Partial<FakePackOptions> = {}): FakePack {
  const options: FakePackOptions = { proofState: 'passed', failCheck: null, ...initial };
  const fake: FakePack = { pack: undefined as unknown as PackApi, options, checkCalls: [], sheets: [], psdWrites: 0 };

  fake.pack = {
    screenSetPrints: (set) => set.plates.length > 0,
    writeScreenPsd: async ({ set }) => {
      fake.psdWrites += 1;
      if (set.plates.length === 0) return Buffer.alloc(0);
      const psd: FakePsd = {
        kind: 'fake-screen-psd',
        widthPx: set.canvas.widthPx,
        heightPx: set.canvas.heightPx,
        ppi: set.canvas.ppi,
        effectsOn: false,
        // WP2's own layer names, so the real matcher and diff work on what this fake writes.
        plates: set.plates.map((p) => ({ index: p.index, name: plateLayerName(p, set.plates.length, set.method), data: Buffer.from(p.plate.data).toString('base64') })),
      };
      return writeFakePsd(psd);
    },
    writeDtgPsd: async ({ layers }) => Buffer.from(`dtg-psd:${layers.map((l) => l.garmentCode).join(',')}`),
    writeDtgPng: async (layer) => Buffer.from(`dtg-png:${layer.garmentCode}`),
    renderFilmPreview: async (plate) => Buffer.from(`film:${plate.index}:${sha256(plate.plate.data).slice(0, 6)}`),
    readScreenPsd: async (bytes): Promise<ParsedScreenPsd> => {
      const psd = readFakePsd(bytes);
      return {
        widthPx: psd.widthPx,
        heightPx: psd.heightPx,
        ppi: psd.ppi,
        plates: psd.plates.map((p) => ({ index: p.index, name: p.name, plate: { width: psd.widthPx, height: psd.heightPx, ppi: psd.ppi, data: new Uint8Array(Buffer.from(p.data, 'base64')) } })),
        garmentLayers: [],
        hasOriginal: true,
        effectsOn: psd.effectsOn,
        warnings: [],
      };
    },
    buildManifest: (input): PackManifest => ({
      schema: 1,
      engineVersion: 'test',
      createdAt: '2026-10-15T00:00:00.000Z',
      designId: input.designId,
      designVersionId: input.designVersionId,
      versionNumber: input.versionNumber,
      placement: input.placement,
      technique: input.technique,
      screenSetKey: input.screenSetKey,
      garmentCodes: input.garmentCodes,
      method: input.method,
      screenCount: input.technique === 'screen' ? (input.plates?.length ?? 0) : null,
      inks: (input.plates ?? []).map((p) => ({
        index: p.index,
        role: p.role,
        hex: p.target.hex,
        clientName: p.clientName ?? '',
        pantone: p.pantone ?? null,
        base: p.base,
        coverage: p.coverage,
        lpi: p.halftone.lpi,
        angleDeg: p.halftone.angleDeg,
        mesh: p.meshSuggestion,
      })),
      files: input.files,
      inputHash: input.inputHash,
    }),
    runChecks: async (input) => {
      fake.checkCalls.push({ technique: input.technique, hadApprovedProof: input.approvedProof !== undefined });
      // As the real checks do: a set where nothing prints has one result, the engine's blocking warning.
      const empty = input.expected.set;
      if (input.technique === 'screen' && empty && empty.plates.length === 0) {
        const reasons = empty.warnings.filter((w) => w.severity === 'block').map((w) => w.message);
        return [{ id: 'plates', title: 'Films', state: 'failed', detail: reasons.length ? reasons.join(' ') : 'Nothing prints on this set, so it has no films.' }];
      }
      const checks: CheckResult[] = [
        { id: 'size', title: 'Size', state: 'passed', detail: 'Pixel size matches the print size.' },
        { id: 'plates', title: 'Films', state: 'passed', detail: 'Every film is binary, none empty or solid.' },
        { id: 'inks_measured', title: 'Inks not measured', state: 'review', detail: 'The proof uses each ink’s target colour.' },
      ];
      checks.push({
        id: 'proof',
        title: 'Proof',
        state: input.approvedProof !== undefined ? options.proofState : 'passed',
        detail: input.approvedProof !== undefined && options.proofState !== 'passed' ? 'The proof differs from the approved one.' : 'Matches the proof the artist approved.',
      });
      if (options.failCheck) checks.push({ id: options.failCheck, title: options.failCheck, state: 'failed', detail: 'Forced to fail by the test.' });
      return checks;
    },
    // The pack module's own pure functions: what a corrected upload is matched and compared with.
    rebuildScreenSet,
    diffScreenPsd,
    renderJobSheet: async (input) => {
      fake.sheets.push(input);
      return Buffer.from(`job-sheet:${input.design.code}:v${input.design.versionNumber}:${input.garments.length} garments:${input.pieces.total} pieces:${input.proofs.length} proofs`);
    },
  };
  return fake;
}

// ---------------------------------------------------------------------------
// Everything together

export interface Fakes {
  deps: Partial<PrintDeps>;
  storage: FakeStorage;
  engine: FakeEngine;
  pack: FakePack;
  /** where each piece of artwork lives, by URL (finaliseArt fills it) */
  artByUrl: Map<string, Buffer>;
  /** staff actions recorded through printDeps().recordActivity */
  activity: { actorId: string; entry: ActivityEntry }[];
  /** the artwork a design is stored with; change it to make a new version */
  setArt: (designId: string, bytes: Buffer) => void;
  /** garment colour codes with no packshot (their proofs are skipped) */
  noPackshot: Set<string>;
  /** how finaliseArt treats a design: 'as_is' (the artist's own file, the default) or 'render' (a 4K final is made) */
  finalise: Map<string, 'as_is' | 'render'>;
  /** the designs finaliseArt was asked about, in order */
  finaliseCalls: string[];
  /** designs whose render fails */
  finaliseFails: Set<string>;
  /** the stand-in worker and the jobs it has started */
  queue: FakeQueue;
  /** tells the fakes where a design's stored art is, and what it is */
  registerDesign: (designId: string, bytes: Buffer) => void;
  /** the sleeve proofs asked for, in order (lib/mockups/sleeve-proof.ts) */
  sleeveProofs: SleeveProofInput[];
  /** 'stub' throws like the contract's stub, so the approval page shows its card; 'no_font' throws the renderer's
   * no-font error (SleeveProofError code 'no_font'), as on a machine without fonts; 'draw' returns an image */
  sleeveProof: { mode: 'stub' | 'no_font' | 'draw' };
}

/** Where seedDesign says a design's print art is stored. */
export const printUrlOf = (designId: string) => `https://art.test/print-${designId}.png`;

export function makeFakes(db: TestDb, opts: { engine?: Partial<FakeEngineOptions>; pack?: Partial<FakePackOptions> } = {}): Fakes {
  const storage = makeFakeStorage();
  const engine = makeFakeEngine(opts.engine);
  const pack = makeFakePack(opts.pack);
  const artByUrl = new Map<string, Buffer>();
  const activity: Fakes['activity'] = [];
  const noPackshot = new Set<string>();
  const finalise = new Map<string, 'as_is' | 'render'>();
  const finaliseCalls: string[] = [];
  const finaliseFails = new Set<string>();
  const queue: FakeQueue = { worker: null, runner: null, pending: [] };
  const sleeveProofs: SleeveProofInput[] = [];
  const sleeveProof: Fakes['sleeveProof'] = { mode: 'stub' };

  const deps: Partial<PrintDeps> = {
    engine: engine.engine,
    pack: pack.pack,
    storage,
    jobs: makeFakeJobs(db, queue),
    uploadWait: { timeoutMs: 3000, intervalMs: 10 },
    loadPackshot: async (_blank, colour, position) => (noPackshot.has(colour) ? null : { image: Buffer.from('garment-photo'), printBox: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 }, position, widthCm: 28 }),
    imageSize: async () => ({ widthPx: 1000, heightPx: 1200 }),
    loadArt: async (version) => {
      if (version.artKey) return storage.getObject(version.artKey);
      const bytes = artByUrl.get(version.artUrl);
      if (!bytes) throw new Error(`No artwork at ${version.artUrl}`);
      return bytes;
    },
    // Like designs.ts finaliseDesignForPrint: a render makes the 4K final the design's print file, once; anything else comes back as it is.
    finaliseArt: async (_storeId, designId) => {
      finaliseCalls.push(designId);
      if (finaliseFails.has(designId)) return { ok: false, error: 'The full-size render did not finish: the model timed out.' };
      const [design] = await db.select().from(schema.designs).where(eq(schema.designs.id, designId)).limit(1);
      if (!design) return { ok: false, error: 'Design not found for this shop.' };
      const params = (design.generationParams ?? {}) as { finalRender?: unknown };
      const url = design.printUrl ?? printUrlOf(designId);
      if (finalise.get(designId) !== 'render' || params.finalRender) {
        return { ok: true, value: { url, widthPx: design.widthPx ?? 1000, heightPx: design.heightPx ?? 1200, source: params.finalRender ? 'final_4k' : design.source, rendered: false } };
      }
      const bytes = Buffer.from(`final-4k:${designId}`);
      const finalUrl = `https://art.test/final-${designId}.png`;
      artByUrl.set(finalUrl, bytes);
      await db
        .update(schema.designs)
        .set({ printUrl: finalUrl, widthPx: 4000, heightPx: 4800, generationParams: { ...params, finalRender: { from: url, at: new Date().toISOString() } } })
        .where(eq(schema.designs.id, designId));
      return { ok: true, value: { url: finalUrl, bytes, widthPx: 4000, heightPx: 4800, source: 'final_4k', rendered: true } };
    },
    sleeveProof: async (input) => {
      sleeveProofs.push(input);
      if (sleeveProof.mode === 'stub') throw new Error('not implemented: PL-C renderSleeveProof');
      if (sleeveProof.mode === 'no_font') throw Object.assign(new Error('The renderer has no font to write the measurements with.'), { code: 'no_font' });
      return Buffer.from(`sleeve-proof:${input.side}:${input.sleeve}:${input.garmentHex}:${input.printWidthCm}x${input.printHeightCm}`);
    },
    // Like lib/services/team.ts recordStaffActivity: a row in staff_activity (the pack history reads it), and a copy for the tests to look at.
    recordActivity: async (actor, entry) => {
      activity.push({ actorId: actor.userId, entry });
      await db.insert(schema.staffActivity).values({
        actorId: actor.userId,
        area: entry.area,
        action: entry.action,
        itemType: entry.itemType ?? null,
        itemId: entry.itemId ?? null,
        detail: entry.detail ?? null,
      });
    },
  };
  const registerDesign = (designId: string, bytes: Buffer) => void artByUrl.set(printUrlOf(designId), bytes);
  return { deps, storage, engine, pack, artByUrl, activity, setArt: registerDesign, noPackshot, finalise, finaliseCalls, finaliseFails, queue, registerDesign, sleeveProofs, sleeveProof };
}

// ---------------------------------------------------------------------------
// Seeds

export const GARMENTS = {
  black: { code: 'C002', name: 'Black', hex: '#1B1C1E', isLight: false },
  navy: { code: 'C727', name: 'French Navy', hex: '#222A3D', isLight: false },
  white: { code: 'C001', name: 'White', hex: '#F3F3F1', isLight: true },
} as const;

/** One blank (a T-shirt) in black, French Navy and white, and the two print services products need. */
export async function seedCatalogue(db: TestDb): Promise<{ blankCode: string }> {
  await db.insert(schema.printServices).values([
    { code: 'dtg', name: 'DTG' },
    { code: 'screen_2c', name: 'Screen print, 2 colours', availableInShop: false },
    { code: 'embroidery', name: 'Embroidery', availableInShop: false },
  ]);
  await db.insert(schema.colours).values(Object.values(GARMENTS).map((g, i) => ({ code: g.code, name: g.name, hex: g.hex, isLight: g.isLight, displayOrder: i })));
  await db.insert(schema.blanks).values({ code: 'STTU169', name: 'Creator', type: 'T-shirts' });
  await db.insert(schema.blankColours).values(Object.values(GARMENTS).map((g) => ({ blankCode: 'STTU169', colourCode: g.code })));
  return { blankCode: 'STTU169' };
}

/** A design with art stored at printUrlOf(id). A generated one is a 1K draft that needs its 4K final. */
export async function seedDesign(db: TestDb, storeId: string, opts: { generated?: boolean } = {}): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.designs).values({
    id,
    storeId,
    source: opts.generated ? 'generated' : 'upload',
    originalUrl: `https://art.test/original-${id}.png`,
    printUrl: printUrlOf(id),
    widthPx: opts.generated ? 1024 : 1000,
    heightPx: opts.generated ? 1280 : 1200,
  });
  return id;
}

export async function seedProduct(
  db: TestDb,
  input: {
    storeId: string;
    designId: string;
    name?: string;
    printServiceCode?: string;
    placement?: { position: string; widthCm: number };
    /** print areas (products.placements); without them the product is a row from before them, with one `placement` */
    areas?: { position: string; widthCm: number; offsetYcm?: number; designId: string | null }[];
  },
): Promise<string> {
  const [row] = await db
    .insert(schema.products)
    .values({
      storeId: input.storeId,
      designId: input.designId,
      blankCode: 'STTU169',
      printServiceCode: input.printServiceCode ?? 'dtg',
      name: input.name ?? 'Underwriter tee',
      ...(input.areas ? { placements: input.areas } : { placement: input.placement ?? { position: 'front_chest', widthCm: 28 } }),
    })
    .returning({ id: schema.products.id });
  return row.id;
}

/** A paid shop sale, waiting in the production queue. */
export async function seedShopOrder(db: TestDb, input: { storeId: string; productId: string; colourCode?: string; qty?: number }): Promise<string> {
  const [order] = await db
    .insert(schema.orders)
    .values({ storeId: input.storeId, orderType: 'pod', status: 'paid', totalAmount: 2500, productionStatus: 'queued', fanEmail: 'fan@merchfrom.test' })
    .returning({ id: schema.orders.id });
  await db.insert(schema.orderItems).values({ orderId: order.id, productId: input.productId, quantity: input.qty ?? 1, priceAtPurchase: 2500, colourCode: input.colourCode ?? 'C002', size: 'M' });
  return order.id;
}

/** A paid run: a bulk order with its quote lines, the order it became, and a backing product per line. */
export async function seedRun(
  db: TestDb,
  input: { storeId: string; designId: string; lines: { colourCode: string; qty: number; printServiceCode: string; extraPlacements?: { position: string; widthCm: number }[] }[] },
): Promise<{ orderId: string; bulkOrderId: string }> {
  const [order] = await db
    .insert(schema.orders)
    .values({ storeId: input.storeId, orderType: 'bulk', status: 'paid', totalAmount: 90000, productionStatus: 'queued', fanEmail: 'artist@merchfrom.test' })
    .returning({ id: schema.orders.id });

  const quoteLines = [];
  for (const line of input.lines) {
    const productId = await seedProduct(db, { storeId: input.storeId, designId: input.designId, name: `Bulk run ${line.colourCode}`, printServiceCode: line.printServiceCode });
    await db.insert(schema.orderItems).values({ orderId: order.id, productId, quantity: line.qty, priceAtPurchase: 900, colourCode: line.colourCode, size: 'M' });
    quoteLines.push({
      productId,
      designId: input.designId,
      blankCode: 'STTU169',
      printServiceCode: line.printServiceCode,
      placement: { position: 'front_chest', widthCm: 28 },
      ...(line.extraPlacements ? { extraPlacements: line.extraPlacements } : {}),
      colourCode: line.colourCode,
      qty: line.qty,
    });
  }
  const [bulk] = await db
    .insert(schema.bulkOrders)
    .values({ storeId: input.storeId, status: 'in_production', orderId: order.id, quote: { lines: quoteLines, totalCents: 90000, currency: 'EUR' } })
    .returning({ id: schema.bulkOrders.id });
  return { orderId: order.id, bulkOrderId: bulk.id };
}

// ---------------------------------------------------------------------------
// The harness: a migrated database, the fakes installed, the services loaded

export interface Harness {
  t: Awaited<ReturnType<typeof setupTestDb>>;
  db: TestDb;
  fakes: Fakes;
  pipeline: typeof PipelineModule;
  printPrep: typeof PrintPrepModule;
  prepress: typeof PrepressModule;
  pantone: typeof PantoneModule;
  inkSystem: typeof InkSystemModule;
  artist: { userId: string; storeId: string };
  /** the owner (role 'admin') */
  owner: Actor;
  designId: string;
  productId: string;
  /** a staff member with this access (and a name, for the history and job sheet) */
  staff: (permissions: PermissionMap, opts?: { suspended?: boolean; name?: string }) => Promise<Actor>;
  /** another design with a product, for a test that needs its own; a generated one is a 1K draft the worker renders at 4K */
  newDesign: (opts?: { generated?: boolean }) => Promise<{ designId: string; productId: string }>;
  /** the default drop: all three colours on the T-shirt, front chest at 28 cm */
  drop: (designId?: string) => PrintDropInput;
  /** prepares the default drop and runs the job the way the worker would */
  prepare: (designId?: string) => Promise<{ jobId: string; designVersionId: string; result: PrintJobResult }>;
  runJob: (jobId: string) => Promise<PrintJobResult>;
  /** every pack row of a design version (default: the first design's latest), oldest first */
  packs: (designVersionId?: string) => Promise<PackRow[]>;
  close: () => Promise<void>;
}

export type PrintDropInput = Parameters<typeof PrintPrepModule.preparePrint>[0];

/** Call before importing anything that touches lib/db: it sets the test database up first. */
export async function bootstrapPrint(opts: Parameters<typeof makeFakes>[1] = {}): Promise<Harness> {
  const t = await setupTestDb();
  const fakes = makeFakes(t.db, opts);
  const pipeline = await import('@/lib/print/pipeline');
  pipeline.overridePrintDeps(fakes.deps);
  const printPrep = await import('@/lib/services/print-prep');
  const prepress = await import('@/lib/services/prepress');
  const pantone = await import('@/lib/services/pantone-library');
  const inkSystem = await import('@/lib/services/ink-system');

  await seedCatalogue(t.db);
  const artist = await seedUser(t.db, { email: 'artist@merchfrom.test', withStore: true });
  // The artist's notes stay in the app: no dev email outbox or Discord rows from the tests.
  await t.db.insert(schema.notificationPrefs).values({ userId: artist.userId, email: false, discordDm: false });
  const owner = await seedUser(t.db, { email: 'owner@merchfrom.test', role: 'admin' });
  const storeId = artist.storeId as string;
  const designId = await seedDesign(t.db, storeId);
  fakes.registerDesign(designId, Buffer.from(`artwork:${designId}`));
  const productId = await seedProduct(t.db, { storeId, designId });
  let staffCount = 0;

  const harness: Harness = {
    t,
    db: t.db,
    fakes,
    pipeline,
    printPrep,
    prepress,
    pantone,
    inkSystem,
    artist: { userId: artist.userId, storeId },
    owner: { userId: owner.userId, role: 'admin' },
    designId,
    productId,
    staff: async (permissions, o = {}) => {
      staffCount += 1;
      const { userId } = await seedUser(t.db, { email: `staff${staffCount}@merchfrom.test`, role: 'staff' });
      await t.db.update(schema.users).set({ displayName: o.name ?? `Staff ${staffCount}` }).where(eq(schema.users.id, userId));
      return { userId, role: 'staff', permissions, suspended: o.suspended ?? false };
    },
    newDesign: async (o = {}) => {
      const id = await seedDesign(t.db, storeId, o);
      fakes.registerDesign(id, Buffer.from(`artwork:${id}`));
      if (o.generated) fakes.finalise.set(id, 'render');
      return { designId: id, productId: await seedProduct(t.db, { storeId, designId: id }) };
    },
    drop: (forDesign = designId) => ({
      storeId,
      userId: artist.userId,
      designId: forDesign,
      blankCode: 'STTU169',
      garmentCodes: [GARMENTS.black.code, GARMENTS.navy.code, GARMENTS.white.code],
      placements: [{ position: 'front_chest', widthMm: 280 }],
    }),
    runJob: (jobId) => runJob(t.db, jobId, (job) => pipeline.handlePrintJob(job)),
    prepare: async (forDesign) => {
      const queued = await printPrep.preparePrint(harness.drop(forDesign));
      if (!queued.ok) throw new Error(`preparePrint failed: ${queued.error}`);
      const result = await harness.runJob(queued.value.jobId);
      return { jobId: queued.value.jobId, designVersionId: queued.value.designVersionId, result };
    },
    packs: async (designVersionId) => {
      const versionId = designVersionId ?? (await printPrep.latestVersion(designId))?.id;
      return versionId ? pipeline.loadPacksForVersion(versionId) : [];
    },
    close: async () => {
      await Promise.all(fakes.queue.pending);
      await t.close();
    },
  };
  fakes.queue.runner = (jobId) => runJob(t.db, jobId, (job) => pipeline.handlePrintJob(job));
  return harness;
}
