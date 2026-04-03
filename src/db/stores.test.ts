import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStore,
  getStoreBySlug,
  getStoreByArtist,
  updateStore,
  deleteStore,
} from './stores';

// Mock the database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('./index', () => ({
  db: mockDb,
  eq: vi.fn((field, value) => ({ field, value })),
}));

describe('Stores Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStore', () => {
    it('should create a new store', async () => {
      const storeData = {
        artistId: 'artist-123',
        slug: 'test-store',
        name: 'Test Store',
        isLive: false,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'store-123',
            ...storeData,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      });

      const result = await createStore(storeData as any);

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('slug', 'test-store');
      expect(result[0]).toHaveProperty('name', 'Test Store');
    });

    it('should handle store with theme config', async () => {
      const storeData = {
        artistId: 'artist-123',
        slug: 'themed-store',
        name: 'Themed Store',
        isLive: true,
        themeConfig: { primaryColor: '#ff0000', font: 'Roboto' },
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'store-456',
            ...storeData,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      });

      const result = await createStore(storeData as any);

      expect(result[0]).toHaveProperty('themeConfig');
      expect(result[0].themeConfig).toEqual(storeData.themeConfig);
    });
  });

  describe('getStoreBySlug', () => {
    it('should return store by slug', async () => {
      const mockStore = {
        id: 'store-123',
        artistId: 'artist-123',
        slug: 'test-store',
        name: 'Test Store',
        isLive: true,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockStore]),
          }),
        }),
      });

      const result = await getStoreBySlug('test-store');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('slug', 'test-store');
    });

    it('should return empty array for non-existing slug', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await getStoreBySlug('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('getStoreByArtist', () => {
    it('should return store for artist', async () => {
      const mockStore = {
        id: 'store-123',
        artistId: 'artist-123',
        slug: 'artist-store',
        name: 'Artist Store',
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockStore]),
          }),
        }),
      });

      const result = await getStoreByArtist('artist-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('artistId', 'artist-123');
    });

    it('should return empty array if artist has no store', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await getStoreByArtist('artist-no-store');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateStore', () => {
    it('should update store data', async () => {
      const updateData = {
        name: 'Updated Store Name',
        isLive: true,
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'store-123',
              ...updateData,
              updatedAt: new Date(),
            }]),
          }),
        }),
      });

      const result = await updateStore('store-123', updateData);

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('name', 'Updated Store Name');
      expect(result[0]).toHaveProperty('isLive', true);
    });

    it('should handle partial updates', async () => {
      const updateData = {
        themeConfig: { primaryColor: '#00ff00' },
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'store-123',
              ...updateData,
            }]),
          }),
        }),
      });

      const result = await updateStore('store-123', updateData);

      expect(result).toBeDefined();
    });

    it('should return empty array for non-existing store', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await updateStore('nonexistent', { name: 'Test' });

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteStore', () => {
    it('should delete store and return deleted record', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'store-123',
            slug: 'deleted-store',
          }]),
        }),
      });

      const result = await deleteStore('store-123');

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id', 'store-123');
    });

    it('should return empty array for non-existing store', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteStore('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
