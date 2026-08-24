/**
 * fal.ai Client — Image Generation Pipeline
 *
 * Single-vendor API for all image operations:
 * - Generation (nano-banana-2) — reference-guided, Style Capsule anchor image attached
 * - Editing (nano-banana-2/edit) — re-anchored to the original base image with accumulated
 *   instructions on every round (default since Aug 24, 2026 — see Image-Generation-Architecture.md §4)
 * - Fallback generation/editing (Seedream 5.0 Pro) — same reference-guided pattern, same fal key
 * - Background removal (ideogram/remove-background)
 * - Optional upscaling (clarity-upscaler) — beyond-4K edge case only; NB2's native 4K output
 *   is print-ready for the vast majority of sizes, so this is not in the critical path
 * - Optional cheap preview tier (flux-2 dev) — may be dropped at launch
 *
 * Strategy pivot (Aug 24, 2026): custom-trained style LoRAs are no longer the primary style
 * mechanism. Reference-guided generation on off-the-shelf frontier models outperformed LoRA
 * training and raw text-to-image in head-to-head testing. LoRA training is re-scoped to
 * post-MVP artist-signature packs (see LEGACY_LORA_ENDPOINTS below and doc §7).
 *
 * Full architecture: Documentation/05-Shared/Image-Generation-Architecture.md (v2.0)
 *
 * TODO (Day 10 sprint): Install @fal-ai/client
 *   bun add @fal-ai/client
 */

export const FAL_ENDPOINTS = {
  /** Primary text-to-image generation. $0.08/image at 1K (0.75x at 0.5K, 1.5x at 2K, 2x at 4K). Up to 14 reference images. */
  GENERATE: 'fal-ai/nano-banana-2',
  /**
   * Primary image-to-image / editing / reference-guided composition. Same pricing tier as GENERATE.
   * Re-anchor every edit round to the base image with accumulated instructions (default —
   * degradation traced to sequential re-encoding noise, not style drift; see doc §4, ADR-004).
   */
  EDIT: 'fal-ai/nano-banana-2/edit',
  /** Fallback text-to-image if NB2 is unavailable. Same reference-guided pattern, same fal key. Up to 10 reference images. */
  FALLBACK_GENERATE: 'bytedance/seedream/v5/pro/text-to-image',
  /**
   * Fallback image-to-image / editing. First input image free, +$0.0045/additional input image,
   * output $0.0675+ (<=1536x1536) or $0.135+ (up to 2048x2048).
   */
  FALLBACK_EDIT: 'bytedance/seedream/v5/pro/edit',
  /** Remove background for transparent PNG. $0.01/image (flat). Production-validated Aug 24, 2026 (30/30 clean cutouts). */
  REMOVE_BACKGROUND: 'fal-ai/ideogram/remove-background',
  /** Optional — only invoked when a print size exceeds NB2's native 4K output. $0.03/MP. */
  UPSCALER: 'fal-ai/clarity-upscaler',
  /** Optional cheap preview/thumbnail tier. $0.012/MP. Not in the critical generation path; may be dropped at launch. */
  FLUX2_DEV_PREVIEW: 'fal-ai/flux-2',
} as const;

/**
 * Legacy LoRA endpoints — re-scoped to post-MVP artist-signature style packs (see
 * Image-Generation-Architecture.md §7). Not part of the MVP critical path. Kept here for the
 * post-MVP artist-pack workflow: training real flash from partner tattooers/artists with
 * written ML-training permission, where an individual artist's hand is distinctive enough
 * that frontier-model reference-guided generation can't reproduce it.
 *
 * Existing trained artifacts (american-traditional-v1, american-traditional-v1-white —
 * $12.80 total spent) are preserved as baseline evidence at data/LoRAs/trained/. Their
 * dataset now also serves as the Style Capsule reference library for American Traditional.
 */
export const LEGACY_LORA_ENDPOINTS = {
  /** Train a custom LoRA. $0.0064/step (~$6.40 per 1000-step LoRA). */
  TRAIN_LORA: 'fal-ai/flux-2-trainer',
  /** Generate with a trained LoRA. $0.021/MP. */
  GENERATE_WITH_LORA: 'fal-ai/flux-2/lora',
  /** LoRA-aware editing. $0.021/MP. */
  EDIT_WITH_LORA: 'fal-ai/flux-2/lora/edit',
} as const;

/**
 * Style templates seed data for the Style Capsule system (Image-Generation-Architecture.md §6).
 * Each entry maps a gallery card to a prompt template; the curated reference image library
 * and per-image attribute extraction JSON live at data/LoRAs/style-extraction/ and are
 * synthesized into a capsule (macro + micro instructions + one anchor image) at generation
 * time — see resolveStyleCapsule() in styleCapsule.ts (not yet implemented).
 *
 * These were originally LoRA trigger words; they now seed `promptTemplate` on the `styles`
 * registry table (doc §9) instead of a trained LoRA slug.
 */
export const LORA_STYLES = {
  'american-traditional': {
    displayName: 'American Traditional',
    triggerWord: 'american traditional',
    description: 'Bold lines, vintage tattoo aesthetic, limited color palette',
    bestFor: 'Band merch, tattoo-inspired designs, vintage aesthetics',
  },
  japanese: {
    displayName: 'Japanese',
    triggerWord: 'japanese style',
    description: 'Irezumi, koi, dragons, waves — traditional Japanese tattoo art',
    bestFor: 'Japanese-inspired designs, full-sleeve aesthetics, mythical creatures',
  },
  blackwork: {
    displayName: 'Blackwork',
    triggerWord: 'blackwork',
    description: 'All-black, geometric, dotwork, mandala — bold and graphic',
    bestFor: 'Minimalist dark designs, geometric patterns, statement pieces',
  },
  'vintage-90s': {
    displayName: "Vintage 90's",
    triggerWord: 'vintage 90s',
    description: 'Grunge, distressed, retro band tees — 90s aesthetic',
    bestFor: 'Retro band merch, grunge aesthetics, nostalgic designs',
  },
  realism: {
    displayName: 'Realism',
    triggerWord: 'realism',
    description: 'Photorealistic portraits, nature scenes, detailed artwork',
    bestFor: 'Portrait designs, nature themes, highly detailed illustrations',
  },
  'dark-art': {
    displayName: 'Dark Art',
    triggerWord: 'dark art',
    description: 'Gothic, horror, occult, macabre — dark aesthetics',
    bestFor: 'Metal merch, horror themes, gothic designs, Halloween collections',
  },
} as const;

export type LoRAStyleSlug = keyof typeof LORA_STYLES;

/**
 * Select the generation/edit model for the current round, with fallback awareness.
 *
 * Single-tier NB2 edit — no fast/max split. Kept as a function (rather than inlining
 * `FAL_ENDPOINTS.EDIT`) for call-site stability and to hold the fallback-routing decision
 * point if NB2 becomes unavailable (routes to FALLBACK_EDIT on the same reference-guided
 * pattern — see doc ADR-001).
 */
export function selectEditModel(useFallback = false): string {
  return useFallback ? FAL_ENDPOINTS.FALLBACK_EDIT : FAL_ENDPOINTS.EDIT;
}

/**
 * Calculate the cost of a design generation pipeline in cents.
 *
 * Per-unit prices verified Aug 24, 2026 (Image-Generation-Architecture.md §8). NB2 is
 * single-tier per resolution: $0.08 at 1K, $0.06 at 0.5K, $0.12 at 2K, $0.16 at 4K.
 */
export function calculateDesignCostCents(params: {
  generation: boolean; // Initial generation at 1K ($0.08)
  editRounds: number; // Number of edit rounds — single tier, all rounds $0.08 each
  bgRemoval: boolean; // Background removal ($0.01/image, flat)
  finalRender4K: boolean; // Native 4K finalization render ($0.16) — replaces the old upscale step
  upscaleBeyond4K?: boolean; // Rare edge case: print size exceeds native 4K (clarity-upscaler, $0.03/MP)
}): number {
  let costCents = 0;

  if (params.generation) costCents += 8; // $0.08 at 1K tier

  costCents += params.editRounds * 8; // $0.08/round, single tier, re-anchored to base each round

  if (params.bgRemoval) costCents += 1; // $0.01 flat

  if (params.finalRender4K) costCents += 16; // $0.16 native 4K render — print-ready, no upscaler needed

  // Optional — only when a print size exceeds NB2's native 4K output. Not part of the
  // standard per-design cost model (Image-Generation-Architecture.md §8).
  if (params.upscaleBeyond4K) costCents += 200; // Rough estimate, ~2x upscale on a 4K image

  return costCents;
}

/**
 * fal.ai client placeholder.
 * Will be initialized with @fal-ai/client during Day 10 sprint.
 *
 * Usage (after install):
 * ```ts
 * import { createFalClient } from '@fal-ai/client';
 * export const falClient = createFalClient({
 *   credentials: process.env.FAL_API_KEY!,
 * });
 * ```
 */
export const falClient = null; // Placeholder — wire in Day 10 sprint

/**
 * Generate a design with fal.ai Nano Banana 2, reference-guided by a Style Capsule anchor image.
 * To be implemented in Day 10 sprint.
 */
export async function generateDesign(_params: {
  prompt: string;
  styleId?: LoRAStyleSlug;
  anchorImageUrl?: string;
  width?: number;
  height?: number;
}): Promise<{ imageUrl: string; seed: number }> {
  throw new Error('fal.ai client not yet configured. Install @fal-ai/client in Day 10 sprint.');
}

/**
 * Edit a design with fal.ai Nano Banana 2 edit, re-anchored to the base image with
 * accumulated instructions (default strategy — see doc §4, ADR-004).
 * To be implemented in Day 12 sprint.
 */
export async function editDesign(_params: {
  baseImageUrl: string;
  accumulatedInstructions: string;
  editRound: number;
}): Promise<{ imageUrl: string; editRound: number }> {
  throw new Error('Edit endpoint not yet configured. Wire in Day 12 sprint.');
}

/**
 * Finalize a design for print: background removal + native 4K render (upscale only if the
 * print size exceeds native 4K — see doc §3, §7).
 * To be implemented in Day 12 sprint.
 */
export async function finalizeDesign(_params: {
  imageUrl: string;
  needsUpscale?: boolean;
}): Promise<{ imageUrl: string; finalSize: string }> {
  throw new Error('Finalization endpoint not yet configured. Wire in Day 12 sprint.');
}
