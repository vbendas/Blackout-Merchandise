import { describe, expect, it } from 'vitest';
import {
  STUDIO_PHASES,
  getPhaseOpeningMessage,
  getNextPhase,
  getStatusCardUpdate,
  getPhaseOptions,
  createDefaultContext,
  getExpectedInputType,
} from './studioFlow';
import type { StudioContext } from './studioFlow';

describe('studioFlow', () => {
  describe('STUDIO_PHASES', () => {
    it('should have all 11 phases defined', () => {
      const expectedPhases = [
        'greeting',
        'garment_selection',
        'design_intent',
        'reference_gathering',
        'design_generation',
        'design_iteration',
        'garment_application',
        'mockup_generation',
        'approval',
        'next_item',
        'complete',
      ];

      expectedPhases.forEach((phase) => {
        expect(STUDIO_PHASES[phase as keyof typeof STUDIO_PHASES]).toBeDefined();
      });
    });

    it('each phase should have required properties', () => {
      Object.values(STUDIO_PHASES).forEach((phase) => {
        expect(phase.phase).toBeDefined();
        expect(phase.openingMessage).toBeDefined();
        expect(phase.expectedInputType).toBeDefined();
        expect(phase.nextPhase).toBeDefined();
      });
    });
  });

  describe('getPhaseOpeningMessage', () => {
    it('should return greeting message for greeting phase', () => {
      const message = getPhaseOpeningMessage('greeting');
      expect(message).toContain("Hey!");
      expect(message).toContain("Ready to make something great");
    });

    it('should return design intent message', () => {
      const message = getPhaseOpeningMessage('design_intent');
      expect(message).toContain("What do you have in mind");
    });

    it('should return dynamic message for next_item phase with context', () => {
      const context: StudioContext = {
        phase: 'next_item',
        garmentList: [
          { id: '1', name: 'Black Hoodie', sku: 'HD-BLK-001', status: 'approved' },
          { id: '2', name: 'White T-Shirt', sku: 'TS-WHT-001', status: 'pending' },
        ],
        currentGarmentIndex: 0,
        userInput: '',
        editRound: 0,
        designHistory: [],
      };

      const message = getPhaseOpeningMessage('next_item', context);
      expect(message).toContain("White T-Shirt");
      expect(message).toContain("What's the concept");
    });

    it('should return completion message when all garments done', () => {
      const context: StudioContext = {
        phase: 'next_item',
        garmentList: [
          { id: '1', name: 'Black Hoodie', sku: 'HD-BLK-001', status: 'approved' },
        ],
        currentGarmentIndex: 0,
        userInput: '',
        editRound: 0,
        designHistory: [],
      };

      const message = getPhaseOpeningMessage('next_item', context);
      expect(message).toContain("All pieces are ready");
    });

    it('should return default message for unknown phase', () => {
      const message = getPhaseOpeningMessage('unknown' as any);
      expect(message).toBe("Let's continue!");
    });
  });

  describe('getNextPhase', () => {
    it('should advance from greeting to design_intent', () => {
      const context = createDefaultContext();
      const next = getNextPhase('greeting', "Let's start", context);
      expect(next).toBe('design_intent');
    });

    it('should advance from design_intent to reference_gathering', () => {
      const context = createDefaultContext();
      const next = getNextPhase('design_intent', 'I want a minimal design', context);
      expect(next).toBe('reference_gathering');
    });

    it('should stay in design_iteration when user wants changes', () => {
      const context = createDefaultContext();
      const next = getNextPhase('design_iteration', 'Make it bigger', context);
      expect(next).toBe('design_iteration');
    });

    it('should advance from design_iteration to garment_application on approval', () => {
      const context = createDefaultContext();
      const next = getNextPhase('design_iteration', 'I approve this', context);
      expect(next).toBe('garment_application');
    });

    it('should advance from approval to next_item on yes', () => {
      const context = createDefaultContext();
      const next = getNextPhase('approval', 'yes', context);
      expect(next).toBe('next_item');
    });

    it('should return to design_iteration from approval on tweak request', () => {
      const context = createDefaultContext();
      const next = getNextPhase('approval', 'Make tweaks', context);
      expect(next).toBe('design_iteration');
    });

    it('should advance to complete when all garments processed', () => {
      const context: StudioContext = {
        ...createDefaultContext(),
        currentGarmentIndex: 2,
        garmentList: [
          { id: '1', name: 'Hoodie', sku: 'HD-001', status: 'approved' },
          { id: '2', name: 'T-Shirt', sku: 'TS-001', status: 'approved' },
          { id: '3', name: 'Cap', sku: 'CP-001', status: 'approved' },
        ],
      };
      const next = getNextPhase('next_item', 'done', context);
      expect(next).toBe('complete');
    });
  });

  describe('getStatusCardUpdate', () => {
    it('should return garment list for greeting phase', () => {
      const context = createDefaultContext();
      const statusCard = getStatusCardUpdate('greeting', context);
      expect(statusCard).toHaveLength(3);
      expect(statusCard?.[0].status).toBe('pending');
    });

    it('should update garment to in_progress for garment_application', () => {
      const context = createDefaultContext();
      const statusCard = getStatusCardUpdate('garment_application', context);
      expect(statusCard?.[0].status).toBe('in_progress');
    });

    it('should update garment to approved for approval phase', () => {
      const context = createDefaultContext();
      const statusCard = getStatusCardUpdate('approval', context);
      expect(statusCard?.[0].status).toBe('approved');
    });

    it('should return undefined for phases without status update', () => {
      const context = createDefaultContext();
      const statusCard = getStatusCardUpdate('design_intent', context);
      expect(statusCard).toBeUndefined();
    });
  });

  describe('getPhaseOptions', () => {
    it('should return options for garment_selection phase', () => {
      const options = getPhaseOptions('garment_selection');
      expect(options).toBeDefined();
      expect(options).toHaveLength(3);
      expect(options?.[0].label).toBe("Let's start!");
    });

    it('should return options for design_iteration phase', () => {
      const options = getPhaseOptions('design_iteration');
      expect(options).toBeDefined();
      expect(options).toHaveLength(2);
      expect(options?.[0].label).toContain('Approve');
    });

    it('should return undefined for phases without options', () => {
      const options = getPhaseOptions('design_intent');
      expect(options).toBeUndefined();
    });
  });

  describe('createDefaultContext', () => {
    it('should create context with default values', () => {
      const context = createDefaultContext();
      expect(context.phase).toBe('greeting');
      expect(context.garmentList).toHaveLength(3);
      expect(context.currentGarmentIndex).toBe(0);
      expect(context.userInput).toBe('');
    });

    it('should have default garments with pending status', () => {
      const context = createDefaultContext();
      context.garmentList.forEach((garment) => {
        expect(garment.status).toBe('pending');
        expect(garment.id).toBeDefined();
        expect(garment.name).toBeDefined();
        expect(garment.sku).toBeDefined();
      });
    });
  });

  describe('getExpectedInputType', () => {
    it('should return text for design_intent', () => {
      expect(getExpectedInputType('design_intent')).toBe('text');
    });

    it('should return image_upload for reference_gathering', () => {
      expect(getExpectedInputType('reference_gathering')).toBe('image_upload');
    });

    it('should return option_select for garment_selection', () => {
      expect(getExpectedInputType('garment_selection')).toBe('option_select');
    });

    it('should return any for unknown phase', () => {
      expect(getExpectedInputType('unknown' as any)).toBe('any');
    });
  });
});
