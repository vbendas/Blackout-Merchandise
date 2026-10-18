import { db } from '@db-root/index';
import { artistStores, products, shopCustomizations, users } from '@db-root/schema';

async function seed() {
  console.log('🌱 Seeding demo data...');

  // Create demo user
  const [demoUser] = await db
    .insert(users)
    .values({
      clerkId: 'demo_user_001',
      email: 'demo@blackoutmerch.example',
      displayName: 'Demo Artist',
      role: 'artist',
    })
    .onConflictDoNothing()
    .returning();

  console.log('✅ Created demo user:', demoUser?.email);

  // Create demo artist store
  const [demoStore] = await db
    .insert(artistStores)
    .values({
      artistId: demoUser!.id,
      slug: 'neon-dreams',
      name: 'Neon Dreams',
      isLive: true,
    })
    .onConflictDoNothing()
    .returning();

  console.log('✅ Created demo store:', demoStore?.name);

  // Create shop customization
  await db
    .insert(shopCustomizations)
    .values({
      storeId: demoStore!.id,
      sliderImages: [
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&h=600&fit=crop',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=600&fit=crop',
      ],
      backgroundColor: '#0A0A0A',
      textColor: '#FFFFFF',
      aboutText:
        '# About Neon Dreams\n\nWelcome to my exclusive merch collection! All items are premium quality, ethically sourced, and printed with love.\n\n**Shipping from Portugal** - Worldwide delivery available!',
      socialLinks: {
        instagram: 'https://instagram.com',
        tiktok: 'https://tiktok.com',
      },
    })
    .onConflictDoNothing();

  console.log('✅ Created shop customization');

  // Create demo products
  const demoProducts = [
    {
      storeId: demoStore!.id,
      name: 'Neon Classic Tee',
      description: 'Premium cotton t-shirt with neon graphic',
      baseCost: 1200,
      retailPrice: 3500,
      mockupUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop',
      isActive: true,
    },
    {
      storeId: demoStore!.id,
      name: 'Midnight Hoodie',
      description: 'Heavyweight hoodie for cold nights',
      baseCost: 2500,
      retailPrice: 6500,
      mockupUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop',
      isActive: true,
    },
    {
      storeId: demoStore!.id,
      name: 'Retro Cap',
      description: 'Adjustable snapback cap',
      baseCost: 800,
      retailPrice: 2500,
      mockupUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop',
      isActive: true,
    },
    {
      storeId: demoStore!.id,
      name: 'Neon Tote Bag',
      description: 'Canvas tote bag with neon print',
      baseCost: 600,
      retailPrice: 1800,
      mockupUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=600&fit=crop',
      isActive: true,
    },
  ];

  for (const product of demoProducts) {
    await db.insert(products).values(product).onConflictDoNothing();
  }

  console.log('✅ Created', demoProducts.length, 'demo products');

  // Create second demo store
  const [demoUser2] = await db
    .insert(users)
    .values({
      clerkId: 'demo_user_002',
      email: 'sara@example.com',
      displayName: 'Sara',
      role: 'artist',
    })
    .onConflictDoNothing()
    .returning();

  const [demoStore2] = await db
    .insert(artistStores)
    .values({
      artistId: demoUser2!.id,
      slug: 'sara-art',
      name: 'Sara Art',
      isLive: true,
    })
    .onConflictDoNothing()
    .returning();

  await db
    .insert(shopCustomizations)
    .values({
      storeId: demoStore2!.id,
      sliderImages: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&h=600&fit=crop'],
      backgroundColor: '#1A1A2E',
      textColor: '#FFFFFF',
      aboutText: 'Hand-drawn art on premium merch. Each piece is unique!',
    })
    .onConflictDoNothing();

  await db
    .insert(products)
    .values({
      storeId: demoStore2!.id,
      name: 'Abstract Tee',
      description: 'Limited edition abstract art tee',
      baseCost: 1200,
      retailPrice: 3200,
      mockupUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=600&fit=crop',
      isActive: true,
    })
    .onConflictDoNothing();

  console.log('✅ Created second demo store: Sara Art');

  console.log('\n🎉 Demo data seeded successfully!');
  console.log('\n📍 Test URLs:');
  console.log('   Shop page: http://localhost:3000/merchshops');
  console.log('   Neon Dreams: http://localhost:3000/merchshops/neon-dreams');
  console.log('   Sara Art: http://localhost:3000/merchshops/sara-art');
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
