import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, getUserByClerkId, updateUser, deleteUser, userSchema } from './users';

// Mock the database
vi.mock('./index', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{
          id: 'test-id',
          clerkId: 'clerk_test_id',
          email: 'test@example.com',
          displayName: 'Test User',
        }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{
            id: 'test-id',
            clerkId: 'clerk_test_id',
            email: 'updated@example.com',
            displayName: 'Updated User',
          }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{
          id: 'test-id',
          clerkId: 'clerk_test_id',
        }]),
      })),
    })),
  },
  eq: vi.fn((field, value) => ({ field, value })),
}));

describe('Users Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('userSchema', () => {
    it('should validate correct user data', () => {
      const validData = {
        clerkId: 'clerk_test_id',
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = userSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        clerkId: 'clerk_test_id',
        email: 'invalid-email',
        name: 'Test User',
      };

      const result = userSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty clerkId', () => {
      const invalidData = {
        clerkId: '',
        email: 'test@example.com',
      };

      const result = userSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept data without optional name', () => {
      const validData = {
        clerkId: 'clerk_test_id',
        email: 'test@example.com',
      };

      const result = userSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('createUser', () => {
    it('should create a new user with all fields', async () => {
      const result = await createUser('clerk_test_id', 'test@example.com', 'Test User');
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('clerkId', 'clerk_test_id');
      expect(result[0]).toHaveProperty('email', 'test@example.com');
      expect(result[0]).toHaveProperty('displayName', 'Test User');
    });

    it('should create a user without optional name', async () => {
      const result = await createUser('clerk_test_id', 'test@example.com');
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('clerkId', 'clerk_test_id');
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('./index');
      vi.mocked(db.insert).mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await expect(createUser('clerk_test_id', 'test@example.com')).rejects.toThrow('Database connection failed');
    });
  });

  describe('getUserByClerkId', () => {
    it('should return user for existing clerkId', async () => {
      const { db } = await import('./index');
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: 'test-id',
              clerkId: 'clerk_test_id',
              email: 'test@example.com',
            }]),
          })),
        })),
      }) as any);

      const result = await getUserByClerkId('clerk_test_id');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('clerkId', 'clerk_test_id');
    });

    it('should return empty array for non-existing clerkId', async () => {
      const result = await getUserByClerkId('nonexistent_id');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const updateData = {
        email: 'updated@example.com',
        displayName: 'Updated User',
      };

      const result = await updateUser('clerk_test_id', updateData);
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('email', 'updated@example.com');
      expect(result[0]).toHaveProperty('displayName', 'Updated User');
    });

    it('should handle partial updates', async () => {
      const updateData = {
        displayName: 'Only Name Updated',
      };

      const result = await updateUser('clerk_test_id', updateData);
      
      expect(result).toBeDefined();
    });

    it('should return empty array for non-existing user', async () => {
      const { db } = await import('./index');
      vi.mocked(db.update).mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([]),
          })),
        })),
      }) as any);

      const result = await updateUser('nonexistent_id', { displayName: 'Test' });
      
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return deleted record', async () => {
      const result = await deleteUser('clerk_test_id');
      
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('clerkId', 'clerk_test_id');
    });

    it('should return empty array for non-existing user', async () => {
      const { db } = await import('./index');
      vi.mocked(db.delete).mockImplementationOnce(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
        })),
      }) as any);

      const result = await deleteUser('nonexistent_id');
      
      expect(result).toHaveLength(0);
    });
  });
});
