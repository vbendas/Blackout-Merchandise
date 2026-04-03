/**
 * Quick Action Response Configuration
 * Pre-configured natural language responses for all quick actions
 * Minimizes LLM calls while maintaining conversational flow
 */

import type { PrintArea } from '@/lib/StudioContext';

export interface ActionContext {
  activePrintArea: PrintArea;
  selectedDesign?: {
    id: string;
    name: string;
  } | null;
  availablePrintAreas: PrintArea[];
  currentPrice?: number | null;
  productName?: string;
  designCount?: number;
}

export interface QuickActionResponse {
  /** Natural language message shown as user input in chat */
  userMessage: string | ((context: ActionContext) => string);
  /** Pre-configured Francisca response */
  assistantResponse: string | ((context: ActionContext) => string);
  /** Optional follow-up question */
  followUpQuestion?: string | ((context: ActionContext) => string);
  /** Whether to use LLM for context-aware response instead of pre-configured */
  requiresContext?: boolean;
  /** Expression for Francisca's avatar */
  expression?: 'neutral' | 'happy' | 'excited' | 'thinking' | 'proud' | 'confused' | 'love';
  /** Delay before showing follow-up (ms) */
  followUpDelay?: number;
}

// Helper to format placement names
function formatPlacement(area: PrintArea): string {
  return area.replace('_', ' ');
}

// Helper to get design name from context
function getDesignName(context: ActionContext): string {
  return context.selectedDesign?.name || 'design';
}

/**
 * Studio Chat Quick Actions
 */
export const STUDIO_QUICK_ACTIONS: Record<string, QuickActionResponse> = {
  // Design upload/generation
  'upload-design': {
    userMessage: 'I want to upload a design',
    assistantResponse: "Perfect! Click to select your file and I'll place it on the canvas.",
    followUpQuestion: 'What type of design are you uploading?',
    expression: 'happy',
    followUpDelay: 800,
  },

  'generate-design': {
    userMessage: 'Generate a design with AI',
    assistantResponse: (ctx) =>
      `Great choice! I can create something amazing for the ${formatPlacement(ctx.activePrintArea)}.`,
    followUpQuestion: 'What style are you looking for? Describe your vision!',
    expression: 'excited',
    requiresContext: true,
  },

  'select-design': {
    userMessage: 'I want to select a design to edit',
    assistantResponse:
      'Click on any design to select it. Once selected, you can transform it, move it, or adjust its size.',
    expression: 'neutral',
  },

  'add-another': {
    userMessage: 'I want to add another design',
    assistantResponse: (ctx) => `Sure! You can add multiple designs to the ${formatPlacement(ctx.activePrintArea)}.`,
    followUpQuestion: 'Would you like to upload a file or generate one with AI?',
    expression: 'happy',
  },

  // Design editing
  'transform-design': {
    userMessage: (ctx) => `I want to transform the ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `What would you like to do with ${getDesignName(ctx)}? I can enhance it, adjust colors, add effects, flip, rotate, and more.`,
    followUpQuestion: 'Choose a transformation category to see available options.',
    expression: 'thinking',
  },

  'adjust-position': {
    userMessage: (ctx) => `I want to adjust the position of ${getDesignName(ctx)}`,
    assistantResponse:
      'Drag the design to move it around. Use the corner handles to resize it. Press R to rotate 90 degrees, or hold Shift + R to rotate backwards.',
    followUpQuestion: 'Need help with anything else?',
    expression: 'neutral',
  },

  // Approval flow
  'approve-design': {
    userMessage: 'I want to review and approve my design',
    assistantResponse: (ctx) => {
      const count = ctx.designCount || 0;
      return count > 1
        ? `I'll prepare a summary of all your designs across ${ctx.availablePrintAreas.length} placements.`
        : `Let me review your design on the ${formatPlacement(ctx.activePrintArea)}.`;
    },
    expression: 'thinking',
    requiresContext: true,
  },

  'confirm-approval': {
    userMessage: 'Confirm and process my design',
    assistantResponse: "Perfect! I'm preparing your design for printing. This will take just a moment...",
    followUpQuestion: "Your print-ready files are being generated. You'll be able to download them shortly!",
    expression: 'excited',
  },

  'make-changes': {
    userMessage: 'I want to make some changes',
    assistantResponse: 'No problem at all! Take your time to get everything just right.',
    followUpQuestion: 'What would you like to adjust?',
    expression: 'neutral',
  },

  // Transformations menu
  'apply-transformations': {
    userMessage: 'Apply these transformations',
    assistantResponse: (ctx) => `Transformations applied to ${getDesignName(ctx)}! Your design is looking great.`,
    followUpQuestion: 'Want to add more effects or are you happy with how it looks?',
    expression: 'happy',
  },

  'clear-transformations': {
    userMessage: 'Clear all transformations',
    assistantResponse: (ctx) => `All effects cleared from ${getDesignName(ctx)}. Back to the original design!`,
    followUpQuestion: 'Would you like to try different transformations?',
    expression: 'neutral',
  },

  'back-to-design': {
    userMessage: 'Go back to the design',
    assistantResponse: 'No problem! What would you like to do with this design?',
    expression: 'neutral',
  },

  // Empty placement handling
  'fill-empty': {
    userMessage: 'I want to add designs to empty placements',
    assistantResponse: "Let's fill those empty areas! I'll take you to the first empty placement.",
    expression: 'happy',
  },

  'proceed-blank': {
    userMessage: 'Proceed with blank areas',
    assistantResponse:
      "Understood! Some areas will be left blank on the final product. That's totally fine - not every placement needs a design.",
    followUpQuestion: 'Ready to process your design?',
    expression: 'neutral',
  },

  // Transformations
  remove_bg: {
    userMessage: (ctx) => `Remove the background from ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Background removed from ${getDesignName(ctx)}! Your design is now clean and isolated, ready to place on any product color.`,
    followUpQuestion: 'The design is now floating free. Want to adjust the placement or add more effects?',
    expression: 'happy',
  },

  auto_enhance: {
    userMessage: (ctx) => `Auto-enhance ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Auto-enhanced ${getDesignName(ctx)}! I've optimized the colors and contrast for the best print quality.`,
    followUpQuestion: 'The design looks more vibrant now. Want to fine-tune anything else?',
    expression: 'excited',
  },

  sharpen: {
    userMessage: (ctx) => `Sharpen ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Sharpened ${getDesignName(ctx)}! The edges are now crisp and perfect for screen printing.`,
    followUpQuestion: 'The details look much clearer now. Anything else?',
    expression: 'proud',
  },

  upscale: {
    userMessage: (ctx) => `Upscale ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Upscaled ${getDesignName(ctx)}! I've enhanced the resolution using AI. Your design is now crisp and print-ready!`,
    followUpQuestion: 'The image quality has been boosted without losing clarity. Happy with it?',
    expression: 'excited',
  },

  brightness: {
    userMessage: (ctx) => `Adjust brightness of ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Brightness adjusted on ${getDesignName(ctx)}! Perfect for ensuring your design prints with the right tone.`,
    followUpQuestion: 'Want to adjust contrast or saturation as well?',
    expression: 'thinking',
  },

  contrast: {
    userMessage: (ctx) => `Adjust contrast of ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Contrast adjusted on ${getDesignName(ctx)}! Your design now has the perfect depth and dimension.`,
    followUpQuestion: 'The tonal range is now optimized. Anything else to adjust?',
    expression: 'thinking',
  },

  saturation: {
    userMessage: (ctx) => `Adjust saturation of ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Saturation adjusted on ${getDesignName(ctx)}! Colors are now perfectly tuned for printing.`,
    followUpQuestion: 'Color intensity is optimized. Want to try other adjustments?',
    expression: 'thinking',
  },

  grayscale: {
    userMessage: (ctx) => `Convert ${getDesignName(ctx)} to grayscale`,
    assistantResponse: (ctx) =>
      `Converted ${getDesignName(ctx)} to grayscale! Perfect for single-color or vintage-style prints.`,
    followUpQuestion: 'The black and white look is timeless. Want to add any other effects?',
    expression: 'happy',
  },

  sepia: {
    userMessage: (ctx) => `Apply sepia to ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Sepia tone applied to ${getDesignName(ctx)}! That vintage warmth is going to look amazing.`,
    followUpQuestion: 'Love those retro vibes! Anything else?',
    expression: 'love',
  },

  flip_h: {
    userMessage: (ctx) => `Flip ${getDesignName(ctx)} horizontally`,
    assistantResponse: (ctx) => `Flipped ${getDesignName(ctx)} horizontally! Perfect mirror image.`,
    followUpQuestion: 'Sometimes the mirrored view is just right. Need anything else?',
    expression: 'neutral',
  },

  flip_v: {
    userMessage: (ctx) => `Flip ${getDesignName(ctx)} vertically`,
    assistantResponse: (ctx) => `Flipped ${getDesignName(ctx)} vertically! Upside down and ready to go.`,
    followUpQuestion: 'Interesting perspective change! Want to adjust anything else?',
    expression: 'neutral',
  },

  rotate_90: {
    userMessage: (ctx) => `Rotate ${getDesignName(ctx)} 90 degrees`,
    assistantResponse: (ctx) => `Rotated ${getDesignName(ctx)} 90 degrees! Perfect for vertical layouts.`,
    followUpQuestion: 'New orientation unlocked! How does it look?',
    expression: 'neutral',
  },

  rotate_180: {
    userMessage: (ctx) => `Rotate ${getDesignName(ctx)} 180 degrees`,
    assistantResponse: (ctx) => `Rotated ${getDesignName(ctx)} 180 degrees! Completely turned around.`,
    followUpQuestion: 'Fresh perspective! Anything else?',
    expression: 'neutral',
  },

  rotate_270: {
    userMessage: (ctx) => `Rotate ${getDesignName(ctx)} 270 degrees`,
    assistantResponse: (ctx) => `Rotated ${getDesignName(ctx)} 270 degrees! Three-quarter turn complete.`,
    followUpQuestion: 'New angle achieved! How does it look?',
    expression: 'neutral',
  },

  drop_shadow: {
    userMessage: (ctx) => `Add drop shadow to ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Drop shadow added to ${getDesignName(ctx)}! Your design now has beautiful depth and dimension.`,
    followUpQuestion: 'That 3D pop will look great on garments! Want to adjust the shadow or add more effects?',
    expression: 'proud',
  },

  border: {
    userMessage: (ctx) => `Add border to ${getDesignName(ctx)}`,
    assistantResponse: (ctx) => `Border added to ${getDesignName(ctx)}! A clean frame around your design.`,
    followUpQuestion: 'The outline defines your design beautifully. Anything else?',
    expression: 'neutral',
  },

  round_corners: {
    userMessage: (ctx) => `Round corners of ${getDesignName(ctx)}`,
    assistantResponse: (ctx) => `Corners rounded on ${getDesignName(ctx)}! Soft, modern edges on your design.`,
    followUpQuestion: 'That friendlier, softer look works great! More adjustments?',
    expression: 'happy',
  },

  vignette: {
    userMessage: (ctx) => `Add vignette to ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Vignette added to ${getDesignName(ctx)}! The subtle edge darkening draws focus to your design.`,
    followUpQuestion: 'That professional photo look is stunning! Want to add more effects?',
    expression: 'proud',
  },

  oil_paint: {
    userMessage: (ctx) => `Apply oil paint effect to ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Oil paint effect applied to ${getDesignName(ctx)}! Your design has that classic artistic texture.`,
    followUpQuestion: 'This will print like a fine art piece! Happy with it?',
    expression: 'excited',
  },

  cartoonify: {
    userMessage: (ctx) => `Cartoonify ${getDesignName(ctx)}`,
    assistantResponse: (ctx) => `Cartoonified ${getDesignName(ctx)}! Your design now has that fun, animated style.`,
    followUpQuestion: 'Bold lines and vibrant colors ready to print! Anything else?',
    expression: 'happy',
  },

  vectorize: {
    userMessage: (ctx) => `Vectorize ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Vectorized ${getDesignName(ctx)}! Your design is now crisp at any size - perfect for screen printing.`,
    followUpQuestion: 'Clean edges that will print beautifully at any scale! More adjustments?',
    expression: 'proud',
  },

  noise_reduction: {
    userMessage: (ctx) => `Reduce noise in ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Noise reduced in ${getDesignName(ctx)}! Your design is now cleaner and more professional.`,
    followUpQuestion: 'The image is smoother and ready for high-quality printing. Good?',
    expression: 'happy',
  },

  gen_restore: {
    userMessage: (ctx) => `AI restore ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `AI restoration complete on ${getDesignName(ctx)}! I've repaired and enhanced your image beautifully.`,
    followUpQuestion: 'Damaged areas have been intelligently repaired. How does it look?',
    expression: 'excited',
  },

  tint: {
    userMessage: (ctx) => `Apply tint to ${getDesignName(ctx)}`,
    assistantResponse: (ctx) => `Tint applied to ${getDesignName(ctx)}! Subtle color overlay for that perfect mood.`,
    followUpQuestion: 'The color cast looks fantastic! Want to try a different color?',
    expression: 'thinking',
  },

  gen_fill: {
    userMessage: (ctx) => `AI generative fill for ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `AI Generative Fill applied to ${getDesignName(ctx)}! I've intelligently extended your canvas.`,
    followUpQuestion: 'Canvas expanded seamlessly! How does it look?',
    expression: 'excited',
  },

  smart_crop: {
    userMessage: (ctx) => `Smart crop ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `Smart crop applied to ${getDesignName(ctx)}! AI focused on the most important parts of your design.`,
    followUpQuestion: 'The subject is perfectly centered. Happy with the composition?',
    expression: 'proud',
  },

  gen_recolor: {
    userMessage: (ctx) => `AI recolor ${getDesignName(ctx)}`,
    assistantResponse: (ctx) =>
      `AI Recolor complete on ${getDesignName(ctx)}! I've changed the colors while preserving all the details.`,
    followUpQuestion: 'New color scheme looks fantastic! Want to adjust anything?',
    expression: 'excited',
  },

  // Arrange actions
  bring_front: {
    userMessage: (ctx) => `Bring ${getDesignName(ctx)} to front`,
    assistantResponse: (ctx) => `Brought ${getDesignName(ctx)} to front! It's now on top of the stack.`,
    expression: 'neutral',
  },

  send_back: {
    userMessage: (ctx) => `Send ${getDesignName(ctx)} to back`,
    assistantResponse: (ctx) => `Sent ${getDesignName(ctx)} to back! It's now behind the other designs.`,
    expression: 'neutral',
  },

  move_up: {
    userMessage: (ctx) => `Move ${getDesignName(ctx)} up one layer`,
    assistantResponse: (ctx) => `Moved ${getDesignName(ctx)} up one layer! Getting closer to the front.`,
    expression: 'neutral',
  },

  move_down: {
    userMessage: (ctx) => `Move ${getDesignName(ctx)} down one layer`,
    assistantResponse: (ctx) => `Moved ${getDesignName(ctx)} down one layer! Going back in the stack.`,
    expression: 'neutral',
  },
};

/**
 * Get response configuration for an action
 */
export function getQuickActionResponse(actionId: string): QuickActionResponse | undefined {
  return STUDIO_QUICK_ACTIONS[actionId];
}

/**
 * Build user message with context
 */
export function buildUserMessage(
  template: string | ((context: ActionContext) => string),
  context: ActionContext
): string {
  if (typeof template === 'function') {
    return template(context);
  }
  return template;
}

/**
 * Build assistant response with context
 */
export function buildAssistantResponse(
  template: string | ((context: ActionContext) => string),
  context: ActionContext
): string {
  if (typeof template === 'function') {
    return template(context);
  }
  return template;
}

/**
 * Check if action should use LLM
 */
export function shouldUseLLM(actionId: string, _context: ActionContext): boolean {
  const response = getQuickActionResponse(actionId);
  if (!response) return false;

  // Use LLM if explicitly required
  if (response.requiresContext) return true;

  // Otherwise use pre-configured response
  return false;
}
