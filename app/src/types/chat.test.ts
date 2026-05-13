import { describe, expect, it } from 'vitest';
import type { 
  StudioPhase, 
  GarmentStatus, 
  StudioOption, 
  StudioMessageMetadata,
  MessageType 
} from './chat';

describe('Chat Types', () => {
  describe('MessageType', () => {
    it('should accept all valid message types', () => {
      const validTypes: MessageType[] = [
        'text',
        'card',
        'voice',
        'image',
        'status_card',
        'image_result',
        'image_upload_prompt',
        'option_chips',
      ];

      validTypes.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('StudioPhase', () => {
    it('should accept all valid phases', () => {
      const validPhases: StudioPhase[] = [
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

      validPhases.forEach((phase) => {
        expect(phase).toBeDefined();
      });
    });
  });

  describe('GarmentStatus', () => {
    it('should create valid garment status object', () => {
      const garment: GarmentStatus = {
        id: '1',
        name: 'Black Hoodie',
        sku: 'HD-BLK-001',
        status: 'pending',
      };

      expect(garment.id).toBe('1');
      expect(garment.name).toBe('Black Hoodie');
      expect(garment.sku).toBe('HD-BLK-001');
      expect(garment.status).toBe('pending');
    });

    it('should accept all valid statuses', () => {
      const statuses: GarmentStatus['status'][] = ['pending', 'in_progress', 'approved'];
      
      statuses.forEach((status) => {
        const garment: GarmentStatus = {
          id: '1',
          name: 'Test',
          sku: 'TEST-001',
          status,
        };
        expect(garment.status).toBe(status);
      });
    });

    it('should optionally include designUrl', () => {
      const garmentWithDesign: GarmentStatus = {
        id: '1',
        name: 'Black Hoodie',
        sku: 'HD-BLK-001',
        status: 'approved',
        designUrl: 'https://example.com/design.jpg',
      };

      expect(garmentWithDesign.designUrl).toBe('https://example.com/design.jpg');
    });
  });

  describe('StudioOption', () => {
    it('should create valid option without image', () => {
      const option: StudioOption = {
        id: '1',
        label: 'Option 1',
      };

      expect(option.id).toBe('1');
      expect(option.label).toBe('Option 1');
      expect(option.imageUrl).toBeUndefined();
    });

    it('should create valid option with image', () => {
      const option: StudioOption = {
        id: '1',
        label: 'Option 1',
        imageUrl: 'https://example.com/img.jpg',
      };

      expect(option.imageUrl).toBe('https://example.com/img.jpg');
    });
  });

  describe('StudioMessageMetadata', () => {
    it('should create metadata with phase', () => {
      const meta: StudioMessageMetadata = {
        phase: 'greeting',
      };

      expect(meta.phase).toBe('greeting');
    });

    it('should create metadata with status card', () => {
      const meta: StudioMessageMetadata = {
        phase: 'greeting',
        statusCard: [
          { id: '1', name: 'Hoodie', sku: 'HD-001', status: 'pending' },
        ],
      };

      expect(meta.statusCard).toHaveLength(1);
      expect(meta.statusCard?.[0].name).toBe('Hoodie');
    });

    it('should create metadata with image url', () => {
      const meta: StudioMessageMetadata = {
        imageUrl: 'https://example.com/design.jpg',
      };

      expect(meta.imageUrl).toBe('https://example.com/design.jpg');
    });

    it('should create metadata with options', () => {
      const meta: StudioMessageMetadata = {
        phase: 'approval',
        options: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No' },
        ],
      };

      expect(meta.options).toHaveLength(2);
    });

    it('should create metadata with all fields', () => {
      const meta: StudioMessageMetadata = {
        phase: 'design_iteration',
        statusCard: [
          { id: '1', name: 'Hoodie', sku: 'HD-001', status: 'in_progress' },
        ],
        imageUrl: 'https://example.com/design.jpg',
        options: [
          { id: 'approve', label: 'Approve' },
        ],
      };

      expect(meta.phase).toBe('design_iteration');
      expect(meta.statusCard).toHaveLength(1);
      expect(meta.imageUrl).toBeDefined();
      expect(meta.options).toHaveLength(1);
    });
  });
});
