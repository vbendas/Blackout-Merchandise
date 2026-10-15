// Thin typed wrappers over fal.ai's image models. Endpoint ids and input/output
// fields verified against the live OpenAPI schemas on 6 Sep 2026 (WebFetch of
// https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id>), cross-checked
// with Documentation/05-Shared/Image-Generation-Architecture.md v2.0 and the
// client's own bundled type registry (node_modules/@fal-ai/client/src/types/endpoints.d.ts).
import { fal, type OutputType } from '@fal-ai/client';

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  fal.config({ credentials: process.env.FAL_API_KEY });
  configured = true;
}

type FalInput = Record<string, unknown>;

/** The one place that talks to fal's queue. Every wrapper below goes through
 * it, so a test replaces `subscribe` and no call ever reaches the network (or
 * costs money). Nothing else in the app should touch it. */
export const falTransport: { subscribe: (endpoint: string, input: FalInput) => Promise<{ data: unknown }> } = {
  subscribe: (endpoint, input) => {
    ensureConfigured();
    const subscribe = fal.subscribe as unknown as (id: string, options: { input: FalInput }) => Promise<{ data: unknown }>;
    return subscribe.call(fal, endpoint, { input });
  },
};

const TIMEOUT_MS = 120_000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FalError(`${label} timed out after ${TIMEOUT_MS}ms`, label)), TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Typed error surface — never carries the API key, only the failing step and a short reason. */
export class FalError extends Error {
  constructor(
    message: string,
    public readonly step: string,
  ) {
    super(message);
    this.name = 'FalError';
  }
}

function toFalError(err: unknown, step: string): FalError {
  if (err instanceof FalError) return err;
  const message = err instanceof Error ? err.message : 'fal request failed';
  return new FalError(`${step}: ${message}`, step);
}

export const FAL_ENDPOINTS = {
  /** Reference-free text-to-image. $0.08/image at 1K. No image_urls field. */
  GENERATE: 'fal-ai/nano-banana-2',
  /** Image-to-image / editing / reference-guided composition. Up to 14 reference images. */
  EDIT: 'fal-ai/nano-banana-2/edit',
  /** Background removal, flat $0.01/image, transparent PNG out. Not in the
   * client's typed endpoint registry, so input/output are hand-typed below
   * from the live OpenAPI schema. */
  REMOVE_BACKGROUND: 'fal-ai/ideogram/remove-background',
  /** Optional upscaler, only for print sizes beyond NB2's native 4K output. */
  UPSCALER: 'fal-ai/clarity-upscaler',
} as const;

export type Resolution = '0.5K' | '1K' | '2K' | '4K';

/** Drafts, the variations an artist browses and edits, render at 1K: about 93 ppi
 * at the 28 cm reference width, cheap and quick. Too small to print from. */
export const DRAFT_RESOLUTION: Resolution = '1K';
/** The final render before approval is 4K, about 372 ppi at 28 cm, so print prep
 * works from real pixels. See renderFinal. */
export const FINAL_RESOLUTION: Resolution = '4K';
export type AspectRatio = 'auto' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '4:5' | '5:4' | '2:3' | '3:2';

type NanoBananaOutput = OutputType<typeof FAL_ENDPOINTS.GENERATE>;
type UpscalerOutput = OutputType<typeof FAL_ENDPOINTS.UPSCALER>;

interface RemoveBackgroundApiOutput {
  image: { url: string; content_type?: string | null };
}

export interface RemoveBackgroundResult {
  url: string;
  contentType: string | null;
}

export async function removeBackground(imageUrl: string): Promise<RemoveBackgroundResult> {
  try {
    const { data } = (await withTimeout(
      falTransport.subscribe(FAL_ENDPOINTS.REMOVE_BACKGROUND, { image_url: imageUrl }),
      'remove_background',
    )) as { data: RemoveBackgroundApiOutput };
    return { url: data.image.url, contentType: data.image.content_type ?? null };
  } catch (err) {
    throw toFalError(err, 'remove_background');
  }
}

export interface UpscaleResult {
  url: string;
  width: number | null;
  height: number | null;
}

/** Only intended for the beyond-4K edge case — NB2's native 4K render covers most print sizes. */
export async function upscale(imageUrl: string, factor: number): Promise<UpscaleResult> {
  try {
    const { data } = (await withTimeout(
      falTransport.subscribe(FAL_ENDPOINTS.UPSCALER, { image_url: imageUrl, upscale_factor: Math.min(Math.max(factor, 1), 4) }),
      'upscale',
    )) as { data: UpscalerOutput };
    return { url: data.image.url, width: data.image.width ?? null, height: data.image.height ?? null };
  } catch (err) {
    throw toFalError(err, 'upscale');
  }
}

export interface GenerateInput {
  prompt: string;
  /** Style Capsule anchor + any content refs (logos, mascots). Capsule-guided
   * generation always routes through /edit — the plain text-to-image endpoint
   * (GENERATE) takes no reference images at all. */
  referenceUrls?: string[];
  aspect?: AspectRatio;
  resolution?: Resolution;
  /** How many images to produce in this one call (1-4). Default 1. */
  numImages?: number;
}

export interface GenerateResult {
  urls: string[];
  description: string;
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  try {
    const aspect_ratio = input.aspect ?? 'auto';
    const resolution = input.resolution ?? DRAFT_RESOLUTION;
    const num_images = Math.min(Math.max(input.numImages ?? 1, 1), 4);
    let data: NanoBananaOutput;
    if (input.referenceUrls && input.referenceUrls.length > 0) {
      ({ data } = (await withTimeout(
        falTransport.subscribe(FAL_ENDPOINTS.EDIT, { prompt: input.prompt, image_urls: input.referenceUrls, aspect_ratio, resolution, output_format: 'png', num_images }),
        'generate',
      )) as { data: NanoBananaOutput });
    } else {
      ({ data } = (await withTimeout(
        falTransport.subscribe(FAL_ENDPOINTS.GENERATE, { prompt: input.prompt, aspect_ratio, resolution, output_format: 'png', num_images }),
        'generate',
      )) as { data: NanoBananaOutput });
    }
    return { urls: data.images.map((i) => i.url), description: data.description };
  } catch (err) {
    throw toFalError(err, 'generate');
  }
}

export interface EditInput {
  /** the image to change: the version the artist is looking at, never an older one */
  imageUrl: string;
  prompt: string;
  /** Extra reference images beyond the base (e.g. a logo to compose in). */
  referenceUrls?: string[];
  /** Defaults to the draft resolution; only renderFinal asks for more. */
  resolution?: Resolution;
}

export interface EditResult {
  urls: string[];
  description: string;
}

async function runEdit(input: EditInput, step: string): Promise<EditResult> {
  try {
    const imageUrls = [input.imageUrl, ...(input.referenceUrls ?? [])];
    const { data } = (await withTimeout(
      falTransport.subscribe(FAL_ENDPOINTS.EDIT, {
        prompt: input.prompt,
        image_urls: imageUrls,
        resolution: input.resolution ?? DRAFT_RESOLUTION,
        output_format: 'png',
      }),
      step,
    )) as { data: NanoBananaOutput };
    return { urls: data.images.map((i) => i.url), description: data.description };
  } catch (err) {
    throw toFalError(err, step);
  }
}

/** Always routes through nano-banana-2/edit with imageUrl first. The caller
 * passes the image that should change, which is the artwork's current version:
 * what the artist sees is what gets edited, and the instructions already
 * applied travel in the prompt (see buildEditPrompt in designs.ts). */
export async function edit(input: EditInput): Promise<EditResult> {
  return runEdit(input, 'edit');
}

/** What a print-size render of finished art is told to do: the same picture
 * with more pixels. The model sees the draft as its input image. */
export const FINAL_RENDER_PROMPT =
  'Reproduce the attached artwork exactly, at the highest resolution you can. Do not change, add, remove or restyle anything: same composition, shapes, lettering, colours and background. Keep every edge sharp and clean.';

/**
 * The final render: the draft the artist chose, redone at 4K for print prep.
 * It runs before approval, never after: the client approves the final, and
 * nothing that can change the look of the art runs once they have
 * (Print-Prep-Plan section 3). Only for art Nano Banana made. An upload is
 * never sent here, because a regeneration would repaint the artist's own work.
 */
export async function renderFinal(input: { imageUrl: string }): Promise<EditResult> {
  return runEdit({ imageUrl: input.imageUrl, prompt: FINAL_RENDER_PROMPT, resolution: FINAL_RESOLUTION }, 'render_final');
}
