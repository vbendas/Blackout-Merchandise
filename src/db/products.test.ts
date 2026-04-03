import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProduct,
  getProductById,
  getProductsByStore,
  updateProduct,
  deleteProduct,
} from './products';

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
  and: vi.fn((...conditions) => ({ conditions })),
}));

describe('Products Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const productData = {
        storeId: 'store-123',
        name: 'Test T-Shirt',
        description: 'A comfortable cotton t-shirt',
        baseCost: 1500,
        retailPrice: 2999,
        mockupUrl: 'https://example.com/mockup.jpg',
        isActive: true,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'product-123',
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      });

      const result = await createProduct(productData as any);

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name', 'Test T-Shirt');
      expect(result[0]).toHaveProperty('baseCost', 1500);
      expect(result[0]).toHaveProperty('retailPrice', 2999);
    });

    it('should handle product with design file URL', async () => {
      const productData = {
        storeId: 'store-123',
        name: 'Custom Hoodie',
        baseCost: 2500,
        retailPrice: 4999,
        mockupUrl: 'https://example.com/hoodie-mockup.jpg',
        designFileUrl: 'https://example.com/design.pdf',
        isActive: true,
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'product-456',
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      });

      const result = await createProduct(productData as any);

      expect(result[0]).toHaveProperty('designFileUrl', 'https://example.com/design.pdf');
    });
  });

  describe('getProductById', () => {
    it('should return product by id', async () => {
      const mockProduct = {
        id: 'product-123',
        storeId: 'store-123',
        name: 'Test T-Shirt',
        baseCost: 1500,
        retailPrice: 2999,
        mockupUrl: 'https://example.com/mockup.jpg',
        isActive: true,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockProduct]),
          }),
        }),
      });

      const result = await getProductById('product-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'product-123');
      expect(result[0]).toHaveProperty('name', 'Test T-Shirt');
    });

    it('should return empty array for non-existing product', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await getProductById('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('getProductsByStore', () => {
    it('should return all products for a store', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          storeId: 'store-123',
          name: 'T-Shirt',
          baseCost: 1500,
          retailPrice: 2999,
        },
        {
          id: 'product-2',
          storeId: 'store-123',
          name: 'Hoodie',
          baseCost: 2500,
          retailPrice: 4999,
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockProducts),
        }),
      });

      const result = await getProductsByStore('store-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('storeId', 'store-123');
      expect(result[1]).toHaveProperty('storeId', 'store-123');
    });

    it('should return empty array for store with no products', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await getProductsByStore('store-no-products');

      expect(result).toEqual([]);
    });
  });

  describe('updateProduct', () => {
    it('should update product data', async () => {
      const updateData = {
        name: 'Updated T-Shirt Name',
        retailPrice: 3499,
        isActive: false,
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'product-123',
              ...updateData,
              updatedAt: new Date(),
            }]),
          }),
        }),
      });

      const result = await updateProduct('product-123', updateData);

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('name', 'Updated T-Shirt Name');
      expect(result[0]).toHaveProperty('retailPrice', 3499);
      expect(result[0]).toHaveProperty('isActive', false);
    });

    it('should handle partial updates', async () => {
      const updateData = {
        description: 'Updated description',
      };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'product-123',
              ...updateData,
            }]),
          }),
        }),
      });

      const result = await updateProduct('product-123', updateData);

      expect(result).toBeDefined();
    });

    it('should return empty array for non-existing product', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await updateProduct('nonexistent', { name: 'Test' });

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product and return deleted record', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'product-123',
            name: 'Deleted Product',
          }]),
        }),
      });

      const result = await deleteProduct('product-123');

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id', 'product-123');
    });

    it('should return empty array for non-existing product', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await deleteProduct('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
