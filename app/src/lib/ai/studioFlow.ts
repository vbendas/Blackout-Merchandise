/**
 * Studio Flow State Machine
 * Defines the structured conversation flow for the Merch Studio
 */

import type { StudioPhase, GarmentStatus, StudioOption } from '@/types/chat';

export interface StudioContext {
  phase: StudioPhase;
  garmentList: GarmentStatus[];
  currentGarmentIndex: number;
  userInput: string;
  /** Selected LoRA style for design generation (e.g., 'american-traditional') */
  loraStyle?: string;
  /** Current edit round (increments with each Kontext edit) */
  editRound: number;
  /** URL of the current design image */
  currentDesignUrl?: string;
  /** All intermediate design URLs for branching */
  designHistory: Array<{
    round: number;
    imageUrl: string;
    instruction?: string;
    timestamp: number;
  }>;
}

export interface StudioPhaseConfig {
  phase: StudioPhase;
  openingMessage: string;
  expectedInputType: 'text' | 'image_upload' | 'option_select' | 'any';
  nextPhase: (userInput: string, context: StudioContext) => StudioPhase;
  statusCardUpdate?: (context: StudioContext) => GarmentStatus[];
  options?: StudioOption[];
}

const DEFAULT_GARMENTS: GarmentStatus[] = [
  { id: '1', name: 'Black Hoodie', sku: 'HD-BLK-001', status: 'pending' },
  { id: '2', name: 'White T-Shirt', sku: 'TS-WHT-001', status: 'pending' },
  { id: '3', name: 'Navy Cap', sku: 'CP-NVY-001', status: 'pending' },
];

export const STUDIO_PHASES: Record<StudioPhase, StudioPhaseConfig> = {
  greeting: {
    phase: 'greeting',
    openingMessage: "Hey! Ready to make something great. Here's what you've selected — let's start with the first piece.",
    expectedInputType: 'any',
    nextPhase: () => 'design_intent',
    statusCardUpdate: (ctx) => ctx.garmentList,
  },

  garment_selection: {
    phase: 'garment_selection',
    openingMessage: 'Want to add or remove anything from this list before we start?',
    expectedInputType: 'option_select',
    nextPhase: () => 'design_intent',
    options: [
      { id: 'start', label: "Let's start!" },
      { id: 'add', label: 'Add more garments' },
      { id: 'remove', label: 'Remove some' },
    ],
  },

  design_intent: {
    phase: 'design_intent',
    openingMessage: 'What do you have in mind for this piece? Tell me the concept, a vibe, or just describe what you\'re picturing.',
    expectedInputType: 'text',
    nextPhase: () => 'reference_gathering',
  },

  reference_gathering: {
    phase: 'reference_gathering',
    openingMessage: "Love it. Got any reference images? Drop them here — photos, artwork, logos, anything. Or describe what you're visualising and I'll work from that.",
    expectedInputType: 'image_upload',
    nextPhase: () => 'design_generation',
  },

  design_generation: {
    phase: 'design_generation',
    openingMessage: 'On it. Give me a moment…',
    expectedInputType: 'any',
    nextPhase: () => 'design_iteration',
    // NOTE: Actual generation happens via fal.ai flux-2-dev/lora (see falClient.ts)
    // This phase triggers the API call, then transitions to design_iteration for review
  },

  design_iteration: {
    phase: 'design_iteration',
    openingMessage: "Here's the design. Like the direction? Tell me what you'd change — font, size, placement, colour, anything.",
    expectedInputType: 'text',
    nextPhase: (input) => {
      // If user approves, move to garment_application
      if (input.toLowerCase().includes('approve') || input.toLowerCase().includes('yes') || input.toLowerCase().includes('love it')) {
        return 'garment_application';
      }
      // Otherwise stay in iteration
      return 'design_iteration';
    },
    options: [
      { id: 'approve', label: '✓ Approve this design' },
      { id: 'change', label: 'Make changes' },
    ],
  },

  garment_application: {
    phase: 'garment_application',
    openingMessage: 'Great, approved! Which pieces from your list gets this design? You can put it on all of them or just some.',
    expectedInputType: 'option_select',
    nextPhase: () => 'mockup_generation',
    statusCardUpdate: (ctx) => {
      const updated = [...ctx.garmentList];
      if (updated[ctx.currentGarmentIndex]) {
        updated[ctx.currentGarmentIndex] = {
          ...updated[ctx.currentGarmentIndex],
          status: 'in_progress',
        };
      }
      return updated;
    },
  },

  mockup_generation: {
    phase: 'mockup_generation',
    openingMessage: 'Perfect. Here\'s how it looks on the garment.',
    expectedInputType: 'any',
    nextPhase: () => 'approval',
  },

  approval: {
    phase: 'approval',
    openingMessage: 'Happy with this? Say yes and we\'ll lock it in, or tell me what to tweak.',
    expectedInputType: 'option_select',
    nextPhase: (input) => {
      if (input.toLowerCase().includes('yes') || input.toLowerCase().includes('approve')) {
        return 'next_item';
      }
      return 'design_iteration';
    },
    statusCardUpdate: (ctx) => {
      const updated = [...ctx.garmentList];
      if (updated[ctx.currentGarmentIndex]) {
        updated[ctx.currentGarmentIndex] = {
          ...updated[ctx.currentGarmentIndex],
          status: 'approved',
        };
      }
      return updated;
    },
    options: [
      { id: 'yes', label: '✓ Yes, looks great!' },
      { id: 'tweak', label: 'Make tweaks' },
    ],
  },

  next_item: {
    phase: 'next_item',
    openingMessage: "Done! Moving on to the next piece. What's the concept for this one?",
    expectedInputType: 'text',
    nextPhase: (input, ctx) => {
      const nextIndex = ctx.currentGarmentIndex + 1;
      if (nextIndex >= ctx.garmentList.length) {
        return 'complete';
      }
      return 'design_intent';
    },
  },

  complete: {
    phase: 'complete',
    openingMessage: 'All pieces are ready. Want to add them to your store, get a bulk quote, or review everything first?',
    expectedInputType: 'option_select',
    nextPhase: () => 'complete',
    options: [
      { id: 'store', label: 'Add to store' },
      { id: 'quote', label: 'Get bulk quote' },
      { id: 'review', label: 'Review all' },
    ],
  },
};

/**
 * Get the opening message for a phase
 */
export function getPhaseOpeningMessage(phase: StudioPhase, context?: StudioContext): string {
  const config = STUDIO_PHASES[phase];
  if (!config) return "Let's continue!";

  // Handle dynamic messages for next_item
  if (phase === 'next_item' && context) {
    const nextIndex = context.currentGarmentIndex + 1;
    if (nextIndex >= context.garmentList.length) {
      return 'All pieces are ready. Want to add them to your store, get a bulk quote, or review everything first?';
    }
    return `Done! Moving on to the ${context.garmentList[nextIndex]?.name || 'next piece'}. What's the concept for this one?`;
  }

  return config.openingMessage;
}

/**
 * Determine the next phase based on user input and context
 */
export function getNextPhase(phase: StudioPhase, userInput: string, context: StudioContext): StudioPhase {
  const config = STUDIO_PHASES[phase];
  if (!config) return phase;
  return config.nextPhase(userInput, context);
}

/**
 * Get status card update for a phase
 */
export function getStatusCardUpdate(phase: StudioPhase, context: StudioContext): GarmentStatus[] | undefined {
  const config = STUDIO_PHASES[phase];
  if (!config?.statusCardUpdate) return undefined;
  return config.statusCardUpdate(context);
}

/**
 * Get options for a phase
 */
export function getPhaseOptions(phase: StudioPhase): StudioOption[] | undefined {
  const config = STUDIO_PHASES[phase];
  return config?.options;
}

/**
 * Create default studio context
 */
export function createDefaultContext(): StudioContext {
  return {
    phase: 'greeting',
    garmentList: DEFAULT_GARMENTS,
    currentGarmentIndex: 0,
    userInput: '',
    editRound: 0,
    designHistory: [],
  };
}

/**
 * Check if a phase expects specific input type
 */
export function getExpectedInputType(phase: StudioPhase): string {
  const config = STUDIO_PHASES[phase];
  return config?.expectedInputType || 'any';
}
