/**
 * Pre-written Francisca responses for transformations
 * Saves AI tokens by using mock responses for common actions
 */

import type { TransformationType } from '@/types/transformations';

interface ResponseSet {
  responses: string[];
  expression: string;
}

const TRANSFORMATION_RESPONSES: Record<TransformationType, ResponseSet> = {
  // Background
  remove_bg: {
    responses: [
      'Background removed! Your design is now isolated and ready to place on any product color.',
      'Poof! Background gone. Your artwork is now floating free and ready for placement.',
      'Clean extraction complete! The background has been removed while preserving all the fine details.',
    ],
    expression: 'happy',
  },

  // Enhance
  auto_enhance: {
    responses: [
      "Auto-enhanced! I've optimized the colors and contrast for the best print quality.",
      'Looking better already! Auto-adjustments applied for vibrant, print-ready results.',
      'Enhancement complete! Your design now has optimal brightness and contrast.',
    ],
    expression: 'excited',
  },

  sharpen: {
    responses: [
      'Sharpened! The edges are now crisp and perfect for screen printing.',
      'Crystal clear! Fine details enhanced for maximum print fidelity.',
      'Sharpness boosted! Your design will print with crisp, clean edges.',
    ],
    expression: 'proud',
  },

  upscale: {
    responses: [
      "I've enhanced the resolution using AI. Your design is now crisp and print-ready!",
      'Upscaling complete! The image quality has been boosted without losing clarity.',
      'Resolution enhanced! Even small details will print beautifully now.',
    ],
    expression: 'excited',
  },

  noise_reduction: {
    responses: [
      'Noise reduced! Your design is now cleaner and more professional.',
      'Grain removed! The image is smoother and ready for high-quality printing.',
      'Cleaned up beautifully! All that digital noise is gone.',
    ],
    expression: 'happy',
  },

  gen_restore: {
    responses: [
      "AI restoration complete! I've repaired and enhanced your image beautifully.",
      'Restored to perfection! Damaged areas have been intelligently repaired.',
      'Your image looks brand new! AI restoration worked wonders.',
    ],
    expression: 'excited',
  },

  // Adjustments
  brightness: {
    responses: [
      'Brightness adjusted! Perfect for ensuring your design prints with the right tone.',
      'Light levels optimized! Your design will print exactly as intended.',
      'Brightness tuned! The perfect balance for your print job.',
    ],
    expression: 'thinking',
  },

  contrast: {
    responses: [
      'Contrast adjusted! Your design now has the perfect depth and dimension.',
      'Tonal range optimized! Shadows and highlights are perfectly balanced.',
      'Contrast fine-tuned! Your design will pop on any garment color.',
    ],
    expression: 'thinking',
  },

  saturation: {
    responses: [
      'Saturation adjusted! Colors are now perfectly tuned for printing.',
      'Color intensity optimized! Your brand colors will print true to life.',
      'Vibrancy tuned! The perfect saturation for screen printing or DTG.',
    ],
    expression: 'thinking',
  },

  // Effects
  grayscale: {
    responses: [
      'Converted to grayscale! Perfect for single-color or vintage-style prints.',
      'Black and white beauty! This will look stunning as a monochrome print.',
      'Grayscale applied! Classic, timeless, and print-friendly.',
    ],
    expression: 'happy',
  },

  sepia: {
    responses: [
      'Sepia tone applied! That vintage warmth is going to look amazing.',
      'Beautiful sepia effect! Perfect for retro or nostalgic designs.',
      'Vintage vibes activated! The sepia tone gives such character.',
    ],
    expression: 'love',
  },

  vignette: {
    responses: [
      'Vignette added! The subtle edge darkening draws focus to your design.',
      'Artistic vignette applied! Your design now has that professional photo look.',
      'Edge darkening complete! The vignette frames your design beautifully.',
    ],
    expression: 'proud',
  },

  oil_paint: {
    responses: [
      'Oil paint effect applied! Your design has that classic artistic texture.',
      'Beautiful brushstroke effect! This will print like a fine art piece.',
      'Oil painting style activated! Such a unique and artistic look.',
    ],
    expression: 'excited',
  },

  cartoonify: {
    responses: [
      'Cartoonified! Your design now has that fun, animated style.',
      'Comic book style applied! Bold lines and vibrant colors ready to print.',
      'Cartoon effect complete! This will look fantastic on merchandise.',
    ],
    expression: 'happy',
  },

  vectorize: {
    responses: [
      'Vectorized! Your design is now crisp at any size - perfect for screen printing.',
      'Converted to vector style! Clean edges that will print beautifully at any scale.',
      'Vector effect applied! Ideal for logos and graphics that need to stay sharp.',
    ],
    expression: 'proud',
  },

  // Geometry
  flip_h: {
    responses: [
      'Flipped horizontally! Perfect mirror image.',
      'Horizontal flip complete! Sometimes the mirrored view is just right.',
      'Mirrored! Your design is now facing the other way.',
    ],
    expression: 'neutral',
  },

  flip_v: {
    responses: [
      'Flipped vertically! Upside down and ready to go.',
      'Vertical flip applied! Interesting perspective change.',
      'Upside down flip complete! Unique orientation achieved.',
    ],
    expression: 'neutral',
  },

  rotate_90: {
    responses: [
      'Rotated 90 degrees! Perfect for vertical layouts.',
      'Quarter turn complete! New orientation unlocked.',
      '90° rotation applied! Your design is now portrait-ready.',
    ],
    expression: 'neutral',
  },

  rotate_180: {
    responses: [
      'Rotated 180 degrees! Completely turned around.',
      'Half turn complete! Your design is now upside down.',
      '180° flip done! Sometimes you need a fresh perspective.',
    ],
    expression: 'neutral',
  },

  rotate_270: {
    responses: [
      'Rotated 270 degrees! Three-quarter turn complete.',
      '270° rotation applied! Your design is now oriented differently.',
      'Three-quarter turn done! New angle achieved.',
    ],
    expression: 'neutral',
  },

  // Style
  drop_shadow: {
    responses: [
      'Drop shadow added! Your design now has beautiful depth and dimension.',
      'Shadow effect applied! That 3D pop will look great on garments.',
      'Depth added! The drop shadow makes your design stand out.',
    ],
    expression: 'proud',
  },

  border: {
    responses: [
      'Border added! A clean frame around your design.',
      'Outline complete! The border defines your design beautifully.',
      'Frame applied! Your design is now nicely contained.',
    ],
    expression: 'neutral',
  },

  round_corners: {
    responses: [
      'Corners rounded! Soft, modern edges on your design.',
      'Rounded corners applied! A friendlier, softer look.',
      'Smooth corners complete! Modern aesthetic achieved.',
    ],
    expression: 'happy',
  },

  tint: {
    responses: [
      'Tint applied! Subtle color overlay for that perfect mood.',
      'Color tint added! Your design has a beautiful color cast.',
      'Tint effect complete! The color overlay looks fantastic.',
    ],
    expression: 'thinking',
  },

  // Advanced AI
  gen_fill: {
    responses: [
      "AI Generative Fill applied! I've intelligently extended your canvas.",
      'Canvas expanded with AI! Seamlessly filled the new areas.',
      'Generative fill complete! Your design now fills the space perfectly.',
    ],
    expression: 'excited',
  },

  smart_crop: {
    responses: [
      'Smart crop applied! AI focused on the most important parts of your design.',
      'Intelligently cropped! The subject is perfectly centered.',
      'AI crop complete! Your composition is now optimized.',
    ],
    expression: 'proud',
  },

  gen_recolor: {
    responses: [
      "AI Recolor complete! I've changed the colors while preserving the details.",
      'Smart recoloring applied! New color scheme looks fantastic.',
      'Color transformation done! AI maintained all the important details.',
    ],
    expression: 'excited',
  },

  // Arrange (z-index)
  bring_front: {
    responses: [
      'Brought to front! Your design is now on top of the stack.',
      'Moved to front! This design will appear above others.',
      'Front and center! Your design is now at the top layer.',
    ],
    expression: 'neutral',
  },

  send_back: {
    responses: [
      'Sent to back! Your design is now behind the others.',
      'Moved to back! This design will appear underneath.',
      'Back layer set! Your design is now at the bottom of the stack.',
    ],
    expression: 'neutral',
  },

  move_up: {
    responses: [
      'Moved up one layer! Getting closer to the front.',
      'Layer raised! One step forward in the stacking order.',
      'Moved up! Your design is one layer closer to the top.',
    ],
    expression: 'neutral',
  },

  move_down: {
    responses: [
      'Moved down one layer! Going back in the stack.',
      'Layer lowered! One step back in the stacking order.',
      'Moved down! Your design is one layer closer to the bottom.',
    ],
    expression: 'neutral',
  },
};

/**
 * Get a random response for a transformation type
 */
export function getTransformationResponse(type: TransformationType): {
  message: string;
  expression: string;
} {
  const responseSet = TRANSFORMATION_RESPONSES[type];
  if (!responseSet) {
    return {
      message: 'Transformation applied successfully!',
      expression: 'happy',
    };
  }

  const randomIndex = Math.floor(Math.random() * responseSet.responses.length);
  return {
    message: responseSet.responses[randomIndex],
    expression: responseSet.expression,
  };
}

/**
 * Get all available expressions for a transformation
 * Useful for testing or specific selection
 */
export function getAllTransformationResponses(type: TransformationType): string[] {
  return TRANSFORMATION_RESPONSES[type]?.responses || ['Transformation applied!'];
}

/**
 * Get expression for a transformation
 */
export function getTransformationExpression(type: TransformationType): string {
  return TRANSFORMATION_RESPONSES[type]?.expression || 'happy';
}
