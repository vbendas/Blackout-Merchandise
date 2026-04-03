/**
 * Cloudinary URL builder for image transformations
 * Builds transformation chains for non-destructive image editing
 */

import type { Transformation, TransformationType } from '@/types/transformations';

// Cloudinary configuration
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drhfgth7c';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload`;

// Map transformation types to Cloudinary URL parameters
// Using Record for internal implementation flexibility
const TRANSFORMATION_MAP: Record<TransformationType, (params?: Record<string, string | number>) => string> = {
  // Background
  remove_bg: () => 'e_background_removal',

  // Enhance
  auto_enhance: () => 'e_auto_adjust',
  sharpen: (p) => `e_sharpen:${p?.amount || 100}`,
  upscale: () => 'e_upscale',
  noise_reduction: () => 'e_noise_reduction',
  gen_restore: () => 'e_gen_restore',

  // Adjustments
  brightness: (p) => `e_brightness:${p?.value || 0}`,
  contrast: (p) => `e_contrast:${p?.value || 0}`,
  saturation: (p) => `e_saturation:${p?.value || 0}`,

  // Effects
  grayscale: () => 'e_grayscale',
  sepia: () => 'e_sepia',
  vignette: (p) => `e_vignette:${p?.strength || 30}`,
  oil_paint: (p) => `e_oil_paint:${p?.strength || 30}`,
  cartoonify: (p) => `e_cartoonify:${p?.strength || 50}`,
  vectorize: () => 'e_vectorize',

  // Geometry
  flip_h: () => 'a_hflip',
  flip_v: () => 'a_vflip',
  rotate_90: () => 'a_90',
  rotate_180: () => 'a_180',
  rotate_270: () => 'a_270',

  // Style
  drop_shadow: (p) =>
    `e_shadow:${p?.x || 10},${p?.y || 10},${p?.blur || 10},${String(p?.color || 'black').replace('#', '')}`,
  border: (p) => `bo_${p?.width || 2}px_solid_${String(p?.color || 'white').replace('#', '')}`,
  round_corners: (p) => `r_${p?.radius || 20}`,
  tint: (p) => `e_tint:${String(p?.color || 'red').replace('#', '')}:${p?.strength || 50}`,

  // Advanced AI
  gen_fill: () => 'e_gen_fill',
  smart_crop: () => 'g_auto,c_fill',
  gen_recolor: (p) =>
    `e_gen_recolor:${String(p?.target || 'object').replace('#', '')}:${String(p?.color || 'blue').replace('#', '')}`,

  // Arrange (client-side only, return empty string)
  bring_front: () => '',
  send_back: () => '',
  move_up: () => '',
  move_down: () => '',
};

// Client-side only transformations (no Cloudinary params)
const CLIENT_SIDE_TRANSFORMATIONS: TransformationType[] = ['bring_front', 'send_back', 'move_up', 'move_down'];

/**
 * Check if a transformation is client-side only
 */
export function isClientSideTransformation(type: TransformationType): boolean {
  return CLIENT_SIDE_TRANSFORMATIONS.includes(type);
}

/**
 * Parse a Cloudinary URL into base URL and public ID
 */
export function parseCloudinaryUrl(url: string): { baseUrl: string; publicId: string } {
  // Handle already transformed URLs
  const uploadMatch = url.match(/\/image\/upload\/(.+)$/);
  if (!uploadMatch) {
    throw new Error('Invalid Cloudinary URL');
  }

  const path = uploadMatch[1];

  // Check if URL already has transformations
  const parts = path.split('/');

  // If first part contains transformation params (has commas or specific prefixes)
  if (
    parts[0] &&
    (parts[0].includes(',') ||
      parts[0].startsWith('f_') ||
      parts[0].startsWith('q_') ||
      parts[0].startsWith('w_') ||
      parts[0].startsWith('e_') ||
      parts[0].startsWith('a_') ||
      parts[0].startsWith('c_') ||
      parts[0].startsWith('g_') ||
      parts[0].startsWith('bo_') ||
      parts[0].startsWith('r_'))
  ) {
    // Extract public ID (last part)
    const publicId = parts[parts.length - 1];
    return { baseUrl: CLOUDINARY_BASE, publicId };
  }

  // No existing transformations
  return { baseUrl: CLOUDINARY_BASE, publicId: path };
}

/**
 * Build a transformed Cloudinary URL from a chain of transformations
 */
export function buildTransformedUrl(originalUrl: string, transformations: Transformation[]): string {
  if (!transformations.length) return originalUrl;

  try {
    const { baseUrl, publicId } = parseCloudinaryUrl(originalUrl);

    // Build transformation chain (filter out client-side only)
    const transformChain = transformations
      .filter((t) => !isClientSideTransformation(t.type))
      .map((t) => TRANSFORMATION_MAP[t.type](t.params))
      .filter(Boolean) // Remove empty strings
      .join(',');

    if (!transformChain) return originalUrl;

    // Always include optimization
    const optimization = 'f_auto,q_auto';

    return `${baseUrl}/${optimization},${transformChain}/${publicId}`;
  } catch (error) {
    console.error('Error building transformed URL:', error);
    return originalUrl;
  }
}

/**
 * Build a preview URL with a single transformation
 * Useful for real-time preview before applying
 */
export function buildPreviewUrl(
  originalUrl: string,
  type: TransformationType,
  params?: Record<string, string | number>
): string {
  if (isClientSideTransformation(type)) return originalUrl;

  try {
    const { baseUrl, publicId } = parseCloudinaryUrl(originalUrl);
    const transform = TRANSFORMATION_MAP[type](params);

    if (!transform) return originalUrl;

    const optimization = 'f_auto,q_auto';
    return `${baseUrl}/${optimization},${transform}/${publicId}`;
  } catch (error) {
    console.error('Error building preview URL:', error);
    return originalUrl;
  }
}

/**
 * Get the Cloudinary parameter for a transformation type
 * Useful for debugging
 */
export function getTransformationParam(type: TransformationType, params?: Record<string, string | number>): string {
  return TRANSFORMATION_MAP[type](params);
}

/**
 * Validate a transformation chain
 * Returns array of valid transformations
 */
export function validateTransformations(transformations: Transformation[]): Transformation[] {
  return transformations.filter((t) => {
    // Check if type is valid
    if (!TRANSFORMATION_MAP[t.type]) {
      console.warn(`Invalid transformation type: ${t.type}`);
      return false;
    }
    return true;
  });
}

/**
 * Remove duplicate transformations of the same type
 * Keeps the most recent one
 */
export function deduplicateTransformations(transformations: Transformation[]): Transformation[] {
  const seen = new Set<TransformationType>();
  const result: Transformation[] = [];

  // Iterate in reverse to keep most recent
  for (let i = transformations.length - 1; i >= 0; i--) {
    const t = transformations[i];
    if (!seen.has(t.type)) {
      seen.add(t.type);
      result.unshift(t); // Add to beginning to maintain order
    }
  }

  return result;
}

/**
 * Check if a URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') && url.includes('/image/upload/');
}

/**
 * Extract public ID from any Cloudinary URL
 */
export function extractPublicId(url: string): string | null {
  try {
    const { publicId } = parseCloudinaryUrl(url);
    return publicId;
  } catch {
    return null;
  }
}

/**
 * Get original URL without transformations
 */
export function getOriginalUrl(url: string): string {
  try {
    const { baseUrl, publicId } = parseCloudinaryUrl(url);
    return `${baseUrl}/f_auto,q_auto/${publicId}`;
  } catch {
    return url;
  }
}
