import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addToWaitlist,
  getWaitlist,
  markAsNotified,
  updateWaitlistEntry,
  getWaitlistEntryByEmail,
  getWaitlistPosition,
  saveInterviewResponses,
  getApprovedWaitlistEntries,
  getWaitlistStats,
} from './waitlist';
import { waitlist } from './schema';

// Mock the database
vi.mock('./index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
        }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{
            id: 'test-id',
            email: 'test@example.com',
            name: 'Test User',
          }]),
        })),
      })),
    })),
  },
  eq: vi.fn((field, value) => ({ field, value })),
  desc: vi.fn((field) => ({ field, direction: 'desc' })),
}));

describe('Waitlist Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addToWaitlist', () => {
    it('should insert a new waitlist entry', async () => {
      const result = await addToWaitlist('test@example.com', 'Test User');
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('email', 'test@example.com');
    });

    it('should throw error when email already exists', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-id', email: 'test@example.com' }]),
          })),
        })),
      }) as any);

      await expect(addToWaitlist('test@example.com', 'Test User')).rejects.toThrow('Email already on waitlist');
    });

    it('should handle optional name parameter', async () => {
      const result = await addToWaitlist('test@example.com');
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('getWaitlist', () => {
    it('should return all waitlist entries', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([
          { id: '1', email: 'user1@example.com', name: 'User 1' },
          { id: '2', email: 'user2@example.com', name: 'User 2' },
        ]),
      }) as any);

      const result = await getWaitlist();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('email', 'user1@example.com');
    });
  });

  describe('markAsNotified', () => {
    it('should update notified status for given email', async () => {
      const result = await markAsNotified('test@example.com');
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');
    });
  });

  describe('updateWaitlistEntry', () => {
    it('should update waitlist entry with provided data', async () => {
      const updateData = {
        socialLink: 'https://instagram.com/testuser',
        followerRange: '10k-50k',
        status: 'approved' as const,
      };

      const result = await updateWaitlistEntry('test@example.com', updateData);
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');
    });

    it('should handle partial updates', async () => {
      const result = await updateWaitlistEntry('test@example.com', { status: 'approved' });
      
      expect(result).toBeDefined();
    });
  });

  describe('getWaitlistEntryByEmail', () => {
    it('should return entry for existing email', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: 'test-id',
              email: 'test@example.com',
              name: 'Test User',
            }]),
          })),
        })),
      }) as any);

      const result = await getWaitlistEntryByEmail('test@example.com');
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should return null for non-existing email', async () => {
      const result = await getWaitlistEntryByEmail('nonexistent@example.com');
      
      expect(result).toBeNull();
    });
  });

  describe('getWaitlistPosition', () => {
    it('should return correct position for email', async () => {
      const { db } = await import('./index');
      
      // First call: get user entry
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: '2',
              email: 'test@example.com',
              timestamp: new Date('2024-01-15T10:00:00Z'),
            }]),
          })),
        })),
      }) as any);

      // Second call: count earlier entries
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ count: 1 }]),
          })),
        })),
      }) as any);

      const result = await getWaitlistPosition('test@example.com');
      
      expect(result).toBe(2);
    });

    it('should return null for non-existing email', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }) as any);

      const result = await getWaitlistPosition('nonexistent@example.com');
      
      expect(result).toBeNull();
    });
  });

  describe('saveInterviewResponses', () => {
    it('should save interview responses and update status', async () => {
      const responses = {
        q1: 'I want to sell merchandise',
        q2: 'Digital art',
      };

      const result = await saveInterviewResponses('test@example.com', responses);
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');
    });
  });

  describe('getApprovedWaitlistEntries', () => {
    it('should return only approved entries', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            { id: '1', email: 'user1@example.com', status: 'approved' },
            { id: '2', email: 'user2@example.com', status: 'approved' },
          ]),
        })),
      }) as any);

      const result = await getApprovedWaitlistEntries();
      
      expect(result).toHaveLength(2);
      expect(result.every(e => e.status === 'approved')).toBe(true);
    });
  });

  describe('getWaitlistStats', () => {
    it('should return correct statistics', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([
          { id: '1', status: 'pending', notified: false },
          { id: '2', status: 'approved', notified: false },
          { id: '3', status: 'approved', notified: true },
          { id: '4', status: 'rejected', notified: false },
        ]),
      }) as any);

      const result = await getWaitlistStats();
      
      expect(result).toEqual({
        total: 4,
        pending: 1,
        approved: 2,
        rejected: 1,
        notified: 1,
      });
    });

    it('should handle empty waitlist', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockResolvedValue([]),
      }) as any);

      const result = await getWaitlistStats();
      
      expect(result).toEqual({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        notified: 0,
      });
    });
  });
});
