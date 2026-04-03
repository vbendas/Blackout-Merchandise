import { describe, expect, it } from 'vitest';
import {
  type WaitlistBasicInfo,
  type WaitlistInterview,
  type WaitlistSocialProof,
  waitlistBasicInfoSchema,
  waitlistInterviewSchema,
  waitlistSocialProofSchema,
} from './waitlist';

describe('Waitlist Validation Schemas', () => {
  describe('waitlistBasicInfoSchema', () => {
    it('should validate correct basic info', () => {
      const validData: WaitlistBasicInfo = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = waitlistBasicInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
      const data = {
        name: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
      };

      const result = waitlistBasicInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john@example.com');
      }
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
      };

      const result = waitlistBasicInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        name: 'A'.repeat(101),
        email: 'john@example.com',
      };

      const result = waitlistBasicInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
      };

      const result = waitlistBasicInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject email longer than 255 characters', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'a'.repeat(250) + '@example.com',
      };

      const result = waitlistBasicInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from name', () => {
      const data = {
        name: '  John Doe  ',
        email: 'john@example.com',
      };

      const result = waitlistBasicInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        email: 'john@example.com',
      };

      const result = waitlistBasicInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const invalidData = {
        name: 'John Doe',
        email: '',
      };

      const result = waitlistBasicInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('waitlistSocialProofSchema', () => {
    it('should validate correct social proof data', () => {
      const validData: WaitlistSocialProof = {
        socialLink: 'https://instagram.com/testuser',
        followerRange: '10k-50k',
      };

      const result = waitlistSocialProofSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept empty social link', () => {
      const data = {
        socialLink: '',
        followerRange: '1k-5k',
      };

      const result = waitlistSocialProofSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept undefined social link', () => {
      const data = {
        followerRange: '1k-5k',
      };

      const result = waitlistSocialProofSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const invalidData = {
        socialLink: 'not-a-valid-url',
        followerRange: '10k-50k',
      };

      const result = waitlistSocialProofSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject URL longer than 500 characters', () => {
      const invalidData = {
        socialLink: 'https://example.com/' + 'a'.repeat(500),
        followerRange: '10k-50k',
      };

      const result = waitlistSocialProofSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty follower range', () => {
      const invalidData = {
        socialLink: 'https://instagram.com/testuser',
        followerRange: '',
      };

      const result = waitlistSocialProofSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject follower range longer than 50 characters', () => {
      const invalidData = {
        socialLink: 'https://instagram.com/testuser',
        followerRange: 'a'.repeat(51),
      };

      const result = waitlistSocialProofSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid URLs with different protocols', () => {
      const urls = [
        'https://instagram.com/testuser',
        'https://twitter.com/testuser',
        'https://tiktok.com/@testuser',
        'https://youtube.com/c/testuser',
      ];

      urls.forEach((url) => {
        const result = waitlistSocialProofSchema.safeParse({
          socialLink: url,
          followerRange: '10k-50k',
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('waitlistInterviewSchema', () => {
    it('should validate correct interview responses', () => {
      const validData: WaitlistInterview = {
        responses: {
          q1: 'I want to sell merchandise to my fans',
          q2: 'Digital art and illustrations',
          q3: 'I have about 50k followers',
        },
      };

      const result = waitlistInterviewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept empty responses object', () => {
      const data = {
        responses: {},
      };

      const result = waitlistInterviewSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty response values', () => {
      const invalidData = {
        responses: {
          q1: '',
        },
      };

      const result = waitlistInterviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject response values longer than 1000 characters', () => {
      const invalidData = {
        responses: {
          q1: 'a'.repeat(1001),
        },
      };

      const result = waitlistInterviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim response values', () => {
      const data = {
        responses: {
          q1: '  My response  ',
        },
      };

      const result = waitlistInterviewSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.responses.q1).toBe('My response');
      }
    });

    it('should accept multiple responses', () => {
      const data = {
        responses: {
          q1: 'Answer 1',
          q2: 'Answer 2',
          q3: 'Answer 3',
          q4: 'Answer 4',
          q5: 'Answer 5',
        },
      };

      const result = waitlistInterviewSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject non-string response values', () => {
      const invalidData = {
        responses: {
          q1: 123,
        },
      };

      const result = waitlistInterviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
