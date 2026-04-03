import type { DesignFlowStep, InlineChatAction } from './ChatContext';

// Define valid transitions
const VALID_TRANSITIONS: Record<DesignFlowStep, DesignFlowStep[]> = {
  idle: ['product-selected'],
  'product-selected': ['awaiting-upload', 'awaiting-prompt', 'idle'],
  'awaiting-upload': ['design-received', 'product-selected', 'idle'],
  'awaiting-prompt': ['design-received', 'product-selected', 'idle'],
  'design-received': ['transforming', 'placement-review', 'idle'],
  transforming: ['design-received', 'placement-review', 'idle'],
  'placement-review': ['approval', 'design-received', 'transforming', 'idle'],
  approval: ['processing', 'design-received', 'placement-review', 'idle'],
  processing: ['idle'],
};

export function canTransition(from: DesignFlowStep, to: DesignFlowStep): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// Quick actions per step
export function getQuickActionsForStep(step: DesignFlowStep): InlineChatAction[] {
  switch (step) {
    case 'idle':
      return [
        {
          id: 'browse',
          label: 'Browse catalog',
          icon: 'lucide:shirt',
          variant: 'secondary',
          action: 'Show me the catalog',
        },
        {
          id: 'upload',
          label: 'Upload artwork',
          icon: 'lucide:upload',
          variant: 'primary',
          action: 'I want to upload my artwork',
        },
        {
          id: 'create',
          label: 'Create a design',
          icon: 'lucide:sparkles',
          variant: 'primary',
          action: 'I want to create a design',
        },
        { id: 'orders', label: 'My orders', icon: 'lucide:package', variant: 'secondary', action: 'Show my orders' },
      ];
    case 'product-selected':
      return [
        {
          id: 'upload',
          label: 'Upload artwork',
          icon: 'lucide:upload',
          variant: 'primary',
          action: 'I want to upload my artwork',
        },
        {
          id: 'create-ai',
          label: 'Create with AI',
          icon: 'lucide:sparkles',
          variant: 'primary',
          action: 'Create a design with AI',
        },
        {
          id: 'change',
          label: 'Change product',
          icon: 'lucide:arrow-left',
          variant: 'secondary',
          action: 'I want to change the product',
        },
      ];
    case 'awaiting-upload':
      return [
        { id: 'upload', label: 'Upload file', icon: 'lucide:upload', variant: 'primary', action: '__TRIGGER_UPLOAD__' },
        { id: 'cancel', label: 'Cancel', icon: 'lucide:x', variant: 'outline', action: 'Cancel upload' },
      ];
    case 'design-received':
      return [
        {
          id: 'remove-bg',
          label: 'Remove background',
          icon: 'lucide:eraser',
          variant: 'secondary',
          action: 'Remove the background',
        },
        { id: 'enhance', label: 'Enhance', icon: 'lucide:zap', variant: 'secondary', action: 'Enhance the image' },
        { id: 'flip', label: 'Flip', icon: 'lucide:flip-horizontal', variant: 'secondary', action: 'Flip the design' },
        { id: 'effects', label: 'Add effect', icon: 'lucide:wand-2', variant: 'secondary', action: 'Show me effects' },
        {
          id: 'adjust',
          label: 'Adjust colors',
          icon: 'lucide:sliders-horizontal',
          variant: 'secondary',
          action: 'Adjust colors',
        },
        {
          id: 'approve',
          label: 'Approve design',
          icon: 'lucide:check',
          variant: 'primary',
          action: 'I approve this design',
        },
      ];
    case 'transforming':
      return [
        { id: 'undo', label: 'Undo', icon: 'lucide:undo-2', variant: 'secondary', action: 'Undo that change' },
        {
          id: 'more',
          label: 'More edits',
          icon: 'lucide:plus',
          variant: 'secondary',
          action: 'I want to make more edits',
        },
        {
          id: 'approve',
          label: 'Approve result',
          icon: 'lucide:check',
          variant: 'primary',
          action: 'I approve this design',
        },
        {
          id: 'restart',
          label: 'Start over',
          icon: 'lucide:refresh-cw',
          variant: 'outline',
          action: 'Start over with the design',
        },
      ];
    case 'placement-review':
      return [
        {
          id: 'adjust',
          label: 'Adjust placement',
          icon: 'lucide:move',
          variant: 'secondary',
          action: 'Adjust the placement',
        },
        {
          id: 'size',
          label: 'Change size',
          icon: 'lucide:maximize-2',
          variant: 'secondary',
          action: 'Change the design size',
        },
        {
          id: 'approve',
          label: 'Approve mockup',
          icon: 'lucide:check',
          variant: 'primary',
          action: 'Approve this mockup',
        },
        {
          id: 'different',
          label: 'Try different product',
          icon: 'lucide:shirt',
          variant: 'outline',
          action: 'Try a different product',
        },
      ];
    case 'approval':
      return [
        {
          id: 'confirm',
          label: 'Confirm & process',
          icon: 'lucide:check-circle',
          variant: 'primary',
          action: 'Confirm and process my order',
        },
        {
          id: 'changes',
          label: 'Request changes',
          icon: 'lucide:edit-3',
          variant: 'secondary',
          action: 'I want to make changes',
        },
        {
          id: 'add-more',
          label: 'Add more products',
          icon: 'lucide:plus-circle',
          variant: 'outline',
          action: 'Add more products',
        },
      ];
    case 'awaiting-prompt':
      return [{ id: 'cancel', label: 'Cancel', icon: 'lucide:x', variant: 'outline', action: 'Cancel' }];
    case 'processing':
      return [];
    default:
      return [];
  }
}

// Response templates for Francisca
export function getFranciscaResponse(step: DesignFlowStep): string {
  switch (step) {
    case 'product-selected':
      return "Hi! I'm Francisca, your design assistant. Let's create something amazing for your product!";
    case 'awaiting-upload':
      return 'Great! Drop your artwork here or tap to browse your files. I accept PNG, JPG, SVG, PSD, and AI files.';
    case 'awaiting-prompt':
      return "Describe what you'd like me to create! Be as detailed as you want -- colors, style, mood, subject.";
    case 'design-received':
      return "Beautiful! Here's what I can do with it. Choose an option or just tell me what you'd like to change.";
    case 'transforming':
      return 'Working on your design...';
    case 'placement-review':
      return "Here's how your design looks on the product! What do you think?";
    case 'approval':
      return "Here's your order summary. Everything look good?";
    default:
      return 'How can I help you with your design?';
  }
}
