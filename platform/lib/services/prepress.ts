// Pre-press audit (WP7): the queue of packs an order needs, the pack detail,
// and the auditor's actions. Every function checks Pre-press access first
// (lib/auth/permissions.ts). Pantone codes appear here and nowhere client-facing.
// PRINT_MOCK=1 returns the sample views in lib/print/mock-views.ts.
//
// Reads throw a PermissionError for someone without View access; actions return
// `{ ok: false, error }` with the same words, so a page can show them as they are.
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { can, PermissionError, type Actor } from '@/lib/auth/permissions';
import { DEFAULT_RECIPE, STANDARD_MAX_SCREENS, EXTRA_SCREEN_CENTS_PER_PIECE, mergeRecipe } from '@/lib/print/defaults';
import { jobSheetPath } from '@/lib/print/job-sheet-link';
import { MOCK_PACK_DETAIL, MOCK_PREPRESS_ROWS } from '@/lib/print/mock-views';
import type {
  CheckResult,
  GarmentColour,
  Hex,
  PackNeed,
  PrintJobInput,
  PrintPlacement,
  PrintTechnique,
  RecipeOverride,
  RerunSettings,
  ScreenMethod,
} from '@/lib/print/types';
import {
  designDisplayName,
  displayVersionNumbers,
  approvalCovers,
  approvalsOfVersion,
  colourSet,
  filesNeedRefresh,
  invalidateApprovals,
  isSuperseded,
  loadCurrentPacks,
  loadGarments,
  loadPacksForVersion,
  notifyArtist,
  packChecks,
  packFiles,
  packInfo,
  packPlacement,
  placementKey,
  positionLabel,
  printDeps,
  requestScreenFilesRefresh,
  samePlacement,
  storedManifest,
  type PackRow,
  type PrintDeps,
  type ReuploadJobResult,
  type StoredManifest,
} from '@/lib/print/pipeline';
import { getActiveInkSystem } from '@/lib/services/ink-system';
import { loadAssignedLibrary, suggestFromLibrary } from '@/lib/services/pantone-library';
import { ensureDesignVersion, latestVersion, productAreas, resolveRecipe } from '@/lib/services/print-prep';
import { runNumberFor } from '@/lib/services/runs';
import { printMockOn } from '@/lib/print/mock-mode';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type PrepressTab = 'waiting' | 'being_fixed' | 'approved' | 'sent_back';
export type PackAuditStatus = 'idle' | 'waiting' | 'being_fixed' | 'approved' | 'sent_back';
export type PackBuildStatus = 'building' | 'ready' | 'failed';

export interface PrepressQueueRow {
  packId: string;
  /** 'Underwriter · v3' */
  designName: string;
  shopName: string;
  thumbUrl: string | null;
  /** shown when there is no thumbnail */
  initials: string;
  /** 'Screen print · Darks' or 'DTG/DTF' */
  fileLabel: string;
  /** 'Black, French Navy' */
  garmentsLabel: string;
  /** '6 of 8', or '–' for DTG/DTF */
  screensLabel: string;
  /** 'Spot', 'Simulated process', 'Index', 'Full colour' */
  methodLabel: string;
  checks: { state: CheckResult['state']; label: string };
  /** 'Run 2 · 120 pieces' or 'Shop sale' */
  neededForLabel: string;
  /** ISO time the pack started waiting */
  waitingSince: string;
  auditStatus: PackAuditStatus;
}

export interface PackTab {
  packId: string;
  /** 'Screen · Darks · 6', 'DTG/DTF · 3 files' */
  label: string;
  technique: PrintTechnique;
  current: boolean;
}

export interface PackFilmView {
  plateIndex: number;
  /** position in press order */
  n: number;
  total: number;
  /** admin only; null until assigned */
  pantone: string | null;
  /** what the client sees */
  clientName: string;
  /** the film's title: the Pantone code, or 'Underbase' / 'Highlight white' */
  label: string;
  base: string;
  hex: Hex;
  /** '9.9%' of the print area */
  coverage: string;
  mesh: number;
  /** the screen ruling; for an index film, its square cells per inch (no halftone, 0°) */
  lpi: number;
  angleDeg: number;
  /** the set's method: an index film is square cells, not halftone dots */
  method: ScreenMethod;
  /** the dot the halftone is made of, from the recipe the pack was built with */
  dotShape: 'round' | 'ellipse';
  /** the films' resolution in pixels per inch: the PSD's own, else the recipe's */
  ppi: number;
  previewUrl: string;
  /** true-size crop, when one was rendered */
  cropUrl: string | null;
  /** a colour ink without a Pantone code yet */
  needsPantone: boolean;
  /** from the house library, when a close colour has a code */
  suggestion: { code: string; deltaE: number } | null;
}

export interface PackGarmentProof {
  garmentCode: string;
  garmentName: string;
  hex: Hex;
  url: string;
}

export interface PackDtgFile {
  garmentCode: string;
  garmentName: string;
  fileName: string;
  proofUrl: string;
  downloadUrl: string;
  note: string;
}

export interface PackEngineView {
  method: string;
  methodReason: string;
  screensWhy: string;
  underbase: string;
  order: string;
  screenSets: string;
}

export interface PackDetailView {
  packId: string;
  designId: string;
  /** 'Underwriter · v3 · Front' */
  title: string;
  /** 'RUN 2 · 120 + 40 PIECES' */
  meta: string;
  shopName: string;
  technique: PrintTechnique;
  screenSetKey: string | null;
  tabs: PackTab[];
  films: PackFilmView[];
  proofs: PackGarmentProof[];
  dtgFiles: PackDtgFile[];
  dtgLoupeUrl: string | null;
  engine: PackEngineView | null;
  checks: CheckResult[];
  history: { at: string; text: string }[];
  auditStatus: PackAuditStatus;
  buildStatus: PackBuildStatus;
  /** the main download: the PSD for a screen pack, a zip of the per-garment PNGs for a DTG/DTF pack (null until it exists) */
  downloadUrl: string | null;
  /** the pack's PSD whichever way it prints: the second link on a DTG/DTF pack (the same file as downloadUrl on a screen pack) */
  psdUrl: string | null;
  /** the design's job sheet: one per design, covering every garment that uses it (lib/services/job-sheets.ts) */
  jobSheetUrl: string | null;
  canWork: boolean;
  canManage: boolean;
  rerunDefaults: Required<Pick<RerunSettings, 'maxScreens' | 'lpi' | 'angleDeg' | 'underbaseChokeMm' | 'trapMm'>> & { method: ScreenMethod };
}

export interface UploadOutcome {
  newPackId: string;
  checks: CheckResult[];
  /** the proof changed beyond the threshold: the artist approves again */
  needsReapproval: boolean;
  /** plain-language list of what differs from the automatic pack */
  changes: string[];
}

function mockOn(): boolean {
  return printMockOn();
}

function requireLevel(actor: Actor, level: 'view' | 'work'): void {
  if (!can(actor, 'prepress', level)) throw new PermissionError('prepress', level);
}

/** The error an action returns for someone without Work access, or null. */
function denied(actor: Actor, level: 'view' | 'work' = 'work'): string | null {
  return can(actor, 'prepress', level) ? null : new PermissionError('prepress', level).message;
}

// ---------------------------------------------------------------------------
// Words

const METHOD_LABELS: Record<string, string> = { spot: 'Spot', index: 'Index', sim_process: 'Simulated process', dtg: 'Full colour' };

function setName(key: string | null, garmentNames: Map<string, string>): string {
  if (!key) return '';
  if (key === 'darks') return 'Darks';
  if (key === 'lights') return 'Lights';
  return garmentNames.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function pieces(n: number): string {
  return `${n} ${n === 1 ? 'piece' : 'pieces'}`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function needsOf(pack: PackRow): PackNeed[] {
  return Array.isArray(pack.neededFor) ? (pack.neededFor as PackNeed[]) : [];
}

async function needLabel(need: PackNeed, runLabels: Map<string, string>): Promise<string> {
  if (need.kind === 'shop_order') return 'Shop sale';
  let label = runLabels.get(need.bulkOrderId);
  if (!label) {
    const n = await runNumberFor(need.bulkOrderId).catch(() => null);
    label = n === null ? 'Run' : `Run ${n}`;
    runLabels.set(need.bulkOrderId, label);
  }
  return `${label} · ${pieces(need.qty)}`;
}

function checkSummary(checks: CheckResult[], buildStatus: string): PrepressQueueRow['checks'] {
  if (buildStatus === 'failed') return { state: 'failed', label: 'Build failed' };
  if (buildStatus !== 'ready') return { state: 'review', label: 'Building' };
  const failed = checks.filter((c) => c.state === 'failed').length;
  if (failed > 0) return { state: 'failed', label: `${failed} failed` };
  const review = checks.filter((c) => c.state === 'review').length;
  if (review > 0) return { state: 'review', label: `${review} to review` };
  return { state: 'passed', label: 'Passed' };
}

function initialsOf(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => w[0]).join('') : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

// ---------------------------------------------------------------------------
// The queue

type VersionRow = typeof schema.designVersions.$inferSelect;
type JoinedPack = { pack: PackRow; version: VersionRow };

async function currentPacksWithVersion(statuses?: PackAuditStatus[]): Promise<JoinedPack[]> {
  const rows = await db
    .select({ pack: schema.productionPacks, version: schema.designVersions })
    .from(schema.productionPacks)
    .innerJoin(schema.designVersions, eq(schema.productionPacks.designVersionId, schema.designVersions.id))
    .where(and(eq(schema.productionPacks.buildStatus, 'ready'), statuses ? inArray(schema.productionPacks.auditStatus, statuses) : undefined))
    .orderBy(asc(schema.productionPacks.createdAt), asc(schema.productionPacks.id));
  return rows.filter((r) => !isSuperseded(r.pack));
}

async function garmentNameMap(codes: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(codes)];
  if (unique.length === 0) return new Map();
  const rows = await db.select({ code: schema.colours.code, name: schema.colours.name }).from(schema.colours).where(inArray(schema.colours.code, unique));
  return new Map(rows.map((r) => [r.code, r.name]));
}

async function publicUrl(key: string, visibility: 'public' | 'private'): Promise<string | null> {
  try {
    return await printDeps().storage.objectUrl(key, visibility);
  } catch {
    return null;
  }
}

export async function listPrepressQueue(actor: Actor, input: { tab: PrepressTab; search?: string }): Promise<{ rows: PrepressQueueRow[]; counts: Record<PrepressTab, number> }> {
  requireLevel(actor, 'view');
  if (mockOn()) {
    const rows = input.tab === 'waiting' ? MOCK_PREPRESS_ROWS : [];
    return { rows, counts: { waiting: MOCK_PREPRESS_ROWS.length, being_fixed: 1, approved: 0, sent_back: 0 } };
  }

  const queued = await currentPacksWithVersion(['waiting', 'being_fixed', 'approved', 'sent_back']);
  const counts: Record<PrepressTab, number> = { waiting: 0, being_fixed: 0, approved: 0, sent_back: 0 };
  for (const { pack } of queued) counts[pack.auditStatus as PrepressTab] += 1;

  const inTab = queued.filter(({ pack }) => pack.auditStatus === input.tab);
  if (inTab.length === 0) return { rows: [], counts };

  const designIds = [...new Set(inTab.map((r) => r.version.designId))];
  const shownVersions = await displayVersionNumbers(inTab.map((r) => r.version));
  const designRows = await db
    .select({ id: schema.designs.id, shopName: schema.artistStores.name })
    .from(schema.designs)
    .innerJoin(schema.artistStores, eq(schema.designs.storeId, schema.artistStores.id))
    .where(inArray(schema.designs.id, designIds));
  const shops = new Map(designRows.map((d) => [d.id, d.shopName]));
  const names = new Map<string, string>();
  for (const id of designIds) names.set(id, await designDisplayName(id));
  const garmentNames = await garmentNameMap(inTab.flatMap((r) => r.pack.garmentCodes as string[]));
  const runLabels = new Map<string, string>();

  const rows: PrepressQueueRow[] = [];
  for (const { pack, version } of inTab) {
    const designId = version.designId;
    const needs = needsOf(pack);
    const proof = packFiles(pack).find((f) => f.kind === 'proof');
    const designName = names.get(designId) ?? 'Design';
    const codes = pack.garmentCodes as string[];
    const count = pack.screenCount;
    const first = needs[0];
    const more = needs.length > 1 ? ` +${needs.length - 1} more` : '';
    rows.push({
      packId: pack.id,
      designName: `${designName} · v${shownVersions.get(version.id) ?? version.version}`,
      shopName: shops.get(designId) ?? '',
      thumbUrl: proof ? await publicUrl(proof.key, proof.visibility) : null,
      initials: initialsOf(designName),
      fileLabel: pack.technique === 'screen' ? `Screen print · ${setName(pack.screenSetKey, garmentNames)}` : 'DTG/DTF',
      garmentsLabel: codes.map((c) => garmentNames.get(c) ?? c).join(', '),
      screensLabel: pack.technique === 'screen' && count ? (count <= STANDARD_MAX_SCREENS ? `${count} of ${STANDARD_MAX_SCREENS}` : `${count} (${STANDARD_MAX_SCREENS} standard)`) : '–',
      methodLabel: METHOD_LABELS[pack.method ?? 'dtg'] ?? 'Full colour',
      checks: checkSummary(packChecks(pack), pack.buildStatus),
      neededForLabel: first ? `${await needLabel(first, runLabels)}${more}` : 'Not needed yet',
      waitingSince: (first?.at ? new Date(first.at) : pack.updatedAt).toISOString(),
      auditStatus: pack.auditStatus as PackAuditStatus,
    });
  }

  const search = input.search?.trim().toLowerCase();
  const matching = search
    ? rows.filter((r) => [r.designName, r.shopName, r.fileLabel, r.garmentsLabel, r.neededForLabel].some((field) => field.toLowerCase().includes(search)))
    : rows;
  matching.sort((a, b) => a.waitingSince.localeCompare(b.waitingSince));
  return { rows: matching, counts };
}

// ---------------------------------------------------------------------------
// The pack detail

async function loadPack(packId: string): Promise<PackRow | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packId)) return null;
  const [row] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, packId)).limit(1);
  return row ?? null;
}

const ACTIVITY_WORDS: Record<string, (detail: Record<string, unknown>) => string> = {
  'pack.approve': () => 'approved the pack.',
  'pack.unapprove': () => 'withdrew the approval of the pack.',
  'pack.rerun': (d) => `ran the pack again${typeof d.summary === 'string' && d.summary ? ` (${d.summary})` : ''}.`,
  'pack.upload': (d) => `uploaded a corrected PSD${typeof d.filename === 'string' ? `, ${d.filename}` : ''}.`,
  'pack.send_back': (d) => `sent it back to the artist${typeof d.note === 'string' ? `: ${d.note}` : '.'}`,
  'pantone.assign': (d) => `entered ${String(d.code ?? 'a Pantone code')} for film ${String(d.plateIndex ?? '?')}.`,
};

async function packHistory(pack: PackRow, designVersionId: string, versionNumber: number): Promise<{ at: string; text: string }[]> {
  const events: { at: Date; text: string }[] = [];

  const approvals = await db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designVersionId, designVersionId)).orderBy(asc(schema.designApprovals.approvedAt));
  for (const a of approvals) {
    const colours = (a.garmentCodes as string[]).length;
    events.push({ at: a.approvedAt, text: `Artist approved version ${versionNumber} (${colours} garment ${colours === 1 ? 'colour' : 'colours'}).` });
    if (a.invalidatedAt) events.push({ at: a.invalidatedAt, text: `Approval withdrawn${a.invalidatedReason ? `: ${a.invalidatedReason}` : '.'}` });
  }

  events.push({ at: pack.createdAt, text: pack.correctedFromPackId ? 'Pack generated to replace an earlier one.' : 'Pack generated.' });
  if (isSuperseded(pack)) events.push({ at: pack.updatedAt, text: 'A newer pack replaced this one.' });

  const runLabels = new Map<string, string>();
  for (const need of needsOf(pack)) {
    const at = new Date(need.at);
    events.push({ at: Number.isNaN(at.getTime()) ? pack.createdAt : at, text: need.kind === 'shop_order' ? 'A shop sale needs this pack.' : `${(await needLabel(need, runLabels)).replace(' · ', ' ordered: ')}.` });
  }

  const activity = await db
    .select({ at: schema.staffActivity.createdAt, action: schema.staffActivity.action, detail: schema.staffActivity.detail, name: schema.users.displayName, email: schema.users.email })
    .from(schema.staffActivity)
    .innerJoin(schema.users, eq(schema.staffActivity.actorId, schema.users.id))
    .where(and(eq(schema.staffActivity.itemType, 'production_pack'), eq(schema.staffActivity.itemId, pack.id)))
    .orderBy(asc(schema.staffActivity.createdAt));
  for (const row of activity) {
    const words = ACTIVITY_WORDS[row.action]?.((row.detail as Record<string, unknown> | null) ?? {});
    if (words) events.push({ at: row.at, text: `${row.name?.trim() || row.email.split('@')[0]} ${words}` });
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  return events.map((e) => ({ at: e.at.toISOString(), text: e.text }));
}

/** 'RUN 2 · 120 + 40 PIECES': the orders that need the design's packs for this placement. */
async function metaLine(siblings: PackRow[], runLabels: Map<string, string>): Promise<string> {
  const byRun = new Map<string, number[]>();
  let shop = false;
  for (const pack of siblings) {
    for (const need of needsOf(pack)) {
      if (need.kind === 'shop_order') shop = true;
      else byRun.set(need.bulkOrderId, [...(byRun.get(need.bulkOrderId) ?? []), need.qty]);
    }
  }
  const parts: string[] = [];
  for (const [bulkOrderId, quantities] of byRun) {
    const label = (await needLabel({ kind: 'run', bulkOrderId, qty: 0, at: '' }, runLabels)).split(' · ')[0];
    const total = quantities.reduce((a, b) => a + b, 0);
    parts.push(`${label.toUpperCase()} · ${quantities.join(' + ')} ${total === 1 ? 'PIECE' : 'PIECES'}`);
  }
  if (shop) parts.push('SHOP SALE');
  return parts.join(' · ') || 'NOT NEEDED YET';
}

function engineView(pack: PackRow, siblings: PackRow[], garmentNames: Map<string, string>): PackEngineView | null {
  const manifest = storedManifest(pack);
  const info = packInfo(pack);
  if (pack.technique !== 'screen' || !manifest || !info) return null;

  const count = pack.screenCount ?? manifest.inks.length;
  const colours = manifest.inks.filter((i) => i.role === 'ink').length;
  const hasUnderbase = manifest.inks.some((i) => i.role === 'underbase');
  const hasHighlight = manifest.inks.some((i) => i.role === 'highlight');
  const over = Math.max(0, count - STANDARD_MAX_SCREENS);
  const parts = [hasUnderbase ? 'underbase' : null, `${colours} ${colours === 1 ? 'colour' : 'colours'}`, hasHighlight ? 'highlight white' : null].filter(Boolean).join(', ');
  const surcharge = over === 0 ? 'No surcharge.' : `${over} above the standard ${STANDARD_MAX_SCREENS}: €${(over * EXTRA_SCREEN_CENTS_PER_PIECE) / 100} more per piece on a run.`;

  const base = manifest.inks.find((i) => i.role === 'underbase')?.base.replace(/\s*·\s*flash.*$/i, '');
  const choke = info.jobInput.recipe.underbaseChokeMm;
  const order = [hasUnderbase ? 'Underbase, flash' : null, 'colours from light to dark', hasHighlight ? 'highlight white last' : null].filter(Boolean).join(', ');

  const sets = siblings.filter((p) => p.technique === 'screen' && p.screenSetKey);
  const sentences = sets.map((p) => {
    const names = (p.garmentCodes as string[]).map((c) => garmentNames.get(c) ?? c);
    return names.length > 1 ? `${joinNames(names)} share one set.` : `${names[0] ?? 'One colour'} has its own.`;
  });

  return {
    method: METHOD_LABELS[manifest.method] ?? 'Spot',
    methodReason: info.methodReason ?? '',
    screensWhy: `${count <= STANDARD_MAX_SCREENS ? `${count} of ${STANDARD_MAX_SCREENS}` : `${count} screens`}: ${parts}. ${surcharge}`,
    underbase: hasUnderbase ? `${base ?? 'White'}, choked ${choke} mm, then flash.` : 'No underbase: this set prints without one.',
    order: `${order.charAt(0).toUpperCase()}${order.slice(1)}.`,
    screenSets: sentences.join(' '),
  };
}

export async function getPackDetail(actor: Actor, packId: string): Promise<PackDetailView | null> {
  requireLevel(actor, 'view');
  if (mockOn()) return { ...MOCK_PACK_DETAIL, packId, canWork: can(actor, 'prepress', 'work'), canManage: can(actor, 'prepress', 'manage') };

  const pack = await loadPack(packId);
  if (!pack) return null;
  const deps = printDeps();
  const [version] = await db.select().from(schema.designVersions).where(eq(schema.designVersions.id, pack.designVersionId)).limit(1);
  if (!version) return null;
  const [design] = await db
    .select({ id: schema.designs.id, shopName: schema.artistStores.name })
    .from(schema.designs)
    .innerJoin(schema.artistStores, eq(schema.designs.storeId, schema.artistStores.id))
    .where(eq(schema.designs.id, version.designId))
    .limit(1);

  const info = packInfo(pack);
  const manifest = storedManifest(pack);
  const placement = packPlacement(pack);
  const designName = await designDisplayName(version.designId);
  const shownVersion = (await displayVersionNumbers([version])).get(version.id) ?? version.version;

  const siblings = (await loadCurrentPacks(version.id)).filter((p) => samePlacement(packPlacement(p), placement) && (packInfo(p)?.blankCode ?? '') === (info?.blankCode ?? ''));
  const allCodes = [...new Set(siblings.flatMap((p) => p.garmentCodes as string[]).concat(pack.garmentCodes as string[]))];
  const garmentNames = await garmentNameMap(allCodes);
  const garments = info ? await loadGarments(info.blankCode, allCodes) : [];
  const garmentByCode = new Map<string, GarmentColour>(garments.map((g) => [g.code, g]));
  const runLabels = new Map<string, string>();

  const tabs: PackTab[] = [...siblings]
    .sort((a, b) => (a.technique === b.technique ? (a.screenSetKey ?? '').localeCompare(b.screenSetKey ?? '') : a.technique === 'screen' ? -1 : 1))
    .map((p) => ({
      packId: p.id,
      technique: p.technique as PrintTechnique,
      current: p.id === pack.id,
      label: p.technique === 'screen' ? `Screen · ${setName(p.screenSetKey, garmentNames)} · ${p.screenCount ?? 0}` : `DTG/DTF · ${(p.garmentCodes as string[]).length} ${(p.garmentCodes as string[]).length === 1 ? 'file' : 'files'}`,
    }));

  // Films (screen).
  const files = packFiles(pack);
  const recipe = info?.jobInput.recipe ?? DEFAULT_RECIPE;
  const screenPsd = files.find((f) => f.kind === 'screen_psd');
  const films: PackFilmView[] = [];
  if (pack.technique === 'screen' && manifest) {
    const library = manifest.inks.some((i) => i.role === 'ink' && !i.pantone) ? await loadAssignedLibrary() : [];
    for (const ink of manifest.inks) {
      const preview = files.find((f) => f.kind === 'film_preview' && f.plateIndex === ink.index);
      const needsPantone = ink.role === 'ink' && !ink.pantone;
      const lab = info?.inkLabs?.[String(ink.index)];
      const hit = needsPantone && lab ? suggestFromLibrary(library, lab) : null;
      films.push({
        plateIndex: ink.index,
        n: ink.index,
        total: manifest.inks.length,
        pantone: ink.role === 'ink' ? (ink.pantone ?? null) : null,
        clientName: ink.clientName,
        label: ink.role === 'underbase' ? 'Underbase' : ink.role === 'highlight' ? 'Highlight white' : (ink.pantone ?? `Ink ${ink.index}`),
        base: ink.base,
        hex: ink.hex,
        coverage: `${(Math.round(ink.coverage * 1000) / 10).toFixed(1)}%`,
        mesh: ink.mesh,
        lpi: ink.lpi,
        angleDeg: ink.angleDeg,
        method: manifest.method === 'dtg' ? 'spot' : manifest.method,
        dotShape: recipe.halftone.dot,
        ppi: screenPsd?.ppi ?? info?.canvas?.ppi ?? recipe.screenPpi,
        previewUrl: preview ? ((await publicUrl(preview.key, preview.visibility)) ?? '') : '',
        cropUrl: null,
        needsPantone,
        suggestion: hit,
      });
    }
  }

  // Proofs, and the DTG/DTF files.
  const proofs: PackGarmentProof[] = [];
  const dtgFiles: PackDtgFile[] = [];
  for (const proof of files.filter((f) => f.kind === 'proof' && f.garmentCode)) {
    const garment = garmentByCode.get(proof.garmentCode as string);
    const url = (await publicUrl(proof.key, proof.visibility)) ?? '';
    proofs.push({ garmentCode: proof.garmentCode as string, garmentName: garment?.name ?? garmentNames.get(proof.garmentCode as string) ?? (proof.garmentCode as string), hex: garment?.hex ?? '#808080', url });
  }
  if (pack.technique === 'dtg_dtf') {
    for (const png of files.filter((f) => f.kind === 'dtg_png' && f.garmentCode)) {
      const code = png.garmentCode as string;
      const garment = garmentByCode.get(code);
      const proof = proofs.find((p) => p.garmentCode === code);
      dtgFiles.push({
        garmentCode: code,
        garmentName: garment?.name ?? garmentNames.get(code) ?? code,
        fileName: png.name,
        proofUrl: proof?.url ?? '',
        downloadUrl: await deps.storage.objectUrl(png.key, png.visibility, { download: png.name }).catch(() => ''),
        note: garment?.isLight ? 'White areas print no ink on this colour.' : 'The colour of the shirt is left out, and white prints in white ink.',
      });
    }
  }

  const loupe = files.find((f) => f.kind === 'loupe');
  const psd = files.find((f) => f.kind === (pack.technique === 'screen' ? 'screen_psd' : 'dtg_psd'));
  const psdUrl = psd ? await deps.storage.objectUrl(psd.key, psd.visibility, { download: psd.name }).catch(() => null) : null;
  // A DTG/DTF pack downloads as PNGs: the zip its build made, or nothing yet for a pack built before it did.
  const zip = pack.technique === 'dtg_dtf' ? info?.pngZip : null;
  const pngsUrl = zip ? await deps.storage.objectUrl(zip.key, 'private', { download: zip.name }).catch(() => null) : null;
  const usedMethod = pack.method && pack.method !== 'dtg' ? (pack.method as ScreenMethod) : recipe.method === 'auto' ? 'spot' : recipe.method;

  return {
    packId: pack.id,
    designId: version.designId,
    title: `${designName} · v${shownVersion} · ${positionLabel(placement.position)}`,
    meta: await metaLine(siblings.length > 0 ? siblings : [pack], runLabels),
    shopName: design?.shopName ?? '',
    technique: pack.technique as PrintTechnique,
    screenSetKey: pack.screenSetKey,
    tabs,
    films,
    proofs,
    dtgFiles,
    dtgLoupeUrl: pack.technique === 'dtg_dtf' && loupe ? await publicUrl(loupe.key, loupe.visibility) : null,
    engine: engineView(pack, siblings, garmentNames),
    checks: packChecks(pack),
    history: await packHistory(pack, version.id, shownVersion),
    auditStatus: pack.auditStatus as PackAuditStatus,
    buildStatus: pack.buildStatus as PackBuildStatus,
    downloadUrl: pack.technique === 'screen' ? psdUrl : pngsUrl,
    psdUrl,
    jobSheetUrl: jobSheetPath(version.designId),
    canWork: can(actor, 'prepress', 'work'),
    canManage: can(actor, 'prepress', 'manage'),
    rerunDefaults: {
      method: usedMethod,
      maxScreens: pack.screenCount ?? recipe.maxScreens,
      lpi: recipe.halftone.lpi,
      angleDeg: recipe.halftone.angleDeg,
      underbaseChokeMm: recipe.underbaseChokeMm,
      trapMm: recipe.trapMm,
    },
  };
}

// ---------------------------------------------------------------------------
// Actions

async function actorLabel(actor: Actor): Promise<string> {
  const [row] = await db.select({ name: schema.users.displayName, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, actor.userId)).limit(1);
  return row?.name?.trim() || row?.email || 'Pre-press';
}

/** Pre-press approves a pack: the files are fit to print, so an order can start on it. */
export async function approvePack(actor: Actor, packId: string): Promise<ServiceResult<null>> {
  const no = denied(actor);
  if (no) return { ok: false, error: no };
  if (mockOn()) return { ok: true, value: null };

  const pack = await loadPack(packId);
  if (!pack) return { ok: false, error: 'Pack not found.' };
  if (pack.buildStatus !== 'ready') return { ok: false, error: "This pack isn't built yet." };
  if (isSuperseded(pack)) return { ok: false, error: 'A newer pack replaced this one. Open the newer one.' };
  if (pack.auditStatus === 'approved') return { ok: true, value: null };
  if (pack.auditStatus === 'sent_back') return { ok: false, error: 'This pack was sent back to the artist. It can be approved once they answer.' };

  const failed = packChecks(pack).filter((c) => c.state === 'failed');
  if (failed.length > 0) return { ok: false, error: `A check failed (${failed.map((c) => c.title).join(', ')}). Run the pack again or upload a corrected PSD first.` };

  const manifest = storedManifest(pack);
  if (pack.technique === 'screen' && manifest) {
    const unnamed = manifest.inks.filter((i) => i.role === 'ink' && !i.pantone);
    if (unnamed.length > 0) {
      return { ok: false, error: `Enter the Pantone code for ${unnamed.length === 1 ? 'film' : 'films'} ${unnamed.map((i) => i.index).join(', ')} first: the pressroom mixes each ink from its code.` };
    }
    if (filesNeedRefresh(pack)) {
      await requestScreenFilesRefresh(pack.id, actor.userId).catch(() => undefined);
      return { ok: false, error: 'The film names are being updated with the new Pantone codes. Try again in a minute.' };
    }
  }

  // The re-approval rule (Plan section 8): the artist was asked to look at a changed proof, so nothing
  // from this version is signed off for production until they approve it again.
  const approvals = await approvalsOfVersion(pack.designVersionId);
  if (approvals.length > 0 && approvals.every((a) => a.invalidatedAt)) {
    return { ok: false, error: "The artist was asked to approve a changed proof and hasn't yet. Approve the pack once they have." };
  }

  // Only the pack as it was checked here: a re-run, a corrected upload or a send-back in between wins.
  const now = new Date();
  const moved = await db
    .update(schema.productionPacks)
    .set({ auditStatus: 'approved', auditedBy: actor.userId, auditedAt: now, updatedAt: now })
    .where(
      and(
        eq(schema.productionPacks.id, pack.id),
        eq(schema.productionPacks.auditStatus, pack.auditStatus),
        eq(schema.productionPacks.buildStatus, 'ready'),
        pack.manifest === null ? sql`${schema.productionPacks.manifest} is null` : sql`${schema.productionPacks.manifest} = ${JSON.stringify(pack.manifest)}::jsonb`,
      ),
    )
    .returning({ id: schema.productionPacks.id });
  if (moved.length === 0) return { ok: false, error: 'The pack changed while you were approving it. Look it over again.' };

  // The design's job sheet shows the sign-off (who and when are on the pack row), so the next time it is opened it says so.
  await printDeps().recordActivity(actor, { area: 'prepress', action: 'pack.approve', itemType: 'production_pack', itemId: pack.id });
  // The orders waiting on it reach the stations (and the press board) once all their files are approved.
  await syncProductionJobsAfter('a pack was approved');
  return { ok: true, value: null };
}

/** Brings the production stations' jobs up to date (lib/services/production-progress.ts, loaded when called: it imports
 * this module). Never throws. */
async function syncProductionJobsAfter(reason: string): Promise<void> {
  try {
    const { syncProductionJobsQuietly } = await import('@/lib/services/production-progress');
    await syncProductionJobsQuietly(reason);
  } catch (err) {
    console.error(`[prepress] could not update the production jobs after ${reason}:`, err instanceof Error ? err.message : err);
  }
}

/** Production stages past the queue: once an order is in one of them, the shirts are being made from the pack's files. */
const STARTED_PRODUCTION = ['printing', 'packed', 'shipped', 'delivered'] as const;

/** The orders that need the pack and have started production. */
async function ordersInProduction(pack: PackRow): Promise<string[]> {
  const needs = needsOf(pack);
  const ids = new Set<string>();
  const runs: string[] = [];
  for (const need of needs) {
    const orderId = (need as { orderId?: string }).orderId;
    if (orderId) ids.add(orderId);
    else if (need.kind === 'run' && need.bulkOrderId) runs.push(need.bulkOrderId);
  }
  if (runs.length > 0) {
    const rows = await db.select({ orderId: schema.bulkOrders.orderId }).from(schema.bulkOrders).where(inArray(schema.bulkOrders.id, runs));
    for (const row of rows) if (row.orderId) ids.add(row.orderId);
  }
  if (ids.size === 0) return [];
  const started = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(inArray(schema.orders.id, [...ids]), inArray(schema.orders.productionStatus, [...STARTED_PRODUCTION])));
  return started.map((r) => r.id);
}

/** Takes pre-press's approval of a pack back (the Undo on the approved banner), while no order has
 * started production from it. The pack goes back to waiting for audit when an order needs it, and to
 * idle when none does; the design's job sheet loses its sign-off. After production has started the
 * files are in use, so this says so and changes nothing. */
export async function unapprovePack(who: ActingAs, packId: string): Promise<ServiceResult<null>> {
  const actor = asActor(who);
  const no = denied(actor);
  if (no) return { ok: false, error: no };
  if (mockOn()) return { ok: true, value: null };

  const pack = await loadPack(packId);
  if (!pack) return { ok: false, error: 'Pack not found.' };
  if (isSuperseded(pack)) return { ok: false, error: 'A newer pack replaced this one. Open the newer one.' };
  const notApproved = { ok: false, error: "This pack isn't approved, so there is nothing to undo." } as const;
  if (pack.auditStatus !== 'approved') return notApproved;

  if ((await ordersInProduction(pack)).length > 0) {
    return { ok: false, error: "Production has already started from this pack, so its approval can't be undone." };
  }

  // Only a pack that is still approved moves: two people clicking Undo make one change.
  const now = new Date();
  const back: PackAuditStatus = needsOf(pack).length > 0 ? 'waiting' : 'idle';
  const moved = await db
    .update(schema.productionPacks)
    .set({ auditStatus: back, auditedBy: null, auditedAt: null, updatedAt: now })
    .where(and(eq(schema.productionPacks.id, pack.id), eq(schema.productionPacks.auditStatus, 'approved')))
    .returning({ id: schema.productionPacks.id });
  if (moved.length === 0) return notApproved;

  await printDeps().recordActivity(actor, { area: 'prepress', action: 'pack.unapprove', itemType: 'production_pack', itemId: pack.id });
  return { ok: true, value: null };
}

const METHODS: readonly ScreenMethod[] = ['spot', 'index', 'sim_process'];

/** Words for a re-run's settings, for the activity log. */
function settingsSummary(settings: RerunSettings): string {
  const bits: string[] = [];
  if (settings.method) bits.push(METHOD_LABELS[settings.method].toLowerCase());
  if (settings.maxScreens !== undefined) bits.push(`${settings.maxScreens} screens`);
  if (settings.lpi !== undefined) bits.push(`${settings.lpi} lpi`);
  if (settings.angleDeg !== undefined) bits.push(`${settings.angleDeg}°`);
  if (settings.underbaseChokeMm !== undefined) bits.push(`choke ${settings.underbaseChokeMm} mm`);
  if (settings.trapMm !== undefined) bits.push(`trap ${settings.trapMm} mm`);
  if (settings.inkSubstitutions?.length) bits.push(`${settings.inkSubstitutions.length} ink${settings.inkSubstitutions.length === 1 ? '' : 's'} changed`);
  return bits.join(', ');
}

function inRange(value: number | undefined, min: number, max: number): boolean {
  return value === undefined || (Number.isFinite(value) && value >= min && value <= max);
}

/** The settings as a recipe override, or what is wrong with them. */
function recipeFromSettings(settings: RerunSettings, manifest: StoredManifest | null, technique: PrintTechnique): { ok: true; value: RecipeOverride } | { ok: false; error: string } {
  if (settings.method !== undefined && !METHODS.includes(settings.method)) return { ok: false, error: 'The method must be spot, index or simulated process.' };
  if (settings.maxScreens !== undefined && (!Number.isInteger(settings.maxScreens) || settings.maxScreens < 1 || settings.maxScreens > 15)) return { ok: false, error: 'Screens must be a whole number from 1 to 15.' };
  if (!inRange(settings.lpi, 20, 100)) return { ok: false, error: 'Lines per inch must be between 20 and 100.' };
  if (!inRange(settings.angleDeg, 0, 90)) return { ok: false, error: 'The angle must be between 0 and 90 degrees.' };
  if (!inRange(settings.underbaseChokeMm, 0, 2)) return { ok: false, error: 'The underbase choke must be between 0 and 2 mm.' };
  if (!inRange(settings.trapMm, 0, 2)) return { ok: false, error: 'The trap must be between 0 and 2 mm.' };

  const override: RecipeOverride = {};
  if (settings.method !== undefined) override.method = settings.method;
  if (settings.maxScreens !== undefined) override.maxScreens = settings.maxScreens;
  if (settings.lpi !== undefined || settings.angleDeg !== undefined) {
    override.halftone = { ...(settings.lpi !== undefined ? { lpi: settings.lpi } : {}), ...(settings.angleDeg !== undefined ? { angleDeg: settings.angleDeg } : {}) };
  }
  if (settings.underbaseChokeMm !== undefined) override.underbaseChokeMm = settings.underbaseChokeMm;
  if (settings.trapMm !== undefined) override.trapMm = settings.trapMm;

  const substitutions = settings.inkSubstitutions ?? [];
  if (substitutions.length > 0) {
    if (technique !== 'screen' || !manifest) return { ok: false, error: 'Inks can only be changed on a screen pack.' };
    const colourInks = manifest.inks.filter((i) => i.role === 'ink').sort((a, b) => a.index - b.index);
    const locked = colourInks.map((i) => i.hex);
    for (const sub of substitutions) {
      const at = colourInks.findIndex((i) => i.index === sub.plateIndex);
      if (at < 0) return { ok: false, error: `Film ${sub.plateIndex} is not a colour ink, so it can't be changed.` };
      const hex = /^#[0-9a-fA-F]{6}$/.test(sub.hex) ? sub.hex.toUpperCase() : null;
      if (!hex) return { ok: false, error: `${sub.hex} is not a colour. Use a code like #5456AC.` };
      locked[at] = hex;
    }
    // Changed inks keep every film the pack has, so they can't also fit in fewer screens: the engine would drop inks.
    if (settings.maxScreens !== undefined && settings.maxScreens < manifest.inks.length) {
      return { ok: false, error: `Changing inks keeps all ${manifest.inks.length} films, more than the ${settings.maxScreens} screens asked for. Change the inks first, then the screen count.` };
    }
    override.lockedInks = locked;
  }
  return { ok: true, value: override };
}

/** Runs the pack again with new settings. The result replaces this pack and goes back to the auditor. */
export async function rerunPack(actor: Actor, packId: string, settings: RerunSettings): Promise<ServiceResult<{ jobId: string }>> {
  const no = denied(actor);
  if (no) return { ok: false, error: no };
  if (mockOn()) return { ok: true, value: { jobId: 'mock-job' } };

  const pack = await loadPack(packId);
  if (!pack) return { ok: false, error: 'Pack not found.' };
  if (pack.buildStatus === 'building') return { ok: false, error: 'This pack is still being built.' };
  if (isSuperseded(pack)) return { ok: false, error: 'A newer pack replaced this one. Run the newer one.' };
  const info = packInfo(pack);
  if (!info) return { ok: false, error: 'This pack was built before its settings were kept, so it cannot be run again. Ask the artist to prepare the print files again.' };

  const technique = pack.technique as PrintTechnique;
  const override = recipeFromSettings(settings, storedManifest(pack), technique);
  if (!override.ok) return override;

  const deps = printDeps();
  const input: PrintJobInput = {
    ...info.jobInput,
    techniques: [technique],
    recipe: mergeRecipe(info.jobInput.recipe, override.value),
    rerun: { packId: pack.id, settings },
    reupload: undefined,
  };
  const busy = await changeUnderWay(pack, deps.jobs.hashJobInput(input));
  if (busy) return { ok: false, error: busy };
  const queued = await deps.jobs.enqueuePrintJob({ kind: 'rerun', input, createdBy: actor.userId });

  if (pack.auditStatus === 'waiting') {
    await db.update(schema.productionPacks).set({ auditStatus: 'being_fixed', updatedAt: new Date() }).where(eq(schema.productionPacks.id, pack.id));
  }
  await deps.recordActivity(actor, { area: 'prepress', action: 'pack.rerun', itemType: 'production_pack', itemId: pack.id, detail: { settings, summary: settingsSummary(settings) } });
  return { ok: true, value: { jobId: queued.jobId } };
}

/** One change to a pack at a time. A re-run and a corrected upload each start from this pack, so a second
 * one queued while the first is under way would replace the first's result and its change would be lost.
 * The same request again is not a second change (the queue reuses its job). Pantone refreshes don't count:
 * they only rewrite labels. Returns why not, or null. */
async function changeUnderWay(pack: PackRow, inputHash: string): Promise<string | null> {
  const live = await db
    .select({ kind: schema.printJobs.kind, input: schema.printJobs.input, inputHash: schema.printJobs.inputHash })
    .from(schema.printJobs)
    .where(
      and(
        inArray(schema.printJobs.status, ['queued', 'running']),
        inArray(schema.printJobs.kind, ['rerun', 'reupload']),
        sql`(${schema.printJobs.input} -> 'rerun' ->> 'packId' = ${pack.id} or ${schema.printJobs.input} -> 'reupload' ->> 'packId' = ${pack.id})`,
      ),
    );
  const ownPsd = packFiles(pack).find((f) => f.kind === 'screen_psd')?.key;
  const other = live.find((job) => job.inputHash !== inputHash && !(job.kind === 'reupload' && (job.input as PrintJobInput).reupload?.key === ownPsd));
  if (!other) return null;
  return other.kind === 'rerun'
    ? 'This pack is already being run again. Wait for that run to finish, then change the new pack.'
    : 'A corrected PSD for this pack is being rebuilt. Wait for it to finish, then change the new pack.';
}

/** What a service takes for who is acting: the Actor itself, or a session that carries one (SessionInfo in lib/auth.ts). */
export type ActingAs = Actor | { actor: Actor };

function asActor(who: ActingAs): Actor {
  return 'actor' in who ? who.actor : who;
}

/** Corrected PSDs wait in storage under 'prepress-uploads/<pack id>/<nonce>/<name>', where the browser put
 * them with a signed URL (print-storage createUploadUrl). The pack id in the key is how a file is tied to
 * the one pack it was uploaded for. */
function isCorrectionKeyFor(packId: string, key: string): boolean {
  const parts = key.split('/');
  return (
    parts.length >= 3 &&
    parts[0] === 'prepress-uploads' &&
    parts[1] === packId.toLowerCase() &&
    parts.slice(2).every((segment) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)) &&
    /\.(psd|psb)$/i.test(parts[parts.length - 1])
  );
}

/** Photoshop files start with '8BPS', then version 1 (PSD) or 2 (PSB, for files past 2 GB). */
function isPsdHead(head: Buffer): boolean {
  return head.length >= 6 && head.toString('latin1', 0, 4) === '8BPS' && head[4] === 0 && (head[5] === 1 || head[5] === 2);
}

/** The most a pack is rebuilt from: the PSD format's own limit, and the worker holds the file in memory. */
const MAX_CORRECTED_PSD_BYTES = 2 * 1024 * 1024 * 1024 - 1;
const UPLOAD_WAIT = { timeoutMs: 250_000, intervalMs: 1_000 };

/** Waits for the worker's rebuild of an upload and turns its result into the outcome. */
async function awaitUpload(jobId: string, deps: PrintDeps): Promise<ServiceResult<UploadOutcome>> {
  const wait = deps.uploadWait ?? UPLOAD_WAIT;
  const until = Date.now() + wait.timeoutMs;
  for (;;) {
    const [job] = await db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId)).limit(1);
    if (!job) return { ok: false, error: 'The rebuild went missing. Upload the file again.' };
    if (job.status === 'done') {
      const upload = (job.result as ReuploadJobResult | null)?.upload;
      if (!upload) return { ok: false, error: 'The rebuild finished without a result. Upload the file again.' };
      return upload.ok ? { ok: true, value: upload.outcome } : { ok: false, error: upload.error };
    }
    if (job.status === 'failed') return { ok: false, error: job.error ?? 'The rebuild failed. Upload the file again.' };
    if (Date.now() >= until) return { ok: false, error: 'Rebuilding the pack is taking longer than usual. It keeps running: check the pack again in a few minutes.' };
    await new Promise((resolve) => setTimeout(resolve, wait.intervalMs));
  }
}

/**
 * Rebuilds a pack from a corrected PSD that is already in storage (the browser put it there with
 * a signed URL: a PSD is hundreds of MB, and a request body stops at 4.5 MB). What can be refused
 * without opening the file is refused here; the worker then reads it, parses it with the pack
 * module's reader, rebuilds the exports, re-runs the checks and applies the re-approval
 * rule (Plan 8). This waits for that and
 * answers with what changed. The same file for the same pack is the same job, and a repeat of it
 * builds nothing twice.
 */
export async function uploadCorrectedPsd(who: ActingAs, packId: string, storageKey: string): Promise<ServiceResult<UploadOutcome>> {
  const actor = asActor(who);
  const no = denied(actor);
  if (no) return { ok: false, error: no };
  if (mockOn()) return { ok: true, value: { newPackId: packId, checks: MOCK_PACK_DETAIL.checks, needsReapproval: false, changes: [] } };

  const pack = await loadPack(packId);
  if (!pack) return { ok: false, error: 'Pack not found.' };
  if (pack.technique !== 'screen') return { ok: false, error: 'A corrected PSD is for screen packs. For DTG/DTF files, run the pack again.' };
  if (isSuperseded(pack)) return { ok: false, error: 'A newer pack replaced this one. Upload the corrected file to the newer one.' };
  const info = packInfo(pack);
  if (pack.buildStatus !== 'ready' || !info) return { ok: false, error: 'This pack is not ready to be replaced yet.' };

  if (!isCorrectionKeyFor(pack.id, storageKey)) return { ok: false, error: "That file wasn't uploaded for this pack. Upload it again from the pack page." };
  const deps = printDeps();
  const stored = await deps.storage.statObject(storageKey).catch(() => null);
  if (!stored) return { ok: false, error: "The file hasn't reached storage. Upload it again." };
  if (stored.bytes === 0) return { ok: false, error: 'That file is empty.' };
  if (stored.bytes > MAX_CORRECTED_PSD_BYTES) return { ok: false, error: 'That file is too big to rebuild a pack from.' };
  const head = await deps.storage.peek(storageKey, 6).catch(() => null);
  if (!head || !isPsdHead(head)) return { ok: false, error: "That isn't a Photoshop file. Upload the .psd you downloaded, after fixing it." };

  const input: PrintJobInput = { ...info.jobInput, techniques: ['screen'], rerun: undefined, reupload: { packId: pack.id, key: storageKey } };
  const busy = await changeUnderWay(pack, deps.jobs.hashJobInput(input));
  if (busy) return { ok: false, error: busy };
  const queued = await deps.jobs.enqueuePrintJob({ kind: 'reupload', input, createdBy: actor.userId });
  await deps.recordActivity(actor, {
    area: 'prepress',
    action: 'pack.upload',
    itemType: 'production_pack',
    itemId: pack.id,
    detail: { filename: storageKey.split('/').pop(), key: storageKey, jobId: queued.jobId },
  });
  return awaitUpload(queued.jobId, deps);
}

/** 'PANTONE 186 C', 'pms 186', a bare '2685 C' (as staff type codes): what a note to the artist must not carry. */
const PANTONE_MENTION = /\bpantone\b|\bpms\s?\d|\b\d{1,4}\s?[cu]\b/i;
const PANTONE_IN_NOTE = 'Artists never see Pantone codes. Name the colour in plain words instead, such as deep purple.';

/** The artist is asked to change something. The approval is withdrawn until they answer. */
export async function sendBackToArtist(actor: Actor, packId: string, note: string): Promise<ServiceResult<null>> {
  const no = denied(actor);
  if (no) return { ok: false, error: no };
  if (mockOn()) return { ok: true, value: null };

  const text = note.trim();
  if (!text) return { ok: false, error: 'Write a note for the artist: say what needs to change.' };
  if (text.length > 1000) return { ok: false, error: 'Keep the note under 1,000 characters.' };
  // The note goes to the artist (their proof page, inbox and email), and clients never see Pantone codes.
  if (PANTONE_MENTION.test(text)) return { ok: false, error: PANTONE_IN_NOTE };

  const pack = await loadPack(packId);
  if (!pack) return { ok: false, error: 'Pack not found.' };
  if (isSuperseded(pack)) return { ok: false, error: 'A newer pack replaced this one. Send the newer one back.' };
  const manifest = storedManifest(pack);
  const [version] = await db.select().from(schema.designVersions).where(eq(schema.designVersions.id, pack.designVersionId)).limit(1);
  if (!manifest?.pipeline || !version) return { ok: false, error: 'This pack is not ready to be sent back.' };

  const at = new Date();
  await db
    .update(schema.productionPacks)
    .set({
      auditStatus: 'sent_back',
      auditedBy: actor.userId,
      auditedAt: at,
      manifest: { ...manifest, pipeline: { ...manifest.pipeline, sendBack: { note: text, by: await actorLabel(actor), at: at.toISOString() } } },
      updatedAt: at,
    })
    .where(eq(schema.productionPacks.id, pack.id));

  await invalidateApprovals(version.designId, version.id, `Pre-press asked for a change: ${text}`);
  const name = manifest.pipeline.designName;
  await notifyArtist(
    version.designId,
    'print.sent_back',
    `Our pre-press team sent ${name} back: ${text}`,
    `Show me the print proof for design ${version.designId}`,
    { note: text, packId: pack.id, designName: name },
  );

  await printDeps().recordActivity(actor, { area: 'prepress', action: 'pack.send_back', itemType: 'production_pack', itemId: pack.id, detail: { note: text } });
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// What an order needs

interface Requirement {
  designId: string;
  technique: PrintTechnique;
  blankCode: string;
  placement: PrintPlacement;
  /** colour code -> pieces (a missing colour is counted under '') */
  colours: Map<string, number>;
  kind: 'shop_order' | 'run';
  bulkOrderId?: string;
}

/** A placement as products and run lines store it (cm). */
export interface StoredPlacement {
  position?: string;
  widthCm?: number;
  offsetYcm?: number;
}

/** The print placement (mm) of a stored one: what packs are built and found by. */
export function toPrintPlacement(p: StoredPlacement | null | undefined): PrintPlacement {
  return {
    position: p?.position || 'front_chest',
    widthMm: Math.round((p?.widthCm ?? 28) * 10),
    ...(p?.offsetYcm === undefined || p?.offsetYcm === null ? {} : { offsetYMm: Math.round(p.offsetYcm * 10) }),
  };
}

function addRequirement(into: Map<string, Requirement>, req: Omit<Requirement, 'colours'>, colour: string | null, qty: number): void {
  const key = `${req.designId}|${req.technique}|${req.blankCode}|${placementKey(req.placement)}`;
  const existing = into.get(key) ?? { ...req, colours: new Map<string, number>() };
  existing.colours.set(colour ?? '', (existing.colours.get(colour ?? '') ?? 0) + qty);
  into.set(key, existing);
}

/** What the order asks pre-press for: per design, the technique, blank, placement and colours.
 * Shop orders always print DTG/DTF; a run prints the way it was quoted. Every print area of a
 * product is its own requirement, for the design printed there (a front and a back can be different
 * artwork). Empty when nothing needs a pack (no design, or a print service that is neither screen
 * nor DTG/DTF). */
async function resolveOrderRequirements(orderId: string): Promise<Requirement[]> {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  if (!order) return [];
  const found = new Map<string, Requirement>();

  const items = await db
    .select({
      colourCode: schema.orderItems.colourCode,
      quantity: schema.orderItems.quantity,
      productId: schema.products.id,
      designId: schema.products.designId,
      blankCode: schema.products.blankCode,
      placement: schema.products.placement,
      placements: schema.products.placements,
      printServiceCode: schema.products.printServiceCode,
    })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
    .where(eq(schema.orderItems.orderId, orderId));

  if (order.orderType === 'bulk') {
    // Each line of a run chose its own method when it was quoted (WP4: bulk.ts and quotes.ts);
    // the shop product behind a line prints DTG/DTF whatever the run does.
    const { getRunLinesForOrder } = await import('@/lib/services/bulk');
    const { techniqueOfService } = await import('@/lib/services/quotes');
    const run = await getRunLinesForOrder(orderId);
    const productRows = new Map(items.map((i) => [i.productId, i]));
    for (const line of (run?.lines ?? []).filter((l) => l.colourCode)) {
      const product = line.productId ? productRows.get(line.productId) : undefined;
      const technique = techniqueOfService(line.printServiceCode);
      // The product's own design first: the run quote checked a line's design against the shop, and it is checked again below.
      const lineDesign = product?.designId ?? line.designId ?? null;
      const blankCode = line.blankCode ?? product?.blankCode;
      if (!technique || !blankCode) continue;
      // A line can print more positions on the same garment (a back print, say): the ones it was quoted with, each with
      // its own design when it has one; a line that names none prints its product's print areas.
      const placements: ((StoredPlacement & { designId?: string | null }) | null)[] = line.placement
        ? [line.placement, ...(line.extraPlacements ?? [])]
        : product
          ? productAreas(product)
          : [null];
      for (const placement of placements) {
        const designId = placement?.designId ?? lineDesign;
        if (!designId) continue;
        addRequirement(found, { designId, technique, blankCode, placement: toPrintPlacement(placement), kind: 'run', bulkOrderId: run?.bulkOrderId }, line.colourCode, line.qty);
      }
    }
    return ownDesignsOnly(order.storeId, [...found.values()]);
  }

  const { techniqueOfService } = await import('@/lib/services/quotes');
  for (const item of items) {
    // A shop sale prints DTG/DTF whatever its product says (screen print is for runs); a service with no
    // print file to make (embroidery) needs nothing from pre-press.
    if (techniqueOfService(item.printServiceCode) === null) continue;
    for (const area of productAreas(item)) {
      if (!area.designId) continue;
      addRequirement(found, { designId: area.designId, technique: 'dtg_dtf', blankCode: item.blankCode, placement: toPrintPlacement(area), kind: 'shop_order' }, item.colourCode, item.quantity);
    }
  }
  return ownDesignsOnly(order.storeId, [...found.values()]);
}

/** An order only ever prints its own shop's art: a requirement for another shop's design is dropped (and logged). */
async function ownDesignsOnly(storeId: string, requirements: Requirement[]): Promise<Requirement[]> {
  const ids = [...new Set(requirements.map((r) => r.designId))];
  if (ids.length === 0) return requirements;
  const rows = await db.select({ id: schema.designs.id, storeId: schema.designs.storeId }).from(schema.designs).where(inArray(schema.designs.id, ids));
  const own = new Set(rows.filter((r) => r.storeId === storeId).map((r) => r.id));
  for (const id of ids) if (!own.has(id)) console.error(`[prepress] an order of shop ${storeId} names design ${id}, which is not its own; it is left out.`);
  return requirements.filter((r) => own.has(r.designId));
}

interface PackCandidates {
  versionId: string | null;
  packs: PackRow[];
  /** colours the order wants that no pack of the version covers */
  missing: string[];
  /** every colour the version's packs for this technique, placement and blank print */
  covered: string[];
}

/** True when a pack is the requirement's: its design's technique, placement and blank. */
function packAnswers(req: Requirement, pack: PackRow): boolean {
  return pack.technique === req.technique && samePlacement(packPlacement(pack), req.placement) && packInfo(pack)?.blankCode === req.blankCode;
}

/** The packs that answer a requirement: from the version the artist approved, else the newest one with
 * packs for it. The order stays on that version for every colour: a colour its packs don't print yet is
 * built on the same art (startPrepare), never taken from older art that happens to have it. */
async function packsFor(req: Requirement): Promise<PackCandidates> {
  const versions = await db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, req.designId)).orderBy(desc(schema.designVersions.version));
  const [approval] = await db
    .select({ versionId: schema.designApprovals.designVersionId })
    .from(schema.designApprovals)
    .where(and(eq(schema.designApprovals.designId, req.designId), isNull(schema.designApprovals.invalidatedAt)))
    .orderBy(desc(schema.designApprovals.approvedAt))
    .limit(1);
  const ordered = approval ? [...versions.filter((v) => v.id === approval.versionId), ...versions.filter((v) => v.id !== approval.versionId)] : versions;

  const colours = [...req.colours.keys()].filter(Boolean);
  for (const version of ordered) {
    const matching = (await loadCurrentPacks(version.id)).filter((p) => packAnswers(req, p));
    if (matching.length === 0) continue;
    const needed = matching.filter((p) => colours.length === 0 || (p.garmentCodes as string[]).some((c) => colours.includes(c)));
    const covered = colourSet(matching);
    return { versionId: version.id, packs: needed, missing: colours.filter((c) => !covered.has(c)), covered: [...covered] };
  }
  return { versionId: null, packs: [], missing: colours, covered: [] };
}

function needFor(req: Requirement, pack: PackRow, at: string, orderId: string): PackNeed {
  if (req.kind === 'shop_order') return { kind: 'shop_order', orderId, at };
  const codes = pack.garmentCodes as string[];
  let qty = 0;
  for (const [colour, n] of req.colours) if (colour === '' || codes.includes(colour)) qty += n;
  return { kind: 'run', bulkOrderId: req.bulkOrderId ?? '', orderId, qty, at };
}

/** Adds an order to a pack's needs, once. The first need puts the pack in the audit queue. */
async function attachNeed(pack: PackRow, need: PackNeed & { orderId?: string }): Promise<void> {
  if (!need.orderId) return;
  const orderId = need.orderId;
  await db
    .update(schema.productionPacks)
    .set({
      neededFor: sql`${schema.productionPacks.neededFor} || ${JSON.stringify([need])}::jsonb`,
      auditStatus: sql`case when ${schema.productionPacks.auditStatus} = 'idle' then 'waiting'::pack_audit_status else ${schema.productionPacks.auditStatus} end`,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.productionPacks.id, pack.id), sql`not (${schema.productionPacks.neededFor} @> ${JSON.stringify([{ orderId }])}::jsonb)`));
}

/** An order that moved to a newer version no longer waits on a pack the artist was asked to change. */
async function releaseSentBack(req: Requirement, keepVersionId: string | null, orderId: string): Promise<void> {
  const versions = await db.select({ id: schema.designVersions.id }).from(schema.designVersions).where(eq(schema.designVersions.designId, req.designId));
  for (const version of versions) {
    if (version.id === keepVersionId) continue;
    for (const pack of await loadPacksForVersion(version.id)) {
      if (pack.auditStatus !== 'sent_back' || pack.technique !== req.technique) continue;
      const needs = needsOf(pack);
      if (!needs.some((n) => (n as { orderId?: string }).orderId === orderId)) continue;
      await db
        .update(schema.productionPacks)
        .set({ neededFor: needs.filter((n) => (n as { orderId?: string }).orderId !== orderId), updatedAt: new Date() })
        .where(eq(schema.productionPacks.id, pack.id));
    }
  }
}

/** Starts the build of a pack nobody has made for this order's design, colour or placement yet. */
async function startPrepare(req: Requirement, found: PackCandidates): Promise<void> {
  const deps = printDeps();
  const [design] = await db.select().from(schema.designs).where(eq(schema.designs.id, req.designId)).limit(1);
  if (!design) return;

  let versionId = found.versionId;
  if (!versionId) {
    // Nothing was ever prepared: pin the art as it is. The 4K final, if the art needs one, is made by the worker job.
    const version = (await latestVersion(design.id)) ?? (await ensureDesignVersion(design, deps, { userId: null }).then((r) => (r.ok ? r.value : null)));
    if (!version) return;
    versionId = version.id;
  }
  const [inkSystem, recipe] = await Promise.all([getActiveInkSystem(), resolveRecipe(design)]);
  // Every colour the version's packs already print, as well as the new ones: the new packs replace the
  // old ones (settleSupersession), so the orders on the old colours keep their files.
  const garmentCodes = [...new Set([...found.covered, ...req.colours.keys()].filter(Boolean))];
  const input: PrintJobInput = {
    designId: design.id,
    designVersionId: versionId,
    storeId: design.storeId,
    blankCode: req.blankCode,
    garmentCodes,
    placements: [req.placement],
    techniques: [req.technique],
    recipe,
    inkSystemId: inkSystem.id,
  };
  await deps.jobs.enqueuePrintJob({ kind: 'prepare', input, createdBy: null });
}

async function markNeeded(orderId: string, opts: { startBuilds: boolean }): Promise<void> {
  const requirements = await resolveOrderRequirements(orderId);
  const at = new Date().toISOString();
  for (const req of requirements) {
    const found = await packsFor(req);
    for (const pack of found.packs) await attachNeed(pack, needFor(req, pack, at, orderId));
    await releaseSentBack(req, found.versionId, orderId);
    if (opts.startBuilds && (found.packs.length === 0 || found.missing.length > 0)) await startPrepare(req, found);
  }
}

/** Called when an order is paid: the packs it needs enter the queue. Shop
 * orders need the DTG/DTF pack; runs need the pack for their method. Never
 * throws into the payment path: it logs and returns on any failure. */
export async function markPacksNeededForOrder(orderId: string): Promise<void> {
  if (mockOn()) return;
  try {
    await markNeeded(orderId, { startBuilds: true });
  } catch (err) {
    console.error(`[prepress] could not work out the packs order ${orderId} needs:`, err instanceof Error ? err.message : err);
  }
  // A shop sale or a run whose files pre-press already approved goes straight to the stations' queue.
  await syncProductionJobsAfter('an order was paid');
}

/** The same, for orders already waiting when a build finishes: attaches what exists and builds nothing more. */
export async function attachBuiltPacksToOrder(orderId: string): Promise<void> {
  try {
    await markNeeded(orderId, { startBuilds: false });
  } catch (err) {
    console.error(`[prepress] could not attach packs to order ${orderId}:`, err instanceof Error ? err.message : err);
  }
}

async function packsNeededBy(orderId: string): Promise<{ pack: PackRow; designId: string }[]> {
  const rows = await db
    .select({ pack: schema.productionPacks, designId: schema.designVersions.designId })
    .from(schema.productionPacks)
    .innerJoin(schema.designVersions, eq(schema.productionPacks.designVersionId, schema.designVersions.id))
    .where(sql`${schema.productionPacks.neededFor} @> ${JSON.stringify([{ orderId }])}::jsonb`);
  return rows.filter((r) => !isSuperseded(r.pack));
}

/** The packs attached to an order that answer one of its requirements. */
function packsAnswering(req: Requirement, needed: { pack: PackRow; designId: string }[]): { pack: PackRow; designId: string }[] {
  return needed.filter((n) => n.designId === req.designId && packAnswers(req, n.pack));
}

/** True when the order's packs for a requirement print every colour it asks for. */
function requirementCovered(req: Requirement, needed: { pack: PackRow; designId: string }[]): boolean {
  const packs = packsAnswering(req, needed);
  if (packs.length === 0) return false;
  const printed = colourSet(packs.map((n) => n.pack));
  return [...req.colours.keys()].filter(Boolean).every((c) => printed.has(c));
}

/** Why the artist's side stops these packs, or null. Once the artist has approved a version's print proof,
 * production uses only files their approval still covers (Plan sections 7 and 8): what they approved, or a
 * replacement that left the proof as it was. A withdrawn approval (a changed proof, an undo, a new screen
 * count) stops everything from that version until they approve again. A run on a colour they never approved
 * there prints on the run's own proof, and a version they never approved this way (made before print prep)
 * goes on pre-press's approval alone. */
async function artistSignOffProblem(req: Requirement, packs: PackRow[]): Promise<string | null> {
  const wanted = [...req.colours.keys()].filter(Boolean);
  for (const versionId of new Set(packs.map((p) => p.designVersionId))) {
    const approvals = await approvalsOfVersion(versionId);
    if (approvals.length === 0) continue;
    const valid = approvals.find((a) => !a.invalidatedAt) ?? null;
    const tracked = colourSet(approvals);
    const versionPacks = await loadPacksForVersion(versionId);
    for (const pack of packs.filter((p) => p.designVersionId === versionId)) {
      const prints = pack.garmentCodes as string[];
      for (const colour of wanted.length > 0 ? wanted.filter((c) => prints.includes(c)) : prints) {
        if (req.kind === 'run' && !tracked.has(colour)) continue;
        if (valid && approvalCovers(valid, pack, versionPacks, colour)) continue;
        const name = await designDisplayName(req.designId);
        return valid
          ? `The artist hasn't approved the print proof of ${name} for every colour and position this order needs. They were asked to look; production can start once they approve.`
          : `The artist was asked to approve a changed print proof of ${name} and hasn't yet. Production can start once they approve.`;
      }
    }
  }
  return null;
}

/** Production gate: every pack the order needs is built and approved by pre-press, the packs print every
 * design, placement, blank and colour the order asks for, and the artist's approval still stands for them. */
export async function assertPacksApprovedForOrder(orderId: string): Promise<ServiceResult<null>> {
  if (mockOn()) return { ok: true, value: null };
  try {
    const requirements = await resolveOrderRequirements(orderId);
    // Nothing for pre-press to check: no design, or a service that needs no film or print file.
    if (requirements.length === 0) return { ok: true, value: null };

    let needed = await packsNeededBy(orderId);
    if (!requirements.every((req) => requirementCovered(req, needed))) {
      // An order paid before its packs existed: look again, and start any build that is missing.
      await markNeeded(orderId, { startBuilds: true });
      needed = await packsNeededBy(orderId);
    }
    const missing = requirements.filter((req) => !requirementCovered(req, needed));
    if (missing.length > 0) {
      return { ok: false, error: 'The print files for this order are being prepared. Pre-press checks them before production can start.' };
    }

    const relevant = [...new Map(requirements.flatMap((req) => packsAnswering(req, needed)).map((n) => [n.pack.id, n])).values()];
    const waiting = relevant.filter((n) => n.pack.auditStatus !== 'approved' || n.pack.buildStatus !== 'ready');
    if (waiting.length > 0) {
      const names = new Map<string, string>();
      for (const w of waiting) if (!names.has(w.designId)) names.set(w.designId, await designDisplayName(w.designId));
      const labels = waiting.map((w) => `${names.get(w.designId)} (${w.pack.technique === 'screen' ? `screen print, ${w.pack.screenSetKey ?? 'set'}` : 'DTG/DTF'})`);
      return { ok: false, error: `Pre-press hasn't approved the print files yet: ${labels.join(', ')}.` };
    }

    for (const req of requirements) {
      const problem = await artistSignOffProblem(req, packsAnswering(req, needed).map((n) => n.pack));
      if (problem) return { ok: false, error: problem };
    }
    return { ok: true, value: null };
  } catch (err) {
    console.error(`[prepress] could not check the print files of order ${orderId}:`, err instanceof Error ? err.message : err);
    return { ok: false, error: 'The print files for this order could not be checked. Try again in a moment.' };
  }
}
