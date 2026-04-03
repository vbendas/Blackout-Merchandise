import { db } from './index';
import { productBlanks } from './schema';
import { eq } from 'drizzle-orm';

export interface ProductBlankData {
  name: string;
  category: string;
  brand: string;
  sku: string;
  baseCost: number;
  suggestedRetail: number;
  imageUrls: string[];
  colors?: Array<{ name: string; hex: string; available: boolean }>;
  sizes?: Array<{ size: string; minQuantity: number }>;
  specs?: Record<string, string>;
  sustainabilityBadges?: string[];
}

export async function createProductBlank(data: ProductBlankData) {
  return await db.insert(productBlanks).values(data).returning();
}

export async function getProductBlanks(category?: string) {
  if (category) {
    return await db
      .select()
      .from(productBlanks)
      .where(eq(productBlanks.category, category));
  }
  return await db.select().from(productBlanks);
}

export async function getProductBlankById(id: string) {
  const result = await db
    .select()
    .from(productBlanks)
    .where(eq(productBlanks.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getProductBlankBySku(sku: string) {
  const result = await db
    .select()
    .from(productBlanks)
    .where(eq(productBlanks.sku, sku))
    .limit(1);
  return result[0] || null;
}

export async function getActiveProductBlanks() {
  return await db
    .select()
    .from(productBlanks)
    .where(eq(productBlanks.isActive, true));
}

export async function getActiveProductBlanksByCategory(category: string) {
  return await db
    .select()
    .from(productBlanks)
    .where(eq(productBlanks.category, category));
}

export async function updateProductBlank(
  id: string,
  data: Partial<ProductBlankData>
) {
  return await db
    .update(productBlanks)
    .set(data)
    .where(eq(productBlanks.id, id))
    .returning();
}

export async function deactivateProductBlank(id: string) {
  return await db
    .update(productBlanks)
    .set({ isActive: false })
    .where(eq(productBlanks.id, id))
    .returning();
}

export async function getProductBlankStats() {
  const allBlanks = await db.select().from(productBlanks);
  const categories = new Set(allBlanks.map((b) => b.category));

  return {
    total: allBlanks.length,
    active: allBlanks.filter((b) => b.isActive).length,
    inactive: allBlanks.filter((b) => !b.isActive).length,
    categories: Array.from(categories),
    categoryCounts: Array.from(categories).reduce(
      (acc, cat) => {
        acc[cat] = allBlanks.filter((b) => b.category === cat).length;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

/**
 * Seed function to populate product blanks (Phase 3.5.0.6)
 * Run once during development/deployment
 */
export async function seedProductBlanks() {
  const blanks: ProductBlankData[] = [
    {
      name: 'Unisex Premium T-Shirt',
      category: 'apparel',
      brand: 'Gildan',
      sku: 'TSHIRT-001',
      baseCost: 350, // $3.50
      suggestedRetail: 1200, // $12.00
      imageUrls: [
        'https://res.cloudinary.com/merch-from/image/upload/v1/product-blanks/tshirt-black.jpg',
      ],
      colors: [
        { name: 'Black', hex: '#000000', available: true },
        { name: 'White', hex: '#FFFFFF', available: true },
        { name: 'Navy', hex: '#001F3F', available: true },
      ],
      sizes: [
        { size: 'XS', minQuantity: 6 },
        { size: 'S', minQuantity: 6 },
        { size: 'M', minQuantity: 6 },
        { size: 'L', minQuantity: 6 },
        { size: 'XL', minQuantity: 6 },
        { size: 'XXL', minQuantity: 12 },
      ],
      specs: {
        material: '100% organic cotton',
        weight: '6oz',
        fitType: 'Unisex',
        sustainableSource: 'true',
      },
      sustainabilityBadges: ['organic-cotton', 'vegan-friendly'],
    },
    {
      name: 'Ceramic Coffee Mug',
      category: 'drinkware',
      brand: 'Ceramic Co.',
      sku: 'MUG-001',
      baseCost: 250, // $2.50
      suggestedRetail: 800, // $8.00
      imageUrls: [
        'https://res.cloudinary.com/merch-from/image/upload/v1/product-blanks/mug-white.jpg',
      ],
      colors: [
        { name: 'White', hex: '#FFFFFF', available: true },
        { name: 'Black', hex: '#000000', available: true },
      ],
      sizes: [{ size: '11oz', minQuantity: 12 }],
      specs: {
        material: 'Ceramic',
        capacity: '11oz',
        dishwasherSafe: 'true',
      },
      sustainabilityBadges: ['eco-friendly'],
    },
    {
      name: 'Stainless Steel Water Bottle',
      category: 'drinkware',
      brand: 'EcoBottle',
      sku: 'BOTTLE-001',
      baseCost: 450, // $4.50
      suggestedRetail: 1500, // $15.00
      imageUrls: [
        'https://res.cloudinary.com/merch-from/image/upload/v1/product-blanks/bottle-black.jpg',
      ],
      colors: [
        { name: 'Black', hex: '#000000', available: true },
        { name: 'Silver', hex: '#C0C0C0', available: true },
      ],
      sizes: [{ size: '750ml', minQuantity: 6 }],
      specs: {
        material: 'Stainless steel',
        capacity: '750ml',
        insulated: 'true',
      },
      sustainabilityBadges: ['reusable', 'eco-friendly'],
    },
    {
      name: 'Canvas Tote Bag',
      category: 'accessories',
      brand: 'Canvas Plus',
      sku: 'TOTE-001',
      baseCost: 300, // $3.00
      suggestedRetail: 1000, // $10.00
      imageUrls: [
        'https://res.cloudinary.com/merch-from/image/upload/v1/product-blanks/tote-natural.jpg',
      ],
      colors: [
        { name: 'Natural', hex: '#F5DEB3', available: true },
        { name: 'Black', hex: '#000000', available: true },
      ],
      sizes: [{ size: 'Standard', minQuantity: 6 }],
      specs: {
        material: '100% organic cotton canvas',
        capacity: '15L',
      },
      sustainabilityBadges: ['organic-cotton', 'vegan-friendly'],
    },
    {
      name: 'Embroidered Baseball Cap',
      category: 'accessories',
      brand: 'CapWorks',
      sku: 'CAP-001',
      baseCost: 400, // $4.00
      suggestedRetail: 1200, // $12.00
      imageUrls: [
        'https://res.cloudinary.com/merch-from/image/upload/v1/product-blanks/cap-black.jpg',
      ],
      colors: [
        { name: 'Black', hex: '#000000', available: true },
        { name: 'Navy', hex: '#001F3F', available: true },
        { name: 'White', hex: '#FFFFFF', available: true },
      ],
      sizes: [{ size: 'One Size (Adjustable)', minQuantity: 6 }],
      specs: {
        material: '100% cotton',
        closureType: 'Adjustable strap',
      },
      sustainabilityBadges: ['organic-cotton'],
    },
  ];

  // Check if products already exist to avoid duplicates
  const existing = await db.select().from(productBlanks);
  if (existing.length > 0) {
    console.log(`Skipping seed: ${existing.length} product blanks already exist`);
    return;
  }

  // Insert seed data
  const result = await db.insert(productBlanks).values(blanks).returning();
  console.log(`Seeded ${result.length} product blanks`);
  return result;
}
