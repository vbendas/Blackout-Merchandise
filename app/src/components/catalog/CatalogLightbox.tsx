'use client';

import { Filter, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type LightboxProduct, useLightbox } from '../../lib/LightboxContext';
import { Button } from '../ui/button';
import { CategoryFilters } from './CategoryFilters';
import { ProductGrid } from './ProductGrid';
import { ProductSlider } from './ProductSlider';
import { SearchBar } from './SearchBar';
import { ViewToggle } from './ViewToggle';

/**
 * Main catalog lightbox component
 * Integrates all catalog features: search, filters, grid/slider views
 * Part of Phase 3.5.5
 */
export function CatalogLightbox() {
  const { isOpen, closeLightbox } = useLightbox();
  const [products, setProducts] = useState<LightboxProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<LightboxProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'slider'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/catalog');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
        setFilteredProducts(data.data);
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.data.map((p: LightboxProduct) => p.category))) as string[];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Product Catalog</h2>
            <p className="text-sm text-zinc-500">{filteredProducts.length} products</p>
          </div>
          <Button onClick={closeLightbox} size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar onSearch={setSearchQuery} placeholder="Search products..." />
          <CategoryFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
          <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery('');
            }}
            className="gap-1.5"
          >
            <Filter className="w-4 h-4" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mb-3" />
            <p className="text-zinc-400">Loading catalog...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-red-400 mb-2">Error loading catalog</p>
            <p className="text-zinc-500 text-sm mb-4">{error}</p>
            <Button onClick={fetchProducts} variant="outline">
              Try Again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-zinc-400 mb-2">No products found</p>
            <p className="text-zinc-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <ProductGrid products={filteredProducts} isLoading={isLoading} />
        ) : (
          <ProductSlider products={filteredProducts} autoplay={false} />
        )}
      </div>
    </div>
  );
}
