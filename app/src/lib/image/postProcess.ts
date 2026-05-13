/**
 * Image Post-Processing Pipeline (Sharp)
 * 
 * Deterministic, server-side image processing that runs after every AI edit round.
 * Free (no API costs), sub-second, and critical for print quality.
 * 
 * Why: AI generation produces slightly soft images. Screen printing requires
 * crisp edges and high contrast. Sharp fixes this deterministically.
 * 
 * TODO (Day 10 sprint): Install sharp
 *   bun add sharp
 *   bun add -D @types/sharp
 * 
 * Full architecture: Documentation/05-Shared/Image-Generation-Architecture.md
 */

export interface PostProcessOptions {
  /** Apply unsharp mask — counteract AI softening. Default: true */
  sharpen?: boolean;
  /** Contrast adjustment — improve print contrast. Range: -1 to 1. Default: 0.2 */
  contrast?: number;
  /** Brightness adjustment. Range: -1 to 1. Default: 0 */
  brightness?: number;
  /** Normalize histogram — spread tonal range. Default: true */
  normalize?: boolean;
}

const DEFAULT_OPTIONS: Required<PostProcessOptions> = {
  sharpen: true,
  contrast: 0.2,
  brightness: 0,
  normalize: true,
};

/**
 * Post-process an image buffer with Sharp.
 * 
 * Pipeline:
 * 1. Normalize histogram (spread tonal range)
 * 2. Sharpen (unsharp mask — sigma 1.5)
 * 3. Adjust contrast (linear transform)
 * 4. Output as PNG (quality: 100)
 * 
 * TODO (Day 10 sprint): Implement with sharp after `bun add sharp`
 */
export async function postProcessImage(
  _inputBuffer: Buffer,
  _options: PostProcessOptions = {}
): Promise<Buffer> {
  // Placeholder — will be implemented with sharp in Day 10 sprint
  //
  // Implementation:
  // const opts = { ...DEFAULT_OPTIONS, ...options };
  // let pipeline = sharp(inputBuffer);
  // if (opts.normalize) pipeline = pipeline.normalize();
  // if (opts.sharpen) pipeline = pipeline.sharpen({ sigma: 1.5, m1: 1.0, m2: 0.5 });
  // if (opts.contrast !== 0) pipeline = pipeline.linear(1 + opts.contrast, -(128 * opts.contrast));
  // return pipeline.png({ quality: 100 }).toBuffer();
  
  throw new Error('Sharp not yet installed. Run `bun add sharp` in Day 10 sprint.');
}

/**
 * Overlay text/logo onto a design image.
 * Used when artists provide their own logos/letterings.
 * 
 * TODO (Day 10 sprint): Implement with sharp.composite()
 */
export async function overlayTypography(_params: {
  imageBuffer: Buffer;
  text?: string;
  logoBuffer?: Buffer;
  position: 'top' | 'bottom' | 'center';
  fontSize?: number;
  color?: string;
}): Promise<Buffer> {
  throw new Error('Typography overlay not yet implemented. Wire in Day 10 sprint.');
}
