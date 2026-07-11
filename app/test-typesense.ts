import { getServerClient, isTypesenseConfigured } from './src/lib/typesense/client';
import { ensureCollections } from './src/lib/typesense/collections';

async function test() {
  console.log('Typesense configured:', isTypesenseConfigured());
  
  try {
    const client = getServerClient();
    console.log('Client created successfully');
    
    // Test health
    const health = await client.health.retrieve();
    console.log('Health:', health);
    
    // Ensure collections exist
    await ensureCollections();
    console.log('Collections ensured');
    
    // List collections
    const collections = await client.collections().retrieve();
    console.log('Collections:', collections.map(c => c.name));
    
    // Test search on catalog
    const results = await client.collections('catalog_products').documents().search({
      q: 't-shirt',
      query_by: 'name,description',
    });
    console.log('Search results:', results.found);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
