// Design intake pipeline: upload metadata + readiness assessment, cleanup
// (remove background / upscale / trim), instruction edits, logo composition,
// and from-scratch generation via fal (Nano Banana 2). See
// Documentation/Dev/Platform-Plan.md §4 "Design" and
// Documentation/05-Shared/Image-Generation-Architecture.md.
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
}): { readiness: DesignReadiness; notes: string[] } {
  const notes: string[] = [];

  if (!input.formatSupported) {
    return { readiness: 'blocked', notes: ['Unsupported or unreadable image file.'] };
  }
  if (input.dpi === null) {
    return { readiness: 'blocked', notes: ['Could not determine image dimensions.'] };
  }
  if (input.dpi < 100) {
    notes.push(`Only ${input.dpi} dpi at a 28cm print width — too low to print cleanly (need at least 100 dpi).`);
    return { readiness: 'blocked', notes };
  }
  if (input.dpi < 150) {
    notes.push(`${input.dpi} dpi at a 28cm print width is workable but soft; upscaling is recommended for a crisp print.`);
    return { readiness: 'needs_cleanup', notes };
  }

  notes.push(`${input.dpi} dpi at a 28cm print width — sharp enough to print.`);

  if (input.background === 'photo') {
    notes.push('Background looks like a photo/busy scene — remove it before printing on a garment.');
    return { readiness: 'needs_cleanup', notes };
  }
  if (input.hasAlpha) {
    notes.push('Transparent background — ready to print as-is.');
    return { readiness: 'ready', notes };
  }
  const plainWhiteOrBlack = input.meanBrightness !== null && (input.meanBrightness > 240 || input.meanBrightness < 15);
  if (input.background === 'flat' && plainWhiteOrBlack) {
    notes.push('Plain white/black background — ready to print as-is.');
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
  const buffer = await downloadBuffer(params.imageUrl);

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

  const stored = await putFile({
    data: buffer,
    contentType,
    filename: `design-${randomUUID()}.${format ?? 'bin'}`,
    folder: `designs/${params.storeId}`,
  });

  const previewBuffer = await sharp(buffer, { density: 150 })
    .resize({ width: 900, withoutEnlargement: true })
    .png()
    .toBuffer();
  const preview = await putFile({
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

  const { readiness, notes } = computeReadiness({
    dpi,
    hasAlpha,
    background: effectiveBackground,
    meanBrightness: background.meanBrightness,
    formatSupported,
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
  const stored = await putFile({
    data: input.data,
    contentType: input.contentType,
    filename: input.filename,
    folder: `designs/${input.storeId}`,
  });
  return finalizeDesignRow({ storeId: input.storeId, source: 'upload', parentDesignId: null, imageUrl: stored.url, slot: 'original' });
}

/** Re-runs the readiness assessment (including a fresh vision pass, when
 * configured) against the design's current artifact and persists it. */
export async function analyzeDesign(id: string): Promise<DesignSummary> {
  const row = await getDesign(id);
  if (!row) throw new Error('design_not_found');
  const imageUrl = row.printUrl ?? row.originalUrl;
  if (!imageUrl) throw new Error('design_has_no_image');

  const buffer = await downloadBuffer(imageUrl);
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { density: 150 }).metadata();
  } catch {
    const [updated] = await db
      .update(schema.designs)
      .set({ readiness: 'blocked', readinessNotes: 'Unsupported or unreadable image file.' })
      .where(eq(schema.designs.id, id))
      .returning();
    return toSummary(updated);
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
      .where(eq(schema.designs.id, id))
      .returning();
    return toSummary(updated);
  }

  const background = await detectBackground(buffer, meta);
  const vision = await analyzeWithVision(imageUrl);
  const effectiveBackground = vision?.background ?? background.background;

  const { readiness, notes } = computeReadiness({
    dpi,
    hasAlpha,
    background: effectiveBackground,
    meanBrightness: background.meanBrightness,
    formatSupported,
  });
  if (vision?.notes) notes.push(vision.notes);
  if (vision?.hasText) notes.push('Contains text/lettering — check legibility at print size.');

  const [updated] = await db
    .update(schema.designs)
    .set({ readiness, readinessNotes: notes.join('\n'), widthPx, heightPx, dpiAtPrint: dpi, hasAlpha })
    .where(eq(schema.designs.id, id))
    .returning();
  return toSummary(updated);
}

export async function cleanDesign(id: string, ops: CleanOp[]): Promise<DesignSummary> {
  const parent = await getDesign(id);
  if (!parent) throw new Error('design_not_found');
  let currentUrl = parent.printUrl ?? parent.originalUrl;
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
      const buffer = await downloadBuffer(currentUrl);
      const trimmed = await sharp(buffer).trim().png().toBuffer();
      const stored = await putFile({
        data: trimmed,
        contentType: 'image/png',
        filename: `design-${randomUUID()}-trim.png`,
        folder: `designs/${parent.storeId}`,
      });
      currentUrl = stored.url;
    }
  }

  return finalizeDesignRow({
    storeId: parent.storeId,
    source: 'edited',
    parentDesignId: parent.id,
    generationParams: { ops },
    imageUrl: currentUrl,
    slot: 'print',
    keepOriginalUrl,
  });
}

/** Walks the parentDesignId chain to the root artifact, so edits always
 * re-anchor to the ORIGINAL base image rather than a chained intermediate
 * (Image-Generation-Architecture.md §4, ADR-004). */
async function resolveBaseImageUrl(design: DesignRow): Promise<string> {
  let current = design;
  for (let depth = 0; depth < 20 && current.parentDesignId; depth += 1) {
    const parent = await getDesign(current.parentDesignId);
    if (!parent) break;
    current = parent;
  }
  const url = current.originalUrl ?? current.printUrl ?? design.originalUrl ?? design.printUrl;
  if (!url) throw new Error('design_has_no_image');
  return url;
}

export async function editDesign(id: string, instruction: string): Promise<DesignSummary> {
  const design = await getDesign(id);
  if (!design) throw new Error('design_not_found');
  const baseUrl = await resolveBaseImageUrl(design);

  const result = await falService.edit({
    imageUrl: baseUrl,
    prompt: `${instruction}. Keep the artist's existing artwork intact except for what was asked.`,
  });
  const url = result.urls[0];
  if (!url) throw new Error('edit_produced_no_image');

  return finalizeDesignRow({
    storeId: design.storeId,
    source: 'edited',
    parentDesignId: design.id,
    generationParams: { instruction, reAnchoredTo: baseUrl },
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
  const prompt = buildCapsulePrompt(
    capsule,
    input.brief,
    'Incorporate the attached logo exactly as provided into the design as its centrepiece — preserve its shape and any lettering.',
  );
  const referenceUrls = [logoUrl, ...(capsule?.referenceUrls ?? [])];

  const result = await falService.generate({ prompt, referenceUrls, resolution: '1K' });
  const url = result.urls[0];
  if (!url) throw new Error('composition_produced_no_image');

  return finalizeDesignRow({
    storeId: logo.storeId,
    source: 'generated',
    parentDesignId: logo.id,
    generationParams: { brief: input.brief, capsuleId: input.capsuleId, mode: 'compose' },
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
  const prompt = buildCapsulePrompt(
    capsule,
    input.brief,
    capsule ? 'Use the reference image for style only, not subject or composition.' : undefined,
  );

  let referenceUrls: string[] = [...(capsule?.referenceUrls ?? [])];
  if (input.referenceDesignIds && input.referenceDesignIds.length > 0) {
    const refs = await Promise.all(input.referenceDesignIds.map((id) => getDesign(id)));
    for (const ref of refs) {
      const url = ref?.originalUrl ?? ref?.printUrl;
      if (url) referenceUrls.push(url);
    }
  }
  referenceUrls = referenceUrls.slice(0, 14); // NB2 edit accepts up to 14 reference images

  const result = await falService.generate({
    prompt,
    referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
    resolution: '1K',
    numImages: 2,
  });
  const urls = result.urls.slice(0, 2);
  if (urls.length === 0) throw new Error('generation_produced_no_image');

  const parentDesignId = input.referenceDesignIds?.[0] ?? null;
  const generationParams = { brief: input.brief, capsuleId: input.capsuleId, referenceDesignIds: input.referenceDesignIds };

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

export async function listDesignsForStore(storeId: string, limit = 20): Promise<DesignSummary[]> {
  const rows = await db
    .select()
    .from(schema.designs)
    .where(eq(schema.designs.storeId, storeId))
    .orderBy(desc(schema.designs.createdAt))
    .limit(limit);
  return rows.map(toSummary);
}

