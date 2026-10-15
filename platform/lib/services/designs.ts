// Design intake pipeline: upload metadata + readiness assessment, cleanup
// (remove background / upscale / trim), instruction edits, logo composition,
// and from-scratch generation via fal (Nano Banana 2). See
// Documentation/Dev/Platform-Plan.md §4 "Design" and
// Documentation/05-Shared/Image-Generation-Architecture.md.
//
// Print prep adds two rules (Documentation/Dev/Print-Prep-Plan.md section 3):
// every generated or edited design is a 1K draft, and finaliseDesignForPrint
// renders its 4K final before approval; an edit works on the version the
// artist is looking at and sends the instructions already applied.
import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import sharp, { type Metadata } from 'sharp';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { putFile } from '@/lib/services/storage';
import * as falService from '@/lib/services/fal';
import { getStyleCapsule, type StyleCapsule } from '@/lib/services/style-capsules';

export type DesignRow = typeof schema.designs.$inferSelect;
export type DesignSource = DesignRow['source'];
export type DesignReadiness = NonNullable<DesignRow['readiness']>;
export type CleanOp = 'remove_bg' | 'upscale' | 'trim';

export interface DesignSummary {
  designId: string;
  storeId: string;
  source: DesignSource;
  originalUrl: string | null;
  printUrl: string | null;
  previewUrl: string;
  widthPx: number | null;
  heightPx: number | null;
  dpiAtPrint: number | null;
  hasAlpha: boolean | null;
  readiness: DesignReadiness;
  readinessNotes: string[];
  parentDesignId: string | null;
}

// A print run is sized to a 28cm-wide placement — dpiAtPrint is always
// computed against that assumption, regardless of the image's own aspect ratio.
const PRINT_WIDTH_CM = 28;
const PRINT_WIDTH_IN = PRINT_WIDTH_CM / 2.54;

const SUPPORTED_FORMATS = new Set(['png', 'jpeg', 'jpg', 'webp', 'svg']);

/** Art whose longest side is under this is a draft. Nano Banana's 1K output is
 * about 1024 px and its 4K final about 4096, so the line sits well between. */
const FINAL_MIN_EDGE_PX = 3000;

// -- how a design was made --------------------------------------------------
//
// designs.generationParams records it. Every design made after print prep
// carries a `mode`, the capsule it was styled with, and a `history`: what the
// artwork has been through, oldest first. An edit sends that history to the
// model, and the next edit extends it.

export interface DesignHistoryEntry {
  /** 'brief' is how a generated or composed design began; 'edit' is an instruction applied since */
  kind: 'brief' | 'edit';
  text: string;
  /** ISO time */
  at: string;
}

interface DesignParams {
  mode?: 'generate' | 'compose' | 'edit' | 'clean';
  brief?: string;
  instruction?: string;
  capsuleId?: string;
  history?: unknown;
  /** set by finaliseDesignForPrint: the draft the 4K final was rendered from */
  finalRender?: { from: string; at: string };
  /** set on a cleanup of a model's 1K draft: the draft it came from and the cleanups made since. The
   * cleaned design is still a draft: its final is the draft's 4K render with these cleanups made again. */
  draftOf?: { designId: string; ops: CleanOp[] };
}

function readParams(row: Pick<DesignRow, 'generationParams'>): DesignParams {
  const raw = row.generationParams;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as DesignParams) : {};
}

function isHistoryEntry(value: unknown): value is DesignHistoryEntry {
  const entry = value as Partial<DesignHistoryEntry> | null;
  return !!entry && (entry.kind === 'brief' || entry.kind === 'edit') && typeof entry.text === 'string';
}

/** What the artwork has been through. Rows made before histories were kept
 * carry one instruction or brief at most, and that is all there is to send. */
function historyOf(row: DesignRow): DesignHistoryEntry[] {
  const params = readParams(row);
  if (Array.isArray(params.history)) return params.history.filter(isHistoryEntry);
  const at = row.createdAt.toISOString();
  if (typeof params.instruction === 'string') return [{ kind: 'edit', text: params.instruction, at }];
  if (typeof params.brief === 'string') return [{ kind: 'brief', text: params.brief, at }];
  return [];
}

function briefEntry(brief: string): DesignHistoryEntry {
  return { kind: 'brief', text: brief, at: new Date().toISOString() };
}

/** The artwork as it stands: the print file if there is one (a cleanup, or the 4K final), else the original. */
function currentArtUrl(row: Pick<DesignRow, 'printUrl' | 'originalUrl'>): string | null {
  return row.printUrl ?? row.originalUrl ?? null;
}

/** Made by Nano Banana, as opposed to an upload or a cleaned upload. Only
 * these get a 4K re-render: an upload is the artist's own pixels and is never regenerated. */
function madeByModel(source: DesignSource, params: DesignParams): boolean {
  if (source === 'generated') return true;
  if (source === 'edited') return params.mode === 'edit' || (params.mode === undefined && typeof params.instruction === 'string');
  return false;
}

/** A model's 1K draft (or a cleanup of one) that has no print-size final yet. */
function isDraftArt(source: DesignSource, params: DesignParams, widthPx: number | null | undefined, heightPx: number | null | undefined): boolean {
  return (madeByModel(source, params) || Boolean(params.draftOf)) && Math.max(widthPx ?? 0, heightPx ?? 0) < FINAL_MIN_EDGE_PX;
}

function toSummary(row: DesignRow): DesignSummary {
  return {
    designId: row.id,
    storeId: row.storeId,
    source: row.source,
    originalUrl: row.originalUrl,
    printUrl: row.printUrl,
    previewUrl: row.previewUrl ?? row.originalUrl ?? '',
    widthPx: row.widthPx,
    heightPx: row.heightPx,
    dpiAtPrint: row.dpiAtPrint,
    hasAlpha: row.hasAlpha,
    readiness: row.readiness ?? 'blocked',
    readinessNotes: row.readinessNotes ? row.readinessNotes.split('\n').filter(Boolean) : [],
    parentDesignId: row.parentDesignId,
  };
}

export async function getDesign(id: string): Promise<DesignRow | null> {
  const rows = await db.select().from(schema.designs).where(eq(schema.designs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getDesignSummary(id: string): Promise<DesignSummary | null> {
  const row = await getDesign(id);
  return row ? toSummary(row) : null;
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function contentTypeForFormat(format: string | undefined): string {
  if (!format) return 'application/octet-stream';
  const normalised = format === 'jpg' ? 'jpeg' : format;
  return `image/${normalised}`;
}

/** What this module needs from outside the process, apart from fal (see
 * falTransport in fal.ts), in one place so a test can stand in for it. */
export const designIo = {
  download: downloadBuffer,
  store: putFile,
};

type BackgroundKind = 'transparent' | 'flat' | 'photo';

interface BackgroundAnalysis {
  background: BackgroundKind;
  meanBrightness: number | null;
}

/** Heuristic background read: alpha transparency wins outright; otherwise
 * sample four border strips and treat a low-variance border as a flat/solid
 * background versus a busy or gradient (photo-like) one. */
async function detectBackground(buffer: Buffer, meta: Metadata): Promise<BackgroundAnalysis> {
  if (meta.hasAlpha) {
    const stats = await sharp(buffer).stats();
    const alphaChannel = stats.channels[stats.channels.length - 1];
    if (alphaChannel && alphaChannel.min < 250) return { background: 'transparent', meanBrightness: null };
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 4 || height < 4) return { background: 'photo', meanBrightness: null };

  const stripW = Math.max(1, Math.round(width * 0.05));
  const stripH = Math.max(1, Math.round(height * 0.05));
  const regions = [
    { left: 0, top: 0, width, height: stripH },
    { left: 0, top: Math.max(0, height - stripH), width, height: stripH },
    { left: 0, top: 0, width: stripW, height },
    { left: Math.max(0, width - stripW), top: 0, width: stripW, height },
  ];

  let stdevTotal = 0;
  let meanTotal = 0;
  let sampleCount = 0;
  for (const region of regions) {
    const stats = await sharp(buffer).extract(region).stats();
    const colourChannels = stats.channels.slice(0, 3);
    for (const channel of colourChannels) {
      stdevTotal += channel.stdev;
      meanTotal += channel.mean;
      sampleCount += 1;
    }
  }
  const avgStdev = sampleCount > 0 ? stdevTotal / sampleCount : 999;
  const meanBrightness = sampleCount > 0 ? meanTotal / sampleCount : null;
  return { background: avgStdev < 14 ? 'flat' : 'photo', meanBrightness };
}

function computeReadiness(input: {
  dpi: number | null;
  hasAlpha: boolean;
  background: BackgroundKind;
  meanBrightness: number | null;
  formatSupported: boolean;
  /** a Nano Banana draft: its low resolution is expected, finaliseDesignForPrint renders the 4K print version */
  draft?: boolean;
}): { readiness: DesignReadiness; notes: string[] } {
  const notes: string[] = [];

  if (!input.formatSupported) {
    return { readiness: 'blocked', notes: ['Unsupported or unreadable image file.'] };
  }
  if (input.dpi === null) {
    return { readiness: 'blocked', notes: ['Could not determine image dimensions.'] };
  }
  if (input.draft) {
    // Neither blocked nor sent to cleanup: upscaling a draft would only repaint it,
    // and the full-size render is made from it when the design is prepared for print.
    notes.push(`Draft preview (${input.dpi} dpi at a 28cm print width). The full-size print render is made when you prepare it for print.`);
  } else if (input.dpi < 100) {
    notes.push(`Only ${input.dpi} dpi at a 28cm print width — too low to print cleanly (need at least 100 dpi).`);
    return { readiness: 'blocked', notes };
  } else if (input.dpi < 150) {
    notes.push(`${input.dpi} dpi at a 28cm print width is workable but soft; upscaling is recommended for a crisp print.`);
    return { readiness: 'needs_cleanup', notes };
  } else {
    notes.push(`${input.dpi} dpi at a 28cm print width — sharp enough to print.`);
  }

  if (input.background === 'photo') {
    notes.push('Background looks like a photo/busy scene — remove it before printing on a garment.');
    return { readiness: 'needs_cleanup', notes };
  }
  const asIs = input.draft ? '.' : ' — ready to print as-is.';
  if (input.hasAlpha) {
    notes.push(`Transparent background${asIs}`);
    return { readiness: 'ready', notes };
  }
  const plainWhiteOrBlack = input.meanBrightness !== null && (input.meanBrightness > 240 || input.meanBrightness < 15);
  if (input.background === 'flat' && plainWhiteOrBlack) {
    notes.push(`Plain white/black background${asIs}`);
    return { readiness: 'ready', notes };
  }
  notes.push('Flat but coloured background — remove it so the garment colour shows through instead.');
  return { readiness: 'needs_cleanup', notes };
}

interface VisionAnalysis {
  background: BackgroundKind;
  hasText: boolean;
  notes: string;
}

const visionSchema = z.object({
  background: z.enum(['transparent', 'flat', 'photo']),
  hasText: z.boolean(),
  notes: z.string().max(300),
});

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

/** Degrades to null (metadata-only readiness) when ANTHROPIC_API_KEY is absent
 * or the call fails for any reason — vision is an enhancement, never a blocker. */
async function analyzeWithVision(imageUrl: string): Promise<VisionAnalysis | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const message = await getAnthropicClient().messages.parse({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            {
              type: 'text',
              text: 'Classify this artwork for garment print production. background: "transparent" if it has an alpha/transparent background, "flat" if a single solid-colour background, "photo" if a busy, gradient, or photographic background. hasText: true if the artwork contains readable text or lettering. notes: one short sentence a print-shop assistant would say about its print-readiness.',
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(visionSchema) },
    });
    return message.parsed_output ?? null;
  } catch {
    return null;
  }
}

interface FinalizeParams {
  storeId: string;
  source: DesignSource;
  parentDesignId: string | null;
  generationParams?: unknown;
  /** the artifact this row represents right now */
  imageUrl: string;
  /** 'original' for a fresh upload/generation/edit; 'print' for a cleanup pass */
  slot: 'original' | 'print';
  /** carried forward when slot === 'print' so the lineage keeps its true source image */
  keepOriginalUrl?: string | null;
}

/** Shared finalisation: download, read metadata + background, run optional
 * vision analysis, build the 900px preview, store everything, and insert the row. */
async function finalizeDesignRow(params: FinalizeParams): Promise<DesignSummary> {
  const buffer = await designIo.download(params.imageUrl);

  let meta: Metadata;
  try {
    meta = await sharp(buffer, { density: 150 }).metadata();
  } catch {
    const [row] = await db
      .insert(schema.designs)
      .values({
        storeId: params.storeId,
        source: params.source,
        originalUrl: params.slot === 'original' ? null : (params.keepOriginalUrl ?? null),
        printUrl: null,
        previewUrl: null,
        widthPx: null,
        heightPx: null,
        dpiAtPrint: null,
        hasAlpha: null,
        readiness: 'blocked',
        readinessNotes: 'Unsupported or unreadable image file.',
        parentDesignId: params.parentDesignId,
        generationParams: params.generationParams,
      })
      .returning();
    return toSummary(row);
  }

  const format = meta.format;
  const formatSupported = !!format && SUPPORTED_FORMATS.has(format);
  const contentType = contentTypeForFormat(format);
  const isVector = format === 'svg';

  const stored = await designIo.store({
    data: buffer,
    contentType,
    filename: `design-${randomUUID()}.${format ?? 'bin'}`,
    folder: `designs/${params.storeId}`,
  });

  const previewBuffer = await sharp(buffer, { density: 150 })
    .resize({ width: 900, withoutEnlargement: true })
    .png()
    .toBuffer();
  const preview = await designIo.store({
    data: previewBuffer,
    contentType: 'image/png',
    filename: `design-${randomUUID()}-preview.png`,
    folder: `designs/${params.storeId}`,
  });

  const widthPx = meta.width ?? null;
  const heightPx = meta.height ?? null;
  const dpi = widthPx !== null ? Math.round(widthPx / PRINT_WIDTH_IN) : null;
  const hasAlpha = meta.hasAlpha ?? false;

  // Vector art is inherently print-ready at any size — skip the raster dpi/background heuristics.
  if (isVector) {
    const readiness: DesignReadiness = 'ready';
    const notes = ['Vector artwork — scales cleanly to any print size.'];
    const row = await insertRow({ ...params, stored, preview, widthPx, heightPx, dpi: null, hasAlpha, readiness, notes });
    return toSummary(row);
  }

  const background = await detectBackground(buffer, meta);
  const vision = await analyzeWithVision(stored.url);
  const effectiveBackground = vision?.background ?? background.background;

  const draft = isDraftArt(params.source, readParams({ generationParams: params.generationParams }), widthPx, heightPx);
  const { readiness, notes } = computeReadiness({
    dpi,
    hasAlpha,
    background: effectiveBackground,
    meanBrightness: background.meanBrightness,
    formatSupported,
    draft,
  });
  if (vision?.notes) notes.push(vision.notes);
  if (vision?.hasText) notes.push('Contains text/lettering — check legibility at print size.');

  const row = await insertRow({ ...params, stored, preview, widthPx, heightPx, dpi, hasAlpha, readiness, notes });
  return toSummary(row);
}

async function insertRow(input: {
  storeId: string;
  source: DesignSource;
  parentDesignId: string | null;
  generationParams?: unknown;
  slot: 'original' | 'print';
  keepOriginalUrl?: string | null;
  stored: { url: string };
  preview: { url: string };
  widthPx: number | null;
  heightPx: number | null;
  dpi: number | null;
  hasAlpha: boolean;
  readiness: DesignReadiness;
  notes: string[];
}): Promise<DesignRow> {
  const originalUrl = input.slot === 'original' ? input.stored.url : (input.keepOriginalUrl ?? null);
  const printUrl = input.slot === 'print' ? input.stored.url : null;

  const [row] = await db
    .insert(schema.designs)
    .values({
      storeId: input.storeId,
      source: input.source,
      originalUrl,
      printUrl,
      previewUrl: input.preview.url,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      dpiAtPrint: input.dpi,
      hasAlpha: input.hasAlpha,
      readiness: input.readiness,
      readinessNotes: input.notes.join('\n'),
      parentDesignId: input.parentDesignId,
      generationParams: input.generationParams,
    })
    .returning();
  return row;
}

export interface CreateDesignFromUploadInput {
  storeId: string;
  data: Uint8Array | Buffer;
  contentType: string;
  filename: string;
}

export async function createDesignFromUpload(input: CreateDesignFromUploadInput): Promise<DesignSummary> {
  const stored = await designIo.store({
    data: input.data,
    contentType: input.contentType,
    filename: input.filename,
    folder: `designs/${input.storeId}`,
  });
  return finalizeDesignRow({ storeId: input.storeId, source: 'upload', parentDesignId: null, imageUrl: stored.url, slot: 'original' });
}

/** Reads the artwork's metadata and background, runs the optional vision pass,
 * and stores the verdict on the design's row. */
async function assessDesign(row: DesignRow, imageUrl: string, buffer: Buffer): Promise<DesignRow> {
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { density: 150 }).metadata();
  } catch {
    const [updated] = await db
      .update(schema.designs)
      .set({ readiness: 'blocked', readinessNotes: 'Unsupported or unreadable image file.' })
      .where(eq(schema.designs.id, row.id))
      .returning();
    return updated;
  }

  const format = meta.format;
  const formatSupported = !!format && SUPPORTED_FORMATS.has(format);
  const widthPx = meta.width ?? row.widthPx;
  const heightPx = meta.height ?? row.heightPx;
  const dpi = widthPx !== null && widthPx !== undefined ? Math.round(widthPx / PRINT_WIDTH_IN) : null;
  const hasAlpha = meta.hasAlpha ?? false;

  if (format === 'svg') {
    const [updated] = await db
      .update(schema.designs)
      .set({ readiness: 'ready', readinessNotes: 'Vector artwork — scales cleanly to any print size.', widthPx, heightPx, hasAlpha })
      .where(eq(schema.designs.id, row.id))
      .returning();
    return updated;
  }

  const background = await detectBackground(buffer, meta);
  const vision = await analyzeWithVision(imageUrl);
  const effectiveBackground = vision?.background ?? background.background;

  const draft = isDraftArt(row.source, readParams(row), widthPx, heightPx);
  const { readiness, notes } = computeReadiness({
    dpi,
    hasAlpha,
    background: effectiveBackground,
    meanBrightness: background.meanBrightness,
    formatSupported,
    draft,
  });
  if (vision?.notes) notes.push(vision.notes);
  if (vision?.hasText) notes.push('Contains text/lettering — check legibility at print size.');

  const [updated] = await db
    .update(schema.designs)
    .set({ readiness, readinessNotes: notes.join('\n'), widthPx, heightPx, dpiAtPrint: dpi, hasAlpha })
    .where(eq(schema.designs.id, row.id))
    .returning();
  return updated;
}

/** Re-runs the readiness assessment (including a fresh vision pass, when
 * configured) against the design's current artifact and persists it. */
export async function analyzeDesign(id: string): Promise<DesignSummary> {
  const row = await getDesign(id);
  if (!row) throw new Error('design_not_found');
  const imageUrl = currentArtUrl(row);
  if (!imageUrl) throw new Error('design_has_no_image');

  const buffer = await designIo.download(imageUrl);
  return toSummary(await assessDesign(row, imageUrl, buffer));
}

export async function cleanDesign(id: string, ops: CleanOp[]): Promise<DesignSummary> {
  const parent = await getDesign(id);
  if (!parent) throw new Error('design_not_found');
  let currentUrl = currentArtUrl(parent);
  if (!currentUrl) throw new Error('design_has_no_image');
  const keepOriginalUrl = parent.originalUrl ?? parent.printUrl ?? null;

  for (const op of ops) {
    if (op === 'remove_bg') {
      const result = await falService.removeBackground(currentUrl);
      currentUrl = result.url;
    } else if (op === 'upscale') {
      const result = await falService.upscale(currentUrl, 2);
      currentUrl = result.url;
    } else if (op === 'trim') {
      const buffer = await designIo.download(currentUrl);
      const trimmed = await sharp(buffer).trim().png().toBuffer();
      const stored = await designIo.store({
        data: trimmed,
        contentType: 'image/png',
        filename: `design-${randomUUID()}-trim.png`,
        folder: `designs/${parent.storeId}`,
      });
      currentUrl = stored.url;
    }
  }

  // A model's draft is still a draft once cleaned: its final is rendered from the draft at 4K and these
  // cleanups are made again on it (finaliseDesignForPrint), instead of printing the 1K cleanup.
  const parentParams = readParams(parent);
  const draftOf = parentParams.draftOf
    ? { designId: parentParams.draftOf.designId, ops: [...parentParams.draftOf.ops, ...ops] }
    : needsFinalRender(parent)
      ? { designId: parent.id, ops: [...ops] }
      : undefined;

  return finalizeDesignRow({
    storeId: parent.storeId,
    source: 'edited',
    parentDesignId: parent.id,
    // A cleanup changes no look worth recording, but what the artwork has been through still travels with it.
    generationParams: { mode: 'clean', ops, capsuleId: parentParams.capsuleId, history: historyOf(parent), ...(draftOf ? { draftOf } : {}) },
    imageUrl: currentUrl,
    slot: 'print',
    keepOriginalUrl,
  });
}

/** How many earlier steps an edit sends, and how much of each. A long session
 * keeps the recent ones; the image already carries the rest. */
const HISTORY_SENT = 8;
const ENTRY_CHARS = 280;

function clip(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > ENTRY_CHARS ? `${flat.slice(0, ENTRY_CHARS - 1)}…` : flat;
}

/** The prompt for an edit. The last entry is the change to make; the entries
 * before it are what the image already shows, sent so the model keeps them
 * instead of undoing them. */
function buildEditPrompt(history: DesignHistoryEntry[]): string {
  const latest = history[history.length - 1];
  const earlier = history.slice(0, -1).slice(-HISTORY_SENT);
  const lines = [`Change the attached artwork like this: ${clip(latest.text)}.`];
  if (earlier.length > 0) {
    lines.push('Already done to it, oldest first. All of this is in the image now, so keep it:');
    earlier.forEach((entry, index) => lines.push(`${index + 1}. ${entry.kind === 'brief' ? 'Made from the brief: ' : ''}${clip(entry.text)}`));
  }
  lines.push("Keep the artist's existing artwork intact except for what was asked.");
  return lines.join('\n');
}

/**
 * An instruction edit. It changes the artwork the artist is looking at: this
 * design's own current art, not the root of its lineage. A composed design's
 * parent is the logo and a reference-guided one's is its first reference, so
 * walking up to the root would edit the wrong picture. The edit history
 * (the brief it began with and every instruction since) is sent with the new
 * instruction and extended on the new design.
 */
export async function editDesign(id: string, instruction: string): Promise<DesignSummary> {
  const design = await getDesign(id);
  if (!design) throw new Error('design_not_found');
  const anchorUrl = currentArtUrl(design);
  if (!anchorUrl) throw new Error('design_has_no_image');

  const history: DesignHistoryEntry[] = [...historyOf(design), { kind: 'edit', text: instruction, at: new Date().toISOString() }];

  const result = await falService.edit({ imageUrl: anchorUrl, prompt: buildEditPrompt(history), resolution: falService.DRAFT_RESOLUTION });
  const url = result.urls[0];
  if (!url) throw new Error('edit_produced_no_image');

  return finalizeDesignRow({
    storeId: design.storeId,
    source: 'edited',
    parentDesignId: design.id,
    generationParams: {
      mode: 'edit',
      instruction,
      anchoredTo: anchorUrl,
      capsuleId: readParams(design).capsuleId,
      resolution: falService.DRAFT_RESOLUTION,
      history,
    },
    imageUrl: url,
    slot: 'original',
  });
}

function buildCapsulePrompt(capsule: StyleCapsule | null, brief: string, extra?: string): string {
  const parts: string[] = [];
  if (capsule) {
    parts.push(capsule.promptFragment);
    parts.push(`Avoid: ${capsule.negativeFragment}.`);
  }
  if (extra) parts.push(extra);
  parts.push(brief);
  return parts.join(' ');
}

/** 'Image 2', 'Images 2-3': the model sees a list of pictures, so the prompt names them by position. */
function imageRange(from: number, count: number): string {
  return count === 1 ? `Image ${from}` : `Images ${from}-${from + count - 1}`;
}

/** Says what each attached picture is for. A picture is only mentioned when it
 * is attached, and a style anchor is never called the artist's artwork or the
 * other way round: style anchors lend their look, never their subject. */
function referenceClause(input: { styleCount: number; artworkCount: number; firstIndex?: number }): string | undefined {
  const parts: string[] = [];
  let next = input.firstIndex ?? 1;
  if (input.styleCount > 0) {
    const one = input.styleCount === 1;
    parts.push(
      `${imageRange(next, input.styleCount)} ${one ? 'is a style reference' : 'are style references'}: take ${one ? 'its' : 'their'} linework, palette and finish only, never ${one ? 'its' : 'their'} subject or composition.`,
    );
    next += input.styleCount;
  }
  if (input.artworkCount > 0) {
    const one = input.artworkCount === 1;
    parts.push(
      `${imageRange(next, input.artworkCount)} ${one ? "is the artist's own artwork" : "are the artist's own artwork"}: use ${one ? 'it as a visual reference' : 'them as visual references'} for what the brief asks for.`,
    );
  }
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export interface ComposeDesignInput {
  logoDesignId: string;
  brief: string;
  capsuleId?: string;
}

export async function composeDesign(input: ComposeDesignInput): Promise<DesignSummary> {
  const logo = await getDesign(input.logoDesignId);
  if (!logo) throw new Error('design_not_found');
  const logoUrl = logo.originalUrl ?? logo.printUrl;
  if (!logoUrl) throw new Error('design_has_no_image');

  const capsule = input.capsuleId ? getStyleCapsule(input.capsuleId) : null;
  const anchors = capsule?.referenceUrls ?? [];
  // The logo goes first, then any style anchors the capsule carries.
  const styleClause = referenceClause({ styleCount: anchors.length, artworkCount: 0, firstIndex: 2 });
  const logoClause = "Image 1 is the artist's logo: incorporate it exactly as provided into the design as its centrepiece — preserve its shape and any lettering.";
  const prompt = buildCapsulePrompt(capsule, input.brief, [logoClause, styleClause].filter(Boolean).join(' '));
  const referenceUrls = [logoUrl, ...anchors];

  const result = await falService.generate({ prompt, referenceUrls, resolution: falService.DRAFT_RESOLUTION });
  const url = result.urls[0];
  if (!url) throw new Error('composition_produced_no_image');

  return finalizeDesignRow({
    storeId: logo.storeId,
    source: 'generated',
    // Lineage only: the logo is what this was made from. An edit works on this design's own art, never the logo's.
    parentDesignId: logo.id,
    generationParams: {
      mode: 'compose',
      brief: input.brief,
      capsuleId: input.capsuleId,
      logoDesignId: logo.id,
      resolution: falService.DRAFT_RESOLUTION,
      history: [briefEntry(input.brief)],
    },
    imageUrl: url,
    slot: 'original',
  });
}

export interface GenerateDesignInput {
  storeId: string;
  brief: string;
  capsuleId?: string;
  referenceDesignIds?: string[];
}

/** Produces two variants from a single fal call (num_images: 2) to keep cost
 * and latency down — see Image-Generation-Architecture.md §8. */
export async function generateDesign(input: GenerateDesignInput): Promise<DesignSummary[]> {
  const capsule = input.capsuleId ? getStyleCapsule(input.capsuleId) : null;

  // NB2 edit accepts up to 14 reference images: the capsule's style anchors first, then the artist's own designs.
  const anchors = (capsule?.referenceUrls ?? []).slice(0, 14);
  const artwork: string[] = [];
  if (input.referenceDesignIds && input.referenceDesignIds.length > 0) {
    const refs = await Promise.all(input.referenceDesignIds.map((id) => getDesign(id)));
    for (const ref of refs) {
      const url = ref?.originalUrl ?? ref?.printUrl;
      if (url && anchors.length + artwork.length < 14) artwork.push(url);
    }
  }
  const referenceUrls = [...anchors, ...artwork];

  const prompt = buildCapsulePrompt(capsule, input.brief, referenceClause({ styleCount: anchors.length, artworkCount: artwork.length }));

  const result = await falService.generate({
    prompt,
    referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
    resolution: falService.DRAFT_RESOLUTION,
    numImages: 2,
  });
  const urls = result.urls.slice(0, 2);
  if (urls.length === 0) throw new Error('generation_produced_no_image');

  // Lineage only, like compose: the first reference is what this was made from.
  const parentDesignId = input.referenceDesignIds?.[0] ?? null;
  const generationParams = {
    mode: 'generate',
    brief: input.brief,
    capsuleId: input.capsuleId,
    referenceDesignIds: input.referenceDesignIds,
    resolution: falService.DRAFT_RESOLUTION,
    history: [briefEntry(input.brief)],
  };

  const summaries: DesignSummary[] = [];
  for (const url of urls) {
    const summary = await finalizeDesignRow({
      storeId: input.storeId,
      source: 'generated',
      parentDesignId,
      generationParams,
      imageUrl: url,
      slot: 'original',
    });
    summaries.push(summary);
  }
  return summaries;
}

// -- print-resolution art -------------------------------------------------------

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** How the art came to be, as design_versions.source names it. 'final_4k' is a draft rendered at print size. */
export type PrintArtSource = 'upload' | 'generated' | 'edited' | 'final_4k';

/** The art print prep works from. Print prep pins it as a design_versions row
 * itself (ensureDesignVersion in print-prep.ts), so nothing here writes one. */
export interface PrintReadyArt {
  designId: string;
  /** public URL of the print-resolution art */
  artUrl: string;
  widthPx: number;
  heightPx: number;
  source: PrintArtSource;
  /** true when this call rendered the 4K final; false when the art is kept as it is or the final already existed */
  rendered: boolean;
  /** the art's bytes, when this call already holds them (a fresh render); otherwise download artUrl */
  bytes?: Buffer;
}

/** An NB2 draft (or a cleanup of one) that has not been rendered at print size yet. */
function needsFinalRender(design: DesignRow): boolean {
  return isDraftArt(design.source, readParams(design), design.widthPx, design.heightPx);
}

const finalising = new Map<string, Promise<ServiceResult<PrintReadyArt>>>();

/**
 * The art print prep works from, ready before the client approves.
 *
 * - Generated or edited designs (Nano Banana's 1K drafts) are re-rendered at
 *   4K from the draft the artist chose, once. The 4K art becomes the design's
 *   print file (designs.printUrl); the draft stays in originalUrl, and
 *   generationParams.finalRender records where the final came from.
 * - Uploads, and anything cleaned from an upload, are the artist's own pixels
 *   and come back as they are: never regenerated, nothing written.
 * - It is idempotent. A design that has its final, or never needed one,
 *   returns its art without calling fal: nothing here may run after approval
 *   to change a look the client already agreed to, and a design never gets a
 *   second final. An edit makes a new design, which is finalised on its own.
 *
 * A 4K render is a long call (tens of seconds, up to the 2 minute fal timeout):
 * call it from the print worker or a route with a long maxDuration, not from
 * a short request. A failure returns a plain message and writes nothing.
 */
export function finaliseDesignForPrint(storeId: string, designId: string): Promise<ServiceResult<PrintReadyArt>> {
  // One render at a time per design in this process: a double click or two
  // parallel tool calls must not pay for two 4K renders.
  const key = `${storeId}:${designId}`;
  const running = finalising.get(key);
  if (running) return running;
  const job = renderPrintReadyArt(storeId, designId).finally(() => finalising.delete(key));
  finalising.set(key, job);
  return job;
}

async function renderPrintReadyArt(storeId: string, designId: string): Promise<ServiceResult<PrintReadyArt>> {
  const design = await getDesign(designId);
  if (!design || design.storeId !== storeId) return { ok: false, error: 'Design not found for this shop.' };
  const draftUrl = currentArtUrl(design);
  if (!draftUrl) return { ok: false, error: 'This design has no artwork yet.' };

  const params = readParams(design);
  if (!needsFinalRender(design)) {
    // The artist's own art, or a final that is already made: as it stands.
    if (!design.widthPx || !design.heightPx) return { ok: false, error: 'The artwork has no readable size.' };
    return { ok: true, value: { designId: design.id, artUrl: draftUrl, widthPx: design.widthPx, heightPx: design.heightPx, source: params.finalRender ? 'final_4k' : design.source, rendered: false } };
  }

  if (params.draftOf) return renderCleanedFinal(storeId, design, params, params.draftOf);

  let finalBuffer: Buffer;
  let finalMeta: Metadata;
  try {
    const rendered = await falService.renderFinal({ imageUrl: draftUrl });
    const url = rendered.urls[0];
    if (!url) return { ok: false, error: 'The full-size render came back empty. Try again.' };
    finalBuffer = await designIo.download(url);
    finalMeta = await sharp(finalBuffer, { density: 150 }).metadata();
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, error: `The full-size render did not finish: ${reason}` };
  }
  return keepFinal(storeId, design, params, finalBuffer, finalMeta, draftUrl);
}

/** A cleaned draft's final: the 4K render of the draft it was cleaned from (that design keeps it, so it is
 * made once), with the same cleanups made again on it. Upscaling is what the render does, so it is not
 * repeated. Before approval, like every render: the artist approves proofs made from this art. */
async function renderCleanedFinal(storeId: string, design: DesignRow, params: DesignParams, draftOf: NonNullable<DesignParams['draftOf']>): Promise<ServiceResult<PrintReadyArt>> {
  const base = await finaliseDesignForPrint(storeId, draftOf.designId);
  if (!base.ok) return base;

  let finalBuffer: Buffer;
  let finalMeta: Metadata;
  try {
    let url = base.value.artUrl;
    let buffer: Buffer | null = null;
    for (const op of draftOf.ops) {
      if (op === 'remove_bg') {
        url = (await falService.removeBackground(url)).url;
        buffer = null;
      } else if (op === 'trim') {
        buffer = await sharp(buffer ?? (await designIo.download(url)), { limitInputPixels: false }).trim().png().toBuffer();
        url = (await designIo.store({ data: buffer, contentType: 'image/png', filename: `design-${randomUUID()}-final-trim.png`, folder: `designs/${storeId}` })).url;
      }
    }
    finalBuffer = buffer ?? (await designIo.download(url));
    finalMeta = await sharp(finalBuffer, { density: 150 }).metadata();
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, error: `The full-size render did not finish: ${reason}` };
  }
  return keepFinal(storeId, design, params, finalBuffer, finalMeta, base.value.artUrl);
}

/** Keeps a final in our own storage and makes it the design's print file. */
async function keepFinal(storeId: string, design: DesignRow, params: DesignParams, finalBuffer: Buffer, finalMeta: Metadata, from: string): Promise<ServiceResult<PrintReadyArt>> {
  const widthPx = finalMeta.width ?? 0;
  const heightPx = finalMeta.height ?? 0;
  if (Math.max(widthPx, heightPx) < FINAL_MIN_EDGE_PX) {
    return { ok: false, error: `The full-size render came back at ${widthPx} × ${heightPx} px, too small to print from. Try again.` };
  }

  // fal's URL is not ours to keep: the final goes to our own storage, with a preview to match.
  const stored = await designIo.store({
    data: finalBuffer,
    contentType: contentTypeForFormat(finalMeta.format),
    filename: `design-${randomUUID()}-final.${finalMeta.format ?? 'png'}`,
    folder: `designs/${storeId}`,
  });
  const preview = await designIo.store({
    data: await sharp(finalBuffer, { density: 150 }).resize({ width: 900, withoutEnlargement: true }).png().toBuffer(),
    contentType: 'image/png',
    filename: `design-${randomUUID()}-preview.png`,
    folder: `designs/${storeId}`,
  });

  // The 4K art is what the design prints from; the draft stays as originalUrl.
  const finalRender: NonNullable<DesignParams['finalRender']> = { from, at: new Date().toISOString() };
  const [pointed] = await db
    .update(schema.designs)
    .set({ printUrl: stored.url, previewUrl: preview.url, widthPx, heightPx, generationParams: { ...params, finalRender } })
    .where(eq(schema.designs.id, design.id))
    .returning();
  try {
    await assessDesign(pointed, stored.url, finalBuffer);
  } catch (err) {
    // The readiness note is a convenience: the final exists, and the next call returns it.
    console.error('[finaliseDesignForPrint] readiness check failed:', err instanceof Error ? err.message : err);
  }

  return { ok: true, value: { designId: design.id, artUrl: stored.url, widthPx, heightPx, source: 'final_4k', rendered: true, bytes: finalBuffer } };
}

export async function listDesignsForStore(storeId: string, limit = 20): Promise<DesignSummary[]> {
  const rows = await db
    .select()
    .from(schema.designs)
    .where(eq(schema.designs.storeId, storeId))
    .orderBy(desc(schema.designs.createdAt))
    .limit(limit);
  return rows.map(toSummary);
}

