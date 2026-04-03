/**
 * Cloudinary transformation utilities for design images
 * Applies non-destructive transformations to design URLs
 */

import type { Transformation, TransformationType } from '@/types/transformations';

/**
 * Build a Cloudinary URL with transformations applied
 * @param originalUrl - The original design URL
 * @param transformations - Array of transformations to apply
 * @returns Transformed Cloudinary URL
 */
export function buildTransformedUrl(originalUrl: string, transformations: Transformation[]): string {
  // If no transformations, return original URL
  if (!transformations || transformations.length === 0) {
    return originalUrl;
  }

  // Check if it's a Cloudinary URL
  if (!originalUrl.includes('cloudinary.com')) {
    // For non-Cloudinary URLs, we can't apply transformations
    // In production, this would upload to Cloudinary first
    return originalUrl;
  }

  // Parse the original URL to extract the base and public ID
  const urlParts = originalUrl.split('/upload/');
  if (urlParts.length !== 2) {
    return originalUrl;
  }

  const baseUrl = urlParts[0] + '/upload';
  const publicId = urlParts[1];

  // Build transformation string
  const transformationStrings = transformations.map((t) => {
    return getTransformationString(t.type, t.params);
  });

  // Combine all transformations
  const transformationChain = transformationStrings.join(',');

  // Build final URL
  return `${baseUrl}/${transformationChain}/${publicId}`;
}

/**
 * Get Cloudinary transformation string for a given transformation type
 */
function getTransformationString(type: TransformationType, params?: Record<string, string | number>): string {
  switch (type) {
    // Background
    case 'remove_bg':
      return 'e_background_removal';

    // Enhance
    case 'auto_enhance':
      return 'e_improve';
    case 'sharpen':
      return `e_sharpen:${params?.amount || 100}`;
    case 'upscale':
      return 'e_upscale';
    case 'noise_reduction':
      return 'e_noise_reduction';
    case 'gen_restore':
      return 'e_gen_restore';

    // Adjustments
    case 'brightness':
      return `e_brightness:${params?.value || 0}`;
    case 'contrast':
      return `e_contrast:${params?.value || 0}`;
    case 'saturation':
      return `e_saturation:${params?.value || 0}`;

    // Effects
    case 'grayscale':
      return 'e_grayscale';
    case 'sepia':
      return 'e_sepia';
    case 'vignette':
      return `e_vignette:${params?.strength || 30}`;
    case 'oil_paint':
      return `e_oil_paint:${params?.strength || 30}`;
    case 'cartoonify':
      return `e_cartoonify:${params?.strength || 50}`;
    case 'vectorize':
      return 'e_vectorize';

    // Geometry
    case 'flip_h':
      return 'a_hflip';
    case 'flip_v':
      return 'a_vflip';
    case 'rotate_90':
      return 'a_90';
    case 'rotate_180':
      return 'a_180';
    case 'rotate_270':
      return 'a_270';

    // Style
    case 'drop_shadow':
      return `e_shadow:${params?.x || 10}:${params?.y || 10}:${params?.blur || 10}:${String(params?.color || '#000000').replace('#', '')}`;
    case 'border':
      return `bo_${params?.width || 2}px_solid_${String(params?.color || '#FFFFFF').replace('#', '')}`;
    case 'round_corners':
      return `r_${params?.radius || 20}`;
    case 'tint':
      return `e_tint:${params?.strength || 50}:${String(params?.color || '#FF0000').replace('#', '')}`;

    // Advanced AI
    case 'gen_fill':
      return 'e_gen_fill';
    case 'smart_crop':
      return 'c_auto,g_auto';
    case 'gen_recolor':
      return 'e_gen_recolor';

    // Arrange (z-index) - no visual transformation, handled client-side
    case 'bring_front':
    case 'send_back':
    case 'move_up':
    case 'move_down':
      return '';

    default:
      return '';
  }
}

/**
 * Apply a single transformation to a URL
 * Useful for previews
 */
export function applyTransformation(
  originalUrl: string,
  type: TransformationType,
  params?: Record<string, string | number>
): string {
  return buildTransformedUrl(originalUrl, [{ type, params, appliedAt: Date.now() }]);
}

/**
 * Remove transformations from a URL (return to original)
 */
export function removeTransformations(originalUrl: string): string {
  // If it's a Cloudinary URL with transformations, extract just the public ID part
  if (originalUrl.includes('cloudinary.com')) {
    const match = originalUrl.match(/\/upload\/.*?\/(.+)$/);
    if (match) {
      const baseUrl = originalUrl.split('/upload/')[0];
      return `${baseUrl}/upload/${match[1]}`;
    }
  }
  return originalUrl;
}
