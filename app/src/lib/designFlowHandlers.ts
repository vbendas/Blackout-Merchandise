'use client';

import type { DesignFlowStep, Message } from './ChatContext';
import { buildTransformedUrl } from './cloudinary/transformations';
import { getFranciscaResponse, getQuickActionsForStep } from './designFlow';

// Keywords for detecting user intents
const UPLOAD_KEYWORDS = ['upload', 'artwork', 'file', 'image', 'my design', 'have a design'];
const CREATE_KEYWORDS = ['create', 'generate', 'ai', 'make', 'design with ai', 'create with ai'];
const TRANSFORMATION_KEYWORDS: Record<string, string[]> = {
  remove_bg: ['remove background', 'remove bg', 'transparent background', 'no background'],
  sharpen: ['sharpen', 'sharpen image', 'make sharper'],
  upscale: ['upscale', 'enhance resolution', 'make bigger', 'increase size'],
  flip_h: ['flip', 'mirror', 'flip horizontal'],
  flip_v: ['flip vertical', 'mirror vertical'],
  grayscale: ['grayscale', 'black and white', 'bw'],
  sepia: ['sepia', 'vintage', 'old photo'],
  brightness: ['brightness', 'brighter', 'lighter'],
  contrast: ['contrast', 'more contrast'],
  cartoonify: ['cartoon', 'cartoonify', 'comic style'],
};
const APPROVE_DESIGN_KEYWORDS = ['approve', 'looks good', 'perfect', 'great', 'love it', 'i like it'];
const APPROVE_MOCKUP_KEYWORDS = ['approve mockup', 'looks good on product', 'perfect on shirt', 'proceed'];
const CONFIRM_ORDER_KEYWORDS = ['confirm', 'process order', 'place order', 'buy it'];
const REQUEST_CHANGES_KEYWORDS = ['change', 'modify', 'different', 'not quite', 'adjust', 'fix'];

// Detect user intent from message
export function detectDesignIntent(message: string): {
  intent: 'upload' | 'create' | 'transform' | 'approve_design' | 'approve_mockup' | 'confirm' | 'changes' | 'unknown';
  transformationType?: string;
} {
  const lowerMessage = message.toLowerCase();

  // Check for upload intent
  if (UPLOAD_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return { intent: 'upload' };
  }

  // Check for create intent
  if (CREATE_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return { intent: 'create' };
  }

  // Check for approve design intent
  if (APPROVE_DESIGN_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return { intent: 'approve_design' };
  }

  // Check for approve mockup intent
  if (APPROVE_MOCKUP_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return { intent: 'approve_mockup' };
  }

  // Check for confirm order intent
  if (CONFIRM_ORDER_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return { intent: 'confirm' };
  }

  // Check for changes intent
  if (REQUEST_CHANGES_KEYWORDS.some((kw) => lowerMessage.includes(kw))) {
    return { intent: 'changes' };
  }

  // Check for transformation intent
  for (const [type, keywords] of Object.entries(TRANSFORMATION_KEYWORDS)) {
    if (keywords.some((kw) => lowerMessage.includes(kw))) {
      return { intent: 'transform', transformationType: type };
    }
  }

  return { intent: 'unknown' };
}

// Generate Francisca's response based on current flow step and user message
export function generateFranciscaResponse(
  step: DesignFlowStep,
  message: string,
  currentDesignUrl: string | null,
  _currentProductId: string | null
): { response: Message; newStep: DesignFlowStep; newDesignUrl?: string } | null {
  const intent = detectDesignIntent(message);
  const now = new Date();

  // Handle each flow step
  switch (step) {
    case 'idle':
      if (intent.intent === 'upload') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('awaiting-upload'),
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'upload-prompt',
          },
        };
        return { response, newStep: 'awaiting-upload' };
      }

      if (intent.intent === 'create') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('awaiting-prompt'),
          agent: 'Francisca',
          timestamp: now,
        };
        return { response, newStep: 'awaiting-prompt' };
      }
      break;

    case 'product-selected':
      if (intent.intent === 'upload') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('awaiting-upload'),
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'upload-prompt',
          },
        };
        return { response, newStep: 'awaiting-upload' };
      }

      if (intent.intent === 'create') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('awaiting-prompt'),
          agent: 'Francisca',
          timestamp: now,
        };
        return { response, newStep: 'awaiting-prompt' };
      }
      break;

    case 'awaiting-upload':
      // This is triggered when a file is uploaded (handled separately)
      if (message.includes('__FILE_UPLOADED__')) {
        const [, blobUrl] = message.split('|');
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('design-received'),
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'image',
            imageUrl: blobUrl,
            actions: getQuickActionsForStep('design-received'),
          },
        };
        return { response, newStep: 'design-received', newDesignUrl: blobUrl };
      }
      break;

    case 'awaiting-prompt': {
      // User sent their AI generation prompt
      // Simulate AI generation with placeholder
      const response: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Here's what I created based on your description! What do you think?",
        agent: 'Francisca',
        timestamp: now,
        attachment: {
          type: 'image',
          imageUrl: 'https://placehold.co/800x800/1a1a2e/e94560?text=AI+Generated+Design',
          actions: getQuickActionsForStep('design-received'),
        },
      };
      return {
        response,
        newStep: 'design-received',
        newDesignUrl: 'https://placehold.co/800x800/1a1a2e/e94560?text=AI+Generated+Design',
      };
    }

    case 'design-received':
      if (intent.intent === 'transform' && intent.transformationType && currentDesignUrl) {
        // Apply transformation
        const transformation = {
          type: intent.transformationType as any,
          appliedAt: Date.now(),
        };
        const transformedUrl = buildTransformedUrl(currentDesignUrl, [transformation]);
        const transformationNames: Record<string, string> = {
          remove_bg: 'Remove Background',
          sharpen: 'Sharpen',
          upscale: 'Upscale',
          flip_h: 'Flip Horizontal',
          flip_v: 'Flip Vertical',
          grayscale: 'Grayscale',
          sepia: 'Sepia',
          brightness: 'Brightness',
          contrast: 'Contrast',
          cartoonify: 'Cartoon Effect',
        };

        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've applied the ${transformationNames[intent.transformationType] || 'transformation'}. Here's the result:`,
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'transformation',
            beforeUrl: currentDesignUrl,
            afterUrl: transformedUrl,
            transformationName: transformationNames[intent.transformationType] || 'Transformation',
            actions: getQuickActionsForStep('transforming'),
          },
        };
        return { response, newStep: 'transforming', newDesignUrl: transformedUrl };
      }

      if (intent.intent === 'approve_design') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('placement-review'),
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'mockup',
            imageUrl: `https://placehold.co/800x1000/2d2d3d/ffffff?text=Product+Mockup+with+Design`,
            actions: getQuickActionsForStep('placement-review'),
          },
        };
        return { response, newStep: 'placement-review' };
      }
      break;

    case 'transforming':
      if (intent.intent === 'approve_design' || intent.intent === 'approve_mockup') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('placement-review'),
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'mockup',
            imageUrl: `https://placehold.co/800x1000/2d2d3d/ffffff?text=Product+Mockup+with+Design`,
            actions: getQuickActionsForStep('placement-review'),
          },
        };
        return { response, newStep: 'placement-review' };
      }

      // User wants more transformations - go back to design-received
      if (intent.intent === 'transform' || intent.intent === 'changes') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'What would you like to change?',
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'action-buttons',
            actions: getQuickActionsForStep('design-received'),
          },
        };
        return { response, newStep: 'design-received' };
      }
      break;

    case 'placement-review':
      if (intent.intent === 'approve_mockup' || intent.intent === 'approve_design') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getFranciscaResponse('approval'),
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'price-summary',
            pricingData: {
              basePrice: 12.5,
              placementPrice: 3.0,
              colorPrice: 2.5,
              total: 18.0,
              breakdown: ['Premium T-Shirt base: €12.50', 'Front placement: €3.00', '4 colors: €2.50'],
            },
            actions: getQuickActionsForStep('approval'),
          },
        };
        return { response, newStep: 'approval' };
      }

      if (intent.intent === 'changes') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'What would you like to adjust?',
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'action-buttons',
            actions: getQuickActionsForStep('design-received'),
          },
        };
        return { response, newStep: 'design-received' };
      }
      break;

    case 'approval':
      if (intent.intent === 'confirm') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Perfect! Processing your print files now. This usually takes about a minute...',
          agent: 'Francisca',
          timestamp: now,
        };
        return { response, newStep: 'processing' };
      }

      if (intent.intent === 'changes') {
        const response: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'What would you like to change?',
          agent: 'Francisca',
          timestamp: now,
          attachment: {
            type: 'action-buttons',
            actions: getQuickActionsForStep('design-received'),
          },
        };
        return { response, newStep: 'design-received' };
      }
      break;

    case 'processing':
      // Processing is handled separately (opens PrintPreparationModal)
      // After processing completes, reset to idle
      break;
  }

  return null;
}

// Generate proactive greeting when entering a new flow step
export function generateProactiveMessage(step: DesignFlowStep, _productName?: string): Message | null {
  const now = new Date();

  switch (step) {
    case 'product-selected':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getFranciscaResponse('product-selected'),
        agent: 'Francisca',
        timestamp: now,
        attachment: {
          type: 'action-buttons',
          actions: [
            {
              id: 'upload',
              label: 'Upload Artwork',
              icon: 'lucide:upload',
              variant: 'primary',
              action: 'I want to upload my artwork',
            },
            {
              id: 'create',
              label: 'Create with AI',
              icon: 'lucide:sparkles',
              variant: 'primary',
              action: 'Create a design with AI',
            },
          ],
        },
      };

    default:
      return null;
  }
}
