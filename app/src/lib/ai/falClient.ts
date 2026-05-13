/**
 * fal.ai Client — Image Generation Pipeline
 * 
 * Single-vendor API for all image operations:
 * - LoRA training (flux-2-trainer)
 * - Generation with LoRA (flux-2-dev/lora)
 * - Iterative editing (kontext / kontext/max)
 * - Upscaling (flux-2-upscaler)
 * - Background removal (ideogram/remove-background)
 * 
 * Full architecture: Documentation/05-Shared/Image-Generation-Architecture.md
 * 
 * TODO (Day 10 sprint): Install @fal-ai/client
 *   bun add @fal-ai/client
 */

export const FAL_ENDPOINTS = {
  /** Train a custom LoRA on Expert's expert designs */
  TRAIN_LORA: 'fal-ai/flux-2-trainer',
  /** Generate a new design with up to 3 LoRA styles */
  GENERATE_WITH_LORA: 'fal-ai/flux-2-dev/lora',
  /** Iterative editing — rounds 1-3 (fast, cheaper) */
  KONTEXT: 'fal-ai/flux-2-kontext',
  /** Iterative editing — round 4+ (higher fidelity) */
  KONTEXT_MAX: 'fal-ai/flux-2-kontext/max',
  /** Upscale to print resolution (2048→4096+) */
  UPSCALER: 'fal-ai/flux-2-upscaler',
  /** Remove background for transparent PNG */
  REMOVE_BACKGROUND: 'fal-ai/ideogram/remove-background',
} as const;

/** MVP LoRA styles for the visual gallery */
export const LORA_STYLES = {
  'american-traditional': {
    displayName: 'American Traditional',
    triggerWord: 'american traditional',
    description: 'Bold lines, vintage tattoo aesthetic, limited color palette',
    bestFor: 'Band merch, tattoo-inspired designs, vintage aesthetics',
  },
  'japanese': {
    displayName: 'Japanese',
    triggerWord: 'japanese style',
    description: 'Irezumi, koi, dragons, waves — traditional Japanese tattoo art',
    bestFor: 'Japanese-inspired designs, full-sleeve aesthetics, mythical creatures',
  },
  'blackwork': {
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
  'realism': {
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
 * Select the appropriate Kontext model based on edit round number.
 * Rounds 1-3 use Kontext Pro ($0.04), rounds 4+ use Kontext MAX ($0.08).
 */
export function selectKontextModel(editRound: number): string {
  if (editRound <= 3) return FAL_ENDPOINTS.KONTEXT;
  return FAL_ENDPOINTS.KONTEXT_MAX;
}

/**
 * Calculate the cost of a design generation pipeline in cents.
 */
export function calculateDesignCostCents(params: {
  generation: boolean;      // Initial generation ($0.05)
  editRounds: number;       // Number of Kontext edit rounds
  bgRemoval: boolean;       // Background removal ($0.02)
  upscale: boolean;         // Upscale to print resolution ($0.03)
}): number {
  let costCents = 0;
  
  if (params.generation) costCents += 5;  // $0.05
  
  // Edit rounds: first 3 at $0.04, round 4+ at $0.08
  for (let i = 1; i <= params.editRounds; i++) {
    costCents += i <= 3 ? 4 : 8;
  }
  
  if (params.bgRemoval) costCents += 2;   // $0.02
  if (params.upscale) costCents += 3;     // $0.03
  
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
 * Generate a design with fal.ai FLUX 2 Dev + LoRA.
 * To be implemented in Day 10 sprint.
 */
export async function generateDesign(_params: {
  prompt: string;
  loraStyle?: LoRAStyleSlug;
  width?: number;
  height?: number;
}): Promise<{ imageUrl: string; seed: number }> {
  throw new Error('fal.ai client not yet configured. Install @fal-ai/client in Day 10 sprint.');
}

/**
 * Edit a design with fal.ai Kontext.
 * To be implemented in Day 12 sprint.
 */
export async function editDesign(_params: {
  imageUrl: string;
  instruction: string;
  editRound: number;
}): Promise<{ imageUrl: string; editRound: number }> {
  throw new Error('Kontext editing not yet configured. Wire in Day 12 sprint.');
}

/**
 * Upscale a design to print resolution with fal.ai.
 * To be implemented in Day 12 sprint.
 */
export async function upscaleDesign(_params: {
  imageUrl: string;
}): Promise<{ imageUrl: string; originalSize: string; upscaledSize: string }> {
  throw new Error('Upscaler not yet configured. Wire in Day 12 sprint.');
}
