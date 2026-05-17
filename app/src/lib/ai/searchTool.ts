/**
 * Search Tool for Cat-Suite Agents
 *
 * Provides product search capabilities to the AI chat system.
 * Francisca uses this to find and recommend products from the catalog.
 * Leopoldo uses this for pricing and product availability queries.
 *
 * [ARCH] This is a pre-fetch pattern, not tool-calling:
 *   1. Detect search intent in user message
 *   2. Search Typesense
 *   3. Inject results into the LLM context prompt
 *   4. Agent responds with specific product recommendations
 */

import { getSharedServerClient, isTypesenseConfigured } from '@/lib/typesense/client';
import { CATALOG_PRODUCTS_COLLECTION, ARTIST_PRODUCTS_COLLECTION } from '@/lib/typesense/schemas';

export interface ProductSearchResult {
  id: string;
  name: string;
  description: string;
  price: number;         // in cents
  displayPrice: string;  // formatted "€12.50"
  imageUrl: string | null;
  brand?: string;
  category?: string;
  sku?: string;
  storeName?: string;
  storeSlug?: string;
  relevance: number;
}

/**
 * Search the blank garment catalog for artist-facing queries.
 * Used when artists ask Francisca/Leopoldo about available products.
 */
export async function searchCatalogForAgent(
  query: string,
  filters?: {
    category?: string;
    brand?: string;
    material?: string;
    maxPrice?: number;
  },
  limit = 5
): Promise<ProductSearchResult[]> {
  if (!isTypesenseConfigured()) return [];

  try {
    const client = getSharedServerClient();

    const filterParts = ['status:=active'];
    if (filters?.category) filterParts.push(`category:=${filters.category}`);
    if (filters?.brand) filterParts.push(`brand:=${filters.brand}`);
    if (filters?.material) filterParts.push(`material:=${filters.material}`);
    if (filters?.maxPrice) filterParts.push(`baseCostEur:<=${filters.maxPrice}`);

    const result = await client
      .collections(CATALOG_PRODUCTS_COLLECTION)
      .documents()
      .search({
        q: query,
        query_by: 'name,description,brand,sku,material',
        filter_by: filterParts.join(' && '),
        per_page: limit,
        num_typos: 2,
      });

    return (result.hits ?? []).map((hit) => {
      const doc = hit.document as Record<string, unknown>;
      const priceCents = (doc.baseCostEur as number) ?? 0;
      return {
        id: doc.id as string,
        name: doc.name as string,
        description: (doc.description as string) || '',
        price: priceCents,
        displayPrice: formatPrice(priceCents),
        imageUrl: (doc.imageUrl as string) || null,
        brand: doc.brand as string | undefined,
        category: doc.category as string | undefined,
        sku: doc.sku as string | undefined,
        relevance: hit.text_match ?? 0,
      };
    });
  } catch (error) {
    console.error('[SearchTool] Catalog search failed:', error);
    return [];
  }
}

/**
 * Search a specific store's products for customer-facing queries.
 * Used when customers browse a MerchShop.
 */
export async function searchStoreProducts(
  storeSlug: string,
  query: string,
  limit = 5
): Promise<ProductSearchResult[]> {
  if (!isTypesenseConfigured()) return [];

  try {
    const client = getSharedServerClient();

    const result = await client
      .collections(ARTIST_PRODUCTS_COLLECTION)
      .documents()
      .search({
        q: query,
        query_by: 'name,description',
        filter_by: `storeSlug:=${storeSlug} && isActive:=true`,
        per_page: limit,
        num_typos: 2,
      });

    return (result.hits ?? []).map((hit) => {
      const doc = hit.document as Record<string, unknown>;
      const priceCents = (doc.retailPrice as number) ?? 0;
      return {
        id: doc.id as string,
        name: doc.name as string,
        description: (doc.description as string) || '',
        price: priceCents,
        displayPrice: formatPrice(priceCents),
        imageUrl: (doc.mockupUrl as string) || null,
        storeName: doc.storeName as string | undefined,
        storeSlug: doc.storeSlug as string | undefined,
        relevance: hit.text_match ?? 0,
      };
    });
  } catch (error) {
    console.error('[SearchTool] Store search failed:', error);
    return [];
  }
}

/**
 * Find visually similar products using vector embeddings.
 *
 * [NOTE] Temporarily disabled — CLIP embeddings require 1GB+ RAM.
 * Will be enabled when cluster is upgraded or self-hosted.
 */
export async function findSimilarProducts(
  _productId: string,
  _collection: 'catalog_products' | 'artist_products' = CATALOG_PRODUCTS_COLLECTION,
  _limit = 4
): Promise<ProductSearchResult[]> {
  // Visual search disabled — see note above
  return [];
}

/**
 * Format search results as a concise text block for injection into LLM prompts.
 * Keeps it under ~500 tokens to avoid bloat.
 */
export function formatSearchResultsForPrompt(results: ProductSearchResult[]): string {
  if (results.length === 0) return '';

  const lines = results.map((r, i) =>
    `${i + 1}. **${r.name}**${r.brand ? ` (${r.brand})` : ''} — ${r.displayPrice}${r.description ? `\n   ${r.description.slice(0, 100)}${r.description.length > 100 ? '...' : ''}` : ''}`
  );

  return `Here are ${results.length} relevant products from the catalog:\n\n${lines.join('\n\n')}`;
}

/**
 * Detect if a user message contains product search intent.
 * Used by the chat system to decide whether to pre-fetch search results.
 */
export function detectSearchIntent(message: string): {
  hasSearchIntent: boolean;
  query: string;
  filters: {
    category?: string;
    brand?: string;
    material?: string;
    maxPrice?: number;
  };
} {
  const lower = message.toLowerCase();

  // Category keywords → filters
  const categoryMap: Record<string, string> = {
    't-shirt': 'T-Shirts', 'tshirt': 'T-Shirts', 'tee': 'T-Shirts', 'shirts': 'T-Shirts',
    'hoodie': 'Hoodies', 'sweatshirt': 'Hoodies', 'pullover': 'Hoodies',
    'jogger': 'Pants', 'pants': 'Pants', 'trousers': 'Pants',
    'cap': 'Accessories', 'hat': 'Accessories', 'beanie': 'Accessories',
    'tote': 'Accessories', 'bag': 'Accessories',
    'mug': 'Drinkware', 'bottle': 'Drinkware', 'cup': 'Drinkware',
    'poster': 'Wall Art', 'print': 'Wall Art',
  };

  // Brand keywords
  const brandMap: Record<string, string> = {
    'stanley': 'Stanley/Stella', 'stella': 'Stanley/Stella',
    'gildan': 'Gildan', 'fruit of the loom': 'Fruit of the Loom',
  };

  // Material keywords
  const materialMap: Record<string, string> = {
    'organic': 'Organic Cotton', 'cotton': 'Cotton',
    'recycled': 'Recycled', 'polyester': 'Polyester',
    'vegan': 'Vegan',
  };

  let category: string | undefined;
  let brand: string | undefined;
  let material: string | undefined;
  let maxPrice: number | undefined;

  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (lower.includes(keyword)) { category = cat; break; }
  }
  for (const [keyword, b] of Object.entries(brandMap)) {
    if (lower.includes(keyword)) { brand = b; break; }
  }
  for (const [keyword, m] of Object.entries(materialMap)) {
    if (lower.includes(keyword)) { material = m; break; }
  }

  // Extract price from patterns like "under €30", "below 30", "less than 30"
  const priceMatch = lower.match(/(?:under|below|less than|cheap|affordable|under)\s*€?\s*(\d+)/);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1], 10) * 100; // Convert to cents
  }

  // Search trigger phrases — ONLY action/intent phrases, NOT product keywords
  const actionPhrases = [
    'show me', 'find', 'search', 'looking for', 'browse',
    'products', 'available', 'what do you have', 'what products',
    'blank', 'garment',
  ];

  // "catalog" is special — it means "show all products", not a search term
  const isCatalogBrowse = lower.includes('catalog');

  // Product keywords that trigger search intent but should NOT be removed from query
  const productKeywords = [
    't-shirt', 'hoodie', 'mug', 'tote',
    'organic cotton', 'sustainable', 'eco',
  ];

  const hasSearchIntent = [...actionPhrases, ...productKeywords, 'catalog'].some((phrase) => lower.includes(phrase));

  // Extract the search query — only remove action phrases, keep product keywords
  let query = message;
  for (const phrase of actionPhrases) {
    query = query.replace(new RegExp(phrase, 'gi'), '');
  }
  // Remove "catalog" from query too (it's a browse action, not a search term)
  query = query.replace(/catalog/gi, '');
  // Remove price mentions from query too
  query = query.replace(/(?:under|below|less than)\s*€?\s*\d+/gi, '').trim();
  query = query.trim().replace(/^\s*(for|me|a|the|some|any)\s*/gi, '') || '';

  // If browsing catalog with no specific query, use "*" to match all
  if (isCatalogBrowse && (!query || query.length < 2)) {
    query = '*';
  }

  return { hasSearchIntent, query, filters: { category, brand, material, maxPrice } };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}
