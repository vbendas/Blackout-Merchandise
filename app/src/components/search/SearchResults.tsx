'use client';

/**
 * SearchResults — Product grid with faceted filtering.
 *
 * Displays Typesense search results with:
 * - Product card grid with images
 * - Facet sidebar (category, brand, material)
 * - Sort options (relevance, price asc/desc, newest)
 * - Pagination
 */

import { useState, useCallback, useEffect } from 'react';
import { Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface ProductHit {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  mockupUrl?: string;
  brand?: string;
  category?: string;
  baseCostEur?: number;
  retailPrice?: number;
  sku?: string;
  material?: string;
  _highlight?: unknown;
}

interface FacetCount {
  field_name: string;
  counts: Array<{ value: string; count: number }>;
}

interface SearchResultsProps {
  /** API endpoint to search */
  endpoint: string;
  /** Search query */
  query: string;
  /** Layout mode */
  defaultView?: 'grid' | 'list';
  /** Callback when product is clicked */
  onProductClick?: (product: ProductHit) => void;
}

export function SearchResults({
  endpoint,
  query,
  defaultView = 'grid',
  onProductClick,
}: SearchResultsProps) {
  const [results, setResults] = useState<ProductHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState<FacetCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState(defaultView);
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const limit = 20;

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query || '*',
        page: String(page),
        limit: String(limit),
        sort: sortBy,
      });

      for (const [key, value] of Object.entries(selectedFilters)) {
        params.set(key, value);
      }

      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) return;

      const data = await response.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setFacets(data.facets ?? []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, query, page, sortBy, selectedFilters]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query, sortBy, selectedFilters]);

  const totalPages = Math.ceil(total / limit);

  const toggleFilter = (field: string, value: string) => {
    setSelectedFilters((prev) => {
      const next = { ...prev };
      if (next[field] === value) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  };

  return (
    <div className="flex gap-6">
      {/* Facet Sidebar */}
      {facets.length > 0 && (
        <div className="hidden md:block w-48 shrink-0">
          {facets.map((facet) => (
            <div key={facet.field_name} className="mb-4">
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                {facet.field_name}
              </h3>
              <div className="space-y-1">
                {facet.counts.map(({ value, count }) => (
                  <button
                    key={value}
                    onClick={() => toggleFilter(facet.field_name, value)}
                    className={`
                      w-full text-left px-2 py-1 rounded text-sm transition-colors flex justify-between
                      ${selectedFilters[facet.field_name] === value
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }
                    `}
                  >
                    <span className="truncate">{value}</span>
                    <span className="text-xs text-zinc-600">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-zinc-500">
            {total > 0 ? `${total} product${total !== 1 ? 's' : ''} found` : 'No results'}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-300"
            >
              <option value="createdAt:desc">Newest</option>
              <option value="baseCostEur:asc">Price: Low to High</option>
              <option value="baseCostEur:desc">Price: High to Low</option>
              <option value="name:asc">Name A-Z</option>
            </select>
            <div className="flex border border-zinc-800 rounded overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 ${view === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 ${view === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">No products found</p>
            {query && <p className="text-sm text-zinc-600 mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className={
            view === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
              : 'space-y-3'
          }>
            {results.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                view={view}
                onClick={() => onProductClick?.(product)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-zinc-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Product Card ────────────────────────────────────────────────────────

function ProductCard({
  product,
  view,
  onClick,
}: {
  product: ProductHit;
  view: 'grid' | 'list';
  onClick: () => void;
}) {
  const imageUrl = product.imageUrl || product.mockupUrl;
  const priceCents = product.baseCostEur ?? product.retailPrice;

  if (view === 'list') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors w-full text-left bg-zinc-950"
      >
        {imageUrl && (
          <div className="w-12 h-12 rounded bg-zinc-900 overflow-hidden shrink-0">
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{product.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {product.brand && <span className="text-xs text-zinc-500">{product.brand}</span>}
            {product.category && <span className="text-xs text-zinc-600">{product.category}</span>}
          </div>
        </div>
        {priceCents != null && (
          <span className="text-sm text-zinc-300 shrink-0">€{(priceCents / 100).toFixed(2)}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all overflow-hidden bg-zinc-950 text-left"
    >
      {imageUrl ? (
        <div className="aspect-square bg-zinc-900 overflow-hidden">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-square bg-zinc-900 flex items-center justify-center">
          <span className="text-zinc-700 text-xs">No image</span>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm text-white truncate">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          {product.brand && <span className="text-xs text-zinc-500">{product.brand}</span>}
          {priceCents != null && (
            <span className="text-sm font-medium text-zinc-300">€{(priceCents / 100).toFixed(2)}</span>
          )}
        </div>
      </div>
    </button>
  );
}
