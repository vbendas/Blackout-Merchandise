import { getServerClient } from './src/lib/typesense/client';
import { ensureCollections } from './src/lib/typesense/collections';

async function test() {
  const client = getServerClient();
  await ensureCollections();

  // Index a sample catalog product
  console.log('Indexing sample products...');
  await client.collections('catalog_products').documents().upsert({
    id: 'prod-001',
    sku: 'TS-001',
    name: 'Premium Organic Cotton T-Shirt',
    description: 'Soft, sustainable, perfect for printing. 180gsm heavyweight organic cotton.',
    brand: 'Stanley/Stella',
    category: 'T-Shirts',
    categorySlug: 't-shirts',
    material: 'Organic Cotton',
    baseCostEur: 850, // €8.50 in cents
    suggestedRetailEur: 2500,
    status: 'active',
    weightG: 180,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/catalog/tshirt-001.jpg',
    createdAt: Date.now(),
  });

  await client.collections('catalog_products').documents().upsert({
    id: 'prod-002',
    sku: 'HD-001',
    name: 'Heavyweight Hoodie',
    description: 'Premium fleece-lined hoodie. 320gsm. Perfect for streetwear brands.',
    brand: 'Bella+Canvas',
    category: 'Hoodies',
    categorySlug: 'hoodies',
    material: 'Cotton/Poly Blend',
    baseCostEur: 1850,
    suggestedRetailEur: 4500,
    status: 'active',
    weightG: 320,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/catalog/hoodie-001.jpg',
    createdAt: Date.now(),
  });

  console.log('Products indexed!');

  // Test search
  console.log('\n--- Search: "t-shirt" ---');
  const results1 = await client.collections('catalog_products').documents().search({
    q: 't-shirt',
    query_by: 'name,description,brand,category',
  });
  console.log(`Found ${results1.found} results`);
  results1.hits?.forEach((hit, i) => {
    console.log(`  ${i + 1}. ${(hit.document as Record<string, unknown>).name}`);
  });

  // Test search with typo
  console.log('\n--- Search: "hoodi" (typo) ---');
  const results2 = await client.collections('catalog_products').documents().search({
    q: 'hoodi',
    query_by: 'name,description',
  });
  console.log(`Found ${results2.found} results`);
  results2.hits?.forEach((hit, i) => {
    console.log(`  ${i + 1}. ${(hit.document as Record<string, unknown>).name}`);
  });

  // Test facet search
  console.log('\n--- Facet Search: "organic" + brand facet ---');
  const results3 = await client.collections('catalog_products').documents().search({
    q: 'organic',
    query_by: 'name,description,material',
    facet_by: 'brand,category',
  });
  console.log(`Found ${results3.found} results`);
  results3.hits?.forEach((hit, i) => {
    console.log(`  ${i + 1}. ${(hit.document as Record<string, unknown>).name}`);
  });

  console.log('\n✅ All tests passed!');
}

test().catch(console.error);
