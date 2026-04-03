'use client';

import { useEffect, useState } from 'react';
import { mockupClient, type ProductTemplate, type TemplateInfo } from '@/lib/mockup';

interface ProductSelectorProps {
  onSelect: (product: ProductTemplate) => void;
  selectedSku?: string;
}

function transformToProductTemplate(template: TemplateInfo): ProductTemplate {
  return {
    sku: template.sku,
    name: template.name,
    category: template.category,
    fabric_type: template.fabric_types?.[0] || 'cotton',
    gsm: 180,
    colors: {},
    print_area: {
      chest: { x: 0, y: 0, width: 300, height: 400 },
      center: { x: 0, y: 0, width: 300, height: 400 },
    },
  };
}

export function ProductSelector({ onSelect, selectedSku }: ProductSelectorProps) {
  const [products, setProducts] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/mockups/products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const categories = [...new Set(products.map((p) => p.category))];
  const filteredProducts = selectedCategory ? products.filter((p) => p.category === selectedCategory) : products;

  if (loading) {
    return <div className="p-4 text-zinc-400">Loading products...</div>;
  }

  return (
    <div className="product-selector">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Product</label>
        <select
          value={selectedSku || ''}
          onChange={async (e) => {
            const sku = e.target.value;
            if (sku) {
              const template = await mockupClient.getTemplate(sku);
              onSelect(transformToProductTemplate(template));
            }
          }}
          className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded"
        >
          <option value="">Select a product</option>
          {filteredProducts.map((product) => (
            <option key={product.sku} value={product.sku}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
