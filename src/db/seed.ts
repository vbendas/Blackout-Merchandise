#!/usr/bin/env bun
/**
 * Database Seeding Script
 * 
 * Usage:
 *   bun run db:seed          # Seed database with sample data
 *   bun run db:seed --reset  # Reset and reseed (drops existing data)
 * 
 * This script seeds:
 * - Product blanks (catalog items)
 * - Test users (for development)
 * - Test orders (for development)
 */

import { db } from './index';
import { 
  users, 
  artistStores, 
  products, 
  orders, 
  orderItems,
  productBlanks,
  waitlist 
} from './schema';
import { eq } from 'drizzle-orm';

const args = process.argv.slice(2);
const shouldReset = args.includes('--reset');

// Sample product blanks data
const sampleProductBlanks = [
  {
    name: 'Organic Cotton T-Shirt',
    category: 't-shirts',
    brand: 'Stanley/Stella',
    sku: 'STTU755-ORG',
    baseCost: 1250, // €12.50
    suggestedRetail: 2900, // €29.00
    imageUrls: ['https://res.cloudinary.com/demo/image/upload/t-shirt.jpg'],
    colors: ['white', 'black', 'navy', 'heather-grey'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    specs: {
      material: '100% Organic Cotton',
      weight: '180gsm',
      fit: 'Regular',
      origin: 'Bangladesh (Fair Trade)',
    },
    sustainabilityBadges: ['organic', 'fair-trade', 'vegan'],
  },
  {
    name: 'Premium Hoodie',
    category: 'hoodies',
    brand: 'Stanley/Stella',
    sku: 'STSU812-PRM',
    baseCost: 2850, // €28.50
    suggestedRetail: 5900, // €59.00
    imageUrls: ['https://res.cloudinary.com/demo/image/upload/hoodie.jpg'],
    colors: ['black', 'charcoal', 'burgundy', 'forest-green'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    specs: {
      material: '85% Organic Cotton, 15% Recycled Polyester',
      weight: '280gsm',
      fit: 'Relaxed',
      origin: 'Portugal',
    },
    sustainabilityBadges: ['organic', 'recycled', 'vegan'],
  },
  {
    name: 'Canvas Tote Bag',
    category: 'accessories',
    brand: 'EarthPositive',
    sku: 'EPB01-CAN',
    baseCost: 850, // €8.50
    suggestedRetail: 1900, // €19.00
    imageUrls: ['https://res.cloudinary.com/demo/image/upload/tote.jpg'],
    colors: ['natural', 'black', 'navy'],
    sizes: ['One Size'],
    specs: {
      material: '100% Organic Cotton Canvas',
      weight: '270gsm',
      dimensions: '38 x 42 cm',
      origin: 'India (Fair Trade)',
    },
    sustainabilityBadges: ['organic', 'fair-trade', 'carbon-neutral'],
  },
  {
    name: 'Embroidered Cap',
    category: 'accessories',
    brand: 'Organic Basics',
    sku: 'OB-CAP-01',
    baseCost: 950, // €9.50
    suggestedRetail: 2200, // €22.00
    imageUrls: ['https://res.cloudinary.com/demo/image/upload/cap.jpg'],
    colors: ['black', 'navy', 'olive', 'beige'],
    sizes: ['Adjustable'],
    specs: {
      material: '100% Organic Cotton',
      closure: 'Metal buckle',
      origin: 'China (Fair Trade)',
    },
    sustainabilityBadges: ['organic', 'fair-trade'],
  },
  {
    name: 'Vintage Wash T-Shirt',
    category: 't-shirts',
    brand: 'Continental Clothing',
    sku: 'N03V-VIN',
    baseCost: 1150, // €11.50
    suggestedRetail: 2700, // €27.00
    imageUrls: ['https://res.cloudinary.com/demo/image/upload/vintage-tee.jpg'],
    colors: ['vintage-black', 'vintage-white', 'washed-navy'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    specs: {
      material: '100% Organic Cotton',
      weight: '165gsm',
      wash: 'Garment dyed, vintage wash',
      origin: 'Turkey',
    },
    sustainabilityBadges: ['organic', 'vegan'],
  },
];

// Sample waitlist entries
const sampleWaitlistEntries = [
  {
    email: 'artist1@example.com',
    name: 'Maria Silva',
    socialLink: 'https://instagram.com/mariasilva_art',
    followerRange: '10k-50k',
    source: 'organic',
    status: 'approved',
    position: 1,
  },
  {
    email: 'artist2@example.com',
    name: 'João Santos',
    socialLink: 'https://instagram.com/joaosantos_design',
    followerRange: '50k-100k',
    source: 'referral',
    status: 'pending',
    position: 2,
  },
  {
    email: 'artist3@example.com',
    name: 'Ana Costa',
    socialLink: 'https://tiktok.com/@anacosta_creates',
    followerRange: '5k-10k',
    source: 'organic',
    status: 'pending',
    position: 3,
  },
];

async function seedProductBlanks() {
  console.log('🌱 Seeding product blanks...');
  
  for (const blank of sampleProductBlanks) {
    // Check if already exists
    const existing = await db
      .select()
      .from(productBlanks)
      .where(eq(productBlanks.sku, blank.sku))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(productBlanks).values(blank);
      console.log(`  ✓ Added: ${blank.name}`);
    } else {
      console.log(`  ⏭ Skipped (exists): ${blank.name}`);
    }
  }
  
  console.log('✅ Product blanks seeded\n');
}

async function seedWaitlist() {
  console.log('🌱 Seeding waitlist entries...');
  
  for (const entry of sampleWaitlistEntries) {
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, entry.email))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(waitlist).values(entry);
      console.log(`  ✓ Added: ${entry.name} (${entry.email})`);
    } else {
      console.log(`  ⏭ Skipped (exists): ${entry.email}`);
    }
  }
  
  console.log('✅ Waitlist entries seeded\n');
}

async function resetData() {
  console.log('🗑️  Resetting data...\n');
  
  // Delete in order to respect foreign keys
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(artistStores);
  await db.delete(users);
  await db.delete(productBlanks);
  await db.delete(waitlist);
  
  console.log('✅ All data cleared\n');
}

async function main() {
  console.log('🚀 Database Seeding\n');
  console.log('=' .repeat(50));
  
  try {
    if (shouldReset) {
      await resetData();
    }
    
    await seedProductBlanks();
    await seedWaitlist();
    
    console.log('=' .repeat(50));
    console.log('\n✅ Seeding complete!');
    console.log('\nNext steps:');
    console.log('  - Run `bun run db:studio` to view data');
    console.log('  - Or query directly via your app\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
