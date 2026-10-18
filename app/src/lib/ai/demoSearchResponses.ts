/**
 * Demo Search Responses — Scripted product search for crowdfunding video.
 *
 * When DEMO_MODE=true, the search UI and AI chat use these scripted
 * results instead of calling Typesense. This ensures reliable, polished
 * responses for video recording.
 *
 * NO external API calls needed — everything is local.
 */

// ─── Mock Catalog Products ──────────────────────────────────────────────

export const DEMO_CATALOG_PRODUCTS = [
  {
    id: 'demo-001',
    sku: 'STTU258',
    name: 'Stanley/Stella Hypster Tee',
    description: '100% Organic Cotton, 180 GSM. Relaxed fit, side-seamed. Perfect for bold prints.',
    brand: 'Stanley/Stella',
    category: 'T-Shirts',
    material: '100% Organic Cotton',
    baseCostEur: 1200, // €12.00
    suggestedRetailEur: 3500, // €35.00
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/sttu258-front',
    status: 'active',
  },
  {
    id: 'demo-002',
    sku: 'STHO100',
    name: 'Stanley/Stella Iconic Hoodie',
    description: '80% Organic Cotton / 20% Recycled Polyester, 330 GSM. Heavyweight, kangaroo pocket.',
    brand: 'Stanley/Stella',
    category: 'Hoodies',
    material: '80% Organic Cotton / 20% Recycled Polyester',
    baseCostEur: 2800,
    suggestedRetailEur: 6500,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/stho100-front',
    status: 'active',
  },
  {
    id: 'demo-003',
    sku: 'STJG180',
    name: 'Stanley/Stella Jogger Pants',
    description: '80% Organic Cotton / 20% Recycled Polyester, 310 GSM. Tapered fit, elastic cuffs.',
    brand: 'Stanley/Stella',
    category: 'Pants',
    material: '80% Organic Cotton / 20% Recycled Polyester',
    baseCostEur: 2200,
    suggestedRetailEur: 5500,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/stjg180-front',
    status: 'active',
  },
  {
    id: 'demo-004',
    sku: 'G500',
    name: 'Gildan Heavy Cotton T-Shirt',
    description: '100% Cotton, 203 GSM. Classic fit, pre-shrunk. Great value for bulk orders.',
    brand: 'Gildan',
    category: 'T-Shirts',
    material: '100% Cotton',
    baseCostEur: 800,
    suggestedRetailEur: 2500,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/g500-front',
    status: 'active',
  },
  {
    id: 'demo-005',
    sku: 'STCR40',
    name: 'Stanley/Stella Creator Tank',
    description: '100% Organic Cotton, 165 GSM. Relaxed fit, wide armholes. Summer essential.',
    brand: 'Stanley/Stella',
    category: 'T-Shirts',
    material: '100% Organic Cotton',
    baseCostEur: 900,
    suggestedRetailEur: 2800,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/stcr40-front',
    status: 'active',
  },
];

// ─── Mock Similar Products (for visual search demo) ─────────────────────

export const DEMO_SIMILAR_PRODUCTS = [
  {
    id: 'demo-sim-001',
    name: 'Stanley/Stella Changer Tee',
    description: 'Similar relaxed fit organic cotton tee',
    baseCostEur: 1300,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/stch100-front',
  },
  {
    id: 'demo-sim-002',
    name: 'Stanley/Stella Unisex Slider',
    description: 'Lightweight organic cotton tee',
    baseCostEur: 1100,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/stsl100-front',
  },
  {
    id: 'demo-sim-003',
    name: 'Gildan Softstyle T-Shirt',
    description: '100% ringspun cotton, fitted',
    baseCostEur: 750,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/g640-front',
  },
  {
    id: 'demo-sim-004',
    name: 'Stanley/Stella DNA Tee',
    description: '100% Organic Cotton, 155 GSM',
    baseCostEur: 1000,
    imageUrl: 'https://res.cloudinary.com/drhfgth7c/image/upload/v1/blackout-merchandise/catalog/stdn100-front',
  },
];

// ─── Demo Search Function ───────────────────────────────────────────────

/**
 * Get demo search results for a query.
 * Uses keyword matching against the mock product catalog.
 */
export function getDemoSearchResults(query: string) {
  if (!query.trim()) return DEMO_CATALOG_PRODUCTS.slice(0, 4);

  const lower = query.toLowerCase();
  return DEMO_CATALOG_PRODUCTS.filter((p) => {
    const searchable = `${p.name} ${p.description} ${p.brand} ${p.category} ${p.material} ${p.sku}`.toLowerCase();
    return searchable.includes(lower) ||
      lower.split(/\s+/).some((word) => word.length > 2 && searchable.includes(word));
  });
}

/**
 * Get demo search response text for AI chat.
 * Returns a formatted message Francisca would say when showing products.
 */
export function getDemoSearchChatResponse(query: string): string {
  const results = getDemoSearchResults(query);

  if (results.length === 0) {
    return "Hmm, I didn't find any products matching that. Let me show you our full catalog instead — we have amazing organic cotton t-shirts, heavyweight hoodies, and jogger pants. What catches your eye?";
  }

  const productList = results
    .slice(0, 3)
    .map((p) => `• **${p.name}** — €${(p.baseCostEur / 100).toFixed(2)} base cost, ${p.material}`)
    .join('\n');

  return `Here's what I found:\n\n${productList}\n\nWant me to show you what a design would look like on any of these? I can generate a mockup in seconds! ✨`;
}
